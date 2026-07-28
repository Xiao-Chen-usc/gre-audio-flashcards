import type { WordCard } from "./wordData";

export type OriginPart = {
  form: string;
  meaningZh: string;
};

export type OriginView = {
  label: string;
  formula: string;
  parts: OriginPart[];
  memoryZh: string;
  chain: string[];
};

const SPECIAL: Record<string, OriginView> = {
  buoy: {
    label: "日耳曼语词源 · 语义演变",
    formula: "“信号标记” → “浮标” → “托起、支持”",
    parts: [
      { form: "*baukna-", meaningZh: "信标、信号（beacon, signal）" },
      { form: "boeye", meaningZh: "浮标；水上的标记物" },
    ],
    memoryZh:
      "浮标漂在水面并托住东西 → buoy 作动词表示“使浮起、支撑”；buoyed 即“受到支持、被提振”。",
    chain: [
      "原始日耳曼语 *baukna-（信标、信号）",
      "中古荷兰语 boeye（浮标）",
      "中古英语 boye（浮标）",
      "现代英语 buoy / buoyed（使浮起；支持、鼓舞）",
    ],
  },
  abstracted: {
    label: "拉丁语词根组合",
    formula: "ab-/abs- + tract",
    parts: [
      { form: "ab-/abs-", meaningZh: "离开、从……脱离" },
      { form: "tract", meaningZh: "拉、拖（来自拉丁语 trahere）" },
    ],
    memoryZh:
      "把某物从原处“拉开、抽走” → 抽离、脱离；人的注意力被抽走 → 心不在焉。",
    chain: [
      "拉丁语 abstrahere（拉开、抽走）",
      "拉丁语 abstractus（被拉开的）",
      "现代英语 abstract / abstracted",
    ],
  },
  surreptitious: {
    label: "拉丁语词根组合",
    formula: "sub- + rapere",
    parts: [
      { form: "sub-", meaningZh: "在下面；暗中" },
      { form: "rapere", meaningZh: "抓走、夺取" },
    ],
    memoryZh:
      "暗中把东西抓走 → 偷偷取得的 → 秘密的、暗中的。sub- 在后面的 r 前发生同化，词形变为 sur-/surr-。",
    chain: [
      "拉丁语 sub- + rapere（暗中 + 抓走）",
      "拉丁语 surripere / surreptus（暗中夺取；偷走）",
      "拉丁语 surrepticius（偷来的；秘密进行的）",
      "现代英语 surreptitious",
    ],
  },
  undergird: {
    label: "现代英语复合词",
    formula: "under + gird",
    parts: [
      { form: "under", meaningZh: "在下方" },
      { form: "gird", meaningZh: "束住、围住" },
    ],
    memoryZh: "从下面束紧、托住 → 支撑；作为基础",
    chain: [
      "古英语 gyrdan（围住、束住）",
      "现代英语 gird",
      "现代英语 undergird",
    ],
  },
  faithful: {
    label: "现代英语派生词",
    formula: "faith + -ful",
    parts: [
      { form: "faith", meaningZh: "信任、忠诚、信念" },
      { form: "-ful", meaningZh: "充满……的；具有……的" },
    ],
    memoryZh: "具有信实、可靠的性质 → 忠实的；也可指准确反映原貌",
    chain: [
      "拉丁语 fides（信任、忠诚）",
      "古法语 feid / fei（信仰、信任）",
      "中古英语 faith（信仰、信任）",
      "现代英语 faithful",
    ],
  },
  discernment: {
    label: "现代英语派生词",
    formula: "discern + -ment",
    parts: [
      { form: "discern", meaningZh: "辨别、看清" },
      { form: "-ment", meaningZh: "动作、结果或状态" },
    ],
    memoryZh: "辨别出来的能力或结果 → 洞察力、判断力",
    chain: [
      "拉丁语 discernere（分开、辨别）",
      "古法语 discerner（分辨、识别）",
      "中古英语 discernen（辨别、理解）",
      "现代英语 discernment",
    ],
  },
};

const PREFIXES: Array<[string, string]> = [
  ["counter", "反对；相对"],
  ["inter", "在……之间；相互"],
  ["under", "在下方；不足"],
  ["over", "在上方；过度"],
  ["after", "在……之后"],
  ["fore", "在前；预先"],
  ["self", "自己；自身"],
  ["super", "在上；超过"],
  ["anti", "反对；抗"],
  ["post", "在……之后"],
  ["pre", "在……之前"],
  ["non", "不；非"],
  ["mis", "错误地；坏地"],
  ["dis", "分开；否定"],
  ["out", "向外；超过"],
  ["sub", "在下；次级"],
  ["un", "不；相反"],
  ["re", "再次；回"],
  ["co", "共同；一起"],
];

const SUFFIXES: Array<[string, string]> = [
  ["ization", "使成为……的过程或结果"],
  ["isation", "使成为……的过程或结果"],
  ["ability", "能够……的性质"],
  ["ibility", "能够……的性质"],
  ["lessness", "没有……的状态"],
  ["fulness", "充满……的状态"],
  ["ation", "动作、过程或结果"],
  ["ition", "动作、过程或结果"],
  ["ment", "动作、结果或状态"],
  ["ness", "性质或状态"],
  ["less", "没有……的"],
  ["ful", "充满……的；具有……的"],
  ["able", "能够……的"],
  ["ible", "能够……的"],
  ["ous", "具有……性质的"],
  ["ive", "有……倾向或性质的"],
  ["ity", "性质或状态"],
  ["ism", "状态、观念或主义"],
  ["ist", "从事者或持某观念的人"],
  ["ize", "使成为；使……化"],
  ["ise", "使成为；使……化"],
  ["al", "与……有关的"],
  ["ic", "与……有关的；具有……性质的"],
  ["ly", "以……方式"],
];

const BAD_NODE =
  /\b(used|from greek|sense of|in different forms|powder|opposite of)\b|（\d{3,4}s?）|\(\d{3,4}s?\)/i;
const LANG = /^(原始印欧语|原始日耳曼语|古英语|中古英语|古诺斯语|古高地德语|古法语|中古法语|通俗拉丁语|晚期拉丁语|中世纪拉丁语|拉丁语|希腊语|法语|德语|荷兰语|意大利语|西班牙语|阿拉伯语|苏格兰语|希伯来语|梵语)\s+/;
const HAS_CHINESE_GLOSS = /（[^）]*[\u3400-\u9fff][^）]*）/;

function titleCaseLanguage(raw: string) {
  return raw.replace(/^英语\b/, "现代英语").trim();
}

function cleanChain(card: WordCard) {
  const segment = card.origin
    .replace(/^原形 [^；]+；/, "")
    .split("｜")
    .find((part) => part.includes("←"));
  if (!segment) return [];

  const nodes = segment
    .split("←")
    .map((node) => titleCaseLanguage(node.replace(/。$/, "").trim()))
    .filter((node) => node && !BAD_NODE.test(node))
    .filter((node) => node.startsWith("现代英语") || LANG.test(node))
    // A bare historical form is useless to a learner. Only curated nodes with
    // a Chinese gloss may be shown; unglossed legacy nodes stay hidden.
    .filter((node) => node.startsWith("现代英语") || HAS_CHINESE_GLOSS.test(node))
    .reverse();

  if (nodes.length < 2) return [];
  const result = nodes.slice(-3);
  result[result.length - 1] = `现代英语 ${card.originQuery}`;
  return [...new Set(result)];
}

function modernFormation(card: WordCard): OriginView | null {
  const word = card.originQuery.toLowerCase();
  const isEnglishFormation =
    /英语内部|英语复合词| \+ |＋/.test(card.origin) ||
    PREFIXES.some(([prefix]) => word.startsWith(prefix) && word.length > prefix.length + 3);
  if (!isEnglishFormation) return null;

  const prefix = PREFIXES.find(
    ([form]) => word.startsWith(form) && word.length > form.length + 3,
  );
  const remainder = prefix ? word.slice(prefix[0].length) : word;
  const suffix = SUFFIXES.find(
    ([form]) => remainder.endsWith(form) && remainder.length > form.length + 2,
  );
  const base = suffix
    ? remainder.slice(0, -suffix[0].length)
    : remainder;

  const parts: OriginPart[] = [];
  if (prefix) parts.push({ form: prefix[0], meaningZh: prefix[1] });
  if (base && (prefix || suffix)) {
    parts.push({ form: base, meaningZh: "" });
  }
  if (suffix) parts.push({ form: `-${suffix[0]}`, meaningZh: suffix[1] });
  if (parts.length < 2) return null;

  return {
    label: prefix && !suffix ? "现代英语复合 / 前缀构词" : "现代英语派生词",
    formula: parts.map((part) => part.form).join(" + "),
    parts,
    memoryZh: `${parts.map((part) => part.form).join(" + ")} → ${card.meaning}`,
    chain: cleanChain(card),
  };
}

function historicalOrigin(card: WordCard): OriginView {
  const chain = cleanChain(card);
  const oldest = chain[0]?.match(LANG);
  const label = oldest ? `${oldest[1]}来源` : "";
  return {
    label,
    formula: "",
    parts: [],
    memoryZh: "",
    chain,
  };
}

export function getOriginView(card: WordCard): OriginView {
  return (
    SPECIAL[card.originQuery.toLowerCase()] ??
    modernFormation(card) ??
    historicalOrigin(card)
  );
}
