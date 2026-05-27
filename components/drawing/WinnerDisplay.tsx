import Image from "next/image";
import { LocalTime } from "@/components/shared/LocalTime";

interface WinnerEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  selectedNumber: number;
  sequence: number;
}

interface WinnerDisplayProps {
  room: {
    id: string;
    title: string;
    host: { username: string };
    drawingCompletedAt: string | null;
    drawingParticipantCount: number | null;
  };
  winners: WinnerEntry[];
  /** Current authenticated user's ID — used to highlight their win */
  currentUserId?: string;
}

/**
 * WinnerDisplay — Server Component.
 * Static display of winners in sequence order. No realtime needed.
 */
export function WinnerDisplay({ room, winners, currentUserId }: WinnerDisplayProps) {
  const sortedWinners = [...winners].sort((a, b) => a.sequence - b.sequence);

  return (
    <section aria-label="Drawing results">
      {/* Header */}
      <div className="neo-card p-6 mb-4" style={{ background: "var(--color-accent)" }}>
        <div className="text-center">
          <div className="text-5xl mb-2" aria-hidden="true">🏆</div>
          <h2 className="text-2xl font-black" style={{ fontFamily: "var(--font-display)" }}>
            Drawing Complete!
          </h2>
          <p className="text-sm font-medium mt-1" style={{ color: "var(--color-accent-foreground)" }}>
            {room.drawingParticipantCount ?? 0} participants · {winners.length} winner
            {winners.length !== 1 ? "s" : ""}
            {room.drawingCompletedAt && (
              <> · <LocalTime iso={room.drawingCompletedAt} format="timestamp" /></>
            )}
          </p>
        </div>
      </div>

      {/* Winner list */}
      {sortedWinners.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <p className="text-xl" aria-hidden="true">😔</p>
          <p className="font-bold mt-2">No participants — no winners this time.</p>
        </div>
      ) : (
        <ol className="space-y-3" aria-label="Winners list">
          {sortedWinners.map((winner) => {
            const isCurrentUser = winner.userId === currentUserId;
            return (
              <li
                key={winner.sequence}
                className="neo-card p-4 flex items-center gap-4"
                style={{
                  background: isCurrentUser ? "#eff6ff" : undefined,
                  boxShadow: isCurrentUser
                    ? "var(--shadow-neo-primary)"
                    : "var(--shadow-neo)",
                }}
              >
                {/* Sequence badge */}
                <span
                  className="neo-badge neo-badge-primary flex-shrink-0 text-lg min-w-[2.5rem] justify-center"
                  aria-label={`Winner number ${winner.sequence}`}
                >
                  #{winner.sequence}
                </span>

                {/* Avatar */}
                <span className="relative flex-shrink-0 w-10 h-10 border-2 border-[var(--color-border)] overflow-hidden">
                  {winner.avatarUrl ? (
                    <Image
                      src={winner.avatarUrl}
                      alt={winner.username}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span
                      className="flex items-center justify-center w-full h-full text-sm font-black"
                      style={{ background: "var(--color-accent)" }}
                    >
                      {winner.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>

                {/* Name + number */}
                <div className="flex-1 min-w-0">
                  <p className="font-black truncate" style={{ fontFamily: "var(--font-display)" }}>
                    {winner.username}
                    {isCurrentUser && (
                      <span className="ml-2" aria-label="That's you!">🏆</span>
                    )}
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                    Lucky number: <strong>{winner.selectedNumber}</strong>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

    </section>
  );
}
