// ==UserScript==
// @name         VK Photos Downloader (Unified v5.7.31)
// @namespace    http://tampermonkey.net/
// @version      5.7.31
// @description  Скачивание фото. Жесткая блокировка при загрузке, сохранение состояния, улучшенный курсор.
// @author       Final Release
// @match        https://vk.com/*
// @match        https://vk.com/*
// @match        https://vkontakte.ru/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @updateURL    https://raw.githubusercontent.com/userartemexist/VK_photo_downloader/refs/heads/main/src/vk_photo_downloader.js
// @downloadURL  https://raw.githubusercontent.com/userartemexist/VK_photo_downloader/refs/heads/main/src/vk_photo_downloader.js
// @connect      vk.com
// @connect      vk.com
// @connect      vkontakte.ru
// @connect      sun9-.userapi.com
// @connect      userapi.com
// @connect      *
// @run-at       document-end
// @noframes
// ==/UserScript==
(function() { 'use strict';
// ============================================
// КОНСТАНТЫ И СЕЛЕКТОРЫ
// ============================================
const SCRIPT_VERSION = '5.7.31';
console.log(`%c[VK Photo] v${SCRIPT_VERSION}`, 'color: green; font-weight: bold');
const VK_SELECTORS = {
    PHOTO_ROWS: '.photos_album_thumbs, .page_photos',
    PHOTO_LINK: 'a[href*="photo"]'
};
const VK_API = {
    BATCH_SIZE:             10,
    REQ_DELAY:              50,
    SIZE_TIMEOUT:           5000,
    DOWNLOAD_DELAY:         300,
    MAX_RETRIES:            4,
    RETRY_DELAYS:           [100, 400, 1000, 2500],
    TOTAL_FETCH_TIMEOUT:    8000,
    DEBOUNCE_DELAY:         100,
    PROGRESS_FADE_DELAY:    450,
    SPA_CHECK_INTERVAL:     1000,
    FALLBACK_TAB_THRESHOLD: 10
};
const UI_CONSTANTS = {
    Z_INDEX_PANEL: 99999,
    Z_INDEX_BADGE: 100,
    PANEL_WIDTH:   '320px'
};
// ============================================
// CSS СТИЛИ
// ============================================
const injectStyles = () => {
    if (document.getElementById('sf-styles')) return;
    const style = document.createElement('style');
    style.id = 'sf-styles';
    const cursorSVG = `image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><line x1='24' y1='4' x2='24' y2='16' stroke='black' stroke-width='10'/><line x1='24' y1='32' x2='24' y2='44' stroke='black' stroke-width='10'/><line x1='4' y1='24' x2='16' y2='24' stroke='black' stroke-width='10'/><line x1='32' y1='24' x2='44' y2='24' stroke='black' stroke-width='10'/><circle cx='24' cy='24' r='3' fill='black'/></svg>`;
    style.textContent = `
/* Panel Container */
#sf-dl-panel {
    position: fixed; top: 80px; left: 50px; width: ${UI_CONSTANTS.PANEL_WIDTH};
    background: #fff; border: 1px solid #ccc; z-index: ${UI_CONSTANTS.Z_INDEX_PANEL};
    box-shadow: 0 0 15px rgba(0,0,0,0.3); border-radius: 8px;
    font-family: Arial, sans-serif; font-size: 14px;
    display: none; padding: 0; user-select: none;
}
/* Custom Cursor */
body.sf-selecting-mode { cursor: url('${cursorSVG}') 24 24, crosshair; }
body.sf-selecting-mode a[href*="photo"] { cursor: url('${cursorSVG}') 24 24, crosshair; }

/* Header */
.sf-header {
    position: relative; background: #f5f5f5;
    padding: 10px 30px 10px 15px;
    border-bottom: 1px solid #ddd;
    border-radius: 8px 8px 0 0; cursor: move;
}
.sf-header-title { font-weight: bold; font-size: 16px; color: #2a5885; }
.sf-close-btn {
    position: absolute; top: 10px; right: 10px;
    width: 22px; height: 22px; background: #ff4444;
    border-radius: 4px; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: bold; cursor: pointer;
    border: none; padding: 0; line-height: 1;
}
/* Body */ 
.sf-body { padding: 15px; }
/* Toggle Container */
.sf-toggle-container {
    margin-bottom: 15px; display: flex; align-items: center;
    justify-content: center; background: #f0f0f0;
    border-radius: 6px; padding: 4px;
}
/* Tab Buttons Logic */
.sf-toggle-label {
    flex: 1; cursor: pointer; text-align: center;
    font-size: 13px; font-weight: normal; color: #555;
    background: transparent; border: 1px solid transparent;
    border-radius: 4px; padding: 6px 10px; margin: 0 2px;
    transition: all 0.2s;
}
.sf-toggle-label.active-blue {
    font-weight: bold; color: #2a5885;
    background: #fff; border-color: #2a5885; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.sf-status-text.blue { color: #2a5885; }
.sf-toggle-label.active-yellow {
    font-weight: bold; color: #FB8C00;
    background: #fff; border-color: #FB8C00; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
/* Table */
.sf-data-table { width: 100%; text-align: center; font-family: 'Arial Narrow', Arial, sans-serif; border-collapse: collapse; margin-bottom: 5px; }
.sf-data-table th { font-size: 11px; font-weight: bold; color: #666; padding: 0 2px; }
.sf-data-table td { font-size: 18px; font-weight: bold; color: #000; padding: 0 2px; }

/* Buttons */
.sf-buttons-row { margin: 15px 0; display: flex; justify-content: center; }
.sf-action-btn { width: 120px; height: 30px; padding: 0 10px; font-size: 13px; box-sizing: border-box; border: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: none !important; transform: none !important; outline: none !important; background: #e5ebf1 !important; color: #2a5885 !important; border-radius: 4px; }
.sf-action-btn + .sf-action-btn { margin-left: 10px; }
.sf-action-btn:active { background: #dce5ed !important; }
.sf-action-btn:disabled { opacity: 0.5; cursor: default; background: #f0f0f0 !important; }

/* Inputs */
.sf-prefix-row { margin-bottom: 15px; position: relative; }
.sf-input-prefix { width: 100%; padding: 6px 25px 6px 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 13px; }
.sf-clear-btn { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; background: #ff4444; border-radius: 4px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; cursor: pointer; border: none; padding: 0; line-height: 1; }

/* Status Block */
.sf-status-block { position: relative; background: #f0f0f0; border-radius: 4px; height: 28px; display: flex; flex-direction: column; justify-content: center; margin-bottom: 15px; padding: 0 5px; overflow: hidden; }
.sf-status-progress-bg { position: absolute; top: 0; left: 0; height: 100%; background: #d0d0d0; width: 0%; opacity: 1; transition: width 0.2s ease, opacity 0.4s ease; z-index: 0; }
.sf-status-progress-bg.sf-progress-hidden { opacity: 0; }
.sf-status-text { position: relative; z-index: 1; text-align: center; font-size: 16px; font-weight: bold; color: #2a5885; }
.sf-status-text.green { color: #4CAF50; }
.sf-status-text.red { color: #E53935; }
.sf-status-text.orange { color: #FB8C00; }

/* Footer */
.sf-footer-row { display: flex; justify-content: center; }
.sf-run-btn { 
    font-size: 16px; padding: 10px 30px;
    font-weight: bold; cursor: pointer; height: auto;
    background: #5181B8 !important; color: #fff !important;
    border-radius: 4px; border: none;
    box-sizing: border-box;
}
.sf-run-btn:disabled { opacity: 0.5; cursor: default; pointer-events: none; }

/* Badges */
.sf-badge-marker {
    position: absolute; top: 5px; left: 5px;
    width: 24px; height: 24px;
    background: rgba(76, 175, 80, 0.8);
    border-radius: 50%; color: #fff;
    font-size: 16px; font-weight: bold;
    display: flex; align-items: center;
    justify-content: center; z-index: ${UI_CONSTANTS.Z_INDEX_BADGE};
    pointer-events: none;
}
`;
    document.head.appendChild(style);
};
// ============================================
// УТИЛИТЫ
// ============================================
const getCleanId = (id) => { if (!id) return null; const str = String(id); return str.includes('_') ? str.split('_')[1] : str; };
const getNumericId = (id) => parseInt(getCleanId(id));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const parseVKResponse = (text) => { let s = text.trim(); if (s.startsWith('<!--')) s = s.substring(4); if (s.endsWith('-->')) s = s.slice(0, -3); return JSON.parse(s); };
// ============================================
// ПАРСИНГ И СЕТЬ
// ============================================
const getMaxPhotoSize = (photo) => {
    let url = null;
    if (photo.sizes && Array.isArray(photo.sizes)) {
        const best = photo.sizes.find(s => s.type === 'w') || photo.sizes.find(s => s.type === 'z') || photo.sizes.find(s => s.type === 'y');
        if (best) url = best.url;
    }
    if (!url) {
        ['w', 'z', 'y', 'x'].some(size => {
            const val = photo[size + '_'];
            if (val) { url = Array.isArray(val) ? val[0] : val; return true; }
        });
    }
    return url ? { url } : null;
};
const getSingleFileSize = (url, abortSignal) => {
    if (!url) return Promise.resolve(0);
    return new Promise(resolve => {
        if (typeof GM_xmlhttpRequest !== 'undefined') {
            const req = GM_xmlhttpRequest({
                method: 'GET', url,
                headers: { 'Range': 'bytes=0-0' },
                timeout: VK_API.SIZE_TIMEOUT,
                onload: (r) => {
                    const m = r.responseHeaders.match(/Content-Range:\s*bytes\s+\d+-\d+\/(\d+)/i);
                    resolve(m && m[1] ? parseInt(m[1]) : 0);
                },
                onerror: () => resolve(0),
                ontimeout: () => resolve(0),
                onabort: () => resolve(0)
            });
            if (abortSignal) abortSignal.onabort = () => { try { req.abort(); } catch(e) {} };
        } else { resolve(0); }
    });
};
const calculateBatchSize = async (urls, abortChecker, sizeRequestTracker) => {
    if (!urls || urls.length === 0) return 0;
    let total = 0;
    for (let i = 0; i < urls.length; i += VK_API.BATCH_SIZE) {
        if (abortChecker && abortChecker()) throw new Error('Aborted');
        const chunk = urls.slice(i, i + VK_API.BATCH_SIZE);
        const abortController = { onabort: null };
        sizeRequestTracker.current = abortController;
        const sizes = await Promise.all(chunk.map(url => getSingleFileSize(url, abortController)));
        if (sizeRequestTracker.current === abortController) sizeRequestTracker.current = null;
        total += sizes.reduce((acc, val) => acc + val, 0);
    }
    return total;
};
const fetchWithRetry = async (url, data, abortChecker, onRetry, activeRequestTracker) => {
    let lastError = null;
    for (let attempt = 0; attempt <= VK_API.MAX_RETRIES; attempt++) {
        if (abortChecker && abortChecker()) throw new Error('Aborted');
        if (attempt > 0) {
            if (onRetry) onRetry(attempt, VK_API.MAX_RETRIES);
            await delay(VK_API.RETRY_DELAYS[attempt - 1] || 2500);
        }
        try {
            return await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', url, true);
                if (activeRequestTracker) activeRequestTracker.xhr = xhr;
                xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve({ body: xhr.responseText }) : reject(new Error('HTTP ' + xhr.status));
                xhr.onabort = () => reject(new Error('Abort'));
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.ontimeout = () => reject(new Error('Timeout'));
                const formData = new FormData();
                for (const key in data) formData.append(key, data[key]);
                xhr.send(formData);
            });
        } catch (e) {
            lastError = e;
            if (e.message === 'Abort' || (abortChecker && abortChecker())) throw new Error('Aborted');
        }
    }
    throw lastError || new Error('Max retries exceeded');
};
const getPhotosByOffset = async (albumId, offset, count, onProgress, abortChecker, onRetryStatus, tracker, sizeTracker) => {
    const listParam = albumId.startsWith('album') ? albumId : 'album' + albumId;
    const allPhotos = [];
    let totalBytes = 0;
    let currentOffset = offset;
    let remainingCount = count;
    while (remainingCount > 0) {
        if (abortChecker()) throw new Error('Aborted');
        const limit = Math.min(remainingCount, VK_API.BATCH_SIZE);
        const data = { act: 'show', al: 1, list: listParam, offset: currentOffset, count: limit };
        const response = await fetchWithRetry('/al_photos.php', data, abortChecker, (attempt, max) => {
            if (onRetryStatus) onRetryStatus(`Ошибка сети. Повтор ${attempt}/${max}...`, 'orange');
        }, tracker);
        try {
            const json = parseVKResponse(response.body);
            if (json.payload && json.payload[1] && json.payload[1][3]) {
                const pagePhotos = json.payload[1][3];
                if (pagePhotos.length === 0) break;
                const batchUrls = [];
                for (const photo of pagePhotos) {
                    if (remainingCount <= 0) break;
                    const maxSize = getMaxPhotoSize(photo);
                    if (maxSize && maxSize.url) {
                        allPhotos.push({ id: photo.id, url: maxSize.url, numericId: getNumericId(photo.id) });
                        batchUrls.push(maxSize.url);
                        remainingCount--;
                    }
                }
                if (batchUrls.length > 0) {
                    const chunkBytes = await calculateBatchSize(batchUrls, abortChecker, sizeTracker);
                    totalBytes += chunkBytes;
                    if (onProgress) onProgress(allPhotos.length, count, totalBytes);
                }
                currentOffset += pagePhotos.length;
            } else { break; }
        } catch (e) {
            if (e.message === 'Aborted') throw e;
            console.error(e);
            break;
        }
        await delay(VK_API.REQ_DELAY);
    }
    return { photos: allPhotos, totalBytes };
};
// ============================================
// UI И ЛОГИКА
// ============================================
const VKPhotoModule = {
    // State
    startVisual: null, endVisual: null, totalPhotos: null,
    startReal: null, endReal: null,
    startId: null, endId: null,
    pickedPhotos: [], pendingRequests: {}, totalPickSize: 0,
    cachedPhotos: [], totalBytesRange: 0,
    mode: 'range', selectionMode: null, isPicking: false,
    isScanning: false, isDownloading: false, abortFlag: false, isFetchingMeta: false,
    uiPanel: null, gmSupported: false,
    lastAlbumId: null, lastUrl: null, spaWatcher: null,
    observer: null, observerActive: false, isDrawing: false, debounceTimer: null,
    currentRequestTracker: null, sizeRequestTracker: null,

    init: function() {
        injectStyles();
        this.gmSupported = (typeof GM_download !== 'undefined');
        this.lastUrl = window.location.href;
        this.sizeRequestTracker = { current: null };
        this.checkAlbumChange();
        this.addAlbumButton();
        this.initClickListener();
        this.initSpaNavigationWatcher();
    },

    isViewerOpen: function() {
        return /^https:\/\/(www\.)?vk\.com\/photo/i.test(window.location.href);
    },

    getStorageKey: function() { return `sf_pick_${this.lastAlbumId}`; },

    savePickedState: function() {
        if (this.mode === 'pick' && this.lastAlbumId) {
            try { localStorage.setItem(this.getStorageKey(), JSON.stringify(this.pickedPhotos)); } catch(e) {}
        }
    },

    loadPickedState: function() {
        if (this.mode === 'pick' && this.lastAlbumId) {
            try {
                const data = localStorage.getItem(this.getStorageKey());
                if (data) {
                    this.pickedPhotos = JSON.parse(data);
                    this.totalPickSize = this.pickedPhotos.reduce((acc, p) => acc + (p.size || 0), 0);
                    this.updateLabels();
                    this.drawBadges();
                    this.toggleDownloadBtn();
                }
            } catch(e) {}
        }
    },

    clearStorage: function() {
        if (this.lastAlbumId) {
            try { localStorage.removeItem(`sf_pick_${this.lastAlbumId}`); } catch(e) {}
        }
    },

    debounceBadgeRedraw: function(fn, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(fn, wait);
    },

    checkSPAChange: function() {
        if (window.location.href !== this.lastUrl) {
            this.lastUrl = window.location.href;
            this.checkAlbumChange();
            this.addAlbumButton();
        }
    },

    initSpaNavigationWatcher: function() {
        this.spaWatcher = setInterval(() => { this.checkSPAChange(); }, VK_API.SPA_CHECK_INTERVAL);
        if (!window._sfPopstateAttached) {
            window._sfPopstateAttached = true;
            window.addEventListener('popstate', () => { this.checkSPAChange(); });
        }
    },

    initObserver: function() {
        if (this.observer) return;
        this.observer = new MutationObserver(() => {
            this.debounceBadgeRedraw(() => {
                if (this.startId || this.endId || this.pickedPhotos.length > 0 || this.selectionMode) {
                    this.drawBadges();
                }
            }, VK_API.DEBOUNCE_DELAY);
        });
    },

    startObserver: function() {
        if (this.observerActive) return;
        if (!this.observer) this.initObserver();
        try {
            this.observer.observe(document.body, { childList: true, subtree: true });
            this.observerActive = true;
        } catch (e) { console.warn('[VK Photo] Observer start failed:', e); }
    },

    stopObserver: function() {
        if (!this.observerActive) return;
        try { this.observer.disconnect(); this.observerActive = false; } catch (e) {}
    },

    syncPanelVisibility: function() {
        // Панель больше не скрывается.
        // Она всегда висит на месте, чтобы был виден процесс сканирования/скачивания.
        // Блокировка кнопок реализована напрямую в initPanelEvents через isViewerOpen().
    },

    drawBadges: function() {
        if (this.isDrawing) return;
        this.isDrawing = true;
        try {
            const containers = document.querySelectorAll(VK_SELECTORS.PHOTO_ROWS);
            const links = containers.length
                ? Array.from(containers).reduce((acc, c) => acc.concat(Array.from(c.querySelectorAll(VK_SELECTORS.PHOTO_LINK))), [])
                : document.querySelectorAll(VK_SELECTORS.PHOTO_LINK);

            links.forEach(link => {
                if (link.closest('#sf-dl-panel')) return;
                if (!link.href.match(/photo-?\d+_\d+/)) return;

                const match = (link.getAttribute('onclick') || '').match(/showPhoto\([' "](-?\d+_\d+)[' "]/)
                           || link.href.match(/photo(-?\d+_\d+)/);
                if (!match || !match[1]) return;

                const photoId = match[1];
                const cleanId = String(getCleanId(photoId));
                const isStart = this.startId && String(getCleanId(this.startId)) === cleanId;
                const isEnd = this.endId && String(getCleanId(this.endId)) === cleanId;
                const isPicked = this.mode === 'pick' && this.pickedPhotos.some(p => String(getCleanId(p.id)) === cleanId);
                const isPending = this.mode === 'pick' && !!this.pendingRequests[photoId];

                const needBadge = (this.mode === 'range' && (isStart || isEnd))
                               || (this.mode === 'pick' && (isPicked || isPending));
                const existing = link.querySelector('.sf-badge-marker');

                if (needBadge) {
                    if (existing) existing.remove();
                    let symbol = '▶';
                    if (this.mode === 'range') {
                        if (isStart && isEnd) symbol = '◆';
                        else if (isEnd) symbol = '◀';
                    } else {
                        symbol = isPending ? '…' : '✓';
                    }
                    if (getComputedStyle(link).position === 'static') link.style.position = 'relative';
                    const badge = document.createElement('div');
                    badge.className = 'sf-badge-marker';
                    badge.textContent = symbol;
                    link.appendChild(badge);
                } else {
                    if (existing) existing.remove();
                }
            });
        } catch (e) { console.error(e); }
        finally { this.isDrawing = false; }
    },

    checkAlbumChange: function() {
        const currentAlbumId = this.getAlbumIdFromUrl();
        if (currentAlbumId !== this.lastAlbumId) {
            this.clearStorage();
            this.resetState(true);
            this.lastAlbumId = currentAlbumId;
            if (currentAlbumId) this.loadPickedState();
        }
    },

    getAlbumIdFromUrl: function() {
        const m = window.location.href.match(/album(-?\d+_\d+)/);
        return m ? m[1] : null;
    },

    getListParam: function() {
        const m = window.location.href.match(/album(-?\d+_\d+)/);
        if (m) return 'album' + m[1];
        const zMatch = window.location.href.match(/photo[^/]*\/(album-?\d+_\d+)/);
        if (zMatch) return zMatch[1];
        const backLink = document.querySelector('a[href*="album"]');
        if (backLink && backLink.href) {
            const bm = backLink.href.match(/album(-?\d+_\d+)/);
            if (bm) return 'album' + bm[1];
        }
        return null;
    },

    resetState: function(clearPrefix) {
        this.abortFlag = true;
        if (this.currentRequestTracker && this.currentRequestTracker.xhr) { try { this.currentRequestTracker.xhr.abort(); } catch(e) {} }
        if (this.sizeRequestTracker && this.sizeRequestTracker.current) { if (this.sizeRequestTracker.current.onabort) this.sizeRequestTracker.current.onabort(); }
        for (const id in this.pendingRequests) { if (this.pendingRequests[id]) { try { this.pendingRequests[id].abort(); } catch(e) {} } }
        this.pendingRequests = {};
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.startReal = null; this.endReal = null;
        this.startVisual = null; this.endVisual = null;
        this.startId = null; this.endId = null; this.totalPhotos = null;
        this.pickedPhotos = []; this.totalPickSize = 0;
        this.cachedPhotos = []; this.totalBytesRange = 0;
        this.isPicking = false; this.isScanning = false; this.isDownloading = false;
        this.selectionMode = null; this.isDrawing = false;
        this.isFetchingMeta = false;
        document.body.classList.remove('sf-selecting-mode');

        if (!this.uiPanel) return;
        if (clearPrefix) { const input = document.getElementById('sf-prefix'); if (input) input.value = ''; }
        this.updateLabels();
        this.setProgress(0);
        this.updateStatus('Готов', 'blue');
        this.updateToggleUI(this.mode === 'range');
        this.toggleDownloadBtn();
        this.drawBadges();
        const sizeHeader = document.getElementById('sf-size-header'); if (sizeHeader) sizeHeader.textContent = 'РАЗМЕР (МБ)';
        const sizeEl = document.getElementById('sf-size'); if (sizeEl) sizeEl.textContent = '--';
    },

    createPanel: function() {
        if (document.getElementById('sf-dl-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'sf-dl-panel';
        panel.innerHTML = `<div id="sf-header" class="sf-header"><span class="sf-header-title">VK Photo Downloader v${SCRIPT_VERSION}</span><button id="sf-close-btn" class="sf-close-btn" aria-label="Закрыть панель">×</button></div><div class="sf-body"><div class="sf-toggle-container"><label id="lbl-range" class="sf-toggle-label active-blue" tabindex="0" role="button">ИНТЕРВАЛ</label><label id="lbl-pick" class="sf-toggle-label" tabindex="0" role="button">ВЫБОРОЧНО</label></div><table class="sf-data-table" role="presentation"><thead><tr><th>НАЧАЛО</th><th>КОНЕЦ</th><th>ВСЕГО</th><th id="sf-size-header">РАЗМЕР (МБ)</th></tr></thead><tbody><tr><td><span id="sf-start-off">#--</span></td><td><span id="sf-end-off">#--</span></td><td><span id="sf-count">0</span></td><td><span id="sf-size">--</span></td></tr></tbody></table><div class="sf-buttons-row"><button id="sf-btn-a" class="flat_button sf-action-btn">Начало</button><button id="sf-btn-b" class="flat_button sf-action-btn">Конец</button></div><div class="sf-prefix-row"><input type="text" id="sf-prefix" class="sf-input-prefix" placeholder="Префикс_VK_001.jpg" aria-label="Префикс имени файла"><button id="sf-clear-prefix" class="sf-clear-btn" aria-label="Очистить префикс">×</button></div><div id="sf-status-block" class="sf-status-block" role="status" aria-live="polite"><div id="sf-status-progress-bg" class="sf-status-progress-bg sf-progress-hidden"></div><div id="sf-status-text" class="sf-status-text">Готов</div></div><div class="sf-footer-row"><button id="sf-btn-run" class="flat_button button_primary sf-run-btn" disabled>СКАЧАТЬ</button></div></div>`;
        document.body.appendChild(panel);
        this.uiPanel = panel;
        this.initPanelEvents();
        this.initDragDrop();
        if (!this.gmSupported) { this.updateStatus('Ошибка: нет GM_download', 'red'); document.getElementById('sf-btn-run').disabled = true; }
    },

    initPanelEvents: function() {
        document.getElementById('sf-close-btn').onclick = () => { this.hidePanel(); };
        document.getElementById('sf-clear-prefix').onclick = () => { document.getElementById('sf-prefix').value = ''; };

        // Защита кнопок от нажатия при скачивании ИЛИ при открытом просмотрщике
        document.getElementById('sf-btn-a').onclick = () => { if(this.isDownloading || this.isViewerOpen()) return; if (this.mode === 'range') this.setMode('start'); else this.togglePicking(); };
        document.getElementById('sf-btn-b').onclick = () => { if(this.isDownloading || this.isViewerOpen()) return; if (this.mode === 'range') this.setMode('end'); else this.stopPicking(); };
        document.getElementById('sf-btn-run').onclick = () => { if(this.isDownloading || this.isViewerOpen()) return; this.runDownload(); };

        const toggleHandler = () => { if(this.isDownloading || this.isViewerOpen()) return; this.switchMode(this.mode === 'range' ? 'pick' : 'range'); };
        const lblRange = document.getElementById('lbl-range');
        const lblPick = document.getElementById('lbl-pick');
        lblRange.onclick = toggleHandler;
        lblRange.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHandler(); } };
        lblPick.onclick = toggleHandler;
        lblPick.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHandler(); } };
    },

    updateToggleUI: function(isRange) {
        const lblRange = document.getElementById('lbl-range');
        const lblPick = document.getElementById('lbl-pick');
        const btnA = document.getElementById('sf-btn-a');
        const btnB = document.getElementById('sf-btn-b');
        if (!btnA || !btnB) return;

        lblRange.className = 'sf-toggle-label';
        lblPick.className = 'sf-toggle-label';

        if (isRange) {
            lblRange.classList.add('active-blue');
            btnA.textContent = 'Начало'; btnB.textContent = 'Конец';
            btnA.disabled = false; btnB.disabled = false;
        } else {
            lblPick.classList.add('active-yellow');
            btnA.textContent = 'Подбор'; btnB.textContent = 'Готово';
            btnA.disabled = false; btnB.disabled = false;
        }
    },

    switchMode: function(newMode) {
        if (this.mode === 'pick') {
            this.clearStorage();
            this.pickedPhotos = [];
            this.totalPickSize = 0;
        } else {
            this.cachedPhotos = [];
            this.totalBytesRange = 0;
        }
        this.mode = newMode;
        this.resetState(false);
        if (this.mode === 'pick') {
            this.loadPickedState();
            this.updateStatus('Нажмите «Подбор»', 'blue');
        }
        this.updateLabels();
    },

    setRunButtonDisabled: function(disabled) { const btn = document.getElementById('sf-btn-run'); if (btn) btn.disabled = disabled; },

    toggleDownloadBtn: function(forceEnable) {
        const btn = document.getElementById('sf-btn-run'); if (!btn) return;
        const isValid = forceEnable || (this.mode === 'range' && this.cachedPhotos.length > 0) || (this.mode === 'pick' && !this.isPicking && this.pickedPhotos.length > 0);
        btn.disabled = !isValid;
    },

    setProgress: function(percent) {
        const bar = document.getElementById('sf-status-progress-bg'); if (!bar) return;
        if (percent <= 0) { bar.classList.add('sf-progress-hidden'); setTimeout(() => { if (bar.classList.contains('sf-progress-hidden')) bar.style.width = '0%'; }, VK_API.PROGRESS_FADE_DELAY); }
        else { bar.classList.remove('sf-progress-hidden'); bar.style.width = percent + '%'; }
    },

    updateStatus: function(text, color) { const el = document.getElementById('sf-status-text'); if (!el) return; el.textContent = text; el.className = 'sf-status-text'; if (color) el.classList.add(color); },

    updateLabels: function() {
        const startEl = document.getElementById('sf-start-off'); const endEl = document.getElementById('sf-end-off');
        const countEl = document.getElementById('sf-count'); const sizeEl = document.getElementById('sf-size');
        const sizeHeader = document.getElementById('sf-size-header'); if (!startEl || !endEl || !countEl || !sizeEl) return;

        startEl.textContent = this.startReal !== null ? `#${this.startReal}` : '#--';
        endEl.textContent = this.endReal !== null ? `#${this.endReal}` : '#--';

        let countText = '0';
        if (this.mode === 'range') { if (this.startReal !== null && this.endReal !== null) countText = Math.abs(this.endReal - this.startReal) + 1; }
        else { countText = this.pickedPhotos.length; }
        countEl.textContent = countText;

        const totalBytes = this.mode === 'range' ? this.totalBytesRange : this.totalPickSize;
        if (totalBytes > 0) {
            const mb = totalBytes / (1024 * 1024);
            if (mb >= 1024) { sizeEl.textContent = (mb / 1024).toFixed(2); if (sizeHeader) sizeHeader.textContent = 'РАЗМЕР (ГБ)'; }
            else { sizeEl.textContent = mb.toFixed(2); if (sizeHeader) sizeHeader.textContent = 'РАЗМЕР (МБ)'; }
        } else { sizeEl.textContent = '--'; if (sizeHeader) sizeHeader.textContent = 'РАЗМЕР (МБ)'; }
    },

    showPanel: function() { if (!this.uiPanel) this.createPanel(); this.uiPanel.style.display = 'block'; this.updateToggleUI(this.mode === 'range'); this.updateStatus('Готов', 'blue'); this.toggleDownloadBtn(); this.drawBadges(); this.startObserver(); },

    hidePanel: function() {
        this.clearStorage();
        this.resetState(false);
        if (this.uiPanel) this.uiPanel.style.display = 'none';
        this.stopObserver();
        if (this.spaWatcher) { clearInterval(this.spaWatcher); this.spaWatcher = null; }
    },

    initDragDrop: function() {
        const header = document.getElementById('sf-header'); const panel = this.uiPanel;
        header.addEventListener('mousedown', (e) => {
            let dragging = true; const offX = e.clientX - panel.offsetLeft; const offY = e.clientY - panel.offsetTop;
            panel.style.opacity = '0.8';
            const onMove = (e) => { if (!dragging) return; panel.style.left = (e.clientX - offX) + 'px'; panel.style.top = (e.clientY - offY) + 'px'; };
            const onUp = () => { dragging = false; panel.style.opacity = '1'; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });
    },

    addAlbumButton: function() { document.querySelectorAll('.photos_album_intro_info').forEach(h => { if (!h.querySelector('.sf-open-panel-btn')) { const btn = document.createElement('a'); btn.href = '#'; btn.className = 'sf-open-panel-btn'; btn.textContent = 'Менеджер фото'; btn.style.cssText = 'margin-left:10px; color:#2a5885; font-weight:bold; cursor:pointer;'; btn.onclick = (e) => { e.preventDefault(); this.showPanel(); }; h.appendChild(btn); } }); },

    initClickListener: function() {
        if (window.sfListenerAttached) return;
        window.sfListenerAttached = true;
        document.addEventListener('click', (e) => {
            if (e.target.closest('#sf-dl-panel')) return;
            if (VKPhotoModule.isViewerOpen()) return;

            const isRangeMode = VKPhotoModule.mode === 'range' && VKPhotoModule.selectionMode;
            const isPickMode = VKPhotoModule.mode === 'pick' && VKPhotoModule.isPicking;

            if (isRangeMode || isPickMode) {
                const link = e.target.closest('a'); let isPhoto = false;
                if (link && link.href.match(/photo-?\d+_\d+/)) { const match = (link.getAttribute('onclick') || '').match(/showPhoto\([' "](-?\d+_\d+)[' "]/) || link.href.match(/photo(-?\d+_\d+)/); if (match && match[1]) isPhoto = true; }
                if (isPhoto) {
                    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                    const match = (link.getAttribute('onclick') || '').match(/showPhoto\([' "](-?\d+_\d+)[' "]/) || link.href.match(/photo(-?\d+_\d+)/);
                    const listParam = VKPhotoModule.getListParam();
                    if (match[1] && listParam) VKPhotoModule.handlePhotoClick(match[1], listParam);
                } else { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); VKPhotoModule.updateStatus('Выберите фото', 'red'); }
            }
        }, true);
    },

    _getVisualIndexFromDOM: function(photoId) {
        const cleanId = String(getCleanId(photoId));
        const containers = document.querySelectorAll(VK_SELECTORS.PHOTO_ROWS);
        const allLinks = containers.length ? Array.from(containers).reduce((acc, c) => acc.concat(Array.from(c.querySelectorAll(VK_SELECTORS.PHOTO_LINK))), []) : Array.from(document.querySelectorAll(VK_SELECTORS.PHOTO_LINK));
        const photoLinks = allLinks.filter(link => { if (link.closest('#sf-dl-panel')) return false; return !!link.href.match(/photo-?\d+_\d+/); });
        const idx = photoLinks.findIndex(link => { const m = (link.getAttribute('onclick') || '').match(/showPhoto\([' "](-?\d+_\d+)[' "]/) || link.href.match(/photo(-?\d+_\d+)/); return m && String(getCleanId(m[1])) === cleanId; });
        return idx !== -1 ? idx + 1 : null;
    },

    _fetchTotal: function(listParam) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest(); xhr.open('POST', '/al_photos.php', true); xhr.timeout = VK_API.TOTAL_FETCH_TIMEOUT;
            xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { try { const json = parseVKResponse(xhr.responseText); const total = json?.payload?.[1]?.[1]; if (total && total > 0) resolve(total); else reject(new Error('no total')); } catch (e) { reject(e); } } else { reject(new Error('HTTP ' + xhr.status)); } };
            xhr.onerror = () => reject(new Error('network')); xhr.ontimeout = () => reject(new Error('timeout'));
            const fd = new FormData(); fd.append('act', 'show'); fd.append('al', '1'); fd.append('list', listParam); fd.append('offset', '0'); fd.append('count', '1'); xhr.send(fd);
        });
    },

    _applyRangeSelection: function(photoId, visualIndex, total, isReverse) {
        if (this.abortFlag) return;
        const numericId = getNumericId(photoId); const realIndex = this.calculateRealIndex(visualIndex, total, isReverse);
        this.cachedPhotos = []; this.totalBytesRange = 0;
        if (this.selectionMode === 'start') { this.startVisual = visualIndex; this.startReal = realIndex; this.startId = numericId; this.totalPhotos = total; this.updateStatus(`Начало: #${realIndex}`, 'green'); }
        else { this.endVisual = visualIndex; this.endReal = realIndex; this.endId = numericId; this.totalPhotos = total; this.updateStatus(`Конец: #${realIndex}`, 'green'); }
        this.selectionMode = null; this.isFetchingMeta = false;
        document.body.classList.remove('sf-selecting-mode');
        this.updateLabels(); this.drawBadges();
        if (this.startReal !== null && this.endReal !== null) { this.startAutoCalculation(); }
    },

    setMode: function(type) {
        if (this.isScanning || this.selectionMode) { this.resetState(false); }
        this.abortFlag = false; this.selectionMode = type;
        // При выборе второй границы не сбрасываем первую
        if (type === 'start' && this.endId !== null) {
            // Конец уже выбран, начало меняем - конец сохраняем
        } else if (type === 'end' && this.startId !== null) {
            // Начало уже выбрано, конец меняем - начало сохраняем
        }
        document.body.classList.add('sf-selecting-mode');
        this.updateStatus(`Выбор: ${type === 'start' ? 'Начало' : 'Конец'}`, 'blue');
        const btnA = document.getElementById('sf-btn-a'); const btnB = document.getElementById('sf-btn-b');
        if (type === 'start' && btnA) btnA.classList.add('active'); if (type === 'end' && btnB) btnB.classList.add('active');
    },

    handlePhotoClick: function(photoId, listParam) {
        if (this.mode === 'range' && this.selectionMode) {
            if (this.isFetchingMeta) return; this.updateStatus('Анализ...', 'blue'); this.isFetchingMeta = true;
            const visualIndex = this._getVisualIndexFromDOM(photoId);
            if (visualIndex === null) { this.updateStatus('Ошибка: фото не в DOM', 'red'); this.isFetchingMeta = false; return; }
            const isReverse = window.location.href.includes('rev=1');
            if (this.totalPhotos !== null) { this._applyRangeSelection(photoId, visualIndex, this.totalPhotos, isReverse); return; }
            this._fetchTotal(listParam).then(total => { if (this.abortFlag) return; this._applyRangeSelection(photoId, visualIndex, total, isReverse); }).catch(e => { this.updateStatus('Ошибка: ' + e.message, 'red'); this.isFetchingMeta = false; });
        } else if (this.mode === 'pick' && this.isPicking) { this.handlePickClick(photoId, listParam); }
    },

    startAutoCalculation: function() {
        this.isScanning = true;
        this.setRunButtonDisabled(true);
        this.updateStatus('Получение ссылок...', 'blue');
        this.currentRequestTracker = { xhr: null };
        const minReal = Math.min(this.startReal, this.endReal); const maxReal = Math.max(this.startReal, this.endReal);
        const count = maxReal - minReal + 1; const offset = minReal - 1;
        getPhotosByOffset(this.getListParam(), offset, count, (cur, total, bytes) => { this.totalBytesRange = bytes; this.updateStatus(`Скан: ${cur}/${total}`, 'blue'); this.updateLabels(); this.setProgress(cur / total * 100); }, () => this.abortFlag, (msg, color) => this.updateStatus(msg, color), this.currentRequestTracker, this.sizeRequestTracker)
        .then((result) => { if (this.abortFlag) return; result.photos.sort((a, b) => a.numericId - b.numericId); this.cachedPhotos = result.photos; this.totalBytesRange = result.totalBytes; this.updateLabels(); this.setProgress(0); const countVal = Math.abs(this.endReal - this.startReal) + 1; if (this.cachedPhotos.length === countVal) this.updateStatus(`✓ Готово: ${countVal}`, 'green'); else this.updateStatus(`Внимание: ${this.cachedPhotos.length}/${countVal}`, 'orange'); this.isScanning = false; this.toggleDownloadBtn(true); })
        .catch((e) => { if (e.message !== 'Aborted') this.updateStatus('Ошибка: ' + e.message, 'red'); this.isScanning = false; this.setProgress(0); });
    },

    // PICK MODE
    togglePicking: function() { if (this.isScanning || this.isDownloading) return; this.abortFlag = false; this.isPicking = true; document.body.classList.add('sf-selecting-mode'); this.updateStatus('Подбор... (кликните фото)', 'blue'); const btnA = document.getElementById('sf-btn-a'); const btnB = document.getElementById('sf-btn-b'); if (btnA) btnA.disabled = true; if (btnB) btnB.disabled = false; },
    stopPicking: function() { this.isPicking = false; document.body.classList.remove('sf-selecting-mode'); this.updateStatus('Готов', 'green'); const btnA = document.getElementById('sf-btn-a'); const btnB = document.getElementById('sf-btn-b'); if (btnA) btnA.disabled = false; if (btnB) btnB.disabled = true; this.toggleDownloadBtn(); },

    handlePickClick: function(photoId, listParam) {
        const cleanId = String(getCleanId(photoId)); if (this.pendingRequests[photoId]) return;
        const existIndex = this.pickedPhotos.findIndex(p => String(getCleanId(p.id)) === cleanId);
        if (existIndex !== -1) { const removed = this.pickedPhotos.splice(existIndex, 1)[0]; this.totalPickSize -= removed.size; this.savePickedState(); this.updateLabels(); this.updateStatus('Удалено', 'green'); this.drawBadges(); return; }
        this.updateStatus('Запрос...', 'blue'); const xhr = new XMLHttpRequest(); xhr.open('POST', '/al_photos.php', true); this.pendingRequests[photoId] = xhr;
        xhr.onload = () => { delete this.pendingRequests[photoId]; if (this.abortFlag) return; if (xhr.status >= 200 && xhr.status < 300) { try { const json = parseVKResponse(xhr.responseText); if (json.payload && json.payload[1] && json.payload[1][3]) { const photoObj = json.payload[1][3].find(p => String(getCleanId(p.id)) === cleanId); if (photoObj) { const max = getMaxPhotoSize(photoObj); if (max && max.url) { const abortSignal = { onabort: null }; this.sizeRequestTracker.current = abortSignal; getSingleFileSize(max.url, abortSignal).then((size) => { if (this.abortFlag) return; if (size === 0) { this.updateStatus('Ошибка: размер', 'red'); this.drawBadges(); return; } this.pickedPhotos.push({ id: photoId, numericId: parseInt(cleanId), url: max.url, size }); this.totalPickSize += size; this.savePickedState(); this.updateLabels(); this.updateStatus('Добавлено', 'green'); this.toggleDownloadBtn(); this.drawBadges(); }); return; } } } } catch (e) { console.error(e); } } this.updateStatus('Ошибка данных', 'red'); this.drawBadges(); };
        xhr.onerror = () => { delete this.pendingRequests[photoId]; this.updateStatus('Ошибка сети', 'red'); this.drawBadges(); };
        const formData = new FormData(); formData.append('act', 'show'); formData.append('al', '1'); formData.append('photo', photoId); formData.append('list', listParam); formData.append('offset', '0'); xhr.send(formData);
    },

    // DOWNLOAD
    runDownload: function() {
        if (this.isDownloading) return; let photos = [];
        if (this.mode === 'range') { if (!this.cachedPhotos.length) return; photos = this.cachedPhotos; }
        else { if (!this.pickedPhotos.length) return; photos = this.pickedPhotos.slice().sort((a, b) => a.numericId - b.numericId); }
        this.isDownloading = true; const btnA = document.getElementById('sf-btn-a'); const btnB = document.getElementById('sf-btn-b'); if (btnA) btnA.disabled = true; if (btnB) btnB.disabled = true; this.setRunButtonDisabled(true);
        const prefix = document.getElementById('sf-prefix').value.trim(); const width = String(photos.length).length;
        const links = photos.map((p, i) => ({ url: p.url, filename: (prefix ? `${prefix}_VK_` : 'VK_') + String(i + 1).padStart(width, '0') + '.jpg' }));
        this.startDownloadQueue(links);
    },

    startDownloadQueue: async function(links) {
        this.updateStatus('Загрузка...', 'blue'); const useFallback = typeof GM_download === 'undefined';
        if (useFallback && links.length > VK_API.FALLBACK_TAB_THRESHOLD) { if (!confirm(`Внимание! Будет открыто ${links.length} новых вкладок. Продолжить?`)) { this._finishDownload('Отменено', 'red'); return; } }
        for (let i = 0; i < links.length; i++) {
            if (this.abortFlag) { this._finishDownload('Прервано', 'red'); return; }
            this.updateStatus(`Файл ${i + 1}/${links.length}`, 'blue'); this.setProgress((i + 1) / links.length * 100);
            if (!useFallback) { try { GM_download({ url: links[i].url, name: links[i].filename, saveAs: false }); } catch (e) { console.error(e); } } else { window.open(links[i].url); }
            await delay(VK_API.DOWNLOAD_DELAY);
        }
        this._finishDownload('✓ Готово!', 'green');
    },

    _finishDownload: function(statusText, color) { this.updateStatus(statusText, color); this.isDownloading = false; this.setProgress(0); this.updateToggleUI(this.mode === 'range'); },

    calculateRealIndex: function(visualIndex, total, isReverse) { return isReverse ? (total - visualIndex + 1) : visualIndex; }
};
VKPhotoModule.init();
})();
