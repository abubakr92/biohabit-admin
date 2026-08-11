import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export async function GET() {
  const value = (await cookies()).get('biohabit_session')?.value;
  if (!value) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  try {
    return NextResponse.json({ user: JSON.parse(atob(value)) });
  } catch {
    return NextResponse.json({ message: 'Invalid session' }, { status: 401 });
  }
}
