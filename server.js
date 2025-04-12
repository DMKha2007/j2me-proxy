const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route chính để gửi form nhập URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Middleware proxy cho GET và POST requests
app.get('/proxy', async (req, res, next) => {
  const targetUrl = req.query.url || req.body.url;
  if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
    return res.status(400).send('URL không hợp lệ!');
  }

  try {
    // Lấy nội dung trang web
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': targetUrl,
      },
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // Xóa các phần không cần thiết để giảm tải
    $('script, style, iframe, noscript').remove();

    // Xử lý các ảnh để phù hợp với điện thoại J2ME
    $('img').each((_, img) => {
      const src = $(img).attr('src');
      if (src) {
        const absoluteUrl = new URL(src, targetUrl).href;
        $(img).attr('src', absoluteUrl);

        // Chỉ cho phép ảnh có kích thước nhỏ hơn 100KB
        if (absoluteUrl && !absoluteUrl.includes('data:image')) {
          axios.get(absoluteUrl, { responseType: 'arraybuffer' }).then(resImg => {
            const base64 = Buffer.from(resImg.data).toString('base64');
            $(img).attr('src', `data:image/png;base64,${base64}`);
            $(img).attr('width', '100');  // Set width phù hợp cho điện thoại J2ME
          });
        }
      }
    });

    // Xử lý CSS và JS (chỉ load những phần cần thiết)
    $('link[rel="stylesheet"], script').each((_, el) => {
      $(el).remove();
    });

    // Lấy lại body và wrap lại
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
app.all('/proxy', async (req, res) => {
  const targetUrl = req.query.url || req.body.url;
  if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
    return res.status(400).send('URL không hợp lệ!');
  }

  try {
    const method = req.method.toUpperCase();
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': targetUrl,
    };

    const axiosOptions = {
      method: method,
      url: targetUrl,
      headers: headers,
      maxRedirects: 5
    };

    if (method === 'POST') {
      axiosOptions.data = req.body;
      headers['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded';
    }

    const response = await axios(axiosOptions);

    // Nếu là HTML thì xử lý lại như trước
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      const $ = cheerio.load(response.data);
      $('script, style, iframe, noscript').remove();
      const body = $('body').html();

      const wrapped = `
        <html>
          <head><meta charset="UTF-8"><title>J2ME Proxy</title></head>
          <body>${body}</body>
        </html>
      `;

      return res.send(wrapped);
    } else {
      // Trả lại dữ liệu khác như JSON, image, v.v.
      res.set(response.headers);
      return res.send(response.data);
    }

  } catch (err) {
    res.status(500).send('Lỗi khi gửi đến server gốc: ' + err.message);
  }
});

// Lắng nghe server
app.listen(PORT, () => {
  console.log(`Proxy lite cho J2ME chạy ở http://localhost:${PORT}`);
});