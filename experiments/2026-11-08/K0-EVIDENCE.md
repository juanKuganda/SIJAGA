# Artefak Bukti K0: Immutability, Soulbound Non-Transferability, & Anti-Tampering (TC-02, TC-03, TC-04, TC-13)

Dokumen ini menyajikan bukti empiris pengujian on-chain di Solana Devnet terhadap mekanisme **Soulbound Token** pada arsitektur SIJAGA. Pengujian ini membuktikan bahwa aset ijazah digital secara kriptografis dan terprogram di level smart contract (*Metaplex Core Program* `CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`) **tidak dapat ditransfer oleh pemilik maupun pihak ketiga, tidak dapat dibakar (burn) secara sepihak, dan status pembekuannya (freeze) tidak dapat dicairkan (thaw) oleh pihak selain institusi penerbit**.

Log eksekusi mentah tersimpan di:
- [`experiments/2026-11-08/test-tc-output.log`](file:///home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/test-tc-output.log)
- [`experiments/2026-11-08/test-challenge-output.log`](file:///home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/test-challenge-output.log)

---

## 1. Bukti Keadaan Beku On-Chain (*Frozen State On-Chain Verification*)

Aset ijazah SIJAGA diterbitkan menggunakan Metaplex Core dengan plugin `PermanentFreezeDelegate`. Plugin ini membekukan aset secara permanen sejak saat pencetakan (*minting*), dengan wewenang tunggal pencairan dipegang oleh `UpdateAuthority` (Alamat Institusi).

### Hasil Ekstraksi State Aset (`mpl-core.fetchAsset`):
```json
{
  "assetAddress": "FkECJr9joaazSw5kPksHipb5bYEaN5TS3E6JYtaeco5e",
  "name": "Ijazah S1 - Universitas Tadulako",
  "owner": "8jKozQvt4XxMtTCyZuoJehGTG6tYesqZYv76gCphdzvp",
  "updateAuthority": {
    "type": "Address",
    "address": "Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ"
  },
  "uri": "https://gateway.pinata.cloud/ipfs/Qmd2hmpuWp4phfAAf1LqBnEaa6mFsB8tPAfrqFttmYuvFP",
  "permanentFreezeDelegate": {
    "authority": {
      "type": "UpdateAuthority"
    },
    "offset": "196",
    "frozen": true
  }
}
```

### Hasil Fungsi `inspectCertificate`:
```json
{
  "ok": true,
  "owner": "8jKozQvt4XxMtTCyZuoJehGTG6tYesqZYv76gCphdzvp",
  "name": "Ijazah S1 - Universitas Tadulako",
  "uri": "https://gateway.pinata.cloud/ipfs/Qmd2hmpuWp4phfAAf1LqBnEaa6mFsB8tPAfrqFttmYuvFP",
  "frozen": true,
  "dataHash": "sha256:f06116bb6e874288caefb3ac2222afeac4a5dabda5ec7569edd235445d85cd76",
  "updateAuthority": "Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ"
}
```

**Temuan Kunci:**
1. `frozen: true` aktif secara native pada state account Solana.
2. `updateAuthority` adalah wallet institusi (`Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`), bukan mahasiswa atau pihak ketiga.
3. Authority delegasi pembekuan adalah `UpdateAuthority`, memastikan tidak ada entitas lain yang memiliki izin memodifikasi plugin ini.

---

## 2. Rincian Pengujian Negatif (TC-02, TC-03, TC-04, TC-13)

### TC-02: Percobaan Transfer oleh Pemilik Aset (*Owner tries to transfer asset*)
- **Aset Uji**: `3EL8ni8mvPDG17zBwJqQDX4oLzkVqBCsk9ViKRC4rufd`
- **Dompet Pengirim**: Dompet Pemilik / Mahasiswa Lulusan (`7ap6x8hHfu5tq8NYvijKajfuTZQ2DJM54TpF5H7P9dhz`)
- **Dompet Tujuan**: Dompet Pihak Ketiga Fiktif
- **Operasi yang Dicoba**: Instruksi raw Metaplex Core `transferV1` ditandatangani oleh *private key* mahasiswa.
- **Hasil yang Teramati**: **DITOLAK SECARA DETERMINISTIK OLEH PROGRAM METAPLEX CORE ON-CHAIN**.
- **Bukti Error**:
  ```text
  Error: Invalid Authority
  Source: Program > mplCore [CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d]
  Caused By: PermanentFreezeDelegate plugin active (frozen: true) rejects transfer authority
  ```
- **Kesimpulan**: Mahasiswa yang memegang private key dompet pemilik **tidak dapat** memindahkan atau menjual ijazah miliknya ke dompet orang lain.

---

### TC-03: Percobaan Transfer oleh Bukan Pemilik (*Non-owner tries to transfer asset*)
- **Aset Uji**: `3EL8ni8mvPDG17zBwJqQDX4oLzkVqBCsk9ViKRC4rufd`
- **Dompet Pengirim**: Dompet Penyerang / Attacker (`7682auXfUaxh5TJsegqtxGTmuhSf4WUtZKLPkAuX7Ewr`)
- **Dompet Tujuan**: Dompet Penyerang (`7682auXfUaxh5TJsegqtxGTmuhSf4WUtZKLPkAuX7Ewr`)
- **Operasi yang Dicoba**: Instruksi raw Metaplex Core `transferV1` tanpa tanda tangan pemilik yang sah.
- **Hasil yang Teramati**: **DITOLAK SECARA DETERMINISTIK OLEH NETWORK SOLANA**.
- **Bukti Error**:
  ```text
  Error: Invalid Authority
  Source: Program > mplCore [CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d]
  ```
- **Kesimpulan**: Pihak ketiga tanpa izin tidak memiliki wewenang untuk mengeksekusi transfer aset ijazah.

---

### TC-04: Percobaan Pembakaran Aset oleh Pemilik (*Owner tries to burn asset*)
- **Aset Uji**: `3EL8ni8mvPDG17zBwJqQDX4oLzkVqBCsk9ViKRC4rufd`
- **Dompet Pengirim**: Dompet Pemilik / Mahasiswa Lulusan (`7ap6x8hHfu5tq8NYvijKajfuTZQ2DJM54TpF5H7P9dhz`)
- **Operasi yang Dicoba**: Instruksi raw Metaplex Core `burnV1` untuk memusnahkan akun aset NFT dari Solana.
- **Hasil yang Teramati**: **DITOLAK SECARA DETERMINISTIK OLEH PROGRAM METAPLEX CORE ON-CHAIN**.
- **Bukti Error**:
  ```text
  Error: Invalid Authority
  Source: Program > mplCore [CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d]
  ```
- **Kesimpulan**: Mahasiswa tidak dapat menghilangkan catatan kelulusan atau menghancurkan token ijazah secara sepihak di blockchain selama status `frozen: true` aktif.

---

### TC-13: Percobaan Pencairan Status Beku oleh Non-Institusi (*Non-institution tries to thaw asset*)
- **Aset Uji**: `BSjM8JSmuFmCKFFS33W6jbSjCPibSqC6H79zcnsVy6or`
- **Dompet Pengirim**: Dompet Penyerang / Attacker (`7682auXfUaxh5TJsegqtxGTmuhSf4WUtZKLPkAuX7Ewr`)
- **Operasi yang Dicoba**: Instruksi `updatePlugin` untuk merubah nilai plugin `PermanentFreezeDelegate` menjadi `frozen: false`.
- **Hasil yang Teramati**: **DITOLAK SECARA ON-CHAIN OLEH KONTRAK PROGRAM**.
- **Bukti Error**:
  ```text
  Error: Neither the asset or any plugins have approved this operation
  Source: Program > mplCore [CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d]
  ```
- **Kesimpulan**: Otoritas pencairan (*thaw authority*) terkunci mutlak pada `UpdateAuthority` (Institusi). Tidak ada pihak ketiga maupun pemilik yang dapat membuka status beku token ijazah.

---

## 3. Matriks Ringkasan Bukti K0

| Test Case | Skenario | Dompet Penguji | Respon On-Chain | Status | Validasi Keamanan |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **TC-02** | Owner transfer ijazah | Owner (`7ap6...`) | `Invalid Authority` (CoREENxT6t) | **PASS** | Non-transferable / Soulbound |
| **TC-03** | Attacker transfer ijazah | Attacker (`7682...`) | `Invalid Authority` (CoREENxT6t) | **PASS** | Akses transfer terproteksi |
| **TC-04** | Owner burn/hapus ijazah | Owner (`7ap6...`) | `Invalid Authority` (CoREENxT6t) | **PASS** | Anti-destruction / Non-burnable |
| **TC-13** | Attacker thaw/unfreeze | Attacker (`7682...`) | `Neither asset/plugin approved` | **PASS** | Thaw authority restricted to Issuer |

Seluruh bukti di atas membuktikan bahwa sifat **Soulbound (non-transferable, non-burnable, immutable freeze)** pada SIJAGA dijamin secara matematis dan terprogram di lapisan protokol Solana Metaplex Core.

