import { db } from "@/lib/db";

export type VerificationPurpose = "register" | "login" | "reset_password";

/**
 * Validate a verification code for the given email + purpose.
 *
 * Looks up the most recent matching record that is not consumed and not
 * expired. On a successful match the record is marked consumed (so it can
 * only be used once) and `true` is returned; otherwise `false`.
 */
export async function consumeVerificationCode(
  email: string,
  code: string,
  purpose: VerificationPurpose
): Promise<boolean> {
  const now = new Date();

  const record = await db.verificationCode.findFirst({
    where: {
      email,
      code,
      purpose,
      consumed: false,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;

  await db.verificationCode.update({
    where: { id: record.id },
    data: { consumed: true },
  });

  return true;
}
