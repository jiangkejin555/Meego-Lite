# Checklist

## 数据与迁移
- [x] `prisma/schema.prisma` 的 `User` 含 `openaiApiKey`/`openaiBaseUrl`/`openaiModel`/`reportSummaryStyle`（均 `String?`）
- [x] `src/lib/db-migrations.ts` 的 `ensureUserSchema` 为上述字段补列，既有库可平滑升级
- [x] `prisma generate` 已执行，Client 类型可用

## 后端 —— 凭证来源
- [x] `src/lib/openai.ts` 改为接收显式配置入参，不再从 `process.env` 读取生成凭证
- [x] 生成报告时使用当前用户的 `openaiApiKey`/`openaiBaseUrl`/`openaiModel`（Model 留空回退 `gpt-4o-mini`）
- [x] 用户未配置 Key 且非 mock 时报告置 failed 并提示前往「报告设置」，且无任何外部请求
- [x] `REPORTS_MOCK=1` 预览路径仍可用，不依赖用户是否配置 Key

## 模型可用性测试
- [x] `POST /api/reports/test-connection` 存在并需登录
- [x] 入参按「表单值优先，回退已存配置（掩码/缺省）」组合；Key 缺失返回 400 且无外部请求
- [x] 连通成功返回成功标志；失败返回明确错误信息（已用 UI 验证 401 错误回显）
- [x] 测试仅做探测，不写入数据库
- [x] 编辑弹窗操作区顺序为「取消 → 测试连接 → 保存」，测试在保存前面

## 后端 —— 设置读写
- [x] `PUT /api/users/:id` 接受 `openaiBaseUrl`/`openaiModel`/`reportSummaryStyle`
- [x] `openaiApiKey`：undefined 不变、掩码不变、非空覆盖、空串清除
- [x] `GET /api/auth/me` 不下发 Key 明文，仅返回掩码与 `openaiApiKeySet`
- [x] 仅本人可修改自身 AI 配置（沿用既有 users PUT 鉴权）

## 提示词
- [x] 系统提示词保持内置、不可编辑、对用户不可见
- [x] 用户「总结方式」被追加进 `buildReportPrompts` 的提示中并影响输出
- [x] 未配置总结方式时使用默认结构，不追加额外偏好

## 前端 —— 个人设置
- [x] 「报告设置」卡片显示 Key 状态（掩码/未配置）、Base URL、Model、总结方式摘要
- [x] 编辑弹窗含 Key（留空不改 + 清除密钥）、Base URL、Model、总结方式（多行）
- [x] 编辑弹窗含「测试连接」按钮且位于「保存」前面，点击有 loading 与成功/失败内联反馈
- [x] 保存成功后卡片刷新并有 toast 反馈；Key 留空时不覆盖已存值

## 前端 —— 跳转定位
- [x] `app-store` 新增 `profileSection` 与 setter
- [x] 「我的报告」右上角「报告设置」按钮可跳转至个人设置
- [x] 跳转后自动滚动定位并短暂高亮「报告设置」卡片

## 工程质量
- [x] `tsc --noEmit` 通过
- [x] `npm run lint` 通过
- [x] 主流程手动验证通过（保存/清除 Key、配置持久化、测试连通成功/失败、未配置引导、跳转定位、Mock 预览）
