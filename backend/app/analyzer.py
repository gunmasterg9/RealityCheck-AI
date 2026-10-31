"""Analyzer service facade and report export utilities."""
import json
from typing import Dict, Any, Optional
from app.services.analysis_pipeline import AnalysisPipelineService
from app.schemas import AnalysisResponse

_pipeline_service: Optional[AnalysisPipelineService] = None

def get_pipeline_service() -> AnalysisPipelineService:
    global _pipeline_service
    if _pipeline_service is None:
        _pipeline_service = AnalysisPipelineService()
    return _pipeline_service

def generate_printable_html_report(data: Dict[str, Any]) -> str:
    """Generate a high-fidelity, self-contained printable HTML audit report."""
    claim = data.get("claim", "")
    context = data.get("context") or "None supplied."
    provider = data.get("provider_used", "Unknown")
    model = data.get("model_used", "Unknown")
    created_at = data.get("created_at", "")
    
    init = data.get("initial_assessment", {})
    init_verdict = init.get("initial_verdict", "N/A")
    init_conf = f"{float(init.get('confidence', 0)) * 100:.1f}%"
    init_reasoning = init.get("initial_reasoning", "")
    
    critique = data.get("adversarial_critique", {})
    challenges = critique.get("challenges", [])
    assumptions = critique.get("hidden_assumptions", [])
    missing = critique.get("missing_evidence_required", [])
    critique_summary = critique.get("critique_summary", "")

    final = data.get("final_judgment", {})
    final_verdict = final.get("verdict", "N/A")
    final_conf = f"{float(final.get('assessment_confidence', 0)) * 100:.1f}%"
    conf_explanation = final.get("confidence_explanation", "")
    summary = final.get("summary", "")
    what_changed = final.get("what_changed", "")
    visual_verifs = final.get("visual_verifications", [])
    support_ev = final.get("support_evidence", [])
    counter_ev = final.get("counter_evidence", [])
    final_assumptions = final.get("assumptions", [])
    unknowns = final.get("unknowns", [])
    limitations = final.get("limitations", [])

    # Color badge mapping
    verdict_colors = {
        "supported": ("#10b981", "#064e3b", "SUPPORTED"),
        "contradicted": ("#ef4444", "#450a0a", "CONTRADICTED"),
        "mixed": ("#f59e0b", "#451a03", "MIXED EVIDENCE"),
        "insufficient_evidence": ("#8b5cf6", "#2e1065", "INSUFFICIENT EVIDENCE")
    }
    v_border, v_bg, v_text = verdict_colors.get(final_verdict, ("#6b7280", "#111827", final_verdict.upper()))
    i_border, i_bg, i_text = verdict_colors.get(init_verdict, ("#6b7280", "#111827", init_verdict.upper()))

    def render_list(items):
        if not items:
            return "<li><em>None identified</em></li>"
        return "".join(f"<li>{item}</li>" for item in items)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RealityCheck AI Audit Report - {data.get("id", "")}</title>
  <style>
    @page {{
      size: A4;
      margin: 20mm;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1f2937;
      background: #ffffff;
      margin: 0;
      padding: 24px;
    }}
    .header {{
      border-bottom: 2px solid #8b5cf6;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .brand {{
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
    }}
    .tagline {{
      font-size: 13px;
      color: #6b7280;
      font-style: italic;
    }}
    .meta-box {{
      font-size: 12px;
      color: #4b5563;
      text-align: right;
    }}
    .section {{
      margin-bottom: 24px;
      page-break-inside: avoid;
    }}
    .section-title {{
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4338ca;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      margin-bottom: 12px;
    }}
    .claim-box {{
      background: #f8fafc;
      border-left: 4px solid #6366f1;
      padding: 14px 18px;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 600;
      color: #1e1b4b;
    }}
    .context-box {{
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      color: #374151;
      white-space: pre-wrap;
    }}
    .verdict-comparison {{
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }}
    .verdict-card {{
      flex: 1;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
    }}
    .final-card {{
      border: 2px solid {v_border};
      background: #ffffff;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }}
    .badge-init {{
      background: {i_bg};
      color: {i_border};
      border: 1px solid {i_border};
    }}
    .badge-final {{
      background: {v_bg};
      color: {v_border};
      border: 1px solid {v_border};
    }}
    .confidence {{
      font-size: 13px;
      margin-top: 8px;
      color: #4b5563;
    }}
    .diff-box {{
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 13px;
      color: #1e40af;
      margin-bottom: 16px;
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }}
    .card {{
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 14px;
      background: #ffffff;
    }}
    .card h4 {{
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 13px;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    ul {{
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      color: #374151;
    }}
    li {{
      margin-bottom: 6px;
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }}
    @media print {{
      body {{
        padding: 0;
      }}
      .no-print {{
        display: none;
      }}
    }}
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="brand">RealityCheck AI</div>
      <div class="tagline">Don't just trust an answer. Challenge it.</div>
    </div>
    <div class="meta-box">
      <div><strong>Audit ID:</strong> {data.get("id", "")}</div>
      <div><strong>Date:</strong> {created_at}</div>
      <div><strong>Provider:</strong> {provider} ({model})</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Investigated Claim</div>
    <div class="claim-box">{claim}</div>
  </div>

  <div class="section">
    <div class="section-title">Supplied Context & Evidence</div>
    <div class="context-box">{context}</div>
  </div>
  {"<div class='section'><div class='section-title'>Gemma 4 Visual Observations</div><div class='card'><ul>" + render_list(visual_verifs) + "</ul></div></div>" if visual_verifs else ""}

  <div class="section">
    <div class="section-title">Epistemic Adjudication & Verdict Shift</div>
    <div class="verdict-comparison">
      <div class="verdict-card">
        <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 4px;">STAGE 1: INITIAL ASSESSMENT</div>
        <div class="badge badge-init">{i_text}</div>
        <div class="confidence"><strong>Initial Confidence:</strong> {init_conf}</div>
        <p style="font-size: 12px; color: #4b5563; margin-top: 8px;">{init_reasoning}</p>
      </div>
      <div class="verdict-card final-card">
        <div style="font-size: 12px; font-weight: 600; color: #4338ca; margin-bottom: 4px;">STAGE 3: RECONCILED FINAL JUDGMENT</div>
        <div class="badge badge-final">{v_text}</div>
        <div class="confidence"><strong>Assessment Soundness:</strong> {final_conf}</div>
        <p style="font-size: 12px; color: #1f2937; margin-top: 8px; font-weight: 500;">{summary}</p>
      </div>
    </div>
    
    <div class="diff-box">
      <strong>What Changed Through Adversarial Audit:</strong> {what_changed}
    </div>
    <div style="font-size: 12px; color: #4b5563; background: #f3f4f6; padding: 10px 14px; border-radius: 4px;">
      <strong>Confidence Clarity:</strong> {conf_explanation}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Adversarial Critique & Hidden Assumptions</div>
    <div class="grid-2">
      <div class="card">
        <h4>Adversarial Challenges</h4>
        <ul>{render_list(challenges)}</ul>
      </div>
      <div class="card">
        <h4>Hidden Assumptions Detected</h4>
        <ul>{render_list(assumptions)}</ul>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Evidence Breakdown</div>
    <div class="grid-2">
      <div class="card" style="border-left: 3px solid #10b981;">
        <h4 style="color: #065f46;">Verified Support Items</h4>
        <ul>{render_list(support_ev)}</ul>
      </div>
      <div class="card" style="border-left: 3px solid #ef4444;">
        <h4 style="color: #991b1b;">Counter-Evidence / Objections</h4>
        <ul>{render_list(counter_ev)}</ul>
      </div>
    </div>
    <div class="grid-2" style="margin-top: 14px;">
      <div class="card" style="border-left: 3px solid #f59e0b;">
        <h4 style="color: #92400e;">Unverified Assumptions</h4>
        <ul>{render_list(final_assumptions)}</ul>
      </div>
      <div class="card" style="border-left: 3px solid #8b5cf6;">
        <h4 style="color: #5b21b6;">Missing Critical Unknowns</h4>
        <ul>{render_list(unknowns)}</ul>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Explicit System Limitations</div>
    <div class="card" style="background: #fafafa;">
      <ul>{render_list(limitations)}</ul>
    </div>
  </div>

  <div class="footer">
    Generated by RealityCheck AI • Independent Evidence-Aware Adversarial Analysis Platform • Not legal or factual certification.
  </div>
</body>
</html>"""
    return html

