/* tanks-royale/
├── index.html                    # Точка входа
├── server/
│   └── server.js                 # Сервер (Socket.io)
├── client/
│   ├── game/
│   │   ├── TankGame.js          # Логика игры (серверная + клиентская)
│   │   ├── TankUnit.js          # Модель танка
│   │   └── EffectManager.js     # Эффекты (дым)
│   ├── scenes/
│   │   ├── BootScene.js         # Загрузка ресурсов
│   │   └── GameScene.js         # Основная сцена с картой
│   ├── objects/
│   │   ├── HexGrid.js           # Отрисовка гексов
│   │   └── TankSprite.js        # 2D-спрайт танка
│   ├── controllers/
│   │   ├── GameController.js    # Управление игрой
│   │   └── InputController.js   # Ввод (клики по гексам)
│   └── utils/
│       └── HexUtils.js          # Утилиты для гексов (общие)
├── public/
│   ├── css/
│   │   └── styles.css           # Стили
│   └── assets/
│       └── (звуки, спрайты)
└── package.json
 */
