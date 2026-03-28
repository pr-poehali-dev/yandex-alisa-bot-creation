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
    </div>
  );
}
