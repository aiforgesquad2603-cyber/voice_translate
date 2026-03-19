import os
import uuid
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from ai_pipeline import ai_pipeline
from socket_events import rooms, sio

router = APIRouter()

@router.post("/process-audio")
async def process_audio(
    file: UploadFile = File(...),
    room_id: str = Form(...),
    language: str = Form(...),
    sid: str = Form(...) # Socket ID of the sender to identify them in the room
):
    """
    Endpoint to process 1-2 second audio chunks.
    Saves audio, runs AI pipeline, and broadcasts to room.
    """
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    temp_dir = "temp_audio"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Extract file extension, handling None filename
    filename = file.filename or "audio.wav"
    file_extension = filename.split(".")[-1] if "." in filename else "wav"
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}.{file_extension}")
    
    try:
        # Save uploaded file
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # 1. Transcribe and Normalize once
        normalized = ai_pipeline.audio_to_text(temp_path, source_lang=language)
        if not normalized:
            return {"status": "skipped", "reason": "no_speech_detected"}
        print(f"Room {room_id} | Sender {sid} | Text: {normalized}")

        # 2. Identify recipients and their languages
        other_users = {s: u for s, u in rooms[room_id].items() if s != sid}
        if not other_users:
            return {"status": "success", "text": normalized, "note": "no_recipients"}

        # Group recipients by their language preference
        lang_groups = {}
        for r_sid, r_user in other_users.items():
            lang = r_user.get('language', 'ta')
            if lang not in lang_groups:
                lang_groups[lang] = []
            lang_groups[lang].append(r_sid)

        # 3. Process for each unique target language
        sender_name = rooms[room_id].get(sid, {}).get('name', 'Someone')

        for target_lang, recipient_sids in lang_groups.items():
            # If recipient wants a different language than sender, translate and TTS
            # Even if same language, we might want to send the text for the logs
            
            translated = ai_pipeline.translate_text(normalized, target_lang=target_lang)
            audio_b64 = ai_pipeline.text_to_speech(translated, lang=target_lang)
            
            if audio_b64:
                audio_binary = base64.b64decode(audio_b64)
                # Emit to all users in this language group
                for r_sid in recipient_sids:
                    await sio.emit('receive_audio', {
                        'audio': audio_binary,
                        'text': translated,
                        'from': sender_name
                    }, room=r_sid)
        
        return {
            "status": "success",
            "text": normalized
        }
        
    except Exception as e:
        print(f"Error in process-audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/health")
async def health_check():
    return {"status": "ok"}
