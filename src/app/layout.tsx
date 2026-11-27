import type { Metadata } from 'next';
import './globals.css';
import { AppStateProvider } from '@/context/AppStateContext';
import Navbar from '@/components/Navbar';
import AiChatDrawer from '@/components/AiChatDrawer';

export const metadata: Metadata = {
  title: 'YatraBus — Bus Ticket Booking & Admin Portal',
  description:
    'Search intercity buses, pick seats on interactive seat maps, manage bookings, and administer fleet operations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AppStateProvider>
          <Navbar />
          <main>{children}</main>
          <AiChatDrawer />
        </AppStateProvider>
      </body>
    </html>
  );
}
