/**
 * lib/ocr.ts — OCR Utility untuk SIJAGA
 * 
 * Client-side OCR menggunakan tesseract.js.
 * Mengekstrak entitas bernama (Nama, NIM, Prodi, Angkatan) dari scan ijazah/transkrip.
 */

import Tesseract from 'tesseract.js';

export interface OcrField {
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface OcrExtractedData {
  nama: OcrField | null;
  nim: OcrField | null;
  prodi: OcrField | null;
  angkatan: OcrField | null;
  dataHash: OcrField | null;
  rawText: string;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

/**
 * Jalankan OCR pada file gambar (client-side)
 */
export async function runOcr(
  imageSource: File | string,
  onProgress?: (progress: OcrProgress) => void
): Promise<{ text: string; confidence: number }> {
  const result = await Tesseract.recognize(imageSource, 'ind+eng', {
    logger: (m) => {
      if (onProgress && m.status) {
        onProgress({
          status: m.status,
          progress: typeof m.progress === 'number' ? m.progress : 0,
        });
      }
    },
  });

  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}

/**
 * Ekstrak entitas bernama dari teks OCR menggunakan Regex
 */
export function extractEntities(rawText: string): OcrExtractedData {
  const text = rawText.replace(/\r\n/g, '\n');

  return {
    nama: extractNama(text),
    nim: extractNim(text),
    prodi: extractProdi(text),
    angkatan: extractAngkatan(text),
    dataHash: extractDataHash(text),
    rawText: text,
  };
}

// ─── Regex Extractors ──────────────────────────────────────────────

function extractNim(text: string): OcrField | null {
  // Pattern 1: NIM : XXXXXXX
  const patterns = [
    /N\.?I\.?M\.?\s*[:\-]\s*([A-Z0-9]{5,20})/i,
    /Nomor\s+Induk\s+Mahasiswa\s*[:\-]\s*([A-Z0-9]{5,20})/i,
    /NIM\s+([A-Z]\d{2,3}[\s.]?\d{2,4}[\s.]?\d{3,6})/i,
    // Pattern fallback: cari string yang mirip format NIM umum  
    /\b([A-Z]\s?\d{2,3}\s?\d{2,4}\s?\d{3,6})\b/,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      const nim = match[1].replace(/\s+/g, '').toUpperCase();
      return {
        value: nim,
        confidence: i === 0 || i === 1 ? 'high' : i === 2 ? 'medium' : 'low',
      };
    }
  }

  return null;
}

function extractNama(text: string): OcrField | null {
  const patterns = [
    /Nama\s*[.\-:]?\s*\n*\s*([A-Za-z\s.,']+?)(?:\n|$)/i,
    /(?:kepada|diberikan\s+kepada)\s*[.\-:]?\s*\n*\s*([A-Za-z\s.,']+?)(?:\n|$)/i,
    /(?:Nama\s+Lengkap|Nama\s+Mahasiswa)\s*[.\-:]?\s*\n*\s*([A-Za-z\s.,']+?)(?:\n|$)/i,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      const nama = match[1].trim().replace(/\s{2,}/g, ' ');
      // Sanity check: nama harus punya minimal 2 kata dan karakter masuk akal
      if (nama.length >= 3 && nama.length <= 100) {
        return {
          value: nama,
          confidence: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
        };
      }
    }
  }

  return null;
}

function extractProdi(text: string): OcrField | null {
  const patterns = [
    /(?:akademik\s+pada\s+Program\s+Studi)[.\-:]?\s*\n*\s*([A-Za-z\s]+?)(?:\n|$)/i,
    /Program\s+Studi[.\-:]?\s*\n*\s*([A-Za-z\s]+?)(?:\n|$)/i,
    /Prodi[.\-:]?\s*\n*\s*([A-Za-z\s]+?)(?:\n|$)/i,
    /Jurusan[.\-:]?\s*\n*\s*([A-Za-z\s]+?)(?:\n|$)/i,
    /Fakultas\s+[A-Za-z\s]+?,?\s+Program\s+Studi[.\-:]?\s*\n*\s*([A-Za-z\s]+?)(?:\n|$)/i,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      const prodi = match[1].trim().replace(/\s{2,}/g, ' ');
      if (prodi.length >= 3 && prodi.length <= 80) {
        return {
          value: prodi,
          confidence: i <= 1 ? 'high' : 'medium',
        };
      }
    }
  }

  return null;
}

function extractAngkatan(text: string): OcrField | null {
  const patterns = [
    /(?:Tahun\s+(?:Lulus|Kelulusan|Masuk|Angkatan))\s*[:\-]\s*(\d{4})/i,
    /(?:Angkatan)\s*[:\-]?\s*(\d{4})/i,
    /(?:Tanggal\s+(?:Lulus|Kelulusan))\s*[:\-]\s*\d{1,2}\s+\w+\s+(\d{4})/i,
    // Fallback: cari tahun 20xx di sekitar kata kunci
    /(?:lulus|kelulusan|wisuda).*?(20[12]\d)/i,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      const year = match[1].trim();
      const yearNum = parseInt(year, 10);
      if (yearNum >= 2000 && yearNum <= 2099) {
        return {
          value: year,
          confidence: i <= 1 ? 'high' : i === 2 ? 'medium' : 'low',
        };
      }
    }
  }

  return null;
}

function extractDataHash(text: string): OcrField | null {
  // Pattern 1: Data Hash (SHA-256) XXXXXXXXXXXXXXXX... (tolerate 16 to 64 chars, and some non-hex letters due to OCR errors)
  const patterns = [
    /(?:Hash|SHA-256|Data Hash)[\s\S]*?([A-Za-z0-9]{16,64})(?:\.\.\.|\b)/i,
    // Fallback: Just look for exactly 16-64 chars followed by '...'
    /([A-Za-z0-9]{16,64})\.\.\./,
    // Fallback: 16-64 contiguous hex characters
    /\b([A-Fa-f0-9]{16,64})\b/,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      // Sanitize common OCR mistakes for hex strings
      let hash = match[1]
        .toLowerCase()
        .replace(/o/g, '0')
        .replace(/l/g, '1')
        .replace(/i/g, '1');
      
      // Ensure it only contains valid hex after sanitization
      if (/^[a-f0-9]+$/.test(hash)) {
        return {
          value: hash,
          confidence: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
        };
      }
    }
  }

  return null;
}

/**
 * Map status string OCR ke label bahasa Indonesia
 */
export function getOcrStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'loading tesseract core': 'Memuat mesin OCR...',
    'initializing tesseract': 'Inisialisasi Tesseract...',
    'loading language traineddata': 'Memuat data bahasa...',
    'initializing api': 'Mempersiapkan API...',
    'recognizing text': 'Membaca teks dari gambar...',
  };
  return labels[status] || status;
}
