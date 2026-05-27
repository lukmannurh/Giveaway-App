"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

/**
 * Duration options for the deadline dropdown.
 * Value is in minutes, label is user-facing.
 */
const DURATION_OPTIONS = [
  { value: 5, label: "5 Minutes" },
  { value: 15, label: "15 Minutes" },
  { value: 30, label: "30 Minutes" },
  { value: 45, label: "45 Minutes" },
  { value: 60, label: "1 Hour" },
  { value: 120, label: "2 Hours" },
  { value: 180, label: "3 Hours" },
  { value: 240, label: "4 Hours" },
  { value: 300, label: "5 Hours" },
  { value: 360, label: "6 Hours" },
  { value: 420, label: "7 Hours" },
  { value: 480, label: "8 Hours" },
  { value: 540, label: "9 Hours" },
  { value: 600, label: "10 Hours" },
  { value: 660, label: "11 Hours" },
  { value: 720, label: "12 Hours" },
  { value: 780, label: "13 Hours" },
  { value: 840, label: "14 Hours" },
  { value: 900, label: "15 Hours" },
  { value: 960, label: "16 Hours" },
  { value: 1020, label: "17 Hours" },
  { value: 1080, label: "18 Hours" },
  { value: 1140, label: "19 Hours" },
  { value: 1200, label: "20 Hours" },
  { value: 1260, label: "21 Hours" },
  { value: 1320, label: "22 Hours" },
  { value: 1380, label: "23 Hours" },
  { value: 1440, label: "24 Hours" },
];

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100).trim(),
  description: z.string().min(10, "Description must be at least 10 characters").max(500).trim(),
  minNumber: z.coerce.number().int().min(1, "Minimum number is 1"),
  maxNumber: z.coerce.number().int().min(2, "Maximum number is 2"),
  duration: z.coerce.number().int().min(5),
  totalWinners: z.coerce.number().int().min(1).max(50)
}).refine(data => data.maxNumber > data.minNumber, {
  message: "Maximum number must be greater than minimum number",
  path: ["maxNumber"]
}).refine(data => data.maxNumber - data.minNumber + 1 <= 999, {
  message: "Number range cannot exceed 999 numbers",
  path: ["maxNumber"]
}).refine(data => data.totalWinners <= data.maxNumber - data.minNumber + 1, {
  message: "Number of winners cannot exceed the total numbers in range",
  path: ["totalWinners"]
});

export function CreateRoomForm() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());
    
    // Parse numeric fields manually
    const payloadRaw = {
      ...rawData,
      minNumber: Number(rawData.minNumber),
      maxNumber: Number(rawData.maxNumber),
      totalWinners: Number(rawData.totalWinners),
      duration: Number(rawData.duration)
    };

    // Manual Zod Validation
    const validation = formSchema.safeParse(payloadRaw);
    if (!validation.success) {
      const formattedErrors: Record<string, string> = {};
      validation.error.issues.forEach(issue => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(formattedErrors);
      setIsSubmitting(false);
      return;
    }

    const data = validation.data;
    const deadlineDate = new Date(Date.now() + data.duration * 60 * 1000);

    const payload = {
      title: data.title,
      description: data.description,
      minNumber: data.minNumber,
      maxNumber: data.maxNumber,
      deadline: deadlineDate.toISOString(),
      totalWinners: data.totalWinners,
    };

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.message) {
          setErrors({ _root: json.error.message });
          toast.error(json.error.message);
        } else {
          setErrors({ _root: "Failed to create room." });
          toast.error("Please fix the form errors below.");
        }
      } else {
        setSuccess(true);
        toast.success("🎁 Room created! Redirecting…");
        router.push(`/rooms/${json.id}`);
      }
    } catch {
      const msg = "Network error. Please try again.";
      setErrors({ _root: msg });
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className="neo-card p-8 text-center"
        style={{ background: "#f0fdf4", boxShadow: "var(--shadow-neo-success)" }}
      >
        <div className="text-5xl mb-3" aria-hidden="true">🎉</div>
        <h2 className="text-xl font-black" style={{ fontFamily: "var(--font-display)" }}>
          Room created!
        </h2>
        <p style={{ color: "var(--color-muted-foreground)" }}>Redirecting…</p>
      </div>
    );
  }

  return (
    <form
      id="create-room-form"
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 pb-32"
      aria-label="Create giveaway room"
    >
      {errors._root && (
        <div
          className="neo-card p-4"
          style={{ borderColor: "var(--color-destructive)", boxShadow: "var(--shadow-neo-destructive)" }}
          role="alert"
        >
          <p className="font-bold text-sm" style={{ color: "var(--color-destructive)" }}>
            {errors._root}
          </p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <label htmlFor="title" className="block font-bold text-sm">
          Room Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="e.g. Summer Giveaway 2025"
          className={`neo-input ${errors.title ? "neo-input-error" : ""}`}
          aria-describedby={errors.title ? "title-error" : undefined}
          aria-invalid={!!errors.title}
          required
        />
        {errors.title && (
          <p id="title-error" className="text-sm font-medium" style={{ color: "var(--color-destructive)" }}>
            {errors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="description" className="block font-bold text-sm">
          Description <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Describe what participants can win and any rules…"
          className={`neo-input resize-y ${errors.description ? "neo-input-error" : ""}`}
          style={{ minHeight: "80px" }}
          aria-describedby={errors.description ? "description-error" : undefined}
          aria-invalid={!!errors.description}
          required
        />
        {errors.description && (
          <p id="description-error" className="text-sm font-medium" style={{ color: "var(--color-destructive)" }}>
            {errors.description}
          </p>
        )}
      </div>

      {/* Number range */}
      <fieldset className="space-y-2">
        <legend className="font-bold text-sm block mb-1">
          Number Range <span aria-hidden="true">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="minNumber" className="block text-sm font-medium">
              Min
            </label>
            <input
              id="minNumber"
              name="minNumber"
              type="number"
              defaultValue={1}
              className={`neo-input ${errors.minNumber ? "neo-input-error" : ""}`}
              aria-invalid={!!errors.minNumber}
              required
            />
            {errors.minNumber && (
              <p className="text-sm font-medium" style={{ color: "var(--color-destructive)" }}>
                {errors.minNumber}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="maxNumber" className="block text-sm font-medium">
              Max
            </label>
            <input
              id="maxNumber"
              name="maxNumber"
              type="number"
              max={999}
              defaultValue={100}
              className={`neo-input ${errors.maxNumber ? "neo-input-error" : ""}`}
              aria-invalid={!!errors.maxNumber}
              required
            />
            {errors.maxNumber && (
              <p className="text-sm font-medium" style={{ color: "var(--color-destructive)" }}>
                {errors.maxNumber}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Duration */}
      <div className="space-y-1">
        <label htmlFor="duration" className="block font-bold text-sm">
          Duration <span aria-hidden="true">*</span>
        </label>
        <select
          id="duration"
          name="duration"
          defaultValue={60}
          className={`neo-input ${errors.duration ? "neo-input-error" : ""}`}
          aria-describedby="duration-hint"
          aria-invalid={!!errors.duration}
          style={{ appearance: "none", cursor: "pointer" }}
          required
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p id="duration-hint" className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
          ⏰ The room will close and drawing will begin after this duration.
          You can also trigger the draw manually at any time.
        </p>
        {errors.duration && (
          <p className="text-sm font-medium" style={{ color: "var(--color-destructive)" }}>
            {errors.duration}
          </p>
        )}
      </div>

      {/* Total winners */}
      <div className="space-y-1">
        <label htmlFor="totalWinners" className="block font-bold text-sm">
          Number of Winners <span aria-hidden="true">*</span>
        </label>
        <input
          id="totalWinners"
          name="totalWinners"
          type="number"
          defaultValue={1}
          className={`neo-input ${errors.totalWinners ? "neo-input-error" : ""}`}
          aria-describedby="winners-hint"
          aria-invalid={!!errors.totalWinners}
          required
        />
        <p id="winners-hint" className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
          Maximum 50 winners. Cannot exceed the total numbers in range.
        </p>
        {errors.totalWinners && (
          <p className="text-sm font-medium" style={{ color: "var(--color-destructive)" }}>
            {errors.totalWinners}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        id="create-room-submit"
        disabled={isSubmitting}
        className="neo-btn neo-btn-primary neo-btn-full neo-btn-lg"
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span
              className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            Creating…
          </>
        ) : (
          "🎁 Create Room"
        )}
      </button>
    </form>
  );
}
