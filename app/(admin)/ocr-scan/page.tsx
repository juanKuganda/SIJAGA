"use client";

import { useState, useRef, useCallback } from "react";
import {
  ScanLine,
  Upload,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Sparkles,
  Eye,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  runOcr,
  extractEntities,
  getOcrStatusLabel,
  type OcrExtractedData,
  type OcrProgress,
} from "@/lib/ocr";

interface MatchedMahasiswa {
  id: string;
  nama: string;
  nim: string;
  prodi: string;
  angkatan: string;
  wallet: { status: string } | null;
  certificate: { status: string } | null;
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const config = {
    high: {
      label: "Akurasi Tinggi",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
    },
    medium: {
      label: "Akurasi Sedang",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: AlertTriangle,
    },
    low: {
      label: "Akurasi Rendah",
      className: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    },
  };

  const { label, className, icon: Icon } = config[level];

  return (
    <Badge variant="secondary" className={`${className} text-[10px] gap-1`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </Badge>
  );
}

export default function OcrScanPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<OcrExtractedData | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  // Editable form fields
  const [formNama, setFormNama] = useState("");
  const [formNim, setFormNim] = useState("");
  const [formProdi, setFormProdi] = useState("");
  const [formAngkatan, setFormAngkatan] = useState("");

  // Search results
  const [isSearching, setIsSearching] = useState(false);
  const [matchedResults, setMatchedResults] = useState<MatchedMahasiswa[] | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── File Handling ──────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format file tidak didukung", {
        description: "Gunakan format JPG, PNG, WebP, atau BMP.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File terlalu besar", {
        description: "Ukuran file maksimal 10MB.",
      });
      return;
    }

    setImageFile(file);
    setExtractedData(null);
    setMatchedResults(null);

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ─── OCR Processing ────────────────────────────────────────────
  const runOcrProcess = async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setOcrProgress({ status: "Memulai...", progress: 0 });
    setExtractedData(null);
    setMatchedResults(null);

    try {
      const { text, confidence } = await runOcr(imageFile, (progress) => {
        setOcrProgress(progress);
      });

      if (!text || text.trim().length < 10) {
        toast.error("Tidak dapat membaca teks dari gambar", {
          description: "Pastikan gambar scan jelas dan tidak blur.",
        });
        setIsProcessing(false);
        setOcrProgress(null);
        return;
      }

      const entities = extractEntities(text);
      setExtractedData(entities);

      // Pre-fill form fields
      setFormNama(entities.nama?.value || "");
      setFormNim(entities.nim?.value || "");
      setFormProdi(entities.prodi?.value || "");
      setFormAngkatan(entities.angkatan?.value || "");

      toast.success("OCR selesai!", {
        description: `Confidence: ${confidence.toFixed(0)}% — ${
          [entities.nama, entities.nim, entities.prodi, entities.angkatan].filter(Boolean).length
        }/4 field terdeteksi.`,
      });
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Gagal memproses OCR", {
        description: "Silakan coba lagi dengan gambar yang berbeda.",
      });
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  };

  // ─── Database Search ────────────────────────────────────────────
  const searchMahasiswa = async () => {
    if (!formNim && !formNama) {
      toast.error("Isi minimal NIM atau Nama untuk mencari.");
      return;
    }

    setIsSearching(true);
    setMatchedResults(null);

    try {
      const params = new URLSearchParams();
      if (formNim) params.set("nim", formNim);
      if (formNama) params.set("nama", formNama);

      const res = await fetch(`/api/admin/mahasiswa?${params.toString()}`);
      const data = await res.json();

      if (data.mahasiswa && data.mahasiswa.length > 0) {
        // Filter by form fields using fuzzy matching (includes)
        let results = data.mahasiswa;

        if (formNim || formNama) {
          const sNim = formNim?.toLowerCase().trim() || "";
          const sNama = formNama?.toLowerCase().trim() || "";
          
          results = results.filter((m: MatchedMahasiswa) => {
            const mNim = m.nim.toLowerCase();
            const mNama = m.nama.toLowerCase();
            
            // Match NIM if it contains or is contained by search string
            const matchNim = sNim ? (mNim.includes(sNim) || sNim.includes(mNim)) : false;
            
            // Match Nama
            let matchNama = false;
            if (sNama) {
              if (mNama.includes(sNama) || sNama.includes(mNama)) {
                matchNama = true;
              } else {
                // Check if any word from search name is in DB name
                const sNamaWords = sNama.split(/\s+/).filter(w => w.length > 2);
                if (sNamaWords.length > 0 && sNamaWords.some(w => mNama.includes(w))) {
                  matchNama = true;
                }
              }
            }
            
            return matchNim || matchNama;
          });
        }

        setMatchedResults(results.slice(0, 5));
        toast.success(`${results.length} mahasiswa ditemukan.`);
      } else {
        setMatchedResults([]);
        toast.info("Tidak ditemukan mahasiswa yang cocok.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Gagal mencari data mahasiswa.");
    } finally {
      setIsSearching(false);
    }
  };

  // ─── Reset ──────────────────────────────────────────────────────
  const resetAll = () => {
    setImageFile(null);
    setImagePreview(null);
    setExtractedData(null);
    setFormNama("");
    setFormNim("");
    setFormProdi("");
    setFormAngkatan("");
    setMatchedResults(null);
    setShowRawText(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              OCR Scan
            </h1>
            <p className="text-muted-foreground text-sm">
              Pindai dokumen ijazah untuk otomasi input data
            </p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-700">
            <Sparkles className="w-3.5 h-3.5 inline mr-1" />
            <strong>AI OCR Engine:</strong> Upload scan ijazah/transkrip → teks
            akan diekstrak otomatis → data mengisi form → cari di database.
            Semua diproses di browser Anda (client-side).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ LEFT: Upload & Preview ═══ */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-red-500" />
                Upload Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!imagePreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                    isDragOver
                      ? "border-red-400 bg-red-50"
                      : "border-zinc-300 hover:border-red-300 hover:bg-red-50/50"
                  }`}
                >
                  <FileImage
                    className={`w-12 h-12 mx-auto mb-4 ${
                      isDragOver ? "text-red-500" : "text-zinc-300"
                    }`}
                  />
                  <p className="font-semibold text-foreground text-sm">
                    {isDragOver
                      ? "Lepaskan file di sini"
                      : "Drag & drop atau klik untuk upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WebP, BMP • Maks 10MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/bmp"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-zinc-200">
                    <img
                      src={imagePreview}
                      alt="Scan dokumen"
                      className="w-full object-contain max-h-[400px] bg-zinc-50"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={resetAll}
                        className="bg-white/90 backdrop-blur-sm shadow-sm h-8 text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-zinc-50 p-3 rounded-xl">
                    <FileImage className="w-4 h-4" />
                    <span className="font-medium truncate">
                      {imageFile?.name}
                    </span>
                    <span className="text-zinc-400 ml-auto">
                      {imageFile
                        ? (imageFile.size / 1024).toFixed(0) + " KB"
                        : ""}
                    </span>
                  </div>

                  {/* OCR Progress */}
                  {isProcessing && ocrProgress && (
                    <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                        <span className="text-sm font-semibold text-foreground">
                          {getOcrStatusLabel(ocrProgress.status)}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.round(ocrProgress.progress * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                        {Math.round(ocrProgress.progress * 100)}%
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={runOcrProcess}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memproses OCR...
                      </>
                    ) : (
                      <>
                        <ScanLine className="w-4 h-4 mr-2" />
                        Mulai OCR Scan
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw Text */}
          {extractedData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4 text-zinc-500" />
                    Teks Mentah OCR
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-xs"
                  >
                    {showRawText ? "Sembunyikan" : "Tampilkan"}
                  </Button>
                </div>
              </CardHeader>
              {showRawText && (
                <CardContent>
                  <pre className="text-xs text-muted-foreground bg-zinc-50 p-4 rounded-xl border border-zinc-200 whitespace-pre-wrap max-h-[300px] overflow-y-auto font-mono">
                    {extractedData.rawText}
                  </pre>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* ═══ RIGHT: Extracted Data Form ═══ */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                Data Terekstrak
                {extractedData && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 ml-auto"
                  >
                    {
                      [
                        extractedData.nama,
                        extractedData.nim,
                        extractedData.prodi,
                        extractedData.angkatan,
                      ].filter(Boolean).length
                    }
                    /4 field
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!extractedData && !isProcessing ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ScanLine className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                  <p className="font-semibold text-sm">Belum ada data</p>
                  <p className="text-xs mt-1">
                    Upload dan scan dokumen untuk mengisi form otomatis
                  </p>
                </div>
              ) : (
                <>
                  {/* NIM */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        NIM
                      </Label>
                      {extractedData?.nim && (
                        <ConfidenceBadge level={extractedData.nim.confidence} />
                      )}
                    </div>
                    <Input
                      value={formNim}
                      onChange={(e) => setFormNim(e.target.value)}
                      placeholder="Contoh: C10121001"
                      className="font-mono"
                    />
                  </div>

                  {/* Nama */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        Nama Lengkap
                      </Label>
                      {extractedData?.nama && (
                        <ConfidenceBadge level={extractedData.nama.confidence} />
                      )}
                    </div>
                    <Input
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                    />
                  </div>

                  {/* Prodi */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        Program Studi
                      </Label>
                      {extractedData?.prodi && (
                        <ConfidenceBadge
                          level={extractedData.prodi.confidence}
                        />
                      )}
                    </div>
                    <Input
                      value={formProdi}
                      onChange={(e) => setFormProdi(e.target.value)}
                      placeholder="Contoh: Informatika"
                    />
                  </div>

                  {/* Angkatan */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        Tahun Lulus / Angkatan
                      </Label>
                      {extractedData?.angkatan && (
                        <ConfidenceBadge
                          level={extractedData.angkatan.confidence}
                        />
                      )}
                    </div>
                    <Input
                      value={formAngkatan}
                      onChange={(e) => setFormAngkatan(e.target.value)}
                      placeholder="Contoh: 2026"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                      <strong>Human-in-the-Loop:</strong> Periksa dan koreksi
                      data di atas sebelum mencari. OCR bisa melakukan kesalahan
                      baca, terutama pada scan yang kurang jelas.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={searchMahasiswa}
                      disabled={isSearching}
                      className="flex-1"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Mencari...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Cari Mahasiswa
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetAll}>
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ═══ Search Results ═══ */}
          {matchedResults !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-zinc-500" />
                  Hasil Pencarian
                  <Badge variant="secondary" className="ml-auto">
                    {matchedResults.length} hasil
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matchedResults.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <XCircle className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="font-semibold text-sm">
                      Tidak ditemukan mahasiswa yang cocok
                    </p>
                    <p className="text-xs mt-1">
                      Coba perbaiki data OCR atau masukkan NIM secara manual
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matchedResults.map((m) => (
                      <div
                        key={m.id}
                        className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 hover:border-red-200 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-foreground text-sm">
                              {m.nama}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              NIM: {m.nim}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {m.prodi || "—"} • Angkatan{" "}
                              {m.angkatan || "—"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge
                              variant="secondary"
                              className={
                                m.wallet?.status === "VERIFIED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-zinc-100 text-zinc-600"
                              }
                            >
                              Wallet:{" "}
                              {m.wallet?.status || "Belum ada"}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={
                                m.certificate?.status === "MINTED" ||
                                m.certificate?.status === "CLAIMED"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : m.certificate?.status === "REVOKED"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-zinc-100 text-zinc-600"
                              }
                            >
                              Ijazah:{" "}
                              {m.certificate?.status || "NOT_ISSUED"}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() =>
                              window.open(
                                `/detail-ijazah/${m.nim}`,
                                "_blank"
                              )
                            }
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Detail
                          </Button>
                          {m.wallet?.status === "VERIFIED" &&
                            (!m.certificate ||
                              m.certificate.status === "NOT_ISSUED") && (
                              <Button
                                size="sm"
                                className="text-xs h-8"
                                onClick={() =>
                                  window.open("/terbitkan", "_blank")
                                }
                              >
                                Terbitkan Ijazah
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
