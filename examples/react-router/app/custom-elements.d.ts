// JSX types for the Stencil components, used as plain custom elements.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type El<P = {}> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & P;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'demo-notice': El<{ kind?: 'info' | 'error' }>;
      'demo-card': El<{ heading?: string; variant?: string }>;
      'demo-badge': El<{ tone?: 'neutral' | 'success' | 'warning' }>;
      'demo-counter': El<{ start?: number | string; step?: number | string }>;
      'demo-task-list': El<{ tasks?: string }>;
      'demo-stats': El<{ stats?: { label: string; value: number }[] }>;
    }
  }
}
