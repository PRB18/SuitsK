with open('public/js/icons.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''function shapeIcon(label, shape) {
  const url = '/images/shapes/' + shape.lower() + '.jpg';
  return '<div style=\"width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;\">' +
           '<div style=\"flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--color-border); border-radius: 2px; background: #fff; width: 100%;\">' +
             '<img src=\"' + url + '\" style=\"width: 140%; height: 140%; object-fit: cover; object-position: center; mix-blend-mode: multiply; filter: contrast(1.2);\" alt=\"' + label + '\" />' +
           '</div>' +
           '<div style=\"font-family: var(--font-ui, sans-serif); font-size: 7px; font-weight: 700; color: #C9A87A; text-align: center; letter-spacing: 0.08em; margin-top: 4px;\">' + label.toUpperCase() + '</div>' +
         '</div>';
}

function stomachIcon(label, amount) {
  const url = '/images/shapes/' + amount.lower() + '.jpg';
  return '<div style=\"width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;\">' +
           '<div style=\"flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--color-border); border-radius: 2px; background: #fff; width: 100%;\">' +
             '<img src=\"' + url + '\" style=\"width: 140%; height: 140%; object-fit: cover; object-position: center; mix-blend-mode: multiply; filter: contrast(1.2);\" alt=\"' + label + '\" />' +
           '</div>' +
           '<div style=\"font-family: var(--font-ui, sans-serif); font-size: 7px; font-weight: 700; color: #C9A87A; text-align: center; letter-spacing: 0.08em; margin-top: 4px;\">' + label.toUpperCase() + '</div>' +
         '</div>';
}
'''

start_idx = content.find('function shapeIcon(label, shape)')
end_idx = content.find('Object.assign(ICONS, {', start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement + content[end_idx:]
    with open('public/js/icons.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Success')
else:
    print('Failed to find indices')
