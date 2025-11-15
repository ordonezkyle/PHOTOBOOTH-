const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const captureBtn = document.getElementById('capture');
const downloadBtn = document.getElementById('download');
const filterBtns = document.querySelectorAll('.filter-btn');

let currentFilter = 'none';

// Start webcam stream
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    console.error('Error accessing webcam:', err);
    alert('Could not access webcam. Please allow permission or use a supported device.');
  });

// Update the video filter live on selection
filterBtns.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    switch(filter) {
      case 'sepia':
        currentFilter = 'sepia(100%)';
        break;
      case 'grayscale':
        currentFilter = 'grayscale(100%)';
        break;
      case 'blur':
        currentFilter = 'blur(5px)';
        break;
      case 'none':
      default:
        currentFilter = 'none';
        break;
    }
    // Apply live filter on video preview
    video.style.filter = currentFilter;
  });
});

// Capture photo from video with current filter
captureBtn.addEventListener('click', () => {
  // Set canvas size same as video feed for better resolution
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  // Apply the filter when drawing the image on canvas
  ctx.filter = currentFilter;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none'; // reset

  // Show the canvas with the captured image
  canvas.style.display = 'block';

  // Enable download button
  downloadBtn.disabled = false;
});

// Download captured photo
downloadBtn.addEventListener('click', () => {
  const imageData = canvas.toDataURL('image/jpeg');
  const link = document.createElement('a');
  link.href = imageData;
  link.download = 'photobooth_photo.jpg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});