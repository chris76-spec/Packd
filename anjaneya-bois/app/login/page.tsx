"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserOption {
  id: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userId, setUserId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/login")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, passcode }),
    });
    if (res.ok) router.push("/");
    else setError((await res.json()).error ?? "Login failed");
  }

  return (
    <form onSubmit={submit} className="mt-16 flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">Anjaneya Bois</h1>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>Who dares enter?</p>
      </div>

      <div className="flex gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => setUserId(u.id)}
            className="flex-1 rounded-xl py-3 text-sm font-semibold"
            style={{
              background: userId === u.id ? "var(--user-a)" : "var(--surface-1)",
              color: userId === u.id ? "#fff" : "var(--ink)",
            }}
          >
            {u.name}
          </button>
        ))}
        {users.length === 0 && (
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            No users yet — run the seed insert in supabase/schema.sql.
          </p>
        )}
      </div>

      <input
        type="password"
        placeholder="Passcode"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--surface-1)", color: "var(--ink)" }}
      />
      {error && <p className="text-sm" style={{ color: "var(--warn)" }}>{error}</p>}
      <button
        type="submit"
        disabled={!userId || !passcode}
        className="rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
        style={{ background: "var(--user-a)", color: "#fff" }}
      >
        Enter the arena
      </button>
    </form>
  );
}
