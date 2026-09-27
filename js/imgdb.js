/**
 * imgdb.js - 图片素材库（角色头像/表情/结局图标/故事图标）
 * 《无心之举 / Unintended Reply》
 *
 * 设计约定：
 *   - 图片以压缩后的 dataURL 存入 IndexedDB（库 ur-img-db），引用格式：'ur-img:<assetId>'
 *   - 任何「图标字段」（角色 icon / 表情 / endingIcon / storyIcon）都兼容两种取值：
 *       1) Emoji 字符串（如 '😊'）
 *       2) 图片引用 'ur-img:<assetId>'
 *   - IMGDB.resolveIcon(icon) 统一解析：emoji → null（直接显示文本）；图片引用 → dataURL
 *
 * 主要 API：
 *   IMGDB.isImgRef(str)                — 是否为图片引用
 *   IMGDB.uploadImageFile(file, name)  — 上传文件：压缩 → 存储 → { id, dataURL }
 *   IMGDB.saveImage(dataURL, name)     — 直接存储 → id
 *   IMGDB.putImage(id, dataURL, name)  — 以固定 id 存储（导入恢复用）
 *   IMGDB.getImage(id)                 — 取 dataURL（带内存缓存）
 *   IMGDB.deleteImage(id)              — 删除
 *   IMGDB.resolveIcon(icon)            — 图标引用 → {type:'img', dataURL} | {type:'emoji', emoji} | {type:'none'}
 *   IMGDB.renderIconHTML(icon, size)   — 图标 → 同步 HTML（图片异步填充 src）
 *   IMGDB.collectRefsInDesign(design)  — 收集设计 JSON 中所有图片引用 id
 */

const IMGDB = (function() {
    'use strict';

    const DB_NAME = 'ur-img-db';
    const STORE_NAME = 'imgs';
    const PREFIX = 'ur-img:';
    const MAX_DIM = 256; // 头像/表情显示尺寸很小，压缩到 256px 足够 2x 屏幕清晰

    // ── 内存缓存（避免高频读 DB） ──
    const _cache = new Map(); // id → dataURL

    function openDB() {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    function genId() {
        return 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    function isImgRef(str) {
        return typeof str === 'string' && str.indexOf(PREFIX) === 0 && str.length > PREFIX.length;
    }

    function idFromRef(str) {
        return isImgRef(str) ? str.slice(PREFIX.length) : null;
    }

    /** 以固定 id 存储（存在则覆盖） */
    async function putImage(id, dataURL, name) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put({ id, dataURL, name: name || '', createdAt: Date.now() });
            tx.oncomplete = () => { _cache.set(id, dataURL); resolve(id); };
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    /** 存储并生成新 id */
    async function saveImage(dataURL, name) {
        const id = genId();
        await putImage(id, dataURL, name);
        return id;
    }

    async function getImage(id) {
        if (!id) return null;
        if (_cache.has(id)) return _cache.get(id);
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(id);
            req.onsuccess = () => {
                const url = req.result ? req.result.dataURL : null;
                if (url) _cache.set(id, url);
                resolve(url);
            };
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function deleteImage(id) {
        _cache.delete(id);
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * 压缩图片文件 → dataURL（canvas 重绘，最长边 MAX_DIM，保持透明用 PNG）
     * @param {File|Blob} file
     * @returns {Promise<string>} dataURL
     */
    function compressFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        let w = img.width, h = img.height;
                        if (Math.max(w, h) > MAX_DIM) {
                            const r = MAX_DIM / Math.max(w, h);
                            w = Math.round(w * r); h = Math.round(h * r);
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/png'));
                    } catch (err) { reject(err); }
                };
                img.onerror = () => reject(new Error('image load failed'));
                img.src = ev.target.result;
            };
            reader.onerror = () => reject(new Error('file read failed'));
            reader.readAsDataURL(file);
        });
    }

    /** 上传文件：压缩 → 存储 → { id, dataURL } */
    async function uploadImageFile(file, name) {
        const dataURL = await compressFile(file);
        const id = await saveImage(dataURL, name || (file && file.name) || '');
        return { id, dataURL };
    }

    /**
     * 解析图标字段。
     * @returns {Promise<{type:'img',dataURL:string}|{type:'emoji',emoji:string}|{type:'none'}>}
     */
    async function resolveIcon(icon) {
        if (isImgRef(icon)) {
            const url = await getImage(idFromRef(icon));
            return url ? { type: 'img', dataURL: url } : { type: 'none' };
        }
        if (icon) return { type: 'emoji', emoji: icon };
        return { type: 'none' };
    }

    /**
     * 图标 → HTML（同步）。图片引用先渲染 emoji 占位/空壳，dataURL 就绪后替换为 <img>。
     * @param {string} icon emoji 或 'ur-img:id'（可空）
     * @param {number} size 显示尺寸 px（默认 24；emoji 时作为字号）
     * @param {number} radius 图片圆角 px（默认 6；传 9999 为圆形）
     * @returns {string} HTML 片段
     */
    function renderIconHTML(icon, size, radius) {
        const px = size || 24;
        const rad = (radius === undefined) ? 6 : radius;
        if (isImgRef(icon)) {
            const id = idFromRef(icon);
            const cached = _cache.get(id);
            const imgTag = (src) => `<img src="${src}" style="width:${px}px;height:${px}px;object-fit:cover;border-radius:${rad >= 9999 ? '50%' : rad + 'px'};display:block;vertical-align:middle;">`;
            const spanId = 'ur-img-' + id + '-' + Math.random().toString(36).slice(2, 6);
            const shell = `<span class="ur-img-slot" id="${spanId}" style="display:inline-block;width:${px}px;height:${px}px;vertical-align:middle;">🖼️</span>`;
            // 异步填充（缓存命中时直接内联）
            if (cached) return imgTag(cached);
            setTimeout(() => {
                getImage(id).then(url => {
                    const el = document.getElementById(spanId);
                    if (el && url) el.outerHTML = imgTag(url);
                }).catch(() => {});
            }, 0);
            return shell;
        }
        const esc = String(icon || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
        return `<span style="font-size:${px}px;line-height:1;display:inline-block;vertical-align:middle;">${esc || '👤'}</span>`;
    }

    /**
     * 收集设计 JSON 中引用的全部图片 id（导出用）
     * @param {object} design 设计 JSON（v3 紧凑或内存完整格式）
     * @returns {string[]} 去重后的 id 列表
     */
    function collectRefsInDesign(design) {
        const ids = [];
        const push = (v) => { if (isImgRef(v)) { const id = idFromRef(v); if (ids.indexOf(id) < 0) ids.push(id); } };
        if (!design || typeof design !== 'object') return ids;
        push(design.storyIcon);
        Object.values(design.characters || {}).forEach(c => {
            if (!c || typeof c !== 'object') return;
            push(c.icon);
            Object.values(c.expressions || {}).forEach(push);
        });
        (design.nodes || []).forEach(n => {
            if (n && n.data && n.data.endingIcon) push(n.data.endingIcon);
        });
        (design.functions || {}).forEach ? null : null; // 函数子图内无图标字段
        return ids;
    }

    return {
        PREFIX,
        isImgRef,
        idFromRef,
        saveImage,
        putImage,
        getImage,
        deleteImage,
        compressFile,
        uploadImageFile,
        resolveIcon,
        renderIconHTML,
        collectRefsInDesign
    };
})();

window.IMGDB = IMGDB;
