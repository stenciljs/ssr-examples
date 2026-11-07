// Types for the Stencil components in Solid's JSX
import type { Components, DemoCounterCustomEvent } from '@ssr-examples/components/components';
import type { JSX } from 'solid-js';

type Props<T> = JSX.HTMLAttributes<HTMLElement> & { [K in keyof T]?: T[K] | string };

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'demo-notice': Props<Components.DemoNotice>;
      'demo-card': Props<Components.DemoCard>;
      'demo-badge': Props<Components.DemoBadge>;
      'demo-counter': Props<Components.DemoCounter> & {
        'on:countChanged'?: (event: DemoCounterCustomEvent<number>) => void;
      };
      'demo-task-list': Props<Components.DemoTaskList> & { 'attr:tasks'?: string };
      'demo-stats': Props<Components.DemoStats>;
    }
  }
}
