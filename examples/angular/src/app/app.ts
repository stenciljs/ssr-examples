import { Component, CUSTOM_ELEMENTS_SCHEMA, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { extraStat, stats as initialStats, tasks } from '@ssr-examples/demo-data';
import { ssrProp } from '@ssr-examples/components/ssr-prop';

@Component({
  selector: 'app-root',
  // `demo-*` are custom elements, not Angular components
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
      <demo-counter start="5" step="2" (countChanged)="lastCount.set($event.detail)"></demo-counter>
      <p id="last-count">Last count: {{ lastCount() ?? 'none' }}</p>
      <demo-task-list [attr.tasks]="ssrAttr(tasks)" [tasks]="tasks"></demo-task-list>
      <demo-stats [attr.stats]="ssrAttr(stats())" [stats]="stats()"></demo-stats>
      <button id="add-stat" type="button" (click)="addStat()">Add stat</button>
    </main>
  `,
})
export class App {
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  protected readonly framework = signal('Angular');
  protected readonly badge = signal('SSR');
  protected readonly lastCount = signal<number | null>(null);
  protected readonly tasks = tasks;
  protected readonly stats = signal(initialStats);

  // Angular's server DOM keeps `[prop]` bindings as properties, which never reach the HTML. So on
  // the server, also write the ssrProp() token as an attribute; on the client, `null` leaves it off.
  protected ssrAttr(value: unknown) {
    return this.isServer ? ssrProp(value) : null;
  }

  protected addStat() {
    this.stats.update((s) => [...s, extraStat]);
  }
}
