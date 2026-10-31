# RealityCheck AI — 3-Minute Hackathon Video Demo Script

> **Video Title:** RealityCheck AI — Don't just trust an answer. Challenge it.  
> **Target Audience:** Hackathon Judges (DigitalOcean & Google Gemma Tracks)  
> **Duration:** 3 Minutes (180 Seconds)

---

### [0:00 - 0:30] Scene 1: The Problem — AI Sycophancy & Plausible Hallucination
- **Visual:** Open browser showing typical chatbot sycophantically agreeing with a dubious claim ("Yes! Cold lemon water with sea salt cures metabolic disease!").
- **Voiceover:**
  > *"Large Language Models have a dangerous flaw: sycophancy. Ask an AI if a dubious health trend, marketing claim, or corporate press release is true, and it will often validate whatever premise you feed it."*
  > *"We built **RealityCheck AI**—an evidence-aware AI claim analysis platform powered by Google Gemma 4. Its motto: Don't just trust an answer. Challenge it."*
- **Action:** Transition to the RealityCheck AI Dark Analytical Dashboard (`http://localhost:5173`).

---

### [0:30 - 1:15] Scene 2: The Core Architecture & Gemma 4 Epistemic Pipeline
- **Visual:** Zoom in on the Header with the **Gemma 4 Local Indicator** (`gemma4:e4b` on Ollama) and the **Dual-Prize Target Badge**.
- **Voiceover:**
  > *"RealityCheck AI is 100% open-source and runs completely locally using Gemma 4 on consumer GPUs—no proprietary cloud APIs required."*
  > *"Instead of single-turn generation, we engineered a Three-Pass Adversarial Pipeline:*
  > *1. **Stage 1 (Evidence Assessor):** Evaluates claims strictly against supplied facts.*
  > *2. **Stage 2 (Adversarial Critic):** Actively attacks the initial reasoning to hunt for bias and missing variables.*
  > *3. **Stage 3 (Chief Judge):** Reconciles the debate without inventing outside facts and outputs a 'What Changed' diff."*

---

### [1:15 - 2:05] Scene 3: Live Multimodal Demo — Catching the Fine Print
- **Visual:** Click on the Curated Demo Pill: **"Quantum Supremacy Claim"**.
  - The claim loads into the input box: *"Quantum processor achieved 100,000x supremacy over supercomputers on general optimization."*
  - The attached chart (`sample_quantum_benchmark.png`) automatically displays in the visual evidence dropzone.
- **Action:** Click **"Challenge Claim"**.
- **Visual:** The multi-stage audit progress bar illuminates through Stage 1, Stage 2, and Stage 3.
- **Visual:** The Verdict Panel appears:
  - Final Adjudicated Verdict: **MIXED EVIDENCE** (Amber badge).
  - Assessment Soundness: **82%**.
  - Visual Observations: Gemma 4 highlights the fine print footnote: `*Benchmark executed solely on synthetic circuit sampling noise; does not represent general business optimization.`
  - **Verdict Diff View:** Shows how Stage 1 initially leaned *Supported*, but Stage 2 Adversarial Skeptic forced a downgrade to *Mixed*.
- **Voiceover:**
  > *"Watch what happened: The corporate text claimed general 100,000x speedups. But Gemma 4's multimodal vision inspected the attached benchmark chart, caught the fine-print footnote about synthetic noise, and shifted the verdict from Supported to Mixed!"*

---

### [2:05 - 2:35] Scene 4: Zero-Evidence Enforcement & Benchmark Evaluation
- **Visual:** Click on **"Miracle Detox Panacea"** demo.
- **Action:** Show the result classified as **CONTRADICTED** with high confidence, reading the nutrition label's 1,420mg sodium and mandatory FDA disclaimer.
- **Visual:** Click on the **"Benchmark"** button in the header.
- **Visual:** The **Gemma 4 Empirical Evaluation Benchmark Modal** opens.
  - Show the 3 KPI cards: 3.42s Avg Latency, 100% Structured Schema Compliance, 66.7% Adversarial Verdict Shift Rate.
- **Voiceover:**
  > *"When claims have zero empirical basis or deceptive health marketing, RealityCheck AI enforces strict evidentiary burden of proof instead of guessing. Our benchmark shows 100% JSON schema compliance with Gemma 4."*

---

### [2:35 - 3:00] Scene 5: DigitalOcean & Open-Source Readiness
- **Visual:** Switch to terminal or VS Code showing the repository:
  - Show `Dockerfile`, `docker-compose.yml`, and `.do/app.yaml`.
  - Show `pytest` running: `17 passed in 0.99s`.
  - Show printable HTML report generated via "Print Report".
- **Voiceover:**
  > *"RealityCheck AI is turnkey-ready for DigitalOcean deployment with Docker, App Platform spec, and complete automated tests. It represents the best of open-source AI and the best of Gemma 4."*
  > *"Thank you, and remember: Don't just trust an answer. Challenge it."*
