"use client";

import { CalendarClock, History, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Navbar } from "@/components/dashboard/Navbar";
import { ActionTiles } from "@/components/dashboard/ActionTiles";
import { MeetingCard } from "@/components/dashboard/MeetingCard";
import { JoinModal } from "@/components/modals/JoinModal";
import { NewMeetingModal } from "@/components/modals/NewMeetingModal";
import { ScheduleModal } from "@/components/modals/ScheduleModal";
import { api } from "@/lib/api";
import type { MeetingList, User } from "@/lib/types";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<MeetingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<null | "new" | "join" | "schedule">(null);

  const loadMeetings = useCallback(async () => {
    try {
      const data = await api.listMeetings();
      setMeetings(data);
      setError("");
    } catch (e) {
      setError((e as Error).message || "Could not load meetings.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [user] = await Promise.all([
        api.me().catch(() => null),
        loadMeetings(),
      ]);
      if (!active) return;
      if (user) setUser(user);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadMeetings]);

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Navbar user={user} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zoom-ink">
            Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-zoom-gray">
            Start an instant meeting, schedule one, or join with an ID.
          </p>
        </div>

        <ActionTiles
          onNewMeeting={() => setModal("new")}
          onJoin={() => setModal("join")}
          onSchedule={() => setModal("schedule")}
        />

        {error && (
          <div className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-16 flex items-center justify-center gap-2 text-zoom-gray">
            <Loader2 className="animate-spin" size={20} /> Loading your meetings…
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Section
              title="Upcoming Meetings"
              icon={<CalendarClock size={18} />}
              empty="No upcoming meetings. Schedule one to see it here."
              count={meetings?.upcoming.length || 0}
            >
              {meetings?.upcoming.map((m) => (
                <MeetingCard key={m.id} meeting={m} variant="upcoming" />
              ))}
            </Section>

            <Section
              title="Recent Meetings"
              icon={<History size={18} />}
              empty="No recent meetings yet."
              count={meetings?.recent.length || 0}
            >
              {meetings?.recent.map((m) => (
                <MeetingCard key={m.id} meeting={m} variant="recent" />
              ))}
            </Section>
          </div>
        )}
      </main>

      {modal === "new" && (
        <NewMeetingModal open onClose={() => setModal(null)} />
      )}
      {modal === "join" && <JoinModal open onClose={() => setModal(null)} />}
      {modal === "schedule" && (
        <ScheduleModal
          open
          onClose={() => setModal(null)}
          onScheduled={loadMeetings}
        />
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-zoom-blue">{icon}</span>
        <h2 className="font-semibold text-zoom-ink">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 px-4 py-10 text-center text-sm text-zoom-gray">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}
