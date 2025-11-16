require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// ==================== API Routes ====================

// GET all photos
app.get('/api/photos', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [photos] = await connection.query(
      'SELECT id, filename, data_url, created_at FROM photos ORDER BY created_at DESC LIMIT 100'
    );
    connection.release();
    res.json(photos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch photos', message: err.message });
  }
});

// GET single photo by ID
app.get('/api/photos/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [photos] = await connection.query(
      'SELECT * FROM photos WHERE id = ?',
      [req.params.id]
    );
    connection.release();
    if (photos.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json(photos[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch photo', message: err.message });
  }
});

// POST new photo (save to database)
app.post('/api/photos', async (req, res) => {
  try {
    const { filename, data_url } = req.body;
    
    if (!filename || !data_url) {
      return res.status(400).json({ error: 'filename and data_url are required' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO photos (filename, data_url) VALUES (?, ?)',
      [filename, data_url]
    );
    connection.release();

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

// POST new collage
app.post('/api/collages', async (req, res) => {
  try {
    const { title, format, data_url } = req.body;
    
    if (!format || !data_url) {
      return res.status(400).json({ error: 'format and data_url are required' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO collages (title, format, data_url) VALUES (?, ?, ?)',
      [title || `Collage ${Date.now()}`, format, data_url]
    );
    connection.release();

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
    const connection = await pool.getConnection();
    const [collages] = await connection.query(
      'SELECT id, title, format, created_at FROM collages ORDER BY created_at DESC LIMIT 50'
    );
    connection.release();
    res.json(collages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch collages', message: err.message });
  }
});

// DELETE photo
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM photos WHERE id = ?', [req.params.id]);
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete photo', message: err.message });
  }
});

// DELETE collage
app.delete('/api/collages/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM collages WHERE id = ?', [req.params.id]);
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Collage not found' });
    }
    res.json({ success: true, message: 'Collage deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete collage', message: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Config endpoint to get base URL
app.get('/api/config', (req, res) => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let ip = 'localhost';
  for (let iface in interfaces) {
    for (let addr of interfaces[iface]) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ip = addr.address;
        break;
      }
    }
    if (ip !== 'localhost') break;
  }
  res.json({ baseURL: `http://${ip}:3000` });
});

// Share photo endpoint
app.get('/share/photo/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [photos] = await connection.query(
      'SELECT data_url FROM photos WHERE id = ?',
      [req.params.id]
    );
    connection.release();
    if (photos.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    const dataURL = photos[0].data_url;
    const base64Data = dataURL.replace(/^data:image\/jpeg;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="photobooth_photo.jpg"');
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to serve photo', message: err.message });
  }
});

// Share collage endpoint
app.get('/share/collage/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [collages] = await connection.query(
      'SELECT data_url FROM collages WHERE id = ?',
      [req.params.id]
    );
    connection.release();
    if (collages.length === 0) {
      return res.status(404).json({ error: 'Collage not found' });
    }
    const dataURL = collages[0].data_url;
    const base64Data = dataURL.replace(/^data:image\/jpeg;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="photobooth_collage.jpg"');
    res.send(imgBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to serve collage', message: err.message });
  }
});

// Gallery page
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'gallery.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  let networkIPs = [];

  for (let iface in interfaces) {
    for (let addr of interfaces[iface]) {
      if (addr.family === 'IPv4' && !addr.internal) {
        networkIPs.push(addr.address);
        if (!localIP || localIP === 'localhost') localIP = addr.address;
      }
    }
  }

  console.log(`
╔════════════════════════════════════╗
║   PHOTOBOOTH SERVER STARTED        ║
╠════════════════════════════════════╣
║ 🚀 Local: http://localhost:${PORT}       ║
║ 🌐 Network: http://${localIP}:${PORT}    ║
║ 📁 Static Files: Enabled            ║
║ 🗄️  MySQL: Connected               ║
║ 📷 API: /api/photos                ║
║ 🖼️  API: /api/collages             ║
╚════════════════════════════════════╝
  `);

  if (networkIPs.length > 0) {
    console.log(`\n📡 Network IPs: ${networkIPs.join(', ')}`);
    console.log(`\n💡 For internet access, use ngrok:`);
    console.log(`   npx ngrok http ${PORT}`);
    console.log(`   Then share the ngrok URL with others!\n`);
  }
});

module.exports = app;
