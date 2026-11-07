import type { ClientInit } from '@sveltejs/kit/hooks';
import { defineCustomElements } from '@ssr-examples/components/loader';

// SvelteKit awaits `init` before it hydrates the page. `defineCustomElements()` is async, so
// await it: the components must be defined before Svelte hydrates.
export const init: ClientInit = async () => {
	await defineCustomElements();
};
