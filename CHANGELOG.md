# Changelog

All notable changes to this project will be documented in this file.

## [1.0.18] - 2026-10-14
### Added
- Proper plugin disposal hook to clean up WebSocket connections and timers
- Session ID and call ID included in tool event payloads for better tracking
- Build system to compile TypeScript to JavaScript for distribution
- Configurable server port via OCV_SERVER_PORT environment variable
- Linting and testing scripts for code quality
- OpenAPI/WebSocket protocol documentation (in visualizer/RECOMMENDATIONS.md)

### Changed
- Updated TypeScript version from ^7.0.2 to ^5.5.0
- Tightened OpenCode plugin dependency from >=1.16.0 to ^1.16.0
- Updated package.json to distribute compiled JavaScript instead of TypeScript source
- Made server port configurable via environment variable
- Fixed README placeholder sections and incorrect project references
- Corrected LICENSE copyright holder
- Updated exports and main fields to point to dist files

### Fixed
- TypeScript compilation errors related to WebSocket type compatibility
- Build process to properly output dist files
- Package inclusion/exclusion to prevent source .ts files from being published

### Dependencies
- Added ws@^8.0.0 as a production dependency for WebSocket fallback compatibility
- Added development dependencies for linting (eslint, @typescript-eslint) and testing (jest, ts-jest)

## [1.0.17] - 2026-10-10
### Initial release
- Initial version of the OpenCode Visualizer plugin
- Real-time pixel-art office visualization of OpenCode agent activity
- Multi-agent support with customizable skins
- Local WebSocket server for inter-instance communication