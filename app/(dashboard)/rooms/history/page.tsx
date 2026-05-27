import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { LocalTime } from "@/components/shared/LocalTime";
import { DeleteRoomButton } from "@/components/rooms/DeleteRoomButton";

import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Drawing History — Giveaway App",
  description: "Browse completed giveaway rooms and see the winners.",
};

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

async function HistoryContent({ searchParams }: PageProps) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch finished rooms with host info and top winner
  const { data: rooms, count } = await supabase
    .from("rooms")
    .select(
      `
      id, title, description, deadline, drawing_completed_at,
      drawing_participant_count, total_winners,
      host:users!rooms_host_id_fkey(id, username, avatar_url),
      winners(sequence, selected_number, user:users!winners_user_id_fkey(username, avatar_url))
      `,
      { count: "exact" }
    )
    .eq("state", "finished")
    .order("drawing_completed_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <>
      {/* Header Info (Total Count) */}
      <div className="mb-6 -mt-10">
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted-foreground)" }}>
          {count ?? 0} completed giveaway{(count ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Room list */}
      {!rooms || rooms.length === 0 ? (
        <div className="neo-card p-12 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">📭</div>
          <h2
            className="text-xl font-black mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            No finished giveaways yet
          </h2>
          <p style={{ color: "var(--color-muted-foreground)" }}>
            Check back after the first deadline passes.
          </p>
          <Link href="/" className="neo-btn neo-btn-primary mt-4 inline-flex">
            Browse Active Rooms
          </Link>
        </div>
      ) : (
        <ol className="space-y-4" aria-label="Finished giveaway rooms">
          {(rooms as any[]).map((room) => {
            const firstWinner = room.winners
              ?.sort((a: any, b: any) => a.sequence - b.sequence)
              ?.at(0);

            return (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.id}`}
                  id={`history-room-${room.id}`}
                  className="block neo-card-hover p-5"
                  aria-label={`View results for ${room.title}`}
                >
                  <div className="flex items-start gap-4">
                    {/* First winner avatar */}
                    <div
                      className="flex-shrink-0 w-12 h-12 border-2 border-[var(--color-border)] overflow-hidden flex items-center justify-center"
                      style={{
                        background: firstWinner ? "var(--color-accent)" : "var(--color-muted)",
                      }}
                      aria-hidden="true"
                    >
                      {firstWinner?.user?.avatar_url ? (
                        <Image
                          src={firstWinner.user.avatar_url}
                          alt={firstWinner.user.username}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-2xl">
                          {firstWinner ? "🏆" : "🎪"}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h2
                          className="font-black text-lg leading-tight truncate"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {room.title}
                        </h2>
                        <span className="neo-badge neo-badge-finished flex-shrink-0">
                          ✅ Finished
                        </span>
                      </div>

                      {/* Winner info */}
                      {firstWinner ? (
                        <p className="text-sm font-medium mt-0.5">
                          🥇 Winner: <strong>{firstWinner.user?.username}</strong>{" "}
                          <span style={{ color: "var(--color-muted-foreground)" }}>
                            (#{firstWinner.selected_number})
                          </span>
                          {room.winners.length > 1 && (
                            <span style={{ color: "var(--color-muted-foreground)" }}>
                              {" "}+ {room.winners.length - 1} more
                            </span>
                          )}
                        </p>
                      ) : (
                        <p
                          className="text-sm mt-0.5"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          No participants
                        </p>
                      )}

                      {/* Meta */}
                      <div
                        className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        <span>by {(room.host as any)?.username}</span>
                        <span>👥 {room.drawing_participant_count ?? 0}</span>
                        <span>
                          {room.drawing_completed_at
                            ? <LocalTime iso={room.drawing_completed_at} format="timestamp" />
                            : <LocalTime iso={room.deadline} format="deadline" />}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {user?.id === room.host_id && (
                      <div className="ml-4 self-center" onClick={(e) => e.preventDefault()}>
                        <DeleteRoomButton roomId={room.id} roomTitle={room.title} />
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-3 mt-8"
          aria-label="History pagination"
        >
          {page > 1 && (
            <Link
              href={`/rooms/history?page=${page - 1}`}
              id="history-prev"
              className="neo-btn neo-btn-outline neo-btn-sm"
              aria-label="Previous page"
            >
              ← Prev
            </Link>
          )}
          <span className="neo-badge neo-badge-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/rooms/history?page=${page + 1}`}
              id="history-next"
              className="neo-btn neo-btn-outline neo-btn-sm"
              aria-label="Next page"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

/**
 * History Page — Server Component.
 * Uses Suspense to instantly stream the layout.
 */
export default function HistoryPage(props: PageProps) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          📜 Drawing History
        </h1>
      </div>
      
      <Suspense fallback={<p>Loading...</p>}>
        <HistoryContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
