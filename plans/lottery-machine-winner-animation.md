# 彩票機中獎動畫修改計劃

## 概述
LotteryMachineLottery.tsx 的中獎動畫需要與 lottery/script.js 的方式保持一致，包括沿著軌道移動的動畫、平台顯示、中獎者排名等功能。

## lottery/script.js 的中獎動畫流程

### 1. drawWinner 函數
```javascript
async function drawWinner() {
    // 1. 增加氣流力和所有照片速度
    const originalAirForce = PHYSICS.airForce;
    PHYSICS.airForce = 1.0;
    photoElements.forEach(photo => {
        photo.vx *= 1.5;
        photo.vy *= 1.5;
    });
    
    // 2. 等待 500ms
    await sleep(500);
    
    // 3. 隨機選擇中獎者
    const winnerIndex = Math.floor(Math.random() * photoElements.length);
    const winnerPhoto = photoElements[winnerIndex];
    const winner = winnerPhoto.participant;
    
    // 4. 標記中獎者照片
    winnerPhoto.element.classList.add('selected');
    await sleep(300);
    
    // 5. 執行沿著軌道移動的動畫
    await animateBallToFunnelThenTrack(winnerPhoto, winner);
    
    // 6. 將中獎者從 remainingParticipants 移除
    const participantIndex = remainingParticipants.findIndex(p => p.id === winner.id);
    remainingParticipants.splice(participantIndex, 1);
    
    // 7. 將中獎者添加到 winners 陣列
    winners.push(winner);
    
    // 8. 在平台上顯示中獎者
    addToPlatform(winner);
    
    // 9. 創建紙屑效果
    createConfetti();
    
    // 10. 恢復原始氣流力
    PHYSICS.airForce = originalAirForce;
}
```

### 2. animateBallToFunnelThenTrack 函數
```javascript
async function animateBallToFunnelThenTrack(winnerPhoto, winner) {
    const photoEl = winnerPhoto.element;
    const photoRect = photoEl.getBoundingClientRect();
    const photoSize = TRACK_CONFIG.ballDiameter - 4;
    
    // 1. 創建 travelingPhoto 元素（複製中獎者照片）
    const travelingPhoto = document.createElement('div');
    travelingPhoto.className = 'photo-traveling';
    travelingPhoto.innerHTML = `<img src="${winner.photo}" alt="${winner.name}">`;
    travelingPhoto.style.left = `${photoRect.left}px`;
    travelingPhoto.style.top = `${photoRect.top}px`;
    travelingPhoto.style.width = `${photoSize}px`;
    travelingPhoto.style.height = `${photoSize}px`;
    document.body.appendChild(travelingPhoto);
    
    // 2. 將中獎者照片標記為 'exiting'（隱藏）
    photoEl.classList.add('exiting');
    photoEl.style.opacity = '0';
    
    // 3. 生成 waypoints（使用 Catmull-Rom spline）
    const waypoints = generateWaypoints(photoRect);
    
    // 4. 逐段動畫照片沿著軌道移動
    let rotation = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
        const from = waypoints[i];
        const to = waypoints[i + 1];
        const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
        const duration = distance * 1.2;
        
        await animateSegment(travelingPhoto, from.x, from.y, to.x, to.y, duration, rotation);
        rotation += distance * 0.5;
    }
    
    // 5. 移除 travelingPhoto
    travelingPhoto.remove();
}
```

### 3. animateSegment 函數
```javascript
function animateSegment(el, fromX, fromY, toX, toY, duration, startRotation) {
    return new Promise(resolve => {
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用 ease-in-out 緩動函數
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const x = fromX + (toX - fromX) * eased;
            const y = fromY + (toY - fromY) * eased;
            const rotation = startRotation + progress * 60;
            
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
```

### 4. addToPlatform 函數
```javascript
function addToPlatform(winner) {
    const winnerEl = document.createElement('div');
    winnerEl.className = 'platform-winner';
    
    // 計算球的大小（基於平台高度）
    const platformSurface = document.querySelector('.platform-surface');
    const platformHeight = platformSurface.offsetHeight;
    const ballSize = Math.max(20, Math.round(platformHeight * 0.9));
    
    winnerEl.innerHTML = `
        <div class="platform-winner-photo" style="width: ${ballSize}px; height: ${ballSize}px;">
            <img src="${winner.photo}" alt="${winner.name}">
        </div>
        <div class="platform-winner-rank">#${winners.length}</div>
    `;
    platformSlots.appendChild(winnerEl);
}
```

## LotteryMachineLottery.tsx 需要添加的功能

### 1. 沿著軌道移動的動畫
- 創建 travelingPhoto 元素（複製中獎者照片）
- 將中獎者照片標記為 'exiting'（隱藏）
- 生成 waypoints（使用 Catmull-Rom spline）
- 逐段動畫照片沿著軌道移動
- 照片在移動時會旋轉
- 移除 travelingPhoto

### 2. 平台顯示
- 在組件中添加平台區域
- 顯示所有中獎者照片
- 照片大小根據平台高度自動調整

### 3. 中獎者排名
- 顯示中獎者排名（#1, #2, #3...）
- 排序根據中獎順序

### 4. 多輪抽獎
- 支援連續抽出多位中獎者
- 每次抽獎後更新平台
- 顯示「下一位」按鈕

## 實作步驟

### 步驟 1：添加沿著軌道移動的動畫
1. 在 LotteryMachineLottery.tsx 中添加 `animateBallToFunnelThenTrack` 函數
2. 添加 `animateSegment` 函數
3. 修改 `drawWinner` 函數，在標記中獎者後執行 `animateBallToFunnelThenTrack`

### 步驟 2：添加平台顯示
1. 在 LotteryMachineLottery.tsx 中添加平台區域的 JSX
2. 添加 `winners` 狀態陣列
3. 添加 `addToPlatform` 函數

### 步驟 3：添加中獎者排名
1. 在 `addToPlatform` 函數中顯示中獎者排名
2. 使用 `winners.length` 作為排名編號

### 步驟 4：添加多輪抽獎支援
1. 修改 `drawWinner` 函數，支援連續抽獎
2. 添加「下一位」按鈕
3. 更新 `winners` 陣列

## 注意事項

1. **動畫順序**：
   - 增加氣流力和速度
   - 標記中獎者
   - 沿著軌道移動
   - 顯示在平台上
   - 創建紙屑效果

2. **平台顯示**：
   - 平台應該顯示在動畫區域的底部
   - 照片大小根據平台高度自動調整
   - 中獎者排名應該顯示在照片下方

3. **多輪抽獎**：
   - 每次抽獎後更新平台
   - 支援連續抽獎
   - 顯示「下一位」按鈕

## 相關檔案

- [`lottery/script.js`](../lottery/script.js) - 原始中獎動畫實作
- [`src/components/lottery-modes/LotteryMachineLottery.tsx`](../src/components/lottery-modes/LotteryMachineLottery.tsx) - 需要修改的組件
