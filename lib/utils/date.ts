/**
 * Date and time utilities for the Community Giveaway Platform.
 * Safe to use in both server and client contexts.
 */

import type { TimeLeft } from "@/lib/types";

/**
 * Calculates the time remaining until a deadline.
 *
 * @param deadline - ISO 8601 UTC timestamp string
 * @returns TimeLeft object with days, hours, minutes, seconds, total ms, and isExpired flag
 *
 * @example
 * const { days, hours, minutes, seconds, isExpired } = calculateTimeLeft("2025-12-31T23:59:59Z");
 */
export function calculateTimeLeft(deadline: string): TimeLeft {
  const total = new Date(deadline).getTime() - Date.now();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total, isExpired: false };
}

/**
 * Formats a countdown to a compact display string.
 *
 * @example
 * formatCountdown({ days: 1, hours: 2, minutes: 30, seconds: 5 }) → "1d 02:30:05"
 * formatCountdown({ days: 0, hours: 0, minutes: 4, seconds: 22 }) → "04:22"
 */
export function formatCountdown(timeLeft: TimeLeft): string {
  if (timeLeft.isExpired) return "Expired";

  const pad = (n: number) => String(n).padStart(2, "0");

  if (timeLeft.days > 0) {
    return `${timeLeft.days}d ${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  }

  if (timeLeft.hours > 0) {
    return `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  }

  return `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
}

/**
 * Formats an ISO 8601 timestamp to a human-readable local date/time string.
 *
 * @example
 * formatTimestamp("2025-06-15T14:30:00Z") → "Jun 15, 2025 at 2:30 PM"
 */
export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

/**
 * Formats a deadline for display in room cards.
 *
 * @example
 * formatDeadline("2025-06-15T14:30:00Z") → "Jun 15, 2025 · 2:30 PM"
 */
export function formatDeadline(iso: string): string {
  const date = new Date(iso);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Jakarta",
  });
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
}

/**
 * Returns true if `deadline + offsetMinutes` has passed.
 * Used by the force-draw endpoint to check the 5-minute grace period.
 */
export function isDeadlinePassed(
  deadline: string,
  offsetMinutes = 0
): boolean {
  return Date.now() >= new Date(deadline).getTime() + offsetMinutes * 60 * 1000;
}

/**
 * Returns a relative time string ("2 hours ago", "in 3 days").
 * Falls back to a formatted date for anything > 7 days away.
 */
export function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const past = diff < 0;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  let label: string;

  if (abs < minute) {
    label = "just now";
    return label;
  } else if (abs < hour) {
    const mins = Math.round(abs / minute);
    label = `${mins} minute${mins !== 1 ? "s" : ""}`;
  } else if (abs < day) {
    const hrs = Math.round(abs / hour);
    label = `${hrs} hour${hrs !== 1 ? "s" : ""}`;
  } else if (abs < 7 * day) {
    const days = Math.round(abs / day);
    label = `${days} day${days !== 1 ? "s" : ""}`;
  } else {
    return formatDeadline(iso);
  }

  return past ? `${label} ago` : `in ${label}`;
}
