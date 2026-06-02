import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`ALTER TABLE levantamientos_contenido ADD COLUMN IF NOT EXISTS "estadoLevantamiento" TEXT NOT NULL DEFAULT 'PENDIENTE'`;
    return NextResponse.json({ ok: true, message: 'Column estadoLevantamiento added' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
