window._plyrLoadingPromise = (function() {
    if (window.Plyr) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        if (!document.querySelector('link[href*="plyr.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
            document.head.appendChild(link);
        }

        if (!document.querySelector('script[src*="plyr.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://cdn.plyr.io/3.7.8/plyr.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load plyr.js'));
            document.body.appendChild(script);
        } else {
            let checkInterval = setInterval(() => {
                if (window.Plyr) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Timeout waiting for Plyr'));
            }, 5000);
        }
    });
})();

class video_v2 {
    constructor({ videoId, revealDelay = 5 }) {
        this.containerClass = '.video-v2';
        this.revealClass = '.video-v2-hidden';
        this.videoId = videoId;
        this.revealDelay = revealDelay;

        this.container = document.querySelector(this.containerClass);
        if (!this.container) {
            console.error('Container not found:', this.containerClass);
            return;
        }

        this.isMobile = window.innerWidth <= 576;
        this.videoWatchInterval = null;
        this.videoWatchSeconds = 0;
        this.videoTriggered = false;
        this.player = null;
        this.isActivated = false; // Flag to track if user pressed play button (video with sound)

        // Wait for Plyr lib to load before init
        window._plyrLoadingPromise.then(() => {
            this.init();
        }).catch(err => {
            console.error('Error loading Plyr:', err);
        });
    }

    getVideoURL() {
        return `https://vz-c066735f-815.b-cdn.net/${this.videoId}/play_720p.mp4`;
    }

    createVideo() {
        const videoSrc = this.getVideoURL();
        const videoEl = document.createElement('video');
        videoEl.setAttribute('playsinline', '');

        const source = document.createElement('source');
        source.src = videoSrc;
        source.type = 'video/mp4';
        videoEl.appendChild(source);

        const desktopContainer = this.container.querySelector('.video-v2-desktop');
        const mobileContainer = this.container.querySelector('.video-v2-mobile');

        if (!desktopContainer || !mobileContainer) {
            console.error('Desktop or mobile container not found inside', this.containerClass);
            return;
        }

        desktopContainer.innerHTML = '';
        mobileContainer.innerHTML = '';

        const targetContainer = this.isMobile ? mobileContainer : desktopContainer;
        targetContainer.appendChild(videoEl);

        // Remove existing button if any
        const oldBtn = this.container.querySelector('.video-v2-button');
        if (oldBtn) oldBtn.remove();

        // Show button only if not activated yet
        if (!this.isActivated) {
            this.container.insertAdjacentHTML('beforeend', `
                <div class="video-v2-button">
                    <div class="video-v2-button_icon"></div>
                    <div class="video-v2-button_text"></div>
                </div>
            `);
        }

        // Destroy previous player if exists
        if (this.player) {
            this.player.destroy?.();
            this.player = null;
        }

        this.player = new Plyr(videoEl, {
            controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            autoplay: true,
            muted: !this.isActivated,
            loop: { active: true },
        });

        // Play muted video automatically in background
        videoEl.play().catch(() => {});

        // Remove any old intervals on recreate
        clearInterval(this.videoWatchInterval);
        this.videoWatchInterval = null;
        this.videoWatchSeconds = 0;
        this.videoTriggered = false;
    }

    setupResizeListener() {
        let prevIsMobile = this.isMobile;
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 576;
            if (this.isMobile !== prevIsMobile) {
                prevIsMobile = this.isMobile;

                // Remove active class on container
                this.container.classList.remove('active');

                // Reset video triggered flag
                this.videoTriggered = false;
                this.videoWatchSeconds = 0;
                clearInterval(this.videoWatchInterval);

                // Recreate video (will create muted, no controls video)
                this.createVideo();

                // Add play button back if not exists
                if (!this.container.querySelector('.video-v2-button')) {
                    this.container.insertAdjacentHTML('beforeend', `
                    <div class="video-v2-button">
                        <div class="video-v2-button_icon"></div>
                        <div class="video-v2-button_text"></div>
                    </div>
                `);
                }

                // Set volume to 50%
                const parent = this.isMobile
                    ? this.container.querySelector('.video-v2-mobile')
                    : this.container.querySelector('.video-v2-desktop');
                const video = parent.querySelector('video');
                if (video) video.volume = 0;
            }
        });
    }


    setupPlayListener() {
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.video-v2-button');
            if (!btn || !this.container.contains(btn)) return;

            const parent = this.isMobile
                ? this.container.querySelector('.video-v2-mobile')
                : this.container.querySelector('.video-v2-desktop');
            if (!parent) return;

            const video = parent.querySelector('video');
            if (!video) return;

            // Remove play button
            btn.remove();

            this.isActivated = true;
            this.videoTriggered = false;
            this.videoWatchSeconds = 0;
            clearInterval(this.videoWatchInterval);

            video.muted = false;
            video.controls = true;
            video.currentTime = 0;

            video.play();
            video.volume = 1.0;

            // Add 'active' class on container when video plays with sound
            this.container.classList.add('active');

            this.videoWatchInterval = setInterval(() => {
                if (!video.paused && !video.ended) {
                    this.videoWatchSeconds++;
                    if (this.videoWatchSeconds >= this.revealDelay && !this.videoTriggered) {
                        this.videoTriggered = true;
                        clearInterval(this.videoWatchInterval);
                        this.showRevealBlock();
                    }
                }
            }, 1000);
        });
    }

    showRevealBlock() {
        const block = document.querySelector(this.revealClass);
        if (block) block.style.display = 'block';
    }

    init() {
        this.createVideo();
        this.setupResizeListener();
        this.setupPlayListener();
    }
}

// Expose globally
window.video_v2 = video_v2;
