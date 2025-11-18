require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
// Preferred network IP to use for QR/share URLs. Can be set in .env as NETWORK_IP
const PREFERRED_NETWORK_IP = process.env.NETWORK_IP || '10.181.50.155';
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname))); // serve HTML/CSS/JS

// Provide baseURL configured for network sharing (used by client to build QR URLs)
app.get('/api/config', (req, res) => {
  const os = require('os');
  const interfaces = os.networkInterfaces();

  // Helper: check private IP ranges
  function isPrivateIp(ip) {
    if (!ip) return false;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    const parts = ip.split('.').map(Number);
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    return false;
  }

  // If env override provided, use it
  if (process.env.NETWORK_IP && process.env.NETWORK_IP.trim()) {
    return res.json({ baseURL: `http://${process.env.NETWORK_IP.trim()}:${PORT}` });
  }

  // If code-level preferred IP set, and it looks valid, use it
  if (PREFERRED_NETWORK_IP && PREFERRED_NETWORK_IP.trim()) {
    return res.json({ baseURL: `http://${PREFERRED_NETWORK_IP.trim()}:${PORT}` });
  }

  // Auto-detect: prefer private LAN addresses and avoid virtual adapters (e.g., 192.168.56.x)
  let candidate = null;
  for (const name of Object.keys(interfaces)) {
    for (const addr of interfaces[name]) {
      if (addr.family === 'IPv4' && !addr.internal) {
        // prefer 10.* then 192.168.* then 172.16-31.*
        if (isPrivateIp(addr.address)) {
          // prefer addresses that are not commonly virtual adapter ranges
          if (!addr.address.startsWith('192.168.56.')) {
            return res.json({ baseURL: `http://${addr.address}:${PORT}` });
          }
          // keep as fallback candidate
          if (!candidate) candidate = addr.address;
        } else if (!candidate) {
          candidate = addr.address;
        }
      }
    }
  }

  const ip = candidate || 'localhost';
  res.json({ baseURL: `http://${ip}:${PORT}` });
});

// =========================================================
// API ROUTES — PHOTOS
// =========================================================

// GET all photos
app.get('/api/photos', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [photos] = await conn.query(
      'SELECT id, filename, data_url, created_at FROM photos ORDER BY created_at DESC LIMIT 100'
    );
    conn.release();
    res.json(photos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch photos', message: err.message });
  }
});

// GET single photo by ID
app.get('/api/photos/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM photos WHERE id = ?', [req.params.id]);
    conn.release();
    if (rows.length === 0) return res.status(404).json({ error: 'Photo not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch photo', message: err.message });
  }
});

// POST save new photo
app.post('/api/photos', async (req, res) => {
  try {
    const { filename, data_url } = req.body;

    if (!filename || !data_url) {
      return res.status(400).json({ error: 'filename and data_url are required' });
    }

    const conn = await pool.getConnection();
    const [result] = await conn.query(
      'INSERT INTO photos (filename, data_url) VALUES (?, ?)',
      [filename, data_url]
    );
    conn.release();

    res.status(201).json({
      success: true,
      id: result.insertId,
      filename,
      created_at: new Date(),
      message: 'Photo saved successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save photo', message: err.message });
  }
});

// DELETE photo
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [result] = await conn.query('DELETE FROM photos WHERE id = ?', [req.params.id]);
    conn.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete photo', message: err.message });
  }
});

// =========================================================
// AUTO-DOWNLOAD ENDPOINT FOR QR CODE
// =========================================================
// Example QR URL: http://10.181.50.155:3000/api/photos/:id/download

app.get('/api/photos/:id/download', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT filename, data_url FROM photos WHERE id = ?',
      [req.params.id]
    );
    conn.release();

    if (rows.length === 0) return res.status(404).send('Photo not found');

    const photo = rows[0];
    const matches = photo.data_url.match(/^data:(.+);base64,(.+)$/);

    if (!matches) return res.status(400).send('Invalid image data');

    const mimeType = matches[1];
    const base64Data = matches[2];
    const imgBuffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${photo.filename}"`);
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// =========================================================
// COLLAGE ROUTES
// =========================================================

// POST new collage
app.post('/api/collages', async (req, res) => {
  try {
    const { title, format, data_url } = req.body;

    if (!format || !data_url) {
      return res.status(400).json({ error: 'format and data_url are required' });
    }

    const conn = await pool.getConnection();
    const [result] = await conn.query(
      'INSERT INTO collages (title, format, data_url) VALUES (?, ?, ?)',
      [title || `Collage ${Date.now()}`, format, data_url]
    );
    conn.release();

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Collage saved successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save collage', message: err.message });
  }
});

// GET all collages
app.get('/api/collages', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [collages] = await conn.query(
      'SELECT id, title, format, created_at FROM collages ORDER BY created_at DESC LIMIT 50'
    );
    conn.release();
    res.json(collages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch collages', message: err.message });
  }
});

// DELETE collage
app.delete('/api/collages/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [result] = await conn.query('DELETE FROM collages WHERE id = ?', [req.params.id]);
    conn.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Collage not found' });
    }

    res.json({ success: true, message: 'Collage deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete collage', message: err.message });
  }
});

// =========================================================
// SHARE PHOTO (Direct download without QR)
// =========================================================
app.get('/share/photo/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT data_url FROM photos WHERE id = ?', [req.params.id]);
    conn.release();

    if (rows.length === 0) return res.status(404).json({ error: 'Photo not found' });

    const dataURL = rows[0].data_url;
    // support jpeg/png by stripping prefix generically
    const base64Data = dataURL.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    // try to detect mime if possible
    const mimeMatch = dataURL.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'attachment; filename="photobooth_photo.jpg"');
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to serve photo', message: err.message });
  }
});

// =========================================================
// SHARE COLLAGE
// =========================================================
app.get('/share/collage/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT data_url FROM collages WHERE id = ?', [req.params.id]);
    conn.release();

    if (rows.length === 0) return res.status(404).json({ error: 'Collage not found' });

    const dataURL = rows[0].data_url;
    const base64Data = dataURL.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    const mimeMatch = dataURL.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'attachment; filename="photobooth_collage.jpg"');
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to serve collage', message: err.message });
  }
});

// =========================================================
// GALLERY PAGE
// =========================================================
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'gallery.html'));
});

// =========================================================
// SERVER STARTUP MESSAGE
// =========================================================

app.listen(PORT, () => {
  console.log(`\n\n╔════════════════════════════════════╗`);
  console.log(`║      PHOTOBOOTH SERVER STARTED     ║`);
  console.log(`╠════════════════════════════════════╣`);
  console.log(`║ 🚀 Local:   http://localhost:${PORT}      ║`);
  console.log(`║ 🌐 Network: http://${PREFERRED_NETWORK_IP}:${PORT}   ║`);
  console.log(`║ 📁 Static Files: Enabled            ║`);
  console.log(`║ 🗄️  MySQL: Connected               ║`);
  console.log(`║ 📷 Photos API: /api/photos         ║`);
  console.log(`║ 🖼️  Collages API: /api/collages    ║`);
  console.log(`╚════════════════════════════════════╝`);
});

module.exports = app;