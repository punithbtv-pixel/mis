// Simple shared-password auth. The cookie stores a SHA-256 token derived from
// the password; we never store the password itself in the cookie.
// Uses Web Crypto so the same code works in Node and in edge middleware.

import { isUiOnlyMode } from "@/lib/mode";

export const AUTH_COOKIE = "ph_auth";

function getPassword() {
  return process.env.APP_PASSWORD || "powerhouse";
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// The token a valid session cookie must contain.
export async function expectedToken() {
  return sha256Hex(`${getPassword()}::powerhouse-mis::v1`);
}

export function passwordMatches(input) {
  if (isUiOnlyMode()) return true;
  return typeof input === "string" && input === getPassword();
}

export async function tokenIsValid(token) {
  if (isUiOnlyMode()) return true;
  if (!token) return false;
  return token === (await expectedToken());
}
