# SIJAGA (Sistem Jaminan Autentikasi Gelar Akademik) - Core Context

## 1. Identitas Proyek
SIJAGA adalah aplikasi verifikasi ijazah anti-pemalsuan untuk Universitas Tadulako yang menggunakan Soulbound NFT di blockchain Solana.

## 2. Tech Stack & Aturan Main
- **Framework**: Next.js 15 App Router. 
- **Database**: Prisma ORM (SQLite).
- **Blockchain**: Solana Web3.js & Metaplex UMI (`@metaplex-foundation/umi`).
- **Storage**: IPFS via Pinata.
- **Styling**: Tailwind CSS (light mode *only*), shadcn/ui.
- **Desain**: "Modern Enterprise Bento" (Bento grid, putih/merah crimson, bold typography).

## 3. Core Mechanisms (Wajib Diingat Saat Coding)
- **Privacy (UU PDP)**: DILARANG KERAS menyimpan *Personally Identifiable Information* (PII) seperti Nama dan NIM di metadata IPFS. Gunakan `dataHash` (SHA256) untuk on-chain, PII hanya di database lokal.
- **NFT Minting**: Menggunakan pendekatan **Soulbound NFT** (non-transferable). Proses minting dan update on-chain di-handle di `lib/metaplex.ts` dengan retry-mechanism karena RPC devnet sering limit.
- **Revocation**: Pencabutan ijazah dilakukan menggunakan metode **Visual Revoke** (mengupdate URI metadata NFT on-chain menggunakan `isMutable: true` menjadi gambar/label DIBATALKAN).
