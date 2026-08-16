import crypto from 'crypto';

/**
 * Generate SHA256 data hash dari gabungan nama + NIM + prodi + salt.
 * Hash ini disimpan di metadata IPFS dan di database Certificate.
 * Salt disimpan HANYA di database (tidak di IPFS).
 *
 * Tujuan: membuktikan keaslian data tanpa mengekspos PII di blockchain.
 */
export function generateDataHash(
  nama: string,
  nim: string,
  prodi: string
): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const raw = `${nama}|${nim}|${prodi}|${salt}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return {
    hash: `sha256:${hash}`,
    salt,
  };
}

/**
 * Verifikasi data hash — bandingkan ulang komputasi hash
 * dengan hash yang tersimpan (di IPFS / database).
 */
export function verifyDataHash(
  nama: string,
  nim: string,
  prodi: string,
  salt: string,
  storedHash: string
): boolean {
  const raw = `${nama}|${nim}|${prodi}|${salt}`;
  const computed = `sha256:${crypto.createHash('sha256').update(raw).digest('hex')}`;
  return computed === storedHash;
}
