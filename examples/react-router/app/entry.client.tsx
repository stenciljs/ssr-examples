import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import { defineCustomElements } from '@ssr-examples/components/loader';

// Before React hydrates: define the components, so Stencil's light DOM patches are in place when
// React walks the server-rendered DOM. defineCustomElements() is async, so wait for it.
defineCustomElements().then(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
});
