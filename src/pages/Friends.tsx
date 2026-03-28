import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { NAV_TABS, PROFILE_KEY } from "./Profile";

const FRIENDS_KEY = "semitsvet_friends";
const REQUESTS_KEY = "semitsvet_friend_requests";
const FRIEND_CHATS_KEY = "semitsvet_friend_chats";

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  addedAt: string;
}

interface FriendRequest {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

interface FriendMessage {
  id: string;
  from: "me" | "friend";
  text: string;
  time: string;
}

interface FriendChat {
  friendId: string;
  messages: FriendMessage[];
}

function getTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

const DEMO_REQUESTS: FriendRequest[] = [
  { id: "demo1", name: "Алиса", username: "alisa_ai", avatar: null },
  { id: "demo2", name: "Максим", username: "max_dev", avatar: null },
];

const UserAvatar = ({ avatar, name, size = 40 }: { avatar: string | null; name: string; size?: number }) => (
  avatar ? (
    <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white text-sm"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
    >
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const profile = (() => { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); } catch { return null; } })();

  const [friends, setFriends] = useState<Friend[]>(() => {
    try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]"); }
    catch { return []; }
  });

  const [requests, setRequests] = useState<FriendRequest[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(REQUESTS_KEY) || "null");
      return saved ?? DEMO_REQUESTS;
    }
    catch { return DEMO_REQUESTS; }
  });

  const [friendChats, setFriendChats] = useState<FriendChat[]>(() => {
    try { return JSON.parse(localStorage.getItem(FRIEND_CHATS_KEY) || "[]"); }
    catch { return []; }
  });

  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [activeChat, setActiveChat] = useState<Friend | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends)); }, [friends]);
  useEffect(() => { localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests)); }, [requests]);
  useEffect(() => { localStorage.setItem(FRIEND_CHATS_KEY, JSON.stringify(friendChats)); }, [friendChats]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat, friendChats, isTyping]);

  const acceptRequest = (req: FriendRequest) => {
    const newFriend: Friend = {
      id: req.id,
      name: req.name,
      username: req.username,
      avatar: req.avatar,
      addedAt: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
    };
    setFriends((prev) => [...prev, newFriend]);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setTab("friends");
  };

  const declineRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const deleteFriend = (id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    setFriendChats((prev) => prev.filter((c) => c.friendId !== id));
    setDeleteConfirmId(null);
    if (activeChat?.id === id) setActiveChat(null);
  };

  const getChat = (friendId: string): FriendMessage[] => {
    return friendChats.find((c) => c.friendId === friendId)?.messages || [];
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !activeChat) return;
    const msg: FriendMessage = { id: Date.now().toString(), from: "me", text: chatInput.trim(), time: getTime() };
    setFriendChats((prev) => {
      const existing = prev.find((c) => c.friendId === activeChat.id);
      if (existing) return prev.map((c) => c.friendId === activeChat.id ? { ...c, messages: [...c.messages, msg] } : c);
      return [...prev, { friendId: activeChat.id, messages: [msg] }];
    });
    setChatInput("");
    setIsTyping(true);
    setTimeout(() => {
      const replies = [
        "Привет! Как дела?", "Окей, понял 👍", "Интересно!", "Расскажи подробнее", "Хорошо, договорились!", "Ха, смешно 😄", "Скоро отвечу!"
      ];
      const reply: FriendMessage = {
        id: (Date.now() + 1).toString(),
        from: "friend",
        text: replies[Math.floor(Math.random() * replies.length)],
        time: getTime(),
      };
      setFriendChats((prev) => {
        const existing = prev.find((c) => c.friendId === activeChat.id);
        if (existing) return prev.map((c) => c.friendId === activeChat.id ? { ...c, messages: [...c.messages, reply] } : c);
        return [...prev, { friendId: activeChat.id, messages: [reply] }];
      });
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  const lastMsg = (friendId: string) => {
    const msgs = getChat(friendId);
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
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
            <p className="text-sm text-gray-400 mb-4">Чтобы добавлять друзей, нужен профиль</p>
            <button onClick={() => navigate("/profile")} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>Создать профиль</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Chat view ── */
  if (activeChat) {
    const messages = getChat(activeChat.id);
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
            <button onClick={() => setDeleteConfirmId(activeChat.id)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-50 transition-all">
              <Icon name="UserMinus" size={17} className="text-red-400" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/40 px-4 py-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm text-gray-300">Напишите первое сообщение</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"} items-end gap-2`}>
                {m.from === "friend" && <UserAvatar avatar={activeChat.avatar} name={activeChat.name} size={28} />}
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.from === "me" ? "text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"}`}
                  style={m.from === "me" ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}
                >
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.from === "me" ? "text-purple-200" : "text-gray-300"}`}>{m.time}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-end gap-2">
                <UserAvatar avatar={activeChat.avatar} name={activeChat.name} size={28} />
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#A78BFA", animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </main>

        <div className="bg-white border-t border-gray-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-purple-300 focus-within:bg-white transition-all">
            <input
              type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Написать ${activeChat.name}...`}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            <button onClick={sendMessage} disabled={!chatInput.trim() || isTyping}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
              <Icon name="Send" size={15} className="text-white" />
            </button>
          </div>
        </div>

        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDeleteConfirmId(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <Icon name="UserMinus" size={22} className="text-red-400" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">Удалить из друзей?</p>
              <p className="text-sm text-gray-400 mb-5">История чата также удалится</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Отмена</button>
                <button onClick={() => deleteFriend(deleteConfirmId)} className="flex-1 py-2.5 rounded-xl bg-red-400 text-sm font-medium text-white">Удалить</button>
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
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("friends")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === "friends" ? "text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            style={tab === "friends" ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}
          >
            Друзья {friends.length > 0 && `(${friends.length})`}
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all relative ${tab === "requests" ? "text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            style={tab === "requests" ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}
          >
            Заявки
            {requests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-red-400 text-white">{requests.length}</span>
            )}
          </button>
        </div>

        {tab === "friends" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {friends.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Icon name="Users" size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-1">Друзей пока нет</p>
                <p className="text-xs text-gray-300">Примите заявку или добавьте друга в профиле</p>
              </div>
            ) : (
              <div>
                {friends.map((friend, i) => {
                  const last = lastMsg(friend.id);
                  return (
                    <div key={friend.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-all ${i < friends.length - 1 ? "border-b border-gray-50" : ""}`}
                      onClick={() => setActiveChat(friend)}
                    >
                      <UserAvatar avatar={friend.avatar} name={friend.name} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <p className="font-semibold text-gray-900 text-sm">{friend.name}</p>
                          {last && <span className="text-[10px] text-gray-300 ml-2 flex-shrink-0">{last.time}</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {last ? (last.from === "me" ? `Вы: ${last.text}` : last.text) : `@${friend.username} · добавлен ${friend.addedAt}`}
                        </p>
                      </div>
                      <Icon name="ChevronRight" size={16} className="text-gray-300 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {requests.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Icon name="UserCheck" size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Нет входящих заявок</p>
              </div>
            ) : (
              <div>
                {requests.map((req, i) => (
                  <div key={req.id} className={`flex items-center gap-3 px-4 py-3 ${i < requests.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <UserAvatar avatar={req.avatar} name={req.name} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{req.name}</p>
                      <p className="text-xs text-gray-400">@{req.username}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => declineRequest(req.id)} className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-red-50 transition-all">
                        <Icon name="X" size={14} className="text-red-400" />
                      </button>
                      <button onClick={() => acceptRequest(req)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all active:scale-95"
                        style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
                        <Icon name="Check" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
