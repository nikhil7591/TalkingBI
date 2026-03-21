# Talking BI - Dashboard Generator

## Backend Setup
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Add your keys to .env
uvicorn app.main:app --reload --port 8000

## Frontend Setup
cd frontend
npm install
# .env.local already has NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev

## Open Application
Open http://localhost:3000

## Model Routing Behavior
Current routing is intentionally split by feature:

1. Dashboard generation and BI chatbot use OpenAI only (`OPENAI_MODEL`, default `gpt-5.4-mini-2026-03-17`).
2. Voice explanation text generation uses Groq first (`GROQ_MODEL`) with OpenAI fallback for resilience.
3. Dashboard spec generation still works from local data logic even if model keys are missing.
