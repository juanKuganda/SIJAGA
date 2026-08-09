import { Keypair } from "@solana/web3.js";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Memulai Pengujian API SIJAGA ===");

  const timestamp = Date.now();
  const nim = `H07${timestamp.toString().slice(-6)}`;
  const email = `maba${timestamp}@test.com`;
  
  // 1. Registrasi Mahasiswa
  console.log(`\n1. Registrasi Mahasiswa (NIM: ${nim})...`);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nama: "Mahasiswa Testing",
      nim,
      email,
      password: "mahasiswa123",
      prodi: "Informatika",
      angkatan: "2021",
    }),
  });
  const regData = await regRes.json();
  console.log("Response:", regData);

  // 2. Login Mahasiswa
  console.log(`\n2. Login Mahasiswa...`);
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nim, password: "mahasiswa123" }),
  });
  const loginData = await loginRes.json();
  console.log("Response:", loginData);
  
  const mhsCookies = loginRes.headers.get("set-cookie") || "";
  const mhsToken = mhsCookies.split(";")[0];

  // 3. Mahasiswa Daftar Wallet
  console.log(`\n3. Mahasiswa Mendaftarkan Wallet...`);
  const dummyWallet = Keypair.generate().publicKey.toBase58();
  const walletRes = await fetch(`${BASE_URL}/api/wallet/register`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cookie": mhsToken
    },
    body: JSON.stringify({ walletAddress: dummyWallet }),
  });
  const walletData = await walletRes.json();
  console.log("Response:", walletData);

  // 4. Login Admin
  console.log(`\n4. Login Admin...`);
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nim: "ADMIN001", password: "admin123" }),
  });
  const adminLoginData = await adminLoginRes.json();
  console.log("Response:", adminLoginData);
  const adminCookies = adminLoginRes.headers.get("set-cookie") || "";
  const adminToken = adminCookies.split(";")[0];

  // 5. Admin Verifikasi Wallet
  console.log(`\n5. Admin Verifikasi Wallet...`);
  const verifyRes = await fetch(`${BASE_URL}/api/wallet/verify`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cookie": adminToken
    },
    body: JSON.stringify({ userId: regData.user.id, action: "VERIFY" }),
  });
  const verifyData = await verifyRes.json();
  console.log("Response:", verifyData);

  // 6. Admin Mint NFT
  console.log(`\n6. Admin Mint NFT Ijazah (Proses ini mungkin memakan waktu)...`);
  const mintRes = await fetch(`${BASE_URL}/api/nft/mint`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cookie": adminToken
    },
    body: JSON.stringify({ userId: regData.user.id }),
  });
  const mintData = await mintRes.json();
  console.log("Response:", mintData);

  // 7. Admin Revoke NFT
  console.log(`\n7. Admin Revoke NFT...`);
  const revokeRes = await fetch(`${BASE_URL}/api/nft/revoke`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cookie": adminToken
    },
    body: JSON.stringify({ userId: regData.user.id, reason: "Ada kesalahan data prodi" }),
  });
  const revokeData = await revokeRes.json();
  console.log("Response:", revokeData);

  console.log(`\n=== Pengujian Selesai ===`);
}

runTests().catch(console.error);
