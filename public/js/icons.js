/**
 * icons.js — Bespoke Vector Line-Art Icon Library for Krishna Suits
 *
 * Stage 5 (Revised): Open line-art illustrations inspired by Savile Row & premium
 * made-to-measure tailoring guides (Proper Cloth / Suitsupply).
 *
 * Design Principles:
 *  1. Open transparent silhouettes (no heavy dark solid polygon fills).
 *  2. Stroke hierarchy: Primary tailoring feature in crisp 1.8-2.0px accent stroke;
 *     supporting garment body lines in 1.0px muted subtle strokes.
 *  3. Proportional clarity: Exaggerated contour geometry so variations (e.g., Notch vs Peak,
 *     Tuxedo Shawl 1 vs 2 vs 3, Square vs Regular vs Sloping) are instantly recognizable at 36px.
 */

export const ICONS = {
  // ============================================================================
  // JACKET LAPEL STYLES (9 icons) - 70x80 viewBox
  // ============================================================================

  // 1. Notch: Classic 75-90° step-notch cut where lapel meets collar
  'Notch': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Jacket Body Silhouette (subtle reference lines) -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <line x1="35" y1="36" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>
      <circle cx="35" cy="50" r="1.5" fill="currentColor" opacity="0.3"/>
      <circle cx="35" cy="62" r="1.5" fill="currentColor" opacity="0.3"/>

      <!-- Shirt Collar Stand (context) -->
      <path d="M28 10 L35 16 L42 10" stroke="currentColor" stroke-width="1" stroke-opacity="0.4"/>

      <!-- Left Lapel: Collar step + Lapel triangle notch -->
      <path d="M35 10 L23 18 L15 25 L23 29 L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="23" y1="18" x2="15" y2="25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>

      <!-- Right Lapel (mirror) -->
      <path d="M35 10 L47 18 L55 25 L47 29 L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="47" y1="18" x2="55" y2="25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,

  // 2. Peak: Bold upward and outward pointing spear tip extending past collar seam
  'Peak': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Jacket Body Silhouette -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <line x1="35" y1="38" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>
      <circle cx="35" cy="52" r="1.5" fill="currentColor" opacity="0.3"/>
      <circle cx="35" cy="64" r="1.5" fill="currentColor" opacity="0.3"/>

      <!-- Shirt Collar Stand -->
      <path d="M28 10 L35 16 L42 10" stroke="currentColor" stroke-width="1" stroke-opacity="0.4"/>

      <!-- Left Peak Lapel: Upward high peak gorge -->
      <path d="M35 10 L22 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M22 17 L10 20 L23 30 L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Right Peak Lapel -->
      <path d="M35 10 L48 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M48 17 L60 20 L47 30 L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // 3. Shawl: Smooth continuous unbroken curve with zero notch
  'Shawl': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Jacket Body Silhouette -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <line x1="35" y1="38" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>
      <circle cx="35" cy="52" r="1.5" fill="currentColor" opacity="0.3"/>
      <circle cx="35" cy="64" r="1.5" fill="currentColor" opacity="0.3"/>

      <!-- Shirt Collar Stand -->
      <path d="M28 10 L35 16 L42 10" stroke="currentColor" stroke-width="1" stroke-opacity="0.4"/>

      <!-- Continuous unbroken shawl sweep (smooth single curve) -->
      <path d="M35 10 C26 12 16 22 16 32 C18 36 28 38 35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M35 10 C44 12 54 22 54 32 C52 36 42 38 35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // 4. Tuxedo Notch: Classic notch geometry + double satin facing accent ribbon
  'Tuxedo Notch': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Jacket Body -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <line x1="35" y1="36" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>
      <circle cx="35" cy="52" r="1.5" fill="currentColor" opacity="0.3"/>

      <!-- Bowtie outline for formal evening wear context -->
      <path d="M32 14 L38 18 M38 14 L32 18" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.6"/>

      <!-- Left Outer Notch Lapel -->
      <path d="M35 10 L23 18 L15 25 L23 29 L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Left Satin Facing Inner Ribbon -->
      <path d="M34 12 L24 18 L18 24 L24 28 L34 36" stroke="#C9A87A" stroke-width="1.2" stroke-opacity="0.9"/>

      <!-- Right Outer Notch Lapel -->
      <path d="M35 10 L47 18 L55 25 L47 29 L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Right Satin Facing Inner Ribbon -->
      <path d="M36 12 L46 18 L52 24 L46 28 L36 36" stroke="#C9A87A" stroke-width="1.2" stroke-opacity="0.9"/>
    </svg>
  `,

  // 5. Tuxedo Peak: Wide dramatic peak lapel + satin facing ribbon + formal closure
  'Tuxedo Peak': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Jacket Body -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <line x1="35" y1="38" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>
      <circle cx="35" cy="52" r="1.5" fill="currentColor" opacity="0.3"/>

      <!-- Bowtie outline -->
      <path d="M32 14 L38 18 M38 14 L32 18" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.6"/>

      <!-- Left Outer Peak Lapel -->
      <path d="M35 10 L22 17 L10 20 L23 30 L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Left Satin Facing Ribbon -->
      <path d="M34 12 L23 18 L13 21 L23 28 L33 36" stroke="#C9A87A" stroke-width="1.2" stroke-opacity="0.9"/>

      <!-- Right Outer Peak Lapel -->
      <path d="M35 10 L48 17 L60 20 L47 30 L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Right Satin Facing Ribbon -->
      <path d="M36 12 L47 18 L57 21 L47 28 L37 36" stroke="#C9A87A" stroke-width="1.2" stroke-opacity="0.9"/>
    </svg>
  `,

  // 6. Tuxedo Shawl 1 — Slim / Narrow Collar (roll stays high and tight to neck, 2.25" narrow profile)
  'Tuxedo Shawl 1': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Jacket Body -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <line x1="35" y1="34" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>
      <circle cx="35" cy="48" r="1.5" fill="currentColor" opacity="0.3"/>

      <!-- Bowtie outline -->
      <path d="M32 14 L38 18 M38 14 L32 18" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.6"/>

      <!-- Slim Shawl Outer Line (Narrow width, max outward sweep x=24) -->
      <path d="M35 10 C31 12 24 18 24 26 C26 31 31 33 35 34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M35 10 C39 12 46 18 46 26 C44 31 39 33 35 34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>

      <!-- Slim Satin Inner Track -->
      <path d="M35 12 C32 14 27 19 27 25 C29 28 32 30 35 32" stroke="#C9A87A" stroke-width="1.2" stroke-opacity="0.9"/>
      <path d="M35 12 C38 14 43 19 43 25 C41 28 38 30 35 32" stroke="#C9A87A" stroke-width="1.2" stroke-opacity="0.9"/>

      <!-- Dimension Badge Label "SLIM" -->
      <text x="35" y="68" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.1em">SLIM</text>
    </svg>
  `,

  // 7. Tuxedo Shawl 2 — Classic / Medium Width (graceful proportioned roll down to mid-waist)
  'Tuxedo Shawl 2': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Jacket Body -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <line x1="35" y1="38" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>
      <circle cx="35" cy="52" r="1.5" fill="currentColor" opacity="0.3"/>

      <!-- Bowtie outline -->
      <path d="M32 14 L38 18 M38 14 L32 18" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.6"/>

      <!-- Classic Medium Shawl Outer Line (Medium outward sweep x=18) -->
      <path d="M35 10 C29 13 18 20 18 30 C20 35 28 37 35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M35 10 C41 13 52 20 52 30 C50 35 42 37 35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>

      <!-- Satin Inner Track -->
      <path d="M35 12 C30 14 22 20 22 28 C24 32 30 34 35 35" stroke="#C9A87A" stroke-width="1.2" stroke-opacity="0.9"/>
      <path d="M35 12 C40 14 48 20 48 28 C46 32 40 34 35 35" stroke="#C9A87A" stroke-width="1.2" stroke-opacity="0.9"/>

      <!-- Dimension Badge Label "REGULAR" -->
      <text x="35" y="68" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.1em">CLASSIC</text>
    </svg>
  `,

  // 8. Tuxedo Shawl 3 — Wide / Dramatic Belly (broad sweeping bell curve extending toward armholes)
  'Tuxedo Shawl 3': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Jacket Body -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <line x1="35" y1="42" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>
      <circle cx="35" cy="56" r="1.5" fill="currentColor" opacity="0.3"/>

      <!-- Bowtie outline -->
      <path d="M32 14 L38 18 M38 14 L32 18" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.6"/>

      <!-- Dramatic Wide Shawl (Wide belly outward sweep x=10) -->
      <path d="M35 10 C24 14 10 24 10 35 C14 40 26 41 35 42" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M35 10 C46 14 60 24 60 35 C56 40 44 41 35 42" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>

      <!-- Double Satin Contour Ribbon -->
      <path d="M35 12 C26 16 15 25 15 33 C18 36 28 38 35 39" stroke="#C9A87A" stroke-width="1.3" stroke-opacity="0.9"/>
      <path d="M35 12 C44 16 55 25 55 33 C52 36 42 38 35 39" stroke="#C9A87A" stroke-width="1.3" stroke-opacity="0.9"/>

      <!-- Dimension Badge Label "WIDE" -->
      <text x="35" y="68" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.1em">WIDE</text>
    </svg>
  `,

  // 9. Same as Sample: Tailor reference swatch with measuring tape graphic
  'Same as Sample': `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Reference Silhouette (dashed guide) -->
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" stroke-opacity="0.4"/>
      <!-- Tailor Tape / Sample Tag Swatch -->
      <rect x="22" y="24" width="26" height="32" rx="3" stroke="currentColor" stroke-width="1.6" fill="#F7F4EF" fill-opacity="0.1"/>
      <line x1="26" y1="32" x2="44" y2="32" stroke="#C9A87A" stroke-width="1.5"/>
      <line x1="26" y1="40" x2="40" y2="40" stroke="#C9A87A" stroke-width="1.5"/>
      <line x1="26" y1="48" x2="36" y2="48" stroke="#C9A87A" stroke-width="1.5"/>
      <text x="35" y="68" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="currentColor" opacity="0.6" text-anchor="middle">SAMPLE</text>
    </svg>
  `,

  // ============================================================================
  // JACKET SHOULDER SHAPES (3 icons) - 70x70 viewBox
  // ============================================================================

  // 1. Square: Roped, padded Pagoda / British structured horizontal shoulder pitch
  'Square': `
    <svg width="44" height="50" viewBox="0 0 70 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="68" height="60" rx="2" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.35"/>
      <path d="M28 15 V10 H42 V15" stroke="currentColor" stroke-width="1.8" fill="none"/>
      <path d="M28 15 H15 V50 M42 15 H55 V50" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <path d="M20 50 V25 M50 50 V25" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/>
      <path d="M20 25 Q35 28 50 25" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.5"/>
      <text x="35" y="70" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.08em">SQUARE</text>
    </svg>
  `,
  'Regular': `
    <svg width="44" height="50" viewBox="0 0 70 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="68" height="60" rx="2" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.35"/>
      <path d="M28 15 V10 H42 V15" stroke="currentColor" stroke-width="1.8" fill="none"/>
      <path d="M28 15 L15 22 V50 M42 15 L55 22 V50" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <path d="M20 50 V28 M50 50 V28" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/>
      <path d="M20 28 Q35 31 50 28" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.5"/>
      <text x="35" y="70" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.08em">REGULAR</text>
    </svg>
  `,
  'Sloping': `
    <svg width="44" height="50" viewBox="0 0 70 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="68" height="60" rx="2" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.35"/>
      <path d="M28 15 V10 H42 V15" stroke="currentColor" stroke-width="1.8" fill="none"/>
      <path d="M28 15 L15 28 V50 M42 15 L55 28 V50" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <path d="M22 50 V32 M48 50 V32" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/>
      <path d="M22 32 Q35 35 48 32" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.5"/>
      <text x="35" y="70" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.08em">SLOPING</text>
    </svg>
  `
,
};

const JACKET_ICON_LABELS = [
  '1 Button Suit', '2 Button Suit', '3 Button Suit', '4 Button', '6 Button',
  'Single Breasted', 'Double Breasted', 'HS3', 'H4', 'HS5', 'HS4',
  'Single Vent', 'Double Vent', 'Straight Bone', 'Slanted Bone',
  'Straight Valet', 'Slanting Valet', 'Barchetta', 'Tasca Pignata',
  'Rounded Patch Pocket', 'Normal', 'Erect', 'Hunched', 'Flat', 'Slight', 'Large',
];

function jacketLineIcon(label, detail, body) {
  return `
    <svg width="40" height="40" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M35 9 L17 20 L11 62 L59 62 L53 20 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-linejoin="round"/>
      <path d="M35 9 L27 16 L35 27 L43 16 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.35"/>
      ${body}
      <text x="35" y="68" font-family="var(--font-ui, sans-serif)" font-size="6.5" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.06em">${detail}</text>
    </svg>
  `;
}

function buttonIcon(label, count, doubleBreasted = false) {
  const columns = doubleBreasted ? [28, 42] : [35];
  const buttons = columns.flatMap((x) => Array.from({ length: count }, (_, index) =>
    `<circle cx="${x}" cy="${30 + index * 7}" r="2" stroke="currentColor" stroke-width="1.5"/>`
  )).join('');
  return jacketLineIcon(label, label.replace(/[^0-9A-Z]/g, '').slice(0, 9), `
    <path d="M35 25 V61" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" stroke-dasharray="2 2"/>
    ${buttons}
  `);
}

function sleeveButtonIcon(label, count) {
  return jacketLineIcon(label, label, `
    <path d="M22 24 L16 51 M48 24 L54 51" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    ${Array.from({ length: count }, (_, index) => `<circle cx="${19 + index * 3}" cy="${53 - index * 2}" r="1.5" fill="#C9A87A"/>`).join('')}
    ${Array.from({ length: count }, (_, index) => `<circle cx="${51 - index * 3}" cy="${53 - index * 2}" r="1.5" fill="#C9A87A"/>`).join('')}
  `);
}

function ventIcon(label, doubleVent) {
  return jacketLineIcon(label, doubleVent ? 'DOUBLE' : 'SINGLE', `
    <path d="M35 28 V61" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    ${doubleVent ? '<path d="M29 44 V61 M41 44 V61" stroke="#C9A87A" stroke-width="1.5"/>' : ''}
  `);
}

function pocketIcon(label, rounded = false, slanted = false, flap = false) {
  const path = rounded
    ? 'M18 40 Q35 34 52 40 V49 Q35 57 18 49 Z'
    : slanted
      ? 'M17 38 L53 45 L51 51 L18 44 Z'
      : 'M17 39 H53 V50 H17 Z';
  return jacketLineIcon(label, label.split(' ').map((part) => part[0]).join('').slice(0, 8), `
    <path d="${path}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    ${flap ? '<path d="M17 39 H53" stroke="#C9A87A" stroke-width="1.5"/>' : ''}
  `);
}

function shapeIcon(label, shape) {
  const url = '/images/shapes/' + shape.lower() + '.jpg';
  return '<div style="width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">' +
           '<div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--color-border); border-radius: 2px; background: #fff; width: 100%;">' +
             '<img src="' + url + '" style="width: 140%; height: 140%; object-fit: cover; object-position: center; mix-blend-mode: multiply; filter: contrast(1.2);" alt="' + label + '" />' +
           '</div>' +
           '<div style="font-family: var(--font-ui, sans-serif); font-size: 7px; font-weight: 700; color: #C9A87A; text-align: center; letter-spacing: 0.08em; margin-top: 4px;">' + label.toUpperCase() + '</div>' +
         '</div>';
}

function stomachIcon(label, amount) {
  const url = '/images/shapes/' + amount.lower() + '.jpg';
  return '<div style="width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">' +
           '<div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--color-border); border-radius: 2px; background: #fff; width: 100%;">' +
             '<img src="' + url + '" style="width: 140%; height: 140%; object-fit: cover; object-position: center; mix-blend-mode: multiply; filter: contrast(1.2);" alt="' + label + '" />' +
           '</div>' +
           '<div style="font-family: var(--font-ui, sans-serif); font-size: 7px; font-weight: 700; color: #C9A87A; text-align: center; letter-spacing: 0.08em; margin-top: 4px;">' + label.toUpperCase() + '</div>' +
         '</div>';
}
Object.assign(ICONS, {
  '1 Button Suit': buttonIcon('1 Button Suit', 1),
  '2 Button Suit': buttonIcon('2 Button Suit', 2),
  '3 Button Suit': buttonIcon('3 Button Suit', 3),
  '4 Button': buttonIcon('4 Button', 4),
  '6 Button': buttonIcon('6 Button', 6),
  'Single Breasted': buttonIcon('Single Breasted', 2),
  'Double Breasted': buttonIcon('Double Breasted', 3, true),
  HS3: sleeveButtonIcon('HS3', 3),
  H4: sleeveButtonIcon('H4', 4),
  HS5: sleeveButtonIcon('HS5', 5),
  HS4: sleeveButtonIcon('HS4', 4),
  'Single Vent': ventIcon('Single Vent', false),
  'Double Vent': ventIcon('Double Vent', true),
  'Straight Bone': pocketIcon('Straight Bone'),
  'Slanted Bone': pocketIcon('Slanted Bone', false, true),
  'Straight Valet': pocketIcon('Straight Valet', false, false, true),
  'Slanting Valet': pocketIcon('Slanting Valet', false, true, true),
  Barchetta: pocketIcon('Barchetta', true),
  'Tasca Pignata': pocketIcon('Tasca Pignata', true, false, true),
  'Rounded Patch Pocket': pocketIcon('Rounded Patch Pocket', true, false, true),
  Normal: shapeIcon('Normal', 'Normal'),
  Erect: shapeIcon('Erect', 'Erect'),
  Hunched: shapeIcon('Hunched', 'Hunched'),
  Flat: stomachIcon('Flat', 'Flat'),
  Slight: stomachIcon('Slight', 'Slight'),
  Large: stomachIcon('Large', 'Large'),
});

function premiumLapelIcon(style) {
  const isShawl = style === 'shawl' || style === 'tuxedo-shawl';
  const isPeak = style === 'peak' || style === 'tuxedo-peak';
  const isTuxedo = style.startsWith('tuxedo-');
  const shawlWidth = style === 'tuxedo-shawl-slim' ? 6 : style === 'tuxedo-shawl-wide' ? 15 : 10;
  const leftLapel = isShawl
    ? `M35 11 C${35 - shawlWidth} 15 ${18 - shawlWidth / 2} 25 ${18 - shawlWidth / 2} 36 C${20 - shawlWidth / 3} 40 28 42 35 43`
    : isPeak
      ? 'M35 11 L22 18 L12 16 L24 31 L35 43'
      : 'M35 11 L23 19 L16 27 L24 31 L35 43';
  const rightLapel = leftLapel.replace(/(M35|L35|C35)/g, 'X').replace(/[0-9]+/g, (value) => String(70 - Number(value))).replace(/X/g, (value) => value);
  const mirrored = isShawl
    ? `M35 11 C${35 + shawlWidth} 15 ${52 + shawlWidth / 2} 25 ${52 + shawlWidth / 2} 36 C${50 + shawlWidth / 3} 40 42 42 35 43`
    : isPeak
      ? 'M35 11 L48 18 L58 16 L46 31 L35 43'
      : 'M35 11 L47 19 L54 27 L46 31 L35 43';
  const satin = isTuxedo
    ? `<path d="${isShawl ? `M35 14 C${35 - shawlWidth + 3} 18 ${22 - shawlWidth / 2} 27 ${22 - shawlWidth / 2} 35` : isPeak ? 'M34 14 L24 20 L17 19 L27 29 L34 40' : 'M34 14 L25 21 L20 27 L26 29 L34 40'}" stroke="#C9A87A" stroke-width="1.15" stroke-linecap="round"/>`
    : '';
  const widthMarker = style === 'tuxedo-shawl-slim'
    ? '<path d="M21 48 H27 M21 51 H27" stroke="#C9A87A" stroke-width="1.4" stroke-linecap="round"/>'
    : style === 'tuxedo-shawl-wide'
      ? '<path d="M17 48 H29 M17 51 H29" stroke="#C9A87A" stroke-width="1.4" stroke-linecap="round"/>'
      : style === 'tuxedo-shawl'
        ? '<path d="M19 48 H28 M19 51 H28" stroke="#C9A87A" stroke-width="1.4" stroke-linecap="round"/>'
        : '';
  return `
    <svg width="40" height="46" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M35 10 L14 22 L10 74 L60 74 L56 22 Z" stroke="currentColor" stroke-width="1" stroke-opacity="0.22" stroke-linejoin="round"/>
      <path d="M28 10 L35 16 L42 10" stroke="currentColor" stroke-width="1" stroke-opacity="0.38"/>
      <path d="M35 42 V72" stroke="currentColor" stroke-width="1" stroke-opacity="0.18" stroke-dasharray="2 3"/>
      <path d="${leftLapel}" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${mirrored}" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"/>
      ${satin}
      ${isTuxedo ? '<path d="M31 15 L35 18 L39 15" stroke="#C9A87A" stroke-width="1" stroke-linecap="round"/>' : ''}
      ${widthMarker}
    </svg>
  `;
}

function premiumShoulderIcon(style) {
  const shoulder = style === 'square'
    ? 'M28 17 L10 18 L8 53 M42 17 L60 18 L62 53'
    : style === 'sloping'
      ? 'M28 17 L12 29 L10 53 M42 17 L58 29 L60 53'
      : 'M28 17 Q17 19 11 25 L10 53 M42 17 Q53 19 59 25 L60 53';
  const marker = style === 'square'
    ? '<path d="M10 15 L12 24 M60 15 L58 24" stroke="#C9A87A" stroke-width="1.4"/>'
    : style === 'sloping'
      ? '<path d="M14 27 L18 30 M56 27 L52 30" stroke="#C9A87A" stroke-width="1.4"/>'
      : '<path d="M15 24 Q18 28 21 29 M55 24 Q52 28 49 29" stroke="#C9A87A" stroke-width="1.4" fill="none"/>';
  return `
    <svg width="40" height="40" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M28 16 C32 14 38 14 42 16" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.42"/>
      <path d="M28 16 L31 28 M42 16 L39 28" stroke="currentColor" stroke-width="1" stroke-opacity="0.28"/>
      <path d="${shoulder}" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"/>
      ${marker}
      <line x1="35" y1="28" x2="35" y2="57" stroke="currentColor" stroke-width="1" stroke-opacity="0.18" stroke-dasharray="2 3"/>
    </svg>
  `;
}

Object.assign(ICONS, {
  Notch: premiumLapelIcon('notch'),
  Peak: premiumLapelIcon('peak'),
  Shawl: premiumLapelIcon('shawl'),
  'Tuxedo Notch': premiumLapelIcon('tuxedo-notch'),
  'Tuxedo Peak': premiumLapelIcon('tuxedo-peak'),
  'Tuxedo Shawl 1': premiumLapelIcon('tuxedo-shawl-slim'),
  'Tuxedo Shawl 2': premiumLapelIcon('tuxedo-shawl'),
  'Tuxedo Shawl 3': premiumLapelIcon('tuxedo-shawl-wide'),
  'Same as Sample': premiumLapelIcon('notch'),
  Square: premiumShoulderIcon('square'),
  Regular: premiumShoulderIcon('regular'),
  Sloping: premiumShoulderIcon('sloping'),
});

/**
 * Get the SVG markup for a specific icon by option value.
 * Returns null if no custom icon exists for this value.
 *
 * @param {string} optionValue - The exact option string from TAILORING_SCHEMA
 * @returns {string|null} - SVG markup with currentColor for theme integration
 */

const genericPlaceholder = (w, h, path) => '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><g stroke="currentColor" stroke-width="1.5" fill="none">' + path + '</g></svg>';

const COLLAR_PLACEHOLDER = genericPlaceholder(40, 20, '<path d="M5 20 L20 5 L35 20"/>');
const CUFF_PLACEHOLDER = genericPlaceholder(40, 20, '<rect x="5" y="5" width="30" height="10" rx="2"/><circle cx="20" cy="10" r="1" fill="currentColor" stroke="none"/>');
const BELT_PLACEHOLDER = genericPlaceholder(30, 20, '<rect x="10" y="2" width="10" height="16" rx="1"/>');
const WAIST_PLACEHOLDER = genericPlaceholder(40, 20, '<path d="M0 10 L40 10" stroke-dasharray="2 2"/>');
const BPOCKET_PLACEHOLDER = genericPlaceholder(30, 20, '<path d="M5 5 L25 5 L15 15 Z"/>');

const MISSING_MAP = {
  // Collars
  'Forward Point': COLLAR_PLACEHOLDER, 'Spread': COLLAR_PLACEHOLDER, 'Wide Spread': COLLAR_PLACEHOLDER,
  'Button Down': COLLAR_PLACEHOLDER, 'Club': COLLAR_PLACEHOLDER, 'Cutaway': COLLAR_PLACEHOLDER,
  'Tab': COLLAR_PLACEHOLDER, 'Wing': COLLAR_PLACEHOLDER, 'Mandarin': COLLAR_PLACEHOLDER,
  'Grandad': COLLAR_PLACEHOLDER, 'Band': COLLAR_PLACEHOLDER, 'Hidden Button': COLLAR_PLACEHOLDER,
  // Cuffs
  'Barrel (1 Button)': CUFF_PLACEHOLDER, 'Barrel (2 Button)': CUFF_PLACEHOLDER, 'French': CUFF_PLACEHOLDER,
  'Convertible': CUFF_PLACEHOLDER, 'Angled': CUFF_PLACEHOLDER, 'Rounded': CUFF_PLACEHOLDER, 'Square': CUFF_PLACEHOLDER,
  // Belt loops
  'Standard': BELT_PLACEHOLDER, 'LB Hook Square': BELT_PLACEHOLDER, 'LB Button': BELT_PLACEHOLDER,
  // Waistband
  'Buckle': WAIST_PLACEHOLDER, 'Elastic': WAIST_PLACEHOLDER, 'Gurkha': WAIST_PLACEHOLDER, 'Side Adjuster': WAIST_PLACEHOLDER,
  // Back pockets
  'None': '', 'Jetted': BPOCKET_PLACEHOLDER, 'Welt': BPOCKET_PLACEHOLDER, 'Flap': BPOCKET_PLACEHOLDER,
  'Button': BPOCKET_PLACEHOLDER, 'Zip': BPOCKET_PLACEHOLDER, 'Patch': BPOCKET_PLACEHOLDER, 'Diagonal': BPOCKET_PLACEHOLDER,
  // Pockets that were missed in icons.js
  'Straight': genericPlaceholder(30,20,'<rect x="2" y="2" width="26" height="16"/>'),
  'Diagonal': genericPlaceholder(30,20,'<rect x="2" y="4" width="26" height="16" transform="rotate(-5 15 10)"/>'),
  'Patch': genericPlaceholder(30,20,'<rect x="4" y="2" width="22" height="16" rx="2"/>'),
  'Flap Straight': genericPlaceholder(30,20,'<rect x="2" y="2" width="26" height="16"/><path d="M2 8 L28 8"/>'),
  'Flap Diagonal': genericPlaceholder(30,20,'<g transform="rotate(-5 15 10)"><rect x="2" y="2" width="26" height="16"/><path d="M2 8 L28 8"/></g>'),
  'Ticket': genericPlaceholder(30,20,'<rect x="4" y="4" width="16" height="10"/>'),
  'Jetted': genericPlaceholder(30,20,'<path d="M4 10 L26 10 M4 12 L26 12"/>'),
};

export function getIcon(optionValue) {
  return ICONS[optionValue] || MISSING_MAP[optionValue] || null;
}
