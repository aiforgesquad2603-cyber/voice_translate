import os
import uuid
import numpy as np
import torch
from faster_whisper import WhisperModel
import google.generativeai as genai
from deep_translator import GoogleTranslator
from gtts import gTTS
import io
import base64
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class AIPipeline:
    def __init__(self):
        # Load Whisper model (tiny for speed)
        # Use "cuda" if GPU is available, else "cpu"
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.whisper_model = WhisperModel("tiny", device=device, compute_type="int8")
        self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    
    def speech_to_text(self, file_path):
        """Transcribe audio file using local Whisper model."""
        segments, info = self.whisper_model.transcribe(file_path, beam_size=5)
        text = " ".join([segment.text for segment in segments])
        return text.strip()

    def normalize_text(self, text):
        """Normalize Thanglish/Mixed text to proper English using Gemini."""
        if not text:
            return ""
        # Use the logic from voice/main.py
        prompt = f"Convert Tamil/Thanglish/Mixed text to clean, standard English. Only return the translated English text, no extra explanation:\n{text}"
        try:
            response = self.gemini_model.generate_content(prompt)
            # Match voice/main.py logic of taking the first line
            return response.text.strip().split("\n")[0]
        except Exception as e:
            print(f"Gemini error: {e}")
            return text  # Fallback to original text

    def translate_text(self, text, target_lang='en'):
        """Translate text to target language using Google Translator."""
        if not text:
            return ""
        try:
            translator = GoogleTranslator(source='auto', target=target_lang)
            return translator.translate(text)
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    def text_to_speech(self, text, lang='en'):
        """Convert text to speech using gTTS and return base64 audio."""
        if not text:
            return None
        try:
            tts = gTTS(text=text, lang=lang)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return base64.b64encode(fp.read()).decode('utf-8')
        except Exception as e:
            print(f"TTS error: {e}")
            return None

    def process_full_pipeline(self, audio_file_path, target_lang='en', source_lang='ta'):
        """Run the full AI pipeline: STT -> Normalize -> Translate -> TTS."""
        # 1. STT
        transcription = self.speech_to_text(audio_file_path)
        print(f"Transcription: {transcription}")
        
        if not transcription:
            return None, None

        # 2. Normalize (if source is not English)
        normalized_text = transcription
        if source_lang != 'en':
            normalized_text = self.normalize_text(transcription)
            print(f"Normalized: {normalized_text}")

        # 3. Translate
        translated_text = self.translate_text(normalized_text, target_lang=target_lang)
        print(f"Translated ({target_lang}): {translated_text}")

        # 4. TTS
        audio_b64 = self.text_to_speech(translated_text, lang=target_lang)
        
        return audio_b64, translated_text

ai_pipeline = AIPipeline()
