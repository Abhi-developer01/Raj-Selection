// ============================================================
// Auth Service — JWT session management
// Designed for future Google OAuth swap with minimal changes.
// ============================================================
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'rs_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface SessionPayload extends JWTPayload {
  userId: string;
  username: string;
  role: 'owner' | 'viewer';
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET is not set or is too short (minimum 32 characters).');
  }
  return new TextEncoder().encode(secret);
}

// ── Token ops ────────────────────────────────────────────────

export async function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// ── Cookie ops ───────────────────────────────────────────────

export async function createSession(userId: string, username: string): Promise<void> {
  const token = await signSession({ userId, username, role: 'owner' });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ── Credential verification ───────────────────────────────────

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  console.log('verifyCredentials called:', {
    providedUsername: username,
    expectedUsername,
    hasExpectedPassword: !!expectedPassword,
  });

  if (!expectedUsername || !expectedPassword) {
    throw new Error('Admin credentials are not configured in environment variables.');
  }

  if (username !== expectedUsername) {
    console.log('Username mismatch');
    return false;
  }

  const isValid = password === expectedPassword;
  console.log('Password comparison result:', isValid);
  return isValid;
}

// ── Route protection helper ───────────────────────────────────

/**
 * Call this at the start of any API route handler to enforce authentication.
 * Returns the session if valid, or throws a 401 Response.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}
