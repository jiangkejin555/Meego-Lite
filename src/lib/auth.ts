import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "meego_session";

// Session lifetime: 7 days, expressed in seconds.
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const BCRYPT_SALT_ROUNDS = 10;

export type SessionPayload = { uid: string; email: string; sv: number };

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
  return new SignJWT({ uid: payload.uid, email: payload.email, sv: payload.sv })
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
    const sv = payload.sv;
    if (typeof uid !== "string" || typeof email !== "string") {
      return null;
    }
    const resolvedSv = typeof sv === "number" ? sv : 0;
    return { uid, email, sv: resolvedSv };
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

// A cookie flagged `Secure` is only sent back by the browser over HTTPS. Our
// production deployment is served over plain HTTP (behind Nginx), so hard-coding
// `secure: NODE_ENV === "production"` made the session cookie silently dropped on
// every subsequent request — login "worked" but the next /api/* call 401'd and
// bounced the user back to /login. Instead we derive `secure` from the actual
// request protocol: HTTP → not secure (cookie is sent), HTTPS → secure. Nginx
// forwards the original scheme in `x-forwarded-proto`.
function isSecureRequest(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  return req.nextUrl.protocol === "https:";
}

export function getSessionCookieOptions(req: NextRequest) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureRequest(req),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function setSessionCookie(res: NextResponse, req: NextRequest, token: string) {
  res.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions(req));
}

export function clearSessionCookie(res: NextResponse, req?: NextRequest) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: req ? isSecureRequest(req) : false,
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifySession(token);
    if (!payload) return null;

    const user = await db.user.findFirst({
      where: { id: payload.uid, deletedAt: null },
    });
    if (!user) return null;
    if (user.sessionVersion !== payload.sv) return null;
    return user;
  } catch {
    return null;
  }
}

export function unauthorized() {
  const res = NextResponse.json(
    { error: "未登录或会话已过期" },
    { status: 401 }
  );
  clearSessionCookie(res);
  return res;
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
