export function polyInput(label: string, initial: number[]): { el: HTMLElement; value: () => number[] } {
  const wrap = document.createElement('label');
  wrap.style.display = 'block';
  wrap.style.marginBottom = '10px';
  wrap.innerHTML = `<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-bottom:4px;">${escapeHtml(label)}</div>`;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = initial.join(', ');
  input.style.width = '100%';
  input.style.padding = '8px';
  input.style.border = '1px solid #e5e0d2';
  input.style.borderRadius = '4px';
  wrap.appendChild(input);
  return { el: wrap, value: () => parsePoly(input.value) };
}

export function slider(label: string, min: number, max: number, step: number, initial: number): { el: HTMLElement; value: () => number } {
  const wrap = document.createElement('label');
  wrap.style.display = 'block';
  wrap.style.marginBottom = '10px';
  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.justifyContent = 'space-between';
  head.innerHTML = `<span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#888;">${escapeHtml(label)}</span><span class="mono" data-val>${initial}</span>`;
  wrap.appendChild(head);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(initial);
  input.style.width = '100%';
  wrap.appendChild(input);
  input.addEventListener('input', () => {
    head.querySelector('[data-val]')!.textContent = input.value;
  });
  return { el: wrap, value: () => Number(input.value) };
}

export function selectWave(label: string, options: string[], initial: string): { el: HTMLElement; value: () => string } {
  const wrap = document.createElement('label');
  wrap.style.display = 'block';
  wrap.style.marginBottom = '10px';
  wrap.innerHTML = `<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-bottom:4px;">${escapeHtml(label)}</div>`;
  const sel = document.createElement('select');
  sel.style.width = '100%';
  sel.style.padding = '8px';
  sel.style.border = '1px solid #e5e0d2';
  sel.style.borderRadius = '4px';
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    if (o === initial) opt.selected = true;
    sel.appendChild(opt);
  }
  wrap.appendChild(sel);
  return { el: wrap, value: () => sel.value };
}

function parsePoly(s: string): number[] {
  return s.split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}