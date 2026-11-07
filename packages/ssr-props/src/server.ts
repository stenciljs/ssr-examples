import { TOKEN_PREFIX } from './shared.js';

/** The `renderToString()` options this module adds. */
export interface SsrPropsRenderOptions {
  beforeSsr: (doc: Document) => void | Promise<void>;
}

const toPropName = (attrName: string) => attrName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Turn each `ssrProp()` token attribute back into the property it stands for, before Stencil
 * renders. Use as (or call from) `renderToString()`'s `beforeSsr`.
 * @param doc the document being rendered
 */
export function resolveSsrProps(doc: Document): void {
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    if (!el.tagName.includes('-')) continue;
    for (const attr of Array.from(el.attributes)) {
      if (!attr.value.startsWith(TOKEN_PREFIX)) continue;
      el.removeAttribute(attr.name);
      (el as unknown as Record<string, unknown>)[toPropName(attr.name)] = JSON.parse(
        attr.value.slice(TOKEN_PREFIX.length),
      );
    }
  }
}

/**
 * `renderToString()` options that resolve `ssrProp()` tokens. Spread into your own options:
 *
 * ```ts
 * const { html } = await renderToString(page, { ...ssrPropsOptions() });
 * ```
 *
 * Stencil then sends the resolved values to the client with the HTML (its `transferProps`
 * render option, on by default), so the components hydrate with them too.
 * @param chain your own `beforeSsr`, run after the tokens are resolved
 * @returns options to pass to `renderToString()`
 */
export function ssrPropsOptions(chain: Partial<SsrPropsRenderOptions> = {}): SsrPropsRenderOptions {
  return {
    async beforeSsr(doc) {
      resolveSsrProps(doc);
      await chain.beforeSsr?.(doc);
    },
  };
}
