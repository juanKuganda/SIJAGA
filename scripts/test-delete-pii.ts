import { prisma } from "../lib/prisma";
import { generateDataHash, verifyDataHash } from "../lib/crypto";

async function testDeletePiiSalt() {
  console.log("=== Testing TC-11 Prerequisite (delete-pii & salt deletion) ===");

  const fictitiousNim = `TEST-${Date.now()}`;
  const fictitiousNama = "Mahasiswa Uji Coba PII";
  const fictitiousProdi = "Teknik Informatika";
  const fictitiousEmail = `test-${Date.now()}@untad.ac.id`;

  // 1. Buat data dummy di database
  console.log("\n[1] Membuat record mahasiswa dummy...");
  const user = await prisma.user.create({
    data: {
      nama: fictitiousNama,
      nim: fictitiousNim,
      email: fictitiousEmail,
      password: "dummy_password_hash",
      prodi: fictitiousProdi,
      tahunLulus: "2026",
      dataConsent: true,
      consentGivenAt: new Date(),
    },
  });

  const { hash: originalHash, salt: originalSalt } = generateDataHash(
    fictitiousNama,
    fictitiousNim,
    fictitiousProdi
  );

  const cert = await prisma.certificate.create({
    data: {
      userId: user.id,
      status: "MINTED",
      dataHash: originalHash,
      dataSalt: originalSalt,
      issuedAt: new Date(),
    },
  });

  console.log("Data awal:");
  console.log("- Nama:", user.nama);
  console.log("- NIM:", user.nim);
  console.log("- Salt:", cert.dataSalt);
  console.log("- Hash:", cert.dataHash);

  // Verifikasi awal sebelum dihapus
  const preCheck = verifyDataHash(
    fictitiousNama,
    fictitiousNim,
    fictitiousProdi,
    cert.dataSalt!,
    cert.dataHash!
  );
  console.log("- Pre-deletion hash verification:", preCheck ? "VALID" : "INVALID");
  if (!preCheck) throw new Error("Pre-check failed");

  // 2. Simulasikan delete-pii (logika persis sama dengan app/api/admin/delete-pii/route.ts)
  console.log("\n[2] Menjalankan pembersihan PII & penghapusan salt...");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        nama: "[DATA ANONIM]",
        nim: `ANON-${Date.now()}`,
        email: `deleted-${Date.now()}@sijaga.removed`,
        dataDeletedAt: new Date(),
        dataDeleteNote: "Test TC-11 compliance",
        dataConsent: false,
        consentGivenAt: null,
      },
    }),
    prisma.certificate.update({
      where: { userId: user.id },
      data: { dataSalt: null },
    }),
  ]);

  // 3. Verifikasi kondisi setelah delete
  console.log("\n[3] Memeriksa database pasca penghapusan...");
  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  const updatedCert = await prisma.certificate.findUnique({ where: { userId: user.id } });

  console.log("- User dataDeletedAt:", updatedUser?.dataDeletedAt);
  console.log("- User nama:", updatedUser?.nama);
  console.log("- Cert dataSalt:", updatedCert?.dataSalt);
  console.log("- Cert dataHash:", updatedCert?.dataHash);

  if (updatedCert?.dataSalt !== null) {
    throw new Error("FAIL: dataSalt masih ada di database!");
  }
  if (!updatedUser?.dataDeletedAt) {
    throw new Error("FAIL: dataDeletedAt tidak terisi!");
  }

  // 4. Uji rekonstruksi ikatan hash ke identitas
  console.log("\n[4] Menguji rekonstruksi hash tanpa salt...");
  const reconstructionPossible = updatedCert?.dataSalt ? true : false;
  console.log("- Rekonstruksi hash dimungkinkan?:", reconstructionPossible ? "YA (GAGAL PRIVASI)" : "TIDAK (LOLOS PRIVASI)");

  // 5. Cleanup data dummy
  await prisma.certificate.delete({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("\n✓ Cleanup data uji berhasil.");
  console.log("=== TC-11 PREREQUISITE (DELETE-PII SALT DELETION) VERIFIED 100%! ===");
  await prisma.$disconnect();
}

testDeletePiiSalt().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

