import { createSignal } from 'solid-js';
import { extraStat, stats as initialStats, tasks } from '@ssr-examples/demo-data';
import { ssrProp } from '@ssr-examples/ssr-props';

export default function Home() {
  const [framework] = createSignal('SolidStart');
  const [badge] = createSignal('SSR');
  const [stats, setStats] = createSignal(initialStats);
  const [lastCount, setLastCount] = createSignal<number | null>(null);

  return (
    <main>
      <h1>SolidStart + Stencil SSR</h1>
      <demo-notice kind="info">Rendered by {framework()}.</demo-notice>
      <demo-card heading="Server-rendered card" variant="highlight">
        <span slot="icon">★</span>
        <p>This card was rendered on the server as Declarative Shadow DOM.</p>
        <demo-badge tone="success">{badge()}</demo-badge>
        <span slot="footer">Footer slot</span>
      </demo-card>
      <demo-counter start="5" step="2" on:countChanged={(e) => setLastCount(e.detail)} />
      {/* one expression: mixed static text would get `<!--$-->` markers around the dynamic part */}
      <p id="last-count">{`Last count: ${lastCount() ?? 'none'}`}</p>
      <demo-task-list tasks={ssrProp(tasks)} />
      <demo-stats stats={ssrProp(stats())} />
      <button id="add-stat" type="button" onClick={() => setStats([...stats(), extraStat])}>
        Add stat
      </button>
    </main>
  );
}
