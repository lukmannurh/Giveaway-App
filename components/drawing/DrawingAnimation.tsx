"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface WinnerReveal {
  sequence: number;
  userId: string;
  username: string;
  selectedNumber: number;
}

interface DrawingAnimationProps {
  roomId: string;
  totalWinners: number;
  participantCount: number;
  onComplete?: () => void;
}

export function DrawingAnimation({
  roomId,
  totalWinners,
  participantCount,
  onComplete,
}: DrawingAnimationProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"spinning" | "done">("spinning");
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [winners, setWinners] = useState<WinnerReveal[]>([]);
  const pendingWinnersRef = useRef<WinnerReveal[]>([]);

  // Fast spinning numbers
  useEffect(() => {
    if (phase !== "spinning") return;
    const interval = setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * 1000) + 1);
    }, 50); // fast 50ms spin
    return () => clearInterval(interval);
  }, [phase]);

  // Realtime subscription for winners
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on("broadcast", { event: "winner_selected" }, ({ payload }) => {
        const newWinner = {
          sequence: payload.sequence,
          userId: payload.userId,
          username: payload.username || "Unknown User",
          selectedNumber: payload.selectedNumber,
        };
        pendingWinnersRef.current.push(newWinner);
        
        // If the 5000ms spin already ended, immediately reveal the winner as it arrives
        setWinners((prev) => {
          if (prev.find((w) => w.sequence === newWinner.sequence)) return prev;
          // Only update state if phase is done, or if it's currently spinning (it won't render until phase is done anyway, but it's safe to sync state)
          return [...prev, newWinner];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Strict 5-second timer (ZERO latency reveal)
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Reveal whatever we have so far
      setWinners([...pendingWinnersRef.current]);
      setPhase("done");
      
      // Refresh the server components in the background so the participant list updates
      router.refresh();
      
    }, 5000); // STRICT 5000ms

    return () => clearTimeout(timeout);
  }, [roomId, router]);

  if (phase === "done") {
    return (
      <div className="neo-card p-10 text-center" style={{ background: "#eff6ff", boxShadow: "var(--shadow-neo-primary)" }}>
        <div className="text-6xl mb-4" aria-hidden="true">🏆</div>
        <h2 className="text-3xl font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
          {winners.length > 1 ? "WINNERS REVEALED!" : "WINNER REVEALED!"}
        </h2>
        {winners.length > 0 ? (
          <ul className="space-y-4">
            {winners.sort((a, b) => a.sequence - b.sequence).map((w) => (
              <li key={w.sequence} className="flex flex-col items-center justify-center p-6 bg-white border-[3px] border-[var(--color-border)] shadow-[4px_4px_0px_var(--color-border)]">
                <span className="neo-badge neo-badge-accent mb-2">Winner #{w.sequence}</span>
                <span className="font-black text-6xl my-2 text-[var(--color-primary)]">{w.selectedNumber}</span>
                <span className="font-bold text-xl text-[var(--color-muted-foreground)] uppercase">{w.username}</span>
              </li>
            ))}
          </ul>
        ) : participantCount > 0 ? (
          <div className="flex flex-col items-center justify-center p-6 bg-white border-[3px] border-[var(--color-border)] shadow-[4px_4px_0px_var(--color-border)]">
            <span className="font-bold text-xl text-[var(--color-muted-foreground)] uppercase animate-pulse">Waiting for network...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-white border-[3px] border-[var(--color-border)] shadow-[4px_4px_0px_var(--color-border)]">
            <span className="font-bold text-xl text-[var(--color-muted-foreground)] uppercase">No participants</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="neo-card p-10 text-center">
      <div className="neo-badge neo-badge-drawing inline-flex mb-6">
        🎰 Drawing... Who will it be?
      </div>

      <div
        className="text-8xl font-black tabular-nums my-8 neo-animate-spin-number scale-110"
        style={{ fontFamily: "var(--font-display)", minHeight: "8rem" }}
        aria-live="polite"
      >
        {displayNumber !== null ? displayNumber : "000"}
      </div>

      <p
        className="text-2xl font-black mb-4 animate-pulse"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-warning)" }}
      >
        🥁 Drumroll...
      </p>

      <p className="text-sm mt-6 font-bold" style={{ color: "var(--color-muted-foreground)" }}>
        👥 {participantCount} participants · 🏆 {totalWinners} winner{totalWinners !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
