const fs = require('fs');
const cs = fs.readFileSync('public/js/screens/configuratorScreen.js', 'utf8');
const css = fs.readFileSync('public/styles/main.css', 'utf8');

// 1. Look for escapeHtml defined twice (would cause redeclaration error)
const escapeCount = (cs.match(/function escapeHtml/g) || []).length;
console.log('escapeHtml defined N times:', escapeCount);

// 2. Look for any syntax that could prevent module load
// Check top-level code outside functions
console.log('Has _tooltipEl at top level (correct):', cs.includes('let _tooltipEl = null;'));
console.log('Has _tooltipTimeout at top level (correct):', cs.includes('let _tooltipTimeout = null;'));

// 3. wizard-main CSS check
const wizMatch = css.match(/\.wizard-main\s*\{([^}]+)\}/);
if (wizMatch) {
  console.log('wizard-main CSS:', wizMatch[1].replace(/\n/g,'|'));
} else {
  console.log('wizard-main CSS: NOT FOUND');
}

// 4. Check configurator-wrapper
const wrapperMatch = css.match(/\.configurator-wrapper\s*\{([^}]+)\}/);
if (wrapperMatch) {
  console.log('configurator-wrapper CSS:', wrapperMatch[1].replace(/\n/g,'|'));
}

// 5. btn-lg missing
console.log('btn-lg in CSS:', css.includes('btn-lg'));

// 6. Does dashboard button navigate call actually exist in the code
console.log('Has router.navigate(#dashboard) in configurator:', cs.includes("router.navigate('#dashboard')"));

// 7. Check for the page overflow issue - app-root height
const appRootMatch = css.match(/\.app-root\s*\{([^}]+)\}/);
if (appRootMatch) {
  console.log('app-root CSS:', appRootMatch[1].replace(/\n/g,'|'));
}

// 8. Check if wizard-main has overflow-y
console.log('wizard-main has overflow-y auto:', css.includes('overflow-y: auto') || css.includes('overflow-y:auto'));

// 9. The real overflow culprit: configurator-wrapper uses flex:1 but wizard-main also 
// uses max-width/margin:auto - the issue is body/html don't clip, page height grows.
// Check if html/body have overflow:hidden
console.log('html overflow hidden:', css.includes('overflow: hidden') || css.includes('overflow:hidden'));

// 10. Check the step-form-wrapper has no CSS (confirmed above)
console.log('step-form-wrapper in CSS:', css.includes('step-form-wrapper'));
