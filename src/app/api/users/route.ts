import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/users
export async function GET() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      feishuId: true,
      wecomId: true,
      notifyEmail: true,
      notifyFeishu: true,
      notifyWeCom: true,
      feishuWebhook: true,
      wecomWebhook: true,
      leadTimeMinutes: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

// POST /api/users
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: "姓名和邮箱不能为空" },
      { status: 400 }
    );
  }
  const existing = await db.user.findUnique({
    where: { email: body.email },
  });
  if (existing) {
    return NextResponse.json({ error: "邮箱已存在" }, { status: 400 });
  }
  const user = await db.user.create({
    data: {
      name: String(body.name).trim(),
      email: String(body.email).trim(),
      avatar: body.avatar || null,
      feishuId: body.feishuId || null,
      wecomId: body.wecomId || null,
      notifyEmail: body.notifyEmail ?? true,
      notifyFeishu: body.notifyFeishu ?? false,
      notifyWeCom: body.notifyWeCom ?? false,
      feishuWebhook: body.feishuWebhook || null,
      wecomWebhook: body.wecomWebhook || null,
      leadTimeMinutes: body.leadTimeMinutes ?? 60,
    },
  });
  return NextResponse.json({ user });
}
