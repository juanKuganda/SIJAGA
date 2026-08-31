"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Image from "next/image";

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<{ value: number }>({ value: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          if (onComplete) onComplete();
        },
      });

      // Animate progress value from 0 to 100
      tl.to(progressRef.current, {
        value: 100,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: () => {
          setProgress(Math.round(progressRef.current.value));
        },
      });

      // Slide up to reveal page
      tl.to(containerRef.current, {
        yPercent: -100,
        duration: 0.8,
        ease: "power4.inOut",
        delay: 0.2, // slight pause at 100%
      });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-white flex flex-col justify-center items-center px-8 py-12"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="Logo Universitas Tadulako"
            width={80}
            height={80}
            className="w-20 h-20 mx-auto opacity-20 drop-shadow-lg filter grayscale"
            priority
          />
          <h2 className="text-4xl md:text-6xl font-black text-neutral-900 tracking-[0.2em] uppercase select-none">
            SIJAGA
          </h2>
        </div>
        <div className="flex flex-col items-center gap-2 w-48 md:w-64">
          <div className="w-full h-[2px] bg-neutral-200 overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-neutral-900 transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between w-full text-xs text-neutral-700 font-bold tracking-widest uppercase mt-2">
            <span>Loading</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
