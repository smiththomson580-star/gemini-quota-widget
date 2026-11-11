const paths={
  memo:'<rect x="5" y="3" width="15" height="18" rx="3"/><path d="M3 8h4m-4 4h4m-4 4h4m4-7h5m-5 4h5"/>',
  joker:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m12 7 3 5-3 5-3-5 3-5Z"/>',
  pet:'<path d="M12 20s-8-4.8-8-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.2-8 10-8 10Z"/>',
  feed:'<path d="M4 12c3-5 9-7 13 0-4 7-10 5-13 0Zm13 0 4-4v8l-4-4Z"/><circle cx="8" cy="11" r=".7" fill="currentColor" stroke="none"/>',
  play:'<path d="m4 21 8-8m4-10 1.5 4.5L22 9l-4.5 1.5L16 15l-1.5-4.5L10 9l4.5-1.5L16 3ZM5 4v4M3 6h4"/>',
  menu:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  interaction:'<path d="M7 4 4 10v7c0 3 16 3 16 0v-7l-3-6-4 4h-2L7 4Z"/><path d="M8 13h.01M16 13h.01m-6 3 2 1 2-1"/>',
  dialogue:'<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-6 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>',
  appearance:'<path d="M12 3C6 3 3 7 3 12c0 5 4 9 8 9 3 0 1-4 3-4h3c6 0 5-14-5-14Z"/><circle cx="8" cy="9" r="1"/><circle cx="13" cy="7" r="1"/><circle cx="17" cy="11" r="1"/>',
  audio:'<path d="M8 17h8l2 2H6l2-2Zm0 0V9a4 4 0 0 1 8 0v8m-6 4h4M12 3V2"/>',
  quota:'<path d="M4 20V10m8 10V4m8 16v-7"/><path d="M2 21h20"/>',
  tools:'<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6m-3 0v3"/>',
  sleep:'<path d="M20 14A8 8 0 0 1 10 4 8 8 0 1 0 20 14ZM15 3h5l-5 5h5"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>'
};
export function icon(name){return '<svg class="cp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.interaction)+'</svg>';}
