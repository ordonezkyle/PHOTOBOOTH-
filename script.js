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

// State
let currentFilter = 'none';
let collageImages = []; // holds data URLs for collage frames
let isCollageMode = false;
let captureMode = 'collage'; // 'collage' or 'single'

// Init camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => alert("Webcam Error: " + err));

// Live filter
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    if (f === 'sepia') currentFilter = 'sepia(100%)';
    else if (f === 'grayscale') currentFilter = 'grayscale(100%)';
    else if (f === 'blur') currentFilter = 'blur(3px)';
    else currentFilter = 'none';
    video.style.filter = currentFilter;
  });
});

// Mode toggle
const modeBtn = document.getElementById('modeBtn');
modeBtn.addEventListener('click', () => {
  if (captureMode === 'collage') {
    captureMode = 'single';
    modeBtn.textContent = 'Single Mode';
  } else {
    captureMode = 'collage';
    modeBtn.textContent = 'Collage Mode (4 Photos)';
  }
  // Reset when switching modes
  resetBtn.click();
});

// Countdown helper
function startCountdown(seconds, onTick, onFinish) {
  let rem = seconds;
  countdownEl.style.display = 'flex';
  countdownEl.textContent = rem;
  onTick?.(rem);
  const t = setInterval(() => {
    rem--;
    if (rem <= 0) {
      clearInterval(t);
      countdownEl.style.display = 'none';
      onFinish?.();
    } else {
      countdownEl.textContent = rem;
      onTick?.(rem);
    }
  }, 1000);
  return t;
}

// Draw collage preview (2x2)
function redrawCollagePreview(dataURLForPreview) {
  // Show collage stage
  collageStage.style.display = 'flex';
  liveStage.style.display = 'none';
  // Prepare canvas
  const w = 640, h = 480;
  canvas.width = w; canvas.height = h;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const frames = collageImages;
  const pad = 8;
  const cellW = (w - pad * 3) / 2;
  const cellH = (h - pad * 3) / 2;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = pad + col * (cellW + pad);
    const y = pad + row * (cellH + pad);
    if (frames[i]) {
      const img = new Image();
      img.src = frames[i];
      if (img.complete) {
        ctx.drawImage(img, x, y, cellW, cellH);
      } else {
        img.onload = () => ctx.drawImage(img, x, y, cellW, cellH);
      }
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y, cellW, cellH);
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Frame ${i + 1}`, x + cellW / 2, y + cellH / 2);
    }
  }
  // Return data URL for QR or download
  return canvas.toDataURL('image/jpeg');
}

// Simple data URL preview for thumbnails
function refreshThumbnails() {
  sideThumbs.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.alt = 'Capture preview';
    img.style.objectFit = 'cover';
    img.style.background = '#222';
    img.style.display = i < collageImages.length ? 'block' : 'none';
    if (i < collageImages.length) img.src = collageImages[i];
    sideThumbs.appendChild(img);
  }
}

// Capture flow: automatic single click per capture with countdown
let isCapturing = false;

// Auto-capture 4 images in sequence
async function autoCaptureSequence() {
  for (let i = 0; i < 4; i++) {
    try {
      // Start countdown and wait for it to finish
      await new Promise((resolve) => {
        let rem = 3;
        countdownEl.style.display = 'flex';
        countdownEl.textContent = rem;
        stageCaption.textContent = `Taking in ${rem}s (${i + 1}/4)`;
        
        const t = setInterval(() => {
          rem--;
          if (rem < 0) {
            clearInterval(t);
            countdownEl.style.display = 'none';
            resolve();
          } else if (rem >= 0) {
            countdownEl.textContent = rem;
            stageCaption.textContent = `Taking in ${rem}s (${i + 1}/4)`;
          }
        }, 1000);
        
        // Failsafe: resolve after 4 seconds no matter what
        setTimeout(() => {
          clearInterval(t);
          countdownEl.style.display = 'none';
          resolve();
        }, 4000);
      });

      // Capture frame
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;

      ctx.filter = currentFilter;
      ctx.drawImage(video, 0, 0, w, h);
      ctx.filter = 'none';
      const dataURL = canvas.toDataURL('image/jpeg');

      // Add to collage
      collageImages.unshift(dataURL);
      if (collageImages.length > 4) collageImages.pop();

      refreshThumbnails();
      downloadBtn.disabled = false;
      resetBtn.disabled = false;
      
      // Generate QR code with error handling
      try {
        showQRCode(dataURL);
      } catch (qrError) {
        console.error('QR generation failed, continuing anyway:', qrError);
      }

      // Brief pause between captures for visual feedback
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error during capture sequence:', error);
      isCapturing = false;
      captureBtn.disabled = false;
      stageCaption.textContent = 'Error during capture. Click Reset to try again.';
      return;
    }
  }

  // All 4 captured
  isCollageMode = true;
  stageCaption.textContent = 'Collage Complete! - Click Download or Capture again';
  isCapturing = false;
  captureBtn.disabled = false;
}

captureBtn.addEventListener('click', () => {
  if (isCapturing) return; // Prevent multiple simultaneous captures
  isCapturing = true;
  captureBtn.disabled = true;
  
  // Handle single mode
  if (captureMode === 'single') {
    // Start a 3-second countdown
    startCountdown(3,
      (n) => stageCaption.textContent = `Taking in ${n}s`,
      async () => {
        // Capture frame
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;

        ctx.filter = currentFilter;
        ctx.drawImage(video, 0, 0, w, h);
        ctx.filter = 'none';
        const dataURL = canvas.toDataURL('image/jpeg');

        collageImages = [dataURL];
        downloadBtn.disabled = false;
        resetBtn.disabled = false;
        showQRCode(dataURL);
        stageCaption.textContent = 'Photo Ready - Click Download';
        isCapturing = false;
        captureBtn.disabled = false;
      }
    );
  } else {
    // Collage mode: auto-capture 4 images
    autoCaptureSequence();
  }
});

// Download handler: downloads collage if ready, else last frame
downloadBtn.addEventListener('click', () => {
  if (isCollageMode && collageImages.length >= 4) {
    const data = redrawCollagePreview();
    const a = document.createElement('a');
    a.href = data;
    a.download = 'photobooth_collage.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    stageCaption.textContent = 'Collage downloaded!';
    // Switch back to live view after download
    setTimeout(() => { 
      liveStage.style.display = 'flex';
      collageStage.style.display = 'none';
      stageCaption.textContent = 'Collage Complete! - Click Capture to replace or Reset';
    }, 2000);
  } else if (collageImages.length > 0) {
    const a = document.createElement('a');
    a.href = collageImages[0];
    a.download = 'photobooth_photo.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    stageCaption.textContent = 'Photo downloaded!';
    if (captureMode === 'single') {
      // In single mode, allow user to capture again
      setTimeout(() => { 
        stageCaption.textContent = 'Ready - Single Mode';
        isCapturing = false;
        captureBtn.disabled = false;
      }, 2000);
    } else {
      setTimeout(() => { stageCaption.textContent = 'Photo captured'; }, 2000);
    }
  }
});

// Reset collage
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
  showQRCode('Photobooth Ready');
});

// QR code helper
function showQRCode(data) {
  try {
    qrCodeContainer.innerHTML = "";
    // Only use short text for QR, not full data URLs
    let qrText = data;
    if (data.startsWith('data:')) {
      // For image data, just show a generic message
      qrText = 'Photobooth Photo - ' + new Date().toLocaleTimeString();
    }
    new QRCode(qrCodeContainer, {
      text: qrText,
      width: 150,
      height: 150,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.L
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    qrCodeContainer.innerHTML = '<p style="font-size: 12px; color: #999;">QR Ready</p>';
  }
}

// Optional: auto-start with a ready QR (initial state)
function init() {
  refreshThumbnails();
  showQRCode('Photobooth Ready');
}
init();
