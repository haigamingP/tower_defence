import { ARMOR_TYPES } from '../constants.js';
import { SoundManager } from './soundManager.js';
import { Particle } from './particle.js';

export class Hero {
    constructor({ position, data }) {
        this.position = { ...position };
        this.targetPos = { ...position };
        this.center = { x: position.x, y: position.y };
        this.radius = 12;
        this.color = '#00ffff'; 
        this.name = data.name;
        this.health = data.hp;
        this.maxHealth = data.hp;
        this.damage = data.damage;
        this.armor = data.armor;
        this.magicRes = data.magicRes;
        this.speed = data.speed * 1.5; 
        this.range = data.range;
        this.respawnTimeMax = data.respawnTime * 60; 
        this.skillData = data.skill;
        this.skillCooldownMax = data.skill.cooldown * 60; 
        this.skillTimer = 0; 
        this.state = 'IDLE';
        this.targetEnemy = null;
        this.dead = false;
        this.respawnTimer = 0;
        this.attackTimer = 0;
        this.attackSpeed = 50; 
        this.animFrame = 0;
    }

    move(target) {
        if (this.dead) return;
        this.targetPos = target;
        this.state = 'MOVING';
        this.targetEnemy = null; 
        if (this.targetEnemy && this.targetEnemy.blockedBy === this) { 
            this.targetEnemy.blockedBy = null; 
        }
    }

    activateSkill(enemies, gameParticles) {
        if (this.dead || this.skillTimer > 0) return false;
        this.skillTimer = this.skillCooldownMax;
        
        if (this.skillData.id === 'ground_slam') {
            SoundManager.playExplosion();
            
            for(let i=0; i<20; i++) {
                gameParticles.push(new Particle({ 
                    position: {x: this.center.x, y: this.center.y}, 
                    velocity: {x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10}, 
                    color: '#00ffff' 
                }));
            }
            
            enemies.forEach(enemy => {
                const dist = Math.hypot(enemy.center.x - this.center.x, enemy.center.y - this.center.y);
                if (dist < this.skillData.range && !enemy.dead && !enemy.finished) {
                    enemy.takeDamage(this.skillData.damage, 'PHYSICAL');
                    enemy.applyStatus({ type: 'STUN', duration: this.skillData.effectDuration });
                }
            });
        } 
        return true;
    }

    takeDamage(amount, type) {
        let multiplier = ARMOR_TYPES[this.armor] || 1.0;
        this.health -= amount * multiplier;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            this.respawnTimer = this.respawnTimeMax;
            if (this.targetEnemy) { 
                this.targetEnemy.blockedBy = null; 
                this.targetEnemy = null; 
            }
        }
    }

    update(ctx, enemies) {
        if (this.skillTimer > 0) this.skillTimer--;
        
        if (this.dead) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) { 
                this.dead = false; 
                this.health = this.maxHealth; 
                this.state = 'IDLE'; 
            }
            this.draw(ctx); 
            return;
        }

        if (this.state !== 'FIGHTING') {
            const dx = this.targetPos.x - this.center.x;
            const dy = this.targetPos.y - this.center.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 3) {
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
            if (this.state !== 'MOVING') this.state = 'IDLE';
            for (const enemy of enemies) {
                if (!enemy.dead && !enemy.finished) {
                    const dist = Math.hypot(enemy.center.x - this.center.x, enemy.center.y - this.center.y);
                    if (dist < this.range + 20) { 
                        this.targetEnemy = enemy;
                        if (!enemy.blockedBy) { enemy.blockedBy = this; }
                        this.state = 'FIGHTING';
                        break;
                    }
                }
            }
        }

        if (this.state === 'FIGHTING' && this.targetEnemy) {
            this.attackTimer++;
            if (this.attackTimer >= this.attackSpeed) {
                SoundManager.playShoot('melee');
                this.targetEnemy.takeDamage(this.damage, 'PHYSICAL');
                this.attackTimer = 0;
            }
            
            // [FIX ERROR] Kiểm tra nếu quái chết sau đòn đánh
            if (!this.targetEnemy || this.targetEnemy.dead) {
                this.targetEnemy = null;
                this.state = 'IDLE';
            } else {
                // Chỉ tính toán khoảng cách khi quái còn sống
                const dist = Math.hypot(this.targetEnemy.center.x - this.center.x, this.targetEnemy.center.y - this.center.y);
                if (dist > this.range + 30) {
                    if (this.targetEnemy.blockedBy === this) this.targetEnemy.blockedBy = null;
                    this.targetEnemy = null;
                    this.state = 'IDLE';
                }
            }
        }
        this.draw(ctx);
    }

    draw(ctx) {
        this.animFrame++;
        const bounce = Math.sin(this.animFrame * 0.1) * 3;
        
        if (this.dead) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.arc(this.center.x, this.center.y, 15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.fillText(Math.ceil(this.respawnTimer / 60), this.center.x - 5, this.center.y + 5);
            return;
        }

        ctx.save();
        ctx.translate(this.center.x, this.center.y);
        if (this.skillTimer <= 0) {
            ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${Math.abs(Math.sin(this.animFrame*0.05))})`;
            ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -15 + bounce); ctx.lineTo(10, 0 + bounce); ctx.lineTo(0, 15 + bounce); ctx.lineTo(-10, 0 + bounce);
        ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        
        const hpPct = this.health / this.maxHealth;
        const hpW = 30;
        ctx.fillStyle = '#333'; ctx.fillRect(this.center.x - hpW/2, this.center.y - 25, hpW, 5);
        ctx.fillStyle = '#0ff'; ctx.fillRect(this.center.x - hpW/2, this.center.y - 25, hpW * hpPct, 5);
    }
}