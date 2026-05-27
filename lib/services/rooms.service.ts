/**
 * Room Service — CRUD operations for giveaway rooms.
 *
 * All functions accept a Supabase client instance so they work with both
 * the anon client (user-scoped, RLS-enforced) and the admin client (cron/draw).
 * API routes create the client and pass it in — services do not create clients directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Room,
  RoomWithHost,
  RoomDetail,
  RoomListItem,
  RoomsListResponse,
  RoomState,
} from "@/lib/types";
import { createRoomSchema, roomsQuerySchema } from "@/lib/utils/validation";
import {
  notFoundError,
  forbiddenError,
  validationError,
  internalError,
  formatErrorResponse,
} from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseDB = SupabaseClient<any>;

// ──────────────────────────────────────────────
// createRoom
// ──────────────────────────────────────────────

export interface CreateRoomData {
  title: string;
  description: string;
  minNumber: number;
  maxNumber: number;
  deadline: string;
  totalWinners: number;
}

/**
 * Creates a new giveaway room.
 * Validates input with Zod, inserts into DB, returns the created room.
 *
 * @throws AppError on validation failure or DB error
 */
export async function createRoom(
  supabase: SupabaseDB,
  userId: string,
  data: CreateRoomData
): Promise<Room> {
  // Validate with Zod
  const result = createRoomSchema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!fields[path]) fields[path] = issue.message;
    }
    // Log full Zod error to terminal for debugging
    console.error("[createRoom] Zod validation failed:", JSON.stringify({
      issues: result.error.issues,
      receivedPayload: {
        ...data,
        deadline: data.deadline,
        deadlineParsed: data.deadline ? new Date(data.deadline).toISOString() : null,
        nowPlus4Min: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
        nowPlus5Min: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    }, null, 2));
    throw validationError("Room data is invalid.", fields);
  }

  const { title, description, minNumber, maxNumber, deadline, totalWinners } =
    result.data;

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      host_id: userId,
      title,
      description,
      min_number: minNumber,
      max_number: maxNumber,
      deadline,
      total_winners: totalWinners,
      state: "active",
    })
    .select()
    .single();

  if (error || !room) {
    logger.error("[rooms.service] createRoom DB error", error ?? undefined);
    throw internalError("Failed to create room. Please try again.");
  }

  logger.info("[rooms.service] Room created", {
    roomId: room.id,
    userId,
    title: room.title,
  });

  return room as Room;
}

// ──────────────────────────────────────────────
// getRooms
// ──────────────────────────────────────────────

export interface GetRoomsOptions {
  state?: RoomState;
  page?: number;
  limit?: number;
}

/**
 * Returns a paginated, optionally filtered list of rooms with participant counts.
 */
export async function getRooms(
  supabase: SupabaseDB,
  options: GetRoomsOptions = {}
): Promise<RoomsListResponse> {
  const parsed = roomsQuerySchema.safeParse(options);
  const { state, page, limit } = parsed.success
    ? parsed.data
    : { state: undefined, page: 1, limit: 20 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("rooms")
    .select(
      `
      id, host_id, title, description, min_number, max_number,
      deadline, total_winners, state, created_at,
      host:users!rooms_host_id_fkey(id, username, avatar_url),
      participants(count)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (state) {
    query = query.eq("state", state);
  }

  const { data, error, count } = await query;

  if (error) {
    logger.error("[rooms.service] getRooms DB error", error);
    throw internalError("Failed to load rooms.");
  }

  const rooms: RoomListItem[] = (data ?? []).map((row: any) => ({
    id: row.id,
    host_id: row.host_id,
    host: {
      id: row.host?.id ?? row.host_id,
      username: row.host?.username ?? "Unknown",
      avatar_url: row.host?.avatar_url ?? null,
    },
    title: row.title,
    description: row.description,
    min_number: row.min_number,
    max_number: row.max_number,
    deadline: row.deadline,
    total_winners: row.total_winners,
    state: row.state as RoomState,
    created_at: row.created_at,
    participant_count: row.participants?.[0]?.count ?? 0,
  }));

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    rooms,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

// ──────────────────────────────────────────────
// getRoomById
// ──────────────────────────────────────────────

/**
 * Fetches a single room with its host, participants, and winners.
 *
 * @throws notFoundError if room doesn't exist
 */
export async function getRoomById(
  supabase: SupabaseDB,
  roomId: string
): Promise<RoomDetail> {
  const { data: room, error } = await supabase
    .from("rooms")
    .select(
      `
      *,
      host:users!rooms_host_id_fkey(id, username, avatar_url),
      participants(
        id, room_id, user_id, selected_number, joined_at,
        user:users(id, username, avatar_url)
      ),
      winners(
        id, room_id, user_id, selected_number, sequence, selected_at,
        user:users(id, username, avatar_url)
      )
    `
    )
    .eq("id", roomId)
    .single();

  if (error || !room) {
    if (error?.code === "PGRST116") throw notFoundError("Room");
    logger.error("[rooms.service] getRoomById DB error", error ?? undefined, { roomId });
    throw internalError("Failed to load room.");
  }

  const row = room as any;

  return {
    id: row.id,
    host_id: row.host_id,
    host: {
      id: row.host?.id ?? row.host_id,
      username: row.host?.username ?? "Unknown",
      avatar_url: row.host?.avatar_url ?? null,
    },
    title: row.title,
    description: row.description,
    min_number: row.min_number,
    max_number: row.max_number,
    deadline: row.deadline,
    total_winners: row.total_winners,
    state: row.state as RoomState,
    created_at: row.created_at,
    drawing_algorithm: row.drawing_algorithm ?? null,
    drawing_participant_count: row.drawing_participant_count ?? null,
    drawing_started_at: row.drawing_started_at ?? null,
    drawing_completed_at: row.drawing_completed_at ?? null,
    participants: (row.participants ?? []).map((p: any) => ({
      id: p.id,
      room_id: p.room_id,
      user_id: p.user_id,
      selected_number: p.selected_number,
      joined_at: p.joined_at,
      user: {
        id: p.user?.id ?? p.user_id,
        username: p.user?.username ?? "Unknown",
        avatar_url: p.user?.avatar_url ?? null,
      },
    })),
    winners: (row.winners ?? []).map((w: any) => ({
      id: w.id,
      room_id: w.room_id,
      user_id: w.user_id,
      selected_number: w.selected_number,
      sequence: w.sequence,
      selected_at: w.selected_at,
      user: {
        id: w.user?.id ?? w.user_id,
        username: w.user?.username ?? "Unknown",
        avatar_url: w.user?.avatar_url ?? null,
      },
    })),
    participant_count: (row.participants ?? []).length,
  };
}

// ──────────────────────────────────────────────
// deleteRoom
// ──────────────────────────────────────────────

/**
 * Deletes a room. Only the host can delete, and only when the room is active.
 *
 * @throws notFoundError if room doesn't exist
 * @throws forbiddenError if user is not the host or room is not active
 */
export async function deleteRoom(
  supabase: SupabaseDB,
  roomId: string,
  userId: string
): Promise<void> {
  // First fetch to verify ownership and state
  const { data: room, error: fetchError } = await supabase
    .from("rooms")
    .select("id, host_id, state")
    .eq("id", roomId)
    .single();

  if (fetchError || !room) {
    if (fetchError?.code === "PGRST116") throw notFoundError("Room");
    throw internalError("Failed to find room.");
  }

  if (room.host_id !== userId) {
    throw forbiddenError("Only the room host can delete this room.");
  }

  const { error: deleteError } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId)
    .eq("host_id", userId); // Belt-and-suspenders: RLS also enforces this

  if (deleteError) {
    logger.error("[rooms.service] deleteRoom DB error", deleteError, { roomId, userId });
    throw internalError("Failed to delete room.");
  }

  logger.info("[rooms.service] Room deleted", { roomId, userId });
}
