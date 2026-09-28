/**
 * navConfig.js — Shared atelier module list for hub tiles + persistent sidebar.
 * Single source so labels/routes stay in sync across screens.
 */

export const NAV_MODULES = [
  {
    id: 'hub',
    roman: '⌂',
    title: 'Atelier Hub',
    subtitle: 'Home overview',
    route: '#congressional',
  },
  {
    id: 'client-profile',
    roman: 'I',
    title: 'Client Profile',
    subtitle: 'Personal & contact archive',
    route: '#client-profile',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>`,
  },
  {
    id: 'client-db',
    roman: 'II',
    title: 'Client Database',
    subtitle: 'Full atelier roster',
    route: '#client-db',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v5c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 10v5c0 1.66 4.03 3 9 3s9-1.34 9-3v-5"/>
      <path d="M3 15v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4"/>
    </svg>`,
  },
  {
    id: 'measurements',
    roman: 'III',
    title: 'Measurements',
    subtitle: 'Style & body data',
    route: '#b2b',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7h18M3 12h18M3 17h18"/>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
    </svg>`,
    chips: ['Style', 'Measurements'],
    hint: 'Opens the B2B vault — style sheets and measurements live here',
  },
  {
    id: 'inventory',
    roman: 'IV',
    title: 'Inventory',
    subtitle: 'Fabric, lining & trim',
    route: '#inventory',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4M7 8h2M7 11h5"/>
    </svg>`,
  },
  {
    id: 'schedule',
    roman: 'V',
    title: 'Schedule',
    subtitle: 'Trials & deliveries',
    route: '#schedule',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01"/>
    </svg>`,
  },
  {
    id: 'work-hierarchy',
    roman: 'VI',
    title: 'Work Hierarchy',
    subtitle: 'Roles & task flow',
    route: '#work-hierarchy',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="2" width="6" height="4" rx="1"/>
      <rect x="2" y="18" width="6" height="4" rx="1"/>
      <rect x="9" y="18" width="6" height="4" rx="1"/>
      <rect x="16" y="18" width="6" height="4" rx="1"/>
      <path d="M12 6v5M5 18v-5h14v5"/>
    </svg>`,
  },
  {
    id: 'workshop-db',
    roman: 'VII',
    title: 'Workshop',
    subtitle: 'Craftsmen & Kanban',
    route: '#workshop',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/>
    </svg>`,
  },
  {
    id: 'shortcomings',
    roman: 'VIII',
    title: 'Shortcomings',
    subtitle: 'Issue & QA tracking',
    route: '#shortcomings',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
  },
  {
    id: 'dashboard',
    roman: 'IX',
    title: 'B2B Logistics',
    subtitle: 'Vendor & Corporate',
    route: '#b2b',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>`,
  },
  {
    id: 'status-quo',
    roman: 'X',
    title: 'Status Quo',
    subtitle: 'Live Overview',
    route: '#status-quo',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>`,
  },
  {
    id: 'fabric-receipts',
    roman: 'XI',
    title: 'Fabric Receipts',
    subtitle: 'Raw material intake log',
    route: '#fabric-receipts',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16v16H4zM4 12h16"/>
    </svg>`,
  },
];

/** Hub tile grid omits the Hub home item (already on that screen). */
export const HUB_MODULES = NAV_MODULES.filter((m) => m.id !== 'hub');

export const IMPLEMENTED_ROUTES = [
  '#congressional', '#dashboard', '#b2b', '#configurator', '#client-profile',
  '#client-db', '#inventory', '#schedule', '#work-hierarchy', '#workshop',
  '#shortcomings', '#status-quo', '#fabric-receipts'
];

/** Map hash → nav item id for active highlighting. */
export function routeToNavId(cleanHash) {
  if (cleanHash === '#congressional') return 'hub';
  // Measurements (III) and B2B Logistics (IX) share the vault screen at #b2b.
  // Prefer highlighting Measurements when on that screen; #dashboard keeps IX.
  if (cleanHash === '#b2b') return 'measurements';
  if (cleanHash === '#dashboard') return 'dashboard';
  if (cleanHash === '#fabric-receipts') return 'fabric-receipts';
  if (cleanHash === '#configurator') return 'measurements';
  const match = NAV_MODULES.find((m) => m.route.split('?')[0] === cleanHash);
  return match?.id || null;
}
