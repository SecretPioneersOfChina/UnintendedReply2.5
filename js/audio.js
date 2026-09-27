/**
 * audio.js - 音频引擎模块
 * 《无心之举 / Unintended Reply》
 *
 * 职责：
 *   1. 管理 BGM（全局/章节背景音乐）和 SFX（对话触发音效）的播放
 *   2. 通过 IndexedDB 持久化存储用户上传的音频文件（绕过 localStorage 5MB 限制）
 *   3. 提供音量控制、循环开关、淡入淡出等能力
 *
 * 使用方式：
 *   AUDIO.init()                        — 初始化（DOMContentLoaded 后调用）
 *   AUDIO.playStoryBGM(storyCard)       — 播放内置故事的全局 BGM
 *   AUDIO.playCustomBGM(musicRef)       — 播放自定义故事的全局 BGM
 *   AUDIO.playChapterBGM(musicRef)      — 播放章节 BGM（覆盖全局）
 *   AUDIO.playMessageSfx(musicRef)      — 播放对话触发的音效
 *   AUDIO.stopBGM() / AUDIO.stopSfx()   — 停止播放
 *   AUDIO.stopAll()                     — 停止所有
 *   AUDIO.setBgmVolume(v)               — 设置 BGM 音量 (0-1)
 *   AUDIO.setSfxVolume(v)               — 设置 SFX 音量 (0-1)
 *   AUDIO.saveAudio(file)               — 上传音频文件到 IndexedDB，返回引用
 *   AUDIO.getAudioUrl(audioId)          — 从 IndexedDB 获取音频 Blob URL
 *   AUDIO.deleteAudio(audioId)          — 从 IndexedDB 删除音频
 */

const AUDIO = (function() {
    'use strict';

    // ==================== IndexedDB 音频存储 ====================
    const DB_NAME = 'ur-audio-db';
    const STORE_NAME = 'audio';
    let _db = null;

    function openDB() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
            req.onerror = (e) => { console.error('[AUDIO] IndexedDB open failed:', e.target.error); reject(e.target.error); };
        });
    }

    /**
     * 保存音频 Blob 到 IndexedDB
     * @param {string} id - 唯一 ID
     * @param {Blob} blob - 音频文件 Blob
     * @returns {Promise<string>} audioId
     */
    async function saveAudioBlob(id, blob) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put({ id, blob, timestamp: Date.now() });
            tx.oncomplete = () => resolve(id);
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * 从 IndexedDB 获取音频 Blob，并创建临时 URL
     * @param {string} id - audioId
     * @returns {Promise<string|null>} Blob URL 或 null
     */
    async function getAudioUrl(id) {
        if (!id) return null;
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(id);
            req.onsuccess = () => {
                const result = req.result;
                if (result && result.blob) {
                    resolve(URL.createObjectURL(result.blob));
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * 从 IndexedDB 删除音频
     * @param {string} id
     */
    async function deleteAudioBlob(id) {
        if (!id) return;
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * 上传音频文件到 IndexedDB
     * @param {File} file - 用户选择的音频文件
     * @returns {Promise<{audioId, name, size}>} 音频引用对象
     */
    async function uploadAudio(file) {
        const audioId = 'audio_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        await saveAudioBlob(audioId, file);
        return { audioId, name: file.name, size: file.size };
    }

    // ==================== 音频播放器 ====================
    let _bgmAudio = null;     // BGM 播放器（全局/章节）
    let _sfxAudio = null;     // SFX 播放器（对话触发音效）
    let _currentBgmUrl = null; // 当前正在播放的 BGM URL（避免重复播放同一首）
    let _currentBgmRef = null; // 当前 BGM 引用描述（用于日志）
    let _bgmVolume = 0.5;
    let _sfxVolume = 0.8;
    let _muted = false;
    let _urlCache = {};        // audioId → blobUrl 缓存（避免重复创建）

    // 全局 BGM 引用（用于章节切换后恢复）
    let _globalBgmRef = null;

    // ==================== 浏览器音频解锁 ====================
    // 现代浏览器（Chrome/Safari/Firefox）要求用户交互后才能播放音频
    // 否则 Audio.play() 会抛出 NotAllowedError
    let _unlocked = false;
    let _pendingBGM = null;   // 待重试的 BGM 请求

    function _unlockAudio() {
        if (_unlocked) return;
        _unlocked = true;

        // 用一个短暂的静默播放来激活音频上下文
        const silent = new Audio();
        silent.volume = 0;
        try {
            const p = silent.play();
            if (p && p.then) {
                p.then(() => {
                    console.log('[AUDIO] 音频已解锁（用户交互）');
                    _retryPendingBGM();
                }).catch(() => {});
            } else {
                _retryPendingBGM();
            }
        } catch (e) {
            // 部分浏览器即使有用户交互也可能拒绝，尽力而为
        }
    }

    function _retryPendingBGM() {
        if (_pendingBGM) {
            const { ref, loop, label } = _pendingBGM;
            _pendingBGM = null;
            console.log('[AUDIO] 重试未完成的 BGM:', label || '');
            playBGM(ref, loop, label);
        }
    }

    function init() {
        _bgmAudio = new Audio();
        _sfxAudio = new Audio();
        _bgmAudio.loop = true; // BGM 默认循环

        // 从 localStorage 读取音量设置
        try {
            _bgmVolume = parseFloat(localStorage.getItem('ur-bgm-volume')) || 0.5;
            _sfxVolume = parseFloat(localStorage.getItem('ur-sfx-volume')) || 0.8;
            _muted = localStorage.getItem('ur-muted') === 'true';
        } catch (e) {}

        applyVolume();

        // 监听 BGM 结束事件（非循环模式下停止）
        _bgmAudio.addEventListener('ended', () => {
            if (!_bgmAudio.loop) {
                _currentBgmUrl = null;
            }
        });

        _sfxAudio.addEventListener('ended', () => {
            // SFX 播放结束，不做特殊处理
        });

        // ==================== 自动解锁 ====================
        // 在第一次用户交互（点击/触摸/按键）时解锁音频
        const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown'];
        function _onFirstInteraction() {
            _unlockAudio();
            unlockEvents.forEach(evt => {
                document.removeEventListener(evt, _onFirstInteraction, true);
            });
        }
        unlockEvents.forEach(evt => {
            document.addEventListener(evt, _onFirstInteraction, true);
        });

        console.log('[AUDIO] 初始化完成, BGM音量:', _bgmVolume, 'SFX音量:', _sfxVolume, '静音:', _muted);
    }

    function applyVolume() {
        if (_bgmAudio) _bgmAudio.volume = _muted ? 0 : _bgmVolume;
        if (_sfxAudio) _sfxAudio.volume = _muted ? 0 : _sfxVolume;
    }

    /**
     * 获取音频 URL（带缓存）
     * 支持：
     *   - audioId 引用（从 IndexedDB 获取 Blob URL）
     *   - 直接路径字符串（如 'music/UnintendedReply/global.wav'）
     *   - data URL（base64）
     * @param {object|string} ref - 音频引用 { audioId, path } 或直接路径字符串
     * @returns {Promise<string|null>}
     */
    async function resolveUrl(ref) {
        if (!ref) return null;

        // 直接是路径字符串
        if (typeof ref === 'string') return ref;

        // 对象形式
        if (typeof ref === 'object') {
            // data URL（base64）
            if (ref.dataUrl) return ref.dataUrl;
            // IndexedDB 引用
            if (ref.audioId) {
                if (_urlCache[ref.audioId]) return _urlCache[ref.audioId];
                const url = await getAudioUrl(ref.audioId);
                if (url) _urlCache[ref.audioId] = url;
                return url;
            }
            // 直接路径
            if (ref.path) return ref.path;
        }

        return null;
    }

    /**
     * 播放 BGM
     * @param {object|string} ref - 音频引用
     * @param {boolean} loop - 是否循环
     * @param {string} label - 描述标签（日志用）
     */
    async function playBGM(ref, loop, label) {
        // 浏览器尚未解锁 → 保存请求，等解锁后重试
        if (!_unlocked) {
            _pendingBGM = { ref, loop, label };
            console.log('[AUDIO] BGM 排队等待解锁:', label || '');
            return;
        }

        const url = await resolveUrl(ref);
        if (!url) {
            console.log('[AUDIO] 无 BGM 可播放', label || '');
            return;
        }

        // 如果已经在播放同一首，不重复播放
        if (_currentBgmUrl === url) {
            // 但可能需要更新循环设置
            _bgmAudio.loop = loop !== false;
            return;
        }

        _currentBgmUrl = url;
        _currentBgmRef = label || '';
        _bgmAudio.src = url;
        _bgmAudio.loop = loop !== false;
        _bgmAudio.volume = _muted ? 0 : _bgmVolume;

        try {
            await _bgmAudio.play();
            console.log('[AUDIO] ▶ BGM 播放:', label || url, 'loop:', loop !== false);
        } catch (e) {
            console.warn('[AUDIO] BGM 播放失败:', e.message);
        }
    }

    /**
     * 停止 BGM
     */
    function stopBGM() {
        if (_bgmAudio) {
            _bgmAudio.pause();
            _bgmAudio.currentTime = 0;
        }
        _currentBgmUrl = null;
        _currentBgmRef = null;
    }

    /**
     * 播放 SFX（对话触发的音效）
     * @param {object|string} ref - 音频引用
     * @param {boolean} loop - 是否循环
     */
    async function playSfx(ref, loop) {
        if (!_unlocked) return; // SFX 不排队，解锁前的直接丢弃

        const url = await resolveUrl(ref);
        if (!url) return;

        _sfxAudio.src = url;
        _sfxAudio.loop = loop === true;
        _sfxAudio.volume = _muted ? 0 : _sfxVolume;

        try {
            await _sfxAudio.play();
            console.log('[AUDIO] ▶ SFX 播放:', url, 'loop:', loop === true);
        } catch (e) {
            console.warn('[AUDIO] SFX 播放失败:', e.message);
        }
    }

    /**
     * 停止 SFX
     */
    function stopSfx() {
        if (_sfxAudio) {
            _sfxAudio.pause();
            _sfxAudio.currentTime = 0;
        }
    }

    /**
     * 停止所有音频
     */
    function stopAll() {
        stopBGM();
        stopSfx();
    }

    // ==================== 高级 API ====================

    /**
     * 播放内置故事的全局 BGM
     * @param {object} storyCard - 故事卡对象（含 musicFolder 字段）
     */
    function playStoryBGM(storyCard) {
        if (!storyCard || !storyCard.musicFolder) {
            console.log('[AUDIO] 故事无 BGM 文件夹:', storyCard ? storyCard.id : 'null');
            return;
        }
        _globalBgmRef = { path: `music/${storyCard.musicFolder}/global.wav` };
        playBGM(_globalBgmRef, true, `全局BGM: ${storyCard.musicFolder}/global.wav`);
    }

    /**
     * 播放自定义故事的全局 BGM
     * @param {object} musicRef - { audioId, name, loop }
     */
    function playCustomBGM(musicRef) {
        if (!musicRef) {
            stopBGM();
            return;
        }
        _globalBgmRef = { audioId: musicRef.audioId };
        playBGM({ audioId: musicRef.audioId }, musicRef.loop !== false, `自定义全局BGM: ${musicRef.name || ''}`);
    }

    /**
     * 播放章节 BGM（覆盖全局）
     * @param {object} musicRef - { audioId, name, loop }
     */
    async function playChapterBGM(musicRef) {
        if (!musicRef) {
            // 没有章节 BGM，恢复全局 BGM
            if (_globalBgmRef) {
                playBGM(_globalBgmRef, true, '恢复全局BGM');
            }
            return;
        }
        playBGM({ audioId: musicRef.audioId }, musicRef.loop !== false, `章节BGM: ${musicRef.name || ''}`);
    }

    /**
     * 播放对话/旁白触发的音效
     * @param {object} musicRef - { audioId, name, loop }
     */
    async function playMessageSfx(musicRef) {
        if (!musicRef) return;
        playSfx({ audioId: musicRef.audioId }, musicRef.loop === true);
    }

    // ==================== 音量控制 ====================

    function setBgmVolume(v) {
        _bgmVolume = Math.max(0, Math.min(1, v));
        if (_bgmAudio) _bgmAudio.volume = _muted ? 0 : _bgmVolume;
        try { localStorage.setItem('ur-bgm-volume', String(_bgmVolume)); } catch (e) {}
    }

    function setSfxVolume(v) {
        _sfxVolume = Math.max(0, Math.min(1, v));
        if (_sfxAudio) _sfxAudio.volume = _muted ? 0 : _sfxVolume;
        try { localStorage.setItem('ur-sfx-volume', String(_sfxVolume)); } catch (e) {}
    }

    function setMuted(m) {
        _muted = m;
        applyVolume();
        try { localStorage.setItem('ur-muted', String(_muted)); } catch (e) {}
    }

    function getBgmVolume() { return _bgmVolume; }
    function getSfxVolume() { return _sfxVolume; }
    function isMuted() { return _muted; }

    /**
     * 获取当前 BGM 状态（用于 UI 显示）
     */
    function getBgmStatus() {
        return {
            playing: _currentBgmUrl !== null,
            label: _currentBgmRef || '',
            loop: _bgmAudio ? _bgmAudio.loop : true
        };
    }

    // ==================== 清理 ====================

    /**
     * 清理所有缓存的 Blob URL（防止内存泄漏）
     * 注意：当前正在播放的 URL 不清理
     */
    function cleanupUrls() {
        const currentUrl = _currentBgmUrl;
        Object.keys(_urlCache).forEach(key => {
            if (_urlCache[key] !== currentUrl) {
                URL.revokeObjectURL(_urlCache[key]);
                delete _urlCache[key];
            }
        });
    }

    // ==================== 公共 API ====================
    return {
        init,
        // 播放控制
        playBGM,
        stopBGM,
        playSfx,
        stopSfx,
        stopAll,
        // 高级 API
        playStoryBGM,
        playCustomBGM,
        playChapterBGM,
        playMessageSfx,
        // 音量控制
        setBgmVolume,
        setSfxVolume,
        setMuted,
        getBgmVolume,
        getSfxVolume,
        isMuted,
        getBgmStatus,
        // IndexedDB 存储
        uploadAudio,
        getAudioUrl,
        deleteAudio: deleteAudioBlob,
        // 工具
        resolveUrl,
        cleanupUrls
    };
})();

window.AUDIO = AUDIO;
