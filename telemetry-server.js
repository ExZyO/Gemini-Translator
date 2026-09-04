const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9090;
const LOG_FILE = path.join(__dirname, 'debug-live.log');

fs.writeFileSync(LOG_FILE, `=== LIVE DEBUG SESSION STARTED AT ${new Date().toISOString()} ===\n`, 'utf8');

const server = http.createServer(async (req, res) => {
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

    if ((req.method === 'GET' || req.method === 'POST') && req.url.startsWith('/proxy?')) {
        try {
            const reqUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1:9090'}`);
            const targetUrl = reqUrl.searchParams.get('url');
            if (!targetUrl) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing url parameter' }));
                return;
            }

            let reqBody = undefined;
            if (req.method === 'POST') {
                const chunks = [];
                for await (const chunk of req) chunks.push(chunk);
                if (chunks.length > 0) reqBody = Buffer.concat(chunks);
            }

            let referer = req.headers['x-referer'] || req.headers['referer'];
            if (!referer || referer.includes('127.0.0.1') || referer.includes('localhost')) {
                try {
                    const u = new URL(targetUrl);
                    referer = `${u.protocol}//${u.host}/`;
                } catch (_) {}
            }

            const upstreamHeaders = {
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                'Accept': req.headers['accept'] || 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,ja;q=0.7',
                'Cache-Control': 'no-cache',
                'Referer': referer
            };
            if (req.headers['content-type']) {
                upstreamHeaders['Content-Type'] = req.headers['content-type'];
            }

            const abortCtrl = new AbortController();
            const timer = setTimeout(() => abortCtrl.abort(), 20000);

            const upstreamRes = await fetch(targetUrl, {
                signal: abortCtrl.signal,
                method: req.method,
                redirect: 'follow',
                headers: upstreamHeaders,
                body: reqBody
            });
            clearTimeout(timer);

            const contentType = upstreamRes.headers.get('content-type') || 'text/html; charset=utf-8';
            const arrayBuffer = await upstreamRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            res.writeHead(upstreamRes.status, {
                'Content-Type': contentType,
                'Content-Length': buffer.length,
                'X-Proxied-By': 'Gemini-Telemetry-Engine'
            });
            res.end(buffer);
            return;
        } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Proxy fetch failed: ${err.message}` }));
            return;
        }
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
