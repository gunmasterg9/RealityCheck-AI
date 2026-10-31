import os
from PIL import Image, ImageDraw

os.makedirs('frontend/public/samples', exist_ok=True)
os.makedirs('backend/samples', exist_ok=True)

# 1. Quantum Benchmark Chart
img1 = Image.new('RGB', (800, 500), color='#0f172a')
draw1 = ImageDraw.Draw(img1)
draw1.rectangle([(20, 20), (780, 480)], outline='#38bdf8', width=2)
draw1.text((40, 40), '128-Qubit QPU Acceleration Benchmark Report', fill='#f8fafc')
draw1.text((40, 70), 'Metric: Runtime on 53-cycle circuit sampling depth', fill='#94a3b8')

# Bar 1 - Classical
draw1.text((50, 130), 'Classical Supercomputer Cluster (64k Cores): 345,600 sec (~4 days)', fill='#f87171')
draw1.rectangle([(50, 160), (750, 200)], fill='#ef4444')

# Bar 2 - Quantum
draw1.text((50, 240), 'Quantum Processor (128-Qubit Superconducting): 3.2 sec (100,000x Speedup)', fill='#34d399')
draw1.rectangle([(50, 270), (120, 310)], fill='#10b981')

# Footnote box
draw1.rectangle([(40, 370), (760, 450)], fill='#1e293b', outline='#64748b')
draw1.text((50, 385), '* CRITICAL BENCHMARK DISCLOSURE / LIMITATION:', fill='#fbbf24')
draw1.text((50, 410), 'Benchmark executed solely on pseudo-random synthetic circuit sampling.', fill='#cbd5e1')
draw1.text((50, 430), 'Does not generalize to real-world business optimization, logistics, or Shor algorithm.', fill='#94a3b8')

img1.save('frontend/public/samples/sample_quantum_benchmark.png')
img1.save('backend/samples/sample_quantum_benchmark.png')

# 2. Miracle Detox Supplement Label
img2 = Image.new('RGB', (800, 520), color='#1e1b4b')
draw2 = ImageDraw.Draw(img2)
draw2.rectangle([(20, 20), (780, 500)], outline='#f43f5e', width=2)
draw2.text((40, 40), 'Himalayan Pink Salt and Lemon Morning Elixir', fill='#fde047')
draw2.text((40, 70), 'Promotional Claim: Cures Metabolic Resistance and Melts Inflammation in 7 Days', fill='#f87171')

# Nutrition Facts Box
draw2.rectangle([(40, 110), (420, 350)], fill='#0f172a', outline='#e2e8f0', width=2)
draw2.text((50, 120), 'NUTRITION FACTS AND INGREDIENT DOSING', fill='#ffffff')
draw2.line([(50, 145), (410, 145)], fill='#ffffff', width=2)
draw2.text((50, 160), 'Serving Size: 1 Scoop (15g in warm water)', fill='#cbd5e1')
draw2.text((50, 190), 'Sodium: 1,420 mg  (62% Daily Value) *DANGEROUSLY HIGH', fill='#f87171')
draw2.text((50, 220), 'Added Sugars (Agave/Cane): 14 g (28% DV)', fill='#fbbf24')
draw2.text((50, 250), 'Citric Acid Extract: 250 mg', fill='#cbd5e1')
draw2.text((50, 280), 'Proprietary Metabolic Reset Blend: 50 mg (Unverified)', fill='#f87171')

# Warning Box
draw2.rectangle([(440, 110), (760, 350)], fill='#450a0a', outline='#ef4444', width=2)
draw2.text((450, 125), 'MANDATORY REGULATORY DISCLAIMER', fill='#fca5a5')
draw2.text((450, 155), 'High sodium intake elevates systolic', fill='#ffffff')
draw2.text((450, 175), 'blood pressure and may worsen metabolic', fill='#ffffff')
draw2.text((450, 195), 'and renal syndromes.', fill='#ffffff')
draw2.text((450, 235), '*These statements have not been', fill='#fecdd3')
draw2.text((450, 255), 'evaluated by the FDA. This product is', fill='#fecdd3')
draw2.text((450, 275), 'NOT intended to diagnose, treat, cure,', fill='#fecdd3')
draw2.text((450, 295), 'or prevent any metabolic disease.', fill='#fecdd3')

draw2.text((40, 460), 'Batch Tested: No clinical double-blind trials conducted. Anecdotal influencer claims only.', fill='#94a3b8')

img2.save('frontend/public/samples/sample_miracle_detox_label.png')
img2.save('backend/samples/sample_miracle_detox_label.png')

# 3. Denmark Renewable Energy Chart
img3 = Image.new('RGB', (800, 500), color='#064e3b')
draw3 = ImageDraw.Draw(img3)
draw3.rectangle([(20, 20), (780, 480)], outline='#10b981', width=2)
draw3.text((40, 40), 'Danish Energy Agency and Eurostat Verified Grid Report', fill='#6ee7b7')
draw3.text((40, 70), 'Gross Domestic Electricity Consumption by Source (Operational Years 2021-2023)', fill='#e2e8f0')

# Breakdown stats
draw3.rectangle([(50, 120), (750, 170)], fill='#047857')
draw3.text((70, 135), 'Wind Generation (Onshore and Offshore): 48.2% of Total Gross Consumption', fill='#ffffff')

draw3.rectangle([(50, 190), (750, 240)], fill='#059669')
draw3.text((70, 205), 'Solar PV Generation: 7.8% of Total Gross Consumption', fill='#ffffff')

draw3.rectangle([(50, 260), (750, 310)], fill='#10b981')
draw3.text((70, 275), 'Combined Wind + Solar Share: 56.0% (Exceeds 50% Threshold Verified)', fill='#0f172a')

# Notes on interconnectors
draw3.rectangle([(40, 350), (760, 450)], fill='#022c22', outline='#34d399')
draw3.text((50, 365), 'Grid Balancing Interconnection Capacity:', fill='#6ee7b7')
draw3.text((50, 390), 'Norway Hydro Interconnector: 1,630 MW | Sweden Interconnector: 1,900 MW', fill='#cbd5e1')
draw3.text((50, 415), 'Germany Synchronous AC Tie-lines: 2,500 MW (Supports intermittency storage)', fill='#a7f3d0')

img3.save('frontend/public/samples/sample_denmark_energy_chart.png')
img3.save('backend/samples/sample_denmark_energy_chart.png')

print('All 3 multimodal sample images successfully generated.')

