import Link from "next/link";
import { CountdownTimer } from "@/components/drawing/CountdownTimer";
import { LocalTime } from "@/components/shared/LocalTime";
import type { RoomListItem } from "@/lib/types";

interface RoomCardProps {
  room: RoomListItem;
}

const STATE_BADGE: Record<string, string> = {
  active: "neo-badge neo-badge-active",
  drawing: "neo-badge neo-badge-drawing",
  finished: "neo-badge neo-badge-finished",
};

const STATE_LABEL: Record<string, string> = {
  active: "🟢 Active",
  drawing: "🎰 Drawing!",
  finished: "✅ Finished",
};

/**
 * RoomCard — Server Component.
 * Displays room summary with state badge, countdown timer (for active rooms),
 * and participant count.
 */
export function RoomCard({ room }: RoomCardProps) {
  const badgeClass = STATE_BADGE[room.state] ?? "neo-badge neo-badge-muted";
  const stateLabel = STATE_LABEL[room.state] ?? room.state;

  return (
    <Link
      href={`/rooms/${room.id}`}
      id={`room-card-${room.id}`}
      className="block neo-card-hover p-5 focus-visible:outline-4"
      aria-label={`View room: ${room.title}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className="font-black text-lg leading-tight truncate"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {room.title}
          </h3>
          <p
            className="text-sm mt-0.5 truncate"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            by {room.host.username}
          </p>
        </div>
        <span className={badgeClass} aria-label={`State: ${room.state}`}>
          {stateLabel}
        </span>
      </div>

      {/* Description */}
      <p
        className="text-sm line-clamp-2 mb-4"
        style={{ color: "var(--color-muted-foreground)" }}
      >
        {room.description}
      </p>

      {/* Stats row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Number range */}
        <span
          className="neo-badge neo-badge-muted text-xs"
          aria-label={`Number range ${room.min_number} to ${room.max_number}`}
        >
          🔢 {room.min_number}–{room.max_number}
        </span>

        {/* Participant count */}
        <span
          className="neo-badge neo-badge-muted text-xs"
          aria-label={`${room.participant_count} participants`}
        >
          👥 {room.participant_count}
        </span>

        {/* Winners */}
        <span
          className="neo-badge neo-badge-muted text-xs"
          aria-label={`${room.total_winners} winner${room.total_winners !== 1 ? "s" : ""}`}
        >
          🏆 {room.total_winners}W
        </span>

        {/* Deadline / Timer */}
        <div className="text-sm font-bold">
          {room.state === "active" ? (
            <span aria-label="Time remaining">
              ⏰{" "}
              {/* CountdownTimer is a Client Component — suspend renders it inline */}
              <CountdownTimer deadline={room.deadline} variant="compact" />
            </span>
          ) : (
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              📅 <LocalTime iso={room.deadline} format="deadline" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
