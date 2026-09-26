const fs=require('fs'); 
const lines=fs.readFileSync('public/js/print.js','utf8').split('\n'); 
lines.forEach((l,i)=>{ 
    if(l.includes('opt =>') && !l.includes('\')) {
        console.log(i+1, l.trim()); 
    }
})
