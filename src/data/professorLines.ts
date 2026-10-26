import { Language } from '../i18n';
import { REACTIONS_DATA, ReactionRule, getReactionName } from './reactions';
import { COMPOUNDS_DATA, PhClass, getCompoundName, getCompoundKidHint } from './compounds';
import { ELEMENTS_DATA, getElementName, getFlameReactionInfo } from './elements';
import { GameStats } from './quests';
import { FIREWORK_ELEMENTS, FireworkShape } from '../engine/Fireworks';

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

// 主な反応の専用セリフ (原子から反応する版などは variantOf の反応のセリフを使う)
export const REACTION_LINES: Record<string, Bilingual> = {
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

function bi(b: Bilingual, lang: Language): string {
  return lang === 'en' ? b.en : b.ja;
}

function speciesName(type: 'element' | 'compound', id: string, lang: Language): string {
  if (type === 'element') {
    const el = ELEMENTS_DATA[id];
    return el ? `${getElementName(el, lang)}(${id})` : id;
  }
  const comp = COMPOUNDS_DATA[id];
  return comp ? `${getCompoundName(comp, lang)}(${comp.formula})` : id;
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
            ? `New discovery! "${getReactionName(rule, lang)}"  ${rule.equation}`
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
      if (event.shape === 'willow') {
        return {
          text: lang === 'en'
            ? 'Tamaya! The golden trails of a willow come from charcoal and iron powder burning slowly—not from a flame test!'
            : 'たまや〜！柳の金色の尾は、炭や鉄粉がゆっくり燃える光じゃ。炎色反応とはちがうんじゃよ。',
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
