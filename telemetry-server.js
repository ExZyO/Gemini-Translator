const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9090;
const LOG_FILE = path.join(__dirname, 'debug-live.log');

fs.writeFileSync(LOG_FILE, `=== LIVE DEBUG SESSION STARTED AT ${new Date().toISOString()} ===\n`, 'utf8');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            timestamp: Date.now(),
            host: os.hostname(),
            logSize: fs.existsSync(LOG_FILE) ? fs.statSync(LOG_FILE).size : 0
        }));
        return;
    }

    if (req.method === 'POST' && req.url === '/clear') {
        fs.writeFileSync(LOG_FILE, `=== LOG CLEARED AT ${new Date().toISOString()} ===\n`, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ cleared: true }));
        console.log('🧹 Live debug log cleared.');
        return;
    }

    if (req.method === 'POST' && req.url === '/log') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const timeStr = new Date().toLocaleTimeString();
                const tag = (payload.tag || 'APP').toUpperCase().padEnd(8);
                const msg = payload.message || '';
                const extra = payload.data ? ' ' + (typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data)) : '';

                const line = `[${timeStr}] [${tag}] ${msg}${extra}\n`;
                fs.appendFileSync(LOG_FILE, line, 'utf8');
                process.stdout.write(line);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ received: true }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Live Telemetry Server listening on port ${PORT}`);
    console.log(`🔗 Mobile Endpoint: http://192.168.1.216:${PORT}/log`);
    console.log(`📄 Logging to file: ${LOG_FILE}\n`);
});
