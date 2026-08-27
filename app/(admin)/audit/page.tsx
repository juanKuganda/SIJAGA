"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Search, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface AuditLog {
  id: string;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    nama: string;
    email: string;
  };
}

interface Metadata {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States for filtering & pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  
  const limit = 15;

  // Debounced search to avoid spamming the API
  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/admin/audit?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&action=${encodeURIComponent(filter)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Gagal mengambil data");
          return res.json();
        })
        .then((data) => {
          setLogs(data.logs || []);
          setMetadata(data.metadata || null);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [page, search, filter]);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("REVOKE") || act.includes("DELETE") || act.includes("HAPUS")) {
      return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200">{action}</span>;
    }
    if (act.includes("MINT") || act.includes("TERBIT") || act.includes("CREATE")) {
      return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">{action}</span>;
    }
    if (act.includes("VERIFY") || act.includes("APPROVE")) {
      return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">{action}</span>;
    }
    return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">{action}</span>;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
          <History className="w-8 h-8 text-purple-600" />
          Sistem Audit Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Rekam jejak seluruh aktivitas krusial di dalam sistem
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan nama atau email admin..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset ke halaman 1 saat pencarian berubah
                }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "Semua" },
                { key: "MINT", label: "Penerbitan" },
                { key: "VERIFY", label: "Verifikasi" },
                { key: "REVOKE", label: "Pencabutan" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={filter === f.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setFilter(f.key);
                    setPage(1); // Reset ke halaman 1 saat filter berubah
                  }}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Administrator</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                     Memuat data log...
                   </TableCell>
                 </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground font-medium bg-zinc-50/50">
                    Tidak ada riwayat aktivitas yang sesuai filter.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-foreground">{log.user.nama}</div>
                      <div className="text-xs text-muted-foreground">{log.user.email}</div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ipAddress || "-"}
                    </TableCell>
                    <TableCell className="text-zinc-700">
                      <div className="min-w-[200px] max-w-[250px] md:max-w-[400px] whitespace-normal break-all">
                        {log.detail || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {metadata && metadata.totalPages > 1 && (
            <div className="mt-4 border-t pt-4">
              <DataTablePagination
                currentPage={metadata.currentPage}
                totalPages={metadata.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
