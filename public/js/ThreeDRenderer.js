class ThreeDRenderer {
   constructor(containerId) {
       this.container = document.getElementById(containerId);
       this.scene = null;
       this.camera = null;
       this.renderer = null;
       this.hexMeshes = new Map();
       this.tankMeshes = new Map();
       this.isInitialized = false;
       this.hexSize = 0.7;
       this.currentHighlight = null;
       this.lastRenderTime = 0;
       this.renderThrottle = 33;
       this.animationFrameId = null;
       this.boundHandlers = new Map();
       
       // Pre-allocate arrays for performance
       this.tempMatrix = new THREE.Matrix4();
       this.tempVector = new THREE.Vector3();
       
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
       
       const parent = this.container.parentElement;
       const width = parent ? parent.clientWidth : 800;
       const height = parent ? parent.clientHeight : 500;
       
       console.log('ThreeDRenderer initializing with size:', width, 'x', height);
       
       this.container.style.width = '100%';
       this.container.style.height = '100%';
       
       this.scene = new THREE.Scene();
       this.scene.background = new THREE.Color(0x1a2a3a);
       this.scene.fog = new THREE.FogExp2(0x1a2a3a, 0.008);
       
       this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
       this.camera.position.set(12, 14, 12);
       this.camera.lookAt(0, 0, 0);
       
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
       
       this.isInitialized = true;
       
       const resizeHandler = () => this.onWindowResize();
       window.addEventListener('resize', resizeHandler);
       this.boundHandlers.set('resize', resizeHandler);
       
       this.animate();
       
       console.log('ThreeDRenderer initialized successfully');
       return true;
   }
   
   setupLighting() {
       const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
       this.scene.add(ambientLight);
       
       const dirLight = new THREE.DirectionalLight(0xffffff, 1);
       dirLight.position.set(10, 20, 5);
       dirLight.castShadow = true;
       dirLight.receiveShadow = true;
       dirLight.shadow.mapSize.width = 1024;
       dirLight.shadow.mapSize.height = 1024;
       dirLight.shadow.camera.near = 0.5;
       dirLight.shadow.camera.far = 30;
       dirLight.shadow.camera.left = -10;
       dirLight.shadow.camera.right = 10;
       dirLight.shadow.camera.top = 10;
       dirLight.shadow.camera.bottom = -10;
       this.scene.add(dirLight);
       
       const fillLight = new THREE.PointLight(0x4466cc, 0.3);
       fillLight.position.set(0, 10, 0);
       this.scene.add(fillLight);
       
       const backLight = new THREE.PointLight(0xffaa66, 0.2);
       backLight.position.set(-5, 5, -8);
       this.scene.add(backLight);
   }
   
   setupGrid() {
       const gridHelper = new THREE.GridHelper(25, 20, 0x88aaff, 0x335588);
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
       return window.HexUtils.to3DPosition(q, r, this.hexSize);
   }
   
   createHexagon(q, r, color) {
       const center = this.hexTo3DPosition(q, r);
       const geometry = new THREE.CylinderGeometry(this.hexSize, this.hexSize, 0.25, 6);
       const material = new THREE.MeshStandardMaterial({
           color: color,
           roughness: 0.5,
           metalness: 0.1,
           flatShading: false
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
       
       console.log(`Drawing map with ${gameState.cells.length} cells`);
       
       // Remove old meshes
       this.hexMeshes.forEach(mesh => {
           if (mesh && this.scene) {
               this.scene.remove(mesh);
               this.disposeMesh(mesh);
           }
       });
       this.hexMeshes.clear();
       
       // Create new meshes
       let createdCount = 0;
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
           createdCount++;
       });
       
       console.log(`Drew ${createdCount} hexes`);
       return true;
   }
   
   createTankModel(color) {
       const group = new THREE.Group();
       
       const bodyGeo = new THREE.BoxGeometry(0.6, 0.2, 0.7);
       const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.3 });
       const body = new THREE.Mesh(bodyGeo, bodyMat);
       body.position.y = 0;
       body.castShadow = true;
       body.receiveShadow = true;
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
       
       // Collect all current units
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
       
       // Update existing or create new tanks
       const existingIds = new Set(this.tankMeshes.keys());
       
       currentUnits.forEach((value, id) => {
           existingIds.delete(id);
           
           if (this.tankMeshes.has(id)) {
               this.updateTankPosition(value.unit);
           } else {
               this.createTankMesh(value.unit, value.isPlayer);
           }
       });
       
       // Remove tanks that no longer exist
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
   
   addShotAnimation(fromQ, fromR, toQ, toR, onComplete) {
       const from = this.hexTo3DPosition(fromQ, fromR);
       const to = this.hexTo3DPosition(toQ, toR);
       
       const geometry = new THREE.SphereGeometry(0.12, 8, 8);
       const material = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff4400 });
       const projectile = new THREE.Mesh(geometry, material);
       projectile.position.set(from.x, 0.35, from.z);
       this.scene.add(projectile);
       
       const startTime = performance.now();
       const duration = 0.2;
       
       const animate = () => {
           const elapsed = (performance.now() - startTime) / 1000;
           const t = Math.min(1, elapsed / duration);
           
           const x = from.x + (to.x - from.x) * t;
           const z = from.z + (to.z - from.z) * t;
           const y = 0.35 + Math.sin(t * Math.PI) * 0.4;
           
           projectile.position.set(x, y, z);
           
           if (t < 1) {
               requestAnimationFrame(animate);
           } else {
               this.scene.remove(projectile);
               geometry.dispose();
               material.dispose();
               if (onComplete) onComplete();
           }
       };
       requestAnimationFrame(animate);
   }
   
   addExplosionEffect(q, r) {
       const center = this.hexTo3DPosition(q, r);
       
       const geometry = new THREE.SphereGeometry(0.45, 8, 8);
       const material = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400 });
       const flash = new THREE.Mesh(geometry, material);
       flash.position.set(center.x, 0.25, center.z);
       this.scene.add(flash);
       
       setTimeout(() => {
           this.scene.remove(flash);
           geometry.dispose();
           material.dispose();
       }, 150);
       
       for (let i = 0; i < 8; i++) {
           setTimeout(() => {
               const smokeGeo = new THREE.SphereGeometry(0.15, 4, 4);
               const smokeMat = new THREE.MeshStandardMaterial({ color: 0x666666, transparent: true, opacity: 0.6 });
               const smoke = new THREE.Mesh(smokeGeo, smokeMat);
               smoke.position.set(
                   center.x + (Math.random() - 0.5) * 0.5,
                   0.2 + Math.random() * 0.3,
                   center.z + (Math.random() - 0.5) * 0.5
               );
               this.scene.add(smoke);
               
               setTimeout(() => {
                   this.scene.remove(smoke);
                   smokeGeo.dispose();
                   smokeMat.dispose();
               }, 500);
           }, i * 30);
       }
   }
   
   addMissEffect(q, r) {
       const center = this.hexTo3DPosition(q, r);
       
       const geometry = new THREE.SphereGeometry(0.2, 6, 6);
       const material = new THREE.MeshStandardMaterial({ color: 0xaa8866, emissive: 0x664422 });
       const dust = new THREE.Mesh(geometry, material);
       dust.position.set(center.x, 0.15, center.z);
       this.scene.add(dust);
       
       setTimeout(() => {
           this.scene.remove(dust);
           geometry.dispose();
           material.dispose();
       }, 250);
   }
   
   zoomIn() {
       if (this.camera.position.y > 6) {
           this.camera.position.y -= 1;
           this.camera.position.z -= 1;
           this.camera.lookAt(0, 0, 0);
       }
   }
   
   zoomOut() {
       if (this.camera.position.y < 25) {
           this.camera.position.y += 1;
           this.camera.position.z += 1;
           this.camera.lookAt(0, 0, 0);
       }
   }
   
   resetZoom() {
       this.camera.position.set(12, 14, 12);
       this.camera.lookAt(0, 0, 0);
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
           window.removeEventListener(name, handler);
       });
       this.boundHandlers.clear();
       
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
