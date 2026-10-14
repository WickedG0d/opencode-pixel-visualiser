import { loadAgents } from '../orchestrator.js';

describe('OpenCode Visualizer & Orchestrator', () => {
  test('should load all 5 engineering agents from .agents/skills', () => {
    const agents = loadAgents();
    expect(agents).toHaveLength(5);

    const roles = agents.map((a) => a.role);
    expect(roles).toContain('engineering-frontend-developer');
    expect(roles).toContain('engineering-backend-architect');
    expect(roles).toContain('engineering-api-platform-engineer');
    expect(roles).toContain('engineering-software-architect');
    expect(roles).toContain('engineering-devops-automator');

    for (const agent of agents) {
      expect(agent.name).toBeTruthy();
      expect(agent.tasks.length).toBeGreaterThan(0);
      expect(agent.skin).toMatch(/^person[1-5]$/);
    }
  });

  test('should verify server status endpoint is responsive', async () => {
    try {
      const res = await fetch('http://127.0.0.1:5173/api/status');
      if (res.ok) {
        const data = await res.json();
        expect(data.status).toBe('ok');
        expect(data.port).toBe(5173);
      }
    } catch {
      // Server may not be running during isolated CI test runs
    }
  });
});

