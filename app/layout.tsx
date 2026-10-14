import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Goblins 3 Web — Play the DOS demo',
  description:
    'Play the real Goblins Quest 3 DOS demo in a mobile browser with ScummVM WebAssembly and touch controls.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Goblins 3',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: 'Goblins 3 Web — Play the DOS demo',
    description:
      'The real 1993 DOS demo, running in your browser with touch controls.',
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1672,
        height: 940,
        alt: 'Goblins 3 Web — the real DOS demo playable in your browser',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Goblins 3 Web — Play the DOS demo',
    description:
      'The real 1993 DOS demo, running in your browser with touch controls.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
