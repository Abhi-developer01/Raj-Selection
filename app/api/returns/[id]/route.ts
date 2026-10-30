import { requireAuth } from '@/services/authService';
import { getReturnById, updateReturn, deleteReturn } from '@/repositories/returnRepository';
import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/returns/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const ret = await getReturnById(id);
    if (!ret || ret.isDeleted) {
      return Response.json({ success: false, error: 'Return not found.' }, { status: 404 });
    }
    return Response.json({ success: true, data: ret });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to fetch return.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/returns/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();

    const allowed = ['status', 'settlementMethod', 'notes', 'returnDate'] as const;
    const updates: Parameters<typeof updateReturn>[1] = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updates as any)[key] = body[key];
      }
    }

    const updated = await updateReturn(id, updates);
    return Response.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : 'Failed to update return.';
    return Response.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/returns/[id]'>,
) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    await deleteReturn(id);
    return Response.json({ success: true, message: 'Return deleted.' });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to delete return.' }, { status: 500 });
  }
}
