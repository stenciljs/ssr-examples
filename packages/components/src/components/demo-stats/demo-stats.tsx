import { Component, Prop, h } from '@stencil/core';

export interface DemoStat {
  label: string;
  value: number;
}

/**
 * A complex (array of objects) prop with **no** attribute fallback: it can only be set as a
 * property. Used to show how each framework gets complex data into a component on the server.
 */
@Component({
  tag: 'demo-stats',
  styleUrl: 'demo-stats.css',
  encapsulation: { type: 'shadow' },
})
export class DemoStats {
  /** The bars to draw. Property only. */
  @Prop() stats: DemoStat[] = [];

  render() {
    const stats = this.stats ?? [];
    const max = Math.max(1, ...stats.map((s) => s.value));
    return (
      <figure>
        {stats.length === 0 ? (
          <p class="empty" part="empty">
            No stats
          </p>
        ) : (
          <ul>
            {stats.map((s) => (
              <li>
                <span class="label">{s.label}</span>
                <span class="bar" style={{ width: `${(s.value / max) * 100}%` }} />
                <span class="value">{s.value}</span>
              </li>
            ))}
          </ul>
        )}
      </figure>
    );
  }
}
