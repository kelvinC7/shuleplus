# 05 — Bank Account (Step 4)

Step 4 captures the school's bank account details for fee payments shown on the Babyeyi document.

---

## Features

| Feature | Description |
|---------|-------------|
| **Primary bank account** | Bank name (dropdown), account number, account name |
| **Rwanda bank presets** | 11 preset banks (BK, Equity, I&M, NCBA, etc.) |
| **Live card preview** | Navy gradient card showing primary account details |
| **Additional bank accounts** | Add/remove extra accounts (Bank 2, 3, …) |
| **Primary badge** | Visual distinction for main account |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | `Babyeyi.jsx` → `renderStep()` case 4 |
| **Bank list** | `BANKS` constant in Babyeyi.jsx |

### Preset banks

```
Umwalimu SACCO, Bank of Kigali (BK), Equity Bank Rwanda,
I&M Bank Rwanda, NCBA Bank Rwanda, Access Bank Rwanda,
GT Bank Rwanda, Ecobank Rwanda, BPR Bank Rwanda,
KCB Bank Rwanda, Urwego Bank
```

### Bank row shape

```js
{ bankName: "", accountNumber: "", accountName: "", isPrimary: true|false }
```

### State fields

| Field | Description |
|-------|-------------|
| `bankName` | Primary bank name |
| `accountNumber` | Primary account number |
| `accountName` | Primary account holder name |
| `extraBankAccounts` | Array of additional bank objects |

---

## Backend logic

On save, primary + extra banks are merged into `banks_json`:

```js
[
  { bankName, accountNumber, accountName, isPrimary: true },
  { bankName, accountNumber, accountName, isPrimary: false },
  ...
]
```

### FormData fields

```
bank_name, bank_account_no, bank_account_name   → primary (flat fields)
banks_json                                       → all banks merged
extra_bank_accounts                              → extras only (JSON)
```

### Document display

Bank details appear on the official Babyeyi PDF/HTML in the payment instructions section.
