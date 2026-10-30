import { requireAuth } from '@/services/authService';
import { getWholesalerWiseSummary } from '@/services/ledgerService';
import { getAllPurchases } from '@/repositories/purchaseRepository';
import { getAllReturns } from '@/repositories/returnRepository';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const type = req.nextUrl.searchParams.get('type') ?? 'wholesaler_summary';
    const from = req.nextUrl.searchParams.get('from') ?? undefined;
    const to = req.nextUrl.searchParams.get('to') ?? undefined;
    const wholesalerId = req.nextUrl.searchParams.get('wholesalerId') ?? undefined;

    switch (type) {
      case 'wholesaler_summary': {
        const data = await getWholesalerWiseSummary({ from, to, wholesalerId });
        return Response.json({ success: true, data });
      }

      case 'purchases': {
        let data = await getAllPurchases();
        if (from) data = data.filter((p) => p.purchaseDate >= from);
        if (to) data = data.filter((p) => p.purchaseDate <= to);
        if (wholesalerId) data = data.filter((p) => p.wholesalerId === wholesalerId);
        return Response.json({ success: true, data });
      }

      case 'returns': {
        let data = await getAllReturns();
        if (from) data = data.filter((r) => r.returnDate >= from);
        if (to) data = data.filter((r) => r.returnDate <= to);
        if (wholesalerId) data = data.filter((r) => r.wholesalerId === wholesalerId);
        return Response.json({ success: true, data });
      }

      case 'pending_returns': {
        let data = await getAllReturns();
        data = data.filter((r) => r.status === 'pending_approval');
        return Response.json({ success: true, data });
      }

      case 'defective_returns': {
        let data = await getAllReturns();
        data = data.filter((r) =>
          r.reason === 'defective_damaged' || r.reason === 'incorrect_item',
        );
        if (from) data = data.filter((r) => r.returnDate >= from);
        if (to) data = data.filter((r) => r.returnDate <= to);
        return Response.json({ success: true, data });
      }

      default:
        return Response.json({ success: false, error: `Unknown report type: ${type}` }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to generate report.' }, { status: 500 });
  }
}
