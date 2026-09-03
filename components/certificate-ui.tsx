import React from "react";

export interface CertificateUIProps {
  prodi: string;
  tahunLulus: string;
  dataHash?: string;
  isRevoked: boolean;
  logoBase64: string;
}

/**
 * Unified Component untuk Sertifikat Ijazah.
 * Komponen ini hanya menggunakan objek `style` standar (tanpa Tailwind classes)
 * agar pixel-perfect saat dirender oleh Satori (menjadi PNG IPFS) maupun DOM (di web).
 */
export function CertificateUI({
  prodi,
  tahunLulus,
  dataHash,
  isRevoked,
  logoBase64,
}: CertificateUIProps) {
  const hashDisplay = dataHash
    ? dataHash.replace(/^sha256:/, "").substring(0, 16) + "..."
    : "—";

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: "#F8F9FA",
        padding: "32px",
        position: "relative",
      }}
    >
      {/* Border Luar Tebal */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: isRevoked ? "8px solid #FECACA" : "8px solid #D1D5DB",
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
            width: "84px",
            height: "84px",
            marginBottom: "24px",
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
                color: "#111827",
                fontSize: "24px",
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
                color: "#6B7280",
                fontSize: "12px",
                fontWeight: 500,
                marginTop: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "6px 0 0 0",
              }}
            >
              Kepemilikan Digital Untuk Data Hash Berikut
            </p>
          </div>

          {/* Credential Block (tanpa PII) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "16px",
              paddingBottom: "16px",
              marginTop: "16px",
              marginBottom: "16px",
              borderTop: "1px dashed #E5E7EB",
              borderBottom: "1px dashed #E5E7EB",
              width: "100%",
            }}
          >
            <p style={{ color: "#6B7280", fontSize: "12px", fontStyle: "italic", margin: "0 0 12px 0" }}>
              Ijazah Sarjana (S1) diterbitkan untuk lulusan
            </p>
            <h2
              style={{
                fontSize: "30px",
                color: "#111827",
                fontWeight: "bold",
                margin: 0,
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              {prodi || "INFORMATIKA"}
            </h2>
            <p
              style={{
                color: "#4B5563",
                fontSize: "14px",
                fontWeight: 500,
                margin: "12px 0 0 0",
              }}
            >
              Tahun Kelulusan: {tahunLulus || "2024"}
            </p>
          </div>

          {/* Data Hash — bukti kriptografis tanpa PII */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ color: "#9CA3AF", fontSize: "10px", textAlign: "center", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Data Hash (SHA-256)
            </p>
            <p
              style={{
                color: "#6B7280",
                fontFamily: "monospace",
                fontSize: "12px",
                fontWeight: 500,
                margin: 0,
                letterSpacing: "0.05em",
              }}
            >
              {hashDisplay}
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "9px", textAlign: "center", margin: "10px 0 0 0" }}>
              Verifikasi keaslian di sijaga.untad.ac.id — Blockchain Solana
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
                color: "rgba(239, 68, 68, 0.25)",
                fontSize: "100px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                transform: "rotate(-30deg)",
                border: "8px solid rgba(239, 68, 68, 0.25)",
                padding: "16px 48px",
                borderRadius: "16px",
                display: "flex",
              }}
            >
              DIBATALKAN
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
