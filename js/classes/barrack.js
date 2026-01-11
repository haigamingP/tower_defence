export class Soldier {
    // [UPDATE] Nhận thêm tham số stats (object chứa hp, dmg)
    constructor({ position, targetPos, isReinforcement = false, type = 'basic', skills = {}, level = 1, stats = null }) {
        this.position = { ...position };
        this.targetPos = { ...targetPos };
        this.center = { x: position.x, y: position.y };
        this.radius = 6;
        this.isReinforcement = isReinforcement;
        this.type = type; 
        this.skills = skills;
        
        if (this.isReinforcement) {
            this.health = 80 + (level * 15);
            this.damage = 6 + (level * 2);
            this.color = '#f1c40f';
        } else {
            // [FIX] Ưu tiên sử dụng stats truyền vào (từ tháp đã nâng cấp)
            if (stats) {
                this.health = stats.hp;
                this.damage = stats.dmg;
            } else {
                // Fallback cũ
                this.health = type === 'paladin' ? 300 : (type === 'viking' ? 250 : 100);
                this.damage = type === 'paladin' ? 15 : (type === 'viking' ? 30 : 5);
            }
            this.color = type === 'paladin' ? '#3498db' : (type === 'viking' ? '#e67e22' : '#95a5a6');
        }

        this.maxHealth = this.health;
        this.attackSpeed = 60;
        this.timer = 0;
        this.range = 20;
        this.speed = 2;
        this.state = 'IDLE'; 
        this.targetEnemy = null; 
        this.dead = false;
        
        this.regenTimer = 0;
        this.axeCooldown = 0;
    }

    update(ctx, enemies, projectiles, SoundManager, ProjectileClass) {
        this.draw(ctx);
        if (this.dead) return;

        if (this.type === 'paladin' && this.skills.heal > 0) {
            this.regenTimer++;
            if (this.regenTimer >= 60) {
                this.health = Math.min(this.health + (10 * this.skills.heal), this.maxHealth);
                this.regenTimer = 0;
            }
        }

        if (this.type === 'viking' && this.skills.axe > 0 && this.axeCooldown <= 0 && !this.targetEnemy) {
            const axeRange = 150;
            for (const enemy of enemies) {
                if (!enemy.dead && !enemy.finished) {
                    const dist = Math.hypot(enemy.center.x - this.center.x, enemy.center.y - this.center.y);
                    if (dist < axeRange) {
                        this.axeCooldown = 180;
                        if(projectiles && ProjectileClass) { 
                            projectiles.push(new ProjectileClass({
                                position: { x: this.center.x, y: this.center.y },
                                target: enemy,
                                speed: 6,
                                damage: this.damage * 0.8 * this.skills.axe,
                                type: 'PHYSICAL',
                                color: '#e67e22',
                                isAxe: true,
                                gameParticles: []
                            }));
                        }
                        break;
                    }
                }
            }
        }
        if (this.axeCooldown > 0) this.axeCooldown--;

        if (this.state !== 'FIGHTING') {
            const dx = this.targetPos.x - this.center.x;
            const dy = this.targetPos.y - this.center.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 2) {
                this.state = 'MOVING';
                const angle = Math.atan2(dy, dx);
                this.center.x += Math.cos(angle) * this.speed;
                this.center.y += Math.sin(angle) * this.speed;
            } else {
                this.state = 'IDLE';
            }
        }

        if (!this.targetEnemy || this.targetEnemy.dead || this.targetEnemy.finished) {
            this.targetEnemy = null;
            this.state = 'IDLE';
            for (const enemy of enemies) {
                if (!enemy.dead && !enemy.finished && !enemy.blockedBy) {
                    const dist = Math.hypot(enemy.center.x - this.center.x, enemy.center.y - this.center.y);
                    const interactRadius = enemy.isBoss ? 50 : 30;
                    if (dist < interactRadius) {
                        this.targetEnemy = enemy;
                        enemy.blockedBy = this;
                        this.state = 'FIGHTING';
                        break;
                    }
                }
            }
        }

        if (this.state === 'FIGHTING' && this.targetEnemy) {
            this.timer++;
            let currentAtkSpeed = this.attackSpeed;
            if (this.type === 'viking' && this.skills.rage > 0 && this.health < this.maxHealth * 0.5) {
                currentAtkSpeed = 30; 
            }

            if (this.timer >= currentAtkSpeed) {
                if(SoundManager) SoundManager.playShoot('melee');
                this.targetEnemy.takeDamage(this.damage, 'PHYSICAL');
                this.timer = 0;
            }
            if (this.targetEnemy && (this.targetEnemy.dead || this.targetEnemy.finished)) {
                 this.targetEnemy = null;
                 this.state = 'IDLE';
            }
        }
    }

    takeDamage(amount) {
        if (this.type === 'paladin') amount *= 0.7; 
        
        if (this.type === 'paladin' && this.skills.reflect > 0 && this.targetEnemy) {
            const reflectDmg = amount * (0.2 * this.skills.reflect);
            if(this.targetEnemy) this.targetEnemy.takeDamage(reflectDmg, 'PHYSICAL');
        }

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            if (this.targetEnemy) {
                this.targetEnemy.blockedBy = null;
                this.targetEnemy = null;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.center.x, this.center.y);

        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();

        if (this.type === 'viking') {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-8, -10); ctx.stroke(); 
            ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(8, -10); ctx.stroke(); 
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(14, -6); ctx.lineTo(14, 6); ctx.fill();
        } 
        else if (this.type === 'paladin') {
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(4, -4, 6, 8);
            ctx.strokeStyle = '#3498db'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(7, -2); ctx.lineTo(7, 2); ctx.moveTo(5, 0); ctx.lineTo(9, 0); ctx.stroke();
        } 
        else {
            ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(10, 0); ctx.stroke();
        }
        ctx.restore();
        const hpPct = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = '#0f0'; ctx.fillRect(this.center.x - 8, this.center.y - 12, 16 * hpPct, 3);
    }
}

export function drawBarrack(ctx, tower) {
    ctx.save();
    ctx.translate(tower.center.x, tower.center.y);
    
    if (tower.type === 'barracks') {
        ctx.fillStyle = '#e67e22'; ctx.fillRect(-15, -10, 30, 20);
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(20, -10); ctx.lineTo(0, -25); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '14px Arial'; ctx.fillText('🛡️', -7, 5);
    }
    else if (tower.type === 'paladin') {
        ctx.fillStyle = '#2980b9'; ctx.fillRect(-15, -10, 30, 20);
        ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(20, -10); ctx.lineTo(0, -25); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.stroke();
    }
    else if (tower.type === 'viking') {
        ctx.fillStyle = '#d35400'; ctx.fillRect(-15, -10, 30, 20); 
        ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(20, -10); ctx.lineTo(0, -25); ctx.fill(); 
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(5, -10); ctx.lineTo(10, 0); ctx.lineTo(5, 10); ctx.lineTo(-5, 10); ctx.lineTo(-10, 0); ctx.fill(); 
        ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 15); ctx.stroke(); 
        ctx.restore();
    }
    ctx.restore();
}

export function updateBarrack(tower, ctx, enemies, projectiles, SoundManager, ProjectileClass) {
    tower.soldiers = tower.soldiers.filter(s => !s.dead);
    if (tower.soldiers.length < 3) {
        tower.spawnTimer++;
        if (tower.spawnTimer >= 300) {
            const spawnPos = tower.rallyPoint || { x: tower.center.x, y: tower.center.y + 64 };
            let sType = 'basic';
            if (tower.type === 'paladin') sType = 'paladin';
            if (tower.type === 'viking') sType = 'viking';

            tower.soldiers.push(new Soldier({
                position: tower.center,
                targetPos: { x: spawnPos.x + (Math.random()-0.5)*20, y: spawnPos.y + (Math.random()-0.5)*20 },
                type: sType,
                skills: tower.skills,
                // [FIX] Truyền stats từ tháp cho lính
                stats: { hp: tower.soldierHP, dmg: tower.soldierDmg }
            }));
            tower.spawnTimer = 0;
        }
    }
    tower.soldiers.forEach(soldier => {
        soldier.update(ctx, enemies, projectiles, SoundManager, ProjectileClass); 
    });
}