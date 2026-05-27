import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRooms } from "@/lib/services/rooms.service";
import { RoomList } from "@/components/rooms/RoomList";

import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Browse Rooms — Giveaway App",
  description:
    "Browse active giveaway rooms, join one and select your lucky number before the deadline.",
};

async function HeroActions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <Link
      href="/rooms/create"
      id="hero-create-room-btn"
      className="neo-btn neo-btn-primary flex-shrink-0"
      aria-label="Create a new giveaway room"
    >
      ➕ Create Room
    </Link>
  );
}

async function RoomsWrapper() {
  const supabase = await createClient();
  const initialData = await getRooms(supabase, { page: 1, limit: 12 }).catch(
    () => ({
      rooms: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    })
  );

  return <RoomList initialData={initialData} />;
}

/**
 * Home page — Server Component.
 * Implements Streaming with Suspense to return the layout instantly.
 */
export default function HomePage() {
  return (
    <div>
      {/* Hero section */}
      <section
        className="neo-card p-6 mb-8"
        style={{ background: "var(--color-accent)" }}
        aria-labelledby="hero-title"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1
              id="hero-title"
              className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              🎁 Community Giveaways
            </h1>
            <p className="mt-1 text-sm sm:text-base font-medium" style={{ color: "var(--color-accent-foreground)" }}>
              Pick your lucky number. Win prizes. Fair draws every time.
            </p>
          </div>
          <Suspense fallback={<div className="w-[140px] h-[44px] bg-[var(--color-muted)] border-2 border-[var(--color-border)] animate-pulse" />}>
            <HeroActions />
          </Suspense>
        </div>
      </section>

      {/* Room list with filter tabs, pagination, realtime updates */}
      <Suspense fallback={<p>Loading...</p>}>
        <RoomsWrapper />
      </Suspense>
    </div>
  );
}

