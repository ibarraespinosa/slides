document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. CONFIGURATION ---
    const slidesData = [
        'content/01-intro.md',
        'content/02-layouts.md',
        'content/03-feature.md',
        'content/04-compare.md',
        'content/05-features.md',
        'content/06-thanks.md'
    ];
    
    let currentSlide = 0;
    const container = document.getElementById('presentation-container');
    const progressBar = document.getElementById('progress');

    // --- 2. LOAD CONTENT ---
    async function loadSlides() {
        for (let i = 0; i < slidesData.length; i++) {
            try {
                const response = await fetch(slidesData[i]);
                const text = await response.text();
                
                // Parse Frontmatter and Markdown
                const match = text.match(/^\s*---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
                let meta = { layout: 'centered', transition: 'blur' };
                let markdownContent = text;

                if (match) {
                    meta = jsyaml.load(match[1]);
                    markdownContent = match[2];
                }

                const slideEl = document.createElement('div');
                slideEl.className = `slide layout-${meta.layout} transition-${meta.transition}`;
                
                // Set dataset attributes for theme changes
                if (meta.accent) slideEl.dataset.accent = meta.accent;
                if (meta.bg) slideEl.dataset.bg = meta.bg;

                // Column Parsing Logic
                let finalHTML = '';
                if (meta.layout && meta.layout.includes('column')) {
                    const columns = markdownContent.split('|||');
                    const colsHTML = columns.map(col => `
                        <div class="col-content">
                            ${marked.parse(col.trim())}
                        </div>
                    `).join('');
                    
                    // 3-column gets a grid wrapper without the unified glass panel 
                    const wrapperClass = meta.layout === 'three-column' ? 'grid-wrapper' : 'glass-panel grid-wrapper';
                    finalHTML = `<div class="${wrapperClass}">${colsHTML}</div>`;
                } else {
                    finalHTML = `<div class="glass-panel content-wrapper">${marked.parse(markdownContent)}</div>`;
                }

                slideEl.innerHTML = finalHTML;
                container.appendChild(slideEl);

                // --- NEW: Navigation Dot ---
                const dot = document.createElement('div');
                dot.className = 'nav-dot';
                dot.addEventListener('click', () => {
                    currentSlide = i;
                    updateSlides();
                });
                document.getElementById('nav-dots').appendChild(dot);

                // --- NEW: Trigger MathJax to render equations on this slide ---
                if (window.MathJax) {
                    MathJax.typesetPromise([slideEl]);
                }
            } catch (e) {
                console.error(`Error loading slide ${slidesData[i]}`, e);
            }
        }
        updateSlides();
    }

    // --- 3. NAVIGATION LOGIC ---
    function updateSlides() {
        const slides = document.querySelectorAll('.slide');
        if (slides.length === 0) return;
        
        slides.forEach((slide, index) => {
            slide.classList.remove('active');
            if (index === currentSlide) {
                slide.classList.add('active');
                if (slide.dataset.accent) {
                    document.documentElement.style.setProperty('--accent', slide.dataset.accent);
                }
            }
        });

        const dots = document.querySelectorAll('.nav-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });

        progressBar.style.width = `${((currentSlide + 1) / slides.length) * 100}%`;
    }

    function goToNextSlide() {
        const slides = document.querySelectorAll('.slide');
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            updateSlides();
        }
    }

    function goToPrevSlide() {
        if (currentSlide > 0) {
            currentSlide--;
            updateSlides();
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'Space' || e.key === 'Enter') {
            goToNextSlide();
        } else if (e.key === 'ArrowLeft') {
            goToPrevSlide();
        }
    });

    // Mobile Swipe Support
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        // Only trigger if movement is primarily horizontal and exceeds threshold
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) {
                goToNextSlide(); // Swipe left -> forward
            } else {
                goToPrevSlide(); // Swipe right -> back
            }
        }
    }, { passive: true });

    // --- 4. CINEMATIC BACKGROUND ENGINE ---
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let width, height, particles;

    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        particles = [];
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1
            });
        }
    }

    let mouseX = -1000, mouseY = -1000;
    window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

    let time = 0;

    function animateBg() {
        ctx.clearRect(0, 0, width, height);
        
        const activeSlide = document.querySelector('.slide.active');
        const bgType = activeSlide && activeSlide.dataset.bg ? activeSlide.dataset.bg : 'particles';
        const currentAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        if (bgType === 'aurora') {
            time += 0.005;
            const gradient1 = ctx.createRadialGradient(
                width * 0.5 + Math.sin(time) * width * 0.3, 
                height * 0.5 + Math.cos(time * 0.8) * height * 0.3, 0, 
                width * 0.5, height * 0.5, width * 0.8
            );
            gradient1.addColorStop(0, currentAccent);
            gradient1.addColorStop(1, 'transparent');

            const gradient2 = ctx.createRadialGradient(
                width * 0.8 + Math.cos(time * 1.2) * width * 0.2, 
                height * 0.2 + Math.sin(time * 0.9) * height * 0.4, 0, 
                width * 0.8, height * 0.2, width * 0.6
            );
            gradient2.addColorStop(0, 'rgba(100, 0, 255, 0.6)'); 
            gradient2.addColorStop(1, 'transparent');

            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.4;
            
            ctx.fillStyle = gradient1; ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = gradient2; ctx.fillRect(0, 0, width, height);
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = currentAccent;
            ctx.strokeStyle = currentAccent;

            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();

                particles.forEach(p2 => {
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 120) {
                        ctx.globalAlpha = 1 - dist / 120;
                        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                    }
                });
                ctx.globalAlpha = 1;

                const mouseDist = Math.hypot(p.x - mouseX, p.y - mouseY);
                if (mouseDist < 150) {
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouseX, mouseY); ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            });
        }
        requestAnimationFrame(animateBg);
    }

    window.addEventListener('resize', initCanvas);
    initCanvas(); animateBg();
    await loadSlides();
});