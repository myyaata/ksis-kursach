import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from server.game_server import GameServer

app = FastAPI()

# Монтирование статических файлов
app.mount("/static", StaticFiles(directory="client/static"), name="static")

# Шаблоны
templates = Jinja2Templates(directory="client/templates")

# Создание экземпляра игрового сервера
game_server = GameServer()


@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str, username: Optional[str] = None):
    await game_server.connect(websocket, player_id, username)
    try:
        while True:
            data = await websocket.receive_json()
            await game_server.handle_client_message(player_id, data)
    except WebSocketDisconnect:
        await game_server.handle_disconnect(player_id)


@app.get("/generate_player_id")
async def generate_player_id():
    return {"player_id": str(uuid.uuid4())[:8]}


@app.get("/check_word")
async def check_word(word: str):
    """
    Эндпоинт для проверки существования слова в Wiktionary
    """
    try:
        logger.info(f"Проверка слова: {word}")

        # Базовая валидация
        if not word or len(word.strip()) < 2:
            return JSONResponse(
                content={"valid": False, "error": "Слово слишком короткое"},
                status_code=200
            )

        word = word.strip().lower()

        # Проверяем слово через game_server
        is_valid = game_server.check_word_in_wiktionary(word)

        logger.info(f"Результат проверки слова '{word}': {is_valid}")

        return JSONResponse(
            content={"valid": is_valid},
            status_code=200
        )

    except Exception as e:
        logger.error(f"Ошибка при проверке слова '{word}': {str(e)}")
        # В случае ошибки возвращаем True, чтобы не блокировать игру
        return JSONResponse(
            content={"valid": True, "error": "Ошибка API"},
            status_code=200
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Необработанная ошибка: {str(exc)}")
    return JSONResponse(
        content={"error": "Внутренняя ошибка сервера"},
        status_code=500
    )