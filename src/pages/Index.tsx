import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
}

const BOT_RESPONSES: Record<string, string> = {
  default: "Я пока не подключён к настоящему ИИ, но скоро буду отвечать на любые вопросы! Напишите владельцу сайта, чтобы подключить меня.",
  привет: "Привет! Я Семицвет AI 2.0, ваш умный помощник. Чем могу помочь?",
  "как дела": "Отлично, спасибо что спросили! Готов помогать вам каждый день.",
  помощь: "Конечно помогу! Задайте любой вопрос, и я постараюсь найти ответ.",
  "что умеешь": "Я умею отвечать на вопросы, искать информацию, помогать с задачами и просто поддерживать беседу!",
  погода: "Сейчас я не могу проверить погоду, но вы можете спросить у меня что-то другое!",
  "кто ты": "Я Семицвет AI 2.0 — умный помощник от разработчика Lavrov1yList. Создан, чтобы делать вашу жизнь проще и интереснее.",
  спасибо: "Всегда пожалуйста! Обращайтесь, если понадоблюсь.",
};

const SUGGESTIONS = ["Кто ты?", "Что умеешь?", "Как дела?", "Помощь"];

function getBotResponse(text: string): string {
  const lower = text.toLowerCase().trim();
  for (const key of Object.keys(BOT_RESPONSES)) {
    if (lower.includes(key)) return BOT_RESPONSES[key];
  }
  return BOT_RESPONSES.default;
}

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

export default function Index() {
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
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

    setTimeout(() => {
      const botMsg: Message = {
        id: Date.now() + 1,
        role: "bot",
        text: getBotResponse(text),
        time: getTime(),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botMsg]);
    }, 900 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
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
            <a
              href="https://t.me/@SemycvetAIBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
            >
              Перейти в Telegram
            </a>
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
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            <span className="text-xs text-green-600 font-medium">онлайн</span>
          </div>
        </div>
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
          <p className="text-[10px] text-gray-300 text-center mt-2">
            Семицвет AI может ошибаться. Проверяйте важную информацию.
          </p>
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

    </div>
  );
}