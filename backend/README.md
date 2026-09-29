# Synchronex Execution Bridge API

FastAPI backend for SIH26122. The backend is the ingestion and execution truth layer between planning schedules, field evidence, matching/review, and Supabase.

## Schedule inputs

Synchronex accepts the original planning files directly:

- ProjectLibre `.pod` — native POD with embedded MSPDI schedule XML
- Microsoft Project `.xml` / MSPDI
- Microsoft Project `.mpp` — read through MPXJ (requires Java)
- Primavera P6 `.xer`

All inputs are normalized into the same schedule model before persistence. The frontend never generates JSON/CSV/SQL schedule imports.

## Environment

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

For `.mpp` support, the host also needs a Java runtime; MPXJ's Python package bridges Python to the Java library.

## Main API paths

- `POST /api/import/schedule` — parse and persist `.pod`, `.mpp`, `.xml`, `.xer`
- `GET /api/projects/current` — resolve the current/first project
- `GET /api/projects/{project_id}/bootstrap` — schedule + execution + review + trace + settings
- `GET /api/projects/{project_id}/activities` — persisted activities
- `POST /api/capture` — field evidence capture and deterministic matching
- `POST /api/review/{review_id}` — approve/reject/flag a match
- `GET/PUT /api/settings/{project_id}` — workspace configuration

No OpenAI API is required. Schedule parsing is deterministic; field matching uses RapidFuzz.


## Schedule upload rule

Schedule files are not bundled into the application or preloaded into Supabase. The manager selects the original ProjectLibre, Microsoft Project, or Primavera schedule in the Synchronex Import center. Only after that upload is submitted does the backend parse the file and persist the normalized schedule records. The original `.pod`/`.mpp`/`.xer` binary is not inserted into the schedule tables.

## Production deployment

The recommended deployment is Vercel for the React/Vite frontend and a Python host such as Render for the FastAPI backend. This keeps the Python schedule parser and optional Java/MPXJ `.mpp` path in a normal Python runtime.

Set these backend environment variables:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Set the Vercel frontend variable `VITE_API_BASE_URL` to the public FastAPI URL. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend.
