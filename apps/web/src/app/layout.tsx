import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Centro de Gestión - Atención al Cliente IA',
  description: 'Plataforma de atención al cliente potenciada con IA',
  manifest: undefined, // Evitar manifest.json que puede solicitar permisos
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#ffffff" />
        {/* Prevenir solicitud de permisos de red local */}
        <meta httpEquiv="Permissions-Policy" content="local-network=()" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
