# How Shule+ report cards are created (full explanation)

This is a **plain-language, end-to-end** guide: what teachers enter, what the system stores, how numbers on the report card are produced, and how rows/columns/ranks are ordered. For formulas and file references, see [REPORT-CARDS-MARKS-LOGIC.md](./REPORT-CARDS-MARKS-LOGIC.md).

---

## The big picture

A report card is **not** a copy of a single quiz sheet. It is a **term summary per course (subject)** for one student, built from:

1. All **submitted** assessments for that class, year, and term  
2. An **assessment template** (e.g. QUIZ 50% + EXAM 50%)  
3. **Course totals (DEFAULT)** set in Academic → Courses  
4. The school **grading scale** (A, B, C… or E, F…)

Teachers enter marks in **TichaPortal** (or Academic marks entry). After assessments are **submitted** (not draft), Academic can generate the report card for each student.

```text
Teacher enters 32/40 on "Math Quiz 1"
        ↓
Stored as assessment mark (PRESENT, score=32, max=40)
        ↓
Grouped: Subject=Math, Component=QUIZ
        ↓
Converted to course scale using DEFAULT=40 and QUIZ weight 50%
        ↓
Report shows QUIZ column, course result, %, grade, class position
```

---

## Step 1 — What must exist before a report works

| Requirement | Where it is set | Why it matters |
|-------------|-----------------|----------------|
| Students in the class | Student Management | Report is per student |
| Assessments for class/subject/term | TichaPortal schedule / record marks | Source data |
| Marks **submitted** (not draft) | TichaPortal submit | Draft marks are ignored on reports |
| Mark status **PRESENT** | Marks entry | Absent/missing students don’t get a numeric score |
| Template (components + weights) | Academic → Assessments → Templates | Defines QUIZ/EXAM columns and % split |
| **DEFAULT** per course | Academic → Courses → Course catalog | Total marks for the course (e.g. Math 40, C.A 20) |
| Grading scale | Academic grading config | Letter grades on report |

If nothing submitted exists for that student/term, the API returns an error asking to enter and publish marks first.

---

## Step 2 — Loading assessments for the report

When you open **Report cards v2** for a student, the backend:

1. Finds the **class**, **academic year**, and **term**  
2. Loads all assessments for that class/term whose status is **not DRAFT**  
3. Loads all **PRESENT** marks (with scores) on those assessments  
4. Picks the **assessment template** (most used on those assessments, or the one **assigned** to the class for that term)  
5. Loads **DEFAULT** marks per subject from the course catalog (class + subject + year + term)  
6. Loads **core vs non-core** from Timetable course config (for row grouping only)

Only marks that are on the system and submitted participate. Unsaved teacher drafts on a open assessment may not appear until saved/submitted.

---

## Step 3 — How one quiz score becomes a report cell

Each mark is processed like this:

### 3.1 Raw performance on that assessment

```text
quizPercent = (studentScore ÷ assessmentMaxMark) × 100
```

Example: 32 ÷ 40 = **80%**

This is the same percentage teachers see in **Marks review** (`%` column).

### 3.2 Which column on the report?

Each assessment is linked to a **template component** (e.g. **QUIZ** or **EXAM**). All marks for that component under the same **subject** are grouped together.

If the teacher records **two quizzes** both under QUIZ, the system uses the **average** of their percentages for that component (not the sum of raw points).

### 3.3 Scaling to the course total (why you see /20 or /10)

The report does **not** show “out of 25” in the QUIZ column if the course DEFAULT is 20 and QUIZ is 50% of the course.

Instead it uses **normalized** marks on the **course scale**:

```text
componentMaxOnReport = DEFAULT × (componentWeight ÷ 100)
componentScoreOnReport = (componentAveragePercent ÷ 100) × componentMaxOnReport
```

**Examples:**

| Subject | DEFAULT | Component | Weight | Column max on report |
|---------|---------|-----------|--------|----------------------|
| Mathematics | 40 | QUIZ | 50% | 20 |
| Mathematics | 40 | EXAM | 50% | 20 |
| C.A | 20 | QUIZ | 50% | 10 |
| C.A | 20 | EXAM | 50% | 10 |

Teacher enters C.A Quiz 1 **13/25** → 52% → on report QUIZ shows about **5.2/10**, not 13/25. The UI can show the **entered** fraction as small text under the scaled value.

**Course result** for the subject:

```text
courseResult = sum of component scores on report   (e.g. QUIZ + EXAM)
denominator    = DEFAULT                           (e.g. 40)
totalPercent   = (courseResult ÷ DEFAULT) × 100
```

If only QUIZ is entered and EXAM is empty, **course result** is only the QUIZ part (e.g. 20/40 = 50%), not a full course until all weighted components have marks.

---

## Step 4 — Letter grade

For each subject with marks entered:

```text
subjectPercent → lookup on org grading scale → letter grade (and description)
```

The scale depends on school level (e.g. PRIMARY) and template/class hints. Edge percentages are matched to min/max bands on the scale.

Subjects with **no marks** show **—** for grade and position.

---

## Step 5 — Class position (rank)

**Position** (e.g. **1/20**) means: “Among classmates who have marks in this subject this term, this student’s **subject %** ranks here.”

Rules:

- Students **without** a score in that subject are **not** counted in the 20  
- **Ties:** two students with the same % share the same rank; next rank skips (1, 1, 3…) — standard competition ranking  
- This is **by subject**, not by row order on the page  

**Overall position** on the report header uses a similar tie rule on **overall %** (see below), not the average of positions.

---

## Step 6 — Overall % and summary blocks

### Overall percentage (header)

Among subjects where the student has marks:

```text
overallScore = (sum of course results in points) ÷ (sum of DEFAULT for those subjects) × 100
```

Example: only Math (20/40) and English (27/30) entered → (20+27)/(40+30)×100, **not** the average of 50% and 90% unless totals align that way.

### Other summary pieces

- **Strong courses / needs improvement:** top and bottom subjects by **subject %** (not table order)  
- **Growth / term trend:** from historical assessment marks across terms (where available)  
- **Comments, publication, verify code:** added when enriching the report for display/PDF  

---

## Step 7 — How the report **looks** (organization)

Important: **layout order ≠ rank order**.

| What you see | How it is ordered |
|--------------|-------------------|
| **Subject rows** | **Core** courses first, then **non-core**; within each group **A→Z by name** |
| **# column** | 1, 2, 3… in that display order — **not** class rank |
| **QUIZ / EXAM columns** | Template component **sort order** (or assessment component order) |
| **Position column** | Class rank by **subject %** (with ties) |
| Extra **empty** subjects | Sometimes listed from **timetable catalog** even with no marks yet |

So a student can be **1/20** in Mathematics while Mathematics appears as row 4 because rows are core/non-core + alphabetical.

---

## Step 8 — Multi-term and legacy paths

**Multiple terms on one card:** the system builds one report per term, then merges into one view with **per-term columns** under each subject.

**Legacy path:** if there are no submitted assessment marks but old **studentResult** rows exist in the database, the report may use those stored results instead. Most live schools use the **assessment marks** path described above.

---

## Step 9 — What teachers vs admins control

| Role | Action | Effect on report |
|------|--------|------------------|
| Teacher | Enter score / max on assessment | Drives quiz % and normalized columns |
| Teacher | Submit assessment | Marks become eligible for reports |
| Academic admin | Set **DEFAULT** in course catalog | Changes DEFAULT column and scaling (/20 vs /10) |
| Academic admin | Template weights (50/50) | Splits DEFAULT between QUIZ and EXAM |
| Academic admin | Core/non-core on courses | Row grouping only |
| Academic admin | Grading scale | Letter grades |
| Academic admin | Publish report | Visibility to parents/portal (publication layer) |

---

## Mental model (one paragraph)

Teachers record **real quiz/exam scores** on whatever **max** each assessment uses. The report **translates** those into a **standard course total (DEFAULT)** using template **weights**, averages multiple assessments in the same component, sums components for **course result**, converts to **subject %**, assigns **grades**, and ranks the student **per subject** against classmates. The **table sort** is for readability (core, then name); **position** is for performance rank.

---

## Quick reference card

```text
quiz %           = score ÷ quiz max × 100
component %      = average(quiz %) if multiple quizzes in same component
report cell      = component % applied to (DEFAULT × weight%)
course result    = sum(report component points) / DEFAULT
subject grade    = grading scale(subject %)
position         = rank of subject % in class (ties allowed)
row order        = core first, then A–Z (not by score)
```

---

## Related documentation

- [REPORT-CARDS-MARKS-LOGIC.md](./REPORT-CARDS-MARKS-LOGIC.md) — technical formulas, API path, troubleshooting, source files  
