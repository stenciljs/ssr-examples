'use client';

import { useState } from 'react';
import { extraStat, stats as initialStats, tasks } from '@ssr-examples/demo-data';
// `/next` is the wrappers' server version: on the server each one renders its Stencil
// component with the SSR module; in the browser it's the normal client wrapper.
import { DemoBadge, DemoCard, DemoCounter, DemoNotice, DemoStats, DemoTaskList } from '@ssr-examples/components-react/next';

export function Demo({ framework }: { framework: string }) {
  const [badge] = useState('SSR');
  const [stats, setStats] = useState(initialStats);
  const [lastCount, setLastCount] = useState<number | null>(null);

  return (
    <main>
      <h1>{`${framework} + Stencil SSR`}</h1>
      <DemoNotice kind="info">{`Rendered by ${framework}.`}</DemoNotice>
      <DemoCard heading="Server-rendered card" variant="highlight">
        <span slot="icon">★</span>
        <p>This card was rendered on the server as Declarative Shadow DOM.</p>
        <DemoBadge tone="success">{badge}</DemoBadge>
        <span slot="footer">Footer slot</span>
      </DemoCard>
      <DemoCounter start={5} step={2} onCountChanged={(e) => setLastCount(e.detail)} />
      <p id="last-count">{`Last count: ${lastCount ?? 'none'}`}</p>
      {/* complex props need nothing extra: the wrappers set them as properties on the server
          too, and Stencil sends them to the client with the HTML */}
      <DemoTaskList tasks={tasks} />
      <DemoStats stats={stats} />
      <button id="add-stat" type="button" onClick={() => setStats((s) => [...s, extraStat])}>
        Add stat
      </button>
    </main>
  );
}
