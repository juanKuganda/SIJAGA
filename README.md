# 🛡️ SIJAGA

**Sistem Jaminan Autentikasi Gelar Akademik**

SIJAGA adalah platform verifikasi ijazah anti-pemalsuan **arsitektur hibrida (Web2.5)** untuk **Universitas Tadulako**, menggunakan blockchain **Solana** sebagai lapisan verifikasi publik dan **IPFS** sebagai penyimpanan metadata terdesentralisasi, sementara logika penerbitan dan pencabutan dikendalikan oleh **backend terpusat universitas**. Patuh terhadap **UU PDP** (Pelindungan Data Pribadi).

Tugas Akhir S1 Informatika — Universitas Tadulako.

---

## ✨ Fitur Utama

- **Institution-Enforced Soulbound NFT**: Ijazah di-minting sebagai aset digital on-chain. "Soulbound" diterapkan secara institusional (by policy) — admin memegang update authority, royalti 0%, dan tidak ada insentif ekonomi untuk transfer.
- **2-Tier Privacy & UU PDP Compliance**: Tidak ada *Personally Identifiable Information* (PII) di public ledger/IPFS — baik di metadata JSON maupun di gambar sertifikat. PII (Nama, NIM) tetap aman di database server, sedangkan blockchain hanya menyimpan *SHA-256 dataHash* kriptografis. Memiliki fitur **Right to be Forgotten** (hapus PII).
- **Visual Revocation**: Ijazah palsu/bermasalah dapat dibatalkan secara visual, memperbarui metadata on-chain menjadi *watermark* "DIBATALKAN".
- **Disaster Recovery**: Backup periodik otomatis dan sistem pemulihan (*restore*) sertifikat terintegrasi ke dalam UI admin.
- **Solana Blinks Integration**: Mahasiswa dapat melihat preview dan melakukan klaim Ijazah langsung via platform pendukung Blinks.
- **Bento Design System**: UI modern, *clean*, dan responsif berbasis "Modern Enterprise Bento" grid architecture.

---

## 🛠️ Tech Stack

### Core Frameworks
- **Frontend / Backend**: [Next.js 15 App Router](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: PostgreSQL (Serverless) via [Neon](https://neon.tech) & [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Neon Managed Better Auth](https://neon.tech)

### Web3 & Blockchain
- **Network**: Solana Devnet
- **SDK**: Solana Web3.js v1 & [@metaplex-foundation/umi](https://developers.metaplex.com/umi)
- **Storage**: IPFS via [Pinata Cloud](https://www.pinata.cloud/)

### UI & Styling
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: GSAP & Lenis (Smooth Scroll)
- **Image Generation**: Satori (Dynamic Certificate PNGs)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- `pnpm` (direkomendasikan)
- [Phantom Wallet](https://phantom.app/) extension (untuk testing klaim NFT)

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd sijaga

# 2. Install dependencies
pnpm install

# 3. Setup environment variables
cp .env.example .env
# Buka .env dan isi dengan credential Anda (RPC Solana, Pinata JWT, dll)

# 4. Push database schema ke Neon PostgreSQL
npx prisma db push

# 5. Seed database & Registrasi akun test ke Neon Auth
npx prisma db seed

# 6. (Jika Error saat Seeding Admin) Eksekusi script pembuatan admin
# Cukup daftar manual melalui UI /register atau buat script khusus
# untuk akun Admin karena seed otomatis kadang terblokir CORS lokal.

# 7. Jalankan development server
pnpm dev
```

Aplikasi akan berjalan di `http://localhost:3000`.

### Login Credentials (Test Data)

Gunakan kredensial berikut untuk login ke dalam sistem (hasil dari script `seed.ts`):

| Role | Email Login | Password | Keterangan |
|------|-------------|----------|------------|
| 👨‍💼 **Admin** | `admin@sijaga.ac.id` | `admin123` | Akses penuh dashboard admin |
| 🎓 **Mahasiswa** | `budi@student.untad.ac.id` | `mahasiswa123` | Simulasi mhs dengan wallet PENDING |
| 🎓 **Mahasiswa** | `siti@student.untad.ac.id` | `mahasiswa123` | Simulasi mhs dengan wallet VERIFIED |

---

## 🏗️ Project Architecture

```text
sijaga/
├── app/                    # Next.js App Router (13 Pages + 20 API Routes)
│   ├── (auth)/             # Login & Registration flows
│   ├── (admin)/            # Admin Dashboard, Revoke, Issuance, Data Management
│   ├── (mahasiswa)/        # Student Portal (Consent, Wallet, Certificate status)
│   ├── api/                # REST API & Solana Actions endpoints
│   └── page.tsx            # Public verification & landing page
├── components/             # Custom React components & GSAP animations
│   └── ui/                 # 26 shadcn/ui generic components
├── lib/                    # Core business logic layer
│   ├── auth.ts             # Adapter untuk Neon Managed Better Auth
│   ├── auth/               # Konfigurasi server & client Neon Auth
│   ├── crypto.ts           # SHA-256 data hashing (Privacy)
│   ├── metaplex.ts         # Solana NFT minting, revoking, restoring
│   ├── pinata.ts           # IPFS orchestration & metadata JSON gen
│   └── certificate-image.tsx # Satori dynamic image generation
├── prisma/                 # PostgreSQL database schemas and seeders
└── DESIGN.md               # UI/UX design specifications
```

---

## 🔐 Arsitektur Privasi & UU PDP

SIJAGA didesain **privasi-pertama** untuk memenuhi standardisasi Undang-Undang Pelindungan Data Pribadi (UU PDP):

1. **Consent Gate**: Mahasiswa wajib membaca dan menyetujui kesepakatan penggunaan data publik sebelum ijazahnya dapat diterbitkan ke blockchain.
2. **On-Chain Anonymity**: Metadata NFT di IPFS tidak mengandung nama atau NIM. Hanya menyimpan informasi akademik umum (Tahun Lulus, Program Studi) dan sebuah *cryptographic data hash*.
3. **2-Tier Verification**: Sistem Web3 membaca *hash* dari blockchain, lalu mencocokkannya secara lokal dengan nama & NIM via algoritma kriptografi (`SHA256`) menggunakan *unique salt* yang tersimpan aman di database server tertutup.
4. **Right to be Forgotten (Hak untuk Dilupakan)**: Admin memiliki instrumen untuk menghapus data PII mahasiswa secara permanen dari server. Data *salt* dibuang dari sistem, membuat algoritma *hash* di blockchain/IPFS terputus secara matematis (tidak bisa lagi diverifikasi atau direkayasa balik).

---

## 📜 Lisensi & Copyright

Tugas Akhir S1 Informatika — Universitas Tadulako.
Dibuat dengan ❤️ untuk sistem pendidikan yang lebih modern, transparan, dan aman.
