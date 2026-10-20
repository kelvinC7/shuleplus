# Official Digital Document Verification Portal

Public QR landing: `/verify/[docId]?h=…`  
Staff tool: `/verify`

## Why QR was missing / broken

QR was only minted on **publish**, and View used a fragile `/uploads/…` URL (404 → broken image).

Now:
- Create / edit / duplicate / approve / open View → **always mint QR**
- Document embeds a **data URL** QR (no upload dependency for display)
- Print HTML also embeds data URL QR

## Verification portal

Passport-grade flow: Hero → authenticity dashboard → trust score → security checks → school card → circular cards → fees / NESA → timeline → preview → actions → report → FAQ → footer.

Statuses: 🟢 authentic · 🟡 pending · 🔴 invalid / hash mismatch · ⚫ revoked
