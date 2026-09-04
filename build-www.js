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
            if (copyExts.includes(ext) && !excludeFiles.includes(entry.name) && !entry.name.startsWith('client_secret') && !entry.name.startsWith('credentials')) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

copyRecursive(srcDir, destDir);

// Check if a local gitignored client_secrets.json exists to safely inject for local builds
try {
    const secretFiles = fs.readdirSync(srcDir).filter(f => f.startsWith('client_secret') && f.endsWith('.json'));
    let localClientId = '';
    for (const f of secretFiles) {
        try {
            const raw = JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8'));
            localClientId = raw.web?.client_id || raw.installed?.client_id || raw.client_id || '';
            if (localClientId) {
                console.log(`🔒 Found local ${f} (gitignored) - safely injecting Client ID into www bundle.`);
                break;
            }
        } catch(e) {}
    }
    if (localClientId) {
        const wwwGdrivePath = path.join(destDir, 'gdrive_sync.js');
        if (fs.existsSync(wwwGdrivePath)) {
            let code = fs.readFileSync(wwwGdrivePath, 'utf8');
            code = code.replace(/const DEFAULT_CLIENT_ID = '[^']*';/, `const DEFAULT_CLIENT_ID = '${localClientId}';`);
            fs.writeFileSync(wwwGdrivePath, code, 'utf8');
            console.log('✅ Injected local Client ID into www/gdrive_sync.js (source file in root remains clean).');
        }
    }
} catch(e) {
    console.warn('Notice: Local client_secrets check skipped:', e.message);
}

console.log('✅ Recursively synced all web assets (including vendor/) to ./www directory');
