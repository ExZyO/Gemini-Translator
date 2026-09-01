const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const copyExts = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.json', '.txt'];
const excludeFiles = ['package.json', 'package-lock.json', 'capacitor.config.json', 'build-www.js', 'tailwind.config.js',
  'lamplight-mockup.html', 'new-render.txt', 'new-reader.txt', 'two-lights.css', 'check-ids.js', 'phase1-splice.js', 'UI_INTERACTIONS_MAP.md', 'describe_ui.py', 'helloworld.txt'];

function copyRecursive(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.name === 'node_modules' || entry.name === 'android' || entry.name === 'ios' || entry.name === 'www' || entry.name === '.git' || entry.name === 'screenshots') continue;
        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (copyExts.includes(ext) && !excludeFiles.includes(entry.name)) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

copyRecursive(srcDir, destDir);
console.log('✅ Recursively synced all web assets (including vendor/) to ./www directory');
