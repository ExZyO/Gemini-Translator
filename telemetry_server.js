const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9090;
const LOG_FILE = path.join(__dirname, 'telemetry_live.log');
const MAX_LOG_SIZE = 15 * 1024 * 1024; // 15MB

let totalEvents = 0;

// Rotate or truncate log file if it gets too large
const appendToLiveLog = (line) => {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        fs.renameSync(LOG_FILE, path.join(__dirname, 'telemetry_live.old.log'));
      }
    }
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (e) {}
};

// ANSI Color helper for terminal output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bright: '\x1b[1m'
};

const getTagColor = (tag) => {
  const t = (tag || '').toUpperCase();
  if (t === 'UI_ACTION') return colors.cyan;
  if (t.includes('TRANSLAT') || t.includes('GEMINI') || t.includes('KEY_POOL')) return colors.green;
  if (t.includes('CRAWLER') || t.includes('SCRAP')) return colors.yellow;
  if (t.includes('READER') || t.includes('TTS')) return colors.magenta;
  if (t.includes('GENDER') || t.includes('GLOSSARY') || t.includes('TM') || t.includes('DIFF')) return colors.blue;
  if (t.includes('ERROR') || t.includes('FAIL')) return colors.red;
  if (t.includes('WARN')) return colors.yellow;
  return colors.bright;
};

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health / Status endpoint
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'active',
      host: os.hostname(),
      uptimeSeconds: Math.floor(process.uptime()),
      totalEventsReceived: totalEvents,
      logPath: LOG_FILE
    }));
    return;
  }

  // Clear live logs endpoint
  if ((req.method === 'POST' || req.method === 'DELETE') && req.url === '/clear') {
    try {
      if (fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '', 'utf8');
    } catch(e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'cleared' }));
    return;
  }

  // Webnovel Crawler Proxy (Cloudflare / CORS bypass)
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

  // Live Telemetry Stream Ingestion
  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      totalEvents++;
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const isoTime = new Date().toISOString();
      let tag = 'LOG';
      let message = '';
      let data = null;

      try {
        const parsed = JSON.parse(body);
        tag = parsed.tag || 'LOG';
        message = parsed.message || '';
        data = parsed.data || null;
      } catch (e) {
        message = body;
      }

      const color = getTagColor(tag);
      const formattedData = data ? '\n' + JSON.stringify(data, null, 2) : '';

      // 1. Live terminal stream with colors
      console.log(`${colors.gray}[${time}]${colors.reset}${color}[${tag}]${colors.reset} ${message}${data ? colors.gray + formattedData + colors.reset : ''}`);

      // 2. Persist to live log file
      appendToLiveLog(`[${isoTime}][${tag}] ${message}${formattedData}`);

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ status: 'ok', totalEvents }));
    });
  } else {
    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Real-time Telemetry & Debugging Server active on http://0.0.0.0:${PORT}/log`);
  console.log(`📝 Live persistent log: ${LOG_FILE}`);
  console.log(`⚡ Status endpoint: http://127.0.0.1:${PORT}/status\n`);
});
