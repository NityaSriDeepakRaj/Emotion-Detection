const video = document.getElementById('video');
const emotionDisplay = document.getElementById('emotion');
const suggestionDisplay = document.getElementById('suggestion');

// Create people counter element
const peopleCounter = document.createElement('div');
peopleCounter.id = 'people-counter';
document.body.appendChild(peopleCounter);

const emotionTips = {
  happy: "Keep smiling! Share your joy with someone 😊",
  sad: "It's okay to feel down. Try journaling or music 🎧",
  angry: "Deep breaths help. Try a quick meditation 🧘",
  surprised: "Whoa! Maybe pause and reflect 🌟",
  fearful: "You're safe. Try a grounding exercise 🙌",
  disgusted: "Try changing your focus or environment 🧹",
  neutral: "You're calm. Stay focused or take a small break ☕"
};

// Emotion tracking for each face
const faceEmotions = new Map();
const EMOTION_DISPLAY_TIME = 2000; // 2 seconds

// Load models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models/tiny_face_detector_model'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models/face_expression_model')
]).then(startVideo)
  .catch(err => {
    console.error("Error loading models:", err);
    alert("Error loading face detection models. Please check console for details.");
  });

function startVideo() {
  navigator.mediaDevices.getUserMedia({ 
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user'
    } 
  })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      console.error("Webcam error:", err);
      alert("Unable to access webcam. Please check permissions and try again.");
    });
}

// Get the dominant emotion from expressions
function getDominantEmotion(expressions) {
  return Object.entries(expressions)
    .reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  // Remove any existing emotions container
  const existingContainer = document.getElementById('emotions-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  const emotionsContainer = document.createElement('div');
  emotionsContainer.id = 'emotions-container';
  document.body.appendChild(emotionsContainer);

  // Remove the placeholder elements
  if (emotionDisplay) emotionDisplay.remove();
  if (suggestionDisplay) suggestionDisplay.remove();

  setInterval(async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3
        }))
        .withFaceExpressions();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update people counter
      peopleCounter.textContent = `People in frame: ${detections.length}`;

      // Clear previous emotion displays
      emotionsContainer.innerHTML = '';

      // Clean up old face entries
      const currentFaceIds = new Set();

      if (detections.length > 0) {
        detections.forEach((detection, index) => {
          // Generate face ID based on position
          const faceId = `face_${Math.round(detection.detection.box.x)}_${Math.round(detection.detection.box.y)}`;
          currentFaceIds.add(faceId);

          // Draw red box around face
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 3;
          ctx.strokeRect(
            detection.detection.box.x,
            detection.detection.box.y,
            detection.detection.box.width,
            detection.detection.box.height
          );

          // Add face number
          ctx.fillStyle = 'red';
          ctx.font = 'bold 24px Arial';
          ctx.fillText(
            `${index + 1}`,
            detection.detection.box.x + 5,
            detection.detection.box.y - 5
          );

          // Get current emotion
          const currentEmotion = getDominantEmotion(detection.expressions);
          
          // Check if we have a previous emotion for this face
          if (!faceEmotions.has(faceId)) {
            faceEmotions.set(faceId, {
              emotion: currentEmotion,
              lastUpdated: Date.now(),
              lastSeen: Date.now()
            });
          } else {
            const faceData = faceEmotions.get(faceId);
            faceData.lastSeen = Date.now();
            
            // Only update emotion if enough time has passed
            if (Date.now() - faceData.lastUpdated >= EMOTION_DISPLAY_TIME) {
              faceData.emotion = currentEmotion;
              faceData.lastUpdated = Date.now();
            }
          }

          // Display the current stable emotion
          const faceData = faceEmotions.get(faceId);
          const personEmotion = document.createElement('div');
          personEmotion.className = 'person-emotion';
          personEmotion.innerHTML = `Person ${index + 1}: ${faceData.emotion} ${emotionTips[faceData.emotion]}`;
          emotionsContainer.appendChild(personEmotion);
        });

        // Clean up old face data
        for (const [faceId, data] of faceEmotions) {
          if (!currentFaceIds.has(faceId) && Date.now() - data.lastSeen > EMOTION_DISPLAY_TIME) {
            faceEmotions.delete(faceId);
          }
        }
      }
    } catch (error) {
      console.error("Error in face detection:", error);
    }
  }, 100); // Update frequently for smooth detection
});