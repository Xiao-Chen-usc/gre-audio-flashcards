import type { WordCard } from "./wordData";

export type OriginView = {
  paragraph: string;
};

const CURATED: Record<string, string> = {
  buoy:
    "buoy 最初指“固定在某处、用于指示水下物体位置或标记航道的浮标”。该词最早见于13世纪晚期，当时写作 boie，可能来自古法语 buie 或中古荷兰语 boeye；这些形式可能进一步源自原始日耳曼语 *baukna-，意为“beacon, signal（信标、信号）”。由于浮标能够漂在水面并托住物体，buoy 后来发展出“使浮起、支撑、鼓舞”的动词义；buoyed 因而可以表示“受到支持或鼓舞”。",
  abstracted:
    "abstracted 来自 abstract。abstract 在14世纪后期由拉丁语 abstractus 进入英语；abstractus 是 abstrahere 的过去分词，由 ab-/abs- “away from（离开）”和 trahere “to draw, pull（拉、拖）”组成，字面意思是“被拉开、被抽走”。由此产生“抽离、脱离”的含义；用来形容人的注意力时，则表示注意力仿佛被抽走，即“心不在焉的”。",
  surreptitious:
    "surreptitious 在15世纪中期进入英语，来自拉丁语 surrepticius “stolen, furtive, clandestine（偷来的、暗中的）”。该词与 surripere “to seize secretly（暗中夺取）”有关；surripere 由 sub- “under, secretly（在下面、暗中）”和 rapere “to seize, snatch（抓走、夺取）”构成。sub- 在 r 前发生语音同化，形成 surr-，所以整个词的核心图景是“暗中把东西抓走”，后来引申为“秘密进行的、偷偷摸摸的”。",
  undergird:
    "undergird 由现代英语 under “underneath（在下面）”和 gird “to bind, encircle（束住、围住）”组成，16世纪初已有书面记录。它最初表示“从下面绑紧或加固”，由此自然发展出“从下方托住、支撑”和“为某事提供基础”的含义。",
  faithful:
    "faithful 由 faith 和形容词后缀 -ful 组成，字面意思是“full of faith（充满信实或忠诚的）”。faith 经古法语 feid、fei 进入中古英语，更早来自拉丁语 fides “trust, faith, confidence（信任、信念、忠诚）”。因此 faithful 的核心含义是“忠实的、可信赖的”；用于描述文字或再现时，也可以表示“忠于原物的、准确的”。",
  discernment:
    "discernment 在16世纪后期形成于 discern 加名词后缀 -ment。discern 经中古英语 discernen 和古法语 discerner，来自拉丁语 discernere “to separate, distinguish（分开、辨别）”。因此 discernment 原本就是“辨别的行为或能力”，后来稳定表示“洞察力、判断力”。",
  proliferate:
    "proliferate 由拉丁语 proles “offspring（后代）”和 ferre “to bear（生育、产生）”构成，原来的图景是“繁殖后代”。进入英语后，它既可指生物迅速繁殖，也可泛指事物“大量增加、激增”。",
  basic:
    "basic 由 base 加形容词后缀 -ic 构成。base 经法语进入英语，最终与希腊语 basis “step, pedestal, foundation（脚步、基座、基础）”有关；因此 basic 的核心意思是“构成基础的”，再引申为“最基本的”。",
  patchwork:
    "patchwork 由 patch “补丁、碎片”和 work “制品”组成，最初指把不同布片缝合起来的拼布。后来它被比喻性地用于由许多不一致部分拼凑成的事物，所以可表示“拼凑物、杂乱组合”。",
  encyclopedic:
    "encyclopedic 来自 encyclopedia 加形容词后缀 -ic。encyclopedia 最终源自希腊语 enkyklios paideia，字面是“general education（全面的教育）”；因此 encyclopedic 表示“像百科全书一样范围广、知识全面的”。",
  neglected:
    "neglected 是 neglect 的过去分词。neglect 来自拉丁语 neglegere “to disregard, not heed（忽视、不理会）”，其中 nec- 表示否定，legere 有“选择、收集”之意；被 neglect 的事物就是“遭到忽视的”。",
  forsaken:
    "forsaken 是 forsake 的过去分词；forsake 源自古英语 forsacan “to refuse, renounce, give up（拒绝、放弃）”。因此 forsaken 原指“被放弃的”，用于人或地方时便有“被遗弃的、荒凉的”意味。",
  extoll:
    "extoll 来自拉丁语 extollere “to lift up, raise（举起、抬高）”，由 ex- “up, out（向上、向外）”和 tollere “to lift（举起）”构成。把一个人或事物在言辞中“高高举起”，就是“高度赞扬”。",
  maladroit:
    "maladroit 直接借自法语，由 mal “badly（糟糕地）”和 adroit “skillful（熟练的）”构成，字面就是“做得不熟练”。因此它表示“笨拙的、不机敏的”。",
  frustrated:
    "frustrated 来自 frustrate；frustrate 源自拉丁语 frustrari “to disappoint, deceive（使失望、使落空）”，与 frustra “in vain（徒劳地）”有关。计划落空所造成的状态，就是“受挫的、沮丧的”。",
  stubborn:
    "stubborn 在中古英语中已有记录，早期拼写包括 stiborn 等，但更早来源并不确定。它长期表示“难以移动、难以说服”，由物理上的“坚硬不动”发展为性格上的“固执”。",
  inconsequential:
    "inconsequential 由 in- “not（不）”和 consequential “有逻辑后果的、重要的”构成。它早期可指“推不出结论、前后不相干”，随后发展出“不会带来重要后果”的意思，即“无关紧要的”。",
  lambasts:
    "lambast（也写作 lambaste）的来源并不完全确定，通常被解释为 lam “to beat（打）”与 baste “to thrash（痛打）”的结合，17世纪已有“殴打”的用法。后来动作从身体攻击转为言语攻击，于是表示“严厉斥责”。",
  brilliance:
    "brilliance 来自 brilliant 加名词后缀 -ance。brilliant 经法语 brillant 进入英语，原本表示“shining（闪耀的）”；从光芒耀眼引申为才智出众，brilliance 因而既可指“光辉”，也可指“卓越、才华”。",
  cynical:
    "cynical 经拉丁语 cynicus 来自希腊语 kynikos “dog-like（像狗的）”。古希腊犬儒学派因蔑视社会习俗而得名；后来该词不再只指这一学派，而转为“怀疑他人动机、愤世嫉俗的”。",
  jaded:
    "jaded 来自 jade 的动词义。jade 曾指一匹“worn-out horse（疲惫不堪的马）”，把马骑到精疲力竭便是 to jade；因此 jaded 先表示“疲惫的”，又引申为因经历过多而“厌倦、麻木的”。",
  survival:
    "survival 由 survive 加名词后缀 -al 构成。survive 来自拉丁语 supervivere，由 super- “beyond（超过）”和 vivere “to live（活着）”组成，字面是“活过某个时间或事件”，所以 survival 表示“幸存、生存”。",
  hierarchical:
    "hierarchical 来自 hierarchy 加形容词后缀 -ical。hierarchy 最终源自希腊语 hieros “sacred（神圣的）”和 arkhein “to rule（统治）”，原指教会中的神圣统治等级，后来泛指任何按层级排列的体系。",
  chimerical:
    "chimerical 来自 Chimera。Chimera 是希腊神话中由狮、羊、蛇等部分拼成的怪兽；因其形象怪异且不真实，chimera 后来表示“幻想”，chimerical 也就表示“幻想的、不切实际的”。",
  rudimentary:
    "rudimentary 来自 rudiment 加后缀 -ary。rudiment 源自拉丁语 rudimentum “first attempt, beginning（初次尝试、开端）”；因此 rudimentary 表示“处于最初阶段的”，也就是“初步的、基础的”。",
  salience:
    "salience 来自 salient 加名词后缀 -ence。salient 源自拉丁语 salire “to leap（跳跃）”，原有“向外跃出、突出”的图景；由空间上的突出发展为注意力上的突出，salience 因而表示“显著性、重要性”。",
  senescence:
    "senescence 来自拉丁语 senescere “to grow old（变老）”，它又与 senex “old man（老人）”同源。这个词直接表示生物随年龄增长而发生的“衰老过程”。",
  wayward:
    "wayward 在中古英语中由表示“away（离开）”的成分与 -ward “朝向”形成，早期图景是“转离正路”。因此它从方向上的偏离，引申为行为上的“任性、不受约束”。",
  painstaking:
    "painstaking 由 pains “辛苦、费心”与 taking 构成，原来的说法 take pains 意为“费力、下苦功”。能 painstaking 地做事，就是“肯下苦功的”；形容工作时则表示“极其仔细的”。",
  idiosyncratic:
    "idiosyncratic 来自 idiosyncrasy；后者源自希腊语 idios “one’s own（个人自己的）”和 synkrasis “mixture, temperament（混合、气质）”。它原指个人特有的体质或气质，后来泛指“独特的、个人特有的”。",
  cloying:
    "cloying 来自 cloy，cloy 在中古英语中先有“堵住、钉住”的意思，后来发展为“用过量的甜食使人腻烦”。因此 cloying 形容甜味或情感“过分甜腻，令人厌烦”。",
  foundational:
    "foundational 由 foundation 加形容词后缀 -al 构成。foundation 源自拉丁语 fundus “bottom, base（底部、基础）”；因此 foundational 表示“作为基础的、奠基性的”。",
  allied:
    "allied 是 ally 的过去分词。ally 经古法语 alier 来自拉丁语 alligare “to bind to（绑在一起）”，由 ad- “to（向）”和 ligare “to bind（捆绑）”组成；被“绑到一起”的双方就是“结盟的、相关联的”。",
  tiresome:
    "tiresome 由 tire “使疲倦、厌烦”和 -some “具有……倾向的”构成，字面就是“会使人疲倦的”，因此表示“令人厌烦的”。",
  exceptional:
    "exceptional 由 exception 加形容词后缀 -al 构成。exception 最终来自拉丁语 excipere “to take out（取出、排除）”；被从一般规则中“取出来”的事物是例外，因此 exceptional 可表示“例外的”，也可表示“异乎寻常地优秀的”。",
  idealistic:
    "idealistic 由 ideal 加 -istic 构成。ideal 最终源自希腊语 idea “form, pattern（形态、范型）”；idealistic 原指依照理想或观念看待事物，因而可表示“理想主义的、不切实际的”。",
  sidestep:
    "sidestep 由 side “侧面”与 step “迈步”组成，最初就是“向旁边迈一步”。从身体上让开障碍，引申为在讨论或行动中“避开、回避”问题。",
  hypotheses:
    "hypothesis 源自希腊语 hypothesis，由 hypo- “under（在下）”和 thesis “placing, proposition（放置、命题）”构成，字面是“放在论证下面作为基础的东西”。因此它表示有待检验的“假设”。",
  preconception:
    "preconception 由 pre- “before（预先）”和 conception “形成的观念”构成，字面是“在接触事实之前已经形成的想法”，所以表示“先入之见”。",
  showy:
    "showy 由 show 加形容词后缀 -y 构成，原意是“适合展示、引人注目的”。当“展示”超过实际内容时，它便带有贬义，表示“炫耀的、华而不实的”。",
  inessential:
    "inessential 由否定前缀 in- “not（不）”和 essential “必不可少的”构成，字面即“不是必需的”，所以表示“非必要的、无关紧要的”。",
  flummox:
    "flummox 在19世纪初作为英格兰方言词进入书面英语，最初可表示“弄乱、使失败”。它的更早来源不明；现代主要表示“使困惑、使不知所措”。",
  enamored:
    "enamored 来自 enamor；enamor 经古法语 enamourer 形成于 en- “使进入某种状态”和 amour “love（爱）”。字面是“使陷入爱中”，所以 be enamored of 表示“迷恋、倾心于”。",
  formulaic:
    "formulaic 由 formula 加形容词后缀 -ic 构成。formula 是拉丁语 forma “form（形式）”的指小词，原意是“small form（小型范式）”，后来表示固定规则或套式；formulaic 因而表示“公式化的、套用固定模式的”。",
  atypical:
    "atypical 由希腊来源的否定前缀 a- “not（不）”和 typical “典型的”构成，字面即“不典型的”，所以表示“非典型的、反常的”。",
  gainsaid:
    "gainsaid 是 gainsay 的过去式；gainsay 由中古英语 gain- “against（反对）”和 say “说”组成，字面是“说反对的话”，因此表示“否认、反驳”。",
  iconoclastic:
    "iconoclastic 来自 iconoclast；iconoclast 源自希腊语 eikon “image（圣像、图像）”和 klastes “breaker（破坏者）”，原指破坏宗教圣像的人。后来它泛指挑战既有信条或传统的人，iconoclastic 因而表示“打破传统的”。",
  avocational:
    "avocational 来自 avocation 加 -al。avocation 源自拉丁语 avocare “to call away（叫开、使离开）”，由 ab- “away（离开）”和 vocare “to call（呼唤）”组成；它后来指把人从本职工作中叫开的“业余爱好”。",
  lacunae:
    "lacunae 是 lacuna 的复数。lacuna 直接来自拉丁语 lacuna “hole, pit, gap（洞、坑、空缺）”，因此在文本或知识中表示“缺失、空白”。",
  paradigmatic:
    "paradigmatic 来自 paradigm；paradigm 源自希腊语 paradeigma “pattern, example（范型、例子）”，由 para- “beside（在旁）”和 deiknynai “to show（展示）”构成。它因此表示“可作为典范或模式的”。",
  archetypal:
    "archetypal 来自 archetype；archetype 源自希腊语 arche “beginning, origin（开端、起源）”和 typos “model, impression（模型、印记）”。它指最初的原型，因此 archetypal 表示“原型的、最典型的”。",
  exacting:
    "exacting 来自 exact 的动词义。exact 源自拉丁语 exigere “to drive out, demand, measure（驱出、要求、衡量）”；to exact 是“强行要求”，因此 exacting 表示“要求苛刻的、费力的”。",
  preachy:
    "preachy 由 preach “讲道、劝诫”和 -y 构成。它形容说话像在不停讲道，通常带贬义，表示“爱说教的”。",
  belying:
    "belying 来自 belie；belie 源自古英语 beleogan “to deceive by lying（用谎言欺骗）”，由 be- 和 leogan “to lie（说谎）”组成。后来它发展出“给人错误印象、掩盖真实情况”的意思。",
  learned:
    "learned 是 learn 的过去分词形容词，原本就是“通过学习获得知识的”。当它读作 /ˈlɜːrnɪd/ 时，通常表示“博学的、有学问的”。",
  ephemeral:
    "ephemeral 来自希腊语 ephemeros “lasting only one day（只持续一天的）”，由 epi “on, for（在……期间）”和 hemera “day（日）”构成。它从“一日之久”泛化为“短暂的、转瞬即逝的”。",
  totemic:
    "totemic 来自 totem 加 -ic。totem 经英语转写自奥吉布瓦语 doodem “clan（氏族）”，原指代表氏族亲缘关系的动物或标志；totemic 因而表示“具有图腾或象征意义的”。",
  altruistic:
    "altruistic 来自 altruism。altruism 经法语 altruisme 形成于意大利语 altrui “other people（他人）”，最终与拉丁语 alter “other（另一个）”同源；核心意思是把他人的利益置于自己的利益之前。",
  antagonistic:
    "antagonistic 来自 antagonist；antagonist 源自希腊语 antagonistes “opponent（对手）”，由 anti- “against（反对）”和 agon “contest（竞赛、斗争）”组成。因此 antagonistic 表示“对抗的、敌对的”。",
  kinfolk:
    "kinfolk 由 kin “亲属、同族”与 folk “人们”组成，字面就是“同族的人们”，所以表示“亲属、家人”。",
  abeyant:
    "abeyant 来自 abeyance。abeyance 经古法语 abeance 与 baer “to gape, wait expectantly（张口、等待）”有关，原来描写权利处于“等待归属”的状态；因此 abeyant 表示“暂时搁置、尚未生效的”。",
  polymathic:
    "polymathic 来自 polymath；polymath 源自希腊语 polymathes，由 poly- “many（多）”和 mathesis “learning（学习、知识）”构成，字面是“学过很多东西的人”。因此 polymathic 表示“博学多才的”。",
  outdo:
    "outdo 由 out- “beyond（超过）”和 do “做”构成，字面是“做得超过别人”，所以表示“胜过、超过”。",
  settled:
    "settled 来自 settle。settle 与 seat “座位”同源，早期核心图景是“使坐下、使安定”；因此 settled 可表示“安顿好的、稳定的”，也可表示争议已经“解决的”。",
  catalyst:
    "catalyst 来自希腊语 katalysis “dissolution（分解、溶解）”，由 kata- “down, completely（向下、完全）”和 lyein “to loosen（松开）”构成。化学中它指促使反应发生而自身不被消耗的物质，后来比喻“促成变化的人或事”。",
  theatrical:
    "theatrical 来自 theater 加 -ical。theater 最终源自希腊语 theatron “place for seeing（观看的地方）”，与 theasthai “to see（观看）”有关；因此 theatrical 可指“戏剧的”，也可形容言行像舞台表演一样“夸张”。",
  emancipatory:
    "emancipatory 来自 emancipate。emancipate 源自拉丁语 emancipare，原指把子女从家长的法律权力中释放；其中 e-/ex- 表示“out（离开）”，mancipare 与正式转让所有权有关。它后来泛指“解放”，emancipatory 因而表示“具有解放作用的”。",
  symbiotic:
    "symbiotic 来自 symbiosis；symbiosis 源自希腊语 symbiosis “living together（共同生活）”，由 syn- “together（共同）”和 bios “life（生命）”构成。因此 symbiotic 表示“共生的、相互依存的”。",
  antics:
    "antics 来自 antic。antic 经意大利语 antico “antique（古代的）”进入英语，最初指在古罗马遗迹壁画中发现的怪诞装饰人物；这些夸张姿态使该词后来表示“滑稽、古怪的举动”。",
  optional:
    "optional 来自 option 加形容词后缀 -al。option 源自拉丁语 optare “to choose, desire（选择、希望）”；因此 optional 表示“可以选择的、非强制的”。",
  scathing:
    "scathing 来自 scathe。scathe 源自古诺斯语 skatha “to harm（伤害）”；scathing 原有“造成伤害的”意思，后来主要形容批评或言辞像伤害一样尖锐，即“严厉尖刻的”。",
  invalidate:
    "invalidate 由否定前缀 in- “not（不）”、valid “有效的”和动词后缀 -ate 构成，字面是“使之不再有效”，所以表示“使无效、推翻”。",
  mythical:
    "mythical 来自 myth 加 -ical。myth 最终源自希腊语 mythos “speech, story（言说、故事）”；mythical 原指“属于神话的”，也可由神话的不真实性引申为“虚构的、难以置信的”。",
};

const BAD_FRAGMENT =
  /\b(used|from greek|sense of|in different forms|powder)\b|^\s*(to|not|apart|again|first)\s*$/i;

const PREFIXES: Array<[string, string]> = [
  ["counter", "against, opposite（反对、相对）"],
  ["inter", "between, among（在……之间、相互）"],
  ["under", "under, beneath（在下面）"],
  ["over", "above, excessively（在上面、过度）"],
  ["super", "above, beyond（在上、超过）"],
  ["anti", "against（反对）"],
  ["non", "not（不、非）"],
  ["mis", "wrongly, badly（错误地）"],
  ["dis", "apart, away, not（分开、离开、否定）"],
  ["out", "out, beyond（向外、超过）"],
  ["sub", "under（在下面）"],
  ["un", "not, opposite of（不、相反）"],
  ["re", "again, back（再次、回）"],
  ["co", "together（共同）"],
];

const SUFFIXES: Array<[string, string]> = [
  ["ization", "the process of making or becoming（使成为……的过程）"],
  ["ability", "capacity or quality（能力或性质）"],
  ["ibility", "capacity or quality（能力或性质）"],
  ["lessness", "the state of being without（缺少……的状态）"],
  ["fulness", "the state of being full of（充满……的状态）"],
  ["ation", "action, process, or result（动作、过程或结果）"],
  ["ition", "action, process, or result（动作、过程或结果）"],
  ["ment", "action, result, or state（动作、结果或状态）"],
  ["ness", "state or quality（状态或性质）"],
  ["less", "without（没有……的）"],
  ["ful", "full of, characterized by（充满……的、具有……的）"],
  ["able", "capable of（能够……的）"],
  ["ible", "capable of（能够……的）"],
  ["ous", "full of, characterized by（具有……性质的）"],
  ["ive", "having the nature of（具有……性质的）"],
  ["ity", "state or quality（状态或性质）"],
  ["ism", "state, practice, or doctrine（状态、做法或观念）"],
  ["ist", "a person associated with（相关的人）"],
  ["ize", "to make or become（使成为）"],
  ["ise", "to make or become（使成为）"],
  ["ly", "in a specified manner（以某种方式）"],
];

function cleanDate(raw: string) {
  return raw
    .replace(/^原形 [^；]+；/, "")
    .split("｜")[0]
    ?.trim()
    .replace(/。$/, "");
}

function cleanSourceChain(card: WordCard) {
  const segment = card.origin
    .replace(/^原形 [^；]+；/, "")
    .split("｜")
    .find((part) => part.includes("←"));
  if (!segment) return [];

  return segment
    .split("←")
    .map((node) => node.trim().replace(/。$/, ""))
    .filter((node) => node && node !== "英语" && !BAD_FRAGMENT.test(node))
    .slice(0, 4);
}

function earlyGloss(card: WordCard) {
  const gloss =
    card.origin.match(/早期义 [“"]([^”"]+)[”"]/)?.[1]?.trim() ?? "";
  if (!gloss || BAD_FRAGMENT.test(gloss) || gloss.length > 125) return "";
  return gloss;
}

function formationParagraph(card: WordCard) {
  const raw = card.origin.replace(/^原形 [^；]+；/, "");
  const date = cleanDate(card.origin);
  const gloss = earlyGloss(card);
  const compound = raw.match(/英语复合词[：:]\s*(.+?)(?:。|$)/)?.[1]?.trim();
  if (compound) {
    return `${card.originQuery} 是英语复合词，由 ${compound.replace(/[。；]+$/, "")} 构成，整个组合表示“${card.meaning}”。`;
  }

  const explicit = raw.match(/^(.+?)；表示[“"](.+?)[”"]/)?.slice(1);
  if (explicit) {
    return `${card.originQuery} 由 ${explicit[0]} 构成，整体表示“${explicit[1]}”。`;
  }

  const word = card.originQuery.toLowerCase();
  const prefix = PREFIXES.find(
    ([form]) => word.startsWith(form) && word.length > form.length + 3,
  );
  const afterPrefix = prefix ? word.slice(prefix[0].length) : word;
  const suffix = SUFFIXES.find(
    ([form]) => afterPrefix.endsWith(form) && afterPrefix.length > form.length + 2,
  );
  const base = suffix
    ? afterPrefix.slice(0, -suffix[0].length)
    : afterPrefix;
  const pieces = [
    prefix ? `${prefix[0]}- “${prefix[1]}”` : "",
    base && (prefix || suffix) ? base : "",
    suffix ? `-${suffix[0]} “${suffix[1]}”` : "",
  ].filter(Boolean);

  let paragraph = "";
  if (pieces.length >= 2) {
    paragraph = `${card.originQuery} 是英语内部形成的词，由 ${pieces.join(" 和 ")} 构成。`;
  } else if (gloss) {
    paragraph =
      date && !date.includes("英语内部")
        ? `${card.originQuery} 在${date}已有记录`
        : `${card.originQuery} 在英语中形成`;
    paragraph += `，早期表示 “${gloss}”`;
    paragraph += `；现代常用来表示“${card.meaning}”。`;
    return paragraph;
  } else {
    return "";
  }

  if (gloss) {
    paragraph += `它早期表示 “${gloss}”`;
    paragraph += `；现代常用来表示“${card.meaning}”。`;
  } else {
    paragraph += `字面构词与“${card.meaning}”这一含义直接相连。`;
  }
  return paragraph;
}

function historicalParagraph(card: WordCard) {
  const sources = cleanSourceChain(card);
  const gloss = earlyGloss(card);
  const date = cleanDate(card.origin);

  if (!sources.length) return formationParagraph(card);

  const opening =
    date && !date.includes("←") && !date.includes("英语内部")
      ? `${card.originQuery} 最早见于${date}`
      : `${card.originQuery} 进入英语后`;
  const [nearest, ...older] = sources;
  let paragraph = `${opening}，来自${nearest}`;
  if (older.length === 1) {
    paragraph += `，更早可追溯至${older[0]}`;
  } else if (older.length > 1) {
    paragraph += `，其历史形式还可向前追溯为${older.join("、")}`;
  }
  paragraph += "。";
  if (gloss) {
    paragraph = paragraph.slice(0, -1);
    paragraph += `，早期表示 “${gloss}”。`;
  }
  return paragraph;
}

export function getOriginView(card: WordCard): OriginView {
  return {
    paragraph:
      CURATED[card.originQuery.toLowerCase()] ?? historicalParagraph(card),
  };
}
