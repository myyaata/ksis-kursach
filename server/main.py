import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request

from server.game_server import GameServer

app = FastAPI()

# монтирование статических файлов
app.mount("/static", StaticFiles(directory="client/static"), name="static")

# шаблоны
templates = Jinja2Templates(directory="client/templates")

# создание экземпляра игрового сервера
game_server = GameServer()


@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    await game_server.connect(websocket, player_id)

    try:
        while True:
            data = await websocket.receive_json()
            await game_server.handle_client_message(player_id, data)
    except WebSocketDisconnect:
        await game_server.handle_disconnect(player_id)
    except Exception as e:
        print(f"Ошибка: {e}")
        await game_server.handle_disconnect(player_id)


@app.get("/generate_player_id")
async def generate_player_id():
    return {"player_id": str(uuid.uuid4())[:8]}


@app.get("/check_word")
async def check_word_endpoint(word: str):
    """
    API эндпоинт для проверки слова через словарь.
    """
    if not word or len(word) < 3:
        return {"valid": False}

    valid = await game_server.check_word(word)
    return {"valid": valid}