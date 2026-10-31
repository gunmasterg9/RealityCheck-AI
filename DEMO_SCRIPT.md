# RealityCheck AI 2.0 — 3-Minute Hackathon Video Demo Script

> **Video Title:** RealityCheck AI 2.0 — Real-Time Fact Verification Platform  
> **Tagline:** Don't just trust an answer. Challenge it.  
> **Target Audience:** Hackathon Judges (DigitalOcean & Google Gemma Tracks)  
> **Duration:** 3 Minutes (180 Seconds)

---

### [0:00 - 0:30] Scene 1: The Problem — AI Sycophancy & Viral Disinformation
- **Visual:** Open browser showing typical chatbot sycophantically agreeing with a dubious viral forward ("Yes! Drinking lemon salt water cures diabetes in 7 days!").
- **Voiceover:**
  > *"Large Language Models have a dangerous flaw: sycophancy. Ask an AI if a dubious health trend, viral WhatsApp forward, or marketing claim is true, and it will often validate whatever premise you feed it."*
  > *"We built **RealityCheck AI 2.0**—an evidence-aware, real-time fact-checking platform powered by Google Gemma 4. Its motto: Don't just trust an answer. Challenge it."*
- **Action:** Transition to the RealityCheck AI Dark Analytical Dashboard (`http://localhost:5173`).

---

### [0:30 - 1:15] Scene 2: The Core Architecture & 6-Stage Real-Time Pipeline
- **Visual:** Zoom in on the Header with the **Gemma 4 Local Indicator** (`gemma4:e4b` on Ollama) and the **Dual-Prize Target Badge**.
- **Voiceover:**
  > *"RealityCheck AI is 100% open-source and operates completely locally using open-weight Gemma 4 on consumer GPUs—no proprietary cloud APIs required."*
  > *"Instead of single-turn guessing, RealityCheck AI 2.0 executes an automated 6-stage real-time pipeline:*
  > *1. **Stage 1 (Classification & Extraction):** Detects URLs, social media posts, screenshots, or viral forwarded messages—including native Hindi and Gujarati script support.*
  > *2. **Stage 2 (Safe Source Retrieval):** Executes SSRF-protected web crawling, Google Fact Check Tools ClaimReview queries, and web searches.*
  > *3. **Stage 3 (Evidence Alignment):** Groups excerpts into supporting, contradicting, and contextual corpora.*
  > *4. **Stage 4 (Gemma 4 Reasoner):** Synthesizes empirical evidence with prompt-injection fencing.*
  > *5. **Stage 5 (Adversarial Critic):** Challenges initial findings, catches outdated recycled hoaxes, and tests assumptions.*
  > *6. **Stage 6 (Chief Judge):** Reconciles disagreements, explains 'What Changed', and attaches clickable source citations."*

---

### [1:15 - 2:00] Scene 3: Live Multimodal Demo — Catching the Fine Print
- **Visual:** Click on the Curated Demo Pill: **"Quantum Supremacy Claim"**.
  - The claim loads into the input box: *"Quantum processor achieved 100,000x supremacy over supercomputers on general optimization."*
  - The attached chart (`sample_quantum_benchmark.png`) automatically displays in the visual evidence dropzone.
- **Action:** Click **"Verify with Real-Time Evidence"**.
- **Visual:** The 6-stage stepper illuminates across Stage 1 through Stage 6.
- **Visual:** The Verdict Panel appears:
  - Final Adjudicated Verdict: **MIXED EVIDENCE** (Amber badge).
  - Assessment Soundness: **82%**.
  - Visual Observations: Gemma 4 highlights the fine print footnote: `*Benchmark executed solely on synthetic circuit sampling noise; does not represent general business optimization.`
  - **Verdict Diff View:** Shows how Stage 1 initially leaned *Supported*, but Stage 5 Adversarial Critic forced a downgrade to *Mixed*.
- **Voiceover:**
  > *"Watch what happened: The text claimed general 100,000x speedups. But Gemma 4's multimodal vision inspected the attached benchmark chart, caught the fine-print footnote about synthetic noise, and shifted the verdict from Supported to Mixed!"*

---

### [2:00 - 2:30] Scene 4: Regional Language Viral Forward & ClaimReview Integration
- **Visual:** Click on **"Viral Forward: 7-Day Diabetes Cure (Hindi)"** demo.
- **Visual:** The input bar instantly displays the **"🇮🇳 Hindi (हिंदी) Detected"** badge.
- **Action:** Click **"Verify with Real-Time Evidence"**.
- **Visual:**
  - The **Google Fact Check Tools Banner** displays matching ClaimReviews from Vishvas News and BoomLive rating it **FALSE**.
  - The **Evidence Corpus Grid** highlights contradicting medical records with clickable source links.
  - Final Verdict: **FALSE / CONTRADICTED** (Red badge).
- **Voiceover:**
  > *"When viral forwarded messages circulate in regional Indian languages, RealityCheck AI detects the script, searches the Google Fact Check Tools database, retrieves clinical consensus, and debunks false claims with traceable citations."*

---

### [2:30 - 3:00] Scene 5: DigitalOcean & Open-Source Readiness
- **Visual:** Switch to terminal showing:
  - Show `Dockerfile`, `docker-compose.yml`, and `.do/app.yaml`.
  - Show `pytest` running: `25 passed in 8.77s`.
  - Show printable HTML report generated via "Print Report".
- **Voiceover:**
  > *"RealityCheck AI 2.0 is turnkey-ready for DigitalOcean deployment with Docker, App Platform spec, and complete automated tests. It represents the best of open-source AI and the best use of Gemma 4."*
  > *"Thank you, and remember: Don't just trust an answer. Challenge it."*

