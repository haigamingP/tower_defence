export function drawArcher(ctx, tower) {
    ctx.save();
    ctx.translate(tower.center.x, tower.center.y);
    
    if (tower.type === 'archer') {
        // Tháp gỗ cơ bản
        ctx.fillStyle = '#d35400'; ctx.fillRect(-15, -15, 30, 30);
        if (tower.target) tower.rotation = Math.atan2(tower.target.center.y - tower.center.y, tower.target.center.x - tower.center.x);
        ctx.rotate(tower.rotation);
        ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, 0, 8, -Math.PI/2, Math.PI/2); ctx.stroke();
    } 
    else if (tower.type === 'rapid_archer') {
        // Thần Tiễn
        ctx.fillStyle = '#e67e22'; ctx.fillRect(-15, -15, 30, 30);
        if (tower.target) tower.rotation = Math.atan2(tower.target.center.y - tower.center.y, tower.target.center.x - tower.center.x);
        ctx.rotate(tower.rotation);
        
        // Visual Level 4: Có thêm hào quang
        if (Object.values(tower.skills).some(lvl => lvl >= 4)) {
            ctx.shadowBlur = 10; ctx.shadowColor = '#2ecc71';
        }

        ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.stroke();
        
        // 2 Cung
        ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.arc(10, -5, 8, -Math.PI/2, Math.PI/2); ctx.stroke();
        ctx.beginPath(); ctx.arc(10, 5, 8, -Math.PI/2, Math.PI/2); ctx.stroke();
    }
    else if (tower.type === 'sniper') {
        // Bắn Tỉa
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(-15, -15, 30, 30);
        if (tower.target) tower.rotation = Math.atan2(tower.target.center.y - tower.center.y, tower.target.center.x - tower.center.x);
        ctx.rotate(tower.rotation);
        
        // Visual Level 4: Ống ngắm phát sáng
        const isMastery = Object.values(tower.skills).some(lvl => lvl >= 4);
        
        ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(0, -3, 35, 6); 
        ctx.fillStyle = isMastery ? '#e74c3c' : '#c0392b'; 
        if (isMastery) { ctx.shadowBlur = 10; ctx.shadowColor = 'red'; }
        ctx.fillRect(10, -5, 8, 3);
        ctx.shadowBlur = 0;
    }
    ctx.restore();
}

export function updateArcher(tower, ctx, enemies, gameParticles, { Projectile, SoundManager }) {
    tower.target = null;
    
    // Tìm mục tiêu: Sniper ưu tiên quái ít máu (để execute) hoặc Boss
    const validEnemies = enemies.filter(enemy => {
        const dist = Math.hypot(enemy.center.x - tower.center.x, enemy.center.y - tower.center.y);
        return dist < tower.range && !enemy.dead && !enemy.finished;
    });

    if (validEnemies.length > 0) {
        if (tower.type === 'sniper' && tower.skills.execute > 0) {
            // Sniper ưu tiên bắn quái yếu máu nhất để kích hoạt Execute
            validEnemies.sort((a, b) => (a.health / a.maxHealth) - (b.health / b.maxHealth));
        }
        tower.target = validEnemies[0]; 
    }

    tower.timer++;
    if (tower.timer >= tower.cooldown && tower.target) {
        SoundManager.playShoot('arrow');
        
        // --- CẤU HÌNH KỸ NĂNG (Dựa trên Level) ---
        const projData = {
            damage: tower.damage,
            statusEffects: [],
            special: {} // Chứa các flag đặc biệt như ignoreArmor, execute
        };

        // 1. RAPID ARCHER SKILLS
        if (tower.type === 'rapid_archer') {
            // Poison Arrow (Tên Độc)
            const pLvl = tower.skills['poison'] || 0;
            if (pLvl > 0) {
                const bonusDmg = (pLvl >= 4) ? 25 : (pLvl * 5 + 5); // Lv4: 25, Lv3: 15
                const maxStacks = (pLvl >= 4) ? 3 : 1; // Lv4: Stack 3 lần
                
                // Gây sát thương phép ngay khi chạm (giả lập độc thấm) hoặc dùng status
                // Ở đây ta dùng cơ chế status POISON trong enemies.js
                projData.statusEffects.push({
                    type: 'POISON',
                    duration: 180, // 3s
                    damage: 2, // Dmg mỗi tick (nhỏ)
                    bonusMagicDmg: bonusDmg, // Sát thương phép cộng thêm khi trúng
                    stackLimit: maxStacks
                });
            }

            // Burning Shot (Phóng Hỏa)
            const bLvl = tower.skills['burn'] || 0;
            if (bLvl > 0) {
                const chance = (bLvl >= 4) ? 0.25 : 0.20;
                if (Math.random() < chance) {
                    const duration = (bLvl >= 4) ? 300 : 180; // Lv4: 5s, Lv3: 3s
                    projData.statusEffects.push({
                        type: 'BURN',
                        duration: duration,
                        damage: 3 // Dmg đốt
                    });
                }
            }
        }

        // 2. SNIPER SKILLS
        if (tower.type === 'sniper') {
            // Critical Shot (Chí Mạng)
            const cLvl = tower.skills['crit'] || 0;
            if (cLvl > 0) {
                const chance = (cLvl >= 4) ? 0.30 : (0.15 + cLvl * 0.05); // Lv4: 30%
                const mult = (cLvl >= 4) ? 2.0 : 1.75;
                const ignoreArmor = (cLvl >= 4) ? 0.5 : 0.0; // Lv4: Xuyên 50% giáp

                if (Math.random() < chance) {
                    projData.damage *= mult;
                    projData.special.isCrit = true;
                    projData.special.ignoreArmorPct = ignoreArmor;
                }
            }

            // Execute (Chấm Dứt)
            const eLvl = tower.skills['execute'] || 0;
            if (eLvl > 0) {
                const threshold = (eLvl >= 4) ? 0.20 : (0.07 + (eLvl-1)*0.05); // Lv4: 20%, Lv3: 15%
                projData.special.executeThreshold = threshold;
                // Lv4: Reset cooldown nếu giết được (Logic này sẽ xử lý ở Projectile callback nếu có, 
                // nhưng do cấu trúc hiện tại Projectile chạy độc lập, ta sẽ xử lý giả lập:
                // Nếu mục tiêu thấp máu, bắn nhanh hơn chút ở phát sau hoặc Projectile trả về kết quả kill)
                // *Để đơn giản cho cấu trúc hiện tại*: Ta gán callback vào Projectile
                if (eLvl >= 4) {
                    projData.onKill = () => { tower.timer = tower.cooldown; }; // Hồi chiêu ngay
                }
            }
        }

        // Tạo đạn với dữ liệu mới
        tower.projectiles.push(new Projectile({
            position: { x: tower.center.x, y: tower.center.y },
            target: tower.target,
            speed: tower.projectileSpeed,
            damage: projData.damage,
            type: tower.damageType,
            color: 'white',
            gameParticles: gameParticles,
            // Truyền mảng status và special flags
            statusEffects: projData.statusEffects, 
            special: projData.special,
            onKill: projData.onKill
        }));
        
        tower.timer = 0;
    }
}