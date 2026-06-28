"use client";

import { useState } from "react";
import Link from "next/link";

interface VerificationResult {
  verified: boolean;
  revoked?: boolean;
  message?: string;
  revokeReason?: string;
  revokedAt?: string;
  data?: {
    nama: string;
    nim: string;
    prodi: string;
    tahunLulus: string;
    status: string;
    nftAddress: string;
    issuedAt: string;
    penerbit: string;
  };
  explorerUrl?: string;
}

export default function HomePage() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/verify?wallet=${wallet}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verifikasi gagal");
        return;
      }

      setResult(data);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md overflow-x-hidden">
      {/* TopNavBar */}
      <header className="bg-surface/80 backdrop-blur-xl font-body-md text-body-md fixed top-0 w-full z-50 border-b border-outline-variant/30">
        <div className="flex justify-between items-center px-margin-desktop py-4 max-w-container-max mx-auto">
          <div className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2 cursor-pointer active:scale-95 duration-200">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
            Sijaga
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-on-surface-variant hover:text-primary transition-all hover:opacity-80" href="#issuance">Issuance</a>
            <a className="text-primary font-bold border-b-2 border-primary pb-1 hover:opacity-80 transition-all" href="#verification">Verification</a>
            <a className="text-on-surface-variant hover:text-primary transition-all hover:opacity-80" href="#institutions">Institutions</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <button className="hidden md:block font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">LOG IN</button>
            </Link>
            <a href="#verification">
              <button className="bg-primary-container text-white px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80 transition-all active:scale-95 duration-200">
                Check Diploma
              </button>
            </a>
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-16 md:gap-32">
        {/* Hero Section */}
        <section id="verification" className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center min-h-[614px]">
          <div className="md:col-span-6 flex flex-col gap-6 relative z-10">
            <h1 className="font-display-lg text-display-lg hidden md:block text-on-background">
              Masa Depan Verifikasi Ijazah Ada di Tangan Anda
            </h1>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:hidden text-on-background">
              Masa Depan Verifikasi Ijazah Ada di Tangan Anda
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
              Platform verifikasi akademis tingkat enterprise yang mengintegrasikan keamanan Blockchain dengan standar Metaplex.
            </p>
            
            {/* Inline Verification Form */}
            <form onSubmit={handleVerify} className="mt-8 p-1 rounded-xl bg-surface-container-low border border-outline-variant inline-flex items-center w-full max-w-md focus-within:border-primary-container focus-within:shadow-[0_0_15px_rgba(255,85,66,0.2)] transition-all">
              <span className="material-symbols-outlined text-outline ml-3">search</span>
              <input 
                className="bg-transparent border-none outline-none focus:ring-0 text-on-surface w-full font-code-sm text-code-sm placeholder:text-outline-variant px-3 py-3" 
                placeholder="Masukkan Solana Address Ijazah..." 
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                required
              />
              <button disabled={loading} type="submit" className="bg-primary-container text-white px-4 py-2 m-1 rounded-lg font-label-caps text-label-caps hover:opacity-80 transition-all flex items-center gap-2 disabled:opacity-50">
                {loading ? "MEMPROSES..." : "VERIFIKASI"}
              </button>
            </form>

            {/* Verification Result Display */}
            <div className="w-full max-w-md mt-4">
              {error && (
                <div className="p-4 rounded-xl bg-error-container border border-error-container text-on-error-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    <span className="font-label-caps text-label-caps">Verifikasi Gagal</span>
                  </div>
                  <p className="mt-2 font-body-md text-sm">{error}</p>
                </div>
              )}
              
              {result && (
                <div className={`p-6 rounded-xl border animate-fade-in-up ${result.revoked ? 'bg-error-container/20 border-error' : result.verified ? 'bg-tertiary-container/20 border-tertiary-container' : 'bg-surface-container-low border-outline-variant'}`}>
                  {result.revoked ? (
                    <>
                      <div className="flex items-center gap-2 text-error mb-4">
                        <span className="material-symbols-outlined text-2xl">cancel</span>
                        <h4 className="font-headline-sm text-headline-sm">Ijazah Direvoke</h4>
                      </div>
                      {result.data && (
                        <div className="mb-4">
                          <p className="font-code-sm text-code-sm text-on-surface-variant">NAMA: {result.data.nama}</p>
                          <p className="font-code-sm text-code-sm text-on-surface-variant">NIM: {result.data.nim}</p>
                        </div>
                      )}
                      <p className="font-body-md text-sm text-error/80 mb-2">ALASAN: {result.revokeReason}</p>
                      {result.revokedAt && <p className="font-code-sm text-xs text-error/60">TANGGAL: {new Date(result.revokedAt).toLocaleDateString("id-ID")}</p>}
                    </>
                  ) : result.verified ? (
                    <>
                      <div className="flex items-center gap-2 text-tertiary-container mb-4">
                        <span className="material-symbols-outlined text-2xl">verified</span>
                        <h4 className="font-headline-sm text-headline-sm">Ijazah Terverifikasi</h4>
                      </div>
                      {result.data && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="font-label-caps text-[10px] text-outline uppercase">Nama</p>
                            <p className="font-body-md text-on-surface">{result.data.nama}</p>
                          </div>
                          <div>
                            <p className="font-label-caps text-[10px] text-outline uppercase">NIM</p>
                            <p className="font-body-md text-on-surface">{result.data.nim}</p>
                          </div>
                          <div>
                            <p className="font-label-caps text-[10px] text-outline uppercase">Program Studi</p>
                            <p className="font-body-md text-on-surface">{result.data.prodi}</p>
                          </div>
                          <div>
                            <p className="font-label-caps text-[10px] text-outline uppercase">Tahun Lulus</p>
                            <p className="font-body-md text-on-surface">{result.data.tahunLulus}</p>
                          </div>
                        </div>
                      )}
                      {result.explorerUrl && (
                        <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-1 text-tertiary-fixed font-label-caps text-label-caps hover:underline">
                          LIHAT DI EXPLORER <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-secondary mb-4">
                        <span className="material-symbols-outlined text-2xl">search_off</span>
                        <h4 className="font-headline-sm text-headline-sm">Tidak Ditemukan</h4>
                      </div>
                      <p className="font-body-md text-sm text-secondary/80">{result.message}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-6 relative h-[400px] md:h-[500px]">
            <div className="absolute inset-0 bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant holographic-border flex items-center justify-center">
              <img alt="Sijaga Cover" className="w-full h-full object-cover opacity-80 mix-blend-screen" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBewNN1MnN8hpc0gZ_eDCqg2jXM0vPnPDBv1r4K9gwCD3DjXK5xcHibbYOmdG1_oAv_liK9zHMt-DJgkrWOIqn7ZM9rPM5-p-m-Ox1NVwAqpXxi-xksWpB9b5q1EapARzzJaYpqHyDuFzjIB7_fTRVB73Aoe0Tr_fEL-o9lHdb_pEVgtiaqbrzu8tx5AaQLfNQ4NwM2hDkzjRZcuV8uPV2YZZc2YNdh7hyna8fghYw4aD7al7B30tgWWHXPqpUNDICsIv-wEIWUvJQ"/>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            </div>
          </div>
        </section>
        
        {/* Partner Logos */}
        <section id="institutions" className="py-8 border-y border-outline-variant/30 flex flex-wrap justify-center md:justify-between items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">DIKNAS</span>
          <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">ITB</span>
          <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">UI</span>
          <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">KEMDIKBUD</span>
          <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">METAPLEX</span>
        </section>

        {/* Bento Grid Features & Status */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-unit auto-rows-[minmax(200px,auto)]">
          {/* Feature 1 */}
          <div className="md:col-span-4 bg-surface-container-low border border-outline-variant rounded-xl p-gutter flex flex-col gap-4 relative overflow-hidden group hover:bg-surface-container transition-colors">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-secondary"></div>
            <div className="font-label-caps text-label-caps text-outline uppercase">01 // Security</div>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-2">Immutable Ledger</h3>
            <p className="font-body-md text-body-md text-on-surface-variant flex-grow">Data akademis tersimpan secara permanen pada jaringan Solana.</p>
            <div className="mt-4 flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full w-max border border-outline-variant">
              <span className="material-symbols-outlined text-[16px] text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant text-[10px]">VERIFIED ON-CHAIN</span>
            </div>
          </div>
          {/* Feature 2 */}
          <div className="md:col-span-4 bg-surface-container-low border border-outline-variant rounded-xl p-gutter flex flex-col gap-4 relative overflow-hidden group hover:bg-surface-container transition-colors holographic-border">
            <div className="absolute inset-0 opacity-10 bg-primary-container blur-2xl rounded-full translate-y-1/2"></div>
            <div className="font-label-caps text-label-caps text-outline uppercase relative z-10">02 // Speed</div>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-2 relative z-10">Instant Validation</h3>
            <p className="font-body-md text-body-md text-on-surface-variant flex-grow relative z-10">Global validation within seconds without intermediaries.</p>
            <div className="mt-4 relative z-10">
              <span className="font-code-sm text-code-sm text-on-surface bg-surface-container border border-outline-variant px-2 py-1 rounded">AVG_TIME: 0.4s</span>
            </div>
          </div>
          {/* Feature 3 */}
          <div className="md:col-span-4 bg-primary-container rounded-xl p-gutter flex flex-col gap-4 relative overflow-hidden text-white guilloche-bg">
            <div className="font-label-caps text-label-caps text-white/70 uppercase">03 // Protocol</div>
            <div className="flex-grow flex items-center justify-center">
              <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold">Metaplex Standardized</h3>
              <p className="font-body-md text-body-md text-white/80 mt-1">Implementasi standar aset digital kelas dunia.</p>
            </div>
          </div>
          {/* Technical Status */}
          <div className="md:col-span-12 bg-surface-container-low border border-outline-variant rounded-xl p-gutter flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div>
              <div className="font-label-caps text-label-caps text-outline uppercase mb-2">System Status</div>
              <div className="flex items-center gap-3">
                <h3 className="font-headline-md text-headline-md text-on-surface">Mainnet Beta</h3>
                <div className="flex items-center gap-1 bg-[#1A3320] text-[#4ADE80] px-2 py-0.5 rounded-full border border-[#225232]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse"></span>
                  <span className="font-label-caps text-label-caps text-[10px]">LIVE</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-8 w-full md:w-auto">
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-outline uppercase">TPS</span>
                <span className="font-code-sm text-code-sm text-on-surface text-xl">3,190</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-outline uppercase">Slots</span>
                <span className="font-code-sm text-code-sm text-on-surface text-xl">4,378</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-outline uppercase">Validators</span>
                <span className="font-code-sm text-code-sm text-on-surface text-xl">32</span>
              </div>
              <div className="hidden lg:flex items-end h-12 gap-1 ml-4 opacity-50">
                <div className="w-1.5 h-4 bg-primary-container rounded-t-sm"></div>
                <div className="w-1.5 h-8 bg-primary-container rounded-t-sm"></div>
                <div className="w-1.5 h-6 bg-primary-container rounded-t-sm"></div>
                <div className="w-1.5 h-10 bg-primary-container rounded-t-sm"></div>
                <div className="w-1.5 h-5 bg-primary-container rounded-t-sm"></div>
                <div className="w-1.5 h-12 bg-primary-container rounded-t-sm"></div>
                <div className="w-1.5 h-7 bg-primary-container rounded-t-sm"></div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="issuance" className="flex flex-col gap-12">
          <div className="text-center">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">How it Works</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 max-w-2xl mx-auto">
              Three simple steps to secure, standardize, and verify academic achievements permanently.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 flex flex-col items-center text-center gap-6 relative">
              <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center font-headline-sm text-headline-sm border border-primary-container/20">
                1
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Issuance</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Institution anchors degree on Solana, creating an immutable record.
              </p>
              <span className="material-symbols-outlined text-4xl text-outline-variant mt-auto">account_balance</span>
            </div>
            {/* Step 2 */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 flex flex-col items-center text-center gap-6 relative">
              <div className="w-16 h-16 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-headline-sm text-headline-sm border border-secondary/20">
                2
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Digital Heritage Seal</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Metadata is standardized via Metaplex for global interoperability.
              </p>
              <span className="material-symbols-outlined text-4xl text-outline-variant mt-auto">token</span>
            </div>
            {/* Step 3 */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 flex flex-col items-center text-center gap-6 relative">
              <div className="w-16 h-16 rounded-full bg-tertiary-container/10 text-tertiary-container flex items-center justify-center font-headline-sm text-headline-sm border border-tertiary-container/20">
                3
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Instant Verification</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Employers verify via signature with zero friction.
              </p>
              <span className="material-symbols-outlined text-4xl text-outline-variant mt-auto">task_alt</span>
            </div>
          </div>
        </section>

        {/* Security Architecture Deep Dive */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 md:p-16 blueprint-bg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50"></div>
          <div className="flex flex-col gap-12 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <div className="font-label-caps text-label-caps text-primary-container mb-2">TECHNICAL DEEP DIVE</div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Security Architecture</h2>
              </div>
              <div className="font-code-sm text-code-sm text-outline-variant text-right">
                PROTOCOL: V1.4.2<br/>
                STATUS: SECURE
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tech 1 */}
              <div className="border border-outline-variant bg-surface-dim/80 backdrop-blur-sm p-6 rounded-lg flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
                  <span className="material-symbols-outlined text-primary-container">lock</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">SHA-256 Encryption</h3>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant flex-grow">
                  Military-grade hashing ensures document integrity cannot be compromised or retroactively altered.
                </p>
                <div className="font-code-sm text-code-sm text-outline bg-surface-container p-2 rounded">
                  ALGO: SHA-256<br/>
                  ROUNDS: 64
                </div>
              </div>
              {/* Tech 2 */}
              <div className="border border-outline-variant bg-surface-dim/80 backdrop-blur-sm p-6 rounded-lg flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
                  <span className="material-symbols-outlined text-secondary">link</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Soulbound Tokens</h3>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant flex-grow">
                  Non-transferable digital assets (SBT) binding achievements permanently to the graduate's unique identity.
                </p>
                <div className="font-code-sm text-code-sm text-outline bg-surface-container p-2 rounded">
                  TYPE: NON-TRANSFERABLE<br/>
                  STANDARD: METAPLEX
                </div>
              </div>
              {/* Tech 3 */}
              <div className="border border-outline-variant bg-surface-dim/80 backdrop-blur-sm p-6 rounded-lg flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
                  <span className="material-symbols-outlined text-tertiary-container">bolt</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Solana Ledger</h3>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant flex-grow">
                  High-performance blockchain providing censorship resistance and massive scalability.
                </p>
                <div className="font-code-sm text-code-sm text-outline bg-surface-container p-2 rounded">
                  CONSENSUS: POH + POS<br/>
                  LATENCY: 400ms
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Institutional Onboarding CTA */}
        <section className="bg-surface-container-low border border-outline-variant rounded-2xl p-12 text-center flex flex-col items-center gap-8">
          <div className="max-w-2xl flex flex-col gap-4">
            <h2 className="font-display-lg text-display-lg text-on-surface">Secure Your Legacy</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Join leading universities and government bodies in the next generation of academic credentialing.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button className="bg-primary-container text-white px-8 py-4 rounded-DEFAULT font-label-caps text-label-caps hover:opacity-80 transition-all shadow-[0_0_15px_rgba(255,85,66,0.3)]">
              ONBOARD INSTITUTION
            </button>
            <button className="border border-outline-variant text-on-surface px-8 py-4 rounded-DEFAULT font-label-caps text-label-caps hover:bg-surface-container-highest transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span>
              DOWNLOAD WHITEPAPER
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest font-code-sm text-code-sm w-full py-12 border-t border-outline-variant mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-margin-desktop gap-gutter max-w-container-max mx-auto w-full">
          <div className="flex flex-col gap-4">
            <div className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              SIJAGA ENTERPRISE
            </div>
            <div className="text-tertiary">
              © 2024 Sijaga. Secured by Blockchain.
            </div>
          </div>
          <nav className="flex flex-wrap gap-8 items-center">
            <a className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" href="#">Privacy Policy</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" href="#">Terms of Service</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" href="#">Metaplex</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" href="#">Documentation</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
