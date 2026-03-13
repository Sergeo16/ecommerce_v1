import { NextResponse } from 'next/server';
import { getTheme } from '@/lib/rules-engine';

/**
 * Thème global configuré par le Super Admin.
 * Utilisé comme thème par défaut pour les utilisateurs qui n'ont pas encore choisi de thème.
 */
export async function GET() {
  const theme = await getTheme();
  return NextResponse.json({ theme });
}

