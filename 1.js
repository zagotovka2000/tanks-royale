// В консоли браузера, создайте отладочные функции
window.debug = {
   checkTarget: () => {
       const gc = window.gameController;
       if (gc) {
           console.log('=== DEBUG INFO ===');
           console.log('selectedTarget:', gc.selectedTarget);
           console.log('gameState exists:', !!gc.gameState);
           console.log('myTank alive:', gc.gameState?.myTank?.hp > 0);
           console.log('moveMode:', gc.moveMode);
           console.log('socket connected:', gc.socket?.socket?.connected);
           return gc.selectedTarget;
       }
       return null;
   },
   
   setTarget: (q, r) => {
       const gc = window.gameController;
       if (gc) {
           console.log(`Manually setting target to (${q}, ${r})`);
           gc.selectedTarget = { q: parseInt(q), r: parseInt(r) };
           if (gc.renderer) {
               gc.renderer.highlightHex(parseInt(q), parseInt(r), 0xffeb3b);
           }
           const targetCoords = document.getElementById('targetCoords');
           if (targetCoords) targetCoords.textContent = `(${q}, ${r})`;
           console.log('Target set:', gc.selectedTarget);
       }
   },
   
   shoot: () => {
       const gc = window.gameController;
       if (gc) {
           console.log('Manual shoot called');
           gc.executeShoot();
       }
   }
};
