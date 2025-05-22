import json
import time
import random
import uuid
import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect

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
        # обработка слова от игрока
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

        # Базовая проверка слова
        if not word or len(word) < 3:
            await self.send_to_player(player_id, {
                'type': 'WORD_RESULT',
                'word': word,
                'valid': False,
                'score': 0,
                'message': 'Слово должно быть не менее 3 букв'
            })
            return

        # Проверка слова по словарю и возможности составить из основного слова
        is_valid = await self.check_word(word) and self.can_make_word(word, room['mainWord'])

        if is_valid:
            # проверка, что слово еще не использовалось этим игроком
            if word in player['userWords']:
                await self.send_to_player(player_id, {
                    'type': 'WORD_RESULT',
                    'word': word,
                    'valid': False,
                    'score': 0,
                    'message': 'Вы уже использовали это слово'
                })
                return
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
            # обновление состояния комнаты для всех игроков
            await self.update_room_state(room_id)
        else:
            # отправка результата игроку
            await self.send_to_player(player_id, {
                'type': 'WORD_RESULT',
                'word': word,
                'valid': False,
                'score': 0,
                'message': 'Неверное слово или его нельзя составить из основного слова'
            })

    async def check_word(self, word: str) -> bool:
        """
        Проверяет слово на валидность с помощью словаря.
        Используется для проверки слов в режиме practice.
        """
        word = word.lower().strip()
        return word in self.dictionary

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
            for room_id, room in list(self.rooms.items()):
                if room['status'] == 'playing':
                    elapsed = time.time() - room['startTime']
                    if elapsed >= room['timeLimit']:
                        await self.finish_game(room_id)
            await asyncio.sleep(1)  # Проверка каждую секунду

    def generate_word(self, length: int) -> str:
        return self.dictionary.generate_word(min_length=length, max_length=length+4)

    def can_make_word(self, word: str, main_word: str) -> bool:
        """
        Проверяет, можно ли составить слово из букв основного слова.
        """
        word = word.lower()
        main_word_chars = list(main_word.lower())
        for char in word:
            if char in main_word_chars:
                main_word_chars.remove(char)
            else:
                return False
        return True

    # Обновите check_word, чтобы использовать новый метод
    def check_word(self, word: str, main_word: str = None) -> bool:
        """
        Проверяет валидность слова.
        Если main_word задано, проверяет также возможность составить слово из букв основного слова.
        """
        word = word.lower()
        if word not in self.dictionary:
            return False

        if main_word:
            return self.can_make_word(word, main_word)

        return True