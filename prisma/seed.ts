import { PrismaClient } from "@prisma/client";
import { authClient } from "../lib/auth/client"; // Gunakan client SDK untuk fetch API

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Membersihkan database lokal...");
  // Hapus semua data lama untuk menghindari konflik dengan ID dari Neon Auth
  await prisma.wallet.deleteMany({});
  await prisma.certificateBackup.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("🌱 Mulai seeding database & Neon Auth...");

  // Fungsi helper untuk register user ke Neon Auth dan simpan ke Prisma
  async function seedUser(data: any, role: "ADMIN" | "MAHASISWA") {
    let authUserId: string;
    
    try {
      const { data: response, error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.nama,
      });
      if (error || !response?.user) {
        console.error("Gagal buat user di Neon Auth:", error || "User object missing");
        return null;
      }
      authUserId = response.user.id;
    } catch (err: any) {
      // Jika email sudah ada di Neon Auth, kita tidak dapat seed dengan mudah tanpa ID-nya.
      // Anda bisa membersihkan Neon Auth console manual jika ini terjadi.
      console.error(`Gagal membuat akun ${data.email} di Neon Auth. Pesan:`, err.message);
      console.error(`(HINT: Hapus akun ${data.email} dari dashboard Neon Auth Anda terlebih dahulu)`);
      return null;
    }

    // Buat di Prisma dengan ID dari Neon Auth
    const user = await prisma.user.create({
      data: {
        id: authUserId, // Hubungkan ID
        nama: data.nama,
        nim: data.nim,
        email: data.email,
        password: "", // Password disimpan di Neon
        role: role,
        prodi: data.prodi,
        angkatan: data.angkatan || null,
      },
    });

    console.log(`✅ ${role} created:`, user.nim);
    return user;
  }

  // 1. Buat Admin
  await seedUser(
    {
      nama: "Admin SIJAGA",
      nim: "ADMIN001",
      email: "admin@sijaga.ac.id",
      password: "admin123",
      prodi: "Informatika",
    },
    "ADMIN"
  );

  // 2. Buat Mahasiswa
  const mahasiswaData = [
    {
      nama: "Budi Santoso",
      nim: "H071211001",
      email: "budi@student.untad.ac.id",
      password: "mahasiswa123",
      prodi: "Informatika",
      angkatan: "2021",
    },
    {
      nama: "Siti Rahayu",
      nim: "H071211002",
      email: "siti@student.untad.ac.id",
      password: "mahasiswa123",
      prodi: "Informatika",
      angkatan: "2021",
    }
  ];

  for (const mhs of mahasiswaData) {
    const user = await seedUser(mhs, "MAHASISWA");
    
    // Buat simulasi wallet untuk mahasiswa ini
    if (user && user.nim === "H071211001") {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          status: "PENDING",
        },
      });
      console.log("  └─ Wallet created for", user.nim);
    }
  }

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Login credentials (Gunakan Email di Halaman Login):");
  console.log("   Admin:      Email=admin@sijaga.ac.id            Password=admin123");
  console.log("   Mahasiswa:  Email=budi@student.untad.ac.id      Password=mahasiswa123");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
