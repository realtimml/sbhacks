# SBHacks

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
   pip install fastapi uvicorn
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://127.0.0.1:8000`  
   Interactive docs at `http://127.0.0.1:8000/docs`

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend/hound.ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Project Structure

```
sbhacks/
├── backend/
│   ├── app/
│   │   └── main.py
│   └── venv/
├── frontend/
│   └── hound.ai/
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
└── README.md
```

