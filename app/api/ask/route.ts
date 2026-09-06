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
        // Cek autentikasi untuk membatasi PII
        const { getAuthUser } = await import('@/lib/auth');
        const authUser = await getAuthUser();
        const isAdmin = authUser?.role === 'ADMIN';

        const { inspectCertificate } = await import('@/lib/onchain');

        retrievedData = await Promise.all(users.map(async (user) => {
          const cert = user.certificate;
          const isOwner = authUser?.userId === user.id;
          const canSeePII = isAdmin || isOwner;
          
          let hashVerified: boolean | null = null;

          // Verifikasi hash jika data tersedia
          if (user.prodi && cert?.dataSalt && cert?.dataHash && !user.dataDeletedAt) {
            hashVerified = verifyDataHash(
              user.nama,
              user.nim,
              user.prodi,
              cert.dataSalt,
              cert.dataHash
            );
          }
          
          let onChainOk = false;
          let frozen = false;
          let ownerMatch = false;
          let hashMatch = false;
          let rpcAvailable = false;

          if (cert?.nftAddress && cert.status !== 'REVOKED') {
            const inspection = await inspectCertificate(cert.nftAddress);
            if (inspection.ok) {
              rpcAvailable = true;
              frozen = inspection.frozen;
              ownerMatch = !!(user.wallet?.walletAddress && inspection.owner === user.wallet.walletAddress);
              hashMatch = !!(cert.dataHash && inspection.dataHash === cert.dataHash);
              
              // Strict Kriptografis 4-Layer Rule
              if (frozen && ownerMatch && hashMatch) {
                onChainOk = true;
              }
            } else {
              rpcAvailable = inspection.reason !== "RPC";
            }
          }
          
          const maskString = (str: string) => str ? `${str.charAt(0)}***${str.charAt(str.length - 1)}` : "";
          const maskNim = (nim: string) => nim ? `${nim.substring(0, 3)}***${nim.substring(nim.length - 3)}` : "";

          const formatNama = () => {
            if (user.dataDeletedAt) return '[DATA DIHAPUS]';
            return canSeePII ? user.nama : maskString(user.nama);
          };

          const formatNim = () => {
            if (user.dataDeletedAt) return '[DIHAPUS]';
            return canSeePII ? user.nim : maskNim(user.nim);
          };

          return {
            nama: formatNama(),
            nim: formatNim(),
            prodi: user.prodi,
            tahunLulus: user.tahunLulus,
            status: cert?.status || 'NOT_ISSUED',
            nftAddress: cert?.nftAddress || null,
            txSignature: cert?.txSignature || null,
            issuedAt: cert?.issuedAt?.toISOString() || null,
            revokedAt: cert?.revokedAt?.toISOString() || null,
            revokeReason: cert?.revokeReason || null,
            hashVerified,
            piiDeleted: !!user.dataDeletedAt,
            onChainOk,
            frozen,
            ownerMatch,
            hashMatch,
            rpcAvailable
          };
        }));
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
