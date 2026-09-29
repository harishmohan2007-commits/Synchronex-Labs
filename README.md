# Synchronex Labs — Deployment Package

Synchronex is the planning-to-execution bridge for SIH26122. This package contains the React/Vite frontend and the FastAPI/Supabase backend.

## Architecture

- **Frontend:** React + Vite → Netlify or Vercel
- **Backend:** FastAPI + Python → Python web host (recommended: Render)
- **Database:** Supabase
- **Schedule intake:** manager uploads `.pod`, `.mpp`, `.xml`/`.mspdi`, or `.xer` at runtime

The schedule binary is **not bundled** in this package and is **not preloaded into Supabase**. The backend receives the manager's upload, parses it, validates it, and persists the normalized schedule records.

## 1. Deploy the backend first

Use the included `render.yaml`, or create a Python web service manually with:

```text
Root directory: backend
Build command: pip install -r requirements.txt
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set backend environment variables:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Keep the service-role key server-side only.

### Backend health check

After deployment, open:

```text
https://YOUR-BACKEND/health
```

Expected response includes `"status":"ok"` and `"supabase_configured":true`.

## 2. Configure the frontend

Create a Netlify project from the repository root.

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Set this Netlify environment variable:

```text
VITE_API_BASE_URL=/api
```

Then deploy:

```bash
npm install
npm run build
netlify deploy --prod
```

The included `netlify.toml` provides the `/api` proxy and SPA fallback routing. The included `vercel.json` provides the same `/api` proxy and SPA fallback when deployed on Vercel.

## 3. First real schedule import

1. Open the deployed Synchronex frontend.
2. Enter the company/manager workspace.
3. Open **Import**.
4. Select the schedule file supplied by the manager.
5. Submit the schedule.
6. Synchronex parses it in the backend.
7. The normalized project/WBS/activity/dependency/resource/assignment records are written to Supabase.
8. Schedule and Command read the persisted records.

No baseline schedule is expected before a manager performs this import.

## Supported schedule formats

- ProjectLibre `.pod`
- Microsoft Project `.xml` / `.mspdi`
- Primavera P6 `.xer`
- Microsoft Project `.mpp` through the MPXJ adapter when its Java runtime is available on the backend host

## Important production note

The current login screen is the existing prototype workspace UI. It is not a replacement for a full Supabase Auth/RBAC implementation. Before exposing Synchronex to real users or sensitive project data, connect the UI to Supabase Auth and enforce the user's project role on backend operations.


## Judge/demo login

The workspace selector intentionally accepts blank email and password fields for the SIH demonstration build. Select Company portal or Field portal and press **Enter** / click the portal button. No credentials are required for this demo path.
