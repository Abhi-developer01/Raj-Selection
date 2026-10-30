import { requireAuth } from '@/services/authService';
import { getDashboardStats } from '@/services/ledgerService';

export async function GET() {
  try {
    await requireAuth();
    const stats = await getDashboardStats();
    return Response.json({ success: true, data: stats });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/dashboard]', err);
    return Response.json({ success: false, error: 'Failed to load dashboard.' }, { status: 500 });
  }
}
