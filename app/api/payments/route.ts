import { requireAuth } from '@/services/authService';
import { getAllPayments, createPayment, getPaymentsByWholesaler } from '@/repositories/paymentRepository';
import { NextRequest } from 'next/server';
import { rupeesToPaise } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const wholesalerId = req.nextUrl.searchParams.get('wholesalerId');

    const payments = wholesalerId
      ? await getPaymentsByWholesaler(wholesalerId)
      : await getAllPayments();

    return Response.json({ success: true, data: payments });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to fetch payments.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    if (!body.wholesalerId) return Response.json({ success: false, error: 'Wholesaler is required.' }, { status: 400 });
    if (!body.amount || Number(body.amount) <= 0) return Response.json({ success: false, error: 'Amount must be > 0.' }, { status: 400 });
    if (!body.paymentMethod) return Response.json({ success: false, error: 'Payment method is required.' }, { status: 400 });

    const payment = await createPayment({
      wholesalerId: body.wholesalerId,
      paymentDate: body.paymentDate || undefined,
      amount: rupeesToPaise(Number(body.amount)),
      paymentMethod: body.paymentMethod,
      transactionRef: body.transactionRef?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      allocations: body.allocations?.map((a: { purchaseId: string; amount: number }) => ({
        purchaseId: a.purchaseId,
        amount: rupeesToPaise(Number(a.amount)),
      })),
    });

    return Response.json({ success: true, data: payment }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ success: false, error: 'Failed to create payment.' }, { status: 500 });
  }
}
