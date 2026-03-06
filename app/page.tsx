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

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Home() {
  const [screen, setScreen] = useState("login");
  const [activeTab, setActiveTab] = useState("home");
  const [habits, setHabits] = useState(HABITS_DEFAULT);
  const [allCheckedIn, setAllCheckedIn] = useState(false);
  const [toast, setToast] = useState("");
  const [showToast, setShowToast] = useState(false);
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
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [nudged, setNudged] = useState<Record<string, boolean>>({});

  const streak = 12;
  const doneCount = habits.filter((h) => h.checked).length;
  const progress = doneCount / habits.length;
  const weekDays = WEEK.map((d, i) => ({ label: d, filled: i < 5, today: i === 4 }));

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

  useEffect(() => {
    if (user) loadGroups();
  }, [user]);

  const loadGroups = async () => {
    const { data } = await supabase
      .from("group_members")
      .select("group_id, groups(id, group_name, invite_code, created_by)")
      .eq("user_id", user.id);
    if (data && data.length > 0) {
      const g = data.map((d: any) => d.groups);
      setGroups(g);
      setCurrentGroup(g[0]);
      loadMembers(g[0].id);
    }
  };

  const loadMembers = async (groupId: string) => {
    const { data } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    if (data) setGroupMembers(data);
  };

  const triggerToast = (msg: string) => {
    setToast(msg); setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
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

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    const code = generateCode();
    const { data, error } = await supabase
      .from("groups")
      .insert({ group_name: newGroupName, invite_code: code, created_by: user.id })
      .select()
      .single();
    if (error) { triggerToast("❌ Error creating group"); return; }
    await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id });
    setCurrentGroup(data);
    setGroups([...groups, data]);
    setShowCreateGroup(false);
    setNewGroupName("");
    triggerToast("✅ Group created! Code: " + code);
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return;
    const { data: group, error } = await supabase
      .from("groups")
      .select()
      .eq("invite_code", joinCode.toUpperCase())
      .single();
    if (error || !group) { triggerToast("❌ Invalid invite code"); return; }
    const { error: joinError } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: user.id });
    if (joinError) { triggerToast("❌ Already in this group!"); return; }
    setCurrentGroup(group);
    setGroups([...groups, group]);
    setShowJoinGroup(false);
    setJoinCode("");
    triggerToast("✅ Joined " + group.group_name + "!");
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

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14, color: "white", fontSize: 14,
    marginBottom: 10, outline: "none", boxSizing: "border-box",
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%", padding: "14px",
    background: "linear-gradient(135deg, #FF6B35, #FF3E6C)",
    border: "none", borderRadius: 16, color: "white",
    fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10,
  };

  const btnSecondary: React.CSSProperties = {
    width: "100%", padding: "12px", background: "none",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
    color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer",
  };

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

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", fontFamily: "system-ui, sans-serif", color: "white", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, position: "relative", minHeight: "100vh", background: "#0F0F18", paddingBottom: 80 }}>
        {showToast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(78,205,196,0.95)", color: "#0F0F18", padding: "10px 20px", borderRadius: 100, fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: "nowrap" }}>{toast}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px 8px", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <span>9:41</span>
          <span style={{ fontWeight: 700, color: "#FF6B35", fontSize: 13 }}>PACKD</span>
          <span>●●●</span>
        </div>

        {activeTab === "home" && (
          <div>
            <div style={{ padding: "8px 24px 20px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>Good morning,<br /><span style={{ color: "#FF6B35" }}>{user?.user_metadata?.name || "You"}.</span></div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Keep the streak alive 🔥</div>
            </div>
            <div style={{ margin: "0 20px 20px", background: "linear-gradient(135deg, #FF6B35, #FF3E6C)", borderRadius: 28, padding: 24 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.8, fontWeight: 600 }}>Current Streak</div>
              <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1 }}>{streak}</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>days in a row 🔥</div>
              <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                {weekDays.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: d.today || d.filled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: d.today || d.filled ? "#FF3E6C" : "white" }}>{d.filled || d.today ? "✓" : ""}</div>
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
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{ display: "flex", alignItems: "center", gap: 14, background: h.checked ? "rgba(78,205,196,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid " + (h.checked ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.06)"), borderRadius: 18, padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ fontSize: 22, width: 44, height: 44, background: h.checked ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{h.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, textDecoration: h.checked ? "line-through" : "none", opacity: h.checked ? 0.5 : 1 }}>{h.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{h.category}</div>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: h.checked ? "#4ECDC4" : "transparent", border: "2px solid " + (h.checked ? "#4ECDC4" : "rgba(255,255,255,0.15)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
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
              <div style={{ margin: "0 20px 24px", background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 18, padding: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{currentGroup.group_name} 🐺</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 11, color: "#FF6B35", fontWeight: 600 }}>Invite code: {currentGroup.invite_code}</div>
              </div>
            ) : (
              <div style={{ margin: "0 20px 24px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>No pack yet — create or join one!</div>
                <button onClick={() => setActiveTab("group")} style={{ ...btnPrimary, width: "auto", padding: "10px 20px", marginBottom: 0 }}>Get Started →</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "group" && (
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
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter invite code" style={inputStyle} />
                <button onClick={joinGroup} style={btnPrimary}>Join Group</button>
                <button onClick={() => setShowJoinGroup(false)} style={btnSecondary}>Cancel</button>
              </div>
            )}
            {groups.length > 0 && (
              <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Your Groups</div>
                {groups.map((g) => (
                  <div key={g.id} onClick={() => { setCurrentGroup(g); loadMembers(g.id); }} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", background: currentGroup?.id === g.id ? "rgba(78,205,196,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid " + (currentGroup?.id === g.id ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.06)"), borderRadius: 18, padding: "14px 16px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{g.group_name} 🐺</div>
                      {currentGroup?.id === g.id && <div style={{ fontSize: 10, background: "#FF6B35", color: "white", padding: "3px 8px", borderRadius: 100, fontWeight: 600 }}>ACTIVE</div>}
                    </div>
                    <div style={{ marginTop: 8, background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 10, padding: "6px 12px" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Invite code: </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#FF6B35", letterSpacing: "0.1em" }}>{g.invite_code}</span>
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

        {activeTab === "checkin" && (
          <div>
            <div style={{ margin: "8px 20px 20px", background: "linear-gradient(135deg, #1A1A2E, #16213E)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{allCheckedIn ? "🎉" : "⚡"}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{allCheckedIn ? "You are done!" : "Daily Check-In"}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{allCheckedIn ? "Streak extended to " + (streak + 1) + " days!" : "Complete habits to keep your " + streak + "-day streak alive."}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", margin: "0 0 20px" }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={allCheckedIn ? "#4ECDC4" : "#FF6B35"} strokeWidth="8" strokeLinecap="round" strokeDasharray={String(2 * Math.PI * 52)} strokeDashoffset={String(2 * Math.PI * 52 * (1 - (allCheckedIn ? 1 : progress)))} transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                <text x="60" y="55" textAnchor="middle" fill="white" fontWeight="800" fontSize="22">{allCheckedIn ? "✓" : doneCount + "/" + habits.length}</text>
                <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">{allCheckedIn ? "All done!" : "habits"}</text>
              </svg>
            </div>
            <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {habits.map((h) => (
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{ display: "flex", alignItems: "center", gap: 14, background: h.checked ? "rgba(78,205,196,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid " + (h.checked ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.06)"), borderRadius: 18, padding: "14px 16px", cursor: allCheckedIn ? "default" : "pointer" }}>
                  <div style={{ fontSize: 22 }}>{h.icon}</div>
                  <div style={{ flex: 1, fontSize: 14, textDecoration: h.checked ? "line-through" : "none", opacity: h.checked ? 0.5 : 1 }}>{h.label}</div>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: h.checked ? "#4ECDC4" : "transparent", border: "2px solid " + (h.checked ? "#4ECDC4" : "rgba(255,255,255,0.15)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {h.checked && <span style={{ color: "white", fontSize: 11 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px" }}>
              <button onClick={doCheckin} style={{ width: "100%", padding: 18, borderRadius: 20, border: allCheckedIn ? "1px solid rgba(78,205,196,0.2)" : "none", background: allCheckedIn ? "rgba(78,205,196,0.1)" : "linear-gradient(135deg, #FF6B35, #FF3E6C)", color: allCheckedIn ? "#4ECDC4" : "white", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>
                {allCheckedIn ? "✅ Checked In Today!" : "Check In" + (doneCount > 0 ? " (" + doneCount + "/" + habits.length + ")" : "")}
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
              {[{ v: streak, l: "Day Streak" }, { v: "87%", l: "Completion" }, { v: groups.length, l: "Groups" }].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#FF6B35", lineHeight: 1, marginBottom: 4 }}>{s.v}</div>
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
