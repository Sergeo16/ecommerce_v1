import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || role !== 'AFFILIATE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const amount = typeof body.amount === 'number' ? body.amount : parseFloat(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || wallet.frozen) {
    return NextResponse.json({ error: 'Wallet indisponible' }, { status: 403 });
  }
  const balance = Number(wallet.balance);
  if (amount > balance) {
    return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });
  }

  const req = await prisma.withdrawalRequest.create({
    data: {
      userId,
      amount,
      currency: 'XOF',
      status: 'PENDING',
      method: body.method ?? 'mobile_money',
      details: body.details ?? null,
    },
  });

  return NextResponse.json({
    id: req.id,
    amount: req.amount,
    status: req.status,
    message: 'Demande enregistrée. Traitement sous 24-48h.',
  });
}
