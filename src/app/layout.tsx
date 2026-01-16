import { Providers } from './provider';
import './globals.css';
import ServerAwakeGuard from '@/components/ServerAwakeGuard';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
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