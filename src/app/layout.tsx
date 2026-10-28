import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google';
import { Providers } from './provider';
import './globals.css';
import ServerAwakeGuard from '@/components/ServerAwakeGuard';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display-face',
  display: 'swap',
});

const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Payments',
  description: '10,000건의 결제 내역을 한 번에 스크롤하는 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable}`}>
      <body>
        <Providers>
          <ServerAwakeGuard>
            {children}
          </ServerAwakeGuard>
        </Providers>
      </body>
    </html>
  );
}
