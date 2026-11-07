// @refresh reload
import { createHandler, StartServer } from '@solidjs/start/server';

export default createHandler(
  () => (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>SolidStart · Stencil SSR</title>
            <link rel="icon" href="/favicon.ico" />
            <style>{`
              body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; }
              main > * { margin-bottom: 1.5rem; }
              .demo-notice { display: block; padding: .75rem 1rem; border-radius: 6px; background: #eef2ff; }
            `}</style>
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  ),
  // Wait for the whole page instead of streaming it: renderToString() needs the complete document.
  { mode: 'async' },
);
