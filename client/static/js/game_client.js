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
    getLevelById(id) {
        return this.levels.find(level => level.id === id);
    },

    // Инициализация игры
    init: function() {
        console.log('Инициализация GameClient...');
        this.loadProgress();

        this.submitWord = this.submitWord.bind(this);
        this.processLevelWord = this.processLevelWord.bind(this);
        this.processPracticeWord = this.processPracticeWord.bind(this);

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
        console.log('Запуск showLevelsScreen...');
        console.log('Состояние прогресса:', this.state.progress);
        const levelsGrid = document.getElementById('levels-grid');
        if (!levelsGrid) {
        console.error('Элемент levels-grid не найден!');
        return;
        }
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

    startLevelMode: function(levelId) {
        console.log('Запуск уровня:', levelId);

        // Находим данные уровня
        const levelData = this.levels.find(level => level.id === levelId);
        if (!levelData) {
            this.showError('Уровень не найден');
            return;
        }

        // Устанавливаем состояние игры
        this.state = {
            ...this.state, // Сохраняем существующие состояния
            levelsMode: true,
            practiceMode: false,
            currentLevelData: levelData,
            mainWord: levelData.mainWord,
            availableCells: levelData.targets[2] + 5, // Ячейки = максимальное целевое количество + 5
            timeLeft: levelData.timeLimit,
            userWords: [],
            score: 0,
            opponents: [],
            level: levelId,
            earnedStars: 0,
            gameStarted: true,
            gameFinished: false,
            lastWordResult: null
        };

        // Показываем игровой экран
        this.showScreen('game-screen');

        // Обновляем UI уровня
        this.updateLevelUI(levelData);

        // Создаем ячейки для слов
        this.renderWordCells();

        // Устанавливаем фон для уровня
        this.setLevelBackground(levelData.background);

        // Сбрасываем звезды
        this.resetStars();

        // Запускаем таймер, если у уровня есть ограничение по времени
        if (levelData.timeLimit > 0) {
            this.startTimer();
        }

        // Рендерим начальное состояние игры
        this.renderGameState();
    },

    // Вспомогательные методы:

    updateLevelUI: function(levelData) {
        // Отображаем информацию об уровне
        document.getElementById('level-info').classList.remove('hidden');
        document.getElementById('current-level').textContent = levelData.id;
        document.getElementById('target-words-count').textContent = levelData.targets[0];
        document.getElementById('room-id-display').classList.add('hidden');

        // Скрываем контейнер соперников
        document.querySelector('.opponents-container').classList.add('hidden');

        // Отображаем подсказку уровня
        this.showLevelHint(levelData.hint);
    },

    showLevelHint: function(hint) {
        if (!hint) return;

        const hintPopup = document.getElementById('hint-popup');
        if (hintPopup) {
            hintPopup.textContent = hint;
            hintPopup.classList.add('visible');

            // Автоматически скрываем подсказку через 5 секунд
            setTimeout(() => {
                hintPopup.classList.remove('visible');
            }, 5000);
        }
    },

    setLevelBackground: function(backgroundUrl) {
        if (!backgroundUrl) return;

        const levelBackground = document.getElementById('level-background');
        if (levelBackground) {
            levelBackground.style.backgroundImage = `url(${backgroundUrl})`;
            levelBackground.classList.add('visible');
        }
    },

    resetStars: function() {
        document.querySelectorAll('.stars-container .star').forEach(star => {
            star.classList.remove('earned');
        });
    },

    // Добавляем новый метод для проверки звезд при добавлении слова
    checkLevelStars: function() {
        if (!this.state.levelsMode || !this.state.currentLevelData) return;

        const wordsToFind = this.state.currentLevelData.wordsToFind;
        const targets = this.state.currentLevelData.targets;

        // Подсчитываем, сколько целевых слов найдено
        let foundTargetWords = 0;
        for (const word of this.state.userWords) {
            if (wordsToFind.includes(word)) {
                foundTargetWords++;
            }
        }

        let earnedStars = 0;
        if (foundTargetWords >= targets[2]) {
            earnedStars = 3;
        } else if (foundTargetWords >= targets[1]) {
            earnedStars = 2;
        } else if (foundTargetWords >= targets[0]) {
            earnedStars = 1;
        }

        // Обновляем звезды, если количество изменилось
        if (earnedStars > this.state.earnedStars) {
            this.state.earnedStars = earnedStars;
            this.updateStarsDisplay();

            // Показываем сообщение о получении новой звезды
            if (earnedStars > 0) {
                this.showMessage(`Вы заработали ${earnedStars} ${this.declOfNum(earnedStars, ['звезду', 'звезды', 'звезд'])}!`, 5000);
            }
        }
},

    // Обновление отображения звезд
    updateStarsDisplay: function() {
        for (let i = 1; i <= 3; i++) {
            const star = document.getElementById(`star-${i}`);
            if (star) {
                if (i <= this.state.earnedStars) {
                    star.classList.add('earned');
                } else {
                    star.classList.remove('earned');
                }
            }
        }
    },

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
        this.state.levelsMode = false;
        this.state.currentLevelData = null;

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

        // Скрываем контейнер соперников и информацию об уровне
        document.querySelector('.opponents-container').classList.add('hidden');
        document.getElementById('level-info').classList.add('hidden');

        // Сбрасываем фон уровня
        const levelBackground = document.getElementById('level-background');
        if (levelBackground) {
            levelBackground.style.backgroundImage = '';
            levelBackground.classList.remove('visible');
        }

        this.renderGameState();
        this.startTimer();

        this.showMessage("Режим практики запущен. Составьте как можно больше слов из букв слова: " + mainWord);
},

    // Словарь для проверки слов в режиме практики
    practiceWordCheck: function(word, mainWord) {
        console.log('Проверка слова:', word);

        // Проверяем минимальную длину
        if (word.length < 3) {
            return false;
        }

        // Проверяем, что слово можно составить из букв основного слова
        const mainWordChars = [...mainWord.toLowerCase()];
        for (const char of word.toLowerCase()) {
            const index = mainWordChars.indexOf(char);
            if (index === -1) {
                return false;
            }
            mainWordChars.splice(index, 1);
        }

        // Проверяем наличие слова в словаре
        // Отправляем AJAX запрос на сервер для проверки слова в словаре
        // Это будет синхронный запрос, чтобы сразу получить результат
        let isValid = false;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/check_word?word=${encodeURIComponent(word)}`, false); // синхронный запрос
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                isValid = response.valid;
            }
        };
        xhr.send();

        return isValid;
},

    renderWordCells: function() {
        // Если мы не в режиме уровней, не создаем ячейки
        if (!this.state.levelsMode || !this.state.currentLevelData) return;

        const cellsContainer = document.getElementById('word-cells');
        if (!cellsContainer) return;

        cellsContainer.innerHTML = '';

        // Группируем целевые слова по длине
        const wordsByLength = {};
        this.state.currentLevelData.wordsToFind.forEach(word => {
            const len = word.length;
            if (!wordsByLength[len]) {
                wordsByLength[len] = [];
            }
            wordsByLength[len].push(word);
    });

    // Создаем группы ячеек для каждой длины слова
    Object.keys(wordsByLength).sort((a, b) => a - b).forEach(length => {
        const words = wordsByLength[length];
        const groupTitle = document.createElement('div');
        groupTitle.className = 'cell-group-title';
        groupTitle.textContent = `Слова из ${length} букв:`;
        cellsContainer.appendChild(groupTitle);

        const cellGroup = document.createElement('div');
        cellGroup.className = 'cell-group';

        words.forEach((word, index) => {
            const cell = document.createElement('div');
            cell.className = 'word-cell';
            cell.dataset.word = word;
            cell.dataset.length = length;

            // Проверяем, найдено ли слово
            const isFound = this.state.userWords.includes(word);
            if (isFound) {
                cell.classList.add('found');
                cell.textContent = word;
            } else {
                // Создаем плейсхолдеры для букв
                for (let i = 0; i < parseInt(length); i++) {
                    const letterBox = document.createElement('span');
                    letterBox.className = 'letter-box';
                    cell.appendChild(letterBox);
                }
            }

            cellGroup.appendChild(cell);
        });

        cellsContainer.appendChild(cellGroup);
    });
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
                document.getElementById('game-room-id').textContent = data.roomId;
                document.getElementById('room-id-display').classList.remove('hidden');
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
        // Проверяем режим игры
        if (this.state.levelsMode) {
            this.processLevelWord(word);
        } else if (this.state.practiceMode) {
            this.processPracticeWord(word);
        } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'SUBMIT_WORD',
                word: word,
                roomId: this.state.roomId
            }));
        } else {
            this.showError('Нет соединения с сервером');
        }
    },

    // Модифицируем метод processPracticeWord для работы с уровнями
    processPracticeWord: function(word) {
        console.log('Обработка слова:', word);

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

            // Для режима уровней проверяем, является ли слово целевым
            if (this.state.levelsMode && this.state.currentLevelData) {
                if (this.state.currentLevelData.wordsToFind.includes(word)) {
                    this.showMessage(`Вы нашли одно из целевых слов: "${word}"!`, 5000);
                }
                // Обновляем отображение ячеек
                this.renderWordCells();
                // Проверяем звезды
                this.checkLevelStars();
            }

            this.renderGameState();
        } else {
            this.showMessage(`Слово "${word}" не может быть составлено из букв основного слова или отсутствует в словаре`);
        }
},

    // Обновление состояния игры
    updateGameState: function(newState) {
        // Объединяем новое состояние с текущим
        this.state = {
            ...this.state,
            ...newState
        };
        // После обновления состояния перерисовываем игру
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

        // Для режима уровней сохраняем прогресс
        if (this.state.levelsMode && this.state.currentLevelData) {
            const levelId = this.state.currentLevelData.id;
            const currentStars = this.state.earnedStars;

            // Получаем текущий прогресс по уровню
            const levelProgress = this.state.progress.levels[levelId] || { stars: 0 };

            // Обновляем только если получили больше звезд
            if (currentStars > levelProgress.stars) {
                levelProgress.stars = currentStars;
                this.state.progress.levels[levelId] = levelProgress;

                // Разблокируем следующий уровень, если это текущий уровень
                if (levelId === this.state.progress.currentLevel) {
                    this.state.progress.currentLevel = Math.min(levelId + 1, this.levels.length);
                }

                this.saveProgress();
            }
        }

        this.showResults(results);
        this.showScreen('results-container');

        // Сбрасываем режимы
        this.state.practiceMode = false;
        this.state.levelsMode = false;
    },

    processLevelWord: function(word) {
    const self = this; // Сохраняем ссылку на this

    // Проверяем слово
    const validation = this.validateLevelWord(word);

    if (!validation.valid) {
        this.updateGameState({
            lastWordResult: {
                valid: false,
                word: word,
                message: validation.message
            }
        });
        return;
    }

    // Добавляем слово в список найденных
    const userWords = [...this.state.userWords, word.toLowerCase()];
    const score = this.state.score + word.length;

    // Проверяем достижение целей уровня
    const starsEarned = this.calculateStarsEarned(userWords.length);
    const levelCompleted = starsEarned > 0;

    // Обновляем состояние
    this.updateGameState({
        userWords,
        score,
        earnedStars: starsEarned,
        lastWordResult: {
            valid: true,
            word: word,
            score: word.length
        }
    });

    // Если уровень завершен
    if (levelCompleted) {
        this.finishLevel(true);
    }
},

    validateLevelWord: function(word) {
        const levelData = this.state.currentLevelData;

        // Базовые проверки
        if (!word || word.length < 3) {
            return { valid: false, message: 'Слово должно быть не менее 3 букв' };
        }

        // Проверка, что слово можно составить из букв основного слова
        if (!this.canMakeWord(word, this.state.mainWord)) {
            return { valid: false, message: 'Нельзя составить из букв основного слова' };
        }

        // Проверка, что слово есть в списке wordsToFind
        if (!levelData.wordsToFind.includes(word.toLowerCase())) {
            return { valid: false, message: 'Это слово не требуется для уровня' };
        }

        // Проверка, что слово еще не использовалось
        if (this.state.userWords.includes(word.toLowerCase())) {
            return { valid: false, message: 'Вы уже использовали это слово' };
        }

        return { valid: true };
    },

    canMakeWord: function(word, mainWord) {
        const mainWordChars = [...mainWord.toLowerCase()];
        for (const char of word.toLowerCase()) {
            const index = mainWordChars.indexOf(char);
            if (index === -1) return false;
            mainWordChars.splice(index, 1);
        }
        return true;
    },

    calculateStarsEarned: function(foundWordsCount) {
        const targets = this.state.currentLevelData.targets;
        if (foundWordsCount >= targets[2]) return 3;
        if (foundWordsCount >= targets[1]) return 2;
        if (foundWordsCount >= targets[0]) return 1;
        return 0;
    },

    finishLevel: function(success) {
        this.stopTimer();

        this.setState({
            gameFinished: true,
            gameStarted: false,
            levelCompleted: success
        });

        // Показываем экран завершения уровня
        this.showLevelCompletionScreen(success);

        // Сохраняем прогресс
        this.saveLevelProgress(this.state.level, this.state.earnedStars);
    },

    showLevelCompletionScreen: function(success) {
        const completionScreen = document.getElementById('level-completion-screen');
        if (!completionScreen) return;

        // Заполняем информацию о результате
        document.getElementById('level-result-text').textContent =
            success ? 'Уровень пройден!' : 'Время вышло!';

        // Показываем заработанные звезды
        const stars = this.state.earnedStars;
        document.querySelectorAll('#level-stars .star').forEach((star, index) => {
            star.classList.toggle('active', index < stars);
        });

        // Показываем экран
        completionScreen.classList.remove('hidden');
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

        // Обновление информации о соперниках только если это не режим практики или уровней
        const opponentsList = document.getElementById('opponents');
        if (!this.state.practiceMode && !this.state.levelsMode) {
            document.querySelector('.opponents-container').classList.remove('hidden');
            opponentsList.innerHTML = '';
            this.state.opponents.forEach(opponent => {
                const opponentElement = document.createElement('div');
                opponentElement.className = 'opponent';
                opponentElement.textContent = `${opponent.username}: ${opponent.score} очков, ${opponent.wordsCount} слов`;
                opponentsList.appendChild(opponentElement);
            });
        }

        // Если это режим уровней, обновляем ячейки для слов
        if (this.state.levelsMode && this.state.currentLevelData) {
            this.renderWordCells();
        }
    },

    declOfNum: function(number, titles) {
        const cases = [2, 0, 1, 1, 1, 2];
        return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
    },

    // Отрисовка оставшегося времени
    renderTimeLeft: function() {
        document.getElementById('time-left').textContent = this.state.timeLeft;
    },

    // Отображение сообщения пользователю
    showMessage: function(message, duration = 3000) {
        console.log('Сообщение:', message);
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.style.opacity = 1;

        setTimeout(() => {
            messageElement.style.opacity = 0;
        }, duration);
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
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
        } else {
            console.error('Экран не найден:', screenId);
        }
    },
};

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация GameClient');
    GameClient.init();
});