import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from socket_events import sio
from routes import router
import os

app = FastAPI(title="VoxLink AI Voice Translator")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST Routes
app.include_router(router)

# Mount Socket.IO to FastAPI
socket_app = socketio.ASGIApp(sio, app)

@app.get("/")
async def root():
    return {"message": "Welcome to VoxLink AI Voice Translator Backend"}

if __name__ == "__main__":
    # Ensure temp directory exists
    os.makedirs("temp_audio", exist_ok=True)
    
    # Run server
    uvicorn.run(socket_app, host="0.0.0.0", port=5001)
