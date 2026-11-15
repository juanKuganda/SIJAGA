# Brief Bab 4 SIJAGA — untuk Gemini (Antigravity)

**Untuk:** Gemini (Antigravity) — sesi baru, jangan lanjut thread lama.
**Dari:** Juan Pablo Putra Kuganda.
**Tanggal:** 15 November 2026.

## Tugasmu

Nilai rancangan pengujian Bab 4 di panduan di bawah ini — (1) rencana eksekusi uji server institusi mati (F1–F3), (2) rencana implementasi jalur verifikasi tingkat-1 di portal (prompt iii), (3) rencana penulisan Bab 4 dari angka final n=30 — dan laporkan celah, risiko, atau kontradiksi dengan kode/data, dengan bukti (file + baris).

## Keadaan terbaru (15 Nov 17:24)

- Revisi Bab 1–3 sudah dikirim ke SIPENDEKAR, menunggu review dospem.
- Laptop sudah beres.
- Repo: juanKuganda/SIJAGA, branch feat/bab4-experiments. Jangan sentuh main, jangan push/merge tanpa perintah Juan.
- Tes manual dikerjakan Juan sendiri di laptop, bukan olehmu.

## Catatan penting soal status panduan

Panduan di bawah ini bertuliskan "DIPARKIR". Itu berlaku untuk EKSEKUSI/implementasi. Review rancangan (baca saja, tanpa ubah apa pun) BOLEH jalan sekarang — itu tugasmu di file ini. Eksekusi baru jalan sesudah review ini diselaraskan dengan Pablo.

## Fakta yang sudah dikoreksi (pakai versi ini, bukan yang lama)

- Endpoint Blinks (`app/api/actions/verify`) DB-first, BUKAN jalur tingkat-1 mandiri: query Prisma pakai NIM/dompet, tidak ada parameter alamat aset, tidak membaca atribut Status dari metadata. Yang bisa dipakai ulang: `inspectCertificate()` di `lib/onchain.ts`.
- Hash: draf dan kode selaras — 3 atribut + salt (`generateDataHash`, `lib/crypto.ts`). Fungsi `generateCertificateHash` tidak ada di repo.
- Biaya mint: 0,0032626 SOL (fee 10.000 + rent 3.252.600 lamport).
- Challenge: konstanta `CHALLENGE_EXPIRY_MS` = 5 menit; nonce di DB (`VerificationNonce`) dengan `usedAt`, bukan flag boolean, bukan memori.
- Revoke: fungsi `update` (mpl-core), Status "Dibatalkan", gambar = PNG hasil generate yang diunggah ke IPFS; tanpa burn/thaw.
- Judul bab "menempel" bukan cacat — ada line break di XML, tampil dua baris di Word.
- Angka final n=30: penerbitan 28/30 (93,3%), verifikasi median 7,49 detik, pencabutan 30/30 median 10,53 detik. Vonis: "Layak bersyarat".

## Aturan

- Jangan ubah kode atau draf.
- Jangan usulkan pengulangan eksperimen demi angka lebih baik.
- Kalau menemukan kesalahan di kerja Pablo, katakan langsung dengan bukti.
- Tesis mengikuti kode, bukan sebaliknya.

---

# Panduan Bab 4 + Codebase (isi lengkap)

PANDUAN BAB 4 + CODEBASE — SIJAGA
Tesis SIJAGA — Rancang Bangun Sistem Verifikasi Kepemilikan Ijazah Berbasis Token Non-Transferable pada Blockchain Solana dengan Arsitektur Two-Tier
DIPARKIR — JANGAN DIKERJAKAN SEKARANG. File ini berisi semua pekerjaan Bab 4 + codebase + artikel. Kerjakan hanya setelah revisi Bab 1–3 selesai dan dospem membaca ulang. File aktif sekarang: Panduan Revisi Draf (Bab 1–3).

Isi file ini: §4 koreksi kode (fakta untuk Bab 4 + artikel) · §5 eksekusi TC-15 · §6 Bab 4 final (refresh draf interim ke angka final n=30) · §7 artikel SYNTIA · §9 keputusan (9, 12, 13, 14, 16, 17, 18, 19) · Lampiran B brief Antigravity (ii OPSIONAL; iii AKAN DIKERJAKAN). Penomoran § dipertahankan dari panduan asal agar semua rujukan silang tetap cocok.
Status Bab 4: final n=30, vonis "Layak bersyarat" (K0 + K1 + K2 lolos; K3 + K4 tidak). Keputusan Juan 14 Nov: jalur HEMAT — terima "Layak bersyarat" + syarat deployment; TIDAK ada uji ulang n=30; eksperimen mitigasi diparkir sebagai bonus opsional pasca-tesis.
Update v2 (15 Nov 00:55): keputusan no. 10 DIPUTUSKAN — alamat admin boleh ditulis di Bab 3/4 sebagai alamat penerbit publik. Tidak ada perubahan isi lain.
## §4  Koreksi kode yang wajib masuk Bab 4 + artikel
A2 — DB-first / fail-closed: /api/verify lookup Prisma dulu (wallet, user, certificate); on-chain (inspectCertificate) baru sesudahnya. DB mati → 404 ("Wallet/NIM tidak ditemukan") atau 500 ("Terjadi kesalahan server"). Tidak ada cabang yang mengembalikan verdict verifiedOnChain saat DB tidak bisa dibaca.
A3 — Dua field respons: verifiedOnChain (= !!onChainValid) vs verifiedNominative (= !piiDeleted && hashVerified); headline verified = verifiedOnChain. verifiedNominative butuh dataSalt Tier 1 — tingkat 2 struktural tidak bisa mandiri.
### KOREKSI PENTING 1 — TC-13 (wajib masuk Bab 4 + artikel)
Klaim lama "TC-02/03/04/13 = Invalid Authority" salah untuk TC-13. Yang benar: TC-02, TC-03, dan TC-04 ditolak dengan "Invalid Authority" (program mplCore); TC-13 ditolak dengan "Neither the asset or any plugins have approved this operation". Penolakan tetap deterministik on-chain (PASS), hanya pesan error-nya berbeda. Kalimat siap pakai: "TC-02, TC-03, dan TC-04 ditolak dengan 'Invalid Authority'; TC-13 ditolak dengan 'Neither the asset or any plugins have approved this operation' — keduanya penolakan deterministik oleh program Metaplex Core." — Artikel SYNTIA para 69 saat ini salah mengelompokkan TC-13 (lihat §7, C5).
### KOREKSI PENTING 2 — dua pasangan aset jangan dicampur (wajib)
Materi tugas lama memasangkan aset FkECJr9… dengan metadata P2.6 QmPuym… — itu dua aset berbeda, diverifikasi live 14 Nov via getAsset. Jangan pernah menulis FkECJr9… + QmPuym… dalam satu baris bukti.
| Pasangan | Aset (mint) | Owner (dompet) | Metadata IPFS (URI) | Data Hash |
|---|---|---|---|---|
| 1 — K0 / mint trial 30 (8 Nov) | FkECJr9joaazSw5kPksHipb5bYEaN5TS3E6JYtaeco5e | 8jKozQvt4XxMtTCyZuoJehGTG6tYesqZYv76gCphdzvp | gateway.pinata.cloud/ipfs/Qmd2hmpuWp4phfAAf1LqBnEaa6mFsB8tPAfrqFttmYuvFP | sha256:f06116bb6e874288caefb3ac2222afeac4a5dabda5ec7569edd235445d85cd76 |
| 2 — Trace P2.6 ("Trace Test", NIM TRACE414503) | FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc | FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D | gateway.pinata.cloud/ipfs/QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j | sha256:56a51c98cce45b2675301c1727964c3dd90b58bcac6d120ebed97eebaf600244 |

Kedua pasangan: updateAuthority = Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ (institusi), plugin frozen: true. Rekomendasi untuk Bab 4/TC-15: pakai Pasangan 2 (trace) — dompetnya diketahui dan getAssetsByOwner-nya total 1.
KEPUTUSAN JUAN: DIPUTUSKAN (15 Nov): YA — alamat admin Bat5VTbj… ditulis di Bab 3/4 sebagai "alamat penerbit institusi (publik)". Alamat publik (bukan secret), sudah muncul di K0-EVIDENCE.md + CHECKPOINT.json.
Nuansa DAS (temuan baru, wajib untuk TC-15): pada respons getAsset untuk KEDUA aset, field tingkat atas `ownership.frozen` bernilai false, sementara `plugins.permanent_freeze_delegate.data.frozen` bernilai true. Ini cocok dengan cara isFrozen() di lib/onchain.ts:105–135 (membaca plugin, bukan field atas) — kode portal SUDAH benar. Tapi siapa pun yang menulis TC baru dengan DAS mentah dan mengecek `ownership.frozen` akan salah menyimpulkan "tidak beku". Bukti beku = `plugins.permanent_freeze_delegate.data.frozen == true`.
## §5  TC-15 "Tier 1 tidak tersedia" — eksekusi (tanpa portal/DB)
Status: SUDAH DIBUKTIKAN BISA DIJALANKAN. Semua perintah curl di bawah dijalankan live oleh auditor pada 14 Nov 2026 dari VM ini (RPC publik + gateway IPFS publik, tanpa login, tanpa .env, tanpa portal, tanpa DB). Hasil live cocok dengan receipt P2.6. Perintah memakai Pasangan 2 (trace P2.6) — lihat §4. Aset yang dipakai adalah data fiktif eksperimen ("Trace Test", NIM TRACE414503), BUKAN data mahasiswa asli.
Prasyarat: terminal dengan `curl` + `python3` (untuk membaca JSON dengan rapi; `jq` boleh menggantikan `python3 -m json.tool`). TIDAK perlu: localhost, .env.local, dompet, login, atau server SIJAGA. TIDAK ada transaksi tulis — semua perintah adalah baca (getAsset, getAssetsByOwner, GET IPFS).
### Langkah 0 — Ekspektasi negatif: portal HARUS gagal (fail-closed)
Tanpa Tier 1, /api/verify mengembalikan 404 ("Wallet/NIM tidak ditemukan") atau 500 ("Terjadi kesalahan server") — lihat §4, A2. Jalankan dari terminal mana pun (ganti http://localhost:3000 dengan URL portal bila sudah deploy; bila laptop belum beres, langkah ini DITUNDA ke F2, dan TC tetap sah dari Langkah 1–4 saja):
curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3000/api/verify?query=FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D"
Hasil yang diharapkan: HTTP 404 atau 500 berisi {"error": ...} dan TIDAK ADA field verified / verifiedOnChain / verifiedNominative. Apa pun selain itu = portal TIDAK fail-closed (temuan untuk Bab 4).
### Langkah 1 — Baca aset on-chain via DAS publik (tingkat 1, bukti 1 dari 3)
curl -s -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getAsset","params":{"id":"FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc"}}' \
  | python3 -m json.tool | tee /tmp/tc-tier1-getasset.json
Hasil yang diharapkan (hasil live 14 Nov 2026 — foto/simpan output ini sebagai bukti): "interface": "MplCoreAsset"; "id": "FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc"; content.metadata.name: "Ijazah S1 - Universitas Tadulako"; content.json_uri: "https://gateway.pinata.cloud/ipfs/QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j"; authorities[0].address: "Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ" (institusi, scopes ["full"]); ownership.owner: "FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D"; plugins.permanent_freeze_delegate.data.frozen: true; burnt: false. PERINGATAN (§4, Nuansa DAS): ownership.frozen di respons ini bernilai false — ABAIKAN field itu; bukti beku adalah plugins.permanent_freeze_delegate.data.frozen == true. Yang dibuktikan langkah ini: token ADA, diterbitkan institusi, belum dibakar, dan dibekukan (plugin). Yang TIDAK dibuktikan: siapa nama manusia di balik dompet itu (itu tingkat 2).
Langkah 1c — alternatif pasangan K0 (bila penguji mau aset kedua): ganti id di atas dengan FkECJr9joaazSw5kPksHipb5bYEaN5TS3E6JYtaeco5e. Hasil yang diharapkan: owner 8jKozQvt4XxMtTCyZuoJehGTG6tYesqZYv76gCphdzvp; json_uri …/Qmd2hmpuWp4phfAAf1LqBnEaa6mFsB8tPAfrqFttmYuvFP; authority dan plugin-frozen sama seperti di atas. Jangan campur URI/hash pasangan ini dengan pasangan trace (§4).
### Langkah 2 — Dompet trace hanya punya SATU aset (tingkat 1, bukti 2 dari 3)
curl -s -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"getAssetsByOwner","params":{"ownerAddress":"FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D","page":1,"limit":10}}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['result']; print('total:',d.get('total')); [print(' -',a['id'],a['content']['metadata'].get('name')) for a in d.get('items',[])]"
Hasil yang diharapkan: `total: 1` dan satu baris `FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc Ijazah S1 - Universitas Tadulako`. Yang dibuktikan: tidak ada aset ganda/duplikat atas dompet yang sama (mendukung klaim "tanpa double-mint" di sisi pembacaan publik; gerbang anti-double-mint-nya sendiri tetap di Tier 1 — jangan klaim lebih dari itu).
### Langkah 3 — Ambil metadata IPFS publik, baca Data Hash (tingkat 1, bukti 3 dari 3)
curl -s "https://gateway.pinata.cloud/ipfs/QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j" \
  | tee /tmp/tc-tier1-metadata.json \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('nama:',d['name']); print('atribut:',[(a['trait_type'],a['value']) for a in d['attributes']])"
Hasil yang diharapkan (hasil live 14 Nov 2026): name: "Ijazah S1 - Universitas Tadulako", symbol: "SIJAGA"; atribut Data Hash: "sha256:56a51c98cce45b2675301c1727964c3dd90b58bcac6d120ebed97eebaf600244" — nilai ini IDENTIK dengan hash Tier 1 pada handoff P2.6 (sha256:56a51c…600244). Inilah "hash on-chain (Pinata) identik hash Tier 1" yang sudah terverifikasi 8 Nov. Bila gateway Pinata lambat/mati, ulangi dengan gateway publik lain (ganti host saja, CID sama): https://ipfs.io/ipfs/QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j atau https://w3s.link/ipfs/QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j — catat gateway mana yang dipakai dan waktunya (disiplin ukur: tiap fetch 2–3×, ambil nilai yang paling sering muncul; jangan simpulkan dari satu sampel). Yang dibuktikan: hash tercatat publik dan bisa dibaca siapa pun. Yang TIDAK dibuktikan: kecocokan hash dengan nama/NIM/prodi — karena hitung-ulang butuh salt yang hanya ada di Tier 1. Inilah batas persis tingkat 1 vs tingkat 2.
### Langkah 4 — Stateless challenge: bukti dompet dikuasai pengecek, tanpa DB
Verifikasi signature Ed25519 (nacl.sign.detached.verify, lib/challenge.ts:194) hanya butuh pesan + signature + pubkey — matematika offline. Yang butuh DB di portal saat ini hanyalah pembukuan nonce (terbit, cek belum dipakai, tandai dipakai). Bukti yang dijalankan auditor 14 Nov 2026: skrip Node sekali pakai di /tmp (keypair dibuat di memori lalu dibuang, BUKAN keypair asli siapa pun) memakai tweetnacl dari node_modules repo: nonce 128-bit dipilih verifier sendiri, pesan ditandatangani, verify(pesan asli) = true, verify(pesan diubah 1 karakter) = false. Kesimpulan: "Ed25519 offline TERBUKTI tanpa DB."
Batasan jujur (wajib ditulis di Bab 4): skrip itu membuktikan MATEMATIKANYA, bukan anti-replay-nya. Nonce stateless (verifier memilih nonce sendiri, mis. nonce = SHA-256(verifier-domain || aset || tanggal-jam) atau nonce acak yang dicatat verifier di kertas/log lokal) mencegah replay hanya sejauh verifier itu sendiri menolak nonce lama — TIDAK ada perlindungan replay global tanpa penyimpanan bersama. Jadi klaim yang benar: "tingkat 1 + bukti penguasaan dompet dapat diperiksa tanpa Tier 1; anti-replay global tetap butuh pembukuan (di verifier atau di Tier 1)". Jangan klaim "challenge stateless sepenuhnya setara dengan challenge portal".
Prosedur manual untukmu (di laptop, setelah beres; dompet fiktif trace atau dompet uji sendiri, JANGAN dompet berisi aset asli orang lain):
1.  Verifier (kamu sebagai pihak ketiga) memilih nonce sendiri dan menulis pesan persis format portal (lib/challenge.ts:15–30): 6 baris — "SIJAGA Verification Challenge", "Context: Academic Credential Verification (Universitas Tadulako)", "Wallet: <alamat>", "Nonce: <32 hex>", "IssuedAt/ExpiresAt" ISO. Salin format persis dari lib/challenge.ts:15–30, jangan dikarang.
2.  Pemegang dompet menandatangani pesan itu di Phantom/Solflare (Sign Message) — atau di console browser: await window.solana.signMessage(new TextEncoder().encode(pesan)) — lalu salin signature base58-nya.
3.  Verifier memeriksa offline dengan skrip Node (memakai tweetnacl + bs58 yang sudah jadi dependensi repo — package.json:34,53):
// /tmp/verify-stateless.mjs — ganti PESAN, SIGNATURE_B58, WALLET_B58 dengan nilai uji
import nacl from "/home/hatch/workspace/sijaga-bab4-check6/node_modules/tweetnacl/nacl-fast.js";
import bs58 from "/home/hatch/workspace/sijaga-bab4-check6/node_modules/bs58/index.js";
const PESAN = "SIJAGA Verification Challenge\n"
  + "Context: Academic Credential Verification (Universitas Tadulako)\n"
  + "Wallet: FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D\n"
  + "Nonce: <32 hex — pilih sendiri>\n"
  + "IssuedAt: <ISO>\n"
  + "ExpiresAt: <ISO>";
const SIGNATURE_B58 = "...tempel signature base58 dari dompet...";
const WALLET_B58 = "FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D"; // dompet trace (contoh)
const ok = nacl.sign.detached.verify(Buffer.from(PESAN, "utf-8"), bs58.decode(SIGNATURE_B58), bs58.decode(WALLET_B58));
console.log("Signature valid (offline, tanpa DB):", ok);
Hasil yang diharapkan: true untuk pesan asli + signature asli; false bila pesan diubah satu karakter (uji negatif ini WAJIB dilakukan — itu yang membuktikan verifikasi bekerja, bukan sekadar "selalu true").
### Tabel verdict TC-15 (siap salin ke Bab 4)
| Pemeriksaan | Tanpa Tier 1 (portal/DB mati) | Hasil |
|---|---|---|
| Token ada di devnet (getAsset) | Ya, via RPC publik | DAPAT DIPERIKSA |
| Penerbit = institusi (authorities) | Ya, Bat5VTbj… | DAPAT DIPERIKSA |
| Beku (plugins…frozen) | Ya, true | DAPAT DIPERIKSA |
| Pemilik = dompet yang diklaim (ownership.owner) | Ya, cocok dengan dompet pengecek | DAPAT DIPERIKSA |
| Hash tercatat di metadata IPFS | Ya, sha256:56a51c… | DAPAT DIPERIKSA |
| Dompet dikuasai pengecek (challenge stateless) | Ya, Ed25519 offline | DAPAT DIPERIKSA |
| Hash cocok dengan nama/NIM/prodi (hitung-ulang) | Tidak — butuh salt Tier 1 | TIDAK DAPAT DIPASTIKAN |
| Dompet itu milik NAMA tersebut (nominatif) | Tidak — butuh baris User/Wallet Tier 1 | TIDAK DAPAT DIPASTIKAN |

Verdict TC-15: Tingkat 1 LULUS; Tingkat 2 "TIDAK DAPAT DIPASTIKAN" — BUKAN "tidak valid". Kalimat kunci untuk naskah: "Ketika Tier 1 tidak tersedia, ijazah TIDAK dinyatakan palsu; yang hilang hanyalah kemampuan memastikan ikatan dompet–identitas, sementara keabsahan token, pembekuan, penerbit, dan penguasaan dompet tetap dapat diperiksa siapa pun."
### Tes manual TC-15 untukmu (di laptop, setelah beres)
Kondisi saat ini (14 Nov 2026): laptop Windows-mu (ASUS VivoBook X415JA) RUSAK — tes manual tertunda sejak 8 Nov (terakhir stuck langkah A3: admin memverifikasi wallet). Semua langkah di bawah MENUNGGU laptop beres. Kabar baik: Langkah 1–4 TC TIDAK butuh laptopmu — bisa dijalankan dari terminal mana pun (termasuk VM ini, sudah dibuktikan auditor) — jadi "Tier 1 tidak tersedia" justru paling mudah dibuktikan tanpa laptop.
F1 — Yang TIDAK butuh laptop (bisa hari ini, dari terminal mana pun): (1) Buka terminal (di laptop setelah beres, atau mesin mana pun yang ada curl). (2) Jalankan Langkah 1 (getAsset FDQKnrLV…) — foto/simpan: owner FGpNtVV1…, authority Bat5VTbj…, plugins.permanent_freeze_delegate.data.frozen: true, json_uri …/QmPuym…. Catat jam + tanggal. (3) Jalankan Langkah 2 (getAssetsByOwner FGpNtVV1…) — foto: total: 1. (4) Jalankan Langkah 3 (fetch metadata IPFS CID QmPuym…) — foto: atribut Data Hash sha256:56a51c…600244. Ulangi 2–3× (bila gateway lambat, coba ipfs.io / w3s.link dengan CID yang sama) dan catat gateway + waktu tiap ulangan. (5) Isi tabel verdict di atas: keenam baris tingkat 1 = "DAPAT DIPERIKSA", kedua baris tingkat 2 = "TIDAK DAPAT DIPASTIKAN". Jangan tulis "tidak valid" di mana pun. (6) (Opsional, bila ada dompet uji) Jalankan Langkah 4 stateless-challenge dan foto output "Signature valid (offline, tanpa DB): true" + uji negatif false saat pesan diubah. Pakai HANYA dompet uji/data fiktif — jangan pakai dompet berisi aset asli.
F2 — Simulasi "Tier 1 tidak tersedia" di localhost secara aman (butuh laptop + .env.local). Simulasi ini membuktikan portal fail-closed; ia TIDAK membuktikan tingkat 1 (itu sudah dibuktikan F1). Lakukan HANYA setelah laptop beres dan HANYA dengan data fiktif (aset trace FDQKnrLV… / NIM TRACE414503). (1) Jalankan portal lokal seperti biasa (npm run dev — pakai .env.local yang sudah ada; JANGAN membuat .env baru, JANGAN mengetik ulang secret ke mana pun). (2) Buktikan portal hidup dulu: curl "http://localhost:3000/api/verify?query=FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D" — foto respons suksesnya (ada verifiedOnChain/verifiedNominative). (3) Hentikan AKSES database sementara — pilih SATU cara yang sesuai setup-mu (cek dulu prisma/schema.prisma bagian datasource: bila Postgres lokal via Docker, docker stop <nama-container-db>; bila database remote, JANGAN ubah apa pun di remote — lewati F2). Yang DILARANG: menghapus database, menghapus tabel, mengubah isi Tier 1, atau mematikan IPFS/RPC publik (bukan milikmu). (4) Ulangi curl yang sama — foto responsnya. Yang diharapkan: HTTP 500 {"error":"Terjadi kesalahan server"} atau 404 — dan TIDAK ADA field verified. (5) Segera hidupkan lagi database (docker start … / restart service), ulangi curl langkah 2, foto respons sukses kembali sebagai bukti pemulihan. (6) Catat di log TC: jam mati DB, jam hidup lagi, isi respons 500/404, dan isi respons pulih. Bila langkah 3 tidak bisa dilakukan karena setup DB-mu tidak diketahui (mis. DB-nya remote/shared), LEWATI F2 — TC tetap sah dari F1 + Langkah 0 (ekspektasi kode A2). Jangan memaksa simulasi dengan cara yang berisiko.
KEPUTUSAN JUAN: Setup database lokalmu seperti apa — Postgres di Docker lokal, service lokal, atau remote/shared? Jawaban ini menentukan apakah F2 bisa dilakukan dengan aman, atau harus dilewati.
F3 — Checklist bukti TC (centang saat eksekusi): [ ] Output getAsset (Langkah 1): owner, authority, plugin-frozen, json_uri — file /tmp/tc-tier1-getasset.json. [ ] Output getAssetsByOwner (Langkah 2): total: 1. [ ] Output metadata IPFS (Langkah 3): Data Hash sha256:56a51c… + nama gateway + waktu (2–3 ulangan). [ ] (Opsional) Output stateless-challenge (Langkah 4): true + uji negatif false. [ ] (Bila F2 dilakukan) Respons /api/verify sebelum (sukses), saat DB mati (500/404), sesudah pulih (sukses). [ ] Tabel verdict terisi + kalimat kunci "TIDAK DAPAT DIPASTIKAN, BUKAN tidak valid". [ ] Semua bukti memakai data fiktif trace P2.6 — TIDAK ADA data mahasiswa asli di bukti.
## §6  Bab 4 final (Phase 3) — refresh draf interim ke angka final n=30
Draf interim yang di-refresh: ~/workspace/goals/sijaga-thesis-revision-support/files/Bab4-Draf-Interim-2026-11-08.md (277 baris, angka era Batch 1 — BASI). Konvensi angka: median = median STANDAR (n ganjil = nilai tengah; n genap = rata-rata dua nilai tengah). p95 = nearest-rank (nilai tertinggi ke-2 untuk n=28/30 — sesuai Bab 3: dengan n=30, p95 praktis adalah nilai tertinggi kedua, bersifat indikatif). Semua waktu dalam detik (dtk), semua biaya dalam lamport/SOL.
### P3.1 — Tabel statistik per operasi (nilai final terverifikasi — pakai tabel ini)
| Operasi | n trial | Sukses | Median (standar) | p95* | Min | Maks | Rincian median |
|---|---|---|---|---|---|---|---|
| Mint (penerbitan) | 30 | 28/30 (93,3%) | 13,573 dtk | 33,542 dtk | 9,586 | 40,630 | on-chain 4,611 / IPFS 6,462 |
| Verify (verifikasi) | 30 | 30/30 (100%) | 7,489 dtk | 16,293 dtk | 4,898 | 19,161 | RPC 0,981 / IPFS 5,796 / challenge 0,446 (n=21) |
| Revoke (pencabutan) | 30 | 30/30 (100%) | 10,530 dtk | 17,987 dtk | 9,376 | 75,161 | on-chain 4,114 / IPFS 5,361 |

* p95 nearest-rank atas trial sukses (mint n=28; verify/revoke n=30) = nilai tertinggi ke-2; indikatif, bukan presisi. Yang wajib ditulis di P3.1: (1) keberhasilan percobaan pertama vs dalam-2-percobaan untuk mint — keduanya 28/30 (retry tidak menyelamatkan satu pun); (2) rincian verify hanya n=21 (trial 1–9 hanya total — rincian HANYA ada di summary-verify.csv, TIDAK di JSONL — wajib sebut sumber CSV); (3) revoke trial 27 outlier (total 75,161; IPFS 70,632; on-chain 3,668 — outlier murni IPFS); (4) verify trial 19 outlier (total 19,161; RPC 13,017 — satu-satunya RPC >3,8 dtk di antara 21 trial berinci); (5) definisi "penerbitan" yang diukur (hash → upload IPFS → mint sampai finalized; registrasi Tier 1 + persetujuan admin TIDAK masuk waktu ukur); (6) jendela waktu aktual 4 batch (7 Nov 22:22–23:36; 8 Nov 11:14–11:20; 8 Nov 12:22 verify smoke; 8 Nov 14:08–14:22; 8 Nov 17:33–17:43).
### P3.2 — Tabel perbandingan ambang vs hasil final n=30 + vonis
Ambang dari Bab 3 Tabel 3.5. K2 formal = ≤ USD 1; operasional = ≤ 0,005 SOL (Bab 3 baris 234) — keduanya LOLOS ($0,29 < $1; 0,0032626 < 0,005).
| Kode | Kriteria | Ambang | Hasil final n=30 (terukur) | Status |
|---|---|---|---|---|
| K0 (wajib) | Non-transferable ditegakkan platform | Semua percobaan pindah ditolak (TC-02, TC-03, TC-04, TC-13) | test-tc 14/14 PASS; TC-02/03/04 "Invalid Authority"; TC-13 "Neither the asset or any plugins have approved this operation"; aset frozen:true, updateAuthority = institusi | LOLOS |
| K1 | Kecepatan penerbitan | Median ≤ 30 dtk; p95 ≤ 60 dtk | Median 13,573 dtk; p95 33,542 dtk (n=28 sukses) | LOLOS |
| K2 | Biaya penerbitan | ≤ USD 1 (formal); ≤ 0,005 SOL (operasional) | 0,0032626 SOL/trial ≈ $0,29 (SOL ~$87,76, 9 Nov 2026 — sumber kurs BELUM terverifikasi); ≈ Rp5.181 | LOLOS |
| K3 | Keandalan transaksi | ≥ 95% (percobaan pertama; dilaporkan berdampingan dengan dalam-2-percobaan) | 28/30 = 93,3% (percobaan pertama DAN dalam-2-percobaan — sama); kurang 1 trial dari 29/30 = 96,7% | TIDAK LOLOS |
| K4 | Kecepatan verifikasi | Median ≤ 5 dtk | Median 7,489 dtk; p95 16,293 dtk; hanya 2/30 ≤ 5 dtk | TIDAK LOLOS |

Vonis final: "LAYAK BERSYARAT" — K0 + K1 + K2 lolos; K3 + K4 tidak lolos; komponen gagal WAJIB disebut namanya (keandalan penerbitan + kecepatan verifikasi). Syarat deployment (mitigasi yang dirumuskan, BUKAN hasil ukur baru): (1) RPC dengan ketahanan/fallback lebih baik + perbaikan classifier retry agar pola "block height exceeded" di-retry (K3); (2) gateway IPFS khusus/dedikasi atau metadata inline via DAS (K4). KOREKSI rumusan mitigasi K3 (temuan audit): run-metadata mencatat RPC yang dipakai SUDAH Helius (RPC khusus/dedikasi) — jadi jangan tulis seolah-olah eksperimen memakai RPC publik bersama. Rumusan jujur: "Helius Devnet dipakai; dua kegagalan jaringan tetap terjadi; mitigasi = RPC dengan fallback/SLA lebih baik + classifier retry". Eksperimen mitigasi TIDAK dilakukan (keputusan hemat) — mitigasi ditulis sebagai saran, bukan hasil.
Status ambang (DG-2) untuk P3.2: "ambang adalah usulan penulis; diterima IMPLISIT lewat review pembimbing 14 Nov 2026 (tidak dipertanyakan; P5 dinilai GOOD; RM3 memakai ambang sebagai kriteria evaluasi); konfirmasi eksplisit satu baris masih disarankan". JANGAN tulis "sudah dikonfirmasi pembimbing" tanpa kualifikasi "implisit".
### P3.3 — Tabel hasil TC-01–TC-14 (semua PASS — isi dari artefak log, bukan ingatan)
Sumber bukti: test-tc-output.log + test-challenge-output.log (8 Nov 2026) + K0-EVIDENCE.md. Semua 14 PASS. Yang masih harus ditambahkan ke P3.3 (dari feedback 14 Nov, poin 2): definisi dua tingkat verifikasi — WAJIB ditulis di Bab 4 final sebelum tabel TC (definisi + aturan vonis sudah ditempel ke draf Bab 3 [592]–[593] — salin dari sana) — dan TC-15 "Tier 1 tidak tersedia" sebagai spesifikasi + celah diketahui (BELUM DIEKSEKUSI — endpoint /api/verify saat ini DB-first, Tier 1 mati = 500/404; jangan klaim PASS). Pemetaan Masalah→RM→Pengujian: P1 → RM1 → TC-15 (spesifikasi) + TC-12; P4/P5 → GOOD (tidak perlu bukti baru).
| TC | Skenario | Hasil teramati (bukti) | Status |
|---|---|---|---|
| TC-01 | Institusi menerbitkan ke dompet lulusan | Owner 7ap6x8hHfu5tq8NYvijKajfuTZQ2DJM54TpF5H7P9dhz, frozen=true, updateAuthority Bat5VTbj…; mint 3EL8ni8mvPDG17zBwJqQDX4oLzkVqBCsk9ViKRC4rufd, tx AMLz8YnTd8Yq5zQ9QTEXT1VamK1MutJKuD68D6AB7Kw4csMWqQJu8FWSD6t9S6WKcZ1gjmx7FfFczHmdYunJ1QK | PASS |
| TC-02 | Pemilik mencoba transfer | Ditolak on-chain: "Invalid Authority" (program mplCore CoREENxT6t…); aset 3EL8ni8mvPDG17zBwJqQDX4oLzkVqBCsk9ViKRC4rufd | PASS |
| TC-03 | Non-pemilik mencoba transfer | Ditolak on-chain: "Invalid Authority"; attacker 7682auXfUaxh5TJsegqtxGTmuhSf4WUtZKLPkAuX7Ewr | PASS |
| TC-04 | Pemilik mencoba burn saat frozen:true | Ditolak on-chain: "Invalid Authority" | PASS |
| TC-05 | Pemegang menandatangani challenge | Tanda tangan valid, dompet cocok dengan pemilik; nonce 87e1413499a91c5e96226392d1433c2d, sig 2stULChLd11dHbdyYATygyPoJWmMsJ8B… | PASS |
| TC-06 | 4 varian challenge tidak valid | 6a replay: NONCE_ALREADY_USED; 6b asing: INVALID_SIGNATURE (+ WALLET_MISMATCH pada varian 3b); 6c kedaluwarsa: NONCE_EXPIRED; 6d pesan diubah: MESSAGE_MISMATCH | PASS |
| TC-07 | (a) issuer asing; (b) hash mismatch | (a) mismatch=ISSUER (HTTP 200); (b) mismatch=HASH (HTTP 200) via GET /api/verify | PASS |
| TC-08 | Institusi melakukan visual revoke | Name="[DIBATALKAN] Ijazah S1", URI https://gateway.pinata.cloud/ipfs/QmcBhT6moawT4GfnEhCc9enWNSbeNoH67pzVdwXXw4sp3z, tx 5cUgxZkpjum9xgLXfdbnCtJ92EsBFEadRTAZk9P6kJrkF6c57fg5Pj8a5aRohcmX3mfezKn2gqVSaecCBTt3fSYB | PASS |
| TC-09 | Re-issuance ke dompet baru | HTTP 200; mint baru BSjM8JSmuFmCKFFS33W6jbSjCPibSqC6H79zcnsVy6or ke 9nDrVCYwNXEtSZqiYgjU4eq1WDxnZx8HFPc4th3DDBo6; lama REVOKED, replacedById → sertifikat baru; Verified=true | PASS |
| TC-10 | Metadata publik + on-chain tanpa PII | PII check: Name=false, NIM=false, Email=false, Salt=false; atribut: Institusi, Program Studi, Tahun Lulus, Jenjang, Tipe, Data Hash (sha256:e6c89eee…) | PASS |
| TC-11 | Hapus data + salt Tier 1 → rekonstruksi gagal | HTTP 200; dataSalt=null; Reconstruction Failed=true; piiDeleted=true | PASS |
| TC-12 | RPC mati + IPFS diblokir | Dead RPC: ok=false, reason=RPC (rpcMs 6021); Blocked IPFS: ok=false, reason=RPC (rpcMs 2172, ipfsMs 0); Never valid=true — CATATAN: atribusi sub-kasus IPFS tipis (reason=RPC, ipfsMs=0); deskripsikan apa adanya | PASS (catatan) |
| TC-13 | Non-institusi mencoba thaw | Ditolak on-chain: "Neither the asset or any plugins have approved this operation" (BUKAN "Invalid Authority") | PASS |
| TC-14 | Lulusan klaim via memo SIJAGA_CLAIM | Tx terkonfirmasi on-chain; DB Certificate = CLAIMED; sig 9DjNiZj6pFaVs2AjMnCGrQCgKonn8rzCRHDsEJiREuygPLfn3QJySCeQPZd1L9EEGTvDf1jeznZeJTuwiozk1Mw; memo {type: SIJAGA_CLAIM, certId, mint: BSjM8JSmu…} | PASS |

### P3.4 — Tabel proyeksi biaya (PROYEKSI — bukan hasil ukur)
Rumus: biaya per ijazah = fee transaksi + deposit rent = 10.000 + 3.252.600 = 3.262.600 lamport = 0,0032626 SOL (terukur, n=28 sukses; 27/28 receipt lengkap — 1 sukses mencatat fee/rent/slot null, lihat D7). Proyeksi = ekstrapolasi linier (biaya per ijazah × jumlah). Kurs: SOL ~$87,76; Rp18.094/USD — tanggal 9 Nov 2026 pagi; SUMBER KURS BELUM TERCATAT — wajib dilengkapi sebelum naskah dikunci. Labeli setiap angka "proyeksi".
| Skala | SOL | USD (≈) | IDR (≈) |
|---|---|---|---|
| 1 ijazah (terukur) | 0,0032626 | $0,29 ($0,2863) | Rp5.181 (Rp5.180,78) |
| 100 ijazah (proyeksi) | 0,32626 | $28,63 | Rp518.078 |
| 1.000 ijazah (proyeksi) | 3,2626 | $286,33 | Rp5.180.779 |
| 10.000 ijazah (proyeksi) | 32,626 | $2.863,26 | Rp51.807.786 |

Yang WAJIB ditulis bersama tabel: (1) total yang benar-benar dikeluarkan dalam eksperimen = 28 × 0,0032626 = 0,0913528 SOL untuk 28 penerbitan sukses; (2) biaya trial gagal = 0 lamport per receipt (feeLamports null pada 3 baris FAILED) — JANGAN tulis "trial gagal tetap berbiaya" tanpa kualifikasi, karena receipt menunjukkan sebaliknya; verifikasi on-chain fee trial 28 belum dilakukan; (3) biaya revoke TIDAK termasuk proyeksi penerbitan (revoke = 5.000 lamport/trial × 30 = 0,15 SOL total — catat terpisah bila disebut); (4) biaya klaim (DG-1 opsi A, institusi mensponsori) TIDAK diukur dalam n=30 — bukan bagian proyeksi ini; (5) fee + rent adalah konstanta protokol sehingga biaya transfer Devnet→Mainnet, TAPI di Mainnet SOL adalah uang nyata dan priority fee mungkin diperlukan saat kongesti — proyeksi Mainnet tetap "proyeksi"; (6) perbandingan Ethereum HANYA sebagai konteks literatur (estimasi, bukan tolok ukur): mint ERC-721 standar ~150.000 gas; Mar 2025 (2,7 gwei, ETH $2.500) ≈ $0,52–$1,01; live 9 Nov 2026 (0,16 gwei, ETH $2.093) ≈ $0,03–$0,05 — LEBIH MURAH dari Solana hari itu; klaim "Solana lebih murah" wajib membawa harga gas + harga ETH + tanggal; angka gas dari panduan praktisi (bukan peer-review) — JANGAN dikutip sebagai bukti primer; jangkar sitasi tetap Alizadeh & Khabbazian (2025). Keputusan apakah Bab 4 memuat perbandingan ini / pengukuran Sepolia menunggu jawaban Pak Rizka.
KEPUTUSAN JUAN: Sumber kurs SOL $87,76 dan Rp18.094 per 9 Nov 2026 pagi — dari bursa/situs dan jam berapa? Bab 4 + artikel butuh sumber ini agar P3.4 bisa dikutip.
### P3.5 — Temuan privasi + keterbatasan (yang harus ditulis)
Temuan privasi (dari TC-10/TC-11 + P2.6): (1) Metadata publik (IPFS + on-chain) TIDAK memuat nama/NIM/email/salt — hanya Institusi, Program Studi, Tahun Lulus, Jenjang, Tipe, Data Hash (TC-10). (2) Setelah delete-pii: dataSalt = null, rekonstruksi gagal, piiDeleted = true (TC-11). (3) Hash = SHA-256 atas nama.trim()|NIM.toUpperCase()|prodi|salt, salt 128-bit; TAHUN TIDAK masuk hash. (4) Caveat pseudonimitas (wajib): selama institusi memegang salt, hash dapat ditautkan kembali oleh institusi; penghapusan memutuskan ikatan dari sisi institusi, TIDAK menghapus catatan ledger. (5) P2.6 membuktikan ikatan Tier 1 ↔ on-chain end-to-end (n=1, demonstrasi, bukan pengukuran) — hash identik, aset frozen:true, updateAuthority = institusi.
Keterbatasan (wajib, jangan disembunyikan):
(1) Semua diukur di Devnet, bukan Mainnet — biaya transfer (konstanta protokol), reliabilitas + kecepatan Mainnet WAJIB diukur ulang dengan SOL nyata + RPC khusus.
(2) n=30: p95 indikatif (nilai tertinggi ke-2), bukan presisi; tidak ada uji statistik inferensial.
(3) Ambang = usulan penulis, diterima implisit 14 Nov — konfirmasi eksplisit masih disarankan.
(4) Tes manual (bukti silang §3.7) TIDAK ADA — tertahan di langkah A3 sejak 8 Nov karena laptop rusak; Phase 3 + refresh Bab 4 dikerjakan dari data receipt yang sudah ada.
(5) Rincian per-hop verify hanya n=21 (trial 1–9 hanya total).
(6) Outlier ekor panjang: verify 19,161 dtk (trial 19, RPC 13,017); revoke 75,161 dtk (trial 27, IPFS 70,632).
(7) Challenge UI ditambahkan 8 Nov 23:23, SETELAH pengukuran (API challenge sudah ada saat ukur).
(8) Tidak ada user-acceptance testing (DSRM mengevaluasi artefak, bukan manusia).
(9) Satu jaringan saja (Solana Devnet); tidak ada build Ethereum — kesimpulan terbatas pada kelayakan di Solana, bukan superioritas.
(10) Biaya trial gagal tidak masuk proyeksi karena tercatat null di receipt.
(11) Utang teks D1 (wajib dicatat): challenge REGISTRASI (bukti kepemilikan dompet sebelum penerbitan) belum diimplementasikan — ditunda pasca-submit; saat diimplementasikan, kalimat Bab 3 "Verifikasi ini tidak memakai pembuktian tanda tangan kriptografis" HARUS diubah.
(12) Catatan keamanan (bukan temuan pengukuran): lib/auth.ts menerima ADMIN_WALLET_PRIVATE_KEY sebagai x-admin-key — sebaiknya diganti ADMIN_API_SECRET khusus sebelum production.
(13) DG-1: opsi A disetujui (7 Nov 2026) — institusi mensponsori fee klaim; biaya klaim dicatat terpisah (tidak diukur di n=30).
(14) Alpenglow: Devnet aktif 25 Sep 2026 (epoch 1167, Votor saja; Rotor belum aktif); mainnet-beta aktif 21 Okt 2026 (Votor saja); finalitas 100–150 ms adalah target rancangan, BUKAN hasil ukur.
(15) Kualitas data: bug trialIndex=1; 1 receipt mint sukses tanpa fee/slot; JSONL verify tanpa rincian per-hop.
### P3.6 — Paket hasil Bab 4 (daftar isi yang harus ada)
1.  Metadata run (tanggal 7–8 Nov 2026; klaster Devnet, solana-core 4.4.1, feature-set 2681577653; RPC Helius Devnet; Node v25.7.0; @solana/web3.js ^1.98.4; mpl-core ^1.10.0; umi ^1.5.1; pinata ^2.5.6; next ^16.3.0; React 19.2.4; Prisma ^6.19.3 — versi Prisma/React dari design prompt, bukan run-metadata; versi Phantom Wallet belum terverifikasi; admin wallet institusi Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ).
2.  Tabel P3.1 + P3.2 + P3.3 + P3.4 di atas.
3.  Vonis "Layak bersyarat" + syarat deployment (P3.2).
4.  Demonstration trace P2.6 lengkap (Trace Test, TRACE414503, dompet FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D, mint FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc, tx 3sEL99rJ…, CID QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j, hash identik sha256:56a51c98…600244, verified:true/VALID; batasan: n=1, localhost bukan produksi, seed helper untuk user awal, baris Tier 1 tidak dapat dibaca independen).
5.  Temuan privasi + keterbatasan (P3.5).
6.  Discrepancy log (D1–D16 di bawah).
7.  Definisi dua tingkat verifikasi + spesifikasi TC-15 (P3.3).
8.  Pemetaan Masalah→RM→Tujuan→Batasan→Pengujian sejauh yang bisa disediakan Bab 4.
9.  Materi deskriptif pindahan Bab 3 (sudah benar di draf interim §4.10 — alur penerbitan/hashing, ERD 6 tabel, alur verifikasi, alur revoke + re-issuance, use-case; bisa ditulis penuh tanpa data ukur).
10.  Gambar: homepage SIJAGA (kandidat, perlu crop/konversi; klaim "400ms" di dalamnya bermasalah — bila dipakai, beri keterangan bahwa klaim kecepatan di dalamnya TIDAK berlaku / crop bagian tersebut) + halaman ijazah DB-backed (ID kini tersedia dari P2.6/TC-09; screenshot belum dibuat).
KEPUTUSAN JUAN: Gambar halaman ijazah: pakai ID P2.6 (FDQKnrLV…, NIM TRACE414503) atau TC-09 (BSjM8JSmu…)? Rekomendasi: P2.6. Screenshot diambil dari localhost oleh siapa — kamu (laptop rusak jadi kendala?) atau dari artefak yang sudah ada?
### Refresh draf interim — 35 butir (lokasi = baris file interim 277 baris)
| Butir | Lokasi | Lama → Baru (terverifikasi) |
|---|---|---|
| B01 | L3–L7 (header) | "Semua angka INTERIM — n belum lengkap (mint 15/30, verify 9/30, revoke 8/30)" → n FINAL: mint 30 trial (28 sukses), verify 30/30, revoke 30/30; vonis final: Layak bersyarat (K0+K1+K2 lolos, K3+K4 tidak). Ganti header jadi "Draf final berbasis n=30" + hapus label INTERIM. |
| B02 | L9–L14 (sumber angka) | "verifikasi Pablo atas Batch 1 + trial malam 7 Nov" → tambah Batch 2 + Batch 3 (8 Nov sore), test-tc-output.log + test-challenge-output.log + K0-EVIDENCE.md + trace P2.6 (8 Nov 19:50); hitung ulang median standar dari JSONL/CSV (14 Nov). |
| B03 | L42–L44 (§4.2) | Peringatan "masih harus dicocokkan" DICABUT — dicocokkan ke run-metadata.json 7 + 8 Nov: Devnet, Helius, Node v25.7.0, solana-core 4.4.1, feature-set 2681577653, admin Bat5VTbj…. |
| B04 | L46–L47 (Alpenglow) | Tetap benar; TAMBAH: mainnet-beta aktif 21 Okt 2026 (Votor saja); finalitas 100–150 ms = target rancangan, bukan hasil ukur. |
| B05 | L52 (Node) | "Node: v25.7.0 (per laporan run-metadata; cocokkan)" → v25.7.0 — cocok dengan run-metadata.json 7 + 8 Nov. |
| B06 | L53–L55 (commit) | Commit 852b7a0 + 4005522 ADA di repo lokal; baseline 3fe64f0 cocok dengan CHECKPOINT. Pemetaan commit Batch 2/3 + P2.6 belum dipetakan (parsial). |
| B07 | L60–L65 (§4.3) | "Sisa yang benar: mint 15, verify 21, revoke 22" → SUDAH jalan semua (Batch 2 + 3 selesai 8 Nov). Koreksi penomoran tetap berlaku. |
| B08 | L67–L72 (tabel batch) | Batch 2 SELESAI: mint 16–23 (14:08–14:10), verify 10–11 smoke 12:22 + 12–17 (14:10–14:11), revoke 9–16 (14:12–14:22). Batch 3 SELESAI: mint 24–30 (17:33–17:35), verify 18–30 (17:35–17:37), revoke 17–30 (17:37–17:43). Malam 7 Nov: 22:22–23:36 (bukan 23:30). |
| B09 | L74–L76 (smoke test) | TERKONFIRMASI terjadi: trial verify 10–11 jalan 12:22:50–12:22:58 sebagai smoke test, dihitung dalam Batch 2 (total Batch 2 verify = 8). |
| B10 | L88–L94 (§4.4.1 mint) | Berhasil 14/15 = 93,3%; median 13,08; p95 31,29 → Berhasil 28/30 = 93,3%; median standar 13,573; p95 33,542 (n=28 sukses); biaya tetap 0,0032626 SOL (27/28 receipt lengkap); contoh trial 8 tetap valid (tx + slot cocok dengan CSV); "CreateV2" belum terverifikasi dari receipt. |
| B11 | L96–L98 (bacaan mint) | "margin NOL: 15 trial sisa harus sukses semua" → Yang diperingatkan TERJADI: trial 28 gagal (8 Nov 17:34, "block height exceeded") → final 28/30 = 93,3% → K3 TIDAK LOLOS. |
| B12 | L102–L106 (§4.4.2 verify) | Berhasil 9/9; median 6,80; ≤5 dtk 1 dari 9 → Berhasil 30/30; median standar 7,489; ≤5 dtk 2 dari 30 (4,898; 4,984); tercepat tetap 4,898. |
| B13 | L108–L112 (bacaan verify) | "Supaya median akhir ≤ 5 dtk, 15 dari 21 trial sisa harus ≤ 5 dtk" → Dari 21 trial sisa hanya 1 yang ≤5 dtk (trial 23, 4,984) → median akhir 7,489 → K4 TIDAK LOLOS (terkonfirmasi). |
| B14 | L116–L119 (§4.4.3 revoke) | Berhasil 8/8; median Batch 1 (upper) 10,21 → Berhasil 30/30; median standar 10,530; p95 17,987; min 9,376; maks 75,161 (trial 27, IPFS 70,632). |
| B15 | L121–L129 (§4.5 tabel ambang) | K0 "belum diputuskan"; K1 "lolos sementara"; K2 "USD TBD"; K3 "margin nol"; K4 "tidak lolos sementara" → K0 LOLOS; K1 LOLOS (13,573/33,542); K2 LOLOS (0,0032626 SOL ≈ $0,29 — sumber kurs belum terverifikasi); K3 TIDAK LOLOS (28/30); K4 TIDAK LOLOS (7,489). Pakai tabel P3.2. |
| B16 | L131–L133 (vonis interim) | "condong layak bersyarat (K0–K3 lolos, K4 tidak)" → Vonis final: "Layak bersyarat" (K0+K1+K2 lolos; K3+K4 TIDAK lolos). Koreksi: interim mengasumsikan K3 lolos — final K3 GAGAL. |
| B17 | L139–L152 (§4.6 tabel TC) | TC-02/03/04 "klaim agent lulus — artefak belum ada"; TC-05/06 "belum terverifikasi"; TC-08/13/14 "TBD" → SEMUA terisi dari artefak (pakai tabel P3.3). |
| B18 | L154–L160 (catatan jujur) | "klaim agent test:tc 14/14, test-challenge 100%, build 42 rute tidak bisa diverifikasi independen" → test-tc 14/14 + test-challenge 4/4 kini TERVERIFIKASI dari log artefak (8 Nov). "Build 42 rute" TETAP belum terverifikasi. tsc 14 error / lint 1 warning: laporan Pablo, tidak diverifikasi ulang audit ini. |
| B19 | L169–L170 (§4.7 P2.6) | "P2.6 demonstration trace — belum dikerjakan" → P2.6 SELESAI 8 Nov 19:50 — PASS. Hash Tier 1 = hash on-chain (sha256:56a51c98…600244, assert strictEqual); Trace Test / TRACE414503; tx 3sEL99rJ…; CID QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j; verified:true/VALID. Celah TERTUTUP. |
| B20 | L172–L194 (§4.8 dekomposisi) | Manual sekali (8 Nov 11:58): RPC 1,09 dtk; IPFS 6,24 dtk; challenge "sisa kecil (belum terukur)"; median total 6,80 → GANTI dengan rincian INSTRUMEN n=21 (trial 10–30): RPC 0,981 / IPFS 5,796 / challenge 0,446; median total 7,489. Angka manual jadi catatan kaki historis (sampel tunggal, bukan presisi). Kesimpulan tetap: gateway IPFS mendominasi (~3/4 median total); bukan jaringan Palu/kongesti (RPC <1 dtk). |
| B21 | L196–L204 (§4.9 proyeksi) | "TBD — jangan isi dari ingatan" → ISI dengan tabel P3.4 (100/1.000/10.000 + rumus + kurs + tanggal). Catatan: sumber kurs belum terverifikasi; biaya trial gagal = 0 per receipt. |
| B22 | L243–L246 (§4.12.2 klaim 400ms) | "bertentangan dengan hasil ukur (median verify 6,8 dtk)" → Median verify final 7,489 dtk (≈18,7× klaim 400ms) — pertentangan MAKIN besar. Klaim situs belum diperbaiki (tidak diverifikasi live oleh auditor ini); jangan dikutip di naskah. |
| B23 | L247–L251 (§4.12.3 K2) | DIPUTUSKAN sesuai Bab 3 (Tabel 3.5): formal = ≤ USD 1; operasional = ≤ 0,005 SOL. Keduanya LOLOS ($0,29 < $1; 0,0032626 < 0,005). Wajib cantumkan kurs + tanggal + sumber (sumber belum terverifikasi). |
| B24 | L255–L258 (§4.12.5 DG-2) | "DG-2 masih AUTHOR_PROPOSAL… konfirmasi pembimbing baru Senin 9 Nov 2026" → UPDATE: diterima IMPLISIT lewat review 14 Nov (tidak dipertanyakan; P5 GOOD; RM3 memakai ambang). Konfirmasi eksplisit satu baris masih disarankan. Tetap JANGAN tulis "dikonfirmasi" tanpa kualifikasi "implisit". |
| B25 | L259–L260 (§4.12.6) | "TC-08/13/14 belum terisi di tabel §4.6" → Terisi dari artefak test-tc (lihat B17 / P3.3). |
| B26 | L262–L277 (§4.13 checklist) | Batch 2/3 belum jalan; verifikasi TC belum; Phase 3 belum; proyeksi belum; P2.6 belum; gambar ijazah belum; klaim 400ms belum; DG-2 Senin 9 Nov → Batch 2/3 ✓; verifikasi TC ✓; Phase 3 ✓ (audit ini); proyeksi ✓ (P3.4); P2.6 ✓; gambar ijazah DB-backed MASIH TERBUKA; klaim 400ms MASIH TERBUKA; DG-2 implisit ✓, eksplisit TERBUKA. |
| B27 | L33–L38 (definisi penerbitan) | Tetap berlaku; TAMBAH: ikatan two-tier kini TERBUKTI via P2.6 (endpoint aplikasi asli, hash identik) — bukan lagi "diuji oleh instrumen lain" yang belum ada. |
| B28 | L26–L31 (§4.1) | Tetap; jendela AKTUAL: 7 Nov 22:22–23:36; 8 Nov 11:14–11:20; 8 Nov 12:22 (verify smoke); 8 Nov 14:08–14:22; 8 Nov 17:33–17:43. |
| B29 | L80–L84 (peringatan median upper) | Peringatan itu sendiri tidak akurat: median interim mint 13,08 = median STANDAR atas 14 sukses ((11,269+14,886)/2 = 13,0775) — upper-nya 14,886. Median interim revoke 10,21 = median STANDAR atas 8 — upper-nya 10,396. Hanya verify 6,80 yang ambigu (n=9 ganjil: standar = upper = 6,801). Phase 3 memakai median standar. |
| B30 | L230–L236 (§4.11 halaman ijazah) | ID kini TERSEDIA: P2.6 mint FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc (NIM TRACE414503) atau TC-09 mint BSjM8JSmuFmCKFFS33W6jbSjCPibSqC6H79zcnsVy6or. Screenshot halaman ijazah dengan sertifikat nyata BELUM dibuat. |
| B31 | L225–L229 (§4.11 homepage) | Tetap kandidat; PERINGATAN: halaman itu memuat klaim "400ms" yang salah (B22) — bila dipakai sebagai gambar, beri keterangan bahwa klaim kecepatan di dalamnya TIDAK berlaku / crop bagian tersebut. |
| B32 | L240–L242 (§4.12.1 median) | Hitung ulang SELESAI (Bagian 0). Selisih standar vs upper KECIL: mint 13,573 vs 13,578 (0,005 dtk); verify 7,489 vs 7,565 (0,076 dtk); revoke 10,530 vs 10,613 (0,083 dtk) — tidak mengubah satu pun status lolos/gagal. Perbaikan script bench (bila dilakukan) adalah housekeeping, bukan syarat vonis. |
| B33 | L252–L254 (§4.12.4 lib/auth.ts) | Tetap sebagai saran keamanan; TIDAK ada perubahan kode yang diverifikasi audit ini; bawa ke P3.5 butir (12). |
| B34 | L146, L148, L151, L152 | "TBD dari artefak test-tc" / "TBD — bukti artefak publik" → Terisi semua (B17 / P3.3). |
| B35 | L94 (contoh trial 8) | "Trial 8 Batch 1, tx 2U2Vxszv…, slot 519882157, CreateV2, tanpa error" → Tx + slot cocok dengan CSV; "tanpa error" cocok (status SUCCESS); "CreateV2" belum terverifikasi dari receipt (jenis instruksi tidak tercatat di receipt) — tulis tanpa "CreateV2" atau beri sumber lain. |

Angka interim yang ternyata BENAR dan boleh dipertahankan (bukan basi): biaya mint 0,0032626 SOL; contoh trial 8 tx/slot; tercepat verify 4,898 dtk; jendela Batch 1 11:14–11:20; Alpenglow Devnet 25 Sep 2026 epoch 1167; definisi penerbitan; materi §4.10 (deskriptif, tidak butuh refresh angka); ERD 6 tabel + alur + use-case tetap bisa ditulis penuh.
### Discrepancy log D1–D16 (wajib dicantumkan di Bab 4)
| ID | Butir | Lama (salah/basi) → Baru (terverifikasi) |
|---|---|---|
| D1 | Bug trialIndex=1 | Semua baris mint malam 7 Nov trialIndex=1 → 7 trial distinct (6 sukses + 1 gagal); dibedakan via timestamp + tx signature; hitung ulang 28/30 tidak berubah. Catat di Bab 4, jangan perbaiki receipt (data historis). |
| D2 | Classifier retry "block height exceeded" | Trial 28 tanpa retry → pola tidak dikenali classifier → attempt 1 saja, gagal; bandingkan trial 1 "fetch failed" yang DI-retry (attempt 2, gagal lagi). Mitigasi: perbaiki classifier + RPC fallback. |
| D3 | Median revoke agent "14,98 dtk" | "median revoke 14,98 dtk" → 14,984 = elapsed trial 15 tunggal; median kumulatif benar 10,530. JANGAN dikutip. |
| D4 | Klaim homepage "400ms" | "400ms waktu rata-rata validasi" → median verify terukur 7,489 dtk (≈18,7× klaim); klaim belum diperbaiki; jangan kutip di naskah. |
| D5 | Klaim agent "AccountFrozenError / 0x11" | Penolakan TC-02/03/04/13 = "AccountFrozenError / 0x11" → TC-02/03/04 = "Invalid Authority"; TC-13 = "Neither the asset or any plugins have approved this operation"; TIDAK ADA "AccountFrozenError" di log. JANGAN dipakai di naskah/artikel. |
| D6 | Median verify agent "6,79 dtk" | "median verify 6,79 dtk" (katanya batch B2) → tidak dapat direproduksi persis; terdekat 6,801 (median trial 1–9); Batch 2 (10–17) = 7,338; kumulatif benar 7,489. JANGAN dikutip. |
| D7 | Receipt mint sukses tanpa fee/slot (BARU) | "biaya semua trial sama" (implisit: 28/28 receipt lengkap) → 27/28 sukses mencatat fee 10.000 + rent 3.252.600; 1 sukses (trial malam 7 Nov, 25,046 dtk, tx 325u4AfsF4FL…) mencatat fee/rent/slot = null. Biaya per mint tetap 0,0032626 SOL (27 receipt + konsistensi P2.6). |
| D8 | JSONL verify tanpa rincian per-hop (BARU) | (implisit: rincian ada di receipt) → rincian RPC/IPFS/challenge (n=21) HANYA di summary-verify.csv; JSONL hanya total. Bab 4 wajib menyebut CSV sebagai sumber rincian. |
| D9 | CHECKPOINT "ALL_30_TRIALS_COMPLETED_SUCCESSFULLY" (BARU) | "ALL_30_TRIALS_COMPLETED_SUCCESSFULLY" → mint 28/30 sukses; kalimat benar: "30/30 trial terlaksana, 28 sukses". Jangan kutip. |
| D10 | Peringatan "median upper" di interim (BARU) | "Median di bawah ini adalah angka laporan agent (upper median)" → mint 13,08 + revoke 10,21 interim adalah median STANDAR; hanya verify 6,80 yang ambigu (n ganjil). |
| D11 | Jendela Batch 4 + Batch 2 (BARU) | Malam 7 Nov "22:22–23:30"; Batch 2 "±14:00" → malam 7 Nov 22:22–23:36; Batch 2 verify smoke 12:22 + sisanya 14:08–14:22 (revoke sampai 14:22:28). |
| D12 | TC-12 sub-kasus IPFS (BARU) | (implisit: kedua sub-kasus terbukti terpisah) → Blocked-IPFS tercatat reason=RPC, ipfsMs=0 — atribusi tahap-IPFS tipis; PASS keseluruhan tetap berdiri. Deskripsikan apa adanya. |
| D13 | K2 formal vs operasional + sumber kurs (BARU) | 0,005 SOL dipakai seolah ambang formal; kurs tanpa sumber → formal = ≤ USD 1 (Bab 3); operasional = ≤ 0,005 SOL; keduanya lolos; sumber kurs belum tercatat. |
| D14 | Artikel para 69 + para 74 (BARU) | Para 69: TC-13 = "Invalid Authority"; para 74: "failed transactions still cost money" → TC-13 = "Neither…"; trial gagal tercatat fee null — kedua kalimat artikel salah/bertentangan (lihat §7, C5/C9). |
| D15 | "Build 42 rute" | "build 42 rute" → tidak ada artefak yang menyebut jumlah rute. Jangan tulis tanpa artefak. |
| D16 | tsc 14 error / lint 1 warning | "tsc: 14 error (artefak stub Prisma + baris lama); lint 0 error (1 warning)" → laporan Pablo 8 Nov; tidak diverifikasi ulang audit ini. Bawa apa adanya sebagai laporan pelaksana, bukan temuan auditor. |

Rekonsiliasi angka (22 butir, dihitung ulang auditor dari receipt JSONL/CSV): 13 terverifikasi penuh, 6 bermasalah/parsial, 3 belum terverifikasi. Yang bermasalah: (1) 1 receipt mint sukses (25,046 dtk) mencatat fee/rent/slot null — klaim "semua trial sama" benar 27/28; (2) rincian per-hop verify (n=21) hanya ada di CSV, TIDAK di JSONL; (3) median verify agent "6,79" tidak dapat direproduksi persis (terdekat 6,801, median trial 1–9); (4) sumber kurs SOL $87,76 / Rp18.094 tidak tercatat di file mana pun; (5) CHECKPOINT "ALL_30_TRIALS_COMPLETED_SUCCESSFULLY" menyesatkan (mint 28/30); (6) sub-kasus IPFS-diblokir TC-12 tercatat reason=RPC. Yang belum terverifikasi: DG-2 implisit 14 Nov (tidak ada artefaknya di file yang dibaca; CHECKPOINT 8 Nov masih AUTHOR_PROPOSAL); klaim "build 42 rute"; apakah signature trial 28 dikenai fee on-chain (receipt: fee null).
Dua kegagalan K3 (terverifikasi dari receipt): trial 1 malam 7 Nov: attempt 1 (23:30:59) + attempt 2 (23:31:06), errorCode TypeError, "fetch failed". Trial 28 (8 Nov 17:34:45): attempt 1 SAJA, "Signature 5SaQR4eE… has expired: block height exceeded." — tidak ada baris attempt 2. Attempt-1 sukses = 28/30; dalam-2-percobaan = 28/30. Keduanya 93,3%.
## §7  Artikel SYNTIA — koreksi + placeholder yang bergantung pada Bab 4
Draf artikel: Artikel-SIJAGA-SYNTIA-Draft-2026-11-13.docx (12 hlm, sudah memuat angka final n=30 di sebagian besar tempat). Nomor paragraf = nomor paragraf dokumen hasil ekstraksi XML. Yang di bawah ini adalah sisa yang MASIH bergantung pada Bab 4 final / belum bisa ditutup dari draf interim.
KOREKSI WAJIB — artikel para 69 (C5): artikel menulis "transfers by the owner (TC-02) and a non-owner (TC-03), a burn by the owner (TC-04), and an unfreeze by a non-institution (TC-13) were all rejected by the Metaplex Core program in simulation, with the program error 'Invalid Authority'" — salah mengelompokkan TC-13 (lihat §4). Perbaiki dari P3.3: TC-02/03/04 = "Invalid Authority" ✓, TAPI TC-13 = "Neither the asset or any plugins have approved this operation". Juga: "in simulation" — log tidak menyebut simulasi; tulis "rejected on-chain" sesuai log.
KOREKSI WAJIB — kontradiksi internal para 74 vs para 81 (C9): para 74: "failed transactions still cost money." — BERTENTANGAN dengan para 81: "failed-transaction costs are excluded because the two failed trials' costs were not recorded". Putuskan berdasarkan receipt: fee trial gagal = null (0 lamport tercatat). Rekomendasi audit: hapus/ubah kalimat para 74 menjadi "the two failed trials recorded no fee in the receipts (feeLamports null); cost per successful issuance is therefore unchanged at 0.0032626 SOL" + catatan kaki bahwa verifikasi on-chain fee trial 28 belum dilakukan. JANGAN biarkan kedua kalimat bertentangan itu hidup berdampingan.
| Butir | Lokasi artikel | Placeholder / pernyataan | Yang disediakan Bab 4 final | Status |
|---|---|---|---|---|
| C1 | Para 67 (§3 pembuka) | "[TO BE FILLED — DG-2 outcome…]" + "the 9 November 2026 meeting on them has no reported outcome" | P3.2: "ambang adalah usulan penulis; diterima IMPLISIT lewat review pembimbing 14 Nov 2026 (tidak dipertanyakan; P5 dinilai GOOD; RM3 memakai ambang sebagai kriteria); konfirmasi eksplisit satu baris masih disarankan". Kalimat "9 Nov no reported outcome" diganti "14 Nov review". | TERBUKA |
| C2 | Para 100 (limitasi #4) | "[TO BE FILLED — manual test stuck at step A3 since 8 November 2026; it needs the author's laptop (localhost + .env.local), which is broken — no manual-test results exist to cite]" | P3.5 butir (4): pernyataan citable bahwa tes manual TIDAK ADA — tertahan di langkah A3 sejak 8 Nov karena laptop rusak; tes manual butuh localhost + .env.local di laptop tersebut; Phase 3 + refresh Bab 4 dikerjakan dari data receipt yang sudah ada. Placeholder artikel sudah berisi kalimat yang benar — Bab 4 hanya perlu menyediakan kalimat tesis yang sepadan. | TERBUKA |
| C3 | Para 65 (§3 metode) | "[TO BE FILLED — exact SDK/library versions: Metaplex Core SDK, Pinata client, Phantom Wallet, Next.js, Node.js, database and client]" | P3.6 butir (1): Node v25.7.0; @solana/web3.js ^1.98.4; mpl-core ^1.10.0; umi ^1.5.1; pinata ^2.5.6; next ^16.3.0; React 19.2.4; Prisma ^6.19.3; solana-core 4.4.1; Neon Postgres + Prisma (Tier 1). Versi Phantom Wallet BELUM TERVERIFIKASI — jangan diisi dari ingatan. | TERBUKA (parsial) |
| C4 | Para 73 (§3.2) + para 82–94 (Tabel 3) | Biaya "$0.29 at SOL approximately $87.76 on 9 November 2026" + Tabel 3 (100 ≈ $28,63; 1.000 ≈ $286,33; 10.000 ≈ $2.863,26) | P3.4: rumus + angka masukan + tanggal + SUMBER KURS (belum tercatat). Tabel 3 artikel sudah cocok dengan hitung ulang auditor — yang kurang hanya sumber kurs + kolom IDR (opsional: Rp518.078 / Rp5.180.779 / Rp51.807.786). | TERBUKA |
| C5 | Para 69 (§3.1, K0) | TC-13 = "Invalid Authority" (salah kelompok) | P3.3: koreksi TC-13 (lihat di atas). | BERMASALAH |
| C6 | Para 69 (§3.1, K0) | "All fourteen test cases passed (14/14, verified 8 November 2026, 18:07 WITA)" | P3.3: 14/14 PASS terverifikasi dari log artefak. Jam "18:07 WITA" tidak ada di log (log tanpa stempel waktu; CHECKPOINT lastUpdated 19:02 WITA) — jam itu berasal dari laporan pelaksana. Bab 4 boleh menulis "8 Nov 2026" tanpa jam, atau jam dengan sumber "laporan pelaksana". | BERMASALAH (ringan) |
| C7 | Para 77 (§3.3) + para 100 (limitasi #5) | "The per-hop breakdown (21 of 30 trials; the first 9 recorded totals only)" | P3.1: rincian n=21 TERKONFIRMASI (trial 10–30; trial 1–9 hanya total). Tambahan: rincian HANYA ada di summary-verify.csv, TIDAK di JSONL — Bab 4 wajib menyebut sumber CSV agar dapat direproduksi. | TERVERIFIKASI |
| C8 | Para 71 (§3.1, P2.6) | Trace P2.6 lengkap (Trace Test, TRACE414503, tx 3sEL99rJ…, hash identik, verified:true/VALID, "ran against localhost, not production") | P3.6 butir (4): seluruh detail trace + batasan (n=1; localhost; seed helper; baris Tier 1 tidak dibaca independen) — sudah tersedia di dokumen P2.6 terverifikasi. | TERVERIFIKASI |
| C9 | Para 74 (§3.2) vs para 81 (§3.5) | Para 74: "failed transactions still cost money." vs para 81: "failed-transaction costs are excluded…" | P3.4: putuskan berdasarkan receipt — fee trial gagal = null (0 lamport tercatat). Lihat koreksi wajib di atas. | BERMASALAH |
| C10 | Para 98 (§3.6) | Perbandingan ERC-721 + "No Ethereum version was built, so no measured cross-network comparison exists" | P3.4 butir (6): perbandingan literatur + label estimasi + syarat gas/ETH/tanggal. Keputusan apakah Bab 4 memuat ini (dan/atau pengukuran Sepolia) menunggu jawaban Pak Rizka — artikel sudah menulis posisi yang benar ("no measured comparison"); Bab 4 harus konsisten dengannya. | TERBUKA |
| C11 | Para 100 (limitasi #3, #7, #10) + para 67 | Limitasi #3 (ambang usulan penulis, unconfirmed sampai keputusan pembimbing) — kini kedaluwarsa sebagian; #7 (challenge UI 8 Nov 23:23 setelah pengukuran); #10 (biaya trial gagal tidak masuk proyeksi) | P3.5: #3 refresh ke "diterima implisit 14 Nov"; #7 dan #10 sudah tersedia dari P3.5/P3.4. Perhatian: artikel para 100 juga menulis "all mint trials in the night batch of 7 November carry trialIndex = 1" — TERKONFIRMASI. | TERBUKA (parsial) |

Placeholder artikel yang BUKAN tanggungan Bab 4 (dicatat agar tidak tertukar): para 4–5 (e-mail/ORCID pembimbing + konfirmasi co-authorship — butuh Pak Rizka); para 134 (nama/gelar pembimbing + institusi di acknowledgment); para 136 (funding — konfirmasi Juan); para 139 (AI Disclosure — review Juan). Keempatnya tidak bisa diisi dari Bab 4 final.
Pengingat tenggat: edisi Desember 2026 SYNTIA (Vol. 2 No. 1) tutup 15 November 2026. Yang memblokir submit: e-mail + ORCID Pak Rizka dan konfirmasi co-authorship (OJS butuh e-mail corresponding author asli). Similarity check draf SIJAGA BELUM pernah dijalankan (syarat ≤20%). Rekognisi Ujian Hasil hanya butuh DRAF artikel dalam template jurnal yang dipilih, BUKAN submit/acceptance — melewatkan Desember TIDAK menggagalkan nilai A rekognisi.
## §8  Urutan kerja — Bab 4 + codebase
1.  Jalankan TC-15 Langkah 1–4 (§5) sebagai bukti formal. Bisa dari terminal mana pun (perintah curl sudah terbukti jalan) — tidak butuh laptop. Simpan output sebagai bukti.
2.  Refresh Bab 4 interim → final (§6). Pakai tabel P3.1–P3.4 + 35 butir refresh + discrepancy log D1–D16. Jangan mengarang angka — semua nilai sudah terverifikasi di sini.
3.  Koreksi artikel SYNTIA (§7). Perbaiki para 69 (TC-13) + para 74/81 (kontradiksi biaya gagal), lalu isi placeholder C1–C11 dari Bab 4 final.
4.  Keputusan §9 yang menunggu di file ini: no. 9 (sumber kurs), no. 12 (gambar ijazah P2.6 vs TC-09), no. 13 (setup DB lokal), no. 14 (laptop), no. 16 (Sepolia), no. 17 (fee trial 28), no. 18 (klaim "42 rute"), no. 19 (versi Phantom Wallet).
5.  Brief kode (Lampiran B): (ii) pasca-revisi + draf Bab 4 final; (iii) AKAN DIKERJAKAN — jalankan bila sudah siap (kerja kode, tidak menunggu Bab 1–3 selesai).
6.  Setelah laptop beres: lanjutkan tes manual (langkah A3 yang tertunda + F2 simulasi DB mati) + screenshot halaman ijazah (aset P2.6) untuk gambar Bab 4.
## §9  Keputusan Juan — daftar lengkap (dengan rekomendasi)
| No | Keputusan | Rekomendasi | Status |
|---|---|---|---|
| 9 | Sumber kurs SOL $87,76 / Rp18.094 (9 Nov pagi)? | Kamu isi: bursa/situs + jam | MENUNGGU |
| 12 | Gambar halaman ijazah Bab 4: aset P2.6 atau TC-09? | P2.6 (FDQKnrLV…, NIM TRACE414503) | MENUNGGU |
| 13 | Setup DB lokal (untuk F2): Docker lokal / service lokal / remote? | Jawab sesuai setup-mu (menentukan F2 bisa jalan atau dilewati) | MENUNGGU |
| 14 | Laptop: sudah beres / sedang diperbaiki / belum? Tes manual tetap diusahakan? | Jawab apa adanya — Bab 4 final menyatakan "tidak ada hasil tes manual" bila belum beres | MENUNGGU |
| 16 | Perbandingan Ethereum di Bab 4: tanya opsi Sepolia ke Pak Rizka, atau cukup perbandingan literatur? | Tanya dulu (opsi 4) + siapkan pengukuran Sepolia (opsi 2); jangan janjikan hasil/full rebuild | MENUNGGU |
| 17 | Fee trial 28 ("block height exceeded"): perlu cek on-chain apakah dikenai fee? | Bila tidak dicek, Bab 4 menulis "fee null per receipt" + catatan kaki | MENUNGGU |
| 18 | Klaim "build 42 rute": cari artefak atau hapus dari Bab 4? | Hapus bila tidak ada artefak | MENUNGGU |
| 19 | Versi Phantom Wallet saat eksperimen 7–8 Nov? | Isi dari mesin/laptop yang dipakai eksperimen (tidak ada di run-metadata) | MENUNGGU |

## Lampiran A — sumber
File audit (dokumen kerja, hidden_files — bukan naskah): ~/workspace/goals/sijaga-thesis-revision-support/hidden_files/revision-guide/audit-draft.md (393 baris, 69 KB) · audit-code.md (762 baris, 51 KB) · audit-bab4.md (253 baris, 57 KB). Total ~178 KB, 1.408 baris. Repo sijaga-bab4-check6 tidak disentuh (git status bersih); draf live27.docx adalah baseline audit (read-only). Detail lengkap tiap butir (termasuk prompt Antigravity asli) ada di file audit.
Glosarium singkat: DG-2 = gerbang keputusan ambang kelayakan di rencana eksperimen Bab 4 (diterima IMPLISIT lewat review 14 Nov; status formal tetap AUTHOR_PROPOSAL sampai ada jawaban eksplisit). K0–K4 = label kerja Bab 4 atas Tabel 3.5 (K0 non-transferable wajib; K1 kecepatan penerbitan ≤30 dtk; K2 biaya ≤0,005 SOL / ≤ USD 1 formal; K3 keandalan ≥95%; K4 verifikasi median ≤5 dtk) — label ini TIDAK ADA di naskah. TC-15 = kasus uji baru "Tier 1 tidak tersedia" (rancangan, belum dieksekusi). Tier 1 = basis data institusi (Neon/Postgres + salt + pencocokan identitas). Tier 2 = jejak publik on-chain + IPFS. Tingkat 1 = verifikasi on-chain mandiri. Tingkat 2 = verifikasi nominatif (butuh Tier 1).
— Akhir panduan —
## Lampiran B — Brief Antigravity (codebase) — OPSIONAL, DIPARKIR
Hanya dua brief kode — (ii) OPSIONAL dan diparkir; (iii) AKAN DIKERJAKAN. Brief (ii) = mitigasi K3 (pasca-revisi + draf Bab 4 final); brief (iii) = jalur verify tanpa DB di portal (AKAN DIKERJAKAN). Tesis jalur hemat TIDAK butuh keduanya sekaligus: TC-15 cukup sebagai spesifikasi bila (iii) belum ada; bila (iii) sudah ada, TC-15 dapat dieksekusi sebagai PASS (lihat §5). Tempel prompt di bawah ini ke Antigravity apa adanya (repo sijaga-bab4-check6, branch feat/bab4-experiments). Fakta kode yang harus dihormati: §4 (A2 DB-first, A3 dua field, KOREKSI 1 TC-13, KOREKSI 2 pasangan aset, Nuansa DAS).
Brief Draf BUKAN di sini: semua instruksi §3 (mikro), §6 (Bab 4), §7 (SYNTIA) adalah edit manual di Word — jangan ditempel ke Antigravity.
### Brief (ii) — Perbaikan classifier retry (mitigasi K3)
[scripts/benchmark/common.ts:281-304 | fakta: §4 (mitigasi K3) | OPSIONAL / MITIGASI — jalankan SETELAH revisi Bab 1/3 selesai + draf Bab 4 final ditulis. Bukan alasan mengulang uji n=30.]
Perbaiki classifier retry harness eksperimen SIJAGA — PEKERJAAN OPSIONAL JALUR MITIGASI
(pasca-revisi + draf Bab 4 final). JANGAN jadikan ini alasan mengulang uji n=30; angka final Bab 4
(mint 28/30, median 13,57 dtk; verify median 7,49 dtk) TIDAK BOLEH diubah.

KONTEKS: trial 28 mint (8 Nov 2026) gagal dengan pesan "Signature … has expired:
block height exceeded." dan TIDAK di-retry (hanya attempt 1 di
experiments/2026-11-08/run-mint.jsonl) karena isNetworkError() tidak mengenal pola itu.
Pembanding: trial 1 (7 Nov) "fetch failed" DIRETRY dengan benar (ada attempt 2).

YANG DIUBAH (hanya file scripts/benchmark/common.ts, fungsi isNetworkError):
Tambahkan tiga pola ke daftar return, tepat setelah "blockhashnotfound":
  combined.includes("block height exceeded") ||
  combined.includes("signature has expired") ||
  combined.includes("blockheight") ||
JANGAN ubah guard deterministik (frozen/permanentfreeze/custom program error/
instructionerror/unauthorized/signature verification failed → false) dan JANGAN ubah
kebijakan retry di executeWithProposalRetry (maks 2 attempt, jeda 2 detik).

VERIFIKASI (wajib, tanpa uji ulang n=30): tulis/buktikan dengan tes kecil bahwa
isNetworkError(new Error("Signature X has expired: block height exceeded.")) === true
dan isNetworkError(new Error("Invalid Authority")) === false. Laporkan hasil tes itu.

YANG TIDAK BOLEH DIUBAH: file experiments/ apa pun (receipt lama sakral); angka n=30;
ambang; branch main (jangan commit/push); jangan tambah dependensi; jangan jalankan
transaksi tulis ke devnet.
SELESAI: laporkan diff + hasil tes kecil di atas.
### Brief (iii) — Jalur verify tanpa DB / tingkat-1 mandiri di portal (AKAN DIKERJAKAN)
[app/api/verify/route.ts + lib/onchain.ts + lib/challenge.ts + app/ijazah/[id]/page.tsx:630-750 | fakta: §4 (A2/A3, Nuansa DAS) | AKAN DIKERJAKAN (15 Nov — bukan lagi pasca-tesis) — jangan ubah perilaku /api/verify yang sekarang; tambah jalur baru yang terpisah.]
Bangun MODE VERIFIKASI TINGKAT-1 MANDIRI di portal SIJAGA — AKAN DIKERJAKAN
(jalur baru terpisah; endpoint DB-first yang ada tetap dipakai dan JANGAN diubah).
Tambahkan jalur baru yang terpisah dan beri label UI yang jujur.

KONTEKS (fakta kode, jangan diubah): /api/verify saat ini DB-first
(app/api/verify/route.ts:50,72,103 — Prisma dulu, on-chain belakangan; DB mati → 404/500).
inspectCertificate (lib/onchain.ts:155) sudah membaca semua fakta on-chain yang
dibutuhkan dari RPC+IPFS publik: owner, name, uri, frozen (plugin
PermanentFreezeDelegate), updateAuthority, dataHash. Challenge Ed25519
(lib/challenge.ts:194, nacl.sign.detached.verify) adalah matematika offline; yang butuh
DB hanyalah pembukuan nonce (lib/challenge.ts:42,53,114,212). Bukti live: aset
FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc dapat diperiksa penuh via getAsset publik
ke https://api.devnet.solana.com + metadata IPFS
https://gateway.pinata.cloud/ipfs/QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j
(Data Hash sha256:56a51c98cce45b2675301c1727964c3dd90b58bcac6d120ebed97eebaf600244).

YANG DIBANGUN (jalur baru, jangan timpa yang lama):
1. Endpoint baru (mis. /api/verify/tingkat-1) yang menerima ALAMAT ASET (bukan NIM/
   wallet), memanggil inspectCertificate langsung TANPA query Prisma apa pun, dan
   mengembalikan: token ada/tidak, owner, updateAuthority, frozen, nama, uri,
   dataHash on-chain — plus label verdict "TINGKAT 1" dan peringatan eksplisit
   "Tingkat 2 (nominatif: cocok nama/NIM/prodi) TIDAK DAPAT DIPASTIKAN tanpa Tier 1 —
   ini BUKAN vonis 'tidak valid'".
2. Mode stateless-challenge di seksi "Buktikan Kepemilikan"
   (app/ijazah/[id]/page.tsx:630-750): nonce dipilih verifier secara lokal (bukan dari
   server), dompet menandatangani via provider.signMessage, verifikasi Ed25519
   dilakukan lokal (tweetnacl — sudah ada di package.json). Tulis di UI secara jujur:
   "Anti-replay mode ini hanya sejauh verifier menolak nonce lama; anti-replay global
   tetap butuh pembukuan."
3. Perhatian: JANGAN pakai field DAS ownership.frozen (bernilai false padahal plugin
   beku — bukti beku adalah plugins.permanent_freeze_delegate.data.frozen). JANGAN
   mengklaim mode ini membuktikan identitas (nama/NIM) — salt hash hanya ada di Tier 1.

YANG TIDAK BOLEH DIUBAH: perilaku /api/verify dan /api/verify/challenge yang sekarang;
angka n=30; ambang; experiments/; branch main (jangan commit/push); jangan tambah
secret/env; jangan jalankan transaksi tulis ke devnet.
SELESAI: laporkan file baru/diubah + cara menguji mode ini dengan aset
FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc (data fiktif trace P2.6) tanpa DB.