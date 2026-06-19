import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/seed  — seed initial demo data (idempotent)
export async function POST() {
  // If users already exist, do nothing
  const existingUsers = await db.user.count();
  if (existingUsers > 0) {
    return NextResponse.json({ ok: true, message: "已有数据，跳过种子" });
  }

  // Create demo users
  const alice = await db.user.create({
    data: {
      name: "Alice 张",
      email: "alice@example.com",
      notifyEmail: true,
      leadTimeMinutes: 60,
    },
  });
  const bob = await db.user.create({
    data: {
      name: "Bob 李",
      email: "bob@example.com",
      notifyEmail: true,
      leadTimeMinutes: 30,
    },
  });
  const carol = await db.user.create({
    data: {
      name: "Carol 王",
      email: "carol@example.com",
      notifyEmail: true,
      leadTimeMinutes: 120,
    },
  });

  const now = Date.now();
  const hoursFromNow = (h: number) => new Date(now + h * 60 * 60 * 1000);

  // Create demo tasks
  const tasks = [
    {
      title: "完成首页改版设计稿",
      description:
        "根据产品评审意见，输出第二版高保真设计稿，包含暗色模式适配和移动端响应式布局。",
      status: "in_progress" as const,
      priority: "p1" as const,
      deadline: hoursFromNow(3),
      progress: 60,
      creatorId: alice.id,
      assigneeId: bob.id,
      tags: '["设计","首页"]',
    },
    {
      title: "修复登录页 OAuth 跳转 bug",
      description:
        "用户使用 Google 登录后回调地址错误，导致跳转到 404。需要修复 redirect_uri 拼接逻辑。",
      status: "todo" as const,
      priority: "p0" as const,
      deadline: hoursFromNow(2),
      progress: 0,
      creatorId: bob.id,
      assigneeId: alice.id,
      tags: '["登录","紧急"]',
    },
    {
      title: "API 性能优化：列表接口响应时间从 800ms 降到 200ms",
      description:
        "通过加索引、改写查询、增加 Redis 缓存三层手段将列表接口响应时间降低 75%。",
      status: "in_progress" as const,
      priority: "p1" as const,
      deadline: hoursFromNow(48),
      progress: 85,
      creatorId: carol.id,
      assigneeId: carol.id,
      tags: '["性能","后端"]',
    },
    {
      title: "撰写下季度产品规划文档",
      description:
        "整理 Q3 的产品路线图，包含核心目标、关键里程碑、人力评估和风险点。",
      status: "todo" as const,
      priority: "p2" as const,
      deadline: hoursFromNow(120),
      progress: 10,
      creatorId: alice.id,
      assigneeId: carol.id,
      tags: '["规划","文档"]',
    },
    {
      title: "用户调研：访谈 5 位付费用户",
      description:
        "围绕使用频率、付费动机、未满足需求三个维度展开深度访谈，输出洞察报告。",
      status: "done" as const,
      priority: "p2" as const,
      deadline: hoursFromNow(-24),
      progress: 100,
      creatorId: bob.id,
      assigneeId: bob.id,
      tags: '["调研","用户"]',
    },
    {
      title: "iOS 14 兼容性回归测试",
      description:
        "iOS 14 系统下部分页面布局错乱，需在 BrowserStack 上完成全量回归测试。",
      status: "todo" as const,
      priority: "p3" as const,
      deadline: hoursFromNow(168),
      progress: 0,
      creatorId: carol.id,
      assigneeId: alice.id,
      tags: '["测试","iOS"]',
    },
    {
      title: "支付回调签名校验缺陷",
      description:
        "支付回调接口未严格校验签名，可能被伪造请求触发订单状态变更，需立即修复。",
      status: "in_progress" as const,
      priority: "p0" as const,
      deadline: hoursFromNow(1),
      progress: 30,
      creatorId: alice.id,
      assigneeId: carol.id,
      tags: '["安全","支付"]',
    },
  ];

  for (const t of tasks) {
    await db.task.create({ data: t });
  }

  return NextResponse.json({
    ok: true,
    message: `已创建 ${tasks.length} 个示例任务和 3 个用户`,
    users: [alice.id, bob.id, carol.id],
  });
}
