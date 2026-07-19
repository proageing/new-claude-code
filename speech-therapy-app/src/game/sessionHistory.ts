import type { SessionRecord } from "./types";

// localStorage placeholder for the real per-patient session store. Fine for
// a single-device MVP; swap for a backend once accounts/clinician view land.
const STORAGE_KEY = "speech-therapy-session-history";

export function loadSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(record: SessionRecord): void {
  const sessions = loadSessions();
  sessions.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
