# Fateful Tarot Module для Foundry VTT

Модуль добавляет уникальное заклинание "Судьбоносный Аркан" с механикой вытягивания карт Таро.

## Установка

1. Скопируйте ссылку манифеста: `https://raw.githubusercontent.com/ваш-репозиторий/fateful-tarot/main/module.json`
2. В Foundry VTT перейдите в Setup → Add-on Modules → Install Module
3. Вставьте ссылку и установите
4. Активируйте модуль в мире

## Использование

### Для игроков:
1. Импортируйте заклинание "Судьбоносный Аркан" из компендиума
2. Добавьте его персонажу
3. Используйте как обычное заклинание

### Для Мастера:
1. Настройте параметры модуля в Game Settings → Module Settings
2. Используйте макросы для ручного вытягивания карт
3. Эффекты автоматически добавляются к целям

## Особенности

- 22 уникальных эффекта Старших Арканов
- Координатная система 12×10 для визуального гадания
- Автоматическое применение эффектов
- Анимации вытягивания карт
- Полная интеграция с D&D 5e системой

## API для разработчиков

```javascript
// Вытянуть случайную карту
const card = await game.modules.get('fateful-tarot').api.drawRandomArcana(actor, target);

// Получить эффект карты
const effect = game.modules.get('fateful-tarot').api.getArcanaEffect(card.number, card.effect);

// Каст заклинания
const result = await game.modules.get('fateful-tarot').api.castFatefulArcana(actor, target, options);