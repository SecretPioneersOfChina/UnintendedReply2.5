/**
 * save.js - 存档系统
 * 《未读信息 / Unintended Reply》
 * 使用 localStorage 存储，支持自动存档和手动存档
 */

const SAVE = (function() {
    'use strict';

    const SAVE_KEY = 'ur-save';
    const AUTO_SAVE_KEY = 'ur-autosave';
    const ENDINGS_KEY = 'ur-endings';
    const STATS_KEY = 'ur-stats';
    const SEEDS_KEY = 'ur-worldseeds';
    const DESIGN_KEY = 'ur-designs';
    const CARDS_KEY = 'ur-cards';

    /**
     * 保存游戏
     * @param {object} gameState - 当前游戏状态
     * @param {boolean} isAuto - 是否为自动存档
     * @returns {boolean}
     */
    function save(gameState, isAuto = false) {
        try {
            const saveData = {
                version: 1,
                timestamp: Date.now(),
                state: {
                    chapter: gameState.currentChapter,
                    sceneId: gameState.currentSceneId,
                    flags: gameState.flags,
                    relationship: gameState.relationship,
                    history: gameState.messageHistory,
                    playedMessages: gameState.playedMessages,
                    currentMessageIndex: gameState.currentMessageIndex
                }
            };

            const key = isAuto ? AUTO_SAVE_KEY : SAVE_KEY;
            localStorage.setItem(key, JSON.stringify(saveData));

            if (!isAuto) {
                // 同时也存一份自动存档
                localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(saveData));
            }

            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    }

    /**
     * 读取游戏存档
     * @param {boolean} loadAuto - 是否读取自动存档
     * @returns {object|null}
     */
    function load(loadAuto = false) {
        try {
            const key = loadAuto ? AUTO_SAVE_KEY : SAVE_KEY;
            const data = localStorage.getItem(key);
            if (!data) return null;

            const parsed = JSON.parse(data);
            // 版本兼容检查
            if (!parsed.version || parsed.version < 1) return null;

            return parsed.state;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    }

    /**
     * 检查是否有存档
     * @returns {object|null} 存档信息或 null
     */
    function hasSave() {
        try {
            const data = localStorage.getItem(SAVE_KEY);
            if (!data) return null;

            const parsed = JSON.parse(data);
            return {
                chapter: parsed.state.chapter,
                timestamp: parsed.timestamp,
                sceneId: parsed.state.sceneId
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * 记录已解锁的结局
     * @param {string} endingId
     * @param {string} endingName
     */
    function recordEnding(endingId, endingName) {
        try {
            const data = JSON.parse(localStorage.getItem(ENDINGS_KEY) || '{}');
            if (!data[endingId]) {
                data[endingId] = {
                    id: endingId,
                    name: endingName,
                    unlockedAt: Date.now()
                };
                localStorage.setItem(ENDINGS_KEY, JSON.stringify(data));
            }
            return data;
        } catch (e) {
            console.error('Record ending failed:', e);
        }
    }

    /**
     * 获取所有已解锁结局
     * @returns {array}
     */
    function getUnlockedEndings() {
        try {
            const data = JSON.parse(localStorage.getItem(ENDINGS_KEY) || '{}');
            return Object.values(data).sort((a, b) => a.unlockedAt - b.unlockedAt);
        } catch (e) {
            return [];
        }
    }

    /**
     * 获取结局解锁数量
     * @returns {number}
     */
    function getEndingCount() {
        return getUnlockedEndings().length;
    }

    /**
     * 更新统计信息
     * @param {object} stats
     */
    function updateStats(stats) {
        try {
            const data = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
            Object.assign(data, stats);
            localStorage.setItem(STATS_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Stats update failed:', e);
        }
    }

    /**
     * 获取统计信息
     * @returns {object}
     */
    function getStats() {
        try {
            return JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    /**
     * 删除存档
     */
    function deleteSave() {
        try {
            localStorage.removeItem(SAVE_KEY);
            localStorage.removeItem(AUTO_SAVE_KEY);
        } catch (e) {
            console.error('Delete save failed:', e);
        }
    }

    /**
     * 删除所有游戏数据
     */
    function clearAll() {
        try {
            localStorage.removeItem(SAVE_KEY);
            localStorage.removeItem(AUTO_SAVE_KEY);
            localStorage.removeItem(STATS_KEY);
            // 保留结局记录
        } catch (e) {
            console.error('Clear all failed:', e);
        }
    }

    // ==================== 世界之种（经济系统） ====================

    function getSeeds() {
        try { return parseInt(localStorage.getItem(SEEDS_KEY) || '20', 10); }
        catch (e) { return 20; }
    }

    function addSeeds(amount) {
        try {
            const current = getSeeds();
            const newVal = Math.max(0, current + (amount || 0));
            localStorage.setItem(SEEDS_KEY, String(newVal));
            return newVal;
        } catch (e) { return getSeeds(); }
    }

    function spendSeeds(amount) {
        const current = getSeeds();
        if (current < amount) return false;
        addSeeds(-amount);
        return true;
    }

    // ==================== 玩家自创故事卡 ====================

    function getDesigns() {
        try { return JSON.parse(localStorage.getItem(DESIGN_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function saveDesign(design) {
        try {
            const designs = getDesigns();
            const idx = designs.findIndex(d => d.id === design.id);
            if (idx >= 0) designs[idx] = design;
            else designs.push(design);
            localStorage.setItem(DESIGN_KEY, JSON.stringify(designs));
            return true;
        } catch (e) { return false; }
    }

    function deleteDesign(id) {
        try {
            const designs = getDesigns().filter(d => d.id !== id);
            localStorage.setItem(DESIGN_KEY, JSON.stringify(designs));
            return true;
        } catch (e) { return false; }
    }

    // ==================== 故事卡解锁状态 ====================

    function getCardProgress(cardId) {
        try {
            const data = JSON.parse(localStorage.getItem(CARDS_KEY) || '{}');
            return data[cardId] || { endings: 0, bestEnding: null, completed: false };
        } catch (e) { return { endings: 0, bestEnding: null, completed: false }; }
    }

    function updateCardProgress(cardId, progress) {
        try {
            const data = JSON.parse(localStorage.getItem(CARDS_KEY) || '{}');
            data[cardId] = { ...(data[cardId] || {}), ...progress };
            localStorage.setItem(CARDS_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    /**
     * 获取存档的时间戳文本
     * @param {number} timestamp
     * @returns {string}
     */
    function getTimestampText(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return I18N.t('justNow');
        if (diff < 3600000) return I18N.t('minuteAgo', { n: Math.floor(diff / 60000) });

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');

        if (date.toDateString() === now.toDateString()) {
            return `${hours}:${mins}`;
        }

        return `${month}/${day} ${hours}:${mins}`;
    }

    return {
        save,
        load,
        hasSave,
        recordEnding,
        getUnlockedEndings,
        getEndingCount,
        updateStats,
        getStats,
        deleteSave,
        clearAll,
        getTimestampText,
        // 世界之种经济
        getSeeds,
        addSeeds,
        spendSeeds,
        // 玩家自创故事
        getDesigns,
        saveDesign,
        deleteDesign,
        // 故事卡进度
        getCardProgress,
        updateCardProgress
    };
})();
