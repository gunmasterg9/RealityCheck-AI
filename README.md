# RealityCheck AI

> **"Don't just trust an answer. Challenge it."**

RealityCheck AI is an evidence-aware AI claim analysis platform engineered to dismantle sycophancy, confirmation bias, and plausible hallucinations in LLMs. Instead of blindly agreeing with user premises, RealityCheck AI separates supplied evidence, unstated assumptions, adversarial counterarguments, unknowns, and model limitations through an active, multi-stage self-audit pipeline.

---

## 🏛 Epistemic Architecture

Most standard AI assistants suffer from **confirmation bias**—validating whatever premise the user feeds them. RealityCheck AI employs a **Three-Stage Adversarial Pipeline**:

```
[User Claim + Optional Context]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: Evidence Assessor                                │
│  - Isolates assertions against supplied context only        │
│  - Categorizes: Support, Counter, Assumption, Unknown       │
│  - Strict rule: No context = "insufficient_evidence"        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: Adversarial Self-Critique (The Skeptic)          │
│  - Actively challenges the Initial Assessment               │
│  - Hunts for selection bias, unverified leaps, confounds    │
│  - Formulates counter-arguments and identifies missing data │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 3: Chief RealityCheck Judge (Adjudication)           │
│  - Reconciles disagreement without hallucinating facts      │
│  - Outputs "What Changed" diff between initial and final    │
│  - Clearly separates Analysis Soundness from Real-world     │
│    Truth Probability                                        │
│  - Discloses model limitations and unverified web sources   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
             [SQLite Persistence & Audit Trail]
             [Interactive SaaS Dashboard / Export]
```

---

## ⚡ Tech Stack & Environment

- **Frontend:** React 19 + Vite + Modern Vanilla CSS Design System + Lucide Icons
- **Backend:** Python 3.12 + FastAPI + Pydantic v2 + SQLite (WAL Mode)
- **Local Inference:** Ollama HTTP API (`/api/chat` with `gemma4:e4b`)
- **Cloud Inference:** Google Gemini API via official `google-genai` Python SDK (Optional fallback)
- **Testing:** Pytest + Pytest-Asyncio (17 automated tests, fully mocked & isolated)

---

## 🚀 Quickstart Guide (Windows PowerShell)

### 1. Prerequisites Check
Ensure Ollama is running with Gemma 4:
```powershell
# Verify Ollama is running and has gemma4:e4b installed
Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags"
```

### 2. Environment Setup
Copy the example environment configuration:
```powershell
Copy-Item .env.example .env
Copy-Item .env.example backend\.env
```
*(Optional: If you wish to enable the cloud Gemini fallback, add your `GEMINI_API_KEY` into `backend\.env`)*

### 3. Start the Backend API
From the repository root:
```powershell
# Set PYTHONPATH and launch FastAPI with Uvicorn
$env:PYTHONPATH = "backend"
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API documentation is accessible at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`
- Providers status: `http://127.0.0.1:8000/api/providers`

### 4. Start the Frontend Dashboard
In a separate PowerShell terminal:
```powershell
cd frontend
npm.cmd run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Running Automated Tests

A comprehensive 17-test suite verifies health, providers, schema validation, multi-stage pipeline execution, adversarial fallback, SQLite persistence, and provider routing:

```powershell
python -m pytest backend/tests -v
```

All AI provider calls in the automated test suite are cleanly mocked so tests run in less than 2 seconds without requiring live GPU compute or API keys.

---

## 📦 Production Frontend Build

To verify and build the production bundle:
```powershell
cd frontend
npm.cmd run build
```
Builds optimized static assets into `frontend/dist/`.

---

## 🎯 Curated Demo Script (3 Compelling Claims)

Use the built-in demo claim pills in the dashboard or submit these via the API to witness the epistemic shifts:

### Demo Claim 1: "Quantum Supremacy Claim" (Marketing vs Empirical Reality)
- **Claim:** `"The quantum processor has achieved commercial quantum supremacy by solving general optimization problems 100,000x faster than supercomputers."`
- **Context:** `"Company press release: 'Our proprietary 128-qubit superconducting system solved a synthetic random circuit sampling benchmark in 3 seconds, whereas an classical algorithm took several days.' Note: Benchmarks were limited to specific synthetic noise patterns; independent replication on general business optimization problems has not been conducted."`
- **Expected Outcome:** Initial assessment leans `supported` by corporate text; Adversarial Critic exposes the synthetic vs real-world gap; Final Judge shifts verdict to `mixed` or `contradicted` for general claims.

### Demo Claim 2: "Health Panacea" (Zero Evidence Submitted)
- **Claim:** `"Consuming cold-pressed lemon water with sea salt each morning eliminates bodily inflammation and cures metabolic resistance."`
- **Context:** `[None - Leave Context Empty]`
- **Expected Outcome:** Strict enforcement of scientific burden of proof; receives `insufficient_evidence` with high analysis soundness, disclosing that external clinical databases were not queried.

### Demo Claim 3: "Denmark Renewable Energy" (Empirical Authority Provided)
- **Claim:** `"Denmark generated more than 50% of its total domestic electricity consumption from wind and solar power in recent operational years."`
- **Context:** `"Official Danish Energy Agency and Eurostat reporting confirmed that combined wind and solar generation accounted for approximately 53% to 58% of Denmark's gross electricity consumption between 2021 and 2023. Interconnectors with Norway, Sweden, and Germany provided balancing and storage capacity."`
- **Expected Outcome:** Evaluated as `supported` based on official statistical records, while acknowledging grid interconnection dependencies in assumptions.

---

## 🔌 API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and version |
| `GET` | `/api/providers` | Status of local Ollama and cloud Gemini providers |
| `GET` | `/api/sample-claims` | List curated demonstration claims |
| `POST` | `/api/analyze` | Submit claim for 3-stage adversarial audit |
| `GET` | `/api/history` | List historical analyses saved in SQLite |
| `GET` | `/api/history/{id}` | Retrieve full analysis and audit steps |
| `DELETE` | `/api/history/{id}` | Delete analysis and cascaded steps |
| `GET` | `/api/export/{id}` | Export analysis as JSON or printable HTML report |

---

## 🔒 Security & Epistemic Boundaries

1. **No External Hallucinations:** The engine explicitly reports when external live web sources were not searched, refusing to invent citations.
2. **Analysis Soundness vs Real-World Truth:** Every verdict distinguishes between confidence in the analytical evaluation and the empirical truth probability of the claim in physical reality.
3. **Strict Local Mode:** Selecting `local` guarantees data stays on the machine and will never silently leak to cloud endpoints.
4. **Zero Key Exposure:** API keys reside strictly in `backend/.env` and are never serialized or sent to client dashboards.
