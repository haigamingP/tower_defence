import { TILE_SIZE, ENEMY_TYPES, ARMOR_TYPES, MAGIC_RES_TYPES } from '../constants.js';

export class Enemy {
    constructor({ position = { x: 0, y: 0 }, type = 'basic_warrior', waypoints = [] }) {
        const data = ENEMY_TYPES[type];
        this.position = position;
        this.width = TILE_SIZE * 0.4;
        this.height = TILE_SIZE * 0.4;
        this.waypoints = waypoints; 
        this.waypointIndex = 0;
        this.center = { x: this.position.x + TILE_SIZE/2, y: this.position.y + TILE_SIZE/2 };
        
        this.radius = 14; 
        this.shape = data.shape || 'circle';
        this.color = data.color || 'red';
        this.baseColor = data.color || 'red';
        this.type = type; 
        this.isBoss = data.isBoss || false;
        
        // [FIX] Thêm thuộc tính bay
        this.flying = data.flying || false;
        
        this.name = data.name;
        this.health = data.hp;
        this.maxHealth = data.hp;
        this.baseSpeed = data.speed;
        this.speed = data.speed;
        this.reward = data.reward;
        this.armor = data.armor;
        this.magicRes = data.magicRes;
        this.damage = data.damage || 10; 

        this.attackSpeed = 60;
        this.attackTimer = 0;
        this.blockedBy = null;
        
        this.statuses = [];
        this.finished = false;
        this.dead = false;
        this.animFrame = 0;
    }

    // [UPDATE] Thêm tham số ignoreArmorPct (0.0 -> 1.0)
    takeDamage(amount, type, ignoreArmorPct = 0) {
        if (type === 'TRUE') { // Sát thương chuẩn (Execute)
            this.health -= amount;
        } else {
            let multiplier = 1.0;
            
            if (type === 'PHYSICAL') {
                let armorVal = ARMOR_TYPES[this.armor];
                // Logic xuyên giáp: Giảm hiệu quả của giáp
                // Ví dụ: Giáp HIGH (0.5), ignore 50% => Giáp mới = 0.5 + (1.0 - 0.5)*0.5 = 0.75
                if (ignoreArmorPct > 0 && armorVal < 1.0) {
                    armorVal = armorVal + (1.0 - armorVal) * ignoreArmorPct;
                }
                multiplier = armorVal;
            }
            
            if (type === 'MAGIC') multiplier = MAGIC_RES_TYPES[this.magicRes];
            
            if (this.type === 'dragon_boss' || this.type === 'giant_boss') { multiplier *= 0.8; }
            if (this.statuses.find(s => s.type === 'CURSE')) { multiplier *= 1.3; }

            this.health -= amount * multiplier;
        }

        let isKilled = false;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            isKilled = true;
            if (this.blockedBy) {
                this.blockedBy.targetEnemy = null;
                this.blockedBy.state = 'IDLE';
                this.blockedBy = null;
            }
        }
        return isKilled;
    }

    applyStatus(effect) {
        if (!effect) return;
        // Boss Rồng kháng Cháy, Biến hình, Choáng -> NHƯNG KHÁNG ĐỘC (POISON) YẾU HƠN
        if (this.type === 'dragon_boss' && (effect.type === 'BURN' || effect.type === 'POLYMORPH' || effect.type === 'STUN')) return;
        if (this.type === 'giant_boss' && (effect.type === 'POLYMORPH' || effect.type === 'STUN')) return;

        // [UPDATE] Logic cộng dồn cho POISON (Thần Tiễn Lv4)
        if (effect.type === 'POISON' && effect.stackLimit > 1) {
            // Tìm các stack poison hiện có
            const poisons = this.statuses.filter(s => s.type === 'POISON');
            if (poisons.length < effect.stackLimit) {
                // Chưa đủ stack -> Thêm mới
                this.statuses.push({ ...effect });
            } else {
                // Đã full stack -> Làm mới thời gian của stack cũ nhất
                poisons.forEach(p => p.duration = effect.duration);
            }
            return;
        }

        const existing = this.statuses.find(s => s.type === effect.type);
        if (existing) {
            existing.duration = effect.duration;
        } else {
            this.statuses.push({ ...effect });
        }
    }

    updateStatuses() {
        this.speed = this.baseSpeed;
        this.color = this.baseColor;
        let canMove = true;

        // Reset màu boss nếu không bị status (để tránh bị kẹt màu)
        if (this.type === 'dragon_boss') this.color = '#c0392b';

        for (let i = this.statuses.length - 1; i >= 0; i--) {
            const status = this.statuses[i];
            status.duration--;

            if (status.type === 'SLOW') { 
                this.speed *= status.value; 
                this.color = '#3498db'; 
            }
            else if (status.type === 'BURN') { 
                // [FIX] Neft Cháy: Chỉ gây damage mỗi 18 frame (~0.3s)
                if (status.duration % 18 === 0) {
                    this.health -= status.damage;
                    if (this.health <= 0) this.dead = true; 
                }
                this.color = '#e67e22'; 
            }
            else if (status.type === 'POISON') { 
                // [FIX] Neft Độc: Chỉ gây damage mỗi 40 frame (~0.66s)
                if (status.duration % 40 === 0) {
                    this.health -= status.damage; 
                    if (this.health <= 0) this.dead = true; 
                }
                // Boss Rồng nếu dính độc sẽ đổi sang màu hơi xanh
                if (this.type === 'dragon_boss') {
                    this.color = '#55a630'; 
                } else {
                    this.color = '#2ecc71'; 
                }
            }
            else if (status.type === 'STUN') { 
                this.speed = 0; 
                canMove = false; 
                this.color = '#f1c40f'; 
            }
            else if (status.type === 'POLYMORPH') { 
                this.speed *= 0.5; 
                this.color = '#fff'; 
            }
            else if (status.type === 'CURSE') { 
                this.color = '#9b59b6'; 
            }

            if (status.duration <= 0) { this.statuses.splice(i, 1); }
        }
        return canMove;
    }

    draw(ctx) {
        this.animFrame++;
        
        let drawColor = this.color; 
        
        ctx.save();
        ctx.translate(this.center.x, this.center.y);
        const bounce = Math.sin(this.animFrame * 0.2) * 2;

        if (this.type === 'dragon_boss') {
            const mainColor = (this.color !== this.baseColor && this.color !== '#c0392b') ? this.color : '#c0392b';
            const secondColor = (this.color !== this.baseColor && this.color !== '#c0392b') ? '#fff' : '#e74c3c';

            ctx.fillStyle = mainColor; ctx.beginPath(); ctx.ellipse(0, 0 + bounce, 16, 25, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = secondColor; ctx.beginPath(); ctx.moveTo(-10, -5+bounce); ctx.lineTo(-35, -20+bounce); ctx.lineTo(-10, 10+bounce); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, -5+bounce); ctx.lineTo(35, -20+bounce); ctx.lineTo(10, 10+bounce); ctx.fill();
            ctx.fillStyle = mainColor; ctx.beginPath(); ctx.arc(0, -22+bounce, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(-4, -24+bounce, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, -24+bounce, 2, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'giant_boss') {
            ctx.fillStyle = this.color; 
            if (this.color === this.baseColor) ctx.fillStyle = '#7f8c8d'; 
            
            ctx.fillRect(-20, -20+bounce, 40, 40); ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 3; ctx.strokeRect(-20, -20+bounce, 40, 40); ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(0, -10+bounce, 5, 0, Math.PI*2); ctx.fill();
        } else if (this.shape === 'square' || this.type.includes('tanker')) {
            ctx.fillStyle = this.color;
            ctx.fillRect(-12, -12 + bounce, 24, 24); ctx.fillStyle = '#bdc3c7'; ctx.fillRect(-14, 0+bounce, 8, 12);
        } else if (this.shape === 'triangle' || this.type.includes('wolf') || this.type.includes('bat')) {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.moveTo(0, 12+bounce); ctx.lineTo(-10, -8+bounce); ctx.lineTo(10, -8+bounce); ctx.fill();
            // [FIX] Vẽ thêm chi tiết cho Dơi
            if (this.type.includes('bat')) { 
                ctx.fillStyle = '#2c3e50'; 
                ctx.beginPath(); ctx.ellipse(-10, -5+bounce, 10, 4, 0.5, 0, Math.PI*2); ctx.fill(); 
                ctx.beginPath(); ctx.ellipse(10, -5+bounce, 10, 4, -0.5, 0, Math.PI*2); ctx.fill(); 
            }
        } else if (this.shape === 'ghost') {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, -5+bounce, 12, Math.PI, 0); ctx.lineTo(12, 10+bounce); ctx.lineTo(0, 5+bounce); ctx.lineTo(-12, 10+bounce); ctx.fill(); ctx.globalAlpha = 1.0;
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, 0 + bounce, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(0, -5+bounce, 10, Math.PI, 0); ctx.fill();
        }
        ctx.restore();

        const hpBarW = 24; const hpBarH = 4; const hpX = this.center.x - hpBarW / 2; const hpY = this.center.y - this.radius - 12;
        ctx.fillStyle = '#333'; ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
        const hpPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : (hpPercent > 0.25 ? '#f1c40f' : '#e74c3c');
        ctx.fillRect(hpX, hpY, hpBarW * hpPercent, hpBarH);
    }
    
    update(ctx) {
        const canMove = this.updateStatuses();
        this.draw(ctx);
        if (this.finished || this.dead) return;

        if (this.blockedBy && !this.blockedBy.dead) {
            if (!canMove || this.statuses.find(s => s.type === 'POLYMORPH')) return;
            this.attackTimer++;
            if (this.attackTimer >= this.attackSpeed) { this.blockedBy.takeDamage(this.damage); this.attackTimer = 0; }
            return;
        }
        
        if (!canMove) return;

        if (this.waypointIndex >= this.waypoints.length) return;
        const waypoint = this.waypoints[this.waypointIndex];
        const targetX = waypoint.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = waypoint.y * TILE_SIZE + TILE_SIZE / 2;
        const xDist = targetX - this.center.x;
        const yDist = targetY - this.center.y;
        const distance = Math.hypot(xDist, yDist);
        if (distance < this.speed) {
            this.center.x = targetX; this.center.y = targetY;
            if (this.waypointIndex < this.waypoints.length - 1) { this.waypointIndex++; } else { this.finished = true; }
        } else {
            const angle = Math.atan2(yDist, xDist);
            this.center.x += Math.cos(angle) * this.speed;
            this.center.y += Math.sin(angle) * this.speed;
        }
    }
}