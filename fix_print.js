const fs = require('fs');
let c = fs.readFileSync('public/js/print.js', 'utf8');

const searchStr = ").join(''\\)}";
const replaceStr = String.fromCharCode(96) + "\n          ).join('')}";

c = c.split(searchStr).join(replaceStr);
fs.writeFileSync('public/js/print.js', c);
console.log('Fixed');
