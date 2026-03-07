"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HABITS_DEFAULT = [
  { id: 1, icon: "🏃", label: "Morning Run", category: "fitness", checked: false },
  { id: 2, icon: "💧", label: "Drink 2L Water", category: "health", checked: false },
  { id: 3, icon: "🧘", label: "10min Meditation", category: "health", checked: false },
  { id: 4, icon: "📖", label: "Read 20 Pages", category: "custom", checked: false },
  { id: 5, icon: "🥗", label: "Eat Clean", category: "fitness", checked: false },
];

const FAKE_NAMES: Record<string, string> = {
  "807bc5d8-e208-46eb-a87f-0e961c06b495": "Alex",
  "27158558-0e07-4808-8f2f-c3e38d404123": "Jordan",
  "c575d092-5519-4957-bb5b-dbe62499365f": "Sam",
  "9798eb2b-82d2-4e99-a99b-9ecb652263ee": "Riley",
  "e2864dba-c4c6-4437-a0bc-41f2802e79dd": "Morgan",
};

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const COLORS = ["#FF6B35","#4ECDC4","#FFE66D","#A8E6CF","#FF8B94","#C3A6FF"];

const HYPE_MESSAGES = [
  { emoji: "🌱", title: "You started!", sub: "That's literally all it takes. One step." },
  { emoji: "⚡", title: "Getting warmer!", sub: "Look at you go. Keep that energy." },
  { emoji: "🔥", title: "Halfway there!", sub: "You're in the zone. Don't stop now." },
  { emoji: "💪", title: "So close!", sub: "One more and you're unstoppable today." },
  { emoji: "👑", title: "YOU CRUSHED IT!", sub: "Full send. Absolute legend. Streak secured! 🎉" },
];

const HOME_MESSAGES = [
  "Nice! Keep going 💧",
  "Two down! You're on a roll ⚡",
  "Halfway! Don't stop now 🔥",
  "Almost there! One more 💪",
];

function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function getToday() { return new Date().toISOString().split("T")[0]; }
function streakEmoji(s: number) {
  if (s >= 21) return "👑";
  if (s >= 14) return "🌟";
  if (s >= 7) return "🔥";
  if (s >= 3) return "⚡";
  return "🌱";
}
function calcStreak(dates: string[]) {
  if (!dates || dates.length === 0) return 0;
  const today = getToday();
  const unique = [...new Set(dates)].sort().reverse();
  let count = 0;
  const current = new Date(today);
  for (const date of unique) {
    const diff = Math.round((current.getTime() - new Date(date).getTime()) / 86400000);
    if (diff === count || (count === 0 && diff === 0)) { count++; current.setDate(current.getDate() - 1); } else break;
  }
  return count;
}

export default function Home() {
  const [screen, setScreen] = useState("login");
  const [activeTab, setActiveTab] = useState("home");
  const [habits, setHabits] = useState(HABITS_DEFAULT);
  const [toast, setToast] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastBig, setToastBig] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [personalStreak, setPersonalStreak] = useState(0);
  const [groupStreak, setGroupStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [checkInType, setCheckInType] = useState<"full"|"partial"|null>(null);
  const [weekDays, setWeekDays] = useState(WEEK.map((d) => ({ label: d, filled: false, today: false })));
  const [homePopup, setHomePopup] = useState("");
  const [showHomePopup, setShowHomePopup] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [confetti, setConfetti] = useState<{id:number,x:number,color:string,delay:number}[]>([]);

  const doneCount = habits.filter((h) => h.checked).length;
  const progress = doneCount / habits.length;
  const isFull = doneCount === habits.length;

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

  useEffect(() => { if (user) { ensureUserRecord(); loadGroups(); loadPersonalStreak(); } }, [user]);
  useEffect(() => { if (user && currentGroup) loadGroupStreak(); }, [currentGroup]);

  const ensureUserRecord = async () => {
    const { data } = await supabase.from("users").select("id").eq("id", user.id).single();
    if (!data) {
      await supabase.from("users").insert({ id: user.id, name: user.user_metadata?.name || "", email: user.email });
    }
  };

  const loadPersonalStreak = async () => {
    const today = getToday();
    const { data } = await supabase.from("checkins").select("date, habits_completed").eq("user_id", user.id).order("date", { ascending: false });
    if (!data || data.length === 0) { setPersonalStreak(0); return; }
    const todayRow = data.find((r: any) => r.date === today);
    if (todayRow) {
      setCheckedInToday(true);
    setSavedCount(doneCount);
      setCheckInType(todayRow.habits_completed >= habits.length ? "full" : "partial");
      setHabits((prev) => prev.map((h, i) => ({ ...h, checked: i < todayRow.habits_completed })));
    }
    const dates = data.map((r: any) => r.date);
    setPersonalStreak(calcStreak(dates));
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ label: WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1], filled: dates.includes(dateStr), today: i === 0 });
    }
    setWeekDays(days);
  };

  const loadGroupStreak = async () => {
    if (!currentGroup) return;
    const { data } = await supabase.from("checkins").select("date").eq("user_id", user.id).eq("group_id", currentGroup.id).order("date", { ascending: false });
    const dates = data ? data.map((r: any) => r.date) : [];
    setGroupStreak(calcStreak(dates));
  };

  const loadGroups = async () => {
    const { data, error } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    if (error || !data || data.length === 0) return;
    const groupIds = data.map((d: any) => d.group_id);
    const { data: groupData } = await supabase.from("groups").select("*").in("id", groupIds);
    if (groupData && groupData.length > 0) {
      setGroups(groupData);
      setCurrentGroup(groupData[0]);
      loadMembers(groupData[0].id);
    }
  };

  const loadMembers = async (groupId: string) => {
    const { data: memberData } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);
    if (!memberData) return;
    const userIds = memberData.map((m: any) => m.user_id);
    const { data: userData } = await supabase.from("users").select("id, name, email").in("id", userIds);
    const today = getToday();
    const members = await Promise.all(memberData.map(async (m: any) => {
      const { data: checkins } = await supabase.from("checkins").select("date, habits_completed").eq("user_id", m.user_id).order("date", { ascending: false });
      const todayRow = checkins?.find((r: any) => r.date === today);
      const dates = checkins ? checkins.map((r: any) => r.date) : [];
      const memberStreak = calcStreak(dates);
      const isMe = m.user_id === user.id;
      const userRecord = userData?.find((u: any) => u.id === m.user_id);
      const displayName = isMe
        ? (user?.user_metadata?.name || userRecord?.name || user?.email?.split("@")[0] || "You")
        : (FAKE_NAMES[m.user_id] || userRecord?.name || userRecord?.email?.split("@")[0] || "User");
      return { user_id: m.user_id, streak: memberStreak, checkedInToday: !!todayRow, isPartialToday: todayRow && todayRow.habits_completed < 5, isMe, displayName };
    }));
    setGroupMembers(members);
  };

  const triggerToast = (msg: string, big = false) => {
    setToast(msg); setToastBig(big); setShowToast(true);
    setTimeout(() => setShowToast(false), big ? 3000 : 2000);
  };

  const fireConfetti = () => {
    const pieces = Array.from({length: 30}, (_, i) => ({
      id: i, x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5
    }));
    setConfetti(pieces);
    setCelebrating(true);
    setTimeout(() => { setConfetti([]); setCelebrating(false); }, 3000);
  };

  const handleAuth = async () => {
    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) { triggerToast("❌ " + error.message); setLoading(false); return; }
      if (data.user) { await supabase.from("users").upsert({ id: data.user.id, name, email }); }
      triggerToast("✅ Account created! Please sign in.");
      setIsSignUp(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) triggerToast("❌ " + error.message);
    }
    setLoading(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setScreen("login"); };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    const code = generateCode();
    const { data, error } = await supabase.from("groups").insert({ group_name: newGroupName, invite_code: code, created_by: user.id }).select().single();
    if (error) { triggerToast("❌ Error creating group"); return; }
    await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id, joined_at: new Date().toISOString() });
    setCurrentGroup(data); setGroups([...groups, data]);
    setShowCreateGroup(false); setNewGroupName("");
    triggerToast("✅ Group created! Code: " + code);
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return;
    const { data: group, error } = await supabase.from("groups").select().eq("invite_code", joinCode.toUpperCase()).single();
    if (error || !group) { triggerToast("❌ Invalid invite code"); return; }
    const { error: joinError } = await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, joined_at: new Date().toISOString() });
    if (joinError) { triggerToast("❌ Already in this group!"); return; }
    setCurrentGroup(group); setGroups([...groups, group]);
    setShowJoinGroup(false); setJoinCode("");
    loadMembers(group.id);
    triggerToast("✅ Joined " + group.group_name + "!");
  };

  const toggleHabit = (id: number, fromHome = false) => {
    if (checkInType === "full") return;
    const habit = habits.find(h => h.id === id);
    const willBeChecked = !habit?.checked;
    setHabits((prev) => prev.map((h) => h.id === id ? { ...h, checked: !h.checked } : h));
    if (fromHome && willBeChecked) {
      const newCount = habits.filter(h => h.checked).length + 1;
      if (newCount === habits.length) {
        setHomePopup("🎉 ALL DONE! You're on fire today!");
        setShowHomePopup(true);
        fireConfetti();
        setTimeout(() => setShowHomePopup(false), 3000);
      } else if (HOME_MESSAGES[newCount - 1]) {
        setHomePopup(HOME_MESSAGES[newCount - 1]);
        setShowHomePopup(true);
        setTimeout(() => setShowHomePopup(false), 1800);
      }
    }
  };

  const doCheckin = async () => {
    if (doneCount === 0) return;
    const today = getToday();
    const type = isFull ? "full" : "partial";
    if (checkedInToday) {
      const { error } = await supabase.from("checkins").update({ habits_completed: doneCount }).eq("user_id", user.id).eq("date", today);
      if (error) { triggerToast("❌ Error updating check-in"); return; }
    } else {
      const { error } = await supabase.from("checkins").insert({ user_id: user.id, group_id: currentGroup?.id || null, date: today, habits_completed: doneCount });
      if (error) { triggerToast("❌ Error saving check-in"); return; }
    }
    setCheckedInToday(true);
    setSavedCount(doneCount);
    setCheckInType(type);
    await loadPersonalStreak();
    await loadGroupStreak();
    if (currentGroup) loadMembers(currentGroup.id);
    const hype = HYPE_MESSAGES[doneCount - 1] || HYPE_MESSAGES[HYPE_MESSAGES.length - 1];
    if (type === "full") { fireConfetti(); triggerToast(hype.emoji + " " + hype.title + " " + hype.sub, true); }
    else triggerToast(hype.emoji + " " + hype.title + " — " + hype.sub);
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "white", fontSize: 14, marginBottom: 10, outline: "none", boxSizing: "border-box" };
  const btnPrimary: React.CSSProperties = { width: "100%", padding: "14px", background: "linear-gradient(135deg, #FF6B35, #FF3E6C)", border: "none", borderRadius: 16, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 };
  const btnSecondary: React.CSSProperties = { width: "100%", padding: "12px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" };

  if (screen === "login") return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: 360, padding: "40px 32px", background: "#0F0F18", borderRadius: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🐺</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#FF6B35" }}>PACKD</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Group accountability, built different</div>
        </div>
        {showToast && <div style={{ background: "rgba(78,205,196,0.15)", border: "1px solid rgba(78,205,196,0.3)", color: "#4ECDC4", padding: "10px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13, textAlign: "center" }}>{toast}</div>}
        {isSignUp && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" style={{ ...inputStyle, marginBottom: 20 }} />
        <button onClick={handleAuth} disabled={loading} style={btnPrimary}>{loading ? "..." : isSignUp ? "Create Account" : "Sign In"}</button>
        <button onClick={() => setIsSignUp(!isSignUp)} style={btnSecondary}>{isSignUp ? "Already have an account? Sign in" : "New here? Create account"}</button>
      </div>
    </div>
  );

  const hype = doneCount > 0 ? HYPE_MESSAGES[Math.min(doneCount - 1, HYPE_MESSAGES.length - 1)] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", fontFamily: "system-ui, sans-serif", color: "white", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, position: "relative", minHeight: "100vh", background: "#0F0F18", paddingBottom: 80, overflow: "hidden" }}>

        {/* Confetti */}
        {confetti.map(c => (
          <div key={c.id} style={{ position: "fixed", top: "-10px", left: c.x + "%", width: 8, height: 8, background: c.color, borderRadius: 2, zIndex: 1000, animation: `fall 2.5s ${c.delay}s ease-in forwards`, pointerEvents: "none" }} />
        ))}
        <style>{`@keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(100vh) rotate(720deg); opacity:0; } } @keyframes popIn { 0% { transform: translateX(-50%) scale(0.7); opacity:0; } 60% { transform: translateX(-50%) scale(1.08); } 100% { transform: translateX(-50%) scale(1); opacity:1; } } @keyframes slideUp { 0% { transform: translateX(-50%) translateY(20px); opacity:0; } 100% { transform: translateX(-50%) translateY(0); opacity:1; } }`}</style>

        {/* Toast */}
        {showToast && (
          <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: toastBig ? "linear-gradient(135deg, #FF6B35, #FF3E6C)" : "rgba(30,30,40,0.97)", color: "white", padding: toastBig ? "16px 28px" : "10px 20px", borderRadius: 100, fontSize: toastBig ? 15 : 13, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap", boxShadow: toastBig ? "0 8px 32px rgba(255,107,53,0.4)" : "0 4px 16px rgba(0,0,0,0.3)", animation: "slideUp 0.3s ease" }}>{toast}</div>
        )}

        {/* Home popup */}
        {showHomePopup && (
          <div style={{ position: "fixed", top: 80, left: "50%", background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.3)", backdropFilter: "blur(12px)", color: "white", padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 998, whiteSpace: "nowrap", animation: "popIn 0.3s ease" }}>{homePopup}</div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px 8px", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <span>9:41</span><span style={{ fontWeight: 700, color: "#FF6B35", fontSize: 13 }}>PACKD</span><span>●●●</span>
        </div>

        {activeTab === "home" && (
          <div>
            <div style={{ padding: "8px 24px 20px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>Good morning,<br /><span style={{ color: "#FF6B35" }}>{user?.user_metadata?.name || "You"}.</span></div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Keep the streak alive 🔥</div>
            </div>
            <div style={{ margin: "0 20px 20px", background: "linear-gradient(135deg, #FF6B35, #FF3E6C)", borderRadius: 28, padding: 24 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.8, fontWeight: 600 }}>Personal Streak</div>
              <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1 }}>{personalStreak}</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>days in a row {streakEmoji(personalStreak)}</div>
              {checkInType && (
                <div style={{ marginTop: 8, background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "4px 12px", display: "inline-block", fontSize: 11, fontWeight: 600 }}>
                  {checkInType === "full" ? "🔥 Full check-in today!" : "⚡ Partial check-in today"}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                {weekDays.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: d.filled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: d.filled ? "#FF3E6C" : "white", boxShadow: d.today ? "0 0 0 3px rgba(255,255,255,0.4)" : "none" }}>{d.filled ? "✓" : ""}</div>
                    <div style={{ fontSize: 9, opacity: 0.7 }}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 24px", marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Today's Habits</div>
              <div style={{ fontSize: 12, color: "#FF6B35" }}>{doneCount}/{habits.length} done</div>
            </div>
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {habits.map((h) => (
                <div key={h.id} onClick={() => toggleHabit(h.id, true)} style={{ display: "flex", alignItems: "center", gap: 14, background: h.checked ? "rgba(78,205,196,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid " + (h.checked ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.06)"), borderRadius: 18, padding: "14px 16px", cursor: checkInType === "full" ? "default" : "pointer", transition: "all 0.2s ease" }}>
                  <div style={{ fontSize: 22, width: 44, height: 44, background: h.checked ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>{h.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, textDecoration: h.checked ? "line-through" : "none", opacity: h.checked ? 0.5 : 1, transition: "all 0.2s ease" }}>{h.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{h.category}</div>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: h.checked ? "#4ECDC4" : "transparent", border: "2px solid " + (h.checked ? "#4ECDC4" : "rgba(255,255,255,0.15)"), display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                    {h.checked && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 24px", marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Your Pack</div>
              <button onClick={() => setActiveTab("group")} style={{ fontSize: 12, color: "#FF6B35", background: "none", border: "none", cursor: "pointer" }}>See all →</button>
            </div>
            {currentGroup ? (
              <div onClick={() => { setActiveTab("group"); setShowGroupDetail(true); }} style={{ margin: "0 20px 24px", background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 18, padding: 16, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{currentGroup.group_name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#FF6B35" }}>{groupStreak} {streakEmoji(groupStreak)}</div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 11, color: "#FF6B35", fontWeight: 600 }}>Code: {currentGroup.invite_code} · Tap to view →</div>
              </div>
            ) : (
              <div style={{ margin: "0 20px 24px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>No pack yet — create or join one!</div>
                <button onClick={() => setActiveTab("group")} style={{ ...btnPrimary, width: "auto", padding: "10px 20px", marginBottom: 0 }}>Get Started →</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "group" && !showGroupDetail && (
          <div>
            <div style={{ padding: "8px 24px 20px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Your Pack 🐺</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Create or join a group</div>
            </div>
            {!showCreateGroup && !showJoinGroup && (
              <div style={{ padding: "0 20px", display: "flex", gap: 10, marginBottom: 24 }}>
                <button onClick={() => setShowCreateGroup(true)} style={{ flex: 1, padding: 14, background: "linear-gradient(135deg, #FF6B35, #FF3E6C)", border: "none", borderRadius: 16, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Create Group</button>
                <button onClick={() => setShowJoinGroup(true)} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Join Group</button>
              </div>
            )}
            {showCreateGroup && (
              <div style={{ margin: "0 20px 24px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Create a Group</div>
                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" style={inputStyle} />
                <button onClick={createGroup} style={btnPrimary}>Create and Get Invite Code</button>
                <button onClick={() => setShowCreateGroup(false)} style={btnSecondary}>Cancel</button>
              </div>
            )}
            {showJoinGroup && (
              <div style={{ margin: "0 20px 24px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Join a Group</div>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter invite code (e.g. PACKD1)" style={inputStyle} />
                <button onClick={joinGroup} style={btnPrimary}>Join Group</button>
                <button onClick={() => setShowJoinGroup(false)} style={btnSecondary}>Cancel</button>
              </div>
            )}
            {groups.length > 0 && !showCreateGroup && !showJoinGroup && (
              <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Your Groups</div>
                {groups.map((g) => (
                  <div key={g.id} onClick={() => { setCurrentGroup(g); loadMembers(g.id); setShowGroupDetail(true); }} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "14px 16px", cursor: "pointer" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{g.group_name}</div>
                    <div style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 10, padding: "6px 12px" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Code: </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#FF6B35" }}>{g.invite_code}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {groups.length === 0 && !showCreateGroup && !showJoinGroup && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🐺</div>
                No groups yet. Create one and invite your friends!
              </div>
            )}
          </div>
        )}

        {activeTab === "group" && showGroupDetail && currentGroup && (
          <div>
            <div style={{ padding: "8px 24px 20px" }}>
              <button onClick={() => setShowGroupDetail(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", marginBottom: 8, padding: 0 }}>← Back</button>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{currentGroup.group_name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}</div>
            </div>
            <div style={{ margin: "0 20px 12px", display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 18, padding: 16 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Your group streak</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#FF6B35" }}>{groupStreak} {streakEmoji(groupStreak)}</div>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 16 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Invite code</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#FF6B35", letterSpacing: "0.1em" }}>{currentGroup.invite_code}</div>
              </div>
            </div>
            <div style={{ padding: "0 24px", marginBottom: 12, marginTop: 8 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Leaderboard 🏆</div>
            </div>
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[...groupMembers].sort((a, b) => b.streak - a.streak).map((m, i) => (
                <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, background: i === 0 ? "linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,62,108,0.08))" : "rgba(255,255,255,0.04)", border: "1px solid " + (i === 0 ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.05)"), borderRadius: 18, padding: "14px 16px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, width: 24, textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: COLORS[i % COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#0F0F18" }}>{m.displayName[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.displayName}{m.isMe ? " (you)" : ""}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{m.checkedInToday ? (m.isPartialToday ? "⚡ Partial" : "✅ Full check-in") : "⏳ Not yet"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#FF6B35" }}>{m.streak} <span style={{ fontSize: 14 }}>{streakEmoji(m.streak)}</span></div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>day streak</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "checkin" && (
          <div>
            <div style={{ margin: "8px 20px 20px", background: hype && isFull ? "linear-gradient(135deg, #FF6B35, #FF3E6C)" : "linear-gradient(135deg, #1A1A2E, #16213E)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: "28px 24px", textAlign: "center", transition: "all 0.4s ease" }}>
              <div style={{ fontSize: 48, marginBottom: 12, transition: "all 0.3s ease" }}>{hype ? hype.emoji : "⚡"}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{hype ? hype.title : "Daily Check-In"}</div>
              <div style={{ fontSize: 13, color: isFull ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                {hype ? hype.sub : "Tick what you've done — even 1 habit keeps your streak alive!"}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", margin: "0 0 20px" }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={isFull ? "#4ECDC4" : doneCount > 0 ? "#FFE66D" : "#FF6B35"} strokeWidth="8" strokeLinecap="round" strokeDasharray={String(2 * Math.PI * 52)} strokeDashoffset={String(2 * Math.PI * 52 * (1 - progress))} transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }} />
                <text x="60" y="55" textAnchor="middle" fill="white" fontWeight="800" fontSize="22">{doneCount + "/" + habits.length}</text>
                <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">habits</text>
              </svg>
            </div>
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {habits.map((h) => (
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{ display: "flex", alignItems: "center", gap: 14, background: h.checked ? "rgba(78,205,196,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid " + (h.checked ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.06)"), borderRadius: 18, padding: "14px 16px", cursor: checkInType === "full" ? "default" : "pointer", transition: "all 0.2s ease" }}>
                  <div style={{ fontSize: 22 }}>{h.icon}</div>
                  <div style={{ flex: 1, fontSize: 14, textDecoration: h.checked ? "line-through" : "none", opacity: h.checked ? 0.5 : 1, transition: "all 0.2s ease" }}>{h.label}</div>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: h.checked ? "#4ECDC4" : "transparent", border: "2px solid " + (h.checked ? "#4ECDC4" : "rgba(255,255,255,0.15)"), display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                    {h.checked && <span style={{ color: "white", fontSize: 11 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px" }}>
              <button onClick={doCheckin} disabled={doneCount === 0 || isFull || (checkedInToday && doneCount === savedCount)} style={{ width: "100%", padding: 18, borderRadius: 20, border: "none", background: (doneCount === 0 || (checkedInToday && doneCount === savedCount)) ? "rgba(255,255,255,0.06)" : isFull ? "linear-gradient(135deg, #FF6B35, #FF3E6C)" : "linear-gradient(135deg, #FFE66D, #FF6B35)", color: (doneCount === 0 || (checkedInToday && doneCount === savedCount)) ? "rgba(255,255,255,0.3)" : "white", fontSize: 17, fontWeight: 700, cursor: (doneCount === 0 || (checkedInToday && doneCount === savedCount)) ? "not-allowed" : "pointer", transition: "all 0.3s ease" }}>
                {doneCount === 0 ? "Tick at least one habit first" : isFull ? "🔥 Full Check-In!" : "⚡ Partial Check-In (" + doneCount + "/" + habits.length + ")"}
              </button>
            </div>
          </div>
        )}

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
              {[
                { v: personalStreak + " " + streakEmoji(personalStreak), l: "Personal Streak" },
                { v: groupStreak + " " + streakEmoji(groupStreak), l: "Group Streak" },
                { v: checkedInToday ? (checkInType === "full" ? "🔥" : "⚡") : "—", l: "Today" }
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#FF6B35", lineHeight: 1, marginBottom: 4 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px" }}>
              <button onClick={handleSignOut} style={{ width: "100%", padding: 16, background: "rgba(255,62,108,0.1)", border: "1px solid rgba(255,62,108,0.2)", borderRadius: 16, color: "#FF3E6C", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
            </div>
          </div>
        )}

        <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, height: 80, background: "rgba(15,15,24,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-around", paddingBottom: 12, zIndex: 100 }}>
          {[{ id: "home", icon: "🏠", label: "Home" }, { id: "group", icon: "👥", label: "Pack" }, { id: "checkin", icon: "✅", label: "Check In" }, { id: "profile", icon: "👤", label: "Profile" }].map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== "group") setShowGroupDetail(false); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: activeTab === tab.id ? "#FF6B35" : "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 500, padding: "8px 16px", borderRadius: 16, backgroundColor: activeTab === tab.id ? "rgba(255,107,53,0.1)" : "transparent" }}>
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
