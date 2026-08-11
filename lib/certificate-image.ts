/**
 * Generate SVG sertifikat ijazah sebagai gambar NFT
 * SVG ini akan di-upload ke IPFS dan ditampilkan di Solana Explorer
 */

export function generateCertificateSVG(data: {
  nama: string;
  nim: string;
  prodi: string;
  tahunLulus: string;
  status?: string;
}): string {
  const isRevoked = data.status === "REVOKED";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FAFAFA"/>
      <stop offset="100%" stop-color="#F0F0F0"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${isRevoked ? '#991B1B' : '#DC2626'}"/>
      <stop offset="100%" stop-color="${isRevoked ? '#DC2626' : '#EF4444'}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#B8860B"/>
      <stop offset="100%" stop-color="#DAA520"/>
    </linearGradient>
    <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="#E5E7EB" stroke-width="0.5" opacity="0.5"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="800" height="1000" fill="url(#bg)"/>
  <rect width="800" height="1000" fill="url(#pattern)"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="760" height="960" rx="8" fill="none" stroke="#D4D4D8" stroke-width="2"/>
  <rect x="30" y="30" width="740" height="940" rx="4" fill="none" stroke="#E4E4E7" stroke-width="1"/>

  <!-- Top Accent Bar -->
  <rect x="20" y="20" width="760" height="8" rx="4" fill="url(#accent)"/>

  <!-- Header: Kementerian -->
  <text x="400" y="100" text-anchor="middle" font-family="serif" font-size="13" fill="#71717A" letter-spacing="3">
    KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
  </text>

  <!-- University Name -->
  <text x="400" y="145" text-anchor="middle" font-family="serif" font-size="32" font-weight="bold" fill="#18181B" letter-spacing="6">
    UNIVERSITAS TADULAKO
  </text>

  <!-- Divider -->
  <line x1="300" y1="165" x2="500" y2="165" stroke="url(#accent)" stroke-width="2"/>

  <!-- Certificate Type -->
  <text x="400" y="200" text-anchor="middle" font-family="serif" font-size="18" fill="#52525B" letter-spacing="4">
    IJAZAH SARJANA (S1)
  </text>
  <text x="400" y="225" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#A1A1AA" letter-spacing="2">
    Sertifikat Digital Blockchain — NFT Soulbound
  </text>

  <!-- Divider Ornamental -->
  <line x1="200" y1="255" x2="600" y2="255" stroke="#E4E4E7" stroke-width="1" stroke-dasharray="4,4"/>

  <!-- Given To -->
  <text x="400" y="295" text-anchor="middle" font-family="serif" font-size="13" fill="#71717A" font-style="italic">
    Diberikan kepada:
  </text>

  <!-- Name -->
  <text x="400" y="350" text-anchor="middle" font-family="serif" font-size="42" font-weight="bold" fill="#09090B">
    ${escapeXml(data.nama)}
  </text>

  <!-- Name underline -->
  <line x1="200" y1="370" x2="600" y2="370" stroke="#D4D4D8" stroke-width="1"/>

  <!-- NIM -->
  <text x="400" y="405" text-anchor="middle" font-family="monospace" font-size="16" fill="#52525B">
    NIM: ${escapeXml(data.nim)}
  </text>

  <!-- Description -->
  <text x="400" y="465" text-anchor="middle" font-family="serif" font-size="14" fill="#71717A">
    Telah menyelesaikan semua persyaratan akademik
  </text>
  <text x="400" y="485" text-anchor="middle" font-family="serif" font-size="14" fill="#71717A">
    pada Program Studi:
  </text>

  <!-- Prodi -->
  <text x="400" y="530" text-anchor="middle" font-family="serif" font-size="24" font-weight="bold" fill="#18181B" letter-spacing="4">
    ${escapeXml(data.prodi.toUpperCase())}
  </text>

  <!-- Year -->
  <text x="400" y="565" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#71717A">
    Tahun Kelulusan: ${escapeXml(data.tahunLulus)}
  </text>

  <!-- Divider -->
  <line x1="200" y1="600" x2="600" y2="600" stroke="#E4E4E7" stroke-width="1" stroke-dasharray="4,4"/>

  <!-- SIJAGA Badge -->
  <rect x="310" y="630" width="180" height="40" rx="20" fill="url(#accent)"/>
  <text x="400" y="656" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="white" letter-spacing="3">
    SIJAGA
  </text>
  <text x="400" y="700" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#A1A1AA" letter-spacing="1">
    Sistem Jaminan Autentikasi Gelar Akademik
  </text>

  <!-- Technology Tags -->
  <rect x="230" y="730" width="100" height="28" rx="14" fill="none" stroke="#D4D4D8" stroke-width="1"/>
  <text x="280" y="749" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#52525B">
    SHA-256
  </text>
  <rect x="345" y="730" width="110" height="28" rx="14" fill="none" stroke="#D4D4D8" stroke-width="1"/>
  <text x="400" y="749" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#52525B">
    Soulbound
  </text>
  <rect x="470" y="730" width="100" height="28" rx="14" fill="none" stroke="#D4D4D8" stroke-width="1"/>
  <text x="520" y="749" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#52525B">
    Solana
  </text>

  <!-- Bottom Info -->
  <text x="400" y="810" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#A1A1AA">
    Diverifikasi melalui blockchain Solana • NFT Soulbound (Non-transferable)
  </text>

  <!-- Footer -->
  <rect x="20" y="960" width="760" height="20" rx="0" fill="url(#accent)" opacity="0.1"/>
  <text x="400" y="975" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#A1A1AA">
    © ${new Date().getFullYear()} Universitas Tadulako — Powered by SIJAGA
  </text>

  ${isRevoked ? `
  <!-- REVOKED Watermark -->
  <g transform="translate(400,500) rotate(-30)">
    <rect x="-250" y="-40" width="500" height="80" rx="8" fill="#DC2626" opacity="0.85"/>
    <text x="0" y="12" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="bold" fill="white" letter-spacing="10">
      DIREVOKE
    </text>
  </g>
  ` : ''}
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
