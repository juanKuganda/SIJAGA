import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const search = searchParams.get("search") || "";
    const action = searchParams.get("action") || "all";

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    
    // Pastikan page dan limit valid
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validLimit = isNaN(limit) || limit < 1 ? 50 : limit;

    const skip = (validPage - 1) * validLimit;

    // Build Prisma where clause
    const whereClause: import("@prisma/client").Prisma.AuditLogWhereInput = {};
    if (action !== "all") {
      whereClause.action = { contains: action };
    }
    if (search) {
      whereClause.OR = [
        { user: { nama: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    // Ambil data dan hitung total menggunakan transaksi berjalan secara paralel (Promise.all)
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: validLimit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              nama: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where: whereClause })
    ]);

    return NextResponse.json({
      logs,
      metadata: {
        total,
        totalPages: Math.ceil(total / validLimit),
        currentPage: validPage,
        limit: validLimit
      }
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data audit log" },
      { status: 500 }
    );
  }
}
