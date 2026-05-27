"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteRoomButtonProps {
  roomId: string;
  roomTitle: string;
  isFinished?: boolean;
}

/**
 * DeleteRoomButton — Client Component.
 * Shows a confirmation dialog before calling DELETE /api/rooms/[id].
 * Rendered by the host to delete active or finished rooms.
 */
export function DeleteRoomButton({ roomId, roomTitle, isFinished }: DeleteRoomButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });

      if (res.status === 204 || res.ok) {
        // Successfully deleted — navigate home
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message ?? "Failed to delete room.");
        setConfirming(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setConfirming(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div
        className="neo-card p-4 space-y-3"
        style={{
          borderColor: "var(--color-destructive)",
          boxShadow: "var(--shadow-neo-destructive)",
        }}
        role="dialog"
        aria-label="Confirm delete room"
        aria-modal="true"
      >
        <p className="font-bold text-sm">
          Delete <span className="font-black">"{roomTitle}"</span>?
        </p>
        <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
          {isFinished
            ? "Are you sure you want to delete this drawing history? This cannot be undone."
            : "This will permanently remove the room and all participant records. This cannot be undone."}
        </p>

        {error && (
          <p className="text-sm font-bold" style={{ color: "var(--color-destructive)" }}>
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            id="delete-room-confirm-btn"
            onClick={handleDelete}
            disabled={isDeleting}
            className="neo-btn neo-btn-destructive neo-btn-sm flex-1"
            aria-busy={isDeleting}
          >
            {isDeleting ? (
              <>
                <span
                  className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                Deleting…
              </>
            ) : (
              "Yes, Delete"
            )}
          </button>
          <button
            id="delete-room-cancel-btn"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={isDeleting}
            className="neo-btn neo-btn-outline neo-btn-sm flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      id="delete-room-btn"
      onClick={() => setConfirming(true)}
      className="neo-btn neo-btn-destructive neo-btn-sm"
      aria-label={`Delete room "${roomTitle}"`}
    >
      🗑️ Delete Room
    </button>
  );
}
