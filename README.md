# Lead-Qualifier

## Setup & Run Instructions

### Backend (FastAPI + SQLite + LLM Enrichment)

1. **Install dependencies:**
   ```bash
   cd backend
   python3 -m pip install -r requirements.txt
   ```

2. **Set up OpenAI API key:**
   - Create a `.env` file in the `backend/` directory with:
     ```
     OPENAI_API_KEY=sk-...your-key-here...
     ```
   - Do **not** commit this file to git (it should be in `.gitignore`).

3. **Run the backend server:**
   ```bash
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```
   - The API will be available at: [http://localhost:8000/api/leads](http://localhost:8000/api/leads)

---

### Frontend (React + Vite + TypeScript)

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the frontend dev server:**
   ```bash
   npm run dev
   ```
   - The app will be available at: [http://localhost:5173](http://localhost:5173)

---

## SQL Queries & Results(I changed the queries to be more relevant to the project)

### 1. Top 3 filters used in the last 7 days
```sql
SELECT event_metadata->>'filterType' AS filter,
       COUNT(*) AS uses
FROM events
WHERE action = 'filter'
  AND occurred_at >= datetime('now', '-7 days')
GROUP BY filter
ORDER BY uses DESC
LIMIT 3;
```
**Result:**
| filter    | uses |
|-----------|------|
| industry  | 18   |
| size      | 7    |

### 2. Pie vs. Bar chart preference overall
```sql
SELECT event_metadata->>'view' AS view,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM events WHERE action = 'toggle_view' AND (event_metadata->>'view' = 'pie' OR event_metadata->>'view' = 'bar')), 2) AS pct
FROM events
WHERE action = 'toggle_view' AND (event_metadata->>'view' = 'pie' OR event_metadata->>'view' = 'bar')
GROUP BY view;
```
**Result:**
| view | pct  |
|------|------|
| pie  | 57.1 |
| bar  | 42.9 |
