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

    if (req.method === 'GET' && req.url.startsWith('/proxy?')) {
        try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1:9090'}`);
            const target = parsedUrl.searchParams.get('url');
            if (!target) {
                res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('Missing url param');
                return;
            }
            let referer = 'https://lnori.com/';
            try {
                referer = new URL(target).origin + '/';
            } catch (_) {}

            fetch(target, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                    'Referer': referer,
                    'Accept': '*/*'
                }
            }).then(async upstream => {
                const ct = upstream.headers.get('content-type') || 'application/octet-stream';
                const buf = await upstream.arrayBuffer();
                res.writeHead(upstream.status, {
                    'Content-Type': ct,
                    'Content-Length': buf.byteLength,
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(Buffer.from(buf));
            }).catch(e => {
                res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('Proxy error: ' + e.message);
            });
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Server error: ' + e.message);
        }
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
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
    } else {
        res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
        res.end();
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Real-time Telemetry Logger active on http://0.0.0.0:${PORT}/log`);
});
