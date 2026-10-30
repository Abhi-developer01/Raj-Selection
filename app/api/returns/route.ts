import { requireAuth } from '@/services/authService';
import { getAllReturns, createReturn, getReturnsByWholesaler, getReturnsByPurchase } from '@/repositories/returnRepository';
import { NextRequest } from 'next/server';
import { rupeesToPaise } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const wholesalerId = req.nextUrl.searchParams.get('wholesalerId');
    const purchaseId = req.nextUrl.searchParams.get('purchaseId');
    const status = req.nextUrl.searchParams.get('status');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');

    let returns = purchaseId
      ? await getReturnsByPurchase(purchaseId)
      : wholesalerId
      ? await getReturnsByWholesaler(wholesalerId)
      : await getAllReturns();

    if (status) returns = returns.filter((r) => r.status === status);
    if (from) returns = returns.filter((r) => r.returnDate >= from);
    if (to) returns = returns.filter((r) => r.returnDate <= to);

    return Response.json({ success: true, data: returns });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to fetch returns.' }, { status: 500 });
  }
}

// export async function POST(req: NextRequest) {
//   try {
//     await requireAuth();
//     const body = await req.json();

//     if (!body.purchaseId) return Response.json({ success: false, error: 'Purchase ID is required.' }, { status: 400 });
//     if (!body.wholesalerId) return Response.json({ success: false, error: 'Wholesaler ID is required.' }, { status: 400 });
//     if (!body.purchaseItemId) return Response.json({ success: false, error: 'Purchase item is required.' }, { status: 400 });
//     if (!body.quantity || body.quantity < 1) return Response.json({ success: false, error: 'Quantity must be ≥ 1.' }, { status: 400 });
//     if (!body.reason) return Response.json({ success: false, error: 'Return reason is required.' }, { status: 400 });

//     const quantity = Number(body.quantity);
//     const unitPrice = rupeesToPaise(Number(body.unitPrice ?? 0));
//     const returnAmount = rupeesToPaise(Number(body.returnAmount ?? 0)) || quantity * unitPrice;

//     const ret = await createReturn({
//       purchaseId: body.purchaseId,
//       wholesalerId: body.wholesalerId,
//       returnDate: body.returnDate || undefined,
//       purchaseItemId: body.purchaseItemId,
//       itemDescription: body.itemDescription?.trim() ?? '',
//       reason: body.reason,
//       quantity,
//       unitPrice,
//       returnAmount,
//       settlementMethod: body.settlementMethod ?? 'credit_adjustment',
//       notes: body.notes?.trim() || undefined,
//     });

//     return Response.json({ success: true, data: ret }, { status: 201 });
//   } catch (err) {
//     if (err instanceof Response) return err;
//     const msg = err instanceof Error ? err.message : 'Failed to create return.';
//     return Response.json({ success: false, error: msg }, { status: 400 });
//   }
// }


export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    if (!body.purchaseId) {
      return Response.json(
        { success: false, error: 'Purchase ID is required.' },
        { status: 400 }
      );
    }

    if (!body.wholesalerId) {
      return Response.json(
        { success: false, error: 'Wholesaler ID is required.' },
        { status: 400 }
      );
    }

    if (!body.reason) {
      return Response.json(
        { success: false, error: 'Return reason is required.' },
        { status: 400 }
      );
    }

    const returnAmountRupees = Number(body.returnAmount);

    if (!Number.isFinite(returnAmountRupees) || returnAmountRupees <= 0) {
      return Response.json(
        { success: false, error: 'Enter a valid return amount.' },
        { status: 400 }
      );
    }

    const quantity = Number(body.quantity) || 0;
    const unitPrice = rupeesToPaise(Number(body.unitPrice) || 0);
    const returnAmount = rupeesToPaise(returnAmountRupees);

    const ret = await createReturn({
      purchaseId: body.purchaseId,
      wholesalerId: body.wholesalerId,
      returnDate: body.returnDate || undefined,
      purchaseItemId: body.purchaseItemId || '',
      itemDescription: body.itemDescription?.trim() || '',
      reason: body.reason,
      quantity,
      unitPrice,
      returnAmount,
      settlementMethod: body.settlementMethod ?? 'credit_adjustment',
      notes: body.notes?.trim() || undefined,
      status: 'approved',
    });

    return Response.json({ success: true, data: ret }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;

    const msg = err instanceof Error ? err.message : 'Failed to create return.';
    return Response.json({ success: false, error: msg }, { status: 400 });
  }
}