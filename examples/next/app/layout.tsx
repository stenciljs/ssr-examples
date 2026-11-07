import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Next.js · Stencil SSR' };

const css = `body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; }
main > * { margin-bottom: 1.5rem; }
.demo-notice { display: block; padding: .75rem 1rem; border-radius: 6px; background: #eef2ff; }`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{css}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
