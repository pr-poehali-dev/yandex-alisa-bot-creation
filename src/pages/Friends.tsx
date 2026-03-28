import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { NAV_TABS, PROFILE_KEY, FRIENDS_API } from "./Profile";

interface Friend {
  username: string;
  name: string;
  avatar: string | null;
  since: string;
}

interface FriendRequest {
  username: string;
  name: string;
  avatar: string | null;
}

interface FriendMessage {
  id: number;
  from: string;
  text: string;
  time: string;
}

function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
  catch { return null; }
}

function formatTime(iso: string) {
  return iso.slice(0, 5);
}

const UserAvatar = ({ avatar, name, size = 40 }: { avatar: string | null; name: string; size?: number }) => (
  avatar ? (
    <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white text-sm"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
);

const BotAvatar = ({ size = 44 }: { size?: number }) => (
  <div className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
    style={{ width: size, height: size, background: "linear-gradient(135deg, #7B61FF 0%, #A78BFA 50%, #C4B5FD 100%)" }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="10" r="5" fill="white" fillOpacity="0.95" />
      <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  </div>
);

export default function Friends() {
  const navigate = useNavigate();
  const profile = getProfile();
  const me: string = profile?.username || "";

  const bottomRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeChat, setActiveChat] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);

  const [deleteConfirmFriend, setDeleteConfirmFriend] = useState<Friend | null>(null);

  const api = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${FRIENDS_API}${path}`, opts);
    return res.json();
  }, []);

  const loadFriends = useCallback(async () => {
    if (!me) return;
    const data = await api(`?action=get_friends&username=${me}`);
    setFriends(data.friends || []);
  }, [me, api]);

  const loadRequests = useCallback(async () => {
    if (!me) return;
    const data = await api(`?action=get_requests&username=${me}`);
    setRequests(data.requests || []);
  }, [me, api]);

  useEffect(() => {
    if (!me) { setLoading(false); return; }
    Promise.all([loadFriends(), loadRequests()]).finally(() => setLoading(false));
  }, [me, loadFriends, loadRequests]);

  // Poll messages when in active chat
  useEffect(() => {
    if (!activeChat || !me) return;
    const load = async () => {
      const data = await api(`?action=get_messages&username=${me}&friend_username=${activeChat.username}`);
      setMessages(data.messages || []);
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [activeChat, me, api]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const acceptRequest = async (req: FriendRequest) => {
    await api(`?action=accept_request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_username: req.username, to_username: me }),
    });
    await Promise.all([loadFriends(), loadRequests()]);
    setTab("friends");
  };

  const declineRequest = async (req: FriendRequest) => {
    await api(`?action=decline_request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_username: req.username, to_username: me }),
    });
    loadRequests();
  };

  const removeFriend = async (friend: Friend) => {
    await api(`?action=remove_friend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: me, friend_username: friend.username }),
    });
    setDeleteConfirmFriend(null);
    setActiveChat(null);
    loadFriends();
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeChat || sending) return;
    const text = chatInput.trim();
    setSending(true);
    setChatInput("");
    await api(`?action=send_message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_username: me, to_username: activeChat.username, text }),
    });
    const data = await api(`?action=get_messages&username=${me}&friend_username=${activeChat.username}`);
    setMessages(data.messages || []);
    setSending(false);
  };

  if (!profile?.name) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Golos Text', sans-serif" }}>
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <BotAvatar size={44} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-base">Семицвет AI 2.0</div>
              <div className="text-xs font-medium" style={{ color: "#7B61FF" }}>Голосовой помощник</div>
            </div>
          </div>
          {NAV_TABS(navigate, "/friends")}
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <Icon name="Users" size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Сначала создайте профиль</p>
            <p className="text-sm text-gray-400 mb-4">Нужен профиль с юзернеймом</p>
            <button onClick={() => navigate("/profile")} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>Создать профиль</button>
          </div>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Golos Text', sans-serif" }}>
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <BotAvatar size={44} /><div className="flex-1"><div className="font-semibold text-gray-900">Семицвет AI 2.0</div></div>
          </div>
          {NAV_TABS(navigate, "/friends")}
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <Icon name="AtSign" size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Нет юзернейма</p>
            <p className="text-sm text-gray-400 mb-4">Добавьте юзернейм в профиле, чтобы добавлять друзей</p>
            <button onClick={() => navigate("/profile")} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>Добавить юзернейм</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Chat view ── */
  if (activeChat) {
    return (
      <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Golos Text', sans-serif" }}>
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => setActiveChat(null)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all -ml-1">
              <Icon name="ArrowLeft" size={20} className="text-gray-600" />
            </button>
            <UserAvatar avatar={activeChat.avatar} name={activeChat.name} size={38} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight">{activeChat.name}</p>
              <p className="text-xs" style={{ color: "#7B61FF" }}>@{activeChat.username}</p>
            </div>
            <button onClick={() => setDeleteConfirmFriend(activeChat)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-50 transition-all">
              <Icon name="UserMinus" size={17} className="text-red-400" />
            </button>
          </div>
        </header>

        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-purple-300 focus-within:bg-white transition-all">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Написать ${activeChat.name}...`}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none" />
            <button onClick={sendMessage} disabled={!chatInput.trim() || sending}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
              <Icon name="Send" size={15} className="text-white" />
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50/40 px-4 py-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm text-gray-300">Напишите первое сообщение</p>
              </div>
            )}
            {messages.map((m) => {
              const isMe = m.from === me;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
                  {!isMe && <UserAvatar avatar={activeChat.avatar} name={activeChat.name} size={28} />}
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"}`}
                    style={isMe ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}>
                    <p>{m.text}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? "text-purple-200" : "text-gray-300"}`}>{formatTime(m.time)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </main>

        {deleteConfirmFriend && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDeleteConfirmFriend(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <Icon name="UserMinus" size={22} className="text-red-400" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">Удалить из друзей?</p>
              <p className="text-sm text-gray-400 mb-5">История чата также удалится</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmFriend(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Отмена</button>
                <button onClick={() => removeFriend(deleteConfirmFriend)} className="flex-1 py-2.5 rounded-xl bg-red-400 text-sm font-medium text-white">Удалить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Friends list view ── */
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
        {NAV_TABS(navigate, "/friends")}
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setTab("friends")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === "friends" ? "text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            style={tab === "friends" ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}>
            Друзья {friends.length > 0 && `(${friends.length})`}
          </button>
          <button onClick={() => setTab("requests")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === "requests" ? "text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            style={tab === "requests" ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}>
            Заявки
            {requests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-red-400 text-white">{requests.length}</span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />
          </div>
        ) : tab === "friends" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {friends.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Icon name="Users" size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-1">Друзей пока нет</p>
                <p className="text-xs text-gray-300">Перейдите в профиль и нажмите «Добавить друга»</p>
              </div>
            ) : (
              friends.map((friend, i) => (
                <div key={friend.username}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-all ${i < friends.length - 1 ? "border-b border-gray-50" : ""}`}
                  onClick={() => setActiveChat(friend)}>
                  <UserAvatar avatar={friend.avatar} name={friend.name} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{friend.name}</p>
                    <p className="text-xs text-gray-400">@{friend.username}</p>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-gray-300 flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {requests.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Icon name="UserCheck" size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Нет входящих заявок</p>
              </div>
            ) : (
              requests.map((req, i) => (
                <div key={req.username} className={`flex items-center gap-3 px-4 py-3 ${i < requests.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <UserAvatar avatar={req.avatar} name={req.name} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{req.name}</p>
                    <p className="text-xs text-gray-400">@{req.username}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => declineRequest(req)} className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-red-50 transition-all">
                      <Icon name="X" size={14} className="text-red-400" />
                    </button>
                    <button onClick={() => acceptRequest(req)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all active:scale-95"
                      style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                      <Icon name="Check" size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-300">Ваш юзернейм: @{me}</p>
      </div>
    </div>
  );
}
