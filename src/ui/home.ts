import type { Module } from '../module.ts';

export function renderHome(slot: HTMLElement, modules: Module[]) {
  const byCourse = groupByCourse(modules);
  const courseOrder = ['Regeltechniek', 'Fourier', /* future */ 'Other'];
  const known = new Set(courseOrder);
  for (const c of Object.keys(byCourse)) if (!known.has(c)) courseOrder.push(c);

  slot.innerHTML = '';
  const lede = document.createElement('p');
  lede.className = 'app__lede';
  lede.textContent = 'Calculators and visualizers for my Electrical Engineering coursework. Type, click, see.';
  slot.appendChild(lede);

  for (const course of courseOrder) {
    const list = byCourse[course];
    if (!list || list.length === 0) continue;
    const section = document.createElement('section');
    section.className = 'course';
    const h = document.createElement('h3');
    h.className = 'course__title';
    h.textContent = course;
    section.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'course__grid';
    for (const m of list) grid.appendChild(card(m));
    section.appendChild(grid);
    slot.appendChild(section);
  }
}

function card(m: Module): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'module-card';
  btn.type = 'button';
  btn.dataset.moduleId = m.id;
  btn.innerHTML = `
    <div class="module-card__eyebrow">module</div>
    <div class="module-card__title">${escapeHtml(m.title)}</div>
    <p class="module-card__desc">${escapeHtml(m.description)}</p>
  `;
  return btn;
}

function groupByCourse(modules: Module[]): Record<string, Module[]> {
  const out: Record<string, Module[]> = {};
  for (const m of modules) (out[m.course] ??= []).push(m);
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}