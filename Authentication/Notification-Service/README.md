# ShulePlus Notification Service

Centralized microservice for **Email**, **SMS**, **Push**, **In-App**, **OTP/MFA**, **Templates**, **Logs**, and **User Preferences**.

Any ShulePlus microservice can call this service:

```
IAM ──────┐
Finance ──┤
Education ┼──► Notification Service ──► Email / SMS / Push / In-App
HR ───────┤
RFID ─────┘
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/notifications/email` | Send email |
| `POST` | `/api/notifications/sms` | Send SMS |
| `POST` | `/api/notifications/push` | Send push notification |
| `POST` | `/api/notifications/in-app` | Create in-app notification |
| `POST` | `/api/notifications/otp/send` | Send OTP (email/sms/both) |
| `POST` | `/api/notifications/otp/verify` | Verify OTP |
| `GET` | `/api/notifications/in-app` | List in-app notifications |
| `GET` | `/api/notifications/logs` | Notification delivery logs |
| `GET` | `/api/notifications/templates` | List templates |
| `GET/PATCH` | `/api/notifications/preferences/:userId` | User preferences |

## Inter-Service Authentication

```http
x-service-key: <SERVICE_API_KEY>
x-source-service: IAM
```

## Quick Start

```bash
cd Notification-Service
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Runs on **http://localhost:3002**

**Swagger:** http://localhost:3002/api/docs

## Example — Finance sends fee receipt

```http
POST /api/notifications/email
x-service-key: your-key
x-source-service: Finance

{
  "to": "parent@school.com",
  "templateSlug": "fee-receipt",
  "templateVariables": {
    "parentName": "Jean",
    "studentName": "Alice",
    "amount": "RWF 50,000",
    "receiptNo": "RCP-2026-001"
  }
}
```
