with open('public/js/print.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if '<div class="style-opt"' in l and chr(96) not in l:
        lines[i] = l.replace('<div class="style-opt"', chr(96) + '<div class="style-opt"')
    if ').join' in l and '</div></div>' in lines[i-1] and chr(96) not in lines[i-1]:
        lines[i-1] = lines[i-1].replace('</div></div>', '</div></div>' + chr(96))

with open('public/js/print.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Fixed lines exactly')
