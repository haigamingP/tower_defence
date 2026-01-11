export const SoundManager = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    
    // Hàm này giúp kích hoạt lại AudioContext nếu bị trình duyệt chặn (Autoplay policy)
    resumeContext() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.error(e));
        }
    },

    playShoot(type) { 
        this.resumeContext();
        try { 
            const osc = this.ctx.createOscillator(); 
            const gain = this.ctx.createGain(); 
            osc.connect(gain); 
            gain.connect(this.ctx.destination); 
            const now = this.ctx.currentTime; 
            
            if (type === 'cannon') { 
                // Tiếng đại bác (Trầm, giảm nhanh)
                osc.type = 'square'; 
                osc.frequency.setValueAtTime(120, now); 
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.3); 
                gain.gain.setValueAtTime(0.2, now); 
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); 
                osc.start(); 
                osc.stop(now + 0.3); 
            } else if (type === 'melee') { 
                // Tiếng chém (Sắc bén)
                osc.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(150, now); 
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1); 
                gain.gain.setValueAtTime(0.1, now); 
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); 
                osc.start(); 
                osc.stop(now + 0.1); 
            } else if (type === 'magic') { 
                // Tiếng phép (Cao, ngân vang)
                osc.type = 'sine'; 
                osc.frequency.setValueAtTime(400, now); 
                osc.frequency.linearRampToValueAtTime(800, now + 0.2); 
                gain.gain.setValueAtTime(0.1, now); 
                gain.gain.linearRampToValueAtTime(0, now + 0.2); 
                osc.start(); 
                osc.stop(now + 0.2); 
            } else if (type === 'teleport') { 
                // Tiếng dịch chuyển
                osc.type = 'sine'; 
                osc.frequency.setValueAtTime(800, now); 
                osc.frequency.linearRampToValueAtTime(200, now + 0.3); 
                gain.gain.setValueAtTime(0.2, now); 
                gain.gain.linearRampToValueAtTime(0, now + 0.3); 
                osc.start(); 
                osc.stop(now + 0.3); 
            } else if (type === 'arrow') { 
                // Tiếng tên bắn (Nhanh, nhẹ)
                osc.type = 'triangle'; 
                osc.frequency.setValueAtTime(600, now); 
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.15); 
                gain.gain.setValueAtTime(0.1, now); 
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); 
                osc.start(); 
                osc.stop(now + 0.15); 
            } else {
                // Mặc định
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                osc.start();
                osc.stop(now + 0.1);
            }
        } catch(e) {} 
    },

    playExplosion() { 
        this.resumeContext();
        try { 
            const osc = this.ctx.createOscillator(); 
            const gain = this.ctx.createGain(); 
            osc.connect(gain); 
            gain.connect(this.ctx.destination); 
            const now = this.ctx.currentTime; 
            osc.type = 'sawtooth'; 
            osc.frequency.setValueAtTime(100, now); 
            osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5); 
            gain.gain.setValueAtTime(0.3, now); 
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5); 
            osc.start(); 
            osc.stop(now + 0.5); 
        } catch(e) {} 
    },

    playMeteorFall() { 
        this.resumeContext();
        try { 
            const osc = this.ctx.createOscillator(); 
            const gain = this.ctx.createGain(); 
            osc.connect(gain); 
            gain.connect(this.ctx.destination); 
            const now = this.ctx.currentTime; 
            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(800, now); 
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.8); 
            gain.gain.setValueAtTime(0.3, now); 
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8); 
            osc.start(); 
            osc.stop(now + 0.8); 
        } catch(e) {} 
    }
};