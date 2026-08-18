import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, FileText, Award } from "lucide-react";

interface StatusBadgeProps {
  status: string | undefined | null;
  type: "wallet" | "certificate";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  if (!status) return <Badge variant="outline">-</Badge>;

  if (type === "wallet") {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" /> Menunggu Verifikasi
          </Badge>
        );
      case "VERIFIED":
        return (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Terverifikasi
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Ditolak
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-zinc-100 text-zinc-700 border-zinc-200">
            {status}
          </Badge>
        );
    }
  }

  if (type === "certificate") {
    switch (status) {
      case "NOT_ISSUED":
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            Belum Diterbitkan
          </Badge>
        );
      case "MINTED":
        return (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
            <FileText className="w-3 h-3 mr-1" /> Sudah Diterbitkan
          </Badge>
        );
      case "CLAIMED":
        return (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Award className="w-3 h-3 mr-1" /> Sudah Diklaim
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> DIREVOKE
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return <Badge variant="outline">{status}</Badge>;
}
