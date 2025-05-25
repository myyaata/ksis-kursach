
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

    showMessage: function(message, type = 'info', duration = 3000) {
            console.log(`[${type.toUpperCase()}] ${message}`);

            // Создаем элемент сообщения, если его нет
            let messageContainer = document.getElementById('message-container');
            if (!messageContainer) {
                messageContainer = document.createElement('div');
                messageContainer.id = 'message-container';
                messageContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                    max-width: 400px;
                `;
                document.body.appendChild(messageContainer);
            }

            // Создаем элемент сообщения
            const messageElement = document.createElement('div');
            messageElement.style.cssText = `
                padding: 12px 16px;
                margin-bottom: 8px;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                animation: slideIn 0.3s ease-out;
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
            `;

            // Устанавливаем цвет в зависимости от типа
            switch(type) {
                case 'success':
                    messageElement.style.backgroundColor = '#d4edda';
                    messageElement.style.color = '#155724';
                    messageElement.style.border = '1px solid #c3e6cb';
                    break;
                case 'error':
                    messageElement.style.backgroundColor = '#f8d7da';
                    messageElement.style.color = '#721c24';
                    messageElement.style.border = '1px solid #f5c6cb';
                    break;
                case 'warning':
                    messageElement.style.backgroundColor = '#fff3cd';
                    messageElement.style.color = '#856404';
                    messageElement.style.border = '1px solid #ffeaa7';
                    break;
                default: // info
                    messageElement.style.backgroundColor = '#d1ecf1';
                    messageElement.style.color = '#0c5460';
                    messageElement.style.border = '1px solid #bee5eb';
                    break;
            }

            messageElement.textContent = message;
            messageContainer.appendChild(messageElement);

            // Добавляем CSS анимацию, если её нет
            if (!document.getElementById('message-animations')) {
                const style = document.createElement('style');
                style.id = 'message-animations';
                style.textContent = `
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Автоматически удаляем сообщение
            setTimeout(() => {
                messageElement.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 300);
            }, duration);
    },

    // WebSocket соединение
    socket: null,
    timer: null,

    levels: [
    {
        id: 1,
        mainWord: "программа",
        wordsToFind: ["ром", "грамм", "пора", "рама", "амор", "марма", "гамматю"],
        targets: [3, 5, 7],
        timeLimit: 180,
        hint: "Ищите короткие слова из 3-4 букв, затем переходите к более длинным.",
        background: "/static/img/levels/level1.jpg"
    },
    {
        id: 2,
        mainWord: "компьютер",
        wordsToFind: ["кот", "метр", "порт", "трек", "комп", "ютро", "перо", "корт"],
        targets: [4, 6, 8],
        timeLimit: 240,
        hint: "Буква 'ю' встречается редко — используйте её в конце слов.",
        background: "/static/img/levels/level2.jpg"
    },
    {
        id: 3,
        mainWord: "технология",
        wordsToFind: ["тело", "лого", "гол", "хет", "неон", "хол", "гиена", "техно", "лето"],
        targets: [4, 6, 9],
        timeLimit: 300,
        hint: "Слова с 'х' и 'г' могут быть неочевидными.",
        background: "/static/img/levels/level3.jpg"
    },
    {
        id: 4,
        mainWord: "автомобиль",
        wordsToFind: ["мот", "лита", "бит", "авто", "моль", "том", "лимо", "бомба", "таль"],
        targets: [4, 6, 9],
        timeLimit: 240,
        hint: "Обратите внимание на 'ь' — его можно использовать в конце слов.",
        background: "/static/img/levels/level4.jpg"
    },
    {
        id: 5,
        mainWord: "республика",
        wordsToFind: ["пес", "куб", "липа", "суп", "белка", "пир", "репа", "булка", "спур"],
        targets: [4, 6, 9],
        timeLimit: 270,
        hint: "Попробуйте слова с 'у' и 'и'.",
        background: "/static/img/levels/level5.jpg"
    },
    {
        id: 6,
        mainWord: "эксперимент",
        wordsToFind: ["пир", "мен", "тип", "крем", "метр", "перт", "экран", "кит", "треп"],
        targets: [4, 6, 9],
        timeLimit: 300,
        hint: "Буква 'э' встречается редко — используйте её в начале слов.",
        background: "/static/img/levels/level6.jpg"
    },
    {
        id: 7,
        mainWord: "директор",
        wordsToFind: ["код", "рок", "тир", "кит", "ред", "док", "кино", "ток", "диктор"],
        targets: [4, 6, 9],
        timeLimit: 240,
        hint: "Попробуйте слова с 'д' и 'к'.",
        background: "/static/img/levels/level7.jpg"
    },
    {
        id: 8,
        mainWord: "калькулятор",
        wordsToFind: ["куль", "рак", "рот", "люк", "торт", "акр", "крот", "лак", "каюр"],
        targets: [4, 6, 9],
        timeLimit: 270,
        hint: "Буква 'ь' может быть сложной — используйте её в середине слов.",
        background: "/static/img/levels/level8.jpg"
    },
    {
        id: 9,
        mainWord: "телевизор",
        wordsToFind: ["лев", "зло", "тело", "вино", "литр", "резит", "вето", "зило", "тезис"],
        targets: [4, 6, 9],
        timeLimit: 300,
        hint: "Слова с 'з' и 'в' могут быть неочевидными.",
        background: "/static/img/levels/level9.jpg"
    },
    {
        id: 10,
        mainWord: "фотография",
        wordsToFind: ["торф", "граф", "рот", "фрау", "гора", "агора", "фора", "тиф", "арго"],
        targets: [4, 6, 9],
        timeLimit: 270,
        hint: "Буква 'ф' встречается редко — используйте её в начале или конце.",
        background: "/static/img/levels/level10.jpg"
    },
    {
        id: 11,
        mainWord: "лаборатория",
        wordsToFind: ["лоб", "робот", "борт", "лира", "табор", "оратор", "брат", "литр", "бал"],
        targets: [4, 6, 9],
        timeLimit: 300,
        hint: "Попробуйте длинные слова с 'р' и 'т'.",
        background: "/static/img/levels/level11.jpg"
    },
    {
        id: 12,
        mainWord: "космонавт",
        wordsToFind: ["сом", "нос", "ток", "ван", "кост", "сова", "мост", "наст", "команда"],
        targets: [4, 6, 9],
        timeLimit: 240,
        hint: "Буква 'в' может быть ключевой в некоторых словах.",
        background: "/static/img/levels/level12.jpg"
    },
    {
        id: 13,
        mainWord: "электричество",
        wordsToFind: ["кит", "лев", "тире", "река", "литр", "ветер", "китель", "телец", "кельт"],
        targets: [4, 6, 9],
        timeLimit: 330,
        hint: "Длинное слово — ищите комбинации из 3-5 букв.",
        background: "/static/img/levels/level13.jpg"
    },
    {
        id: 14,
        mainWord: "стадион",
        wordsToFind: ["сад", "нос", "тон", "доит", "аист", "дина", "стои", "данс", "оазис"],
        targets: [4, 6, 9],
        timeLimit: 240,
        hint: "Попробуйте слова с 'д' и 'н'.",
        background: "/static/img/levels/level14.jpg"
    },
    {
        id: 15,
        mainWord: "библиотека",
        wordsToFind: ["бит", "либ", "кот", "бал", "лита", "акт", "билет", "тека", "блок"],
        targets: [4, 6, 9],
        timeLimit: 300,
        hint: "Буква 'б' встречается дважды — используйте её в разных словах.",
        background: "/static/img/levels/level15.jpg"
    }
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

            document.getElementById('back-to-lobby-from-waiting').addEventListener('click', () => {
            console.log('Возврат в лобби из комнаты ожидания');
            this.leaveRoom();
            this.showScreen('lobby-screen');
            });

            document.getElementById('start-multiplayer-game').addEventListener('click', () => {
            console.log('Запуск мультиплеерной игры');
            this.startMultiplayerGame();
            });

            // Обработчик для копирования ID комнаты
            document.getElementById('copy-room-id').addEventListener('click', () => {
                const roomId = document.getElementById('game-room-id').textContent;
                this.copyToClipboard(roomId);
                this.showMessage('ID комнаты скопирован в буфер обмена');
            });

            document.getElementById('copy-waiting-room-id').addEventListener('click', () => {
            const roomId = document.getElementById('waiting-room-id').textContent;
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

    updateLevelUI: function(levelData) {
        // Отображаем информацию об уровне
        document.getElementById('level-info').classList.remove('hidden');
        document.getElementById('current-level').textContent = levelData.id;

        // ИСПРАВЛЕНО: показываем общее количество слов для поиска
        document.getElementById('target-words-count').textContent = levelData.wordsToFind.length;

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
                this.showMessage(`Вы заработали ${earnedStars} ${this.declOfNum(earnedStars, ['звезду', 'звезды', 'звезд'])}!`, 'success', 5000);
            }
        }

        // ИСПРАВЛЕНО: проверяем завершение уровня только если найдены ВСЕ целевые слова
        if (foundTargetWords >= wordsToFind.length) {
            setTimeout(() => {
                this.completeLevel(earnedStars);
            }, 2000);
        }
    },

    // Завершение уровня
    completeLevel: function(stars) {
        console.log('Завершение уровня со звездами:', stars);
        this.stopTimer();

        // Сохраняем прогресс
        const levelId = this.state.currentLevelData.id;
        const currentProgress = this.state.progress.levels[levelId] || { stars: 0 };

        if (stars > currentProgress.stars) {
            this.state.progress.levels[levelId] = { stars: stars };

            // Разблокируем следующий уровень
            if (levelId === this.state.progress.currentLevel && levelId < this.levels.length) {
                this.state.progress.currentLevel = levelId + 1;
            }

            this.saveProgress();
        }

        // ИСПРАВЛЕНО: показываем правильное сообщение и экран завершения
        this.showMessage(`Поздравляем! Уровень ${levelId} пройден с ${stars} звездами!`, 'success', 5000);

        // Показываем экран завершения уровня
        this.showLevelCompletionScreen(true, stars);
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

    // Универсальная функция проверки слов через API
    checkWordWithAPI: async function(word, mainWord) {
        console.log('Проверка слова через API:', word);

        // Базовая валидация
        if (!word || word.length < 2) {
            return { valid: false, message: 'Слово должно содержать минимум 2 буквы' };
        }

        // Очищаем слово
        word = word.trim().toLowerCase();
        mainWord = mainWord.toLowerCase();

        // Проверяем, что слово можно составить из букв основного слова
        if (!this.canMakeWord(word, mainWord)) {
            return { valid: false, message: 'Нельзя составить из букв основного слова' };
        }

        // Проверяем, не использовалось ли слово ранее
        if (this.state.userWords.some(w => w.toLowerCase() === word)) {
            return { valid: false, message: 'Вы уже использовали это слово' };
        }

        try {
            // Проверяем слово через API
            const response = await fetch(`/check_word?word=${encodeURIComponent(word)}`);

            if (!response.ok) {
                console.error('Ошибка HTTP:', response.status);
                return { valid: false, message: 'Ошибка при проверке слова' };
            }

            const data = await response.json();
            console.log('Ответ API:', data);

            // Обрабатываем все возможные ответы от сервера
            if (data.valid === true) {
                return { valid: true, score: word.length };
            } else if (data.valid === false) {
                // Используем сообщение от сервера, если оно есть
                return {
                    valid: false,
                    message: data.error || data.details || 'Слово не найдено в словаре'
                };
            } else {
                // Если сервер вернул что-то неожиданное
                console.error('Неожиданный ответ от сервера:', data);
                return { valid: false, message: 'Ошибка при проверке слова' };
            }

        } catch (error) {
            console.error('Ошибка при проверке слова:', error);
            return { valid: false, message: 'Ошибка соединения с сервером' };
        }
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
            "интернет", "технология", "виртуальный", "разработчик",
            "программист", "приложение", "операционная", "система"
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
        const opponentsContainer = document.querySelector('.opponents-container');
        if (opponentsContainer) {
            opponentsContainer.classList.add('hidden');
        }

        const levelInfo = document.getElementById('level-info');
        if (levelInfo) {
            levelInfo.classList.add('hidden');
        }

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

    // функция для обработки слов в режиме практики
    handleWordSubmit: function() {
        const wordInput = document.getElementById('word-input');
        if (!wordInput) return;

        const word = wordInput.value.trim();
        if (!word) return;

        console.log('Отправка слова через Enter:', word);

        if (this.state.practiceMode) {
            this.processWordInPractice(word);
        } else {
            // Обычная игра через WebSocket
            this.sendMessage({
                type: 'SUBMIT_WORD',
                word: word
            });
        }

        wordInput.value = '';
    },

    // функция для обработки слов в режиме практики
    processWordInPractice: async function(word) {
        console.log('Обработка слова:', word);

        // Базовая проверка длины
        if (word.length < 2) {
            this.showMessage("Слово должно содержать минимум 2 буквы", 'error');
            return;
        }

        const trimmedWord = word.trim().toLowerCase();

        // Проверяем, не использовалось ли слово ранее
        if (this.state.userWords.some(w => w.toLowerCase() === trimmedWord)) {
            this.showMessage("Вы уже использовали это слово", 'error');
            return;
        }

        // Показываем индикатор проверки
        this.showMessage("Проверяем слово...", 'info');

        try {
            // Проверяем слово
            const isValid = await this.practiceWordCheck(trimmedWord, this.state.mainWord);

            if (isValid) {
                // Только если слово валидно - добавляем его и начисляем очки
                this.state.userWords.push(trimmedWord);
                const score = trimmedWord.length;
                this.state.score += score;

                // Обновляем интерфейс
                this.renderGameState();

                this.showMessage(`+${score} очков за слово "${trimmedWord}"!`, 'success');
            } else {
                this.showMessage(`Слово "${trimmedWord}" не принято`, 'error');
            }
        } catch (error) {
            console.error('Ошибка при проверке слова:', error);
            this.showMessage("Ошибка при проверке слова", 'error');
        }
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
                const wordContainer = document.createElement('div');
                wordContainer.className = 'word-cell-container';
                wordContainer.style.display = 'flex';
                wordContainer.style.gap = '2px';
                wordContainer.style.marginBottom = '5px';

                // Проверяем, найдено ли слово
                const isFound = this.state.userWords.includes(word);

                // Создаем ячейки для каждой буквы
                for (let i = 0; i < word.length; i++) {
                    const letterCell = document.createElement('div');
                    letterCell.className = 'word-cell';
                    letterCell.style.width = '30px';
                    letterCell.style.height = '30px';
                    letterCell.style.minWidth = '30px';

                    if (isFound) {
                        letterCell.classList.add('found');
                        letterCell.textContent = word[i].toUpperCase();
                    } else {
                        letterCell.textContent = '';
                    }

                    wordContainer.appendChild(letterCell);
                }

                cellGroup.appendChild(wordContainer);
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
                this.showMessage(`Комната создана. ID: ${data.roomId}`, 'success');
                document.getElementById('game-room-id').textContent = data.roomId;
                document.getElementById('room-id-display').classList.remove('hidden');
                this.showWaitingRoom();
                break;

            case 'ROOM_JOINED':
                this.state.roomId = data.roomId;
                this.showMessage(`Вы в комнате ${data.roomId}`, 'success');
                this.showWaitingRoom();
                break;

            case 'WORD_FOUND':
                console.log(`WORD_FOUND: ${data.username} нашел "${data.word}" (+${data.score})`);

                // Показываем уведомление о слове соперника
                this.showMessage(`${data.username}: ${data.word} (+${data.score})`, 'info', 2000);
                break;

            case 'WORD_RESULT':
                // Обработка результата проверки нашего слова
                if (data.valid) {
                    this.state.userWords.push(data.word);
                    this.state.score += data.score;
                    this.showMessage(`Слово "${data.word}" принято! +${data.score} очков`, 'success');
                } else {
                    this.showMessage(data.message || `Слово "${data.word}" не принято`, 'error');
                }
                break;

            case 'GAME_STATE':
                // ИСПРАВЛЕНИЕ: правильно обрабатываем состояние игры
                console.log('Получено состояние игры:', data.state);

                // Обновляем основную информацию
                this.state.mainWord = data.state.mainWord;
                this.state.availableCells = data.state.availableCells;
                this.state.timeLeft = data.state.timeLeft;
                this.state.score = data.state.score;
                this.state.userWords = data.state.userWords || [];
                this.state.roomId = data.state.roomId;

                // ИСПРАВЛЕНИЕ: правильно обновляем информацию о сопериках
                if (data.state.opponents) {
                    this.state.opponents = data.state.opponents.map(opp => ({
                        ...opp,
                        foundWords: opp.foundWords || []
                    }));
                }

                this.renderGameState();
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

            default:
                console.log('Неизвестный тип сообщения:', data.type);
        }
    },

    showWaitingRoom: function() {
        this.showScreen('waiting-room-screen');
        document.getElementById('waiting-room-id').textContent = this.state.roomId;
        this.updatePlayersList();
},

    updatePlayersList: function() {
        const playersList = document.getElementById('waiting-players-list');
        if (playersList) {
            // Здесь должен быть список игроков из состояния сервера
            // Пока показываем базовую информацию
            playersList.innerHTML = `<div>Ожидание игроков... (${this.state.opponents.length + 1}/2)</div>`;
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

    processPracticeWordWithAPI: async function(word) {
        console.log('Обработка слова в режиме практики:', word);

        // Показываем индикатор проверки
        this.showMessage("Проверяем слово...", 'info', 1000);

        try {
            const result = await this.checkWordWithAPI(word, this.state.mainWord);

            if (result.valid) {
                // Добавляем слово в список
                this.state.userWords.push(word);
                this.state.score += result.score;

                // Обновляем интерфейс
                this.renderGameState();

                this.showMessage(`Слово "${word}" принято! +${result.score} очков`, 'success');
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Ошибка при обработке слова:', error);
            this.showMessage("Произошла ошибка при проверке слова", 'error');
        }
    },

    processMultiplayerWord: async function(word) {
        console.log('Обработка слова в мультиплеерном режиме:', word);

        // Показываем индикатор проверки
        this.showMessage("Проверяем слово...", 'info', 1000);

        try {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'SUBMIT_WORD',
                    word: word
                }));
            } else {
                this.showError('Нет соединения с сервером');
            }
        } catch (error) {
            console.error('Ошибка при отправке слова:', error);
            this.showMessage("Произошла ошибка при отправке слова", 'error');
        }
},

    submitWord: function(word) {
        const trimmedWord = word.trim().toLowerCase();

        if (!trimmedWord) {
            this.showMessage("Введите слово", 'error');
            return;
        }

        console.log('Отправка слова:', trimmedWord, 'Режим игры:', {
            practice: this.state.practiceMode,
            levels: this.state.levelsMode,
            multiplayer: !this.state.practiceMode && !this.state.levelsMode
        });

        // Все режимы теперь используют одинаковую проверку через API
        if (this.state.levelsMode) {
            this.processLevelWord(trimmedWord);
        } else if (this.state.practiceMode) {
            this.processPracticeWordWithAPI(trimmedWord);
        } else {
            // Мультиплеерный режим теперь тоже использует API
            this.processMultiplayerWord(trimmedWord);
        }
    },

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


    updateGameState: function(newState) {
        console.log('Обновление состояния игры:', newState);
        this.state = { ...this.state, ...newState };
        this.renderGameState();
    },

    processWordResult: function(word, valid, score, message) {
        console.log('Обработка результата проверки слова:', word, valid, score, message);
        if (valid) {
            // Слово не добавляем, так как оно придет в обновлении состояния
            this.showMessage(`+${score} очков за слово "${word}"!`);
        } else {
            this.showMessage(message || `Слово "${word}" не принято.`);
        }
    },

    leaveRoom: function() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'LEAVE_ROOM',
                roomId: this.state.roomId
            }));
        }
        this.state.roomId = "";
        this.state.opponents = [];
        document.getElementById('room-id-display').classList.add('hidden');
    },

    startMultiplayerGame: function() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'START_GAME',
                roomId: this.state.roomId
            }));
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

    processLevelWord: async function(word) {
        console.log('Обработка слова в режиме уровней:', word);

        // Показываем индикатор проверки
        this.showMessage("Проверяем слово...", 'info', 1000);

        try {
            const result = await this.checkWordWithAPI(word, this.state.mainWord);

            if (result.valid) {
                // Добавляем слово в список
                this.state.userWords.push(word);
                this.state.score += result.score;

                // Проверяем, является ли это целевым словом
                if (this.state.currentLevelData.wordsToFind.includes(word)) {
                    this.showMessage(`Отлично! Найдено целевое слово "${word}"! +${result.score} очков`, 'success');
                } else {
                    this.showMessage(`Слово "${word}" принято! +${result.score} очков`, 'success');
                }

                // Обновляем интерфейс
                this.renderGameState();
                this.renderWordCells();
                this.checkLevelStars();
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Ошибка при обработке слова:', error);
            this.showMessage("Произошла ошибка при проверке слова", 'error');
        }
    },

    canMakeWord: function(word, mainWord) {
    if (!word || !mainWord) {
        return false;
    }

    // Приводим к нижнему регистру
    word = word.toLowerCase().trim();
    mainWord = mainWord.toLowerCase().trim();

    // Создаем копию массива букв основного слова
    const mainWordChars = [...mainWord];

    // Проверяем каждую букву слова
    for (const char of word) {
        const index = mainWordChars.indexOf(char);
        if (index === -1) {
            return false; // Буква не найдена или уже использована
        }
        mainWordChars.splice(index, 1); // Удаляем использованную букву
    }

    return true;
},

    showLevelCompletionScreen: function(success, stars) {
        console.log('Показ экрана завершения уровня');

        // ИСПРАВЛЕНО: создаем и показываем простое модальное окно
        const existingModal = document.getElementById('level-completion-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'level-completion-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;

        const starsHtml = Array.from({length: 3}, (_, i) =>
            `<span style="font-size: 30px; color: ${i < stars ? '#ffd700' : '#ccc'};">⭐</span>`
        ).join('');

        content.innerHTML = `
            <h2 style="color: #28a745; margin-bottom: 20px;">Уровень пройден!</h2>
            <div style="margin: 20px 0;">${starsHtml}</div>
            <p style="margin-bottom: 30px;">Вы заработали ${stars} ${this.declOfNum(stars, ['звезду', 'звезды', 'звезд'])}!</p>
            <button id="continue-btn" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-right: 10px;
            ">Продолжить</button>
            <button id="back-to-levels-btn" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">К выбору уровней</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Обработчики кнопок
        document.getElementById('continue-btn').addEventListener('click', () => {
            modal.remove();
            this.showLevelsScreen();
        });

        document.getElementById('back-to-levels-btn').addEventListener('click', () => {
            modal.remove();
            this.showLevelsScreen();
        });
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
        console.log('Рендеринг состояния. Соперники:', this.state.opponents);

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

        const opponentsList = document.getElementById('opponents');
        if (!this.state.practiceMode && !this.state.levelsMode && this.state.opponents) {
            document.querySelector('.opponents-container').classList.remove('hidden');
            opponentsList.innerHTML = '';

            this.state.opponents.forEach(opponent => {
                const opponentElement = document.createElement('div');
                opponentElement.className = 'opponent';
                // ИСПРАВЛЕНИЕ: показываем актуальный счет и количество слов
                const wordsCount = opponent.wordsCount || (opponent.foundWords ? opponent.foundWords.length : 0);
                opponentElement.innerHTML = `
                    <div class="opponent-name">${opponent.username}</div>
                    <div class="opponent-stats">
                        <span>${opponent.score} очков</span>
                        <span>${wordsCount} слов</span>
                    </div>
                `;
                console.log('Рендеринг соперника:', opponent.username, 'Счет:', opponent.score, 'Слов:', wordsCount);
                opponentsList.appendChild(opponentElement);
            });
        } else {
            // Скрываем блок соперников в одиночных режимах
            const opponentsContainer = document.querySelector('.opponents-container');
            if (opponentsContainer) {
                opponentsContainer.classList.add('hidden');
            }
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

    // Исправленная функция для привязки обработчиков событий
    bindEventListeners: function() {
        // Обработчик для поля ввода слова
        const wordInput = document.getElementById('word-input');
        if (wordInput) {
            // Удаляем старые обработчики, чтобы избежать дублирования
            wordInput.removeEventListener('keypress', this.handleWordInputKeypress);

            // Создаем новый обработчик с правильным контекстом
            this.handleWordInputKeypress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleWordSubmit();
                }
            };
            wordInput.addEventListener('keypress', this.handleWordInputKeypress);
        }

        // Обработчик для кнопки отправки слова
        const submitBtn = document.querySelector('.submit-word-btn');
        if (submitBtn) {
            submitBtn.removeEventListener('click', this.handleWordSubmitClick);

            this.handleWordSubmitClick = () => {
                this.handleWordSubmit();
            };

            submitBtn.addEventListener('click', this.handleWordSubmitClick);
        }
    },

    // Отображение сообщения пользователю
    showMessage: function(message, type = 'info', duration = 3000) {
        console.log(`[${type.toUpperCase()}] ${message}`);

        // Создаем элемент сообщения, если его нет
        let messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 400px;
            `;
            document.body.appendChild(messageContainer);
        }

        // Создаем элемент сообщения
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
        `;

        // Устанавливаем цвет в зависимости от типа
        switch(type) {
            case 'success':
                messageElement.style.backgroundColor = '#d4edda';
                messageElement.style.color = '#155724';
                messageElement.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                messageElement.style.backgroundColor = '#f8d7da';
                messageElement.style.color = '#721c24';
                messageElement.style.border = '1px solid #f5c6cb';
                break;
            case 'warning':
                messageElement.style.backgroundColor = '#fff3cd';
                messageElement.style.color = '#856404';
                messageElement.style.border = '1px solid #ffeaa7';
                break;
            default: // info
                messageElement.style.backgroundColor = '#d1ecf1';
                messageElement.style.color = '#0c5460';
                messageElement.style.border = '1px solid #bee5eb';
                break;
        }

        messageElement.textContent = message;
        messageContainer.appendChild(messageElement);

        // Добавляем CSS анимацию, если её нет
        if (!document.getElementById('message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Автоматически удаляем сообщение
        setTimeout(() => {
            messageElement.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 300);
        }, duration);
    },

    // Функция для отображения ошибок
    showError: function(message) {
        this.showMessage(message, 'error', 5000);
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