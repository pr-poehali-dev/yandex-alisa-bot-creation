import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

export const FRIENDS_API = "https://functions.poehali.dev/8b800673-e429-482e-b986-dcde22d05eaf";
export const PROFILE_KEY = "semitsvet_profile";
export const SESSION_KEY = "semitsvet_session";
const CHATS_KEY = "semitsvet_chats";

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  avatar: string | null;
}

interface SavedChat {
  id: string;
  title: string;
  date: string;
  messages: { role: "user" | "bot"; text: string; time: string }[];
}

export const defaultProfile: UserProfile = { name: "", username: "", bio: "", avatar: null };

const BotAvatar = ({ size = 44 }: { size?: number }) => (
  <div className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
    style={{ width: size, height: size, background: "linear-gradient(135deg, #7B61FF 0%, #A78BFA 50%, #C4B5FD 100%)" }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="10" r="5" fill="white" fillOpacity="0.95" />
      <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  </div>
);

export const FRIENDS_BADGE_KEY = "semitsvet_friends_badge";
export function getFriendsBadge(): number {
  try { return parseInt(localStorage.getItem(FRIENDS_BADGE_KEY) || "0") || 0; } catch { return 0; }
}
export function setFriendsBadge(n: number) {
  localStorage.setItem(FRIENDS_BADGE_KEY, String(n));
  window.dispatchEvent(new Event("friends-badge-update"));
}
export function incFriendsBadge() { setFriendsBadge(getFriendsBadge() + 1); }

export const NAV_TABS = (navigate: ReturnType<typeof useNavigate>, active: string, friendsBadge = 0) => (
  <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-1.5 overflow-x-auto">
    {[
      { path: "/", icon: "MessageCircle", label: "Чат" },
      { path: "/settings", icon: "Settings", label: "Настройки" },
      { path: "/profile", icon: "User", label: "Профиль" },
      { path: "/friends", icon: "Users", label: "Друзья", badge: friendsBadge },
    ].map((tab) => (
      <button key={tab.path} onClick={() => navigate(tab.path)}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap relative"
        style={active === tab.path
          ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)", color: "white" }
          : { border: "1px solid #e5e7eb", color: "#6b7280" }}>
        <Icon name={tab.icon} size={14} />
        {tab.label}
        {"badge" in tab && tab.badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>
    ))}
  </div>
);

// ── Auth form modes ──
type AuthMode = "none" | "register" | "login";

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Пароль"}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 pr-10 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        <Icon name={show ? "EyeOff" : "Eye"} size={16} />
      </button>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [friendsBadge, setFriendsBadgeState] = useState(getFriendsBadge);
  useEffect(() => {
    const h = () => setFriendsBadgeState(getFriendsBadge());
    window.addEventListener("friends-badge-update", h);
    return () => window.removeEventListener("friends-badge-update", h);
  }, []);

  // ── session: { username, token }
  const [session, setSession] = useState<{ username: string; token: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null") || defaultProfile; } catch { return defaultProfile; }
  });

  const [chats, setChats] = useState<SavedChat[]>(() => {
    try { return JSON.parse(localStorage.getItem(CHATS_KEY) || "[]"); } catch { return []; }
  });

  // ── auth form state ──
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [authUsername, setAuthUsername] = useState("");
  const [authName, setAuthName] = useState("");
  const [authBio, setAuthBio] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── edit profile state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editBio, setEditBio] = useState(profile.bio);

  // ── misc ──
  const [viewChat, setViewChat] = useState<SavedChat | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendSent, setFriendSent] = useState(false);
  const [friendError, setFriendError] = useState("");
  const [friendLoading, setFriendLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── admin panel ──
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<"broadcast" | "ban" | "unban">("broadcast");
  const [adminText, setAdminText] = useState("");
  const [adminMsgType, setAdminMsgType] = useState("announcement");
  const [adminTarget, setAdminTarget] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminResult, setAdminResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isAdmin = profile.username === "lavroviylist";

  async function adminBroadcast() {
    if (!adminText.trim()) return;
    setAdminLoading(true); setAdminResult(null);
    try {
      const res = await fetch(`${FRIENDS_API}?action=broadcast_notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: session?.username, token: session?.token, text: adminText.trim(), type: adminMsgType }),
      });
      const data = await res.json();
      setAdminResult(data.ok ? { ok: true, message: `Отправлено ${data.sent_to} пользователям` } : { ok: false, message: data.error || "Ошибка" });
      if (data.ok) setAdminText("");
    } catch { setAdminResult({ ok: false, message: "Ошибка сети" }); }
    finally { setAdminLoading(false); }
  }

  async function adminBan(unban = false) {
    if (!adminTarget.trim()) return;
    setAdminLoading(true); setAdminResult(null);
    try {
      const res = await fetch(`${FRIENDS_API}?action=${unban ? "admin_unban" : "admin_ban"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_username: session?.username, token: session?.token, target_username: adminTarget.trim().toLowerCase() }),
      });
      const data = await res.json();
      setAdminResult(data.ok ? { ok: true, message: unban ? "Пользователь разбанен" : "Пользователь забанен" } : { ok: false, message: data.error || "Ошибка" });
      if (data.ok) setAdminTarget("");
    } catch { setAdminResult({ ok: false, message: "Ошибка сети" }); }
    finally { setAdminLoading(false); }
  }

  const isLoggedIn = !!session?.token;

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  // verify session on mount
  useEffect(() => {
    if (!session) return;
    fetch(`${FRIENDS_API}?action=verify_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: session.username, token: session.token }),
    }).then((r) => r.json()).then((data) => {
      if (!data.ok) { setSession(null); setProfile(defaultProfile); }
      else setProfile({ name: data.name, username: data.username, bio: data.bio || "", avatar: data.avatar });
    }).catch(() => { /* offline — keep session */ });
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const avatar = ev.target?.result as string;
      setProfile((p) => ({ ...p, avatar }));
      if (session) {
        fetch(`${FRIENDS_API}?action=update_profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: session.username, token: session.token, name: profile.name, bio: profile.bio, avatar }),
        }).catch(() => {});
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Register ──
  const doRegister = async () => {
    setAuthError("");
    if (!authUsername.trim() || !authName.trim() || !authPassword) { setAuthError("Заполните все поля"); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(authUsername.trim())) { setAuthError("Юзернейм: только a-z, 0-9, _ (3–20 символов)"); return; }
    if (authPassword.length < 6) { setAuthError("Пароль минимум 6 символов"); return; }
    if (authPassword !== authConfirm) { setAuthError("Пароли не совпадают"); return; }
    setAuthLoading(true);
    try {
      const res = await fetch(`${FRIENDS_API}?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUsername.trim().toLowerCase(), name: authName.trim(), bio: authBio.trim(), password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Ошибка"); return; }
      setSession({ username: data.username, token: data.token });
      setProfile({ name: data.name, username: data.username, bio: data.bio || "", avatar: data.avatar });
      setAuthMode("none");
    } catch (_) { setAuthError("Нет соединения"); }
    finally { setAuthLoading(false); }
  };

  // ── Login ──
  const doLogin = async () => {
    setAuthError("");
    if (!authUsername.trim() || !authPassword) { setAuthError("Введите юзернейм и пароль"); return; }
    setAuthLoading(true);
    try {
      const res = await fetch(`${FRIENDS_API}?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUsername.trim().toLowerCase(), password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Ошибка"); return; }
      setSession({ username: data.username, token: data.token });
      setProfile({ name: data.name, username: data.username, bio: data.bio || "", avatar: data.avatar });
      setAuthMode("none");
    } catch (_) { setAuthError("Нет соединения"); }
    finally { setAuthLoading(false); }
  };

  // ── Save edit ──
  const saveEdit = async () => {
    if (!editName.trim() || !session) return;
    const newProfile = { ...profile, name: editName.trim(), bio: editBio.trim() };
    setProfile(newProfile);
    setIsEditing(false);
    await fetch(`${FRIENDS_API}?action=update_profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: session.username, token: session.token, name: newProfile.name, bio: newProfile.bio, avatar: newProfile.avatar }),
    }).catch(() => {});
  };

  const logout = () => { setSession(null); setProfile(defaultProfile); setShowLogoutConfirm(false); };

  const deleteChat = (id: string) => {
    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);
    localStorage.setItem(CHATS_KEY, JSON.stringify(updated));
    setDeleteConfirmId(null);
  };

  const sendFriendRequest = async () => {
    if (!friendUsername.trim() || !profile.username) return;
    setFriendError(""); setFriendLoading(true);
    try {
      const res = await fetch(`${FRIENDS_API}?action=send_request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_username: profile.username, to_username: friendUsername.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setFriendError(data.error || "Ошибка"); }
      else { setFriendSent(true); setTimeout(() => { setShowAddFriend(false); setFriendUsername(""); setFriendSent(false); setFriendError(""); }, 1500); }
    } catch (_) { setFriendError("Нет соединения"); }
    finally { setFriendLoading(false); }
  };

  // ── Auth form ──
  if (authMode !== "none") {
    const isReg = authMode === "register";
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Golos Text', sans-serif" }}>
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <BotAvatar size={44} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-base leading-tight">Семицвет AI 2.0</div>
              <div className="text-xs font-medium" style={{ color: "#7B61FF" }}>Голосовой помощник</div>
            </div>
          </div>
          {NAV_TABS(navigate, "/profile", friendsBadge)}
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-sm border border-gray-100">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                <Icon name={isReg ? "UserPlus" : "LogIn"} size={24} className="text-white" />
              </div>
              <h2 className="font-semibold text-gray-900 text-base">{isReg ? "Создать профиль" : "Войти в профиль"}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{isReg ? "Регистрация займёт минуту" : "Введите данные для входа"}</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
                <input type="text" value={authUsername} onChange={(e) => { setAuthUsername(e.target.value); setAuthError(""); }}
                  placeholder="username" maxLength={20}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all" />
              </div>

              {isReg && (
                <input type="text" value={authName} onChange={(e) => { setAuthName(e.target.value); setAuthError(""); }}
                  placeholder="Ваше имя"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all" />
              )}

              <PasswordInput value={authPassword} onChange={(v) => { setAuthPassword(v); setAuthError(""); }} placeholder="Пароль (мин. 6 символов)" />

              {isReg && (
                <PasswordInput value={authConfirm} onChange={(v) => { setAuthConfirm(v); setAuthError(""); }} placeholder="Подтвердите пароль" />
              )}

              {authError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
                  <Icon name="AlertCircle" size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-500">{authError}</p>
                </div>
              )}

              <button
                onClick={isReg ? doRegister : doLogin}
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
              >
                {authLoading ? "Загрузка..." : isReg ? "Зарегистрироваться" : "Войти"}
              </button>

              <button onClick={() => { setAuthMode(isReg ? "login" : "register"); setAuthError(""); setAuthPassword(""); setAuthConfirm(""); }}
                className="w-full py-2 text-xs text-gray-400 hover:text-purple-500 transition-colors">
                {isReg ? "Уже есть профиль? Войти" : "Нет профиля? Создать"}
              </button>

              <button onClick={() => { setAuthMode("none"); setAuthError(""); }}
                className="w-full py-1.5 text-xs text-gray-300 hover:text-gray-500 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not logged in ──
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Golos Text', sans-serif" }}>
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <BotAvatar size={44} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-base leading-tight">Семицвет AI 2.0</div>
              <div className="text-xs font-medium" style={{ color: "#7B61FF" }}>Голосовой помощник</div>
            </div>
          </div>
          {NAV_TABS(navigate, "/profile", friendsBadge)}
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4 border-2 border-purple-100">
              <Icon name="User" size={36} className="text-purple-300" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">Профиль не создан</p>
            <p className="text-sm text-gray-400 mb-6">Создайте профиль или войдите,<br />чтобы добавлять друзей и сохранять переписки</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <button onClick={() => { setAuthMode("register"); setAuthError(""); setAuthPassword(""); setAuthConfirm(""); setAuthUsername(""); setAuthName(""); }}
                className="py-3 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                Создать профиль
              </button>
              <button onClick={() => { setAuthMode("login"); setAuthError(""); setAuthPassword(""); setAuthUsername(""); }}
                className="py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                Войти в существующий
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Logged in ──
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Golos Text', sans-serif" }}>
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotAvatar size={44} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-base leading-tight">Семицвет AI 2.0</div>
            <div className="text-xs font-medium" style={{ color: "#7B61FF" }}>Голосовой помощник</div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            <span className="text-xs text-green-600 font-medium">онлайн</span>
          </div>
        </div>
        {NAV_TABS(navigate, "/profile", friendsBadge)}
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 space-y-4">

        {/* Profile card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {isEditing ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Редактировать профиль</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-purple-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200">
                      <Icon name="User" size={24} className="text-gray-300" />
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow text-white"
                    style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                    <Icon name="Camera" size={11} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">Нажмите на иконку камеры<br />чтобы выбрать фото</div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Имя</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ваше имя"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">О себе</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Пару слов о вас..." rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Отмена</button>
                <button onClick={saveEdit} disabled={!editName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 active:scale-95 transition-all"
                  style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>Сохранить</button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Мой профиль</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-purple-100 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 border-2 border-purple-100">
                      <Icon name="User" size={28} className="text-purple-300" />
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow text-white"
                    style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                    <Icon name="Camera" size={10} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{profile.name}</p>
                  {profile.username && <p className="text-sm font-medium" style={{ color: "#7B61FF" }}>@{profile.username}</p>}
                  {profile.bio && <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{profile.bio}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setEditName(profile.name); setEditBio(profile.bio); setIsEditing(true); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all">
                  <Icon name="Pencil" size={14} />Изменить
                </button>
                <button onClick={() => setShowAddFriend(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                  <Icon name="UserPlus" size={14} />Добавить друга
                </button>
                <button onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-400 hover:bg-gray-50 transition-all">
                  <Icon name="LogOut" size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Saved chats */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Сохранённые переписки</h2>
            <span className="text-xs text-gray-400">{chats.length} шт.</span>
          </div>
          {chats.length === 0 ? (
            <div className="text-center py-5">
              <Icon name="Archive" size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Нет сохранённых переписок</p>
              <p className="text-xs text-gray-300 mt-1">В чате нажмите «Сохранить»</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div key={chat.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #EEE9FF, #DDD6FE)" }}>
                    <Icon name="MessageSquare" size={16} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewChat(chat)}>
                    <p className="text-sm font-medium text-gray-800 truncate">{chat.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{chat.date} · {chat.messages.length} сообщ.</p>
                  </div>
                  <button onClick={() => setDeleteConfirmId(chat.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                    <Icon name="Trash2" size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Icon name="LogOut" size={22} className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">Выйти из профиля?</p>
            <p className="text-sm text-gray-400 mb-5">Войти можно будет по паролю</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Отмена</button>
              <button onClick={logout} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-sm font-medium text-white">Выйти</button>
            </div>
          </div>
        </div>
      )}

      {/* Add friend modal */}
      {showAddFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowAddFriend(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            {friendSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <Icon name="Check" size={22} className="text-green-400" />
                </div>
                <p className="font-semibold text-gray-900">Заявка отправлена!</p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Добавить друга</h3>
                <p className="text-xs text-gray-400 mb-4">Введите юзернейм пользователя</p>
                <div className="relative mb-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
                  <input type="text" value={friendUsername} onChange={(e) => { setFriendUsername(e.target.value); setFriendError(""); }}
                    placeholder="username" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") sendFriendRequest(); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all" />
                </div>
                {friendError && <p className="text-xs text-red-400 mb-3">{friendError}</p>}
                {!friendError && <div className="mb-3" />}
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddFriend(false); setFriendError(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Отмена</button>
                  <button onClick={sendFriendRequest} disabled={!friendUsername.trim() || friendLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 active:scale-95 transition-all"
                    style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                    {friendLoading ? "..." : "Отправить"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View chat modal */}
      {viewChat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-0 sm:items-center sm:pb-6" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setViewChat(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{viewChat.title}</p>
                <p className="text-xs text-gray-400">{viewChat.date}</p>
              </div>
              <button onClick={() => setViewChat(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-all">
                <Icon name="X" size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {viewChat.messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}
                    style={m.role === "user" ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}>
                    <p>{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.role === "user" ? "text-purple-200" : "text-gray-400"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete chat confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Icon name="Trash2" size={22} className="text-red-400" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">Удалить переписку?</p>
            <p className="text-sm text-gray-400 mb-5">Это действие нельзя отменить</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Отмена</button>
              <button onClick={() => deleteChat(deleteConfirmId)} className="flex-1 py-2.5 rounded-xl bg-red-400 text-sm font-medium text-white">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin LP button */}
      {isAdmin && (
        <button
          onClick={() => { setShowAdmin(true); setAdminResult(null); }}
          className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-2xl shadow-lg text-white text-sm font-bold tracking-tight transition-all active:scale-95 hover:shadow-xl"
          style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}
        >
          LP
        </button>
      )}

      {/* Admin panel modal */}
      {showAdmin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowAdmin(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100"
              style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon name="ShieldCheck" size={14} className="text-white" />
                </div>
                <span className="font-bold text-white text-sm">Панель администратора</span>
              </div>
              <button onClick={() => setShowAdmin(false)} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Icon name="X" size={14} className="text-white" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 px-4 pt-4">
              {([
                { key: "broadcast", icon: "Megaphone", label: "Сообщение" },
                { key: "ban", icon: "ShieldX", label: "Забанить" },
                { key: "unban", icon: "ShieldCheck", label: "Разбанить" },
              ] as const).map((t) => (
                <button key={t.key} onClick={() => { setAdminTab(t.key); setAdminResult(null); setAdminTarget(""); setAdminText(""); }}
                  className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={adminTab === t.key
                    ? { background: "linear-gradient(135deg, #1a1a2e, #16213e)", color: "white" }
                    : { border: "1px solid #e5e7eb", color: "#6b7280" }}>
                  <Icon name={t.icon} size={15} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-4 py-4 flex flex-col gap-3">
              {adminTab === "broadcast" && (
                <>
                  <select value={adminMsgType} onChange={(e) => setAdminMsgType(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 transition-all">
                    <option value="announcement">📢 Объявление</option>
                    <option value="update">🆕 Обновление</option>
                    <option value="warning">⚠️ Предупреждение</option>
                    <option value="info">ℹ️ Информация</option>
                  </select>
                  <textarea value={adminText} onChange={(e) => setAdminText(e.target.value)}
                    placeholder="Текст системного сообщения..." rows={3}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-purple-300 transition-all resize-none" />
                  <button onClick={adminBroadcast} disabled={adminLoading || !adminText.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
                    {adminLoading ? "Отправка..." : "Отправить всем"}
                  </button>
                </>
              )}

              {(adminTab === "ban" || adminTab === "unban") && (
                <>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
                    <input type="text" value={adminTarget} onChange={(e) => setAdminTarget(e.target.value)}
                      placeholder="username"
                      onKeyDown={(e) => { if (e.key === "Enter") adminBan(adminTab === "unban"); }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 transition-all" />
                  </div>
                  <button onClick={() => adminBan(adminTab === "unban")} disabled={adminLoading || !adminTarget.trim()}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 ${adminTab === "ban" ? "bg-red-400" : "bg-green-400"}`}>
                    {adminLoading ? "..." : adminTab === "ban" ? "Забанить пользователя" : "Разбанить пользователя"}
                  </button>
                </>
              )}

              {adminResult && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${adminResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  <Icon name={adminResult.ok ? "CheckCircle" : "AlertCircle"} size={15} />
                  {adminResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}