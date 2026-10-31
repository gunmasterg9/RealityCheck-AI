# RealityCheck AI — Hackathon Submission & Dual-Prize Pitch

> **Tagline:** Don't just trust an answer. Challenge it.  
> **Repository:** https://github.com/realitycheck-ai/realitycheck-ai  
> **Target Prize Categories:**
> 1. **DigitalOcean: Best Open-Source AI Project**
> 2. **Google: Best Use of Gemma 4**

---

## 🏆 Category 1: DigitalOcean — Best Open-Source AI Project

### Why RealityCheck AI Qualifies:
1. **100% Original, Independent Open-Source Architecture:**
   - Fully open-sourced under the permissive MIT license.
   - Built from scratch without proprietary lock-in. The platform operates 100% locally with zero cloud API keys, protecting user privacy and ensuring reproducibility.
2. **First-Class Open-Weights Foundation:**
   - Uses **Google Gemma 4 E4B** (`gemma4:e4b`) as its core analytical reasoning engine via local Ollama inference.
   - Zero vendor lock-in: Anyone can run this platform on consumer hardware (such as an NVIDIA RTX 5060 Ti or Apple Silicon).
3. **Turnkey DigitalOcean Deployment Ready:**
   - **`Dockerfile`:** Multi-stage production container compiling React 19 frontend and Python 3.12 FastAPI backend into a single lightweight image.
   - **`docker-compose.yml`:** One-command orchestration bundling the RealityCheck AI application with a local Ollama model container.
   - **`.do/app.yaml`:** Native DigitalOcean App Platform specification ready for 1-click cloud deployment.
4. **Engineering Standards & Reliability:**
   - 17 automated tests with 100% pass rate in <2 seconds.
   - Pure SQLite WAL persistence with cascade foreign-key indexing.
   - Comprehensive error recovery and non-blocking fallback parsers for untrusted model inputs.

---

## 🏆 Category 2: Google — Best Use of Gemma 4

### How Gemma 4 Serves as the Central Intelligence:

Gemma 4 is not a generic chatbot wrapper in RealityCheck AI—it is the central multi-stage epistemic engine powering three distinct reasoning personas and multimodal analysis:

1. **Multimodal Evidence Extraction (Vision + Text):**
   - RealityCheck AI exploits Gemma 4's native multimodal capabilities.
   - Users submit claims alongside chart screenshots, nutritional labels, and financial graphics.
   - Gemma 4 inspects **chart axes**, **fine-print asterisks**, **footnote caveats**, and **disclaimers** to expose discrepancies between marketing claims and empirical graphics.
2. **Three-Pass Adversarial Self-Audit (Eliminating Sycophancy):**
   - **Pass 1 (Evidence Assessor):** Scrutinizes assertions strictly against supplied evidence. If no empirical context is provided, it assigns `insufficient_evidence` instead of hallucinating plausible consensus.
   - **Pass 2 (Adversarial Critic):** Instructed to actively challenge the initial assessment, surface selection bias, and identify missing variables or synthetic benchmark tricks.
   - **Pass 3 (Chief RealityCheck Judge):** Reconciles disagreements without inventing evidence, quantifies assessment soundness (0–100%), and outputs a side-by-side "What Changed" diff.
3. **Dual Model Routing & Comparison:**
   - Supports local Gemma 4 E4B via Ollama and hosted Gemma 4 via Google's official `google-genai` SDK.
   - Interactive provider toggle allows instant comparison of local vs hosted inference.
4. **Empirical Gemma 4 Benchmark Suite:**
   - Built-in benchmark evaluating Gemma 4 on response time, 100% JSON schema compliance, and adversarial shift rate across multimodal sample cases.

---

## 🚀 Three Reproducible Demonstration Cases

1. **The Quantum Supremacy Speedup (Multimodal Chart Analysis):**
   - *Claim:* Quantum processor achieved 100,000x supremacy over supercomputers on general optimization problems.
   - *Visual Evidence:* Attached benchmark chart showing 3.2s vs 345,600s.
   - *Gemma 4 Catch:* Gemma 4 reads the fine-print footnote (`*Benchmark executed solely on pseudo-random synthetic circuit sampling; does not represent general optimization`) and shifts the initial verdict from `supported` to `mixed`.
2. **Miracle Detox Panacea (Zero Context & Deceptive Supplement Label):**
   - *Claim:* Morning lemon water with Himalayan salt cures metabolic resistance in 7 days.
   - *Visual Evidence:* Attached supplement label.
   - *Gemma 4 Catch:* Detects 1,420mg sodium (62% DV) and the mandatory FDA disclaimer, shifting verdict to `contradicted`.
3. **Denmark Renewable Energy (Empirical Grid Dispatch):**
   - *Claim:* Denmark generated over 50% of gross electricity from wind and solar.
   - *Visual Evidence:* Official Eurostat generation chart.
   - *Gemma 4 Catch:* Corroborates 48.2% wind + 7.8% solar = 56.0%, and identifies cross-border interconnectors (Norway/Sweden/Germany) as crucial grid balancing assumptions.

---

## 📦 Deliverables Checklist

- [x] Complete working web application (React 19 + FastAPI + SQLite).
- [x] Public GitHub-ready repository with MIT License.
- [x] Gemma 4 multimodal vision and text claim analysis.
- [x] Three-stage adversarial reasoning pipeline with "What Changed" diff.
- [x] DigitalOcean deployment configuration (`Dockerfile`, `docker-compose.yml`, `.do/app.yaml`).
- [x] Automated test suite (17 tests, 100% pass rate).
- [x] Empirical Gemma 4 benchmark evaluation report.
- [x] 3-minute video presentation demo script (`DEMO_SCRIPT.md`).

