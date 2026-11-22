# yoShule Parent App (Vite + React + Tailwind CSS)

Mobile-first Parent Application for the yoShule / ShulePlus ecosystem, ready to be packaged into an Android APK via Capacitor, Cordova, or GitHub Actions CI/CD workflows.

---

## 🚀 Key Highlights & Architecture

- **UI System**: Tailwind CSS + Shadcn-style components (Lucide icons, mobile bottom sheets, slide-over detail panels, circular SVG score rings, progress trends, badges, and chips).
- **Design System Fidelity**: Exact Rwandan educational theme from the CTO's reference design (`#13213D` deep navy, `#F5A623` amber, `#1FA971` green, `#E5484D` red, `#F4F5F8` surfaces, Montserrat typography).
- **APK Ready**: Configured with `base: './'`, mobile safe-area insets, touch-action manipulation, zero external runtime CDN dependencies.
- **Desktop Simulator**: On desktop browsers, displays the full interactive mobile phone mockup alongside the product stage pitch; on mobile viewports, adapts to full native 100vw/100vh.
- **Multilingual Support**: Real-time language switching between 7 languages:
  - English (`en`)
  - Ikinyarwanda (`rw`)
  - Français (`fr`)
  - Luganda (`lg`)
  - Português (`pt`)
  - Kiswahili (`sw`)
  - Ikirundi (`rn`)

---

## 📋 Implemented Flows

### 1. Start / Landing Screen (`LandingView`)
- Quick child lookup by SDMS code (`SDM-2024-004821` or demo `1234`) or ShuleCard number.
- Simulated & camera QR code scanner.
- Instant child found card with quick actions.
- **Link a Child Wizard (4 Steps)**:
  1. Find child by code / card.
  2. Verify registered guardian phone number.
  3. Enter 6-digit SMS verification code.
  4. Child linked confirmation & unlocked features.
- Switch between linked children cards with attendance & average chips.
- Enter Console authentication flow.
- "Get Babyeyi" document viewer with approved term dates & school requirements.

### 2. Home Dashboard (`HomeView`)
- Overall learning progress score card with circular SVG ring index.
- 4 Quick KPI cards:
  - Attendance (Rate %, present today indicator, tap to report absence).
  - Marks Average (Term average %, term-over-term comparison).
  - ShuleCard Pocket Money (Canteen balance, daily spend cap).
  - Conduct Score (Score / 100, exemplary conduct rating).
- Today at school lesson card (Period, room, teacher, subject).
- Homework due soon list with submission tags.
- School trips & savings goals preview card.
- Uniforms and shoes shortcut banner.

### 3. Learning Hub (`LearningView`)
- **Overview**: 3-Term performance trend line chart with class average comparison line, doing well vs needs support breakdown.
- **Subjects**: Complete subject list with scores, teacher comments; click to open assessment breakdown panel (Midterm 30%, Assignments 20%, Endterm 50%).
- **Report Cards**: Term bulletins with rankings and downloadable PDF preview.
- **Attendance**: October monthly calendar grid with P (Present), L (Late), A (Absent), E (Excused) statuses; "+ Report Absence" date picker and reason selector.
- **Homework**: Active assignments, due dates, instructions, submission status.
- **Timetable**: Weekly schedule by day (Mon - Fri) with rooms and teachers.

### 4. ShuleCard & Pocket Money Wallet (`WalletView`)
- Digital gradient ShuleCard visual with cardholder name, card number, QR code.
- Pocket money top-up flow with preset amounts, MTN MoMo, Airtel Money, or Card payment.
- Daily, Weekly, and Termly spend limit sliders.
- Canteen and school stationery shop purchase toggles.
- Filterable 3-week transaction history (All, Canteen, School Shop, Top-ups).
- **Top Canteen Items**: Visual bar charts of top consumed cafeteria items (Milk & Bread, Fresh Juice, Samosas, Fruit bowls, Mathematical Sets).
- Instant Card Block / Unblock control.

### 5. Chat & Communication (`ChatView`)
- **Teachers**: Direct messaging threads with class teachers; message history, typing suggestions, instant reply simulation.
- **Circulars**: Official school circulars with priority tags, author signature, and official seal.
- **Events**: Upcoming school calendar dates (Sports Gala, Visiting Day, Exams).

### 6. More Hub (`MoreView`)
- **Student Profile**: Full details, SDMS, ShuleCard, registered guardian numbers, hostel dormitory or bus route.
- **Health Records**: School clinic visits, blood group, allergies, immunization status.
- **Discipline & Conduct**: Conduct rating, merits & commendations (+pts), infractions.
- **Leave & Permissions**: Active permission passes, gate exit QR scan verification, request leave form.
- **Uniforms & Shoes Store & Exchanges (`OrdersPanel`)**: 
  - 4-step ordering wizard (Items & sizes, delivery method, payment terms, order review).
  - Size guide sheet.
  - "My Orders" tracker with collection QR passes.
  - Free size exchange request flow at school store.
- **School Trips Hub (`TripsPanel`)**: 
  - Comprehensive field study explorer.
  - 4-step preparation checklist: Consent signature, health/emergency disclosure, fee payment, and live day follow.
  - Live field follow (`tripDay`) with timestamped roll calls from lead patron.
  - Detailed daily itinerary and itemized cost breakdown.
  - Past trips archive.
- **Savings Goals Hub (`GoalsPanel`)**: 
  - Goal creator and progress rings.
  - Weekly savings calculator and "Add RWF now" quick deposit.
  - Automated weekly savings toggle.
- **Notification Preferences & Alert Channels**:
  - Full channel toggles: Gate arrivals, absence alerts, marks, low balance, canteen receipts, circulars, and teacher messages.

---

## 🚫 Explicit Exclusions Adhered To

As specifically requested:
1. **Schoolfees payment flows**: Completely omitted from the app.
2. **Shulekit flows**: Completely omitted from the app.

---

## 🔌 API & Module Integration

Integrated with the production Parent Portal API at `https://parentsapi.shuleplus.rw/api` (override with `VITE_API_URL`):
- `POST /public/parents/auth/login`
- `GET /dashboard`
- `GET /academics` & `GET /report-cards`
- `GET /attendance` & `POST /attendance/absence`
- `GET /wallet` & `POST /wallet/topup`
- `GET /homework` & `POST /homework/:id/submit`
- `GET /communication` & `POST /communication/teacher-chat/:id/messages`
- `GET /profile`
- `GET /discipline`
- `GET /health-records`
- `GET /leave` & `POST /leave`
- `GET /store` & `POST /store/orders`
- `GET /timetable`
- `GET /notifications`

Copy `.env.example` to `.env` (or set GitHub secrets `VITE_API_URL` / `VITE_STUDENT_API_URL` for CI APK builds).

**CORS:** The APK sends requests with Origin `https://localhost` (Capacitor). ParentMIS, Student Management, TichaPortal BFF, IAM, and ShuleChat backends allow Capacitor origins in code and via `CORS_ORIGIN` on the server — redeploy with `scripts/redeploy-module.sh` to refresh production `.env` lists.

---

## 🛠️ Development & Build Commands

```bash
# Navigate to ParentApp
cd ParentMIS/ParentApp

# Start Vite dev server
pnpm run dev

# Build for production / APK packaging
pnpm run build

# Preview production build locally
pnpm run preview
```
