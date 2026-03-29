import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { NAV_TABS, PROFILE_KEY, SESSION_KEY, FRIENDS_API, getFriendsBadge } from "./Profile";

const ADMIN_USERNAME = "lavroviylist";

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); } catch { return null; }
}

interface UserItem {
  username: string;
  name: string;
  avatar: string | null;
  is_banned: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const [friendsBadge, setFriendsBadgeState] = useState(getFriendsBadge());
  const profile = getProfile();
  const session = getSession();
  const me: string = profile?.username || "";

  const [text, setText] = useState("");
  const [type, setType] = useState("announcement");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ban list modal
  const [showBanList, setShowBanList] = useState(false);
  const [banList, setBanList] = useState<UserItem[]>([]);
  const [banListLoading, setBanListLoading] = useState(false);

  // all users modal
  const [showUserList, setShowUserList] = useState(false);
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [banActionLoading, setBanActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setFriendsBadgeState(getFriendsBadge());
    window.addEventListener("friends-badge-update", handler);
    return () => window.removeEventListener("friends-badge-update", handler);
  }, []);

  if (me !== ADMIN_USERNAME) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 pt-4 pb-2">
          {NAV_TABS(navigate, "/admin", friendsBadge)}
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <Icon name="ShieldX" size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Нет доступа</p>
          </div>
        </div>
      </div>
    );
  }

  async function sendBroadcast() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${FRIENDS_API}?action=broadcast_notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token, text: text.trim(), type }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, message: `Отправлено ${data.sent_to} пользователям` });
        setText("");
      } else {
        setResult({ ok: false, message: data.error || "Ошибка" });
      }
    } catch {
      setResult({ ok: false, message: "Ошибка сети" });
    } finally {
      setLoading(false);
    }
  }

  async function openBanList() {
    setShowBanList(true);
    setBanListLoading(true);
    try {
      const res = await fetch(`${FRIENDS_API}?action=get_banned_list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token }),
      });
      const data = await res.json();
      setBanList(data.banned || []);
    } catch {
      setBanList([]);
    } finally {
      setBanListLoading(false);
    }
  }

  async function openUserList() {
    setShowUserList(true);
    setUserSearch("");
    setUserListLoading(true);
    try {
      const res = await fetch(`${FRIENDS_API}?action=get_all_users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token }),
      });
      const data = await res.json();
      setUserList(data.users || []);
    } catch {
      setUserList([]);
    } finally {
      setUserListLoading(false);
    }
  }

  async function toggleBan(username: string, isBanned: boolean) {
    setBanActionLoading(username);
    try {
      const action = isBanned ? "admin_unban" : "admin_ban";
      await fetch(`${FRIENDS_API}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token, target_username: username }),
      });
      setUserList((prev) => prev.map((u) => u.username === username ? { ...u, is_banned: !isBanned } : u));
      setBanList((prev) => isBanned ? prev.filter((u) => u.username !== username) : [...prev, { username, name: "", avatar: null, is_banned: true }]);
    } finally {
      setBanActionLoading(null);
    }
  }

  const filteredUsers = userList.filter((u) =>
    u.username.includes(userSearch.toLowerCase()) || u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 pt-4 pb-2">
        {NAV_TABS(navigate, "/admin", friendsBadge)}
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
            <Icon name="ShieldCheck" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-none">Панель администратора</h1>
            <p className="text-xs text-gray-400 mt-0.5">@{me}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={openBanList}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-95"
          >
            <Icon name="Ban" size={16} />
            Бан лист
          </button>
          <button
            onClick={openUserList}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all active:scale-95"
          >
            <Icon name="Users" size={16} />
            Список
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Megaphone" size={16} className="text-purple-400" />
            <span className="font-semibold text-gray-800 text-sm">Системное сообщение всем</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Тип сообщения</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 transition-all"
            >
              <option value="announcement">📢 Объявление</option>
              <option value="update">🆕 Обновление</option>
              <option value="warning">⚠️ Предупреждение</option>
              <option value="info">ℹ️ Информация</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Текст сообщения</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите текст системного сообщения..."
              rows={4}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all resize-none"
            />
            <p className="text-xs text-gray-400">{text.length} символов</p>
          </div>

          {result && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              <Icon name={result.ok ? "CheckCircle" : "AlertCircle"} size={16} />
              {result.message}
            </div>
          )}

          <button
            onClick={sendBroadcast}
            disabled={loading || !text.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Loader2" size={16} className="animate-spin" />
                Отправка...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Send" size={16} />
                Отправить всем пользователям
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Ban list modal */}
      {showBanList && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setShowBanList(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Icon name="Ban" size={16} className="text-red-400" />
                <span className="font-semibold text-gray-800 text-sm">Бан лист</span>
              </div>
              <button onClick={() => setShowBanList(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {banListLoading ? (
                <div className="flex justify-center py-8"><Icon name="Loader2" size={24} className="animate-spin text-gray-300" /></div>
              ) : banList.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Нет забаненных пользователей</div>
              ) : banList.map((u) => (
                <div key={u.username} className="flex items-center gap-3">
                  {u.avatar ? (
                    <img src={u.avatar} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="User" size={16} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name || u.username}</p>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All users modal */}
      {showUserList && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setShowUserList(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Icon name="Users" size={16} className="text-purple-400" />
                <span className="font-semibold text-gray-800 text-sm">Все аккаунты {!userListLoading && `(${userList.length})`}</span>
              </div>
              <button onClick={() => setShowUserList(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="px-5 pt-3 pb-2">
              <div className="relative">
                <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Поиск по имени или @юзернейму..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-2">
              {userListLoading ? (
                <div className="flex justify-center py-8"><Icon name="Loader2" size={24} className="animate-spin text-gray-300" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Ничего не найдено</div>
              ) : filteredUsers.map((u) => (
                <div key={u.username} className="flex items-center gap-3 py-1">
                  {u.avatar ? (
                    <img src={u.avatar} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="User" size={16} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name || u.username}</p>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </div>
                  {u.username !== me && (
                    <button
                      onClick={() => toggleBan(u.username, u.is_banned)}
                      disabled={banActionLoading === u.username}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                        u.is_banned
                          ? "bg-green-50 text-green-600 hover:bg-green-100"
                          : "bg-red-50 text-red-500 hover:bg-red-100"
                      }`}
                    >
                      {banActionLoading === u.username ? (
                        <Icon name="Loader2" size={12} className="animate-spin" />
                      ) : u.is_banned ? "Разбанить" : "Забанить"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
