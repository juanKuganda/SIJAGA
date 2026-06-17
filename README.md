# SIJAGA

**Sistem Jaminan Autentikasi Gelar Akademik**

Verifikasi ijazah anti-pemalsuan berbasis NFT Soulbound pada blockchain Solana.

Universitas Tadulako | Tugas Akhir S1 Informatika

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| Blockchain | Solana Devnet |
| NFT | Metaplex (Umi + Token Metadata) |
| Storage | Pinata (IPFS) |
| Auth | JWT + bcryptjs |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone repository
git clone <repository-url>
cd sijaga

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Push database schema
npx prisma db push

# Seed database dengan data test
npx tsx prisma/seed.ts

# Jalankan development server
pnpm dev
```

### Login Credentials (Test Data)

| Role | NIM | Password |
|------|-----|----------|
| Admin | ADMIN001 | admin123 |
| Mahasiswa | H071211001 | mahasiswa123 |
| Mahasiswa | H071211002 | mahasiswa123 |

---

## Fitur

### Admin Kampus
- Dashboard statistik (total mahasiswa, wallet status, ijazah status)
- Kelola data mahasiswa (search, filter)
- Verifikasi/approve/reject wallet mahasiswa
- Terbitkan NFT ijazah Soulbound

### Mahasiswa
- Profil dan status ijazah
- Daftarkan wallet Phantom
- Status wallet (pending/verified/rejected)

### Verifikasi Publik
- Cek keaslian ijazah berdasarkan alamat wallet
- Tampilkan data ijazah dari blockchain
- Link ke Solana Explorer

### Blinks (Klaim Ijazah)
- Preview kartu ijazah
- Klaim NFT ke wallet mahasiswa

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | Public | Login user |
| POST | /api/auth/logout | User | Logout |
| GET | /api/auth/me | User | Get current user |
| POST | /api/wallet/register | Mahasiswa | Daftar wallet |
| GET | /api/wallet/status | Mahasiswa | Status wallet |
| POST | /api/wallet/verify | Admin | Approve/reject wallet |
| POST | /api/nft/mint | Admin | Mint NFT ijazah |
| GET | /api/nft/status | Mahasiswa | Status NFT |
| GET | /api/verify?wallet=xxx | Public | Verifikasi publik |
| GET | /api/actions/claim?nim=xxx | Public | Blinks preview |
| POST | /api/actions/claim?nim=xxx | Public | Klaim ijazah |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/mahasiswa | Admin | List mahasiswa |

---

## Project Structure

```
sijaga/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login)
│   ├── (admin)/           # Admin pages (dashboard, mahasiswa, terbitkan)
│   ├── (mahasiswa)/       # Mahasiswa pages (profil, wallet)
│   ├── verifikasi/        # Public verification page
│   └── api/               # API routes
├── components/            # React components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility functions
│   ├── auth.ts            # Authentication utilities
│   ├── prisma.ts          # Prisma client
│   ├── solana.ts          # Solana connection
│   ├── metaplex.ts        # Metaplex NFT minting
│   ├── pinata.ts          # Pinata IPFS upload
│   └── validation.ts      # Zod schemas
├── prisma/                # Database schema & seed
├── .paul/                 # PAUL project management
└── projects/              # SEED planning docs
```

---

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# Auth
JWT_SECRET="your-jwt-secret"

# Solana
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC="https://api.devnet.solana.com"
ADMIN_WALLET_PRIVATE_KEY=""

# Pinata (IPFS)
PINATA_JWT=""
NEXT_PUBLIC_PINATA_GATEWAY="https://gateway.pinata.cloud"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Deployment

### Vercel

1. Push ke GitHub
2. Import repository di Vercel
3. Setup environment variables
4. Deploy

### Database Production

Untuk production, migrasi dari SQLite ke PostgreSQL:

1. Setup Vercel Postgres atau Neon
2. Update `DATABASE_URL` di environment variables
3. Update `provider` di `prisma/schema.prisma` ke `"postgresql"`
4. Run `npx prisma db push`

---

## Dokumen Proyek

- [PRD.md](PRD.md) — Product Requirements Document
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Implementation Plan
- [TRD.md](TRD.md) — Technical Requirements Document
- [projects/sijaga/PLANNING.md](projects/sijaga/PLANNING.md) — SEED Planning Document

---

## License

Tugas Akhir S1 Informatika — Universitas Tadulako

---

*Built with Next.js, Solana, and Metaplex*
