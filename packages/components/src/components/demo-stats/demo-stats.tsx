import { Component, Prop, h } from '@stencil/core';

export interface DemoStat {
  label: string;
  value: number;
}

/**
 * A complex (array of objects) prop, set by the framework and updated by it later.
 */
@Component({
  tag: 'demo-stats',
  styleUrl: 'demo-stats.css',
  encapsulation: { type: 'shadow' },
})
export class DemoStats {
  /** The bars to draw. `serialize` carries them from the server render to the browser, as JSON. */
  @Prop({ serialize: 'json' }) stats: DemoStat[] = [];

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
