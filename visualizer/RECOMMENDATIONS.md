# OpenCode Visualizer Plugin - Recommendations

## Overview

This document provides recommendations for improving the OpenCode Visualizer plugin based on a review of the frontend code (index.html, person*/, textures/). The focus areas are performance optimization (Core Web Vitals), accessibility (WCAG compliance), modern web technologies usage, bundle size optimization, and responsive design.

## 1. Performance Optimization (Core Web Vitals)

### Current State
- The plugin uses `requestAnimationFrame` for the main loop, which is good for animation performance.
- Images are loaded in parallel using `Promise.all` in the `preloadAll()` function.
- The canvas is scaled by `devicePixelRatio` for high-DPI displays.
- The code uses `ctx.imageSmoothingEnabled = false` to preserve pixel art aesthetics.

### Recommendations
1. **Image Optimization**:
    - Convert all PNG images to WebP format (lossless) to reduce file size by approximately 25-35%. This will improve Largest Contentful Paint (LCP) and reduce bandwidth usage.
    - Example: Use a tool like `cwebp` or online converters to convert PNG to WebP, then update the `loadImage` function to load `.webp` files instead of `.png`.

2. **Lazy Loading for Offscreen Images**:
    - Although all images are preloaded, consider implementing a priority-based loading system where only the initially needed animations (e.g., idle, walk south) are loaded first, and other animations are loaded on demand. This can reduce initial load time.

3. **Minify HTML, CSS, and JavaScript**:
    - Minify the inline HTML, CSS, and JavaScript to reduce the size of the index.html file. This can be done during the build process.
    - Example: Use tools like HTMLMinifier, CSSNano, and Terser to minify the code.

4. **Efficient Rendering**:
    - The `drawAll` function sorts the `drawObjects` array every frame. Since there are only a maximum of 5 agents and a few static objects, the performance impact is negligible. However, for better practices, consider separating static and dynamic objects and only sorting the dynamic agents by Y-position each frame.

5. **Remove Debugging Console Logs**:
    - Remove or conditionally compile out `console.log` statements in production builds to reduce CPU overhead.

6. **Serve Assets with Proper Caching Headers**:
    - Configure the web server to serve static assets (images, HTML) with appropriate cache headers (e.g., `Cache-Control: max-age=31536000, immutable`) to leverage browser caching and reduce repeat visits load time.

7. **Consider Using `requestIdleCallback` for Non-Essential Work**:
    - If there are any non-essential computations, use `requestIdleCallback` to run them during idle periods.

## 2. Accessibility (WCAG Compliance)

### Current State
- The page sets `lang="en"` on the html tag.
- The viewport meta tag is present for responsive design.
- The canvas element does not have any accessibility attributes.

### Recommendations
1. **Provide Text Alternative for Canvas**:
    - Since the canvas conveys information (the state of agents), provide an accessible alternative. Options include:
      - Adding `aria-label` to the canvas describing the visualization (e.g., "OpenCode Visualizer showing agent activity").
      - If the visualization is purely decorative, add `aria-hidden="true"` and provide a textual description elsewhere (e.g., in a visually hidden element).
    - Example: `<canvas id="canvas" aria-label="OpenCode Visualizer showing agent activity"></canvas>`

2. **Ensure Sufficient Color Contrast**:
    - Verify that the agent sprites have sufficient contrast against the background (#1a1a2e). Use a contrast checker tool to ensure a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text (though this is graphical content, the same principles apply for informational graphics).
    - If necessary, adjust the background color or add outlines to the sprites to improve contrast.

3. **Add Landmark Roles and Headings**:
    - Consider adding a heading (e.g., `<h1>OpenCode Visualizer</h1>`) and landmark roles (e.g., `<main>`) to improve screen reader navigation.
    - Example:
      ```html
      <body>
        <h1 class="visually-hidden">OpenCode Visualizer</h1>
        <main>
          <canvas id="canvas" aria-label="OpenCode Visualizer showing agent activity"></canvas>
        </main>
      </body>
      ```
    - Use a visually hidden class to hide the heading visually but keep it accessible to screen readers.

4. **Ensure Keyboard Accessibility**:
    - Although the visualization is not interactive, ensure that the canvas does not trap keyboard focus. By default, a canvas is not focusable unless `tabindex` is added. If no `tabindex` is set, it is safe. However, if interactivity is added in the future, ensure keyboard accessibility.

5. **Avoid Relying Solely on Color**:
    - Ensure that information conveyed by color (e.g., agent states) is also available through other means (e.g., patterns, labels, or tooltips). However, since the visualization is primarily graphical and the agent states are shown by animation, consider providing a tooltip or accessible name for each agent that describes its current state.

## 3. Modern Web Technologies Usage

### Current State
- Uses vanilla JavaScript with ES6+ features (`const`, `let`, arrow functions).
- Uses `Promise.all` and `async/await` for image loading.
- Uses `requestAnimationFrame` for the render loop.
- Uses the Canvas API for rendering.

### Recommendations
1. **Adopt ES Modules**:
    - Split the JavaScript code into modules (e.g., `agent.js`, `renderer.js`, `websocket.js`) and use ES module imports/exports. This improves maintainability and allows for better code splitting.
    - Example: Change the script tag to `type="module"` and refactor the code into separate files.

2. **Use CSS Custom Properties for Theming**:
    - Define CSS custom properties (variables) for colors (e.g., `--background-color: #1a1a2e;`) to allow easy theming and adjustments.

3. **Consider Using a Modern Build Setup**:
    - Although not strictly necessary for a small plugin, consider using a build tool (like Vite or Rollup) to enable:
      - Code minification
      - Image optimization (including WebP conversion)
      - Development server with hot module replacement
      - Production builds with cache busting

4. **Leverage the Canvas Offscreen API**:
    - For complex rendering, consider using the OffscreenCanvas API to move rendering to a web worker, freeing up the main thread. However, given the low complexity of this visualization, this may be overkill.

## 4. Bundle Size Optimization

### Current State
- The index.html file is 29 KB (unminified).
- The image assets total approximately 1.09 MB (PNG format).

### Recommendations
1. **Minify Resources**:
    - Minify the HTML, CSS, and JavaScript. Expected savings: HTML can be reduced by 30-50%, CSS and JavaScript by similar amounts.
    - Example: After minification, the index.html might reduce to ~15 KB.

2. **Convert Images to WebP**:
    - Convert all PNG images to WebP (lossless). Expected savings: 25-35% reduction in image size.
    - Example: 1.09 MB PNG → ~0.75 MB WebP, saving ~340 KB.

3. **Remove Unused Assets**:
    - Audit the image assets to ensure all animations and directions are actually used. Remove any unused frames or animations.

4. **Implement Cache Busting**:
    - When updating assets, use cache busting techniques (e.g., filename hashing) to ensure users get the latest version without hard reloads.

5. **Consider Using SVG for Simple Shapes**:
    - Evaluate if the desk and coffee table images can be replaced with SVG code. This would reduce the size of these assets and allow them to scale without loss of quality. However, if they are detailed pixel art, PNG/WebP may be better.

## 5. Responsive Design

### Current State
- The canvas has a fixed size of 640x480 CSS pixels, scaled by `devicePixelRatio` for high-DPI displays.
- The canvas does not resize with the viewport; it is fixed size and may be cut off on smaller screens or leave extra space on larger screens.

### Recommendations
1. **Make the Canvas Fluid**:
    - Allow the canvas to width and height to be 100% of its container, while maintaining the aspect ratio (4:3 in this case, since 640:480 simplifies to 4:3).
    - Use a container div with a maximum width and height, and set the canvas to `width: 100%; height: auto;` (or use the padding-top trick to maintain aspect ratio).
    - Adjust the internal resolution based on the container size and `devicePixelRatio`.

2. **Example Implementation**:
    ```html
    <div class="canvas-container">
      <canvas id="canvas" aria-label="OpenCode Visualizer showing agent activity"></canvas>
    </div>
    ```
    ```css
    .canvas-container {
      position: relative;
      width: 100%;
      max-width: 640px; /* Optional: limit maximum size */
      aspect-ratio: 4 / 3; /* Maintains 4:3 ratio */
    }
    #canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    ```
    - In JavaScript, set the canvas drawing buffer width and height based on the container's client width and height multiplied by `devicePixelRatio`.

3. **Test on Various Devices**:
    - Test the visualization on different screen sizes (mobile, tablet, desktop) to ensure it scales appropriately and remains usable.

## 6. OpenCode Compatibility Issues

### Current State
- The plugin connects to a WebSocket at `ws://${location.host}` and expects specific message types:
  - `state.sync`
  - `instance.added`
  - `instance.removed`
  - `instance.event` (with sub-events: `session.status`, `session.idle`, `session.error`, `tool.execute.after`, `tool.execute.before`, `session.diff`)

### Recommendations
1. **Document the Expected WebSocket Protocol**:
    - Create a clear documentation of the WebSocket message format that the plugin expects and emits. This will help ensure compatibility with the OpenCode server.
    - Example: Create a `WEBSOCKET_PROTOCOL.md` file in the visualizer directory.

2. **Handle Unexpected Messages Gracefully**:
    - Add a default case in the WebSocket message switch statement to log unexpected message types for debugging, but do not break the visualization.

3. **Implement Reconnection Logic with Exponential Backoff**:
    - The current reconnection logic uses a fixed delay (2000ms) and a disconnect timeout. Consider implementing exponential backoff to avoid overwhelming the server during intermittent connectivity issues.

4. **Validate Incoming Data**:
    - Add validation for incoming WebSocket data (e.g., check that `data.instanceId` is a string or number, that `data.instances` is an array, etc.) to prevent runtime errors from malformed data.

5. **Consider Using a Version Handshake**:
    - Upon connection, send a client version and expect a server version to ensure compatibility. If versions are incompatible, display an appropriate message to the user.

## 7. Server Configuration (ocv-server.ts)

### Current State
- The server sets `Cache-Control: no-store, no-cache, must-revalidate` for all served content, which prevents caching and increases load on repeat visits.

### Recommendations
1. **Optimize Cache Headers**:
    - Modify the server to set appropriate cache headers for static assets:
        - For HTML: Use `Cache-Control: no-cache` (if HTML changes frequently) or implement cache busting (e.g., by including a hash in the filename) and then use long-term caching.
        - For images and other static assets: Use `Cache-Control: max-age=31536000, immutable` to allow long-term caching.
    - Example change in `ocv-server.ts`:
        ```diff
        - return new Response(Bun.file(filePath), {
        -   headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        - });
        + const isHtml = pathname.endsWith('.html');
        + return new Response(Bun.file(filePath), {
        +   headers: {
        +     "Cache-Control": isHtml ? "no-cache" : "max-age=31536000, immutable",
        +   },
        + });
        ```

2. **Enable Compression**:
    - Consider enabling HTTP compression (e.g., Brotli or Gzip) for text-based assets (HTML, JavaScript, CSS) to reduce transfer size. Bun's server has built-in support for compression via the `Bun.serve` options.

3. **Use HTTP/2**:
    - If possible, deploy the server behind an HTTP/2-capable proxy (like NGINX) or use Bun's built-in HTTP/2 support to allow multiplexing of requests, reducing latency.

## Implementation Priorities

### High Impact, Low Effort
1. Convert images to WebP.
2. Minify HTML, CSS, and JavaScript.
3. Add `aria-label` to the canvas.
4. Implement responsive canvas container.

### Medium Impact, Medium Effort
1. Refactor JavaScript into ES modules.
2. Add caching headers via server configuration (if applicable).
3. Implement image optimization in build process.

### Lower Impact, Higher Effort
1. Implement lazy loading for animations.
2. Add WebSocket version handshake.
3. Create comprehensive documentation for the WebSocket protocol.

By implementing these recommendations, the OpenCode Visualizer plugin will be more performant, accessible, maintainable, and resilient, while providing a better user experience across devices.