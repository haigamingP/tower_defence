export function drawWizard(ctx, tower) {
    ctx.save();
    ctx.translate(tower.center.x, tower.center.y);
    
    if (tower.type === 'mage') {
        // Pháp sư thường: Mũ xanh
        ctx.fillStyle = '#3498db'; 
        ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(10, 10); ctx.lineTo(0, -15); ctx.fill(); 
        // Ngọc
        ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(0, -20, 5, 0, Math.PI*2); ctx.fill();
    }
    else if (tower.type === 'ultimate_mage') {
        // Tối thượng: Màu tím huyền bí
        ctx.fillStyle = '#8e44ad'; 
        ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(12, 12); ctx.lineTo(0, -22); ctx.fill();
        // Ngọc tím phát sáng (Pulse effect)
        const pulse = Math.sin(Date.now() / 200) * 3;
        ctx.fillStyle = '#e056fd'; ctx.beginPath(); ctx.arc(0, -28, 6 + pulse, 0, Math.PI*2); ctx.fill();
        ctx.shadowColor = '#e056fd'; ctx.shadowBlur = 15; ctx.stroke(); ctx.shadowBlur = 0;
    }
    else if (tower.type === 'hermit_mage') {
        // Ẩn tu: Màu cam đất
        ctx.fillStyle = '#d35400'; 
        ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(12, 12); ctx.lineTo(0, -18); ctx.fill(); 
        // Ngọc vàng
        ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, -24, 7, 0, Math.PI*2); ctx.fill(); 
    }
    ctx.restore();
}

export function updateWizard(tower, ctx, enemies, gameParticles, { Projectile, SoundManager }) {
    // --- [FIX] THÊM LOGIC TÌM MỤC TIÊU ---
    tower.target = null;
    const validEnemies = enemies.filter(enemy => {
        const dist = Math.hypot(enemy.center.x - tower.center.x, enemy.center.y - tower.center.y);
        return dist < tower.range && !enemy.dead && !enemy.finished;
    });

    if (validEnemies.length > 0) {
        tower.target = validEnemies[0];
    }
    // -------------------------------------

    tower.timer++;
    if (tower.timer >= tower.cooldown && tower.target) {
        SoundManager.playShoot('magic'); // Sử dụng âm thanh magic
        
        let effect = null;
        // Skill Ẩn Tu: Nguyền rủa (giả lập bằng Slow mạnh + Đổi màu tím trong Enemy update)
        if (tower.type === 'hermit_mage') {
            if (tower.skills['curse'] > 0) { 
                effect = { type: 'SLOW', duration: 120, value: 0.6 }; // Curse cũng làm chậm
            } else { 
                effect = { type: 'SLOW', duration: 120, value: 0.8 }; 
            }
        }

        tower.projectiles.push(new Projectile({
            position: { x: tower.center.x, y: tower.center.y },
            target: tower.target,
            speed: tower.projectileSpeed,
            damage: tower.damage,
            type: tower.damageType,
            color: '#8e44ad',
            gameParticles: gameParticles,
            statusEffect: effect,
            towerSkills: tower.skills 
        }));
        tower.timer = 0;
    }
}