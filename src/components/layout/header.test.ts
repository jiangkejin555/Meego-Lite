import { describe, expect, test } from "bun:test";
import { shouldClearCurrentUser } from "./header";

const persistedUser = {
  id: "user-2",
  name: "李四",
  email: "lisi@example.com",
};

describe("Header 当前用户校验", () => {
  test("用户列表尚未加载完成时不清空已持久化的当前用户", () => {
    expect(shouldClearCurrentUser(persistedUser, [], false)).toBe(false);
  });

  test("用户列表加载完成且当前用户不存在时才清空当前用户", () => {
    expect(shouldClearCurrentUser(persistedUser, [], true)).toBe(true);
  });

  test("用户列表加载完成且当前用户仍存在时保留当前用户", () => {
    expect(
      shouldClearCurrentUser(persistedUser, [persistedUser], true)
    ).toBe(false);
  });
});
