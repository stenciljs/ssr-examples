import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import type { Route } from './+types/root';
import stylesheet from './app.css?url';

// A <link>, not an inline <style>: React hydrates the first plain <style> it finds in <head>,
// and Stencil adds its own there (server and client).
export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: stylesheet }];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // Stencil adds `data-stencil-build` and `class="hydrated"` to <html>
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>React Router · Stencil SSR</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
