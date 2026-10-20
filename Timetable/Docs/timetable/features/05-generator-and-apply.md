# 05 — Generator and Apply

## Generate preview

1. Open **Generator** tab.
2. Select class(es), term, and academic year.
3. Click **Generate preview**.
4. Review coverage (placed vs expected) for **selected classes only**.

The engine schedules **all selected classes together** (shared teachers are respected), tries **three placement orders**, and keeps the best preview.

## Soft vs hard rules

| Rule type | Examples | Fill / retry behavior |
|-----------|----------|------------------------|
| **Soft** | Morning/afternoon preference, preferred period numbers, preferred days, double-period preference | Relaxed by **Fill missing periods** and later passes of generate |
| **Hard** | Teacher already teaching elsewhere, class already busy, lab required but unavailable | Must fix in assignments, Timetable drag-and-drop, or **Conflict Center** |

## Fill missing periods

Use when preview (or live timetable) is **underfilled**:

1. Keeps existing placements.
2. Targets subjects with missing periods first (most constrained first).
3. Relaxes soft rules step by step; does **not** double-book teachers or classes.

If fill cannot place periods, read **blocker tags** and per-row **What to do** advice on the Generator tab.

## Apply

1. Accept the preview result.
2. Click **Apply**.
3. Confirm rows appear on the **Timetable** tab.

## Retry generate

Rebuilds the full preview from scratch (three strategies). Use after changing assignments, course rules, or teacher profiles.

## Regenerate

Clears placed rows for selected classes, generates, and applies in one step.

## Clear

`Clear` removes placed rows for selected classes (assignments are kept).

## When many teacher clashes appear

Typical causes:

- One teacher assigned to more classes than there are free periods in the week.
- Other classes (not in the selection) already lock the teacher — those rows still count as busy.

**Recommended workflow:** generate **one or two classes → Apply →** add more classes; use **Conflict Center** for overlaps after apply.
