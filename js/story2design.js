/**
 * story2design.js - 剧本 → 蓝图 二创转换器
 * 《无心之举 / Unintended Reply》
 *
 * 把现有故事章节（scenes/messages/choices/nextScene/isEnding）自动转换为
 * 设计器蓝图 v3 紧凑格式，保存为自定义设计，用户可在设计器中继续编辑剧情。
 *
 * 转换规则：
 *   1. 一个故事卡 → 一张蓝图设计（全部章节合并为一张连续的剧情图，可独立编辑/试玩）
 *   2. scene.messages：character → dialogue 节点；narrator/system → narration 节点
 *   3. scene.choices：→ choice 节点（选项保留三语与 tag）；effects → set_variable 节点链
 *   4. scene.nextScene / choice.nextScene：连线到目标场景首节点（含跨章跳转）
 *   5. scene.isEnding：→ end_game 节点（标题取自 endingTitleKey 当前语言或 endingId）
 *   6. 角色与变量：从消息 speaker / effects 自动提取
 *   7. 章节衔接：各章 startScene 处插入「章节开始（chapter_begin）节点 + 开场旁白」
 *
 * 依赖：window.STORY、window.SAVE、window.DESIGNER（normalizeDesign 用于校验展开）
 */

(function() {
    'use strict';

    if (typeof window === 'undefined') return;

    // 动态注册 i18n（避免改 i18n.js 主文件）
    if (typeof I18N !== 'undefined' && I18N.strings) {
        I18N.strings.zh['fanEdit'] = '二创改编';
        I18N.strings.en['fanEdit'] = 'Fan Edit';
        I18N.strings.ja['fanEdit'] = '二次創作';
        I18N.strings.zh['fanEditHint'] = '把故事剧本导入蓝图编辑器，自由改写剧情';
        I18N.strings.en['fanEditHint'] = 'Import the story script into the Blueprint editor and rewrite it freely';
        I18N.strings.ja['fanEditHint'] = '物語の台本をブループリント編集器に取り込み、自由に書き換える';
        I18N.strings.zh['fanEditDone'] = '已生成可编辑蓝图，正在打开设计器…';
        I18N.strings.en['fanEditDone'] = 'Editable Blueprint generated. Opening designer…';
        I18N.strings.ja['fanEditDone'] = '編集可能なブループリントを生成。デザイナーを開いています…';
        I18N.strings.zh['fanEditChapterPrefix'] = '（二创）';
        I18N.strings.en['fanEditChapterPrefix'] = '(Fan)';
        I18N.strings.ja['fanEditChapterPrefix'] = '（二次創作）';
        I18N.strings.zh['fanEditSystemMsg'] = '【系统】';
        I18N.strings.en['fanEditSystemMsg'] = '[System]';
        I18N.strings.ja['fanEditSystemMsg'] = '【システム】';
    }

    // 简单 id 生成（v3 格式不需要 pin id，normalizeDesign 时会生成）
    var idCounter = 0;
    function genNodeId(prefix) {
        return (prefix || 'n') + '_' + Date.now().toString(36) + '_' + (++idCounter);
    }

    // 从消息对象取三语文本
    function msgText(obj, fallback) {
        if (!obj) return { zh: fallback || '', en: fallback || '', ja: fallback || '' };
        if (typeof obj === 'string') return { zh: obj, en: obj, ja: obj };
        return {
            zh: obj.zh || obj.en || obj.ja || fallback || '',
            en: obj.en || obj.zh || obj.ja || fallback || '',
            ja: obj.ja || obj.zh || obj.en || fallback || ''
        };
    }

    // 从选项对象取三语文本
    function choiceText(c) {
        return msgText(c.text, '选项');
    }

    // 收集消息中的角色信息
    function collectCharacters(chapter, charMap) {
        Object.keys(chapter.scenes || {}).forEach(sceneId => {
            const scene = chapter.scenes[sceneId];
            (scene.messages || []).forEach(msg => {
                if (msg.type !== 'character' || !msg.speaker) return;
                const sp = msg.speaker;
                if (charMap[sp]) return;
                // 优先用消息内打包的角色信息（设计器编译产物），否则查 STORY 角色表
                const info = (typeof STORY !== 'undefined' && STORY.getCharacter) ? STORY.getCharacter(sp) : null;
                let name = msg.charName || '';
                let color = msg.charColor || '#4a7dff';
                let icon = msg.charAvatar || '👤';
                if (!name && info) {
                    name = (typeof I18N !== 'undefined' && I18N.t) ? I18N.t(info.nameKey) : sp;
                }
                if (info && info.color) color = info.color;
                if (info && info.avatar) icon = info.avatar;
                charMap[sp] = { name: name || sp, color: color, icon: icon };
            });
        });
    }

    // 收集 effects 中的变量 + input 场景的输入变量
    function collectVariables(chapter, varMap) {
        Object.keys(chapter.scenes || {}).forEach(sceneId => {
            const scene = chapter.scenes[sceneId];
            if (scene.input && scene.input.variable) {
                varMap[scene.input.variable] = varMap[scene.input.variable] || {
                    name: scene.input.variable,
                    type: scene.input.inputType === 'number' ? 'number' : 'string'
                };
            }
            (scene.choices || []).forEach(c => {
                if (!c.effects) return;
                Object.keys(c.effects).forEach(k => {
                    if (k.indexOf('flag_') === 0) return; // 剧情标记跳过（保留为 flag 语义）
                    varMap[k] = varMap[k] || { name: k, type: 'number', defaultValue: 0 };
                });
            });
        });
    }

    // fnCall 参数归一化为 { t:'var'|'direct', v }
    // 支持简写：字符串 → 变量引用；{ const: x } → 常量；{ t, v } 原样
    function normalizeFnArgs(args) {
        const out = {};
        Object.entries(args || {}).forEach(([k, a]) => {
            if (a && typeof a === 'object' && (a.t === 'var' || a.t === 'direct')) out[k] = JSON.parse(JSON.stringify(a));
            else if (a && typeof a === 'object' && a.const !== undefined) out[k] = { t: 'direct', v: a.const };
            else if (typeof a === 'string') out[k] = { t: 'var', v: a };
            else out[k] = { t: 'direct', v: a };
        });
        return out;
    }

    // 原生故事函数 → 蓝图函数定义（函数以子蓝图编写：fn_entry → 消息节点 → fn_return）
    // 兼容两种形态：{ params, messages, returnValue } 数据函数 / { params, returns, body } 旧式 JS 函数（原样保留）
    function storyFnToGraph(fnDef, fnId) {
        if (fnDef && typeof fnDef.body === 'string' && fnDef.body.trim() !== '') {
            return {
                name: fnDef.name || fnId,
                params: (fnDef.params || []).slice(),
                returns: (fnDef.returns || []).slice(),
                body: fnDef.body
            };
        }
        const nodes = [];
        const connections = [];
        const entry = { id: genNodeId('fne'), type: 'fn_entry', x: 80, y: 160, data: {} };
        nodes.push(entry);
        let prevId = entry.id;
        (fnDef.messages || []).forEach(msg => {
            const t3 = msgText(msg.text);
            let node;
            if (msg.type === 'character') {
                node = { id: genNodeId('fn'), type: 'dialogue', x: 0, y: 0, data: { characterId: msg.speaker || 'narrator', text: t3.zh, textEn: t3.en, textJa: t3.ja } };
            } else {
                node = { id: genNodeId('fn'), type: 'narration', x: 0, y: 0, data: { text: t3.zh, textEn: t3.en, textJa: t3.ja } };
            }
            nodes.push(node);
            connections.push({ from: prevId + ':out_exec', to: node.id + ':in_exec' });
            prevId = node.id;
        });
        const ret = { id: genNodeId('fnr'), type: 'fn_return', x: 0, y: 0, data: { value: String((fnDef && fnDef.returnValue) || '') } };
        nodes.push(ret);
        connections.push({ from: prevId + ':out_exec', to: ret.id + ':in_exec' });
        return {
            name: (fnDef && fnDef.name) || fnId,
            params: ((fnDef && fnDef.params) || []).slice(),
            outputs: ((fnDef && fnDef.returns) || []).slice(), // 原生返回名 → 输出变量（值走旧版 returnValue 表达式兼容路径）
            nodes,
            connections,
            startNode: entry.id
        };
    }

    /**
     * 将单个章节转换为蓝图 v3 设计对象
     * @param {object} chapter 章节对象 { id, scenes, startScene, titleKey, subtitleKey }
     * @param {object} meta { cardTitle, cardTitleEn, cardTitleJa, prefix } 附加信息
     * @returns {object} v3 设计对象
     */
    function convertChapterToDesign(chapter, meta) {
        meta = meta || {};
        if (!chapter || !chapter.scenes) return null;
        const sceneIds = Object.keys(chapter.scenes);
        if (sceneIds.length === 0) return null;

        // ── 收集角色与变量 ──
        const charMap = {};
        const varMap = {};
        collectCharacters(chapter, charMap);
        collectVariables(chapter, varMap);
        // 原生故事携带的函数定义（chapter.functions），供 fnCall 场景转换
        const mergedFunctions = chapter.functions || {};
        const fnDefs = {}; // 本设计收集到的函数定义 → design.functions

        // ── 节点与连线 ──
        const nodes = [];
        const connections = [];
        // 每个 scene 的"入口节点 id"（第一条消息节点；无消息则场景占位节点）
        const sceneEntry = {};
        // 每个 scene 的"出口节点 id"（最后一条消息节点；无消息则为入口）
        const sceneExit = {};
        // 角色变量 → 该角色的 dialogue 节点数量（用于 layout 微调，非必须）

        const lang = (typeof I18N !== 'undefined' && I18N.getLanguage) ? I18N.getLanguage() : 'zh';
        const t = (key) => (typeof I18N !== 'undefined' && I18N.t) ? I18N.t(key) : '';

        // 场景内消息 → 节点序列（fnCall/input 场景级数据 → 前置 function/input 节点）
        function buildMessageNodes(sceneId, scene) {
            const preIds = [];
            let prevId = null;
            const link = (id) => {
                if (prevId) connections.push({ from: prevId + ':out_exec', to: id + ':in_exec' });
                prevId = id;
                preIds.push(id);
            };

            // 场景级函数调用 → function 节点（场景入口），函数定义收进 design.functions
            if (scene.fnCall && scene.fnCall.fnId) {
                const fnDef = mergedFunctions[scene.fnCall.fnId];
                if (fnDef && !fnDefs[scene.fnCall.fnId]) {
                    fnDefs[scene.fnCall.fnId] = storyFnToGraph(fnDef, scene.fnCall.fnId);
                }
                const id = genNodeId('fn');
                const rv = scene.fnCall.resultVar
                    || (scene.fnCall.resultVars && Object.values(scene.fnCall.resultVars)[0])
                    || '';
                nodes.push({
                    id: id, type: 'function', x: 0, y: 0,
                    data: {
                        fnId: scene.fnCall.fnId,
                        args: normalizeFnArgs(scene.fnCall.args || {}),
                        resultVar: rv,
                        resultVars: JSON.parse(JSON.stringify(scene.fnCall.resultVars || {}))
                    }
                });
                link(id);
            }

            // 场景级输入赋值 → input 节点
            if (scene.input && scene.input.variable) {
                const p = msgText(scene.input.prompt || scene.input.text || '');
                const id = genNodeId('in');
                nodes.push({
                    id: id, type: 'input', x: 0, y: 0,
                    data: {
                        variable: scene.input.variable,
                        inputType: scene.input.inputType === 'number' ? 'number' : 'text',
                        prompt: p.zh, promptEn: p.en, promptJa: p.ja
                    }
                });
                link(id);
            }

            const msgs = scene.messages || [];
            if (msgs.length === 0) {
                if (preIds.length > 0) {
                    // fnCall/input 场景无消息：前置节点即全部内容
                    return { entry: preIds[0], exit: prevId, count: preIds.length };
                }
                // 无消息场景（如纯选项跳转）：建一个占位 narration 节点
                const id = genNodeId('n');
                nodes.push({ id: id, type: 'narration', x: 0, y: 0, data: { text: '', textEn: '', textJa: '' } });
                return { entry: id, exit: id, count: 1 };
            }

            const ids = [];
            msgs.forEach((msg, i) => {
                let type, data;
                if (msg.type === 'chapter_card') {
                    // 章节开始节点：标题/副标题写入 chapter_begin 数据（设计器为单语言字段，取当前语言）
                    type = 'chapter_begin';
                    const t3 = msgText(msg.title);
                    const s3 = msg.sub ? msgText(msg.sub) : null;
                    data = {
                        chapterTitle: t3[lang] || t3.zh || '',
                        chapterSubtitle: s3 ? (s3[lang] || s3.zh || '') : ''
                    };
                } else if (msg.type === 'character') {
                    type = 'dialogue';
                    const txtObj = msgText(msg.text);
                    data = { characterId: msg.speaker || 'narrator', text: txtObj.zh, textEn: txtObj.en, textJa: txtObj.ja };
                } else {
                    type = 'narration';
                    const txtObj = msgText(msg.text);
                    const prefix = msg.type === 'system' ? (I18N.strings && I18N.strings[lang] && I18N.strings[lang].fanEditSystemMsg || '【系统】') : '';
                    data = { text: prefix + txtObj.zh, textEn: prefix + txtObj.en, textJa: prefix + txtObj.ja };
                }
                const id = genNodeId('n');
                nodes.push({ id: id, type: type, x: 0, y: 0, data: data });
                ids.push(id);
                link(id);
            });
            return { entry: preIds[0] || ids[0], exit: ids[ids.length - 1], count: preIds.length + ids.length };
        }

        // 处理选项 effects → set_variable 节点链，返回首个节点 id 与末尾 id
        function buildEffectNodes(effects, choiceNodeId) {
            const keys = Object.keys(effects || {});
            if (keys.length === 0) return null;
            const firstId = choiceNodeId; // 若放在选项后，由调用方连接
            const effIds = [];
            keys.forEach(k => {
                let v = effects[k];
                let name = k;
                let op = 'add';
                let val = v;
                if (k.indexOf('flag_') === 0) {
                    name = k.substring(5);
                    op = 'set';
                    val = true;
                } else if (typeof v === 'boolean') {
                    op = 'set';
                } else if (typeof v === 'number') {
                    op = v >= 0 ? 'add' : 'sub';
                    val = Math.abs(v);
                }
                const id = genNodeId('n');
                nodes.push({ id: id, type: 'set_variable', x: 0, y: 0, data: { variableName: name, operation: op, operandValue: val } });
                effIds.push(id);
            });
            for (let i = 0; i < effIds.length - 1; i++) {
                connections.push({ from: effIds[i] + ':out_exec', to: effIds[i + 1] + ':in_exec' });
            }
            return { first: effIds[0], last: effIds[effIds.length - 1] };
        }

        // 第一遍：创建所有场景的消息节点，建立 entry/exit
        sceneIds.forEach(sceneId => {
            const scene = chapter.scenes[sceneId];
            if (!scene) return;
            const r = buildMessageNodes(sceneId, scene);
            sceneEntry[sceneId] = r.entry;
            sceneExit[sceneId] = r.exit;
        });

        // 第二遍：处理选项 / 跳转 / 结局
        sceneIds.forEach((sceneId, si) => {
            const scene = chapter.scenes[sceneId];
            const exitId = sceneExit[sceneId];

            if (scene.isEnding) {
                // 结局场景 → end_game 节点
                const title = scene.endingTitleKey ? t(scene.endingTitleKey) : (scene.endingId || '结局');
                const desc = scene.endingDescKey ? t(scene.endingDescKey) : '';
                const endId = genNodeId('end');
                nodes.push({ id: endId, type: 'end_game', x: 0, y: 0, data: { endingType: 'good', endingTitle: title, endingDesc: desc } });
                if (exitId && exitId !== endId) {
                    connections.push({ from: exitId + ':out_exec', to: endId + ':in_exec' });
                }
                return;
            }

            if (scene.choices && scene.choices.length > 0) {
                // choice 节点（condition 一并保留：MBTI/结局门槛等条件选项在蓝图中语义不变）
                const choiceId = genNodeId('choice');
                const choicesData = scene.choices.map(c => {
                    const ct = choiceText(c);
                    const out = { text: ct.zh, textEn: ct.en, textJa: ct.ja, tag: c.tag || 'neutral' };
                    if (c.condition) out.condition = JSON.parse(JSON.stringify(c.condition));
                    return out;
                });
                nodes.push({ id: choiceId, type: 'choice', x: 0, y: 0, data: { choices: choicesData } });
                if (exitId) {
                    connections.push({ from: exitId + ':out_exec', to: choiceId + ':in_exec' });
                }

                // 每个选项 → effects 链 → 目标场景入口
                scene.choices.forEach((c, idx) => {
                    const eff = buildEffectNodes(c.effects, choiceId);
                    // 选项输出引脚：首个 out_exec，其余 choice_<idx>
                    const outRef = choiceId + ':' + (idx === 0 ? 'out_exec' : 'choice_' + idx);
                    let target = null;
                    if (c.nextScene && sceneEntry[c.nextScene]) {
                        target = c.nextScene;
                    } else if (scene.nextScene && sceneEntry[scene.nextScene]) {
                        target = scene.nextScene; // 选项未指定时退回场景默认跳转
                    }
                    if (target) {
                        let tail = outRef;
                        if (eff) {
                            connections.push({ from: outRef, to: eff.first + ':in_exec' });
                            tail = eff.last + ':out_exec';
                        }
                        connections.push({ from: tail, to: sceneEntry[target] + ':in_exec' });
                    }
                });
            } else if (scene.nextScene && sceneEntry[scene.nextScene] && exitId) {
                // 普通场景跳转
                connections.push({ from: exitId + ':out_exec', to: sceneEntry[scene.nextScene] + ':in_exec' });
            }
        });

        // ── 起点 ──
        const startSceneId = chapter.startScene || sceneIds[0];
        const startId = genNodeId('start');
        nodes.push({ id: startId, type: 'event_start', x: 0, y: 0, data: { eventName: 'GameStart' } });
        if (sceneEntry[startSceneId]) {
            connections.push({ from: startId + ':out_exec', to: sceneEntry[startSceneId] + ':in_exec' });
        }

        // ── 自动布局（简单网格：每场景一列，纵向排消息） ──
        const colWidth = 340;
        const rowHeight = 170;
        const nodeIndex = {};
        nodes.forEach((n, i) => { nodeIndex[n.id] = i; });
        // 先给节点打上"场景列"标签：用连线推断层，简化：按创建顺序排布
        // 简单方案：按 nodes 数组顺序，列 = floor(i / maxRow)，行 = i % maxRow
        const sceneCols = {};
        sceneIds.forEach((sid, si) => {
            // 入口节点所在的列
            const entry = sceneEntry[sid];
            if (entry) sceneCols[entry] = si;
        });
        // BFS 计算列：入口场景为 0，跳转目标场景列 = 当前 + 1
        // 简化：直接使用 scene 顺序作为列号（sceneIds 顺序基本是剧情顺序）
        const maxRowByCol = {};
        nodes.forEach(n => {
            let col = 0;
            // 找出该节点所属 scene：通过 sceneEntry/exit 精确匹配入口/出口
            sceneIds.forEach((sid, si) => {
                if (sceneEntry[sid] === n.id || sceneExit[sid] === n.id) col = si;
            });
            // 其他节点（choice/effects/end/start）：就近归到出口节点所在列
            if (col === 0) {
                // 简单起见：所有非入口/出口节点都放第一个场景列之后的递增列
                col = 1 + (nodeIndex[n.id] % Math.max(sceneIds.length - 1, 1));
            }
            n.col = col;
            const row = maxRowByCol[col] || 0;
            n.x = col * colWidth + 40;
            n.y = row * rowHeight + 60;
            maxRowByCol[col] = row + 1;
        });
        nodes.forEach(n => { delete n.col; });

        // ── 组装 v3 设计 ──
        const design = {
            id: 'fan_' + (chapter.id || 'story'),
            title: (meta.prefix || '') + (meta.cardTitle || chapter.titleKey || chapter.id || '未命名'),
            description: meta.cardDescription || '',
            storyIcon: meta.cardIcon || '✨',
            themeColor: meta.cardColor || '',
            version: 3,
            variables: {},
            characters: {},
            functions: fnDefs, // 原生 fnCall 场景 / 函数优化引入的函数定义
            music: { globalBgm: null },
            nodes: nodes,
            connections: connections,
            startNode: startId
        };

        // 变量：number 类型默认值简写；string 类型（输入变量等）带类型标记
        Object.keys(varMap).forEach(k => {
            const def = varMap[k];
            if (def && def.type === 'string') design.variables[k] = { type: 'string' };
            else design.variables[k] = 0;
        });
        // 角色
        Object.keys(charMap).forEach(k => {
            const c = charMap[k];
            const out = {};
            if (c.name && c.name !== k) out.name = c.name;
            if (c.icon && c.icon !== '👤') out.icon = c.icon;
            if (c.color && c.color !== '#4a7dff') out.color = c.color;
            design.characters[k] = out;
        });

        return design;
    }

    // 取 i18n 键的三语值（不存在返回 null）
    function triKey(key) {
        if (!key || typeof I18N === 'undefined' || !I18N.strings) return null;
        const out = {};
        ['zh', 'en', 'ja'].forEach(lang => {
            const v = I18N.strings[lang] && I18N.strings[lang][key];
            out[lang] = (v !== undefined && v !== key) ? v : null;
        });
        return (out.zh || out.en || out.ja) ? out : null;
    }

    // ── 用函数优化蓝图结构 ──
    // 识别「同一节点上大量重复的多维度条件判定」结构（如 MBTI 的 16 选项 × 4 维度 = 64 条判定），
    // 自动生成一个判定函数：函数一次算出结果变量 → 各选项简化为等值判定。
    // 判定总数从 N×D 降为 1 次函数调用 + N 次等值比较，画布结构也一目了然。
    const MBTI_DIM_VARS = ['e_count', 's_count', 't_count', 'j_count'];
    const MBTI_FORWARD = { e_count: 'E', s_count: 'S', t_count: 'T', j_count: 'J' };
    const MBTI_BACKWARD = { e_count: 'I', s_count: 'N', t_count: 'F', j_count: 'P' };

    function isMbtiDimConditionSet(cond) {
        if (!Array.isArray(cond) || cond.length !== MBTI_DIM_VARS.length) return false;
        const vars = cond.map(c => (c && c.variable) || null);
        return MBTI_DIM_VARS.every(v => vars.indexOf(v) >= 0);
    }

    function deriveMbtiCode(cond) {
        let code = '';
        MBTI_DIM_VARS.forEach(v => {
            const item = cond.find(c => c.variable === v);
            code += (item && item.operator === '>=') ? MBTI_FORWARD[v] : MBTI_BACKWARD[v];
        });
        return code;
    }

    function optimizeMbtiWithFunction(design) {
        if (!design || !Array.isArray(design.nodes)) return;
        design.nodes.forEach(node => {
            if (node.type !== 'choice' || !Array.isArray(node.data.choices)) return;
            const chs = node.data.choices;
            if (chs.length < 4) return;
            if (!chs.every(c => isMbtiDimConditionSet(c.condition))) return;

            // 1) 判定函数（图函数：fn_entry → fn_return，返回值表达式用参数求值；幂等：覆盖同 id 定义）
            design.functions = design.functions || {};
            {
                const entry = { id: genNodeId('fne'), type: 'fn_entry', x: 80, y: 160, data: {} };
                const ret = {
                    id: genNodeId('fnr'), type: 'fn_return', x: 380, y: 160,
                    data: { value: "(e >= 2 ? 'E' : 'I') + (s >= 2 ? 'S' : 'N') + (t >= 2 ? 'T' : 'F') + (j >= 2 ? 'J' : 'P')" }
                };
                design.functions['mbti_verdict'] = {
                    name: 'MBTI 判定',
                    params: ['e', 's', 't', 'j'],
                    nodes: [entry, ret],
                    connections: [{ from: entry.id + ':out_exec', to: ret.id + ':in_exec' }],
                    startNode: entry.id
                };
            }
            // 2) 结果变量（string，HUD 可见判定结果）
            design.variables = design.variables || {};
            design.variables.mbti_code = { type: 'string', name: 'MBTI' };
            // 3) 函数节点插到该 choice 节点之前（入边重接：前置 → fn → choice）
            const fnId = genNodeId('fn');
            design.nodes.push({
                id: fnId, type: 'function',
                x: (typeof node.x === 'number' ? node.x : 0),
                y: (typeof node.y === 'number' ? node.y - 170 : 0),
                data: {
                    fnId: 'mbti_verdict',
                    args: { e: { t: 'var', v: 'e_count' }, s: { t: 'var', v: 's_count' }, t: { t: 'var', v: 't_count' }, j: { t: 'var', v: 'j_count' } },
                    resultVar: 'mbti_code',
                    resultVars: { mbti_code: 'mbti_code' }
                }
            });
            (design.connections || []).forEach(c => {
                if (c.to === node.id + ':in_exec') c.to = fnId + ':in_exec';
            });
            design.connections.push({ from: fnId + ':out_exec', to: node.id + ':in_exec' });
            // 4) 选项条件简化：4 维度判定 → mbti_code 等值判定（64 条 → 16 条）
            chs.forEach(c => {
                c.condition = { variable: 'mbti_code', operator: '==', value: deriveMbtiCode(c.condition) };
            });
        });
    }

    /**
     * 把多个章节合并为一个"虚拟章节"（场景图拼接），供 convertChapterToDesign 一次转换。
     * - 场景 id 冲突时按章节序号重命名（c<idx>__<sceneId>），引用同步重映射
     * - 每章 startScene 前插入「章节开始标记（chapter_card）+ 开场旁白」，保留章节节奏
     * @param {Array} chapters 章节数组
     * @returns {object} 虚拟章节 { id, scenes, startScene }
     */
    function mergeChapters(chapters) {
        // 冲突检测：跨章节重名的场景 id 需要重命名
        const seen = {};
        const colliding = {};
        chapters.forEach(ch => Object.keys(ch.scenes || {}).forEach(sid => {
            if (seen[sid]) colliding[sid] = true;
            else seen[sid] = true;
        }));
        const keyOf = (i, sid) => colliding[sid] ? 'c' + i + '__' + sid : sid;

        const scenes = {};
        chapters.forEach((ch, i) => {
            const has = r => !!(ch.scenes && ch.scenes[r]);
            // 引用重映射：本章场景用本章命名；跨章场景用目标章命名
            const remapRef = r => {
                if (!r) return r;
                if (has(r)) return keyOf(i, r);
                const oi = chapters.findIndex(c => c.scenes && c.scenes[r]);
                return oi >= 0 ? keyOf(oi, r) : r;
            };

            Object.keys(ch.scenes || {}).forEach(sid => {
                const s = JSON.parse(JSON.stringify(ch.scenes[sid]));
                s.nextScene = remapRef(s.nextScene);
                (s.choices || []).forEach(c => { c.nextScene = remapRef(c.nextScene); });
                scenes[keyOf(i, sid)] = s;
            });

            // 章节标题卡：插到该章 startScene 消息首部（标题 + 副标题 + 开场旁白）
            const startSid = ch.startScene || Object.keys(ch.scenes || {})[0];
            const target = scenes[keyOf(i, startSid)];
            if (target) {
                const title = triKey(ch.titleKey);
                const sub = triKey(ch.subtitleKey);
                const intro = ch.narrator ? msgText(ch.narrator) : null;
                const cards = [];
                if (title) {
                    // 章节标记（非旁白文本）：convertChapterToDesign 会转成 chapter_begin 节点
                    cards.push({ type: 'chapter_card', title: title, sub: sub });
                }
                if (intro && (intro.zh || intro.en || intro.ja)) {
                    cards.push({ type: 'narrator', text: intro });
                }
                if (cards.length) {
                    target.messages = cards.concat(target.messages || []);
                }
            }
        });

        const first = chapters[0];
        // 汇总各章携带的函数定义（供 fnCall 场景 → function 节点转换）
        const functions = {};
        chapters.forEach(ch => { Object.assign(functions, ch.functions || {}); });
        return {
            id: chapters.map(c => c.id).join('_'),
            scenes: scenes,
            startScene: keyOf(0, first.startScene || Object.keys(first.scenes || {})[0]),
            functions: functions
        };
    }

    /**
     * 把故事卡的全部章节合并转换为一张蓝图设计并保存
     * @param {string} cardId 故事卡 id
     * @returns {Array} 生成的 design 数组（单个元素）
     */
    function importStoryCard(cardId) {
        const card = (typeof STORY !== 'undefined' && STORY.getStoryCard) ? STORY.getStoryCard(cardId) : null;
        if (!card) return null;
        const chapters = (card.chapters || []).map(id => STORY.getChapter(id)).filter(Boolean);
        if (chapters.length === 0) return null;

        const prefix = (typeof I18N !== 'undefined' && I18N.strings && I18N.strings[I18N.getLanguage()] && I18N.strings[I18N.getLanguage()].fanEditChapterPrefix) || '（二创）';
        const merged = mergeChapters(chapters);
        const design = convertChapterToDesign(merged, {
            cardTitle: card.title,
            cardTitleEn: card.titleEn,
            cardTitleJa: card.titleJa,
            cardDescription: card.description,
            cardColor: card.color,
            cardIcon: card.icon,
            prefix: prefix
        });
        if (!design) return null;

        // 用函数优化重复条件判定结构（如 MBTI 16 选项 × 4 维度 → 判定函数 + 等值选项）
        optimizeMbtiWithFunction(design);

        // 稳定 id：同一故事重复导入时覆盖更新，而不是不断新增副本
        design.id = 'fan_' + card.id;
        design.title = prefix + (card.title || '');

        // 清理旧版"一章一图"产生的分章副本（fan_<cardId>_<chapterId>）
        if (typeof SAVE !== 'undefined' && SAVE.getDesigns && SAVE.deleteDesign) {
            const legacyPrefix = 'fan_' + card.id + '_';
            SAVE.getDesigns()
                .filter(d => d && typeof d.id === 'string' && d.id.indexOf(legacyPrefix) === 0)
                .forEach(d => SAVE.deleteDesign(d.id));
        }

        if (typeof SAVE !== 'undefined' && SAVE.saveDesign) SAVE.saveDesign(design);
        return [design];
    }

    // 暴露接口
    window.STORY2DESIGN = {
        convertChapterToDesign: convertChapterToDesign,
        importStoryCard: importStoryCard
    };
})();
