import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const SESSION_KEY = "semitsvet_session";
const FRIENDS_API = "https://functions.poehali.dev/8b800673-e429-482e-b986-dcde22d05eaf";

interface BanContextValue {
  isBanned: boolean;
  setIsBanned: (v: boolean) => void;
}

const BanContext = createContext<BanContextValue>({ isBanned: false, setIsBanned: () => {} });

export function BanProvider({ children }: { children: ReactNode }) {
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    const checkBan = () => {
      try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (!session) return;
        fetch(`${FRIENDS_API}?action=verify_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: session.username, token: session.token }),
        })
          .then((r) => r.json())
          .then((data) => { if (data.ok && data.banned) setIsBanned(true); })
          .catch(() => {});
      } catch (_) { /* offline */ }
    };

    checkBan();
    const interval = setInterval(checkBan, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BanContext.Provider value={{ isBanned, setIsBanned }}>
      {isBanned ? (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
          style={{ background: "#000" }}
        >
          <div className="text-center px-8">
            <div className="text-6xl mb-6">🚫</div>
            <h1
              className="text-4xl font-black tracking-tight mb-3"
              style={{ color: "#ff2222", textShadow: "0 0 32px #ff0000aa" }}
            >
              ВЫ ЗАБАНЕНЫ
            </h1>
            <p className="text-sm" style={{ color: "#660000" }}>
              Доступ к аккаунту ограничен администратором
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </BanContext.Provider>
  );
}

export const useBan = () => useContext(BanContext);

export default BanProvider;