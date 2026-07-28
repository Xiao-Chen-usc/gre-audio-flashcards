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
      "中古英语 faith",
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
      "古法语 discerner",
      "中古英语 discernen",
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
    parts.push({ form: base, meaningZh: `核心词干；联系“${card.meaning}”记忆` });
  }
  if (suffix) parts.push({ form: `-${suffix[0]}`, meaningZh: suffix[1] });
  if (parts.length < 2) return null;

  return {
    label: prefix && !suffix ? "现代英语复合 / 前缀构词" : "现代英语派生词",
    formula: parts.map((part) => part.form).join(" + "),
    parts,
    memoryZh: `把各部分合起来理解 → ${card.meaning}`,
    chain: cleanChain(card),
  };
}

function historicalOrigin(card: WordCard): OriginView {
  const chain = cleanChain(card);
  const oldest = chain[0]?.match(LANG);
  const label = oldest ? `${oldest[1]}来源` : "词形与来源";
  return {
    label,
    formula: card.originQuery,
    parts: [
      {
        form: card.originQuery,
        meaningZh: `本词在这组 GRE 语境中表示“${card.meaning}”`,
      },
    ],
    memoryZh: `先用同义词 ${card.pair} 建立联系；历史路径只保留可辨认的语言节点`,
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

