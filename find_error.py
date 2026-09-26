with open('public/js/print.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'opt =>' in l and chr(96) not in l:
        print(f'{i+1}: {l.strip()}')
