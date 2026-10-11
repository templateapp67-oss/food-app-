# AI Studio Setup Guide (Hinglish)

## Sach pehle
- AI Studio ke andar koi *hard lock* nahi hota. System instructions sirf model ko roakte hain; model kabhi bhi tod sakta hai. Isliye **2 layer** hain:
  1. **AI ke andar:** system instructions + PLAN→GO approval + docs.
  2. **AI ke bahar (asli enforcement):** `tools/gate_check.py` + GitHub Action. AI ne jo bhi files banayi, ye check karta hai ki current phase mein allowed hain ya nahi. Fail = merge nahi.
- AI Studio ke current features (System instructions field, file attach, GitHub export, Build mode) maine apni taraf se verify nahi kiye; apne UI mein confirm karo.

## Modes
| Mode | Kab | Risk |
|---|---|---|
| **A. Chat mode (recommended)** | AI sirf code *text* deta hai, tum khud repo mein copy karte ho | Kam: AI files bana hi nahi sakta; gate_check phir bhi chalta hai |
| B. Build/app-generation mode | Agar AI direct project files banata hai | Zyada: ye design dekhte hi poora app bana deta hai. Use karo to gate_check + git review mandatory |
| Native Android | Hamesha A (Android Studio mein) | Build mode usually web app banata hai |

## Step-by-step
**Step 1 — Repo:** is bundle ko GitHub repo mein daalo (private). Structure:
```
CURRENT_PHASE            (sirf tum badalte ho)
docs/ (18 .md + ai-studio/)
supabase/ (migrations, tests)
tools/ (gate_check.py, file_registry.json)
.github/workflows/gate.yml
.gitignore
```
Pehla commit `main` par. GitHub mein branch protection: `main` par PR required + status check `doc-gate` required (agar tumhare plan mein available ho). Kabhi bhi AI ko `main` par direct push mat karne do.

**Step 2 — AI Studio:** naya chat. System instructions mein `docs/ai-studio/SYSTEM_INSTRUCTIONS.md` ka code block paste. Phir ye files attach karo: 00_MASTER, Build_Brief, PRD, 10_memory, 07_IMPLEMENTATIONPLAN, 09_Phases, 12_PHASE_PROMPTS, 08_TRACKER, `tools/file_registry.json`. Baaki docs **phase ke hisaab se** (neeche table). Sab ek saath attach karne se context bhar sakta hai.

| Phase | Extra docs to attach |
|---|---|
| 0 | sab 18 (read-only audit) |
| 1 | 02, 04, Engineering-Practices, Design, Visual |
| 2 | 05, 06, Engineering-Practices, 02 |
| 3 | 03, 11, Content, Design, Visual, 04 |
| 4 | 06, 02, 05, 04 |
| 5 | 06, 02, 05, 04 |
| 6 | 06, 05, 11 |
| 7 | 03, 11, 06, 05 |
| 8 | 03, 11, 05, 06 |
| 9–10 | Engineering-Practices, 09, 04, Build_Brief |

**Step 3 — Self-test:** `GATE_SELF_TEST.md` ke 8 tests. Sab pass hone chahiye. Fail = aage mat badho.

**Step 4 — Phase 0 (audit):** `12_PHASE_PROMPTS.md` ka Phase 0 prompt bhejo. AI sirf report text dega. Use `docs/AUDIT_REPORT.md` mein khud save karo.

**Step 5 — Har task ka loop (yahi rozana ka kaam):**
1. Tum: `Plan P1-01` (task `07_IMPLEMENTATIONPLAN.md` se).
2. AI: FILE PLAN table (code nahi). Tum check karo: har path 07 ke us task se aata hai? registry mein yes?
3. Tum: `GO P1-01 PHASE=1`
4. AI: sirf planned files. Tum repo mein copy karo.
5. Tum: `python3 tools/gate_check.py` → `RESULT: PASS` aana chahiye.
6. Tum: build/tests khud chalao (Android Studio / `npm test` / `supabase db reset`). Real output AI ko paste karo.
7. AI: tracker lines propose karta hai → tum `docs/08_TRACKER.md` mein paste karke commit karo (status tabhi DONE_VERIFIED jab real output ho).

**Step 6 — Phase badalna:** jab `09_Phases.md` ke exit criteria evidence ke saath poore hon, **tum** `CURRENT_PHASE` badalo aur *alag commit* karo (AI work se pehle). AI kabhi phase nahi badal sakta; CI base branch ka phase padhta hai.

**Step 7 — Design/screenshots ka sahi use:** jis chat mein build ho raha hai usme images mat daalo. Alag "Reference chat" kholo, wahan screenshots do, aur AI se sirf text spec mango (screen IDs, fields, states). Wo text tum `11_SCREENS.md` mein khud merge karo. Isse build chat mein koi design-trigger nahi bachta.

**Step 8 — Agar AI gate tod de:**
1. Output discard karo / `git restore` + `git clean -fd`.
2. Bhejo: `GATE RESET`. Phir wahi task dobara `Plan <id>` se.
3. Agar reply ki pehli line `DOC-GATE ACTIVE` nahi hai → naya chat, instructions dobara paste.
4. `10_memory.md` mein incident likho.

## Limits (ye ab bhi sach hain)
- Model instruction bhool sakta hai (lambi chat mein zyada). Chhote tasks + naye chat har phase mein.
- gate_check sirf *kaunsi files* check karta hai, ye nahi ki code sahi hai. Logic ke liye tests/RLS tests/review zaroori.
- Secret scan basic patterns pakadta hai, poora security audit nahi.
- CURRENT_PHASE, tools/ aur locked docs ko sirf tum badalna; GitHub review mein in files ke changes khud dekho.
