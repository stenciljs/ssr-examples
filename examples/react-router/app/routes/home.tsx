import { useCallback, useState } from 'react';
import { extraStat, stats as initialStats, tasks } from '@ssr-examples/demo-data';
import { ssrProp } from '@ssr-examples/components/ssr-prop';

export default function Home() {
  const framework = 'React Router';
  const [badge, setBadge] = useState('SSR');
  const [stats, setStats] = useState(initialStats);
  const [lastCount, setLastCount] = useState<number | null>(null);

  // React doesn't attach `on*` listeners to custom elements it hydrates (only to ones it
  // creates or updates), so `oncountChanged={...}` would miss the server-rendered counter.
  // Listen from a ref instead.
  const counterRef = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const onCountChanged = (e: Event) => setLastCount((e as CustomEvent<number>).detail);
    el.addEventListener('countChanged', onCountChanged);
    return () => el.removeEventListener('countChanged', onCountChanged);
  }, []);

  // `suppressHydrationWarning` on each Stencil host: the server render adds attributes React
  // didn't render (`s-id`, `class`, `role`), which React's dev build reports as a mismatch.
  return (
    <main>
      <h1>React Router + Stencil SSR</h1>
      <demo-notice suppressHydrationWarning kind="info">Rendered by {framework}.</demo-notice>
      <demo-card suppressHydrationWarning heading="Server-rendered card" variant="highlight">
        <span slot="icon">★</span>
        <p>This card was rendered on the server as Declarative Shadow DOM.</p>
        <demo-badge suppressHydrationWarning tone="success">{badge}</demo-badge>
        <span slot="footer">Footer slot</span>
      </demo-card>
      <demo-counter suppressHydrationWarning start={5} step={2} ref={counterRef} />
      {/* one string, so React doesn't split it into two text nodes with a <!-- --> between */}
      <p id="last-count">{`Last count: ${lastCount ?? 'none'}`}</p>
      <demo-task-list suppressHydrationWarning tasks={ssrProp(tasks)} />
      <demo-stats suppressHydrationWarning stats={ssrProp(stats)} />
      <button id="add-stat" type="button" onClick={() => setStats((s) => [...s, extraStat])}>
        Add stat
      </button>
      <button id="update-badge" type="button" onClick={() => setBadge('Updated')}>
        Update badge
      </button>
    </main>
  );
}
