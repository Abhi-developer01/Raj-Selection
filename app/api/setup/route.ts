import { requireAuth } from '@/services/authService';
import { ensureSheetsSetup, hasExistingData } from '@/services/googleSheetsService';
import { seedDemoData } from '@/lib/seedData';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    await requireAuth();
    const result = await ensureSheetsSetup();
    return Response.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Response) return err;
    const error = err instanceof Error ? err.message : String(err);
    return Response.json({ success: false, error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    // Run setup first
    const setupResult = await ensureSheetsSetup();
    if (!setupResult.connected) {
      return Response.json(
        { success: false, error: setupResult.error ?? 'Google Sheets not connected.' },
        { status: 503 },
      );
    }

    // Check for existing data
    if (!force && await hasExistingData()) {
      return Response.json({
        success: false,
        error: 'Data already exists. Send { "force": true } to re-seed (this will add duplicate demo data).',
      }, { status: 409 });
    }

    await seedDemoData();
    return Response.json({ success: true, message: 'Demo data seeded successfully.' });
  } catch (err) {
    if (err instanceof Response) return err;
    const error = err instanceof Error ? err.message : String(err);
    return Response.json({ success: false, error }, { status: 500 });
  }
}
