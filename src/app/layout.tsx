import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/contexts/WalletProvider';
import { QueryProvider } from '@/contexts/QueryProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { config } from '@/lib/config';
import { BetaDisclaimer } from '@/components/BetaDisclaimer';

export const metadata: Metadata = {
  title: config.appName,
  description: 'Launch tokens with recovery-first liquidity bootstrapping',
  openGraph: {
    title: 'Sovereign Protocol',
    description: 'Launch tokens with recovery-first liquidity bootstrapping',
    siteName: 'Sovereign Protocol',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sovereign Protocol',
    description: 'Launch tokens with recovery-first liquidity bootstrapping',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body className="text-white h-full flex flex-col overflow-hidden" style={{ background: 'var(--dark-green-bg)' }}>
        <QueryProvider>
          <WalletProvider>
            <Navbar />
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">{children}</main>
            <Footer />
            <ToastContainer
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
            <BetaDisclaimer />
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
