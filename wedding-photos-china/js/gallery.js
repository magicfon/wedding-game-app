/**
 * Wedding Photos Gallery for China
 * Pure JavaScript gallery with lightbox functionality
 */

(function () {
    'use strict';

    // ===== Configuration =====
    // 照片配置 - 請將您的照片放入 images/photos/ 資料夾
    // 格式: { src: '檔案名', landscape: true/false }
    const PHOTOS = [
        // 示例照片 - 請替換為您的實際照片
        { src: '01.jpg', landscape: false },
        { src: '02.jpg', landscape: true },
        { src: '03.jpg', landscape: false },
        { src: '04.jpg', landscape: false },
        { src: '05.jpg', landscape: true },
        { src: '06.jpg', landscape: false },
        { src: '07.jpg', landscape: false },
        { src: '08.jpg', landscape: true },
        { src: '09.jpg', landscape: false },
        { src: '10.jpg', landscape: false },
    ];

    const IMAGE_PATH = 'images/photos/';

    // ===== DOM Elements =====
    const gallery = document.getElementById('gallery');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    // ===== State =====
    let currentIndex = 0;
    let loadedPhotos = [];

    // ===== Gallery Functions =====
    function createPhotoCard(photo, index) {
        const card = document.createElement('div');
        card.className = `photo-card ${photo.landscape ? 'landscape' : 'portrait'}`;
        card.dataset.index = index;

        const img = document.createElement('img');
        img.src = IMAGE_PATH + photo.src;
        img.alt = `婚紗照 ${index + 1}`;
        img.loading = 'lazy';

        // 圖片載入後自動檢測橫直幅
        img.onload = function () {
            const isLandscape = img.naturalWidth > img.naturalHeight;
            if (isLandscape !== photo.landscape) {
                card.classList.toggle('landscape', isLandscape);
                card.classList.toggle('portrait', !isLandscape);
            }
        };

        img.onerror = function () {
            card.style.display = 'none';
            console.warn(`無法載入照片: ${photo.src}`);
        };

        card.appendChild(img);
        card.addEventListener('click', () => openLightbox(index));

        return card;
    }

    function renderGallery() {
        // 清除載入中提示
        gallery.innerHTML = '';

        if (PHOTOS.length === 0) {
            gallery.innerHTML = `
                <div class="loading">
                    <p>📷 照片即將上傳，敬請期待！</p>
                </div>
            `;
            return;
        }

        // 建立照片卡片
        PHOTOS.forEach((photo, index) => {
            const card = createPhotoCard(photo, index);
            gallery.appendChild(card);
            loadedPhotos.push(photo);
        });
    }

    // ===== Lightbox Functions =====
    function openLightbox(index) {
        currentIndex = index;
        updateLightboxImage();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateLightboxImage() {
        const photo = loadedPhotos[currentIndex];
        if (!photo) return;

        lightboxImg.src = IMAGE_PATH + photo.src;
        lightboxImg.alt = `婚紗照 ${currentIndex + 1}`;
        lightboxCounter.textContent = `${currentIndex + 1} / ${loadedPhotos.length}`;

        // 更新導航按鈕狀態
        lightboxPrev.classList.toggle('hidden', currentIndex === 0);
        lightboxNext.classList.toggle('hidden', currentIndex === loadedPhotos.length - 1);
    }

    function goToPrev() {
        if (currentIndex > 0) {
            currentIndex--;
            updateLightboxImage();
        }
    }

    function goToNext() {
        if (currentIndex < loadedPhotos.length - 1) {
            currentIndex++;
            updateLightboxImage();
        }
    }

    // ===== Event Listeners =====
    function setupEventListeners() {
        // 關閉燈箱
        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        // 導航
        lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            goToPrev();
        });
        lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            goToNext();
        });

        // 鍵盤導航
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    closeLightbox();
                    break;
                case 'ArrowLeft':
                    goToPrev();
                    break;
                case 'ArrowRight':
                    goToNext();
                    break;
            }
        });

        // 觸控滑動 (簡易版)
        let touchStartX = 0;
        let touchEndX = 0;

        lightbox.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        lightbox.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    goToNext();
                } else {
                    goToPrev();
                }
            }
        }
    }

    // ===== Initialize =====
    function init() {
        renderGallery();
        setupEventListeners();
    }

    // 頁面載入完成後初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
