// Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const captureBtn = document.getElementById('capture');
const downloadBtn = document.getElementById('download');
const resetBtn = document.getElementById('reset');
const countdownEl = document.getElementById('countdown');
const stageCaption = document.getElementById('stage-caption');
const sideThumbs = document.getElementById('side-thumbs');
const collageStage = document.getElementById('collage-stage');
const liveStage = document.getElementById('live-stage');
const filterBtns = document.querySelectorAll('.filter-btn');
const qrCodeContainer = document.getElementById('qrcode');
const downloadLinkWrap = document.getElementById('download-link');
const modeBtn = document.getElementById('modeBtn');
const formatBtn = document.getElementById('formatBtn');

// State
let currentFilterKey = 'none'; // 'none'|'invert'|'grayscale'|'blur'
let collageImages = []; // holds data URLs newest-first
let captureMode = 'collage'; // 'collage' or 'single'
let collageFormat = '2x2'; // '2x2' or 'vertical'
let isCollageMode = false; // true when we finished 4 captures
let isCapturing = false;
let lastDataURL = ''; // last captured image (or collage) for download/QR
const API_BASE_URL = 'http://localhost:3000/api'; // Backend API endpoint

// Helper: map visual filter keys to live CSS preview and capture canvas filter strings
const FILTERS = {
  none: { preview: 'none', capture: 'none' },
  film: { preview: 'sepia(40%) contrast(120%) brightness(110%)', capture: 'sepia(40%) contrast(120%) brightness(110%)' },
  grayscale: { preview: 'grayscale(100%)', capture: 'grayscale(100%)' },
  hulk: { preview: 'hue-rotate(90deg) saturate(200%) brightness(110%)', capture: 'hue-rotate(90deg) saturate(200%) brightness(110%)' }
};

// ==================== API Helper Functions ====================

// Save photo to database
async function savePhotoToDatabase(dataURL, filename) {
  try {
    const response = await fetch(`${API_BASE_URL}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename || `photo_${Date.now()}.jpg`,
        data_url: dataURL
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Save error:', data.message);
      return null;
    }
    console.log('✅ Photo saved to database:', data.id);
    // Generate share URL
    data.shareURL = `${window.location.origin}/share/photo/${data.id}`;
    return data;
  } catch (err) {
    console.error('❌ Failed to save photo:', err);
    return null;
  }
}

// Save collage to database
async function saveCollageToDatabase(dataURL, format) {
  try {
    const response = await fetch(`${API_BASE_URL}/collages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Collage ${format} - ${new Date().toLocaleString()}`,
        format: format,
        data_url: dataURL
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Save error:', data.message);
      return null;
    }
    console.log('✅ Collage saved to database:', data.id);
    // Generate share URL
    data.shareURL = `${window.location.origin}/share/collage/${data.id}`;
    return data;
  } catch (err) {
    console.error('❌ Failed to save collage:', err);
    return null;
  }
}

// Init camera
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    video.srcObject = stream;

    // Wait for video to be ready
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve();
      };
    });

    await video.play();
    console.log('Camera initialized:', video.videoWidth, 'x', video.videoHeight);
  } catch (err) {
    alert("Webcam Error: " + err.message);
    console.error(err);
  }
}

// Preview filter buttons (changes only video preview)
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.filter;
    currentFilterKey = key;
    const preview = FILTERS[key]?.preview || 'none';
    video.style.filter = preview;
    stageCaption.textContent = captureMode === 'single' ? 'Ready - Single Mode' : 'Ready - Collage Mode';
  });
});

// Mode toggle
modeBtn.addEventListener('click', () => {
  if (captureMode === 'collage') {
    captureMode = 'single';
    modeBtn.textContent = 'Single Mode';
  } else {
    captureMode = 'collage';
    modeBtn.textContent = 'Collage Mode (4 Photos)';
  }
  // Reset on change
  resetBtn.click();
});

// Format toggle
formatBtn.addEventListener('click', () => {
  if (collageFormat === '2x2') {
    collageFormat = 'vertical';
    formatBtn.textContent = 'Vertical Strip';
  } else {
    collageFormat = '2x2';
    formatBtn.textContent = '2x2 Layout';
  }
});

// Countdown helper returning Promise
function startCountdown(seconds, onTick) {
  return new Promise(resolve => {
    let rem = seconds;
    countdownEl.style.display = 'flex';
    countdownEl.textContent = rem;
    onTick?.(rem);
    const t = setInterval(() => {
      rem--;
      if (rem < 0) {
        clearInterval(t);
        countdownEl.style.display = 'none';
        resolve();
      } else {
        countdownEl.textContent = rem;
        onTick?.(rem);
      }
    }, 1000);
    // Failsafe (in case)
    setTimeout(() => {
      clearInterval(t);
      countdownEl.style.display = 'none';
      resolve();
    }, (seconds + 1) * 1000 + 200);
  });
}

// Thumbnail refresh
function refreshThumbnails() {
  sideThumbs.innerHTML = '';
  // show up to 4 thumbnails (latest-first on top)
  for (let i = 0; i < 4; i++) {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.alt = 'Capture preview';
    img.style.objectFit = 'cover';
    img.style.display = 'none';
    if (i < collageImages.length) {
      img.src = collageImages[i];
      img.style.display = 'block';
    }
    sideThumbs.appendChild(img);
  }
}

// Apply safe capture filter and draw
function captureFrameToCanvas() {
  // Ensure video is ready and has dimensions
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    console.warn('Video not ready, using fallback dimensions');
    canvas.width = 640;
    canvas.height = 480;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Camera not ready', 320, 240);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;

  // Use save/restore and set ctx.filter explicitly to avoid stacking issues
  ctx.save();
  const captureFilter = FILTERS[currentFilterKey]?.capture || 'none';
  ctx.filter = captureFilter;
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  // produce dataURL (jpg)
  return canvas.toDataURL('image/jpeg', 0.92);
}

// Redraw collage (2x2 or vertical strip) into canvas and return dataURL
function redrawCollagePreview() {
  // Show canvas and hide live preview
  collageStage.style.display = 'flex';
  liveStage.style.display = 'none';

  ctx.save();
  ctx.fillStyle = '#000';

  if (collageFormat === 'vertical') {
    // Vertical strip: 4 images stacked vertically
    const w = 480;
    const h = 1280;
    canvas.width = w;
    canvas.height = h;
    ctx.fillRect(0, 0, w, h);

    const pad = 12;
    const cellW = w - pad * 2;
    const cellH = Math.floor((h - pad * 5) / 4);

    for (let i = 0; i < 4; i++) {
      const x = pad;
      const y = pad + i * (cellH + pad);

      if (collageImages[i]) {
        const img = new Image();
        img.src = collageImages[i];
        if (img.complete) {
          drawImageCover(ctx, img, x, y, cellW, cellH);
        } else {
          ((imgCopy, _x, _y, _w, _h) => {
            imgCopy.onload = () => {
              drawImageCover(ctx, imgCopy, _x, _y, _w, _h);
            };
          })(img, x, y, cellW, cellH);
        }
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.fillStyle = '#666';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Frame ${i + 1}`, x + cellW / 2, y + cellH / 2);
      }
    }
  } else {
    // 2x2 grid layout
    const w = 1280;
    const h = 960;
    canvas.width = w;
    canvas.height = h;
    ctx.fillRect(0, 0, w, h);

    const pad = 16;
    const cellW = Math.floor((w - pad * 3) / 2);
    const cellH = Math.floor((h - pad * 3) / 2);

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = pad + col * (cellW + pad);
      const y = pad + row * (cellH + pad);

      if (collageImages[i]) {
        const img = new Image();
        img.src = collageImages[i];
        if (img.complete) {
          drawImageCover(ctx, img, x, y, cellW, cellH);
        } else {
          ((imgCopy, _x, _y, _w, _h) => {
            imgCopy.onload = () => {
              drawImageCover(ctx, imgCopy, _x, _y, _w, _h);
            };
          })(img, x, y, cellW, cellH);
        }
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.fillStyle = '#666';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Frame ${i + 1}`, x + cellW / 2, y + cellH / 2);
      }
    }
  }

  ctx.restore();
  // final dataURL
  return canvas.toDataURL('image/jpeg', 0.92);
}

// Utility: draw image in "cover" mode into rect
function drawImageCover(ctxLocal, img, x, y, w, h) {
  const iw = img.width, ih = img.height;
  const r = Math.max(w / iw, h / ih);
  const nw = iw * r, nh = ih * r;
  const ox = x + (w - nw) / 2;
  const oy = y + (h - nh) / 2;
  ctxLocal.drawImage(img, ox, oy, nw, nh);
}

// QR + download link generation
async function showQRCode(data) {
  qrCodeContainer.innerHTML = '';
  downloadLinkWrap.innerHTML = '';
  lastDataURL = data;

  try {
    // If data is a share URL, generate QR for network-accessible URL
    if (data && data.includes('/share/')) {
      // Get network IP for sharing
      const configResponse = await fetch('/api/config');
      const config = await configResponse.json();
      const networkUrl = data.replace('localhost', config.baseURL.split('://')[1].split(':')[0]);

      // Generate QR code for the share URL
      new QRCode(qrCodeContainer, {
        text: networkUrl,
        width: 150,
        height: 150,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
      });

      // Add text showing the URL
      const urlText = document.createElement('div');
      urlText.style.fontSize = '12px';
      urlText.style.color = '#666';
      urlText.style.marginTop = '5px';
      urlText.style.wordBreak = 'break-all';
      urlText.textContent = networkUrl;
      qrCodeContainer.appendChild(urlText);
    } else if (data && data.startsWith('data:')) {
      // For data URLs, provide direct download link
      const a = document.createElement('a');
      a.href = data;
      a.download = isCollageMode ? 'photobooth_collage.jpg' : 'photobooth_photo.jpg';
      a.textContent = 'Download Image';
      a.style.color = '#fff';
      a.style.padding = '6px 10px';
      a.style.background = '#333';
      a.style.borderRadius = '6px';
      a.style.textDecoration = 'none';
      downloadLinkWrap.appendChild(a);
    } else {
      // Default QR for ready state
      new QRCode(qrCodeContainer, {
        text: String(data || 'Photobooth Ready'),
        width: 150,
        height: 150,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
      });
    }
  } catch (err) {
    console.error('QR error', err);
    qrCodeContainer.innerHTML = '<div style="color:#999;font-size:12px">QR Ready</div>';
  }
}

// Auto-capture sequence (4 shots)
async function autoCaptureSequence() {
  for (let i = 0; i < 4; i++) {
    try {
      stageCaption.textContent = `Taking in 3s (${i + 1}/4)`;
      await startCountdown(3, (n) => stageCaption.textContent = `Taking in ${n}s (${i + 1}/4)`);
      // capture
      const dataURL = captureFrameToCanvas();
      // add newest at front
      collageImages.unshift(dataURL);
      if (collageImages.length > 4) collageImages.length = 4; // trim
      refreshThumbnails();
      downloadBtn.disabled = false;
      resetBtn.disabled = false;

      // show QR for the last captured single (not full collage yet)
      try { showQRCode(dataURL); } catch (e) { console.error(e); }

      // small pause between frames
      if (i < 3) await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error('Capture sequence error', err);
      isCapturing = false;
      captureBtn.disabled = false;
      stageCaption.textContent = 'Error during capture. Click Reset to try again.';
      return;
    }
  }

  // after 4 captures
  isCollageMode = true;
  // redraw collage into canvas and produce final collage data
  const collageData = redrawCollagePreview();
  lastDataURL = collageData;
  
  // Save collage to database
  const collageResult = await saveCollageToDatabase(collageData, collageFormat);

  showQRCode(collageResult.shareURL);
  stageCaption.textContent = 'Collage Complete! - Click Download or Capture again';
  isCapturing = false;
  captureBtn.disabled = false;
}

// Single capture flow
async function singleCaptureFlow() {
  stageCaption.textContent = 'Taking in 3s...';
  await startCountdown(3, n => stageCaption.textContent = `Taking in ${n}s`);
  const dataURL = captureFrameToCanvas();
  collageImages = [dataURL];
  refreshThumbnails();
  isCollageMode = false;
  downloadBtn.disabled = false;
  resetBtn.disabled = false;
  lastDataURL = dataURL;
  
  // Save photo to database
  const photoResult = await savePhotoToDatabase(dataURL, `photo_${Date.now()}.jpg`);

  showQRCode(photoResult.shareURL);
  stageCaption.textContent = 'Photo Ready - Click Download';
  isCapturing = false;
  captureBtn.disabled = false;
}

// Capture button
captureBtn.addEventListener('click', () => {
  if (isCapturing) return;
  isCapturing = true;
  captureBtn.disabled = true;

  if (captureMode === 'single') {
    singleCaptureFlow().catch(err => {
      console.error(err);
      isCapturing = false;
      captureBtn.disabled = false;
    });
  } else {
    // collage
    autoCaptureSequence().catch(err => {
      console.error(err);
      isCapturing = false;
      captureBtn.disabled = false;
    });
  }
});

// Download button
downloadBtn.addEventListener('click', () => {
  if (isCollageMode && collageImages.length >= 4) {
    // Ensure canvas contains collage (higher-res)
    const data = redrawCollagePreview();
    const a = document.createElement('a');
    a.href = data;
    a.download = 'photobooth_collage.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    stageCaption.textContent = 'Collage downloaded!';
    // revert view back to live after short delay
    setTimeout(() => {
      liveStage.style.display = 'flex';
      collageStage.style.display = 'none';
      stageCaption.textContent = 'Collage Complete! - Click Capture to replace or Reset';
    }, 1500);
  } else if (collageImages.length > 0) {
    const a = document.createElement('a');
    a.href = collageImages[0];
    a.download = 'photobooth_photo.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    stageCaption.textContent = 'Photo downloaded!';
  }
});

// Reset button
resetBtn.addEventListener('click', () => {
  collageImages = [];
  isCollageMode = false;
  refreshThumbnails();
  collageStage.style.display = 'none';
  liveStage.style.display = 'flex';
  stageCaption.textContent = captureMode === 'single' ? 'Ready - Single Mode' : 'Ready - Collage Mode';
  downloadBtn.disabled = true;
  resetBtn.disabled = true;
  qrCodeContainer.innerHTML = '';
  downloadLinkWrap.innerHTML = '';
  lastDataURL = '';
  // set a friendly ready QR
  showQRCode('Photobooth Ready');
});

// initial setup
function init() {
  refreshThumbnails();
  showQRCode('Photobooth Ready');
  stageCaption.textContent = 'Ready - Collage Mode';
  downloadBtn.disabled = true;
  resetBtn.disabled = true;
  initCamera();
}
init();
