/**
 * Игровой клиент для игры слов
 */
const GameClient = {
    // Состояние игры
    state: {
        mainWord: "",          // Основное слово для игры
        userWords: [],         // Слова, которые игрок уже составил
        availableCells: 0,     // Количество доступных ячеек
        timeLeft: 0,           // Оставшееся время
        score: 0,              // Набранные очки
        level: 1,              // Текущий уровень
        playerId: "",          // ID игрока
        roomId: "",            // ID комнаты для мультиплеера
        opponents: [],         // Данные о других игроках в комнате
        practiceMode: false,   // Режим практики (одиночная игра)
        levelsMode: false,     // Режим уровней
        currentLevelData: null, // Данные текущего уровня
        earnedStars: 0,        // Заработанные звезды за текущий уровень
        progress: {            // Прогресс игрока по уровням
            currentLevel: 1,
            levels: {}         // Информация о пройденных уровнях и звездах
        }
},

    // WebSocket соединение
    socket: null,
    timer: null,

    levels: [
        {
            id: 1,
            mainWord: "программа",
            wordsToFind: ["мама", "папа", "рама", "гора", "пора", "порог", "грамм"],
            targets: [3, 5, 7],  // Количество слов для 1, 2, 3 звезд
            timeLimit: 180,
            hint: "Начните с простых слов из 3-4 букв. Например, 'рама'.",
            background: "/static/img/levels/level1.jpg"
        },
        {
            id: 2,
            mainWord: "компьютер",
            wordsToFind: ["кот", "ток", "метр", "комп", "тюрьма", "тюрем", "корт", "порт", "трюмо"],
            targets: [4, 7, 9],
            timeLimit: 240,
            hint: "Обратите внимание на букву 'ю'. Её сложно использовать, но она есть в некоторых словах.",
            background: "/static/img/levels/level2.jpg"
        },
        {
            id: 3,
            mainWord: "технология",
            wordsToFind: ["нота", "тело", "тень", "лето", "толь", "хлен", "нехотя", "хотя", "гол", "лето", "техно"],
            targets: [5, 8, 11],
            timeLimit: 300,
            hint: "Попробуйте составить слова, начинающиеся с 'т' и 'х'.",
            background: "/static/img/levels/level3.jpg"
        },
        // Добавьте больше уровней по аналогии
    ],

    // Инициализация игры
    init: function() {
        console.log('Инициализация GameClient...');
        this.loadProgress();

        // Получение ID игрока
        this.getPlayerId().then(playerId => {
            console.log('Получен ID игрока:', playerId);
            this.state.playerId = playerId;

            // Настройка обработчиков событий для элементов интерфейса
            document.getElementById('login-btn').addEventListener('click', () => {
                const username = document.getElementById('username-input').value.trim();
                if (username) {
                    console.log('Нажата кнопка входа с именем:', username);
                    this.login(username);
                } else {
                    this.showError('Введите имя пользователя');
                }
            });

            document.getElementById('create-room-btn').addEventListener('click', () => {
                console.log('Нажата кнопка создания комнаты');
                this.createRoom();
            });

            document.getElementById('join-room-btn').addEventListener('click', () => {
                const roomId = document.getElementById('room-id-input').value.trim();
                if (roomId) {
                    console.log('Нажата кнопка присоединения к комнате:', roomId);
                    this.joinRoom(roomId);
                } else {
                    this.showError('Введите ID комнаты');
                }
            });

            // Обработчик для быстрой игры (режим практики)
            document.getElementById('practice-mode-btn').addEventListener('click', () => {
                console.log('Нажата кнопка быстрой игры');
                this.startPracticeMode();
            });

            // Обработчик для режима уровней
            document.getElementById('levels-mode-btn').addEventListener('click', () => {
                console.log('Нажата кнопка режима уровней');
                this.showLevelsScreen();
            });

            document.getElementById('submit-word-btn').addEventListener('click', () => {
                const wordInput = document.getElementById('word-input');
                const word = wordInput.value.trim().toLowerCase();

                if (word) {
                    console.log('Отправка слова:', word);
                    this.submitWord(word);
                    wordInput.value = '';
                }
            });

            document.getElementById('word-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const word = e.target.value.trim().toLowerCase();
                    if (word) {
                        console.log('Отправка слова через Enter:', word);
                        this.submitWord(word);
                        e.target.value = '';
                    }
                }
            });

            document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
                console.log('Возврат в лобби');
                this.showScreen('lobby-screen');
            });

            document.getElementById('back-to-lobby-from-levels').addEventListener('click', () => {
                console.log('Возврат в лобби из экрана уровней');
                this.showScreen('lobby-screen');
            });

            // Обработчик для копирования ID комнаты
            document.getElementById('copy-room-id').addEventListener('click', () => {
                const roomId = document.getElementById('game-room-id').textContent;
                this.copyToClipboard(roomId);
                this.showMessage('ID комнаты скопирован в буфер обмена');
            });

            // Создаем папки для изображений, если их нет
            this.createImageFolders();
        }).catch(error => {
            console.error('Ошибка при получении ID игрока:', error);
            this.showError('Ошибка подключения к серверу: ' + error.message);
        });
    },

    // Создание папок для изображений
    createImageFolders: function() {
        // Это просто заглушка, на клиенте мы не можем создавать папки
        // В реальном проекте нужно создать эти папки вручную на сервере
        console.log('Примечание: Убедитесь, что следующие папки существуют на сервере:');
        console.log('/static/img/');
        console.log('/static/img/levels/');
        console.log('/static/img/star.svg должен быть добавлен');
    },

    // Копирование текста в буфер обмена
    copyToClipboard: function(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Текст скопирован в буфер обмена');
        }).catch(err => {
            console.error('Ошибка при копировании текста:', err);
        });
    },

    // Загрузка прогресса игрока
    loadProgress: function() {
        const savedProgress = localStorage.getItem('wordGameProgress');
        if (savedProgress) {
            try {
                this.state.progress = JSON.parse(savedProgress);
                console.log('Загружен прогресс игрока:', this.state.progress);
            } catch (e) {
                console.error('Ошибка при загрузке прогресса:', e);
                this.state.progress = { currentLevel: 1, levels: {} };
            }
        }
    },

    // Сохранение прогресса игрока
    saveProgress: function() {
        localStorage.setItem('wordGameProgress', JSON.stringify(this.state.progress));
        console.log('Прогресс игрока сохранен:', this.state.progress);
    },

    // Показ экрана выбора уровней
    showLevelsScreen: function() {
        // Формируем сетку уровней
        const levelsGrid = document.getElementById('levels-grid');
        levelsGrid.innerHTML = '';

        this.levels.forEach(level => {
            const isUnlocked = level.id <= this.state.progress.currentLevel;
            const levelProgress = this.state.progress.levels[level.id] || { stars: 0 };

            const levelCard = document.createElement('div');
            levelCard.className = `level-card ${isUnlocked ? '' : 'locked'}`;

            if (isUnlocked) {
                levelCard.addEventListener('click', () => {
                    this.startLevelMode(level.id);
                });
            }

            let levelCardContent = '';

            if (isUnlocked) {
                levelCardContent = `
                    <div class="level-number">${level.id}</div>
                    <div class="level-stars">
                `;

                // Добавляем звезды
                for (let i = 1; i <= 3; i++) {
                    const starClass = i <= levelProgress.stars ? 'earned' : '';
                    levelCardContent += `<img src="/static/img/star.svg" class="level-star ${starClass}" alt="Звезда">`;
                }

                levelCardContent += `</div>`;
            } else {
                levelCardContent = `
                    <div class="level-lock">🔒</div>
                    <div class="level-number">${level.id}</div>
                `;
            }

            levelCard.innerHTML = levelCardContent;
            levelsGrid.appendChild(levelCard);
        });

        this.showScreen('levels-screen');
    },

    // Запуск режима уровней
    startLevelMode: function(levelId) {
        console.log('Запуск уровня:', levelId);

        // Находим данные уровня
        const levelData = this.levels.find(level => level.id === levelId);
        if (!levelData) {
            this.showError('Уровень не найден');
            return;
        }

        this.state.levelsMode = true;
        this.state.practiceMode = false;
        this.state.currentLevelData = levelData;

        // Настраиваем игру
        this.state.mainWord = levelData.mainWord;
        this.state.availableCells = 20;
        this.state.timeLeft = levelData.timeLimit;
        this.state.userWords = [];
        this.state.score = 0;
        this.state.opponents = [];
        this.state.level = levelId;
        this.state.earnedStars = 0;

        // Показываем игровой экран
        this.showScreen('game-screen');

        // Отображаем информацию об уровне
        document.getElementById('level-info').classList.remove('hidden');
        document.getElementById('current-level').textContent = levelId;
        document.getElementById('target-words-count').textContent = levelData.targets[0];
        document.getElementById('room-id-display').classList.add('hidden');

        // Сбрасываем звезды
        document.querySelectorAll('.stars-container .star').forEach(star => {
            star.classList.remove('earned');
        });
        //ПРОДОЛЖИТЬ
        }


    // Получение ID игрока с сервера
    getPlayerId: function() {
        console.log('Запрос ID игрока...');
        return fetch('/generate_player_id')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Сервер недоступен');
                }
                return response.json();
            })
            .then(data => {
                console.log('Получен ответ с ID игрока:', data);
                return data.player_id;
            });
    },

    // Вход в игру
    login: function(username) {
        console.log('Вход в игру с именем:', username);
        // Подключение к WebSocket
        this.connectWebSocket(username);
        this.showScreen('lobby-screen');
    },

    // Подключение к WebSocket
    connectWebSocket: function(username) {
        console.log('Подключение к WebSocket...');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.state.playerId}?username=${encodeURIComponent(username)}`;

        console.log('URL для WebSocket:', wsUrl);

        try {
            this.socket = new WebSocket(wsUrl);
        } catch (e) {
            console.error('Ошибка при создании WebSocket:', e);
            this.showError('Не удалось подключиться к серверу: ' + e.message);
            return;
        }

        // Обработчики событий WebSocket
        this.socket.onopen = () => {
            console.log('WebSocket соединение установлено');
        };

        this.socket.onmessage = (event) => {
            console.log('Получено сообщение от сервера:', event.data);
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (e) {
                console.error('Ошибка разбора сообщения:', e);
            }
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket соединение закрыто:', event);
            if (!event.wasClean) {
                this.showError('Соединение с сервером потеряно. Перезагрузите страницу.');
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket ошибка:', error);
            this.showError('Ошибка соединения с сервером');
        };
    },

    // Режим практики (одиночная игра)
    startPracticeMode: function() {
        console.log('Запуск режима практики');
        this.state.practiceMode = true;

        // Генерируем случайное слово для практики
        const practiceWords = [
            "программирование", "разработка", "алгоритм", "компьютер",
            "интернет", "технология", "виртуальный", "разработчик"
        ];
        const mainWord = practiceWords[Math.floor(Math.random() * practiceWords.length)];

        // Настраиваем игру
        this.state.mainWord = mainWord;
        this.state.availableCells = 20;
        this.state.timeLeft = 300; // 5 минут
        this.state.userWords = [];
        this.state.score = 0;
        this.state.opponents = [];

        // Запускаем игру
        this.showScreen('game-screen');
        this.renderGameState();
        this.startTimer();

        this.showMessage("Режим практики запущен. Составьте как можно больше слов из букв слова: " + mainWord);
    },

    // Словарь для проверки слов в режиме практики
    practiceWordCheck: function(word, mainWord) {
        // Простая проверка: можно ли составить слово из букв основного слова
        const mainWordChars = [...mainWord.toLowerCase()];
        for (const char of word.toLowerCase()) {
            const index = mainWordChars.indexOf(char);
            if (index === -1) {
                return false;
            }
            mainWordChars.splice(index, 1);
        }

        // Проверяем наличие слова в простом словаре
        const commonRussianWords = [
            "код", "программа", "мир", "игра", "тип", "год", "мама", "папа",
            "дом", "кот", "рот", "пар", "гора", "море", "река", "лицо", "рука",
            "нога", "рыба", "мясо", "ухо", "нос", "окно", "сыр", "пол", "мир",
            "вода", "огонь", "трава", "снег", "лед", "песок", "земля", "небо",
            "сон", "еда", "путь", "сеть", "база", "диск", "порт", "файл", "тест",
            "урок", "идея", "закон", "город", "парк", "метро", "роль", "цикл", "поле",
            "поток", "класс", "метод", "отчет", "форма", "пакет", "модем", "цвет",
            "лиса", "волк", "лось", "тигр", "прога", "комп", "интер", "алго", "прием",
            "метр", "литр", "грамм", "тонна", "метка", "право", "олово", "аванс",
            "товар", "набор", "повар", "вирус", "время", "рамка", "лампа"
        ];

        return commonRussianWords.includes(word.toLowerCase()) ||
               word.length >= 3; // Разрешаем любые слова длиной от 3 букв для упрощения
    },

    // Обработка сообщений от сервера
    handleServerMessage: function(data) {
        console.log('Обработка сообщения от сервера:', data);

        switch(data.type) {
            case 'CONNECTED':
                console.log('Успешное подключение к серверу');
                break;

            case 'ROOM_CREATED':
                this.state.roomId = data.roomId;
                this.showMessage(`Комната создана. ID: ${data.roomId}`);
                document.getElementById('room-id-input').value = data.roomId;
                break;

            case 'ROOM_JOINED':
                this.state.roomId = data.roomId;
                this.showMessage(`Вы присоединились к комнате: ${data.roomId}`);
                break;

            case 'GAME_STATE':
                this.updateGameState(data.state);
                break;

            case 'WORD_RESULT':
                this.processWordResult(data.word, data.valid, data.score, data.message);
                break;

            case 'GAME_START':
                this.startGame(data.mainWord, data.availableCells, data.timeLimit);
                break;

            case 'GAME_END':
                this.endGame(data.results);
                break;

            case 'ERROR':
                this.showError(data.message);
                break;
        }
    },

    // Создание новой комнаты
    createRoom: function() {
        console.log('Создание новой комнаты...');
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'CREATE_ROOM'
            }));
        } else {
            this.showError('Нет соединения с сервером');
        }
    },

    // Присоединение к существующей комнате
    joinRoom: function(roomId) {
        console.log('Присоединение к комнате:', roomId);
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'JOIN_ROOM',
                roomId: roomId
            }));
        } else {
            this.showError('Нет соединения с сервером');
        }
    },

    // Отправка составленного слова на проверку
    submitWord: function(word) {
        console.log('Отправка слова на проверку:', word);

        // Если в режиме практики, обрабатываем локально
        if (this.state.practiceMode) {
            this.processPracticeWord(word);
            return;
        }

        // Иначе отправляем на сервер
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'SUBMIT_WORD',
                word: word,
                roomId: this.state.roomId
            }));
        } else {
            this.showError('Нет соединения с сервером');
        }
    },

    // Обработка слова в режиме практики
    processPracticeWord: function(word) {
        console.log('Обработка слова в режиме практики:', word);

        // Проверяем, что слово не было уже использовано
        if (this.state.userWords.includes(word)) {
            this.showMessage(`Вы уже использовали слово "${word}"`);
            return;
        }

        // Проверяем валидность слова
        const isValid = this.practiceWordCheck(word, this.state.mainWord);

        if (isValid) {
            // Добавляем слово в список
            this.state.userWords.push(word);

            // Начисляем очки (1 за букву)
            const score = word.length;
            this.state.score += score;

            this.showMessage(`+${score} очков за слово "${word}"!`);
            this.renderGameState();
        } else {
            this.showMessage(`Слово "${word}" не может быть составлено из букв основного слова или отсутствует в словаре`);
        }
    },

    // Обновление состояния игры
    updateGameState: function(newState) {
        console.log('Обновление состояния игры:', newState);
        this.state = {...this.state, ...newState};

        // Если получено игровое состояние и мы не в игровом экране, показываем его
        if (newState.mainWord && document.getElementById('game-screen').classList.contains('hidden')) {
            this.showScreen('game-screen');
        }

        this.renderGameState();
    },

    // Обработка результата проверки слова
    processWordResult: function(word, valid, score, message) {
        console.log('Обработка результата проверки слова:', word, valid, score, message);
        if (valid) {
            // Слово не добавляем, так как оно придет в обновлении состояния
            this.showMessage(`+${score} очков за слово "${word}"!`);
        } else {
            this.showMessage(message || `Слово "${word}" не принято.`);
        }
    },

    // Запуск игры
    startGame: function(mainWord, availableCells, timeLimit) {
        console.log('Запуск игры:', mainWord, availableCells, timeLimit);
        this.state.mainWord = mainWord;
        this.state.availableCells = availableCells;
        this.state.timeLeft = timeLimit;
        this.state.userWords = [];
        this.state.score = 0;

        this.showScreen('game-screen');
        this.renderGameState();
        this.startTimer();
    },

    // Завершение игры
    endGame: function(results) {
        console.log('Завершение игры, результаты:', results);
        this.stopTimer();

        // Для режима практики создаем результаты локально
        if (this.state.practiceMode) {
            results = [{
                username: "Вы (режим практики)",
                score: this.state.score,
                userWords: this.state.userWords
            }];
        }

        this.showResults(results);
        this.showScreen('results-container');

        // Сбрасываем режим практики
        this.state.practiceMode = false;
    },

    // Запуск таймера обратного отсчета
    startTimer: function() {
        console.log('Запуск таймера');
        this.stopTimer(); // Останавливаем предыдущий таймер, если он был

        this.timer = setInterval(() => {
            this.state.timeLeft--;
            this.renderTimeLeft();

            if (this.state.timeLeft <= 0) {
                console.log('Время вышло');
                this.stopTimer();

                if (this.state.practiceMode) {
                    this.endGame(); // Локальное завершение игры
                } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({
                        type: 'GAME_FINISHED',
                        roomId: this.state.roomId
                    }));
                }
            }
        }, 1000);
    },

    // Остановка таймера
    stopTimer: function() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    // Отрисовка игрового состояния в интерфейсе
    renderGameState: function() {
        document.getElementById('main-word').textContent = this.state.mainWord;
        document.getElementById('score').textContent = this.state.score;
        this.renderTimeLeft();

        // Обновление списка слов игрока
        const wordsList = document.getElementById('words-list');
        wordsList.innerHTML = '';
        this.state.userWords.forEach(word => {
            const wordElement = document.createElement('div');
            wordElement.className = 'word-item';
            wordElement.textContent = word;
            wordsList.appendChild(wordElement);
        });

        // Обновление информации о соперниках
        const opponentsList = document.getElementById('opponents');
        opponentsList.innerHTML = '';
        if (this.state.practiceMode) {
            const noOpponentsMsg = document.createElement('div');
            noOpponentsMsg.textContent = 'Режим практики (без соперников)';
            opponentsList.appendChild(noOpponentsMsg);
        } else {
            this.state.opponents.forEach(opponent => {
                const opponentElement = document.createElement('div');
                opponentElement.className = 'opponent';
                opponentElement.textContent = `${opponent.username}: ${opponent.score} очков, ${opponent.wordsCount} слов`;
                opponentsList.appendChild(opponentElement);
            });
        }
    },

    // Отрисовка оставшегося времени
    renderTimeLeft: function() {
        document.getElementById('time-left').textContent = this.state.timeLeft;
    },

    // Отображение сообщения пользователю
    showMessage: function(message) {
        console.log('Сообщение:', message);
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.style.opacity = 1;

        setTimeout(() => {
            messageElement.style.opacity = 0;
        }, 3000);
    },

    // Отображение ошибки
    showError: function(message) {
        console.error('Ошибка:', message);
        alert(`Ошибка: ${message}`);
    },

    // Отображение результатов игры
    showResults: function(results) {
        console.log('Отображение результатов:', results);
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';

        results.forEach((result, index) => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item';
            resultElement.innerHTML = `
                <div class="position">${index + 1}</div>
                <div class="player-name">${result.username}</div>
                <div class="player-score">${result.score} очков</div>
                <div class="words-count">${result.userWords ? result.userWords.length : 0} слов</div>
            `;
            resultsList.appendChild(resultElement);
        });
    },

    // Показать определенный экран
    showScreen: function(screenId) {
        console.log('Показ экрана:', screenId);
        // Скрыть все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        // Показать нужный экран
        document.getElementById(screenId).classList.remove('hidden');
    }
};

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация GameClient');
    GameClient.init();
});