// ══════════════════════════════════════════════════════════════════════
// GEMINI TRANSLATOR — GOOGLE DRIVE CLOUD SYNC & BACKUP ENGINE
// Modeled on Mihon (Tachiyomi) & Komikku Google Drive Sync Architecture
// Standard: Google Drive REST API v3 with drive.appdata & drive.file scopes
// ══════════════════════════════════════════════════════════════════════

(function(window) {
    'use strict';

    const G_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    const G_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
    const G_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
    const BACKUP_FILENAME = 'gemini_translator_backup.json';
    const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';

    // Default client ID is configured by the user via Settings modal.
    const DEFAULT_CLIENT_ID = '';

    class GoogleDriveSyncEngine {
        constructor() {
            this.clientId = localStorage.getItem('gdrive_client_id') || '';
            this.accessToken = localStorage.getItem('gdrive_access_token') || '';
            this.tokenExpiry = parseInt(localStorage.getItem('gdrive_token_expiry') || '0', 10);
            this.userProfile = null;
            try {
                const raw = localStorage.getItem('gdrive_user_profile');
                if (raw) this.userProfile = JSON.parse(raw);
            } catch(e) {}

            this.folderMode = localStorage.getItem('gdrive_folder_mode') || 'appDataFolder'; // 'appDataFolder' | 'visibleFolder'
            this.autoSync = localStorage.getItem('gdrive_auto_sync') === 'true';
            this.lastSync = localStorage.getItem('gdrive_last_sync') || null;

            // Handle incoming OAuth redirect token in URL hash if present
            this.checkUrlHashForToken();
        }

        checkUrlHashForToken() {
            try {
                if (typeof window === 'undefined' || !window.location.hash) return;
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const token = params.get('access_token');
                const expiresIn = params.get('expires_in');
                if (token) {
                    const expiryTime = Date.now() + (parseInt(expiresIn || '3600', 10) * 1000);
                    this.setAccessToken(token, expiryTime);
                    // Clean URL hash without reloading
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', window.location.pathname + window.location.search);
                    }
                    console.log('✅ Google Drive OAuth Token extracted from redirect hash.');
                }
            } catch (e) {
                console.warn('OAuth Hash Token check error:', e);
            }
        }

        getClientId() {
            return (this.clientId && this.clientId.trim()) ? this.clientId.trim() : DEFAULT_CLIENT_ID;
        }

        setClientId(id) {
            this.clientId = (id || '').trim();
            if (this.clientId) {
                localStorage.setItem('gdrive_client_id', this.clientId);
            } else {
                localStorage.removeItem('gdrive_client_id');
            }
        }

        setAccessToken(token, expiryTimestamp) {
            this.accessToken = token || '';
            this.tokenExpiry = expiryTimestamp || (Date.now() + 3600 * 1000);
            localStorage.setItem('gdrive_access_token', this.accessToken);
            localStorage.setItem('gdrive_token_expiry', String(this.tokenExpiry));
        }

        setToken(token, seconds = 3600) {
            this.setAccessToken(token, Date.now() + (seconds * 1000));
        }

        formatQuota(storageQuota) {
            if (!storageQuota) return '';
            const used = parseInt(storageQuota.usage || storageQuota.quotaUsage || '0', 10);
            const total = parseInt(storageQuota.limit || storageQuota.quotaLimit || '0', 10);
            const formatBytes = (bytes) => {
                if (bytes <= 0) return '0 B';
                const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(1024));
                return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
            };
            if (!total) return `${formatBytes(used)} used`;
            const pct = Math.round((used / total) * 100);
            return `${formatBytes(used)} / ${formatBytes(total)} (${pct}%)`;
        }

        isConnected() {
            return Boolean(this.accessToken && (Date.now() < this.tokenExpiry));
        }

        getRemainingMinutes() {
            if (!this.isConnected()) return 0;
            return Math.max(0, Math.round((this.tokenExpiry - Date.now()) / 60000));
        }

        disconnect() {
            this.accessToken = '';
            this.tokenExpiry = 0;
            this.userProfile = null;
            localStorage.removeItem('gdrive_access_token');
            localStorage.removeItem('gdrive_token_expiry');
            localStorage.removeItem('gdrive_user_profile');
            console.log('Google Drive disconnected.');
        }

        getAuthUrl(customClientId = null) {
            const cid = customClientId || this.getClientId();
            const redirectUri = window.location.origin + window.location.pathname;
            const params = new URLSearchParams({
                client_id: cid,
                redirect_uri: redirectUri,
                response_type: 'token',
                scope: SCOPES,
                include_granted_scopes: 'true',
                prompt: 'select_account consent'
            });
            return `${G_OAUTH_AUTH_URL}?${params.toString()}`;
        }

        launchOAuthFlow() {
            const cid = this.getClientId();
            if (!cid) {
                return Promise.reject(new Error('MISSING_CLIENT_ID'));
            }
            const authUrl = this.getAuthUrl(cid);
            const width = 500;
            const height = 650;
            const left = Math.max(0, (window.screen.width - width) / 2);
            const top = Math.max(0, (window.screen.height - height) / 2);

            const popup = window.open(
                authUrl,
                'GoogleDriveAuth',
                `width=${width},height=${height},top=${top},left=${left},status=no,toolbar=no,menubar=no`
            );

            return new Promise((resolve, reject) => {
                if (!popup) {
                    // Fallback to full page redirect if popup blocked
                    window.location.href = authUrl;
                    return;
                }

                const timer = setInterval(() => {
                    try {
                        if (!popup || popup.closed) {
                            clearInterval(timer);
                            if (this.isConnected()) {
                                resolve(this.accessToken);
                            } else {
                                reject(new Error('Sign-in window was closed without completing authorization.'));
                            }
                            return;
                        }

                        // Check if popup returned to our origin with token in hash
                        if (popup.location && popup.location.href && popup.location.href.includes('access_token=')) {
                            const hash = popup.location.hash.substring(1);
                            const params = new URLSearchParams(hash);
                            const token = params.get('access_token');
                            const expiresIn = params.get('expires_in');
                            if (token) {
                                clearInterval(timer);
                                popup.close();
                                const expiryTime = Date.now() + (parseInt(expiresIn || '3600', 10) * 1000);
                                this.setAccessToken(token, expiryTime);
                                resolve(token);
                            }
                        }
                    } catch (crossOriginErr) {
                        // Cross-origin access error while on accounts.google.com; ignore until redirected back
                    }
                }, 500);
            });
        }

        async requestApi(endpoint, options = {}) {
            if (!this.accessToken) {
                throw new Error('Google Drive is not connected. Please authorize in Settings.');
            }
            if (Date.now() >= this.tokenExpiry) {
                throw new Error('Google Drive authorization has expired. Please re-authenticate.');
            }

            const url = endpoint.startsWith('http') ? endpoint : `${G_DRIVE_API_BASE}${endpoint}`;
            const headers = options.headers || {};
            headers['Authorization'] = `Bearer ${this.accessToken}`;

            let res;
            // Use NativeBridge fetchNative if available to avoid any CORS/header issues on Android
            if (window.NativeBridge && window.NativeBridge.fetchNative && !options.bodyMultipart) {
                try {
                    const nativeRes = await window.NativeBridge.fetchNative(url, {
                        method: options.method || 'GET',
                        headers,
                        data: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null
                    });
                    if (nativeRes.status === 401) {
                        this.disconnect();
                        throw new Error('Google Drive access token expired or invalid. Please re-authenticate.');
                    }
                    if (nativeRes.status < 200 || nativeRes.status >= 300) {
                        throw new Error(`Google Drive API HTTP ${nativeRes.status}: ${nativeRes.data || nativeRes.statusText}`);
                    }
                    return typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
                } catch (e) {
                    if (e.message.includes('re-authenticate')) throw e;
                    console.warn('NativeBridge fetch failed, fallback to window.fetch:', e);
                }
            }

            const fetchOptions = {
                method: options.method || 'GET',
                headers
            };
            if (options.body) {
                fetchOptions.body = options.body;
            }

            res = await fetch(url, fetchOptions);
            if (res.status === 401) {
                this.disconnect();
                throw new Error('Google Drive access token expired. Please re-authenticate.');
            }
            if (!res.ok) {
                const errText = await res.text().catch(() => '');
                throw new Error(`Google Drive API HTTP ${res.status}: ${errText || res.statusText}`);
            }

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await res.json();
            }
            return await res.text();
        }

        async testConnection() {
            try {
                const data = await this.requestApi('/about?fields=user(displayName,emailAddress,photoLink),storageQuota(limit,usage)');
                if (data && data.user) {
                    this.userProfile = {
                        displayName: data.user.displayName,
                        emailAddress: data.user.emailAddress,
                        photoLink: data.user.photoLink,
                        quotaLimit: data.storageQuota?.limit ? parseInt(data.storageQuota.limit, 10) : 0,
                        quotaUsage: data.storageQuota?.usage ? parseInt(data.storageQuota.usage, 10) : 0
                    };
                    localStorage.setItem('gdrive_user_profile', JSON.stringify(this.userProfile));
                    return { success: true, profile: this.userProfile };
                }
                return { success: false, error: 'User profile not found in Google response.' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }

        async findBackupFile() {
            const isAppData = this.folderMode === 'appDataFolder';
            const spaces = isAppData ? 'appDataFolder' : 'drive';
            const q = `name='${BACKUP_FILENAME}' and trashed=false`;
            const endpoint = `/files?q=${encodeURIComponent(q)}&spaces=${spaces}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`;
            
            const res = await this.requestApi(endpoint);
            const files = res.files || [];
            return files.length > 0 ? files[0] : null;
        }

        async uploadBackup(backupPayload) {
            const jsonStr = typeof backupPayload === 'string' ? backupPayload : JSON.stringify(backupPayload, null, 2);
            const existing = await this.findBackupFile();
            const isAppData = this.folderMode === 'appDataFolder';

            const metadata = {
                name: BACKUP_FILENAME,
                mimeType: 'application/json',
                description: `Gemini Translator Full App Backup (${new Date().toLocaleString()})`
            };

            if (!existing && isAppData) {
                metadata.parents = ['appDataFolder'];
            }

            const boundary = '-------314159265358979323846';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                jsonStr +
                closeDelimiter;

            let url;
            let method;
            if (existing && existing.id) {
                url = `${G_DRIVE_UPLOAD_BASE}/files/${existing.id}?uploadType=multipart`;
                method = 'PATCH';
            } else {
                url = `${G_DRIVE_UPLOAD_BASE}/files?uploadType=multipart`;
                method = 'POST';
            }

            const res = await this.requestApi(url, {
                method,
                headers: {
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                    'Content-Length': String(multipartRequestBody.length)
                },
                body: multipartRequestBody,
                bodyMultipart: true
            });

            const timeStr = new Date().toLocaleString();
            this.lastSync = timeStr;
            localStorage.setItem('gdrive_last_sync', timeStr);

            try {
                window.NativeBridge?.showCompletionNotification?.(
                    'Google Drive Backup Complete! ☁️',
                    `Backup safely uploaded to Google Drive (${new Date().toLocaleTimeString()}).`
                );
            } catch(e) {}

            return { success: true, fileId: res.id, modifiedTime: res.modifiedTime || timeStr };
        }

        async downloadBackup() {
            const file = await this.findBackupFile();
            if (!file || !file.id) {
                throw new Error('No Gemini Translator backup file found on Google Drive.');
            }

            const url = `${G_DRIVE_API_BASE}/files/${file.id}?alt=media`;
            const rawContent = await this.requestApi(url);
            const data = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;

            try {
                window.NativeBridge?.showCompletionNotification?.(
                    'Google Drive Restore Downloaded! 📥',
                    `Downloaded backup from Google Drive (${file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'recent'}).`
                );
            } catch(e) {}

            return { data, meta: file };
        }
    }

    window.GoogleDriveSync = new GoogleDriveSyncEngine();
    console.log('✅ Google Drive Cloud Sync Engine Initialized.');
})(window);
