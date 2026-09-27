# Мини-игры Masri (Telegram Mini App)

## Первый запуск
1. На GitHub создай публичный репозиторий `masri-games`.
2. Загрузи в него `sprint.html` и `words.json` (Add file → Upload files).
3. Settings → Pages → Branch: `main`, папка `/ (root)` → Save. Через 1–2 минуты сайт откроется.
4. В `.env` рядом с bot.py добавь строку:
   GAMES_URL=https://ТВОЙ_ЛОГИН.github.io/masri-games/
5. Перезапусти бота (start_bot.ps1).

## Когда меняешь словарь
Бот сам пишет свежий `webapp/words.json` при каждом запуске (или по команде /exportgame).
Загрузи этот файл в репозиторий поверх старого — игра подхватит его сразу.
