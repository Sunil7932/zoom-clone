/**
 * Lightweight client-side identity & preferences.
 *
 * The brief assumes a default logged-in user (no real auth), so "identity" here
 * is just a display name + join preferences kept in localStorage. This powers
 * the Settings panel, the profile menu, and a simple sign-out / sign-in loop.
 */

const NAME_KEY = "zoom.displayName";
const SIGNED_OUT_KEY = "zoom.signedOut";
const MIC_PREF_KEY = "zoom.pref.mic";
const CAM_PREF_KEY = "zoom.pref.cam";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked */
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage blocked */
  }
}

export function getDisplayName(): string {
  return safeGet(NAME_KEY) || "";
}

export function setDisplayName(name: string): void {
  safeSet(NAME_KEY, name.trim());
}

export function isSignedOut(): boolean {
  return safeGet(SIGNED_OUT_KEY) === "1";
}

export function signOut(): void {
  safeSet(SIGNED_OUT_KEY, "1");
  safeRemove(NAME_KEY);
}

export function signIn(name: string): void {
  setDisplayName(name);
  safeRemove(SIGNED_OUT_KEY);
}

export interface JoinPrefs {
  mic: boolean;
  cam: boolean;
}

export function getJoinPrefs(): JoinPrefs {
  return {
    mic: safeGet(MIC_PREF_KEY) !== "off", // default on
    cam: safeGet(CAM_PREF_KEY) !== "off", // default on
  };
}

export function setJoinPrefs(prefs: JoinPrefs): void {
  safeSet(MIC_PREF_KEY, prefs.mic ? "on" : "off");
  safeSet(CAM_PREF_KEY, prefs.cam ? "on" : "off");
}
