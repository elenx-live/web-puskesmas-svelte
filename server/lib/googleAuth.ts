// Verifikasi Google ID Token via google-auth-library (pola PeSat).
// Menggantikan firebase-admin: tanpa Firebase sama sekali.

import { OAuth2Client } from "google-auth-library";

/** Hasil verifikasi ID token Google yang valid. */
interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

/** GOOGLE_CLIENT_ID dari env. Kosong = auth Google nonaktif (fail-closed dengan pesan jelas). */
function getGoogleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID || "").trim();
}

let _oauthClient: OAuth2Client | null = null;
let _oauthClientDisabled = false;

function getOAuthClient(): OAuth2Client | null {
  if (_oauthClient) return _oauthClient;
  if (_oauthClientDisabled) return null;
  const clientId = getGoogleClientId();
  if (!clientId) {
    _oauthClientDisabled = true;
    console.warn("[auth] GOOGLE_CLIENT_ID kosong — login Google nonaktif.");
    return null;
  }
  _oauthClient = new OAuth2Client(clientId);
  return _oauthClient;
}

/**
 * Verifikasi ID token dari Google Identity Services.
 * Cek: signature (JWKS Google), iss, aud, exp, email_verified.
 * Throw Error bila tidak valid.
 */
async function verifyGoogleCredential(credential: string): Promise<GoogleUserInfo> {
  const client = getOAuthClient();
  if (!client) {
    throw new Error("GOOGLE_CLIENT_ID belum diset di server.");
  }
  const clientId = getGoogleClientId();
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  const p = ticket.getPayload();
  if (!p) throw new Error("payload token kosong");
  const iss = String(p.iss || "");
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
    throw new Error("iss tidak dikenal");
  }
  if (String(p.aud || "") !== clientId) throw new Error("aud tidak cocok");
  if (typeof p.exp !== "number" || p.exp * 1000 <= Date.now()) throw new Error("token kedaluwarsa");
  if (p.email_verified !== true) throw new Error("email belum diverifikasi");
  const email = String(p.email || "").trim().toLowerCase();
  if (!email) throw new Error("email tidak ada di token");
  return {
    email,
    name: String(p.name || "").trim() || email.split("@")[0],
    picture: String(p.picture || ""),
    sub: String(p.sub || ""),
  };
}

export { getGoogleClientId, verifyGoogleCredential };
export type { GoogleUserInfo };
