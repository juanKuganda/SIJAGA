import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateVerificationResponse, extractSearchTerms } from '@/lib/gemini';
import { verifyDataHash } from '@/lib/crypto';
import type { RetrievedStudentData } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Pertanyaan wajib diisi' },
        { status: 400 }
      );
    }

    if (question.trim().length > 500) {
      return NextResponse.json(
        { error: 'Pertanyaan terlalu panjang (maks 500 karakter)' },
        { status: 400 }
      );
    }

    // ═══ STEP 1: RETRIEVAL — Ekstrak search terms dari pertanyaan ═══
    const { nim, nama } = extractSearchTerms(question);

    let retrievedData: RetrievedStudentData[] | null = null;

    if (nim || nama) {
      // Cari di database
      const whereConditions = [];

      if (nim) {
        whereConditions.push({ nim: nim });
      }

      if (nama) {
        whereConditions.push({
          nama: {
            contains: nama,
          },
        });
      }

      const users = await prisma.user.findMany({
        where: {
          OR: whereConditions,
          role: 'MAHASISWA',
        },
        include: {
          certificate: true,
          wallet: true,
        },
        take: 5, // Limit hasil
      });

      if (users.length > 0) {
        retrievedData = users.map((user) => {
          const cert = user.certificate;
          let hashVerified: boolean | null = null;

          // Verifikasi hash jika data tersedia
          if (cert?.dataSalt && cert?.dataHash && !user.dataDeletedAt) {
            hashVerified = verifyDataHash(
              user.nama,
              user.nim,
              user.prodi || 'Informatika',
              cert.dataSalt,
              cert.dataHash
            );
          }

          return {
            nama: user.dataDeletedAt ? '[DATA DIHAPUS]' : user.nama,
            nim: user.dataDeletedAt ? '[DIHAPUS]' : user.nim,
            prodi: user.prodi,
            angkatan: user.angkatan,
            status: cert?.status || 'NOT_ISSUED',
            nftAddress: cert?.nftAddress || null,
            txSignature: cert?.txSignature || null,
            issuedAt: cert?.issuedAt?.toISOString() || null,
            revokedAt: cert?.revokedAt?.toISOString() || null,
            revokeReason: cert?.revokeReason || null,
            hashVerified,
            piiDeleted: !!user.dataDeletedAt,
          };
        });
      }
    }

    // ═══ STEP 2: AUGMENTATION + GENERATION — Kirim ke Gemini ═══
    const answer = await generateVerificationResponse(question, retrievedData, { nim, nama });

    return NextResponse.json({
      answer,
      searchTerms: { nim, nama },
      dataFound: retrievedData !== null && retrievedData.length > 0,
    });
  } catch (error) {
    console.error('[SIJAGA] /api/ask error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
