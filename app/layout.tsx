import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: {
    default: 'Raj Selection — Cloth Showroom Ledger',
    template: '%s | Raj Selection',
  },
  description:
    'Professional wholesale purchase ledger and financial management system for Raj Selection cloth showroom.',
  keywords: ['cloth showroom', 'ledger', 'wholesale', 'purchase management', 'inventory'],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
