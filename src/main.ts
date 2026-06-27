import { mountLayout } from './ui/layout.ts';
import { renderHome } from './ui/home.ts';
import { modules } from './registry.ts';

const app = document.getElementById('app');
if (!app) throw new Error('#app not found');

const { slot } = mountLayout(app);
renderHome(slot, modules);

slot.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const btn = target.closest('[data-module-id]') as HTMLElement | null;
  if (!btn) return;
  const id = btn.dataset.moduleId!;
  const m = modules.find((m) => m.id === id);
  if (!m) return;
  slot.innerHTML = '';
  const back = document.createElement('button');
  back.className = 'module-card';
  back.textContent = '← back';
  back.style.marginBottom = '20px';
  slot.appendChild(back);
  const panel = document.createElement('div');
  slot.appendChild(panel);
  m.render(panel);
  back.addEventListener('click', () => renderHome(slot, modules));
});