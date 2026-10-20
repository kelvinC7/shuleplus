# 02 — School & Classes (Step 1)

Step 1 sets the academic context, school details, student cohort, education level, and target classes for the Babyeyi document.

---

## Features

| Feature | Description |
|---------|-------------|
| **Include School Details toggle** | Show/hide school name, location, logos on printed document |
| **Auto-fill from profile** | Name, province → village loaded from `/babyeyi/school-info` |
| **Rwanda location cascades** | Province → District → Sector → Cell → Village dropdowns |
| **School logo upload** | PNG/JPG; persisted to school profile via upload-asset |
| **Other logo (optional)** | Secondary brand image on document |
| **Ownership banners** | Contextual info for Government / Private / Government-Aided |
| **Student cohort picker** | Government-Aided only: public vs private students |
| **Academic year & term** | From `AcademicContext`; current term/year highlighted |
| **Category selector** | Public / Boarding / TVET / Private — locked by ownership rules |
| **Education level picker** | Filters available classes (P1, S1, etc.) |
| **Class stream picker** | Multi-select from registered school classes |
| **Select all / clear level** | Bulk select classes for current education level |
| **Multi-class Babyeyi** | One document shared across multiple selected classes |
| **Parent message** | Freeform notice saved to DB and shown on document |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | `Babyeyi.jsx` → `renderStep()` case 1 |
| **Child components** | `EducationLevelPicker`, `ClassStreamPicker`, `FileZone`, `Toggle` |
| **Location data** | `RW_LOCATIONS` constant — Rwanda admin hierarchy |
| **Scope logic** | `babyeyiWizardSchoolScope.js` — `mapSchoolOwnershipToFeeScope()`, `categoryOptionsForWizard()` |

### Key state fields

| Field | Type | Description |
|-------|------|-------------|
| `includeSchoolDetails` | boolean | Toggle school block on document |
| `schoolName`, `province`…`village` | string | Location fields |
| `feeTargetStudents` | `"public"` \| `"private"` | Government-Aided cohort |
| `academicYear`, `term` | string | Academic period |
| `category` | string | Public / Boarding / TVET / Private |
| `nesaFeeLimitLevel` | string | Education level for NESA lookup |
| `classes` | string[] | Selected class labels |
| `parentMessage` | string | Parent notice text |
| `schoolLogo`, `otherLogo` | File | Image uploads |

### Validation (Next button)

- Classes must finish loading
- At least one class must be selected

---

## Backend logic

| Endpoint | Purpose |
|----------|---------|
| `GET /babyeyi/school-info` | School profile + ownership |
| `POST /babyeyi/upload-asset` | Logo upload (`asset_type=logo`) |
| `GET /schools/:id/classes` | Registered class labels |

### FormData fields (Step 1 contribution)

```
academic_year, term, classes, education_level, level,
school_category, category, ownership_type, fee_target_students,
school_province, province, school_district, district,
school_sector, sector, cell, village, parent_message, school_logo, other_logo
```

### Business rules

See [BUSINESS_RULES.md](../BUSINESS_RULES.md):
- Private schools → category locked to Private, NESA off
- Government schools → Public/Boarding, NESA on
- Government-Aided → cohort picker determines NESA and category options
