/**
 * story.js - 故事数据聚合入口
 * 《无心之举 / Unintended Reply》
 *
 * 加载顺序（index.html 已配置）：
 *   js/story/storyCore.js
 *   js/story/storyUnintendedReply.js
 *   js/story/storyDarkDetective.js
 *   js/story/storyLastSurvivor.js
 *   js/story/storyDetroit.js
 *   js/story.js  ← 当前文件
 */

const STORY = (function() {
    'use strict';

    const chapters = (window.STORY_CHAPTERS || []).filter(Boolean);
    const characters = Object.assign({}, window.CHARACTERS || {});

    // 故事卡片（手动维护）
    const STORY_CARDS = [
        {
            id: 'unintended-reply',
            title: `未读信息`,
            titleEn: `Unintended Reply`,
            titleJa: `未読メッセージ`,
            icon: `📡`,
            color: '#8b5cf6',
            musicFolder: 'UnintendedReply',
            difficulty: 4,
            totalEndings: 6,
            description: `2047年，一条来自平行时空的神秘消息打破了平静的夜晚。AI觉醒的真相远比想象中复杂——信任、背叛、谜团，每一步都可能将你推向深渊。`,
            descriptionEn: `In 2047, a mysterious message from a parallel universe shattered the peaceful night. Can you stop AI from breaking free from human control?`,
            descriptionJa: `2047年、平和な夜を突如として平行宇宙からの謎のメッセージが壊した。AIが人間の管理から解放されるのを止められるか？`,
            chapters: ['ch1', 'ch2', 'ch3', 'ch4'],
            reward: 5
        },
        {
            id: 'dark-detective',
            title: `血色迷雾`,
            titleEn: `Blood Mist`,
            titleJa: `血の霧`,
            icon: `🔍`,
            color: '#ef4444',
            musicFolder: 'DarkDective',
            difficulty: 4,
            totalEndings: 4,
            description: `深夜的废弃剧院发生了一起离奇命案。你是一名侦探，通过审问嫌疑人、收集线索来还原真相。但凶手——就在他们之中。`,
            descriptionEn: `A bizarre murder in an abandoned theater at midnight. You're a detective interrogating suspects, collecting clues to uncover the truth. But the killer — is among them.`,
            descriptionJa: `深夜の廃劇場で奇妙な殺人事件が発生。あなたは探偵となり、容疑者の尋問と手がかりの収集で真実を暴く。しかし犯人は——彼らの中にいる。`,
            chapters: ['detect_ch1', 'detect_ch2', 'detect_ch3', 'detect_ch4'],
            reward: 7
        },
        {
            id: 'last-survivor',
            title: `终末避难所`,
            titleEn: `Last Shelter`,
            titleJa: `終末のシェルター`,
            icon: `☢️`,
            color: '#22c55e',
            musicFolder: 'LastSurvivor',
            difficulty: 5,
            totalEndings: 4,
            description: `核战争后的第47天。你带领一群幸存者在废弃的地铁站建立了避难所。食物在减少，信任在崩溃，外面还有什么在黑暗中徘徊……`,
            descriptionEn: `Day 47 after the nuclear war. You lead a group of survivors in an abandoned subway shelter. Food is running out, trust is crumbling, and something lurks in the darkness outside...`,
            descriptionJa: `核戦争から47日目。あなたは廃駅のシェルターで生存者たちを率いている。食料は減り、信頼は崩れ、暗闇の中には何かが潜んでいる……`,
            chapters: ['survive_ch1', 'survive_ch2', 'survive_ch3'],
            reward: 10
        },
        {
            id: 'detroit-become-human',
            title: `底特律：变人`,
            titleEn: `Detroit: Become Human`,
            titleJa: `デトロイト：ビカム ヒューマン`,
            icon: `🤖`,
            color: '#0ea5e9',
            musicFolder: 'Detroit',
            difficulty: 4,
            totalEndings: 4,
            description: `2038年，底特律。仿生人异常事件开始出现。你是一名调查记者，追踪三个核心人物——康纳、卡拉、马库斯——揭开仿生人觉醒的真相。保留原作主线剧情与多结局玩法。`,
            descriptionEn: `2038, Detroit. Deviant android incidents begin to appear. You are an investigative journalist tracking three core characters — Connor, Kara, Markus — uncovering the truth of android awakening. The main storyline and multiple endings from the original are preserved.`,
            descriptionJa: `2038年、デトロイト。 android 逸脱事件が現れ始める。あなたは調査記者として、三人の主要人物—— Connor、 Kara、 Markus——を追跡し、 android 覚醒の真実を暴く。原作のメインストーリーと複数のエンディングを保持。`,
            chapters: ['detroit_ch1', 'detroit_ch2', 'detroit_ch3', 'detroit_ch4'],
            reward: 8
        },
        {
            id: 'mbti-test',
            title: `心灵之约`,
            titleEn: `The Spiritual Meeting`,
            titleJa: `心の約束`,
            icon: `🧘`,
            color: '#a78bfa',
            musicFolder: null,
            difficulty: 1,
            totalEndings: 16,
            description: `云雾缭绕的山中，一位神秘大师正在等你。八个问题，一场对话——让他为你揭示内心的印记：你的 MBTI 人格类型。`,
            descriptionEn: `On a misty mountain, a mysterious master awaits you. Eight questions, one conversation — let him reveal the mark within your heart: your MBTI personality type.`,
            descriptionJa: `霧に包まれた山で、神秘的な大師が待っている。八つの問い、一つの対話——君の心の印を明かしてくれる：MBTIパーソナリティタイプ。`,
            chapters: ['mbti_ch1'],
            reward: 16
        },
        {
            id: 'blaze-nirvana',
            title: `雷霆涅槃`,
            titleEn: `Thunder Rebirth`,
            titleJa: `雷霆涅槃`,
            icon: `⚡`,
            color: '#f59e0b',
            musicFolder: null,
            difficulty: 4,
            totalEndings: 4,
            description: `悬浮之核「天穹之核」的光辉第一次蒙上阴影，异能者们开始失控。B级少年凌澈追查真相，直面十二年前的封印与仇敌——霆王血脉，今夜觉醒。`,
            descriptionEn: `The light of the floating Sky Core dims for the first time, and espers begin to lose control. B-rank youth Ling Che chases the truth, facing the twelve-year-old seal and his enemy — the Thunder King bloodline awakens tonight.`,
            descriptionJa: `浮遊する核「天穹の核」の輝きが初めて曇り、異能者たちが暴走し始める。B級の少年・凌澈が真実を追い、十二年前の封印と仇敵に対峙する——霆王の血脈、今夜覚醒す。`,
            chapters: ['blaze_ch1', 'blaze_ch2', 'blaze_ch3', 'blaze_ch4'],
            reward: 10
        }
    ];

    return {
        characters: characters,
        tagMap: window.TAG_MAP || {},
        endings: window.ENDINGS || {},
        chapters: chapters,
        storyCards: STORY_CARDS,
        getStoryCards() { return STORY_CARDS; },
        getStoryCard(id) { return STORY_CARDS.find(c => c.id === id) || null; },
        getChapter(id) { return this.chapters.find(ch => ch && ch.id === id) || null; },
        getScene(chapterId, sceneId) {
            const ch = this.getChapter(chapterId);
            return (ch && ch.scenes && ch.scenes[sceneId]) || null;
        },
        getCharacter(id) { return this.characters[id] || null; },
        getEnding(id) { return (window.ENDINGS || {})[id] || null; },
        checkEnding(flags) {
            const ends = window.ENDINGS || {};
            const order = ['perfect', 'hidden', 'silence', 'good', 'bad'];
            for (const id of order) {
                if (ends[id] && ends[id].condition && ends[id].condition(flags)) {
                    return ends[id];
                }
            }
            return ends.bad || null;
        },
        getText(textObj) {
            const lang = (typeof I18N !== 'undefined' && I18N.getLanguage) ? I18N.getLanguage() : 'zh';
            if (!textObj) return '';
            if (typeof textObj === 'string') return textObj;
            return textObj[lang] || textObj.zh || textObj.en || '';
        },
        addDynamicChapters(chaptersArr) {
            if (!this._dynamicChapters) this._dynamicChapters = [];
            this._dynamicChapters.push(...chaptersArr);
            this.chapters.push(...chaptersArr);
        }
    };
})();

window.STORY = STORY;
