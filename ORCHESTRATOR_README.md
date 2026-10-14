# OpenCode Visualizer Plugin Orchestrator

This orchestrator helps you use OpenCode's specialized agents to analyze and fix the OpenCode Visualizer plugin for compatibility with the latest OpenCode versions.

## Overview

The orchestrator identifies relevant agents from `.opencode/agents/` that can help improve different aspects of the plugin:
- Frontend visualization performance and accessibility
- Backend server architecture and efficiency  
- Plugin API usage and correctness
- Overall project architecture and structure
- Deployment and DevOps practices

## How to Use

### Manual Agent Invocation

Since the orchestrator outputs instructions for manual agent invocation, follow these steps:

1. **Read the orchestrator output** - Run `node orchestrator.js` to see what each agent should review
2. **Invoke each agent** - Use OpenCode's subagent functionality to invoke the recommended agents
3. **Collect recommendations** - Each agent will provide specific feedback and fixes
4. **Apply fixes** - Implement the agents' recommendations
5. **Test and iterate** - Verify the plugin works correctly

### Example Agent Invocation

In OpenCode, you would invoke an agent like this:

```
/agent engineering-frontend-developer
Please review the frontend visualization code in the OpenCode Visualizer plugin:
- visualizer/index.html
- visualizer/person*/
- visualizer/textures/

Focus on:
- Performance optimization (Core Web Vitals)
- Accessibility (WCAG compliance)
- Modern web technologies usage
- Bundle size optimization
- Responsive design

Provide specific recommendations for fixing any OpenCode compatibility issues
and improving the plugin according to current best practices.
```

### Parallel Execution

To save time, you can invoke multiple agents in parallel by opening multiple chat sessions or using OpenCode's background task functionality.

## Agents Used

The orchestrator recommends invoking these specific agents:

1. **engineering-frontend-developer** - For reviewing `visualizer/index.html`, person assets, and textures
2. **engineering-backend-architect** - For reviewing `visualizer/ocv-server.ts`
3. **engineering-api-platform-engineer** - For reviewing `index.ts` and `tui.ts`
4. **engineering-software-architect** - For reviewing overall project structure and documentation
5. **engineering-devops-automator** - For reviewing packaging, deployment, and DevOps practices

## Expected Outcomes

After following the orchestrator's guidance and applying agents' recommendations, you should have:

1. A plugin that's fully compatible with the latest OpenCode version
2. Improved performance and accessibility in the visualization
3. Better server-side architecture and efficiency
4. Correct plugin API usage following OpenCode conventions
5. Improved project structure and documentation
6. Better deployment and update processes

## Customization

You can customize the orchestrator by:
- Modifying the `agentsToInvoke` array in `orchestrator.js`
- Adding or removing focus areas for each agent
- Including additional files to review
- Adjusting the agent selection based on specific issues you've identified

## Notes

- This orchestrator assumes you have access to OpenCode's subagent functionality
- The actual agent invocation must be done through OpenCode's interface
- Agents may require specific context about your OpenCode version and environment
- Always backup your work before applying significant changes based on agent recommendations