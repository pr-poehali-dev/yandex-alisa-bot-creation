# v2fa
import json
import os
import hashlib
import secrets
import smtplib
import random
import psycopg2
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def make_token() -> str:
    return secrets.token_hex(32)


def make_email_code() -> str:
    return str(random.randint(100000, 999999))


def send_email(to: str, subject: str, html: str):
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(host, port) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.sendmail(user, to, msg.as_string())

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def resp(status, body, headers={}):
    h = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
    h.update(headers)
    return {"statusCode": status, "headers": h, "body": json.dumps(body, ensure_ascii=False, default=str)}

def handler(event: dict, context) -> dict:
    """
    API для системы друзей: регистрация, заявки, дружба, сообщения.
    Маршруты через query ?action=...
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        }, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    conn = get_conn()
    cur = conn.cursor()

    try:
        # ── Register ──
        if action == "register" and method == "POST":
            username = body.get("username", "").strip().lower()
            name = body.get("name", "").strip()
            bio = body.get("bio", "").strip()
            avatar = body.get("avatar")
            password = body.get("password", "")
            if not username or not name or not password:
                return resp(400, {"error": "username, name и password обязательны"})
            if len(password) < 6:
                return resp(400, {"error": "Пароль минимум 6 символов"})
            cur.execute("SELECT 1 FROM users WHERE username=%s", (username,))
            if cur.fetchone():
                return resp(409, {"error": "Юзернейм уже занят"})
            pw_hash = hash_password(password)
            token = make_token()
            cur.execute(
                "INSERT INTO users (username, name, bio, avatar, password_hash, session_token) VALUES (%s,%s,%s,%s,%s,%s)",
                (username, name, bio, avatar, pw_hash, token)
            )
            conn.commit()
            return resp(200, {"ok": True, "token": token, "username": username, "name": name, "bio": bio, "avatar": avatar})

        # ── Login ──
        if action == "login" and method == "POST":
            username = body.get("username", "").strip().lower()
            password = body.get("password", "")
            if not username or not password:
                return resp(400, {"error": "Введите юзернейм и пароль"})
            pw_hash = hash_password(password)
            cur.execute("SELECT username, name, bio, avatar, password_hash, is_banned, two_fa_enabled, email FROM users WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row:
                return resp(404, {"error": "Пользователь не найден"})
            if row[5]:
                return resp(403, {"error": "Аккаунт заблокирован"})
            if row[4] != pw_hash:
                return resp(401, {"error": "Неверный пароль"})
            two_fa = row[6]
            email = row[7]
            if two_fa and email:
                code = make_email_code()
                expires = datetime.now(timezone.utc) + timedelta(minutes=10)
                cur.execute("UPDATE users SET email_code=%s, email_code_expires=%s WHERE username=%s", (code, expires, username))
                conn.commit()
                send_email(email, "Код входа в Семицвет AI",
                    f"<div style='font-family:sans-serif;max-width:400px;margin:auto'>"
                    f"<h2 style='color:#7B61FF'>Ваш код входа</h2>"
                    f"<div style='font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a2e;text-align:center;padding:24px;background:#f8f7ff;border-radius:12px'>{code}</div>"
                    f"<p style='color:#888;font-size:13px;margin-top:16px'>Код действителен 10 минут. Не передавайте его никому.</p>"
                    f"</div>")
                return resp(200, {"ok": True, "two_fa": True, "username": row[0]})
            token = make_token()
            cur.execute("UPDATE users SET session_token=%s WHERE username=%s", (token, username))
            conn.commit()
            return resp(200, {"ok": True, "token": token, "username": row[0], "name": row[1], "bio": row[2], "avatar": row[3]})

        # ── Verify 2FA code ──
        if action == "verify_2fa" and method == "POST":
            username = body.get("username", "").strip().lower()
            code = body.get("code", "").strip()
            if not username or not code:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("SELECT username, name, bio, avatar, email_code, email_code_expires FROM users WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row:
                return resp(404, {"error": "Пользователь не найден"})
            if row[4] != code:
                return resp(401, {"error": "Неверный код"})
            expires = row[5]
            if expires and datetime.now(timezone.utc) > expires:
                return resp(401, {"error": "Код истёк, войдите заново"})
            token = make_token()
            cur.execute("UPDATE users SET session_token=%s, email_code=NULL, email_code_expires=NULL WHERE username=%s", (token, username))
            conn.commit()
            return resp(200, {"ok": True, "token": token, "username": row[0], "name": row[1], "bio": row[2], "avatar": row[3]})

        # ── Verify session token ──
        if action == "verify_token" and method == "POST":
            username = body.get("username", "").strip().lower()
            token = body.get("token", "")
            if not username or not token:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("SELECT username, name, bio, avatar, email, two_fa_enabled FROM users WHERE username=%s AND session_token=%s", (username, token))
            row = cur.fetchone()
            if not row:
                return resp(401, {"error": "Сессия недействительна"})
            return resp(200, {"ok": True, "username": row[0], "name": row[1], "bio": row[2], "avatar": row[3], "email": row[4], "two_fa": row[5]})

        # ── Send email verification code (for connecting email) ──
        if action == "send_connect_email_code" and method == "POST":
            username = body.get("username", "").strip().lower()
            token = body.get("token", "").strip()
            email = body.get("email", "").strip().lower()
            if not username or not token or not email or "@" not in email:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("SELECT session_token FROM users WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row or row[0] != token:
                return resp(401, {"error": "Неверный токен"})
            code = make_email_code()
            expires = datetime.now(timezone.utc) + timedelta(minutes=10)
            cur.execute("UPDATE users SET email_code=%s, email_code_expires=%s WHERE username=%s", (code, expires, username))
            conn.commit()
            send_email(email, "Подтверждение почты — Семицвет AI",
                f"<div style='font-family:sans-serif;max-width:400px;margin:auto'>"
                f"<h2 style='color:#7B61FF'>Подтвердите почту</h2>"
                f"<div style='font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a2e;text-align:center;padding:24px;background:#f8f7ff;border-radius:12px'>{code}</div>"
                f"<p style='color:#888;font-size:13px;margin-top:16px'>Введите этот код в приложении для подтверждения. Действует 10 минут.</p>"
                f"</div>")
            return resp(200, {"ok": True})

        # ── Confirm email connection ──
        if action == "confirm_email" and method == "POST":
            username = body.get("username", "").strip().lower()
            token = body.get("token", "").strip()
            email = body.get("email", "").strip().lower()
            code = body.get("code", "").strip()
            if not username or not token or not email or not code:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("SELECT session_token, email_code, email_code_expires FROM users WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row or row[0] != token:
                return resp(401, {"error": "Неверный токен"})
            if row[1] != code:
                return resp(400, {"error": "Неверный код"})
            if row[2] and datetime.now(timezone.utc) > row[2]:
                return resp(400, {"error": "Код истёк"})
            cur.execute("UPDATE users SET email=%s, email_code=NULL, email_code_expires=NULL WHERE username=%s", (email, username))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Toggle 2FA ──
        if action == "toggle_2fa" and method == "POST":
            username = body.get("username", "").strip().lower()
            token = body.get("token", "").strip()
            enabled = body.get("enabled", False)
            if not username or not token:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("SELECT session_token, email FROM users WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row or row[0] != token:
                return resp(401, {"error": "Неверный токен"})
            if enabled and not row[1]:
                return resp(400, {"error": "Сначала привяжите почту"})
            cur.execute("UPDATE users SET two_fa_enabled=%s WHERE username=%s", (enabled, username))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Update profile (requires token) ──
        if action == "update_profile" and method == "POST":
            username = body.get("username", "").strip().lower()
            token = body.get("token", "")
            name = body.get("name", "").strip()
            bio = body.get("bio", "").strip()
            avatar = body.get("avatar")
            cur.execute("SELECT 1 FROM users WHERE username=%s AND session_token=%s", (username, token))
            if not cur.fetchone():
                return resp(401, {"error": "Нет доступа"})
            cur.execute("UPDATE users SET name=%s, bio=%s, avatar=%s WHERE username=%s", (name, bio, avatar, username))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Upsert profile (legacy, no password) ──
        if action == "save_profile" and method == "POST":
            username = body.get("username", "").strip().lower()
            name = body.get("name", "").strip()
            bio = body.get("bio", "").strip()
            avatar = body.get("avatar")
            if not username or not name:
                return resp(400, {"error": "username и name обязательны"})
            cur.execute(
                "INSERT INTO users (username, name, bio, avatar) VALUES (%s, %s, %s, %s) "
                "ON CONFLICT (username) DO UPDATE SET name=%s, bio=%s, avatar=%s",
                (username, name, bio, avatar, name, bio, avatar)
            )
            conn.commit()
            return resp(200, {"ok": True})

        # ── Get profile by username ──
        if action == "get_profile" and method == "GET":
            username = params.get("username", "").strip().lower()
            cur.execute("SELECT username, name, bio, avatar FROM users WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row:
                return resp(404, {"error": "Пользователь не найден"})
            return resp(200, {"username": row[0], "name": row[1], "bio": row[2], "avatar": row[3]})

        # ── Block user ──
        if action == "block_user" and method == "POST":
            blocker = body.get("username", "").strip().lower()
            blocked = body.get("blocked_username", "").strip().lower()
            if not blocker or not blocked or blocker == blocked:
                return resp(400, {"error": "Неверные данные"})
            cur.execute(
                "INSERT INTO blocked_users (blocker, blocked) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (blocker, blocked)
            )
            # also remove friend request and friendship
            cur.execute("DELETE FROM friend_requests WHERE (from_username=%s AND to_username=%s) OR (from_username=%s AND to_username=%s)", (blocker, blocked, blocked, blocker))
            a, b = sorted([blocker, blocked])
            cur.execute("DELETE FROM friendships WHERE username_a=%s AND username_b=%s", (a, b))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Unblock user ──
        if action == "unblock_user" and method == "POST":
            blocker = body.get("username", "").strip().lower()
            blocked = body.get("blocked_username", "").strip().lower()
            if not blocker or not blocked:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("DELETE FROM blocked_users WHERE blocker=%s AND blocked=%s", (blocker, blocked))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Get blocked list ──
        if action == "get_blocked" and method == "GET":
            username = params.get("username", "").strip().lower()
            cur.execute(
                "SELECT b.blocked, u.name, u.avatar FROM blocked_users b "
                "JOIN users u ON u.username = b.blocked "
                "WHERE b.blocker=%s ORDER BY b.created_at DESC",
                (username,)
            )
            rows = cur.fetchall()
            return resp(200, {"blocked": [{"username": r[0], "name": r[1], "avatar": r[2]} for r in rows]})

        # ── Send friend request ──
        if action == "send_request" and method == "POST":
            from_u = body.get("from_username", "").strip().lower()
            to_u = body.get("to_username", "").strip().lower()
            if not from_u or not to_u or from_u == to_u:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("SELECT 1 FROM users WHERE username=%s", (to_u,))
            if not cur.fetchone():
                return resp(404, {"error": "Пользователь не найден"})
            # check block
            cur.execute(
                "SELECT 1 FROM blocked_users WHERE (blocker=%s AND blocked=%s) OR (blocker=%s AND blocked=%s)",
                (from_u, to_u, to_u, from_u)
            )
            if cur.fetchone():
                return resp(403, {"error": "Нельзя отправить заявку этому пользователю"})
            # check already friends
            cur.execute(
                "SELECT 1 FROM friendships WHERE (username_a=%s AND username_b=%s) OR (username_a=%s AND username_b=%s)",
                (from_u, to_u, to_u, from_u)
            )
            if cur.fetchone():
                return resp(400, {"error": "Уже друзья"})
            cur.execute(
                "INSERT INTO friend_requests (from_username, to_username) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (from_u, to_u)
            )
            conn.commit()
            return resp(200, {"ok": True})

        # ── Get incoming requests ──
        if action == "get_requests" and method == "GET":
            username = params.get("username", "").strip().lower()
            cur.execute(
                "SELECT fr.from_username, u.name, u.avatar FROM friend_requests fr "
                "JOIN users u ON u.username = fr.from_username "
                "WHERE fr.to_username=%s ORDER BY fr.created_at DESC",
                (username,)
            )
            rows = cur.fetchall()
            return resp(200, {"requests": [{"username": r[0], "name": r[1], "avatar": r[2]} for r in rows]})

        # ── Accept request ──
        if action == "accept_request" and method == "POST":
            from_u = body.get("from_username", "").strip().lower()
            to_u = body.get("to_username", "").strip().lower()
            cur.execute("DELETE FROM friend_requests WHERE from_username=%s AND to_username=%s", (from_u, to_u))
            a, b = sorted([from_u, to_u])
            cur.execute(
                "INSERT INTO friendships (username_a, username_b) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (a, b)
            )
            # notify both users
            cur.execute("SELECT name FROM users WHERE username=%s", (from_u,))
            row_from = cur.fetchone()
            cur.execute("SELECT name FROM users WHERE username=%s", (to_u,))
            row_to = cur.fetchone()
            name_from = row_from[0] if row_from else from_u
            name_to = row_to[0] if row_to else to_u
            cur.execute(
                "INSERT INTO system_notifications (username, type, text) VALUES (%s, %s, %s)",
                (from_u, "friend_accepted", f"{name_to} принял(а) вашу заявку в друзья")
            )
            cur.execute(
                "INSERT INTO system_notifications (username, type, text) VALUES (%s, %s, %s)",
                (to_u, "friend_accepted", f"Вы и {name_from} теперь друзья")
            )
            conn.commit()
            return resp(200, {"ok": True})

        # ── Decline request ──
        if action == "decline_request" and method == "POST":
            from_u = body.get("from_username", "").strip().lower()
            to_u = body.get("to_username", "").strip().lower()
            cur.execute("DELETE FROM friend_requests WHERE from_username=%s AND to_username=%s", (from_u, to_u))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Get friends list ──
        if action == "get_friends" and method == "GET":
            username = params.get("username", "").strip().lower()
            cur.execute(
                "SELECT CASE WHEN f.username_a=%s THEN f.username_b ELSE f.username_a END as friend, "
                "u.name, u.avatar, f.created_at FROM friendships f "
                "JOIN users u ON u.username = CASE WHEN f.username_a=%s THEN f.username_b ELSE f.username_a END "
                "WHERE f.username_a=%s OR f.username_b=%s ORDER BY f.created_at DESC",
                (username, username, username, username)
            )
            rows = cur.fetchall()
            return resp(200, {"friends": [{"username": r[0], "name": r[1], "avatar": r[2], "since": str(r[3])} for r in rows]})

        # ── Remove friend ──
        if action == "remove_friend" and method == "POST":
            me = body.get("username", "").strip().lower()
            friend = body.get("friend_username", "").strip().lower()
            a, b = sorted([me, friend])
            cur.execute("DELETE FROM friendships WHERE username_a=%s AND username_b=%s", (a, b))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Send message ──
        if action == "send_message" and method == "POST":
            from_u = body.get("from_username", "").strip().lower()
            to_u = body.get("to_username", "").strip().lower()
            text = body.get("text", "").strip()
            if not from_u or not to_u or not text:
                return resp(400, {"error": "Неверные данные"})
            cur.execute(
                "INSERT INTO friend_messages (from_username, to_username, text) VALUES (%s, %s, %s) RETURNING id, created_at",
                (from_u, to_u, text)
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {"id": row[0], "created_at": str(row[1])})

        # ── Get messages ──
        if action == "get_messages" and method == "GET":
            me = params.get("username", "").strip().lower()
            friend = params.get("friend_username", "").strip().lower()
            cur.execute(
                "SELECT id, from_username, text, created_at FROM friend_messages "
                "WHERE (from_username=%s AND to_username=%s) OR (from_username=%s AND to_username=%s) "
                "ORDER BY created_at ASC LIMIT 200",
                (me, friend, friend, me)
            )
            rows = cur.fetchall()
            return resp(200, {"messages": [{"id": r[0], "from": r[1], "text": r[2], "time": str(r[3])[11:16]} for r in rows]})

        # ── Get system notifications ──
        if action == "get_system_notifications" and method == "GET":
            username = params.get("username", "").strip().lower()
            cur.execute(
                "SELECT id, type, text, is_read, created_at FROM system_notifications "
                "WHERE username=%s ORDER BY created_at DESC LIMIT 50",
                (username,)
            )
            rows = cur.fetchall()
            return resp(200, {"notifications": [
                {"id": r[0], "type": r[1], "text": r[2], "is_read": r[3], "created_at": str(r[4])}
                for r in rows
            ]})

        # ── Mark system notifications read ──
        if action == "mark_system_notifications_read" and method == "POST":
            username = body.get("username", "").strip().lower()
            cur.execute("UPDATE system_notifications SET is_read=TRUE WHERE username=%s AND is_read=FALSE", (username,))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Broadcast notification (admin only) ──
        if action == "broadcast_notification" and method == "POST":
            admin = body.get("admin_username", "").strip().lower()
            token = body.get("token", "").strip()
            text = body.get("text", "").strip()
            notif_type = body.get("type", "announcement").strip()
            if not admin or not token or not text:
                return resp(400, {"error": "Неверные данные"})
            if admin != "lavroviylist":
                return resp(403, {"error": "Нет доступа"})
            cur.execute("SELECT session_token FROM users WHERE username=%s", (admin,))
            row = cur.fetchone()
            if not row or row[0] != token:
                return resp(401, {"error": "Неверный токен"})
            cur.execute(
                "INSERT INTO system_notifications (username, type, text, is_read, created_at) "
                "SELECT username, %s, %s, FALSE, NOW() FROM users",
                (notif_type, text)
            )
            cur.execute("SELECT COUNT(*) FROM users")
            count = cur.fetchone()[0]
            conn.commit()
            return resp(200, {"ok": True, "sent_to": count})

        # ── Admin get banned list ──
        if action == "get_banned_list" and method == "POST":
            admin = body.get("admin_username", "").strip().lower()
            token = body.get("token", "").strip()
            if not admin or not token:
                return resp(400, {"error": "Неверные данные"})
            if admin != "lavroviylist":
                return resp(403, {"error": "Нет доступа"})
            cur.execute("SELECT session_token FROM users WHERE username=%s", (admin,))
            row = cur.fetchone()
            if not row or row[0] != token:
                return resp(401, {"error": "Неверный токен"})
            cur.execute("SELECT username, name, avatar FROM users WHERE is_banned=TRUE ORDER BY username")
            rows = cur.fetchall()
            return resp(200, {"banned": [{"username": r[0], "name": r[1], "avatar": r[2]} for r in rows]})

        # ── Admin ban / unban ──
        if action in ("admin_ban", "admin_unban") and method == "POST":
            admin = body.get("admin_username", "").strip().lower()
            token = body.get("token", "").strip()
            target = body.get("target_username", "").strip().lower()
            if not admin or not token or not target:
                return resp(400, {"error": "Неверные данные"})
            if admin != "lavroviylist":
                return resp(403, {"error": "Нет доступа"})
            cur.execute("SELECT session_token FROM users WHERE username=%s", (admin,))
            row = cur.fetchone()
            if not row or row[0] != token:
                return resp(401, {"error": "Неверный токен"})
            cur.execute("SELECT id FROM users WHERE username=%s", (target,))
            if not cur.fetchone():
                return resp(404, {"error": "Пользователь не найден"})
            ban_val = action == "admin_ban"
            cur.execute("UPDATE users SET is_banned=%s WHERE username=%s", (ban_val, target))
            if ban_val:
                cur.execute("UPDATE users SET session_token=NULL WHERE username=%s", (target,))
            conn.commit()
            return resp(200, {"ok": True})

        # ── Get email/2fa status ──
        if action == "get_security" and method == "POST":
            username = body.get("username", "").strip().lower()
            token = body.get("token", "")
            if not username or not token:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("SELECT session_token, email, two_fa_enabled FROM users WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row or row[0] != token:
                return resp(401, {"error": "Нет доступа"})
            email = row[1] or ""
            masked = ""
            if email:
                parts = email.split("@")
                masked = parts[0][:2] + "***@" + parts[1] if len(parts) == 2 else email
            return resp(200, {"email": masked, "two_fa_enabled": bool(row[2])})

        return resp(404, {"error": "Неизвестный action"})

    finally:
        cur.close()
        conn.close()