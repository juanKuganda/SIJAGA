import { NextResponse, NextRequest } from "next/server";

export const ACTION_VERSION = "2.4";

export function blockchainId(): string {
  const cluster = process.env.SOLANA_CLUSTER ?? "devnet";
  if (cluster === "mainnet-beta" || cluster === "mainnet") {
    return "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
  }
  if (cluster === "testnet") return "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z";
  return "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"; // default devnet
}

export const ACTION_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Action-Version, X-Blockchain-Ids, Accept",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": ACTION_VERSION,
  "X-Blockchain-Ids": blockchainId(),
  "Content-Type": "application/json",
};

export function actionJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: ACTION_CORS_HEADERS });
}

export function actionOptions() {
  return new NextResponse(null, { status: 204, headers: ACTION_CORS_HEADERS });
}

export function appUrl(request?: NextRequest) {
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    if (host) return `${protocol}://${host}`;
    return new URL(request.url).origin;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://sijaga-seven.vercel.app").replace(/\/$/, "");
}
