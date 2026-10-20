# Git Workflows — ShulePlus Team Guide

This document describes how every ShulePlus developer should branch, merge, and integrate work across modules **without losing changes or creating unnecessary conflicts**.

Use this guide whenever you combine team branches or prepare work for `develop`.

---

## Branch model

```
main                    → production-ready releases
develop                 → integration branch (all team work lands here)
features/<ModuleName>   → one branch per team/module
integration/*           → optional temporary branch for multi-team merges
```

| Branch | Purpose |
|--------|---------|
| `main` | Stable, deployable code |
| `develop` | Shared integration line — pull from here often |
| `features/InventoryMIS` | Inventory + Task MIS team |
| `features/ActionPlanMIS` | Action Plan MIS team |
| `feature/authentication` | Auth, HR, Payroll, shared platform UI |
| `integration/all-team-work` | Safe sandbox to merge multiple feature branches before `develop` |

---

## Golden rules (prevents most conflicts)

| Rule | Why |
|------|-----|
| **Each team owns one module folder** | e.g. `Payroll/`, `HR/`, `InventoryMIS/`, `ActionPlanMIS/` |
| **Do not edit another team's module** | Cross-module edits are the main source of merge conflicts |
| **Shared code has one owner** | `Authentication/`, `packages/ui/`, `SampleModule/` — coordinate before changing |
| **Commit and push daily** | Unpushed local work is invisible to teammates |
| **Pull `develop` before starting new work** | Keeps your branch close to everyone else |
| **One feature = one branch** | e.g. `features/Payroll`, `features/ActionPlanMIS` |

---

## Standard workflow for every developer

### 1. Start from latest `develop`

```powershell
cd C:\Users\user\Videos\ShulePlus
git checkout develop
git pull origin develop
git checkout -b features/YourModule
```

### 2. Work only in your module folder

Examples:

- Payroll team → `Payroll/`
- HR team → `HR/`
- Inventory team → `InventoryMIS/`, `TaskMIS/`
- Action Plan team → `ActionPlanMIS/`

Avoid editing `SampleModule/`, `Authentication/`, or `packages/ui/` unless your team owns shared platform work.

### 3. Commit and push regularly

```powershell
git add Payroll/
git commit -m "feat(payroll): add salary payment export"
git push -u origin features/YourModule
```

### 4. Stay synced with `develop` (weekly or before merge)

```powershell
git fetch origin
git checkout features/YourModule
git merge origin/develop
# resolve conflicts in your module only, then:
git add .
git commit -m "chore: sync with develop"
git push
```

---

## Full merge workflow (integrator / team lead)

Follow these steps **every time** you combine multiple team branches.

### Phase 1 — Save your work

```powershell
git status
```

If you have uncommitted changes, choose one:

```powershell
# Option A: Commit (recommended)
git add -A
git commit -m "WIP: describe your changes"

# Option B: Stash temporarily
git stash push -u -m "before merge - $(Get-Date -Format 'yyyy-MM-dd')"
```

**Never start a merge with dirty uncommitted work** unless it is stashed first.

---

### Phase 2 — Fetch latest from GitHub

```powershell
git fetch origin
git branch -a
```

If you see `credential-manager-core` warnings, fix once:

```powershell
git config --global credential.helper manager
```

---

### Phase 3 — Create an integration branch

Do not merge several feature branches directly into `develop` in one shot. Use an integration branch:

```powershell
git checkout develop
git pull origin develop
git checkout -b integration/all-team-work
```

If the branch already exists:

```powershell
git checkout integration/all-team-work
git pull origin develop
```

---

### Phase 4 — Merge one team branch at a time

Merge **one branch per command**. Resolve conflicts before merging the next branch.

```powershell
# 1. Authentication / shared platform
git merge feature/authentication -m "Merge feature/authentication"

# 2. Inventory + Task MIS
git merge origin/features/InventoryMIS -m "Merge features/InventoryMIS"

# 3. Action Plan MIS
git merge origin/features/ActionPlanMIS -m "Merge features/ActionPlanMIS"

# 4. Add more as teams ship work:
# git merge origin/features/Payroll -m "Merge features/Payroll"
# git merge origin/features/HR -m "Merge features/HR"
```

---

### Phase 5 — Resolve conflicts

When Git reports conflicts:

```powershell
git status
```

Look for files marked `UU` or `AA`. Open each file and find conflict markers:

```
<<<<<<< HEAD
(your current branch — integration branch)
=======
(incoming branch — the feature being merged)
>>>>>>> origin/features/InventoryMIS
```

#### Resolution guide

| File / area | What to keep |
|-------------|--------------|
| Module folder (`InventoryMIS/`, `Payroll/`, etc.) | The branch that **owns** that module |
| Shared UI (`SampleModule/`, `packages/ui/`) | Agreed design system (usually `feature/authentication`) |
| `package.json` | **Combine** dependencies from both sides |
| `Authentication/` | Newest working auth — discuss with platform team if unsure |
| `prisma/schema.prisma` | Module-specific schema in that module's folder only |

After fixing each file:

```powershell
git add path/to/fixed-file.tsx
```

When all conflicts are resolved:

```powershell
git commit -m "Merge features/InventoryMIS"
```

#### Abort a bad merge

```powershell
git merge --abort
```

---

### Phase 6 — Finish integration and push to `develop`

```powershell
# Verify merge history
git status
git log --oneline --graph -20

# Push integration branch (backup / review)
git push -u origin integration/all-team-work

# Merge into develop when everything looks good
git checkout develop
git merge integration/all-team-work -m "Integrate all team modules"
git push origin develop
```

---

### Phase 7 — Restore stashed work (if you stashed in Phase 1)

```powershell
git stash list
git stash pop
```

---

## Merge checklist (print or bookmark)

```
□ git status                    → clean working tree (or stashed)
□ git fetch origin              → latest remote branches
□ git checkout develop
□ git pull origin develop
□ git checkout -b integration/all-team-work
□ Merge branch 1 → fix conflicts → commit
□ Merge branch 2 → fix conflicts → commit
□ Merge branch 3 → fix conflicts → commit
□ git push origin integration/all-team-work
□ git checkout develop
□ git merge integration/all-team-work
□ git push origin develop
□ git stash pop                 (if stashed)
```

---

## Useful commands

| Situation | Command |
|-----------|---------|
| List all branches | `git branch -a` |
| Commits on a branch not in `develop` | `git log develop..origin/features/InventoryMIS --oneline` |
| See conflicted files | `git status` |
| See recent graph | `git log --oneline --graph --all -20` |
| Abort merge | `git merge --abort` |
| Undo last commit (keep files) | `git reset --soft HEAD~1` |
| See who changed a file | `git log --oneline -- path/to/file` |

---

## Common conflict hotspots in ShulePlus

Based on real merges in this repo, conflicts most often appear in:

- `SampleModule/Frontend/package.json`
- `SampleModule/Frontend/src/app/globals.css`
- `SampleModule/Frontend/src/app/layout.tsx`
- `SampleModule/Frontend/src/components/ui/*`
- `Authentication/Frontend/src/app/organization-admin/page.tsx`
- `Authentication/Backend/prisma/seed.ts`

**Prevention:** Only the platform/design team should change `SampleModule/`. Module teams should not copy UI components into shared folders.

---

## Tips for long-term conflict reduction

1. **Module boundaries** — each team edits only their folder.
2. **Sync weekly** — `git merge origin/develop` on your feature branch.
3. **Push feature branches** — `git push -u origin features/YourModule` so others can see your work.
4. **Use integration branches** — never merge five branches straight into `develop`.
5. **Small, frequent merges** — merge one module at a time instead of waiting weeks.
6. **Never force-push `main` or `develop`** — use normal merges unless the team lead approves a rebase.

---

## Related docs

- [Module Integration Guide](./MODULE_INTEGRATION_GUIDE.md) — how modules connect to the platform
- [Auth for Module Teams](./AUTH_FOR_MODULE_TEAMS.md) — JWT and IAM for module backends/frontends

---

## Quick reference — first-time setup

```powershell
git clone https://github.com/theonesteIT/ShulePlusFullProject.git
cd ShulePlusFullProject
git config --global credential.helper manager
git checkout develop
git pull origin develop
```
