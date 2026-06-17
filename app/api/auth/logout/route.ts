import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Hapus cookie token
  response.cookies.delete("token");

  return response;
}
