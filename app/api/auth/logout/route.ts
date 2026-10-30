import { destroySession } from '@/services/authService';

export async function POST() {
  await destroySession();
  return Response.json({ success: true, message: 'Logged out.' });
}
