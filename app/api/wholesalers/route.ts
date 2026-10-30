import { requireAuth } from '@/services/authService';
import { getAllWholesalers, createWholesaler, searchWholesalers } from '@/repositories/wholesalerRepository';
import { NextRequest } from 'next/server';
import { isValidMobile, isValidGSTIN, rupeesToPaise } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const q = req.nextUrl.searchParams.get('q');
    const wholesalers = q ? await searchWholesalers(q) : await getAllWholesalers();
    return Response.json({ success: true, data: wholesalers });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/wholesalers]', err);
    return Response.json({ success: false, error: 'Failed to fetch wholesalers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    // Validation
    if (!body.name?.trim()) {
      return Response.json({ success: false, error: 'Wholesaler name is required.' }, { status: 400 });
    }
    if (!body.mobile?.trim() || !isValidMobile(body.mobile)) {
      return Response.json({ success: false, error: 'A valid 10-digit mobile number is required.' }, { status: 400 });
    }
    if (body.gstin && !isValidGSTIN(body.gstin)) {
      return Response.json({ success: false, error: 'Invalid GSTIN format.' }, { status: 400 });
    }

    const wholesaler = await createWholesaler({
      name: body.name.trim(),
      contactPerson: body.contactPerson?.trim() ?? '',
      mobile: body.mobile.trim(),
      address: body.address?.trim() ?? '',
      gstin: body.gstin?.trim() || undefined,
      openingBalance: rupeesToPaise(Number(body.openingBalance ?? 0)),
      notes: body.notes?.trim() || undefined,
    });

    return Response.json({ success: true, data: wholesaler }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/wholesalers]', err);
    return Response.json({ success: false, error: 'Failed to create wholesaler.' }, { status: 500 });
  }
}
