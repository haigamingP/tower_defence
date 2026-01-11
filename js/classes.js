import { TILE_SIZE, TOWER_TYPES, COLS, ROWS } from './constants.js';

import { drawArcher, updateArcher } from './classes/archer.js';
import { drawWizard, updateWizard } from './classes/wizard.js';
import { drawBomber, updateBomber } from './classes/bomber.js';
import { drawBarrack, updateBarrack, Soldier } from './classes/barrack.js';
import { Enemy } from './classes/enemies.js';
import { Hero } from './classes/heroes.js';
import { SoundManager } from './classes/soundManager.js';
import { Particle } from './classes/particle.js';

// [FIX] Bộ điều tiết âm thanh nâng cao (Advanced Sound Throttler)
const soundThrottleState = { 
    last: {}, 
    cooldowns: {
        'shoot_default': 120,
        'shoot_magic': 150,
        'shoot_hit': 200,
        'exp': 250
    },
    defaultCD: 100
};

const ThrottledSoundManager = new Proxy(SoundManager, {
    get: (target, prop) => {
        if (prop === 'playShoot') {
            return (type) => {
                const now = Date.now();
                const key = 'shoot_' + (type || 'default');
                const cd = soundThrottleState.cooldowns[key] || soundThrottleState.defaultCD;
                if (!soundThrottleState.last[key] || now - soundThrottleState.last[key] > cd) {
                    target.playShoot(type);
                    soundThrottleState.last[key] = now;
                }
            };
        }
        if (prop === 'playExplosion') {
            return () => {
                const now = Date.now();
                const cd = soundThrottleState.cooldowns['exp'];
                if (!soundThrottleState.last['exp'] || now - soundThrottleState.last['exp'] > cd) {
                    target.playExplosion();
                    soundThrottleState.last['exp'] = now;
                }
            };
        }
        return target[prop];
    }
});

export class PlacementTile {
    constructor({ position = { x: 0, y: 0 } }) {
        this.position = position;
        this.size = TILE_SIZE;
        this.color = 'rgba(255, 255, 255, 0.1)';
        this.occupied = false;
        this.building = null;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.size, this.size);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(this.position.x, this.position.y, this.size, this.size);
        ctx.setLineDash([]);
    }
    update(mouse, ctx) {
        this.draw(ctx);
        if (mouse.x > this.position.x && mouse.x < this.position.x + this.size &&
            mouse.y > this.position.y && mouse.y < this.position.y + this.size) {
            this.color = this.occupied ? 'rgba(231, 76, 60, 0.4)' : 'rgba(255, 255, 255, 0.3)';
        } else {
            this.color = 'rgba(0, 0, 0, 0.05)';
        }
    }
}

export class Projectile {
    constructor({ position, target, speed, damage, type, color, aoe = 0, gameParticles, statusEffects = [], special = {}, onKill = null, isAxe = false, towerSkills = {}, statusEffect = null }) {
        this.position = { ...position };
        this.target = target;
        this.speed = speed;
        this.damage = damage;
        this.type = type;
        this.color = color;
        this.radius = type === 'cannon' ? 6 : 3; 
        this.hit = false;
        this.aoe = aoe;
        this.gameParticles = gameParticles;
        
        this.statusEffects = statusEffects;
        if (statusEffect) this.statusEffects.push(statusEffect);

        this.special = special; 
        this.onKill = onKill;
        
        this.isAxe = isAxe;
        this.history = [];
        this.angle = 0;
    }
    
    update(ctx, enemies) {
        this.history.push({x: this.position.x, y: this.position.y});
        if (this.history.length > 5) this.history.shift();

        this.draw(ctx);
        if (!this.target || this.target.dead) { this.hit = true; return; }

        const angle = Math.atan2(this.target.center.y - this.position.y, this.target.center.x - this.position.x);
        this.position.x += Math.cos(angle) * this.speed;
        this.position.y += Math.sin(angle) * this.speed;
        
        if (this.isAxe) this.angle += 0.5;

        const dist = Math.hypot(this.target.center.x - this.position.x, this.target.center.y - this.position.y);
        
        if (dist < this.target.radius + this.radius) {
            this.hit = true;
            if (this.aoe > 0) {
                ThrottledSoundManager.playExplosion();
                if(this.gameParticles) {
                    for (let i = 0; i < 10; i++) {
                        this.gameParticles.push(new Particle({ position: { x: this.position.x, y: this.position.y }, velocity: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }, color: 'orange' }));
                    }
                }
                enemies.forEach(enemy => {
                    const distToExplosion = Math.hypot(enemy.center.x - this.position.x, enemy.center.y - this.position.y);
                    if (distToExplosion <= this.aoe && !enemy.dead && !enemy.finished) {
                        // [FIX] Đại bác (Vật lý) không bắn được quái bay
                        if (enemy.flying && this.type === 'PHYSICAL') return;
                        this.applyHit(enemy);
                    }
                });
            } else {
                ThrottledSoundManager.playShoot(this.type === 'MAGIC' ? 'magic' : 'hit');
                this.applyHit(this.target);
            }
        }
    }

    applyHit(target) {
        if (this.special.executeThreshold) {
            const hpPct = target.health / target.maxHealth;
            if (hpPct <= this.special.executeThreshold && !target.isBoss) { 
                target.takeDamage(99999, 'TRUE'); 
                if (this.gameParticles) {
                    this.gameParticles.push(new Particle({ position: target.center, velocity: {x:0, y:0}, color: 'red', life: 2.0, type: 'ring' }));
                }
                if (target.health <= 0 && this.onKill) this.onKill();
                return;
            }
        }

        const killed = target.takeDamage(this.damage, this.type, this.special.ignoreArmorPct);
        
        if (killed && this.onKill) this.onKill();

        if (this.statusEffects && this.statusEffects.length > 0) {
            this.statusEffects.forEach(effect => {
                if (effect.bonusMagicDmg) {
                    target.takeDamage(effect.bonusMagicDmg, 'MAGIC');
                }
                target.applyStatus(effect);
            });
        }
    }
    
    draw(ctx) {
        if (this.isAxe) {
            ctx.save(); ctx.translate(this.position.x, this.position.y); ctx.rotate(this.angle);
            ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.moveTo(-4,-4); ctx.lineTo(4,-4); ctx.lineTo(6,0); ctx.lineTo(4,4); ctx.lineTo(-4,4); ctx.fill();
            ctx.restore(); return;
        }
        
        if (this.special.isCrit) {
            ctx.beginPath(); ctx.arc(this.position.x, this.position.y, this.radius + 2, 0, Math.PI * 2); 
            ctx.fillStyle = '#e74c3c'; ctx.fill();
            ctx.shadowBlur = 5; ctx.shadowColor = 'red';
        } else {
            ctx.beginPath(); ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2); 
            ctx.fillStyle = this.color; ctx.fill();
        }
        
        if (this.history.length > 1) { ctx.beginPath(); ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.5; ctx.moveTo(this.history[0].x, this.history[0].y); for (let i = 1; i < this.history.length; i++) { ctx.lineTo(this.history[i].x, this.history[i].y); } ctx.stroke(); ctx.globalAlpha = 1.0; }
        
        ctx.shadowBlur = 0;
        if (this.aoe > 0) { ctx.beginPath(); ctx.arc(this.position.x, this.position.y, this.radius + 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); }
    }
}

export class Meteor {
    constructor({ position, damage = 200, aoe = 120, gameParticles }) {
        this.targetPos = position; 
        this.position = { x: position.x - 100, y: position.y - 300 }; 
        this.speed = 10;
        this.damage = damage;
        this.aoe = aoe;
        this.gameParticles = gameParticles;
        this.radius = 20;
        this.hit = false;
        this.trail = [];
    }
    update(ctx, enemies) {
        this.trail.push({x: this.position.x, y: this.position.y});
        if (this.trail.length > 8) this.trail.shift();
        this.draw(ctx);
        const angle = Math.atan2(this.targetPos.y - this.position.y, this.targetPos.x - this.position.x);
        this.position.x += Math.cos(angle) * this.speed;
        this.position.y += Math.sin(angle) * this.speed;
        this.speed += 0.5;
        const dist = Math.hypot(this.targetPos.x - this.position.x, this.targetPos.y - this.position.y);
        if (dist < this.speed) {
            this.hit = true;
            // [FIX] Sử dụng ThrottledSoundManager
            ThrottledSoundManager.playExplosion();
            for (let i = 0; i < 30; i++) {
                this.gameParticles.push(new Particle({ position: { x: this.targetPos.x, y: this.targetPos.y }, velocity: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }, color: i % 2 === 0 ? '#e74c3c' : '#f1c40f' }));
            }
            enemies.forEach(enemy => {
                const d = Math.hypot(enemy.center.x - this.targetPos.x, enemy.center.y - this.targetPos.y);
                if (d < this.aoe && !enemy.dead && !enemy.finished) {
                    enemy.takeDamage(this.damage, 'PHYSICAL');
                    enemy.applyStatus({type: 'BURN', duration: 180, damage: 2}); 
                }
            });
        }
    }
    draw(ctx) {
        if (this.trail.length > 1) { ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y); for (let i = 1; i < this.trail.length; i++) { ctx.lineTo(this.trail[i].x, this.trail[i].y); } ctx.strokeStyle = '#e67e22'; ctx.lineWidth = this.radius; ctx.lineCap = 'round'; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = '#d35400'; ctx.fill();
        ctx.beginPath(); ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(241, 196, 15, 0.5)'; ctx.fill();
    }
}

export class Building {
    constructor({ position = { x: 0, y: 0 }, type, cost, mapData }) {
        const data = TOWER_TYPES[type];
        this.position = position;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.center = { x: position.x + TILE_SIZE/2, y: position.y + TILE_SIZE/2 };
        this.type = type;
        this.damageType = data.type;
        this.cost = cost;
        this.totalInvested = cost;
        this.range = data.range || 100;
        this.damage = data.damage;
        this.cooldown = data.cooldown;
        this.timer = 0;
        this.color = data.color;
        this.name = data.name;
        this.level = 1;
        this.projectileSpeed = data.projectileSpeed || 5;
        this.aoe = data.aoe || 0;
        this.branch = null; 
        this.skills = {};   
        this.projectiles = [];
        this.target = null;
        this.rotation = 0;
        this.soldiers = [];
        this.rallyPoint = null;
        this.spawnTimer = 0;
        this.mapData = mapData; 
        
        // [FIX] Lưu stats lính
        this.soldierHP = data.soldierHP;
        this.soldierDmg = data.soldierDmg;

        if (this.type.includes('barracks') || this.type === 'paladin' || this.type === 'viking') { 
            this.findRallyPoint(); 
            this.spawnSoldiers();
        }
    }

    getUpgradeCost() { return Math.floor(this.cost * 1.5 * this.level); }
    getSellValue() { return Math.floor(this.totalInvested * 0.7); }

    upgrade(branchType = null) {
        if (this.level < 3) {
            this.level++;
            this.totalInvested += this.getUpgradeCost();
            
            // [FIX] Logic đọc stats từ constants.js
            const towerData = TOWER_TYPES[this.type];
            if (towerData && towerData.levels && towerData.levels[this.level]) {
                const lvlData = towerData.levels[this.level];
                if (lvlData.damage) this.damage = lvlData.damage;
                if (lvlData.range) this.range = lvlData.range;
                
                // Cập nhật stats lính nếu là nhà lính
                if (lvlData.soldierHP) this.soldierHP = lvlData.soldierHP;
                if (lvlData.soldierDmg) this.soldierDmg = lvlData.soldierDmg;
            } else {
                // Fallback nếu không có config
                this.damage = Math.floor(this.damage * 1.5);
                this.range += 15;
            }

            // [FIX] Cập nhật ngay cho lính đang sống
            if (this.type.includes('barracks')) {
                this.soldiers.forEach(s => {
                    if (this.soldierHP) {
                        const hpRatio = s.health / s.maxHealth;
                        s.maxHealth = this.soldierHP;
                        s.health = s.maxHealth * hpRatio;
                    }
                    if (this.soldierDmg) s.damage = this.soldierDmg;
                });
            }

        } else if (this.level === 3 && branchType) {
            const newData = TOWER_TYPES[branchType];
            if (!newData) return;
            this.level++;
            this.totalInvested += 400; 
            this.type = branchType;
            this.name = newData.name;
            this.color = newData.color;
            this.range = newData.range;
            this.damage = newData.damage;
            this.cooldown = newData.cooldown;
            this.projectileSpeed = newData.projectileSpeed || this.projectileSpeed;
            this.damageType = newData.type; // Cập nhật loại damage (ví dụ phép -> phép mạnh)
            if (newData.aoe) this.aoe = newData.aoe;
            
            // Cập nhật stats lính cho nhà lính tiến hóa
            if (newData.soldierHP) this.soldierHP = newData.soldierHP;
            if (newData.soldierDmg) this.soldierDmg = newData.soldierDmg;

            this.branch = branchType;
            this.skills = {};
            if (newData.skills) { for (const key in newData.skills) { this.skills[key] = 0; } }

            // Reset lính để ra lính mới xịn hơn
            if (this.type.includes('barracks') || this.type === 'paladin' || this.type === 'viking') {
                this.soldiers = [];
                this.spawnSoldiers();
            }
        }
    }

    upgradeSkill(skillKey) {
        const towerData = TOWER_TYPES[this.type];
        if (!towerData || !towerData.skills || !towerData.skills[skillKey]) return;
        const skillInfo = towerData.skills[skillKey];
        const currentLevel = this.skills[skillKey] || 0;
        if (currentLevel < 4) { 
            this.skills[skillKey] = currentLevel + 1;
            this.totalInvested += skillInfo.cost;
        }
    }

    spawnSoldiers() {
        for(let i=0; i<3; i++) {
            let sType = 'basic';
            if (this.type === 'paladin') sType = 'paladin';
            if (this.type === 'viking') sType = 'viking';

            this.soldiers.push(new Soldier({
                position: { x: this.center.x + (i-1)*10, y: this.center.y + 10 },
                targetPos: { x: this.rallyPoint.x + (i-1)*15, y: this.rallyPoint.y },
                type: sType,
                // [FIX] Truyền stats mới vào
                stats: { hp: this.soldierHP, dmg: this.soldierDmg }
            }));
        }
    }

    findRallyPoint() {
        this.rallyPoint = { x: this.center.x, y: this.center.y };
        const gridX = Math.floor(this.position.x / TILE_SIZE);
        const gridY = Math.floor(this.position.y / TILE_SIZE);
        const checkOffsets = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}, {x:-1, y:-1}, {x:1, y:-1}, {x:-1, y:1}, {x:1, y:1}];
        for (let off of checkOffsets) {
            const checkY = gridY + off.y;
            const checkX = gridX + off.x;
            if (checkY >= 0 && checkY < ROWS && checkX >= 0 && checkX < COLS) {
                if (this.mapData && this.mapData[checkY] && this.mapData[checkY][checkX] === 1) {
                    this.rallyPoint = {
                        x: checkX * TILE_SIZE + TILE_SIZE / 2,
                        y: checkY * TILE_SIZE + TILE_SIZE / 2
                    };
                    break;
                }
            }
        }
    }

    setNewRallyPoint(point) {
        if (this.type.includes('barracks') || this.type === 'paladin' || this.type === 'viking') {
            this.rallyPoint = point;
            let sType = 'basic';
            if(this.type === 'paladin') sType = 'paladin';
            if(this.type === 'viking') sType = 'viking';
            this.soldiers.forEach(soldier => {
                soldier.targetPos = { 
                    x: point.x + (Math.random()-0.5)*20, 
                    y: point.y + (Math.random()-0.5)*20 
                };
                soldier.state = 'MOVING';
                soldier.type = sType;
                if (soldier.targetEnemy) { soldier.targetEnemy.blockedBy = null; }
                soldier.targetEnemy = null; 
            });
        }
    }

    draw(ctx, activeTile) {
        const isHovered = (activeTile && activeTile.building === this);
        if (isHovered) {
            ctx.beginPath(); ctx.arc(this.center.x, this.center.y, this.range, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; ctx.fill(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        }

        ctx.fillStyle = '#7f8c8d'; 
        ctx.fillRect(this.position.x + 8, this.position.y + 8, this.width - 16, this.height - 16);
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2; ctx.strokeRect(this.position.x + 8, this.position.y + 8, this.width - 16, this.height - 16);
        ctx.fillStyle = 'white'; ctx.font = 'bold 10px Arial'; ctx.fillStyle = 'black'; ctx.fillText('Lv.' + this.level, this.position.x + 4, this.position.y + 12); ctx.fillStyle = 'white'; ctx.fillText('Lv.' + this.level, this.position.x + 3, this.position.y + 11);

        if (this.type.includes('archer') || this.type === 'sniper' || this.type === 'rapid_archer') drawArcher(ctx, this);
        else if (this.type.includes('mage') || this.type === 'ultimate_mage' || this.type === 'hermit_mage') drawWizard(ctx, this);
        else if (this.type.includes('cannon') || this.type === 'rocket' || this.type === 'tesla') drawBomber(ctx, this);
        else if (this.type.includes('barracks') || this.type === 'paladin' || this.type === 'viking') drawBarrack(ctx, this);

        if ((this.type.includes('barracks') || this.type === 'paladin' || this.type === 'viking') && this.rallyPoint) {
            ctx.beginPath(); ctx.moveTo(this.rallyPoint.x, this.rallyPoint.y); ctx.lineTo(this.rallyPoint.x, this.rallyPoint.y - 20); ctx.lineTo(this.rallyPoint.x + 15, this.rallyPoint.y - 15); ctx.lineTo(this.rallyPoint.x, this.rallyPoint.y - 10); ctx.strokeStyle = 'yellow'; ctx.stroke(); ctx.fillStyle = 'blue'; ctx.fill();
        }
    }

    update(ctx, enemies, gameParticles, activeTile) {
        this.draw(ctx, activeTile);

        // [FIX] Truyền ThrottledSoundManager vào các hàm update tháp để giảm âm lượng khi bắn
        if (this.type.includes('barracks') || this.type === 'paladin' || this.type === 'viking') {
            updateBarrack(this, ctx, enemies, this.projectiles, ThrottledSoundManager, Projectile);
        } else if (this.type.includes('archer') || this.type === 'sniper' || this.type === 'rapid_archer') {
            updateArcher(this, ctx, enemies, gameParticles, { Projectile, SoundManager: ThrottledSoundManager });
        } else if (this.type.includes('mage') || this.type === 'ultimate_mage' || this.type === 'hermit_mage') {
            updateWizard(this, ctx, enemies, gameParticles, { Projectile, SoundManager: ThrottledSoundManager });
        } else if (this.type.includes('cannon') || this.type === 'rocket' || this.type === 'tesla') {
            // [FIX] Lọc quái bay cho tháp pháo/tên lửa
            const groundEnemies = enemies.filter(e => !e.flying);
            updateBomber(this, ctx, groundEnemies, gameParticles, { Projectile, SoundManager: ThrottledSoundManager });
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(ctx, enemies);
            if (p.hit || (p.target && (p.target.dead || p.target.finished))) {
                this.projectiles.splice(i, 1);
            }
        }
    }
}

export { Enemy, Hero, Soldier, SoundManager, Particle };