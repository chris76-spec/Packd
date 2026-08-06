// Settings — connect Google Health (OAuth), edit targets, notifications (PRD §7.5).

import { redirect } from "next/navigation";
import EnablePush from "@/components/enable-push";
import TargetsForm from "@/components/targets-form";
import { getViewer } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { me } = viewer;
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold">Settings</h1>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>Signed in as <b>{me.name}</b></p>

      <section className="card flex flex-col gap-2">
        <p className="text-sm font-semibold">Fitbit Air data (Google Health API)</p>
        {params.google === "connected" && (
          <p className="text-xs" style={{ color: "var(--good)" }}>Connected — data will flow from the next sync ✓</p>
        )}
        {params.google === "error" && (
          <p className="text-xs" style={{ color: "var(--warn)" }}>Connection failed — try again.</p>
        )}
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          {me.google_health_connected
            ? "Connected. Reconnect if syncs start failing."
            : "Connect your Google account once; the server syncs your Fitbit Air data at 4am, 1pm and 7pm."}
        </p>
        <a
          href="/api/auth/google"
          className="w-fit rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--user-a)", color: "#fff" }}
        >
          {me.google_health_connected ? "Reconnect Google Health" : "Connect Google Health"}
        </a>
      </section>

      <section className="card flex flex-col gap-2">
        <p className="text-sm font-semibold">Personal targets</p>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Every pillar scores against your own targets, so the duel stays fair at different fitness levels.
        </p>
        <TargetsForm initial={me.targets_json} />
      </section>

      <section className="card flex flex-col gap-2">
        <p className="text-sm font-semibold">Nudges</p>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Mid-day (1pm) and evening (7pm) pushes when you're behind in the duel or a pillar is lagging.
        </p>
        <EnablePush />
      </section>
    </div>
  );
}
