const video = document.getElementById('video');
const emotionDisplay = document.getElementById('emotion');
const suggestionDisplay = document.getElementById('suggestion');

const emotionTips = {
  happy: "Keep smiling! Share your joy with someone 😊",
  sad: "It's okay to feel down. Try journaling or music 🎧",
  angry: "Deep breaths help. Try a quick meditation 🧘",
  surprised: "Whoa! Maybe pause and reflect 🌟",
  fearful: "You're safe. Try a grounding exercise 🙌",
  disgusted: "Try changing your focus or environment 🧹",
  neutral: "You're calm. Stay focused or take a small break ☕"
};

// Load models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models/tiny_face_detector_model'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models/face_expression_model')
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error("Webcam error:", err));
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.videoWidth, height: video.videoHeight };

  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);

    if (detections.length > 0) {
      const expressions = detections[0].expressions;
      const emotion = Object.keys(expressions).reduce((a, b) =>
        expressions[a] > expressions[b] ? a : b
      );

      emotionDisplay.textContent = `Detected Emotion: ${emotion}`;
      suggestionDisplay.textContent = emotionTips[emotion] || "Be kind to yourself 💖";
    } else {
      emotionDisplay.textContent = "No face detected 😶";
      suggestionDisplay.textContent = "";
    }
  }, 1500);
});
