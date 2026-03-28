import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const PROFILE_KEY = "semitsvet_profile";
const CHATS_KEY = "semitsvet_chats";

interface Profile {
  name: string;
  bio: string;
  avatar: string | null;
}

interface SavedChat {
  id: string;
  title: string;
  date: string;
  messages: { role: "user" | "bot"; text: string; time: string }[];
}

const defaultProfile: Profile = { name: "", bio: "", avatar: null };

const BotAvatar = ({ size = 44 }: { size?: number }) => (
  <div
    className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: "linear-gradient(135deg, #7B61FF 0%, #A78BFA 50%, #C4B5FD 100%)",
    }}
  >
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="10" r="5" fill="white" fillOpacity="0.95" />
      <path
        d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  </div>
);

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null") || defaultProfile; }
    catch { return defaultProfile; }
  });
  const [chats, setChats] = useState<SavedChat[]>(() => {
    try { return JSON.parse(localStorage.getItem(CHATS_KEY) || "[]"); }
    catch { return []; }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editBio, setEditBio] = useState(profile.bio);

  const [viewChat, setViewChat] = useState<SavedChat | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const hasProfile = profile.name.trim().length > 0;

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfile((p) => ({ ...p, avatar: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    if (!editName.trim()) return;
    setProfile((p) => ({ ...p, name: editName.trim(), bio: editBio.trim() }));
    setIsEditing(false);
  };

  const deleteChat = (id: string) => {
    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);
    localStorage.setItem(CHATS_KEY, JSON.stringify(updated));
    setDeleteConfirmId(null);
  };

  const deleteProfile = () => {
    setProfile(defaultProfile);
    setIsEditing(false);
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ fontFamily: "'Golos Text', sans-serif" }}
    >
      {/* Header */}
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
        {/* Nav tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
          >
            <Icon name="MessageCircle" size={16} />
            Чат
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
          >
            <Icon name="Settings" size={16} />
            Настройки
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all text-white"
            style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
          >
            <Icon name="User" size={16} />
            Профиль
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 space-y-4">

        {/* Profile card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {!hasProfile && !isEditing ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Icon name="UserPlus" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Профиль не создан</p>
              <p className="text-xs text-gray-400 mb-4">Создайте профиль, чтобы сохранять переписки</p>
              <button
                onClick={() => { setEditName(""); setEditBio(""); setIsEditing(true); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
              >
                Создать профиль
              </button>
            </div>
          ) : isEditing ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {hasProfile ? "Редактировать профиль" : "Новый профиль"}
              </h2>

              {/* Avatar picker */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-purple-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200">
                      <Icon name="User" size={24} className="text-gray-300" />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow text-white"
                    style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
                  >
                    <Icon name="Camera" size={11} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  Нажмите на иконку камеры<br />чтобы выбрать фото
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Имя *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">О себе</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Пару слов о вас..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={saveProfile}
                  disabled={!editName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Мой профиль</h2>
              <div className="flex items-center gap-4">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-purple-100 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 border-2 border-purple-100">
                    <Icon name="User" size={28} className="text-purple-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{profile.name}</p>
                  {profile.bio && <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{profile.bio}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setEditName(profile.name); setEditBio(profile.bio); setIsEditing(true); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all"
                >
                  <Icon name="Pencil" size={14} />
                  Изменить
                </button>
                <button
                  onClick={deleteProfile}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-100 text-sm text-red-400 hover:bg-red-50 transition-all"
                >
                  <Icon name="Trash2" size={14} />
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Saved chats */}
        {hasProfile && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Сохранённые переписки</h2>
              <span className="text-xs text-gray-400">{chats.length} шт.</span>
            </div>

            {chats.length === 0 ? (
              <div className="text-center py-5">
                <Icon name="Archive" size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Нет сохранённых переписок</p>
                <p className="text-xs text-gray-300 mt-1">В чате нажмите «Сохранить переписку»</p>
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
                    <button
                      onClick={() => setDeleteConfirmId(chat.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Icon name="Trash2" size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* View chat modal */}
      {viewChat && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-0 sm:items-center sm:pb-6"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setViewChat(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
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
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}
                    style={m.role === "user" ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}
                  >
                    <p>{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.role === "user" ? "text-purple-200" : "text-gray-400"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Icon name="Trash2" size={22} className="text-red-400" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">Удалить переписку?</p>
            <p className="text-sm text-gray-400 mb-5">Это действие нельзя отменить</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteChat(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-red-400 text-sm font-medium text-white hover:bg-red-500 transition-all"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
