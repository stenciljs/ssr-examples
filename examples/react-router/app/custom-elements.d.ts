// JSX types for the Stencil components, from the library's own component types
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { Components } from '@ssr-examples/components/components';

type El<T> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { [K in keyof T]?: T[K] | string };

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'demo-notice': El<Components.DemoNotice>;
      'demo-card': El<Components.DemoCard>;
      'demo-badge': El<Components.DemoBadge>;
      'demo-counter': El<Components.DemoCounter>;
      'demo-task-list': El<Components.DemoTaskList>;
      'demo-stats': El<Components.DemoStats>;
    }
  }
}
