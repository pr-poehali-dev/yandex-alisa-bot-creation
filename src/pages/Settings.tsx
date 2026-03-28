import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

export interface CustomPhrase {
  id: string;
  trigger: string;
  response: string;
}

const STORAGE_KEY = "semitsvet_custom_phrases";

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

export default function Settings() {
  const navigate = useNavigate();
  const [botName, setBotName] = useState("Семицвет AI 2.0");
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState("ru");

  const [phrases, setPhrases] = useState<CustomPhrase[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTrigger, setFormTrigger] = useState("");
  const [formResponse, setFormResponse] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases));
  }, [phrases]);

  const openAdd = () => {
    setEditingId(null);
    setFormTrigger("");
    setFormResponse("");
    setShowModal(true);
  };

  const openEdit = (p: CustomPhrase) => {
    setEditingId(p.id);
    setFormTrigger(p.trigger);
    setFormResponse(p.response);
    setShowModal(true);
  };

  const savePhrase = () => {
    if (!formTrigger.trim() || !formResponse.trim()) return;
    if (editingId) {
      setPhrases((prev) => prev.map((p) => p.id === editingId ? { ...p, trigger: formTrigger.trim(), response: formResponse.trim() } : p));
    } else {
      setPhrases((prev) => [...prev, { id: Date.now().toString(), trigger: formTrigger.trim(), response: formResponse.trim() }]);
    }
    setShowModal(false);
  };

  const deletePhrase = (id: string) => {
    setPhrases((prev) => prev.filter((p) => p.id !== id));
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
            <div className="text-xs font-medium" style={{ color: "#7B61FF" }}>
              Голосовой помощник
            </div>
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
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all text-white"
            style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
          >
            <Icon name="Settings" size={16} />
            Настройки
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 space-y-4">

        {/* Bot info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">О боте</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Имя бота</label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-700">Разработчик</span>
              <span className="text-sm font-medium" style={{ color: "#7B61FF" }}>Lavrov1yList</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-700">Версия</span>
              <span className="text-sm text-gray-400">2.0</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Уведомления</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800">Push-уведомления</p>
                <p className="text-xs text-gray-400">Получать уведомления от бота</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${notifications ? "" : "bg-gray-200"}`}
                style={notifications ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${notifications ? "left-6" : "left-1"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800">Звуки</p>
                <p className="text-xs text-gray-400">Звук при получении сообщений</p>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${soundEnabled ? "" : "bg-gray-200"}`}
                style={soundEnabled ? { background: "linear-gradient(135deg, #7B61FF, #A78BFA)" } : undefined}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${soundEnabled ? "left-6" : "left-1"}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Внешний вид</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${theme === "light" ? "border-purple-400 bg-purple-50" : "border-gray-200"}`}
            >
              <Icon name="Sun" size={20} className={theme === "light" ? "text-purple-500" : "text-gray-400"} />
              <span className={`text-xs font-medium ${theme === "light" ? "text-purple-600" : "text-gray-500"}`}>Светлая</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${theme === "dark" ? "border-purple-400 bg-purple-50" : "border-gray-200"}`}
            >
              <Icon name="Moon" size={20} className={theme === "dark" ? "text-purple-500" : "text-gray-400"} />
              <span className={`text-xs font-medium ${theme === "dark" ? "text-purple-600" : "text-gray-500"}`}>Тёмная</span>
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Язык</h2>
          <div className="flex gap-3">
            {[{ code: "ru", label: "Русский" }, { code: "en", label: "English" }].map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${language === l.code ? "border-purple-400 bg-purple-50 text-purple-600" : "border-gray-200 text-gray-500"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom phrases */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Свои фразы</h2>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
            >
              <Icon name="Plus" size={13} />
              Добавить
            </button>
          </div>

          {phrases.length === 0 ? (
            <div className="text-center py-6">
              <Icon name="MessageSquarePlus" size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Нет добавленных фраз</p>
              <p className="text-xs text-gray-300 mt-1">Нажмите «Добавить», чтобы создать свой ответ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {phrases.map((p) => (
                <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-purple-600 truncate">«{p.trigger}»</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.response}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-all">
                      <Icon name="Pencil" size={13} className="text-gray-400" />
                    </button>
                    <button onClick={() => deletePhrase(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-all">
                      <Icon name="Trash2" size={13} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear chat */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Данные</h2>
          <button className="w-full py-2.5 rounded-xl border-2 border-red-100 text-sm font-medium text-red-400 hover:bg-red-50 transition-all">
            Очистить историю чата
          </button>
        </div>

      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editingId ? "Редактировать фразу" : "Новая фраза"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Фраза пользователя</label>
                <input
                  type="text"
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                  placeholder="Например: сколько стоит"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ответ бота</label>
                <textarea
                  value={formResponse}
                  onChange={(e) => setFormResponse(e.target.value)}
                  placeholder="Что ответит бот..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-300 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={savePhrase}
                disabled={!formTrigger.trim() || !formResponse.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 active:scale-95"
                style={{ background: "linear-gradient(135deg, #7B61FF, #A78BFA)" }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}