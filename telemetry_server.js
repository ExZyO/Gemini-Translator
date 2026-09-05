const http = require('http');

const PORT = 9090;

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/log') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });
            try {
                const parsed = JSON.parse(body);
                console.log(`[${time}][${parsed.tag || 'LOG'}] ${parsed.message || ''}`, parsed.data ? JSON.stringify(parsed.data) : '');
            } catch (e) {
                console.log(`[${time}][RAW] ${body}`);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Real-time Telemetry Logger active on http://0.0.0.0:${PORT}/log`);
});
