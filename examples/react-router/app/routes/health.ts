// A resource route: no default export, so React Router returns the loader's Response as-is.
export const loader = () => new Response('ok', { headers: { 'content-type': 'text/plain' } });
