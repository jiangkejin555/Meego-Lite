import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "meego_session";

// Session lifetime: 7 days, expressed in seconds.
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const BCRYPT_SALT_ROUNDS = 10;

export type SessionPayload = { uid: string; email: string };

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET 未配置：请在 .env 中设置 AUTH_SECRET（可用 `openssl rand -base64 32` 生成）"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const uid = payload.uid;
    const email = payload.email;
    if (typeof uid !== "string" || typeof email !== "string") {
      return null;
    }
    return { uid, email };
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

export async function getSessionUser(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifySession(token);
    if (!payload) return null;

    const user = await db.user.findFirst({
      where: { id: payload.uid, deletedAt: null },
    });
    return user ?? null;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json(
    { error: "未登录或会话已过期" },
    { status: 401 }
  );
}

export async function getVisibleProjectIds(
  userId: string
): Promise<string[]> {
  const projects = await db.project.findMany({
    where: {
      OR: [{ creatorId: userId }, { owners: { some: { id: userId } } }],
    },
    select: { id: true },
  });
  return projects.map((project) => project.id);
}
