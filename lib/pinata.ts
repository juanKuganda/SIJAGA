const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";

async function pinataRequest(endpoint: string, options: RequestInit) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error("PINATA_JWT tidak ditemukan di environment variables");
  }

  const response = await fetch(`${PINATA_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal upload ke Pinata (${endpoint}): ${response.statusText}`);
  }

  const data = await response.json();
  return {
    ipfsHash: data.IpfsHash,
    uri: `ipfs://${data.IpfsHash}`,
    gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
  };
}

/**
 * Upload JSON metadata ke Pinata IPFS
 */
export async function uploadMetadataToPinata(metadata: Record<string, unknown>) {
  return pinataRequest("/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });
}

/**
 * Upload file gambar ke Pinata IPFS
 */
export async function uploadImageToPinata(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return pinataRequest("/pinning/pinFileToIPFS", {
    method: "POST",
    body: formData,
  });
}

/**
 * Generate metadata JSON untuk NFT ijazah
 */
export function generateCertificateMetadata(data: {
  prodi: string;
  tahunLulus: string;
  dataHash: string;
  imageUri?: string;
}) {
  return {
    name: "Ijazah S1 - Universitas Tadulako",
    symbol: "SIJAGA",
    description: "Ijazah akademik resmi yang diterbitkan oleh Universitas Tadulako. Diverifikasi melalui blockchain Solana sebagai NFT Soulbound.",
    image: data.imageUri || "",
    attributes: [
      { trait_type: "Institusi", value: "Universitas Tadulako" },
      { trait_type: "Program Studi", value: data.prodi },
      { trait_type: "Tahun Lulus", value: data.tahunLulus },
      { trait_type: "Jenjang", value: "Sarjana (S1)" },
      { trait_type: "Tipe", value: "Soulbound" },
      { trait_type: "Data Hash", value: data.dataHash },
    ],
    properties: {
      files: [
        {
          uri: data.imageUri || "",
          type: "image/png",
        },
      ],
      category: "image",
    },
  };
}


/**
 * Generate metadata JSON untuk NFT ijazah yang dibatalkan
 * PRIVACY: Tidak menyertakan nama atau NIM di metadata IPFS.
 */
export function generateRevokedMetadata(data: {
  prodi: string;
  tahunLulus: string;
}) {
  return {
    name: "[DIBATALKAN] Ijazah S1 - Universitas Tadulako",
    symbol: "REVOKED",
    description: `Ijazah Sarjana ${data.prodi}, Universitas Tadulako ini telah DIBATALKAN / DICABUT.`,
    image: "",
    attributes: [
      { trait_type: "Institusi", value: "Universitas Tadulako" },
      { trait_type: "Program Studi", value: data.prodi },
      { trait_type: "Tahun Lulus", value: data.tahunLulus },
      { trait_type: "Status", value: "Dibatalkan" },
    ],
    properties: {
      files: [
        {
          uri: "", // Akan diisi saat eksekusi
          type: "image/png",
        },
      ],
      category: "image",
    },
  };
}

import { generateCertificateImageBuffer } from "./certificate-image";

/**
 * Helper terpusat untuk men-generate gambar sertifikat PNG lalu mengunggahnya ke Pinata.
 * Ini mengurangi duplikasi kode (Blob/File conversion) di berbagai API Routes.
 */
export async function generateAndUploadCertificateImage(data: {
  prodi: string;
  tahunLulus: string;
  dataHash?: string;
}, status: "MINTED" | "REVOKED" = "MINTED") {
  const imageBuffer = await generateCertificateImageBuffer({
    prodi: data.prodi,
    tahunLulus: data.tahunLulus,
    dataHash: data.dataHash,
    status,
  });

  const imageBlob = new Blob([imageBuffer], { type: "image/png" });
  // PRIVACY: Gunakan timestamp sebagai nama file, bukan NIM
  const timestamp = Date.now();
  const filename = status === "REVOKED" ? `ijazah-revoked-${timestamp}.png` : `ijazah-${timestamp}.png`;
  const imageFile = new File([imageBlob], filename, { type: "image/png" });

  return uploadImageToPinata(imageFile);
}


