import { Component, signal } from '@angular/core';
import { extraStat, stats as initialStats, tasks } from '@ssr-examples/demo-data';
import { DemoBadge, DemoCard, DemoCounter, DemoNotice, DemoStats, DemoTaskList } from '@ssr-examples/components-angular';

@Component({
  selector: 'app-root',
  imports: [DemoBadge, DemoCard, DemoCounter, DemoNotice, DemoStats, DemoTaskList],
  template: `
    <main>
      <h1>Angular + Stencil SSR</h1>
      <demo-notice kind="info">Rendered by {{ framework() }}.</demo-notice>
      <demo-card heading="Server-rendered card" variant="highlight">
        <span slot="icon">★</span>
        <p>This card was rendered on the server as Declarative Shadow DOM.</p>
        <demo-badge tone="success">{{ badge() }}</demo-badge>
        <span slot="footer">Footer slot</span>
      </demo-card>
      <demo-counter [start]="5" [step]="2" (countChanged)="lastCount.set($event.detail)"></demo-counter>
      <p id="last-count">Last count: {{ lastCount() ?? 'none' }}</p>
      <demo-task-list [tasks]="tasks"></demo-task-list>
      <demo-stats [stats]="stats()"></demo-stats>
      <button id="add-stat" type="button" (click)="addStat()">Add stat</button>
      <button id="update-badge" type="button" (click)="badge.set('Updated')">Update badge</button>
    </main>
  `,
})
export class App {
  protected readonly framework = signal('Angular');
  protected readonly badge = signal('SSR');
  protected readonly lastCount = signal<number | null>(null);
  protected readonly tasks = tasks;
  protected readonly stats = signal(initialStats);

  protected addStat() {
    this.stats.update((s) => [...s, extraStat]);
  }
}
