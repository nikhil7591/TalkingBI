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

## API Key Fallback Behavior
This project supports OpenAI and Groq fallback in backend/app/services/ai_service.py.

Priority order:
1. If OPENAI_API_KEY is set, it uses OPENAI_MODEL.
2. Else if GROQ_API_KEY is set, it uses GROQ_MODEL via Groq OpenAI-compatible endpoint.
3. If neither is present, it still runs using a local fallback dashboard generator.
