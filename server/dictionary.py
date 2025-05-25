import os


class Dictionary:
    def __init__(self, dictionary_file=None):
        self.words = set()

        if dictionary_file:
            self.load_from_file(dictionary_file)
        else:
            # Сначала пробуем загрузить расширенный словарь
            extended_path = os.path.join(os.path.dirname(__file__), 'resources', 'extended_russian_words.txt')
            if os.path.exists(extended_path):
                print("Загружаем расширенный словарь...")
                self.load_from_file(extended_path)
            else:
                # Если расширенного нет, загружаем базовый
                default_path = os.path.join(os.path.dirname(__file__), 'resources', 'russian_words.txt')
                if os.path.exists(default_path):
                    self.load_from_file(default_path)

    def load_from_file(self, file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                for line in file:
                    word = line.strip().lower()
                    if len(word) >= 3:  # Отфильтровываем слишком короткие слова
                        self.words.add(word)
            return True
        except Exception as e:
            print(f"Ошибка загрузки словаря: {e}")
            return False

    def add_word(self, word):
        self.words.add(word.lower())

    def contains(self, word):
        return word.lower() in self.words

    # Python's magic method for 'in' operator
    def __contains__(self, word):
        return self.contains(word)

    def filter_words_by_length(self, min_length=3, max_length=None):
        if max_length is None:
            return [word for word in self.words if len(word) >= min_length]
        else:
            return [word for word in self.words if min_length <= len(word) <= max_length]

    def generate_word(self, min_length=3, max_length=None):
        """Алиас для get_random_word для обратной совместимости."""
        return self.get_random_word(min_length, max_length)

    def get_random_word(self, min_length=3, max_length=None):
        import random
        suitable_words = self.filter_words_by_length(min_length, max_length)

        if not suitable_words:
            return None

        return random.choice(suitable_words)

    def size(self):
        return len(self.words)

    def check_word(self, word: str, main_word: str = None) -> bool:
        """
        Проверяет валидность слова.
        Если main_word задано, проверяет также возможность составить слово из букв основного слова.

        Args:
            word (str): Слово для проверки
            main_word (str, optional): Основное слово, из букв которого должно составляться слово

        Returns:
            bool: True если слово валидно и может быть составлено из основного слова (если указано)
        """
        word = word.lower().strip()

        # Проверяем минимальную длину
        if len(word) < 3:
            return False

        # Проверяем наличие в словаре
        if word not in self.words:
            return False

        # Если указано основное слово, проверяем возможность составления
        if main_word:
            main_word = main_word.lower()
            main_word_chars = list(main_word)

            for char in word:
                if char in main_word_chars:
                    main_word_chars.remove(char)
                else:
                    return False

        return True

    def can_make_word(self, word: str, main_word: str) -> bool:
        """
        Проверяет, можно ли составить слово из букв основного слова.
        (Алиас для check_word с указанием main_word)
        """
        return self.check_word(word, main_word)


# Создание примера файла со словарем для тестирования
def create_sample_dictionary():
    os.makedirs(os.path.join(os.path.dirname(__file__), 'resources'), exist_ok=True)
    sample_words = [
        # Базовые слова
        "программист", "разработка", "алгоритм", "компьютер", "интернет",
        "код", "сервер", "клиент", "база", "данные", "массив", "функция",
        "метод", "класс", "объект", "система", "процесс", "интерфейс",
        "библиотека", "модуль", "игра", "слово", "язык", "программа",
        "память", "диск", "сеть", "протокол", "браузер", "файл", "ресурс",
        "адрес", "запрос", "ответ", "ошибка", "тест", "результат", "проект",
        "версия", "обновление", "патч", "буфер", "порт", "сокет", "логика",
        "синтаксис", "семантика", "цикл", "условие", "переменная", "константа",

        # Слова для уровня 1 (программа)
        "мама", "папа", "рама", "гора", "пора", "порог", "грамм", "рог", "маг", "граф",
        "март", "грам", "рота", "прог", "орган", "морг", "торг", "горн", "гарм",

        # Слова для уровня 2 (компьютер)
        "кот", "ток", "метр", "комп", "корт", "порт", "трюм", "трюмо", "темп", "терм",
        "купе", "куртка", "мерт", "перт", "турок", "трек", "компот", "муром",

        # Слова для уровня 3 (технология)
        "нота", "тело", "тень", "лето", "толь", "хотя", "нехотя", "гол", "техно",
        "тонг", "лого", "тонн", "логи", "гонг", "лего", "олег", "хлен"
    ]

    file_path = os.path.join(os.path.dirname(__file__), 'resources', 'russian_words.txt')
    with open(file_path, 'w', encoding='utf-8') as file:
        for word in sample_words:
            file.write(word + '\n')


if __name__ == "__main__":
    create_sample_dictionary()

    # Тестирование словаря
    dictionary = Dictionary()
    print(f"Загружено {dictionary.size()} слов")
    print(f"Слово 'программист' в словаре: {dictionary.contains('программист')}")
    print(f"Случайное слово: {dictionary.get_random_word()}")
    print(f"Случайное длинное слово: {dictionary.get_random_word(min_length=8)}")

    # Тестирование новой функциональности
    test_main_word = "программирование"
    test_words = [
        ("программа", True),
        ("грамм", True),
        ("мир", True),
        ("игра", False),  # нет буквы 'и' второй раз
        ("код", False),  # нет буквы 'к'
        ("мор", False)  # нет буквы 'м' второй раз
    ]

    print("\nТестирование проверки слов:")
    for word, expected in test_words:
        result = dictionary.check_word(word, test_main_word)
        print(f"Слово '{word}': ожидается {expected}, получено {result} - {'OK' if result == expected else 'ERROR'}")