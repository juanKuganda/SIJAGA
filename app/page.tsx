import Link from "next/link";
import Button from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">SIJAGA</h1>
              <p className="text-sm text-gray-600">
                Sistem Jaminan Autentikasi Gelar Akademik
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/login">
                <Button variant="primary">Login</Button>
              </Link>
              <Link href="/verifikasi">
                <Button variant="secondary">Verifikasi Ijazah</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Verifikasi Ijazah Anti-Pemalsuan
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sistem distribusi dan verifikasi ijazah berbasis NFT Soulbound di
            blockchain Solana. Memastikan keaslian ijazah yang tidak bisa
            dipalsukan dan dapat diverifikasi dalam hitungan detik.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Anti Pemalsuan
            </h3>
            <p className="text-gray-600">
              NFT Soulbound tidak bisa dipindahtangankan atau dipalsukan.
              Setiap ijazah tercatat di blockchain Solana.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Verifikasi Cepat
            </h3>
            <p className="text-gray-600">
              Verifikasi keaslian ijazah dalam hitungan detik, bukan hari.
              Tidak perlu proses legalisir manual.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl mb-4">🌐</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Akses Publik
            </h3>
            <p className="text-gray-600">
              Siapa pun bisa memverifikasi ijazah tanpa perlu login atau
              memahami blockchain.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Cara Kerja
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Daftar Wallet
              </h4>
              <p className="text-sm text-gray-600">
                Mahasiswa mendaftarkan alamat wallet Phantom
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Verifikasi Admin
              </h4>
              <p className="text-sm text-gray-600">
                Admin memverifikasi wallet mahasiswa
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Terbitkan NFT
              </h4>
              <p className="text-sm text-gray-600">
                Admin menerbitkan NFT ijazah Soulbound
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Klaim & Verifikasi
              </h4>
              <p className="text-sm text-gray-600">
                Mahasiswa klaim, publik bisa verifikasi
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Mulai Verifikasi Sekarang
          </h3>
          <p className="text-gray-600 mb-6">
            Masukkan alamat wallet untuk memverifikasi keaslian ijazah
          </p>
          <Link href="/verifikasi">
            <Button size="lg">Verifikasi Ijazah</Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">
            SIJAGA — Sistem Jaminan Autentikasi Gelar Akademik
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Universitas Tadulako | Tugas Akhir S1 Informatika
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Blockchain Solana | NFT Soulbound | Metaplex
          </p>
        </div>
      </footer>
    </div>
  );
}
