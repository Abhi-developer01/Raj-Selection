import { requireAuth } from '@/services/authService';
import { getAllPurchases, createPurchase, getPurchasesByWholesaler } from '@/repositories/purchaseRepository';
import { NextRequest } from 'next/server';
import { rupeesToPaise } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const wholesalerId = req.nextUrl.searchParams.get('wholesalerId');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    const status = req.nextUrl.searchParams.get('status');

    let purchases = wholesalerId
      ? await getPurchasesByWholesaler(wholesalerId)
      : await getAllPurchases();

    if (from) purchases = purchases.filter((p) => p.purchaseDate >= from);
    if (to) purchases = purchases.filter((p) => p.purchaseDate <= to);
    if (status) purchases = purchases.filter((p) => p.paymentStatus === status);

    return Response.json({ success: true, data: purchases });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/purchases]', err);
    return Response.json({ success: false, error: 'Failed to fetch purchases.' }, { status: 500 });
  }
}

// export async function POST(req: NextRequest) {
//   try {
//     await requireAuth();
//     const body = await req.json();

//     if (!body.wholesalerId) {
//       return Response.json({ success: false, error: 'Wholesaler is required.' }, { status: 400 });
//     }
//     if (!body.purchaseDate) {
//       return Response.json({ success: false, error: 'Purchase date is required.' }, { status: 400 });
//     }
//     if (!Array.isArray(body.items) || body.items.length === 0) {
//       return Response.json({ success: false, error: 'At least one item is required.' }, { status: 400 });
//     }

//     // Validate items
//     for (const item of body.items) {
//       if (!item.description?.trim()) {
//         return Response.json({ success: false, error: 'Each item must have a description.' }, { status: 400 });
//       }
//       if (!item.quantity || item.quantity < 1) {
//         return Response.json({ success: false, error: 'Each item must have a quantity ≥ 1.' }, { status: 400 });
//       }
//       if (!item.unitPrice || item.unitPrice < 0) {
//         return Response.json({ success: false, error: 'Each item must have a valid unit price.' }, { status: 400 });
//       }
//     }

//     // All prices from client arrive in rupees — convert to paise
//     const items = body.items.map((item: {
//       category: string;
//       description: string;
//       quantity: number;
//       unitPrice: number;
//     }) => ({
//       category: item.category || 'Other',
//       description: item.description.trim(),
//       quantity: Number(item.quantity),
//       unitPrice: rupeesToPaise(Number(item.unitPrice)),
//     }));

//     const additionalCharges = rupeesToPaise(Number(body.additionalCharges ?? 0));
//     const discount = rupeesToPaise(Number(body.discount ?? 0));
//     const gstAmount = rupeesToPaise(Number(body.gstAmount ?? 0));
//     const itemsTotal = items.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0);
//     const invoiceTotal = itemsTotal + additionalCharges + gstAmount - discount;
//     const amountPaid = rupeesToPaise(Number(body.amountPaid ?? 0));

//     const purchase = await createPurchase({
//       invoiceNumber: body.invoiceNumber?.trim() || undefined,
//       wholesalerId: body.wholesalerId,
//       purchaseDate: body.purchaseDate,
//       items,
//       additionalCharges,
//       discount,
//       gstAmount,
//       invoiceTotal,
//       amountPaid,
//       paymentMethod: body.paymentMethod ?? 'cash',
//       notes: body.notes?.trim() || undefined,
//     });

//     return Response.json({ success: true, data: purchase }, { status: 201 });
//   } catch (err) {
//     if (err instanceof Response) return err;
//     console.error('[POST /api/purchases]', err);
//     return Response.json({ success: false, error: 'Failed to create purchase.' }, { status: 500 });
//   }
// }



export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    if (!body.wholesalerId) {
      return Response.json(
        { success: false, error: 'Wholesaler is required.' },
        { status: 400 }
      );
    }

    if (!body.purchaseDate) {
      return Response.json(
        { success: false, error: 'Purchase date is required.' },
        { status: 400 }
      );
    }

    // Items are optional
    const items = Array.isArray(body.items)
      ? body.items.map((item: {
          category?: string;
          description?: string;
          quantity?: number;
          unitPrice?: number;
        }) => ({
          category: item.category || 'Other',
          description: item.description?.trim() || '',
          quantity: Number(item.quantity) || 0,
          unitPrice: rupeesToPaise(Number(item.unitPrice) || 0),
        }))
      : [];

    const additionalCharges = rupeesToPaise(
      Number(body.additionalCharges ?? 0)
    );

    const discount = rupeesToPaise(
      Number(body.discount ?? 0)
    );

    const gstAmount = rupeesToPaise(
      Number(body.gstAmount ?? 0)
    );

    // Calculate total without requiring items
    const itemsTotal = items.reduce(
      (s: number, i: { quantity: number; unitPrice: number }) =>
        s + i.quantity * i.unitPrice,
      0
    );

    const invoiceTotal =
      itemsTotal + additionalCharges + gstAmount - discount;

    const amountPaid = rupeesToPaise(
      Number(body.amountPaid ?? 0)
    );

    const purchase = await createPurchase({
      invoiceNumber: body.invoiceNumber?.trim() || undefined,
      wholesalerId: body.wholesalerId,
      purchaseDate: body.purchaseDate,
      items,
      additionalCharges,
      discount,
      gstAmount,
      invoiceTotal,
      amountPaid,
      paymentMethod: body.paymentMethod ?? 'cash',
      notes: body.notes?.trim() || undefined,
    });

    return Response.json(
      { success: true, data: purchase },
      { status: 201 }
    );

  } catch (err) {
    if (err instanceof Response) return err;

    console.error('[POST /api/purchases]', err);

    return Response.json(
      { success: false, error: 'Failed to create purchase.' },
      { status: 500 }
    );
  }
}
