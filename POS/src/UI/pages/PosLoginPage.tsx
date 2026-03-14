import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Eye, EyeOff, Delete } from "lucide-react";

const OUTLETS = [
  { id: "1", name: "Main Branch – Downtown" },
  { id: "2", name: "City Center Mall" },
  { id: "3", name: "Airport Terminal" },
];

const USERS_BY_OUTLET: Record<string, User[]> = {
  "1": [
    { id: "u1", name: "Arjun Sharma", initials: "AS", role: "Manager", pin: "1234", color: "#3b82f6" },
    { id: "u2", name: "Priya Nair", initials: "PN", role: "Cashier", pin: "2345", color: "#64748b" },
    { id: "u3", name: "Rohan Mehta", initials: "RM", role: "Waiter", pin: "3456", color: "#64748b" },
    { id: "u4", name: "Sneha Patel", initials: "SP", role: "Admin", pin: "4567", color: "#64748b" },
  ],
  "2": [
    { id: "u5", name: "Kiran Das", initials: "KD", role: "Manager", pin: "1234", color: "#3b82f6" },
    { id: "u6", name: "Meera Rao", initials: "MR", role: "Cashier", pin: "2345", color: "#64748b" },
  ],
  "3": [
    { id: "u7", name: "Vivek Kumar", initials: "VK", role: "Manager", pin: "1234", color: "#3b82f6" },
    { id: "u8", name: "Anita Joshi", initials: "AJ", role: "Cashier", pin: "2345", color: "#64748b" },
    { id: "u9", name: "Raj Malhotra", initials: "RM", role: "Waiter", pin: "3456", color: "#64748b" },
  ],
};

interface User {
  id: string;
  name: string;
  initials: string;
  role: string;
  pin: string;
  color: string;
}

export default function PosLoginPage() {
  const navigate = useNavigate();
  const [selectedOutletId, setSelectedOutletId] = useState(OUTLETS[0].id);
  const [selectedUser, setSelectedUser] = useState<User | null>(USERS_BY_OUTLET["1"][0]);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [outletOpen, setOutletOpen] = useState(false);

  const users = USERS_BY_OUTLET[selectedOutletId] ?? [];
  const selectedOutlet = OUTLETS.find((o) => o.id === selectedOutletId)!;
  const PIN_LENGTH = 4;

  function handleOutletSelect(id: string) {
    setSelectedOutletId(id);
    setSelectedUser(USERS_BY_OUTLET[id]?.[0] ?? null);
    setPin("");
    setError("");
    setOutletOpen(false);
  }

  function handleUserSelect(user: User) {
    setSelectedUser(user);
    setPin("");
    setError("");
  }

  function handleNumpad(digit: string) {
    if (pin.length < PIN_LENGTH) {
      setPin((p) => p + digit);
      setError("");
    }
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  function handleSignIn() {
    if (!selectedUser) { setError("Please select a user"); return; }
    if (pin.length < PIN_LENGTH) { setError("Please enter your 4-digit PIN"); return; }
    if (pin !== selectedUser.pin) { setError("Incorrect PIN. Please try again."); setPin(""); return; }
    navigate("/pos");
  }

  const canSignIn = selectedUser && pin.length === PIN_LENGTH;

  const bg = "#0b1120";
  const panelBg = "#111827";
  const cardBg = "#1a2438";
  const borderColor = "rgba(255,255,255,0.08)";
  const labelColor = "#94a3b8";
  const textColor = "#f1f5f9";
  const mutedColor = "#64748b";

  return (
    <div className="min-h-screen flex" style={{ background: bg }}>
      {/* LEFT PANEL — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ borderRight: `1px solid ${borderColor}` }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#3b82f6" }}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-xl" style={{ color: textColor }}>ZestPOS</p>
            <p className="text-sm" style={{ color: mutedColor }}>Enterprise Restaurant Suite</p>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <h1 className="text-5xl font-extrabold mb-4 leading-tight" style={{ color: textColor }}>
            Fast. Smart.<br />Frictionless POS.
          </h1>
          <p className="text-lg mb-10" style={{ color: labelColor }}>
            Built for high-volume restaurants. Designed for speed at every touchpoint.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Orders/day", value: "1,240" },
              { label: "Avg. checkout", value: "< 45s" },
              { label: "Uptime", value: "99.9%" },
              { label: "Outlets", value: "4" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4"
                style={{ background: cardBg, border: `1px solid ${borderColor}` }}
              >
                <p className="text-xs mb-1" style={{ color: mutedColor }}>{stat.label}</p>
                <p className="text-2xl font-bold" style={{ color: textColor }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Login */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: panelBg }}>
        <div className="w-full max-w-sm">

          {/* SELECT OUTLET */}
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-widest mb-2" style={{ color: labelColor }}>SELECT OUTLET</p>
            <div className="relative">
              <button
                onClick={() => setOutletOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: cardBg, border: `1px solid ${outletOpen ? "#3b82f6" : borderColor}`, color: textColor }}
              >
                <span>{selectedOutlet.name}</span>
                <ChevronDown className="w-4 h-4" style={{ color: mutedColor }} />
              </button>
              {outletOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                  style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                >
                  {OUTLETS.map((outlet) => (
                    <button
                      key={outlet.id}
                      onClick={() => handleOutletSelect(outlet.id)}
                      className="w-full text-left px-4 py-3 text-sm transition-colors"
                      style={{
                        color: outlet.id === selectedOutletId ? "#3b82f6" : textColor,
                        background: outlet.id === selectedOutletId ? "rgba(59,130,246,0.1)" : "transparent",
                      }}
                    >
                      {outlet.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SELECT USER */}
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-widest mb-2" style={{ color: labelColor }}>SELECT USER</p>
            <div className="grid grid-cols-2 gap-2">
              {users.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? "#3b82f6" : cardBg,
                      border: `1px solid ${isSelected ? "#3b82f6" : borderColor}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: isSelected ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                        color: isSelected ? "#fff" : labelColor,
                      }}
                    >
                      {user.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: isSelected ? "#fff" : textColor }}>
                        {user.name.split(" ")[0]}
                      </p>
                      <p className="text-xs truncate" style={{ color: isSelected ? "rgba(255,255,255,0.7)" : mutedColor }}>
                        {user.role}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ENTER PIN */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-widest" style={{ color: labelColor }}>ENTER PIN</p>
              <button onClick={() => setShowPin((v) => !v)} style={{ color: mutedColor }}>
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* PIN dots */}
            <div className="flex justify-center gap-4 mb-2">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all"
                  style={{
                    background: cardBg,
                    border: `1px solid ${pin.length > i ? "#3b82f6" : borderColor}`,
                    color: textColor,
                  }}
                >
                  {pin.length > i ? (showPin ? pin[i] : "●") : ""}
                </div>
              ))}
            </div>

            {selectedUser && (
              <p className="text-center text-xs mb-3" style={{ color: mutedColor }}>
                Demo PIN for {selectedUser.name}: {selectedUser.pin}
              </p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {["1","2","3","4","5","6","7","8","9"].map((d) => (
                <button
                  key={d}
                  onClick={() => handleNumpad(d)}
                  className="h-14 rounded-xl text-xl font-semibold transition-all active:scale-95"
                  style={{ background: cardBg, border: `1px solid ${borderColor}`, color: textColor }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.12)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = cardBg; }}
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleNumpad("0")}
                className="h-14 rounded-xl text-xl font-semibold transition-all active:scale-95"
                style={{ background: cardBg, border: `1px solid ${borderColor}`, color: textColor }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.12)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = cardBg; }}
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="h-14 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{ background: cardBg, border: `1px solid ${borderColor}`, color: labelColor }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = cardBg; }}
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-center mb-3 font-medium" style={{ color: "#f87171" }}>{error}</p>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={!canSignIn}
            className="w-full py-4 rounded-xl text-base font-bold transition-all active:scale-[0.98]"
            style={{
              background: canSignIn ? "#3b82f6" : "rgba(59,130,246,0.2)",
              color: canSignIn ? "#ffffff" : "rgba(255,255,255,0.3)",
              cursor: canSignIn ? "pointer" : "not-allowed",
            }}
          >
            Sign In → Start Shift
          </button>

          {/* Back link */}
          <button
            onClick={() => navigate("/")}
            className="w-full mt-3 py-2 text-sm transition-colors"
            style={{ color: mutedColor }}
          >
            ← Back to role selection
          </button>
        </div>
      </div>
    </div>
  );
}
