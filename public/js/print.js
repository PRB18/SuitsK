/**
 * print.js — 2-page Measurement Card print module
 *
 * Page 1: Client info header + 4-column measurement table
 *         (Suit/Jodhpuri | Pant | Shirt/Kurta | Waistcoat)
 *         Exact match to the "CONGRESSIONAL THE BESPOKE – BODY MEASUREMENT FORM"
 *
 * Page 2: Style-selection sheet with checkboxes for all configurator options
 *         (lapels, shoulder shape, pocket styles, belt loops, etc.)
 *
 * Strategy: populate #print-root (always in DOM, visually hidden),
 *           then call window.print(). @media print in print.css hides
 *           everything except #print-root.
 */

import { getIcon } from './icons.js';

// ── Measurement table columns ─────────────────────────────────────────────────
const SUIT_ROWS = [
  { key:'front_length',        label:'FRONT LENGTH'       },
  { key:'sleeve',              label:'SLEEVE'             },
  { key:'chest',               label:'CHEST'              },
  { key:'below_chest',         label:'BELOW CHEST'        },
  { key:'hips',                label:'HIPS'               },
  { key:'shoulder',            label:'SHOULDER'           },
  { key:'back_length',         label:'BACK LENGTH'        },
  { key:'collar',              label:'COLLAR'             },
  { key:'cross_f',             label:'CROSS F'            },
  { key:'cross_b',             label:'CROSS B'            },
  { key:'biceps',              label:'BICEPS'             },
  { key:'stomach',             label:'STOMACH'            },
  { key:'wrist',               label:'WRIST'              },
  { key:'h_back',              label:'H BACK'             },
  { key:'shoulder_to_elbow',   label:'SHOULDER TO ELBOW'  },
  { key:'elbow_to_wrist',      label:'ELBOW TO WRIST'     },
  { key:'collar_to_stomach',   label:'COLLAR TO STOMACH'  },
];

const PANT_ROWS = [
  { key:'p_front_length',  label:'FRONT LENGTH'   },
  { key:'p_length',        label:'LENGTH'         },
  { key:'p_waist',         label:'WAIST'          },
  { key:'p_waist_to_knee', label:'WAIST TO KNEE'  },
  { key:'p_thighs',        label:'THIGHS'         },
  { key:'p_knee',          label:'KNEE'           },
  { key:'p_bottom',        label:'BOTTOM'         },
  { key:'p_crotch',        label:'CROTCH'         },
  { key:'p_inseam_l',      label:'INSEAM L'       },
  { key:'p_fly',           label:'FLY'            },
  { key:'p_front',         label:'FRONT'          },
  { key:'p_back',          label:'BACK'           },
];

const SHIRT_ROWS = [
  { key:'sh_front_length',       label:'FRONT LENGTH'        },
  { key:'sh_sleeve',             label:'SLEEVE'              },
  { key:'sh_stomach',            label:'STOMACH'             },
  { key:'sh_back_length',        label:'BACK LENGTH'         },
  { key:'sh_chest',              label:'CHEST'               },
  { key:'sh_biceps',             label:'BICEPS'              },
  { key:'sh_hips',               label:'HIPS'                },
  { key:'sh_collar',             label:'COLLAR'              },
  { key:'sh_elbow_l',            label:'ELBOW L'             },
  { key:'sh_wrist',              label:'WRIST'               },
  { key:'sh_back_length2',       label:'BACK LENGTH'         },
  { key:'sh_collar_to_stomach',  label:'COLLAR TO STOMACH'   },
  { key:'sh_shoulder_to_elbow',  label:'SHOULDER TO ELBOW'   },
  { key:'sh_elbow_to_wrist',     label:'ELBOW TO WRIST'      },
  { key:'sh_half_shoulder',      label:'HALF SHOULDER'       },
];

const WC_ROWS = [
  { key:'wc_length',   label:'LENGTH'   },
  { key:'wc_chest',    label:'CHEST'    },
  { key:'wc_stomach',  label:'STOMACH'  },
  { key:'wc_shoulder', label:'SHOULDER' },
  { key:'wc_armhole',  label:'ARMHOLE'  },
  { key:'wc_collar',   label:'COLLAR'   },
  { key:'wc_v_shape',  label:'V SHAPE'  },
];

const STYLE_QTY_ROWS = [
  'Jacket','Sherwani','Sadri','Waistcoat','Jodhpuri','Shirts/Kurta','Pant','Safari jkt','Denim'
];

/**
 * Print a 2-page measurement card for a given client and project.
 * @param {object} client  — full client object (from api.getClient)
 * @param {object} project — project object with garment_type, measurements, etc.
 * @param {object} order   — optional order object for trial/delivery dates
 */
export function printMeasurementCard(client, project, order = null) {
  const meas   = project.measurements || {};
  const config = project.suitConfig   || {};  // style data if linked
  const root   = document.getElementById('print-root');
  if (!root) { console.error('[print] #print-root not found'); return; }

  root.innerHTML = buildPage1(client, project, meas, order) + buildPage2(config, project);
  window.print();
}

// ── Page 1: Body Measurement Form ────────────────────────────────────────────
function buildPage1(client, project, meas, order) {
  const maxRows = Math.max(SUIT_ROWS.length, PANT_ROWS.length, SHIRT_ROWS.length, WC_ROWS.length);
  const rows = Array.from({ length: maxRows }, (_, i) => {
    const s  = SUIT_ROWS[i]  || { key:'', label:'' };
    const p  = PANT_ROWS[i]  || { key:'', label:'' };
    const sh = SHIRT_ROWS[i] || { key:'', label:'' };
    const wc = WC_ROWS[i]    || { key:'', label:'' };
    return `
      <tr>
        <td class="mf-label">${s.label}</td>
        <td class="mf-val">${val(meas, s.key+'_l')}</td>
        <td class="mf-val">${val(meas, s.key+'_r')}</td>
        <td class="mf-sep"></td>
        <td class="mf-label">${p.label}</td>
        <td class="mf-val">${val(meas, p.key+'_l')}</td>
        <td class="mf-val">${val(meas, p.key+'_r')}</td>
        <td class="mf-sep"></td>
        <td class="mf-label">${sh.label}</td>
        <td class="mf-val">${val(meas, sh.key+'_l')}</td>
        <td class="mf-val">${val(meas, sh.key+'_r')}</td>
        <td class="mf-sep"></td>
        <td class="mf-label wc-label">${wc.label}</td>
        <td class="mf-val">${val(meas, wc.key+'_l') || val(meas, wc.key)}</td>
      </tr>
    `;
  }).join('');

  // Style/QTY column
  const styleQtyRows = STYLE_QTY_ROWS.map(t => {
    const isProject = t === project.garment_type;
    return `<tr class="${isProject ? 'style-row-active' : ''}"><td class="sq-type">${t}</td><td class="sq-qty">${isProject ? (project.qty || 1) : ''}</td></tr>`;
  }).join('');

  const orderDate    = order?.order_date    || '';
  const orderRef     = order?.order_ref     || '';
  const trialDate    = order?.trial_date    || '';
  const deliveryDate = order?.delivery_date || '';

  return `
  <div class="print-page" id="print-page-1">
    <!-- Top info row -->
    <div class="mf-top-row">
      <div class="mf-top-left">
        <div class="mf-meta-grid">
          <span class="mf-meta-label">Meters:</span><span class="mf-meta-val">${val(meas,'meters')}</span>
          <span class="mf-meta-label">Suit:</span><span class="mf-meta-val">${val(meas,'suit_qty')}</span>
          <span class="mf-meta-label">Shirt:</span><span class="mf-meta-val">${val(meas,'shirt_qty')}</span>
          <span class="mf-meta-label">Pant:</span><span class="mf-meta-val">${val(meas,'pant_qty')}</span>
        </div>
      </div>
      <div class="mf-top-center">
        <div class="mf-shop-name">CONGRESSIONAL THE BESPOKE</div>
        <div class="mf-form-title">BODY MEASUREMENT FORM</div>
      </div>
      <div class="mf-top-right">
        <table class="mf-style-qty">
          <thead><tr><th>STYLE</th><th>QTY</th></tr></thead>
          <tbody>${styleQtyRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Client info row -->
    <div class="mf-client-row">
      <span>CLIENT NAME: <strong>${escHtml(client.name)}</strong></span>
      <span>ORDER DATE: <strong>${fmtDate(orderDate)}</strong></span>
      <span>ORDER NO: <strong>${escHtml(orderRef)}</strong></span>
      <span>TRIAL DATE: <strong>${fmtDate(trialDate)}</strong></span>
      <span>DELIVERY DATE: <strong>${fmtDate(deliveryDate)}</strong></span>
    </div>

    <!-- Measurement table -->
    <table class="mf-main-table">
      <thead>
        <tr>
          <th colspan="3" class="mf-col-header">SUIT / JODHPURI</th>
          <th class="mf-sep-head"></th>
          <th colspan="3" class="mf-col-header">PANT</th>
          <th class="mf-sep-head"></th>
          <th colspan="3" class="mf-col-header">SHIRT / KURTA</th>
          <th class="mf-sep-head"></th>
          <th colspan="2" class="mf-col-header">WAISTCOAT</th>
        </tr>
        <tr class="mf-sub-header">
          <th>MEASUREMENT</th><th>L</th><th>R</th>
          <th class="mf-sep"></th>
          <th>MEASUREMENT</th><th>L</th><th>R</th>
          <th class="mf-sep"></th>
          <th>MEASUREMENT</th><th>L</th><th>R</th>
          <th class="mf-sep"></th>
          <th>MEASUREMENT</th><th>VALUE</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <!-- Signature row -->
    <div class="mf-signature-row">
      <div class="mf-sig">CLIENT SIGNATURE: <span class="mf-sig-line"></span></div>
      <div class="mf-sig">MANAGER SIGNATURE: <span class="mf-sig-line"></span></div>
    </div>
  </div>
  `;
}

// ── Page 2: Style Selection Sheet ────────────────────────────────────────────
function buildPage2(config, project) {
  const checked = (option, value) =>
    option === value ? '✓' : '○';

  // Jacket style data
  const j = config.jacket || {};
  const s = config.shirt  || {};
  const t = config.trouser|| {};
  const w = config.waistcoat || {};

  return `
  <div class="print-page" id="print-page-2">
    <div class="mf-top-center" style="margin-bottom:8pt;">
      <div class="mf-shop-name">CONGRESSIONAL THE BESPOKE</div>
      <div class="mf-form-title">STYLE SELECTION SHEET — ${escHtml(project.garment_type)}</div>
    </div>

    <div class="style-sheet-grid">

      <!-- LAPELS -->
      <div class="style-section">
        <div class="style-section-title">LAPELS</div>
        <div class="style-options-row">
          ${['Notch','Peak','Shawl','Tuxedo Notch','Tuxedo Peak','Shawl 1','Shawl 2','Shawl 3','Same as Sample'].map(opt =>
            `<div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(j.lapel,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
        ${j.lapelSize ? `<div class="style-note">Lapel Size: <strong>${j.lapelSize}</strong></div>` : ''}
      </div>

            <!-- SHOULDER -->
      <div class="style-section">
        <div class="style-section-title">SHOULDER SHAPE</div>
        <div class="style-options-row">
          ${['Square','Regular','Sloping'].map(opt =>
            <div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(j.shoulder,opt)} ${opt}</div></div>
          ).join('')}
        </div>
      </div>

      <!-- BACK SHAPE -->
      <div class="style-section">
        <div class="style-section-title">BACK SHAPE</div>
        <div class="style-options-row">
          ${['Normal','Erect','Hunched'].map(opt =>
            <div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(j.backShape,opt)} ${opt}</div></div>
          ).join('')}
        </div>
      </div>

      <!-- STOMACH SHAPE -->
      <div class="style-section">
        <div class="style-section-title">STOMACH SHAPE</div>
        <div class="style-options-row">
          ${['Flat','Slight','Large'].map(opt =>
            <div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(j.stomachShape,opt)} ${opt}</div></div>
          ).join('')}
        </div>
      </div>`
          ).join('')}
        </div>
      </div>

      <!-- JACKET POCKETS -->
      <div class="style-section">
        <div class="style-section-title">JACKET POCKET STYLE</div>
        <div class="style-options-row">
          ${['Straight','Diagonal','Patch','Flap Straight','Flap Diagonal','Rounded Patch','Ticket','Jetted'].map(opt =>
            `<div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(j.pockets,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
      </div>

      <!-- SHIRT COLLAR -->
      <div class="style-section">
        <div class="style-section-title">COLLAR STYLE</div>
        <div class="style-options-row">
          ${['Forward Point','Spread','Wide Spread','Button Down','Club','Cutaway','Tab','Wing','Mandarin','Grandad','Band','Hidden Button'].map(opt =>
            `<div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(s.collar,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
      </div>

      <!-- SHIRT CUFF -->
      <div class="style-section">
        <div class="style-section-title">CUFF STYLE</div>
        <div class="style-options-row">
          ${['Barrel (1 Button)','Barrel (2 Button)','French','Convertible','Angled','Rounded','Square'].map(opt =>
            `<div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(s.cuff,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
      </div>

      <!-- TROUSER: BELT LOOPS + WAISTBAND + BACK POCKETS -->
      <div class="style-section">
        <div class="style-section-title">BELT LOOP</div>
        <div class="style-options-row">
          ${['Standard','LB Hook Square','LB Button'].map(opt =>
            `<div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(t.beltLoop,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
      </div>

      <div class="style-section">
        <div class="style-section-title">WAISTBAND</div>
        <div class="style-options-row">
          ${['Buckle','Elastic','Gurkha','Side Adjuster'].map(opt =>
            `<div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(t.waistband,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
      </div>

      <div class="style-section">
        <div class="style-section-title">BACK POCKET STYLE</div>
        <div class="style-options-row">
          ${['None','Jetted','Welt','Flap','Button','Zip','Patch','Diagonal'].map(opt =>
            `<div class="style-opt"><div class="style-opt-svg">${getIcon(opt) || ''}</div><div class="style-opt-label">${checked(t.backPockets,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
      </div>

      <div class="style-section">
        <div class="style-section-title">PLEATS</div>
        <div class="style-options-row">
          ${['No Pleat','1 Forward Pleat','2 Forward Pleats','Reverse Pleat'].map(opt =>
            `<div class="style-opt"><div class="style-opt-label">${checked(t.pleats,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
      </div>

      <!-- EXTRA NOTES BOX -->
      <div class="style-section style-section--full">
        <div class="style-section-title">ADDITIONAL NOTES / SPECIAL INSTRUCTIONS</div>
        <div class="style-notes-box">${escHtml(config.notes || project.notes || '')}</div>
      </div>

      <!-- SB/DB + Lining + Fabric -->
      <div class="style-section">
        <div class="style-section-title">JACKET TYPE</div>
        <div class="style-options-row">
          ${['SB (Single Breasted)','DB (Double Breasted)'].map(opt =>
            `<div class="style-opt"><div class="style-opt-label">${checked(j.buttons,opt)} ${opt}</div></div>`
          ).join('')}
        </div>
        ${j.color ? `<div class="style-note">Colour of Lining: <strong>${j.color}</strong></div>` : '<div class="style-note">Colour of Lining: <span class="style-blank">_________________</span></div>'}
        ${j.fabric ? `<div class="style-note">Fabric Code: <strong>${j.fabric}</strong></div>` : '<div class="style-note">Fabric Code: <span class="style-blank">_________________</span></div>'}
        <div class="style-note">1st Buttonhole Colour: <span class="style-blank">_________________</span></div>
      </div>

    </div>

    <!-- Signature row -->
    <div class="mf-signature-row">
      <div class="mf-sig">CLIENT SIGNATURE: <span class="mf-sig-line"></span></div>
      <div class="mf-sig">MANAGER SIGNATURE: <span class="mf-sig-line"></span></div>
    </div>
  </div>
  `;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function val(meas, key) {
  const v = meas[key];
  return v != null && v !== '' ? v : '';
}

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return d; }
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}
