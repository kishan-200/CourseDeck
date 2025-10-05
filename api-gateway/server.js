const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

app.use('/auth', createProxyMiddleware({
  target: 'http://localhost:5009',
  changeOrigin: true,
  pathRewrite: { '^/auth': '/auth' }
}));

app.use('/courses', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: { '^/courses': '' }
}));

app.use('/mycourses', createProxyMiddleware({
  target: 'http://localhost:5002',
  changeOrigin: true,
  pathRewrite: { '^/mycourses': '' }
}));


const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));

