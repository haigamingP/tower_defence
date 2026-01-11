export class Particle {
    constructor({ position, velocity, color, life = 1.0, type = 'circle' }) {
        this.position = { ...position };
        this.velocity = velocity;
        this.color = color;
        this.radius = type === 'ring' ? 1 : (Math.random() * 3 + 1);
        this.alpha = 1;
        this.lifeDecay = 0.03 / life;
        this.type = type;
        this.finished = false;
    }
    
    update(ctx) {
        this.draw(ctx);
        if (this.type === 'ring') { 
            this.radius += 1; 
            this.alpha -= 0.05; 
        } else { 
            this.position.x += this.velocity.x; 
            this.position.y += this.velocity.y; 
            this.alpha -= this.lifeDecay; 
        }
        if (this.alpha <= 0) this.finished = true;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        if (this.type === 'ring') { 
            ctx.beginPath(); 
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2); 
            ctx.strokeStyle = this.color; 
            ctx.lineWidth = 2; 
            ctx.stroke(); 
        } else { 
            ctx.beginPath(); 
            ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2); 
            ctx.fillStyle = this.color; 
            ctx.fill(); 
        }
        ctx.restore();
    }
}