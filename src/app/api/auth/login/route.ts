import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  const input = (await request.json()) as { email?: string; password?: string };
  if (!input.email || !input.password)
    return NextResponse.json({ message: 'Enter your email and password.' }, { status: 400 });
  if (input.email !== 'admin@biohabit.app')
    return NextResponse.json(
      { message: 'This account is not authorised for admin access.' },
      { status: 403 },
    );
  const user = { id: 'admin-1', email: input.email, accessLevel: 'admin' as const };
  const response = NextResponse.json({ user });
  response.cookies.set('biohabit_session', btoa(JSON.stringify(user)), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
