# werkbank

Study tools for EE coursework. Calculators and visualizers for Regeltechniek and Fourier.

## Develop

```sh
npm install
npm run dev
```

## Test

```sh
npm test
```

## Build

```sh
npm run build
```

Output goes to `dist/`. Drop on any static host (GitHub Pages, Netlify, …).

## Add a module

1. Create `src/modules/<id>/module.ts` exporting `Module`.
2. Add the import to `src/registry.ts`.
3. Done. The homepage and dispatcher pick it up automatically.
