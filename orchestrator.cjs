/**
 * Antigravity IDE & OpenCode Visualizer Orchestrator (CommonJS)
 */

(async () => {
  const { orchestrate, agents } = await import('./orchestrator.js');
  if (require.main === module) {
    orchestrate().catch(console.error);
  }
  module.exports = { orchestrate, agents };
})();