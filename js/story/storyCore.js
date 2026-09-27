/**
 * storyCore.js - 故事系统核心模块
 * 角色定义 + 结局 + 工厂函数 + 工具
 *
 * 所有故事文件共享此模块定义的内容。
 */

// 基础工具
function txt(zh, en, ja) { return { zh: zh, en: en, ja: ja }; }
function makeNarrator(text) { return { type: 'narrator', text: text }; }
function makeCharacter(charId, text, opts) {
    return Object.assign({ type: 'character', speaker: charId, text: text }, opts || {});
}
function makeSystem(text) { return { type: 'system', text: text }; }
function makeChoice(text, next, effects, tag, resultText, resultType) {
    const c = { text: text, nextScene: next, effects: effects || {} };
    if (tag) c.tag = tag;
    if (resultText) c.resultText = resultText;
    if (resultType) c.resultType = resultType;
    return c;
}

// 标签映射
const TAG_MAP = {
    truth:   { key: 'tagTruth',   cls: 'tag-truth' },
    empathy: { key: 'tagEmpathy', cls: 'tag-empathy' },
    risk:    { key: 'tagRisk',    cls: 'tag-risk' },
    trust:   { key: 'tagTrust',   cls: 'tag-trust' },
    caution: { key: 'tagCaution', cls: 'tag-caution' }
};

// 结局定义
const ENDINGS = {
    perfect: { id: 'perfect', type: 'perfect', icon: '🌟', titleKey: 'ending1Title', descKey: 'ending1Desc',
        condition: (flags) => flags.trustMystery >= 5 && flags.savedTimelines >= 3 && flags.truthRevealed && (flags.relationship_sq || 0) >= 3 },
    good:    { id: 'good',    type: 'good',    icon: '🌅', titleKey: 'ending2Title', descKey: 'ending2Desc',
        condition: (flags) => (flags.savedTimelines || 0) >= 2 || (flags.trustMystery || 0) >= 3 || (flags.relationship_sq || 0) >= 2 },
    bad:     { id: 'bad',     type: 'bad',     icon: '🌑', titleKey: 'ending3Title', descKey: 'ending3Desc',
        condition: (flags) => (flags.savedTimelines || 0) < 1 && (flags.trustMystery || 0) < 3 },
    hidden:  { id: 'hidden',  type: 'hidden',  icon: '🌀', titleKey: 'ending4Title', descKey: 'ending4Desc',
        condition: (flags) => (flags.trustMystery || 0) >= 6 && flags.truthRevealed && flags.ultimateQuestion && (flags.relationship_sq || 0) >= 2 },
    silence: { id: 'silence', type: 'bad',     icon: '🔇', titleKey: 'ending5Title', descKey: 'ending5Desc',
        condition: (flags) => flags.choseSilence }
};

// 核心角色
const CHARACTERS = {
    lk: { id: 'lk', nameKey: 'charLinKai',  color: '#4a7dff', avatar: '🔵', description: '28岁，程序员。' },
    sq: { id: 'sq', nameKey: 'charSuQing',  color: '#ff4d8f', avatar: '🌸', description: '26岁，EchoNet测试工程师。' },
    dc: { id: 'dc', nameKey: 'charDrChen', color: '#22c55e', avatar: '🧪', description: '45岁，EchoNet首席科学家。' },
    my: { id: 'my', nameKey: 'charMystery', color: '#8b5cf6', avatar: '👁', description: '身份不明的存在。' }
};

// 全局注册
window.txt = txt;
window.makeNarrator = makeNarrator;
window.makeCharacter = makeCharacter;
window.makeSystem = makeSystem;
window.makeChoice = makeChoice;
window.TAG_MAP = TAG_MAP;
window.ENDINGS = ENDINGS;
window.CHARACTERS = CHARACTERS;
window.STORY_CHAPTERS = [];  // 各故事文件追加
