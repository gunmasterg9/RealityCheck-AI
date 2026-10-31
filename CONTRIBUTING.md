# Contributing to RealityCheck AI

Thank you for your interest in contributing to RealityCheck AI! We are building an evidence-aware, anti-sycophantic claim analysis platform powered by open-weights models like Google Gemma 4.

## Development Setup

1. **Clone & Environment Setup:**
   ```bash
   git clone https://github.com/your-username/RealityCheck-AI.git
   cd RealityCheck-AI
   cp .env.example .env
   ```

2. **Backend Setup:**
   ```bash
   pip install -r backend/requirements.txt
   export PYTHONPATH=backend
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Running Tests:**
   ```bash
   python -m pytest backend/tests -v
   ```

5. **Code Style & Principles:**
   - Maintain documentation integrity and preserve type annotations.
   - All AI provider interactions must treat model output as untrusted and validate via Pydantic schemas.
   - Tests must never require live API keys; mock provider calls cleanly in `backend/tests/`.

