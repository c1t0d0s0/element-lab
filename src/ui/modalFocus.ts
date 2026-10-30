// 画面 (モーダル) 共通のキーボード操作:
// - Esc で、いちばん上に開いている画面を閉じる (その画面の ✕ ボタンを押したのと同じ)
// - 開いている間は Tab で画面の外へフォーカスが出ないようにし、閉じたら開く前の場所へもどす
// 画面ごとに書かなくてよいように、.modal-overlay の hidden の付けはずしを見はって動く

const OVERLAY = 'modal-overlay';
// 自分で Esc を受けとる、さらに上にかさなる画面 (QR の全画面表示・花火の打ち上げ)
const OWN_ESCAPE = '.qr-fullscreen:not(.hidden), #fireworks-theater:not(.hidden)';
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface OpenModal {
  el: HTMLElement;
  // 開く前にフォーカスがあった所 (閉じたらもどす)
  returnTo: Element | null;
}

// 開いた順 (最後がいちばん上)
const stack: OpenModal[] = [];

function isOpen(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && el.classList.contains(OVERLAY) && !el.classList.contains('hidden');
}

function focusables(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(e => e.offsetParent !== null || e === document.activeElement);
}

function opened(el: HTMLElement) {
  if (stack.some(m => m.el === el)) return;
  stack.push({ el, returnTo: document.activeElement });
  el.setAttribute('aria-modal', 'true');
  if (!el.querySelector('[role="dialog"]')) el.setAttribute('role', 'dialog');
  // 画面の中へフォーカスを移す (最初のボタンなどを押してしまわないよう、カード自体に)
  const card = el.querySelector<HTMLElement>('.modal-card') ?? el;
  if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '-1');
  if (!el.contains(document.activeElement)) card.focus({ preventScroll: true });
}

function closed(el: HTMLElement) {
  const i = stack.findIndex(m => m.el === el);
  if (i < 0) return;
  const [m] = stack.splice(i, 1);
  // フォーカスが閉じた画面の中か、どこにもないときだけもどす (別の画面へ移っていればそのまま)
  const active = document.activeElement;
  if (active && active !== document.body && !el.contains(active)) return;
  const top = stack[stack.length - 1];
  if (m.returnTo instanceof HTMLElement && m.returnTo.isConnected && (!top || top.el.contains(m.returnTo))) {
    m.returnTo.focus({ preventScroll: true });
  } else if (top) {
    (top.el.querySelector<HTMLElement>('.modal-card') ?? top.el).focus({ preventScroll: true });
  }
}

function check(el: Element) {
  if (!(el instanceof HTMLElement) || !el.classList.contains(OVERLAY)) return;
  if (isOpen(el)) opened(el);
  else closed(el);
}

export function topModal(): HTMLElement | null {
  // 見はりの前に消された画面などは取りのぞく
  for (let i = stack.length - 1; i >= 0; i--) {
    if (!stack[i].el.isConnected || !isOpen(stack[i].el)) stack.splice(i, 1);
  }
  return stack[stack.length - 1]?.el ?? null;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.defaultPrevented || document.querySelector(OWN_ESCAPE)) return;
  const top = topModal();
  if (!top) return;
  if (e.key === 'Escape') {
    // ✕ ボタンのない画面 (はじめの学年えらび) は Esc では閉じない
    const close = top.querySelector<HTMLElement>('.close-btn');
    if (!close) return;
    e.preventDefault();
    close.click();
  } else if (e.key === 'Tab') {
    const items = focusables(top);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!top.contains(active)) {
      // 描き直しなどでフォーカスが外へ出ていたら、画面の中へもどす
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && (active === first || active === top.querySelector('.modal-card'))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

let installed = false;

// アプリの起動時に1回だけ呼ぶ
export function installModalKeys() {
  if (installed) return;
  installed = true;
  document.querySelectorAll(`.${OVERLAY}`).forEach(check);
  new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'attributes') check(r.target as Element);
      else r.addedNodes.forEach(n => n instanceof Element && check(n));
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('keydown', onKeyDown);
}
