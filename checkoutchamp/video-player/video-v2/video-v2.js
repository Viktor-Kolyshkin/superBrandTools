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
    constructor({ desktopVideoId, mobileVideoId, revealDelay = 5 }) {
        this.containerClass = '.video-v2';
        this.revealClass = '.video-v2-hidden';
        this.desktopVideoId = desktopVideoId;
        this.mobileVideoId = mobileVideoId;
        this.revealDelay = revealDelay;

        this.container = document.querySelector(this.containerClass);
        if (!this.container) {
            console.error('Container not found:', this.containerClass);
            return;
        }

        // Detect if device is mobile based on window width
        this.isMobile = window.innerWidth <= 576;

        // Initialize internal state
        this.videoWatchInterval = null;
        this.videoWatchSeconds = 0;
        this.videoTriggered = false;
        this.player = null;
        this.isActivated = false; // Flag to indicate if video is played with sound

        // Wait for Plyr library to load before initializing
        window._plyrLoadingPromise.then(() => {
            this.init();
        }).catch(err => {
            console.error('Error loading Plyr:', err);
        });
    }

    // Return video URL based on device type
    getVideoURL() {
        const id = this.isMobile ? this.mobileVideoId : this.desktopVideoId;
        return `https://vz-c066735f-815.b-cdn.net/${id}/play_720p.mp4`;
    }

    createVideo() {
        const videoSrc = this.getVideoURL();
        const videoEl = document.createElement('video');
        videoEl.setAttribute('playsinline', '');

        const source = document.createElement('source');
        source.src = videoSrc;
        source.type = 'video/mp4';
        videoEl.appendChild(source);

        // Get desktop and mobile containers
        const desktopContainer = this.container.querySelector('.video-v2-desktop');
        const mobileContainer = this.container.querySelector('.video-v2-mobile');

        if (!desktopContainer || !mobileContainer) {
            console.error('Desktop or mobile container not found inside', this.containerClass);
            return;
        }

        // Clear existing video content
        desktopContainer.innerHTML = '';
        mobileContainer.innerHTML = '';

        // Append video element to the right container based on device
        const targetContainer = this.isMobile ? mobileContainer : desktopContainer;
        targetContainer.appendChild(videoEl);

        // Remove old play button if exists
        const oldBtn = this.container.querySelector('.video-v2-button');
        if (oldBtn) oldBtn.remove();

        // Show play button if video is not activated yet
        if (!this.isActivated) {
            this.container.insertAdjacentHTML('beforeend', `
                <div class="video-v2-button">
                    <div class="video-v2-button_icon"></div>
                    <div class="video-v2-button_text"></div>
                </div>
            `);
        }

        // Destroy previous Plyr instance if any
        if (this.player) {
            this.player.destroy?.();
            this.player = null;
        }

        // Initialize Plyr player
        this.player = new Plyr(videoEl, {
            controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            autoplay: true,
            muted: !this.isActivated, // mute video if not activated by user
            loop: { active: true },
        });

        // Set initial volume to 50%
        videoEl.volume = 0.5;

        // Attempt to autoplay video muted
        videoEl.play().catch(() => {});

        // Reset watch tracking variables
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

                // Remove active state when resizing switches device type
                this.container.classList.remove('active');

                // Reset video watch tracking state
                this.videoTriggered = false;
                this.videoWatchSeconds = 0;
                clearInterval(this.videoWatchInterval);

                // Recreate video element for new device type
                this.createVideo();

                // Add play button if it doesn't exist after recreate
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
        // Listen for click on play button anywhere in body
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.video-v2-button');
            if (!btn || !this.container.contains(btn)) return;

            // Select correct video container based on device type
            const parent = this.isMobile
                ? this.container.querySelector('.video-v2-mobile')
                : this.container.querySelector('.video-v2-desktop');
            if (!parent) return;

            const video = parent.querySelector('video');
            if (!video) return;

            // Remove play button on click
            btn.remove();

            this.isActivated = true;
            this.videoTriggered = false;
            this.videoWatchSeconds = 0;
            clearInterval(this.videoWatchInterval);

            // Enable controls, unmute and reset video time
            video.muted = false;
            video.controls = true;
            video.currentTime = 0;

            // Play video with sound at full volume
            video.play();
            video.volume = 1.0;

            // Add active class to container to mark playing with sound
            this.container.classList.add('active');

            // Start interval to track watched seconds and reveal block after delay
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

    // Show hidden block after video watched enough seconds
    showRevealBlock() {
        const block = document.querySelector(this.revealClass);
        if (block) block.style.display = 'block';
    }

    // Initialize the component
    init() {
        this.createVideo();
        this.setupResizeListener();
        this.setupPlayListener();
    }
}

// Expose class globally
window.video_v2 = video_v2;
