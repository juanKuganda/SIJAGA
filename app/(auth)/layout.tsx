import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-bg-hero" />
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-600/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/3 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="flex items-center gap-3 justify-center mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text">SIJAGA</h1>
          <p className="text-[#71717A] mt-2">
            Sistem Jaminan Autentikasi Gelar Akademik
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
