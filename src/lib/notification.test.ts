import { afterEach, describe, expect, test } from "bun:test";
import {
  canSendWeComNotification,
  getWeComAppConfig,
  sendWeComAppText,
} from "./notification";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

describe("企业微信应用消息配置", () => {
  test("配置完整且用户有企业微信用户 ID 时可发送企业微信通知", () => {
    process.env.WECOM_CORP_ID = "corp-id";
    process.env.WECOM_AGENT_ID = "1000002";
    process.env.WECOM_APP_SECRET = "secret";

    expect(
      canSendWeComNotification({ notifyWeCom: true, wecomId: "zhangsan" })
    ).toBe(true);
  });

  test("没有应用配置时仍兼容企业微信群机器人 webhook", () => {
    delete process.env.WECOM_CORP_ID;
    delete process.env.WECOM_AGENT_ID;
    delete process.env.WECOM_APP_SECRET;

    expect(
      canSendWeComNotification({
        notifyWeCom: true,
        wecomWebhook:
          "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc",
      })
    ).toBe(true);
  });

  test("企业微信应用配置缺失时返回 null", () => {
    process.env.WECOM_CORP_ID = "corp-id";
    process.env.WECOM_AGENT_ID = "1000002";
    delete process.env.WECOM_APP_SECRET;

    expect(getWeComAppConfig()).toBeNull();
  });
});

describe("企业微信应用消息发送", () => {
  test("先获取 access_token，再向指定企业微信用户发送文本消息", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      if (String(url).includes("gettoken")) {
        return Response.json({ errcode: 0, access_token: "token-1" });
      }
      return Response.json({ errcode: 0, errmsg: "ok" });
    }) as typeof fetch;

    const result = await sendWeComAppText(
      {
        corpId: "corp-id",
        agentId: "1000002",
        appSecret: "secret",
      },
      "zhangsan",
      "任务提醒",
      "请及时处理任务"
    );

    expect(result.ok).toBe(true);
    expect(requests).toHaveLength(2);
    expect(requests[0].url).toContain(
      "https://qyapi.weixin.qq.com/cgi-bin/gettoken"
    );
    expect(requests[0].url).toContain("corpid=corp-id");
    expect(requests[0].url).toContain("corpsecret=secret");
    expect(requests[1].url).toBe(
      "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=token-1"
    );
    expect(JSON.parse(String(requests[1].init?.body))).toEqual({
      touser: "zhangsan",
      msgtype: "text",
      agentid: 1000002,
      text: { content: "任务提醒\n\n请及时处理任务" },
      safe: 0,
    });
  });

  test("获取 access_token 失败时返回企业微信错误信息", async () => {
    globalThis.fetch = (async () =>
      Response.json({ errcode: 40013, errmsg: "invalid corpid" })) as unknown as typeof fetch;

    const result = await sendWeComAppText(
      {
        corpId: "bad-corp-id",
        agentId: "1000002",
        appSecret: "secret",
      },
      "zhangsan",
      "任务提醒",
      "请及时处理任务"
    );

    expect(result).toEqual({ ok: false, error: "invalid corpid" });
  });
});
