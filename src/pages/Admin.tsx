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
  role?: string;
  is_vip?: boolean;
}

function VipBanListView({ me, session, FRIENDS_API }: { me: string; session: { token: string } | null; FRIENDS_API: string }) {
  const [list, setList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${FRIENDS_API}?action=get_banned_list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_username: me, token: session?.token }),
    }).then((r) => r.json()).then((d) => setList(d.banned || [])).catch(() => setList([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Icon name="Ban" size={15} className="text-red-400" />
        <span className="font-semibold text-gray-800 text-sm">Бан лист {!loading && `(${list.length})`}</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 font-semibold">только просмотр</span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-3 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6"><Icon name="Loader2" size={22} className="animate-spin text-gray-300" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">Нет забаненных пользователей</div>
        ) : list.map((u) => (
          <div key={u.username} className="flex items-center gap-3">
            {u.avatar
              ? <img src={u.avatar} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              : <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><Icon name="User" size={16} className="text-gray-400" /></div>}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{u.name || u.username}</p>
              <p className="text-xs text-gray-400">@{u.username}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [friendsBadge, setFriendsBadgeState] = useState(getFriendsBadge());
  const profile = getProfile();
  const session = getSession();
  const me: string = profile?.username || "";
  const myRole: string = session?.role || "member";
  const isOwner = me === ADMIN_USERNAME;
  const isVip = !!session?.is_vip;
  const isMod = isOwner || myRole === "moderator";
  const hasAccess = isMod || isVip;

  const [tab, setTab] = useState(0);

  const [text, setText] = useState("");
  const [type, setType] = useState("announcement");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ban list modal
  const [showBanList, setShowBanList] = useState(false);
  const [banList, setBanList] = useState<UserItem[]>([]);
  const [banListLoading, setBanListLoading] = useState(false);

  // all users
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userListLoaded, setUserListLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [banActionLoading, setBanActionLoading] = useState<string | null>(null);

  // rights
  const [rightsTarget, setRightsTarget] = useState("");
  const [rightsLoading, setRightsLoading] = useState(false);
  const [rightsResult, setRightsResult] = useState<{ ok: boolean; message: string } | null>(null);

  // vip
  const [vipTarget, setVipTarget] = useState("");
  const [vipLoading, setVipLoading] = useState(false);
  const [vipResult, setVipResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [vipActionLoading, setVipActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setFriendsBadgeState(getFriendsBadge());
    window.addEventListener("friends-badge-update", handler);
    return () => window.removeEventListener("friends-badge-update", handler);
  }, []);

  // load users when tab 1 is opened
  useEffect(() => {
    if (tab === 1 && !userListLoaded) {
      loadUserList();
    }
  }, [tab]);

  if (!hasAccess) {
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
      if (data.ok) { setResult({ ok: true, message: `Отправлено ${data.sent_to} пользователям` }); setText(""); }
      else { setResult({ ok: false, message: data.error || "Ошибка" }); }
    } catch { setResult({ ok: false, message: "Ошибка сети" }); }
    finally { setLoading(false); }
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
    } catch { setBanList([]); }
    finally { setBanListLoading(false); }
  }

  async function loadUserList() {
    setUserListLoading(true);
    try {
      const res = await fetch(`${FRIENDS_API}?action=get_all_users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token }),
      });
      const data = await res.json();
      setUserList(data.users || []);
      setUserListLoaded(true);
    } catch { setUserList([]); }
    finally { setUserListLoading(false); }
  }

  async function toggleBan(username: string, isBanned: boolean) {
    setBanActionLoading(username);
    try {
      const act = isBanned ? "admin_unban" : "admin_ban";
      await fetch(`${FRIENDS_API}?action=${act}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token, target_username: username }),
      });
      setUserList((prev) => prev.map((u) => u.username === username ? { ...u, is_banned: !isBanned } : u));
      setBanList((prev) => isBanned ? prev.filter((u) => u.username !== username) : [...prev, { username, name: "", avatar: null, is_banned: true }]);
    } finally { setBanActionLoading(null); }
  }

  async function setRole(role: "member" | "moderator") {
    const target = rightsTarget.trim().toLowerCase();
    if (!target) return;
    setRightsLoading(true);
    setRightsResult(null);
    try {
      const res = await fetch(`${FRIENDS_API}?action=set_role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token, target_username: target, role }),
      });
      const data = await res.json();
      if (data.ok) {
        const label = role === "moderator" ? "Модератор" : "Участник";
        setRightsResult({ ok: true, message: `@${target} → ${label}` });
        setRightsTarget("");
      } else {
        setRightsResult({ ok: false, message: data.error || "Ошибка" });
      }
    } catch { setRightsResult({ ok: false, message: "Ошибка сети" }); }
    finally { setRightsLoading(false); }
  }

  async function setVipByInput(vip: boolean) {
    const target = vipTarget.trim().toLowerCase();
    if (!target) return;
    setVipLoading(true);
    setVipResult(null);
    try {
      const res = await fetch(`${FRIENDS_API}?action=set_vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token, target_username: target, vip }),
      });
      const data = await res.json();
      if (data.ok) {
        setVipResult({ ok: true, message: `@${target} → ${vip ? "ViP выдан" : "ViP снят"}` });
        setVipTarget("");
        setUserList((prev) => prev.map((u) => u.username === target ? { ...u, is_vip: vip } : u));
      } else {
        setVipResult({ ok: false, message: data.error || "Ошибка" });
      }
    } catch { setVipResult({ ok: false, message: "Ошибка сети" }); }
    finally { setVipLoading(false); }
  }

  async function toggleVip(username: string, isVip: boolean) {
    setVipActionLoading(username);
    try {
      await fetch(`${FRIENDS_API}?action=set_vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: me, token: session?.token, target_username: username, vip: !isVip }),
      });
      setUserList((prev) => prev.map((u) => u.username === username ? { ...u, is_vip: !isVip } : u));
    } finally { setVipActionLoading(null); }
  }

  const filteredUsers = userList.filter((u) =>
    u.username.includes(userSearch.toLowerCase()) || u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const TABS = isVip && !isMod
    ? [{ label: "Бан лист", icon: "Ban" }]
    : isOwner
      ? [{ label: "Рассылка", icon: "Megaphone" }, { label: "Пользователи", icon: "Users" }]
      : [{ label: "Действия", icon: "ShieldCheck" }, { label: "Пользователи", icon: "Users" }];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 pt-4 pb-2">
        {NAV_TABS(navigate, "/admin", friendsBadge)}
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
            <Icon name="ShieldCheck" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-none">
              {isVip && !isMod ? "ViP панель" : "Панель администратора"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              @{me} · {isOwner ? "Администратор" : isMod ? "Модератор" : "ViP"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === i ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon name={t.icon as "Megaphone" | "Users"} size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 0 — VIP: inline ban list (read-only) */}
        {tab === 0 && isVip && !isMod && (
          <VipBanListView me={me} session={session} FRIENDS_API={FRIENDS_API} />
        )}

        {/* Tab 0 — Mod/Owner */}
        {tab === 0 && isMod && (
          <>
            {/* Quick action buttons */}
            <div className="grid grid-cols-1 gap-2">
              <button onClick={openBanList}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-95">
                <Icon name="Ban" size={18} />
                <span>Бан лист</span>
                <Icon name="ChevronRight" size={15} className="ml-auto text-gray-300" />
              </button>
            </div>

            {/* Broadcast — only owner */}
            {isOwner && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="Megaphone" size={16} className="text-purple-400" />
                  <span className="font-semibold text-gray-800 text-sm">Системное сообщение всем</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 font-medium">Тип сообщения</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 transition-all">
                    <option value="announcement">📢 Объявление</option>
                    <option value="update">🆕 Обновление</option>
                    <option value="warning">⚠️ Предупреждение</option>
                    <option value="info">ℹ️ Информация</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 font-medium">Текст сообщения</label>
                  <textarea value={text} onChange={(e) => setText(e.target.value)}
                    placeholder="Введите текст системного сообщения..."
                    rows={4}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all resize-none" />
                  <p className="text-xs text-gray-400">{text.length} символов</p>
                </div>
                {result && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    <Icon name={result.ok ? "CheckCircle" : "AlertCircle"} size={16} />
                    {result.message}
                  </div>
                )}
                <button onClick={sendBroadcast} disabled={loading || !text.trim()}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><Icon name="Loader2" size={16} className="animate-spin" />Отправка...</span>
                    : <span className="flex items-center justify-center gap-2"><Icon name="Send" size={16} />Отправить всем пользователям</span>}
                </button>
              </div>
            )}

            {/* Next tab button */}
            <button onClick={() => setTab(1)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all active:scale-95 mt-auto">
              <span>Дальше</span>
              <Icon name="ArrowRight" size={16} />
            </button>
          </>
        )}


        {/* Tab 1 — users + rights */}
        {tab === 1 && (
          <>
            {/* User list */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Icon name="Users" size={15} className="text-purple-400" />
                  <span className="font-semibold text-gray-800 text-sm">
                    Все аккаунты {!userListLoading && userList.length > 0 && `(${userList.length})`}
                  </span>
                </div>
                <button onClick={loadUserList} className="text-gray-400 hover:text-purple-500 transition-colors">
                  <Icon name="RefreshCw" size={14} />
                </button>
              </div>
              <div className="px-4 pt-3 pb-2">
                <div className="relative">
                  <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-800 outline-none focus:border-purple-300 transition-all" />
                </div>
              </div>
              <div className="overflow-y-auto max-h-64 px-4 pb-3 flex flex-col gap-2">
                {userListLoading ? (
                  <div className="flex justify-center py-6"><Icon name="Loader2" size={22} className="animate-spin text-gray-300" /></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Ничего не найдено</div>
                ) : filteredUsers.map((u) => (
                  <div key={u.username} className="flex items-center gap-3 py-1">
                    {u.avatar
                      ? <img src={u.avatar} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><Icon name="User" size={14} className="text-gray-400" /></div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.name || u.username}</p>
                        {u.role === "moderator" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500">мод</span>
                        )}
                        {u.is_vip && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000" }}>ViP</span>
                        )}
                        {u.is_banned && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-400">бан</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">@{u.username}</p>
                    </div>
                    {u.username !== me && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isOwner && (
                          <button onClick={() => toggleVip(u.username, !!u.is_vip)} disabled={vipActionLoading === u.username}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50`}
                            style={u.is_vip ? { background: "#f3f4f6", color: "#6b7280" } : { background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000" }}>
                            {vipActionLoading === u.username
                              ? <Icon name="Loader2" size={10} className="animate-spin" />
                              : u.is_vip ? "−ViP" : "+ViP"}
                          </button>
                        )}
                        <button onClick={() => toggleBan(u.username, u.is_banned)} disabled={banActionLoading === u.username}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${u.is_banned ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>
                          {banActionLoading === u.username
                            ? <Icon name="Loader2" size={11} className="animate-spin" />
                            : u.is_banned ? "Разбан" : "Бан"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rights — owner only */}
            {isOwner && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Icon name="ShieldCheck" size={15} className="text-blue-400" />
                  <span className="font-semibold text-gray-800 text-sm">Управление правами</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 font-medium">Юзернейм</label>
                  <input
                    value={rightsTarget}
                    onChange={(e) => setRightsTarget(e.target.value)}
                    placeholder="@юзернейм"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-300 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setRole("member")} disabled={rightsLoading || !rightsTarget.trim()}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50">
                    <Icon name="User" size={20} className="text-gray-500" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Участник</p>
                      <p className="text-xs text-gray-400">Обычный аккаунт</p>
                    </div>
                  </button>
                  <button onClick={() => setRole("moderator")} disabled={rightsLoading || !rightsTarget.trim()}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50">
                    <Icon name="ShieldCheck" size={20} className="text-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-blue-700">Модератор</p>
                      <p className="text-xs text-blue-400">Бан, разбан</p>
                    </div>
                  </button>
                </div>
                {rightsLoading && (
                  <div className="flex justify-center"><Icon name="Loader2" size={20} className="animate-spin text-gray-400" /></div>
                )}
                {rightsResult && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${rightsResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    <Icon name={rightsResult.ok ? "CheckCircle" : "AlertCircle"} size={16} />
                    {rightsResult.message}
                  </div>
                )}
              </div>
            )}

            {/* VIP management — owner only */}
            {isOwner && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👑</span>
                  <span className="font-semibold text-gray-800 text-sm">Управление ViP</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 font-medium">Юзернейм</label>
                  <input
                    value={vipTarget}
                    onChange={(e) => setVipTarget(e.target.value)}
                    placeholder="@юзернейм"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
                    style={{ outlineColor: "#FFD700" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setVipByInput(true)} disabled={vipLoading || !vipTarget.trim()}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50"
                    style={{ borderColor: "#FFD700", background: "linear-gradient(135deg, #FFF9E6, #FFFBE8)" }}>
                    <span className="text-2xl">👑</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#B8860B" }}>Выдать ViP</p>
                      <p className="text-xs text-gray-400">Привилегия</p>
                    </div>
                  </button>
                  <button onClick={() => setVipByInput(false)} disabled={vipLoading || !vipTarget.trim()}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50">
                    <Icon name="X" size={20} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Снять ViP</p>
                      <p className="text-xs text-gray-400">Обычный аккаунт</p>
                    </div>
                  </button>
                </div>
                {vipLoading && (
                  <div className="flex justify-center"><Icon name="Loader2" size={20} className="animate-spin text-gray-400" /></div>
                )}
                {vipResult && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${vipResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    <Icon name={vipResult.ok ? "CheckCircle" : "AlertCircle"} size={16} />
                    {vipResult.message}
                  </div>
                )}
              </div>
            )}
          </>
        )}
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
              <button onClick={() => setShowBanList(false)} className="text-gray-400 hover:text-gray-600"><Icon name="X" size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {banListLoading ? (
                <div className="flex justify-center py-8"><Icon name="Loader2" size={24} className="animate-spin text-gray-300" /></div>
              ) : banList.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Нет забаненных пользователей</div>
              ) : banList.map((u) => (
                <div key={u.username} className="flex items-center gap-3">
                  {u.avatar
                    ? <img src={u.avatar} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><Icon name="User" size={16} className="text-gray-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name || u.username}</p>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </div>
                  <button onClick={() => toggleBan(u.username, true)} disabled={banActionLoading === u.username}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-600 hover:bg-green-100 transition-all disabled:opacity-50">
                    {banActionLoading === u.username ? <Icon name="Loader2" size={12} className="animate-spin" /> : "Разбанить"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}