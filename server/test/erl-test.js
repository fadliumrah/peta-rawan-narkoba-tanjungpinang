import express from 'express';
import rateLimit from 'express-rate-limit';
import http from 'http';

const app = express();
app.set('trust proxy', 1);

const limiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
app.use('/api', limiter);

app.get('/api', (req, res) => {
  res.json({ ok: true, ip: req.ip, ips: req.ips });
});

const server = app.listen(0, () => {
  const port = server.address().port;
  const options = {
    hostname: '127.0.0.1',
    port,
    path: '/api',
    method: 'GET',
    headers: {
      'X-Forwarded-For': '1.2.3.4'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', data);
      server.close();
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err);
    server.close();
  });

  req.end();
});
