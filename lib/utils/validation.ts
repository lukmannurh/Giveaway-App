import { z } from "zod";

// ──────────────────────────────────────────────
// Room Creation Schema
// ──────────────────────────────────────────────

export const createRoomSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must be at most 100 characters")
      .trim(),

    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(500, "Description must be at most 500 characters")
      .trim(),

    minNumber: z
      .number({ message: "Minimum number must be a whole number" })
      .int("Must be a whole number")
      .min(1, "Minimum number must be at least 1"),

    maxNumber: z
      .number({ message: "Maximum number must be a whole number" })
      .int("Must be a whole number"),

    deadline: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Deadline must be a valid date")
      .refine(
        // 4-minute buffer (instead of 5) to absorb client→server latency.
        // The shortest preset is 5 minutes, so this still enforces the rule
        // while preventing false rejections due to transit time (~1–2s).
        (val) => new Date(val) > new Date(Date.now() + 4 * 60 * 1000),
        "Deadline must be at least 5 minutes in the future"
      ),

    totalWinners: z
      .number({ message: "Number of winners must be a whole number" })
      .int("Must be a whole number")
      .min(1, "Must have at least 1 winner")
      .max(50, "Maximum 50 winners allowed"),
  })
  .refine((data) => data.maxNumber > data.minNumber, {
    message: "Maximum number must be greater than minimum number",
    path: ["maxNumber"],
  })
  .refine(
    (data) => data.maxNumber - data.minNumber + 1 <= 999,
    {
      message: "Number range cannot exceed 999 numbers",
      path: ["maxNumber"],
    }
  )
  .refine(
    (data) => data.totalWinners <= data.maxNumber - data.minNumber + 1,
    {
      message: "Number of winners cannot exceed the total numbers in range",
      path: ["totalWinners"],
    }
  );

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

// ──────────────────────────────────────────────
// Join Room (Number Selection) Schema
// ──────────────────────────────────────────────

export const joinRoomSchema = z.object({
  selectedNumber: z
    .number({ message: "Please select a valid number" })
    .int("Must be a whole number"),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;

// ──────────────────────────────────────────────
// Room List Query Schema
// ──────────────────────────────────────────────

export const roomsQuerySchema = z.object({
  state: z.enum(["active", "drawing", "finished"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type RoomsQueryInput = z.infer<typeof roomsQuerySchema>;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Formats Zod validation errors into a flat object of field → message.
 * Useful for displaying inline form errors.
 */
export function formatZodErrors(
  error: z.ZodError
): Record<string, string> {
  return error.issues.reduce(
    (acc, issue) => {
      const path = issue.path.join(".");
      if (!acc[path]) {
        acc[path] = issue.message;
      }
      return acc;
    },
    {} as Record<string, string>
  );
}

/**
 * Validates request body against a schema.
 * Returns either the parsed data or a formatted error object.
 */
export async function parseBody<T>(
  request: Request,
  schema: z.Schema<T>
): Promise<{ data: T; errors: null } | { data: null; errors: Record<string, string> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return { data: null, errors: formatZodErrors(result.error) };
    }

    return { data: result.data, errors: null };
  } catch {
    return { data: null, errors: { _root: "Invalid JSON body" } };
  }
}
