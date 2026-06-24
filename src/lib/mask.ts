// API Key 掩码工具：用于回显时隐藏明文，仅保留少量首尾字符。
// 掩码字符串包含 MASK_CHAR，便于服务端判定「用户未修改」从而沿用已保存的明文。
export const MASK_CHAR = "•";

export function maskApiKey(key?: string | null): string {
  const value = key?.trim();
  if (!value) return "";
  if (value.length <= 8) return MASK_CHAR.repeat(value.length);
  return `${value.slice(0, 3)}${MASK_CHAR.repeat(8)}${value.slice(-4)}`;
}

// 判断回显的 Key 是否为掩码（即用户未输入新值）。
export function isMaskedApiKey(key?: string | null): boolean {
  return !!key && key.includes(MASK_CHAR);
}
