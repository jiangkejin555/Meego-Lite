import OpenAI from "openai";

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string | null;
  model?: string | null;
}

// 构造一个 OpenAI 客户端。凭证由调用方显式传入（来自用户配置），不再读取环境变量。
export function getOpenAIClient(config: OpenAIConfig): OpenAI {
  const apiKey = config.apiKey?.trim();
  if (!apiKey) {
    throw new Error("未配置 API Key");
  }
  return new OpenAI({
    apiKey,
    baseURL: config.baseURL?.trim() || undefined,
    timeout: 60_000,
    maxRetries: 1,
  });
}

export function resolveOpenAIModel(model?: string | null): string {
  const value = model?.trim();
  if (!value) {
    throw new Error("未配置模型");
  }
  return value;
}

// 调用模型生成日报/周报 Markdown 文本。
export async function generateReportMarkdown(
  config: OpenAIConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = getOpenAIClient(config);
  const model = resolveOpenAIModel(config.model);
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

// 拉取兼容 OpenAI 协议服务的可用模型列表，返回去重并排序后的模型 id。
export async function listOpenAIModels(
  config: Pick<OpenAIConfig, "apiKey" | "baseURL">
): Promise<string[]> {
  const client = getOpenAIClient(config);
  const res = await client.models.list();
  const ids = res.data.map((m) => m.id).filter(Boolean);
  return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
}

// 轻量探活：用极小的请求验证 apiKey / baseURL / model 是否可用。
export async function testOpenAIConnection(config: OpenAIConfig): Promise<void> {
  const client = getOpenAIClient(config);
  const model = resolveOpenAIModel(config.model);
  await client.chat.completions.create({
    model,
    max_tokens: 1,
    temperature: 0,
    messages: [{ role: "user", content: "ping" }],
  });
}
