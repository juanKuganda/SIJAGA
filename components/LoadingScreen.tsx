"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

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
      className="fixed inset-0 z-[100] bg-neutral-900 flex flex-col justify-between px-8 py-12 md:px-16 md:py-16"
    >
      <div className="flex-grow flex items-center justify-center">
        <h2 className="text-[15vw] md:text-[12vw] font-black text-white leading-none tracking-tighter uppercase mix-blend-difference select-none">
          SIJAGA
        </h2>
      </div>

      <div className="flex justify-between items-end border-b-8 border-white pb-2 md:pb-4">
        <span className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase">
          LOADING
        </span>
        <span className="text-6xl md:text-8xl font-black text-white tracking-tighter tabular-nums leading-none">
          {progress}%
        </span>
      </div>
    </div>
  );
}
