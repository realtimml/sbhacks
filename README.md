# SBHacks - Orbital

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:

   **Windows (PowerShell):**
   ```powershell
   .\venv\Scripts\Activate
   ```

   **macOS/Linux:**
   ```bash
   source venv/bin/activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file with your API keys:
   ```
   COMPOSIO_API_KEY=your_composio_key
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
   REDIS_URL=redis://localhost:6379
   FRONTEND_URL=http://localhost:5173
   WEBHOOK_SECRET=your_webhook_secret
   ```

6. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://127.0.0.1:8000`  
   Interactive docs at `http://127.0.0.1:8000/docs`

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Project Structure

```
sbhacks/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, CORS, lifespan
│   │   ├── config.py            # Pydantic settings
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # OAuth via Composio
│   │   │   ├── chat.py          # Gemini + tool execution
│   │   │   ├── proposals.py     # HITL proposal CRUD
│   │   │   ├── webhooks.py      # Composio webhook receiver
│   │   │   └── triggers.py      # Manage webhook subscriptions
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── composio_service.py
│   │   │   ├── gemini_service.py
│   │   │   ├── redis_service.py
│   │   │   └── task_inference.py
│   │   └── models/
│   │       ├── __init__.py
│   │       └── schemas.py       # Pydantic models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── venv/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```
