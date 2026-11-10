<script setup lang="ts">
import { ref } from 'vue';
import { extraStat, stats as initialStats, tasks } from '@ssr-examples/demo-data';
import { DemoBadge, DemoCard, DemoCounter, DemoNotice, DemoStats, DemoTaskList } from '@ssr-examples/components-vue';

const framework = ref('Nuxt');
const badge = ref('SSR');
const stats = ref(initialStats);
const lastCount = ref<number | null>(null);
const addStat = () => (stats.value = [...stats.value, extraStat]);
</script>

<template>
  <main>
    <h1>Nuxt + Stencil SSR</h1>
    <DemoNotice kind="info">Rendered by {{ framework }}.</DemoNotice>
    <DemoCard heading="Server-rendered card" variant="highlight">
      <span slot="icon">★</span>
      <p>This card was rendered on the server as Declarative Shadow DOM.</p>
      <DemoBadge tone="success">{{ badge }}</DemoBadge>
      <span slot="footer">Footer slot</span>
    </DemoCard>
    <DemoCounter :start="5" :step="2" @countChanged="lastCount = $event.detail" />
    <p id="last-count">Last count: {{ lastCount ?? 'none' }}</p>
    <DemoTaskList :tasks="tasks" />
    <DemoStats :stats="stats" />
    <button id="add-stat" type="button" @click="addStat">Add stat</button>
    <button id="update-badge" type="button" @click="badge = 'Updated'">Update badge</button>
  </main>
</template>
