const https = require('https');
const express = require('express');
const app = express();

// CORS: allow any local origin (Expo web dev server)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Buvid3, X-Sessdata');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function makeProxy(targetHost) {
  return (req, res) => {
    const buvid3   = req.headers['x-buvid3'] || '';
    const sessdata = req.headers['x-sessdata'] || '';
    const cookies  = [
      buvid3   && `buvid3=${buvid3}`,
      sessdata && `SESSDATA=${sessdata}`,
    ].filter(Boolean).join('; ');

    const options = {
      hostname: targetHost,
      path:     req.url,
      method:   req.method,
      headers: {
        'Cookie':          cookies,
        'Referer':         'https://www.bilibili.com',
        'Origin':          'https://www.bilibili.com',
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    };

    const proxy = https.request(options, (proxyRes) => {
      // On successful QR login, extract SESSDATA from set-cookie and relay via custom header
      const setCookies = proxyRes.headers['set-cookie'] || [];
      const match = setCookies.find(c => c.includes('SESSDATA='));
      if (match) {
        const val = match.split(';')[0].replace('SESSDATA=', '');
        res.setHeader('X-Sessdata', val);
      }
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      });
      proxyRes.pipe(res);
    });

    proxy.on('error', (err) => res.status(502).json({ error: err.message }));
    req.pipe(proxy);
  };
}

app.use('/bilibili-api',      makeProxy('api.bilibili.com'));
app.use('/bilibili-passport', makeProxy('passport.bilibili.com'));

const PORT = process.env.PROXY_PORT || 3001;
app.listen(PORT, () => console.log(`[Proxy] http://localhost:${PORT}`));
