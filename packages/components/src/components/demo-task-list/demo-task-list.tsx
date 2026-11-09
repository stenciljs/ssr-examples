import { Component, Prop, h } from '@stencil/core';

export interface DemoTask {
  title: string;
  done?: boolean;
}

/**
 * Shadow DOM, a complex (array) prop, and nested Stencil components (`demo-badge`).
 */
@Component({
  tag: 'demo-task-list',
  styleUrl: 'demo-task-list.css',
  encapsulation: { type: 'shadow' },
})
export class DemoTaskList {
  /** The tasks. `serialize` carries them from the server render to the browser, as JSON. */
  @Prop({ serialize: 'json' }) tasks: DemoTask[] = [];

  render() {
    const tasks = this.tasks ?? [];
    const remaining = tasks.filter((t) => !t.done).length;
    return (
      <section>
        <p class="summary">
          {remaining} of {tasks.length} remaining
        </p>
        <ul>
          {tasks.map((task) => (
            <li class={{ done: !!task.done }}>
              <span class="title">{task.title}</span>
              <demo-badge tone={task.done ? 'success' : 'warning'}>{task.done ? 'done' : 'todo'}</demo-badge>
            </li>
          ))}
        </ul>
      </section>
    );
  }
}
