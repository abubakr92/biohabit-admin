import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';
const geist = Geist({ subsets: ['latin'] });
export const metadata: Metadata = {
  title: { default: 'BIOHABIT Admin', template: '%s · BIOHABIT Admin' },
  description: 'BIOHABIT content operations',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} min-h-screen bg-[#f6f7f8] text-slate-900 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
