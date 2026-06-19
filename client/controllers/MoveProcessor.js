// client/controllers/MoveProcessor.js

function MoveProcessor(scene, hexGrid, tankSprites) {
   this.scene = scene;
   this.hexGrid = hexGrid;
   this.tankSprites = tankSprites;
   
   this.processedMoves = new Set();
   this.moveProcessingLock = false;
}

MoveProcessor.prototype.processLastMoves = function(lastMoves, onMoveComplete) {
   if (!lastMoves) return;
   if (this.moveProcessingLock) return;
   
   this.moveProcessingLock = true;
   var self = this;
   
   try {
       var processedCount = 0;
       
       for (var unitId in lastMoves) {
           if (!lastMoves.hasOwnProperty(unitId)) continue;
           
           var move = lastMoves[unitId];
           if (!move) continue;
           
           var moveKey = unitId + '_' + move.fromQ + '_' + move.fromR + '_' + move.toQ + '_' + move.toR;
           if (this.processedMoves.has(moveKey)) continue;
           
           if (!this.tankSprites.has(unitId)) {
               console.warn('⚠️ Спрайт для танка', unitId, 'не найден');
               continue;
           }
           
           var sprite = this.tankSprites.get(unitId);
           if (sprite.isAnimating) continue;
           
           var currentQ = sprite.unit.q;
           var currentR = sprite.unit.r;
           
           if (currentQ === move.fromQ && currentR === move.fromR) {
               var direction = HexUtils.getDirection(move.fromQ, move.fromR, move.toQ, move.toR);
               
               sprite.unit.direction = direction;
               sprite.unit.q = move.toQ;
               sprite.unit.r = move.toR;
               sprite.currentDirection = direction;
               
               sprite.animateMove(
                   move.fromQ, move.fromR, move.toQ, move.toR, 2000,
                   function() {
                       self.processedMoves.add(moveKey);
                       if (onMoveComplete) {
                           onMoveComplete(unitId, move);
                       }
                       
                       setTimeout(function() {
                           if (self.scene.gameState && self.scene.gameState.lastMoves) {
                               self.processLastMoves(self.scene.gameState.lastMoves, onMoveComplete);
                           }
                       }, 100);
                   }
               );
               processedCount++;
           } else {
               var targetPos = this.hexGrid.hexToPixel(move.toQ, move.toR);
               sprite.container.setPosition(targetPos.x, targetPos.y);
               sprite.unit.q = move.toQ;
               sprite.unit.r = move.toR;
               var dir = HexUtils.getDirection(move.fromQ, move.fromR, move.toQ, move.toR);
               sprite.updatePosition(move.toQ, move.toR, dir || 'right');
               this.processedMoves.add(moveKey);
           }
       }
       
       if (processedCount > 0) {
           console.log('✅ Обработано движений:', processedCount);
       }
   } catch (error) {
       console.error('❌ Ошибка в processLastMoves:', error);
   } finally {
       this.moveProcessingLock = false;
   }
};

MoveProcessor.prototype.cleanup = function() {
   if (this.processedMoves.size > 100) {
       var now = Date.now();
       var toRemove = [];
       for (var key of this.processedMoves) {
           var parts = key.split('_');
           if (parts.length >= 5) {
               var timestamp = parseInt(parts[parts.length - 1]);
               if (now - timestamp > 5000) {
                   toRemove.push(key);
               }
           }
       }
       for (var i = 0; i < toRemove.length; i++) {
           this.processedMoves.delete(toRemove[i]);
       }
   }
};

if (typeof window !== 'undefined') {
   window.MoveProcessor = MoveProcessor;
}
