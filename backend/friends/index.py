import json
import os
import psycopg2

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
        # ── Upsert profile ──
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

        # ── Send friend request ──
        if action == "send_request" and method == "POST":
            from_u = body.get("from_username", "").strip().lower()
            to_u = body.get("to_username", "").strip().lower()
            if not from_u or not to_u or from_u == to_u:
                return resp(400, {"error": "Неверные данные"})
            cur.execute("SELECT 1 FROM users WHERE username=%s", (to_u,))
            if not cur.fetchone():
                return resp(404, {"error": "Пользователь не найден"})
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

        return resp(404, {"error": "Неизвестный action"})

    finally:
        cur.close()
        conn.close()
