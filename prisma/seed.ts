import { PrismaClient } from "@prisma/client";
import { createAuthClient } from "@neondatabase/auth";

const prisma = new PrismaClient();

// Inisialisasi client khusus dengan absolute URL untuk environment Node.js
const authClient = createAuthClient(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

async function main() {
  console.log("🌱 Membersihkan database lokal...");
  await prisma.wallet.deleteMany({});
  await prisma.certificateBackup.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("🌱 Mulai seeding database & Neon Auth...");

  interface SeedUserData {
    nama: string;
    nim: string;
    email: string;
    password: string;
    prodi: string;
    angkatan?: string;
  }

  async function seedUser(data: SeedUserData, role: "ADMIN" | "MAHASISWA") {
    let authUserId: string;
    
    try {
      const { data: response, error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.nama,
      });
      if (error || !response?.user) {
        throw new Error(error?.message || "User object missing");
      }
      authUserId = response.user.id;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[WARN] Gagal membuat akun ${data.email} di Neon Auth: ${errorMessage}. Mencoba sign in...`);
      
      // Try to sign in to get the user ID
      try {
        const { data: signInResponse, error: signInError } = await authClient.signIn.email({
          email: data.email,
          password: data.password,
        });
        
        if (signInError || !signInResponse?.user) {
          throw new Error(signInError?.message || "User object missing on sign in");
        }
        
        authUserId = signInResponse.user.id;
        console.log(`✅ Berhasil login ke akun yang sudah ada: ${data.email}`);
      } catch (signInErr: unknown) {
        const signInErrMessage = signInErr instanceof Error ? signInErr.message : String(signInErr);
        console.error(`❌ Gagal login ke akun ${data.email}. Pesan:`, signInErrMessage);
        console.error(`(HINT: Hapus akun ${data.email} dari dashboard Neon Auth Anda terlebih dahulu, atau pastikan password sama)`);
        return null;
      }
    }


    const user = await prisma.user.create({
      data: {
        id: authUserId, 
        nama: data.nama,
        nim: data.nim,
        email: data.email,
        password: "", 
        role: role,
        prodi: data.prodi,
        angkatan: data.angkatan || null,
      },
    });

    console.log(`✅ ${role} created:`, user.nim);
    return user;
  }

  await seedUser(
    {
      nama: "Admin SIJAGA",
      nim: "ADMIN001",
      email: "admin@sijaga.ac.id",
      password: "@admin123",
      prodi: "Informatika",
    },
    "ADMIN"
  );


  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Login credentials (Gunakan Email di Halaman Login):");
  console.log("   Admin:      Email=admin@sijaga.ac.id            Password=@admin123");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
