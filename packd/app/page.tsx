"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FRIENDS = [
  { id: 1, name: "Alex", avatar: "A", streak: 14, checkedIn: true, color: "#FF6B35" },
  { id: 2, name: "Jordan", avatar: "J", streak: 7, checkedIn: true, color: "#4ECDC4" },
  { id: 3, name: "Sam", avatar: "S", streak: 21, checkedIn: false, color: "#FFE66D" },
  { id: 4, name: "Riley", avatar: "R", streak: 3, checkedIn: false, color: "#A8E6CF" },
  { id: 5, name: "Morgan", avatar: "M", streak: 9, checkedIn: true, color: "#FF8B94" },
];

const HABITS_DEFAULT = [
  { id: 1, icon: "🏃", label: "Morning Run", category: "fitness", checked: false },
  { id: 2, icon: "💧", label: "Drink 2L Water", category: "health", checked: false },
  { id: 3, icon: "🧘", label: "10min Meditation", category: "health", checked: false },
  { id: 4, icon: "📖", label: "Read 20 Pages", category: "custom", checked: false },
  { id: 5, icon: "🥗", label: "Eat Clean", category: "fitness", checked: false },
];

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

export default function Home() {
  const [screen, setScreen] = useState("login");
  const [activeTab, setActiveTab] = useState("home");
  const [habits, setHabits] = useState(HABITS_DEFAULT);
  const [allCheckedIn, setAllCheckedIn] = useState(false);
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const streak = 12;
  const doneCount = habits.filter((h) => h.checked).length;
  const progress = doneCount / habits.length;
  const sortedFriends = [...FRIENDS].sort((a, b) => b.streak - a.streak);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); setScreen("app"); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); setScreen("app"); }
      else { setUser(null); setScreen("login"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg); setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handleAuth = async () => {
    setLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) triggerToast("❌ " + error.message);
      else triggerToast("✅ Check your email to confirm!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) triggerToast("❌ " + error.message);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setScreen("login");
  };

  const toggleHabit = (id: number) => {
    if (allCheckedIn) return;
    setHabits((prev) => prev.map((h) => h.id === id ? { ...h, checked: !h.checked } : h));
  };

  const doCheckin = () => {
    if (!allCheckedIn) {
      setAllCheckedIn(true);
      setHabits((prev) => prev.map((h) => ({ ...h, checked: true })));
      triggerToast("🔥 Day checked in! Streak extended!");
    }
  };

  const nudgeFriend = (name: string) => {
    setNudged((prev) => ({ ...prev, [name]: true }));
    triggerToast(`👋 Nudge sent to ${name}!`);
  };

  const weekDays = WEEK.map((d, i) => ({ label: d, filled: i < 5, today: i === 4 }));

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (screen === "login") return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: 360, padding: "40px 32px", background: "#0F0F18", borderRadius: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🐺</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#FF6B35" }}>PACKD</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Group accountability, built different</div>
        </div>

        {showToast && (
          <div style={{ background: "rgba(78,205,196,0.15)", border: "1px solid rgba(78,205,196,0.3)", color: "#4ECDC4", padding: "10px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13, textAlign: "center" }}>{toast}</div>
        )}

        {isSignUp && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "white", fontSize: 14, marginBottom: 10, outline: "none", boxSizing: "border-box" }} />
        )}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "white", fontSize: 14, marginBottom: 10, outline: "none", boxSizing: "border-box" }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "white", fontSize: 14, marginBottom: 20, outline: "none", boxSizing: "border-box" }} />

        <button onClick={handleAuth} disabled={loading} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #FF6B35, #FF3E6C)", border: "none", borderRadius: 16, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
          {loading ? "..." : isSignUp ? "Create Account" : "Sign In"}
        </button>
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ width: "100%", padding: "12px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
          {isSignUp ? "Already have an account? Sign in" : "New here? Create account"}
        </button>
      </div>
    </div>
  );

  // ── APP SHELL ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", fontFamily: "system-ui, sans-serif", color: "white", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, position: "relative", minHeight: "100vh", background: "#0F0F18", paddingBottom: 80 }}>

        {/* Toast */}
        {showToast && (
          <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(78,205,196,0.95)", color: "#0F0F18", padding: "10px 20px", borderRadius: 100, fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: "nowrap" }}>{toast}</div>
        )}

        {/* Status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px 8px", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <span>9:41</span>
          <span style={{ fontWeight: 700, color: "#FF6B35", fontSize: 13 }}>PACKD</span>
          <span>●●●</span>
        </div>

        {/* ── HOME TAB ── */}
        {activeTab === "home" && (
          <div>
            <div style={{ padding: "8px 24px 20px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>Good morning,<br /><span style={{ color: "#FF6B35" }}>{user?.user_metadata?.name || "You"}.</span></div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Friday · Mar 6 · Keep the streak alive 🔥</div>
            </div>

            {/* Streak Card */}
            <div style={{ margin: "0 20px 20px", background: "linear-gradient(135deg, #FF6B35, #FF3E6C)", borderRadius: 28, padding: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.8, fontWeight: 600 }}>Current Streak</div>
              <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1 }}>{streak}</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>days in a row 🔥</div>
              <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                {weekDays.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: d.today || d.filled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: d.today || d.filled ? "#FF3E6C" : "white", boxShadow: d.today ? "0 0 0 3px rgba(255,255,255,0.4)" : "none" }}>
                      {d.filled || d.today ? "✓" : ""}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.7 }}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Habits */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 24px", marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Today's Habits</div>
              <div style={{ fontSize: 12, color: "#FF6B35" }}>{doneCount}/{habits.length} done</div>
            </div>
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {habits.map((h) => (
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{ display: "flex", alignItems: "center", gap: 14, background: h.checked ? "rgba(78,205,196,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${h.checked ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 18, padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ fontSize: 22, width: 44, height: 44, background: h.checked ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{h.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, textDecoration: h.checked ? "line-through" : "none", opacity: h.checked ? 0.5 : 1 }}>{h.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{h.category}</div>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: h.checked ? "#4ECDC4" : "transparent", border: `2px solid ${h.checked ? "#4ECDC4" : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {h.checked && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Friends */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 24px", marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Your Pack</div>
              <button onClick={() => setActiveTab("group")} style={{ fontSize: 12, color: "#FF6B35", background: "none", border: "none", cursor: "pointer" }}>See all →</button>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 20px", overflowX: "auto", marginBottom: 24 }}>
              {FRIENDS.map((f) => (
                <div key={f.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 18, background: f.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#0F0F18", opacity: f.checkedIn ? 1 : 0.4, boxShadow: f.checkedIn ? `0 0 0 2px #4ECDC4` : "none" }}>{f.avatar}</div>
                    {f.checkedIn && <div style={{ position: "absolute", bottom: -3, right: -3, width: 16, height: 16, borderRadius: "50%", background: "#4ECDC4", border: "2px solid #0F0F18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>✓</div>}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 600 }}>🔥{f.streak}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GROUP TAB ── */}
        {activeTab === "group" && (
          <div>
            <div style={{ padding: "8px 24px 20px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>The Squad 🐺</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>5 members · Day 42 together</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 24px", marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Leaderboard</div>
            </div>
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {sortedFriends.map((f, i) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: i === 0 ? "linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,62,108,0.08))" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 0 ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.05)"}`, borderRadius: 18, padding: "14px 16px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, width: 24, textAlign: "center", color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.25)" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: f.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#0F0F18" }}>{f.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{f.checkedIn ? "✅ Checked in" : "⏳ Not yet..."}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#FF6B35" }}>{f.streak}<span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}> days</span></div>
                    {!f.checkedIn && (
                      <button onClick={() => nudgeFriend(f.name)} style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", color: nudged[f.name] ? "rgba(255,255,255,0.3)" : "#FF6B35", borderRadius: 10, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                        {nudged[f.name] ? "Nudged!" : "👋 Nudge"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHECKIN TAB ── */}
        {activeTab === "checkin" && (
          <div>
            <div style={{ margin: "8px 20px 20px", background: "linear-gradient(135deg, #1A1A2E, #16213E)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{allCheckedIn ? "🎉" : "⚡"}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{allCheckedIn ? "You're done!" : "Daily Check-In"}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{allCheckedIn ? `Streak extended to ${streak + 1} days!` : `Complete habits to keep your ${streak}-day streak alive.`}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", margin: "0 0 20px" }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={allCheckedIn ? "#4ECDC4" : "#FF6B35"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 52}`} strokeDashoffset={`${2 * Math.PI * 52 * (1 - (allCheckedIn ? 1 : progress))}`} transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                <text x="60" y="55" textAnchor="middle" fill="white" fontWeight="800" fontSize="22">{allCheckedIn ? "✓" : `${doneCount}/${habits.length}`}</text>
                <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">{allCheckedIn ? "All done!" : "habits"}</text>
              </svg>
            </div>
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {habits.map((h) => (
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{ display: "flex", alignItems: "center", gap: 14, background: h.checked ? "rgba(78,205,196,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${h.checked ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 18, padding: "14px 16px", cursor: allCheckedIn ? "default" : "pointer" }}>
                  <div style={{ fontSize: 22 }}>{h.icon}</div>
                  <div style={{ flex: 1, fontSize: 14, textDecoration: h.checked ? "line-through" : "none", opacity: h.checked ? 0.5 : 1 }}>{h.label}</div>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: h.checked ? "#4ECDC4" : "transparent", border: `2px solid ${h.checked ? "#4ECDC4" : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {h.checked && <span style={{ color: "white", fontSize: 11 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px" }}>
              <button onClick={doCheckin} style={{ width: "100%", padding: 18, borderRadius: 20, border: allCheckedIn ? "1px solid rgba(78,205,196,0.2)" : "none", background: allCheckedIn ? "rgba(78,205,196,0.1)" : "linear-gradient(135deg, #FF6B35, #FF3E6C)", color: allCheckedIn ? "#4ECDC4" : "white", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>
                {allCheckedIn ? "✅ Checked In Today!" : `Check In${doneCount > 0 ? ` (${doneCount}/${habits.length})` : ""}`}
              </button>
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div>
            <div style={{ padding: "8px 24px 24px", display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #FF6B35, #FF3E6C)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28 }}>
                {(user?.user_metadata?.name || user?.email || "Y")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{user?.user_metadata?.name || "You"}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "0 20px", marginBottom: 24 }}>
              {[{ v: streak, l: "Day Streak" }, { v: "87%", l: "Completion" }, { v: 42, l: "Days in Pack" }].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#FF6B35", lineHeight: 1, marginBottom: 4 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px" }}>
              <button onClick={handleSignOut} style={{ width: "100%", padding: 16, background: "rgba(255,62,108,0.1)", border: "1px solid rgba(255,62,108,0.2)", borderRadius: 16, color: "#FF3E6C", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, height: 80, background: "rgba(15,15,24,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-around", paddingBottom: 12, zIndex: 100 }}>
          {[
            { id: "home", icon: "🏠", label: "Home" },
            { id: "group", icon: "👥", label: "Pack" },
            { id: "checkin", icon: "✅", label: "Check In" },
            { id: "profile", icon: "👤", label: "Profile" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: activeTab === tab.id ? "#FF6B35" : "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 500, padding: "8px 16px", borderRadius: 16, backgroundColor: activeTab === tab.id ? "rgba(255,107,53,0.1)" : "transparent" }}>
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
