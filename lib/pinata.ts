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
 */
export function generateCertificateMetadata(data: {
  nama: string;
  nim: string;
  prodi: string;
  tahunLulus: string;
  imageUri?: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    name: `Ijazah S1 - ${data.nama}`,
    symbol: "SIJAGA",
    description: `Ijazah Sarjana ${data.prodi}, Universitas Tadulako. Diverifikasi melalui blockchain Solana sebagai NFT Soulbound.`,
    image: data.imageUri || "",
    external_url: `${appUrl}/ijazah/${data.nim}`,
    attributes: [
      { trait_type: "NIM", value: data.nim },
      { trait_type: "Program Studi", value: data.prodi },
      { trait_type: "Tahun Lulus", value: data.tahunLulus },
      { trait_type: "Tipe", value: "Soulbound" },
      { trait_type: "Penerbit", value: "Universitas Tadulako" },
    ],
  };
}

/**
 * Generate metadata JSON untuk NFT ijazah yang dibatalkan
 */
export function generateRevokedMetadata(data: {
  nama: string;
  nim: string;
  prodi: string;
  tahunLulus: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    name: `[DIBATALKAN] Ijazah S1 - ${data.nama}`,
    symbol: "REVOKED",
    description: `Ijazah Sarjana ${data.prodi}, Universitas Tadulako ini telah DIBATALKAN / DICABUT.`,
    image: "",
    external_url: `${appUrl}/ijazah/${data.nim}`,
    attributes: [
      { trait_type: "NIM", value: data.nim },
      { trait_type: "Program Studi", value: data.prodi },
      { trait_type: "Tahun Lulus", value: data.tahunLulus },
      { trait_type: "Status", value: "Dibatalkan" },
      { trait_type: "Penerbit", value: "Universitas Tadulako" },
    ],
  };
}
