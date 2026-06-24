import { NextRequest, NextResponse } from "next/server";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { maskApiKey } from "@/lib/mask";

// GET /api/auth/me — return the currently authenticated user
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const user = await getSessionUser(req);
  if (!user) {
    return unauthorized();
  }

  const { passwordHash: _omit, openaiApiKey, ...rest } = user;
  void _omit;

  return NextResponse.json({
    user: {
      ...rest,
      openaiApiKey: maskApiKey(openaiApiKey),
      openaiApiKeySet: !!openaiApiKey,
    },
  });
}
