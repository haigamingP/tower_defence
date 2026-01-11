export const TILE_SIZE = 64;
export const COLS = 20;
export const ROWS = 12;

export const GOLD_PER_SEC_EARLY = 2; 
export const WAVE_DELAY = 15; 

// --- 1. HỆ THỐNG CHỈ SỐ ---
export const DAMAGE_TIERS = { 
    I: 15,   
    II: 35,  
    III: 80, 
    IV: 180, 
    V: 450   
};

export const HP_TIERS = { 
    LV1: 100,    
    LV2: 350,    
    LV3: 1200,   
    LV4: 3500,   
    LV5: 12000   
};

export const SPEED_TIERS = { S1: 0.7, S2: 1.4, S3: 2.2 }; 

export const ARMOR_TYPES = { NEG: 1.10, NONE: 1.00, LOW: 0.90, MED: 0.70, HIGH: 0.40, IMMUNE: 0.00 };
export const MAGIC_RES_TYPES = { NEG: 1.10, NONE: 1.00, LOW: 0.90, MED: 0.70, HIGH: 0.40 };

// --- 2. DỮ LIỆU QUÁI VẬT ---
export const ENEMY_TYPES = {
    basic_warrior: { name: "Chiến binh", hp: HP_TIERS.LV2, speed: SPEED_TIERS.S2, damage: DAMAGE_TIERS.II, reward: 15, armor: 'LOW', magicRes: 'NONE', shape: 'circle', color: '#e74c3c' },
    basic_archer: { name: "Cung thủ", hp: HP_TIERS.LV1, speed: SPEED_TIERS.S2, damage: DAMAGE_TIERS.II, reward: 15, armor: 'NONE', magicRes: 'NONE', shape: 'triangle', color: '#27ae60' },
    basic_tanker: { name: "Đấu sĩ khiên", hp: HP_TIERS.LV3, speed: SPEED_TIERS.S1, damage: DAMAGE_TIERS.I, reward: 20, armor: 'HIGH', magicRes: 'LOW', shape: 'square', color: '#8e44ad' },
    basic_bandit: { name: "Cướp", hp: HP_TIERS.LV2, speed: SPEED_TIERS.S2, damage: DAMAGE_TIERS.III, reward: 18, armor: 'NONE', magicRes: 'LOW', shape: 'circle', color: '#e67e22' },
    giant_boss: { name: "Người Khổng Lồ", hp: HP_TIERS.LV5, speed: SPEED_TIERS.S1, damage: DAMAGE_TIERS.IV, reward: 100, armor: 'MED', magicRes: 'MED', shape: 'square', color: '#c0392b', isBoss: true },
    wolf: { name: "Sói", hp: HP_TIERS.LV2, speed: SPEED_TIERS.S3, damage: DAMAGE_TIERS.II, reward: 15, armor: 'LOW', magicRes: 'NEG', shape: 'triangle', color: '#f39c12' },
    spider: { name: "Nhện độc", hp: HP_TIERS.LV1, speed: SPEED_TIERS.S3, damage: DAMAGE_TIERS.I, reward: 12, armor: 'NONE', magicRes: 'LOW', shape: 'circle', color: '#16a085' },
    bat: { name: "Dơi", hp: HP_TIERS.LV2, speed: SPEED_TIERS.S2, damage: DAMAGE_TIERS.I, reward: 15, armor: 'NONE', magicRes: 'NEG', shape: 'triangle', color: '#34495e', flying: true },
    dragon_boss: { name: "Hỏa Long", hp: HP_TIERS.LV5, speed: SPEED_TIERS.S1, damage: DAMAGE_TIERS.V, reward: 200, armor: 'HIGH', magicRes: 'HIGH', shape: 'triangle', color: '#d35400', isBoss: true, flying: true },
    demon_warrior: { name: "Ma đấu sĩ", hp: HP_TIERS.LV3, speed: SPEED_TIERS.S2, damage: DAMAGE_TIERS.I, reward: 25, armor: 'LOW', magicRes: 'HIGH', shape: 'square', color: '#2c3e50' },
    demon_mage: { name: "Ma pháp sư", hp: HP_TIERS.LV1, speed: SPEED_TIERS.S2, damage: DAMAGE_TIERS.II, reward: 25, armor: 'NONE', magicRes: 'HIGH', shape: 'circle', color: '#9b59b6' },
    summoner_boss: { name: "Triệu hồi sư", hp: HP_TIERS.LV3, speed: SPEED_TIERS.S1, damage: DAMAGE_TIERS.III, reward: 80, armor: 'MED', magicRes: 'HIGH', shape: 'square', color: '#8e44ad', isBoss: true },
    dark_beast: { name: "Thú hắc hóa", hp: HP_TIERS.LV1, speed: SPEED_TIERS.S3, damage: DAMAGE_TIERS.I, reward: 5, armor: 'NONE', magicRes: 'LOW', shape: 'triangle', color: '#2c3e50' },
    dark_bat: { name: "Dơi hắc hóa", hp: HP_TIERS.LV2, speed: SPEED_TIERS.S2, damage: DAMAGE_TIERS.I, reward: 5, armor: 'NONE', magicRes: 'NEG', shape: 'triangle', color: '#34495e', flying: true },
    ghost: { name: "Hồn ma", hp: HP_TIERS.LV2, speed: SPEED_TIERS.S2, damage: DAMAGE_TIERS.II, reward: 20, armor: 'IMMUNE', magicRes: 'NEG', shape: 'ghost', color: 'rgba(200, 200, 255, 0.6)' }
};

// --- 3. DỮ LIỆU THÁP & KỸ NĂNG ---
export const TOWER_TYPES = {
    // --- CẤP 1-3: CƠ BẢN (Cập nhật theo tower.yaml) ---
    archer: { 
        name: "Chòi Canh", type: 'PHYSICAL', cost: 70, color: '#27ae60', projectileSpeed: 10,
        // Level 1 Stats
        range: 180, cooldown: 60, damage: DAMAGE_TIERS.I, 
        // Upgrade Stats
        levels: {
            2: { damage: DAMAGE_TIERS.II, range: 200 }, // Dmg 35
            3: { damage: DAMAGE_TIERS.III, range: 220 } // Dmg 80
        }
    },
    mage: { 
        name: "Tháp Huyền Bí", type: 'MAGIC', cost: 90, color: '#9b59b6', projectileSpeed: 7,
        // Level 1 Stats
        range: 160, cooldown: 60, damage: DAMAGE_TIERS.I,
        // Upgrade Stats
        levels: {
            2: { damage: DAMAGE_TIERS.II, range: 180 }, // Dmg 35
            3: { damage: DAMAGE_TIERS.III, range: 200 } // Dmg 80
        }
    },
    cannon: { 
        name: "Đại Bác", type: 'PHYSICAL', cost: 110, color: '#2c3e50', projectileSpeed: 5, aoe: 100,
        // Level 1 Stats (Damage Tier II)
        range: 140, cooldown: 120, damage: DAMAGE_TIERS.II, 
        // Upgrade Stats
        levels: {
            2: { damage: DAMAGE_TIERS.III, range: 160 }, // Dmg 80
            3: { damage: DAMAGE_TIERS.III, range: 180 } // Dmg 80 (Tăng range)
        }
    },
    barracks: { 
        name: "Trại Lính", type: 'BARRACKS', cost: 70, color: '#e67e22',
        // Level 1 Stats
        range: 0, cooldown: 0, damage: 0, 
        soldierHP: HP_TIERS.LV1, soldierDmg: DAMAGE_TIERS.I,
        // Upgrade Stats
        levels: {
            2: { soldierHP: HP_TIERS.LV2, soldierDmg: DAMAGE_TIERS.I }, // HP 1200, Dmg 15
            3: { soldierHP: HP_TIERS.LV3, soldierDmg: DAMAGE_TIERS.II } // HP 1200, Dmg 35
        }
    },

    // --- CẤP 4: TIẾN HÓA & KỸ NĂNG ---
    rapid_archer: { name: "Thần Tiễn", type: 'PHYSICAL', range: 4.0 * TILE_SIZE, cooldown: 20, damage: 35, cost: 400, color: '#2ecc71', projectileSpeed: 15, skills: { poison: { name: "Tên Độc", cost: 100, maxLevel: 3, desc: "Gây thêm sát thương phép" }, burn: { name: "Phóng Hỏa", cost: 100, maxLevel: 3, desc: "Gây cháy (dmg/s)" } } },
    sniper: { name: "Bắn Tỉa", type: 'PHYSICAL', range: 5.0 * TILE_SIZE, cooldown: 75, damage: DAMAGE_TIERS.IV, cost: 400, color: '#16a085', projectileSpeed: 20, skills: { crit: { name: "Chí Mạng", cost: 150, maxLevel: 3, desc: "Tỉ lệ gây x1.75 dmg" }, execute: { name: "Chấm Dứt", cost: 200, maxLevel: 3, desc: "Kết liễu quái yếu máu" } } },
    ultimate_mage: { name: "Tối Thượng", type: 'MAGIC', range: 4.0 * TILE_SIZE, cooldown: 60, damage: DAMAGE_TIERS.IV, cost: 400, color: '#8e44ad', projectileSpeed: 8, skills: { death_ray: { name: "Tia Chết", cost: 200, maxLevel: 3, desc: "Tỉ lệ kết liễu & thưởng tiền" }, teleport: { name: "Dịch Chuyển", cost: 150, maxLevel: 3, desc: "Đẩy lùi quái về sau" } } },
    hermit_mage: { name: "Ẩn Tu", type: 'MAGIC', range: 4.0 * TILE_SIZE, cooldown: 40, damage: DAMAGE_TIERS.III, cost: 400, color: '#9b59b6', projectileSpeed: 7, skills: { curse: { name: "Nguyền Rủa", cost: 150, maxLevel: 3, desc: "Giảm kháng phép kẻ địch" }, polymorph: { name: "Hóa Ếch", cost: 150, maxLevel: 3, desc: "Biến quái thành ếch vô hại" } } },
    rocket: { name: "Tên Lửa", type: 'PHYSICAL', range: 4.0 * TILE_SIZE, cooldown: 120, damage: DAMAGE_TIERS.IV, cost: 450, color: '#34495e', projectileSpeed: 4, aoe: 2.5 * TILE_SIZE, skills: { carpet_bomb: { name: "Rải Bom", cost: 200, maxLevel: 3, desc: "Rải bom dọc đường đi" }, homing: { name: "Tầm Nhiệt", cost: 200, maxLevel: 3, desc: "Tên lửa đuổi theo quái" } } },
    tesla: { name: "Tesla", type: 'PHYSICAL', range: 4.0 * TILE_SIZE, cooldown: 60, damage: DAMAGE_TIERS.II, cost: 450, color: '#f1c40f', projectileSpeed: 10, aoe: 3.0 * TILE_SIZE, skills: { shock: { name: "Sốc Điện", cost: 250, maxLevel: 3, desc: "Làm chậm và giảm máu tối đa" }, overload: { name: "Quá Tải", cost: 250, maxLevel: 3, desc: "Giật sét lan truyền" } } },
    paladin: { name: "Hiệp Sĩ", type: 'BARRACKS', range: 0, cooldown: 0, damage: 0, cost: 230, color: '#f39c12', soldierHP: HP_TIERS.LV4, soldierDmg: DAMAGE_TIERS.II, soldierArmor: 'HIGH', skills: { heal: { name: "Hồi Máu", cost: 200, maxLevel: 3, desc: "Lính tự hồi phục máu" }, reflect: { name: "Phản Đòn", cost: 150, maxLevel: 3, desc: "Phản lại sát thương" } } },
    viking: { name: "Viking", type: 'BARRACKS', range: 0, cooldown: 0, damage: 0, cost: 230, color: '#d35400', soldierHP: HP_TIERS.LV3, soldierDmg: DAMAGE_TIERS.III, soldierArmor: 'MED', skills: { axe: { name: "Ném Rìu", cost: 150, maxLevel: 3, desc: "Tấn công tầm xa" }, rage: { name: "Cuồng Nộ", cost: 200, maxLevel: 3, desc: "Tăng tốc đánh khi máu thấp" } } }
};