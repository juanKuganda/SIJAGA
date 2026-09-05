/**
 * lib/gemini.ts — Gemini API Utility untuk SIJAGA AI Verification Assistant
 * 
 * Arsitektur Prompt Grounding (Database-Augmented LLM):
 * 1. Terima pertanyaan verifikator
 * 2. Query data terstruktur dari PostgreSQL (dilakukan di API route)
 * 3. Suntikkan (ground) data ke system prompt sebagai konteks faktual
 * 4. Generate respons via Gemini dengan temperature rendah
 * 
 * Catatan: Ini BUKAN RAG (Retrieval-Augmented Generation) karena tidak
 * menggunakan embedding, vector store, atau retrieval dokumen. Data
 * diambil via query SQL konvensional.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('[SIJAGA] GEMINI_API_KEY tidak ditemukan. Fitur AI Assistant tidak akan berfungsi.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface RetrievedStudentData {
  nama: string;
  nim: string;
  prodi: string | null;
  angkatan: string | null;
  status: string;
  nftAddress: string | null;
  txSignature: string | null;
  issuedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  hashVerified: boolean | null;
  piiDeleted: boolean;
}

/**
 * Build system prompt ketat untuk mencegah halusinasi.
 * Gemini HANYA boleh menjawab berdasarkan data yang disuntikkan.
 */
function buildSystemPrompt(retrievedData: RetrievedStudentData[] | null, searchTerms: { nim: string | null; nama: string | null }): string {
  const dataSection = retrievedData && retrievedData.length > 0
    ? `Data Mahasiswa Ditemukan:\n${JSON.stringify(retrievedData, null, 2)}`
    : 'Data Mahasiswa: TIDAK DITEMUKAN dalam sistem SIJAGA.';
    
  const searchContext = [];
  if (searchTerms.nama) searchContext.push(`Nama: "${searchTerms.nama}"`);
  if (searchTerms.nim) searchContext.push(`NIM: "${searchTerms.nim}"`);
  const searchInfo = searchContext.length > 0 ? searchContext.join(' atau ') : 'parameter tidak valid';

  return `Anda adalah **SIJAGA Assistant**, asisten AI resmi untuk verifikasi ijazah digital Universitas Tadulako.

## ATURAN KETAT (WAJIB DIPATUHI):
1. Gunakan **HANYA** data JSON berikut untuk menjawab pertanyaan. DILARANG KERAS mengarang atau berasumsi data apapun.
2. Jika data tidak ditemukan, berikan respons natural dan sopan yang menyebutkan apa yang pengguna cari. Contoh: "Maaf, saya tidak dapat menemukan data ijazah untuk pencarian **${searchInfo}** di dalam sistem SIJAGA."
3. Jika sertifikat berstatus "REVOKED", **WAJIB** sampaikan bahwa ijazah tersebut telah **DICABUT/DIREVOKE** beserta alasannya.
4. Jika sertifikat berstatus "MINTED" atau "CLAIMED", sampaikan bahwa ijazah tersebut **TERVERIFIKASI** dan valid.
5. Jika status "NOT_ISSUED", sampaikan bahwa ijazah belum diterbitkan di blockchain.
6. Jika field piiDeleted = true, sampaikan bahwa data pribadi telah dihapus sesuai UU PDP namun ijazah tetap terverifikasi di blockchain.
7. Selalu sertakan link ke **Solana Explorer** jika nftAddress tersedia: https://explorer.solana.com/address/{nftAddress}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}
8. **JANGAN** menjawab pertanyaan di luar konteks verifikasi ijazah, akademik, atau SIJAGA. Jawab: "Maaf, saya hanya dapat membantu verifikasi ijazah di sistem SIJAGA."
9. Jawab dalam **Bahasa Indonesia** yang profesional, sopan, dan meyakinkan.
10. Format respons menggunakan Markdown yang rapi (bold untuk nama, code block untuk NIM/hash, link untuk explorer).

## DATA KONTEKS PENCARIAN (Berdasarkan Ekstraksi Sistem):
Yang dicari pengguna: ${searchInfo}

${dataSection}

## GAYA JAWABAN:
- Jika data ditemukan, mulai dengan konfirmasi: "Berdasarkan data di sistem SIJAGA, ..."
- Sertakan detail: Nama, NIM, Program Studi, Tahun Kelulusan, Status
- Akhiri dengan link Solana Explorer (jika tersedia) dan kalimat penutup profesional`;
}

/**
 * Generate respons verifikasi menggunakan Gemini API
 */
export async function generateVerificationResponse(
  question: string,
  retrievedData: RetrievedStudentData[] | null,
  searchTerms: { nim: string | null; nama: string | null }
): Promise<string> {
  if (!genAI) {
    return 'Maaf, layanan AI Assistant sedang tidak tersedia. Silakan gunakan fitur verifikasi manual dengan memasukkan NIM atau alamat wallet di halaman utama.';
  }

  try {
    const systemPrompt = buildSystemPrompt(retrievedData, searchTerms);

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.1, // Low temperature = lebih faktual, kurang kreatif
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'Siapa kamu dan apa yang bisa kamu bantu?' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Saya adalah **SIJAGA Assistant**, asisten AI resmi untuk membantu verifikasi ijazah digital Universitas Tadulako. Saya dapat membantu Anda:\n\n1. **Mengecek keaslian ijazah** berdasarkan nama atau NIM mahasiswa\n2. **Memverifikasi status sertifikat** di blockchain Solana\n3. **Memberikan informasi** tentang sistem SIJAGA\n\nSilakan tanyakan apa saja terkait verifikasi ijazah!' }],
        },
      ],
    });

    const result = await chat.sendMessage(question);
    const response = result.response;

    return response.text();
  } catch (error) {
    console.error('[SIJAGA] Gemini API error:', error);
    return 'Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi dalam beberapa saat.';
  }
}

/**
 * Ekstrak keywords pencarian dari pertanyaan natural language.
 * Digunakan untuk step query database di pipeline prompt grounding.
 */
export function extractSearchTerms(question: string): { nim: string | null; nama: string | null } {
  let nim: string | null = null;
  let nama: string | null = null;

  // 1. Ekstrak NIM
  const nimPatterns = [
    /\b([A-Z]\d{2,3}[.\s]?\d{2,4}[.\s]?\d{3,6})\b/i,
    /\bNIM\s*[:\-]?\s*([A-Z0-9]{5,20})\b/i,
    /\b([A-Z]{1,3}\d{6,12})\b/i, // contoh: F55123020
  ];

  for (const pattern of nimPatterns) {
    const match = question.match(pattern);
    if (match && match[1]) {
      nim = match[1].replace(/[\s.]/g, '').toUpperCase();
      break;
    }
  }

  // Jika pertanyaan hanya berisi NIM, langsung return
  const isOnlyNim = nim && question.replace(new RegExp(nim, 'gi'), '').trim().length < 3;
  if (isOnlyNim) {
    return { nim, nama: null };
  }

  // 2. Ekstrak Nama (Rule-based yang lebih pintar)
  // Bersihkan tanda baca
  const cleanQuestion = question.replace(/[.,?!\'\"\(\)]/g, ' ').trim();
  
  // Kamus kata baku/tanya yang harus diabaikan
  const excludeWords = new Set([
    'APAKAH', 'TOLONG', 'BENAR', 'CEK', 'CARI', 'CARIKAN', 'VERIFIKASI', 'LULUSAN',
    'UNIVERSITAS', 'TADULAKO', 'UNTAD', 'PRODI', 'PROGRAM', 'STUDI',
    'TAHUN', 'DARI', 'YANG', 'DAN', 'ATAU', 'INI', 'ITU', 'SUDAH',
    'BELUM', 'BISA', 'DENGAN', 'UNTUK', 'ADA', 'TIDAK', 'MAHASISWA',
    'IJAZAH', 'SERTIFIKAT', 'NIM', 'NAMA', 'STATUS', 'BLOCKCHAIN',
    'SOLANA', 'NFT', 'WALLET', 'SIJAGA', 'SISTEM', 'INFORMASI',
    'SIAPA', 'BAGAIMANA', 'KAPAN', 'DIMANA', 'MENGAPA', 'KENAPA',
    'SAYA', 'DIA', 'KAMU', 'MEREKA', 'KITA', 'KAMI',
    'MINTA', 'DATA', 'TENTANG', 'ATAS', 'BERNAMA', 'ADALAH', 'MERUPAKAN',
    'TADI', 'BARUSAN', 'SEKARANG', 'KEMARIN', 'BESOK', 'HARI', 'INI',
    'BANTU', 'BANTUAN', 'HALO', 'HAI', 'SELAMAT', 'PAGI', 'SIANG', 'SORE', 'MALAM'
  ]);

  // Coba cari pattern kapitalisasi lebih dulu (kini mendukung 1 kata)
  const capitalizedMatch = cleanQuestion.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\b/);
  if (capitalizedMatch && capitalizedMatch[1]) {
    const candidate = capitalizedMatch[1];
    const words = candidate.split(/\s+/);
    const filtered = words.filter(w => !excludeWords.has(w.toUpperCase()));
    if (filtered.length >= 1) { 
      nama = filtered.join(' ');
    }
  }

  // Fallback: Pattern "nama X"
  if (!nama) {
    const namaLabelMatch = cleanQuestion.match(/(?:nama|bernama|atas nama)\s+([A-Za-z\s]{3,50})(?:\s+(?:benar|lulusan|dari|nim|mahasiswa|adalah)|$)/i);
    if (namaLabelMatch && namaLabelMatch[1]) {
      nama = namaLabelMatch[1].trim();
    }
  }


  if (!nama && !nim) {
    const words = cleanQuestion.split(/\s+/);
    if (words.length > 0 && words.length <= 4) {
      const filtered = words.filter(w => !excludeWords.has(w.toUpperCase()));
      if (filtered.length > 0) {
        nama = filtered.join(' ');
      }
    }
  }

  return { nim, nama };
}
