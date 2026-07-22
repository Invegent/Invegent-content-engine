import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
TARGETS = [ROOT/"supabase/functions/image-worker/creative_contract.ts",
           ROOT/"supabase/functions/ai-worker/creative_contract.ts"]
OLD = """      Object.freeze({ field: 'category', value: 'AI & AUTOMATION' }),
      Object.freeze({ field: 'date', value: 'render date (today)' }),
      Object.freeze({ field: 'footer', value: 'Invegent' }),
      Object.freeze({ field: 'location', value: '' }),
"""
NEW = """      Object.freeze({ field: 'category', value: 'AI & AUTOMATION' }),
      Object.freeze({ field: 'date', value: 'render date (today)' }),
      Object.freeze({ field: 'footer', value: 'Invegent' }),
      Object.freeze({ field: 'location', value: '' }),
      // cc-0049: the quote-card winner (generic_quote_card_1x1_v1) has Attribution +
      // SourceLabel dynamic text elements that no B1Fields member fed. These are PK-AUTHORED
      // brand values (Gate-1 2026-07-22) and live HERE, per-client, NOT in the template-keyed
      // winner map — a template-keyed literal would leak Invegent's brand onto any other
      // client selecting the same winner (property-pulse holds a visually_approved assignment
      // on this exact template).
      Object.freeze({ field: 'attribution', value: 'Invegent \u2014 AI & Automation' }),
      Object.freeze({ field: 'source_label', value: 'invegent.com' }),
"""
fail=[]
for p in TARGETS:
    s=p.read_text(encoding="utf-8")
    if "'attribution'" in s: fail.append(f"{p}: already patched"); continue
    if s.count(OLD)!=1: fail.append(f"{p}: anchor count {s.count(OLD)}"); continue
    p.write_text(s.replace(OLD,NEW,1), encoding="utf-8", newline="")
    print("PATCHED", p.name)
if fail: print("FAILED:",*fail,sep="\n  "); sys.exit(1)
print("OK")
