# The component library

The Stencil library every example uses. Its [`stencil.config.ts`](stencil.config.ts) is all a
library needs for server rendering in frameworks:

| Output target | Gives consumers |
|---|---|
| `loader-bundle` | `./loader`: `defineCustomElements()`, for the browser |
| `standalone` | one module per component, which the React, Vue and Angular wrappers import |
| `ssr` | `./ssr`: `renderToString()`, and `./ssr-prop`: `ssrProp()` for templates |
| React output target | the React wrappers, with server versions for Next.js |
| Vue output target | the Vue wrappers, which write their props into the server HTML (`ssrPropModule`) |
| Angular output target | the Angular wrappers, which write their inputs into the server HTML (`ssrPropModule`) |
| types output target | `./react-native-types`, `./vue-native-types`, `./svelte-native-types`, `./solid-native-types`, `./astro-native-types`: template types for the plain elements |

`generateExportMaps: true` writes the Stencil entries into `package.json`. The types entries are
written by hand, and the frameworks are optional `peerDependencies`, so the types can resolve
them.

## The components

Each one covers a case the frameworks have to handle:

| Tag | Encapsulation | Covers |
|---|---|---|
| `demo-card` | shadow | named and default slots, `::part`, a reflected prop |
| `demo-counter` | shadow | state, and an event the page listens to |
| `demo-badge` | scoped | slotted text from the framework, inside light and shadow DOM |
| `demo-notice` | none | light DOM styled by the page, slotted text next to its own |
| `demo-task-list` | shadow | an array prop, nested components |
| `demo-stats` | shadow | an array prop the page updates |

`demo-task-list` and `demo-stats` declare their array props with `@Prop({ serialize: 'json' })`,
so the value set during server rendering is still there when they first render in the browser.
