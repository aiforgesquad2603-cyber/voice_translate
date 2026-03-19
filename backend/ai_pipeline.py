import os
import uuid
import base64
import io
from google import genai
from google.genai import types
from deep_translator import GoogleTranslator
from gtts import gTTS

# Load environment variables from a .env file if python-dotenv is installed.
# This is optional: if the package isn't installed, we still allow the app to run
# and expect required vars to be set in the environment (e.g., GEMINI_API_KEY).
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed; skipping .env loading.")

class AIPipeline:
    def __init__(self):
        # Configure new Google GenAI Client
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found in environment.")
        self.client = genai.Client(api_key=api_key)
        self.model_id = "gemini-1.5-flash"
    
    def audio_to_text(self, file_path, source_lang='ta'):
        """
        Transcribe and normalize audio in one step using Gemini 1.5 Flash.
        Returns clean, standard English text if source is not English.
        """
        if not os.path.exists(file_path):
            return ""

        try:
            with open(file_path, "rb") as f:
                audio_data = f.read()

            # Identify mime type from extension
            ext = file_path.split('.')[-1].lower()
            mime_type = f"audio/{ext}" if ext != 'mp3' else "audio/mpeg"
            if ext == 'wav': mime_type = "audio/wav"

            prompt = (
                "Transcribe this audio. If the speech is in Tamil, Thanglish, or mixed, "
                "convert it to clean, standard English. If it's already English, just transcribe it. "
                "Return ONLY the English text, no extra explanation or formatting."
            )

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[
                    types.Part.from_bytes(data=audio_data, mime_type=mime_type),
                    prompt
                ]
            )
            
            text = response.text.strip().split("\n")[0]
            return text
        except Exception as e:
            print(f"Gemini AI STT error: {e}")
            return ""

    def translate_text(self, text, target_lang='en'):
        """Translate text to target language using Google Translator."""
        if not text:
            return ""
        if target_lang == 'en': # Already normalized to English by Gemini
            return text
            
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
            # Map common codes to gTTS supported codes if necessary
            # gTTS usually follows ISO 639-1
            tts = gTTS(text=text, lang=lang)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return base64.b64encode(fp.read()).decode('utf-8')
        except Exception as e:
            print(f"TTS error: {e}")
            return None

    def process_full_pipeline(self, audio_file_path, target_lang='en', source_lang='ta'):
        """Run the full AI pipeline: Audio -> Text -> Translate -> TTS."""
        # 1. Cloud-based STT + Normalization
        text = self.audio_to_text(audio_file_path, source_lang=source_lang)
        print(f"STT/Normalized: {text}")
        
        if not text:
            return None, None

        # 2. Translate (if target is not English)
        translated_text = self.translate_text(text, target_lang=target_lang)
        if target_lang != 'en':
            print(f"Translated ({target_lang}): {translated_text}")

        # 3. TTS
        audio_b64 = self.text_to_speech(translated_text, lang=target_lang)
        
        return audio_b64, translated_text

ai_pipeline = AIPipeline()
