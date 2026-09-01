"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth/client";
import {
  LayoutDashboard,
  Users,
  FileText,
  XCircle,
  LogOut,
  Shield,
  Home,
  ScanLine,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface User {
  id: string;
  nama: string;
  nim: string;
  role: string;
}

interface AdminStats {
  walletPending: number;
  readyToMint: number;
  ijazahRevoked: number;
}

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/mahasiswa",
    label: "Mahasiswa",
    icon: Users,
  },
  {
    href: "/terbitkan",
    label: "Terbitkan",
    icon: FileText,
  },
  {
    href: "/ocr-scan",
    label: "OCR Scan",
    icon: ScanLine,
  },
  {
    href: "/revoke",
    label: "Revoke",
    icon: XCircle,
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: History,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.role !== "ADMIN") {
            router.push("/profil");
            return;
          }
          setUser(data.user);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setIsChecking(false));

    const fetchStats = () => {
      fetch("/api/admin/stats")
        .then((res) => res.json())
        .then((data) => {
          if (data.stats) {
            setStats(data.stats);
          }
        })
        .catch(console.error);
    };

    fetchStats(); // Fetch immediately on mount

    // Polling every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  if (isChecking || !user) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-red-600" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-slate-50/50 selection:bg-red-100 selection:text-red-900 font-sans">
        <Sidebar
          collapsible="icon"
          className="border-r-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] bg-white/80 backdrop-blur-2xl"
        >
          <SidebarHeader>
            <div className="flex items-center gap-3 px-2 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
              <Image src="/apple-touch-icon.png" alt="Logo Untad" width={40} height={40} className="w-10 h-10 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 object-contain shrink-0 drop-shadow-sm transition-all" priority />
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-xl font-black text-foreground tracking-tight leading-none">SIJAGA</span>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">Universitas Tadulako</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarSeparator />

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    let badgeCount = 0;
                    if (stats) {
                      if (item.label === "Mahasiswa") badgeCount = stats.walletPending;
                      if (item.label === "Terbitkan") badgeCount = stats.readyToMint;
                      if (item.label === "Revoke") badgeCount = stats.ijazahRevoked;
                    }

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={pathname === item.href}
                          tooltip={item.label}
                          className={
                            pathname === item.href
                              ? "bg-red-50 text-red-600 font-semibold hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
                              : "text-muted-foreground hover:text-foreground hover:bg-zinc-100 rounded-xl transition-all duration-200"
                          }
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {badgeCount > 0 && (
                            <span
                              className={`ml-auto shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                pathname === item.href
                                  ? "bg-red-200 text-red-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {badgeCount}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <Link href="/" className="px-3 py-3 mt-6 mx-4 group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center bg-zinc-50 group-data-[collapsible=icon]:bg-transparent hover:bg-zinc-100 transition-colors rounded-xl border border-zinc-200 group-data-[collapsible=icon]:border-transparent flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0 group-hover:border-red-200 transition-colors">
                    <Home className="w-4 h-4 text-zinc-500 group-hover:text-red-500 transition-colors" />
                  </div>
                  <div className="group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-bold text-zinc-700 block group-hover:text-red-600 transition-colors">Beranda Publik</span>
                    <span className="text-[10px] text-muted-foreground block leading-tight">Kembali ke landing page</span>
                  </div>
                </Link>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarSeparator />

          <SidebarFooter>
            <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-red-600">
                  {user?.nama?.charAt(0)?.toUpperCase() || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.nama || "Admin"}
                </p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="shrink-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-transparent min-w-0">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-white/20 bg-white/70 backdrop-blur-xl px-6 shadow-sm">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            
            <div className="h-4 w-px bg-zinc-200 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-2 text-sm text-zinc-500 font-medium">
              <span>SIJAGA Admin</span>
              <span>/</span>
              <span className="text-foreground">{navItems.find(i => i.href === pathname)?.label || "Dashboard"}</span>
            </div>

            <div className="flex-1" />
            
            <div className="flex items-center gap-2 md:gap-4">
              {user && (
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-foreground leading-none">{user.nama}</span>
                  <span className="text-[10px] text-red-600 font-semibold mt-1">Admin Pusat</span>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
