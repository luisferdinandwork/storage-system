import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProviderWrapper } from '@/components/providers/session-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Storage Management System',
  description: 'A system for managing temporary storage of items',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 overflow-hidden`}>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}