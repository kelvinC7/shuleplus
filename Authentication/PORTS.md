# Authentication — local ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (landing + admin) | **3000** | http://localhost:3000 |
| IAM Backend API | **3001** | http://localhost:3001/api/v1 |
| Notification Service | **3002** | http://localhost:3002 |

See the full platform map: [docs/PORTS.md](../docs/PORTS.md)

```bash
cd Authentication/Backend && npm run dev
cd Authentication/Frontend && npm run dev
cd Authentication/Notification-Service && npm run dev
```
