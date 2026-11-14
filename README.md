# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## 收集词更新（2026-10-02）

收集词库现有 177 个词，沿用 `/gre/#collected` 与 `/gre/#collected-words`；稳定 ID 和独立进度键保持不变。新增 46 词由 DeepSeek 批量起草、复核，再根据词源证据编辑修订。

`data/collected-example-overrides.json` 保存 13 条用户原词书例句（OCR 校订、等价选词整理，含页码）；`data/collected-question-contexts.json` 保存 30 个考满分题库出处，其中 17 个含短题干节选。题库来源保留空格，标明目标词是题干用词、正确选项或干扰选项，并提供原题链接；不将干扰选项填入题干。后续按下述来源规则维护。

后续更新先追加有日期的收集词 JSON，再运行 `scripts/prepare-collected-vocabulary.py`、词源复核及 `scripts/merge-collected-vocabulary.py`；合并按批次日期追加，保留旧词卡顺序。编辑修订、例句来源和题库来源分别保存在 `data/`，构建缓存留在仓库外。部署到 xiao-chen.org 必须运行个人网站仓库的 `deploy.sh`。

## 原句来源规则（用户明确要求）

收集词优先使用用户提供的 GRE 原词书例句（注明书名、页码和 OCR 校订），其次使用可核对的题库出处（原题链接，明确词的角色，节选保留空格）。不再使用 AI 自编例句补位；无可核对出处时显示“暂未找到可核对的原书例句或题库出处”。DeepSeek 只可整理和翻译已提供的原文，不能补造缺失内容。OCR 涉及实质性歧义的条目先排除。`merge-collected-vocabulary.py` 强制只发布 `collected-example-overrides.json` 中附原书定位的例句，没有模型草稿兜底。此前草稿仅保留在构建缓存/编辑历史中，不用于线上例句。

## 书本复习与词表（2026-11-05）

按用户最新要求，原书词库在新词、今日复习和复习已掌握三种模式中，只要一对里有一个词答「还不熟」，两个词都从 known 移到 hard。同轮中即使另一个词后来答对，也不能抵消这次不熟；下一轮两个都答对后才能重新掌握。仅本轮保留失败词对标记，原有 known/hard 格式不变，零散收集词仍逐词记录。

按用户最新澄清，「02 · 今日复习」只选 hard 中明确标为不熟的词对，按原书顺序取前 10 对（最多 20 词）后打散，不再用未学词或仅未完全掌握的词对补位。只有一词标过不熟时，仍按整对纳入；不熟词对不足 10 对时就练实际数量，空库时停用按钮。首页说明仅为「只复习不熟词。」新词每轮 10/20/50 设置不影响今日复习的上限。2026-11-13 根据用户要求，三个词库的每轮复习上限和今日复习目标统一为 20 词，收集词也不再随新词每轮设置变化；复习已掌握仍为 20 词。旧学习进度及存储键不变。

全部词表中的每个英文单词都可点击，展开「查看词卡 / 记住了 / 还不熟」选项；记住了按词记录，还不熟仍整对回退（收集词逐词）。查看词卡复用完整词卡与朗读、词源、例句和作答按钮；返回或作答后回到原词表，保留筛选、遮住中文、展开状态和滚动位置。词表单词操作不计入每日新词/复习任务次数。

直接复用既有 `gre-voice-memory-v1` 的 known/hard 进度，刷新、跨天、导出/导入后按同一规则重新选词。此前误解为固定批次的 `gre-voice-book-review-v1` 不再参与选词，旧导出文件的批次字段也会被忽略；其中已记住/不熟的词仍正常保留，无需清空进度。收集词库沿用独立进度及原有复习方式。队列回归检查：Node >=22.13 下运行 `npm run test:review`。

## Magoosh Common 独立词库（2026-11-11）

用户改选 Magoosh GRE Common Words，先前的 Vocabulary.com 185604 词表已放弃，没有接入。新入口为 `/gre/#magoosh`，全部词表为 `/gre/#magoosh-words`。从 Magoosh 官方 1000 词 PDF 的 Common (High-frequency) 部分提取 300 个不同词名，再加入官方 Common VII 的 50 个词，共 350 个；不含 Basic/Advanced，也不复制原站释义或例句。来源和逐词定位记录在 `data/magoosh-common-words-2026-11-11.json`。

全部 350 词的中文释义、词源、英语亲戚及近义词辨析通过 DeepSeek API 批量起草，再由 DeepSeek 对照词典证据复核。生成规范沿用用户的 `gre-etymology` 技能；可断点续跑的原始初稿、来源缓存和模型复核在仓库外的 `../.magoosh-build/`，审计汇总在 `data/magoosh-content-review.json`。不补造缺失例句；词卡提供 Magoosh 原词表和参考词典链接。模型名、完成数量及成功调用 token 用量可核对，失败重试可能另计用量。

Magoosh 数据按需加载，原书和 177 词收集库的数据、ID、进度键不变。新词库单独使用 `gre-magoosh-common-memory-v1` 和 `gre-magoosh-common-history-v1`，按单词记录掌握/不熟，不沿用原书配对规则。复习只选不熟词，最多 20 个；支持朗读、词表选项、词源展开、进度导出/导入与跨词库切换。学习分组每 50 词一组，供网站导航，不宣称与官方 I–VI 的分组顺序一致。

2026-11-11 追加来源例句：95 条用户原词书例句与 7 条 GRE 题库/练习题短节选，覆盖 99 个不同单词。原词书从既有 OCR 中匹配词头及实际屈折形式，DeepSeek 只整理原句的空格/标点和同义备选、翻译并逐条复核；108 个候选中排除 13 个有歧义或未通过复核的项目。每条提供 PDF 页码和原书例句截图；题库节选保留原空格，每个来源页不超过 25 个英文词，明确区分题干用词与正确选项。PowerScore 自编练习明确注明非 ETS 真题。没有 AI 造句兜底，也不宣称全部 350 词已有例句。记录在 `data/magoosh-book-examples.json`、`data/magoosh-example-review.json`、`data/magoosh-question-contexts.json`、`data/magoosh-question-verification.json`，截图位于 `public/source-examples/`。例句整理维护脚本为 `scripts/prepare-magoosh-examples.py draft|merge`，原书裁图使用既有 `generate-example-crops.py`；API 密钥读取方式与词源生成脚本一致。

维护命令（API 密钥只在本机/环境变量读取，不写入源码或浏览器）：

```sh
python3 scripts/import-magoosh-common.py
DEEPSEEK_KEY_FILE=/path/to/private-key SSL_CERT_FILE=/etc/ssl/cert.pem python3 scripts/generate-magoosh-vocabulary.py draft
DEEPSEEK_KEY_FILE=/path/to/private-key SSL_CERT_FILE=/etc/ssl/cert.pem python3 scripts/generate-magoosh-vocabulary.py review
python3 scripts/generate-magoosh-vocabulary.py merge
npm run test:review
npm run test:data
```
