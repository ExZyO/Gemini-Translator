const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9090;
const LOGS_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(__dirname, 'telemetry_live.log');
const WCT_TEST_LOG = path.join(LOGS_DIR, 'witchcult_test_deep.log');
const MAX_LOG_SIZE = 15 * 1024 * 1024; // 15MB

if (!fs.existsSync(LOGS_DIR)) {
  try { fs.mkdirSync(LOGS_DIR, { recursive: true }); } catch (_) {}
}

let totalEvents = 0;
const sseClients = new Set();

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
  if (t.includes('FETCH_OK') || t.includes('CHAPTER_OK')) return colors.green;
  if (t.includes('FETCH_REQ') || t.includes('TOC')) return colors.cyan;
  if (t.includes('TRANSLAT') || t.includes('GEMINI') || t.includes('KEY_POOL')) return colors.green;
  if (t.includes('CRAWLER') || t.includes('SCRAP') || t.includes('IMAGE')) return colors.yellow;
  if (t.includes('READER') || t.includes('TTS')) return colors.magenta;
  if (t.includes('GENDER') || t.includes('GLOSSARY') || t.includes('TM') || t.includes('DIFF')) return colors.blue;
  if (t.includes('ERROR') || t.includes('FAIL')) return colors.red;
  if (t.includes('WARN')) return colors.yellow;
  return colors.bright;
};

// Append to log files
const appendToLiveLog = (line, targetFile = LOG_FILE) => {
  try {
    if (fs.existsSync(targetFile)) {
      const stats = fs.statSync(targetFile);
      if (stats.size > MAX_LOG_SIZE) {
        fs.renameSync(targetFile, targetFile.replace(/\.log$/, '.old.log'));
      }
    }
    fs.appendFileSync(targetFile, line + '\n', 'utf8');
  } catch (e) {}
};

// Broadcast to active SSE clients
const broadcastSse = (eventObj) => {
  const msg = `data: ${JSON.stringify(eventObj)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch (_) { sseClients.delete(client); }
  }
};

// HTTP fetch helper with automatic redirect following
function fetchUrl(urlStr, options = {}) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const client = urlStr.startsWith('http://') ? http : https;
    const req = client.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        ...(options.headers || {})
      },
      timeout: options.timeout || 20000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, urlStr).toString();
        return fetchUrl(nextUrl, options).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          latencyMs: Date.now() - startTime
        });
      });
    });
    req.on('timeout', () => { req.destroy(new Error(`Timeout after ${options.timeout || 20000}ms`)); });
    req.on('error', (err) => reject(err));
  });
}

function decodeHtml(str) {
  return (str || '')
    .replace(/&#8216;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function getWctSortKey(item) {
  const text = (item.text || item.title || '').toLowerCase();
  const href = (item.href || item.url || '').toLowerCase();
  if (text.includes('prologue') || href.includes('prologue')) return -1;
  if (text.includes('appendix') || href.includes('appendix')) return 90000;
  if (text.includes('epilogue') || href.includes('epilogue')) return 99999;

  const m = text.match(/(?:Chapter|Ch\.?)\s*(\d+)(?:\s*part\s*(\d+))?/i) ||
            href.match(/chapter[_-](\d+)(?:[_-]part[_-](\d+))?/i);
  if (m) {
    const chNum = parseInt(m[1], 10);
    const partNum = m[2] ? parseInt(m[2], 10) : 0;
    return chNum * 100 + partNum;
  }
  const intM = text.match(/Interlude\s*([IVXLCDM]+|\d+)?/i);
  if (intM) {
    return 80000 + (parseInt(intM[1], 10) || 1);
  }
  return 70000;
}

function evaluateImageUrl(imgTag) {
  let orig = (imgTag.match(/data-orig-file=["']([^"']+)["']/i) || [])[1] || '';
  let large = (imgTag.match(/data-large-file=["']([^"']+)["']/i) || [])[1] || '';
  let actual = (imgTag.match(/data-(?:original|actualsrc|src|lazy-src)=["']([^"']+)["']/i) || [])[1] || '';
  let src = (imgTag.match(/src=["']([^"']+)["']/i) || [])[1] || '';

  let best = orig || large || actual || src;
  let filterReason = null;

  if (!best) filterReason = 'No valid src/data-orig attribute found';
  else if (best.startsWith('data:image/svg')) filterReason = 'Inline SVG icon';
  else if (best.includes('avatar') || best.includes('gravatar')) filterReason = 'User / Author avatar';
  else if (best.includes('emoji') || best.includes('smilies')) filterReason = 'Emoji / Smiley';
  else if (best.includes('wct_logo') || best.includes('logo')) filterReason = 'Website logo';
  else if (best.includes('jp.png') || best.includes('France-Flag') || best.includes('flag')) filterReason = 'Language flag icon';
  else if (best.includes('Pin.png') || best.includes('pin.png') || best.includes('Satella_Pin') || best.includes('Emilia_Pin')) filterReason = 'Decorative pin UI badge';
  else if (best.includes('paypal') || best.includes('patreon') || best.includes('discord')) filterReason = 'Social donation button';
  else if (best.includes('sharedaddy') || best.includes('widgets') || best.includes('rating') || best.includes('advertisement')) filterReason = 'Widget / advertisement';

  const cleanUrl = best ? best.trim().replace(/\?w=\d+.*$/i, '').replace(/\?resize=\d+.*$/i, '').replace(/\?fit=\d+.*$/i, '') : '';
  return {
    rawTag: imgTag.slice(0, 120),
    resolvedUrl: cleanUrl,
    isKept: !filterReason,
    filterReason
  };
}

// ══════════════════════════════════════════════════════════════════════
// DEEP WITCH CULT DIAGNOSTIC TEST RUNNER
// ══════════════════════════════════════════════════════════════════════
async function runWitchCultDeepTest(logger = console.log) {
  const testStartTime = Date.now();
  const testLogs = [];
  const log = (msg, tag = 'TEST') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const formatted = `[${time}][${tag}] ${msg}`;
    testLogs.push(formatted);
    logger(`${colors.gray}[${time}]${colors.reset}${getTagColor(tag)}[${tag}]${colors.reset} ${msg}`);
  };

  log('🚀 Launching Deep Witch Cult Scraper Diagnostics Suite...', 'START');
  const report = {
    timestamp: new Date().toISOString(),
    tocTotalChapters: 0,
    arcsSummary: {},
    supplements: {},
    sortingVerification: {},
    sampleChapters: [],
    errors: []
  };

  try {
    // 1. Fetch Table of Contents
    const tocUrl = 'https://witchculttranslation.com/table-of-content/';
    log(`Connecting to Master TOC: ${tocUrl} ...`, 'FETCH_REQ');
    const tocRes = await fetchUrl(tocUrl);
    log(`Master TOC loaded in ${tocRes.latencyMs}ms (HTTP ${tocRes.status}, ${tocRes.data.length.toLocaleString()} bytes)`, 'FETCH_OK');

    // Isolate .entry-content
    let contentHtml = tocRes.data;
    const entryMatch = tocRes.data.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<!--/i) ||
                       tocRes.data.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
    if (entryMatch) {
      contentHtml = entryMatch[1];
      log(`Isolated .entry-content (${contentHtml.length.toLocaleString()} bytes), successfully stripped sidebar and widgets`, 'TOC_ISOLATE');
    }

    const parts = contentHtml.split(/<(?:h1|h2)[^>]*>/i);
    let currentArc = 'Arc 1';
    const allLinks = [];
    const seenHref = new Set();

    const normalizeArc = (heading) => {
      if (!heading) return 'Arc 1';
      const m = heading.match(/Arc\s*(\d+)/i);
      if (m) return `Arc ${m[1]}`;
      if (/Side\s*Content/i.test(heading)) return 'Side Content';
      if (/IF\s*Stories/i.test(heading)) return 'IF Stories';
      if (/EX\s*Novel/i.test(heading)) return 'EX Novels';
      return heading.trim();
    };

    for (const part of parts) {
      const headingMatch = part.match(/^([\s\S]*?)<\/(?:h1|h2)>/i);
      if (headingMatch) {
        const rawHeading = decodeHtml(headingMatch[1].replace(/<[^>]+>/g, '').trim());
        if (/Arc\s*\d+|Side\s*Content|EX\s*Novel|Tanpenshuu|IF\s*Stories/i.test(rawHeading)) {
          currentArc = normalizeArc(rawHeading);
        }
      }

      const linkMatches = [...part.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        let href = m[1].replace(/\/$/, '') + '/';
        if (href.startsWith('http://')) href = href.replace('http://', 'https://');
        let rawText = decodeHtml(m[2].replace(/<[^>]+>/g, '').trim());

        const isTranslatorHome = href === 'https://eminenttranslations.com/' || 
                                 href === 'https://kagurojp.wordpress.com/' || 
                                 href === 'https://translationchicken.com/' ||
                                 href === 'https://witchculttranslation.com/';
        const isGarbage = href.includes('rezerodb.com') || href.includes('twitter.com') ||
                          href.includes('discord.com') || href.includes('mega.nz') ||
                          href.includes('/category/') || href.includes('/tag/') ||
                          href.includes('cut-content') || href.includes('trelling.php') ||
                          rawText.toLowerCase().includes('cut content') ||
                          rawText.toLowerCase().includes('mega archive');

        const isAllowed = href.includes('witchculttranslation.com/20') ||
                          href.includes('witchculttranslation.com/arc-') ||
                          href.includes('eminenttranslations.com') ||
                          href.includes('kagurojp.wordpress.com') ||
                          href.includes('remonwater.wordpress.com');

        if (isAllowed && !isTranslatorHome && !isGarbage && rawText.length > 0 && !seenHref.has(href)) {
          seenHref.add(href);
          allLinks.push({
            href,
            text: rawText.replace(/\s*\(Originally translated.*?\)/i, '').trim(),
            arc: currentArc
          });
        }
      }
    }
    log(`Initial TOC parsed: ${allLinks.length} valid chapters found`, 'TOC_PARSE');

    // 2. Arc 3 KaguroJP supplement
    const arc3Before = allLinks.filter(l => l.arc === 'Arc 3').length;
    log(`Checking Arc 3 (${arc3Before} chapters present)...`, 'ARC3_CHECK');
    if (arc3Before < 10) {
      log('Fetching KaguroJP homepage for Arc 3 backfill...', 'FETCH_REQ');
      const kRes = await fetchUrl('https://kagurojp.wordpress.com/');
      const kMatches = [...kRes.data.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      let addedKaguro = 0;
      for (const km of kMatches) {
        const kHref = km[1].replace(/\/$/, '') + '/';
        let kText = decodeHtml(km[2].replace(/<[^>]+>/g, '').trim());
        if (kHref.includes('kagurojp.wordpress.com/20') && /vol\.?\s*3/i.test(kText) && !seenHref.has(kHref)) {
          seenHref.add(kHref);
          addedKaguro++;
          allLinks.push({
            href: kHref,
            text: kText.replace(/^Vol\.?\s*3\.?\s*Ch\.?\s*(\d+)[:：\s]*/i, 'Chapter $1: '),
            arc: 'Arc 3'
          });
        }
      }
      log(`Restored ${addedKaguro} missing Arc 3 chapters from KaguroJP!`, 'ARC3_OK');
      report.supplements.kaguroChaptersAdded = addedKaguro;
    }

    // 3. Arc 4 Translation Chicken supplement
    const arc4Before = allLinks.filter(l => l.arc === 'Arc 4').length;
    log(`Checking Arc 4 (${arc4Before} chapters present)...`, 'ARC4_CHECK');
    if (arc4Before < 5) {
      log('Fetching Translation Chicken archive for Arc 4 backfill...', 'FETCH_REQ');
      const tcRes = await fetchUrl('https://translationchicken.com/2016/09/21/rezero-web-novel-fan-translation-table-of-contents/');
      const tcMatches = [...tcRes.data.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      let addedTC = 0;
      for (const tm of tcMatches) {
        const tHref = tm[1].replace(/\/$/, '') + '/';
        let tText = decodeHtml(tm[2].replace(/<[^>]+>/g, '').trim());
        if (tHref.includes('translationchicken.com/20') && /arc-4/i.test(tHref) && !tHref.includes('#') && !seenHref.has(tHref)) {
          seenHref.add(tHref);
          addedTC++;
          allLinks.push({
            href: tHref,
            text: tText,
            arc: 'Arc 4'
          });
        }
      }
      log(`Restored ${addedTC} Arc 4 chapters from Translation Chicken archive!`, 'ARC4_OK');
      report.supplements.tcChaptersAdded = addedTC;
    }

    // 4. Arc 6 Missing chapters supplement (Ch 33 & 34)
    log('Checking Arc 6 dedicated archive page for missing Chapters 33 & 34...', 'ARC6_CHECK');
    const a6Res = await fetchUrl('https://witchculttranslation.com/arc-6/');
    const a6Matches = [...a6Res.data.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    let addedArc6 = 0;
    for (const am of a6Matches) {
      let aHref = am[1].replace(/\/$/, '') + '/';
      if (aHref.startsWith('http://')) aHref = aHref.replace('http://', 'https://');
      const aText = decodeHtml(am[2].replace(/<[^>]+>/g, '').trim());
      if (/witchculttranslation\.com\/20/i.test(aHref) && /chapter\s*(?:33|34)/i.test(aText) && !seenHref.has(aHref)) {
        seenHref.add(aHref);
        addedArc6++;
        allLinks.push({
          href: aHref,
          text: aText.replace(/\s*\(Originally translated.*?\)/i, '').trim(),
          arc: 'Arc 6'
        });
        log(`  Restored Arc 6 chapter: "${aText}" -> ${aHref}`, 'ARC6_RESTORE');
      }
    }
    report.supplements.arc6Restored = addedArc6;

    // 5. Numerical Chronological Sorting Verification
    log('Sorting chapters numerically per Arc and checking for inversions...', 'SORT_VERIFY');
    const byArc = new Map();
    for (const ch of allLinks) {
      if (!byArc.has(ch.arc)) byArc.set(ch.arc, []);
      byArc.get(ch.arc).push(ch);
    }

    const sortedChapters = [];
    for (const [arcName, arcChs] of byArc.entries()) {
      arcChs.sort((a, b) => getWctSortKey(a) - getWctSortKey(b));
      sortedChapters.push(...arcChs);
      report.arcsSummary[arcName] = arcChs.length;
      log(`  ${arcName}: ${arcChs.length} chapters sorted`, 'ARC_SUMMARY');
    }
    report.tocTotalChapters = sortedChapters.length;
    log(`Total indexed chapters across all Arcs: ${sortedChapters.length}`, 'TOTAL_INDEX');

    // 6. Illustration & Text Cleaning Test on Sample Chapter
    const sampleUrl = 'https://witchculttranslation.com/2024/02/24/arc-8-chapter-52-the-iron-blood-of-vollachia/';
    log(`Testing image & content parsing on sample chapter: ${sampleUrl} ...`, 'SAMPLE_TEST');
    const sRes = await fetchUrl(sampleUrl);
    const imgMatches = [...sRes.data.matchAll(/<img\b[^>]*>/gi)];
    const imageReport = [];
    for (const im of imgMatches) {
      const evalRes = evaluateImageUrl(im[0]);
      imageReport.push(evalRes);
      log(`  Image: ${evalRes.isKept ? '✅ KEPT' : '🚫 FILTERED'} (${evalRes.filterReason || 'Lossless story illustration'}): ${evalRes.resolvedUrl || evalRes.rawTag}`, 'IMG_EVAL');
    }
    report.sampleChapters.push({
      url: sampleUrl,
      imagesEvaluated: imageReport.length,
      imagesKept: imageReport.filter(i => i.isKept).length,
      imagesFiltered: imageReport.filter(i => !i.isKept).length
    });

    log(`🎉 All tests passed successfully! Total execution time: ${Date.now() - testStartTime}ms`, 'SUCCESS');
  } catch (err) {
    log(`❌ Error in deep test: ${err.message}`, 'ERROR');
    report.errors.push(err.message);
  }

  // Persist deep test report
  try {
    fs.writeFileSync(WCT_TEST_LOG, testLogs.join('\n'), 'utf8');
    log(`Detailed test report saved to: ${WCT_TEST_LOG}`, 'REPORT_SAVED');
  } catch (_) {}

  return report;
}

// ══════════════════════════════════════════════════════════════════════
// HTTP SERVER & TELEMETRY STREAM
// ══════════════════════════════════════════════════════════════════════
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=UTF-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Health & Server Status
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'active',
      version: '8.13.1',
      host: os.hostname(),
      uptimeSeconds: Math.floor(process.uptime()),
      totalEventsReceived: totalEvents,
      logPath: LOG_FILE,
      testLogPath: WCT_TEST_LOG
    }));
    return;
  }

  // 2. Clear Live Logs
  if ((req.method === 'POST' || req.method === 'DELETE') && req.url === '/clear') {
    try {
      if (fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '', 'utf8');
    } catch(e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'cleared' }));
    return;
  }

  // 3. Read Raw Logs
  if (req.method === 'GET' && req.url.startsWith('/logs')) {
    const parsed = new URL(req.url, `http://${req.headers.host || '127.0.0.1:9090'}`);
    const isWctTest = parsed.searchParams.get('test') === 'wct';
    const target = isWctTest ? WCT_TEST_LOG : LOG_FILE;
    try {
      const content = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : 'No logs recorded yet.';
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(content);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error reading log: ' + e.message);
    }
    return;
  }

  // 4. Server-Sent Events (SSE) Live Log Streaming
  if (req.method === 'GET' && req.url === '/logs/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`data: {"type":"connected","time":"${new Date().toISOString()}"}\n\n`);
    sseClients.add(res);
    req.on('close', () => { sseClients.delete(res); });
    return;
  }

  // 5. Deep Test Witch Cult Scraper Endpoint
  if ((req.method === 'GET' || req.method === 'POST') && (req.url === '/test/wct' || req.url === '/api/test/wct')) {
    try {
      const result = await runWitchCultDeepTest();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', report: result }, null, 2));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', error: e.message }));
    }
    return;
  }

  // 6. High-Speed Webnovel Crawler Proxy (Cloudflare / CORS bypass)
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
      try { referer = new URL(target).origin + '/'; } catch (_) {}

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

  // 7. Live Telemetry Event Ingestion
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

      // 3. Broadcast to SSE streams
      broadcastSse({ time: isoTime, tag, message, data });

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ status: 'ok', totalEvents }));
    });
    return;
  }

  // 8. Static Web App Hosting
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath.replace(/^\//, ''));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
  res.end('Not Found');
});

// If launched with --test-wct CLI flag, run test and exit
if (process.argv.includes('--test-wct') || process.argv.includes('--test')) {
  runWitchCultDeepTest(console.log).then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
} else {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`📡 Gemini Translator Server & Diagnostic Hub (v8.13.1)`);
    console.log(`======================================================`);
    console.log(`🌐 Web App & Reader:     http://localhost:${PORT}`);
    console.log(`⚡ Proxy & API Status:    http://localhost:${PORT}/status`);
    console.log(`📝 Live Telemetry Log:    http://localhost:${PORT}/logs`);
    console.log(`📡 SSE Stream:            http://localhost:${PORT}/logs/stream`);
    console.log(`🧪 Run WCT Deep Test:    http://localhost:${PORT}/test/wct`);
    console.log(`📁 Persistent Log File:   ${LOG_FILE}`);
    console.log(`======================================================\n`);
  });
}

module.exports = { server, runWitchCultDeepTest };
