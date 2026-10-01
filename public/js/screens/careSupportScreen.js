import { router } from '../router.js';

export async function renderCareSupportScreen(container) {
  container.innerHTML = `
    <div class="screen-wrapper care-support-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="care-back">← Back</button>
        <div class="screen-header-title">
          <h1 class="screen-title">Care Support</h1>
        </div>
      </header>

      <div class="care-support-content" style="padding: 40px; max-width: 800px; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 4px 12px rgba(44,24,16,0.05); margin-top: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="font-family: var(--font-serif); color: var(--accent-color); font-size: 2rem; margin: 0;">Congressional</h2>
          <h3 style="font-family: 'Brush Script MT', cursive; color: rgba(201,168,76,0.8); font-size: 1.5rem; margin: 0; font-weight: normal;">The Bespoke</h3>
        </div>
        
        <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 24px; line-height: 1.6;">
          A well looked after suit will last a long time. For complete satisfaction follow the basic care instructions to preserve your suit’s longevity.
        </p>
        
        <ul style="list-style-type: disc; padding-left: 20px; color: var(--text-secondary); line-height: 1.8; font-size: 1.05rem;">
          <li style="margin-bottom: 12px;">Brush the pockets, lapels and other areas of the jacket regularly to remove dirt and dust</li>
          <li style="margin-bottom: 12px;">Blot stains gently with a clean cloth. Do not rub, as rubbing can damage the fabric or spread the stain</li>
          <li style="margin-bottom: 12px;">Give your suit adequate time to rest between wears. Avoid wearing the same suit on consecutive days</li>
          <li style="margin-bottom: 12px;">Always hang your jacket on a quality hanger that properly supports the shoulders. Hang trousers vertically to maintain the shape</li>
          <li style="margin-bottom: 12px;">Unbutton your jacket before sitting down to reduce stress on buttons, fabrics and front panel</li>
          <li style="margin-bottom: 12px;">Store your suit in a breathable garment bag in a cool, dry and ventilated space</li>
          <li style="margin-bottom: 12px;">Allow the natural creases to relax by hanging the garment. For stubborn creases, use professional steaming rather than applying excessive heat directly to the fabric</li>
          <li style="margin-bottom: 12px;">Creases will naturally relax in a warm, humid environment. Hang your suit in a suitable area which is somewhere damp like bathroom</li>
          <li style="margin-bottom: 12px;">Avoid excessive dry cleaning. Have your suit professionally cleaned only when necessary and use a cleaner experienced with bespoke or luxury garment.</li>
        </ul>
        
        <div style="margin-top: 40px; font-weight: 600; color: var(--text-primary); font-size: 1.1rem;">
          <p style="margin: 0;">At Your Service Always,</p>
          <p style="margin: 5px 0 0 0;">Congressional The Bespoke</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('care-back').addEventListener('click', () => router.backToHub());
}
