const fs = require('fs');
let c = fs.readFileSync('public/js/icons.js', 'utf8');
c = c.split('.lower()').join('.toLowerCase()');
fs.writeFileSync('public/js/icons.js', c);
console.log('Fixed icons.js toLowerCase');
