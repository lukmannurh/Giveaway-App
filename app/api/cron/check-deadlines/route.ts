import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

// ──────────────────────────────────────────────
// GET /api/cron/check-deadlines
// Vercel Cron Job — runs every minute.
// Finds all active rooms whose deadline has passed and triggers drawing.
//
// Authentication: CRON_SECRET bearer token.
// On Vercel, this header is set automatically by the cron scheduler.
// ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // ── CRON_SECRET verification ──────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    logger.error("[GET /api/cron/check-deadlines] CRON_SECRET not configured");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Server configuration error." } },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    logger.warn("[GET /api/cron/check-deadlines] Unauthorized cron attempt");
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or missing authorization." } },
      { status: 401 }
    );
  }

  // ── Find all expired active rooms ────────────────────────────
  const supabaseAdmin = createAdminClient();

  const { data: expiredRoomsRaw, error: queryError } = await supabaseAdmin
    .from("rooms")
    .select("id, title, deadline")
    .eq("state", "active")
    .lte("deadline", new Date().toISOString());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expiredRooms = expiredRoomsRaw as any[];

  if (queryError) {
    logger.error("[GET /api/cron/check-deadlines] Query error", queryError);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to query expired rooms." } },
      { status: 500 }
    );
  }

  const rooms = expiredRooms ?? [];

  if (rooms.length === 0) {
    logger.info("[GET /api/cron/check-deadlines] No expired rooms found");
    return NextResponse.json({ triggered: 0, results: [] }, { status: 200 });
  }

  logger.info("[GET /api/cron/check-deadlines] Found expired rooms", {
    count: rooms.length,
    roomIds: rooms.map((r) => r.id),
  });

  // ── Trigger drawing for each expired room ────────────────────
  // Use Promise.allSettled so one failure doesn't block the others.
  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
  const cronSecret = expectedSecret;

  const results = await Promise.allSettled(
    rooms.map(async (room) => {
      const res = await fetch(`${baseUrl}/api/rooms/${room.id}/draw`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${cronSecret}`,
          "content-type": "application/json",
        },
      });

      const responseBody = await res.json().catch(() => ({}));

      if (!res.ok && res.status !== 200) {
        throw new Error(
          `Draw failed for room ${room.id}: HTTP ${res.status}`
        );
      }

      return { roomId: room.id, status: res.status, response: responseBody };
    })
  );

  // ── Summarize results ────────────────────────────────────────
  const summary = results.map((result, index) => {
    const roomId = rooms[index].id;
    if (result.status === "fulfilled") {
      return { roomId, success: true };
    } else {
      logger.error("[GET /api/cron/check-deadlines] Draw failed for room", undefined, {
        roomId,
        error: result.reason?.message,
      });
      return { roomId, success: false, error: result.reason?.message };
    }
  });

  const succeeded = summary.filter((r) => r.success).length;
  const failed = summary.filter((r) => !r.success).length;

  // ── Auto-Delete 7-Day History ──────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: deletedRoomsCount, error: deleteError } = await supabaseAdmin
    .from("rooms")
    .delete({ count: "exact" })
    .eq("state", "finished")
    .lt("drawing_completed_at", sevenDaysAgo);

  if (deleteError) {
    logger.error("[GET /api/cron/check-deadlines] Failed to cleanup old rooms", deleteError);
  } else if (deletedRoomsCount && deletedRoomsCount > 0) {
    logger.info(`[GET /api/cron/check-deadlines] Cleaned up ${deletedRoomsCount} old rooms`);
  }

  logger.info("[GET /api/cron/check-deadlines] Cron run complete", {
    triggered: rooms.length,
    succeeded,
    failed,
    cleanedUp: deletedRoomsCount ?? 0,
    durationMs: Date.now() - startTime,
  });

  return NextResponse.json(
    {
      triggered: rooms.length,
      succeeded,
      failed,
      cleanedUp: deletedRoomsCount ?? 0,
      results: summary,
    },
    { status: 200 }
  );
}
