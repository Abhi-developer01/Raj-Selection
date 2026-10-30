import { verifyCredentials, createSession } from '@/services/authService';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body ?? {};

    console.log('Login attempt:', { username, passwordLength: password?.length });

    if (!username || !password) {
      return Response.json(
        { success: false, error: 'Username and password are required.' },
        { status: 400 },
      );
    }

    const valid = await verifyCredentials(username, password);
    console.log('Credentials valid:', valid);

    if (!valid) {
      return Response.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 401 },
      );
    }

    await createSession(username, username);
    return Response.json({ success: true, message: 'Logged in successfully.' });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return Response.json(
      { success: false, error: 'Authentication failed. Please try again.' },
      { status: 500 },
    );
  }
}
