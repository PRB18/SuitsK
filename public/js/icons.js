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
    <svg width="40" height="40" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Neck base & collar -->
      <path d="M28 16 C32 14 38 14 42 16" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
      <path d="M28 16 L31 28 M42 16 L39 28" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>

      <!-- Square / Roped Shoulder Line: Firm, horizontal shoulder pitch with sharp 90° roped sleevehead -->
      <path d="M28 16 L10 18 L8 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter"/>
      <path d="M42 16 L60 18 L62 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter"/>

      <!-- Roped head ridge marker -->
      <path d="M10 16 L12 24 M60 16 L58 24" stroke="#C9A87A" stroke-width="1.5"/>

      <!-- Center seam guide -->
      <line x1="35" y1="28" x2="35" y2="56" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>

      <!-- Label subtitle -->
      <text x="35" y="62" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.08em">STRUCTURED</text>
    </svg>
  `,

  // 2. Regular: Natural soft Neapolitan shoulder line (Spalla Camicia)
  'Regular': `
    <svg width="40" height="40" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Neck base -->
      <path d="M28 16 C32 14 38 14 42 16" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
      <path d="M28 16 L31 28 M42 16 L39 28" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>

      <!-- Regular / Natural Shoulder Line: Gentle natural anatomy drape with softly rounded sleevehead -->
      <path d="M28 16 Q16 19 12 23 L10 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M42 16 Q54 19 58 23 L60 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Center seam guide -->
      <line x1="35" y1="28" x2="35" y2="56" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>

      <!-- Label subtitle -->
      <text x="35" y="62" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.08em">NATURAL</text>
    </svg>
  `,

  // 3. Sloping: Pronounced downward athletic drop from neck point to armhole
  'Sloping': `
    <svg width="40" height="40" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Neck base -->
      <path d="M28 16 C32 14 38 14 42 16" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
      <path d="M28 16 L31 28 M42 16 L39 28" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4"/>

      <!-- Sloping Shoulder Line: Steep downward gradient angle from collar to armhole -->
      <path d="M28 16 L12 29 L11 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M42 16 L58 29 L59 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Center seam guide -->
      <line x1="35" y1="28" x2="35" y2="56" stroke="currentColor" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="2 2"/>

      <!-- Label subtitle -->
      <text x="35" y="62" font-family="var(--font-ui, sans-serif)" font-size="7" font-weight="700" fill="#C9A87A" text-anchor="middle" letter-spacing="0.08em">SLOPING</text>
    </svg>
  `,
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
  const path = shape === 'Erect'
    ? 'M18 52 Q22 25 35 18 Q48 25 52 52'
    : shape === 'Hunched'
      ? 'M18 48 Q22 32 35 28 Q48 32 52 48'
      : 'M18 52 Q22 20 35 20 Q48 20 52 52';
  return jacketLineIcon(label, label.toUpperCase(), `<path d="${path}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`);
}

function stomachIcon(label, amount) {
  const path = amount === 'Large'
    ? 'M24 21 Q15 35 24 52 Q35 59 46 52 Q55 35 46 21'
    : amount === 'Slight'
      ? 'M27 21 Q22 35 27 51 Q35 56 43 51 Q48 35 43 21'
      : 'M30 21 Q28 35 30 50 H40 Q42 35 40 21';
  return jacketLineIcon(label, label.toUpperCase(), `<path d="${path}" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`);
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

/**
 * Get the SVG markup for a specific icon by option value.
 * Returns null if no custom icon exists for this value.
 *
 * @param {string} optionValue - The exact option string from TAILORING_SCHEMA
 * @returns {string|null} - SVG markup with currentColor for theme integration
 */
export function getIcon(optionValue) {
  return ICONS[optionValue] || null;
}
