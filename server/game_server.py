import json
import ssl
import time
import random
import uuid
import asyncio

import aiohttp
import certifi
import requests
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from collections import Counter

from fastapi.responses import JSONResponse

from .dictionary import Dictionary


class GameServer:
    def __init__(self):
        # комнаты с игроками
        self.rooms: Dict[str, dict] = {}
        # активные соединения пользователей
        self.connections: Dict[str, dict] = {}

        self.dictionary = Dictionary()

        # Если словарь пуст, создаем тестовый
        if self.dictionary.size() == 0:
            from .dictionary import create_sample_dictionary
            create_sample_dictionary()
            self.dictionary = Dictionary()

        # Запускаем фоновую задачу проверки истечения времени игр
        asyncio.create_task(self.check_expired_games())

    async def connect(self, websocket: WebSocket, player_id: str):
        await websocket.accept()  # установка соединия для обмена данными
        self.connections[player_id] = {
            'ws': websocket,
            'username': '',
            'room_id': None
        }

    async def handle_client_message(self, player_id: str, data: dict):
        if player_id not in self.connections:
            return
        connection = self.connections[player_id]
        message_type = data.get('type')

        if message_type == 'JOIN':
            connection['username'] = data.get('username', 'Игрок')
            await self.send_to_player(player_id, {
                'type': 'CONNECTED',
                'playerId': player_id
            })
        elif message_type == 'CREATE_ROOM':
            await self.create_room(player_id)
        elif message_type == 'JOIN_ROOM':
            # Исправлено - передаем только player_id и roomId
            await self.join_room(player_id, data.get('roomId'))
        elif message_type == 'SUBMIT_WORD':
            # Добавлено - обработка отправки слова
            await self.process_word(player_id, data.get('word', ''), connection['room_id'])
        elif message_type == 'GAME_FINISHED':
            await self.finish_game(data.get('roomId'))

    async def create_room(self, player_id: str):
        room_id = str(uuid.uuid4())[:8]
        connection = self.connections[player_id]

        self.rooms[room_id] = {
            'id': room_id,
            'players': [
                {
                    'id': player_id,
                    'username': connection['username'],
                    'score': 0,
                    'userWords': []
                }
            ],
            'mainWord': self.generate_word(10),
            'availableCells': 20,
            'timeLimit': 300,  # 5 минут
            'status': 'waiting',  # waiting / playing / finished
            'created': time.time()
        }
        # обновление инфы о подключении
        connection['room_id'] = room_id
        # отправка инфы о комнате
        await self.send_to_player(player_id, {
            'type': 'ROOM_CREATED',
            'roomId': room_id
        })
        # обновление состояния комнаты для всех игроков
        await self.update_room_state(room_id)

    async def join_room(self, player_id: str, room_id: str):
        # присоединение к существующей комнате
        if not room_id or room_id not in self.rooms:
            await self.send_to_player(player_id, {
                'type': 'ERROR',
                'message': 'Комната не найдена'
            })
            return
        room = self.rooms[room_id]
        connection = self.connections[player_id]
        if room['status'] != 'waiting':
            await self.send_to_player(player_id, {
                'type': 'ERROR',
                'message': 'Игра уже началась'
            })
            return
        # добавление игрока в комнату
        room['players'].append({
            'id': player_id,
            'username': connection['username'],
            'score': 0,
            'userWords': []
        })
        # обновление инфы о подключении
        connection['room_id'] = room_id
        # отправка подтверждения
        await self.send_to_player(player_id, {
            'type': 'ROOM_JOINED',
            'roomId': room_id
        })
        # если в комнате 2 и более игроков, начинаем игру
        if len(room['players']) >= 2:
            await self.start_game(room_id)
        else:
            # обновление состояния комнаты для всех игроков
            await self.update_room_state(room_id)

    async def start_game(self, room_id: str):
        if room_id not in self.rooms:
            return
        room = self.rooms[room_id]
        room['status'] = 'playing'
        room['startTime'] = time.time()
        # отправка всем игрокам события начала игры
        for player in room['players']:
            await self.send_to_player(player['id'], {
                'type': 'GAME_START',
                'mainWord': room['mainWord'],
                'availableCells': room['availableCells'],
                'timeLimit': room['timeLimit']
            })

    async def process_word(self, player_id: str, word: str, room_id: str):
        """Исправленная обработка слова от игрока"""
        if not room_id or room_id not in self.rooms:
            return
        room = self.rooms[room_id]
        if room['status'] != 'playing':
            return

        # поиск игрока в комнате
        player = None
        for p in room['players']:
            if p['id'] == player_id:
                player = p
                break
        if not player:
            return

        # Приводим слово к нижнему регистру и убираем пробелы
        word = word.strip().lower()

        # Базовая проверка слова
        if not word or len(word) < 2:
            await self.send_to_player(player_id, {
                'type': 'WORD_RESULT',
                'word': word,
                'valid': False,
                'score': 0,
                'message': 'Слово должно быть не менее 2 букв'
            })
            return

        # Проверка, что слово еще не использовалось этим игроком
        if word in [w.lower() for w in player['userWords']]:
            await self.send_to_player(player_id, {
                'type': 'WORD_RESULT',
                'word': word,
                'valid': False,
                'score': 0,
                'message': 'Вы уже использовали это слово'
            })
            return

        # 1. СНАЧАЛА проверяем существование в Wiktionary
        word_exists = False
        try:
            word_exists = await self.check_word_in_wiktionary_async(word)
            print(f"Результат проверки в Wiktionary для '{word}': {word_exists}")
        except Exception as e:
            print(f"Ошибка при проверке слова в Wiktionary: {e}")
            # В случае ошибки API пробуем синхронную версию
            try:
                word_exists = self.check_word_in_wiktionary(word)
                print(f"Результат синхронной проверки в Wiktionary для '{word}': {word_exists}")
            except Exception as e2:
                print(f"Ошибка и в синхронной проверке: {e2}")
                # В крайнем случае считаем слово валидным, чтобы не блокировать игру
                word_exists = True

        # Если слова нет в словаре - сразу отклоняем
        if not word_exists:
            await self.send_to_player(player_id, {
                'type': 'WORD_RESULT',
                'word': word,
                'valid': False,
                'score': 0,
                'message': 'Это слово не найдено в словаре'
            })
            return

        # 2. ТОЛЬКО ЕСЛИ слово есть в словаре - проверяем, можно ли его составить
        if not self.can_make_word(word, room['mainWord']):
            await self.send_to_player(player_id, {
                'type': 'WORD_RESULT',
                'word': word,
                'valid': False,
                'score': 0,
                'message': 'Это слово нельзя составить из основного слова'
            })
            return

        # 3. Если все проверки пройдены - принимаем слово
        # добавление слова в список игрока
        player['userWords'].append(word)
        # подсчет очков (1 очко за каждую букву)
        score = len(word)
        player['score'] += score

        # отправка результата игроку
        await self.send_to_player(player_id, {
            'type': 'WORD_RESULT',
            'word': word,
            'valid': True,
            'score': score
        })

        # уведомляем всех остальных игроков о найденном слове
        for other_player in room['players']:
            if other_player['id'] != player_id:  # Всем кроме того, кто нашел слово
                await self.send_to_player(other_player['id'], {
                    'type': 'WORD_FOUND',
                    'playerId': player_id,
                    'username': player['username'],
                    'word': word,
                    'score': score
                })

        # обновление состояния комнаты для всех игроков
        await self.update_room_state(room_id)

    async def finish_game(self, room_id: str):
        if not room_id or room_id not in self.rooms:
            return
        room = self.rooms[room_id]
        if room['status'] == 'finished':
            return
        room['status'] = 'finished'
        room['endTime'] = time.time()
        # сортировка игроков по очкам
        room['players'] = sorted(room['players'], key=lambda p: p['score'], reverse=True)
        for player in room['players']:
            await self.send_to_player(player['id'], {
                'type': 'GAME_END',
                'results': [
                    {
                        'username': p['username'],
                        'score': p['score'],
                        'userWords': p['userWords']
                    } for p in room['players']
                ]
            })

    async def update_room_state(self, room_id: str):
        # обновление состояния комнаты для всех игроков
        if room_id not in self.rooms:
            return
        room = self.rooms[room_id]
        for player in room['players']:
            # отправляем инфу о других игроках (без своих слов)
            opponents = [
                {
                    'username': p['username'],
                    'score': p['score'],
                    'wordsCount': len(p['userWords'])
                } for p in room['players'] if p['id'] != player['id']
            ]
            time_left = 0
            if room['status'] == 'playing':
                elapsed = time.time() - room['startTime']
                time_left = max(0, room['timeLimit'] - int(elapsed))
            else:
                time_left = room['timeLimit']

            await self.send_to_player(player['id'], {
                'type': 'GAME_STATE',
                'state': {
                    'mainWord': room['mainWord'],
                    'availableCells': room['availableCells'],
                    'timeLeft': time_left,
                    'score': player['score'],
                    'userWords': player['userWords'],
                    'opponents': opponents,
                    'roomId': room_id,
                    'status': room['status']
                }
            })

    async def handle_disconnect(self, player_id: str):
        if player_id not in self.connections:
            return
        connection = self.connections[player_id]
        # если игрок был в комнате, обновляем состояние комнаты
        room_id = connection.get('room_id')
        if room_id and room_id in self.rooms:
            room = self.rooms[room_id]
            # удаление игрока из комнаты
            room['players'] = [p for p in room['players'] if p['id'] != player_id]
            # если в комнате не осталось игроков, удаляем комнату
            if not room['players']:
                del self.rooms[room_id]
            else:
                # иначе обновляем состояние комнаты
                await self.update_room_state(room_id)
        # удаление соединения
        del self.connections[player_id]

    async def send_to_player(self, player_id: str, data: dict):
        if player_id not in self.connections:
            return
        connection = self.connections[player_id]
        try:
            await connection['ws'].send_json(data)
        except Exception as e:
            print(f"Ошибка при отправке сообщения: {e}")

    async def check_expired_games(self):
        # Фоновая задача для проверки истекших игр
        while True:
            try:
                for room_id, room in list(self.rooms.items()):
                    if room['status'] == 'playing':
                        elapsed = time.time() - room['startTime']
                        if elapsed >= room['timeLimit']:
                            await self.finish_game(room_id)
                await asyncio.sleep(1)  # Проверка каждую секунду
            except Exception as e:
                print(f"Ошибка в check_expired_games: {e}")
                await asyncio.sleep(1)

    def generate_word(self, length: int) -> str:
        word = self.dictionary.generate_word(min_length=length, max_length=length + 4)
        return word if word else "программирование"  # fallback

    def can_make_word(self, word: str, main_word: str) -> bool:
        """
        Проверка возможности составить слово из букв основного слова с учетом количества букв.
        """
        if not word or not main_word:
            return False

        word = word.lower().strip()
        main_word = main_word.lower().strip()

        word_counter = Counter(word)
        main_word_counter = Counter(main_word)

        for char, count in word_counter.items():
            if main_word_counter[char] < count:
                return False

        return True

    def check_word_in_wiktionary(self, word: str) -> bool:
        """
        Улучшенная синхронная версия проверки слова в Wiktionary с обходом SSL проблем.
        """
        if not word or len(word.strip()) < 2:
            return False

        word = word.strip().lower()

        # Проверяем русский и английский Викисловарь
        for lang in ['ru', 'en']:
            url = f"https://{lang}.wiktionary.org/w/api.php"
            params = {
                'action': 'query',
                'format': 'json',
                'titles': word,
                'prop': 'info'
            }

            try:
                # Добавляем headers для имитации браузера
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }

                # Отключаем проверку SSL сертификатов если есть проблемы
                response = requests.get(
                    url,
                    params=params,
                    timeout=10,
                    headers=headers,
                    verify=False  # Отключаем SSL верификацию
                )

                if response.status_code != 200:
                    continue

                data = response.json()
                pages = data.get("query", {}).get("pages", {})

                for page_id, page_info in pages.items():
                    if page_id != "-1" and not page_info.get('missing', False):
                        print(f"Слово '{word}' найдено в {lang} Викисловаре")
                        return True

            except Exception as e:
                print(f"Ошибка при проверке слова '{word}' в {lang} Wiktionary: {e}")
                continue

        print(f"Слово '{word}' не найдено в Викисловарях")
        return False
    async def check_word_in_wiktionary_async(self, word: str) -> bool:
        """
        Асинхронная проверка слова в Wiktionary с исправленными SSL настройками.
        """
        if not word or len(word.strip()) < 2:
            return False

        word = word.strip().lower()

        # Создаем SSL контекст с правильными сертификатами
        try:
            ssl_context = ssl.create_default_context(cafile=certifi.where())
        except:
            # Если certifi недоступен, создаем контекст без проверки сертификатов (небезопасно, но работает)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

        # Настройки для aiohttp с таймаутом и SSL
        timeout = aiohttp.ClientTimeout(total=10)
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        try:
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                for lang in ['ru', 'en']:
                    url = f"https://{lang}.wiktionary.org/w/api.php"
                    params = {
                        'action': 'query',
                        'format': 'json',
                        'titles': word,
                        'prop': 'info'
                    }

                    try:
                        async with session.get(url, params=params) as response:
                            if response.status != 200:
                                continue

                            data = await response.json()
                            pages = data.get("query", {}).get("pages", {})

                            for page_id, page_info in pages.items():
                                if page_id != "-1" and not page_info.get('missing', False):
                                    print(f"Слово '{word}' найдено в {lang} Викисловаре (async)")
                                    return True

                    except Exception as e:
                        print(f"Ошибка при проверке слова '{word}' в {lang} Wiktionary: {e}")
                        continue

        except Exception as e:
            print(f"Общая ошибка при асинхронной проверке слова '{word}': {e}")

        print(f"Слово '{word}' не найдено в Викисловарях (async)")
        return False

# Создание глобального экземпляра сервера
game_server = GameServer()