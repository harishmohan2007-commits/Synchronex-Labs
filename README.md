# Synchronex — SIH26122 Prototype UI

A React + Vite prototype for the Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- No environment variables are required for the demo UI.

## Prototype flow

Sign in → Command → Capture/Import → Extract → Confidence gate → Review → Apply → Trace → Memory.

The current UI uses synthetic data. Supabase/API/LLM integration can be added without changing the information architecture.
