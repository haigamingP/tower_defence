import { TILE_SIZE, COLS, ROWS, ENEMY_TYPES, TOWER_TYPES, GOLD_PER_SEC_EARLY } from './constants.js';
import { PlacementTile, Enemy, Building, SoundManager, Meteor, Soldier, Hero } from './classes.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

window.deselectMonster = () => {
    Game.deselectMonster();
};

const Game = {
    width: COLS * TILE_SIZE,
    height: ROWS * TILE_SIZE,
    
    currentLevelId: 1,
    mapData: [],
    waypoints: [],
    waves: [],
    waveDelay: 0,
    levelName: "Loading...",

    gold: 0,
    lives: 0,
    activeTile: null,
    
    placementTiles: [], 
    enemies: [],        
    buildings: [],      
    particles: [],      
    meteors: [],
    reinforcements: [],
    hero: null,
    
    isHeroSelected: false,
    selectedEnemy: null,
    levelHeroData: null,
    mouse: { x: 0, y: 0 },
    
    waveIndex: 0,       
    
    // [UPDATED] Thay thế enemiesSpawned bằng Spawn Queue
    spawnQueue: [],     // Hàng đợi chứa danh sách quái sẽ ra
    lastSpawnTime: 0,
    isWaveWaiting: false, 
    waveTimer: 0, 

    isRallyMode: false,
    activeSkill: null,
    
    skillCooldowns: {
        meteor: { current: 0, max: 60 * 60 },     
        reinforce: { current: 0, max: 25 * 60 }   
    },

    isRunning: false,

    async init() {
        canvas.width = this.width;
        canvas.height = this.height;

        try {
            await this.loadLevelFromFile('assets/levels/level1.game.conf');
        } catch (error) {
            console.error("Failed to load level:", error);
        }

        const btnPlay = document.getElementById('btn-play-game');
        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                this.startGame();
            });
        }

        this.bindEvents();
    },

    startGame() {
        this.isRunning = true;
        
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.style.opacity = '0';
            setTimeout(() => startScreen.classList.add('hidden'), 500);
        }

        const gameUI = document.getElementById('game-ui');
        if (gameUI) {
            gameUI.style.opacity = '1';
        }

        if (SoundManager.ctx.state === 'suspended') SoundManager.ctx.resume();

        this.startWaveBreak(); 
        this.updateUI();
        this.animate();
    },

    selectHero() {
        if (this.hero && !this.hero.dead) {
            this.isHeroSelected = true;
            this.deselectMonster();
            this.closeMenus();
            this.activeTile = null;
        }
    },

    bindEvents() {
        canvas.addEventListener('mousemove', (e) => this.updateMouse(e));
        canvas.addEventListener('click', () => this.handleCanvasClick());
        
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            
            if (e.code === 'Space') {
                this.selectHero();
            }

            if (e.key === '1') this.activateSkill('meteor');
            if (e.key === '2') this.activateSkill('reinforce');
            if (e.key === '3') this.activateHeroSkill();
            if (e.key === 'Escape') {
                this.cancelAction();
                this.closeMenus();
                this.deselectMonster();
            }
        });

        const btnSelectHero = document.getElementById('btn-select-hero');
        if (btnSelectHero) {
            btnSelectHero.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectHero();
            });
        }

        const bindClick = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', (e) => { e.stopPropagation(); handler(); });
        };
        
        bindClick('btn-close-build', () => this.closeMenus());
        bindClick('btn-close-upgrade', () => this.closeMenus());
        bindClick('btn-sell', () => this.sellTower());
        bindClick('btn-upgrade', () => this.upgradeTower());
        bindClick('btn-rally', () => this.activateRallyMode());
        bindClick('btn-meteor', () => this.activateSkill('meteor'));
        bindClick('btn-reinforce', () => this.activateSkill('reinforce'));
        bindClick('wave-notification', () => this.startNextWaveEarly());
        bindClick('btn-hero-skill', () => this.activateHeroSkill());

        document.querySelectorAll('.btn-build').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const target = e.target.closest('.btn-build'); 
                if (target) {
                    const type = target.dataset.type;
                    const cost = parseInt(target.dataset.cost);
                    this.buildTower(type, cost);
                }
            });
        });
    },

    async loadLevelFromFile(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const levelData = await response.json();
        this.applyLevelData(levelData);
    },

    applyLevelData(levelData) {
        this.mapData = levelData.map;
        this.waypoints = levelData.waypoints;
        this.waves = levelData.waves;
        this.gold = levelData.gold;
        this.lives = levelData.lives;
        this.waveDelay = levelData.waveDelay;
        this.levelName = levelData.name;
        this.levelHeroData = levelData.hero;

        this.placementTiles = [];
        this.enemies = [];
        this.buildings = [];
        this.particles = [];
        this.meteors = [];
        this.reinforcements = [];
        this.hero = null;
        this.waveIndex = 0;
        this.spawnQueue = []; // Reset queue
        this.isWaveWaiting = false;

        this.createTiles();

        if (this.levelHeroData) {
            const spawnPos = this.waypoints[this.waypoints.length - 1];
            this.hero = new Hero({
                position: { x: spawnPos.x * TILE_SIZE + 32, y: spawnPos.y * TILE_SIZE + 32 },
                data: this.levelHeroData
            });
            this.levelUpHero(); 
            document.getElementById('hero-stats').classList.remove('hidden');
        } else {
            document.getElementById('hero-stats').classList.add('hidden');
        }
    },

    levelUpHero() {
        if (!this.hero) return;
        const currentLevel = this.waveIndex + 1;
        const baseDamage = 10;
        const baseHp = 200;
        const dmgPerLevel = 3;
        const hpPerLevel = 25;

        this.hero.damage = baseDamage + (currentLevel * dmgPerLevel);
        this.hero.maxHealth = baseHp + (currentLevel * hpPerLevel);
        
        if (currentLevel < 10) {
            this.hero.armor = 'LOW';
            this.hero.magicRes = 'LOW';
        } else {
            this.hero.armor = 'MED';
            this.hero.magicRes = 'MED';
        }
        
        this.hero.health = this.hero.maxHealth;

        if (this.hero.dead) {
            this.hero.dead = false;
            const spawnPos = this.waypoints[this.waypoints.length - 1];
            this.hero.center = { x: spawnPos.x * TILE_SIZE + 32, y: spawnPos.y * TILE_SIZE + 32 };
        }
    },

    createTiles() {
        if(!this.mapData) return;
        this.mapData.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val === 2) {
                    this.placementTiles.push(new PlacementTile({ position: { x: x * TILE_SIZE, y: y * TILE_SIZE } }));
                }
            });
        });
    },
    
    updateMouse(e) {
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    },

    updateMonsterInfoUI() {
        const en = this.selectedEnemy;
        const panel = document.getElementById('monster-info-panel');
        
        if (!panel) return;

        if (!en || en.dead || en.health <= 0) {
            panel.classList.add('hidden');
            this.selectedEnemy = null;
            return;
        }

        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
        }

        const nameEl = document.getElementById('info-name');
        if (nameEl) nameEl.innerText = en.type || 'Quái Vật'; 
        
        const typeEl = document.getElementById('info-type');
        let typeName = "Thường";
        if (en.armor > 0 && en.magicResist > 0) typeName = "Tinh Nhuệ";
        else if (en.armor > 10) typeName = "Giáp Sắt";
        else if (en.magicResist > 10) typeName = "Kháng Phép";
        if (typeEl) typeEl.innerText = typeName;

        const hpText = document.getElementById('info-hp-text');
        if (hpText) hpText.innerText = `${Math.ceil(en.health)}/${en.maxHealth}`;
        
        const hpBar = document.getElementById('info-hp-bar');
        if (hpBar) {
            const pct = Math.max(0, (en.health / en.maxHealth) * 100);
            hpBar.style.width = `${pct}%`;
        }

        document.getElementById('info-armor').innerText = en.armor || 0;
        document.getElementById('info-mr').innerText = (en.magicResist || 0) + '%';
        document.getElementById('info-speed').innerText = en.speed ? en.speed.toFixed(1) : '1.0';
        document.getElementById('info-reward').innerText = (en.money || en.reward || 10) + 'g';

        const effectsDiv = document.getElementById('info-effects');
        if (effectsDiv) {
            effectsDiv.innerHTML = '';
            if (en.statusEffects && en.statusEffects.length > 0) {
                en.statusEffects.forEach(ef => {
                    const span = document.createElement('span');
                    span.className = 'px-2 py-1 bg-blue-900/50 text-blue-300 text-[10px] rounded border border-blue-500/30 mr-1 mb-1 inline-block';
                    let icon = 'bolt';
                    let name = ef.type;
                    if (ef.type === 'SLOW' || ef.type === 'FREEZE') { icon = 'snowflake'; name = 'Làm chậm'; }
                    if (ef.type === 'BURN') { icon = 'fire'; name = 'Đốt cháy'; }
                    if (ef.type === 'POISON') { icon = 'skull'; name = 'Độc'; }
                    if (ef.type === 'STUN') { icon = 'star'; name = 'Choáng'; }
                    
                    span.innerHTML = `<i class="fas fa-${icon} mr-1"></i>${name} (${(ef.duration/60).toFixed(1)}s)`;
                    effectsDiv.appendChild(span);
                });
            } else {
                effectsDiv.innerHTML = '<span class="text-xs text-gray-500 italic">Không có hiệu ứng</span>';
            }
        }
    },

    deselectMonster() {
        this.selectedEnemy = null;
        const panel = document.getElementById('monster-info-panel');
        if (panel) panel.classList.add('hidden');
    },

    handleCanvasClick() {
        if (!this.isRunning) return;

        if (this.activeSkill) {
            this.castSkill(this.mouse.x, this.mouse.y);
            return;
        }

        if (this.isRallyMode && this.activeTile && this.activeTile.building) {
            const gridX = Math.floor(this.mouse.x / TILE_SIZE);
            const gridY = Math.floor(this.mouse.y / TILE_SIZE);

            if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
                if (this.mapData[gridY][gridX] === 1) { 
                    const newPoint = { x: this.mouse.x, y: this.mouse.y };
                    const building = this.activeTile.building;
                    const allowedRange = building.range > 0 ? building.range * 1.5 : 250;
                    
                    const dist = Math.hypot(newPoint.x - building.center.x, newPoint.y - building.center.y);
                    if (dist < allowedRange) {
                        building.setNewRallyPoint(newPoint);
                        this.cancelAction();
                        this.closeMenus();
                        return;
                    }
                }
            }
            this.cancelAction();
            return;
        }

        let clickedEnemy = null;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const en = this.enemies[i];
            const dist = Math.hypot(this.mouse.x - en.center.x, this.mouse.y - en.center.y);
            if (dist < en.radius + 15) {
                clickedEnemy = en;
                break;
            }
        }

        if (clickedEnemy) {
            this.selectedEnemy = clickedEnemy;
            this.isHeroSelected = false;
            this.activeTile = null;
            this.closeMenus();
            this.updateMonsterInfoUI();
            return;
        }

        if (this.hero && !this.hero.dead) {
            const distToHero = Math.hypot(this.mouse.x - this.hero.center.x, this.mouse.y - this.hero.center.y);
            if (distToHero < 30) {
                this.isHeroSelected = true;
                this.deselectMonster();
                this.activeTile = null; 
                this.closeMenus();
                return;
            }

            if (this.isHeroSelected) {
                this.hero.move({ x: this.mouse.x, y: this.mouse.y });
                this.isHeroSelected = false; 
                return;
            }
        }

        this.closeMenus(); 
        this.deselectMonster(); 

        let clickedTile = null;
        for (const tile of this.placementTiles) {
            if (this.mouse.x > tile.position.x && this.mouse.x < tile.position.x + TILE_SIZE &&
                this.mouse.y > tile.position.y && this.mouse.y < tile.position.y + TILE_SIZE) {
                clickedTile = tile;
                break;
            }
        }

        if (clickedTile) {
            this.activeTile = clickedTile;
            
            const menuX = clickedTile.position.x + TILE_SIZE / 2;
            const menuY = clickedTile.position.y;

            if (!clickedTile.occupied) {
                const menu = document.getElementById('build-menu');
                this.showMenuAt(menu, menuX, menuY);
                this.updateBuildButtons();
            } else {
                const panel = document.getElementById('upgrade-panel');
                this.showMenuAt(panel, menuX, menuY);
                this.updateUpgradePanel();
            }
        } else {
            this.activeTile = null;
            this.closeMenus();
        }
    },

    activateHeroSkill() {
        if (this.hero && !this.hero.dead) {
            this.hero.activateSkill(this.enemies, this.particles);
        }
    },

    showMenuAt(element, x, y) {
        if (!element) return;
        element.classList.remove('hidden');
        
        const width = element.offsetWidth || 220; 
        const height = element.offsetHeight || 200; 

        let left = x - width / 2;
        let top = y - height - 10; 

        if (left < 10) left = 10;
        if (left + width > this.width - 10) left = this.width - width - 10;
        if (top < 10) {
             top = y + TILE_SIZE + 10; 
        }

        element.style.top = `${top}px`;
        element.style.left = `${left}px`;
        element.style.transform = 'none';
    },

    activateRallyMode() {
        this.isRallyMode = true;
        document.getElementById('upgrade-panel').classList.add('hidden');
        document.getElementById('build-menu').classList.add('hidden');
        document.body.style.cursor = 'crosshair';
    },

    activateSkill(skillName) {
        if (this.skillCooldowns[skillName].current > 0) return;
        
        this.closeMenus(); 
        this.deselectMonster();
        
        this.activeSkill = skillName;
        document.body.style.cursor = 'crosshair';
        document.querySelectorAll('.skill-slot').forEach(el => el.classList.remove('skill-active'));
        const btn = document.getElementById(`btn-${skillName}`);
        if(btn) btn.classList.add('skill-active');
    },

    castSkill(x, y) {
        if (this.activeSkill === 'meteor') {
            SoundManager.playMeteorFall();
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.meteors.push(new Meteor({
                        position: { x: x + (Math.random() - 0.5) * 100, y: y + (Math.random() - 0.5) * 100 },
                        gameParticles: this.particles
                    }));
                }, i * 200);
            }
            this.skillCooldowns.meteor.current = this.skillCooldowns.meteor.max;
        } 
        else if (this.activeSkill === 'reinforce') {
            const currentLevel = this.waveIndex + 1;
            this.reinforcements.push(new Soldier({ 
                position: { x: x - 15, y: y }, 
                targetPos: { x: x - 15, y: y }, 
                isReinforcement: true,
                level: currentLevel
            }));
            this.reinforcements.push(new Soldier({ 
                position: { x: x + 15, y: y }, 
                targetPos: { x: x + 15, y: y }, 
                isReinforcement: true,
                level: currentLevel
            }));
            this.skillCooldowns.reinforce.current = this.skillCooldowns.reinforce.max;
        }
        this.cancelAction();
    },

    cancelAction() {
        this.isRallyMode = false;
        this.activeSkill = null;
        document.body.style.cursor = 'default';
        document.querySelectorAll('.skill-slot').forEach(el => el.classList.remove('skill-active'));
    },

    closeMenus() {
        const buildMenu = document.getElementById('build-menu');
        if(buildMenu) buildMenu.classList.add('hidden');
        const upgradePanel = document.getElementById('upgrade-panel');
        if(upgradePanel) upgradePanel.classList.add('hidden');
        this.activeTile = null; 
        if (this.isRallyMode || this.activeSkill) this.cancelAction();
    },

    updateCooldowns() {
        for (const [key, cd] of Object.entries(this.skillCooldowns)) {
            if (cd.current > 0) {
                cd.current--;
                const percent = (cd.current / cd.max) * 100;
                const overlay = document.getElementById(`cd-${key}`);
                if(overlay) overlay.style.height = `${percent}%`;
            } else {
                const overlay = document.getElementById(`cd-${key}`);
                if(overlay) overlay.style.height = `0%`;
            }
        }
        
        if (this.hero) {
            const heroBtn = document.getElementById('btn-hero-skill');
            const heroOverlay = document.getElementById('cd-hero-skill');
            if (this.hero.dead) {
                if(heroOverlay) heroOverlay.style.height = '100%';
                if(heroBtn) heroBtn.style.filter = 'grayscale(100%)';
            } else {
                if(heroBtn) heroBtn.style.filter = 'none';
                if (this.hero.skillTimer > 0) {
                    const percent = (this.hero.skillTimer / this.hero.skillCooldownMax) * 100;
                    if(heroOverlay) heroOverlay.style.height = `${percent}%`;
                } else {
                    if(heroOverlay) heroOverlay.style.height = `0%`;
                }
            }
            
            document.getElementById('hero-name-display').innerText = this.hero.name;
            document.getElementById('hero-dmg-display').innerText = this.hero.damage;
            document.getElementById('hero-armor-display').innerText = this.hero.armor;
            
            const hpPct = Math.max(0, (this.hero.health / this.hero.maxHealth) * 100);
            document.getElementById('hero-hp-fill').style.width = `${hpPct}%`;
            document.getElementById('hero-hp-text').innerText = `${Math.ceil(this.hero.health)}/${this.hero.maxHealth}`;
        }
    },

    updateUpgradePanel() {
        if (!this.activeTile || !this.activeTile.building) return;
        const b = this.activeTile.building;
        const upgradeCost = b.getUpgradeCost();
        const sellPrice = b.getSellValue();

        const nameEl = document.getElementById('tower-name');
        if(nameEl) nameEl.innerText = b.name + ` (Lv ${b.level})`;
        
        const costEl = document.getElementById('upgrade-cost');
        if(costEl) costEl.innerText = upgradeCost;
        
        const sellEl = document.getElementById('sell-price');
        if(sellEl) sellEl.innerText = sellPrice;
        
        let info = `Sát thương: ${b.damage}<br>Tầm bắn: ${b.range}`;
        const infoEl = document.getElementById('tower-info');
        if(infoEl) infoEl.innerHTML = info;

        const btnUpgrade = document.getElementById('btn-upgrade');
        const branchContainer = document.getElementById('branch-options');
        
        if (branchContainer) branchContainer.innerHTML = '';

        if (b.level < 3) {
            if(btnUpgrade) {
                btnUpgrade.classList.remove('hidden');
                if (this.gold < upgradeCost) {
                    btnUpgrade.classList.add('btn-disabled');
                    btnUpgrade.style.opacity = '0.5';
                } else {
                    btnUpgrade.classList.remove('btn-disabled');
                    btnUpgrade.style.opacity = '1';
                }
            }
        } 
        else if (b.level === 3) {
            if(btnUpgrade) btnUpgrade.classList.add('hidden');
            if (branchContainer) {
                let branches = [];
                if (b.type === 'archer') {
                    branches = [ { id: 'rapid_archer', name: 'Thần Tiễn', cost: 400 }, { id: 'sniper', name: 'Bắn Tỉa', cost: 400 } ];
                } else if (b.type === 'mage') {
                    branches = [ { id: 'ultimate_mage', name: 'Tối Thượng', cost: 400 }, { id: 'hermit_mage', name: 'Ẩn Tu', cost: 400 } ];
                } else if (b.type === 'cannon') {
                    branches = [ { id: 'rocket', name: 'Tên Lửa', cost: 450 }, { id: 'tesla', name: 'Tesla', cost: 450 } ];
                } else if (b.type === 'barracks') {
                    branches = [ { id: 'paladin', name: 'Thánh Hiệp Sĩ', cost: 230 }, { id: 'viking', name: 'Viking', cost: 230 } ];
                }
                
                branches.forEach(br => {
                    const btn = document.createElement('button');
                    btn.className = 'btn-action btn-branch';
                    btn.innerHTML = `Lên ${br.name} (${br.cost}G)`;
                    btn.onclick = (e) => {
                        e.stopPropagation(); 
                        this.evolveTower(br.id, br.cost);
                    };
                    if (this.gold < br.cost) {
                        btn.classList.add('btn-disabled');
                        btn.style.opacity = '0.5';
                    }
                    branchContainer.appendChild(btn);
                });
            }
        } 
        else {
            if(btnUpgrade) btnUpgrade.classList.add('hidden');
            const towerData = TOWER_TYPES[b.type];
            if (towerData && towerData.skills) {
                for (const [key, skill] of Object.entries(towerData.skills)) {
                    const currentLvl = b.skills[key] || 0;
                    if (currentLvl < skill.maxLevel) {
                        const btn = document.createElement('button');
                        btn.className = 'btn-action btn-branch'; 
                        btn.innerHTML = `${skill.name} Lv${currentLvl+1} (${skill.cost}G)`;
                        btn.title = skill.desc;
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            this.upgradeTowerSkill(key, skill.cost);
                        };
                        
                        if (this.gold < skill.cost) {
                            btn.classList.add('btn-disabled');
                            btn.style.opacity = '0.5';
                        }
                        branchContainer.appendChild(btn);
                    } else {
                        const div = document.createElement('div');
                        div.style.color = '#2ecc71';
                        div.style.fontSize = '12px';
                        div.innerHTML = `${skill.name} (Max)`;
                        branchContainer.appendChild(div);
                    }
                }
            } else {
                if (branchContainer) branchContainer.innerHTML = '<div style="color:#f1c40f; margin-bottom:10px; font-weight:bold;">Đã đạt cấp tối đa!</div>';
            }
        }

        const btnRally = document.getElementById('btn-rally');
        if(btnRally) {
            if (b.type.includes('barracks') || b.type === 'paladin' || b.type === 'viking') {
                btnRally.classList.remove('hidden');
            } else {
                btnRally.classList.add('hidden');
            }
        }
    },

    evolveTower(branchId, cost) {
        if (this.activeTile && this.activeTile.building) {
            if (this.gold >= cost) {
                this.gold -= cost;
                this.activeTile.building.upgrade(branchId);
                this.updateUI();
                this.updateUpgradePanel();
            }
        }
    },

    upgradeTower() {
        if (this.activeTile && this.activeTile.building) {
            const b = this.activeTile.building;
            const cost = b.getUpgradeCost();
            if (this.gold >= cost) {
                this.gold -= cost;
                b.upgrade();
                this.updateUI();
                this.updateUpgradePanel();
            }
        }
    },

    upgradeTowerSkill(skillKey, cost) {
        if (this.activeTile && this.activeTile.building) {
            if (this.gold >= cost) {
                this.gold -= cost;
                this.activeTile.building.upgradeSkill(skillKey);
                this.updateUI();
                this.updateUpgradePanel();
            }
        }
    },

    buildTower(type, cost) {
        if (this.gold >= cost && this.activeTile && !this.activeTile.occupied) {
            this.gold -= cost;
            this.updateUI();
            
            const building = new Building({ 
                position: { ...this.activeTile.position }, 
                type: type, 
                cost: cost,
                mapData: this.mapData 
            });
            
            this.buildings.push(building);
            this.activeTile.occupied = true;
            this.activeTile.building = building;
            this.closeMenus();
        }
    },

    sellTower() {
        if (this.activeTile && this.activeTile.occupied) {
            const building = this.activeTile.building;
            const refund = building.getSellValue();
            this.gold += refund;
            this.updateUI();
            this.buildings = this.buildings.filter(b => b !== building);
            this.activeTile.occupied = false;
            this.activeTile.building = null;
            this.closeMenus();
        }
    },

    updateBuildButtons() {
        document.querySelectorAll('.btn-build').forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            if (this.gold < cost) btn.classList.add('btn-disabled');
            else btn.classList.remove('btn-disabled');
        });
    },
    
    updateUI() {
        const coinEl = document.getElementById('coins');
        if(coinEl) coinEl.innerText = this.gold;
        
        const livesEl = document.getElementById('lives');
        if(livesEl) livesEl.innerText = this.lives;
        
        const waveEl = document.getElementById('wave');
        if(waveEl) waveEl.innerText = this.waveIndex + 1;
    },

    startWaveBreak() {
        this.isWaveWaiting = true;
        this.waveTimer = this.waveDelay * 60; 
        
        const btn = document.getElementById('wave-notification');
        if(btn) btn.classList.remove('hidden');
        
        const nextWave = this.waves[this.waveIndex];
        if (nextWave) {
            const descEl = document.getElementById('next-wave-desc');
            if(descEl) descEl.innerText = nextWave.desc || "Đợt quái mới";
        }
    },

    startNextWaveEarly() {
        if (this.isWaveWaiting) {
            const secondsLeft = Math.floor(this.waveTimer / 60);
            const bonus = secondsLeft * GOLD_PER_SEC_EARLY;
            this.gold += bonus;
            
            this.isWaveWaiting = false;
            this.startWave();
        }
    },

    startWave() {
        this.isWaveWaiting = false;
        const btn = document.getElementById('wave-notification');
        if(btn) btn.classList.add('hidden');
        this.enemiesSpawned = 0;
        this.lastSpawnTime = 0; 
        
        // [MỚI] Gọi hàm tăng sức mạnh Hero khi bắt đầu Wave mới
        this.levelUpHero();
        
        // [UPDATED] Chuẩn bị hàng đợi spawn từ cấu hình sequence
        const currentWave = this.waves[this.waveIndex];
        this.spawnQueue = [];
        if (currentWave && currentWave.sequence) {
            currentWave.sequence.forEach(group => {
                for (let i = 0; i < group.count; i++) {
                    this.spawnQueue.push(group.type);
                }
            });
        }
        
        // Cập nhật mô tả Wave tiếp theo nếu có
        const nextWave = this.waves[this.waveIndex + 1];
        if (nextWave) {
            const descEl = document.getElementById('next-wave-desc');
            if(descEl) descEl.innerText = nextWave.desc || "Đợt quái mới";
        }

        this.updateUI();
    },

    spawnWaveLogic(timestamp) {
        if (this.isWaveWaiting) {
            this.waveTimer--;
            
            const percent = (this.waveTimer / (this.waveDelay * 60)) * 100;
            const bar = document.getElementById('wave-timer-bar');
            if(bar) bar.style.height = `${percent}%`;
            
            const secondsLeft = Math.ceil(this.waveTimer / 60);
            const bonus = secondsLeft * GOLD_PER_SEC_EARLY;
            const text = document.getElementById('wave-bonus-text');
            if(text) text.innerText = `Gọi sớm: +${bonus}G`;

            if (this.waveTimer <= 0) {
                this.startWave(); 
            }
            return;
        }

        if (this.waveIndex >= this.waves.length) return; 

        const currentWave = this.waves[this.waveIndex];
        
        // [UPDATED] Logic spawn từ hàng đợi (Queue)
        if (this.spawnQueue.length > 0) {
             if (timestamp - this.lastSpawnTime > currentWave.interval) {
                const enemyType = this.spawnQueue.shift(); // Lấy quái đầu hàng đợi (FIFO)

                const enemy = new Enemy({
                    position: { x: this.waypoints[0].x * TILE_SIZE, y: this.waypoints[0].y * TILE_SIZE },
                    type: enemyType, 
                    waypoints: this.waypoints 
                });
                
                // Tự động gán chỉ số mặc định nếu config thiếu (Safety net)
                enemy.armor = enemy.armor || 'NONE';
                enemy.magicRes = enemy.magicRes || 'NONE';
                
                this.enemies.push(enemy);
                this.enemiesSpawned++;
                this.lastSpawnTime = timestamp;
            }
        } 
        
        // Kiểm tra hết wave: Hàng đợi rỗng VÀ không còn quái sống trên map
        if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
            this.waveIndex++;
            if (this.waveIndex < this.waves.length) {
                this.startWaveBreak();
            } else {
                alert("VICTORY!");
            }
        }
    },

    animate(timestamp = 0) {
        requestAnimationFrame((t) => this.animate(t));

        ctx.fillStyle = '#5D9652';
        ctx.fillRect(0, 0, this.width, this.height);

        // Vẽ Map
        ctx.fillStyle = '#cda434';
        if (this.mapData && this.mapData.length > 0) {
            this.mapData.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val === 1) ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                });
            });
        }

        // Debug đường đi
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.lineWidth = 4;
        if (this.waypoints && this.waypoints.length > 0) {
            ctx.moveTo(this.waypoints[0].x * TILE_SIZE + TILE_SIZE/2, this.waypoints[0].y * TILE_SIZE + TILE_SIZE/2);
            for (let i = 1; i < this.waypoints.length; i++) {
                ctx.lineTo(this.waypoints[i].x * TILE_SIZE + TILE_SIZE/2, this.waypoints[i].y * TILE_SIZE + TILE_SIZE/2);
            }
        }
        ctx.stroke();

        this.updateCooldowns();
        this.spawnWaveLogic(timestamp);

        this.placementTiles.forEach(tile => tile.update(this.mouse, ctx));
        
        this.buildings.forEach(b => b.update(ctx, this.enemies, this.particles, this.activeTile));

        this.reinforcements = this.reinforcements.filter(s => !s.dead);
        this.reinforcements.forEach(soldier => {
            soldier.update(ctx, this.enemies);
        });

        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.update(ctx, this.enemies);
            if (m.hit) this.meteors.splice(i, 1);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(ctx);
            if (p.finished) this.particles.splice(i, 1);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(ctx);
            
            if (enemy.dead) {
                // Nếu quái đang xem bị chết -> Đóng panel hoặc chỉ reset selectedEnemy
                if (this.selectedEnemy === enemy) {
                    this.deselectMonster();
                }
                
                this.gold += enemy.reward;
                this.updateUI();
                this.enemies.splice(i, 1);
                continue;
            }

            if (enemy.finished) {
                if (this.selectedEnemy === enemy) {
                    this.deselectMonster();
                }
                
                this.lives--;
                this.updateUI();
                this.enemies.splice(i, 1);
                if (this.lives <= 0) {
                    this.lives = 0;
                    this.updateUI();
                    alert("GAME OVER! Bạn đã thua cuộc.");
                    window.location.reload();
                }
            }
        }
        
        if (this.hero) {
            this.hero.update(ctx, this.enemies);
            
            if (this.isHeroSelected) {
                ctx.beginPath();
                ctx.arc(this.hero.center.x, this.hero.center.y, 25, 0, Math.PI * 2);
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // [MỚI] Vẽ vòng chọn quanh quái đang xem
        if (this.selectedEnemy && !this.selectedEnemy.dead) {
            // Cập nhật thông tin UI liên tục (máu, hiệu ứng)
            this.updateMonsterInfoUI();

            const e = this.selectedEnemy;
            ctx.save();
            ctx.translate(e.center.x, e.center.y);
            // Vòng xoay
            ctx.rotate(timestamp / 500); 
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#fbbf24'; // Vàng
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.restore();

            // Mũi tên chỉ
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(e.center.x, e.center.y - e.radius - 12);
            ctx.lineTo(e.center.x - 5, e.center.y - e.radius - 20);
            ctx.lineTo(e.center.x + 5, e.center.y - e.radius - 20);
            ctx.fill();
        }

        if (this.activeSkill) {
            ctx.beginPath();
            ctx.arc(this.mouse.x, this.mouse.y, this.activeSkill === 'meteor' ? 60 : 20, 0, Math.PI*2);
            ctx.strokeStyle = this.activeSkill === 'meteor' ? 'red' : 'yellow';
            ctx.lineWidth = 2;
            ctx.stroke();
            if (this.activeSkill === 'meteor') {
                ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
                ctx.fill();
            }
        } else if (this.isRallyMode) {
            ctx.beginPath();
            ctx.arc(this.mouse.x, this.mouse.y, 5, 0, Math.PI*2);
            ctx.fillStyle = 'yellow';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
            if (this.activeTile && this.activeTile.building) {
                ctx.beginPath();
                const building = this.activeTile.building;
                const range = building.range > 0 ? building.range * 1.5 : 250;
                ctx.arc(building.center.x, building.center.y, range, 0, Math.PI*2);
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
                ctx.setLineDash([5,5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
};

Game.init();