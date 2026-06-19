/* 📦 SERVER
│
├── ⚙️ config/
│   └── serverConfig.js         # Конфиг сервера
│
├── 🧠 controllers/             # Бизнес-логика
│   ├── GameController.js       # Управление играми
│   └── BotController.js        # Управление ботами
│
├── 🔧 services/                # Сервисный слой
│   ├── GameService.js          # Логика игры (ходы, состояния)
│   └── MoveValidator.js        # Валидация ходов
│
├── 👥 managers/
│   └── ConnectionManager.js    # Управление подключениями
│
└── 🌐 server.js                # Точка входа сервера
📦 CLIENT
│
├── 🧩 common/                  # Общие переиспользуемые элементы
│   ├── constants/
│   │   └── UnitTypes.js        # Типы юнитов
│   └── types/
│       └── Direction.js        # Направления (enum)
│
├── ⚙️ config/
│   └── clientConfig.js         # Настройки клиента
│
├── 🔁 core/
│   └── GameLoop.js             # Главный игровой цикл
│
├── 🎮 controllers/             # Управляющие модули
│   ├── GameController.js       # Связь модели и представления
│   ├── CameraController.js     # Управление камерой
│   └── InputController.js      # Обработка ввода
│
├── 🧠 game/                    # Игровая логика и состояние
│   ├── EffectManager.js        # Эффекты (взрывы, дым)
│   ├── FogOfWar.js             # Туман войны
│   └── TankGame.js             # Ядро игры
│
├── 📦 models/                  # Модели данных (POJO)
│   ├── GameState.js
│   ├── HexCell.js
│   └── TankUnit.js
│
├── 🌐 network/
│   └── SocketClient.js         # WebSocket клиент
│
├── 🎨 objects/                 # Игровые объекты с рендерингом
│   ├── HexGrid.js
│   └── TankSprite.js
│
├── 🎬 scenes/                  # Сцены Phaser
│   ├── BootScene.js
│   └── GameScene.js
│
├── 🧮 utils/                   # Утилиты
│   ├── MathUtils.js
│   └── HexUtils.js
│
└── 🚀 main.js                  # Точка входа клиента */
