import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";
import type { NotificationChannel, NotificationType } from "@/lib/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("notification");

interface SendArgs {
  userId: string;
  taskId?: string | null;
  type: NotificationType;
  title: string;
  content: string;
  // Channels to attempt. If omitted, defaults to [in_app, email, feishu, wecom]
  // based on user preferences.
  channels?: NotificationChannel[];
}

interface SendResult {
  channel: NotificationChannel;
  status: "sent" | "failed" | "pending";
  error?: string;
}

interface WeComAppConfig {
  corpId: string;
  agentId: string;
  appSecret: string;
}

interface WeComPreference {
  notifyWeCom: boolean;
  wecomId?: string | null;
  wecomWebhook?: string | null;
}

/**
 * Send a notification across multiple channels based on user preferences.
 * Always creates an in_app notification record. For email/feishu/wecom, it
 * attempts delivery and records the result.
 */
export async function sendNotification({
  userId,
  taskId,
  type,
  title,
  content,
  channels,
}: SendArgs): Promise<SendResult[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return [
      {
        channel: "in_app",
        status: "failed",
        error: "User not found",
      },
    ];
  }

  // Determine channels
  const targetChannels: NotificationChannel[] = channels ?? (() => {
    const list: NotificationChannel[] = ["in_app"];
    if (user.notifyEmail) list.push("email");
    if (user.notifyFeishu && user.feishuWebhook) list.push("feishu");
    if (canSendWeComNotification(user)) list.push("wecom");
    return list;
  })();

  const results: SendResult[] = [];

  for (const channel of targetChannels) {
    let status: "sent" | "failed" | "pending" = "pending";
    let error: string | undefined;
    let sentAt: Date | null = null;

    try {
      if (channel === "in_app") {
        // In-app always succeeds — just stored in DB
        status = "sent";
        sentAt = new Date();
      } else if (channel === "email") {
        const res = await sendEmail(user.email, title, content);
        if (res.ok) {
          status = "sent";
          sentAt = new Date();
        } else {
          status = "failed";
          error = res.error || "邮件发送失败";
        }
      } else if (channel === "feishu") {
        if (!user.feishuWebhook) {
          status = "failed";
          error = "未配置飞书 webhook";
        } else {
          const res = await sendFeishuCard(user.feishuWebhook, title, content);
          if (res.ok) {
            status = "sent";
            sentAt = new Date();
          } else {
            status = "failed";
            error = res.error || "飞书 webhook 调用失败";
          }
        }
      } else if (channel === "wecom") {
        const weComAppConfig = getWeComAppConfig();
        if (weComAppConfig && user.wecomId) {
          const res = await sendWeComAppText(
            weComAppConfig,
            user.wecomId,
            title,
            content
          );
          if (res.ok) {
            status = "sent";
            sentAt = new Date();
          } else {
            status = "failed";
            error = res.error || "企业微信应用消息发送失败";
          }
        } else if (!user.wecomWebhook) {
          status = "failed";
          error = "未配置企业微信用户 ID 或群机器人 webhook";
        } else {
          const res = await sendWeComText(user.wecomWebhook, title, content);
          if (res.ok) {
            status = "sent";
            sentAt = new Date();
          } else {
            status = "failed";
            error = res.error || "企业微信 webhook 调用失败";
          }
        }
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }

    await db.notification.create({
      data: {
        userId,
        taskId: taskId ?? null,
        type,
        channel,
        title,
        content,
        status,
        sentAt,
        error,
      },
    });

    results.push({ channel, status, error });
  }

  return results;
}

/**
 * Send an email via SMTP (configured by env: SMTP_HOST/PORT/SECURE/USER/PASS/FROM).
 * Designed for QQ 邮箱（smtp.qq.com:465 SSL）但任意 SMTP 服务器同样适用。
 * Returns { ok:false } if SMTP is not configured so caller can record the error.
 */
let cachedTransporter: Transporter | null = null;
let cachedTransporterKey = "";

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE ?? "true").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  // Re-create transporter when env values change (helpful in dev)
  const key = `${host}|${port}|${secure}|${user}|${pass}`;
  if (cachedTransporter && cachedTransporterKey === key) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587/STARTTLS
    auth: { user, pass },
  });
  cachedTransporterKey = key;
  return cachedTransporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  if (!to) return { ok: false, error: "收件人邮箱为空" };
  const transporter = getTransporter();
  if (!transporter) {
    log.warn("未配置 SMTP，跳过邮件发送", { to });
    return { ok: false, error: "未配置 SMTP（请检查 .env 中的 SMTP_HOST/USER/PASS）" };
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const startedAt = Date.now();
  try {
    const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#222"><h3 style="margin:0 0 12px">${escapeHtml(
      subject
    )}</h3><pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(
      content
    )}</pre></div>`;
    const info = await transporter.sendMail({ from, to, subject, text: content, html });
    const acceptedCount = info.accepted?.length ?? 0;
    const rejectedCount = info.rejected?.length ?? 0;
    if (rejectedCount > 0 || acceptedCount === 0) {
      log.error("邮件被 SMTP 拒收", {
        to,
        subject,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        ms: Date.now() - startedAt,
      });
      return {
        ok: false,
        error: `SMTP 拒收收件人${rejectedCount > 0 ? `：${(info.rejected as unknown[]).join(", ")}` : ""
          }${info.response ? `（${info.response}）` : ""}`,
      };
    }
    log.info("邮件发送成功", {
      to,
      subject,
      messageId: info.messageId,
      accepted: acceptedCount,
      rejected: rejectedCount,
      ms: Date.now() - startedAt,
    });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    log.error("邮件发送失败", { to, subject, error, ms: Date.now() - startedAt });
    return { ok: false, error };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getWeComAppConfig(): WeComAppConfig | null {
  const corpId = process.env.WECOM_CORP_ID;
  const agentId = process.env.WECOM_AGENT_ID;
  const appSecret = process.env.WECOM_APP_SECRET;

  if (!corpId || !agentId || !appSecret) return null;
  return { corpId, agentId, appSecret };
}

export function canSendWeComNotification(user: WeComPreference): boolean {
  if (!user.notifyWeCom) return false;
  if (getWeComAppConfig() && user.wecomId) return true;
  return Boolean(user.wecomWebhook);
}

/**
 * Send a Feishu (Lark) interactive card message via bot webhook.
 * Webhook format: https://open.feishu.cn/open-apis/bot/v2/hook/<token>
 */
async function sendFeishuCard(
  webhookUrl: string,
  title: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = {
      msg_type: "interactive",
      card: {
        header: {
          title: { tag: "plain_text", content: title },
          template: "orange",
        },
        elements: [
          {
            tag: "div",
            text: { tag: "lark_md", content },
          },
        ],
      },
    };
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    // Feishu returns { code: 0, msg: "success" } on success
    if (typeof data.code === "number" && data.code !== 0) {
      return { ok: false, error: data.msg || `code ${data.code}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Send a WeCom (企业微信) text message via bot webhook.
 * Webhook format: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=<KEY>
 */
async function sendWeComText(
  webhookUrl: string,
  title: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = {
      msgtype: "text",
      text: {
        content: `${title}\n\n${content}`,
      },
    };
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    // WeCom returns { errcode: 0, errmsg: "ok" } on success
    if (typeof data.errcode === "number" && data.errcode !== 0) {
      return { ok: false, error: data.errmsg || `errcode ${data.errcode}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendWeComAppText(
  config: WeComAppConfig,
  toUser: string,
  title: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  const agentId = Number(config.agentId);
  if (!Number.isInteger(agentId)) {
    return { ok: false, error: "企业微信 AgentId 必须是数字" };
  }

  try {
    const tokenUrl = new URL("https://qyapi.weixin.qq.com/cgi-bin/gettoken");
    tokenUrl.searchParams.set("corpid", config.corpId);
    tokenUrl.searchParams.set("corpsecret", config.appSecret);

    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) {
      return { ok: false, error: `获取企业微信 access_token 失败：HTTP ${tokenRes.status}` };
    }

    const tokenData = await tokenRes.json().catch(() => ({}));
    if (typeof tokenData.errcode === "number" && tokenData.errcode !== 0) {
      return { ok: false, error: tokenData.errmsg || `errcode ${tokenData.errcode}` };
    }
    if (!tokenData.access_token) {
      return { ok: false, error: "企业微信 access_token 为空" };
    }

    const sendUrl = new URL("https://qyapi.weixin.qq.com/cgi-bin/message/send");
    sendUrl.searchParams.set("access_token", tokenData.access_token);

    const body = {
      touser: toUser,
      msgtype: "text",
      agentid: agentId,
      text: {
        content: `${title}\n\n${content}`,
      },
      safe: 0,
    };

    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!sendRes.ok) {
      return { ok: false, error: `企业微信应用消息发送失败：HTTP ${sendRes.status}` };
    }

    const sendData = await sendRes.json().catch(() => ({}));
    if (typeof sendData.errcode === "number" && sendData.errcode !== 0) {
      return { ok: false, error: sendData.errmsg || `errcode ${sendData.errcode}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
