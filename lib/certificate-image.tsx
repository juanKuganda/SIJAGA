import { ImageResponse } from "next/og";
import { logoBase64 } from "./logo-base64";

/**
 * Generate PNG sertifikat ijazah menggunakan Satori (next/og)
 * Gambar ini akan di-upload ke IPFS dan ditampilkan di Solana Explorer
 */
export async function generateCertificateImageBuffer(data: {
  nama: string;
  nim: string;
  prodi: string;
  tahunLulus: string;
  status?: string;
}): Promise<ArrayBuffer> {
  const isRevoked = data.status === "REVOKED";

  // Satori JSX definition
  const response = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#F8F9FA", // Light grey background
          padding: "32px",
          position: "relative",
        }}
      >
        {/* Latar Belakang Ornamen / Garis (Satori tidak mendukung background repeating-linear-gradient, jadi kita pakai warna solid dan border) */}
        
        {/* Border Luar Tebal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            border: isRevoked ? "8px solid #FECACA" : "8px solid #D1D5DB", // border-red-200 or border-gray-300
            borderRadius: "6px",
            position: "relative",
            padding: "32px",
            boxShadow: "inset 0px 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          {/* Inner Border */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              right: "16px",
              bottom: "16px",
              border: isRevoked ? "2px solid #FECACA" : "2px solid #E5E7EB",
              borderRadius: "4px",
            }}
          />

          {/* Logo Untad */}
          <div
            style={{
              display: "flex",
              width: "112px",
              height: "112px",
              marginBottom: "32px",
              zIndex: 10,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoBase64}
              alt="Logo Universitas Tadulako"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 10,
              width: "100%",
              maxWidth: "672px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h3
                style={{
                  color: "#111827", // text-gray-900
                  fontSize: "30px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  margin: 0,
                }}
              >
                Universitas Tadulako
              </h3>
              <p
                style={{
                  color: "#6B7280", // text-gray-500
                  fontSize: "16px",
                  fontWeight: 500,
                  marginTop: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  margin: "8px 0 0 0",
                }}
              >
                Sertifikat Ijazah Kelulusan
              </p>
            </div>

            {/* Recipient Block */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: "24px",
                paddingBottom: "24px",
                marginTop: "24px",
                marginBottom: "24px",
                borderTop: "1px dashed #E5E7EB",
                borderBottom: "1px dashed #E5E7EB",
                width: "100%",
              }}
            >
              <p style={{ color: "#6B7280", fontSize: "14px", fontStyle: "italic", margin: "0 0 16px 0" }}>
                Diberikan Kepada
              </p>
              <h2
                style={{
                  fontSize: "48px",
                  color: "#111827",
                  fontWeight: "bold",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {data.nama}
              </h2>
              <p
                style={{
                  color: "#4B5563", // text-gray-600
                  fontFamily: "monospace",
                  fontSize: "16px",
                  fontWeight: 500,
                  marginTop: "12px",
                  margin: "12px 0 0 0",
                }}
              >
                NIM: {data.nim}
              </p>
            </div>

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <p style={{ color: "#6B7280", fontSize: "14px", textAlign: "center", margin: "0 0 8px 0" }}>
                Telah menyelesaikan semua persyaratan akademik<br />pada Program Studi:
              </p>
              <p
                style={{
                  color: "#111827",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  fontSize: "20px",
                  margin: 0,
                }}
              >
                {data.prodi || "INFORMATIKA"}
              </p>
              <p style={{ color: "#6B7280", fontSize: "14px", fontWeight: 500, marginTop: "12px", margin: "12px 0 0 0" }}>
                Tahun Kelulusan: {data.tahunLulus || "2024"}
              </p>
            </div>
          </div>

          {/* Watermark REVOKED / DIBATALKAN */}
          {isRevoked && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
              }}
            >
              <div
                style={{
                  color: "rgba(239, 68, 68, 0.25)", // red-500 with low opacity
                  fontSize: "140px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  transform: "rotate(-30deg)",
                  border: "12px solid rgba(239, 68, 68, 0.25)",
                  padding: "24px 64px",
                  borderRadius: "24px",
                  display: "flex",
                }}
              >
                DIBATALKAN
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1131,
      height: 800, // aspect ratio 1.414 (1131 / 800)
    }
  );

  return await response.arrayBuffer();
}
