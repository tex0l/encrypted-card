# @tex0l/encrypted-card — Example

Minimal Astro project demonstrating how to use `@tex0l/encrypted-card`.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:4321/ — the password `demo-password` is automatically
set in the URL hash.

## How it works

1. **Build-time encryption** (`scripts/encrypt.js`): encrypts the files in
   `fixtures/` into `public/encrypted/` using AES-256-GCM via
   `@tex0l/encrypted-card/encryptAssets.js`.

2. **Client-side decryption**: the `EncryptedBusinessCard` component reads
   the password from the URL hash, derives an AES key via scrypt, and
   decrypts the contact info and portrait image in the browser.

## Tailwind CSS

The component uses Tailwind utility classes. Since it renders client-only
(`client:only="vue"`), Tailwind cannot detect the classes from the Vite
module graph at build time. The package ships an `index.css` that declares
all needed classes via `@source inline()`.

In your CSS, import it after Tailwind:

```css
@import "tailwindcss";
@import "@tex0l/encrypted-card";
```

This requires `@tailwindcss/postcss` (not `@tailwindcss/vite`) — see
`postcss.config.mjs`.

## Files

| File | Purpose |
|------|---------|
| `fixtures/contactInfo.json` | Dummy contact data (plaintext input) |
| `fixtures/stock-portrait.png` | Dummy portrait image (plaintext input) |
| `scripts/encrypt.js` | Build-time encryption script |
| `src/pages/index.astro` | Single page rendering the component |
| `src/styles/global.css` | Tailwind CSS + package style import |
| `postcss.config.mjs` | PostCSS config for Tailwind |
| `astro.config.mjs` | Astro + Vue integration config |
