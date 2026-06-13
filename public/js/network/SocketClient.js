// public/js/network/SocketClient.js
export class SocketClient {
   constructor(onGameState, onShootResult, onMessage, onGameEnded) {
       this.socket = null;
       this.onGameState = onGameState;
       this.onShootResult = onShootResult;
       this.onMessage = onMessage;
       this.onGameEnded = onGameEnded;
   }
   
   connect(userId, userName) {
       this.socket = io();
       
       this.socket.on('connect', () => {
           console.log('Connected to server');
           this.socket.emit('joinGame', { userId, userName });
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
   
   sendAction(action) {
       if (this.socket) {
           this.socket.emit('action', action);
       }
   }
   
   resetGame() {
       if (this.socket) {
           this.socket.emit('reset');
       }
   }
   
   disconnect() {
       if (this.socket) {
           this.socket.disconnect();
       }
   }
}
