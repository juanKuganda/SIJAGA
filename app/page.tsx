"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
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
  ChevronRight,
  Check,
  Menu,
  X,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ScrollExpand from "@/components/ScrollExpand";
import { useGlobalLoading } from "@/components/LoadingContext";

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isLoaded } = useGlobalLoading();

  const faqs = [
    {
      q: "Apa itu SIJAGA?",
      a: "SIJAGA (Sistem Jaminan Autentikasi Gelar Akademik) adalah platform verifikasi ijazah berbasis blockchain Solana menggunakan Soulbound Token.",
    },
    {
      q: "Bagaimana cara kerja verifikasi ini?",
      a: "Setiap ijazah dienkripsi dan dicetak sebagai token NFT permanen. Pihak perusahaan atau kampus lain dapat memverifikasi keasliannya secara instan tanpa perantara.",
    },
    {
      q: "Apakah token ini bisa dipindahtangankan?",
      a: "Tidak. Kami menggunakan standar Soulbound Token (SBT) yang berarti token ijazah ini akan selamanya terikat pada dompet digital (wallet) mahasiswa dan tidak dapat ditransfer atau diperjualbelikan.",
    },
    {
      q: "Berapa lama proses verifikasi berlangsung?",
      a: "Verifikasi terjadi secara real-time di jaringan Solana, biasanya memakan waktu kurang dari 400 milidetik (0.4 detik).",
    },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileTlRef = useRef<gsap.core.Timeline | null>(null);
  const bentoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded) return;
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
  }, [isLoaded]);

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
      gsap.set(".bento-card", { y: 80, opacity: 0, scale: 0.9 });

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
              clearProps: "all",
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
      } else {
        mobileTlRef.current.reverse();
      }
    }
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
          clearProps: "all",
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "py-3" : "py-6"}`}
      >
        <div
          className={`mx-auto flex justify-between items-center transition-all duration-300 ${
            isScrolled
              ? "max-w-5xl bg-white/80 backdrop-blur-md rounded-full border border-zinc-200 shadow-md px-6 md:px-8 py-3"
              : "max-w-7xl bg-transparent px-6 md:px-12 py-3"
          }`}
        >
          <Link href="/" className="flex items-center gap-3 z-50">
            <img
              src="/apple-touch-icon.png"
              alt="Logo Untad"
              className="w-10 h-10 object-contain drop-shadow-sm"
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
                Log In
              </Button>
            </Link>
            <a href="#verification">
              <Button className="font-bold bg-foreground text-white hover:bg-foreground/90 rounded-full px-6 shadow-md">
                Try it live
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
              { label: "Log In", href: "/login" },
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
                Try it live
              </Button>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-grow relative z-10 flex flex-col w-full">
        {/* Hero Section */}
        <section
          id="verification"
          className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <div className="flex flex-col gap-8 max-w-2xl">
            <div className="hero-anim inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 w-fit">
              <Badge
                variant="secondary"
                className="bg-red-600 text-white hover:bg-red-600 rounded-full px-2 py-0.5 text-[10px]"
              >
                New
              </Badge>
              <span className="text-xs font-semibold text-red-900 pr-1">
                SIJAGA Beta 1.0 is live
              </span>
              <ArrowRight className="w-3 h-3 text-red-600" />
            </div>

            <h1 className="hero-anim text-[3.5rem] md:text-[4.5rem] lg:text-[5rem] font-black text-foreground leading-[1.05] tracking-tighter">
              Make your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">
                academic data
              </span>
              <br />
              work for you.
            </h1>

            <p className="hero-anim text-xl text-muted-foreground leading-relaxed max-w-lg font-medium">
              Unlike traditional certificates, SIJAGA secures credentials on
              Solana. Verifies instantly, prevents forgery, and keeps
              institutions informed.
            </p>

            <form
              onSubmit={handleVerify}
              className="hero-anim mt-2 w-full max-w-md relative group"
            >
              <div className="absolute inset-0 bg-red-600/5 rounded-full blur-xl group-hover:bg-red-600/10 transition-colors"></div>
              <div className="relative flex items-center bg-white border-2 border-zinc-200 rounded-full p-1.5 shadow-sm focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10 transition-all">
                <Search className="w-5 h-5 text-zinc-400 ml-4" />
                <Input
                  className="border-0 focus-visible:ring-0 shadow-none h-12 text-base font-medium placeholder:text-zinc-400 pl-3"
                  placeholder="Enter Student NIM or Wallet..."
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  required
                />
                <Button
                  disabled={loading}
                  type="submit"
                  className="h-12 px-8 rounded-full font-bold bg-foreground text-white hover:bg-foreground/90 shrink-0"
                >
                  {loading ? "..." : "Verify Now"}
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
                      Verification Failed
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
                          Certificate Revoked
                        </h4>
                        {result.data && (
                          <p className="text-sm font-medium text-muted-foreground mt-1">
                            {result.data.nama} — {result.data.nim}
                          </p>
                        )}
                        <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded-md inline-block">
                          Reason: {result.revokeReason}
                        </p>
                      </div>
                    </div>
                  ) : result.verified ? (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="w-full">
                        <h4 className="text-base font-bold text-foreground">
                          Verified Authentic
                        </h4>
                        {result.data && (
                          <div className="mt-3 bg-zinc-50 rounded-xl p-3 grid grid-cols-2 gap-y-3 gap-x-4 border border-zinc-100">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                                Student
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {result.data.nama}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                                ID
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {result.data.nim}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                                Program
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
                        {result.explorerUrl && (
                          <a
                            href={result.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 w-fit"
                          >
                            View on Solana Explorer{" "}
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
                      <div>
                        <h4 className="text-base font-bold text-foreground">
                          No Record Found
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground mt-1">
                          {result.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Beside-like Floating Cards UI */}
          <div className="relative h-[500px] lg:h-[600px] w-full hidden md:block perspective-1000">
            <div className="floating-card absolute top-2 right-4 w-[420px] bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-500 z-20 overflow-hidden">
              {/* Scan Line Element */}
              <div className="scan-line absolute left-0 w-full h-24 bg-gradient-to-b from-transparent via-red-500/10 to-red-500/30 border-b-2 border-red-500/60 pointer-events-none z-50 blur-[1px]"></div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-bold text-sm text-foreground">
                  Immutable Record Created
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
                    Minted
                  </Badge>
                </div>
              </div>
            </div>

            <div className="floating-card absolute top-[180px] right-20 w-[380px] bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500 z-30">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-foreground" />
                <span className="font-bold text-foreground">Budi Santoso</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                S.Kom - Teknik Informatika (2024)
              </p>
              
              <div className="relative h-14 mt-4 w-full">
                {/* Initial State: Verify Button */}
                <div className="verify-btn-container absolute inset-0 flex items-center justify-center">
                  <div className="bg-foreground text-white rounded-xl px-8 py-2.5 text-sm font-bold shadow-md w-full text-center border border-zinc-800">
                    Verify Credential
                  </div>
                </div>

                {/* Final State: Verified Block */}
                <div className="verified-state-container absolute inset-0 opacity-0 scale-90">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-center gap-3 w-full h-full">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">
                      Verified by Universitas Tadulako
                    </span>
                  </div>
                </div>

                {/* Fake Cursor */}
                <div className="fake-cursor absolute top-1/2 left-1/2 -ml-2 -mt-2 z-50 pointer-events-none">
                  <MousePointer2 className="w-6 h-6 text-zinc-800 fill-zinc-800 drop-shadow-md" />
                </div>
              </div>
            </div>

            <div className="floating-card absolute top-[360px] right-8 w-[400px] bg-neutral-900 text-white rounded-3xl p-6 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500 z-10">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-red-400" />
                <span className="font-bold">Real-time Global Validation</span>
              </div>
              <p className="card-3-text text-sm text-zinc-300">
                Employers can verify academic credentials instantly without
                intermediaries or waiting times.
              </p>
            </div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="py-10 border-y border-zinc-100 bg-zinc-50/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center">
            <p className="text-sm font-bold text-muted-foreground mb-6 uppercase tracking-widest text-center">
              Trusted by forward-thinking institutions
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60">
              {["DIKTI", "KEMDIKBUD", "SOLANA", "METAPLEX"].map((name) => (
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
              Build systems to
              <br />
              grow trust.
            </h2>
            <p className="text-lg text-muted-foreground font-medium">
              Infrastructure to issue secure credentials, run agentic
              verifications, and prevent academic fraud globally.
            </p>
          </div>

          <div ref={bentoRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bento-card md:col-span-2 bg-zinc-50 rounded-[2rem] p-8 md:p-12 border border-zinc-200 group relative overflow-hidden transition-all hover:bg-zinc-100/80">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                <Lock className="w-96 h-96" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-8 border border-zinc-100 perspective-1000">
                  <Lock className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-3xl font-black text-foreground tracking-tight mb-4">
                  Cryptographic Security
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

            <div className="bento-card bg-red-600 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden group">
              <div className="absolute inset-0 opacity-[0.1] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-4 text-white">
                  400ms
                </h3>
                <p className="text-white/80 text-lg">
                  Waktu rata-rata yang dibutuhkan untuk memvalidasi keaslian
                  dokumen secara global.
                </p>
              </div>
            </div>

            <div className="bento-card bg-foreground rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden group">
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8 origin-bottom">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-4 text-white">
                  Metaplex Core
                </h3>
                <p className="text-zinc-400 text-lg mb-8">
                  Standar aset digital tercanggih di jaringan Solana.
                </p>
                <div className="mt-auto">
                  <a
                    href="#"
                    className="inline-flex items-center gap-2 text-sm font-bold hover:text-red-400 transition-colors"
                  >
                    Read the docs <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="bento-card md:col-span-2 bg-white rounded-[2rem] p-8 md:p-12 border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h3 className="text-3xl font-black text-foreground tracking-tight mb-4">
                  Ready for Scale
                </h3>
                <p className="text-muted-foreground text-lg mb-6">
                  Mainnet Beta live dengan performa jaringan yang tak
                  tertandingi.
                </p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      Validators
                    </p>
                    <p className="text-2xl font-black text-foreground font-mono">
                      1,432
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      Avg TPS
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
            title="Ship credentials that never break."
            scrollHint="Scroll to explore"
            mediaZoom={1.2}
            useWindowScroll={true}
            overlayScrim={0.8}
          >
            <div className="absolute inset-0 w-full h-full bg-neutral-900/60 backdrop-blur-md flex flex-col items-center justify-center px-4">
              <div className="max-w-4xl mx-auto flex flex-col items-center mt-12">
                <h2 className="text-4xl md:text-[5rem] font-black text-white tracking-tighter mb-8 leading-[1.05] text-center drop-shadow-2xl">
                  Ship credentials that
                  <br />
                  never{" "}
                  <span className="italic font-light text-zinc-300">break</span>
                  .
                </h2>
                <p className="text-xl md:text-2xl text-zinc-200 max-w-3xl mb-12 text-center drop-shadow-lg font-medium">
                  SIJAGA empowers institutions to issue cryptographic academic
                  records with real-time global verifiability.
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

      {/* Minimalist FAQ Section with Full Red Background */}
      <section id="faq" className="w-full relative z-10 bg-red-600 text-white py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-12 uppercase text-center text-white">
            FAQ
          </h2>
          <div className="flex flex-col gap-0 border-t border-white/20">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border-b border-white/20 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-2 py-8 flex justify-between items-center text-left hover:bg-white/5 transition-colors outline-none"
                >
                  <span className="text-xl md:text-2xl font-semibold tracking-tight text-white pr-8">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-white transition-transform duration-300 ${openFaq === idx ? "rotate-45" : ""}`}
                  >
                    <span className="text-4xl font-light leading-none">+</span>
                  </div>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${openFaq === idx ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-2 pb-8 text-lg text-white/80 font-medium">
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
              Unlock The Future
              <br />
              of Credentials.
            </h3>
            <p className="text-lg text-zinc-400 font-medium max-w-sm mb-8">
              Sistem Jaminan Autentikasi Gelar Akademik Universitas Tadulako.
              Enterprise-grade academic verification built on Solana.
            </p>
            <Button className="h-14 px-8 rounded-none border-2 border-white text-base font-bold bg-white text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors uppercase tracking-widest">
              Start Now
            </Button>
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
            © 2024 SIJAGA Beta • Universitas Tadulako
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
