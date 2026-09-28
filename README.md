# Мини-игры Masri (Telegram Mini App)

## Файлы для репозитория на GitHub
Загрузи ВСЕ эти файлы в корень репозитория `masri-games`:
- sprint.html, match.html, fall.html, build.html — игры
- games.css, games.js — общий код трёх новых игр (без них они не запустятся)
- words.json — слова (для Спринта, Найди пару, Падающих слов)
- dialogues.json — фразы из диалогов (для Собери фразу)

## Первый запуск
1. На GitHub создай публичный репозиторий `masri-games`.
2. Add file → Upload files → перетащи все файлы выше → Commit changes.
3. Settings → Pages → Branch: `main`, папка `/ (root)` → Save. Через 1–2 минуты сайт откроется.
4. В `.env` рядом с bot.py добавь строку:
   GAMES_URL=https://ТВОЙ_ЛОГИН.github.io/masri-games/
5. Перезапусти бота (start_bot.ps1).

## Когда меняешь словарь или диалоги
Бот сам пересоздаёт `webapp/words.json` и `webapp/dialogues.json` при каждом запуске
(или по команде /exportgame). Загрузи эти два файла в репозиторий поверх старых.
