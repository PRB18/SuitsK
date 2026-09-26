const fs = require('fs');
const file = 'public/js/icons.js';
let c = fs.readFileSync(file, 'utf8');
const replacement = \unction shapeIcon(label, shape) {
  const url = '/images/shapes/' + shape.toLowerCase() + '.jpg';
  return '<div style=\"width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;\">' +
           '<div style=\"flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--color-border); border-radius: 2px; background: #fff; width: 100%;\">' +
             '<img src=\"' + url + '\" style=\"width: 130%; height: 130%; object-fit: cover; object-position: center; mix-blend-mode: multiply; filter: contrast(1.2);\" alt=\"' + label + '\" />' +
           '</div>' +
           '<div style=\"font-family: var(--font-ui, sans-serif); font-size: 7px; font-weight: 700; color: #C9A87A; text-align: center; letter-spacing: 0.08em; margin-top: 4px;\">' + label.toUpperCase() + '</div>' +
         '</div>';
}

function stomachIcon(label, amount) {
  const url = '/images/shapes/' + amount.toLowerCase() + '.jpg';
  return '<div style=\"width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;\">' +
           '<div style=\"flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--color-border); border-radius: 2px; background: #fff; width: 100%;\">' +
             '<img src=\"' + url + '\" style=\"width: 130%; height: 130%; object-fit: cover; object-position: center; mix-blend-mode: multiply; filter: contrast(1.2);\" alt=\"' + label + '\" />' +
           '</div>' +
           '<div style=\"font-family: var(--font-ui, sans-serif); font-size: 7px; font-weight: 700; color: #C9A87A; text-align: center; letter-spacing: 0.08em; margin-top: 4px;\">' + label.toUpperCase() + '</div>' +
         '</div>';
}\;

const regex = /function shapeIcon\(label, shape\) \{[\s\S]*?function stomachIcon\(label, amount\) \{[\s\S]*?<\/svg>\s*;\r?\n\}/;
if(regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync(file, c);
    console.log('Success');
} else {
    console.log('Regex did not match!');
}
