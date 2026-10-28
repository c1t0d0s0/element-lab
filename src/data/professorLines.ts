import { Language } from '../i18n';
import { REACTIONS_DATA, ReactionRule, getReactionName, getReactionEquation } from './reactions';
import { COMPOUNDS_DATA, PhClass, getCompoundName, getCompoundFormula, getCompoundKidHint } from './compounds';
import { ELEMENTS_DATA, getElementName, getFlameReactionInfo } from './elements';
import { GameStats } from './quests';
import { FIREWORK_ELEMENTS, FireworkShape, GOLD_TRAIL_SHAPES } from '../engine/Fireworks';
import { getIonForm, ionEquationProducts } from './ions';
import type { MassCheckResult } from '../engine/MassCheck';

// 博士キャラ (ゲンソ博士) の実況セリフ。DOM に依存しない純粋な関数で選ぶ

export type ProfessorMood = 'excited' | 'happy' | 'warning' | 'thinking';

export interface ProfessorLine {
  text: string;
  mood: ProfessorMood;
  priority: number; // 大きいほど優先 (表示中のセリフより低いものは後回し・間引き)
}

export type ProfessorEvent =
  | { type: 'reaction'; rule: ReactionRule; firstTime: boolean }
  | { type: 'newCompound'; compoundId: string }
  | { type: 'shatter' }
  | { type: 'indicator'; compoundId: string; phClass: PhClass }
  | { type: 'flameTest'; symbol: string }
  | { type: 'firework'; symbols: string[]; shape: FireworkShape }
  | { type: 'goldSparks' }
  | { type: 'dissolve'; compoundId: string }
  | { type: 'saturate'; compoundId: string }
  | { type: 'crystallize'; compoundId: string }
  | { type: 'ionize'; compoundId: string; molten: boolean }
  | { type: 'electrodesOn' }
  | { type: 'cellOn' }
  | { type: 'massCheck'; result: MassCheckResult }
  | { type: 'electrodeElectrolysis'; ruleId: string }
  | { type: 'questComplete'; title: string }
  | { type: 'idle'; stats: GameStats };

export const PROFESSOR_PRIORITY = {
  idle: 1,
  reaction: 2,
  firstReaction: 4,
  discovery: 4,
  quest: 5,
  warning: 6
};

type Bilingual = { ja: string; en: string };

// 天秤で質量保存の法則を確かめたとき
export const MASS_CHECK_LINES: Record<MassCheckResult, Bilingual> = {
  sealed_same: {
    ja: '気体が出てきたのに、全体の質量は変わらないぞ！化学変化では原子の組み合わせが変わるだけで、原子の種類と数は変わらないからじゃ。これを「質量保存の法則」というんじゃ。',
    en: 'Gas formed, yet the total mass did not change! In a chemical change the atoms only change partners; their kinds and numbers stay the same. This is the law of conservation of mass.'
  },
  open_lighter: {
    ja: '軽くなったのは、できた二酸化炭素などの気体が容器の外へ出ていったからじゃ。出ていった気体の質量まで合わせれば、反応の前と同じなんじゃよ。',
    en: 'It got lighter because the gas that formed (such as carbon dioxide) escaped from the container. Add back the mass of the escaped gas and the total is the same as before the reaction.'
  }
};

// 電極をつないだビーカーで、それぞれの電気分解を初めて起こしたとき (電極で何が起きているかを説明する)
export const ELECTRODE_LINES: Record<string, Bilingual> = {
  copper_chloride_electrolysis: {
    ja: '陰極に赤い銅がついたぞ！＋の銅イオン Cu²⁺ が陰極で電子を2個もらって銅になったんじゃ。陽極では−の塩化物イオン Cl⁻ が電子をわたして、塩素 Cl₂ になって出てくるぞ。',
    en: 'Red copper on the cathode! Positive copper ions (Cu²⁺) each picked up two electrons there and became copper. At the anode, negative chloride ions (Cl⁻) gave up electrons and bubbled off as chlorine (Cl₂).'
  },
  water_electrolysis: {
    ja: '陰極から水素、陽極から酸素が出てきたぞ！体積は2：1じゃ。溶かした水酸化ナトリウムのイオンは電流を流れやすくする役目で、自分は変化しないんじゃよ。',
    en: 'Hydrogen from the cathode, oxygen from the anode, in a 2 : 1 volume ratio! The ions from the dissolved sodium hydroxide just help the current flow; they are not used up.'
  },
  brine_electrolysis: {
    ja: '陰極から水素、陽極から塩素が出てきたぞ！陽極では塩化物イオン Cl⁻ が塩素になり、陰極では水が水素になって、まわりに水酸化ナトリウムが残るんじゃ。',
    en: 'Hydrogen from the cathode, chlorine from the anode! Chloride ions (Cl⁻) become chlorine at the anode, while water becomes hydrogen at the cathode and leaves sodium hydroxide behind.'
  },
  salt_electrolysis: {
    ja: '融けた食塩を電気分解したぞ！ナトリウムイオン Na⁺ は陰極でナトリウムに、塩化物イオン Cl⁻ は陽極で塩素になったんじゃ。',
    en: 'You electrolyzed molten salt! Sodium ions (Na⁺) became sodium at the cathode and chloride ions (Cl⁻) became chlorine at the anode.'
  }
};

// 主な反応の専用セリフ (原子から反応する版などは variantOf の反応のセリフを使う)
export const REACTION_LINES: Record<string, Bilingual> = {
  zinc_copper_sulfate: {
    ja: '亜鉛の表面に赤い銅が出てきたぞ！亜鉛は銅よりイオンになりやすいから、亜鉛が電子を出して Zn²⁺ になり、その電子を Cu²⁺ が受け取って銅になったんじゃ。逆に、銅を硫酸亜鉛水溶液に入れても何も起こらんぞ。',
    en: 'Red copper appeared on the zinc! Zinc forms ions more easily than copper, so zinc gave up electrons to become Zn²⁺, and Cu²⁺ took them to become copper. Put copper in zinc sulfate solution instead, and nothing happens.'
  },
  magnesium_copper_sulfate: {
    ja: 'マグネシウムの表面に銅が出てきたぞ！マグネシウムは銅よりずっとイオンになりやすいんじゃ。',
    en: 'Copper appeared on the magnesium! Magnesium forms ions much more easily than copper.'
  },
  magnesium_zinc_sulfate: {
    ja: 'マグネシウムの表面に亜鉛が出てきたぞ！マグネシウムは亜鉛よりもイオンになりやすい。イオンへのなりやすさは Mg ＞ Zn ＞ Cu の順じゃ。',
    en: 'Zinc appeared on the magnesium! Magnesium forms ions even more easily than zinc. The order is Mg > Zn > Cu.'
  },
  iron_copper_sulfate: {
    ja: '鉄くぎの表面が赤い銅でおおわれたぞ！鉄も銅よりイオンになりやすいんじゃ。水溶液はうすい緑色の Fe²⁺ に変わっていくぞ。',
    en: 'The iron got coated with red copper! Iron also forms ions more easily than copper. The solution slowly turns the pale green of Fe²⁺.'
  },
  copper_silver_nitrate: {
    ja: '銅線のまわりに銀の結晶がのびてきたぞ！「銀樹」というんじゃ。銅は銀よりイオンになりやすいから、水溶液は Cu²⁺ の青色になるんじゃよ。',
    en: 'Silver crystals are growing on the copper! This is called a silver tree. Copper forms ions more easily than silver, so the solution turns the blue of Cu²⁺.'
  },
  daniell_cell: {
    ja: 'モーターが回ったぞ！−極の亜鉛板では亜鉛が電子を出して Zn²⁺ になってとけ出し、電子は導線を通って＋極の銅板へ。銅板では Cu²⁺ が電子を受け取って銅になる。物質がもっている化学エネルギーが、電気エネルギーに変わったんじゃ！電流の向きは電子の動きと逆で、銅板から亜鉛板へ流れるぞ。',
    en: 'The motor is turning! At the negative zinc plate, zinc gives up electrons and dissolves as Zn²⁺; the electrons travel through the wire to the positive copper plate, where Cu²⁺ takes them and becomes copper. Chemical energy has turned into electrical energy! Current flows the opposite way to the electrons: from copper to zinc.'
  },
  silver_oxide_decomposition: {
    ja: '黒い酸化銀が、酸素を出して白い銀に変わったぞ！1つの物質が2つ以上に分かれる、これが「分解」じゃ。残った銀はみがくと光って電気を通す、りっぱな金属じゃよ。',
    en: 'The black silver oxide gave off oxygen and turned into white silver! One substance splitting into two or more is called decomposition. The silver left over shines when rubbed and conducts electricity: a true metal.'
  },
  ammonia_generation: {
    ja: 'ツンとするにおいのアンモニアが出てきたぞ！アンモニアは水にとてもよくとけて空気より軽いから、上方置換で集めるんじゃ。',
    en: 'Here comes ammonia with its sharp smell! It dissolves very well in water and is lighter than air, so we collect it by upward displacement of air.'
  },
  magnesium_hcl_reaction: {
    ja: 'マグネシウムがあわを出してとけていくぞ！このあわは水素じゃ。集めて火を近づけると、ポンと音を立てて燃えるんじゃよ。',
    en: 'The magnesium is fizzing away! Those bubbles are hydrogen. Collect them and bring a flame close: they burn with a pop.'
  },
  sulfuric_acid_barium_hydroxide: {
    ja: '白くにごったぞ！中和でできた硫酸バリウムは水にとけないから、沈殿になるんじゃ。イオンが減るので、電流も流れにくくなるぞ。',
    en: 'It turned cloudy white! The barium sulfate made by neutralization does not dissolve in water, so it settles out as a precipitate. With fewer ions left, less current can flow.'
  },
  copper_sulfur_combination: {
    ja: 'ピカピカの銅が真っ黒な硫化銅に変わったぞ！2つの物質が結びついて、もとの銅とはまったくちがう物質になったんじゃ。',
    en: 'The shiny copper turned into pitch-black copper sulfide! Two substances combined into something completely different from the copper.'
  },
  ethanol_combustion: {
    ja: 'エタノールが青白い炎で燃えたぞ！アルコールランプと同じじゃ。燃えたあとには二酸化炭素と水ができておる。石灰水で確かめてみるかの？',
    en: 'The ethanol burned with a pale blue flame, just like an alcohol lamp! Carbon dioxide and water are left behind. Shall we check with limewater?'
  },
  glucose_fermentation: {
    ja: 'ブドウ糖がエタノールと二酸化炭素に分かれたぞ！これがアルコール発酵じゃ。本当は酵母という小さな生き物が何日もかけてやる仕事なんじゃよ。パンがふくらむのも、この二酸化炭素のおかげじゃ。',
    en: 'The glucose split into ethanol and carbon dioxide! This is alcoholic fermentation. In reality tiny yeast cells take days to do it. That carbon dioxide is also what makes bread rise.'
  },
  ethanol_to_acetic_acid: {
    ja: 'エタノールが酸素と結びついて酢酸になったぞ！お酒が酢になるのはこのしくみで、本当は酢酸菌がはたらいておるんじゃ。',
    en: 'The ethanol combined with oxygen and became acetic acid! This is how alcohol turns into vinegar. In reality, acetic acid bacteria do the work.'
  },
  acetic_acid_baking_soda: {
    ja: 'シュワシュワ！お酢と重曹をまぜると二酸化炭素のあわが出るんじゃ。台所でもできる実験じゃよ。',
    en: 'Fizz! Mixing vinegar and baking soda makes bubbles of carbon dioxide. You can try this one in the kitchen too.'
  },
  ethanol_dehydration: {
    ja: '濃硫酸がエタノールから水を引きはがして、エチレンが出てきたぞ！くだものを熟させるガスでもあるんじゃ。',
    en: 'The concentrated sulfuric acid pulled water out of the ethanol, and ethylene came off! It is also the gas that ripens fruit.'
  },
  sodium_water_reaction: {
    ja: 'うわっ！ナトリウムが水の上で走り回って燃えたぞ！アルカリ金属は水が大好きで、水素を出しながら激しく反応するんじゃ。',
    en: 'Whoa! The sodium zipped around on the water and caught fire! Alkali metals love water and react wildly, giving off hydrogen.'
  },
  potassium_water_reaction: {
    ja: 'ドカン！カリウムはナトリウムよりもっと元気じゃ。炎が赤むらさき色なのに気づいたかな？',
    en: 'Boom! Potassium is even livelier than sodium. Did you notice the lilac-colored flame?'
  },
  lithium_water_reaction: {
    ja: 'リチウムは同じ仲間でもおとなしめ。シュワシュワ泡を出して、ゆっくり温かくなるんじゃ。',
    en: 'Lithium is the calm one of the family. It fizzes and slowly warms up.'
  },
  water_combustion: {
    ja: 'ポンッ！水素と酸素が一気に結びついて水になったぞ。ロケットの燃料にも使われる反応じゃ！',
    en: 'Pop! Hydrogen and oxygen joined in an instant to make water. Rockets use this reaction too!'
  },
  magnesium_combustion: {
    ja: 'まぶしい！マグネシウムは目がくらむほど白く光って燃えるんじゃ。花火の白い光もこれじゃよ。',
    en: 'So bright! Magnesium burns with a dazzling white light—the same white sparkle you see in fireworks.'
  },
  thermite_reaction: {
    ja: 'テルミット反応じゃ！アルミニウムが鉄さびから酸素をうばって、鉄がとけるほど熱くなる。線路の溶接にも使うんじゃよ。',
    en: 'The thermite reaction! Aluminium steals oxygen from rust and gets hot enough to melt iron. It is used to weld railway tracks.'
  },
  ammonia_hcl_white_smoke: {
    ja: 'もくもく〜！アンモニアと塩化水素が空中で出会うと、白いけむりの粒(塩化アンモニウム)ができるんじゃ。',
    en: 'Puff! When ammonia meets hydrogen chloride in the air, tiny white smoke grains (ammonium chloride) appear.'
  },
  limewater_co2_turbidity: {
    ja: '石灰水が白くにごった！これは二酸化炭素があるしるし。はく息にも二酸化炭素が入っておるぞ。',
    en: 'The limewater turned cloudy! That means carbon dioxide is here. Your breath contains carbon dioxide too.'
  },
  neutralization: {
    ja: '酸とアルカリが打ち消しあって、水と食塩になったぞ。これが「中和」じゃ！BTB液を入れると緑色になるはずじゃよ。',
    en: 'The acid and alkali cancelled each other out and became water and salt. That is neutralization! BTB would turn green.'
  },
  chemical_heat_pack: {
    ja: 'ぽかぽか〜。使い捨てカイロの中では、鉄がゆっくりさびるときの熱を使っておるんじゃ。',
    en: 'Nice and warm! Disposable hand warmers use the heat released when iron slowly rusts.'
  },
  carbon_complete_combustion: {
    ja: '炭が燃えて二酸化炭素になったぞ。石灰水があれば、白くにごるか確かめてみよう！',
    en: 'The carbon burned into carbon dioxide. If you have limewater, check whether it turns cloudy!'
  },
  methane_combustion: {
    ja: 'ガスコンロの火と同じ反応じゃ。メタンが燃えると二酸化炭素と水ができるんじゃよ。',
    en: 'Same reaction as a gas stove! Burning methane makes carbon dioxide and water.'
  },
  phosphorus_combustion: {
    ja: 'リンは燃えやすくて、白いけむりを出して燃えるんじゃ。マッチの先にもリンの仲間が使われておるぞ。',
    en: 'Phosphorus catches fire easily and burns with white smoke. Match heads use phosphorus compounds too.'
  },
  h2o2_catalytic_decomposition: {
    ja: '二酸化マンガンは自分は変わらずに、過酸化水素から酸素を取り出す手伝いをするんじゃ。これを「触媒」と言う！',
    en: 'Manganese dioxide helps pull oxygen out of hydrogen peroxide without changing itself. That is a catalyst!'
  },
  zinc_acid_reaction: {
    ja: 'あわあわ！亜鉛が塩酸にとけて、水素の泡が出てきたぞ。',
    en: 'Bubbles! The zinc dissolved in hydrochloric acid and gave off hydrogen.'
  },
  copper_oxide_reduction: {
    ja: '黒い酸化銅が、炭素に酸素をうばわれてピカピカの銅にもどったぞ。これが「還元」じゃ！',
    en: 'The black copper oxide had its oxygen stolen by carbon and turned back into shiny copper. That is reduction!'
  },
  sodium_bicarbonate_decomposition: {
    ja: 'ふくらし粉(重曹)を温めると二酸化炭素が出る。ホットケーキがふくらむのはこのおかげじゃ！',
    en: 'Heating baking soda releases carbon dioxide. That is why pancakes puff up!'
  },
  acetylene_combustion: {
    ja: 'アセチレンの炎はとても熱いんじゃ。鉄を切るバーナーにも使われておるぞ。',
    en: 'Acetylene burns extremely hot. It is used in torches that cut through steel!'
  }
};

// 炎色反応はあるが、実際の花火の色には使わない元素の理由
const NOT_IN_FIREWORKS_REASONS: Record<string, Bilingual> = {
  Cs: {
    ja: 'でもセシウムは値段が高く、水や空気とはげしく反応してあぶないので、本物の花火には使わないんじゃ。',
    en: 'But caesium is expensive and reacts violently with water and air, so real fireworks never use it.'
  },
  Rb: {
    ja: 'でもルビジウムは値段が高く、水や空気とはげしく反応してあぶないので、本物の花火には使わないんじゃ。',
    en: 'But rubidium is expensive and reacts violently with water and air, so real fireworks never use it.'
  },
  Li: {
    ja: 'きれいな赤じゃが、花火の赤にはふつうストロンチウムを使うんじゃ。',
    en: 'A lovely red, but fireworks usually get their red from strontium instead.'
  },
  K: {
    ja: '花火ではカリウムは色をつけるためではなく、火薬の材料（硝酸カリウム）として使われておるぞ。',
    en: 'In fireworks, potassium is not used for color—it goes into the gunpowder as potassium nitrate.'
  },
  B: {
    ja: '花火の緑には、ふつうバリウムを使うんじゃ。',
    en: 'Fireworks usually get their green from barium instead.'
  }
};
const NOT_IN_FIREWORKS_DEFAULT: Bilingual = {
  ja: 'この色は、実際の花火にはあまり使われないんじゃ。',
  en: 'This color is rarely used in real fireworks.'
};

// 2回目以降の反応で使う、激しさごとの短いひとこと
const INTENSITY_SHOUTS: Record<string, Bilingual[]> = {
  explosion: [
    { ja: 'ドカーン！！', en: 'KABOOM!!' },
    { ja: 'うわっ、また爆発じゃ！', en: 'Whoa, another explosion!' }
  ],
  ignition: [
    { ja: '燃えた燃えた！', en: 'It caught fire!' },
    { ja: 'ボッ！炎の色にも注目じゃ。', en: 'Fwoosh! Watch the flame color.' }
  ],
  smoke: [
    { ja: 'もくもく…', en: 'Puff puff…' }
  ],
  heat: [
    { ja: 'あちち！熱が出ておるぞ。', en: 'Hot hot! Heat is coming out.' }
  ]
};

const PH_CLASS_NAMES: Record<PhClass, Bilingual> = {
  acid: { ja: '酸性', en: 'acidic' },
  neutral: { ja: '中性', en: 'neutral' },
  alkaline: { ja: 'アルカリ性', en: 'alkaline' }
};

const COLOR_WORDS: Record<string, Record<PhClass, Bilingual>> = {
  BTB: {
    acid: { ja: '黄色', en: 'yellow' },
    neutral: { ja: '緑色', en: 'green' },
    alkaline: { ja: '青色', en: 'blue' }
  },
  Phenolphthalein: {
    acid: { ja: '無色', en: 'colorless' },
    neutral: { ja: '無色', en: 'colorless' },
    alkaline: { ja: '赤むらさき色', en: 'pinkish-red' }
  },
  CabbageJuice: {
    acid: { ja: 'ピンク〜赤色', en: 'pink to red' },
    neutral: { ja: 'むらさき色', en: 'purple' },
    alkaline: { ja: '青〜緑〜黄色', en: 'blue, green or yellow' }
  },
  RedLitmus: {
    acid: { ja: '赤色のまま', en: 'still red' },
    neutral: { ja: '赤色のまま', en: 'still red' },
    alkaline: { ja: '青色', en: 'blue' }
  },
  BlueLitmus: {
    acid: { ja: '赤色', en: 'red' },
    neutral: { ja: '青色のまま', en: 'still blue' },
    alkaline: { ja: '青色のまま', en: 'still blue' }
  }
};

function pick<T>(items: T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length) % items.length];
}

// 溶けやすさが温度でどう変わるか (溶解と溶解度のセリフ用)
const TEMP_SENSITIVE_SOLUTES = ['KNO3', 'Alum', 'Sucrose'];

// 結晶が出てきた時の物質ごとのセリフ
const CRYSTAL_LINES: Record<string, Bilingual> = {
  NaCl: {
    ja: '食塩の結晶が出てきたぞ！食塩は温度を下げても溶ける量がほとんど変わらないから、水を蒸発させて取り出すのがコツじゃ。サイコロのような形の結晶になるんじゃよ。',
    en: 'Salt crystals appeared! The amount of salt that dissolves hardly changes with temperature, so evaporating the water is the way to get it back. Salt crystals are little cubes.'
  },
  KNO3: {
    ja: '硝酸カリウムの結晶が出てきたぞ！温度が下がると溶ける量がぐっと減るから、溶けきれなくなった分が結晶になったんじゃ。これを「再結晶」というぞ。',
    en: 'Potassium nitrate crystals appeared! It dissolves much less when the water cools, so the extra came back out as crystals. This is called recrystallization.'
  },
  Alum: {
    ja: 'ミョウバンの結晶が出てきたぞ！ミョウバンも冷やすと溶ける量がぐっと減るんじゃ。ゆっくり冷やすと、きれいな正八面体の大きな結晶が育つぞ。',
    en: 'Alum crystals appeared! Alum also dissolves much less when cooled. Cool it slowly and beautiful large octahedral crystals grow.'
  },
  Sucrose: {
    ja: '砂糖の結晶が出てきたぞ！砂糖の濃い水溶液からゆっくり結晶を育てたものが氷砂糖なんじゃ。',
    en: 'Sugar crystals appeared! Rock candy is made by slowly growing crystals from a strong sugar solution.'
  }
};

function bi(b: Bilingual, lang: Language): string {
  return lang === 'en' ? b.en : b.ja;
}

function speciesName(type: 'element' | 'compound', id: string, lang: Language): string {
  if (type === 'element') {
    const el = ELEMENTS_DATA[id];
    return el ? `${getElementName(el, lang)}(${id})` : id;
  }
  const comp = COMPOUNDS_DATA[id];
  return comp ? `${getCompoundName(comp, lang)}(${getCompoundFormula(comp, lang)})` : id;
}

// まだ見つけていない反応 (原子版などの別ルートで見つけていれば発見済み扱い)
export function getUndiscoveredReactions(stats: GameStats): ReactionRule[] {
  const found = new Set<string>();
  for (const r of REACTIONS_DATA) {
    if ((stats.triggeredReactions[r.id] || 0) > 0) found.add(r.variantOf ?? r.id);
  }
  return REACTIONS_DATA.filter(r => !r.variantOf && !found.has(r.id));
}

// 発見を後押しするヒント。反応物の1つと、何が起きそうかだけを教える
function idleHint(stats: GameStats, lang: Language, rand: () => number): string | null {
  const candidates = getUndiscoveredReactions(stats);
  if (candidates.length === 0) {
    return lang === 'en'
      ? 'Amazing… you have found every reaction! You are a true chemist!'
      : 'すごい…すべての反応を見つけてしまったのか！きみは立派な化学者じゃ！';
  }
  // 激しい反応を優先してヒントにする (子どもが試したくなるもの)
  const exciting = candidates.filter(r => (r.intensities ?? []).length > 0);
  const rule = pick(exciting.length > 0 ? exciting : candidates, rand);
  const first = rule.reactants[0];
  const name = speciesName(first.type, first.id, lang);
  const intensity = rule.intensities?.[0];
  const teaserJa: Record<string, string> = {
    explosion: 'ドカンと爆発するかも…！？',
    ignition: '火がつくかも…！？',
    smoke: 'けむりが出るかも…！？',
    heat: '熱くなるかも…！？'
  };
  const teaserEn: Record<string, string> = {
    explosion: 'something might go BOOM…!?',
    ignition: 'it might catch fire…!?',
    smoke: 'smoke might appear…!?',
    heat: 'it might get hot…!?'
  };
  const needsHeat = rule.condition.minTemp !== undefined && rule.condition.minTemp > 50;
  if (lang === 'en') {
    const tail = intensity ? teaserEn[intensity] : 'something new might happen!';
    return `Hmm, there are still reactions to discover. Try combining ${name} with something${needsHeat ? ' and heating it' : ''}… ${tail}`;
  }
  const tail = intensity ? teaserJa[intensity] : '新しい発見があるかも！';
  return `ふむ、まだ見つけていない反応があるぞ。${name}と何かを組み合わせて${needsHeat ? '温めて' : ''}みると…${tail}`;
}

export function selectProfessorLine(
  event: ProfessorEvent,
  lang: Language,
  rand: () => number = Math.random
): ProfessorLine | null {
  switch (event.type) {
    case 'reaction': {
      const rule = event.rule;
      if (event.firstTime) {
        const custom = REACTION_LINES[rule.variantOf ?? rule.id];
        const text = custom
          ? bi(custom, lang)
          : (lang === 'en'
            ? `New discovery! "${getReactionName(rule, lang)}"  ${getReactionEquation(rule, lang)}`
            : `新発見じゃ！「${getReactionName(rule, lang)}」 ${rule.equation}`);
        return { text, mood: 'excited', priority: PROFESSOR_PRIORITY.firstReaction };
      }
      const intensity = rule.intensities?.[0];
      if (!intensity) return null;
      return { text: bi(pick(INTENSITY_SHOUTS[intensity], rand), lang), mood: 'excited', priority: PROFESSOR_PRIORITY.reaction };
    }
    case 'newCompound': {
      const comp = COMPOUNDS_DATA[event.compoundId];
      if (!comp) return null;
      if (comp.isToxic) {
        const text = lang === 'en'
          ? `Careful! ${getCompoundName(comp, lang)} is poisonous. In a real lab, keep the room well ventilated.`
          : `気をつけて！${getCompoundName(comp, lang)}は体に毒なんじゃ。本物の実験では、部屋の換気をしっかりするんじゃぞ。`;
        return { text, mood: 'warning', priority: PROFESSOR_PRIORITY.warning };
      }
      const prefix = lang === 'en' ? `You made ${getCompoundName(comp, lang)}! ` : `${getCompoundName(comp, lang)}ができたぞ！ `;
      return { text: prefix + getCompoundKidHint(comp, lang), mood: 'happy', priority: PROFESSOR_PRIORITY.discovery };
    }
    case 'shatter':
      return {
        text: lang === 'en'
          ? 'Yikes, the flask burst! In a real lab, never heat or ignite gases in a sealed container.'
          : 'ひゃっ、フラスコが割れてしまった！本物の実験では、栓をしたまま加熱したり火をつけたりしてはダメじゃぞ。',
        mood: 'warning',
        priority: PROFESSOR_PRIORITY.warning
      };
    case 'indicator': {
      const comp = COMPOUNDS_DATA[event.compoundId];
      const words = COLOR_WORDS[event.compoundId];
      if (!comp || !words) return null;
      const color = bi(words[event.phClass], lang);
      const cls = bi(PH_CLASS_NAMES[event.phClass], lang);
      const name = getCompoundName(comp, lang);
      return {
        text: lang === 'en'
          ? `${name} is ${color}! That means the solution around it is ${cls}.`
          : `${name}が${color}になったぞ！ということは、まわりは${cls}じゃな。`,
        mood: 'happy',
        priority: PROFESSOR_PRIORITY.discovery
      };
    }
    case 'flameTest': {
      const flame = getFlameReactionInfo('element', event.symbol);
      const el = ELEMENTS_DATA[event.symbol];
      if (!flame || !el) return null;
      const name = getElementName(el, lang);
      const usedInFireworks = FIREWORK_ELEMENTS.includes(event.symbol);
      const reason = bi(NOT_IN_FIREWORKS_REASONS[event.symbol] ?? NOT_IN_FIREWORKS_DEFAULT, lang);
      if (lang === 'en') {
        const tail = usedInFireworks ? 'You can now use this color in the 🎆 Fireworks workshop!' : reason;
        return {
          text: `${name} burns ${flame.flameColorNameEn ?? 'a special color'}! This is the flame test. ${tail}`,
          mood: 'excited',
          priority: PROFESSOR_PRIORITY.discovery
        };
      }
      const mnemonic = flame.flameMnemonicJa ? `（覚え方: ${flame.flameMnemonicJa}）` : '';
      return {
        text: `${name}の炎は${flame.flameColorNameJa}！これが「炎色反応」じゃ${mnemonic}。${usedInFireworks ? 'この色は🎆花火工房で使えるようになったぞ！' : reason}`,
        mood: 'excited',
        priority: PROFESSOR_PRIORITY.discovery
      };
    }
    case 'firework': {
      const names = event.symbols.map(sym => {
        const el = ELEMENTS_DATA[sym];
        return el ? getElementName(el, lang) : sym;
      });
      if (GOLD_TRAIL_SHAPES.includes(event.shape)) {
        const kamuro = event.shape === 'kamuro';
        return {
          text: lang === 'en'
            ? `Tamaya! The golden trails of a ${kamuro ? 'kamuro' : 'willow'} come from charcoal and iron powder burning slowly—not from a flame test!`
            : `たまや〜！${kamuro ? '冠' : '柳'}の金色の尾は、炭や鉄粉がゆっくり燃える光じゃ。炎色反応とはちがうんじゃよ。`,
          mood: 'happy',
          priority: PROFESSOR_PRIORITY.reaction
        };
      }
      if (event.shape === 'changing' && event.symbols.length > 1) {
        return {
          text: lang === 'en'
            ? `Tamaya! Each star of a color-changing firework is packed in layers with ${names.join(', then ')}. As it burns from the outside in, the flame color changes!`
            : `たまや〜！変化菊の星には、${names.join('→')}の火薬が層になって詰めてあるんじゃ。外側から燃えていくから、炎色反応の色がとちゅうで変わるんじゃよ。`,
          mood: 'happy',
          priority: PROFESSOR_PRIORITY.reaction
        };
      }
      if (event.shape === 'strobe') {
        return {
          text: lang === 'en'
            ? 'Tamaya! Strobe stars use a mixture that keeps flaring up and dying down, so they blink as they fall.'
            : 'たまや〜！点滅の星は、ぱっと燃えては消えるのをくり返す火薬でできておるんじゃ。だからチカチカ光りながら落ちていくんじゃよ。',
          mood: 'happy',
          priority: PROFESSOR_PRIORITY.reaction
        };
      }
      return {
        text: lang === 'en'
          ? `Tamaya! Real fireworks get their colors from metals like ${names.join(', ')}—just like the flame test!`
          : `たまや〜！本物の花火も、${names.join('・')}のような金属の炎色反応で色をつけておるんじゃ。`,
        mood: 'happy',
        priority: PROFESSOR_PRIORITY.reaction
      };
    }
    case 'goldSparks':
      return {
        text: lang === 'en'
          ? 'Look at those golden sparks! Charcoal and iron powder burn slowly with a golden glow—that is the secret of willow fireworks. Willow is now unlocked in the 🎆 workshop!'
          : '見てごらん、金色の火花じゃ！炭や鉄粉はゆっくり燃えて金色に光る。これがしだれ柳の金色の尾のひみつじゃ。🎆花火工房で柳が使えるようになったぞ！',
        mood: 'excited',
        priority: PROFESSOR_PRIORITY.discovery
      };
    case 'dissolve': {
      const comp = COMPOUNDS_DATA[event.compoundId];
      if (!comp) return null;
      const name = getCompoundName(comp, lang);
      // 電解質は、水の中でイオンに分かれていることもひと言そえる (画面ではイオンの粒として見える)
      const form = getIonForm(event.compoundId);
      const ions = form ? ionEquationProducts(form) : '';
      return {
        text: lang === 'en'
          ? `The ${name} dissolved in the water and became hard to see! It has not vanished, though: the solution weighs exactly as much as the water plus the ${name}.${form ? ` In the water it is split into the ions ${ions}.` : ''}`
          : `${name}が水に溶けて見えなくなったぞ！でもなくなったわけではないんじゃ。水溶液の重さは、水と溶かした${name}の重さを合わせたものになるぞ。${form ? `水の中では ${ions} というイオンに分かれているんじゃ。` : ''}`,
        mood: 'happy',
        priority: PROFESSOR_PRIORITY.discovery
      };
    }
    case 'saturate': {
      const comp = COMPOUNDS_DATA[event.compoundId];
      if (!comp) return null;
      const name = getCompoundName(comp, lang);
      const tempSensitive = TEMP_SENSITIVE_SOLUTES.includes(event.compoundId);
      if (lang === 'en') {
        const tip = tempSensitive
          ? `Add more water, or warm it up: ${name} dissolves much more in hot water.`
          : `Warming hardly helps for ${name}. Add more water instead!`;
        return {
          text: `The ${name} won't dissolve any more! A set amount of water can only dissolve so much. This is called a saturated solution. ${tip}`,
          mood: 'thinking',
          priority: PROFESSOR_PRIORITY.discovery
        };
      }
      const tip = tempSensitive
        ? `水をふやすか、温めてみよう。${name}は温度が高いほどたくさん溶けるぞ。`
        : `${name}は温めても溶ける量があまり増えないんじゃ。水をふやしてみよう！`;
      return {
        text: `${name}がもう溶けきれなくなったぞ！決まった量の水に溶ける量には限りがあって、これ以上溶けない水溶液を「飽和水溶液」というんじゃ。${tip}`,
        mood: 'thinking',
        priority: PROFESSOR_PRIORITY.discovery
      };
    }
    case 'crystallize': {
      const line = CRYSTAL_LINES[event.compoundId];
      if (!line) return null;
      return { text: bi(line, lang), mood: 'excited', priority: PROFESSOR_PRIORITY.discovery };
    }
    case 'ionize': {
      const comp = COMPOUNDS_DATA[event.compoundId];
      const form = getIonForm(event.compoundId);
      if (!comp || !form) return null;
      const name = getCompoundName(comp, lang);
      const eq = `${getCompoundFormula(comp, lang)} → ${ionEquationProducts(form)}`;
      if (lang === 'en') {
        const how = event.molten ? `The melted ${name}` : `The ${name} in the water`;
        const weak = form.weak ? ' It is a weak acid, so only a few of its particles split up.' : '';
        return {
          text: `${how} has split into ions! ${eq}. This is called ionization. Red rims are positive ions (cations), blue rims are negative ions (anions).${weak}`,
          mood: 'excited',
          priority: PROFESSOR_PRIORITY.discovery
        };
      }
      const how = event.molten ? `融けた${name}` : `水に溶けた${name}`;
      const weak = form.weak ? '弱い酸なので、イオンに分かれるのはほんの一部だけなんじゃ。' : '';
      return {
        text: `${how}がイオンに分かれたぞ！ ${eq}。これを「電離」というんじゃ。赤いふちが＋の陽イオン、青いふちが−の陰イオンじゃよ。${weak}`,
        mood: 'excited',
        priority: PROFESSOR_PRIORITY.discovery
      };
    }
    case 'electrodesOn':
      return {
        text: lang === 'en'
          ? 'Current on! Watch closely: positive ions (cations) are pulled to the cathode (−), and negative ions (anions) to the anode (+). Opposite charges attract!'
          : '電流を流したぞ！よく見てごらん。＋の陽イオンは陰極（−）へ、−の陰イオンは陽極（＋）へ引き寄せられていくんじゃ。＋と−は引き合うからのう。',
        mood: 'happy',
        priority: PROFESSOR_PRIORITY.reaction
      };
    case 'cellOn':
      return {
        text: lang === 'en'
          ? 'A Daniell cell! Zinc plate on the left, copper plate on the right, cellophane in between. Put an electrolyte solution such as zinc sulfate on the zinc side and copper sulfate solution on the copper side, and see if the motor turns!'
          : 'ダニエル電池じゃ！左が亜鉛板、右が銅板、まん中はセロハンじゃよ。亜鉛板の側に硫酸亜鉛などの電解質の水溶液、銅板の側に硫酸銅水溶液を入れて、モーターが回るか見てごらん。',
        mood: 'happy',
        priority: PROFESSOR_PRIORITY.reaction
      };
    case 'massCheck':
      return { text: bi(MASS_CHECK_LINES[event.result], lang), mood: 'excited', priority: PROFESSOR_PRIORITY.discovery };
    case 'electrodeElectrolysis': {
      const line = ELECTRODE_LINES[event.ruleId];
      if (!line) return null;
      return { text: bi(line, lang), mood: 'excited', priority: PROFESSOR_PRIORITY.discovery };
    }
    case 'questComplete':
      return {
        text: lang === 'en'
          ? `Mission complete: "${event.title}" Wonderful work!`
          : `ミッション「${event.title}」クリア！すばらしいぞ！`,
        mood: 'happy',
        priority: PROFESSOR_PRIORITY.quest
      };
    case 'idle': {
      const text = idleHint(event.stats, lang, rand);
      return text ? { text, mood: 'thinking', priority: PROFESSOR_PRIORITY.idle } : null;
    }
  }
}
