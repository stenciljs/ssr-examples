import { TOKEN_PREFIX } from './shared.js';

export { TOKEN_PREFIX } from './shared.js';

const isServer = typeof window === 'undefined';

/**
 * Pass a complex value (object, array) to a Stencil component's property from a framework
 * template, so it also reaches the component when it's server-rendered.
 *
 * ```vue
 * <demo-stats :stats="ssrProp(stats)" />
 * ```
 *
 * - On the client it returns `value` unchanged: the framework sets the property as usual.
 * - On the server it returns a string token holding `value` as JSON. The framework renders it as
 *   an attribute, and `ssrPropsOptions()` (in your `renderToString()` call) turns it back into
 *   the property before Stencil renders the component. Stencil then sends the value to the
 *   client with the HTML, so the component hydrates with it.
 *
 * The value must survive `JSON.stringify()`. Bind it under the property's attribute name
 * (`chart-data` for a `chartData` prop): HTML lower-cases attribute names, so `chartData` can't be
 * told apart from `chartdata` on the server.
 * @param value the property value
 * @returns `value` on the client, a token string typed as `T` on the server
 */
export function ssrProp<T>(value: T): T {
  if (!isServer) {
    return value;
  }
  return (TOKEN_PREFIX + JSON.stringify(value)) as unknown as T;
}
