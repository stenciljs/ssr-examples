import { defineCustomElements } from '@ssr-examples/components/loader';
import { extraStat } from '@ssr-examples/demo-data';

// Astro doesn't hydrate its own templates, so this is the page's only client code.
defineCustomElements();

// The "framework" part of the page: plain DOM code
const stats = document.querySelector('demo-stats')!;
const lastCount = document.querySelector('#last-count')!;
document.querySelector('demo-counter')!.addEventListener('countChanged', (e) => {
  lastCount.textContent = `Last count: ${(e as CustomEvent<number>).detail}`;
});
document.querySelector('#add-stat')!.addEventListener('click', () => {
  stats.stats = [...(stats.stats ?? []), extraStat];
});
document.querySelector('#update-badge')!.addEventListener('click', () => {
  document.querySelector('demo-badge')!.textContent = 'Updated';
});
