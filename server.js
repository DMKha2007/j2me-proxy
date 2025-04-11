const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const path = require('path');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Thiếu URL!');
  if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
  return res.status(400).send('URL không hợp lệ!');
  }

app.post('/login/', (req, res) => {
  const url = 'https://mbasic.facebook.com/login.php'; // Facebook login URL (mbasic nhẹ cho J2ME)
  request.post({ url, form: req.body }, (err, resp, body) => {
    if (err) return res.status(500).send('Lỗi gửi tới Facebook');
    res.send(body); // trả kết quả về cho client
  });
});

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Referer': targetUrl,
        'Cookie': 'some=fake_cookie_if_required'
      },
      maxRedirects: 5
    });
    const $ = cheerio.load(response.data);

    $('script, style, iframe, noscript').remove();

    $('img').each((_, img) => {
      const src = $(img).attr('src');
      if (src) {
        const absoluteUrl = new URL(src, targetUrl).href;
        $(img).attr('src', absoluteUrl);
        $(img).attr('width', '200');
      }
    });

    const body = $('body').html();
    const wrapped = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>J2ME Lite View</title>
        </head>
        <body>
          ${body}
        </body>
      </html>
    `;

    res.send(wrapped);
  } catch (err) {
    res.status(500).send('Lỗi: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy hỗ trợ ảnh + fake user-agent chạy ở http://localhost:${PORT}`);
});
