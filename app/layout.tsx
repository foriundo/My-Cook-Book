import './globals.css';
import { Nav } from '@/components/nav';
import { Providers } from '@/components/providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Cook Book',
  description: 'A personal cookbook for recipes, scaling, and sharing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <Nav />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
