import { getSession } from '@/services/authService';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ success: false, authenticated: false }, { status: 401 });
  }
  return Response.json({
    success: true,
    authenticated: true,
    user: { username: session.username, role: session.role },
  });
}
