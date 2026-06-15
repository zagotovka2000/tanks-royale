class SocketClient {
   constructor(onGameState, onShootResult, onMessage, onGameEnded) {
       this.socket = null;
       this.onGameState = onGameState;
       this.onShootResult = onShootResult;
       this.onMessage = onMessage;
       this.onGameEnded = onGameEnded;
       this.reconnectAttempts = 0;
       this.maxReconnectAttempts = 5;
       this.reconnectDelay = 1000;
   }
   
   connect(userId, userName) {
       this.socket = io({
           transports: ['websocket', 'polling'],
           reconnection: true,
           reconnectionAttempts: this.maxReconnectAttempts,
           reconnectionDelay: this.reconnectDelay
       });
       
       this.socket.on('connect', () => {
           console.log('Connected to server');
           this.reconnectAttempts = 0;
           this.socket.emit('joinGame', { userId, userName });
       });
       
       this.socket.on('connect_error', (error) => {
           console.error('Connection error:', error);
           if (this.onMessage) {
               this.onMessage('❌ Ошибка подключения к серверу');
           }
       });
       
       this.socket.on('disconnect', () => {
           console.log('Disconnected from server');
           if (this.onMessage) {
               this.onMessage('⚠️ Соединение потеряно. Переподключение...');
           }
       });
       
       this.socket.on('joined', (data) => {
           console.log('Joined game:', data);
       });
       
       this.socket.on('gameState', (state) => {
           if (this.onGameState) this.onGameState(state);
       });
       
       this.socket.on('shootResult', (result) => {
           if (this.onShootResult) this.onShootResult(result);
       });
       
       this.socket.on('actionAccepted', (data) => {
           if (this.onMessage) this.onMessage(`✅ ${data.type === 'move' ? 'Перемещение' : 'Выстрел'} выполнен`);
       });
       
       this.socket.on('gameEnded', (data) => {
           if (this.onGameEnded) this.onGameEnded(data);
       });
       
       this.socket.on('error', (data) => {
           if (this.onMessage) this.onMessage('❌ ' + data.message);
       });
       
       return this.socket;
   }
   
   sendMove(q, r) {
       if (this.socket && this.socket.connected) {
           this.socket.emit('move', { q, r });
       } else if (this.onMessage) {
           this.onMessage('❌ Нет соединения с сервером');
       }
   }
   
   sendShoot(q, r) {
       if (this.socket && this.socket.connected) {
           this.socket.emit('shoot', { q, r });
       } else if (this.onMessage) {
           this.onMessage('❌ Нет соединения с сервером');
       }
   }
   
   resetGame() {
       if (this.socket && this.socket.connected) {
           this.socket.emit('reset');
       }
   }
   
   disconnect() {
       if (this.socket) {
           this.socket.disconnect();
           this.socket = null;
       }
   }
}

window.SocketClient = SocketClient;
