export function drawBomber(ctx, tower) {
    ctx.save();
    ctx.translate(tower.center.x, tower.center.y);
    
    if (tower.type === 'cannon') {
        // Đại bác thường
        ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        if (tower.target) tower.rotation = Math.atan2(tower.target.center.y - tower.center.y, tower.target.center.x - tower.center.x);
        ctx.rotate(tower.rotation);
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, -8, 22, 16); 
    }
    else if (tower.type === 'rocket') {
        // Tên lửa: Bệ phóng + Tên lửa
        ctx.fillStyle = '#34495e'; ctx.fillRect(-14, -14, 28, 28);
        if (tower.target) tower.rotation = Math.atan2(tower.target.center.y - tower.center.y, tower.target.center.x - tower.center.x);
        ctx.rotate(tower.rotation);
        // Vẽ đầu tên lửa
        ctx.fillStyle = '#c0392b';
        ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(25, 0); ctx.lineTo(5, 8); ctx.fill(); 
        ctx.fillStyle = '#95a5a6'; ctx.fillRect(0, -3, 10, 6); 
    }
    else if (tower.type === 'tesla') {
        // Tesla: Tháp điện
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(-10, -10, 20, 20); 
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(-4, -25, 8, 30); 
        ctx.beginPath(); ctx.arc(0, -25, 10, 0, Math.PI*2); ctx.fill(); 
        ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -25, 14, 0, Math.PI*2); ctx.stroke();
        if (Math.random() > 0.5) { // Hiệu ứng tia sét ngẫu nhiên
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(Math.random()*30-15, Math.random()*30-40); ctx.stroke();
        }
    }
    ctx.restore();
}

export function updateBomber(tower, ctx, enemies, gameParticles, { Projectile, SoundManager }) {
    // Skill Rocket: Carpet Bomb (Rải bom)
    if (tower.type === 'rocket' && tower.skills.carpet_bomb > 0) {
        tower.specialSkillTimer = (tower.specialSkillTimer || 0) + 1;
        if (tower.specialSkillTimer >= 300) {
            // Rải 3 quả bom ngẫu nhiên
            for(let k=0; k<3; k++) {
                setTimeout(() => {
                    tower.projectiles.push(new Projectile({
                        position: tower.center,
                        target: { center: { x: tower.center.x + (Math.random()-0.5)*200, y: tower.center.y + (Math.random()-0.5)*200 }, radius: 10, dead: false }, // Fake target
                        speed: 5, damage: 100, type: 'PHYSICAL', color: 'black', aoe: 80, gameParticles: gameParticles
                    }));
                }, k*200);
            }
            tower.specialSkillTimer = 0;
        }
    }

    tower.target = null;
    const validEnemies = enemies.filter(enemy => {
        const dist = Math.hypot(enemy.center.x - tower.center.x, enemy.center.y - tower.center.y);
        
        // [FIX] Cannon và Rocket không thể tấn công đơn vị bay
        if ((tower.type === 'cannon' || tower.type === 'rocket') && enemy.flying) {
            return false;
        }

        return dist < tower.range && !enemy.dead && !enemy.finished;
    });
    
    if (validEnemies.length > 0) tower.target = validEnemies[0];

    tower.timer++;
    if (tower.timer >= tower.cooldown && tower.target) {
        SoundManager.playShoot('cannon');
        
        let effect = null;
        if (tower.type === 'tesla' && tower.skills['shock'] > 0) {
             effect = { type: 'SLOW', duration: 120, value: 0.7 };
        }

        tower.projectiles.push(new Projectile({
            position: { x: tower.center.x, y: tower.center.y },
            target: tower.target,
            speed: tower.projectileSpeed,
            damage: tower.damage,
            type: tower.damageType,
            color: 'black',
            aoe: tower.aoe,
            gameParticles: gameParticles,
            statusEffect: effect,
            towerSkills: tower.skills
        }));
        tower.timer = 0;
    }
}