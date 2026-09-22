# DeepSeek 执行说明：完成 GRE 例句 Kokoro 音频

你是这个仓库的执行工程师。请直接在下面的本地仓库中继续工作，不要另建项目：

`/Users/chenlin/Desktop/reminder/GRE单词/gre-audio-flashcards-local`

## 目标

为 `app/exampleData.ts` 中所有非空英文例句生成固定的 Kokoro MP3，并让网站优先播放这些静态文件。工作必须可中断、可恢复，并且每完成一个小批次就提交和推送到 GitHub，避免长时间工作丢失。

当前基线：

- GitHub：`https://github.com/Xiao-Chen-usc/gre-audio-flashcards`
- 分支：`main`
- 起始提交：`b02960679b0ac24012e26a1bef7983836087459b`
- 英文例句总数：495
- 已有静态 MP3：16
- 已有映射：`app/exampleAudio.ts`
- 音频目录：`public/audio/examples/`
- 生成脚本：`scripts/generate-example-audio.py`
- 模型/音色：Kokoro v1.0、`af_heart`、美式英语、speed `1.0`

## 开始前

1. 确认当前目录正确，运行 `git status --short`。如果发现并非你产生的未提交修改，停止并报告，不要覆盖。
2. 确认 `main` 位于或包含起始提交，然后执行 `git pull --ff-only origin main`。不要 force push，不要改写已有历史。
3. 检查 Python、ffmpeg、Kokoro 模型文件和依赖是否可用。模型、Python 虚拟环境、缓存、临时 WAV、日志不得提交到仓库。
4. 不得把任何 token、密码、cookie 或私有路径写进源码或提交记录。

## 先让生成流程真正支持断点续作

当前脚本的 `--limit` 只截取开头项目，而且限量运行时不会更新 `app/exampleAudio.ts`，不适合可靠分批处理。先对脚本做最小改进，使其满足以下行为：

- 从 `app/exampleData.ts` 读取所有非空英文例句，并按文件中的原始顺序处理。
- 读取现有 `app/exampleAudio.ts`，只选择“映射缺失或映射文件不存在”的项目。
- 支持明确的批次大小，例如 `--batch-size 25`；每次只处理下一批尚未完成的项目。
- 已存在且有效的 MP3 必须跳过，不能重复生成或更名。
- 每个 MP3 仍使用现有命名规则：`<key>-<sha256前16位>.mp3`，摘要输入仍为 `kokoro-v1.0-af_heart|<清洗后的英文>`。
- 只朗读英文。继续把 `&` 读成 `and`，移除中文字符，压缩多余空白。
- 输出保持 24 kHz、单声道、MP3、64 kbps；每个文件必须大于 1000 字节、时长大于 1 秒，且音频样本不能全静音或包含 NaN/Inf。
- 一批全部成功后，把新结果与旧映射合并；用临时文件加原子替换更新 `app/exampleAudio.ts`，避免中断时破坏映射。
- 映射顺序必须与 `app/exampleData.ts` 的例句顺序一致。
- 如果单条失败，打印 key 和完整错误；不要把失败项写入映射，不要伪造空音频。修复或重试后再提交该批。
- 重复运行同一命令应是幂等的，并自动从下一条未完成例句继续。

先单独提交并推送这项脚本改进：

`chore: make Kokoro audio generation resumable`

## 分批生成与推送

随后循环执行，直到 495 条全部完成：

1. 每批最多生成 25 条尚未完成的例句。
2. 每批结束后核对：
   - 本批每个 key 都出现在 `app/exampleAudio.ts`；
   - 映射指向的文件真实存在；
   - 没有 0 字节、过短、静音或损坏的文件；
   - `git diff --check` 通过；
   - 除生成脚本、`app/exampleAudio.ts` 和 `public/audio/examples/*.mp3` 外，没有意外修改。
3. 完成一批就提交并立即推送到 `origin/main`，不要等全部 495 条完成后再一次性推送。
4. 提交信息使用以下格式，数字填写实际累计进度：

   `audio: add Kokoro examples <首个key>-<最后key> (<累计数>/495)`

5. 推送被拒绝时，只能先 fetch/rebase 自己的提交再重试；不得使用 `--force` 或 `--force-with-lease`。

特别注意：当前映射有 `p03r07`，但缺少 `p03r06`。必须按“下一条缺失项目”判断，不得简单从最后一个现有 key 之后开始，否则会永久漏掉 `p03r06`。

## 完成后的总体验证

全部生成完成后必须提供机器可核验的结果：

- `app/exampleData.ts` 中非空英文例句数 = 495。
- `app/exampleAudio.ts` 中唯一 key 数 = 495。
- `public/audio/examples/` 中被映射的 MP3 数 = 495。
- 例句 key、映射 key、实际文件三者集合完全一致；无缺失、无重复映射、无孤立 MP3。
- 对全部文件运行 `ffprobe` 或等价检查，确认可解码、24 kHz、单声道、时长大于 1 秒。
- 使用 Node.js `>=22.13.0` 构建。若 macOS 没有 GNU `timeout`，不要修改产品代码来绕过；可直接运行 `node_modules/.bin/vinext build`，随后运行 `bash scripts/validate-artifact.sh`。
- 构建和 artifact 验证必须成功。
- 最终 `git status --short` 必须为空，`git rev-parse HEAD` 必须与 `git ls-remote origin refs/heads/main` 返回的远端提交一致。

## 严禁事项

- 不修改例句文字、中文翻译、单词数据、词源数据或学习逻辑。
- 不修改页面设计、按钮行为、浏览器动态 Kokoro 回退逻辑或学习数据导入/导出功能。
- 不删除现有 16 个 MP3，也不重新生成它们。
- 不提交 `node_modules/`、`dist/`、模型权重、Python 环境、缓存、临时文件或日志。
- 不部署到 ChatGPT Sites；本任务只负责本地生成和 GitHub 分批提交。最终部署与验收由我方完成。
- 不进行 force push、reset --hard、历史重写或大范围无关重构。

## 最终交付报告

完成后请只报告可核验事实：

1. 最终提交 SHA。
2. 已完成数量，例如 `495/495`。
3. 所有批次提交 SHA 列表。
4. 失败后重试过的 key（如有）及处理结果。
5. 音频完整性检查、构建和 artifact 验证的结果。
6. 明确说明是否有任何未完成项或偏离上述要求的地方。

不要只说“完成了”，也不要要求我方根据截图判断；请提供命令输出摘要和准确数字，等待我方最终验收。
