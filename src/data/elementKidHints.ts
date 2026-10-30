import type { ElementData } from './elements';
import type { Language } from '../i18n';

// 小学生モードの元素のやさしい説明 (化合物の kidHint と同じ役わり)。よく使う元素だけ個別に書き、ほかは分類から作る
const KID_HINTS: Record<string, [string, string]> = {
  H: ['🎈 いちばん軽い元素。酸素といっしょに燃えると水になるよ。', '🎈 The lightest element. When it burns with oxygen, it becomes water.'],
  He: ['🎈 風船を浮かべる軽い気体。燃えないので安全だよ。', '🎈 A light gas that makes balloons float. It does not burn, so it is safe.'],
  Li: ['🔋 スマホの電池に使われる、とても軽い金属。燃やすと赤い炎になるよ。', '🔋 A very light metal used in phone batteries. It burns with a red flame.'],
  C: ['✏️ えんぴつのしんや炭のもと。燃えると二酸化炭素になるよ。', '✏️ What pencil lead and charcoal are made of. It burns into carbon dioxide.'],
  N: ['🌬️ 空気のおよそ5分の4をしめる気体。ほかのものとあまり反応しないよ。', '🌬️ About four fifths of the air. It hardly reacts with other things.'],
  O: ['🫁 ものが燃えるのを助け、生き物が呼吸に使う気体。空気のおよそ5分の1だよ。', '🫁 A gas that helps things burn and that living things breathe. About one fifth of the air.'],
  F: ['🦷 歯みがき粉に入っている「フッ素」のもと。とても反応しやすいよ。', '🦷 The "fluoride" in toothpaste comes from it. It reacts very easily.'],
  Ne: ['💡 電気を通すと赤っぽく光る気体。ネオンサインに使われるよ。', '💡 A gas that glows reddish when electricity passes through it, used in neon signs.'],
  Na: ['🧂 食塩のもとになる金属。水に入れるとはげしく反応するので、さわってはいけないよ。炎は黄色。', '🧂 A metal that is part of table salt. It reacts violently with water, so never touch it. Its flame is yellow.'],
  Mg: ['✨ 燃やすとまぶしい白い光を出す金属。', '✨ A metal that burns with a dazzling white light.'],
  Al: ['🥫 アルミかんやアルミホイルの金属。軽くてさびにくいよ。', '🥫 The metal of cans and foil. It is light and does not rust easily.'],
  Si: ['💻 砂やガラスのもと。コンピューターの部品にも使われるよ。', '💻 Part of sand and glass, and used in computer chips.'],
  P: ['🔥 マッチの箱のこする所に使われている元素。', '🔥 Used on the striking strip of a matchbox.'],
  S: ['🌋 温泉や火山のにおいのもとになる、黄色い固体。', '🌋 A yellow solid behind the smell of hot springs and volcanoes.'],
  Cl: ['🏊 プールの消毒に使われる、においのある黄緑色の気体。', '🏊 A yellow-green gas with a sharp smell, used to clean swimming pools.'],
  Ar: ['💡 空気に少しだけ入っている、反応しにくい気体。電球の中に使われるよ。', '💡 A gas that is a small part of air and hardly reacts. It is used inside light bulbs.'],
  K: ['🍌 バナナなどの食べ物にふくまれる元素。金属は水とはげしく反応するよ。炎は赤むらさき色。', '🍌 Found in foods like bananas. The metal reacts violently with water. Its flame is lilac.'],
  Ca: ['🦴 骨や歯、貝がらのもとになる元素。炎はオレンジ色。', '🦴 Part of bones, teeth and seashells. Its flame is orange-red.'],
  Fe: ['🔩 くぎや鉄棒の金属。水と空気にふれるとさびるよ。磁石にくっつくよ。', '🔩 The metal of nails and bars. It rusts in water and air, and sticks to magnets.'],
  Cu: ['🪙 10円玉や電線の金属。電気をよく通すよ。炎は青緑色。', '🪙 The metal of 10-yen coins and electric wires. It conducts electricity well. Its flame is blue-green.'],
  Zn: ['🔋 乾電池に使われる金属。鉄をさびにくくするメッキにも使うよ。', '🔋 A metal used in batteries and in coatings that keep iron from rusting.'],
  Sr: ['🎆 花火の赤い色を出す元素。', '🎆 The element that makes red fireworks.'],
  Ag: ['🥈 銀メダルや食器の金属。電気をいちばんよく通すよ。', '🥈 The metal of silver medals and tableware. It conducts electricity best of all.'],
  I: ['🩹 うがい薬や消毒薬に使われる、むらさき色の元素。', '🩹 A purple element used in gargles and antiseptics.'],
  Ba: ['🎆 花火の黄緑色を出す元素。', '🎆 The element that makes yellow-green fireworks.'],
  Au: ['🥇 金メダルの金属。さびずに、ずっとピカピカだよ。', '🥇 The metal of gold medals. It never rusts and stays shiny.'],
  Hg: ['🌡️ ふつうの温度で液体の、ただ1つの金属。毒があるよ。', '🌡️ The only metal that is liquid at room temperature. It is poisonous.'],
  Pb: ['🔋 とても重い金属。毒があるので、いまはあまり使われないよ。', '🔋 A very heavy metal. It is poisonous, so it is not used much now.']
};

const CATEGORY_HINTS: Record<string, [string, string]> = {
  'alkali-metal': ['💧 水に入れるとはげしく反応する、やわらかい金属のなかま。', '💧 A soft metal that reacts violently with water.'],
  'alkaline-earth': ['🦴 骨や石にふくまれる金属のなかま。', '🦴 A metal found in bones and rocks.'],
  'transition-metal': ['🔩 じょうぶで、電気をよく通す金属のなかま。', '🔩 A strong metal that conducts electricity well.'],
  'post-transition-metal': ['🥄 わりとやわらかい金属のなかま。', '🥄 A fairly soft metal.'],
  metalloid: ['💻 金属と金属でないものの中間のなかま。', '💻 Halfway between metals and nonmetals.'],
  nonmetal: ['🌿 金属ではないなかま。生き物の体をつくる元素も多いよ。', '🌿 Not a metal. Many of them make up living things.'],
  halogen: ['⚠️ とても反応しやすく、においや毒があるなかま。', '⚠️ Reacts very easily and may smell or be poisonous.'],
  'noble-gas': ['💡 ほかのものとほとんど反応しない気体のなかま。', '💡 A gas that hardly reacts with anything.'],
  lanthanide: ['🧲 強い磁石などに使われる、めずらしい金属のなかま。', '🧲 A rare metal used in things like strong magnets.'],
  actinide: ['☢️ 放射線を出す金属のなかま。中学・高校で学ぶよ。', '☢️ A metal that gives off radiation. You will learn about it later.']
};

export function getElementKidHint(el: ElementData, lang: Language): string {
  const hint = KID_HINTS[el.symbol] ?? CATEGORY_HINTS[el.category];
  if (!hint) return '';
  return lang === 'en' ? hint[1] : hint[0];
}

export const ELEMENT_KID_HINT_SYMBOLS = Object.keys(KID_HINTS);
