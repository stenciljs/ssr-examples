// @refresh reload
import { mount, StartClient } from '@solidjs/start/client';
import { defineCustomElements } from '@ssr-examples/components/loader';

// Before Solid hydrates: once the components are defined, Stencil's light DOM patches hide the
// nodes its server render added to `demo-notice` and `demo-badge`. It's async, so wait for it.
defineCustomElements().then(() => mount(() => <StartClient />, document.getElementById('app')!));
