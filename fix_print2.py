with open('public/js/print.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(').join(\'\\'\\'})', ').join(\\'\\')}')

with open('public/js/print.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed')
