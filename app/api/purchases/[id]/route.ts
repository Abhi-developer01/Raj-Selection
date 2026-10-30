import { requireAuth } from '@/services/authService';
import { getPurchaseById, updatePurchase, deletePurchase } from '@/repositories/purchaseRepository';
import { NextRequest } from 'next/server';
import { rupeesToPaise } from '@/lib/utils';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/purchases/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const purchase = await getPurchaseById(id);
    if (!purchase || purchase.isDeleted) {
      return Response.json({ success: false, error: 'Purchase not found.' }, { status: 404 });
    }
    return Response.json({ success: true, data: purchase });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to fetch purchase.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/purchases/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();

    const updates: Parameters<typeof updatePurchase>[1] = {};
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.amountPaid !== undefined) updates.amountPaid = rupeesToPaise(Number(body.amountPaid));

    const updated = await updatePurchase(id, updates);
    return Response.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to update purchase.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/purchases/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    await deletePurchase(id);
    return Response.json({ success: true, message: 'Purchase deleted.' });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to delete purchase.' }, { status: 500 });
  }
}
