/**
 * schema.js — Canonical Suit Configuration Schema & Picklist Options
 *
 * Single source of truth audited against the 16 reference sheets.
 * Categories: Jacket, Shirt, Trouser, Waistcoat, Embroidery, Measurements.
 *
 * TOOLTIP_DESCRIPTIONS: parallel lookup map — option value → one-sentence plain-language description.
 * Used by the configurator wizard to show styled hover/focus tooltips on option cards.
 * Keys match the exact option strings in TAILORING_SCHEMA.
 */

export const TAILORING_SCHEMA = {
  jacket: {
    lapelStyle: [
      'Notch',
      'Peak',
      'Shawl',
      'Tuxedo Notch',
      'Tuxedo Peak',
      'Tuxedo Shawl 1',
      'Tuxedo Shawl 2',
      'Tuxedo Shawl 3',
      'Same as Sample'
    ],
    lapelSize: 'text', // write-in numeric/dimension (cm or in)
    lapelDetail: [
      'Milanese by hand',
      'Eyelet by hand',
      'No-em seam'
    ],
    buttonBreastStyle: [
      '1 Button Suit',
      '2 Button Suit',
      '3 Button Suit',
      '4 Button',
      '6 Button',
      'Single Breasted',
      'Double Breasted'
    ],
    sleeveButtonStyle: [
      'HS3',
      'H4',
      'HS5',
      'HS4',
      'Same as Sample'
    ],
    vent: [
      'Single Vent',
      'Double Vent'
    ],
    pocketStyle: [
      'Straight Bone',
      'Slanted Bone',
      'Straight Valet',
      'Slanting Valet',
      'Barchetta',
      'Tasca Pignata',
      'Rounded Patch Pocket',
      'Same as Sample'
    ],
    shoulderShape: [
      'Square',
      'Regular',
      'Sloping'
    ],
    backShape: [
      'Normal',
      'Erect',
      'Hunched'
    ],
    stomachShape: [
      'Flat',
      'Slight',
      'Large'
    ],
    pipingColor: 'color',       // hex code
    buttonholeColor: 'color',   // hex code
    liningColor: 'color',       // hex code
    fabricCode: 'text'          // write-in code
  },

  shirt: {
    collarStyle: [
      'Forward-Point',
      'Standard Kent',
      'Band Stoika',
      'Tuxedo Collar',
      'Cutaway',
      'English Spread',
      'Spread',
      'Snap-Tab',
      'Club',
      'Button-Down',
      'Hidden Button',
      'Same as Sample'
    ],
    cuffStyle: [
      'Standard',
      '3 Button',
      '2 Button',
      'French Cuff R',
      'French Cuff',
      'Cufflink Cuff',
      '2 Button on Both Side'
    ],
    pocketCount: [
      'No Pockets',
      'One Pocket',
      'Two Pockets'
    ],
    pocketShape: [
      'Style 1',
      'Style 2',
      'Style 3',
      'Style 4',
      'Style 5',
      'Style 6',
      'Style 7',
      'Style 8'
    ],
    placketStyle: [
      'Standard Placket',
      'French Placket',
      'Concealed Placket'
    ]
  },

  trouser: {
    pleatStyle: [
      'Flat',
      '1 Pleat',
      '2 Pleat',
      'Same as Sample'
    ],
    backPocketStyle: [
      'Flap style 1',
      'Flap style 2',
      'Cross',
      'L',
      'L with Notch',
      'Double Bone',
      'Side',
      'Same as Sample'
    ],
    beltLoopStyle: [
      'Standard',
      'LB Hook Square',
      'LB Button Rounded Edge',
      'Same as Sample'
    ],
    waistbandStyle: [
      'Buckle on Top of Belt',
      'Elastic',
      'Same as Sample'
    ],
    gurkhaTrouser: 'boolean', // true/false toggle
    frontCoinPocketStyle: [
      'Outside',
      'Top of Belt',
      'Outside with Flap Button',
      'Same as Sample'
    ]
  },

  waistcoat: {
    style: [
      'Style 1',
      'Style 2',
      'Style 3 (Standard)',
      'Same as Sample'
    ],
    pipingColor: 'color', // hex code
    liningColor: 'color'  // hex code
  },

  embroidery: {
    shirtLocation: 'text',   // write-in placement / initials
    pantLocation: 'text',    // write-in placement
    jacketLocation: 'text',  // write-in placement
    threadColor: 'color'     // hex code
  },

  measurements: {
    units: ['cm', 'in'],
    defaultFields: [
      { key: 'chest', label: 'Chest' },
      { key: 'waist', label: 'Waist' },
      { key: 'hip', label: 'Hip' },
      { key: 'shoulderWidth', label: 'Shoulder Width' },
      { key: 'sleeveLength', label: 'Sleeve Length' },
      { key: 'jacketLength', label: 'Jacket Length' },
      { key: 'trouserWaist', label: 'Trouser Waist' },
      { key: 'trouserInseam', label: 'Trouser Inseam' },
      { key: 'trouserOutseam', label: 'Trouser Outseam' },
      { key: 'neckCollarSize', label: 'Neck / Collar Size' },
      { key: 'shirtLength', label: 'Shirt Length' },
      { key: 'bicep', label: 'Bicep' }
    ]
  }
};

/**
 * Returns an empty, well-structured default draft object matching the audited schema.
 */
export function createEmptyDraft() {
  return {
    jacket: {
      lapelStyle: '',
      lapelSize: '',
      lapelDetail: '',
      buttonBreastStyle: '',
      sleeveButtonStyle: '',
      vent: '',
      pocketStyle: '',
      shoulderShape: '',
      backShape: '',
      stomachShape: '',
      pipingColor: '#8B6F47',
      buttonholeColor: '#1C1C1E',
      liningColor: '#E2DDD6',
      fabricCode: ''
    },
    shirt: {
      collarStyle: '',
      cuffStyle: '',
      pocketCount: 'No Pockets',
      pocketShape: '',
      placketStyle: ''
    },
    trouser: {
      pleatStyle: '',
      backPocketStyle: '',
      beltLoopStyle: '',
      waistbandStyle: '',
      gurkhaTrouser: false,
      frontCoinPocketStyle: ''
    },
    waistcoat: {
      style: '',
      pipingColor: '#8B6F47',
      liningColor: '#E2DDD6'
    },
    embroidery: {
      shirtLocation: '',
      pantLocation: '',
      jacketLocation: '',
      threadColor: '#C9A87A'
    },
    measurements: {
      unit: 'cm',
      values: {},
      custom: []
    }
  };
}

/**
 * TOOLTIP_DESCRIPTIONS
 * One-sentence plain-language description for every picklist option value.
 * Icon shows the shape; tooltip explains the term.
 * Key = exact option string from TAILORING_SCHEMA arrays above.
 */
export const TOOLTIP_DESCRIPTIONS = {

  // ── JACKET: Lapel Style ───────────────────────────────────────────────────
  'Notch': 'The most common suit lapel — a triangular V-notch is cut where the lapel meets the collar, pointing inward toward the chest.',
  'Peak': 'The lapel tip points upward and outward past the collar seam, giving a strong, wide, formal silhouette.',
  'Shawl': 'One smooth, unbroken curve from shoulder to the button — no notch at all — typical of dinner jackets and tuxedos.',
  'Tuxedo Notch': 'Standard notch lapel with the front face cut in satin or silk for a formal evening contrast.',
  'Tuxedo Peak': 'Wide peak lapel with a satin- or silk-faced front — the most formal lapel for black-tie wear.',
  'Tuxedo Shawl 1': 'Narrow shawl collar with satin facing — the roll stays close to centre and ends at mid-chest.',
  'Tuxedo Shawl 2': 'Medium-width satin shawl — wider sweep than Shawl 1, with the roll ending near the waist.',
  'Tuxedo Shawl 3': 'Widest satin shawl option — dramatic curve that extends nearly to the jacket side seam.',

  // ── JACKET: Lapel Detail ─────────────────────────────────────────────────
  'Milanese by hand': 'The lapel buttonhole is hand-stitched in the Milanese method, producing a raised, flower-like finish considered the finest bespoke detail.',
  'Eyelet by hand': 'The lapel buttonhole is punched as a clean eyelet and hand-finished — subtler and flatter than Milanese.',
  'No-em seam': 'No functional buttonhole on the lapel; the seam is sewn closed for a clean, minimal look.',

  // ── JACKET: Button & Breast Style ───────────────────────────────────────
  '1 Button Suit': 'A single button at the natural waist — the most minimalist fastening, typical of very formal or fashion-forward cuts.',
  '2 Button Suit': 'Two buttons stacked vertically — the standard modern business suit configuration; only the top button is fastened.',
  '3 Button Suit': 'Three buttons with a higher gorge line — a classic English cut; typically only the middle button is fastened.',
  '4 Button': 'Four buttons in a column — a more formal or fashion-specific choice, often seen on longer jackets.',
  '6 Button': 'Six buttons arranged in two columns — only used on double-breasted jackets, providing a commanding formal silhouette.',
  'Single Breasted': 'One column of buttons down the centre front — the standard suit construction for most business and casual suits.',
  'Double Breasted': 'Two overlapping front panels each with buttons, creating a broad, formal chest — associated with power dressing.',

  // ── JACKET: Sleeve Button Style ──────────────────────────────────────────
  'HS3': '3 sleeve buttons, half-stitched (the innermost buttonhole is functional/kissing — it can actually be unbuttoned).',
  'H4': '4 sleeve buttons, all hand-stitched but non-functional — decorative only, the classic bespoke sleeve finish.',
  'HS5': '5 sleeve buttons, half-stitched — the innermost is functional, giving a more dramatic sleeve presence.',
  'HS4': '4 sleeve buttons, half-stitched — the most common bespoke sleeve option; innermost button is functional.',

  // ── JACKET: Vent ────────────────────────────────────────────────────────
  'Single Vent': 'One central slit at the back hem — the American standard; practical but can gape when hands are in pockets.',
  'Double Vent': 'Two side slits at the back hem — the British/Italian standard; drapes more elegantly when moving.',

  // ── JACKET: Pocket Style ─────────────────────────────────────────────────
  'Straight Bone': 'A horizontal welt pocket with no flap — the most formal and minimal chest pocket option.',
  'Slanted Bone': 'A welt pocket set at a slight upward angle — more casual and Italian in character than the straight bone.',
  'Straight Valet': 'A welt pocket with a flap that lies flat over the opening — practical and traditional.',
  'Slanting Valet': 'An angled flap pocket — combines the Italian slant with the practicality of a flap cover.',
  'Barchetta': 'A curved, boat-shaped breast pocket with no flap, curving upward at the ends — an Italian design hallmark.',
  'Tasca Pignata': 'A pleated patch pocket shaped like a pinecone or bellows — expands when filled, typical of country and sporting jackets.',
  'Rounded Patch Pocket': 'A flat patch sewn onto the jacket front with rounded bottom corners — casual, visible, and relaxed in character.',

  // ── JACKET: Shoulder Shape ───────────────────────────────────────────────
  'Square': 'The shoulder is built up to sit horizontally — a structured, angular silhouette associated with Italian tailoring.',
  'Regular': 'A gentle natural slope following the body\'s own shoulder line — the most versatile and universally flattering cut.',
  'Sloping': 'A pronounced downward slope from neck to armhole — follows the natural drop of sloping or athletic shoulders.',

  // ── JACKET: Back Shape ───────────────────────────────────────────────────
  'Normal': 'Standard back construction — suitable for a neutral, upright posture.',
  'Erect': 'Extra fabric removed from the upper back — suits a military or very upright posture to prevent the jacket riding up.',
  'Hunched': 'Extra fabric added to the upper back — compensates for rounded or forward shoulders so the jacket lies flat.',

  // ── JACKET: Stomach Shape ────────────────────────────────────────────────
  'Flat': 'Front cut for a naturally flat or lean stomach — no extra ease in the front panels.',
  'Slight': 'A small amount of extra ease added to the front — for a slight stomach prominence without a full adjustment.',
  'Large': 'Significant front ease and suppression adjustment — for a more prominent stomach to ensure the jacket closes cleanly.',

  // ── SHIRT: Collar Style ──────────────────────────────────────────────────
  'Forward-Point': 'Long, narrow collar points that angle slightly forward and down — a classic option that works well under a tie.',
  'Standard Kent': 'Medium-length straight collar points with a moderate spread — the everyday default for business shirts.',
  'Band Stoika': 'No collar fold at all — just a standing band around the neck, giving a minimal, mandarin-collar look.',
  'Tuxedo Collar': 'A wing collar with two small horizontal points that fold outward at the front — worn with formal black-tie shirts.',
  'Cutaway': 'Extremely wide spread with points angling almost horizontally — showcases the tie knot and gives a bold, modern look.',
  'English Spread': 'A wide spread similar to Cutaway but with points angling more downward — popular for full Windsor knots.',
  'Spread': 'Moderate spread between Standard Kent and English Spread — versatile enough for most tie knot sizes.',
  'Snap-Tab': 'A collar with a tab or pin connecting both points under the tie, keeping it lifted and centred.',
  'Club': 'Short collar points with fully rounded tips — a soft, collegiate style originating at English public schools.',
  'Button-Down': 'Collar points each have a small button that fastens to the shirt front, keeping them from curling up.',
  'Hidden Button': 'Like Button-Down but the collar buttons are concealed under a small flap — clean finish of a button-down.',

  // ── SHIRT: Cuff Style ────────────────────────────────────────────────────
  'Standard': 'A single-layer cuff fastened with one button — the most common and versatile shirt cuff.',
  '3 Button': 'Three buttons in a row across the cuff, giving more adjustability and a distinctive look.',
  '2 Button': 'Two buttons side by side for a slightly wider cuff fastening than standard.',
  'French Cuff R': 'A doubled-back cuff fastened with cufflinks — right-handed orientation; the fold-back faces outward.',
  'French Cuff': 'A doubled-back cuff fastened with cufflinks — the most formal shirt cuff style, standard for evening wear.',
  'Cufflink Cuff': 'A single-layer cuff with buttonholes on both edges (no buttons) — requires cufflinks to close.',
  '2 Button on Both Side': 'Two buttons on each side of the cuff, giving four total — a distinctive detail for a bespoke shirt.',

  // ── SHIRT: Pocket Count ──────────────────────────────────────────────────
  'No Pockets': 'A clean, pocketless shirt front — the most formal option, preferred for dress shirts.',
  'One Pocket': 'A single chest pocket on the left breast — the everyday standard for casual and business shirts.',
  'Two Pockets': 'A pocket on each breast — more casual; typical of work shirts and safari styles.',

  // ── SHIRT: Pocket Shape ──────────────────────────────────────────────────
  'Style 1': 'Pocket shape option 1 — square bottom with a straight squared-off top opening.',
  'Style 2': 'Pocket shape option 2 — square base with a slightly angled or shaped opening.',
  'Style 3': 'Pocket shape option 3 — rounded bottom corners for a softer appearance.',
  'Style 4': 'Pocket shape option 4 — pointed bottom (inverted V-bottom), giving a decorative finish.',
  'Style 5': 'Pocket shape option 5 — asymmetric or buttoned flap on the pocket.',
  'Style 6': 'Pocket shape option 6 — pleated pocket that expands when in use.',
  'Style 7': 'Pocket shape option 7 — curved top opening with a scalloped or shaped edge.',
  'Style 8': 'Pocket shape option 8 — a flap-covered pocket for added structure.',

  // ── SHIRT: Placket Style ─────────────────────────────────────────────────
  'Standard Placket': 'Buttons sit on a visible raised strip sewn down the centre front — the most common shirt construction.',
  'French Placket': 'No raised strip — the shirt front is folded flat over itself and buttons sit flush on the shirt face.',
  'Concealed Placket': 'Buttons are fully hidden behind a wide front panel — gives the cleanest, most minimalist chest appearance.',

  // ── TROUSER: Pleat Style ─────────────────────────────────────────────────
  'Flat': 'No pleats — a smooth, flat front panel for a slim, modern silhouette.',
  '1 Pleat': 'One fold of fabric on each side of the centre crease, adding room across the thigh when sitting or moving.',
  '2 Pleat': 'Two folds per side — the most traditional cut, giving maximum comfort and a classic drape.',

  // ── TROUSER: Back Pocket Style ───────────────────────────────────────────
  'Flap style 1': 'A back pocket covered by a standard rectangular flap — the most common trouser pocket closure.',
  'Flap style 2': 'A back pocket flap with a slightly different shape or proportion than Style 1.',
  'Cross': 'A back pocket opening that runs diagonally or in a cross-cut — a distinctive Italian detail.',
  'L': 'An L-shaped welt pocket opening — a traditional tailored detail seen on British trousers.',
  'L with Notch': 'An L-shaped welt pocket with a small notch cut at the corner of the L — a refined finishing touch.',
  'Double Bone': 'Two parallel welt lips forming the pocket opening — a clean, formal detail requiring no flap.',
  'Side': 'A pocket that opens from the side seam of the trouser rather than from the back panel — hidden when viewed from behind.',

  // ── TROUSER: Belt Loop Style ─────────────────────────────────────────────
  'LB Hook Square': 'A belt loop with a squared-off hook end at the top — the hook prevents the belt from slipping out.',
  'LB Button Rounded Edge': 'A belt loop with a small button at its base and a rounded edge — the button holds the loop down flat against the waistband.',

  // ── TROUSER: Waistband Style ─────────────────────────────────────────────
  'Buckle on Top of Belt': 'A waistband with a metal buckle or clasp sitting on top — typically used instead of a belt, common on dress trousers.',
  'Elastic': 'Elastic panels (full or partial) built into the waistband — gives comfort and flexibility across the waist.',

  // ── TROUSER: Gurkha ──────────────────────────────────────────────────────
  'Standard Waistband': 'A conventional flat waistband — one layer, fastened with a hook, button, or clasp at the front.',
  'Gurkha Wrap Waistband': 'Two overlapping fabric straps that wrap and cross over the front, buckled at the side — no belt required, and highly distinctive.',

  // ── TROUSER: Front Coin Pocket ───────────────────────────────────────────
  'Outside': 'A small coin pocket sewn onto the outside of the trouser front — visible and accessible.',
  'Top of Belt': 'The coin pocket is integrated into the top of the waistband, sitting above the main trouser body.',
  'Outside with Flap Button': 'An outside coin pocket with a small flap and button to secure the opening.',

  // ── WAISTCOAT: Style ─────────────────────────────────────────────────────
  'Style 1': 'Waistcoat silhouette option 1 — refer to the icon for the specific lapel and front shape.',
  'Style 2': 'Waistcoat silhouette option 2 — refer to the icon for the specific lapel and front shape.',
  'Style 3 (Standard)': 'The standard waistcoat — a classic V-front with no lapels, traditional five-button closure.',
};
