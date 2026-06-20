
        const debugDiv = document.getElementById('audioDebug');

        let careerGoals = parseInt(localStorage.getItem('wc_career_goals')) || 0;
        let highStreak = parseInt(localStorage.getItem('wc_high_streak')) || 0;
        let activeBallStyle = localStorage.getItem('wc_active_ball') || 'Classic Pentagons';

        document.getElementById('careerCounter').innerText = careerGoals;

        function changeScreen(targetId) {
            const screens = ['splashScreen', 'selectorScreen', 'lockerScreen', 'continueScreen', 'gameOverScreen'];
            screens.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = (id === targetId) ? 'flex' : 'none';
            });
            
            if (targetId === 'splashScreen' || targetId === 'selectorScreen' || targetId === 'lockerScreen') {
                document.getElementById('arcadeHUD').style.display = 'none';
                document.getElementById('p1Board').style.display = 'none';
                document.getElementById('p2Board').style.display = 'none';
                document.getElementById('turnIndicator').style.display = 'none';
                document.getElementById('instructions').style.display = 'none';
            }
        }

        const SoundFX = {
            ctx: null, bgAudio: null,
            init() {
                if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                if (!this.bgAudio) {
                    this.bgAudio = document.getElementById('bgMusic');
                    this.bgAudio.volume = 0.4; 
                    this.bgAudio.addEventListener('playing', () => debugDiv.innerText = "Audio Status: Playing bgm.mp3");
                }
                if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            },
            startMusic() { this.init(); let p = this.bgAudio.play(); if(p!==undefined) p.catch(e=>{}); },
            stopMusic() { if(this.bgAudio) { this.bgAudio.pause(); this.bgAudio.currentTime = 0; } },
            playKick() {
                this.init(); let osc = this.ctx.createOscillator(); let gain = this.ctx.createGain();
                osc.connect(gain); gain.connect(this.ctx.destination); osc.type = 'sine';
                osc.frequency.setValueAtTime(140, this.ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.5, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
                osc.start(); osc.stop(this.ctx.currentTime + 0.12);
            },
            playSave() {
                this.init(); let size = this.ctx.sampleRate * 0.15; let buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
                let data = buf.getChannelData(0); for (let i = 0; i < size; i++) { data[i] = Math.random() * 2 - 1; }
                let n = this.ctx.createBufferSource(); n.buffer = buf;
                let f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(350, this.ctx.currentTime);
                let g = this.ctx.createGain(); n.connect(f); f.connect(g); g.connect(this.ctx.destination);
                g.gain.setValueAtTime(0.6, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
                n.start(); n.stop(this.ctx.currentTime + 0.15);
            },
            playGoal() {
                this.init(); let now = this.ctx.currentTime;
                [440, 554, 659].forEach((freq) => {
                    let osc = this.ctx.createOscillator(); let gain = this.ctx.createGain();
                    osc.connect(gain); gain.connect(this.ctx.destination); osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.4);
                    gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                    osc.start(now); osc.stop(now + 0.5);
                });
            }
        };

        let activeGameMode = "1P"; 
        let player1Nation = nations[2]; let player2Nation = nations[5];
        let setupPhase = 1; let score = 0; let streak = 0;
        let currentKicker = 1; let currentRound = 1; let isSuddenDeath = false;
        let p1History = []; let p2History = []; let selectedNationTmp = null;

        let adSavesRemaining = 3;
        let countdownTimerInterval = null;
        let countdownSecondsLeft = 5;
        let globalFrameCount = 0;
        let crowdCelebrationTimer = 0;

        const grid = document.getElementById('nationGrid');
        const startBtn = document.getElementById('startBtn');
        const selectionTitle = document.getElementById('selectionTitle');

        function selectGameMode(mode) {
            activeGameMode = mode;
            SoundFX.startMusic();
            changeScreen('selectorScreen');
            setupPhase = 1; selectedNationTmp = null;
            startBtn.disabled = true;

            if (activeGameMode === "1P") {
                selectionTitle.innerText = "CHOOSE YOUR TEAM";
                selectionTitle.style.color = "#f7b500";
                adSavesRemaining = 3; 
            } else {
                selectionTitle.innerText = "PLAYER 1 CHOOSE";
                selectionTitle.style.color = "#f7b500";
            }
            buildSelectionGrid();
        }

        // Crisp inline-SVG national flags (3:2). preserveAspectRatio="none" fills
        // the 54x36 chip exactly (also 3:2) so there's no distortion.
        function flagSVG(tag) {
            const open = '<svg viewBox="0 0 60 40" preserveAspectRatio="none" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">';
            let body = '';
            if (tag === 'ARG') {
                let rays = '';
                for (let i = 0; i < 16; i++) {
                    const a = i * Math.PI / 8;
                    rays += `<line x1="${(30+Math.cos(a)*3.6).toFixed(2)}" y1="${(20+Math.sin(a)*3.6).toFixed(2)}" x2="${(30+Math.cos(a)*6).toFixed(2)}" y2="${(20+Math.sin(a)*6).toFixed(2)}" stroke="#f6b40e" stroke-width="1"/>`;
                }
                body = `<rect width="60" height="40" fill="#74acdf"/><rect y="13.33" width="60" height="13.34" fill="#fff"/>${rays}<circle cx="30" cy="20" r="3.3" fill="#f6b40e" stroke="#85340a" stroke-width="0.4"/>`;
            } else if (tag === 'BRA') {
                body = '<rect width="60" height="40" fill="#009b3a"/><polygon points="30,5 55,20 30,35 5,20" fill="#fedf00"/><circle cx="30" cy="20" r="7.5" fill="#3b3bc4"/><path d="M22.8 18 q7.2 4.5 14.4 0.4" stroke="#fff" stroke-width="1.8" fill="none"/>';
            } else if (tag === 'ENG') {
                body = '<rect width="60" height="40" fill="#fff"/><rect x="25" width="10" height="40" fill="#ce1124"/><rect y="15" width="60" height="10" fill="#ce1124"/>';
            } else if (tag === 'FRA') {
                body = '<rect width="20" height="40" fill="#0055a4"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ef4135"/>';
            } else if (tag === 'GER') {
                body = '<rect width="60" height="13.33" fill="#000"/><rect y="13.33" width="60" height="13.34" fill="#d00"/><rect y="26.67" width="60" height="13.33" fill="#ffce00"/>';
            } else if (tag === 'ESP') {
                body = '<rect width="60" height="40" fill="#c60b1e"/><rect y="10" width="60" height="20" fill="#ffc400"/><rect x="13" y="14.5" width="9" height="11" rx="1" fill="#ad1519"/><rect x="14.5" y="16" width="6" height="8" fill="#c60b1e"/><rect x="16.5" y="11.5" width="2" height="3" fill="#ffc400"/>';
            } else if (tag === 'USA') {
                let stripes = '';
                for (let i = 0; i < 13; i++) stripes += `<rect y="${(i*40/13).toFixed(2)}" width="60" height="${(40/13).toFixed(2)}" fill="${i % 2 ? '#fff' : '#b22234'}"/>`;
                let stars = '';
                for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) stars += `<circle cx="${(2.6+c*4.7).toFixed(2)}" cy="${(2.4+r*4.4).toFixed(2)}" r="0.85" fill="#fff"/>`;
                body = `${stripes}<rect width="24" height="${(40/13*7).toFixed(2)}" fill="#3c3b6e"/>${stars}`;
            } else if (tag === 'MEX') {
                body = '<rect width="20" height="40" fill="#006847"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ce1124"/><ellipse cx="30" cy="20.5" rx="3" ry="4" fill="#6b4423"/><path d="M30 16 q4 1 4.5 5" stroke="#6b4423" stroke-width="0.7" fill="none"/>';
            } else if (tag === 'POR') {
                body = '<rect width="24" height="40" fill="#006600"/><rect x="24" width="36" height="40" fill="#f00"/><circle cx="24" cy="20" r="6.6" fill="none" stroke="#ffd700" stroke-width="1.3"/><rect x="21" y="15.5" width="6" height="9" rx="1" fill="#fff" stroke="#003399" stroke-width="1.1"/>';
            } else {
                body = '<rect width="60" height="40" fill="#888"/>';
            }
            return open + body + '</svg>';
        }

        function buildSelectionGrid() {
            grid.innerHTML = "";
            nations.forEach(nation => {
                if (activeGameMode === "2P" && setupPhase === 2 && player1Nation && player1Nation.tag === nation.tag) return;
                const btn = document.createElement('div');
                btn.className = 'nation-btn';
                
                btn.innerHTML = `
                    <div class="mini-flag">${flagSVG(nation.tag)}</div>
                    <span style="font-size:11px; color:#aaa; margin-top:-2px;">${nation.tag}</span>
                    <span style="margin-top:-4px;">${nation.name}</span>
                `;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.nation-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedNationTmp = nation;
                    startBtn.disabled = false;
                });
                grid.appendChild(btn);
            });
        }

        startBtn.addEventListener('click', () => {
            if (activeGameMode === "1P") {
                player1Nation = selectedNationTmp;
                startGame();
            } else {
                if (setupPhase === 1) {
                    player1Nation = selectedNationTmp;
                    setupPhase = 2; selectedNationTmp = null; startBtn.disabled = true;
                    selectionTitle.innerText = "PLAYER 2 CHOOSE"; selectionTitle.style.color = "#5ac8fa";
                    buildSelectionGrid();
                } else if (setupPhase === 2) {
                    player2Nation = selectedNationTmp;
                    startGame();
                }
            }
        });

        function openLockerRoom() {
            changeScreen('lockerScreen');
            const bGrid = document.getElementById('ballGrid');
            bGrid.innerHTML = "";

            ballStyles.forEach(ball => {
                const isLocked = highStreak < ball.req;
                const card = document.createElement('div');
                card.className = `ball-card ${isLocked ? 'locked' : ''} ${activeBallStyle === ball.name ? 'selected' : ''}`;
                
                if (isLocked) {
                    card.innerHTML = `<span class="lock-tag">🔒 Streak ${ball.req}</span><span>${ball.name}</span>`;
                } else {
                    card.innerHTML = `<span class="lock-tag" style="background:#4CD964; color:#000;">✓ Ready</span><span>${ball.name}</span>`;
                    card.addEventListener('click', () => {
                        document.querySelectorAll('.ball-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        activeBallStyle = ball.name;
                        localStorage.setItem('wc_active_ball', ball.name);
                    });
                }
                bGrid.appendChild(card);
            });
        }

        function closeLockerRoom() {
            changeScreen('splashScreen');
        }

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        let ball, keeper, goal, gameState;
        let swipePoints = []; let isTrackingSwipe = false;
        
        function initEntities() {
            goal = { x: canvas.width * 0.15, y: 140, w: canvas.width * 0.7, h: 130 };

            ball = {
                startX: canvas.width / 2, startY: canvas.height - 120,
                x: canvas.width / 2, y: canvas.height - 120,
                targetX: 0, targetY: 0, radius: 22, startRadius: 22, targetRadius: 8,  
                progress: 0, speed: 0.035, bounceVx: 0, bounceVy: 0, spin: 0, curveOffsetX: 0   
            };

            let initialSpeed = 2.0;
            let currentActiveBallConfig = ballStyles.find(b => b.name === activeBallStyle) || ballStyles[0];
            ball.config = currentActiveBallConfig;

            if (activeGameMode === "1P") {
                if (streak < 10) {
                    initialSpeed = 1.0 + (streak * 0.06); 
                } else {
                    let advancedStreakLevel = streak - 10;
                    initialSpeed = 1.6 + (advancedStreakLevel * 0.15); 
                }
                initialSpeed = Math.min(initialSpeed, 5.2); 
            } else {
                initialSpeed = 2.0 + Math.min((currentRound - 1) * 0.3, 2.2);
            }

            keeper = {
                x: canvas.width / 2, baselineY: 240, y: 240, w: 54, h: 70,
                dir: Math.random() < 0.5 ? 1 : -1, speed: initialSpeed,
                state: 'idling', targetX: canvas.width / 2, targetY: 240
            };

            gameState = 'aiming'; swipePoints = []; isTrackingSwipe = false;
            document.getElementById('instructions').style.display = 'block';

            if (activeGameMode === "2P") {
                let activeNation = (currentKicker === 1) ? player1Nation : player2Nation;
                document.getElementById('turnIndicator').innerText = `PLAYER ${currentKicker} SHOOTING (${activeNation.tag})`;
                document.getElementById('turnIndicator').style.background = (currentKicker === 1) ? "#f7b500" : "#5ac8fa";
                
                if (currentKicker === 1) {
                    document.getElementById('p1Board').classList.add('active-board');
                    document.getElementById('p2Board').classList.remove('active-board');
                } else {
                    document.getElementById('p1Board').classList.remove('active-board');
                    document.getElementById('p2Board').classList.add('active-board');
                }
            }
        }

        function handleStart(x, y) {
            if (gameState !== 'aiming') return;
            let rect = canvas.getBoundingClientRect();
            isTrackingSwipe = true;
            swipePoints = [{ x: x - rect.left, y: y - rect.top, time: Date.now() }];
        }

        function handleMove(x, y) {
            if (!isTrackingSwipe || gameState !== 'aiming') return;
            let rect = canvas.getBoundingClientRect();
            swipePoints.push({ x: x - rect.left, y: y - rect.top, time: Date.now() });
            if (swipePoints.length > 40) swipePoints.shift();
        }

        function handleEnd() {
            if (!isTrackingSwipe || swipePoints.length < 3) { isTrackingSwipe = false; return; }
            isTrackingSwipe = false;

            let first = swipePoints[0]; let last = swipePoints[swipePoints.length - 1];
            let duration = last.time - first.time; let diffY = last.y - first.y; let diffX = last.x - first.x;

            if (diffY < -40 && duration < 400) { 
                SoundFX.playKick();
                document.getElementById('instructions').style.display = 'none';
                ball.targetX = ball.startX + (diffX * 1.3);

                let rawForceY = Math.abs(diffY) / duration; 
                let baselineGoalBottomY = goal.y + goal.h; 
                let optimalShotZoneHeight = goal.h - 15;   

                if (rawForceY < 2.0) {
                    ball.targetY = baselineGoalBottomY - (rawForceY * (optimalShotZoneHeight / 2.0));
                } else if (rawForceY >= 2.0 && rawForceY < 4.8) {
                    let logarithmicBuffer = Math.log(rawForceY - 1.0) * 35;
                    ball.targetY = (baselineGoalBottomY - optimalShotZoneHeight) + 12 - logarithmicBuffer;
                } else {
                    let excessVelocityForce = rawForceY - 4.8;
                    ball.targetY = goal.y - 12 - (excessVelocityForce * 18);
                }

                let maxDeviation = 0;
                for (let i = 1; i < swipePoints.length - 1; i++) {
                    let p = swipePoints[i];
                    let num = (last.y - first.y) * p.x - (last.x - first.x) * p.y + last.x * first.y - last.y * first.x;
                    let den = Math.sqrt(Math.pow(last.y - first.y, 2) + Math.pow(last.x - first.x, 2));
                    let distance = den !== 0 ? (num / den) : 0;
                    if (Math.abs(distance) > Math.abs(maxDeviation)) maxDeviation = distance;
                }

                ball.spin = maxDeviation * -1.8; ball.targetX += (ball.spin * 0.4);
                if (ball.targetY >= goal.y) ball.targetX = Math.max(goal.x - 35, Math.min(goal.x + goal.w + 35, ball.targetX));

                ball.progress = 0; gameState = 'shooting'; keeper.state = 'diving';

                let errorMarginValue = 120; 
                if (activeGameMode === "1P" && streak < 10) {
                    errorMarginValue = 220 - (streak * 10); 
                }
                let errorMargin = (Math.random() * (errorMarginValue * 2) - errorMarginValue); 
                keeper.targetX = Math.max(goal.x + 10, Math.min(goal.x + goal.w - 10, ball.targetX + errorMargin));

                if (ball.targetY < keeper.baselineY - 40) {
                    let calculatedLift = (keeper.baselineY - ball.targetY) * 0.55;
                    keeper.targetY = keeper.baselineY - Math.min(calculatedLift, 65);
                } else {
                    keeper.targetY = keeper.baselineY;
                }
            }
        }

        canvas.addEventListener('touchstart', (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY));
        canvas.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY));
        canvas.addEventListener('touchend', () => handleEnd());
        canvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', () => handleEnd());

        function update() {
            globalFrameCount++;
            if (crowdCelebrationTimer > 0) crowdCelebrationTimer--;

            if (gameState === 'aiming') {
                keeper.x += keeper.speed * keeper.dir;
                if (keeper.x - keeper.w/2 < goal.x || keeper.x + keeper.w/2 > goal.x + goal.w) {
                    keeper.dir *= -1;
                    keeper.x = keeper.x - keeper.w/2 < goal.x ? goal.x + keeper.w/2 : goal.x + goal.w - keeper.w/2;
                }
                keeper.y = keeper.baselineY;
            }

            if (gameState === 'shooting') {
                ball.progress += ball.speed;
                if (ball.progress > 1) ball.progress = 1;

                let curveFactor = Math.sin(ball.progress * Math.PI); 
                ball.curveOffsetX = ball.spin * curveFactor;
                ball.x = (ball.startX + (ball.targetX - ball.startX) * ball.progress) + ball.curveOffsetX;
                ball.y = ball.startY + (ball.targetY - ball.startY) * ball.progress;
                ball.radius = ball.startRadius + (ball.targetRadius - ball.startRadius) * ball.progress;

                if (keeper.state === 'diving') {
                    keeper.x += (keeper.targetX - keeper.x) * 0.038; 
                    keeper.y += (keeper.targetY - keeper.y) * 0.038; 
                }

                if (ball.progress >= 1) {
                    let hitKeeperWidth = keeper.w / 2 + 5; 
                    if (ball.x >= keeper.x - hitKeeperWidth && ball.x <= keeper.x + hitKeeperWidth && ball.y >= keeper.y - 45 && ball.y <= keeper.y + 45) {
                        gameState = 'rebounding'; 
                        ball.bounceVx = ((ball.x - keeper.x) / hitKeeperWidth) * 5; 
                        ball.bounceVy = 4.5; 
                        return;
                    }
                    processResult(ball.x >= goal.x && ball.x <= goal.x + goal.w && ball.y >= goal.y && ball.y <= goal.y + goal.h);
                    return;
                }
            }

            if (gameState === 'rebounding') {
                ball.x += ball.bounceVx; 
                ball.y += ball.bounceVy;
                ball.bounceVy -= 0.15; 

                if (ball.radius < ball.startRadius * 0.8) {
                    ball.radius += 0.4;
                }
                
                if (ball.bounceVy <= 0 || ball.y > canvas.height) {
                    processResult(false);
                }
            }
        }

        // PROCEDURAL DECORATION VECTOR ENGINE FOR SHIRTS
        // Rounded-rectangle path helper (avoids relying on ctx.roundRect support).
        function roundRectPath(c, x, y, w, h, r) {
            r = Math.min(r, w / 2, h / 2);
            c.beginPath();
            c.moveTo(x + r, y);
            c.arcTo(x + w, y, x + w, y + h, r);
            c.arcTo(x + w, y + h, x, y + h, r);
            c.arcTo(x, y + h, x, y, r);
            c.arcTo(x, y, x + w, y, r);
            c.closePath();
        }

        // Paints a national kit into the rect [x,y,w,h]. `detailed` adds soft
        // shading + trims (used for the prominent keeper; skipped for tiny crowd
        // shirts to keep the per-frame cost low).
        function applyKitTexture(targetCtx, x, y, w, h, nation, isGoalkeeper, detailed) {
            targetCtx.save();
            targetCtx.beginPath();
            targetCtx.rect(x, y, w, h);
            targetCtx.clip();

            const sc = nation.stripeColor, dc = nation.detailColor;

            if (isGoalkeeper) {
                // Modern goalkeeper jersey: solid base, tonal shoulder yoke + waist trim.
                targetCtx.fillStyle = nation.keeperColor;
                targetCtx.fillRect(x, y, w, h);
                targetCtx.fillStyle = 'rgba(255,255,255,0.16)';
                targetCtx.fillRect(x, y, w, h * 0.32);
                targetCtx.fillStyle = dc;
                targetCtx.fillRect(x, y + h * 0.56, w, Math.max(1, h * 0.07));
            } else {
                // Outfield base colour + nation-specific design.
                targetCtx.fillStyle = nation.color;
                targetCtx.fillRect(x, y, w, h);

                if (nation.kitStyle === 'stripes') {
                    targetCtx.fillStyle = sc;
                    const sw = w / 7;
                    for (let i = sw; i < w - 0.5; i += sw * 2) targetCtx.fillRect(x + i, y, sw, h);
                } else if (nation.kitStyle === 'shoulders') {
                    targetCtx.fillStyle = sc;
                    targetCtx.fillRect(x, y, w, h * 0.30);
                    targetCtx.fillStyle = dc;
                    targetCtx.fillRect(x, y + h * 0.30, w, Math.max(1, h * 0.08));
                } else if (nation.kitStyle === 'sleeves') {
                    targetCtx.fillStyle = sc;
                    targetCtx.fillRect(x, y, w * 0.20, h);
                    targetCtx.fillRect(x + w - w * 0.20, y, w * 0.20, h);
                } else if (nation.kitStyle === 'halves') {
                    targetCtx.fillStyle = sc;
                    targetCtx.fillRect(x, y, w / 2, h);
                } else if (nation.kitStyle === 'pattern') {
                    targetCtx.strokeStyle = 'rgba(255,255,255,0.18)';
                    targetCtx.lineWidth = 1.5;
                    targetCtx.beginPath();
                    for (let j = -h; j < w; j += 5) { targetCtx.moveTo(x + j, y + h); targetCtx.lineTo(x + j + h, y); }
                    targetCtx.stroke();
                }
            }

            if (detailed) {
                // Vertical light-to-dark gives the shirt volume...
                let g = targetCtx.createLinearGradient(x, y, x, y + h);
                g.addColorStop(0, 'rgba(255,255,255,0.22)');
                g.addColorStop(0.45, 'rgba(255,255,255,0.03)');
                g.addColorStop(1, 'rgba(0,0,0,0.32)');
                targetCtx.fillStyle = g;
                targetCtx.fillRect(x, y, w, h);
                // ...and side shadows round the torso off.
                let sl = targetCtx.createLinearGradient(x, 0, x + w * 0.20, 0);
                sl.addColorStop(0, 'rgba(0,0,0,0.28)'); sl.addColorStop(1, 'rgba(0,0,0,0)');
                targetCtx.fillStyle = sl; targetCtx.fillRect(x, y, w * 0.20, h);
                let sr = targetCtx.createLinearGradient(x + w, 0, x + w * 0.80, 0);
                sr.addColorStop(0, 'rgba(0,0,0,0.28)'); sr.addColorStop(1, 'rgba(0,0,0,0)');
                targetCtx.fillStyle = sr; targetCtx.fillRect(x + w * 0.80, y, w * 0.20, h);
            }

            // Small chest crest.
            targetCtx.fillStyle = '#f7b500';
            targetCtx.beginPath();
            targetCtx.arc(x + w * 0.30, y + h * 0.42, detailed ? 1.8 : 1.1, 0, Math.PI * 2);
            targetCtx.fill();

            targetCtx.restore();
        }

        function drawCrowd(kickingNation, defendingNation) {
            ctx.save();
            ctx.fillStyle = '#112b16';
            ctx.fillRect(0, 0, canvas.width, goal.y);
            
            ctx.fillStyle = '#0e2212';
            for (let row = 0; row < 4; row++) {
                ctx.fillRect(0, row * 30, canvas.width, 12);
            }

            let totalColumns = 24;
            let colWidth = canvas.width / totalColumns;
            
            for (let row = 0; row < 4; row++) {
                let rowY = 22 + (row * 28);
                if (rowY > goal.y - 10) continue;

                for (let col = 0; col < totalColumns; col++) {
                    let colX = (col * colWidth) + (colWidth / 2);
                    
                    let speedModifier = 0.09 + (col % 3) * 0.03;
                    let wavePhase = (globalFrameCount * speedModifier) + (col * 0.5) + (row * 1.2);
                    
                    let waveAmplitude = 3;
                    if (crowdCelebrationTimer > 0) {
                        waveAmplitude = 9;
                        wavePhase = (globalFrameCount * 0.35) + (col * 0.8);
                    }
                    
                    let bobbingY = Math.sin(wavePhase) * waveAmplitude;

                    // Crowd distributes into home/away blocks supporting outfield kits
                    let currentFanNation = (col < totalColumns / 2) ? kickingNation : defendingNation;
                    if (!currentFanNation) currentFanNation = nations[2];

                    // Neutral casual fans scattered around standard mix
                    let isNeutral = (col + row) % 5 === 0;

                    ctx.save();
                    ctx.translate(colX, rowY + bobbingY);

                    // Render outfield fan shirt bases
                    if (isNeutral) {
                        ctx.fillStyle = '#444444';
                        ctx.beginPath();
                        ctx.arc(0, 8, 8, Math.PI, 0, false);
                        ctx.fill();
                    } else {
                        // Render full high-detail structural kit properties directly inside the stand profiles
                        ctx.beginPath();
                        ctx.arc(0, 8, 8, Math.PI, 0, false);
                        ctx.closePath();
                        applyKitTexture(ctx, -8, 0, 16, 12, currentFanNation, false);
                    }

                    // Fan skins
                    ctx.fillStyle = (col % 2 === 0) ? '#ffdbac' : '#e0ac69';
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();

                    // Fan hair layouts
                    ctx.fillStyle = (col % 3 === 0) ? '#4a3728' : ((col % 3 === 1) ? '#222222' : '#f7b500');
                    ctx.beginPath();
                    ctx.arc(0, -2, 5, Math.PI, 0);
                    ctx.fill();

                    ctx.restore();
                }
            }
            ctx.restore();
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            let kickerNationObj = player1Nation;
            let defenderNationObj = player2Nation;

            if (activeGameMode === "2P") {
                kickerNationObj = (currentKicker === 1) ? player1Nation : player2Nation;
                defenderNationObj = (currentKicker === 1) ? player2Nation : player1Nation;
            }

            drawCrowd(kickerNationObj, defenderNationObj);

            let pitchGrad = ctx.createLinearGradient(0, goal.y, 0, canvas.height);
            pitchGrad.addColorStop(0, '#0a230c'); pitchGrad.addColorStop(0.3, '#113b15'); pitchGrad.addColorStop(1, '#1e5e25');   
            ctx.fillStyle = pitchGrad; ctx.fillRect(0, goal.y, canvas.width, canvas.height - goal.y);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            for (let i = 0; i < 6; i++) {
                if (i % 2 === 0) {
                    ctx.beginPath(); ctx.moveTo(0, goal.y + goal.h + (i * 40)); ctx.lineTo(canvas.width, goal.y + goal.h + (i * 40));
                    ctx.lineTo(canvas.width, goal.y + goal.h + ((i + 1) * 70)); ctx.lineTo(0, goal.y + goal.h + ((i + 1) * 70)); ctx.fill();
                }
            }

            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(goal.x - 40, goal.y + goal.h); ctx.lineTo(0, canvas.height - 50);
            ctx.moveTo(goal.x + goal.w + 40, goal.y + goal.h); ctx.lineTo(canvas.width, canvas.height - 50);
            ctx.moveTo(0, canvas.height - 50); ctx.lineTo(canvas.width, canvas.height - 50); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height - 120, 6, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
            ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
            for (let x = goal.x; x <= goal.x + goal.w; x += 10) { ctx.beginPath(); ctx.moveTo(x, goal.y); ctx.lineTo(x, goal.y + goal.h); ctx.stroke(); }
            for (let y = goal.y; y <= goal.y + goal.h; y += 10) { ctx.beginPath(); ctx.moveTo(goal.x, y); ctx.lineTo(goal.x + goal.w, y); ctx.stroke(); }

            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath();
            ctx.moveTo(goal.x, goal.y + goal.h); ctx.lineTo(goal.x, goal.y); ctx.lineTo(goal.x + goal.w, goal.y); ctx.lineTo(goal.x + goal.w, goal.y + goal.h); ctx.stroke();
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath();
            let shadowY = (gameState === 'rebounding') ? ball.y + 25 : ball.startY + ((goal.y + goal.h + 10) - ball.startY) * ball.progress;
            ctx.ellipse(ball.x, shadowY, ball.radius * 1.1, ball.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();

            // ==========================================
            // GOALKEEPER
            // ==========================================
            ctx.save();
            ctx.translate(keeper.x, keeper.y);

            const gkc = defenderNationObj.keeperColor;
            const gkd = defenderNationObj.detailColor;

            // Ground shadow.
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.ellipse(0, 30 + (keeper.baselineY - keeper.y), keeper.w * 0.6, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Boots.
            ctx.fillStyle = '#1a1a1a';
            roundRectPath(ctx, -14, 27, 12, 5, 2); ctx.fill();
            roundRectPath(ctx, 2, 27, 12, 5, 2); ctx.fill();
            // Socks.
            ctx.fillStyle = '#f2f2f2';
            ctx.fillRect(-13, 14, 9, 14); ctx.fillRect(4, 14, 9, 14);
            ctx.fillStyle = gkd; ctx.fillRect(-13, 16, 9, 2); ctx.fillRect(4, 16, 9, 2);
            // Shorts.
            ctx.fillStyle = '#15171a';
            roundRectPath(ctx, -16, 2, 32, 16, 4); ctx.fill();
            ctx.fillStyle = gkd; ctx.fillRect(-16, 14, 32, 2);

            // Jersey (rounded torso) — clipped so the kit texture has soft corners.
            ctx.save();
            roundRectPath(ctx, -18, -33, 36, 37, 7);
            ctx.clip();
            applyKitTexture(ctx, -18, -33, 36, 37, defenderNationObj, true, true);
            ctx.restore();

            // Arms (raised, ready) with cuffs.
            ctx.fillStyle = gkc;
            roundRectPath(ctx, -30, -32, 12, 17, 5); ctx.fill();
            roundRectPath(ctx, 18, -32, 12, 17, 5); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            roundRectPath(ctx, -30, -32, 4, 17, 4); ctx.fill();
            roundRectPath(ctx, 26, -32, 4, 17, 4); ctx.fill();
            ctx.fillStyle = gkd;
            ctx.fillRect(-30, -18, 12, 2); ctx.fillRect(18, -18, 12, 2);

            // Collar.
            ctx.strokeStyle = gkd; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.arc(0, -33, 6, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();

            // Padded gloves.
            ctx.fillStyle = '#ffffff';
            roundRectPath(ctx, -33, -19, 11, 12, 3); ctx.fill();
            roundRectPath(ctx, 22, -19, 11, 12, 3); ctx.fill();
            ctx.strokeStyle = gkd; ctx.lineWidth = 1.5;
            roundRectPath(ctx, -33, -19, 11, 12, 3); ctx.stroke();
            roundRectPath(ctx, 22, -19, 11, 12, 3); ctx.stroke();

            // Neck, head and hair.
            ctx.fillStyle = '#e3a877'; ctx.fillRect(-3.5, -40, 7, 9);
            ctx.fillStyle = '#ffcd9b';
            ctx.beginPath(); ctx.arc(0, -45, 9.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2a1a0e';
            ctx.beginPath(); ctx.arc(0, -47, 9.5, Math.PI * 0.92, Math.PI * 2.08); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.beginPath(); ctx.arc(3, -45, 9.5, -0.5 * Math.PI, 0.4 * Math.PI); ctx.fill();

            ctx.restore();

            // ==========================================
            // UPGRADED 3D SPINNING BALL TEXTURE GEOMETRY
            // ==========================================
            ctx.save(); 
            ctx.translate(ball.x, ball.y);
            
            let c = ball.config;
            let r = Math.max(ball.radius, 3);
            
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.clip();
            
            let sphereBase = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
            sphereBase.addColorStop(0, c.primary);
            sphereBase.addColorStop(0.8, c.primary);
            sphereBase.addColorStop(1, c.secondary);
            ctx.fillStyle = sphereBase;
            ctx.fill();

            if (r > 4) {
                ctx.save();
                let spinAngle = ball.progress * 8 + (ball.spin * 0.05);
                ctx.rotate(spinAngle);
                
                ctx.strokeStyle = c.seams;
                ctx.lineWidth = Math.max(0.75, r * 0.05);
                ctx.fillStyle = c.secondary;

                if (c.style === 'classic-3d') {
                    for (let i = 0; i < 5; i++) {
                        let angle = (i * Math.PI * 2 / 5);
                        let px = Math.cos(angle) * (r * 0.45);
                        let py = Math.sin(angle) * (r * 0.45);
                        
                        ctx.beginPath();
                        for (let p = 0; p < 5; p++) {
                            let pAngle = angle + (p * Math.PI * 2 / 5);
                            let localR = (p === 0 || p === 4) ? r * 0.45 : r * 0.18;
                            let x = Math.cos(pAngle) * localR;
                            let y = Math.sin(pAngle) * localR;
                            if (p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                        }
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.quadraticCurveTo(Math.cos(angle)*r*0.7, Math.sin(angle)*r*0.7, Math.cos(angle)*r, Math.sin(angle)*r);
                        ctx.stroke();
                    }
                    
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                } else if (c.style === 'vortex-3d') {
                    ctx.strokeStyle = c.seams;
                    for (let i = 0; i < 4; i++) {
                        ctx.beginPath();
                        ctx.arc(-r * 0.3, -r * 0.3, r * (0.4 + i * 0.3), 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.strokeStyle = c.primary;
                    ctx.beginPath();
                    ctx.arc(r * 0.4, r * 0.4, r * 0.6, 0, Math.PI * 2);
                    ctx.stroke();

                } else if (c.style === 'panel-3d') {
                    for (let i = 0; i < 3; i++) {
                        let rot = (i * Math.PI * 2 / 3);
                        ctx.save();
                        ctx.rotate(rot);
                        ctx.beginPath();
                        ctx.moveTo(-r, 0);
                        ctx.bezierCurveTo(-r*0.3, -r*0.6, r*0.3, -r*0.6, r, 0);
                        ctx.bezierCurveTo(r*0.3, -r*0.2, -r*0.3, -r*0.2, -r, 0);
                        ctx.fillStyle = c.secondary;
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    }

                } else if (c.style === 'matrix-3d') {
                    ctx.lineWidth = Math.max(0.5, r * 0.03);
                    for (let i = -3; i <= 3; i++) {
                        let offset = (i / 4) * r;
                        ctx.beginPath();
                        ctx.moveTo(-r, offset);
                        ctx.quadraticCurveTo(0, offset * 0.4, r, offset);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(offset, -r);
                        ctx.quadraticCurveTo(offset * 0.4, 0, offset, r);
                        ctx.stroke();
                    }

                } else if (c.style === 'carbon-3d') {
                    ctx.lineWidth = Math.max(1, r * 0.08);
                    for (let d = -r; d < r; d += r * 0.25) {
                        ctx.beginPath();
                        ctx.moveTo(d, -r); ctx.lineTo(d + r, r);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(d, r); ctx.lineTo(d + r, -r);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }

            let dHighlight = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
            dHighlight.addColorStop(0, c.shine);
            dHighlight.addColorStop(0.3, 'rgba(255,255,255,0.1)');
            dHighlight.addColorStop(0.7, 'rgba(0,0,0,0)');
            dHighlight.addColorStop(1, 'rgba(0,0,0,0.65)'); 
            
            ctx.fillStyle = dHighlight;
            ctx.beginPath();
            ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = Math.max(1, r * 0.04);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();

            if (gameState === 'result') {
                ctx.fillStyle = feedbackColor; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(feedbackText, canvas.width / 2, canvas.height * 0.52);
            }
        }

        let feedbackText = ""; let feedbackColor = "#fff";

        function processResult(isGoal) {
            gameState = 'result';
            if (isGoal) {
                SoundFX.playGoal(); feedbackText = "GOAL!"; feedbackColor = "#4CD964";
                careerGoals++; localStorage.setItem('wc_career_goals', careerGoals);
                document.getElementById('careerCounter').innerText = careerGoals;
                crowdCelebrationTimer = 90; 
            } else {
                SoundFX.playSave(); feedbackText = "MISS!"; feedbackColor = "#FF3B30";
            }

            if (activeGameMode === "1P") {
                if (isGoal) {
                    score++; streak++;
                    if (streak > highStreak) {
                        highStreak = streak; localStorage.setItem('wc_high_streak', highStreak);
                    }
                    document.getElementById('uiScore').innerText = score;
                    document.getElementById('uiStreak').innerText = streak;

                    if (streak % 10 === 0 && streak > 0) {
                        adSavesRemaining++;
                        triggerExtraLifeBannerAnimation();
                    }

                    setTimeout(() => { initEntities(); }, 1400);
                } else {
                    setTimeout(() => {
                        if (adSavesRemaining > 0) {
                            launchContinueVerificationScreen();
                        } else {
                            triggerImmediateGameOver();
                        }
                    }, 1000);
                }
            } else {
                let res = isGoal ? 'goal' : 'miss';
                if (currentKicker === 1) p1History.push(res); else p2History.push(res);
                syncScoreboardDots();
                setTimeout(() => { evaluateMatchState2P(); }, 1400);
            }
        }

        function triggerExtraLifeBannerAnimation() {
            const elBanner = document.getElementById('extraLifeBanner');
            elBanner.classList.add('show');
            
            setTimeout(() => {
                elBanner.classList.remove('show');
            }, 1800);
        }

        function launchContinueVerificationScreen() {
            gameState = 'prompt';
            document.getElementById('continueStreakVal').innerText = streak;
            document.getElementById('continuesLeftTxt').innerText = `Saves remaining: ${adSavesRemaining} / 3`;
            changeScreen('continueScreen');
            
            countdownSecondsLeft = 5;
            document.getElementById('timerBox').innerText = countdownSecondsLeft;
            
            clearInterval(countdownTimerInterval);
            countdownTimerInterval = setInterval(() => {
                countdownSecondsLeft--;
                if (countdownSecondsLeft <= 0) {
                    clearInterval(countdownTimerInterval);
                    skipRecovery();
                } else {
                    document.getElementById('timerBox').innerText = countdownSecondsLeft;
                }
            }, 1000);
        }

        function triggerAdRecovery() {
            clearInterval(countdownTimerInterval);
            document.getElementById('continueScreen').style.display = 'none';
            
            const overlay = document.getElementById('adOverlay');
            const statusTxt = document.getElementById('adStatusTxt');
            overlay.style.display = 'flex';
            
            adSavesRemaining--;

            setTimeout(() => { statusTxt.innerText = "Ad complete! Resuming in 2..."; }, 1500);
            setTimeout(() => { statusTxt.innerText = "Ad complete! Resuming in 1..."; }, 2500);
            
            setTimeout(() => {
                overlay.style.display = 'none';
                statusTxt.innerText = "Loading Ad Campaign...";
                initEntities(); 
                gameLoop();
            }, 3500);
        }

        function skipRecovery() {
            clearInterval(countdownTimerInterval);
            triggerImmediateGameOver();
        }

        function triggerImmediateGameOver() {
            SoundFX.stopMusic();
            gameState = 'over';
            document.getElementById('winStatusText').innerText = "OUT OF THE CUP!";
            document.getElementById('winStatusText').style.color = "#FF3B30";
            document.getElementById('finalScoreText').innerText = `You finished with a streak score of ${streak} for ${player1Nation ? player1Nation.name : 'your team'}.`;
            changeScreen('gameOverScreen');
        }

        function syncScoreboardDots() {
            let p1Goals = p1History.filter(r => r === 'goal').length;
            let p2Goals = p2History.filter(r => r === 'goal').length;
            document.getElementById('p1Score').innerText = p1Goals;
            document.getElementById('p2Score').innerText = p2Goals;

            let buildDots = (hist) => {
                let html = ""; let max = Math.max(5, hist.length);
                for(let i=0; i<max; i++) {
                    let cl = "dot" + (hist[i] === 'goal' ? ' goal' : hist[i] === 'miss' ? ' miss' : '');
                    html += `<div class="${cl}"></div>`;
                }
                return html;
            };
            document.getElementById('p1Dots').innerHTML = buildDots(p1History);
            document.getElementById('p2Dots').innerHTML = buildDots(p2History);
        }

        function evaluateMatchState2P() {
            let p1Goals = p1History.filter(r => r === 'goal').length;
            let p2Goals = p2History.filter(r => r === 'goal').length;
            if (!isSuddenDeath) {
                if (p1Goals + (5 - p1History.length) < p2Goals) { endGame2P(2); return; }
                if (p2Goals + (5 - p2History.length) < p1Goals) { endGame2P(1); return; }
                if (p1History.length === 5 && p2History.length === 5) {
                    if (p1Goals === p2Goals) { isSuddenDeath = true; currentRound = 6; currentKicker = 1; initEntities(); }
                    else endGame2P(p1Goals > p2Goals ? 1 : 2);
                } else advanceTurn2P();
            } else {
                if (p1History.length === p2History.length) {
                    if (p1Goals !== p2Goals) endGame2P(p1Goals > p2Goals ? 1 : 2);
                    else { currentRound++; currentKicker = 1; initEntities(); }
                } else advanceTurn2P();
            }
        }

        function advanceTurn2P() {
            currentKicker = (currentKicker === 1) ? 2 : 1;
            if (currentKicker === 1 && !isSuddenDeath) currentRound++;
            initEntities();
        }

        function startGame() {
            changeScreen(''); 
            resizeCanvas();
            
            if (activeGameMode === "1P") {
                document.getElementById('turnIndicator').style.display = "none";
                document.getElementById('p1Board').style.display = "none"; 
                document.getElementById('p2Board').style.display = "none";
                document.getElementById('arcadeHUD').style.display = "flex";
                document.getElementById('uiTeam').innerText = player1Nation.tag;
                score = 0; streak = 0;
                document.getElementById('uiScore').innerText = score; 
                document.getElementById('uiStreak').innerText = streak;
            } else {
                document.getElementById('arcadeHUD').style.display = "none";
                document.getElementById('turnIndicator').style.display = "block";
                document.getElementById('p1Board').style.display = "block"; 
                document.getElementById('p2Board').style.display = "block";
                document.getElementById('p1Name').innerText = `P1: ${player1Nation.tag}`; 
                document.getElementById('p2Name').innerText = `P2: ${player2Nation.tag}`;
                p1History = []; p2History = []; currentKicker = 1; currentRound = 1; isSuddenDeath = false;
                syncScoreboardDots();
            }
            initEntities();
            gameLoop();
        }

        function endGame2P(winner) {
            SoundFX.stopMusic();
            gameState = 'over'; 
            let winnerName = (winner === 1) ? player1Nation.name : player2Nation.name;
            document.getElementById('winStatusText').innerText = `${winnerName.toUpperCase()} WINS!`;
            document.getElementById('winStatusText').style.color = (winner === 1) ? "#f7b500" : "#5ac8fa";
            document.getElementById('finalScoreText').innerText = `Scoreline: ${p1History.filter(r=>r==='goal').length} - ${p2History.filter(r=>r==='goal').length}`;
            changeScreen('gameOverScreen');
        }

        function gameLoop() {
            update(); draw();
            if (gameState !== 'over' && gameState !== 'prompt') requestAnimationFrame(gameLoop);
        }

        function resetToMainMenu() {
            changeScreen('splashScreen');
        }
