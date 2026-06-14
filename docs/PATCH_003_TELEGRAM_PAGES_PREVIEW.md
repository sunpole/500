# Patch 003 — Telegram Patchnote and GitHub Pages Preview

Дата: 2026-06-14  
Версия игры: `1.0.2`  
Ветка: `codex/publish-telegram-pages-1-0-2`

## Цель

Упаковать текущую версию `1.0.2` для публикации через Telegram/uNews и подготовить отдельную статическую веб-сборку, которую можно открыть через GitHub Pages без Vite, npm и локального сервера.

## Что добавлено

- Добавлена preview-сборка:

```text
previews/500td/1.0.2/
```

- Внутри preview есть:
  - `index.html`;
  - `assets/`;
  - `data/enemies.json`;
  - `data/towers.json`;
  - `data/waves.json`.
- В `package.json` добавлен скрипт:

```bash
npm run build:pages:v1.0.2
```

- Добавлен patchnote для Telegram/uNews:

```text
news/2026-06-14-500td-v1-0-2-pages-preview.md
news/2026-06-14-500td-v1-0-2-pages-preview.png
```

## URL после публикации через GitHub Pages

После merge/publish ветки в источник GitHub Pages версия должна открываться по адресу:

```text
https://sunpole.github.io/500/previews/500td/1.0.2/
```

## Почему отдельная сборка

Обычная Vite-сборка проекта настроена под основной адрес:

```text
https://sunpole.github.io/500/
```

Для архивной версии внутри подпапки нужен относительный `base`, поэтому preview собирается командой:

```bash
vite build --base ./ --outDir previews/500td/1.0.2
```

Так `index.html`, JS, CSS и JSON-данные остаются связаны относительными путями и могут работать из подпапки GitHub Pages.

## Проверка

Выполнено:

- `npm run build` проходит.
- `npm run build:pages:v1.0.2` проходит.
- Preview проверен через простой локальный HTTP-сервер:

```text
http://127.0.0.1:4182/previews/500td/1.0.2/
```

- В браузере подтверждено:
  - отображается версия `v1.0.2`;
  - загружается canvas;
  - отображаются 12 карточек башен;
  - загружаются 45 волн из JSON;
  - hotkey `1` выбирает башню;
  - `Esc` снимает выбор;
  - старт волны работает;
  - в консоли нет `error`/`warn`.
- `.env` и секреты в изменения не добавлялись.

## Что не менялось

- Версия игры не повышалась выше `1.0.2`.
- Баланс не менялся.
- Код gameplay не переписывался.
- `index12.html` не удалялся.
