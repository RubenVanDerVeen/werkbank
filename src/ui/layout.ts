export function mountLayout(host: HTMLElement): { slot: HTMLElement } {
  host.innerHTML = `
    <div class="app">
      <header class="app__header">
        <div class="app__title">werkbank</div>
        <div class="app__tagline">study tools · ee</div>
      </header>
      <div data-slot></div>
    </div>
  `;
  const slot = host.querySelector<HTMLElement>('[data-slot]')!;
  return { slot };
}

export function setTitle(_title: string) {
  // Reserved for future per-module title. No-op in v1.
}