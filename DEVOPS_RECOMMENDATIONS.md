# OpenCode Visualizer Plugin - DevOps Recommendations

This document provides recommendations for improving the OpenCode Visualizer plugin from a DevOps perspective, focusing on plugin packaging, distribution, installation, update processes, configuration management, build and release procedures, and environment compatibility.

## 1. Plugin Packaging and Distribution

### Current State
- The plugin is distributed as source TypeScript files (`index.ts`, `tui.ts`) via npm.
- The `main` field in `package.json` points to `index.ts`, requiring consumers to have TypeScript transpilation capabilities (e.g., Bun, TSX, or ts-node) to run the plugin.
- The plugin includes a Bun-specific server component (`visualizer/ocv-server.ts`) that uses Bun APIs (`Bun.serve`, `Bun.file`, `Bun.spawn`).

### Issues
- **Compatibility**: OpenCode may not provide a TypeScript transpiler or Bun runtime by default, leading to installation and runtime failures.
- **Deployment Complexity**: Consumers must set up a TypeScript build process or install Bun to use the plugin, increasing the barrier to entry.
- **Bundle Size**: Distributing source files includes unnecessary development artifacts (e.g., TypeScript config, type definitions) in the production package.

### Recommendations
1. **Compile to JavaScript**: Add a build step that compiles TypeScript to clean, standard-compliant JavaScript (ES2020 or Node.js-compatible) and distribute the compiled output.
   - Update `package.json` to point `main` and `exports` to the compiled JavaScript files (e.g., `./dist/index.js`).
   - Include only the compiled JavaScript and necessary assets in the `files` array.
   - Example `package.json` updates:
     ```json
     {
       "main": "./dist/index.js",
       "exports": {
         "./server": "./dist/visualizer/ocv-server.js",
         "./tui": "./dist/tui.js"
       },
       "files": [
         "dist/",
         "visualizer/"
       ],
       "scripts": {
         "build": "tsc",
         "prepare": "npm run build"
       }
     }
     ```
2. **Replace Bun Server with Node.js Compatible Implementation**: Rewrite the WebSocket server (`ocv-server.ts`) to use standard Node.js APIs:
   - Use `node:http` and `node:https` for the HTTP server.
   - Use the `ws` library (https://www.npmjs.com/package/ws) for WebSocket handling.
   - Replace `Bun.spawn` with cross-platform spawning (e.g., `cross-spawn` npm package) or node:child_process.
   - This ensures the plugin runs in any standard Node.js environment (≥14) without Bun.
3. **Asset Optimization**: Ensure visualizer assets (images) are optimized and included in the distribution.
   - Consider converting PNG images to WebP format to reduce bundle size.
   - Include optimized assets in the `visualizer/` directory and reference them correctly in the compiled code.

## 2. Installation and Update Processes

### Current State
- Installation via `npm install psinetron-opencode-visualizer` installs TypeScript source files.
- The plugin has a peer-like dependency on `@opencode-ai/plugin` (listed as a regular dependency with `>=1.16.0`).
- No installation scripts or post-install steps are defined.

### Issues
- **Dependency Range**: The version range `>=1.16.0` for `@opencode-ai/plugin` is too broad and may allow breaking changes.
- **Missing Lockfile Consistency**: While `package-lock.json` exists, ensuring consistent updates requires careful version management.
- **Post-Install Setup**: No automated setup for configuration or asset validation.

### Recommendations
1. **Use Semantic Versioning for Dependencies**: Change the dependency on `@opencode-ai/plugin` to a more specific range (e.g., `^1.16.0` or `~1.16.0`) to prevent unexpected major version updates.
2. **Add Installation Validation**: Include a post-install script that checks for required dependencies and environment compatibility.
   - Example:
     ```json
     "scripts": {
       "postinstall": "node ./scripts/check-env.js"
     }
     ```
3. **Document Installation Requirements**: Clearly state in `README.md` the required Node.js version and any optional dependencies (e.g., for browser launching).
4. **Automate Updates**: Use tools like `npm-check-updates` or Dependabot to keep dependencies updated, but test thoroughly before releasing.

## 3. Configuration Management

### Current State
- Plugin configuration (skin selection) is stored in `.opencode/viz-skin.json` within the project directory.
- Server port is hardcoded to `5173` in multiple places (`index.ts`, `ocv-server.ts`, `tui.ts`).
- No mechanism to override configuration via environment variables or command-line arguments.

### Issues
- **Port Conflicts**: Hardcoded port may cause conflicts when multiple instances of the plugin run on the same machine.
- **Configuration Flexibility**: Users cannot easily change server port or other settings without modifying code or files.

### Recommendations
1. **Make Server Port Configurable**: Allow the server port to be set via an environment variable (e.g., `OCV_SERVER_PORT`) with a fallback to `5173`.
   - Update `index.ts`, `ocv-server.ts`, and `tui.ts` to read from `process.env.OCV_SERVER_PORT`.
2. **Centralize Configuration Constants**: Create a configuration module (e.g., `src/config.ts`) that reads environment variables and provides default values.
3. **Support Runtime Configuration**: Allow users to change skin or other settings via OpenCode's configuration system if available, rather than only via file.
4. **Document Configuration Options**: Clearly document all environment variables and configuration files in `README.md`.

## 4. Build and Release Procedures

### Current State
- No build scripts are defined in `package.json`.
- Release process appears manual (version updated in `package.json` and published to npm).
- No automated testing, linting, or validation in the release pipeline.

### Issues
- **Manual Process**: Increases risk of human error during releases.
- **No Quality Gates**: No automated checks to ensure code quality or compatibility before publishing.
- **Versioning**: Relies on manual version bumps; consider adopting automated versioning based on commits (e.g., conventional commits).

### Recommendations
1. **Implement a Build Pipeline**: Add scripts for linting, testing, building, and validating the package.
   - Example `package.json` additions:
     ```json
     {
       "scripts": {
         "lint": "eslint . --ext .ts",
         "test": "jest",
         "build": "tsc",
         "prepare": "npm run build",
         "prepublishOnly": "npm run test && npm run lint",
         "version": "standard-version && git push --follow-tags origin main",
         "release": "npm version patch && npm publish"
       },
       "devDependencies": {
         "@typescript-eslint/eslint-plugin": "^6.0.0",
         "@typescript-eslint/parser": "^6.0.0",
         "eslint": "^8.0.0",
         "jest": "^29.0.0",
         "standard-version": "^9.0.0",
         "ts-jest": "^29.0.0",
         "@types/jest": "^29.0.0"
       }
     }
     ```
2. **Automate Releases**: Use CI/CD pipelines (e.g., GitHub Actions) to automate building, testing, and publishing to npm when a new version tag is pushed.
3. **Adopt Semantic Release**: Consider using `semantic-release` to automate versioning and changelog generation based on commit messages.
4. **Publish Source Maps**: If distributing compiled JavaScript, publish source maps to aid in debugging.
5. **Validate Package Contents**: Use `npm pack` to inspect the contents of the package before publishing to ensure only necessary files are included.

## 5. Environment Compatibility

### Current State
- The plugin assumes a Bun runtime for the server component.
- Uses modern JavaScript features (ES modules, top-level await) that may require specific Node.js versions.
- The visualizer canvas has a fixed size (640x480) and may not adapt to different screen resolutions or DPI settings.

### Issues
- **Bun Dependency**: As noted, this is a critical compatibility issue for OpenCode environments that may not include Bun.
- **Node.js Version**: The project uses TypeScript 7.0.2 (which is very new; likely a typo, should be 5.x or 6.x) and targets modern JavaScript, potentially excluding older Node.js versions.
- **Fixed Canvas Size**: The visualization may not be usable on small screens or high-DPI displays without manual zoom.

### Recommendations
1. **Remove Bun Dependency**: As recommended in section 1, replace the Bun server with a Node.js/WS implementation.
2. **Define Clear Node.js Version Requirement**: Specify the minimum Node.js version in `package.json` under `engines`:
   ```json
   "engines": {
     "node": ">=18.0.0"
   }
   ```
   Adjust based on the actual compatibility of the compiled code.
3. **Make Visualizer Responsive**: Implement the responsive canvas container recommendations from the existing `visualizer/RECOMMENDATIONS.md`:
   - Wrap the canvas in a container that scales with the viewport while maintaining aspect ratio.
   - Adjust the internal resolution based on container size and `devicePixelRatio`.
4. **Test Across Environments**: Use services like GitHub Actions to test the plugin on multiple Node.js versions (e.g., 16, 18, 20) and operating systems (Windows, macOS, Linux).
5. **Provide Fallbacks for Browser Launching**: The server attempts to launch a browser using OS-specific commands. Consider:
   - Making browser launching optional (via environment variable).
   - Providing a more robust cross-platform solution (e.g., `open` package) or documenting that users must open the URL manually.

## 6. Additional DevOps Best Practices

### Monitoring and Observability
- Add structured logging to the plugin and server to aid in debugging.
- Consider exposing basic metrics (e.g., number of connected instances, message rates) via a second WebSocket endpoint or HTTP endpoint.

### Security
- Audit dependencies for vulnerabilities using `npm audit` or similar.
- Ensure the WebSocket server validates incoming messages to prevent injection attacks.
- If browser launching is enabled, ensure it does not introduce security risks (e.g., only launch trusted URLs).

### Disaster Recovery
- Implement graceful shutdown handling in the server (already present via `shutdownTimer`).
- Ensure the plugin cleans up resources (WebSocket connections, intervals) when unloaded by OpenCode.

### Documentation
- Maintain a `CHANGELOG.md` file documenting changes between versions.
- Update `README.md` with clear installation, configuration, and usage instructions.
- Document the WebSocket protocol (as suggested in `visualizer/RECOMMENDATIONS.md`) in a dedicated file (e.g., `WEBSOCKET_PROTOCOL.md`).

## Implementation Priority

### High Impact (Address Critical Compatibility Issues)
1. Replace Bun server with Node.js/WS implementation.
2. Compile TypeScript to JavaScript and update `package.json` to distribute compiled output.
3. Define Node.js version requirement in `package.json`.

### Medium Impact (Improve Reliability and Maintainability)
1. Make server port configurable via environment variable.
2. Add build, test, and lint scripts to `package.json`.
3. Implement responsive canvas container.

### Lower Impact (Enhance User Experience and DevOps Maturity)
1. Add automated release pipeline with semantic versioning.
2. Convert images to WebP format.
3. Implement structured logging and basic monitoring.
4. Add post-install validation script.

By implementing these recommendations, the OpenCode Visualizer plugin will be more compatible, reliable, and maintainable, with a smoother installation and update process, reducing friction for users and aligning with modern DevOps practices.