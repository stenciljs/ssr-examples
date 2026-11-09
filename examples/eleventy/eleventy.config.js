import { renderToString } from '@ssr-examples/components/ssr';
import { ssrProp } from '@ssr-examples/components/ssr-prop';
import { stats, tasks } from '@ssr-examples/demo-data';

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData('tasks', tasks);
  eleventyConfig.addGlobalData('stats', stats);

  // `{{ tasks | ssrProp }}`: hands the array to the server render below
  eleventyConfig.addFilter('ssrProp', ssrProp);

  // Server-render the components in every page Eleventy writes
  eleventyConfig.addTransform('stencil-ssr', async function (content) {
    if (!this.page.outputPath?.endsWith('.html')) return content;
    const { html, diagnostics } = await renderToString(content, { reuseWindow: true });
    for (const d of diagnostics) console.warn('[stencil]', d.messageText);
    return html ?? content;
  });

  // The components' browser build, loaded with a <script> tag
  eleventyConfig.addPassthroughCopy({
    'node_modules/@ssr-examples/components/dist/loader-bundle/demo-components': 'demo-components',
  });
  eleventyConfig.addPassthroughCopy('src/client.js');

  return { dir: { input: 'src' } };
}
