import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { MaintenanceGate } from '@/components/MaintenanceGate';
import { AdminMaintenanceBanner } from '@/components/AdminMaintenanceBanner';

export const metadata: Metadata = {
  title: 'Africa Marketplace — E-commerce & Livraison',
  description: 'Marketplace SaaS + Affiliation + Livraison pour l\'Afrique (Bénin)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-base-100 text-base-content overflow-x-hidden w-full max-w-full">
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <MaintenanceGate>
                <AdminMaintenanceBanner />
                {children}
              </MaintenanceGate>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
