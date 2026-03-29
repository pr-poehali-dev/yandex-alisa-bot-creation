import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { NAV_TABS, getFriendsBadge } from "@/pages/Profile";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
}

const CHATBOT_URL = "https://functions.poehali.dev/63a16562-0f1a-4ed8-b2af-50a93bf90aa3";

const SUGGESTIONS = ["Кто ты?", "Что умеешь?", "Как дела?", "Помощь"];

function getTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

const BotAvatar = ({ size = 48, animated = false }: { size?: number; animated?: boolean }) => (
  <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
    {animated && (
      <div
        className="absolute rounded-full bg-alice-purple animate-pulse-ring"
        style={{ inset: -5 }}
      />
    )}
    <div
      className="relative rounded-full flex items-center justify-center overflow-hidden"
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
  </div>
);

const TypingIndicator = () => (
  <div className="flex items-end gap-3 animate-fade-in">
    <BotAvatar size={36} />
    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex gap-1.5 items-center h-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-alice-purple animate-dot-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

function getChatUser() {
  try {
    const p = JSON.parse(localStorage.getItem("semitsvet_profile") || "null");
    const s = JSON.parse(localStorage.getItem("semitsvet_session") || "null");
    return { name: p?.name || "", isVip: !!s?.is_vip };
  } catch { return { name: "", isVip: false }; }
}

export default function Index() {
  const navigate = useNavigate();
  const [friendsBadge, setFriendsBadge] = useState(getFriendsBadge);
  const [chatUser] = useState(getChatUser);
  useEffect(() => {
    const h = () => setFriendsBadge(getFriendsBadge());
    window.addEventListener("friends-badge-update", h);
    return () => window.removeEventListener("friends-badge-update", h);
  }, []);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "bot",
      text: "Привет! Я помощник Семицвет AI 2.0 от разработчика Lavrov1yList. Задайте любой вопрос, и я постараюсь помочь.",
      time: getTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      text: text.trim(),
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const history = messages.map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      }));

      const res = await fetch(CHATBOT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      const data = await res.json();
      const reply = data.reply || "Не смог получить ответ, попробуйте ещё раз.";

      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: "bot",
        text: reply,
        time: getTime(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: "bot",
        text: "Ошибка соединения, попробуйте позже.",
        time: getTime(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const saveChat = () => {
    const profile = JSON.parse(localStorage.getItem("semitsvet_profile") || "null");
    if (!profile?.name) {
      navigate("/profile");
      return;
    }
    const chats = JSON.parse(localStorage.getItem("semitsvet_chats") || "[]");
    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = firstUserMsg ? firstUserMsg.text.slice(0, 40) : "Переписка";
    const newChat = {
      id: Date.now().toString(),
      title,
      date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
      messages: messages.map(({ role, text, time }) => ({ role, text, time })),
    };
    localStorage.setItem("semitsvet_chats", JSON.stringify([newChat, ...chats]));
    navigate("/profile");
  };

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "'Golos Text', sans-serif" }}
    >
      <button
        onClick={() => setShowSupportModal(true)}
        className="fixed bottom-5 left-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
        title="Связаться со мной"
      >
        <Icon name="MessageCircle" size={22} className="text-white" />
      </button>

      {showSupportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
              <Icon name="MessageCircle" size={24} className="text-white" />
            </div>
            <p className="text-gray-800 text-sm leading-relaxed mb-5">
              Для тех поддержки пожалуйста перейдите в тг бота <strong>Семицвет AI</strong> и напишите команду <strong>/tex</strong>
            </p>
            <button
              onClick={() => setShowSupportModal(false)}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotAvatar size={44} animated />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-base leading-tight">Семицвет AI 2.0</div>
            <div className="text-xs font-medium" style={{ color: "#7B61FF" }}>
              Голосовой помощник
            </div>
          </div>
          {chatUser.name && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-600 font-medium truncate max-w-24">{chatUser.name}</span>
              {chatUser.isVip && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000" }}>ViP</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            <span className="text-xs text-green-600 font-medium">онлайн</span>
          </div>
        </div>
        {NAV_TABS(navigate, "/", friendsBadge)}
      </header>

      {/* Input area */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-purple-300 focus-within:bg-white transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
            >
              <Icon name="Send" size={15} className="text-white" style={{ marginLeft: 1 }} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-gray-300">
                Семицвет AI может ошибаться. Проверяйте важную информацию.
              </p>
              <button
                onClick={() => setShowInfoModal(true)}
                className="flex-shrink-0 w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-400 transition-colors"
                title="О боте"
              >
                <Icon name="Info" size={10} />
              </button>
            </div>
            {messages.length > 1 && (
              <button
                onClick={saveChat}
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-all active:scale-95"
                style={{ color: "#7B61FF" }}
              >
                <Icon name="Save" size={11} />
                Сохранить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto bg-gray-50/40">
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
          {/* Date divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium px-2">Сегодня</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex items-end gap-3 animate-fade-in ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {msg.role === "bot" && <BotAvatar size={36} />}

              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white rounded-br-sm"
                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
                }`}
                style={
                  msg.role === "user"
                    ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }
                    : undefined
                }
              >
                <p>{msg.text}</p>
                <p
                  className={`text-[10px] mt-1.5 ${
                    msg.role === "user" ? "text-purple-200" : "text-gray-300"
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          ))}

          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <p className="text-xs text-gray-400 mb-2 font-medium">Можете спросить:</p>
            <div className="flex gap-2 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all font-medium hover:shadow-sm active:scale-95"
                  style={{
                    borderColor: "#7B61FF",
                    color: "#7B61FF",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#EEE9FF";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}>
              <Icon name="Sparkles" size={24} className="text-white" />
            </div>
            <p className="text-gray-800 text-sm leading-relaxed mb-5">
              Вас приветствует <strong>Семицвет AI</strong>, от разработчика <strong>Lavrov1yList</strong>. Спасибо если пользуетесь ботом!
            </p>
            <button
              onClick={() => setShowInfoModal(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

    </div>
  );
}