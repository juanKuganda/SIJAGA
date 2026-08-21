"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldOff,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Globe,
  XCircle,
  Scale,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConsentStatus {
  dataConsent: boolean;
  consentGivenAt: string | null;
  consentVersion: string | null;
}

export default function ConsentPage() {
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const fetchConsent = async () => {
    try {
      const res = await fetch("/api/consent");
      const data = await res.json();
      if (res.ok) {
        setConsent(data);
      }
    } catch (error) {
      console.error("Error fetching consent:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsent();
  }, []);

  const handleGiveConsent = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/consent", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Persetujuan berhasil diberikan");
        fetchConsent();
        setAgreed(false);
      } else {
        toast.error(data.error || "Gagal memberikan persetujuan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawConsent = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/consent", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Persetujuan berhasil ditarik kembali");
        fetchConsent();
      } else {
        toast.error(data.message || data.error || "Gagal menarik persetujuan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded-lg animate-pulse mt-2" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Persetujuan Data
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola persetujuan publikasi data akademik Anda ke blockchain
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {consent?.dataConsent ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldOff className="w-5 h-5 text-amber-600" />
              )}
              Status Persetujuan
            </CardTitle>
            {consent?.dataConsent ? (
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah Setuju
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-amber-50 text-amber-700 border-amber-200"
              >
                <XCircle className="w-3 h-3 mr-1" /> Belum Setuju
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {consent?.dataConsent ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Anda telah memberikan persetujuan pada{" "}
                  <strong>
                    {consent.consentGivenAt
                      ? new Date(consent.consentGivenAt).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "-"}
                  </strong>
                  {consent.consentVersion && (
                    <span className="text-emerald-500">
                      {" "}
                      (versi {consent.consentVersion})
                    </span>
                  )}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Admin universitas kini dapat menerbitkan ijazah digital Anda ke
                blockchain Solana.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Anda belum memberikan persetujuan. Ijazah digital tidak dapat
                diterbitkan tanpa persetujuan Anda.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agreement Text Card */}
      {!consent?.dataConsent && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Persetujuan Publikasi Data Akademik
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dengan memberikan persetujuan ini, saya memahami dan menyetujui
              bahwa:
            </p>

            {/* Data yang dipublikasikan */}
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
              <h4 className="font-semibold text-blue-800 flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4" />
                Data yang AKAN dipublikasikan ke blockchain (bersifat permanen):
              </h4>
              <ul className="space-y-2 text-sm text-blue-700 ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Program studi
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Tahun kelulusan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Hash kriptografis (bukan nama/NIM langsung)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  Nama institusi: Universitas Tadulako
                </li>
              </ul>
            </div>

            {/* Data yang TIDAK dipublikasikan */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
              <h4 className="font-semibold text-emerald-800 flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4" />
                Data yang TIDAK dipublikasikan ke blockchain:
              </h4>
              <ul className="space-y-2 text-sm text-emerald-700 ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  Nama lengkap (disimpan di server SIJAGA, dapat dihapus)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  NIM (disimpan di server SIJAGA, dapat dihapus)
                </li>
              </ul>
            </div>

            {/* Hak */}
            <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3">
              <h4 className="font-semibold text-purple-800 flex items-center gap-2 text-sm">
                <Scale className="w-4 h-4" />
                Hak saya sebagai subjek data (UU PDP):
              </h4>
              <ul className="space-y-2 text-sm text-purple-700 ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Saya dapat menarik persetujuan ini SEBELUM ijazah diterbitkan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Setelah ijazah diterbitkan, data non-PII di blockchain
                  bersifat permanen
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Saya dapat meminta penghapusan data nama dan NIM dari server
                  SIJAGA
                </li>
              </ul>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                Persetujuan ini berlaku sesuai Undang-Undang No. 27 Tahun 2022
                tentang Perlindungan Data Pribadi (UU PDP).
              </p>
            </div>

            {/* Checkbox + Submit */}
            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-foreground leading-relaxed">
                  Saya menyetujui data program studi dan tahun lulus saya
                  dipublikasikan ke blockchain sebagai bagian dari ijazah
                  digital SIJAGA.
                </span>
              </label>

              <Button
                onClick={handleGiveConsent}
                disabled={!agreed || submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Berikan Persetujuan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdraw consent */}
      {consent?.dataConsent && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
              <AlertTriangle className="w-5 h-5" />
              Tarik Kembali Persetujuan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-4 leading-relaxed">
              Anda dapat menarik kembali persetujuan ini{" "}
              <strong>hanya jika</strong> ijazah digital Anda{" "}
              <strong>belum diterbitkan</strong>. Setelah ijazah diterbitkan ke
              blockchain, persetujuan tidak dapat ditarik.
            </p>
            <Button
              variant="outline"
              onClick={handleWithdrawConsent}
              disabled={submitting}
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Tarik Kembali Persetujuan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
