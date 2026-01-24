// ===== Sample Participants Data =====
const participants = [
    { id: 1, name: '張小明', photo: 'https://i.pravatar.cc/150?img=1' },
    { id: 2, name: '李美玲', photo: 'https://i.pravatar.cc/150?img=2' },
    { id: 3, name: '王大偉', photo: 'https://i.pravatar.cc/150?img=3' },
    { id: 4, name: '陳雅婷', photo: 'https://i.pravatar.cc/150?img=4' },
    { id: 5, name: '林志豪', photo: 'https://i.pravatar.cc/150?img=5' },
    { id: 6, name: '黃淑芬', photo: 'https://i.pravatar.cc/150?img=6' },
    { id: 7, name: '吳建國', photo: 'https://i.pravatar.cc/150?img=7' },
    { id: 8, name: '周怡君', photo: 'https://i.pravatar.cc/150?img=8' },
    { id: 9, name: '鄭文華', photo: 'https://i.pravatar.cc/150?img=9' },
    { id: 10, name: '蔡佳穎', photo: 'https://i.pravatar.cc/150?img=10' },
    { id: 11, name: '許志明', photo: 'https://i.pravatar.cc/150?img=11' },
    { id: 12, name: '郭雅文', photo: 'https://i.pravatar.cc/150?img=12' },
    { id: 13, name: '謝宗翰', photo: 'https://i.pravatar.cc/150?img=13' },
    { id: 14, name: '楊美琪', photo: 'https://i.pravatar.cc/150?img=14' },
    { id: 15, name: '劉俊傑', photo: 'https://i.pravatar.cc/150?img=15' },
];

// ===== State =====
let remainingParticipants = [...participants];
let winners = [];
let isDrawing = false;
let photoElements = [];
let animationFrameId = null;
let bubbleIntervalId = null;

// ===== Physics Configuration =====
const PHYSICS = {
    airForce: 0.8,
    lateralAirForce: 0.2,
    gravity: 0.35,
    friction: 0.995,
    bounceFactor: 0.85,
    maxVelocity: 15,
    minVelocity: 4,
    turbulence: 0.4,
};

// ===== Track Configuration (UI Adjustable) =====
const TRACK_CONFIG = {
    chamberWidth: 480,  // 這些值會在初始化時根據視口大小動態調整
    chamberHeight: 220,
    ballDiameter: 42,
    trackWidth: 32,
    startPoint: { x: 50, y: 75 },  // % position relative to mainContent
    endPoint: { x: 15, y: 8 },     // % position relative to mainContent
    nodes: [
        { id: 1, x: 95, y: 75 },
        { id: 2, x: 95, y: 55 },
        { id: 3, x: 5, y: 55 },
        { id: 4, x: 5, y: 25 },
        { id: 5, x: 25, y: 25 },
    ]
};

// ===== Responsive Configuration =====
function updateResponsiveConfig() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 根據視口大小調整 TRACK_CONFIG 的值
    // 使用 CSS 中定義的 clamp() 值作為參考
    const minBallSize = 30;
    const maxBallSize = 55;
    const minChamberHeight = 160;
    const maxChamberHeight = 280;
    const minChamberWidth = 320;
    const maxChamberWidth = 520;
    
    // 計算相對於視口大小的值 (使用 vw/vh 的概念)
    const ballSize = Math.min(maxBallSize, Math.max(minBallSize, viewportWidth * 0.035));
    const chamberHeight = Math.min(maxChamberHeight, Math.max(minChamberHeight, viewportHeight * 0.18));
    const chamberWidth = Math.min(maxChamberWidth, Math.max(minChamberWidth, viewportWidth * 0.35));
    
    // 更新 TRACK_CONFIG
    TRACK_CONFIG.ballDiameter = ballSize;
    TRACK_CONFIG.chamberHeight = chamberHeight;
    TRACK_CONFIG.chamberWidth = chamberWidth;
    TRACK_CONFIG.trackWidth = Math.round(ballSize * 0.76);
    
    console.log('📏 響應式配置更新:', {
        ballSize,
        chamberHeight,
        chamberWidth,
        trackWidth: TRACK_CONFIG.trackWidth,
        viewportWidth,
        viewportHeight
    });
}

// ===== DOM Elements =====
const photosContainer = document.getElementById('photosContainer');
const platformSlots = document.getElementById('platformSlots');
const drawBtn = document.getElementById('drawBtn');
const resetBtn = document.getElementById('resetBtn');
const chamber = document.getElementById('chamber');
const confettiContainer = document.getElementById('confettiContainer');
const airBubbles = document.getElementById('airBubbles');
const funnel = document.getElementById('funnel');
const mainContent = document.getElementById('mainContent');
const winnersPlatform = document.getElementById('winnersPlatform');

// Slider Elements
const gravitySlider = document.getElementById('gravitySlider');
const airForceSlider = document.getElementById('airForceSlider');
const lateralAirForceSlider = document.getElementById('lateralAirForceSlider');
const maxVelocitySlider = document.getElementById('maxVelocitySlider');
const gravityValue = document.getElementById('gravityValue');
const airForceValue = document.getElementById('airForceValue');
const lateralAirForceValue = document.getElementById('lateralAirForceValue');
const maxVelocityValue = document.getElementById('maxVelocityValue');

// ===== Slider Event Listeners =====
gravitySlider.addEventListener('input', (e) => {
    PHYSICS.gravity = parseFloat(e.target.value);
    gravityValue.textContent = e.target.value;
});

airForceSlider.addEventListener('input', (e) => {
    PHYSICS.airForce = parseFloat(e.target.value);
    airForceValue.textContent = e.target.value;
});

lateralAirForceSlider.addEventListener('input', (e) => {
    PHYSICS.lateralAirForce = parseFloat(e.target.value);
    lateralAirForceValue.textContent = e.target.value;
});

maxVelocitySlider.addEventListener('input', (e) => {
    PHYSICS.maxVelocity = parseFloat(e.target.value);
    maxVelocityValue.textContent = e.target.value;
});

// ===== Initialize Photos =====
function initializePhotos() {
    photosContainer.innerHTML = '';
    photoElements = [];

    const containerRect = photosContainer.getBoundingClientRect();
    const photoSize = TRACK_CONFIG.ballDiameter;
    const padding = 5;

    remainingParticipants.forEach((participant, index) => {
        const photoEl = document.createElement('div');
        photoEl.className = 'photo-item';
        photoEl.dataset.id = participant.id;
        photoEl.innerHTML = `<img src="${participant.photo}" alt="${participant.name}">`;

        const x = padding + Math.random() * (containerRect.width - photoSize - padding * 2);
        const y = padding + Math.random() * (containerRect.height - photoSize - padding * 2);
        const vx = (Math.random() - 0.5) * PHYSICS.maxVelocity;
        const vy = (Math.random() - 0.5) * PHYSICS.maxVelocity;
        const rotation = Math.random() * 360;
        const rotationSpeed = (Math.random() - 0.5) * 8;

        photoEl.style.left = `${x}px`;
        photoEl.style.top = `${y}px`;
        photoEl.style.width = `${photoSize}px`;
        photoEl.style.height = `${photoSize}px`;

        photosContainer.appendChild(photoEl);

        photoElements.push({
            element: photoEl,
            participant,
            x, y, vx, vy,
            rotation, rotationSpeed,
            size: photoSize,
        });
    });

    startBounceAnimation();
    startBubbleEffect();
}

// ===== Bounce Animation =====
function startBounceAnimation() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    function animate() {
        const containerRect = photosContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        photoElements.forEach(photo => {
            if (photo.element.classList.contains('selected') ||
                photo.element.classList.contains('exiting')) return;

            photo.vy += PHYSICS.gravity;
            const bottomFactor = (photo.y / containerHeight);
            photo.vy -= PHYSICS.airForce * (0.5 + bottomFactor * 1.5);
            // 應用側向氣流力 - 根據球體位置添加水平方向的氣流推力
            const horizontalFactor = (photo.x / containerWidth);
            photo.vx += (Math.random() - 0.5) * PHYSICS.turbulence;
            photo.vx += (Math.random() - 0.5) * PHYSICS.lateralAirForce;
            photo.vx *= PHYSICS.friction;
            photo.vy *= PHYSICS.friction;

            const speed = Math.sqrt(photo.vx * photo.vx + photo.vy * photo.vy);
            if (speed < PHYSICS.minVelocity) {
                const angle = Math.random() * Math.PI * 2;
                photo.vx += Math.cos(angle) * PHYSICS.minVelocity * 0.5;
                photo.vy += Math.sin(angle) * PHYSICS.minVelocity * 0.5;
            }

            if (Math.abs(photo.vx) > PHYSICS.maxVelocity) photo.vx = Math.sign(photo.vx) * PHYSICS.maxVelocity;
            if (Math.abs(photo.vy) > PHYSICS.maxVelocity) photo.vy = Math.sign(photo.vy) * PHYSICS.maxVelocity;

            photo.x += photo.vx;
            photo.y += photo.vy;

            if (photo.x < 0) { photo.x = 0; photo.vx = -photo.vx * PHYSICS.bounceFactor; }
            else if (photo.x > containerWidth - photo.size) { photo.x = containerWidth - photo.size; photo.vx = -photo.vx * PHYSICS.bounceFactor; }

            if (photo.y < 0) { photo.y = 0; photo.vy = -photo.vy * PHYSICS.bounceFactor; }
            else if (photo.y > containerHeight - photo.size) {
                photo.y = containerHeight - photo.size;
                photo.vy = -photo.vy * PHYSICS.bounceFactor;
                photo.vy -= PHYSICS.airForce * 3;
            }

            photo.rotation += photo.rotationSpeed + (photo.vx * 0.5);
            if (photo.x <= 0 || photo.x >= containerWidth - photo.size) {
                photo.rotationSpeed = -photo.rotationSpeed * 0.8 + (Math.random() - 0.5) * 3;
            }

            photo.element.style.left = `${photo.x}px`;
            photo.element.style.top = `${photo.y}px`;
            photo.element.style.transform = `rotate(${photo.rotation}deg)`;
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    animate();
}

// ===== Bubble Effect =====
function startBubbleEffect() {
    if (bubbleIntervalId) clearInterval(bubbleIntervalId);

    bubbleIntervalId = setInterval(() => {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.left = `${10 + Math.random() * 80}%`;
        bubble.style.animationDuration = `${1 + Math.random() * 0.5}s`;
        bubble.style.width = `${4 + Math.random() * 6}px`;
        bubble.style.height = bubble.style.width;
        airBubbles.appendChild(bubble);
        setTimeout(() => bubble.remove(), 1400);
    }, 100);
}

// ===== Draw Winner =====
async function drawWinner() {
    if (isDrawing || remainingParticipants.length === 0) return;

    isDrawing = true;
    drawBtn.disabled = true;

    const originalAirForce = PHYSICS.airForce;
    PHYSICS.airForce = 1.0;
    photoElements.forEach(photo => {
        photo.vx *= 1.5;
        photo.vy *= 1.5;
    });

    await sleep(500);

    const winnerIndex = Math.floor(Math.random() * photoElements.length);
    const winnerPhoto = photoElements[winnerIndex];
    const winner = winnerPhoto.participant;

    winnerPhoto.element.classList.add('selected');
    await sleep(300);

    await animateBallToFunnelThenTrack(winnerPhoto, winner);

    const participantIndex = remainingParticipants.findIndex(p => p.id === winner.id);
    remainingParticipants.splice(participantIndex, 1);

    const photoIndex = photoElements.indexOf(winnerPhoto);
    photoElements.splice(photoIndex, 1);
    winnerPhoto.element.remove();

    winners.push(winner);
    addToPlatform(winner);
    createConfetti();

    PHYSICS.airForce = originalAirForce;
    isDrawing = false;
    drawBtn.disabled = remainingParticipants.length === 0;

    if (remainingParticipants.length === 0) {
        drawBtn.querySelector('.btn-text').textContent = '🎉 抽獎結束';
    }
}

// ===== Animate Ball Through Track =====
async function animateBallToFunnelThenTrack(winnerPhoto, winner) {
    const photoEl = winnerPhoto.element;
    const photoRect = photoEl.getBoundingClientRect();
    const photoSize = TRACK_CONFIG.ballDiameter - 4;

    // Create traveling photo
    const travelingPhoto = document.createElement('div');
    travelingPhoto.className = 'photo-traveling';
    travelingPhoto.innerHTML = `<img src="${winner.photo}" alt="${winner.name}">`;
    travelingPhoto.style.left = `${photoRect.left}px`;
    travelingPhoto.style.top = `${photoRect.top}px`;
    travelingPhoto.style.width = `${photoSize}px`;
    travelingPhoto.style.height = `${photoSize}px`;
    document.body.appendChild(travelingPhoto);

    photoEl.classList.add('exiting');
    photoEl.style.opacity = '0';

    // Generate waypoints dynamically from config
    const waypoints = generateWaypoints(photoRect);

    // Animate through waypoints
    let rotation = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
        const from = waypoints[i];
        const to = waypoints[i + 1];
        const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
        // 移除最小持續時間限制，讓速度保持恆定（1.2ms per pixel ≈ 833 px/s）
        const duration = distance * 1.2;

        await animateSegment(travelingPhoto, from.x, from.y, to.x, to.y, duration, rotation);
        rotation += distance * 0.5;  // 降低自旋轉速度（從 2 改為 0.5）
    }

    travelingPhoto.remove();
}

// ===== Animate Single Segment =====
function animateSegment(el, fromX, fromY, toX, toY, duration, startRotation) {
    return new Promise(resolve => {
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // 使用 ease-in-out 緩動函數，讓動畫更流暢
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const x = fromX + (toX - fromX) * eased;
            const y = fromY + (toY - fromY) * eased;
            const rotation = startRotation + progress * 60;  // 降低每段的旋轉角度（從 180 改為 60）

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.transform = `rotate(${rotation}deg)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        }

        requestAnimationFrame(animate);
    });
}

// ===== Add to Platform =====
function addToPlatform(winner) {
    const winnerEl = document.createElement('div');
    winnerEl.className = 'platform-winner';

    // Calculate ball size based on current platform height
    const platformSurface = document.querySelector('.platform-surface');
    const platformHeight = platformSurface.offsetHeight;
    // Set ball size to 90% of platform height, with a minimum of 20px
    const ballSize = Math.max(20, Math.round(platformHeight * 0.9));

    winnerEl.innerHTML = `
        <div class="platform-winner-photo" style="width: ${ballSize}px; height: ${ballSize}px;">
            <img src="${winner.photo}" alt="${winner.name}">
        </div>
        <div class="platform-winner-rank">#${winners.length}</div>
    `;
    platformSlots.appendChild(winnerEl);
}

// ===== Create Confetti =====
function createConfetti() {
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96c93d', '#f093fb'];

    for (let i = 0; i < 40; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        if (Math.random() > 0.5) confetti.style.borderRadius = '50%';
        confettiContainer.appendChild(confetti);
        setTimeout(() => confetti.remove(), 4000);
    }
}

// ===== Reset Game =====
function resetGame() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (bubbleIntervalId) clearInterval(bubbleIntervalId);

    remainingParticipants = [...participants];
    winners = [];
    isDrawing = false;

    platformSlots.innerHTML = '';
    drawBtn.disabled = false;
    drawBtn.querySelector('.btn-text').textContent = '🎲 抽出得獎者';

    initializePhotos();
}

// ===== Utility =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Event Listeners =====
drawBtn.addEventListener('click', drawWinner);
resetBtn.addEventListener('click', resetGame);

// ===== Editor DOM Elements =====
const editorToggle = document.getElementById('editorToggle');
const editorContent = document.getElementById('editorContent');
const chamberWidthSlider = document.getElementById('chamberWidthSlider');
const chamberHeightSlider = document.getElementById('chamberHeightSlider');
const ballDiameterSlider = document.getElementById('ballDiameterSlider');
const chamberWidthValue = document.getElementById('chamberWidthValue');
const chamberHeightValue = document.getElementById('chamberHeightValue');
const ballDiameterValue = document.getElementById('ballDiameterValue');
const startXInput = document.getElementById('startX');
const startYInput = document.getElementById('startY');
const endXInput = document.getElementById('endX');
const endYInput = document.getElementById('endY');
const nodeList = document.getElementById('nodeList');
const nodePathPreview = document.getElementById('nodePathPreview');
const addNodeBtn = document.getElementById('addNodeBtn');
const lotteryMachine = document.getElementById('lotteryMachine');
const trackContainer = document.getElementById('trackContainer');

// ===== Settings Persistence =====
// Auto-save to config.json using backend API
async function saveSettings() {
    const lotteryMachine = document.getElementById('lotteryMachine');
    const winnersPlatform = document.getElementById('winnersPlatform');
    const chamber = document.getElementById('chamber');

    const settings = {
        trackConfig: TRACK_CONFIG,
        physics: {
            gravity: PHYSICS.gravity,
            airForce: PHYSICS.airForce,
            lateralAirForce: PHYSICS.lateralAirForce,
            maxVelocity: PHYSICS.maxVelocity
        },
        chamberStyle: {
            left: lotteryMachine.style.left || '',
            bottom: lotteryMachine.style.bottom || '',
            width: lotteryMachine.style.width || '',
            chamberHeight: chamber?.style.height || ''
        },
        platformStyle: {
            left: winnersPlatform.style.left || '',
            top: winnersPlatform.style.top || '',
            width: winnersPlatform.style.width || '',
            height: winnersPlatform.querySelector('.platform-surface')?.style.height || ''
        }
    };

    // Save to localStorage as backup
    localStorage.setItem('lotterySettings', JSON.stringify(settings));

    // Try to save to server
    try {
        const response = await fetch('/api/save-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅', result.message);
        } else {
            console.warn('儲存到伺服器失敗');
        }
    } catch (err) {
        console.warn('無法連接到伺服器，設定已儲存到 localStorage:', err);
    }
}

// Load settings from server
async function loadSettings() {
    console.log('🔄 開始載入設定...');
    // Try to load from server first
    try {
        const response = await fetch('/api/load-config');
        console.log('📡 伺服器回應狀態:', response.status);
        if (response.ok) {
            const settings = await response.json();
            console.log('📥 從伺服器載入的設定:', settings);
            if (settings.trackConfig) {
                Object.assign(TRACK_CONFIG, settings.trackConfig);
                console.log('✅ TRACK_CONFIG 已更新:', TRACK_CONFIG);
            }
            if (settings.physics) {
                PHYSICS.gravity = settings.physics.gravity ?? PHYSICS.gravity;
                PHYSICS.airForce = settings.physics.airForce ?? PHYSICS.airForce;
                PHYSICS.lateralAirForce = settings.physics.lateralAirForce ?? PHYSICS.lateralAirForce;
                PHYSICS.maxVelocity = settings.physics.maxVelocity ?? PHYSICS.maxVelocity;
                console.log('✅ PHYSICS 已更新:', PHYSICS);
            }
            // Restore chamber position/size
            if (settings.chamberStyle) {
                const lotteryMachine = document.getElementById('lotteryMachine');
                const chamber = document.getElementById('chamber');
                if (settings.chamberStyle.left) lotteryMachine.style.left = settings.chamberStyle.left;
                if (settings.chamberStyle.bottom) lotteryMachine.style.bottom = settings.chamberStyle.bottom;
                if (settings.chamberStyle.width) {
                    lotteryMachine.style.width = settings.chamberStyle.width;
                    lotteryMachine.style.maxWidth = 'none';
                }
                if (settings.chamberStyle.chamberHeight && chamber) {
                    chamber.style.height = settings.chamberStyle.chamberHeight;
                }
            }
            // Restore platform position/size
            if (settings.platformStyle) {
                const winnersPlatform = document.getElementById('winnersPlatform');
                const platformSurface = winnersPlatform.querySelector('.platform-surface');
                if (settings.platformStyle.left) winnersPlatform.style.left = settings.platformStyle.left;
                if (settings.platformStyle.top) winnersPlatform.style.top = settings.platformStyle.top;
                if (settings.platformStyle.width) winnersPlatform.style.width = settings.platformStyle.width;
                if (settings.platformStyle.height && platformSurface) {
                    platformSurface.style.height = settings.platformStyle.height;
                    platformSurface.style.minHeight = settings.platformStyle.height;
                    // Update ball sizes after height is set
                    setTimeout(() => {
                        if (typeof window.updatePlatformBallSizes === 'function') {
                            window.updatePlatformBallSizes();
                        }
                    }, 100);
                }
            }
            console.log('✅ 從伺服器載入設定成功');
            return;
        }
    } catch (err) {
        console.warn('❌ 無法從伺服器載入設定，嘗試從 localStorage 載入:', err);
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('lotterySettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            if (settings.trackConfig) {
                Object.assign(TRACK_CONFIG, settings.trackConfig);
            }
            if (settings.physics) {
                PHYSICS.gravity = settings.physics.gravity ?? PHYSICS.gravity;
                PHYSICS.airForce = settings.physics.airForce ?? PHYSICS.airForce;
                PHYSICS.lateralAirForce = settings.physics.lateralAirForce ?? PHYSICS.lateralAirForce;
                PHYSICS.maxVelocity = settings.physics.maxVelocity ?? PHYSICS.maxVelocity;
            }
            // Restore chamber position/size
            if (settings.chamberStyle) {
                const lotteryMachine = document.getElementById('lotteryMachine');
                const chamber = document.getElementById('chamber');
                if (settings.chamberStyle.left) lotteryMachine.style.left = settings.chamberStyle.left;
                if (settings.chamberStyle.bottom) lotteryMachine.style.bottom = settings.chamberStyle.bottom;
                if (settings.chamberStyle.width) {
                    lotteryMachine.style.width = settings.chamberStyle.width;
                    lotteryMachine.style.maxWidth = 'none';
                }
                if (settings.chamberStyle.chamberHeight && chamber) {
                    chamber.style.height = settings.chamberStyle.chamberHeight;
                }
            }
            // Restore platform position/size
            if (settings.platformStyle) {
                const winnersPlatform = document.getElementById('winnersPlatform');
                const platformSurface = winnersPlatform.querySelector('.platform-surface');
                if (settings.platformStyle.left) winnersPlatform.style.left = settings.platformStyle.left;
                if (settings.platformStyle.top) winnersPlatform.style.top = settings.platformStyle.top;
                if (settings.platformStyle.width) winnersPlatform.style.width = settings.platformStyle.width;
                if (settings.platformStyle.height && platformSurface) {
                    platformSurface.style.height = settings.platformStyle.height;
                    platformSurface.style.minHeight = settings.platformStyle.height;
                    // Update ball sizes after height is set
                    setTimeout(() => {
                        if (typeof window.updatePlatformBallSizes === 'function') {
                            window.updatePlatformBallSizes();
                        }
                    }, 100);
                }
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }
}

// ===== Apply Config to UI =====
function applyConfigToUI() {
    // Chamber & Ball sliders
    chamberWidthSlider.value = TRACK_CONFIG.chamberWidth;
    chamberWidthValue.textContent = Math.round(TRACK_CONFIG.chamberWidth);
    chamberHeightSlider.value = TRACK_CONFIG.chamberHeight;
    chamberHeightValue.textContent = Math.round(TRACK_CONFIG.chamberHeight);
    ballDiameterSlider.value = TRACK_CONFIG.ballDiameter;
    ballDiameterValue.textContent = Math.round(TRACK_CONFIG.ballDiameter);

    // Start/End points
    startXInput.value = TRACK_CONFIG.startPoint.x;
    startYInput.value = TRACK_CONFIG.startPoint.y;
    endXInput.value = TRACK_CONFIG.endPoint.x;
    endYInput.value = TRACK_CONFIG.endPoint.y;

    // Physics sliders
    gravitySlider.value = PHYSICS.gravity;
    gravityValue.textContent = PHYSICS.gravity;
    airForceSlider.value = PHYSICS.airForce;
    airForceValue.textContent = PHYSICS.airForce;
    lateralAirForceSlider.value = PHYSICS.lateralAirForce;
    lateralAirForceValue.textContent = PHYSICS.lateralAirForce;
    maxVelocitySlider.value = PHYSICS.maxVelocity;
    maxVelocityValue.textContent = PHYSICS.maxVelocity;
}

// ===== Apply Visual Changes =====
function applyVisualChanges() {
    // Update chamber size
    const chamberEl = document.getElementById('chamber');
    chamberEl.style.height = `${TRACK_CONFIG.chamberHeight}px`;
    lotteryMachine.style.maxWidth = `${TRACK_CONFIG.chamberWidth}px`;

    // Update ball sizes
    const photoItems = document.querySelectorAll('.photo-item');
    photoItems.forEach(item => {
        item.style.width = `${TRACK_CONFIG.ballDiameter}px`;
        item.style.height = `${TRACK_CONFIG.ballDiameter}px`;
    });

    // Update track width
    TRACK_CONFIG.trackWidth = Math.round(TRACK_CONFIG.ballDiameter * 0.76);

    // Update funnel
    const funnelNeck = document.querySelector('.funnel-neck');
    if (funnelNeck) {
        funnelNeck.style.width = `${TRACK_CONFIG.trackWidth}px`;
    }

    // Update photo elements array sizes
    photoElements.forEach(photo => {
        photo.size = TRACK_CONFIG.ballDiameter;
    });

    // Render dynamic track
    renderDynamicTrack();
}


// ===== Render Dynamic Track (Smooth SVG Only) =====
function renderDynamicTrack() {
    // Clear existing dynamic tracks (legacy straight-line segments)
    const existingTracks = trackContainer.querySelectorAll('.dynamic-track-segment, .dynamic-track-corner');
    existingTracks.forEach(el => el.remove());

    // Hide static tracks
    const staticTracks = trackContainer.querySelectorAll('.track-segment, .track-corner');
    staticTracks.forEach(el => el.style.display = 'none');

    // Always render smooth SVG track
    renderSmoothTrack();
}

// ===== Generate Waypoints for Animation (Following Bezier Curve) =====
function generateWaypoints(photoRect) {
    const mainRect = mainContent.getBoundingClientRect();
    const halfSize = TRACK_CONFIG.ballDiameter / 2;

    // Build control points for the curve
    const controlPoints = [
        { x: TRACK_CONFIG.startPoint.x, y: TRACK_CONFIG.startPoint.y },
        ...TRACK_CONFIG.nodes.map(n => ({ x: n.x, y: n.y })),
        { x: TRACK_CONFIG.endPoint.x, y: TRACK_CONFIG.endPoint.y }
    ];

    // Generate smooth curve waypoints by sampling the Catmull-Rom spline
    const curveWaypoints = sampleCatmullRomSpline(controlPoints, 50); // 50 samples along curve

    // Convert % to screen coordinates
    const waypoints = [{ x: photoRect.left, y: photoRect.top }];

    curveWaypoints.forEach(pt => {
        const screenX = mainRect.left + (pt.x / 100) * mainRect.width - halfSize;
        const screenY = mainRect.top + (pt.y / 100) * mainRect.height - halfSize;
        waypoints.push({ x: screenX, y: screenY });
    });

    return waypoints;
}

// ===== Sample points along Catmull-Rom Spline =====
function sampleCatmullRomSpline(points, numSamples) {
    if (points.length < 2) return points;
    if (points.length === 2) {
        // Linear interpolation for 2 points
        const samples = [];
        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            samples.push({
                x: points[0].x + (points[1].x - points[0].x) * t,
                y: points[0].y + (points[1].y - points[0].y) * t
            });
        }
        return samples;
    }

    // Add phantom points for smooth endpoints
    const extendedPoints = [
        { x: points[0].x * 2 - points[1].x, y: points[0].y * 2 - points[1].y },
        ...points,
        { x: points[points.length - 1].x * 2 - points[points.length - 2].x, y: points[points.length - 1].y * 2 - points[points.length - 2].y }
    ];

    const samples = [];
    const totalSegments = points.length - 1;
    const samplesPerSegment = Math.ceil(numSamples / totalSegments);

    for (let seg = 0; seg < totalSegments; seg++) {
        const p0 = extendedPoints[seg];
        const p1 = extendedPoints[seg + 1];
        const p2 = extendedPoints[seg + 2];
        const p3 = extendedPoints[seg + 3];

        for (let i = 0; i <= samplesPerSegment; i++) {
            if (seg > 0 && i === 0) continue; // Avoid duplicates at segment boundaries
            const t = i / samplesPerSegment;

            // Catmull-Rom spline interpolation
            const t2 = t * t;
            const t3 = t2 * t;

            const x = 0.5 * (
                (2 * p1.x) +
                (-p0.x + p2.x) * t +
                (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
            );
            const y = 0.5 * (
                (2 * p1.y) +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
            );

            samples.push({ x, y });
        }
    }

    return samples;
}

// ===== Update Node List UI =====
function updateNodeListUI() {
    nodeList.innerHTML = '';

    TRACK_CONFIG.nodes.forEach((node, index) => {
        const nodeItem = document.createElement('div');
        nodeItem.className = 'node-item';
        nodeItem.innerHTML = `
            <span class="node-id">${node.id}</span>
            <span>X:</span>
            <input type="number" class="node-x" data-index="${index}" value="${node.x}" min="0" max="100">
            <span>%</span>
            <span>Y:</span>
            <input type="number" class="node-y" data-index="${index}" value="${node.y}" min="0" max="100">
            <span>%</span>
            <button class="btn-remove-node" data-index="${index}">刪除</button>
        `;
        nodeList.appendChild(nodeItem);
    });

    // Update path preview
    const nodeLabels = TRACK_CONFIG.nodes.map(n => n.id).join(' → ');
    nodePathPreview.textContent = `起點 → ${nodeLabels || '...'} → 終點`;

    // Add event listeners to new inputs
    nodeList.querySelectorAll('.node-x').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            TRACK_CONFIG.nodes[idx].x = parseInt(e.target.value) || 0;
            applyVisualChanges();
            saveSettings();
        });
    });

    nodeList.querySelectorAll('.node-y').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            TRACK_CONFIG.nodes[idx].y = parseInt(e.target.value) || 0;
            applyVisualChanges();
            saveSettings();
        });
    });

    nodeList.querySelectorAll('.btn-remove-node').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            TRACK_CONFIG.nodes.splice(idx, 1);
            // Re-number nodes
            TRACK_CONFIG.nodes.forEach((n, i) => n.id = i + 1);
            updateNodeListUI();
            applyVisualChanges();
            saveSettings();
        });
    });
}

// ===== Editor Toggle =====
editorToggle.addEventListener('click', () => {
    editorToggle.classList.toggle('active');
    editorContent.classList.toggle('show');
});

// ===== Chamber & Ball Sliders =====
chamberWidthSlider.addEventListener('input', (e) => {
    TRACK_CONFIG.chamberWidth = parseInt(e.target.value);
    chamberWidthValue.textContent = parseInt(e.target.value);
    applyVisualChanges();
    saveSettings();
});

chamberHeightSlider.addEventListener('input', (e) => {
    TRACK_CONFIG.chamberHeight = parseInt(e.target.value);
    chamberHeightValue.textContent = parseInt(e.target.value);
    applyVisualChanges();
    saveSettings();
});

ballDiameterSlider.addEventListener('input', (e) => {
    TRACK_CONFIG.ballDiameter = parseInt(e.target.value);
    ballDiameterValue.textContent = parseInt(e.target.value);
    applyVisualChanges();
    saveSettings();
});

// ===== Start/End Points =====
startXInput.addEventListener('input', (e) => {
    TRACK_CONFIG.startPoint.x = parseInt(e.target.value) || 0;
    applyVisualChanges();
    saveSettings();
});

startYInput.addEventListener('input', (e) => {
    TRACK_CONFIG.startPoint.y = parseInt(e.target.value) || 0;
    applyVisualChanges();
    saveSettings();
});

endXInput.addEventListener('input', (e) => {
    TRACK_CONFIG.endPoint.x = parseInt(e.target.value) || 0;
    applyVisualChanges();
    saveSettings();
});

endYInput.addEventListener('input', (e) => {
    TRACK_CONFIG.endPoint.y = parseInt(e.target.value) || 0;
    applyVisualChanges();
    saveSettings();
});

// ===== Add Node Button =====
addNodeBtn.addEventListener('click', () => {
    const newId = TRACK_CONFIG.nodes.length + 1;
    const lastNode = TRACK_CONFIG.nodes[TRACK_CONFIG.nodes.length - 1] || TRACK_CONFIG.startPoint;
    TRACK_CONFIG.nodes.push({
        id: newId,
        x: Math.min(95, lastNode.x + 10),
        y: Math.max(5, lastNode.y - 10)
    });
    updateNodeListUI();
    applyVisualChanges();
    saveSettings();
});

// ===== Visual Edit Mode =====
let isEditMode = false;
let isDragging = false;
let dragTarget = null;
let dragType = null; // 'start', 'end', or node index

const editModeCheckbox = document.getElementById('editModeCheckbox');
const nodeHandlesOverlay = document.getElementById('nodeHandlesOverlay');
const trackSvg = document.getElementById('trackSvg');
const trackPath = document.getElementById('trackPath');
const trackPathGlow = document.getElementById('trackPathGlow');

// Toggle Edit Mode
editModeCheckbox.addEventListener('change', (e) => {
    isEditMode = e.target.checked;
    toggleEditMode(isEditMode);
});

function toggleEditMode(enabled) {
    isEditMode = enabled;
    mainContent.classList.toggle('edit-mode-active', enabled);
    nodeHandlesOverlay.classList.toggle('edit-active', enabled);
    
    // Also add edit-mode-active class to platform and chamber for resize handles
    const winnersPlatform = document.getElementById('winnersPlatform');
    const lotteryMachine = document.getElementById('lotteryMachine');
    
    if (enabled) {
        winnersPlatform.classList.add('edit-mode-active');
        lotteryMachine.classList.add('edit-mode-active');
        renderNodeHandles();
        renderSmoothTrack();
    } else {
        winnersPlatform.classList.remove('edit-mode-active');
        lotteryMachine.classList.remove('edit-mode-active');
        nodeHandlesOverlay.innerHTML = '';
    }
}

// Render Node Handles
function renderNodeHandles() {
    nodeHandlesOverlay.innerHTML = '';
    const mainRect = mainContent.getBoundingClientRect();

    // Start point handle
    const startHandle = createNodeHandle('start', '起點', TRACK_CONFIG.startPoint.x, TRACK_CONFIG.startPoint.y, 'start-node');
    nodeHandlesOverlay.appendChild(startHandle);

    // Waypoint handles
    TRACK_CONFIG.nodes.forEach((node, index) => {
        const handle = createNodeHandle(index, node.id.toString(), node.x, node.y, 'waypoint-node');
        nodeHandlesOverlay.appendChild(handle);
    });

    // End point handle
    const endHandle = createNodeHandle('end', '終點', TRACK_CONFIG.endPoint.x, TRACK_CONFIG.endPoint.y, 'end-node');
    nodeHandlesOverlay.appendChild(endHandle);
}

function createNodeHandle(type, label, xPercent, yPercent, className) {
    const handle = document.createElement('div');
    handle.className = `node-handle ${className}`;
    handle.textContent = label;
    handle.style.left = `${xPercent}%`;
    handle.style.top = `${yPercent}%`;
    handle.dataset.type = type;

    // Mouse events for dragging
    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        dragTarget = handle;
        dragType = type;
        handle.style.cursor = 'grabbing';
    });

    return handle;
}

// Global mouse events for dragging
document.addEventListener('mousemove', (e) => {
    if (!isDragging || !dragTarget) return;

    const mainRect = mainContent.getBoundingClientRect();
    const x = ((e.clientX - mainRect.left) / mainRect.width) * 100;
    const y = ((e.clientY - mainRect.top) / mainRect.height) * 100;

    // Clamp to bounds
    const clampedX = Math.max(2, Math.min(98, x));
    const clampedY = Math.max(2, Math.min(98, y));

    // Update position
    dragTarget.style.left = `${clampedX}%`;
    dragTarget.style.top = `${clampedY}%`;

    // Update config
    if (dragType === 'start') {
        TRACK_CONFIG.startPoint.x = Math.round(clampedX);
        TRACK_CONFIG.startPoint.y = Math.round(clampedY);
        startXInput.value = Math.round(clampedX);
        startYInput.value = Math.round(clampedY);
    } else if (dragType === 'end') {
        TRACK_CONFIG.endPoint.x = Math.round(clampedX);
        TRACK_CONFIG.endPoint.y = Math.round(clampedY);
        endXInput.value = Math.round(clampedX);
        endYInput.value = Math.round(clampedY);
    } else {
        const nodeIndex = parseInt(dragType);
        TRACK_CONFIG.nodes[nodeIndex].x = Math.round(clampedX);
        TRACK_CONFIG.nodes[nodeIndex].y = Math.round(clampedY);
    }

    // Update smooth track
    renderSmoothTrack();
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        if (dragTarget) {
            dragTarget.style.cursor = 'grab';
        }
        dragTarget = null;
        dragType = null;

        // Save and update UI
        updateNodeListUI();
        renderDynamicTrack();
        saveSettings();
    }
});

// Render Smooth Bezier Track (Catmull-Rom Spline)
function renderSmoothTrack() {
    if (!trackPath || !trackPathGlow) return;

    const mainRect = mainContent.getBoundingClientRect();
    const trackWidth = TRACK_CONFIG.trackWidth;

    // Build points array
    const points = [
        { x: (TRACK_CONFIG.startPoint.x / 100) * mainRect.width, y: (TRACK_CONFIG.startPoint.y / 100) * mainRect.height },
        ...TRACK_CONFIG.nodes.map(n => ({ x: (n.x / 100) * mainRect.width, y: (n.y / 100) * mainRect.height })),
        { x: (TRACK_CONFIG.endPoint.x / 100) * mainRect.width, y: (TRACK_CONFIG.endPoint.y / 100) * mainRect.height }
    ];

    if (points.length < 2) return;

    // Generate smooth path using Catmull-Rom spline
    const pathD = generateCatmullRomPath(points);

    trackPath.setAttribute('d', pathD);
    trackPath.setAttribute('stroke-width', trackWidth);
    trackPathGlow.setAttribute('d', pathD);
    trackPathGlow.setAttribute('stroke-width', trackWidth + 15);
}

function generateCatmullRomPath(points) {
    if (points.length < 2) return '';
    if (points.length === 2) {
        return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
    }

    // Add phantom points at start and end for smooth curve endpoints
    const extendedPoints = [
        { x: points[0].x * 2 - points[1].x, y: points[0].y * 2 - points[1].y },
        ...points,
        { x: points[points.length - 1].x * 2 - points[points.length - 2].x, y: points[points.length - 1].y * 2 - points[points.length - 2].y }
    ];

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = extendedPoints[i];
        const p1 = extendedPoints[i + 1];
        const p2 = extendedPoints[i + 2];
        const p3 = extendedPoints[i + 3];

        // Catmull-Rom to Bezier conversion
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    return path;
}

// Override renderDynamicTrack to add node handles when in edit mode
const originalRenderDynamicTrack = renderDynamicTrack;
renderDynamicTrack = function () {
    originalRenderDynamicTrack();
    if (isEditMode) {
        renderNodeHandles();
    }
};

// ===== Physics Sliders with Save =====
gravitySlider.addEventListener('input', (e) => {
    PHYSICS.gravity = parseFloat(e.target.value);
    gravityValue.textContent = e.target.value;
    saveSettings();
});

airForceSlider.addEventListener('input', (e) => {
    PHYSICS.airForce = parseFloat(e.target.value);
    airForceValue.textContent = e.target.value;
    saveSettings();
});

lateralAirForceSlider.addEventListener('input', (e) => {
    PHYSICS.lateralAirForce = parseFloat(e.target.value);
    lateralAirForceValue.textContent = e.target.value;
    saveSettings();
});

maxVelocitySlider.addEventListener('input', (e) => {
    PHYSICS.maxVelocity = parseFloat(e.target.value);
    maxVelocityValue.textContent = e.target.value;
    saveSettings();
});

// ===== Chamber and Platform Drag Resize/Move =====
function setupElementDragHandles() {
    const lotteryMachine = document.getElementById('lotteryMachine');
    const winnersPlatform = document.getElementById('winnersPlatform');
    const chamber = document.getElementById('chamber');

    console.log('setupElementDragHandles called');
    console.log('lotteryMachine:', lotteryMachine);
    console.log('winnersPlatform:', winnersPlatform);

    // Add handles to lottery machine (chamber)
    addDragHandlesToElement(lotteryMachine, 'chamber');

    // Add handles to winners platform
    addDragHandlesToElement(winnersPlatform, 'platform');
}

function addDragHandlesToElement(element, type) {
    // Remove existing handles
    element.querySelectorAll('.resize-handle, .move-handle').forEach(h => h.remove());

    // Create move handle
    const moveHandle = document.createElement('div');
    moveHandle.className = 'move-handle';
    moveHandle.dataset.action = 'move';
    moveHandle.dataset.type = type;
    element.appendChild(moveHandle);

    // Create corner resize handles
    ['se', 'sw', 'ne', 'nw'].forEach(corner => {
        const handle = document.createElement('div');
        handle.className = `resize-handle corner-${corner}`;
        handle.dataset.action = `resize-${corner}`;
        handle.dataset.type = type;
        element.appendChild(handle);
    });

    // Create edge resize handles
    ['e', 'w', 's', 'n'].forEach(edge => {
        const handle = document.createElement('div');
        handle.className = `resize-handle edge-${edge}`;
        handle.dataset.action = `resize-${edge}`;
        handle.dataset.type = type;
        element.appendChild(handle);
    });

    // Setup drag events
    element.querySelectorAll('.resize-handle, .move-handle').forEach(handle => {
        handle.addEventListener('mousedown', startElementDrag);
    });
    
    console.log(`Added ${type} handles to element:`, element.className);
}

let elementDragState = null;

function startElementDrag(e) {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    // Find the handle element (might be a child element)
    let handle = e.target;
    while (handle && !handle.classList.contains('resize-handle') && !handle.classList.contains('move-handle')) {
        handle = handle.parentElement;
    }
    
    if (!handle) {
        console.log('No handle found for event:', e.target);
        return;
    }

    const type = handle.dataset.type;
    const action = handle.dataset.action;
    console.log('Drag started:', { type, action, handleClass: handle.className });

    const element = type === 'chamber' ?
        document.getElementById('lotteryMachine') :
        document.getElementById('winnersPlatform');

    const rect = element.getBoundingClientRect();
    const mainRect = mainContent.getBoundingClientRect();
    
    // For platform, use platform-surface height for resize calculation
    let startHeight = rect.height;
    if (type === 'platform') {
        const platformSurface = element.querySelector('.platform-surface');
        if (platformSurface) {
            startHeight = platformSurface.offsetHeight;
        }
    }

    elementDragState = {
        type,
        action,
        element,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight,
        startLeft: rect.left - mainRect.left,
        startTop: rect.top - mainRect.top,
        mainRect
    };

    console.log('Element drag state:', elementDragState);

    document.addEventListener('mousemove', dragElement);
    document.addEventListener('mouseup', stopElementDrag);
}

function dragElement(e) {
    if (!elementDragState) return;

    const { type, action, element, startX, startY, startWidth, startHeight, startLeft, startTop, mainRect } = elementDragState;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (action === 'move') {
        // Move the element
        if (type === 'chamber') {
            // Chamber uses transform translateX, so we adjust left position relative to center
            const newLeftPercent = ((startLeft + dx + startWidth / 2) / mainRect.width) * 100;
            element.style.left = `${newLeftPercent}%`;
            element.style.transform = 'translateX(-50%)';

            // Update bottom position
            const newBottom = Math.max(0, -dy);
            element.style.bottom = `${newBottom}px`;
        } else {
            // Platform uses absolute positioning
            const newLeft = ((startLeft + dx) / mainRect.width) * 100;
            const newTop = startTop + dy;
            element.style.left = `${Math.max(0, newLeft)}%`;
            element.style.top = `${Math.max(0, newTop)}px`;
        }
    } else if (action.startsWith('resize')) {
        const direction = action.replace('resize-', '');
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newTop = startTop;
        let newLeft = startLeft;

        // Handle width changes
        if (direction.includes('e')) {
            newWidth = startWidth + dx;
        } else if (direction.includes('w')) {
            newWidth = startWidth - dx;
            newLeft = startLeft + dx;
        }

        // Handle height changes
        if (direction.includes('s')) {
            newHeight = startHeight + dy;
        } else if (direction.includes('n')) {
            newHeight = startHeight - dy;
            newTop = startTop + dy;
        }

        // Apply minimum size (no maximum - unlimited)
        newWidth = Math.max(100, newWidth);
        newHeight = Math.max(40, newHeight);

        if (type === 'chamber') {
            element.style.width = `${newWidth}px`;
            element.style.maxWidth = 'none';
            const chamber = document.getElementById('chamber');
            if (chamber) {
                chamber.style.height = `${newHeight}px`;
            }
            // Update TRACK_CONFIG
            TRACK_CONFIG.chamberWidth = newWidth;
            TRACK_CONFIG.chamberHeight = newHeight;
        } else {
            // Platform resize - adjust width and position
            element.style.width = `${newWidth}px`;
            if (newTop !== startTop) {
                element.style.top = `${Math.max(0, newTop)}px`;
            }
            const platformSurface = element.querySelector('.platform-surface');
            
            if (platformSurface) {
                platformSurface.style.height = `${newHeight}px`;
                platformSurface.style.minHeight = `${newHeight}px`;
            }
        }
    }

    // Refresh track
    renderDynamicTrack();
}

function stopElementDrag() {
    if (elementDragState) {
        // Save settings
        saveSettings();
        
        // Update ball sizes if platform was resized
        if (elementDragState.type === 'platform' && elementDragState.action.startsWith('resize')) {
            if (typeof window.updatePlatformBallSizes === 'function') {
                window.updatePlatformBallSizes();
            }
        }
        
        elementDragState = null;
    }
    document.removeEventListener('mousemove', dragElement);
    document.removeEventListener('mouseup', stopElementDrag);
}

// Update renderNodeHandles to also setup element drag handles
const originalRenderNodeHandles = renderNodeHandles;
let elementHandlesSetup = false; // Flag to track if element handles are already set up

renderNodeHandles = function () {
    originalRenderNodeHandles();
    // Only setup element drag handles once
    if (!elementHandlesSetup) {
        setupElementDragHandles();
        elementHandlesSetup = true;
    }
};

// ===== File Settings (Auto-save to config.json) =====
// Settings are automatically saved to config.json via backend API

// ===== Platform Ball Size Adjustment =====
function setupPlatformBallResize() {
    const winnersPlatform = document.getElementById('winnersPlatform');
    const platformSurface = winnersPlatform.querySelector('.platform-surface');
    
    // Function to update ball sizes based on platform height
    function updateBallSizes() {
        const platformHeight = platformSurface.offsetHeight;
        // Ball size should be slightly smaller than platform height
        // Set ball size to 90% of platform height, with a minimum of 20px
        const ballSize = Math.max(20, Math.round(platformHeight * 0.9));

        // Update all winner photos on platform
        const winnerPhotos = platformSlots.querySelectorAll('.platform-winner-photo');
        winnerPhotos.forEach(photo => {
            photo.style.width = `${ballSize}px`;
            photo.style.height = `${ballSize}px`;
        });

        console.log('📏 更新彩球大小:', ballSize, 'px (平台高度:', platformHeight, 'px)');
    }
    
    // Use ResizeObserver to monitor platform height changes
    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            if (entry.target === platformSurface) {
                updateBallSizes();
            }
        }
    });
    
    resizeObserver.observe(platformSurface);
    
    // Also observe winnersPlatform for size changes
    resizeObserver.observe(winnersPlatform);
    
    // Initial update
    updateBallSizes();
    
    // Expose updateBallSizes globally so it can be called from other functions
    window.updatePlatformBallSizes = updateBallSizes;
}

// Initialize application
async function init() {
    console.log('🚀 初始化應用程式...');
    
    // 首先更新響應式配置
    updateResponsiveConfig();
    
    // 監聽視口大小變化
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateResponsiveConfig();
            applyConfigToUI();
            applyVisualChanges();
            console.log('📐 視口大小已改變，配置已更新');
        }, 250);
    });
    
    await loadSettings();
    console.log('📋 設定載入完成，開始應用...');
    applyConfigToUI();
    updateNodeListUI();
    initializePhotos();
    applyVisualChanges();
    setupPlatformBallResize();

    setTimeout(() => {
        photoElements.forEach(photo => {
            photo.vx += (Math.random() - 0.5) * 6;
            photo.vy += (Math.random() - 0.5) * 6;
        });
    }, 500);
}

init();

