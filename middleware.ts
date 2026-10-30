import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/services/authService';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes: return JSON 401
  if (pathname.startsWith('/api/')) {
    const token = req.cookies.get('rs_session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Page routes: redirect to login
  const token = req.cookies.get('rs_session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  const session = await verifySession(token);
  if (!session) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('rs_session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
