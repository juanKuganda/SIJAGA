import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hash password
  const adminPassword = await bcrypt.hash("admin123", 10);
  const mahasiswaPassword = await bcrypt.hash("mahasiswa123", 10);

  // Buat admin
  const admin = await prisma.user.upsert({
    where: { nim: "ADMIN001" },
    update: {},
    create: {
      nama: "Admin SIJAGA",
      nim: "ADMIN001",
      email: "admin@sijaga.ac.id",
      password: adminPassword,
      role: "ADMIN",
      prodi: "Informatika",
    },
  });

  console.log("✅ Admin created:", admin.nim);

  // Buat data mahasiswa simulasi
  const mahasiswaData = [
    {
      nama: "Budi Santoso",
      nim: "H071211001",
      email: "budi@student.untad.ac.id",
      prodi: "Informatika",
      angkatan: "2021",
    },
    {
      nama: "Siti Rahayu",
      nim: "H071211002",
      email: "siti@student.untad.ac.id",
      prodi: "Informatika",
      angkatan: "2021",
    },
    {
      nama: "Ahmad Rizki",
      nim: "H071211003",
      email: "ahmad@student.untad.ac.id",
      prodi: "Informatika",
      angkatan: "2021",
    },
    {
      nama: "Dewi Lestari",
      nim: "H071211004",
      email: "dewi@student.untad.ac.id",
      prodi: "Informatika",
      angkatan: "2022",
    },
    {
      nama: "Muhammad Fadli",
      nim: "H071211005",
      email: "fadli@student.untad.ac.id",
      prodi: "Informatika",
      angkatan: "2022",
    },
  ];

  for (const mhs of mahasiswaData) {
    const user = await prisma.user.upsert({
      where: { nim: mhs.nim },
      update: {},
      create: {
        ...mhs,
        password: mahasiswaPassword,
        role: "MAHASISWA",
      },
    });

    console.log("✅ Mahasiswa created:", user.nim);

    // Buat wallet untuk beberapa mahasiswa (simulasi)
    if (mhs.nim === "H071211001" || mhs.nim === "H071211002") {
      await prisma.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          walletAddress:
            mhs.nim === "H071211001"
              ? "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
              : "8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV",
          status: mhs.nim === "H071211001" ? "PENDING" : "VERIFIED",
        },
      });
      console.log("  └─ Wallet created for", mhs.nim);
    }
  }

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin:      NIM=ADMIN001      Password=admin123");
  console.log("   Mahasiswa:  NIM=H071211001    Password=mahasiswa123");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
