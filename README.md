# Synchronex Labs — SIH26122 Prototype

React + Vite prototype for the Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Demo flow

Sign in → Company or Field portal → Schedule/Import or Capture → extraction → activity matching → confidence gate → Review when required → actual update → Trace → Memory.

## Project structure

- `src/App.tsx` — active application UI and interaction logic
- `src/data.ts` — synthetic demo data
- `src/index.css` — visual system and themes
- `src/main.tsx` — application entry point
- `index.html` — document shell and theme bootstrap
- `vite.config.ts` — Vite configuration
- `package.json` — dependencies and scripts
