/**
 * lib/ocr.ts — OCR Utility untuk SIJAGA
 * 
 * Client-side OCR menggunakan tesseract.js v7.
 * CATATAN BAB I: Tesseract v7 secara bawaan (default) menggunakan mesin LSTM (Long Short-Term Memory) 
 * untuk bahasa Indonesia (ind) dan Inggris (eng), sehingga lebih akurat.
 * Mengekstrak entitas bernama (Nama, NIM, Prodi, Tahun Lulus) dari scan ijazah/transkrip.
 */

import Tesseract from 'tesseract.js';

export interface OcrField {
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface OcrExtractedData {
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
    dataHash: extractDataHash(text),
    rawText: text,
  };
}

// ─── Regex Extractors ──────────────────────────────────────────────

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
      const hash = match[1]
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
