import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept-Encoding",
};

export async function GET() {
  return NextResponse.json(
    {
      rules: [
        {
          pathPattern: "/api/actions/claim",
          apiPath: "/api/actions/claim",
        },
      ],
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
