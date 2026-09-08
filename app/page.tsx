"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  SearchX,
  ExternalLink,
  ArrowRight,
  Lock,
  Zap,
  Award,
  Check,
  Menu,
  X,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScrollExpand from "@/components/ScrollExpand";
import AiChatBubble from "@/components/AiChatBubble";

interface VerificationResult {
  verified: boolean;
  verifiedOnChain?: boolean;
  verifiedNominative?: boolean;
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
  onChain?: {
    status: string;
    frozen?: boolean;
    owner?: string;
  };
  hashVerified?: boolean;
  mismatch?: string | null;
  piiDeleted?: boolean;
  explorerUrl?: string;
}

function VerificationChecklist({ result }: { result: VerificationResult }) {
  if (!result.data) return null;
  
  const isRevoked = result.revoked === true;
  const onChain = result.onChain;
  
  const blockchainChecklist = [
    {
      label: "Aset ada di blockchain",
      passed: onChain?.status !== "NOT_FOUND" && onChain?.status !== "UNAVAILABLE",
    },
    {
      label: "Status Token (Soulbound)",
      passed: onChain?.frozen === true,
    },
    {
      label: "Kesesuaian Kepemilikan (Owner)",
      passed: result.mismatch !== "OWNER" && onChain?.status !== "UNAVAILABLE" && onChain?.status !== "NOT_FOUND",
    },
    {
      label: "Konsistensi Hash On-Chain",
      passed: result.mismatch !== "HASH" && onChain?.status !== "UNAVAILABLE" && onChain?.status !== "NOT_FOUND",
    },
    {
      label: "Status Aktif (Bukan Dibatalkan)",
      passed: result.mismatch !== "STATUS" && !isRevoked,
    }
  ];

  const nominativeChecklist = [
    {
      label: "Verifikasi Hash Lokal (Sesuai PII)",
      passed: result.verifiedNominative === true,
      warning: result.piiDeleted ? "Data Dihapus (UU PDP)" : null
    }
  ];

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-zinc-100 pt-4">
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Bukti Kriptografis (On-Chain)</p>
        <div className="space-y-2">
          {blockchainChecklist.map((item, i) => (
            <div key={`bc-${i}`} className="flex items-center gap-2">
              {item.passed ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className={`text-sm ${item.passed ? "text-zinc-700" : "text-red-600 font-medium"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Bukti Nominatif (Lokal)</p>
        <div className="space-y-2">
          {nominativeChecklist.map((item, i) => (
            <div key={`nm-${i}`} className="flex items-center gap-2">
              {item.passed ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : item.warning ? (
                <X className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className={`text-sm ${item.passed ? "text-zinc-700" : item.warning ? "text-amber-600 font-medium" : "text-red-600 font-medium"}`}>
                {item.label} {item.warning && `— ${item.warning}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Apa itu SIJAGA?",
      a: "SIJAGA (Sistem Jaminan Autentikasi Gelar Akademik) adalah purwarupa platform verifikasi ijazah berbasis blockchain Solana menggunakan Soulbound Token.",
    },
    {
      q: "Bagaimana cara kerja verifikasi ini?",
      a: "Setiap ijazah di-hash secara kriptografis (SHA-256) dan dicetak sebagai token NFT permanen di blockchain Solana. Pihak perusahaan atau kampus lain dapat memverifikasi keasliannya secara instan melalui portal SIJAGA.",
    },
    {
      q: "Apakah token ini bisa dipindahtangankan?",
      a: "Tidak. Kami menggunakan standar Soulbound Token (SBT) yang berarti token ijazah ini akan selamanya terikat pada dompet digital (wallet) mahasiswa dan tidak dapat ditransfer atau diperjualbelikan.",
    },
    {
      q: "Berapa lama proses verifikasi berlangsung?",
      a: "Verifikasi melalui portal SIJAGA terjadi secara real-time, biasanya memakan waktu kurang dari 400 milidetik (0.4 detik).",
    },
    {
      q: "Apakah jika server kampus down, verifikasi tidak bisa dilakukan?",
      a: "Portal verifikasi SIJAGA memerlukan koneksi ke server universitas untuk mencocokkan data kriptografis. Namun, keberadaan ijazah tetap dapat dicek secara independen langsung di blockchain Solana melalui Solana Explorer (explorer.solana.com) menggunakan alamat NFT. Verifikasi penuh (termasuk pencocokan identitas) memerlukan server aktif.",
    },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileTlRef = useRef<gsap.core.Timeline | null>(null);
  const bentoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial Load Animation
      const tl = gsap.timeline();
      tl.from(headerRef.current, {
        y: -100,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        clearProps: "all",
      })
        .from(
          ".hero-anim",
          {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: "back.out(1.2)",
            clearProps: "all",
          },
          "-=0.6",
        )
        .from(
          ".floating-card",
          {
            scale: 0.8,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            clearProps: "all",
          },
          "-=0.6",
        );

      gsap.to(".skeleton-line-1", {
        width: "95%",
        duration: 1,
        yoyo: true,
        repeat: -1,
        ease: "power2.inOut"
      });

      gsap.to(".skeleton-line-2", {
        width: "80%",
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "power2.inOut",
        delay: 0.3
      });

      gsap.to(".badge-glow", {
        scale: 1.15,
        boxShadow: "0 0 20px rgba(16, 185, 129, 0.6)",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        duration: 0.8,
        yoyo: true,
        repeat: -1,
        ease: "power1.inOut"
      });

      // Card 2: Storytelling Click Animation
      const card2Tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
      
      card2Tl.fromTo(".fake-cursor", 
        { x: 80, y: 80, opacity: 0 }, 
        { x: 10, y: 10, opacity: 1, duration: 1, ease: "power2.out" }
      )
      .to(".verify-btn-container > div", { scale: 0.95, duration: 0.1 })
      .to(".fake-cursor", { scale: 0.9, duration: 0.1 }, "<")
      .to(".verify-btn-container > div", { scale: 1, duration: 0.1 })
      .to(".fake-cursor", { scale: 1, duration: 0.1 }, "<")
      .to(".verify-btn-container", { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in" })
      .to(".verified-state-container", { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.5)" }, "<")
      .to(".fake-cursor", { x: 80, y: 80, opacity: 0, duration: 0.8, ease: "power2.in" }, "+=0.2")
      .to(".verified-state-container", { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in" }, "+=2.5")
      .to(".verify-btn-container", { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.5)" }, "<");

      gsap.to(".card-3-text", {
        opacity: 0.4,
        y: 8,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "power2.inOut"
      });

      // Scanning Animation for Card 1
      gsap.fromTo(".scan-line",
        { y: -150, opacity: 0 },
        { 
          y: 300, 
          opacity: 1, 
          duration: 2.5, 
          repeat: -1, 
          yoyo: true, 
          ease: "sine.inOut" 
        }
      );

    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Mobile Menu Animation Timeline
      const mobileTl = gsap.timeline({ paused: true });
      mobileTl.to(mobileMenuRef.current, {
        autoAlpha: 1,
        duration: 0.3,
        ease: "power2.inOut",
      });
      mobileTl.fromTo(
        ".mobile-nav-item",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: "back.out(1.2)",
        },
        "-=0.1",
      );
      mobileTlRef.current = mobileTl;
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!bentoRef.current) return;
    const ctx = gsap.context(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            gsap.to(".bento-card", {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 1,
              stagger: 0.2,
              ease: "back.out(1.2)",
            });
            observer.disconnect();
          }
        },
        { threshold: 0.2 },
      );

      if (bentoRef.current) {
        observer.observe(bentoRef.current);
      }
      return () => observer.disconnect();
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (mobileTlRef.current) {
      if (isMobileMenuOpen) {
        mobileTlRef.current.play();
        document.body.style.overflow = "hidden";
      } else {
        mobileTlRef.current.reverse();
        document.body.style.overflow = "";
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (result || error) {
      gsap.fromTo(
        ".verification-result",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        },
      );
    }
  }, [result, error]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/verify?query=${wallet}`);
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
    <div
      ref={containerRef}
      className="bg-white text-foreground min-h-screen flex flex-col font-sans selection:bg-red-100 selection:text-red-900 relative"
    >
      {/* Background Dot Pattern (Beside-like) */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

      {/* Navbar */}
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled && !isMobileMenuOpen ? "py-3" : "py-6"
        }`}
      >
        <div
          className={`mx-auto flex justify-between items-center transition-all duration-300 ${
            isScrolled && !isMobileMenuOpen
              ? "max-w-5xl bg-white/80 backdrop-blur-md rounded-full border border-zinc-200 shadow-md px-6 md:px-8 py-3"
              : "max-w-7xl bg-transparent px-6 md:px-12 py-3"
          }`}
        >
          <Link href="/" className="flex items-center gap-3 z-50">
            <Image
              src="/apple-touch-icon.png"
              alt="Logo Untad"
              width={40}
              height={40}
              className="object-contain drop-shadow-sm"
              priority
            />
            <div className="flex flex-col">
              <span className="text-xl font-black text-foreground tracking-tight leading-none">
                SIJAGA
              </span>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">
                Universitas Tadulako
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              href="#verification"
            >
              Verifikasi
            </a>
            <a
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              href="#features"
            >
              Fitur
            </a>
            <a
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              href="#faq"
            >
              FAQ
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                Masuk
              </Button>
            </Link>
            <a href="#verification">
              <Button className="font-bold bg-foreground text-white hover:bg-foreground/90 rounded-full px-6 shadow-md">
                Coba Sekarang
              </Button>
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden z-50 p-2 -mr-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu (Staggered Animation) */}
        <div
          ref={mobileMenuRef}
          className="md:hidden fixed inset-0 bg-white/95 backdrop-blur-lg z-40 flex flex-col items-center justify-center invisible opacity-0"
        >
          <nav className="flex flex-col gap-8 text-center">
            {[
              { label: "Verifikasi", href: "#verification" },
              { label: "Fitur", href: "#features" },
              { label: "FAQ", href: "#faq" },
              { label: "Masuk", href: "/login" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="mobile-nav-item text-3xl font-black tracking-tight text-foreground"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#verification"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mobile-nav-item mt-4"
            >
              <Button className="font-bold bg-foreground text-white hover:bg-foreground/90 rounded-full px-8 py-6 text-lg shadow-xl">
                Coba Sekarang
              </Button>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-grow relative z-10 flex flex-col w-full">
        {/* Hero Section */}
        <section
          id="verification"
          className="pt-28 md:pt-36 pb-20 md:pb-24 px-6 md:px-8 lg:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8 lg:gap-16 items-center"
        >
          <div className="flex flex-col gap-6 md:gap-8 max-w-2xl">
            <div className="hero-anim inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 w-fit">
              <Badge
                variant="secondary"
                className="bg-red-600 text-white hover:bg-red-600 rounded-full px-2 py-0.5 text-[10px]"
              >
                Baru
              </Badge>
              <span className="text-xs font-semibold text-red-900 pr-1">
                Purwarupa SIJAGA Beta
              </span>
              <ArrowRight className="w-3 h-3 text-red-600" />
            </div>

            <h1 className="hero-anim text-[2.75rem] sm:text-5xl md:text-4xl lg:text-[4.25rem] xl:text-[5rem] font-black text-foreground leading-[1.05] tracking-tighter">
              Verifikasi Kredensial
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">
                Akademik
              </span>
              <br />
              Digital.
            </h1>

            <p className="hero-anim text-xl text-muted-foreground leading-relaxed max-w-lg font-medium">
              SIJAGA adalah purwarupa sistem verifikasi ijazah Universitas Tadulako. Memungkinkan pengujian validitas dokumen secara instan dan transparan berbasis ekosistem Solana.
            </p>

            <form
              onSubmit={handleVerify}
              className="hero-anim mt-2 w-full max-w-md relative group"
            >
              <div className="absolute inset-0 bg-red-600/5 rounded-full blur-xl group-hover:bg-red-600/10 transition-colors"></div>
              <div className="relative flex items-center bg-white border-2 border-zinc-200 rounded-full p-1.5 shadow-sm focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 transition-all">
                <Search className="size-7 text-zinc-400 ml-4 flex-shrink-0" />
                <input
                  className="w-full flex-1 min-w-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 shadow-none h-12 text-base font-medium placeholder:text-zinc-400 pl-3 pr-4 text-ellipsis"
                  placeholder="Masukkan NIM atau Dompet Digital..."
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  required
                />
                <Button
                  disabled={loading}
                  type="submit"
                  className={`h-12 px-8 rounded-full font-bold text-white shrink-0 transition-all ${
                    loading 
                      ? "bg-red-600 animate-pulse opacity-90 cursor-wait" 
                      : "bg-foreground hover:bg-foreground/90 shadow-md"
                  }`}
                >
                  {loading ? "Memeriksa..." : "Verifikasi"}
                </Button>
              </div>
            </form>

            {/* Inline Verification Result */}
            <div className="w-full max-w-md mt-2">
              {error && (
                <div className="verification-result bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 shadow-sm">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-900">
                      Verifikasi Gagal
                    </h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}
              {result && (
                <div
                  className={`verification-result border rounded-2xl p-5 shadow-sm bg-white ${result.revoked ? "border-red-200" : result.verified ? "border-emerald-200" : "border-zinc-200"}`}
                >
                  {result.revoked ? (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">
                          Ijazah Dibatalkan
                        </h4>
                        {result.data && (
                          <p className="text-sm font-medium text-muted-foreground mt-1">
                            {result.data.nama} — {result.data.nim}
                          </p>
                        )}
                        <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded-md inline-block">
                          Alasan: {result.revokeReason}
                        </p>
                      </div>
                    </div>
                  ) : result.verifiedOnChain ? (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="w-full">
                        <h4 className="text-base font-bold text-foreground">
                          {result.verifiedNominative ? "Tervalidasi Penuh (Asli)" : "Terverifikasi Kriptografis"}
                        </h4>
                        {!result.verifiedNominative && (
                          <p className="text-xs text-amber-600 font-medium mt-1">Data identitas telah dihapus dari sistem sesuai kebijakan privasi.</p>
                        )}
                        {result.data && (
                          <div className="mt-3 bg-zinc-50 rounded-xl p-3 grid grid-cols-2 gap-y-3 gap-x-4 border border-zinc-100">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                                Mahasiswa
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {result.data.nama}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                                NIM
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {result.data.nim}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                                Prodi
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {result.data.prodi}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                                Status
                              </p>
                              <p className="text-sm font-semibold text-emerald-600">
                                {result.data.status}
                              </p>
                            </div>
                          </div>
                        )}
                        <VerificationChecklist result={result} />
                        {result.explorerUrl && (
                          <a
                            href={result.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 w-fit"
                          >
                            Lihat di Solana Explorer{" "}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                        <SearchX className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="w-full">
                        <h4 className="text-base font-bold text-foreground">
                          {result.onChain?.status === "UNAVAILABLE" 
                            ? "Keberadaan on-chain tidak dapat dikonfirmasi — tidak dinyatakan sah" 
                            : "Data Tidak Ditemukan"}
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground mt-1">
                          {result.message}
                        </p>
                        <VerificationChecklist result={result} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Beside-like Floating Cards UI */}
          <div className="relative h-[480px] md:h-[500px] lg:h-[600px] w-full hidden md:block perspective-1000">
            <div className="floating-card absolute top-2 right-0 md:right-2 lg:right-4 w-full max-w-[320px] md:max-w-[340px] lg:max-w-[420px] bg-white border border-zinc-200 rounded-3xl p-5 lg:p-6 shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-500 z-20 overflow-hidden">
              {/* Scan Line Element */}
              <div className="scan-line absolute left-0 w-full h-24 bg-gradient-to-b from-transparent via-red-500/10 to-red-500/30 border-b-2 border-red-500/60 pointer-events-none z-50 blur-[1px]"></div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-bold text-sm text-foreground">
                  Rekam Jejak Permanen
                </span>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="skeleton-line-1 h-2 w-3/4 bg-zinc-100 rounded-full"></div>
                <div className="skeleton-line-2 h-2 w-1/2 bg-zinc-100 rounded-full"></div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-100">
                  <span className="text-xs font-mono text-zinc-400">
                    TX: 8xKxtg...osgAsV
                  </span>
                  <Badge className="badge-glow bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50 shadow-none">
                    Tercetak
                  </Badge>
                </div>
              </div>
            </div>

            <div className="floating-card absolute top-[150px] md:top-[160px] lg:top-[180px] right-2 md:right-6 lg:right-20 w-full max-w-[300px] md:max-w-[320px] lg:max-w-[380px] bg-white border border-zinc-200 rounded-3xl p-5 lg:p-6 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500 z-30">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-foreground" />
                <span className="font-bold text-foreground">Alumni Untad</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                S.Kom - Teknik Informatika (2024)
              </p>
              
              <div className="relative h-14 mt-4 w-full">
                {/* Initial State: Verify Button */}
                <div className="verify-btn-container absolute inset-0 flex items-center justify-center">
                  <div className="bg-foreground text-white rounded-xl px-8 py-2.5 text-sm font-bold shadow-md w-full text-center border border-zinc-800">
                    Verifikasi Kredensial
                  </div>
                </div>

                {/* Final State: Verified Block */}
                <div className="verified-state-container absolute inset-0 opacity-0 scale-90">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-center gap-3 w-full h-full">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">
                      Tervalidasi oleh Universitas Tadulako
                    </span>
                  </div>
                </div>

                {/* Fake Cursor */}
                <div className="fake-cursor absolute top-1/2 left-1/2 -ml-2 -mt-2 z-50 pointer-events-none">
                  <MousePointer2 className="w-6 h-6 text-zinc-800 fill-zinc-800 drop-shadow-md" />
                </div>
              </div>
            </div>

            <div className="floating-card absolute top-[290px] md:top-[310px] lg:top-[360px] right-0 md:right-3 lg:right-8 w-full max-w-[310px] md:max-w-[330px] lg:max-w-[400px] bg-neutral-900 text-white rounded-3xl p-5 lg:p-6 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500 z-10">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-red-400" />
                <span className="font-bold">Validasi Real-time</span>
              </div>
              <p className="card-3-text text-sm text-zinc-300">
                Memungkinkan verifikasi instan secara digital sebagai uji coba ekosistem transparan.
              </p>
            </div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="py-10 border-y border-zinc-100 bg-zinc-50/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center">
            <p className="text-sm font-bold text-muted-foreground mb-6 uppercase tracking-widest text-center">
              SIJAGA dibangun menggunakan teknologi:
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60">
              {["SOLANA", "METAPLEX", "NEXT.JS", "PRISMA", "NEON"].map((name) => (
                <span
                  key={name}
                  className="text-2xl font-black text-foreground tracking-tight"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features Bento */}
        <section
          id="features"
          className="py-32 px-6 md:px-12 max-w-7xl mx-auto w-full"
        >
          <div className="max-w-2xl mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter leading-tight mb-4">
              Infrastruktur Inti
              <br />
              <span className="text-red-600">Web3 Enterprise.</span>
            </h2>
            <p className="text-lg text-muted-foreground font-medium">
              Dirancang untuk memproses verifikasi instan secara desentralisasi, tanpa mengorbankan privasi data.
            </p>
          </div>

          <div ref={bentoRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bento-card md:col-span-2 bg-white rounded-[2rem] p-8 md:p-12 border border-zinc-200 shadow-sm group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-zinc-300">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                <Lock className="w-96 h-96" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-8 border border-zinc-100 perspective-1000">
                  <Lock className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-3xl font-black text-foreground tracking-tight mb-4">
                  Keamanan Kriptografi
                </h3>
                <p className="text-muted-foreground text-lg max-w-md mb-8">
                  Setiap ijazah di-hash dengan SHA-256 dan dicetak sebagai
                  Non-Fungible Token (NFT) yang tidak dapat dipindahtangankan
                  (Soulbound).
                </p>
                <div className="mt-auto flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-white rounded-full text-sm font-bold text-foreground border border-zinc-200 shadow-sm">
                    SHA-256
                  </span>
                  <span className="px-4 py-2 bg-white rounded-full text-sm font-bold text-foreground border border-zinc-200 shadow-sm">
                    Soulbound Token
                  </span>
                </div>
              </div>
            </div>

            <div className="bento-card bg-red-600 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden group transition-transform duration-300 hover:scale-[1.02] shadow-lg shadow-red-600/20">
              <div className="absolute inset-0 opacity-[0.1] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-4 text-white">
                  400ms
                </h3>
                <p className="text-white/90 text-lg font-medium">
                  Waktu rata-rata yang dibutuhkan untuk memvalidasi keaslian
                  dokumen secara global.
                </p>
              </div>
            </div>

            <div className="bento-card bg-foreground rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden group transition-transform duration-300 hover:scale-[1.02] shadow-lg">
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8 origin-bottom">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-4 text-white">
                  Metaplex Core
                </h3>
                <p className="text-zinc-300 text-lg mb-8 font-medium">
                  Standar aset digital generasi baru di jaringan Solana.
                </p>
                <div className="mt-auto">
                  <a
                    href="https://www.metaplex.com/docs/smart-contracts/core"
                    className="inline-flex items-center gap-2 text-sm font-bold hover:text-red-400 transition-colors"
                  target="_blank" >
                    Baca dokumentasi <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="bento-card md:col-span-2 bg-white rounded-[2rem] p-8 md:p-12 border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h3 className="text-3xl font-black text-foreground tracking-tight mb-4">
                  Skalabilitas Jaringan
                </h3>
                <p className="text-muted-foreground text-lg mb-6">
                  Berjalan di ekosistem Solana dengan performa transaksi yang cepat dan murah.
                </p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      Validator
                    </p>
                    <p className="text-2xl font-black text-foreground font-mono">
                      1,432
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      Rata-rata TPS
                    </p>
                    <p className="text-2xl font-black text-foreground font-mono">
                      3,140
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-48 h-48 bg-zinc-50 rounded-full border-8 border-white shadow-xl flex items-center justify-center relative shrink-0">
                <div className="absolute inset-0 rounded-full border border-emerald-500"></div>
                <div className="absolute inset-0 rounded-full border border-zinc-200"></div>
                <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400"></div>
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 z-10">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action - Scroll Expand */}
        <section className="w-full relative">
          <ScrollExpand
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop"
            alt="Security Abstract"
            title="Transparansi Data Akademik."
            scrollHint="Gulir ke bawah"
            mediaZoom={1.2}
            useWindowScroll={true}
            overlayScrim={0.8}
          >
            <div className="absolute inset-0 w-full h-full bg-neutral-950/70 backdrop-blur-md flex flex-col items-center justify-center px-4">
              <div className="max-w-4xl mx-auto flex flex-col items-center mt-12">
                <h2 className="text-4xl md:text-[5rem] font-black text-white tracking-tighter mb-8 leading-[1.05] text-center drop-shadow-2xl">
                  Transparansi
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500">Data Akademik</span>.
                </h2>
                <p className="text-xl md:text-2xl text-zinc-300 max-w-3xl mb-12 text-center drop-shadow-lg font-medium">
                  Infrastruktur modern bagi institusi pendidikan untuk memfasilitasi penelusuran rekam jejak akademik.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <Button
                    className="h-14 px-8 rounded-full text-base font-bold bg-white text-foreground hover:bg-zinc-100 shadow-xl shadow-black/40 hover:scale-105 transition-transform"
                    onClick={() =>
                      document
                        .getElementById("verification")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Mulai Verifikasi
                  </Button>
                </div>
              </div>
            </div>
          </ScrollExpand>
        </section>
      </main>

      {/* Modern Two-Column FAQ Section (Dark Theme) */}
      <section id="faq" className="w-full relative z-10 bg-neutral-950 py-24 md:py-32 px-4 md:px-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column */}
          <div className="lg:col-span-5 flex flex-col gap-8 lg:sticky lg:top-32 relative">
            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-white leading-tight">
                Pertanyaan yang Sering Diajukan
              </h2>
              <p className="text-lg text-zinc-400 font-medium max-w-sm">
                Temukan jawaban singkat tentang bagaimana purwarupa verifikasi SIJAGA bekerja.
              </p>
            </div>
            
            {/* Contact Box (Dark Bento) */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6 w-full max-w-md transition-all hover:bg-white/10 hover:border-white/20">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden border border-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-red-600/20 to-red-900/40 flex items-center justify-center">
                      <span className="text-red-500 font-bold text-lg">DV</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-neutral-900 rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-bold text-white">Tim Developer</h4>
                  <p className="text-sm text-zinc-400 font-medium">Universitas Tadulako</p>
                </div>
              </div>
              <div className="border-t border-white/10 pt-6">
                <h5 className="font-bold text-lg mb-2 text-white">Butuh penjelasan teknis?</h5>
                <p className="text-sm text-zinc-400 mb-6">Jadwalkan panggilan dengan developer atau baca dokumentasi proyek.</p>
                <a href="mailto:dev@sijaga.ac.id">
                  <Button className="w-full h-12 rounded-full font-bold bg-white text-black hover:bg-red-600 hover:text-white transition-all shadow-md hover:shadow-red-600/20">
                    Hubungi Developer
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column (Accordion) */}
          <div className="lg:col-span-7 flex flex-col gap-3 md:gap-4 mt-8 lg:mt-0">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className={`bg-white/5 backdrop-blur-sm border transition-all duration-300 rounded-2xl md:rounded-3xl overflow-hidden ${
                  openFaq === idx ? "border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.15)] bg-white/10" : "border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-5 md:px-8 py-5 md:py-6 flex justify-between items-center text-left outline-none group"
                >
                  <span className="text-lg md:text-xl font-bold tracking-tight text-zinc-100 pr-6 group-hover:text-white transition-colors">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-300 ${openFaq === idx ? "bg-red-500/20 border-red-500/30 text-red-400 rotate-180" : "border-white/10 text-zinc-400 group-hover:bg-white/10 group-hover:text-white group-hover:border-white/20"}`}
                  >
                    <span className="text-xl font-light leading-none mb-0.5">{openFaq === idx ? "−" : "+"}</span>
                  </div>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${openFaq === idx ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 md:px-8 pb-6 md:pb-8 text-base md:text-lg text-zinc-400 font-medium leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brutalist Bold Footer */}
      <footer className="bg-neutral-900 text-white pt-24 pb-8 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full mb-16 grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
          <div>
            <h3 className="text-4xl font-black tracking-tighter uppercase mb-6 text-white leading-tight">
              Ekosistem
              <br />
              Transparan.
            </h3>
            <p className="text-lg text-zinc-400 font-medium max-w-sm mb-8">
              Purwarupa Sistem Jaminan Autentikasi Gelar Akademik Universitas Tadulako berbasis teknologi Web3.
            </p>
            <a href="#verification">
              <Button className="h-14 px-8 rounded-none border-2 border-white text-base font-bold bg-white text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors uppercase tracking-widest">
                Coba Sekarang
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">
                Platform
              </h4>
              <a
                href="#verification"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                Verifikasi
              </a>
              <a
                href="#features"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                Fitur
              </a>
              <a
                href="#faq"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                FAQ
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">
                Legal
              </h4>
              <a
                href="#"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                Kebijakan Privasi
              </a>
              <a
                href="#"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                Syarat & Ketentuan
              </a>
            </div>
          </div>
        </div>

        {/* Giant Typography */}
        <div className="w-full border-t border-zinc-700 pt-12 pb-4 flex justify-center items-center overflow-hidden">
          <span className="text-[20vw] font-black text-white uppercase tracking-tighter leading-none select-none hover:text-red-600 transition-colors duration-500 cursor-default">
            SIJAGA
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 pt-8 border-t border-zinc-700">
          <p className="text-sm font-bold text-zinc-600 uppercase tracking-widest">
            © 2024–2026 SIJAGA Beta • Universitas Tadulako
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Status Sistem Berjalan
            </span>
          </div>
        </div>
      </footer>
      <AiChatBubble />
    </div>
  );
}
