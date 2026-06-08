# Textbook Question Generation — Complete Working Guide

> **For**: Pranav (solo founder, Drut)
> **Goal**: Fill the EAPCET question bank with high-quality, curriculum-aligned questions generated from textbooks using Claude Projects.
> **Deadline**: Closed beta launch — mid-June 2026 (500 waitlist users)

---

## The Goal

Generate high-quality MCQs from NCERT textbooks using Claude, paste the JSON output into the StagingManager on the web app, and promote them to the live question bank. Each question gets verified once, then served to students forever via both the web and mobile apps.

---

## Current State of Question Bank

| Subject | Coverage |
|---------|----------|
| **Physics** | Strongest coverage |
| **Chemistry** | 🔴 Critical gap (~5 questions only) |
| **Mathematics** | 🟠 Thin outside a few topics |

**Total**: 2057 cached questions, ~700 EAPCET-specific. Mostly PYQs, very few textbook-generated.

---

## The 3-Step Workflow

### Step 1: Generate questions in Claude Projects
Use your existing **"Textbook Writer"** Claude Project (or create one). Feed it:
- A chapter from NCERT Class 11/12 textbook (PDF, screenshots, or pasted text)
- The prompt template below

### Step 2: Paste into StagingManager
- Open your web app → admin → StagingManager component
- Big text area at the top — paste the JSON array
- Click **Import** → questions land in `staging_questions` table with status `textbook_verified`

### Step 3: Promote
- Each row has a **Promote** button (or bulk-promote them all)
- Promotion writes to `cached_questions` with `verification_status: v3-verified-textbook`
- Mobile + web practice sessions immediately start serving these questions

---

## Exact JSON Format

Every question MUST look exactly like this:

```json
{
  "questionText": "Which of the following has the maximum number of unpaired electrons?",
  "options": [
    { "text": "Mg²⁺" },
    { "text": "Ti³⁺" },
    { "text": "V³⁺" },
    { "text": "Fe²⁺" }
  ],
  "correctOptionIndex": 3,
  "subject": "Chemistry",
  "chapter": "d and f Block Elements",
  "examProfile": "ap_eapcet",
  "difficulty": "Medium",
  "source_type": "textbook"
}
```

### Field Rules (strict — validation will reject bad data)

| Field | Type | Allowed Values |
|-------|------|----------------|
| `questionText` | string | Non-empty. LaTeX with `\\(` and `\\)` |
| `options` | array | **Exactly 4** objects with `text` field |
| `correctOptionIndex` | number | `0`, `1`, `2`, or `3` |
| `subject` | string | `"Mathematics"`, `"Physics"`, `"Chemistry"` (exact casing!) |
| `chapter` | string | NCERT chapter name |
| `examProfile` | string | `"ap_eapcet"` or `"ts_eapcet"` |
| `difficulty` | string | `"Easy"`, `"Medium"`, `"Hard"` |
| `source_type` | string | **Must be `"textbook"`** |

### Optional Fields
- `requiresDiagram`: `true` for questions that need a figure
- `sourceNote`: e.g. `"NCERT Class 12 Ch.8"` for traceability

### Never Include for textbook questions
- ❌ `year` (only PYQs have a year)
- ❌ `theOptimalPath` / `fullStepByStep` (system handles pedagogy separately)

---

## Prompt Template for Claude

Copy this into your Claude conversation, replacing `<CHAPTER CONTENT>` at the bottom with the textbook section:

```
You are generating EAPCET (Engineering Agriculture and Pharmacy Common Entrance Test)
practice questions for Indian Class 11/12 students from the NCERT textbook content below.

Generate 20 multiple-choice questions covering this chapter. Mix of:
- 8 Easy (direct concept recall, formula application)
- 8 Medium (multi-step reasoning, combining concepts)
- 4 Hard (tricky cases, common student misconceptions, exam-style traps)

Output ONLY a JSON array with no markdown fences, no commentary. Each question must match:

[
  {
    "questionText": "...",
    "options": [
      { "text": "..." },
      { "text": "..." },
      { "text": "..." },
      { "text": "..." }
    ],
    "correctOptionIndex": 0,
    "subject": "Chemistry",
    "chapter": "<exact chapter name>",
    "examProfile": "ap_eapcet",
    "difficulty": "Easy",
    "source_type": "textbook",
    "sourceNote": "NCERT Class 12 Ch.<X>"
  }
]

Rules:
- Exactly 4 options per question
- correctOptionIndex must point to the correct answer (0-3)
- Use LaTeX for math: \\(x^2 + 1\\) inline, \\[E = mc^2\\] block
- Questions should test understanding, not just memory
- Distractors should be plausible (common mistakes students make)
- For Hard questions, include exam-style traps
- Distribute correctOptionIndex across 0, 1, 2, 3 — don't make it always 0

[CHAPTER CONTENT BELOW]
<paste the textbook section here>
```

---

## Priority Generation Order

### 🔴 URGENT — Before Beta Launch (June 15)

**Target: 500+ Chemistry questions, 300+ Math questions before beta**

#### Chemistry Class 11
- Atomic Structure
- Chemical Bonding and Molecular Structure
- Thermodynamics
- Equilibrium
- Hydrocarbons

#### Chemistry Class 12
- Solutions
- Electrochemistry
- Chemical Kinetics
- d and f Block Elements
- Coordination Compounds
- Aldehydes, Ketones and Carboxylic Acids

#### Math Class 11
- Trigonometric Functions
- Complex Numbers and Quadratic Equations
- Permutations and Combinations
- Conic Sections
- Limits and Derivatives

#### Math Class 12
- Matrices
- Determinants
- Continuity and Differentiability
- Application of Derivatives
- Integrals
- Probability

### 🟡 MEDIUM — Post-Beta
- Fill Physics gaps where coverage is thin
- Add more Hard-tier questions across all subjects
- Add `ts_eapcet`-tagged variants for state-specific tweaks

---

## Suggested Batch Sizes

| Stage | Recommended Size | Why |
|-------|-----------------|-----|
| Per Claude conversation | **20 questions** | Good balance of variety vs context |
| Per StagingManager paste | **Up to 50 questions** | Validation chunks at 50 |
| Per chapter (full coverage) | **50-100 questions** | Enough for repeated practice without repetition |

---

## Quality Checklist Before Promoting

For each batch, spot-check 3-4 questions:

- [ ] The 4 options are distinct and plausible
- [ ] `correctOptionIndex` actually points to the right answer
- [ ] LaTeX renders correctly (test in StagingManager preview)
- [ ] Chapter name matches what students will see in the chapter selector
- [ ] Difficulty feels right (not all "Medium" mislabeled as Easy)
- [ ] Correct answer isn't always option 0 (Claude has a bias toward this)

**If a question is wrong → delete the row before promoting** (no rollback after promote, currently).

---

## How to Verify Your Questions Are Live

After promoting:
1. Open the mobile app or web app
2. Go to Practice → select the subject → select the chapter you just added → start session
3. Your questions should appear in the rotation

### If they don't appear:
- Check that `verification_status` got set to `v3-verified-textbook`
- Check that the chapter name in the question **exactly matches** the chapter selector (case-sensitive)
- Check the question's `examProfile` matches the user's selected exam

---

## Tips for Better Question Quality

### ✅ DO
- Test specific EAPCET patterns (loves numerical problems with shortcuts)
- Use the textbook's own worked examples — modify into MCQs with traps
- Make distractors **plausible** (common student mistakes, not random nonsense)
- Vary the structure — some calculation, some conceptual, some application
- Include units in answers for physics/chemistry where relevant

### ❌ DON'T
- Generate trivial recall ("What is the SI unit of force?" is too easy)
- Make options ambiguous (each should be clearly right or clearly wrong)
- Always put the correct answer at position 0
- Use vague phrasings like "all of the above" or "none of the above" excessively
- Reuse the exact same numerical values across questions

---

## Technical Reference

### Verification Status Lifecycle
```
staging_questions.status:
  textbook_verified → (on promote) → published

cached_questions.verification_status:
  v3-verified-textbook  ← this is what gets set after promotion
```

### Question Routing
- Mobile app's `usePracticeQuestions` hook filters for trusted sources only:
  ```
  TRUSTED_STATUSES = [
    'v3-verified-pyq',
    'v3-verified-textbook',  ← yours land here
    'v3-verified-rag',
    '2.6',
    'SubjectFallback'
  ]
  ```

### Question ID Format (auto-generated on promotion)
- Textbook: `tb-ap_eapcet-tb-<uuid8>`
- PYQ: `pyq-ap_eapcet-<year>-<uuid8>`

---

## Workflow Tips

1. **Open NCERT PDF in one window, Claude in another, StagingManager in a third**
2. **Process one chapter at a time** — easier to track quality and chapter naming
3. **Batch your work**: Generate 100 questions, spot-check 10, then bulk-promote
4. **Save your prompt as a Claude Project instruction** so you don't re-type it each time
5. **Keep a log** of which chapters you've covered (a simple checklist in this file works)

---

## Coverage Tracking

Update this section as you generate questions:

### Chemistry
- [ ] Atomic Structure (Class 11)
- [ ] Chemical Bonding and Molecular Structure (Class 11)
- [ ] Thermodynamics (Class 11)
- [ ] Equilibrium (Class 11)
- [ ] Hydrocarbons (Class 11)
- [ ] Solutions (Class 12)
- [ ] Electrochemistry (Class 12)
- [ ] Chemical Kinetics (Class 12)
- [ ] d and f Block Elements (Class 12)
- [ ] Coordination Compounds (Class 12)
- [ ] Aldehydes, Ketones and Carboxylic Acids (Class 12)

### Mathematics
- [ ] Trigonometric Functions (Class 11)
- [ ] Complex Numbers and Quadratic Equations (Class 11)
- [ ] Permutations and Combinations (Class 11)
- [ ] Conic Sections (Class 11)
- [ ] Limits and Derivatives (Class 11)
- [ ] Matrices (Class 12)
- [ ] Determinants (Class 12)
- [ ] Continuity and Differentiability (Class 12)
- [ ] Application of Derivatives (Class 12)
- [ ] Integrals (Class 12)
- [ ] Probability (Class 12)

### Physics (Post-Beta Priority)
- [ ] (fill gaps as identified during beta)
