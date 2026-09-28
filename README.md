# 💧 LinkDrop

> **Ephemeral, Secure, and Self-Destructing File Sharing Platform**  
> Built with Next.js 16 (App Router), React 19, Tailwind CSS v4, Prisma 6, and SQLite / AWS S3.

---

## ✨ Features

- ⚡ **Zero-Trace Ephemeral Sharing**: Files expire automatically based on your chosen duration (10 minutes, 1 hour, 24 hours, 3 days, 7 days).
- 🔥 **Burn After Reading**: Option to restrict downloads to a single download (`1`). Once downloaded, the file is instantly and permanently wiped from disk/storage.
- 🔒 **Encrypted Password Protection**: Secure drops with an optional custom password (hashed using `bcryptjs`).
- 📱 **Instant QR Code Sharing**: Dynamically generates high-resolution QR codes so mobile devices can scan and download in seconds.
- 🔑 **Unique 6-Character Short Codes**: Clean, human-readable codes (e.g., `8k2m9x`) or direct shareable URLs (`http://localhost:3000/d/[code]`).
- ⏱️ **Live Countdown Timer**: Download page features a real-time ticking countdown timer displaying remaining expiration time.
- 🛡️ **Sender Revocation**: Every upload generates a private `senderToken` stored locally in the sender's browser history, giving you one-click revocation to shred the drop at any time.
- 💾 **Dual Storage Engine**:
  - **Local Storage** (default): Saves files to `./uploads/` with zero configuration.
  - **S3 / R2 / MinIO Storage**: Automatically switches to S3 cloud storage if AWS credentials are provided.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20)
- npm or yarn

### 2. Environment Setup
The project comes pre-configured with SQLite for zero-config local development in `.env`:
```env
# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# Public App URL for generating share links
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Local Storage Directory
LOCAL_UPLOAD_DIR="./uploads"

# Optional S3 Storage Configuration
# AWS_REGION="us-east-1"
# AWS_ACCESS_KEY_ID=""
# AWS_SECRET_ACCESS_KEY=""
# AWS_S3_BUCKET=""
# AWS_ENDPOINT=""
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📁 Project Architecture

```
LinkDrop/
├── prisma/
│   ├── schema.prisma        # Database schema for Drop model
│   └── dev.db               # SQLite database
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── drops/
│   │   │       ├── route.ts              # POST /api/drops (file upload)
│   │   │       └── [code]/
│   │   │           ├── route.ts          # GET metadata, DELETE revoke
│   │   │           ├── download/route.ts # GET file download & burn logic
│   │   │           ├── qr/route.ts       # GET QR code generation
│   │   │           └── verify/route.ts   # POST password check
│   │   ├── d/[code]/page.tsx             # Drop download & claim page
│   │   ├── globals.css                   # Glassmorphic & glow theme
│   │   ├── layout.tsx                    # Root layout & SEO metadata
│   │   └── page.tsx                      # Home page (upload, claim, history)
│   ├── components/
│   │   ├── Header.tsx                    # Sticky navigation with tabs
│   │   ├── UploadZone.tsx                # Drag & drop upload with controls
│   │   ├── DropSuccessModal.tsx          # Share URL, code, and QR viewer
│   │   ├── ReceiveCodeCard.tsx           # Quick code / link claimer
│   │   ├── RecentDrops.tsx               # Local browser history & revocation
│   │   └── DropViewer.tsx                # Download card with countdown & burn states
│   ├── lib/
│   │   ├── prisma.ts                     # Prisma client singleton
│   │   ├── storage.ts                    # Local file & S3 storage adapter
│   │   └── utils.ts                      # Helpers for codes, expiry, formatting
│   └── types/
│       └── drop.ts                       # TypeScript interfaces
```

---

## 🔒 Security & Privacy

1. **No Data Left Behind**: When a drop reaches its download limit or is revoked by the sender, the underlying file is immediately unlinked and removed.
2. **Safe Filenames & Mime Types**: Original filenames are preserved during download via encoded `Content-Disposition`, while storage keys use cryptographically unique identifiers.
3. **No Secret Leaks**: Public metadata endpoints do not expose storage keys, password hashes, or sender tokens.
