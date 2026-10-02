# Synchronex Labs

Synchronex is a planning-to-execution platform for infrastructure and oil & gas projects. It connects an existing project schedule with field progress reports so planners can review, validate, and track actual execution against the planned baseline.

## Project Structure

```text
Synchronex-Labs/
├── src/                 # React frontend
├── public/              # Frontend assets
├── backend/             # FastAPI backend
├── vercel.json          # Frontend deployment configuration
├── render.yaml          # Backend deployment configuration
├── package.json
└── README.md
```

## How It Works

```text
Project Schedule
      ↓
Schedule Import
      ↓
Validation & Normalization
      ↓
Executable Activities
      ↓
Field Progress Submission
      ↓
Information Extraction
      ↓
Activity Matching
      ↓
Confidence Check
      ↓
Planner Review
      ↓
Validated Actual Progress
      ↓
Command & Analytics
```

The imported schedule provides the planned baseline. Field reports provide execution information, and validated updates are stored as actual progress.

## Main Features

### Schedule Import

Managers can import project schedules through the Import section. The backend reads and validates the uploaded schedule and converts it into the application's common schedule structure.

The normalized schedule includes:

- Project information
- WBS hierarchy
- Executable activities
- Planned start and finish dates
- Dependencies
- Calendars
- Resources
- Resource assignments

Supported schedule sources include:

- ProjectLibre `.pod`
- Microsoft Project XML / MSPDI
- Primavera P6 `.xer`
- Microsoft Project `.mpp` when the required MPXJ runtime is available

### Field Progress Capture

Field users can submit execution information without directly editing the project schedule.

Supported inputs include:

- Text reports
- Voice input
- Uploaded documents and files

Synchronex extracts information such as activity references, physical progress, actual start information, execution status, report dates, and field remarks.

### Activity Matching

Extracted field information is compared with executable schedule activities.

Clear activity references can produce a high-confidence match. If the evidence is ambiguous or could refer to more than one activity, Synchronex does not blindly update the schedule and instead sends the case to planner review.

### Review Queue

The Review Queue gives planners control over uncertain matches.

Available actions include:

- Accept
- Reject
- Flag as new activity

This keeps human validation in the execution workflow.

### Planned vs Actual Progress

Synchronex maintains the planned baseline separately from actual field progress.

Planned progress is derived from planned activity dates. Actual progress is populated from validated field execution updates.

This allows the project team to compare planned trajectory with actual execution without changing the original baseline.

### Command

Command provides a consolidated view of the project's execution state and current progress.

### Analytics

Analytics provides project-level views for comparing planned and actual progress and understanding movement against the baseline.

## Technology

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- pandas
- openpyxl
- PyMuPDF
- RapidFuzz

### Database

- Supabase PostgreSQL

## Running Locally

### Frontend

From the project root:

```bash
npm install
npm run dev
```

### Backend

From the `backend` directory:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend requires:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Keep the service-role key on the backend only.

## Deployment

### Backend

The backend can be deployed as a Python web service.

```text
Root directory: backend
Build command: pip install -r requirements.txt
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required environment variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The `/health` endpoint can be used to check the deployed backend.

### Frontend

The frontend is deployed as a Vite application.

```text
Build command: npm run build
Output directory: dist
```

The production frontend communicates with the deployed backend API.

## Database

Synchronex uses Supabase PostgreSQL for persistent project data.

The application stores information covering:

- Projects
- WBS nodes
- Activities
- Execution events
- Activity matches
- Review queue
- Progress updates
- Delay causes
- Audit logs
- Project documents
- Project members
- Project memory
- Schedule imports
- Calendars
- Resources
- Dependencies
- Assignments
- Workspace settings

## Schedule Data Handling

The schedule file is used as the source for the planned baseline.

During import, the backend validates the schedule before publishing the normalized records. The resulting schedule is then available to the Schedule, Command, and Analytics views.

Source schedule progress values are not treated as field execution updates. Planned progress is derived from planned dates, while actual progress comes from validated field reports.

## Field Update Handling

Each submitted field report creates an execution event.

A clear and unique activity reference can produce a high-confidence match. Ambiguous or unmatched evidence is routed to the planner review workflow.

Validated progress updates are stored with their related activity and execution event so the source of an update can be traced.

## Prototype Scope

The current prototype demonstrates the complete workflow:

1. Import an existing project schedule.
2. Normalize the schedule into executable project data.
3. Submit field execution evidence.
4. Extract progress information.
5. Match evidence with schedule activities.
6. Assign a confidence level.
7. Route uncertain matches to planner review.
8. Store validated actual progress.
9. Present the resulting project state through Command and Analytics.

The prototype demonstrates the workflow and technical approach. A production rollout would require organization-specific authentication, authorization, integrations, and operational controls.

## Security

Do not commit `.env` files, database passwords, Supabase service-role keys, or other private credentials to the repository.

## License

This project was developed as a prototype for Smart India Hackathon 2026, Problem Statement SIH26122.
