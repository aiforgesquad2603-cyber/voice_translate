import socketio
import base64

# Socket.IO instance (attached to FastAPI in main.py)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Room storage: {room_id: {sid: {name, language}}}
rooms = {}

@sio.event
async def connect(sid, environ):
    print(f"User connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"User disconnected: {sid}")
    # Cleanup room participation
    for room_id, users in list(rooms.items()):
        if sid in users:
            user_name = users[sid]['name']
            del users[sid]
            print(f"User {user_name} ({sid}) left room {room_id}")
            # Notify others in the room
            await sio.emit('room_update', users, room=room_id)
            if not users:
                del rooms[room_id]

@sio.event
async def join_room(sid, data):
    room_id = data.get('room_id')
    user_name = data.get('user_name', f"User {sid[:4]}")
    language = data.get('language', 'en')
    
    if not room_id:
        return
    
    if room_id not in rooms:
        rooms[room_id] = {}
    
    rooms[room_id][sid] = {
        'name': user_name,
        'language': language
    }
    
    await sio.enter_room(sid, room_id)
    print(f"User {user_name} joined room: {room_id}")
    
    # Broadcast updated user list to the room
    await sio.emit('room_update', rooms[room_id], room=room_id)
    # Acknowledge join to the user
    await sio.emit('joined', {'sid': sid, 'user_name': user_name}, room=sid)

