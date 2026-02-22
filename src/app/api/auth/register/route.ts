import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, signAccessToken, signRefreshToken } from '@/lib/auth';
import type { Role } from '@prisma/client';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  role: z.enum(['CLIENT', 'AFFILIATE', 'SUPPLIER', 'COURIER']).default('CLIENT'),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, firstName, lastName, phone, role } = parsed.data;
  const emailLower = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: emailLower,
      passwordHash,
      firstName,
      lastName,
      phone: phone ?? null,
      role: role as Role,
    },
  });

  if (role === 'SUPPLIER') {
    const slug = `company-${user.id.slice(-8)}`;
    await prisma.companyProfile.create({
      data: {
        userId: user.id,
        companyName: `${firstName} ${lastName}`,
        slug,
        country: 'BJ',
      },
    });
  }
  if (role === 'COURIER') {
    await prisma.courierProfile.create({
      data: { userId: user.id, vehicleType: 'moto' },
    });
  }
  if (role === 'AFFILIATE' || role === 'COURIER') {
    await prisma.wallet.create({
      data: { userId: user.id, balance: 0, currency: 'XOF' },
    });
  }

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = await signRefreshToken(user.id);

  return NextResponse.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
}
