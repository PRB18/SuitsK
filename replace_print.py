with open('public/js/print.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''      <!-- SHOULDER -->
      <div class="style-section">
        <div class="style-section-title">SHOULDER SHAPE</div>
        <div class="style-options-row">
          ${~['Square','Regular','Sloping'].map(opt =>
            <div class="style-opt"><div class="style-opt-svg">${~getIcon(opt) || ''}</div><div class="style-opt-label">${~checked(j.shoulder,opt)} ${~opt}</div></div>
          ).join('')}
        </div>
      </div>

      <!-- BACK SHAPE -->
      <div class="style-section">
        <div class="style-section-title">BACK SHAPE</div>
        <div class="style-options-row">
          ${~['Normal','Erect','Hunched'].map(opt =>
            <div class="style-opt"><div class="style-opt-svg">${~getIcon(opt) || ''}</div><div class="style-opt-label">${~checked(j.backShape,opt)} ${~opt}</div></div>
          ).join('')}
        </div>
      </div>

      <!-- STOMACH SHAPE -->
      <div class="style-section">
        <div class="style-section-title">STOMACH SHAPE</div>
        <div class="style-options-row">
          ${~['Flat','Slight','Large'].map(opt =>
            <div class="style-opt"><div class="style-opt-svg">${~getIcon(opt) || ''}</div><div class="style-opt-label">${~checked(j.stomachShape,opt)} ${~opt}</div></div>
          ).join('')}
        </div>
      </div>'''

replacement = replacement.replace('~', '')

import re
pattern = re.compile(r'<!-- SHOULDER -->.*?</div>\s*</div>', re.DOTALL)
if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open('public/js/print.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Success')
else:
    print('Regex did not match')
