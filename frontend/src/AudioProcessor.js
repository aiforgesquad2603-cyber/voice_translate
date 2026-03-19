// AudioProcessor.js
export class AudioProcessor {
  constructor(onAudioChunk) {
    this.onAudioChunk = onAudioChunk;
    this.mediaRecorder = null;
    this.stream = null;
    this.isRecording = false;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.onAudioChunk) {
          this.onAudioChunk(event.data);
        }
      };

      // Slice audio every 3 seconds for real-time update
      this.mediaRecorder.start(3000);
      this.isRecording = true;
      console.log("Recording started...");
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  }

  stop() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;
      console.log("Recording stopped.");
    }
  }
}
