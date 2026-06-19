// server/managers/ConnectionManager.js

class ConnectionManager {
   constructor(io, gameController) {
       this.io = io;
       this.gameController = gameController;
       this.connections = new Map();
   }
   
   // Обработка нового подключения
   handleConnection(socket) {
       console.log('🔌 Клиент подключен:', socket.id);
       this.connections.set(socket.id, {
           socket: socket,
           connectedAt: Date.now()
       });
       
       // Отправляем начальное состояние
       this.sendInitialState(socket);
       
       // Настраиваем обработчики
       this.setupHandlers(socket);
       
       // Обработка отключения
       socket.on('disconnect', () => {
           this.handleDisconnect(socket);
       });
   }
   
   // Отправить начальное состояние
   sendInitialState(socket) {
       const state = this.gameController.getStateForPlayer('player1');
       if (state) {
           socket.emit('gameState', state);
       }
   }
   
   // Настройка обработчиков
   setupHandlers(socket) {
       socket.on('moveRequest', (data) => {
           this.gameController.handleMoveRequest(socket, data);
       });
       
       socket.on('shootRequest', (data) => {
           this.gameController.handleShootRequest(socket, data);
       });
       
       socket.on('moveComplete', (data) => {
           this.gameController.handleMoveComplete(socket, data);
       });
       
       socket.on('reset', () => {
           this.gameController.handleReset();
       });
       
       // Для совместимости со старыми клиентами
       socket.on('move', (data) => {
           socket.emit('moveRequest', data);
       });
       
       socket.on('shoot', (data) => {
           socket.emit('shootRequest', data);
       });
   }
   
   // Обработка отключения
   handleDisconnect(socket) {
       console.log('🔌 Клиент отключен:', socket.id);
       this.connections.delete(socket.id);
   }
   
   // Получить количество подключений
   getConnectionCount() {
       return this.connections.size;
   }
}

module.exports = ConnectionManager;
