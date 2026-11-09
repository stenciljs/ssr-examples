// The page's own behaviour. The components define themselves (the <script> before this one).
const stats = document.querySelector('demo-stats');

document.querySelector('demo-counter').addEventListener('countChanged', (e) => {
  document.querySelector('#last-count').textContent = `Last count: ${e.detail}`;
});

document.querySelector('#add-stat').addEventListener('click', () => {
  stats.stats = [...stats.stats, { label: 'Delta', value: 9 }];
});

document.querySelector('#update-badge').addEventListener('click', () => {
  document.querySelector('demo-badge').textContent = 'Updated';
});
