// ══════════════════════════════════════════════════════════════════════
// SWIFTAUDIO ENGINE (Scraper, Open-Source Plyr Audio Player & Downloader)
// Powered by Plyr (v3.7.8) with exact 5-second jump buttons & MediaSession
// ══════════════════════════════════════════════════════════════════════
(function() {
    'use strict';

    function stripHtml(str) {
        if (!str) return '';
        return str
            .replace(/<[^>]+>/g, '')
            .replace(/&#8217;/g, "'")
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function fetchHtml(url) {
        if (window.NativeBridge && window.NativeBridge.fetchNative) {
            try {
                const res = await window.NativeBridge.fetchNative(url);
                if (res && res.data) return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            } catch (e) {
                console.warn('[SwiftAudio] Native fetch error, falling back:', e);
            }
        }

        // Direct fetch attempt (works in Node, Capacitor, and CORS-enabled contexts)
        try {
            const directRes = await fetch(url, { signal: AbortSignal.timeout(6000), referrerPolicy: 'no-referrer' });
            if (directRes.ok) {
                const text = await directRes.text();
                if (text && text.length > 100 && !text.includes('Error 1015')) return text;
            }
        } catch(e) {}

        const proxies = [
            (u) => `http://127.0.0.1:9090/proxy?url=${encodeURIComponent(u)}`,
            (u) => `https://corsproxy.org/?url=${encodeURIComponent(u)}`,
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
        ];

        for (const pFn of proxies) {
            try {
                const res = await fetch(pFn(url), { signal: AbortSignal.timeout(6500) });
                if (res.ok) {
                    const text = await res.text();
                    if (text && text.length > 100 && !text.includes('Error 1015')) {
                        return text;
                    }
                }
            } catch (ignored) {}
        }
        throw new Error('Failed to fetch from SwiftAudiobooks. Please check your internet connection.');
    }

    // ══════════════════════════════════════════════════════════════════
    // 1. SCRAPER & SEARCH
    // ══════════════════════════════════════════════════════════════════
    const SwiftAudioScraper = {
        search: async function(query) {
            if (!query || !query.trim()) return [];
            const cleanQuery = query.trim();
            const searchUrl = `https://swiftaudiobooks.com/?s=${encodeURIComponent(cleanQuery)}`;
            const html = await fetchHtml(searchUrl);

            const results = [];
            const articleRegex = /<article[^>]*class=["'][^"']*book-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi;
            let match;

            while ((match = articleRegex.exec(html)) !== null) {
                const art = match[1];
                const linkMatch = art.match(/<h\d[^>]*class=["'][^"']*book-card__title[^"']*["'][^>]*>\s*<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
                if (!linkMatch) continue;

                const url = linkMatch[1];
                const title = stripHtml(linkMatch[2]);
                const imgMatch = art.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
                const cover = imgMatch ? imgMatch[1] : '';

                const metaAuthorMatch = art.match(/<strong>by<\/strong>\s*([^<]+)/i) || art.match(/class=["']book-card__author["'][^>]*>([\s\S]*?)<\//i);
                const author = metaAuthorMatch ? stripHtml(metaAuthorMatch[1]) : 'Unknown Author';

                const durationMatch = art.match(/<span>(\d{1,2}:\d{2}:\d{2})<\/span>/i);
                const duration = durationMatch ? durationMatch[1] : '';

                const excerptMatch = art.match(/<p[^>]*class=["'][^"']*book-card__excerpt[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
                const excerpt = excerptMatch ? stripHtml(excerptMatch[1]) : '';

                const tags = [];
                const tagRegex = /<a[^>]*class=["'][^"']*book-card__tag[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
                let tagMatch;
                while ((tagMatch = tagRegex.exec(art)) !== null) {
                    tags.push(stripHtml(tagMatch[1]));
                }

                results.push({
                    url,
                    title,
                    author,
                    duration,
                    cover,
                    excerpt,
                    tags,
                    isAudiobook: true
                });
            }

            return results;
        },

        getBookDetails: async function(url) {
            if (!url || !url.trim()) throw new Error('Invalid audiobook URL');
            const cleanUrl = url.trim();
            const html = await fetchHtml(cleanUrl);

            // Title & Author
            const h1Match = html.match(/<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                            html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                            html.match(/<title>([\s\S]*?)<\/title>/i);
            let title = h1Match ? stripHtml(h1Match[1]) : 'Audiobook';
            title = title.replace(/\s*–\s*SwiftAudiobooks.*$/i, '').replace(/\s*-\s*SwiftAudiobooks.*$/i, '').trim();

            const authorMatch = html.match(/<strong>by<\/strong>\s*([^<]+)/i) ||
                                html.match(/class=["'][^"']*author[^"']*["'][^>]*>([\s\S]*?)<\//i);
            const author = authorMatch ? stripHtml(authorMatch[1]) : '';

            // Cover Image
            const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
            const coverImgMatch = html.match(/<img[^>]*class=["'][^"']*book-cover[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                                  html.match(/<img[^>]*src=["'](https:\/\/ipaudio7\.com\/covers\/[^"']+)["']/i);
            const cover = ogImgMatch ? ogImgMatch[1] : (coverImgMatch ? coverImgMatch[1] : '');

            // Chapters / Tracks
            const tracks = [];
            const chapterRegex = /<li[^>]*data-src=["']([^"']+)["'][^>]*>([\s\S]*?)<\/li>/gi;
            let chMatch;
            let index = 1;

            while ((chMatch = chapterRegex.exec(html)) !== null) {
                const src = chMatch[1];
                let trackRaw = stripHtml(chMatch[2]);
                let duration = '';
                const durMatch = trackRaw.match(/(\d{1,2}:\d{2}:\d{2})$/);
                if (durMatch) {
                    duration = durMatch[1];
                    trackRaw = trackRaw.substring(0, trackRaw.length - duration.length).trim();
                }
                const cleanTrackTitle = trackRaw.replace(/^\d+\s+/, '').trim() || `Chapter ${index}`;

                tracks.push({
                    index,
                    title: cleanTrackTitle,
                    src,
                    duration
                });
                index++;
            }

            if (tracks.length === 0) {
                const singleAudioMatch = html.match(/<audio[^>]*src=["']([^"']+)["']/i);
                if (singleAudioMatch) {
                    tracks.push({
                        index: 1,
                        title: title || 'Full Audiobook',
                        src: singleAudioMatch[1],
                        duration: ''
                    });
                }
            }

            if (tracks.length === 0) {
                throw new Error('No audio tracks found on this SwiftAudiobooks page.');
            }

            return {
                url: cleanUrl,
                title,
                author,
                cover,
                tracks,
                totalTracks: tracks.length,
                isAudiobook: true
            };
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // 2. AUDIO PLAYER CONTROLLER (WRAPPING OPEN-SOURCE PLYR)
    // ══════════════════════════════════════════════════════════════════
    class SwiftAudioPlayerController {
        constructor() {
            this.plyrInstance = null;
            this.audioEl = null;
            this.currentBook = null;
            this.currentTrackIndex = 0;
            this.isPlaying = false;
            this.currentTime = 0;
            this.duration = 0;
            this.playbackRate = 1.0;

            // Sleep Timer
            this.sleepTimerMinutes = null;
            this.sleepTimerRemainingSeconds = null;
            this.sleepTimerInterval = null;
            this.sleepAtEndOfChapter = false;

            this.listeners = new Set();

            this._initAudioElement();
            this._loadSavedPosition();
        }

        subscribe(callback) {
            this.listeners.add(callback);
            callback(this.getState());
            return () => this.listeners.delete(callback);
        }

        _notify() {
            const state = this.getState();
            for (const cb of this.listeners) {
                try { cb(state); } catch(e) {}
            }
        }

        getState() {
            const track = this.currentBook?.tracks?.[this.currentTrackIndex] || null;
            return {
                currentBook: this.currentBook,
                currentTrack: track,
                currentTrackIndex: this.currentTrackIndex,
                totalTracks: this.currentBook?.tracks?.length || 0,
                isPlaying: this.isPlaying,
                currentTime: this.currentTime,
                duration: this.duration,
                playbackRate: this.playbackRate,
                sleepTimerRemainingSeconds: this.sleepTimerRemainingSeconds,
                sleepAtEndOfChapter: this.sleepAtEndOfChapter,
                isLoaded: !!this.currentBook
            };
        }

        _initAudioElement() {
            if (typeof document === 'undefined') return;
            if (this.audioEl) return;
            if (!document.body) {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this._initAudioElement(), { once: true });
                    return;
                }
                setTimeout(() => this._initAudioElement(), 50);
                return;
            }
            let host = document.getElementById('swift-plyr-host');
            if (!host) {
                host = document.createElement('div');
                host.id = 'swift-plyr-host';
                host.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none; z-index: -1; overflow: hidden;';
                document.body.appendChild(host);
            }
            let el = document.getElementById('swift-plyr-audio');
            if (!el) {
                el = document.createElement('audio');
                el.id = 'swift-plyr-audio';
                el.setAttribute('playsinline', 'true');
                el.setAttribute('preload', 'metadata');
                el.setAttribute('referrerpolicy', 'no-referrer');
                el.style.display = 'none';
                host.appendChild(el);
            } else {
                el.setAttribute('referrerpolicy', 'no-referrer');
            }
            this.audioEl = el;

            if (window.Plyr) {
                this._mountPlyr();
            } else {
                window.addEventListener('load', () => this._mountPlyr(), { once: true });
            }

            this.audioEl.addEventListener('error', () => {
                const err = this.audioEl ? this.audioEl.error : null;
                let errMsg = 'Audio stream error';
                if (err) {
                    switch (err.code) {
                        case MediaError.MEDIA_ERR_ABORTED: errMsg = 'Playback aborted by user'; break;
                        case MediaError.MEDIA_ERR_NETWORK: errMsg = 'Network error downloading audio stream'; break;
                        case MediaError.MEDIA_ERR_DECODE: errMsg = 'Audio decoding error'; break;
                        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errMsg = 'Audio stream blocked or format unsupported'; break;
                        default: errMsg = `Audio error code ${err.code}`; break;
                    }
                }
                console.error('[SwiftAudio] Audio element error:', errMsg, err);
                this.isPlaying = false;
                this._notify();
                if (window.toast) window.toast(errMsg, 'error');
            });

            this.audioEl.addEventListener('play', () => {
                this.isPlaying = true;
                this._updateMediaSession();
                this._acquireWakeLock();
                this._notify();
            });

            this.audioEl.addEventListener('pause', () => {
                this.isPlaying = false;
                this._updateMediaSession();
                this._notify();
            });

            this.audioEl.addEventListener('timeupdate', () => {
                this.currentTime = this.audioEl.currentTime || 0;
                this.duration = this.audioEl.duration || this.duration || 0;
                this._savePosition();
                // Periodic lightweight sync every 20s during active playback to keep Android SystemUI in perfect lockstep
                if (this.isPlaying && Math.abs(this.currentTime - (this._lastMediaSessionSyncTime || 0)) >= 20) {
                    this._lastMediaSessionSyncTime = this.currentTime;
                    this._updateMediaSession();
                }
                this._notify();
            });

            this.audioEl.addEventListener('loadedmetadata', () => {
                this.duration = this.audioEl.duration || 0;
                this._updateMediaSession();
                this._notify();
            });

            this.audioEl.addEventListener('ended', () => {
                if (this.sleepAtEndOfChapter) {
                    this.pause();
                    this.clearSleepTimer();
                    if (window.toast) window.toast('Sleep timer: Finished chapter playback.', 'info');
                    return;
                }
                this.nextTrack();
            });

            this.audioEl.addEventListener('ratechange', () => {
                this.playbackRate = this.audioEl.playbackRate || 1.0;
                this._notify();
            });
        }

        _mountPlyr() {
            if (this.plyrInstance || !window.Plyr || !this.audioEl) return;
            try {
                // Official Plyr initialization with EXACT 5-second jump controls!
                this.plyrInstance = new window.Plyr(this.audioEl, {
                    controls: [
                        'rewind',       // -5s
                        'play',         // Play / Pause
                        'fast-forward', // +5s
                        'progress',     // Scrubber
                        'current-time',
                        'duration',
                        'mute',
                        'volume',
                        'settings'      // Speed
                    ],
                    seekTime: 5,        // EXACT 5 SECONDS
                    speed: { selected: 1, options: [0.75, 1, 1.25, 1.5, 1.75, 2] },
                    keyboard: { focused: true, global: false },
                    tooltips: { controls: true, seek: true }
                });
                console.log('✅ Open-source Plyr audio player mounted with seekTime: 5s');
            } catch (e) {
                console.warn('Plyr initialization warning:', e);
            }
        }

        loadBook(book, startTrackIndex = 0, autoPlay = true, seekTime = 0) {
            if (!book || !book.tracks || book.tracks.length === 0) return;
            this.currentBook = book;
            this.currentTrackIndex = Math.max(0, Math.min(startTrackIndex, book.tracks.length - 1));
            this.currentTime = seekTime || 0;

            const track = book.tracks[this.currentTrackIndex];
            if (!track) return;

            this._playSource(track.src, autoPlay, seekTime);
            this._updateMediaSession();
            this._savePosition();
            this._notify();
        }

        _playSource(src, autoPlay = true, seekTime = 0) {
            if (!this.audioEl) return;
            this.audioEl.src = src;
            if (seekTime > 0) {
                this.audioEl.currentTime = seekTime;
            }
            if (autoPlay) {
                const p = this.audioEl.play();
                if (p !== undefined) {
                    p.catch(e => console.debug('Audio autoplay deferred:', e.message));
                }
            }
        }

        play() {
            if (this.plyrInstance) {
                try {
                    const p = this.plyrInstance.play();
                    if (p && p.catch) {
                        p.catch(e => {
                            console.debug('Plyr play error:', e);
                            if (this.audioEl) this.audioEl.play().catch(err => console.debug('Fallback play error:', err));
                        });
                    }
                    return;
                } catch(e) {}
            }
            if (this.audioEl) {
                this.audioEl.play().catch(e => {
                    console.debug('Play error:', e);
                    if (e.name === 'NotAllowedError' && window.toast) {
                        window.toast('Tap Play to start audio', 'info');
                    }
                });
            }
        }

        pause() {
            if (this.plyrInstance) {
                try { this.plyrInstance.pause(); return; } catch(e) {}
            }
            if (this.audioEl) {
                this.audioEl.pause();
            }
        }

        togglePlay() {
            if (this.isPlaying) this.pause();
            else this.play();
        }

        close() {
            this.pause();
            if (this.audioEl) {
                try {
                    this.audioEl.pause();
                    this.audioEl.removeAttribute('src');
                    this.audioEl.load();
                } catch(e) {}
            }
            if (this.plyrInstance) {
                try { this.plyrInstance.stop(); } catch(e) {}
            }
            this.clearSleepTimer();
            this.currentBook = null;
            this.currentTrackIndex = 0;
            this.currentTime = 0;
            this.duration = 0;
            this.isPlaying = false;
            try {
                localStorage.removeItem('gemini_last_audiobook_position');
            } catch(e) {}
            try {
                window.NativeBridge?.hideAudioNotification?.();
            } catch(e) {}
            try {
                window.NativeBridge?.releaseWakeLock?.();
            } catch(e) {}
            this._notify();
        }

        seekRelative(seconds) {
            if (!this.audioEl) return;
            try {
                const cur = this.audioEl.currentTime || 0;
                const dur = this.audioEl.duration || this.duration || 0;
                let target = cur + seconds;
                if (dur > 0) {
                    target = Math.max(0, Math.min(target, dur));
                } else {
                    target = Math.max(0, target);
                }
                this.audioEl.currentTime = target;
                this.currentTime = target;
                if (this.plyrInstance) {
                    try { this.plyrInstance.currentTime = target; } catch(e) {}
                }
                this._notify();
                this._updateMediaSession();
            } catch (e) {
                console.warn('Seek error:', e);
            }
        }

        skipBackward5() {
            this.seekRelative(-5);
        }

        skipForward5() {
            this.seekRelative(5);
        }

        seekTo(seconds) {
            if (typeof seconds !== 'number' || isNaN(seconds)) return;
            if (this.audioEl) {
                const target = Math.max(0, Math.min(seconds, this.duration || Infinity));
                this.audioEl.currentTime = target;
                this.currentTime = target;
                if (this.plyrInstance) {
                    try { this.plyrInstance.currentTime = target; } catch(e) {}
                }
                this._notify();
                this._updateMediaSession();
            }
        }

        setPlaybackRate(rate) {
            if (this.audioEl && rate > 0) {
                this.audioEl.playbackRate = rate;
                this.playbackRate = rate;
                if (this.plyrInstance) this.plyrInstance.speed = rate;
                this._notify();
            }
        }

        playTrack(index) {
            if (!this.currentBook || !this.currentBook.tracks) return;
            if (index < 0 || index >= this.currentBook.tracks.length) return;
            this.currentTrackIndex = index;
            const track = this.currentBook.tracks[index];
            this._playSource(track.src, true, 0);
            this._updateMediaSession();
            this._savePosition();
            this._notify();
        }

        nextTrack() {
            if (!this.currentBook) return;
            if (this.currentTrackIndex < this.currentBook.tracks.length - 1) {
                this.playTrack(this.currentTrackIndex + 1);
            } else {
                this.pause();
                if (window.toast) window.toast('Reached end of audiobook!', 'info');
            }
        }

        previousTrack() {
            if (!this.currentBook) return;
            if (this.currentTime > 3) {
                this.seekTo(0);
            } else if (this.currentTrackIndex > 0) {
                this.playTrack(this.currentTrackIndex - 1);
            }
        }

        // ══════════════════════════════════════════════════════════════
        // SLEEP TIMER
        // ══════════════════════════════════════════════════════════════
        setSleepTimer(minutesOrOption) {
            this.clearSleepTimer();

            if (minutesOrOption === 'end_of_chapter') {
                this.sleepAtEndOfChapter = true;
                this.sleepTimerRemainingSeconds = null;
                if (window.toast) window.toast('Sleep timer set for end of current chapter.', 'info');
                this._notify();
                return;
            }

            const mins = parseInt(minutesOrOption, 10);
            if (!mins || mins <= 0) return;

            this.sleepAtEndOfChapter = false;
            this.sleepTimerMinutes = mins;
            this.sleepTimerRemainingSeconds = mins * 60;

            this.sleepTimerInterval = setInterval(() => {
                if (this.sleepTimerRemainingSeconds > 0) {
                    this.sleepTimerRemainingSeconds--;
                    this._notify();
                } else {
                    this.clearSleepTimer();
                    this.pause();
                    if (window.toast) window.toast('Sleep timer expired. Audio paused.', 'info');
                }
            }, 1000);

            if (window.toast) window.toast(`Sleep timer set for ${mins} minutes.`, 'info');
            this._notify();
        }

        clearSleepTimer() {
            if (this.sleepTimerInterval) {
                clearInterval(this.sleepTimerInterval);
                this.sleepTimerInterval = null;
            }
            this.sleepTimerMinutes = null;
            this.sleepTimerRemainingSeconds = null;
            this.sleepAtEndOfChapter = false;
            this._notify();
        }

        // ══════════════════════════════════════════════════════════════
        // ANDROID MEDIASESSION & LOCKSCREEN INTEGRATION (5-SEC JUMP)
        // ══════════════════════════════════════════════════════════════
        _updateMediaSession() {
            if (!this.currentBook) {
                try { window.NativeBridge?.hideAudioNotification?.(); } catch(e) {}
                return;
            }
            const track = this.currentBook.tracks?.[this.currentTrackIndex];
            const trackTitle = track ? track.title : this.currentBook.title;
            const curTime = this.currentTime || (this.audioEl ? this.audioEl.currentTime : 0) || 0;
            const dur = this.duration || (this.audioEl ? this.audioEl.duration : 0) || 0;
            const rate = this.playbackRate || (this.audioEl ? this.audioEl.playbackRate : 1.0) || 1.0;

            // 1. Browser MediaSession API (for Web & Desktop)
            if ('mediaSession' in navigator) {
                try {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: trackTitle,
                        artist: this.currentBook.author || 'SwiftAudiobooks',
                        album: this.currentBook.title,
                        artwork: this.currentBook.cover ? [
                            { src: this.currentBook.cover, sizes: '512x512', type: 'image/jpeg' }
                        ] : [{ src: './icon-192.png', sizes: '192x192', type: 'image/png' }]
                    });

                    navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';

                    // Lockscreen Actions: EXACT 5-SECOND JUMPS!
                    navigator.mediaSession.setActionHandler('play', () => this.play());
                    navigator.mediaSession.setActionHandler('pause', () => this.pause());
                    navigator.mediaSession.setActionHandler('seekbackward', () => this.skipBackward5());
                    navigator.mediaSession.setActionHandler('seekforward', () => this.skipForward5());
                    navigator.mediaSession.setActionHandler('previoustrack', () => this.previousTrack());
                    navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
                    if ('setPositionState' in navigator.mediaSession && dur > 0) {
                        try {
                            navigator.mediaSession.setPositionState({
                                duration: dur,
                                playbackRate: rate,
                                position: Math.min(curTime, dur)
                            });
                        } catch (e) {}
                    }
                } catch (e) {
                    console.debug('MediaSession update warning:', e);
                }
            }

            // 2. Native Android Notification Center & Quick Settings Media Player
            try {
                if (window.NativeBridge && window.NativeBridge.showAudioNotification) {
                    window.NativeBridge.showAudioNotification({
                        title: trackTitle,
                        bookTitle: this.currentBook.title || '',
                        author: this.currentBook.author || '',
                        cover: this.currentBook.cover || '',
                        isPlaying: this.isPlaying,
                        currentTime: curTime,
                        duration: dur,
                        playbackRate: rate
                    });
                }
            } catch (e) {
                console.debug('Native audio notification warning:', e);
            }
        }

        _acquireWakeLock() {
            try {
                if (window.NativeBridge && window.NativeBridge.acquireWakeLock) {
                    const title = this.currentBook ? this.currentBook.title : 'Audiobook';
                    const track = this.currentBook?.tracks?.[this.currentTrackIndex]?.title || '';
                    window.NativeBridge.acquireWakeLock('Audiobook Playback', `${title} - ${track}`);
                }
            } catch (e) {}
        }

        _savePosition() {
            if (typeof localStorage === 'undefined' || !this.currentBook || !this.currentBook.url) return;
            try {
                const pos = {
                    url: this.currentBook.url,
                    book: {
                        url: this.currentBook.url,
                        title: this.currentBook.title,
                        author: this.currentBook.author,
                        cover: this.currentBook.cover,
                        tracks: this.currentBook.tracks
                    },
                    trackIndex: this.currentTrackIndex,
                    currentTime: this.currentTime,
                    playbackRate: this.playbackRate,
                    updatedAt: Date.now()
                };
                localStorage.setItem('gemini_last_audiobook_position', JSON.stringify(pos));

                // Auto-sync progress to Library if this audiobook was saved
                try {
                    const rawSaved = localStorage.getItem('gemini_saved_audiobooks');
                    if (rawSaved) {
                        const list = JSON.parse(rawSaved);
                        let changed = false;
                        for (let i = 0; i < list.length; i++) {
                            if (list[i].url === this.currentBook.url || list[i].title === this.currentBook.title) {
                                list[i].lastPlayedTrackIndex = this.currentTrackIndex;
                                list[i].lastPlayedTrackTitle = this.currentBook?.tracks?.[this.currentTrackIndex]?.title || '';
                                list[i].lastPlayedTime = this.currentTime;
                                list[i].lastListenedAt = Date.now();
                                if (!list[i].tracks && this.currentBook.tracks) {
                                    list[i].tracks = this.currentBook.tracks;
                                }
                                changed = true;
                                break;
                            }
                        }
                        if (changed) {
                            localStorage.setItem('gemini_saved_audiobooks', JSON.stringify(list));
                        }
                    }
                } catch(e) {}
            } catch (e) {}
        }

        _loadSavedPosition() {
            if (typeof localStorage === 'undefined') return;
            try {
                const raw = localStorage.getItem('gemini_last_audiobook_position');
                if (!raw) return;
                const pos = JSON.parse(raw);
                if (pos && pos.book && pos.book.tracks && pos.book.tracks.length > 0) {
                    this.currentBook = pos.book;
                    this.currentTrackIndex = pos.trackIndex || 0;
                    this.currentTime = pos.currentTime || 0;
                    this.playbackRate = pos.playbackRate || 1.0;
                    const track = pos.book.tracks[this.currentTrackIndex];
                    if (track && this.audioEl) {
                        this.audioEl.src = track.src;
                        this.audioEl.currentTime = this.currentTime;
                        this.audioEl.playbackRate = this.playbackRate;
                    }
                    this._updateMediaSession();
                }
            } catch (e) {}
        }
    }

    // ══════════════════════════════════════════════════════════════
    // 3. BATCH & SINGLE TRACK DOWNLOADER
    // ══════════════════════════════════════════════════════════════
    const SwiftAudioDownloader = {
        _isDownloading: false,
        _cancelRequested: false,

        isDownloading: function() {
            return this._isDownloading;
        },

        cancel: function() {
            this._cancelRequested = true;
        },

        downloadSingleTrack: async function(track, book, folderOptions = {}) {
            if (!track || !track.src) throw new Error('Missing track source');
            const bookTitle = book?.title || 'Audiobook';
            const cleanBookTitle = typeof sanitizeFilename === 'function' ? sanitizeFilename(bookTitle) : bookTitle.replace(/[/\\?%*:|"<>]/g, '-');
            const padIndex = String(track.index || 1).padStart(2, '0');
            const cleanTrackTitle = typeof sanitizeFilename === 'function' ? sanitizeFilename(track.title) : track.title.replace(/[/\\?%*:|"<>]/g, '-');
            const fileName = `${padIndex} - ${cleanTrackTitle}.mp3`;

            const subDir = folderOptions.subDir || folderOptions.folderPath || `GeminiTranslator/Audiobooks/${cleanBookTitle}`;

            return await window.NativeBridge.downloadFileDirect(track.src, fileName, {
                ...folderOptions,
                subDir,
                mimeType: 'audio/mpeg'
            });
        },

        downloadAllTracks: async function(book, folderOptions = {}, progressCb, selectedIndices = null) {
            if (!book || !book.tracks || book.tracks.length === 0) throw new Error('No tracks to download');
            if (this._isDownloading) throw new Error('A download is already in progress');

            this._isDownloading = true;
            this._cancelRequested = false;

            const allTracks = book.tracks;
            const tracksToProcess = (Array.isArray(selectedIndices) && selectedIndices.length > 0)
                ? allTracks.filter((_, idx) => selectedIndices.includes(idx))
                : allTracks;

            if (tracksToProcess.length === 0) {
                this._isDownloading = false;
                throw new Error('No tracks selected for download');
            }

            const total = tracksToProcess.length;
            const bookTitle = book.title || 'Audiobook';
            const cleanBookTitle = typeof sanitizeFilename === 'function' ? sanitizeFilename(bookTitle) : bookTitle.replace(/[/\\?%*:|"<>]/g, '-');
            const subDir = folderOptions.subDir || folderOptions.folderPath || `GeminiTranslator/Audiobooks/${cleanBookTitle}`;

            try {
                window.NativeBridge?.acquireWakeLock?.('Audiobook Downloader', `Downloading ${bookTitle} (${total} tracks)...`);
            } catch (e) {}

            const downloadedFiles = [];

            try {
                for (let i = 0; i < total; i++) {
                    if (this._cancelRequested) {
                        if (progressCb) progressCb({ status: 'Cancelled by user', percent: 0, current: i, total });
                        break;
                    }

                    const track = tracksToProcess[i];
                    const currentNum = i + 1;
                    const padIndex = String(track.index || currentNum).padStart(2, '0');
                    const cleanTrackTitle = typeof sanitizeFilename === 'function' ? sanitizeFilename(track.title) : track.title.replace(/[/\\?%*:|"<>]/g, '-');
                    const fileName = `${padIndex} - ${cleanTrackTitle}.mp3`;
                    const pct = Math.round(((i) / total) * 100);

                    if (progressCb) {
                        progressCb({
                            status: `Downloading track ${currentNum} of ${total}: ${track.title}`,
                            currentTrack: track.title,
                            percent: pct,
                            current: currentNum,
                            total
                        });
                    }

                    try {
                        if (window.NativeBridge?.showProgressNotification) {
                            window.NativeBridge.showProgressNotification(
                                'Downloading Audiobook MP3s',
                                `${cleanBookTitle}: Track ${currentNum}/${total} (${pct}%)`,
                                pct,
                                true
                            );
                        }
                    } catch(e) {}

                    try {
                        await window.NativeBridge.downloadFileDirect(track.src, fileName, {
                            ...folderOptions,
                            subDir,
                            mimeType: 'audio/mpeg'
                        });
                        downloadedFiles.push(fileName);
                    } catch (trackErr) {
                        console.warn(`[SwiftAudio] Error downloading track ${currentNum} (${fileName}):`, trackErr);
                    }
                }

                // Generate M3U Playlist file
                if (!this._cancelRequested && downloadedFiles.length > 0) {
                    try {
                        const m3uContent = '#EXTM3U\n' + downloadedFiles.map(f => `#EXTINF:-1,${f.replace('.mp3', '')}\n${f}`).join('\n');
                        const m3uBlob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
                        await window.NativeBridge.saveBlob(m3uBlob, `${cleanBookTitle}.m3u`, 'audio/x-mpegurl', false, {
                            ...folderOptions,
                            subDir
                        });
                    } catch (e) {
                        console.warn('M3U creation warning:', e);
                    }
                }

                if (progressCb) {
                    progressCb({
                        status: this._cancelRequested ? 'Download cancelled' : `All ${total} tracks downloaded successfully!`,
                        percent: 100,
                        completed: true
                    });
                }

                try {
                    if (window.NativeBridge?.clearProgressNotification) {
                        window.NativeBridge.clearProgressNotification(
                            true,
                            'Audiobook Downloaded! 🎉',
                            `Downloaded ${downloadedFiles.length} chapter(s) of "${cleanBookTitle}".`
                        );
                    }
                } catch(e) {}

                return { success: !this._cancelRequested, count: downloadedFiles.length };

            } finally {
                this._isDownloading = false;
                this._cancelRequested = false;
                try {
                    window.NativeBridge?.releaseWakeLock?.();
                } catch (e) {}
            }
        }
    };

    const playerInstance = new SwiftAudioPlayerController();

    window.SwiftAudioEngine = {
        Scraper: SwiftAudioScraper,
        Player: playerInstance,
        Downloader: SwiftAudioDownloader,
        formatDuration: function(secs) {
            if (!secs || isNaN(secs) || secs < 0) return '0:00';
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = Math.floor(secs % 60);
            if (h > 0) {
                return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
            return `${m}:${String(s).padStart(2, '0')}`;
        }
    };

    console.log('✅ SwiftAudioEngine ready (Scraper, 5-Second Plyr Player & Downloader)');
})();
