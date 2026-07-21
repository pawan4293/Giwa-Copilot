import { Client } from "@upstash/qstash";

// QStash client for scheduling recurring Scheduler.release() calls
// Token comes from QSTASH_TOKEN env var
export function getQStashClient(): Client {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is not set");
  }
  return new Client({ token });
}

// Build the full webhook URL for the trigger endpoint
export function getTriggerUrl(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  return `${appUrl}/api/schedule/trigger`;
}

// Convert a user-friendly interval label to seconds
export const INTERVAL_OPTIONS = [
  { label: "Every minute",  seconds: 60 },
  { label: "Every hour",    seconds: 3600 },
  { label: "Daily",         seconds: 86400 },
  { label: "Weekly",        seconds: 604800 },
  { label: "Monthly",       seconds: 2592000 },
] as const;
