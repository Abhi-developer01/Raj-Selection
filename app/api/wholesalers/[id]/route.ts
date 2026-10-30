import { requireAuth } from '@/services/authService';
import { getWholesalerById, updateWholesaler, archiveWholesaler } from '@/repositories/wholesalerRepository';
import { getWholesalerSummary, buildWholesalerLedger } from '@/services/ledgerService';
import { NextRequest } from 'next/server';
import { isValidMobile, isValidGSTIN, rupeesToPaise } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/wholesalers/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const include = req.nextUrl.searchParams.get('include');

    if (include === 'summary') {
      const summary = await getWholesalerSummary(id);
      return Response.json({ success: true, data: summary });
    }

    if (include === 'ledger') {
      const from = req.nextUrl.searchParams.get('from') ?? undefined;
      const to = req.nextUrl.searchParams.get('to') ?? undefined;
      const ledger = await buildWholesalerLedger(id, from, to);
      return Response.json({ success: true, data: ledger });
    }

    const wholesaler = await getWholesalerById(id);
    if (!wholesaler) {
      return Response.json({ success: false, error: 'Wholesaler not found.' }, { status: 404 });
    }
    return Response.json({ success: true, data: wholesaler });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/wholesalers/[id]]', err);
    return Response.json({ success: false, error: 'Failed to fetch wholesaler.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/wholesalers/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();

    if (body.mobile && !isValidMobile(body.mobile)) {
      return Response.json({ success: false, error: 'Invalid mobile number.' }, { status: 400 });
    }
    if (body.gstin && !isValidGSTIN(body.gstin)) {
      return Response.json({ success: false, error: 'Invalid GSTIN format.' }, { status: 400 });
    }

    const updates: Parameters<typeof updateWholesaler>[1] = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.contactPerson !== undefined) updates.contactPerson = body.contactPerson.trim();
    if (body.mobile !== undefined) updates.mobile = body.mobile.trim();
    if (body.address !== undefined) updates.address = body.address.trim();
    if (body.gstin !== undefined) updates.gstin = body.gstin.trim() || undefined;
    if (body.openingBalance !== undefined) updates.openingBalance = rupeesToPaise(Number(body.openingBalance));
    if (body.notes !== undefined) updates.notes = body.notes.trim() || undefined;
    if (body.status !== undefined) updates.status = body.status;

    const updated = await updateWholesaler(id, updates);
    return Response.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/wholesalers/[id]]', err);
    return Response.json({ success: false, error: 'Failed to update wholesaler.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/wholesalers/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    await archiveWholesaler(id);
    return Response.json({ success: true, message: 'Wholesaler archived successfully.' });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/wholesalers/[id]]', err);
    return Response.json({ success: false, error: 'Failed to archive wholesaler.' }, { status: 500 });
  }
}
