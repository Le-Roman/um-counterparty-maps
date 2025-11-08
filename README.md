# Maps Service

Сервис для управления картами контрагентов и конкурентов.

## Функциональность

- Создание и обновление данных контрагентов
- Управление информацией о конкурентах
- Визуализация на картах (Yandex Maps/OpenStreetMap)
- REST API для интеграции с 1С

## Установка

1. Клонировать репозиторий
2. Установить зависимости: `npm install`
3. Настроить базу данных MySQL
4. Создать файл `.env` на основе `.env.example`
5. Запустить: `npm run dev`

## API Endpoints

### POST /api/maps

Создание или обновление данных контрагента

### GET /api/maps/:guid

Получение данных контрагента

### GET /maps/:guid

Просмотр карты контрагента

## Структура БД

- `counterparties` - таблица контрагентов
- `competitors` - таблица конкурентов

## Разработка

```bash
npm run dev      # development mode
npm run build    # build project
npm start        # production mode
```
