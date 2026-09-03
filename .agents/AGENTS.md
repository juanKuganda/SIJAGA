# SIJAGA (Sistem Jaminan Autentikasi Gelar Akademik) - Core Context

## 1. Identitas Proyek
SIJAGA adalah aplikasi verifikasi ijazah anti-pemalsuan untuk Universitas Tadulako yang menggunakan Soulbound NFT di blockchain Solana.

## 2. Tech Stack & Aturan Main
- **Framework**: Next.js 16 App Router. 
- **Database**: Prisma ORM (PostgreSQL via Neon).
- **Blockchain**: Solana Web3.js & Metaplex UMI (`@metaplex-foundation/umi`).
- **Storage**: IPFS via Pinata.
- **Styling**: Tailwind CSS (light mode *only*), shadcn/ui.
- **Desain**: "Modern Enterprise Bento" (Bento grid, putih/merah crimson, bold typography).

## 3. Core Mechanisms (Wajib Diingat Saat Coding)
- **Privacy (UU PDP) & Legalitas**: DILARANG KERAS menyimpan *Personally Identifiable Information* (PII) seperti Nama dan NIM di metadata IPFS. Gunakan `dataHash` (SHA256) untuk on-chain, PII hanya di database lokal. Pemrosesan hash ke blockchain dilakukan berdasarkan **Explicit Consent** mahasiswa dan **Kewajiban Hukum Negara** pencegahan pemalsuan ijazah (blockchain immutable tidak bisa dihapus).
- **NFT Minting**: Menggunakan pendekatan **Soulbound NFT** (non-transferable). Proses minting dan update on-chain di-handle di `lib/metaplex.ts` dengan retry-mechanism karena RPC devnet sering limit.
- **Revocation**: Pencabutan ijazah dilakukan menggunakan metode **Visual Revoke** (mengupdate URI metadata NFT on-chain menggunakan `isMutable: true` menjadi gambar/label DIBATALKAN).
- **Unified Satori-UI Components**: Untuk komponen yang digenerate menjadi gambar (misal melalui `next/og` atau Satori) DAN ditampilkan sebagai *preview* di web, DILARANG membuat dua versi kode. Buat 1 komponen `.tsx` *stateless* menggunakan objek `style` standar (tanpa *Tailwind classes*) agar *pixel-perfect* dirender oleh Satori maupun DOM.
- **Post-Minting Consent (Right to Erasure)**: Sesuai UU PDP, mahasiswa dapat menarik *consent* data kapan saja, bahkan SETELAH ijazah terbit. Jika ini terjadi, JANGAN cegah aksinya, melainkan hapus PII (Nama & NIM) dari database lokal (`dataDeletedAt`), biarkan token blockchain tetap hidup (karena metadata on-chain sudah anonim via DataHash).
- **No 'any' Type in ORM**: DILARANG KERAS menggunakan tipe `any` (contoh: `const data: any = {}`) saat melakukan query atau modifikasi melalui Prisma. Gunakan tipe bawaan Prisma seperti `Prisma.UserUpdateInput` atau `Prisma.AuditLogWhereInput`.
- **Production Build Verification**: Sebelum menyatakan fitur besar/refactoring selesai (khususnya yang menyangkut Next.js App Router atau JSX syntax), agen wajib menjalankan `npm run build` di *background task* untuk mendeteksi *syntax error* bawaan yang sering terlewat oleh server *development*.

## 4. Arsitektur Neon Auth & Database Branching
- **Global vs Terisolasi**: Ingat bahwa tabel PostgreSQL di Neon terisolasi per *branch* (misal: `production`, `preview/dev`), tetapi data **Neon Auth** bersifat global untuk seluruh proyek.
- **Seeding & Sinkronisasi**: Jika menjalankan `prisma db push --force-reset`, data di *branch* tersebut akan terhapus, namun *user* di Neon Auth tidak. Skrip *seed* HARUS menggunakan mekanisme *fallback* (jika *SignUp* mengembalikan "User already exists", lakukan *SignIn* untuk mendapatkan `authUserId` yang lama) agar tabel `User` di Prisma dapat disinkronkan kembali.
- **Vercel Preview**: Untuk melakukan pengujian di Vercel Preview (yang menggunakan *branch* berbeda), *branch* Preview tersebut harus di-*seed* secara manual dengan cara mengarahkan `DATABASE_URL` lokal sementara waktu ke *branch* Preview tersebut, lalu menjalankan skrip *seed*.
