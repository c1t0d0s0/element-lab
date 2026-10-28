import { isTextbookFlameElement } from '../data/elements';
import { t } from '../i18n';

// 教科書に出てこない炎色に付ける「参考」タグ (教科書の元素なら空文字)
export function flameReferenceTag(symbol: string): string {
  if (isTextbookFlameElement(symbol)) return '';
  const tr = t().inspector;
  return `<span class="flame-ref-tag" title="${tr.flameReferenceHint}">${tr.flameReference}</span>`;
}
