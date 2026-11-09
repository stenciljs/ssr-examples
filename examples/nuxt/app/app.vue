<script setup lang="ts">
import { ref } from 'vue';
import { extraStat, stats as initialStats, tasks } from '@ssr-examples/demo-data';
import { ssrProp } from '@ssr-examples/components/ssr-prop';

const framework = ref('Nuxt');
const badge = ref('SSR');
const stats = ref(initialStats);
const lastCount = ref<number | null>(null);
const addStat = () => (stats.value = [...stats.value, extraStat]);
</script>

<template>
  <main>
    <h1>Nuxt + Stencil SSR</h1>
    <demo-notice kind="info">Rendered by {{ framework }}.</demo-notice>
    <demo-card heading="Server-rendered card" variant="highlight">
      <span slot="icon">★</span>
      <p>This card was rendered on the server as Declarative Shadow DOM.</p>
      <demo-badge tone="success">{{ badge }}</demo-badge>
      <span slot="footer">Footer slot</span>
    </demo-card>
    <demo-counter start="5" step="2" @countChanged="lastCount = $event.detail" />
    <p id="last-count">Last count: {{ lastCount ?? 'none' }}</p>
    <demo-task-list :tasks="ssrProp(tasks)" />
    <demo-stats :stats="ssrProp(stats)" />
    <button id="add-stat" type="button" @click="addStat">Add stat</button>
  </main>
</template>
