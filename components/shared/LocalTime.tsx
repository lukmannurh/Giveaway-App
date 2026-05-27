"use client";

import { useState, useEffect } from "react";
import { formatTimestamp, formatDeadline, relativeTime } from "@/lib/utils/date";

interface LocalTimeProps {
  iso: string;
  format?: "timestamp" | "deadline" | "relative";
  className?: string;
}

/**
 * Client component to safely render local timezones without SSR hydration mismatch.
 */
export function LocalTime({ iso, format = "timestamp", className }: LocalTimeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={className}>--</span>;
  }

  let text = "";
  if (format === "timestamp") text = formatTimestamp(iso);
  else if (format === "deadline") text = formatDeadline(iso);
  else if (format === "relative") text = relativeTime(iso);

  return <span className={className}>{text}</span>;
}
