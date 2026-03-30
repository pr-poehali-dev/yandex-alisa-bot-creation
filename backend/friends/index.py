import json
import os
import hashlib
import secrets
import random
import string
import psycopg2
from datetime import datetime, timedelta

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data: dict):
    return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}


def err(msg: str, status=400):
    return {"statusCode": status, "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def gen_token() -> str:
    return secrets.token_hex(32)


def verify_session(cur, username: str, token: str) -> bool:
    cur.execute(f"SELECT session_token FROM {SCHEMA}.users WHERE username = %s", (username,))
    row = cur.fetchone()
    return row is not None and row[0] == token


def handler(event: dict, context) -> dict:
    """Авторизация, друзья, сообщения и админ-панель."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400"}, "body": ""}

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
        # ── register ──
        if action == "register":
            username = (body.get("username") or "").lower().strip()
            name = (body.get("name") or "").strip()
            bio = (body.get("bio") or "").strip()
            password = body.get("password") or ""
            if not username or not name or not password:
                return err("Заполни все поля")
            if len(password) < 6:
                return err("Пароль минимум 6 символов")
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s", (username,))
            if cur.fetchone():
                return err("Имя пользователя уже занято")
            token = gen_token()
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (username, name, bio, password_hash, session_token) VALUES (%s, %s, %s, %s, %s)",
                (username, name, bio, hash_password(password), token)
            )
            conn.commit()
            return ok({"username": username, "token": token, "name": name, "bio": bio, "avatar": None, "role": "member", "is_vip": False})

        # ── login ──
        if action == "login":
            username = (body.get("username") or "").lower().strip()
            password = body.get("password") or ""
            cur.execute(f"SELECT password_hash, name, bio, avatar, two_fa_enabled, is_banned, role, is_vip FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or row[0] != hash_password(password):
                return err("Неверный логин или пароль")
            if row[5]:
                return err("Ваш аккаунт заблокирован")
            if row[4]:
                return ok({"two_fa": True, "username": username})
            token = gen_token()
            cur.execute(f"UPDATE {SCHEMA}.users SET session_token = %s WHERE username = %s", (token, username))
            conn.commit()
            return ok({"username": username, "token": token, "name": row[1], "bio": row[2], "avatar": row[3], "two_fa": False, "role": row[6] or "member", "is_vip": bool(row[7])})

        # ── verify_2fa ──
        if action == "verify_2fa":
            username = (body.get("username") or "").lower().strip()
            code = (body.get("code") or "").strip()
            cur.execute(f"SELECT email_code, email_code_expires, name, bio, avatar, role, is_vip FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row:
                return err("Пользователь не найден")
            if row[0] != code:
                return err("Неверный код")
            if row[1] and datetime.now() > row[1].replace(tzinfo=None):
                return err("Код устарел")
            token = gen_token()
            cur.execute(f"UPDATE {SCHEMA}.users SET session_token = %s, email_code = NULL WHERE username = %s", (token, username))
            conn.commit()
            return ok({"username": username, "token": token, "name": row[2], "bio": row[3], "avatar": row[4], "role": row[5] or "member", "is_vip": bool(row[6])})

        # ── verify_token ──
        if action == "verify_token":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            cur.execute(f"SELECT session_token, name, bio, avatar, email, two_fa_enabled, role, is_vip, is_banned FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or row[0] != token:
                return ok({"ok": False})
            return ok({"ok": True, "username": username, "name": row[1], "bio": row[2], "avatar": row[3], "email": row[4], "two_fa": bool(row[5]), "role": row[6] or "member", "is_vip": bool(row[7]), "banned": bool(row[8])})

        # ── update_profile ──
        if action == "update_profile":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            name = (body.get("name") or "").strip()
            bio = (body.get("bio") or "").strip()
            avatar = body.get("avatar")
            cur.execute(f"UPDATE {SCHEMA}.users SET name = %s, bio = %s, avatar = %s WHERE username = %s", (name, bio, avatar, username))
            conn.commit()
            return ok({"ok": True})

        # ── change_username ──
        if action == "change_username":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            new_username = (body.get("new_username") or "").lower().strip()
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            cur.execute(f"SELECT is_vip FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or not row[0]:
                return err("Только VIP могут менять ник")
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s", (new_username,))
            if cur.fetchone():
                return err("Имя пользователя уже занято")
            cur.execute(f"UPDATE {SCHEMA}.users SET username = %s WHERE username = %s", (new_username, username))
            conn.commit()
            return ok({"ok": True})

        # ── send_connect_email_code ──
        if action == "send_connect_email_code":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            code = "".join(random.choices(string.digits, k=6))
            expires = datetime.now() + timedelta(minutes=10)
            cur.execute(f"UPDATE {SCHEMA}.users SET email_code = %s, email_code_expires = %s WHERE username = %s", (code, expires, username))
            conn.commit()
            return ok({"ok": True, "code": code})

        # ── confirm_email ──
        if action == "confirm_email":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            email = (body.get("email") or "").lower().strip()
            code = (body.get("code") or "").strip()
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            cur.execute(f"SELECT email_code, email_code_expires FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or row[0] != code:
                return err("Неверный код")
            if row[1] and datetime.now() > row[1].replace(tzinfo=None):
                return err("Код устарел")
            cur.execute(f"UPDATE {SCHEMA}.users SET email = %s, email_code = NULL WHERE username = %s", (email, username))
            conn.commit()
            return ok({"ok": True})

        # ── toggle_2fa ──
        if action == "toggle_2fa":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            enabled = bool(body.get("enabled"))
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            cur.execute(f"UPDATE {SCHEMA}.users SET two_fa_enabled = %s WHERE username = %s", (enabled, username))
            conn.commit()
            return ok({"ok": True})

        # ── send_request ──
        if action == "send_request":
            from_u = (body.get("from_username") or "").lower().strip()
            to_u = (body.get("to_username") or "").lower().strip()
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s", (to_u,))
            if not cur.fetchone():
                return err("Пользователь не найден")
            cur.execute(f"SELECT id FROM {SCHEMA}.friend_requests WHERE from_username = %s AND to_username = %s", (from_u, to_u))
            if cur.fetchone():
                return err("Запрос уже отправлен")
            cur.execute(f"INSERT INTO {SCHEMA}.friend_requests (from_username, to_username) VALUES (%s, %s)", (from_u, to_u))
            cur.execute(f"INSERT INTO {SCHEMA}.system_notifications (username, type, text) VALUES (%s, %s, %s)", (to_u, "friend_request", f"@{from_u} хочет добавить тебя в друзья"))
            conn.commit()
            return ok({"ok": True})

        # ── get_friends ──
        if action == "get_friends":
            username = params.get("username", "").lower()
            cur.execute(f"""
                SELECT CASE WHEN username_a = %s THEN username_b ELSE username_a END as friend, created_at
                FROM {SCHEMA}.friendships WHERE username_a = %s OR username_b = %s
            """, (username, username, username))
            friends_raw = cur.fetchall()
            friends = []
            for f_username, since in friends_raw:
                cur.execute(f"SELECT name, avatar FROM {SCHEMA}.users WHERE username = %s", (f_username,))
                u = cur.fetchone()
                if u:
                    friends.append({"username": f_username, "name": u[0], "avatar": u[1], "since": str(since)})
            return ok({"friends": friends})

        # ── get_requests ──
        if action == "get_requests":
            username = params.get("username", "").lower()
            cur.execute(f"SELECT from_username FROM {SCHEMA}.friend_requests WHERE to_username = %s", (username,))
            rows = cur.fetchall()
            requests = []
            for (from_u,) in rows:
                cur.execute(f"SELECT name, avatar FROM {SCHEMA}.users WHERE username = %s", (from_u,))
                u = cur.fetchone()
                if u:
                    requests.append({"username": from_u, "name": u[0], "avatar": u[1]})
            return ok({"requests": requests})

        # ── get_blocked ──
        if action == "get_blocked":
            username = params.get("username", "").lower()
            cur.execute(f"SELECT blocked FROM {SCHEMA}.blocked_users WHERE blocker = %s", (username,))
            rows = cur.fetchall()
            blocked = []
            for (b_u,) in rows:
                cur.execute(f"SELECT name, avatar FROM {SCHEMA}.users WHERE username = %s", (b_u,))
                u = cur.fetchone()
                if u:
                    blocked.append({"username": b_u, "name": u[0], "avatar": u[1]})
            return ok({"blocked": blocked})

        # ── get_system_notifications ──
        if action == "get_system_notifications":
            username = params.get("username", "").lower()
            cur.execute(f"SELECT id, type, text, is_read, created_at FROM {SCHEMA}.system_notifications WHERE username = %s ORDER BY created_at DESC LIMIT 50", (username,))
            rows = cur.fetchall()
            notifications = [{"id": r[0], "type": r[1], "text": r[2], "is_read": r[3], "created_at": str(r[4])} for r in rows]
            return ok({"notifications": notifications})

        # ── mark_system_notifications_read ──
        if action == "mark_system_notifications_read":
            username = (body.get("username") or "").lower().strip()
            cur.execute(f"UPDATE {SCHEMA}.system_notifications SET is_read = true WHERE username = %s", (username,))
            conn.commit()
            return ok({"ok": True})

        # ── accept_request ──
        if action == "accept_request":
            from_u = (body.get("from_username") or "").lower().strip()
            to_u = (body.get("to_username") or "").lower().strip()
            cur.execute(f"DELETE FROM {SCHEMA}.friend_requests WHERE from_username = %s AND to_username = %s", (from_u, to_u))
            cur.execute(f"INSERT INTO {SCHEMA}.friendships (username_a, username_b) VALUES (%s, %s)", (from_u, to_u))
            cur.execute(f"INSERT INTO {SCHEMA}.system_notifications (username, type, text) VALUES (%s, %s, %s)", (from_u, "friend_accepted", f"@{to_u} принял(а) твой запрос в друзья"))
            conn.commit()
            return ok({"ok": True})

        # ── decline_request ──
        if action == "decline_request":
            from_u = (body.get("from_username") or "").lower().strip()
            to_u = (body.get("to_username") or "").lower().strip()
            cur.execute(f"DELETE FROM {SCHEMA}.friend_requests WHERE from_username = %s AND to_username = %s", (from_u, to_u))
            conn.commit()
            return ok({"ok": True})

        # ── block_user ──
        if action == "block_user":
            username = (body.get("username") or "").lower().strip()
            blocked_username = (body.get("blocked_username") or "").lower().strip()
            cur.execute(f"SELECT blocker FROM {SCHEMA}.blocked_users WHERE blocker = %s AND blocked = %s", (username, blocked_username))
            if not cur.fetchone():
                cur.execute(f"INSERT INTO {SCHEMA}.blocked_users (blocker, blocked) VALUES (%s, %s)", (username, blocked_username))
            cur.execute(f"DELETE FROM {SCHEMA}.friendships WHERE (username_a = %s AND username_b = %s) OR (username_a = %s AND username_b = %s)", (username, blocked_username, blocked_username, username))
            conn.commit()
            return ok({"ok": True})

        # ── unblock_user ──
        if action == "unblock_user":
            username = (body.get("username") or "").lower().strip()
            blocked_username = (body.get("blocked_username") or "").lower().strip()
            cur.execute(f"DELETE FROM {SCHEMA}.blocked_users WHERE blocker = %s AND blocked = %s", (username, blocked_username))
            conn.commit()
            return ok({"ok": True})

        # ── remove_friend ──
        if action == "remove_friend":
            username = (body.get("username") or "").lower().strip()
            friend_username = (body.get("friend_username") or "").lower().strip()
            cur.execute(f"DELETE FROM {SCHEMA}.friendships WHERE (username_a = %s AND username_b = %s) OR (username_a = %s AND username_b = %s)", (username, friend_username, friend_username, username))
            conn.commit()
            return ok({"ok": True})

        # ── send_message ──
        if action == "send_message":
            from_u = (body.get("from_username") or "").lower().strip()
            to_u = (body.get("to_username") or "").lower().strip()
            text = (body.get("text") or "").strip()
            if not text:
                return err("Сообщение пустое")
            cur.execute(f"INSERT INTO {SCHEMA}.friend_messages (from_username, to_username, text) VALUES (%s, %s, %s)", (from_u, to_u, text))
            conn.commit()
            return ok({"ok": True})

        # ── get_messages ──
        if action == "get_messages":
            username = params.get("username", "").lower()
            friend_username = params.get("friend_username", "").lower()
            cur.execute(f"""
                SELECT id, from_username, text, created_at FROM {SCHEMA}.friend_messages
                WHERE (from_username = %s AND to_username = %s) OR (from_username = %s AND to_username = %s)
                ORDER BY created_at ASC LIMIT 200
            """, (username, friend_username, friend_username, username))
            rows = cur.fetchall()
            messages = [{"id": r[0], "from": r[1], "text": r[2], "created_at": str(r[3])} for r in rows]
            return ok({"messages": messages})

        # ── admin: broadcast ──
        if action == "admin_broadcast":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            cur.execute(f"SELECT role FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or row[0] != "admin":
                return err("Нет прав", 403)
            text = (body.get("text") or "").strip()
            msg_type = body.get("type") or "announcement"
            target = (body.get("target") or "").lower().strip()
            if target:
                cur.execute(f"INSERT INTO {SCHEMA}.system_notifications (username, type, text) VALUES (%s, %s, %s)", (target, msg_type, text))
            else:
                cur.execute(f"SELECT username FROM {SCHEMA}.users")
                users = cur.fetchall()
                for (u,) in users:
                    cur.execute(f"INSERT INTO {SCHEMA}.system_notifications (username, type, text) VALUES (%s, %s, %s)", (u, msg_type, text))
            conn.commit()
            return ok({"ok": True, "message": "Отправлено"})

        # ── admin: ban ──
        if action == "admin_ban":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            cur.execute(f"SELECT role FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or row[0] != "admin":
                return err("Нет прав", 403)
            target = (body.get("target") or "").lower().strip()
            cur.execute(f"UPDATE {SCHEMA}.users SET is_banned = true WHERE username = %s", (target,))
            conn.commit()
            return ok({"ok": True, "message": f"@{target} заблокирован"})

        # ── admin: unban ──
        if action == "admin_unban":
            username = (body.get("username") or "").lower().strip()
            token = body.get("token") or ""
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            cur.execute(f"SELECT role FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or row[0] != "admin":
                return err("Нет прав", 403)
            target = (body.get("target") or "").lower().strip()
            cur.execute(f"UPDATE {SCHEMA}.users SET is_banned = false WHERE username = %s", (target,))
            conn.commit()
            return ok({"ok": True, "message": f"@{target} разблокирован"})

        # ── admin: banlist ──
        if action == "admin_banlist":
            username = (body.get("username") or params.get("username") or "").lower().strip()
            token = body.get("token") or params.get("token") or ""
            if not verify_session(cur, username, token):
                return err("Нет доступа", 403)
            cur.execute(f"SELECT role FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or row[0] != "admin":
                return err("Нет прав", 403)
            cur.execute(f"SELECT username, name, avatar FROM {SCHEMA}.users WHERE is_banned = true")
            rows = cur.fetchall()
            banned = [{"username": r[0], "name": r[1], "avatar": r[2]} for r in rows]
            return ok({"banned": banned})

        # ── get_user ──
        if action == "get_user":
            username = params.get("username", "").lower()
            cur.execute(f"SELECT username, name, bio, avatar, role, is_vip FROM {SCHEMA}.users WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row:
                return err("Пользователь не найден", 404)
            return ok({"username": row[0], "name": row[1], "bio": row[2], "avatar": row[3], "role": row[4], "is_vip": bool(row[5])})

        return err("Неизвестный action", 404)

    finally:
        cur.close()
        conn.close()