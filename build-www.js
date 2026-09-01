const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const copyExts = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.json', '.txt'];
const excludeFiles = ['package.json', 'package-lock.json', 'capacitor.config.json', 'build-www.js', 'tailwind.config.js'];

const files = fs.readdirSync(srcDir);
files.forEach(f => {
    const ext = path.extname(f);
    const srcFile = path.join(srcDir, f);
    const destFile = path.join(destDir, f);
    
    if (fs.statSync(srcFile).isFile() && copyExts.includes(ext) && !excludeFiles.includes(f)) {
        fs.copyFileSync(srcFile, destFile);
    }
});

console.log('✅ Synced web assets to ./www directory for native mobile builds');
