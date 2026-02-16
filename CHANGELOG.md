# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Unit tests for VCard builder (16 tests covering all methods, escaping, folding, and the EncryptedBusinessCard usage pattern)

## [0.1.5] - 2026-02-16

### Fixed

- Include `dist/` in published npm tarball by adding `files` field to `package.json`

## [0.1.4] - 2026-02-16

### Fixed

- Replace CJS `vcard-creator` with inline ESM `VCard` builder to fix Vite CJS interop

### Added

- Vite ESM compatibility test — detects CJS dependencies that would fail at runtime in the browser

## [0.1.3] - 2026-02-16

### Fixed

- Replace CJS `scrypt-js` with pure ESM `@noble/hashes/scrypt.js` to fix Vite CJS interop

## [0.1.2] - 2026-02-16

### Fixed

- Use default import for `scrypt-js` CJS module (still broken — superseded by 0.1.3)

## [0.1.1] - 2026-02-16

### Fixed

- Replace `buffer` polyfill with native browser APIs (`TextEncoder`, `TextDecoder`, `atob`)

### Removed

- `buffer` dependency (no longer needed — client-side code uses native APIs, build-time code uses `node:buffer`)

## [0.1.0] - 2026-02-16

### Added

- GitHub Actions publish workflow with npm trusted publishers (OIDC provenance)

## [0.1.0-0] - 2026-02-16

### Added

- Encrypted business card Vue components (`EncryptedBusinessCard`, `EncryptedImage`)
- Client-side AES-256-GCM decryption with Scrypt key derivation
- Build-time encryption script (`encryptAssets`) with validation and auto-re-encryption
- Tailwind CSS styling with `@source inline()` pattern for external package class generation
- `index.css` export for Tailwind consumers
- Example Astro project
- Comprehensive test suite for encryption/decryption roundtrips (13 tests)

### Changed

- Redesigned business card UI with clean card layout and Tailwind theme variables
- Converted from JavaScript to TypeScript with build step
- Refactored `encryptAssets` to export functions instead of reading env vars
