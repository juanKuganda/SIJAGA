import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 w-full flex flex-col justify-center items-center min-h-screen p-8 space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-red-600/10 rounded-full blur-xl animate-pulse" />
        <Loader2 className="w-10 h-10 text-red-600 animate-spin relative z-10" />
      </div>
      <span className="text-xs font-bold text-neutral-500 tracking-widest uppercase animate-pulse">
        Memuat Sistem...
      </span>
    </div>
  );
}
