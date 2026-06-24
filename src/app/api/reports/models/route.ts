import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { listOpenAIModels } from "@/lib/openai";
import { isMaskedApiKey } from "@/lib/mask";

// POST /api/reports/models
// 用提交的（或已保存的）AI 凭证拉取兼容 OpenAI 协议服务的可用模型列表。
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const inputKey = typeof body.openaiApiKey === "string" ? body.openaiApiKey.trim() : "";
  const baseURL =
    typeof body.openaiBaseUrl === "string" ? body.openaiBaseUrl.trim() : "";

  // Key 未填或为掩码回显时，沿用已保存的明文 Key。
  let apiKey = inputKey;
  if (!apiKey || isMaskedApiKey(apiKey)) {
    const saved = await db.user.findUnique({
      where: { id: me.id },
      select: { openaiApiKey: true },
    });
    apiKey = saved?.openaiApiKey?.trim() ?? "";
  }

  if (!apiKey) {
    return NextResponse.json({ error: "请先填写 API Key" }, { status: 400 });
  }

  try {
    const models = await listOpenAIModels({ apiKey, baseURL });
    return NextResponse.json({ ok: true, models });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
