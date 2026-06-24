import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "red";
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  const variants = {
    default: "bg-[#27272A] text-[#A1A1AA] border-[#3F3F46]",
    success: "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
    warning: "bg-amber-900/30 text-amber-400 border-amber-800/40",
    danger: "bg-red-900/30 text-red-400 border-red-800/40",
    info: "bg-sky-900/30 text-sky-400 border-sky-800/40",
    red: "bg-red-600/20 text-red-400 border-red-600/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
