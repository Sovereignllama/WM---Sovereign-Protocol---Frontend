import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/contexts/WalletProvider';
import { QueryProvider } from '@/contexts/QueryProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { config } from '@/lib/config';

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
    <html lang="en" className="md:h-full md:overflow-hidden overflow-x-hidden">
      <body className="text-white min-h-screen md:h-full flex flex-col md:overflow-hidden overflow-x-hidden max-w-[100vw]" style={{ background: 'var(--dark-green-bg)' }}>
        <QueryProvider>
          <WalletProvider>
            <Navbar />
            <main className="flex-1 md:min-h-0 md:overflow-hidden overflow-x-hidden">{children}</main>
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
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
