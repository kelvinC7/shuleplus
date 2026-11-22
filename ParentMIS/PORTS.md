# ParentMIS - Local Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Web Portal) | **3049** | http://localhost:3049 |
| Backend (API Gateway) | **3048** | http://localhost:3048 |
| ParentApp (Vite Mobile App -> APK) | **5174** | http://localhost:5174 |

See the full platform map: [docs/PORTS.md](../docs/PORTS.md)

```bash
# Backend
cd ParentMIS/Backend && npm run dev

# Frontend (Web Portal)
cd ParentMIS/Frontend && npm run dev

# ParentApp (Vite Mobile App -> APK)
cd ParentMIS/ParentApp && pnpm run dev
```
