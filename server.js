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
        'Cookie': [{"domain":".facebook.com","expirationDate":1779035364.144862,"hostOnly":false,"httpOnly":true,"name":"datr","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"5JT6ZxK-kOX92-iZ3eR0Of1q"},{"domain":".facebook.com","expirationDate":1779036010.957612,"hostOnly":false,"httpOnly":true,"name":"sb","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"5ZT6Z0owNo4uvDIwgNoerDYN"},{"domain":".facebook.com","hostOnly":false,"httpOnly":false,"name":"m_pixel_ratio","path":"/","sameSite":"unspecified","secure":true,"session":true,"storeId":"0","value":"1.1034632921218872"},{"domain":".facebook.com","expirationDate":1745080222.366069,"hostOnly":false,"httpOnly":false,"name":"locale","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"vi_VN"},{"domain":".facebook.com","expirationDate":1745080716,"hostOnly":false,"httpOnly":false,"name":"wd","path":"/","sameSite":"lax","secure":true,"session":false,"storeId":"0","value":"436x876"},{"domain":".facebook.com","expirationDate":1776012010.957362,"hostOnly":false,"httpOnly":false,"name":"c_user","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"100049342268817"},{"domain":".facebook.com","expirationDate":1752252010.957516,"hostOnly":false,"httpOnly":true,"name":"fr","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"0GwG694m5Cn36WOEA.AWfCobHx5--FDlTzues6LuQWzAK8bFBzn4ErklK2uAMQE80uAsw.Bn-pTl..AAA.0.0.Bn-pdq.AWcVjZb3k5_d00JOb5PzD8-aweU"},{"domain":".facebook.com","expirationDate":1776012010.957758,"hostOnly":false,"httpOnly":true,"name":"xs","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"25%3APO0Hr93anAjEgQ%3A2%3A1744476010%3A-1%3A7512"},{"domain":".facebook.com","expirationDate":1776012018,"hostOnly":false,"httpOnly":false,"name":"fbl_st","path":"/","sameSite":"strict","secure":true,"session":false,"storeId":"0","value":"100423235%3BT%3A29074600"},{"domain":".facebook.com","expirationDate":1752252018,"hostOnly":false,"httpOnly":false,"name":"wl_cbv","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"v2%3Bclient_version%3A2786%3Btimestamp%3A1744476018"},{"domain":".facebook.com","expirationDate":1749660018,"hostOnly":false,"httpOnly":false,"name":"vpd","path":"/","sameSite":"lax","secure":true,"session":false,"storeId":"0","value":"v1%3B525x400x1.1034632921218872"}]
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