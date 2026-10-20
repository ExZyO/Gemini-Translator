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
        if (window.NativeBridge && window.NativeBridge.fetchUrl) {
            try {
                const res = await window.NativeBridge.fetchUrl(url);
                if (res && res.data) return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                if (typeof res === 'string' && res.length > 100) return res;
            } catch (e) {
                console.warn('[SwiftAudio] Native fetchUrl error, falling back:', e);
            }
        }
        if (window.NativeBridge && window.NativeBridge.fetchNative) {
            try {
                const res = await window.NativeBridge.fetchNative(url);
                if (res && res.data) return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                if (typeof res === 'string' && res.length > 100) return res;
            } catch (e) {
                console.warn('[SwiftAudio] Native fetchNative error, falling back:', e);
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
            (u) => `https://cors.eu.org/${u}`,
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
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
    // 2. AUDIO PLAYER CONTROLLER (DIRECT NATIVE AUDIO ENGINE)
    // ══════════════════════════════════════════════════════════════════
    class SwiftAudioPlayerController {
        constructor() {
            this.audioEl = null;
            this.preloadAudioEl = null;
            this._hasPreloadedNext = false;
            this._lastSavedDbTime = 0;
            this.currentBook = null;
            this.currentTrackIndex = 0;
            this.isPlaying = false;
            this.currentTime = 0;
            this.duration = 0;
            this.playbackRate = 1.0;
            this.playbackMode = 'continuous'; // 'continuous', 'repeat_chapter', 'pause_at_end'
            try {
                const savedMode = localStorage.getItem('gemini_audio_playback_mode');
                if (savedMode) this.playbackMode = savedMode;
            } catch(e) {}

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
                sleepTimerMinutes: this.sleepTimerMinutes,
                sleepTimerRemainingSeconds: this.sleepTimerRemainingSeconds,
                sleepAtEndOfChapter: this.sleepAtEndOfChapter,
                playbackMode: this.playbackMode,
                isLoaded: !!this.currentBook
            };
        }

        _isNativeAndroid() {
            if (typeof window === 'undefined') return false;
            if (window.NativeBridge && typeof window.NativeBridge.isAndroid === 'function') {
                return window.NativeBridge.isAndroid();
            }
            return !!(window.Capacitor && (window.Capacitor.isNativePlatform?.() || window.Capacitor.Plugins?.NativeAndroidBridge));
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

            // Clean up any legacy or duplicate audio hosts
            const oldHost = document.getElementById('swift-plyr-host');
            if (oldHost) {
                try {
                    const audios = oldHost.querySelectorAll('audio');
                    audios.forEach(a => {
                        try { a.pause(); a.removeAttribute('src'); a.load(); } catch(e) {}
                    });
                    oldHost.remove();
                } catch(e) {}
            }

            // Primary playback audio element
            let el = document.getElementById('swift-audio-element');
            if (!el) {
                el = document.createElement('audio');
                el.id = 'swift-audio-element';
                el.setAttribute('playsinline', 'true');
                el.setAttribute('preload', 'auto');
                el.setAttribute('referrerpolicy', 'no-referrer');
                el.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 1px; height: 1px; opacity: 0.01; pointer-events: none; z-index: -1;';
                document.body.appendChild(el);
            } else {
                el.setAttribute('referrerpolicy', 'no-referrer');
            }
            this.audioEl = el;

            // Zero-gap preload audio element (prebuffers upcoming chapter into HTTP/media cache)
            let preloadEl = document.getElementById('swift-audio-preload');
            if (!preloadEl) {
                preloadEl = document.createElement('audio');
                preloadEl.id = 'swift-audio-preload';
                preloadEl.setAttribute('playsinline', 'true');
                preloadEl.setAttribute('preload', 'auto');
                preloadEl.setAttribute('referrerpolicy', 'no-referrer');
                preloadEl.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 1px; height: 1px; opacity: 0.01; pointer-events: none; z-index: -1;';
                document.body.appendChild(preloadEl);
            } else {
                preloadEl.setAttribute('referrerpolicy', 'no-referrer');
            }
            this.preloadAudioEl = preloadEl;

            this._bindAudioEvents(this.audioEl);
            this._bindAudioEvents(this.preloadAudioEl);

            // Native Android ExoPlayer event listener
            if (this._isNativeAndroid() && window.NativeBridge?.addNativeAudioListener) {
                window.NativeBridge.addNativeAudioListener('nativeAudioState', (data) => {
                    if (!data) return;
                    this.isPlaying = !!data.isPlaying;
                    if (typeof data.currentTime === 'number') this.currentTime = data.currentTime;
                    if (typeof data.duration === 'number' && data.duration > 0) this.duration = data.duration;
                    this._savePosition(false);
                    this._notify();
                });

                window.NativeBridge.addNativeAudioListener('nativeAudioTrackEnded', () => {
                    if (this.playbackMode === 'repeat_chapter') {
                        this.seekTo(0);
                        this.play();
                    } else if (this.playbackMode === 'pause_at_end') {
                        this.pause();
                        this.seekTo(0);
                    } else {
                        this.nextTrack();
                    }
                });

                window.NativeBridge.addNativeAudioListener('nativeAudioNext', () => {
                    this.nextTrack();
                });

                window.NativeBridge.addNativeAudioListener('nativeAudioPrevious', () => {
                    this.previousTrack();
                });
            }
        }

        _bindAudioEvents(el) {
            if (!el) return;

            el.addEventListener('error', () => {
                if (el !== this.audioEl) return;
                const err = el.error;
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

            el.addEventListener('play', () => {
                if (el !== this.audioEl) return;
                this.isPlaying = true;
                try {
                    if (window.speechSynthesis && window.speechSynthesis.speaking) {
                        window.speechSynthesis.cancel();
                    }
                } catch(e) {}
                this._updateMediaSession();
                this._acquireWakeLock();
                this._notify();
            });

            el.addEventListener('pause', () => {
                if (el !== this.audioEl) return;
                this.isPlaying = false;
                this._savePosition(true);
                this._updateMediaSession();
                this._notify();
            });

            el.addEventListener('timeupdate', () => {
                if (el !== this.audioEl) return;
                this.currentTime = el.currentTime || 0;
                this.duration = el.duration || this.duration || 0;
                this._savePosition(false);

                // Zero-gap chapter pre-buffering (preloads next chapter 15s before current chapter finishes)
                if (this.duration > 15 && (this.duration - this.currentTime) <= 15) {
                    this._preloadNextTrack();
                }

                // Periodic lightweight sync every 20s during active playback to keep Android SystemUI in perfect lockstep
                if (this.isPlaying && Math.abs(this.currentTime - (this._lastMediaSessionSyncTime || 0)) >= 20) {
                    this._lastMediaSessionSyncTime = this.currentTime;
                    this._updateMediaSession();
                }
                this._notify();
            });

            el.addEventListener('loadedmetadata', () => {
                if (el !== this.audioEl) return;
                this.duration = el.duration || 0;
                this._updateMediaSession();
                this._notify();
            });

            el.addEventListener('ended', () => {
                if (el !== this.audioEl) return;
                if (this.sleepAtEndOfChapter) {
                    this.pause();
                    if (this._isNativeAndroid() && window.NativeBridge?.setNativeAudioMode) {
                try { window.NativeBridge.stopNativeAudio(); } catch(e) {}
            }
            this.clearSleepTimer();
                    if (window.toast) window.toast('Sleep timer: Finished chapter playback.', 'info');
                    return;
                }
                this.nextTrack();
            });

            el.addEventListener('ratechange', () => {
                if (el !== this.audioEl) return;
                this.playbackRate = el.playbackRate || 1.0;
                this._notify();
            });
        }

        _preloadNextTrack() {
            if (this._hasPreloadedNext || !this.currentBook || !this.currentBook.tracks) return;
            const nextIdx = this.currentTrackIndex + 1;
            if (nextIdx >= this.currentBook.tracks.length) return;
            const nextTrack = this.currentBook.tracks[nextIdx];
            if (!nextTrack || !nextTrack.src) return;

            this._hasPreloadedNext = true;
            try {
                if (this.preloadAudioEl) {
                    this.preloadAudioEl.src = nextTrack.src;
                    this.preloadAudioEl.preload = 'auto';
                    this.preloadAudioEl.load();
                }
            } catch (err) {
                console.debug('[SwiftAudio] Preload track error:', err);
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
            this._savePosition(true);
            this._notify();
        }

        _playSource(src, autoPlay = true, seekTime = 0) {
            this._hasPreloadedNext = false;
            this.currentTime = seekTime || 0;

            if (this._isNativeAndroid() && window.NativeBridge?.playNativeAudio) {
                const track = this.currentBook?.tracks?.[this.currentTrackIndex];
                const modeInt = this.playbackMode === 'repeat_chapter' ? 1 : (this.playbackMode === 'pause_at_end' ? 2 : 0);
                window.NativeBridge.playNativeAudio({
                    src: src,
                    title: track?.title || this.currentBook?.title || 'Audiobook',
                    bookTitle: this.currentBook?.title || '',
                    author: this.currentBook?.author || '',
                    cover: this.currentBook?.cover || '',
                    trackIndex: this.currentTrackIndex,
                    totalTracks: this.currentBook?.tracks?.length || 1,
                    position: seekTime || 0,
                    speed: this.playbackRate || 1.0,
                    mode: modeInt
                });
                this.isPlaying = true;
                this._savePosition(true);
                this._notify();
                return;
            }

            // Zero-gap switch: If preloadAudioEl already has this exact src buffered with readyState >= 2 (HAVE_CURRENT_DATA)
            if (seekTime === 0 && this.preloadAudioEl && this.preloadAudioEl.src === src && this.preloadAudioEl.readyState >= 2) {
                try {
                    if (this.audioEl) {
                        this.audioEl.pause();
                        this.audioEl.removeAttribute('src');
                        this.audioEl.load();
                    }
                } catch(e) {}

                // Seamlessly swap active and preload elements
                const oldActive = this.audioEl;
                this.audioEl = this.preloadAudioEl;
                this.preloadAudioEl = oldActive;

                this.audioEl.volume = 1.0;
                this.audioEl.playbackRate = this.playbackRate;
                if (autoPlay) {
                    this.play();
                }
                this._updateMediaSession();
                this._savePosition(true);
                this._notify();
                return;
            }

            if (!this.audioEl) return;
            try {
                this.audioEl.pause();
            } catch(e) {}

            this.audioEl.volume = 1.0; // Immediate full volume with no ramp delay
            this.audioEl.playbackRate = this.playbackRate;
            this.audioEl.src = src;

            if (seekTime > 0) {
                try { this.audioEl.currentTime = seekTime; } catch(e) {}
                const onLoaded = () => {
                    try { this.audioEl.currentTime = seekTime; } catch(e) {}
                };
                this.audioEl.addEventListener('loadedmetadata', onLoaded, { once: true });
                this.audioEl.addEventListener('canplay', () => {
                    try {
                        if (Math.abs(this.audioEl.currentTime - seekTime) > 1) {
                            this.audioEl.currentTime = seekTime;
                        }
                    } catch(e) {}
                }, { once: true });
            }

            if (autoPlay) {
                this.play();
            }
            this._savePosition(true);
            this._notify();
        }

        play() {
            if (this._isNativeAndroid() && window.NativeBridge?.resumeNativeAudio) {
                window.NativeBridge.resumeNativeAudio();
                this.isPlaying = true;
                this._notify();
                return;
            }
            if (!this.audioEl) return;
            try {
                this.audioEl.volume = 1.0; // Immediate full volume with no fading
                const p = this.audioEl.play();
                if (p !== undefined && p.catch) {
                    p.catch(e => {
                        console.debug('[SwiftAudio] Direct play error:', e.message);
                        if (e.name === 'NotAllowedError' && window.toast) {
                            window.toast('Tap Play to start audio', 'info');
                        }
                    });
                }
            } catch (err) {
                console.debug('[SwiftAudio] Direct play exception:', err);
            }
        }

        pause() {
            if (this.audioEl) {
                try { this.audioEl.pause(); } catch(e) {}
            }
            if (this.preloadAudioEl) {
                try { this.preloadAudioEl.pause(); } catch(e) {}
            }
            if (this._isNativeAndroid() && window.NativeBridge?.pauseNativeAudio) {
                try { window.NativeBridge.pauseNativeAudio(); } catch(e) {}
            }
            this.isPlaying = false;
            this._savePosition(true);
            this._notify();
        }

        togglePlay() {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        }

        close() {
            this.pause();
            this._hasPreloadedNext = false;
            if (this.audioEl) {
                try {
                    this.audioEl.pause();
                    this.audioEl.removeAttribute('src');
                    this.audioEl.load();
                } catch(e) {}
            }
            if (this.preloadAudioEl) {
                try {
                    this.preloadAudioEl.pause();
                    this.preloadAudioEl.removeAttribute('src');
                    this.preloadAudioEl.load();
                } catch(e) {}
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
            if (typeof seconds !== 'number' || isNaN(seconds)) return;
            const dur = this.duration || (this.audioEl?.duration || 0);
            let target = (this.currentTime || (this.audioEl?.currentTime || 0)) + seconds;
            if (dur > 0) {
                target = Math.max(0, Math.min(target, dur));
            } else {
                target = Math.max(0, target);
            }
            this.seekTo(target);
        }

        skipBackward5() {
            if (this._isNativeAndroid() && window.NativeBridge?.skipBackward5NativeAudio) {
                window.NativeBridge.skipBackward5NativeAudio();
                this.currentTime = Math.max(0, (this.currentTime || 0) - 5);
                this._savePosition(true);
                this._notify();
                return;
            }
            this.seekRelative(-5);
        }

        skipForward5() {
            if (this._isNativeAndroid() && window.NativeBridge?.skipForward5NativeAudio) {
                window.NativeBridge.skipForward5NativeAudio();
                const dur = this.duration || 0;
                let target = (this.currentTime || 0) + 5;
                if (dur > 0) target = Math.min(dur, target);
                this.currentTime = target;
                this._savePosition(true);
                this._notify();
                return;
            }
            this.seekRelative(5);
        }

        seekTo(seconds) {
            if (typeof seconds !== 'number' || isNaN(seconds)) return;
            if (this._isNativeAndroid() && window.NativeBridge?.seekNativeAudio) {
                window.NativeBridge.seekNativeAudio(seconds);
                this.currentTime = seconds;
                this._savePosition(true);
                this._notify();
                return;
            }
            if (this.audioEl) {
                const target = Math.max(0, Math.min(seconds, this.duration || Infinity));
                this.audioEl.currentTime = target;
                this.currentTime = target;
                this._savePosition(true);
                this._notify();
                this._updateMediaSession();
            }
        }

        async openInPoweramp() {
            if (!this.currentBook) {
                if (window.toast) window.toast('No audiobook currently playing', 'info');
                return { success: false, error: 'No audiobook loaded' };
            }
            this.pause(); // Pause our player so both players do not play simultaneously
            const track = this.currentBook.tracks?.[this.currentTrackIndex];
            const url = track?.src || '';
            const path = track?.localPath || '';
            const position = Math.floor(this.currentTime || 0);

            if (window.toast) window.toast('Opening in Poweramp...', 'info');

            if (window.NativeBridge && typeof window.NativeBridge.openInPoweramp === 'function') {
                try {
                    const res = await window.NativeBridge.openInPoweramp({ url, path, position });
                    if (res && res.powerampInstalled === false) {
                        if (window.toast) window.toast('Poweramp not installed. Opened with system player.', 'info');
                    }
                    return res;
                } catch (err) {
                    console.error('[SwiftAudio] openInPoweramp failed:', err);
                    if (window.toast) window.toast('Failed to open Poweramp: ' + (err.message || 'Unknown error'), 'error');
                    return { success: false, error: err.message };
                }
            } else {
                if (url) {
                    try {
                        window.open(url, '_blank');
                        return { success: true, powerampInstalled: false };
                    } catch (_) {}
                }
                return { success: false, error: 'Poweramp is only available on Android native app.' };
            }
        }

        cyclePlaybackMode() {
            if (this.playbackMode === 'continuous') {
                this.playbackMode = 'repeat_chapter';
                if (window.toast) window.toast('Repeat Chapter mode', 'info');
            } else if (this.playbackMode === 'repeat_chapter') {
                this.playbackMode = 'pause_at_end';
                if (window.toast) window.toast('Pause at end of chapter', 'info');
            } else {
                this.playbackMode = 'continuous';
                if (window.toast) window.toast('Continuous playback', 'info');
            }
            try {
                localStorage.setItem('gemini_audio_playback_mode', this.playbackMode);
            } catch(e) {}
            if (this._isNativeAndroid() && window.NativeBridge?.setNativeAudioMode) {
                const modeInt = this.playbackMode === 'repeat_chapter' ? 1 : (this.playbackMode === 'pause_at_end' ? 2 : 0);
                window.NativeBridge.setNativeAudioMode(modeInt);
            }
            this._notify();
        }

        setPlaybackMode(mode) {
            if (mode === 'repeat_chapter' || mode === 'pause_at_end' || mode === 'continuous') {
                this.playbackMode = mode;
                try {
                    localStorage.setItem('gemini_audio_playback_mode', this.playbackMode);
                } catch(e) {}
                if (this._isNativeAndroid() && window.NativeBridge?.setNativeAudioMode) {
                    const modeInt = this.playbackMode === 'repeat_chapter' ? 1 : (this.playbackMode === 'pause_at_end' ? 2 : 0);
                    window.NativeBridge.setNativeAudioMode(modeInt);
                }
                this._notify();
            }
        }

        setPlaybackRate(rate) {
            if (this.audioEl && rate > 0) {
                this.audioEl.playbackRate = rate;
                this.playbackRate = rate;
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
                // If running on native Android, NativeAudioService handles its own notification & MediaSession!
                if (this._isNativeAndroid()) {
                    return;
                }
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

        _savePosition(immediate = false) {
            if (!this.currentBook || !this.currentBook.url) return;
            const now = Date.now();
            // During continuous timeupdate ticks, throttle DB & LocalStorage writes to once every 1000ms
            if (!immediate && this._lastSavedDbTime && (now - this._lastSavedDbTime < 1000)) {
                return;
            }
            this._lastSavedDbTime = now;

            const bookKey = this.currentBook.id || this.currentBook.url || this.currentBook.title;
            const pos = {
                url: this.currentBook.url,
                bookId: this.currentBook.id || null,
                bookTitle: this.currentBook.title || '',
                book: {
                    id: this.currentBook.id || null,
                    url: this.currentBook.url,
                    title: this.currentBook.title,
                    author: this.currentBook.author,
                    cover: this.currentBook.cover,
                    tracks: this.currentBook.tracks
                },
                trackIndex: this.currentTrackIndex,
                trackTitle: this.currentBook?.tracks?.[this.currentTrackIndex]?.title || '',
                currentTime: this.currentTime,
                duration: this.duration,
                playbackRate: this.playbackRate,
                updatedAt: now
            };

            // 1. Authoritative IndexedDB (GeminiNovelDB) exact-second resume memory
            if (window.GeminiNovelDB && typeof window.GeminiNovelDB.saveAudiobookPosition === 'function') {
                window.GeminiNovelDB.saveAudiobookPosition(bookKey, pos).catch(() => {});
            }

            // 2. LocalStorage fast cache & saved audiobooks sync
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('gemini_last_audiobook_position', JSON.stringify(pos));

                    const rawSaved = localStorage.getItem('gemini_saved_audiobooks');
                    if (rawSaved) {
                        const list = JSON.parse(rawSaved);
                        let changed = false;
                        for (let i = 0; i < list.length; i++) {
                            if (list[i].url === this.currentBook.url || list[i].title === this.currentBook.title || (list[i].id && list[i].id === this.currentBook.id)) {
                                list[i].lastPlayedTrackIndex = this.currentTrackIndex;
                                list[i].lastPlayedTrackTitle = this.currentBook?.tracks?.[this.currentTrackIndex]?.title || '';
                                list[i].lastPlayedTime = this.currentTime;
                                list[i].lastListenedAt = now;
                                if (!list[i].tracks && this.currentBook.tracks) {
                                    list[i].tracks = this.currentBook.tracks;
                                    list[i].totalTracks = this.currentBook.tracks.length;
                                }
                                changed = true;
                                break;
                            }
                        }
                        if (changed) {
                            localStorage.setItem('gemini_saved_audiobooks', JSON.stringify(list));
                        }
                    }
                }
            } catch (e) {}
        }

        async _loadSavedPosition() {
            // First attempt to load exact-second resume position from GeminiNovelDB
            try {
                const rawLast = typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_last_audiobook_position') : null;
                const parsedLast = rawLast ? JSON.parse(rawLast) : null;
                const bookKey = parsedLast?.url || parsedLast?.book?.url || parsedLast?.bookTitle;
                if (bookKey && window.GeminiNovelDB && typeof window.GeminiNovelDB.getAudiobookPosition === 'function') {
                    const dbPos = await window.GeminiNovelDB.getAudiobookPosition(bookKey);
                    if (dbPos && (dbPos.book || parsedLast?.book)) {
                        const targetBook = dbPos.book || parsedLast.book;
                        if (targetBook && targetBook.tracks && targetBook.tracks.length > 0) {
                            this.currentBook = targetBook;
                            this.currentTrackIndex = dbPos.trackIndex || 0;
                            this.currentTime = dbPos.currentTime || 0;
                            this.playbackRate = dbPos.playbackRate || 1.0;
                            const track = targetBook.tracks[this.currentTrackIndex];
                            if (track) {
                                this._playSource(track.src, false, this.currentTime);
                            }
                            this._updateMediaSession();
                            this._notify();
                            return;
                        }
                    }
                }
            } catch (e) {}

            // Fallback to localStorage
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
                    if (track) {
                        this._playSource(track.src, false, this.currentTime);
                    }
                    this._updateMediaSession();
                    this._notify();
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
                            'Audiobook Downloaded Successfully',
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

    // ══════════════════════════════════════════════════════════════════
    // 4. SWIFTAUDIO CONTROLLER & PLAYBACK / DOWNLOAD WORKFLOWS
    // ══════════════════════════════════════════════════════════════════
    function safeControllerToast(callbacks, msg, type) {
        if (typeof callbacks?.toast === 'function') {
            callbacks.toast(msg, type);
        } else if (typeof window !== 'undefined' && typeof window.toast === 'function') {
            window.toast(msg, type);
        } else {
            console.log(`[SwiftAudioController][${type || 'info'}] ${msg}`);
        }
    }

    const SwiftAudioController = {
        /**
         * Search audiobooks or load a direct audiobook URL
         */
        searchAudiobooks: async function(queryOrUrl, callbacks = {}) {
            const target = (queryOrUrl || '').trim();
            if (!target || target === 'https://swiftaudiobooks.com/' || target === 'https://swiftaudiobooks.com') {
                safeControllerToast(callbacks, 'Please enter an audiobook title or URL to search', 'warning');
                return [];
            }
            if (!SwiftAudioScraper) {
                safeControllerToast(callbacks, 'Audio engine is initializing, please try again in a moment…', 'info');
                return [];
            }

            callbacks.onStart?.();
            try {
                const isBookUrl = /^https?:\/\/(?:www\.)?(?:swiftaudiobooks\.com|ipaudio7\.com)\/[a-z0-9-]+/i.test(target) &&
                    !/https?:\/\/(?:www\.)?swiftaudiobooks\.com\/?$/i.test(target) &&
                    !target.includes('/?s=');

                if (isBookUrl) {
                    safeControllerToast(callbacks, 'Fetching audiobook tracks…', 'info');
                    const book = await SwiftAudioScraper.getBookDetails(target);
                    callbacks.onBookLoaded?.(book);
                    callbacks.onResults?.([book]);
                    safeControllerToast(callbacks, `Loaded "${book.title}" (${book.totalTracks || (book.tracks && book.tracks.length) || 0} chapters)!`, 'success');
                    return [book];
                } else {
                    const q = target.replace(/^https?:\/\/swiftaudiobooks\.com\/\?s=/i, '').replace(/^https?:\/\/[^\/]+\/?/i, '');
                    const results = await SwiftAudioScraper.search(q || target);
                    callbacks.onResults?.(results || []);
                    if (!results || results.length === 0) {
                        safeControllerToast(callbacks, 'No audiobooks found matching query.', 'info');
                    } else {
                        safeControllerToast(callbacks, `Found ${results.length} audiobooks on SwiftAudiobooks!`, 'success');
                    }
                    return results || [];
                }
            } catch (e) {
                callbacks.onError?.(e);
                safeControllerToast(callbacks, 'SwiftAudio error: ' + (e.message || e), 'error');
                return [];
            } finally {
                callbacks.onEnd?.();
            }
        },

        /**
         * Start or resume playing an audiobook
         */
        startPlayAudiobook: async function(bookOrResult, startTrack = 0, callbacks = {}) {
            try {
                const targetUrl = bookOrResult?.url || (typeof bookOrResult === 'string' ? bookOrResult : '').trim();
                if (!targetUrl || targetUrl === 'https://swiftaudiobooks.com/' || targetUrl === 'https://swiftaudiobooks.com') {
                    safeControllerToast(callbacks, 'Please enter an audiobook title or select a book to play.', 'warning');
                    return null;
                }
                const player = playerInstance;
                if (!SwiftAudioScraper || !player) {
                    safeControllerToast(callbacks, 'Audio engine is initializing, please try again in a moment…', 'info');
                    return null;
                }

                // If the book is already loaded in the player, resume or switch track
                if (player.currentBook && player.currentBook.url === targetUrl) {
                    if (startTrack !== undefined && startTrack !== player.currentTrackIndex) {
                        player.playTrack(startTrack);
                    } else if (!player.isPlaying) {
                        player.play();
                    }
                    callbacks.onPlaying?.(player.currentBook);
                    return player.currentBook;
                }

                let fullBook = bookOrResult;
                if (!fullBook || !fullBook.tracks || fullBook.tracks.length === 0) {
                    safeControllerToast(callbacks, 'Loading chapter audio streams…', 'info');
                    fullBook = await SwiftAudioScraper.getBookDetails(targetUrl);
                }

                // Query exact resume position from GeminiNovelDB or library record
                let seekTime = (typeof bookOrResult === 'object' && bookOrResult.lastPlayedTime) ? bookOrResult.lastPlayedTime : 0;
                const bookKey = fullBook?.id || targetUrl || fullBook?.title;
                if (window.GeminiNovelDB && typeof window.GeminiNovelDB.getAudiobookPosition === 'function') {
                    try {
                        const savedPos = await window.GeminiNovelDB.getAudiobookPosition(bookKey);
                        if (savedPos) {
                            if (typeof savedPos.trackIndex === 'number' && (startTrack === undefined || startTrack === 0 || startTrack === savedPos.trackIndex)) {
                                startTrack = savedPos.trackIndex;
                                seekTime = savedPos.currentTime || seekTime;
                            }
                        }
                    } catch (e) {}
                }

                player.loadBook(fullBook, startTrack, true, seekTime);
                callbacks.onPlaying?.(fullBook);
                safeControllerToast(callbacks, `Playing: ${fullBook.title || 'Audiobook'}`, 'success');
                return fullBook;
            } catch (e) {
                callbacks.onError?.(e);
                safeControllerToast(callbacks, 'Could not play audiobook: ' + (e.message || e), 'error');
                return null;
            }
        },

        /**
         * Prepare modal data for batch audiobook download
         */
        prepareAudioDownload: async function(bookOrResult, getFolderOptionsFn, callbacks = {}) {
            try {
                const targetUrl = bookOrResult?.url || (typeof bookOrResult === 'string' ? bookOrResult : '').trim();
                if (!targetUrl || targetUrl === 'https://swiftaudiobooks.com/' || targetUrl === 'https://swiftaudiobooks.com') {
                    safeControllerToast(callbacks, 'Please enter an audiobook title or select a book.', 'warning');
                    return null;
                }
                if (!SwiftAudioScraper) {
                    safeControllerToast(callbacks, 'Audio engine is initializing, please try again in a moment…', 'info');
                    return null;
                }

                let fullBook = bookOrResult;
                if (!fullBook || !fullBook.tracks || fullBook.tracks.length === 0) {
                    safeControllerToast(callbacks, 'Loading chapter audio streams…', 'info');
                    fullBook = await SwiftAudioScraper.getBookDetails(targetUrl);
                }

                const opts = typeof getFolderOptionsFn === 'function'
                    ? getFolderOptionsFn(fullBook)
                    : (window.MoonReaderEngine?.getNovelFolderOptions ? window.MoonReaderEngine.getNovelFolderOptions(fullBook) : {});
                const allIndices = (fullBook.tracks || []).map((_, i) => i);
                const modalData = {
                    book: fullBook,
                    folderOptions: opts,
                    selectedIndices: allIndices,
                    status: `Ready to download ${(fullBook.tracks || []).length} chapters`,
                    percent: 0,
                    active: false,
                    isMinimized: false
                };
                callbacks.onReady?.(modalData);
                return modalData;
            } catch (e) {
                callbacks.onError?.(e);
                safeControllerToast(callbacks, 'Could not load audiobook for download: ' + (e.message || e), 'error');
                return null;
            }
        },

        /**
         * Execute batch download of selected audiobook tracks
         */
        executeBatchDownload: async function(book, selectedIndices, folderOptions, callbacks = {}) {
            if (!book) return null;
            const opts = folderOptions || {};
            const selected = selectedIndices || (book.tracks || []).map((_, i) => i);
            if (!selected || selected.length === 0) {
                safeControllerToast(callbacks, 'Please select at least one chapter to download.', 'warning');
                return null;
            }

            callbacks.onProgress?.({
                status: `Starting download (${selected.length} ch)…`,
                percent: 0,
                active: true
            });

            try {
                const res = await SwiftAudioDownloader.downloadAllTracks(book, opts, (progress) => {
                    callbacks.onProgress?.(progress);
                }, selected);

                callbacks.onSuccess?.(res);
                safeControllerToast(callbacks, `Chapters of "${book.title || 'Audiobook'}" downloaded!`, 'success');
                return res;
            } catch (e) {
                callbacks.onError?.(e);
                safeControllerToast(callbacks, 'Audiobook download error: ' + (e.message || e), 'error');
                return null;
            }
        },

        /**
         * Convenience delegator for search Audiobooks from UI
         */
        handleSwiftAudioSearch: async function(queryOrUrl, deps = {}) {
            const { webImportUrl, toast, setIsSwiftAudioSearching, setWebImportStatus, setActiveAudiobook, setSwiftAudioResults } = deps;
            const target = (queryOrUrl || webImportUrl || '').trim();
            return await this.searchAudiobooks(target, {
                toast,
                onStart: () => {
                    setIsSwiftAudioSearching?.(true);
                    setWebImportStatus?.('Searching SwiftAudiobooks…');
                },
                onEnd: () => {
                    setIsSwiftAudioSearching?.(false);
                    setWebImportStatus?.('');
                },
                onBookLoaded: (book) => {
                    setActiveAudiobook?.(book);
                },
                onResults: (results) => {
                    setSwiftAudioResults?.(results);
                }
            });
        },

        /**
         * Convenience delegator for starting / playing an audiobook from UI
         */
        handleStartPlayAudiobook: async function(bookOrResult, startTrack = 0, deps = {}) {
            const { webImportUrl, toast, setActiveAudiobook, setIsFullPlayerOpen } = deps;
            const target = bookOrResult || webImportUrl;
            return await this.startPlayAudiobook(target, startTrack, {
                toast,
                onPlaying: (book) => {
                    setActiveAudiobook?.(book);
                    setIsFullPlayerOpen?.(true);
                }
            });
        },

        /**
         * Convenience delegator for opening audiobook download modal from UI
         */
        handleOpenAudioDownload: async function(bookOrResult, deps = {}) {
            const { webImportUrl, getNovelFolderOptions, toast, setActiveAudiobook, setAudioDownloadModal } = deps;
            const target = bookOrResult || webImportUrl;
            return await this.prepareAudioDownload(target, getNovelFolderOptions, {
                toast,
                onReady: (modalData) => {
                    if (modalData && modalData.book) {
                        setActiveAudiobook?.(modalData.book);
                    }
                    setAudioDownloadModal?.(modalData);
                }
            });
        },

        /**
         * Convenience delegator for executing batch download from UI modal
         */
        handleExecuteAudioBatchDownload: async function(deps = {}) {
            const { audioDownloadModal, getNovelFolderOptions, setAudioDownloadModal, toast } = deps;
            if (!audioDownloadModal || !audioDownloadModal.book) return;
            const book = audioDownloadModal.book;
            const opts = audioDownloadModal.folderOptions || (typeof getNovelFolderOptions === 'function' ? getNovelFolderOptions(book) : {});
            const selected = audioDownloadModal.selectedIndices || (book.tracks || []).map((_, i) => i);

            return await this.executeBatchDownload(book, selected, opts, {
                toast,
                onProgress: (progress) => {
                    setAudioDownloadModal?.(prev => prev ? ({
                        ...prev,
                        active: progress.active !== undefined ? progress.active : prev.active,
                        status: progress.status,
                        percent: progress.percent !== undefined ? progress.percent : prev.percent,
                        completed: progress.completed
                    }) : prev);
                },
                onSuccess: (res) => {
                    setAudioDownloadModal?.(prev => prev ? ({
                        ...prev,
                        active: false,
                        status: res && res.count ? `Complete! Downloaded ${res.count} chapter(s).` : 'Download completed.',
                        percent: 100
                    }) : null);
                },
                onError: (e) => {
                    setAudioDownloadModal?.(prev => prev ? ({ ...prev, active: false, status: 'Download failed: ' + (e.message || e) }) : null);
                }
            });
        }
    };

    window.SwiftAudioEngine = {
        Scraper: SwiftAudioScraper,
        Player: playerInstance,
        Downloader: SwiftAudioDownloader,
        Controller: SwiftAudioController,
        openInPoweramp: function() {
            return playerInstance.openInPoweramp();
        },
        formatDuration: function(secs) {
            if (!secs || isNaN(secs) || secs < 0) return '0:00';
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = Math.floor(secs % 60);
            if (h > 0) {
                return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
            return `${m}:${String(s).padStart(2, '0')}`;
        },
        formatCountdown: function(curr, dur) {
            if (!dur || isNaN(dur) || dur <= 0) return '0:00';
            const remaining = Math.max(0, dur - (curr || 0));
            return '-' + this.formatDuration(remaining);
        }
    };

    console.log('[SwiftAudioEngine] ready (Scraper, 5-Second Plyr Player & Downloader)');
})();
