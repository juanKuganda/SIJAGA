const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Imports
content = content.replace(
  'import { useState, useEffect } from "react";',
  'import { useState, useEffect, useRef } from "react";\nimport gsap from "gsap";'
);

// State and Refs
content = content.replace(
  'const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);',
`const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadingScreenRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileTlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial Load Animation
      const tl = gsap.timeline();
      
      tl.fromTo(".loading-bar", 
        { width: "0%" }, 
        { width: "100%", duration: 1.2, ease: "power2.inOut" }
      )
      .to(loadingScreenRef.current, {
        yPercent: -100,
        duration: 0.8,
        ease: "power4.inOut"
      })
      .from(headerRef.current, {
        y: -100,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        clearProps: "all"
      }, "-=0.4")
      .from(".hero-anim", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "back.out(1.2)",
        clearProps: "all"
      }, "-=0.6")
      .from(".floating-card", {
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
        clearProps: "all"
      }, "-=0.6");

      // Mobile Menu Animation Timeline
      const mobileTl = gsap.timeline({ paused: true });
      mobileTl.to(mobileMenuRef.current, { autoAlpha: 1, duration: 0.3, ease: "power2.inOut" });
      mobileTl.fromTo(".mobile-nav-item", 
        { y: 30, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.2)" }, 
        "-=0.1"
      );
      mobileTlRef.current = mobileTl;

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
      gsap.fromTo(".verification-result", 
        { y: 20, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "all" }
      );
    }
  }, [result, error]);`
);

// Container ref
content = content.replace(
  '<div className="bg-white text-foreground min-h-screen flex flex-col font-sans selection:bg-red-100 selection:text-red-900 relative">',
  '<div ref={containerRef} className="bg-white text-foreground min-h-screen flex flex-col font-sans selection:bg-red-100 selection:text-red-900 relative overflow-hidden">\n      {/* Loading Screen */}\n      <div ref={loadingScreenRef} className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center">\n        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-8 shadow-2xl backdrop-blur-xl border border-white/10">\n          <Shield className="w-10 h-10 text-white" />\n        </div>\n        <h2 className="text-4xl font-black text-white tracking-widest mb-12">SIJAGA</h2>\n        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">\n          <div className="h-full bg-white loading-bar w-0"></div>\n        </div>\n      </div>'
);

// Header ref
content = content.replace(
  '<header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300',
  '<header ref={headerRef} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300'
);

// Mobile Menu Fixes
content = content.replace(
  /<div className={`md:hidden fixed inset-0 bg-white\/95 backdrop-blur-lg z-40 transition-all duration-500 flex flex-col items-center justify-center \${isMobileMenuOpen \? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}/,
  '<div ref={mobileMenuRef} className="md:hidden fixed inset-0 bg-white/95 backdrop-blur-lg z-40 flex flex-col items-center justify-center invisible opacity-0">'
);
content = content.replace(/className={`text-3xl font-black tracking-tight transition-all duration-500 text-foreground \${isMobileMenuOpen \? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}/g, 'className="mobile-nav-item text-3xl font-black tracking-tight text-foreground"');
content = content.replace(/className={`mt-4 transition-all duration-500 \${isMobileMenuOpen \? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}/g, 'className="mobile-nav-item mt-4"');
// Remove transitionDelay
content = content.replace(/style=\{\{ transitionDelay: isMobileMenuOpen \? `\$\{100 \+ \(i \* 100\)\}ms` : '0ms' \}\}/g, "");
content = content.replace(/style=\{\{ transitionDelay: isMobileMenuOpen \? `\$\{100 \+ \(4 \* 100\)\}ms` : '0ms' \}\}/g, "");


// Hero anims
content = content.replace(
  '<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 w-fit">',
  '<div className="hero-anim inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 w-fit">'
);
content = content.replace(
  '<h1 className="text-[3.5rem] md:text-[4.5rem] lg:text-[5rem] font-black text-foreground leading-[1.05] tracking-tighter">',
  '<h1 className="hero-anim text-[3.5rem] md:text-[4.5rem] lg:text-[5rem] font-black text-foreground leading-[1.05] tracking-tighter">'
);
content = content.replace(
  '<p className="text-xl text-muted-foreground leading-relaxed max-w-lg font-medium">',
  '<p className="hero-anim text-xl text-muted-foreground leading-relaxed max-w-lg font-medium">'
);
content = content.replace(
  '<form onSubmit={handleVerify} className="mt-2 w-full max-w-md relative group">',
  '<form onSubmit={handleVerify} className="hero-anim mt-2 w-full max-w-md relative group">'
);

// Verification result anim
content = content.replace(
  '<div className="animate-fade-in-up bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 shadow-sm">',
  '<div className="verification-result bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 shadow-sm">'
);
content = content.replace(
  /<div className={`animate-fade-in-up border rounded-2xl p-5 shadow-sm bg-white \$\{result.revoked \? 'border-red-200' : result.verified \? 'border-emerald-200' : 'border-zinc-200'\}`}/,
  '<div className={`verification-result border rounded-2xl p-5 shadow-sm bg-white ${result.revoked ? \'border-red-200\' : result.verified ? \'border-emerald-200\' : \'border-zinc-200\'}`}'
);

// Floating cards
content = content.replace(
  '<div className="absolute top-10 right-0 w-[420px] bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-500 z-20">',
  '<div className="floating-card absolute top-10 right-0 w-[420px] bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-500 z-20">'
);
content = content.replace(
  '<div className="absolute top-48 right-12 w-[380px] bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500 z-30">',
  '<div className="floating-card absolute top-48 right-12 w-[380px] bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500 z-30">'
);
content = content.replace(
  '<div className="absolute bottom-12 right-4 w-[400px] bg-foreground text-white rounded-3xl p-6 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500 z-10">',
  '<div className="floating-card absolute bottom-12 right-4 w-[400px] bg-foreground text-white rounded-3xl p-6 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500 z-10">'
);

fs.writeFileSync('app/page.tsx', content);
