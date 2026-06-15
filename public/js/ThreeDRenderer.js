// public/js/ThreeDRenderer.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

class ThreeDRenderer {
   constructor(containerId) {
       this.container = document.getElementById(containerId);
       this.scene = null;
       this.camera = null;
       this.renderer = null;
       this.hexMeshes = new Map();
       this.tankMeshes = new Map();
       this.highlightMeshes = new Map();
       this.isInitialized = false;
       this.hexSize = 0.7;
       this.currentHighlight = null;
       this.lastRenderTime = 0;
       this.renderThrottle = 33;
       this.animationFrameId = null;
       this.boundHandlers = new Map();
       
       // Камера с панорамированием
       this.isDragging = false;
       this.lastMouseX = 0;
       this.lastMouseY = 0;
       this.cameraOffsetX = 0;
       this.cameraOffsetY = 0;
       this.cameraDistance = 14;
       this.cameraHeight = 12;
       
       this.terrainColors = {
           plains: 0x4a8c3f,
           forest: 0x2d5a27,
           mountain: 0x8a7a6a,
           swamp: 0x5a6e3a,
           base: 0xc9a03d,
           arena: 0x6b4c3b,
           edge: 0x3a5a3a
       };
   }
   
   init() {
       if (!this.container) {
           console.error('Container not found!');
           return false;
       }
       
       const waitForSize = () => {
           const rect = this.container.getBoundingClientRect();
           const width = rect.width;
           const height = rect.height;
           
           if (width === 0 || height === 0) {
               console.log('Waiting for container size...', width, height);
               setTimeout(waitForSize, 100);
               return;
           }
           
           this._doInit(width, height);
       };
       
       waitForSize();
       return true;
   }
   
   _doInit(width, height) {
       console.log('ThreeDRenderer initializing with size:', width, 'x', height);
       
       this.container.style.width = '100%';
       this.container.style.height = '100%';
       
       this.scene = new THREE.Scene();
       this.scene.background = new THREE.Color(0x1a2a3a);
       this.scene.fog = new THREE.FogExp2(0x1a2a3a, 0.008);
       
       this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
       this.updateCameraPosition();
       
       this.renderer = new THREE.WebGLRenderer({ 
           antialias: true, 
           powerPreference: "high-performance" 
       });
       this.renderer.setSize(width, height);
       this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
       this.renderer.shadowMap.enabled = true;
       this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
       this.container.appendChild(this.renderer.domElement);
       
       this.setupLighting();
       this.setupGrid();
       this.setupCameraControls();
       
       this.isInitialized = true;
       
       const resizeHandler = () => this.onWindowResize();
       window.addEventListener('resize', resizeHandler);
       this.boundHandlers.set('resize', resizeHandler);
       
       this.animate();
       
       console.log('ThreeDRenderer initialized successfully');
   }
   
   setupCameraControls() {
       const element = this.container;
       
       const wheelHandler = (e) => {
           e.preventDefault();
           const delta = e.deltaY > 0 ? 1 : -1;
           this.cameraDistance = Math.max(8, Math.min(22, this.cameraDistance + delta * 0.5));
           this.cameraHeight = Math.max(6, Math.min(18, this.cameraHeight + delta * 0.3));
           this.updateCameraPosition();
       };
       element.addEventListener('wheel', wheelHandler, { passive: false });
       this.boundHandlers.set('wheel', wheelHandler);
       
       let initialTouchDistance = 0;
       let initialDistance = 0;
       let initialHeight = 0;
       
       const touchStartHandler = (e) => {
           if (e.touches.length === 2) {
               e.preventDefault();
               const dx = e.touches[0].clientX - e.touches[1].clientX;
               const dy = e.touches[0].clientY - e.touches[1].clientY;
               initialTouchDistance = Math.sqrt(dx * dx + dy * dy);
               initialDistance = this.cameraDistance;
               initialHeight = this.cameraHeight;
           }
       };
       
       const touchMoveHandler = (e) => {
           if (e.touches.length === 2) {
               e.preventDefault();
               const dx = e.touches[0].clientX - e.touches[1].clientX;
               const dy = e.touches[0].clientY - e.touches[1].clientY;
               const distance = Math.sqrt(dx * dx + dy * dy);
               const scale = distance / initialTouchDistance;
               
               this.cameraDistance = Math.max(8, Math.min(22, initialDistance * scale));
               this.cameraHeight = Math.max(6, Math.min(18, initialHeight * scale));
               this.updateCameraPosition();
           } else if (e.touches.length === 1 && this.isDragging) {
               e.preventDefault();
               const deltaX = e.touches[0].clientX - this.lastMouseX;
               const deltaY = e.touches[0].clientY - this.lastMouseY;
               
               this.cameraOffsetX -= deltaX * 0.02;
               this.cameraOffsetY += deltaY * 0.02;
               
               this.cameraOffsetX = Math.max(-8, Math.min(8, this.cameraOffsetX));
               this.cameraOffsetY = Math.max(-6, Math.min(6, this.cameraOffsetY));
               
               this.lastMouseX = e.touches[0].clientX;
               this.lastMouseY = e.touches[0].clientY;
               this.updateCameraPosition();
           }
       };
       
       const touchEndHandler = (e) => {
           this.isDragging = false;
       };
       
       element.addEventListener('touchstart', touchStartHandler, { passive: false });
       element.addEventListener('touchmove', touchMoveHandler, { passive: false });
       element.addEventListener('touchend', touchEndHandler);
       
       this.boundHandlers.set('touchstart', touchStartHandler);
       this.boundHandlers.set('touchmove', touchMoveHandler);
       this.boundHandlers.set('touchend', touchEndHandler);
       
       const mouseDownHandler = (e) => {
           if (e.button === 0) {
               this.isDragging = true;
               this.lastMouseX = e.clientX;
               this.lastMouseY = e.clientY;
               element.style.cursor = 'grabbing';
           }
       };
       
       const mouseMoveHandler = (e) => {
           if (this.isDragging) {
               const deltaX = e.clientX - this.lastMouseX;
               const deltaY = e.clientY - this.lastMouseY;
               
               this.cameraOffsetX -= deltaX * 0.02;
               this.cameraOffsetY += deltaY * 0.02;
               
               this.cameraOffsetX = Math.max(-8, Math.min(8, this.cameraOffsetX));
               this.cameraOffsetY = Math.max(-6, Math.min(6, this.cameraOffsetY));
               
               this.lastMouseX = e.clientX;
               this.lastMouseY = e.clientY;
               this.updateCameraPosition();
           }
       };
       
       const mouseUpHandler = () => {
           this.isDragging = false;
           element.style.cursor = 'grab';
       };
       
       element.addEventListener('mousedown', mouseDownHandler);
       window.addEventListener('mousemove', mouseMoveHandler);
       window.addEventListener('mouseup', mouseUpHandler);
       
       this.boundHandlers.set('mousedown', mouseDownHandler);
       this.boundHandlers.set('mousemove', mouseMoveHandler);
       this.boundHandlers.set('mouseup', mouseUpHandler);
       
       element.style.cursor = 'grab';
   }
   
   updateCameraPosition() {
       if (!this.camera) return;
       
       this.camera.position.set(
           this.cameraOffsetX,
           this.cameraHeight,
           this.cameraDistance + this.cameraOffsetY
       );
       this.camera.lookAt(this.cameraOffsetX, 0, this.cameraOffsetY);
   }
   
   setupLighting() {
       const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
       this.scene.add(ambientLight);
       
       const dirLight = new THREE.DirectionalLight(0xffffff, 1);
       dirLight.position.set(10, 20, 5);
       dirLight.castShadow = true;
       dirLight.receiveShadow = true;
       this.scene.add(dirLight);
       
       const fillLight = new THREE.PointLight(0x4466cc, 0.3);
       fillLight.position.set(0, 10, 0);
       this.scene.add(fillLight);
       
       const backLight = new THREE.PointLight(0xffaa66, 0.2);
       backLight.position.set(-5, 5, -8);
       this.scene.add(backLight);
   }
   
   setupGrid() {
       const gridHelper = new THREE.GridHelper(30, 20, 0x88aaff, 0x335588);
       gridHelper.position.y = -0.5;
       this.scene.add(gridHelper);
   }
   
   onWindowResize() {
       if (!this.container || !this.camera || !this.renderer) return;
       
       const width = this.container.clientWidth;
       const height = this.container.clientHeight;
       
       if (width > 0 && height > 0) {
           this.camera.aspect = width / height;
           this.camera.updateProjectionMatrix();
           this.renderer.setSize(width, height);
       }
   }
   
   hexTo3DPosition(q, r) {
       const hexSize = 0.7;
       const width = hexSize * 1.8;
       const height = hexSize * 1.6;
       
       const x = (q + r/2) * width;
       const z = r * height;
       
       return { x: x, y: 0, z: z };
   }
   
   createHexagon(q, r, color) {
       const center = this.hexTo3DPosition(q, r);
       const geometry = new THREE.CylinderGeometry(this.hexSize, this.hexSize, 0.25, 6);
       const material = new THREE.MeshStandardMaterial({
           color: color,
           roughness: 0.5,
           metalness: 0.1
       });
       
       const mesh = new THREE.Mesh(geometry, material);
       mesh.position.set(center.x, -0.12, center.z);
       mesh.castShadow = true;
       mesh.receiveShadow = true;
       mesh.userData = { q, r };
       
       return mesh;
   }
   
   drawMap(gameState) {
       if (!this.isInitialized || !gameState || !gameState.cells) {
           return false;
       }
       
       this.hexMeshes.forEach(mesh => {
           if (mesh && this.scene) {
               this.scene.remove(mesh);
               this.disposeMesh(mesh);
           }
       });
       this.hexMeshes.clear();
       
       gameState.cells.forEach(cell => {
           if (!cell || typeof cell.q === 'undefined' || typeof cell.r === 'undefined') {
               return;
           }
           
           let color = this.terrainColors.plains;
           if (cell.terrain === 'forest') color = this.terrainColors.forest;
           else if (cell.terrain === 'mountain') color = this.terrainColors.mountain;
           else if (cell.terrain === 'swamp') color = this.terrainColors.swamp;
           else if (cell.terrain === 'base') color = this.terrainColors.base;
           else if (cell.terrain === 'arena') color = this.terrainColors.arena;
           else if (cell.terrain === 'edge') color = this.terrainColors.edge;
           
           const hexMesh = this.createHexagon(cell.q, cell.r, color);
           this.scene.add(hexMesh);
           this.hexMeshes.set(`${cell.q},${cell.r}`, hexMesh);
       });
       
       return true;
   }
   
   highlightMoveArea(centerQ, centerR, validNeighbors) {
       this.highlightMeshes.forEach(mesh => {
           if (mesh && this.scene) {
               this.scene.remove(mesh);
               this.disposeMesh(mesh);
           }
       });
       this.highlightMeshes.clear();
       
       const centerPos = this.hexTo3DPosition(centerQ, centerR);
       const centerGeo = new THREE.CylinderGeometry(this.hexSize + 0.05, this.hexSize + 0.05, 0.3, 6);
       const centerMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.4 });
       const centerHighlight = new THREE.Mesh(centerGeo, centerMat);
       centerHighlight.position.set(centerPos.x, -0.08, centerPos.z);
       this.scene.add(centerHighlight);
       this.highlightMeshes.set('center', centerHighlight);
       
       validNeighbors.forEach(neighbor => {
           const pos = this.hexTo3DPosition(neighbor.q, neighbor.r);
           const geometry = new THREE.CylinderGeometry(this.hexSize + 0.08, this.hexSize + 0.08, 0.28, 6);
           const material = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6 });
           const highlight = new THREE.Mesh(geometry, material);
           highlight.position.set(pos.x, -0.1, pos.z);
           this.scene.add(highlight);
           this.highlightMeshes.set(`${neighbor.q},${neighbor.r}`, highlight);
       });
   }
   
   clearMoveHighlight() {
       this.highlightMeshes.forEach(mesh => {
           if (mesh && this.scene) {
               this.scene.remove(mesh);
               this.disposeMesh(mesh);
           }
       });
       this.highlightMeshes.clear();
   }
   
   createTankModel(color) {
       const group = new THREE.Group();
       
       const bodyGeo = new THREE.BoxGeometry(0.6, 0.2, 0.7);
       const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.3 });
       const body = new THREE.Mesh(bodyGeo, bodyMat);
       body.position.y = 0;
       body.castShadow = true;
       group.add(body);
       
       const turretGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.18, 8);
       const turretMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.7, roughness: 0.2 });
       const turret = new THREE.Mesh(turretGeo, turretMat);
       turret.position.y = 0.18;
       turret.castShadow = true;
       group.add(turret);
       
       const barrelGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.55, 6);
       const barrelMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
       const barrel = new THREE.Mesh(barrelGeo, barrelMat);
       barrel.rotation.x = Math.PI / 2;
       barrel.position.set(0.4, 0.2, 0);
       barrel.castShadow = true;
       group.add(barrel);
       
       const trackGeo = new THREE.BoxGeometry(0.7, 0.1, 0.2);
       const trackMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.3 });
       const leftTrack = new THREE.Mesh(trackGeo, trackMat);
       leftTrack.position.set(-0.35, 0, 0.25);
       leftTrack.castShadow = true;
       group.add(leftTrack);
       
       const rightTrack = new THREE.Mesh(trackGeo, trackMat);
       rightTrack.position.set(0.35, 0, 0.25);
       rightTrack.castShadow = true;
       group.add(rightTrack);
       
       return group;
   }
   
   getTankRotation(direction) {
       const rotations = {
           'right': 0,
           'up-right': -Math.PI / 6,
           'up': -Math.PI / 2,
           'up-left': -Math.PI * 2/3,
           'left': Math.PI,
           'down-left': Math.PI * 2/3,
           'down': Math.PI / 2,
           'down-right': Math.PI / 6
       };
       return rotations[direction] || 0;
   }
   
   updateTankPosition(unit) {
       const mesh = this.tankMeshes.get(unit.id);
       if (!mesh) return;
       
       const pos = this.hexTo3DPosition(unit.q, unit.r);
       mesh.position.set(pos.x, 0.08, pos.z);
       mesh.rotation.y = this.getTankRotation(unit.direction);
   }
   
   createTankMesh(unit, isPlayer) {
       let color = 0xe94560;
       if (isPlayer) color = 0x4caf50;
       else if (unit.team === 'ally') color = 0x2196f3;
       
       const tank = this.createTankModel(color);
       const pos = this.hexTo3DPosition(unit.q, unit.r);
       tank.position.set(pos.x, 0.08, pos.z);
       tank.rotation.y = this.getTankRotation(unit.direction);
       
       this.scene.add(tank);
       this.tankMeshes.set(unit.id, tank);
   }
   
   updateTanks(gameState) {
       if (!this.isInitialized || !gameState) return false;
       
       const now = Date.now();
       if (now - this.lastRenderTime < this.renderThrottle) {
           return false;
       }
       this.lastRenderTime = now;
       
       const currentUnits = new Map();
       
       if (gameState.myTank) {
           currentUnits.set(gameState.myTank.id, { unit: gameState.myTank, isPlayer: true });
       }
       
       if (gameState.allies) {
           gameState.allies.forEach(ally => {
               currentUnits.set(ally.id, { unit: ally, isPlayer: false });
           });
       }
       
       if (gameState.enemies) {
           gameState.enemies.forEach(enemy => {
               currentUnits.set(enemy.id, { unit: enemy, isPlayer: false });
           });
       }
       
       const existingIds = new Set(this.tankMeshes.keys());
       
       currentUnits.forEach((value, id) => {
           existingIds.delete(id);
           
           if (this.tankMeshes.has(id)) {
               this.updateTankPosition(value.unit);
           } else {
               this.createTankMesh(value.unit, value.isPlayer);
           }
       });
       
       existingIds.forEach(id => {
           const mesh = this.tankMeshes.get(id);
           if (mesh) {
               this.scene.remove(mesh);
               this.disposeMesh(mesh);
               this.tankMeshes.delete(id);
           }
       });
       
       return true;
   }
   
   disposeMesh(mesh) {
       if (mesh.isGroup) {
           mesh.children.forEach(child => {
               if (child.geometry) child.geometry.dispose();
               if (child.material) child.material.dispose();
           });
       } else {
           if (mesh.geometry) mesh.geometry.dispose();
           if (mesh.material) mesh.material.dispose();
       }
   }
   
   highlightHex(q, r, color) {
       if (this.currentHighlight) {
           this.scene.remove(this.currentHighlight);
           this.disposeMesh(this.currentHighlight);
           this.currentHighlight = null;
       }
       
       const center = this.hexTo3DPosition(q, r);
       const geometry = new THREE.CylinderGeometry(this.hexSize + 0.08, this.hexSize + 0.08, 0.3, 6);
       const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
       const highlight = new THREE.Mesh(geometry, material);
       highlight.position.set(center.x, -0.1, center.z);
       this.scene.add(highlight);
       this.currentHighlight = highlight;
       
       setTimeout(() => {
           if (this.currentHighlight === highlight) {
               this.scene.remove(highlight);
               this.disposeMesh(highlight);
               this.currentHighlight = null;
           }
       }, 2000);
   }
   
   addMuzzleFlash(q, r, direction) {
       const pos = this.hexTo3DPosition(q, r);
       
       const flashGeo = new THREE.SphereGeometry(0.25, 8, 8);
       const flashMat = new THREE.MeshStandardMaterial({ 
           color: 0xffaa44, 
           emissive: 0xff6600,
           emissiveIntensity: 1.0
       });
       const flash = new THREE.Mesh(flashGeo, flashMat);
       
       const offset = { x: 0, z: 0 };
       switch(direction) {
           case 'right': offset.x = 0.5; break;
           case 'left': offset.x = -0.5; break;
           case 'up': offset.z = -0.5; break;
           case 'down': offset.z = 0.5; break;
           case 'up-right': offset.x = 0.35; offset.z = -0.35; break;
           case 'down-left': offset.x = -0.35; offset.z = 0.35; break;
           case 'up-left': offset.x = -0.35; offset.z = -0.35; break;
           case 'down-right': offset.x = 0.35; offset.z = 0.35; break;
           default: offset.x = 0.4;
       }
       
       flash.position.set(pos.x + offset.x, 0.3, pos.z + offset.z);
       this.scene.add(flash);
       
       setTimeout(() => {
           if (flash.parent) this.scene.remove(flash);
           flash.geometry.dispose();
           flash.material.dispose();
       }, 100);
   }
   
   addShotAnimation(fromQ, fromR, toQ, toR, onComplete) {
       console.log('🎬 addShotAnimation START', { fromQ, fromR, toQ, toR });
       console.log('🎬🎬🎬 addShotAnimation CALLED! 🎬🎬🎬');

       if (!this.scene) {
           console.error('No scene for animation');
           if (onComplete) onComplete();
           return;
       }
       
       const from = this.hexTo3DPosition(fromQ, fromR);
       const to = this.hexTo3DPosition(toQ, toR);
       
       console.log('Animation from:', from, 'to:', to);
       
       // Создаем яркий снаряд
       const geometry = new THREE.SphereGeometry(0.2, 16, 16);
       const material = new THREE.MeshStandardMaterial({ 
           color: 0xff6600, 
           emissive: 0xff4400,
           emissiveIntensity: 1.0
       });
       const projectile = new THREE.Mesh(geometry, material);
       projectile.position.set(from.x, 0.35, from.z);
       projectile.castShadow = true;
       this.scene.add(projectile);
       
       // Свечение вокруг снаряда
       const glowGeo = new THREE.SphereGeometry(0.35, 8, 8);
       const glowMat = new THREE.MeshBasicMaterial({ 
           color: 0xff8844, 
           transparent: true, 
           opacity: 0.5
       });
       const glow = new THREE.Mesh(glowGeo, glowMat);
       projectile.add(glow);
       
       const startTime = performance.now();
       const duration = 0.35;
       
       const animate = (now) => {
           const elapsed = (now - startTime) / 1000;
           let t = Math.min(1, elapsed / duration);
           
           const easeT = 1 - Math.pow(1 - t, 1.5);
           
           const x = from.x + (to.x - from.x) * easeT;
           const z = from.z + (to.z - from.z) * easeT;
           const y = 0.35 + Math.sin(easeT * Math.PI) * 0.25;
           
           projectile.position.set(x, y, z);
           
           if (t < 1) {
               requestAnimationFrame(animate);
           } else {
               // Взрыв при попадании
               this.addHitEffect(toQ, toR);
               
               if (projectile.parent) this.scene.remove(projectile);
               geometry.dispose();
               material.dispose();
               glowGeo.dispose();
               glowMat.dispose();
               
               if (onComplete) onComplete();
           }
       };
       
       requestAnimationFrame(animate);
   }
   
   addHitEffect(q, r) {
       const pos = this.hexTo3DPosition(q, r);
       console.log('💥 Hit effect at:', pos);
       
       // Вспышка
       const flashGeo = new THREE.SphereGeometry(0.35, 8, 8);
       const flashMat = new THREE.MeshStandardMaterial({ 
           color: 0xff4400, 
           emissive: 0xff2200,
           emissiveIntensity: 0.9
       });
       const flash = new THREE.Mesh(flashGeo, flashMat);
       flash.position.set(pos.x, 0.3, pos.z);
       this.scene.add(flash);
       
       // Искры
       for (let i = 0; i < 8; i++) {
           setTimeout(() => {
               const sparkGeo = new THREE.SphereGeometry(0.06, 4, 4);
               const sparkMat = new THREE.MeshStandardMaterial({ color: 0xffaa66 });
               const spark = new THREE.Mesh(sparkGeo, sparkMat);
               spark.position.set(
                   pos.x + (Math.random() - 0.5) * 0.5,
                   0.2 + Math.random() * 0.4,
                   pos.z + (Math.random() - 0.5) * 0.5
               );
               this.scene.add(spark);
               
               setTimeout(() => {
                   if (spark.parent) this.scene.remove(spark);
                   spark.geometry.dispose();
                   spark.material.dispose();
               }, 200);
           }, i * 30);
       }
       
       setTimeout(() => {
           if (flash.parent) this.scene.remove(flash);
           flash.geometry.dispose();
           flash.material.dispose();
       }, 150);
   }
   
   addExplosionEffect(q, r) {
       this.addHitEffect(q, r);
   }
   
   addMissEffect(q, r) {
       const pos = this.hexTo3DPosition(q, r);
       
       const dustGeo = new THREE.SphereGeometry(0.2, 6, 6);
       const dustMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, emissive: 0x664422 });
       const dust = new THREE.Mesh(dustGeo, dustMat);
       dust.position.set(pos.x, 0.15, pos.z);
       this.scene.add(dust);
       
       setTimeout(() => {
           if (dust.parent) this.scene.remove(dust);
           dust.geometry.dispose();
           dust.material.dispose();
       }, 250);
   }
   
   zoomIn() {
       this.cameraDistance = Math.max(8, this.cameraDistance - 1);
       this.cameraHeight = Math.max(6, this.cameraHeight - 0.5);
       this.updateCameraPosition();
   }
   
   zoomOut() {
       this.cameraDistance = Math.min(22, this.cameraDistance + 1);
       this.cameraHeight = Math.min(18, this.cameraHeight + 0.5);
       this.updateCameraPosition();
   }
   
   resetZoom() {
       this.cameraDistance = 14;
       this.cameraHeight = 12;
       this.cameraOffsetX = 0;
       this.cameraOffsetY = 0;
       this.updateCameraPosition();
   }
   
   animate() {
       if (!this.isInitialized) return;
       this.animationFrameId = requestAnimationFrame(() => this.animate());
       if (this.renderer && this.scene && this.camera) {
           this.renderer.render(this.scene, this.camera);
       }
   }
   
   dispose() {
       if (this.animationFrameId) {
           cancelAnimationFrame(this.animationFrameId);
       }
       
       this.boundHandlers.forEach((handler, name) => {
           if (name === 'resize') {
               window.removeEventListener('resize', handler);
           } else {
               this.container?.removeEventListener(name, handler);
               if (name === 'mousemove' || name === 'mouseup') {
                   window.removeEventListener(name, handler);
               }
           }
       });
       this.boundHandlers.clear();
       
       this.clearMoveHighlight();
       this.hexMeshes.forEach(mesh => this.disposeMesh(mesh));
       this.tankMeshes.forEach(mesh => this.disposeMesh(mesh));
       
       this.hexMeshes.clear();
       this.tankMeshes.clear();
       
       if (this.renderer) {
           this.renderer.dispose();
       }
   }
}

window.ThreeDRenderer = ThreeDRenderer;
console.log('ThreeDRenderer.js loaded');
