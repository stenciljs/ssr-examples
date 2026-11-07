import type { Handle } from '@sveltejs/kit/hooks';
import { renderToString } from '@ssr-examples/components/ssr';
import { ssrPropsOptions } from '@ssr-examples/ssr-props/server';

// `resolve()` returns the page as a Response whose body SvelteKit may stream. renderToString()
// needs the whole document, so read the body to the end, render, and send a new Response.
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	if (!response.headers.get('content-type')?.includes('text/html')) {
		return response;
	}
	const { html, diagnostics } = await renderToString(await response.text(), {
		reuseWindow: true,
		...ssrPropsOptions()
	});
	for (const d of diagnostics) console.warn('[stencil]', d.messageText);
	const headers = new Headers(response.headers);
	headers.delete('content-length');
	return new Response(html, { status: response.status, statusText: response.statusText, headers });
};
