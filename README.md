# @tex0l/encrypted-card

End-to-end encrypted business card components and build-time encryption utilities for Astro + Vue sites.

## Features

- **AES-256-GCM encryption** with Scrypt key derivation (N=1024, r=8, p=1)
- **Build-time asset encryption** via `encryptAssets()` — encrypts files from a source directory, with smart skip when assets are unchanged
- **Vue 3 client components** for runtime decryption using a password from the URL hash (never sent to the server)
- **Salt management** — auto-generates and persists a salt file

## Installation

```bash
npm install @tex0l/encrypted-card
```

Peer dependencies: `vue ^3.0.0`, `@iconify/vue ^5.0.0`

## Usage

### Build-time encryption

```js
import { encryptAssets } from '@tex0l/encrypted-card/encryptAssets.js'

const result = await encryptAssets({
  sourceDir: './public_to_encrypt',
  outputDir: './public/encrypted',
  saltFile: './public/salt.txt',
  password: process.env.PASSWORD,
})
```

### Vue components

```vue
<script setup>
import EncryptedBusinessCard from '@tex0l/encrypted-card/components/EncryptedBusinessCard.client.vue'
</script>

<template>
  <EncryptedBusinessCard />
</template>
```

### CSS

```js
import '@tex0l/encrypted-card/index.css'
```

## Development

```bash
npm install
npm test       # Build + run tests
npm run build  # Compile TypeScript to dist/
```

## Releasing

Releases are automated via GitHub Actions. To publish a new version:

1. Bump the version: `npm version patch|minor|major`
2. Push the commit and tag: `git push && git push --tags`
3. The [Publish workflow](.github/workflows/publish.yml) triggers on `v*` tags, runs build + tests, and publishes to npm
4. Pre-release versions (e.g. `1.0.0-beta.1`) are published with the `next` npm tag

## License

MIT
