import { NextResponse } from 'next/server';
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('biohabit_session', 'firebase-authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
