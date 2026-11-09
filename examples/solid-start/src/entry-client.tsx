// @refresh reload
import { mount, StartClient } from '@solidjs/start/client';
import { defineCustomElements } from '@ssr-examples/components/loader';

// Define the components before Solid hydrates. It's async, so mount once it resolves.
defineCustomElements().then(() => mount(() => <StartClient />, document.getElementById('app')!));
