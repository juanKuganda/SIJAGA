import { ImageResponse } from "next/og";
import { logoBase64 } from "./logo-base64";
import { CertificateUI } from "@/components/certificate-ui";


export async function generateCertificateImageBuffer(data: {
  prodi: string;
  tahunLulus: string;
  dataHash?: string;
  status?: string;
}): Promise<ArrayBuffer> {
  const isRevoked = data.status === "REVOKED";

  // Satori JSX definition
  const response = new ImageResponse(
      <CertificateUI
        prodi={data.prodi}
        tahunLulus={data.tahunLulus}
        dataHash={data.dataHash}
        isRevoked={isRevoked}
        logoBase64={logoBase64}
      />,
    {
      width: 848,
      height: 600,
    }
  );

  return await response.arrayBuffer();
}
