<script lang="ts">
	import { extraStat, stats as initialStats, tasks } from '@ssr-examples/demo-data';
	import { ssrProp } from '@ssr-examples/components/ssr-prop';

	let framework = $state('SvelteKit');
	let badge = $state('SSR');
	let stats = $state.raw(initialStats);
	let lastCount = $state<number | null>(null);
	const addStat = () => (stats = [...stats, extraStat]);
</script>

<svelte:head>
	<title>SvelteKit · Stencil SSR</title>
</svelte:head>

<main>
	<h1>SvelteKit + Stencil SSR</h1>
	<demo-notice kind="info">Rendered by {framework}.</demo-notice>
	<demo-card heading="Server-rendered card" variant="highlight">
		<span slot="icon">★</span>
		<p>This card was rendered on the server as Declarative Shadow DOM.</p>
		<demo-badge tone="success">{badge}</demo-badge>
		<span slot="footer">Footer slot</span>
	</demo-card>
	<demo-counter start={5} step={2} oncountChanged={(e: CustomEvent<number>) => (lastCount = e.detail)}
	></demo-counter>
	<p id="last-count">Last count: {lastCount ?? 'none'}</p>
	<demo-task-list tasks={ssrProp(tasks)}></demo-task-list>
	<demo-stats stats={ssrProp(stats)}></demo-stats>
	<button id="add-stat" type="button" onclick={addStat}>Add stat</button>
</main>
