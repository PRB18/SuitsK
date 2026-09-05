/**
 * icons.js — Custom SVG icon library for Krishna Suits
 *
 * Stage 5: Bespoke vector icons for jacket lapel styles and shoulder shapes.
 * Each icon is optimized for 36x36px rendering inside .option-card containers.
 *
 * Stroke color inherits currentColor from parent for proper theme integration.
 */

export const ICONS = {
  // ============================================================================
  // JACKET LAPEL STYLES (9 icons)
  // ============================================================================

  'Notch': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
      <path d="M35 10 L18 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M35 10 L22 28 L16 32 L20 36 L35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 10 L52 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M35 10 L48 28 L54 32 L50 36 L35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <line x1="35" y1="28" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Peak': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
      <path d="M35 10 L16 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M35 10 L18 24 L8 20 L18 30 L35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 10 L54 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M35 10 L52 24 L62 20 L52 30 L35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <line x1="35" y1="28" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Shawl': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
      <path d="M35 10 C30 12 20 20 16 32 C22 34 30 30 35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 10 C40 12 50 20 54 32 C48 34 40 30 35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <line x1="35" y1="28" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Tuxedo Notch': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
      <path d="M35 10 L22 28 L16 32 L20 36 L35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 10 L48 28 L54 32 L50 36 L35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 11 L23 28 L18 31 L21 35 L35 28" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <path d="M35 11 L47 28 L52 31 L49 35 L35 28" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <line x1="35" y1="28" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Tuxedo Peak': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
      <path d="M35 10 L18 24 L8 20 L18 30 L35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 10 L52 24 L62 20 L52 30 L35 28" fill="#252520" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 11 L19 24 L10 21 L19 29 L35 28" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <path d="M35 11 L51 24 L60 21 L51 29 L35 28" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <line x1="35" y1="28" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Tuxedo Shawl 1': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
      <path d="M35 10 C32 13 24 22 22 30 C26 32 32 30 35 28" fill="#252520" stroke="currentColor" stroke-width="2"/>
      <path d="M35 10 C38 13 46 22 48 30 C44 32 38 30 35 28" fill="#252520" stroke="currentColor" stroke-width="2"/>
      <path d="M35 11 C33 14 26 22 24 30 C27 31 32 30 35 28" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <path d="M35 11 C37 14 44 22 46 30 C43 31 38 30 35 28" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <line x1="35" y1="28" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Tuxedo Shawl 2': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
      <path d="M35 10 C30 13 18 24 14 42 C20 44 30 38 35 36" fill="#252520" stroke="currentColor" stroke-width="2"/>
      <path d="M35 10 C40 13 52 24 56 42 C50 44 40 38 35 36" fill="#252520" stroke="currentColor" stroke-width="2"/>
      <path d="M35 11 C31 14 20 24 16 42 C21 43 30 38 35 36" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <path d="M35 11 C39 14 50 24 54 42 C49 43 40 38 35 36" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <line x1="35" y1="36" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Tuxedo Shawl 3': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
      <path d="M35 10 C28 14 12 28 6 52 C14 54 28 46 35 42" fill="#252520" stroke="currentColor" stroke-width="2"/>
      <path d="M35 10 C42 14 58 28 64 52 C56 54 42 46 35 42" fill="#252520" stroke="currentColor" stroke-width="2"/>
      <path d="M35 11 C29 15 14 28 8 52 C15 53 28 46 35 42" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <path d="M35 11 C41 15 56 28 62 52 C55 53 42 46 35 42" fill="none" stroke="#8B6F47" stroke-width="1.2"/>
      <line x1="35" y1="42" x2="35" y2="74" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Same as Sample': `
    <svg width="36" height="44" viewBox="0 0 70 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 L10 22 L6 74 L64 74 L60 22 Z" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" stroke-opacity="0.5"/>
      <path d="M25 30 L45 30 M25 40 L45 40 M25 50 L45 50" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/>
      <text x="35" y="45" font-family="var(--font-ui)" font-size="10" fill="currentColor" text-anchor="middle" opacity="0.7">≈</text>
    </svg>
  `,

  // ============================================================================
  // JACKET SHOULDER SHAPES (3 icons)
  // ============================================================================

  'Square': `
    <svg width="36" height="36" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="18" r="8" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5"/>
      <path d="M12 24 L12 24 L12 60 L58 60 L58 24 L58 24" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/>
      <line x1="12" y1="24" x2="27" y2="18" stroke="currentColor" stroke-width="1.5"/>
      <line x1="58" y1="24" x2="43" y2="18" stroke="currentColor" stroke-width="1.5"/>
      <line x1="35" y1="26" x2="35" y2="60" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Regular': `
    <svg width="36" height="36" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="18" r="8" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5"/>
      <path d="M12 28 Q12 24 15 24 L15 24 L15 60 L55 60 L55 24 L55 24 Q58 24 58 28" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <line x1="15" y1="24" x2="27" y2="18" stroke="currentColor" stroke-width="1.5"/>
      <line x1="55" y1="24" x2="43" y2="18" stroke="currentColor" stroke-width="1.5"/>
      <line x1="35" y1="26" x2="35" y2="60" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,

  'Sloping': `
    <svg width="36" height="36" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="18" r="8" fill="#1c1c1c" stroke="currentColor" stroke-width="1.5"/>
      <path d="M12 32 L18 60 L52 60 L58 32" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <line x1="12" y1="32" x2="27" y2="18" stroke="currentColor" stroke-width="1.5"/>
      <line x1="58" y1="32" x2="43" y2="18" stroke="currentColor" stroke-width="1.5"/>
      <line x1="35" y1="26" x2="35" y2="60" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>
    </svg>
  `,
};

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
