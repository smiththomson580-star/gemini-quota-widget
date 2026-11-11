export function positionPanel(panel, anchor) {
  if (panel.hidden) return;
  const cat = anchor.getBoundingClientRect();
  const edge = 12;
  const width = panel.offsetWidth || 368;
  const height = panel.offsetHeight || 380;
  let left = cat.left - width - edge;
  let top = cat.top;
  if (left < edge) {
    left = cat.right + edge;
    if (left + width > window.innerWidth - edge) {
      left = (cat.left + cat.right - width) / 2;
      top = cat.top - height - edge;
      if (top < edge) top = cat.bottom + height + 2 * edge <= window.innerHeight ? cat.bottom + edge : edge;
    }
  }
  const dock = document.getElementById('gfw-companion-dock');
  if (dock && !dock.hidden) {
    const toolbar = dock.getBoundingClientRect();
    if (left < toolbar.right && left + width > toolbar.left && top < toolbar.bottom && top + height > toolbar.top) {
      if (toolbar.top - height - edge >= edge) top = toolbar.top - height - edge;
      else if (toolbar.bottom + height + 2 * edge <= window.innerHeight) top = toolbar.bottom + edge;
    }
  }
  panel.style.left = Math.round(Math.max(edge, Math.min(window.innerWidth - width - edge, left))) + 'px';
  panel.style.top = Math.round(Math.max(edge, Math.min(window.innerHeight - height - edge, top))) + 'px';
}
