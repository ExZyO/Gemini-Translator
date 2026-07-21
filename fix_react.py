import sys

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

start_target = "      return h('div', { className: 'min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-800 dark:text-gray-200 transition-colors' },"
if start_target not in text:
    print('Start not found')
    sys.exit(1)

start_idx = text.find(start_target)
text = text[:start_idx] + "      return h(React.Fragment, null,\n  " + text[start_idx:]

end_target = "    }\n\n    const root = document.getElementById('root');"
if end_target not in text:
    print('End not found')
    sys.exit(1)

end_idx = text.find(end_target)
text = text[:end_idx] + "      )\n" + text[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Success')
