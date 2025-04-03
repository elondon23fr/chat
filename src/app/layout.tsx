import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import SocketInitializer from '@/components/chat/SocketInitializer';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <title>Application de Chat</title>
        <meta name="description" content="Application de chat simple et conviviale" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <SocketInitializer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
