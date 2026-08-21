import { NextRequest, NextResponse } from 'next/server';
import { createLogoutAuditLog } from '@/utils/audit-middleware';
import { getServerSession } from 'next-auth'; // Or your session utility

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  
  if (session?.user?.id) {
    await createLogoutAuditLog(req, session.user.id);
  }
  
  return NextResponse.json({ success: true });
}