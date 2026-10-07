import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Detect dist location across multiple deployment environments
const possibleDistPaths = [
  path.resolve(__dirname, 'dist'),
  path.resolve(process.cwd(), 'dist'),
  '/dist',
  '/app/applet/dist',
  path.resolve(__dirname, '../dist')
];

let distPath = possibleDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));

if (!distPath) {
  distPath = possibleDistPaths.find(p => fs.existsSync(p)) || path.resolve(__dirname, 'dist');
}

console.log(`[Server] Resolved static dist path: ${distPath}`);

// Cloud Run & Load Balancer Health Check Endpoints
app.get(['/healthz', '/health', '/_health'], (_req, res) => {
  res.status(200).send('OK');
});

// Serve static assets with caching headers if dist folder exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1h',
    index: false
  }));
}

// Fallback SPA routing
app.use((req, res) => {
  if (req.path.startsWith('/assets/') || req.path.includes('.')) {
    const filePath = path.join(distPath, req.path);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }

  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // Graceful fallback during deployment warm-up
  res.status(200).send('<!DOCTYPE html><html><head><title>SHIVAM</title></head><body><h2>SHIVAM Server is ready.</h2><script>setTimeout(()=>window.location.reload(),1500);</script></body></html>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Listening on 0.0.0.0:${PORT}`);
});
