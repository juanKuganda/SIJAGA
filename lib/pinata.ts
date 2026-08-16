const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";

/**
 * Upload JSON metadata ke Pinata IPFS
 */
export async function uploadMetadataToPinata(metadata: Record<string, unknown>) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error("PINATA_JWT tidak ditemukan di environment variables");
  }

  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error(`Gagal upload ke Pinata: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    ipfsHash: data.IpfsHash,
    uri: `ipfs://${data.IpfsHash}`,
    gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
  };
}

/**
 * Upload file gambar ke Pinata IPFS
 */
export async function uploadImageToPinata(file: File) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error("PINATA_JWT tidak ditemukan di environment variables");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Gagal upload gambar ke Pinata: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    ipfsHash: data.IpfsHash,
    uri: `ipfs://${data.IpfsHash}`,
    gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
  };
}

/**
 * Generate metadata JSON untuk NFT ijazah
 * PRIVACY: Tidak menyertakan nama atau NIM di metadata IPFS.
 * PII hanya disimpan di database lokal SIJAGA.
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
  };
}

