Hooks.once('init', async function() {
  console.log('Fateful Tarot | Инициализация модуля');
  
  // Регистрируем настройки модуля
  game.settings.register('fateful-tarot', 'tarotDeckStyle', {
    name: 'Стиль колоды Таро',
    hint: 'Выберите визуальный стиль карт',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'classic': 'Классический',
      'fantasy': 'Фэнтези',
      'minimal': 'Минималистичный'
    },
    default: 'classic'
  });
  
  game.settings.register('fateful-tarot', 'autoApplyEffects', {
    name: 'Автоматически применять эффекты',
    hint: 'Автоматически добавлять активные эффекты при вытягивании карт',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register('fateful-tarot', 'animationSpeed', {
    name: 'Скорость анимации',
    hint: 'Скорость анимации вытягивания карт',
    scope: 'client',
    config: true,
    type: Number,
    range: {
      min: 0.5,
      max: 3,
      step: 0.1
    },
    default: 1.0
  });
  
  // Загружаем данные карт Таро
  await loadTarotData();
});

Hooks.once('ready', async function() {
  // Создаем таблицу Таро при первом запуске
  await ensureTarotTableExists();
  
  // Регистрируем API для других модулей
  game.modules.get('fateful-tarot').api = {
    drawRandomArcana: drawRandomArcana,
    getArcanaEffect: getArcanaEffect,
    castFatefulArcana: castFatefulArcana
  };
});

// Функция загрузки данных карт
async function loadTarotData() {
  game.tarotData = {
    arcana: {},
    coordinates: {}
  };
  
  // Загружаем из компендиума или создаем по умолчанию
  const pack = game.packs.get('fateful-tarot.fateful-tarot-effects');
  if (pack) {
    const effects = await pack.getDocuments();
    effects.forEach(effect => {
      const match = effect.name.match(/(\d+)\.\s*(.+)/);
      if (match) {
        const [, num, name] = match;
        game.tarotData.arcana[num] = {
          name: name,
          effects: effect.system.description.value
        };
      }
    });
  }
  
  // Генерируем координатную сетку (12x10)
  generateCoordinateGrid();
}

// Генерация сетки координат
function generateCoordinateGrid() {
  const arcanaNumbers = Array.from({length: 22}, (_, i) => i); // 0-21
  const coordinates = [];
  
  // Генерируем 22 уникальные координаты
  for (let i = 0; i < 22; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * 12) + 1;
      y = Math.floor(Math.random() * 10) + 1;
    } while (coordinates.some(coord => coord.x === x && coord.y === y));
    
    coordinates.push({ x, y, arcana: i });
    game.tarotData.coordinates[`${x}-${y}`] = i;
  }
  
  game.tarotData.coordinateList = coordinates;
  console.log('Fateful Tarot | Сгенерирована координатная сетка');
}

// Проверяем и создаем таблицу Таро
async function ensureTarotTableExists() {
  const tableName = "Major Arcana Deck";
  let table = game.tables.getName(tableName);
  
  if (!table) {
    console.log('Fateful Tarot | Создаем таблицу Таро');
    table = await RollTable.create({
      name: tableName,
      description: "Колода Старших Арканов Таро для заклинания Судьбоносный Аркан",
      formula: "1d22",
      replacement: false,
      displayRoll: false
    });
    
    // Добавляем 22 карты
    const arcanaNames = [
      "0. Шут", "1. Маг", "2. Верховная Жрица", "3. Императрица", 
      "4. Император", "5. Иерофант", "6. Влюблённые", "7. Колесница",
      "8. Правосудие", "9. Отшельник", "10. Колесо Фортуны", "11. Сила",
      "12. Повешенный", "13. Смерть", "14. Умеренность", "15. Дьявол",
      "16. Башня", "17. Звезда", "18. Луна", "19. Солнце", "20. Суд", "21. Мир"
    ];
    
    const results = arcanaNames.map((name, idx) => ({
      text: name,
      type: CONST.TABLE_RESULT_TYPES.TEXT,
      weight: 1,
      range: [idx + 1, idx + 1]
    }));
    
    await table.createEmbeddedDocuments("TableResult", results);
  }
  
  game.tarotTable = table;
}

// API: Вытянуть случайный Аркан
async function drawRandomArcana(actor, target) {
  if (!game.tarotTable) await ensureTarotTableExists();
  
  const draw = await game.tarotTable.draw({ displayChat: false });
  const arcanaText = draw.results[0].text;
  const arcanaMatch = arcanaText.match(/(\d+)\.\s*(.+)/);
  
  if (!arcanaMatch) return null;
  
  const [, arcanaNum, arcanaName] = arcanaMatch;
  const effectRoll = await new Roll("1d6").roll({async: true});
  
  // Генерируем случайные координаты
  const coordData = game.tarotData.coordinateList.find(c => c.arcana == arcanaNum);
  const x = coordData?.x || Math.floor(Math.random() * 12) + 1;
  const y = coordData?.y || Math.floor(Math.random() * 10) + 1;
  
  return {
    number: parseInt(arcanaNum),
    name: arcanaName,
    fullName: arcanaText,
    effect: effectRoll.total,
    coordinates: { x, y },
    actorId: actor?.id,
    targetId: target?.id
  };
}

// API: Получить эффект Аркана
function getArcanaEffect(arcanaNumber, effectNumber) {
  // Здесь должна быть логика получения конкретного эффекта
  // Для примера - возвращаем описание
  const effects = game.tarotData.arcana[arcanaNumber]?.effects || "";
  const effectLines = effects.split('\n').filter(l => l.trim());
  const effectIndex = Math.min(effectNumber - 1, effectLines.length - 1);
  
  return {
    description: effectLines[effectIndex] || "Эффект не определен",
    number: effectNumber
  };
}

// API: Каст заклинания
async function castFatefulArcana(actor, target, options = {}) {
  const { showAnimation = true, chatMessage = true } = options;
  
  // 1. Бросок атаки
  const spellData = actor.system.attributes.spellcasting;
  const attackBonus = spellData.mod + (actor.system.attributes.prof || 0);
  const attackRoll = await new Roll(`1d20 + ${attackBonus}`).roll({async: true});
  
  // 2. Проверка попадания (упрощенно)
  const targetAC = target?.system?.attributes?.ac?.value || 10;
  const isHit = attackRoll.total >= targetAC;
  
  if (!isHit && !options.ignoreHitCheck) {
    if (chatMessage) {
      ChatMessage.create({
        content: `<div class="tarot-miss"><b>Судьбоносный Аркан</b><br>Промах! (${attackRoll.total} vs AC ${targetAC})</div>`,
        speaker: ChatMessage.getSpeaker({actor})
      });
    }
    return { hit: false, attackRoll };
  }
  
  // 3. Урон
  const level = actor.system.details.level;
  const damageDice = level >= 17 ? "4d6" : 
                    level >= 11 ? "3d6" : 
                    level >= 5 ? "2d6" : "1d6";
  
  const damageRoll = await new Roll(`${damageDice}[force]`).roll({async: true});
  
  // 4. Вытягиваем карту
  const arcanaResult = await drawRandomArcana(actor, target);
  
  // 5. Получаем эффект
  const effect = getArcanaEffect(arcanaResult.number, arcanaResult.effect);
  
  // 6. Показываем анимацию
  if (showAnimation && canvas.ready) {
    await showTarotAnimation(actor, target, arcanaResult);
  }
  
  // 7. Создаем сообщение в чате
  if (chatMessage) {
    const templateData = {
      actor: actor,
      target: target,
      attackRoll: attackRoll,
      damageRoll: damageRoll,
      arcana: arcanaResult,
      effect: effect,
      isHit: isHit
    };
    
    const html = await renderTemplate("modules/fateful-tarot/templates/tarot-draw.html", templateData);
    
    ChatMessage.create({
      content: html,
      speaker: ChatMessage.getSpeaker({actor}),
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
  
  // 8. Применяем эффект если нужно
  if (game.settings.get('fateful-tarot', 'autoApplyEffects') && target) {
    await applyArcanaEffect(arcanaResult, effect, target);
  }
  
  return {
    hit: isHit,
    attackRoll,
    damageRoll,
    arcana: arcanaResult,
    effect,
    target
  };
}

// Показать анимацию
async function showTarotAnimation(actor, target, arcana) {
  if (!canvas.ready || !Sequencer) return;
  
  const animationSpeed = game.settings.get('fateful-tarot', 'animationSpeed');
  
  new Sequence()
    .effect()
      .file("modules/fateful-tarot/assets/tarot_glow.webm")
      .atLocation(actor)
      .scale(0.5)
      .duration(1000 * animationSpeed)
    .effect()
      .file("modules/fateful-tarot/assets/card_flip.webm")
      .atLocation(target || actor)
      .scale(0.7)
      .duration(1500 * animationSpeed)
    .play();
}

// Применить эффект Аркана
async function applyArcanaEffect(arcana, effect, target) {
  const effectName = `Таро: ${arcana.fullName} (Эффект ${effect.number})`;
  
  // Создаем активный эффект
  const activeEffectData = {
    label: effectName,
    icon: "icons/sundries/gaming/tarot-deck-purple.webp",
    duration: {
      rounds: 1,
      seconds: 6,
      startTime: game.time.worldTime
    },
    flags: {
      'fateful-tarot': {
        arcanaNumber: arcana.number,
        effectNumber: effect.number,
        coordinates: arcana.coordinates
      }
    },
    changes: [] // Здесь можно добавить конкретные модификаторы
  };
  
  // Добавляем эффект к цели
  if (target.actor) {
    await target.actor.createEmbeddedDocuments("ActiveEffect", [activeEffectData]);
  }
}

// Хук для обработки дамага от заклинания
Hooks.on("midi-qol.DamageRollComplete", (workflow) => {
  if (workflow.item?.name === "Судьбоносный Аркан") {
    // Обработка специфической логики дамага для нашего заклинания
    console.log("Fateful Tarot | Damage processed for", workflow);
  }
});

// Регистрируем обработчик для макросов
Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type === "Macro" && data.name === "Cast Fateful Arcana") {
    // Создаем макрос для быстрого доступа
    const macro = game.macros?.find(m => m.name === "Cast Fateful Arcana");
    if (!macro) {
      Macro.create({
        name: "Cast Fateful Arcana",
        type: "script",
        command: `
          const actor = game.user.character;
          const target = game.user.targets.first();
          if (!actor || !target) {
            ui.notifications.error("Выберите персонажа и цель!");
            return;
          }
          game.modules.get('fateful-tarot').api.castFatefulArcana(actor, target);
        `,
        author: game.user.id,
        scope: "global",
        img: "icons/sundries/gaming/tarot-deck-purple.webp"
      });
    }
  }
});

// Экспортируем API для глобального доступа
export const FatefulTarot = {
  drawRandomArcana,
  getArcanaEffect,
  castFatefulArcana,
  generateCoordinateGrid
};