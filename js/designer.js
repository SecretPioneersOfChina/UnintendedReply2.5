/**
 * designer.js - UE5 Blueprint 风格故事设计器
 * 《无心之举 / Unintended Reply》
 * 可视化节点编辑 · 引脚连接 · 变量系统 · 执行流
 */

const DESIGNER = (function() {
    'use strict';

    // ==================== 状态 ====================
    let currentDesign = null;
    // 局域网社区协作上下文：{ id: 服务器故事ID, version: 本地已知的最新版本 }。
    // 非空时 save() 会自动把整个设计推送到社区服务器（带版本冲突检查），
    // 他人保存/加入时由 COMMUNITY.onRemoteChange 回调触发协作横幅。
    let _community = null;
    let nodeIdCounter = 0;
    let connIdCounter = 0;
    let selectedNodeId = null;
    let nextNodeId = 0;

    // ==================== 画布模式（主蓝图 / 函数子蓝图） ====================
    // null = 主蓝图；否则为 currentDesign.functions[_activeFnId] 的函数画布
    let _activeFnId = null;

    function inFnMode() {
        return !!(_activeFnId && currentDesign && currentDesign.functions && currentDesign.functions[_activeFnId]);
    }
    function curFnDef() {
        return inFnMode() ? currentDesign.functions[_activeFnId] : null;
    }
    // 当前画布正在编辑的节点/连线集合（主蓝图或函数子蓝图）
    function curNodes() {
        if (inFnMode()) { const f = currentDesign.functions[_activeFnId]; if (!Array.isArray(f.nodes)) f.nodes = []; return f.nodes; }
        return currentDesign ? currentDesign.nodes : [];
    }
    function curConns() {
        if (inFnMode()) { const f = currentDesign.functions[_activeFnId]; if (!Array.isArray(f.connections)) f.connections = []; return f.connections; }
        return currentDesign ? currentDesign.connections : [];
    }
    // 进入/退出函数画布
    function openFnCanvas(fnId) {
        if (!currentDesign || !currentDesign.functions || !currentDesign.functions[fnId]) return;
        _activeFnId = fnId;
        selectedNodeId = null;
        tempConnection = null;
        render();
    }
    function closeFnCanvas() {
        _activeFnId = null;
        selectedNodeId = null;
        tempConnection = null;
        save(true);
        render();
    }

    // 拖拽/连接状态
    let dragNode = null;
    let dragOffset = { x: 0, y: 0 };
    let panning = false;
    let panStart = { x: 0, y: 0 };
    let canvasOffset = { x: 0, y: 0 };
    let scale = 1;
    let tempConnection = null; // 临时连接（从引脚拖出）
    let _connectionPicker = null; // 连接选择器引用
    let _rafId = null; // requestAnimationFrame ID（用于节流）
    let _dirtyConnections = false; // 标记连线是否需要更新
    let _previewAudio = null; // 音乐试听播放器

    // 触摸/指针手势状态（移动端拖拽、平移、双指缩放）
    const activePointers = new Map();
    let pinching = false;
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let pinchMidScreen = { x: 0, y: 0 };
    let pinchAnchorWorld = { x: 0, y: 0 };
    const isTouch = (typeof window !== 'undefined') && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

    // ==================== 高性能更新调度 ====================
    // 合并同一帧内的多次 updateSvgLines 调用，避免冗余的 DOM 操作
    function scheduleConnectionUpdate() {
        _dirtyConnections = true;
        if (_rafId) return; // 已有等待中的帧
        _rafId = requestAnimationFrame(() => {
            _rafId = null;
            if (_dirtyConnections) {
                _dirtyConnections = false;
                updateSvgLinesFast(); // 使用增量更新的快速版本
            }
        });
    }

    // 立即更新（用于需要同步的场景，如释放鼠标、缩放等）
    function forceUpdateConnections() {
        if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
        _dirtyConnections = false;
        updateSvgLines();
    }

    // ==================== 引脚连接选择器 ====================
    // 当拖出引脚但未命中目标时，弹出可连接的节点列表
    function showConnectionPicker(fromPin, fromDirection, clientX, clientY) {
        closeConnectionPicker(); // 先关闭已有的

        const picker = document.createElement('div');
        picker.id = 'bp-connection-picker';
        picker.className = 'bp-connection-picker';

        // 确定要查找的目标方向和类型
        const targetDirection = fromDirection === 'output' ? 'input' : 'output';
        const pinType = fromPin.type;

        // 收集所有可连接的候选目标
        const candidates = [];
        curNodes().forEach(node => {
            if (node.id === fromPin.nodeId) return; // 排除自身
            const targetPins = targetDirection === 'input' ? node.inputs : node.outputs;
            targetPins.forEach(pin => {
                // 类型必须匹配（exec/number/string等）
                if (pin.type !== pinType) return;
                // 归一化成 输出→输入，用于判断"是否就是当前这条连线"
                let outPin, inPin;
                if (fromDirection === 'output') { outPin = fromPin; inPin = pin; }
                else { outPin = pin; inPin = fromPin; }
                const toNodeId = inPin.nodeId, toPinId = inPin.id;
                const fromNodeId = outPin.nodeId, fromPinId = outPin.id;
                const sameLink = curConns().some(c => c.fromNode === fromNodeId && c.fromPin === fromPinId &&
                    c.toNode === toNodeId && c.toPin === toPinId);
                // 已经连到这里的组合不再出现（点了也不会有变化）
                if (sameLink) return;
                // 目标输入已有连接的也显示，允许替换
                const tpl = NODE_TEMPLATES[node.type];
                candidates.push({
                    node,
                    pin,
                    nodeId: node.id,
                    pinId: pin.id,
                    nodeTitle: getText(tpl.title, tpl.titleEn, tpl.titleJa),
                    pinName: getText(pin.name, pin.nameEn, pin.nameJa),
                    color: tpl.color,
                    alreadyConnected: curConns().some(c => c.toNode === toNodeId && c.toPin === toPinId)
                });
            });
        });

        if (candidates.length === 0) {
            showMessage(I18N.t('noConnectableTargets') || '🔌 没有可连接的目标节点');
            return;
        }

        // 定位：在鼠标附近显示，避免超出屏幕
        const pickerWidth = 280;
        const pickerMaxHeight = 360;
        let posX = Math.min(clientX + 12, window.innerWidth - pickerWidth - 20);
        let posY = Math.min(clientY + 12, window.innerHeight - pickerMaxHeight - 20);
        if (posY < 10) posY = clientY - 60;
        if (posX < 10) posX = clientX + 20;

        picker.style.cssText = `
            position:fixed;left:${posX}px;top:${posY}px;z-index:10001;
            background:var(--bg-card);border:1px solid var(--border-color);
            border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);
            min-width:260px;max-width:${pickerWidth}px;max-height:${pickerMaxHeight}px;
            overflow-y:auto;font-family:inherit;animation:cardAppear 0.15s ease;
        `;

        // 标题栏
        const typeColor = TYPE_COLORS[pinType] || '#999';
        const directionLabel = targetDirection === 'input'
            ? (I18N.t('designerPickTarget') || '🔌 选择目标输入')
            : (I18N.t('designerPickSource') || '🔌 选择来源输出');
        
        let html = `
            <div style="padding:10px 12px 8px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:8px;position:sticky;top:0;background:var(--bg-card);z-index:1;">
                <span style="width:10px;height:10px;border-radius:50%;background:${typeColor};border:2px solid var(--bg-card);box-shadow:0 0 4px ${typeColor};"></span>
                <span style="font-size:0.8rem;font-weight:700;color:var(--text-primary);">${directionLabel}</span>
                <span style="font-size:0.65rem;color:var(--text-muted);margin-left:auto;background:var(--bg-primary);padding:1px 6px;border-radius:4px;">${pinType}</span>
                <button id="bp-picker-close-btn" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:0 2px;line-height:1;">✕</button>
            </div>
            <div class="bp-picker-list" style="padding:6px;">
        `;

        // 搜索框
        html += `
            <input id="bp-picker-search" placeholder="${I18N.t('designerSearchNode') || '🔍 搜索节点...'}" 
                style="width:100%;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;padding:6px 10px;color:var(--text-primary);font-size:0.78rem;margin-bottom:6px;outline:none;box-sizing:border-box;" />
        `;

        // 候选项列表
        candidates.forEach((cand, idx) => {
            const connBadge = cand.alreadyConnected 
                ? `<span style="font-size:0.6rem;background:rgba(250,204,21,0.15);color:var(--accent-yellow);padding:1px 5px;border-radius:3px;margin-left:4px;">${I18N.t('designerReplace') || '替换'}</span>` 
                : '';
            html += `
                <div class="bp-picker-item" data-node-id="${cand.nodeId}" data-pin-id="${cand.pinId}" data-idx="${idx}"
                    style="display:flex;align-items:center;gap:8px;padding:7px 10px;margin-bottom:2px;border-radius:8px;cursor:pointer;transition:all 0.1s;">
                    <span style="width:8px;height:8px;border-radius:3px;background:${cand.color};flex-shrink:0;"></span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.78rem;color:var(--text-primary);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cand.nodeTitle)}${connBadge}</div>
                        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:1px;display:flex;align-items:center;gap:4px;">
                            <span style="width:6px;height:6px;border-radius:50%;background:${typeColor};"></span>
                            ${escapeHtml(cand.pinName)}
                            <span style="color:var(--border-color);">|</span>
                            ${targetDirection === 'input' ? '⬅ 输入' : '➡ 输出'}
                        </div>
                    </div>
                    <span style="color:var(--accent-green);font-size:0.9rem;opacity:0;transition:opacity 0.15s;">✓</span>
                </div>
            `;
        });

        html += '</div>';
        // 底部提示
        html += `<div style="padding:6px 12px 10px;border-top:1px solid var(--border-color);font-size:0.65rem;color:var(--text-muted);text-align:center;position:sticky;bottom:0;background:var(--bg-card);">
            ${I18N.t('pickerHint') || '点击建立连接 · 按 Esc 关闭'}
        </div>`;

        picker.innerHTML = html;
        document.body.appendChild(picker);
        _connectionPicker = picker;

        // 绑定关闭按钮
        document.getElementById('bp-picker-close-btn').onclick = () => closeConnectionPicker();

        // 搜索过滤
        const searchInput = document.getElementById('bp-picker-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.oninput = () => {
                const query = searchInput.value.toLowerCase();
                picker.querySelectorAll('.bp-picker-item').forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(query) ? '' : 'none';
                });
            };
        }

        // 候选项交互
        picker.querySelectorAll('.bp-picker-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(74,125,255,0.08)';
                item.querySelector('span:last-child').style.opacity = '1';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = '';
                item.querySelector('span:last-child').style.opacity = '0';
            });
            item.addEventListener('click', () => {
                const toNodeId = item.dataset.nodeId;
                const toPinId = item.dataset.pinId;
                const toPin = getPinByNodeIdAndId(toNodeId, toPinId);
                if (!toPin) return;

                let outPin, inPin;
                if (fromDirection === 'output') { outPin = fromPin; inPin = toPin; }
                else { outPin = toPin; inPin = fromPin; }

                addConnection(outPin, inPin, true); // force=true 允许替换已有连接
                closeConnectionPicker();
            });
        });

        // ESC 关闭
        const onKeyEsc = (e) => {
            if (e.key === 'Escape') {
                closeConnectionPicker();
                document.removeEventListener('keydown', onKeyEsc);
            }
        };
        document.addEventListener('keydown', onKeyEsc);

        // 点击外部关闭
        setTimeout(() => {
            const onOutsideClick = (e) => {
                if (_connectionPicker && !_connectionPicker.contains(e.target)) {
                    closeConnectionPicker();
                    document.removeEventListener('pointerdown', onOutsideClick);
                }
            };
            document.addEventListener('pointerdown', onOutsideClick);
        }, 0);
    }

    function closeConnectionPicker() {
        if (_connectionPicker) {
            _connectionPicker.remove();
            _connectionPicker = null;
        }
    }

    // 颜色定义
    const TYPE_COLORS = {
        exec: '#e8e8e0',      // 执行流 - 白色/灰白
        string: '#4ade80',    // 字符串 - 绿
        number: '#60a5fa',    // 数字 - 蓝
        boolean: '#f87171',   // 布尔 - 红
        character: '#c084fc', // 角色 - 紫
        choice: '#fbbf24',    // 选择 - 黄
        any: '#9ca3af'        // 任意 - 灰
    };

    function genId(prefix) {
        return `${prefix || 'node'}_${Date.now().toString(36)}_${++nextNodeId}`;
    }

    // ==================== 默认设计 ====================
    function createDefaultDesign() {
        return {
            id: 'blueprint_' + Date.now(),
            title: '',
            description: '',
            version: 2,
            variables: {
                trust: { name: I18N.t('defaultTrustName'), nameEn: 'Trust', nameJa: '信頼度', type: 'number', defaultValue: 50 },
                courage: { name: I18N.t('defaultCourageName'), nameEn: 'Courage', nameJa: '勇気', type: 'number', defaultValue: 50 }
            },
            characters: {
                narrator: { id: 'narrator', name: I18N.t('defaultNarratorName'), nameEn: 'Narrator', nameJa: 'ナレーター', icon: '✦', color: '#8b5cf6' },
                player: { id: 'player', name: I18N.t('defaultPlayerName'), nameEn: 'Player', nameJa: 'プレイヤー', icon: '👤', color: '#4a7dff' }
            },
            // 自定义函数库：{ fnId: { name, params:[...], nodes, connections, startNode } }
            // 函数体以子蓝图编写（fn_entry → 对话/旁白/变量 → fn_return）；兼容旧版 { body } JS 函数
            functions: {},
            // 音乐配置
            music: {
                globalBgm: null       // { audioId, name, size, loop: true }
            },
            nodes: [],
            connections: [],
            startNode: null
        };
    }

    // ==================== 节点模板 ====================
    const NODE_TEMPLATES = {
        event_start: {
            type: 'event_start',
            title: I18N.t('designerNodeEventStart'), titleEn: 'Game Start', titleJa: 'ゲーム開始',
            color: '#ef4444',
            inputs: [],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Then', nameJa: '実行', type: 'exec' }
            ],
            data: { eventName: 'GameStart' }
        },
        chapter_begin: {
            type: 'chapter_begin',
            title: I18N.t('designerNodeChapterBegin'), titleEn: 'Chapter Start', titleJa: '章開始',
            color: '#f97316',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' },
                { id: 'in_title', name: I18N.t('designerPinInTitle'), nameEn: 'Title', nameJa: 'タイトル', type: 'string' }
            ],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Out', nameJa: '出力', type: 'exec' }
            ],
            data: { chapterTitle: '', chapterSubtitle: '', bgm: null }
        },
        dialogue: {
            type: 'dialogue',
            title: I18N.t('designerNodeDialogue'), titleEn: 'Dialogue', titleJa: '会話',
            color: '#22c55e',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' },
                { id: 'in_character', name: I18N.t('designerPinInCharacter'), nameEn: 'Character', nameJa: 'キャラ', type: 'character' }
            ],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Out', nameJa: '出力', type: 'exec' }
            ],
            data: { text: '', textEn: '', textJa: '', sound: null }
        },
        narration: {
            type: 'narration',
            title: I18N.t('designerNodeNarration'), titleEn: 'Narration', titleJa: 'ナレーション',
            color: '#8b5cf6',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' }
            ],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Out', nameJa: '出力', type: 'exec' }
            ],
            data: { text: '', textEn: '', textJa: '', sound: null }
        },
        illustration: {
            type: 'illustration',
            title: I18N.t('designerNodeIllustration'), titleEn: 'Illustration', titleJa: 'イラスト',
            color: '#14b8a6',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' }
            ],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Out', nameJa: '出力', type: 'exec' }
            ],
            // icon: Emoji 或 'ur-img:<assetId>' 图片引用（与角色/故事图标同一套素材系统）
            // caption*：图下方的说明文字；size: large=整幅大图 / medium=居中中图
            data: { icon: '🖼️', caption: '', captionEn: '', captionJa: '', size: 'large' }
        },
        choice: {
            type: 'choice',
            title: I18N.t('designerNodeChoice'), titleEn: 'Choice', titleJa: '選択',
            color: '#eab308',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' }
            ],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinChoice1'), nameEn: 'Choice 1', nameJa: '選択肢1', type: 'exec', tag: 'neutral' }
            ],
            data: { choices: [{ text: I18N.t('designerPinChoice1'), textEn: 'Choice 1', textJa: '選択肢1', tag: 'neutral' }] }
        },
        condition: {
            type: 'condition',
            title: I18N.t('designerNodeCondition'), titleEn: 'Condition', titleJa: '条件',
            color: '#ec4899',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' },
                { id: 'in_val', name: I18N.t('designerPinInVal'), nameEn: 'Value', nameJa: '値', type: 'number' }
            ],
            outputs: [
                { id: 'out_true', name: I18N.t('designerPinOutTrue'), nameEn: 'True', nameJa: '真', type: 'exec' },
                { id: 'out_false', name: I18N.t('designerPinOutFalse'), nameEn: 'False', nameJa: '偽', type: 'exec' }
            ],
            data: {
                operator: '>=',
                leftType: 'variable',   // 'variable' | 'direct'
                leftVariable: 'trust',
                leftDirect: 50,
                leftPinConnected: false,
                rightType: 'direct',    // 'variable' | 'direct'
                rightVariable: 'trust',
                rightDirect: 30,
                compareWith: 'direct'   // 'variable' | 'direct' | 'pin'
            }
        },
        get_variable: {
            type: 'get_variable',
            title: I18N.t('designerNodeGetVar'), titleEn: 'Get Variable', titleJa: '変数取得',
            color: '#3b82f6',
            inputs: [],
            outputs: [
                { id: 'out_value', name: I18N.t('designerPinOutValue'), nameEn: 'Value', nameJa: '値', type: 'number' }
            ],
            data: { variableName: 'trust' }
        },
        set_variable: {
            type: 'set_variable',
            title: I18N.t('designerNodeSetVar'), titleEn: 'Set Variable', titleJa: '変数設定',
            color: '#06b6d4',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' },
                { id: 'in_value', name: I18N.t('designerPinInValue'), nameEn: 'Value', nameJa: '値', type: 'number' }
            ],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Out', nameJa: '出力', type: 'exec' }
            ],
            data: { variableName: 'trust', operation: 'add', operandValue: 10 } // add/sub/mul/div/set + 操作数值
        },
        end_chapter: {
            type: 'end_chapter',
            title: I18N.t('designerNodeEndChapter'), titleEn: 'End Chapter', titleJa: '章終了',
            color: '#64748b',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' }
            ],
            outputs: [
                { id: 'out_next', name: I18N.t('designerPinOutNext'), nameEn: 'Next', nameJa: '次', type: 'exec' }
            ],
            data: { endingType: 'good', endingTitle: '', endingDesc: '' }
        },
        end_game: {
            type: 'end_game',
            title: I18N.t('designerNodeEndGame'), titleEn: 'Ending', titleJa: 'エンディング',
            color: '#dc2626',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' }
            ],
            outputs: [],
            data: { endingType: 'good', endingTitle: '', endingDesc: '', rewardSeeds: 3 }
        },
        character_info: {
            type: 'character_info',
            title: I18N.t('designerNodeCharInfo'), titleEn: 'Character Info', titleJa: 'キャラ情報',
            color: '#a855f7',
            inputs: [],
            outputs: [
                { id: 'out_character', name: I18N.t('designerPinInCharacter'), nameEn: 'Character', nameJa: 'キャラ', type: 'character' }
            ],
            data: { characterId: 'player' }
        },
        function: {
            type: 'function',
            title: I18N.t('designerNodeFunction'), titleEn: 'Function', titleJa: '関数',
            color: '#14b8a6',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' }
            ],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Out', nameJa: '出力', type: 'exec' }
            ],
            data: { fnId: '', args: {}, resultVars: {} } // args: {参数名:{t:'var'|'direct', v}}, resultVars: {返回值名:目标变量}
        },
        input: {
            type: 'input',
            title: I18N.t('designerNodeInput'), titleEn: 'Input', titleJa: '入力',
            color: '#0ea5e9',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' }
            ],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Out', nameJa: '出力', type: 'exec' }
            ],
            data: { variable: 'player_name', inputType: 'text', prompt: '', promptEn: '', promptJa: '' }
        },
        // ── 函数子蓝图专用节点（仅在函数画布中使用） ──
        fn_entry: {
            type: 'fn_entry',
            title: I18N.t('designerNodeFnEntry'), titleEn: 'Function Entry', titleJa: '関数開始',
            color: '#14b8a6',
            inputs: [],
            outputs: [
                { id: 'out_exec', name: I18N.t('designerPinOutExec'), nameEn: 'Out', nameJa: '出力', type: 'exec' }
            ],
            data: {} // 参数列表存放在函数定义 fnDef.params 上，在属性面板编辑
        },
        fn_return: {
            type: 'fn_return',
            title: I18N.t('designerNodeFnReturn'), titleEn: 'Return', titleJa: '戻り値',
            color: '#f43f5e',
            inputs: [
                { id: 'in_exec', name: I18N.t('designerPinInExec'), nameEn: 'In', nameJa: '入力', type: 'exec' }
            ],
            outputs: [],
            data: { value: '', values: {} } // value=旧版返回值表达式（遗留）；values={输出变量名: 取值来源（参数/变量名）}
        }
    };

    // ==================== 节点操作 ====================
    function createNode(type, x, y) {
        const tpl = NODE_TEMPLATES[type];
        if (!tpl) return null;
        const id = genId('node');
        const node = {
            id,
            type: tpl.type,
            x: x || 100 + Math.random() * 100,
            y: y || 100 + Math.random() * 100,
            width: 220,
            data: JSON.parse(JSON.stringify(tpl.data)),
            // key 保留模板中的语义角色(如 out_exec / out_true / out_false)，id 唯一化用于连线
            inputs: tpl.inputs.map(p => ({ ...p, key: p.id, id: genId('pin'), nodeId: id })),
            outputs: tpl.outputs.map(p => ({ ...p, key: p.id, id: genId('pin'), nodeId: id }))
        };
        return node;
    }

    function addNode(type) {
        // 计算画布可视区的中心世界坐标，新节点出现在屏幕中央
        const canvas = document.getElementById('bp-canvas');
        const cw = canvas ? canvas.clientWidth : window.innerWidth;
        const ch = canvas ? canvas.clientHeight : window.innerHeight;
        const x = (cw / 2 - canvasOffset.x) / scale - 110;
        const y = (ch / 2 - canvasOffset.y) / scale - 30;
        const node = createNode(type, x, y);
        if (!node) return;
        curNodes().push(node);
        if (!inFnMode() && !currentDesign.startNode && type === 'event_start') {
            currentDesign.startNode = node.id;
        }
        selectedNodeId = node.id;
        render();
    }

    function deleteNode(nodeId) {
        const nd = curNodes().find(n => n.id === nodeId);
        if (inFnMode()) {
            if (nd && nd.type === 'fn_entry') return; // 函数入口不可删除
            const fn = curFnDef();
            if (fn && fn.startNode === nodeId) {
                const entry = curNodes().find(n => n.type === 'fn_entry' && n.id !== nodeId);
                fn.startNode = entry ? entry.id : null;
            }
        } else {
            if (nodeId === currentDesign.startNode) currentDesign.startNode = null;
        }
        const nodes = curNodes().filter(n => n.id !== nodeId);
        const conns = curConns().filter(c => c.fromNode !== nodeId && c.toNode !== nodeId);
        if (inFnMode()) {
            const fn = curFnDef();
            fn.nodes = nodes;
            fn.connections = conns;
        } else {
            currentDesign.nodes = nodes;
            currentDesign.connections = conns;
        }
        if (selectedNodeId === nodeId) selectedNodeId = null;
        render();
    }

    function selectNode(nodeId) {
        selectedNodeId = nodeId;
        render();
    }

    // 轻量选择：仅更新选中边框与属性/细节面板，不重建整棵 DOM。
    // 关键：避免拖拽开始时调用 render()（render 会执行 container.innerHTML='' 并重建所有节点），
    // 否则正在拖拽的节点元素被销毁，dragNode.el 变成游离元素，导致节点无法跟随鼠标移动。
    function refreshPropertyPanel() {
        const container = document.getElementById('designer-canvas');
        if (!container) return;
        const old = container.querySelector('.bp-property-panel');
        if (old) old.remove();
        if (selectedNodeId) {
            const panel = createPropertyPanel();
            container.appendChild(panel);
            setupPanelResize(panel, 'right'); // 重建后同样恢复宽度与把手
            // 面板是新 DOM 元素，需要绑定 input/change/click 等事件才能保存数据
            // 注意：bindEvents 内部用 querySelectorAll 查找表单元素，旧面板已被 remove，无重复绑定
            bindEvents();
        }
    }

    function selectNodeLight(nodeId) {
        const prev = selectedNodeId;
        selectedNodeId = nodeId;
        // 协作：告诉别人「我选中了这个节点」，并检查是不是有人也在改它
        reportPresence(true);
        warnIfBusy();
        if (prev && prev !== nodeId) {
            const prevEl = document.querySelector(`.bp-node[data-node-id="${prev}"]`);
            if (prevEl) prevEl.style.borderColor = 'transparent';
        }
        if (nodeId) {
            const curEl = document.querySelector(`.bp-node[data-node-id="${nodeId}"]`);
            if (curEl) curEl.style.borderColor = '#fff';
        }
        refreshPropertyPanel();
    }

    // ==================== 连接操作 ====================
    function canConnect(fromPin, toPin) {
        if (!fromPin || !toPin) return false;
        if (fromPin.type !== toPin.type) return false;
        if (fromPin.nodeId === toPin.nodeId) return false;
        // 完全相同的连线已经存在 → 无需重复建立（调用方据此判定"无变化"）
        const dup = curConns().some(c =>
            c.fromNode === fromPin.nodeId && c.fromPin === fromPin.id &&
            c.toNode === toPin.nodeId && c.toPin === toPin.id);
        if (dup) return false;
        // ⚠️ 关键：输出引脚已被占用 / 目标输入引脚已被占用，都**不再**在这里拦截。
        // 以前这里 return false 会导致「引线连了一个节点后想改接到另一个节点」直接失败；
        // 现在统一交给 addConnection，以「改接」语义替换旧连线（等价于 UE 蓝图的重新连线）。
        return true;
    }

    // 建立连线。force 参数保留仅为兼容旧调用点：
    // 现在「改接」（输出/输入任一端已占用）是默认行为，不再需要 force 才能替换。
    function addConnection(fromPin, toPin, force) {
        // 基础校验始终执行
        if (!fromPin || !toPin) return false;
        if (fromPin.type !== toPin.type) return false;
        if (fromPin.nodeId === toPin.nodeId) return false;

        const setConns = (arr) => {
            if (inFnMode()) curFnDef().connections = arr; else currentDesign.connections = arr;
        };

        // 完全相同的连线已存在 → 什么都不做，但按成功处理（避免残留幽灵虚线）
        const dup = curConns().some(c =>
            c.fromNode === fromPin.nodeId && c.fromPin === fromPin.id &&
            c.toNode === toPin.nodeId && c.toPin === toPin.id);
        if (dup) { tempConnection = null; return true; }

        let conns = curConns();
        let replacedCount = 0;

        // exec 类型：一个输出引脚最多只有一条出线。
        // 想从「已连着 A」的输出改接到 B → 先把旧的 A 那条摘掉（改接行为）。
        if (fromPin.type === 'exec') {
            const olds = conns.filter(c => c.fromNode === fromPin.nodeId && c.fromPin === fromPin.id);
            if (olds.length) {
                replacedCount += olds.length;
                conns = conns.filter(c => !olds.includes(c));
            }
        }

        // 目标输入引脚已有连线 → 一并摘掉（一个输入同样只接一条来源）
        const olds2 = conns.filter(c => c.toNode === toPin.nodeId && c.toPin === toPin.id);
        if (olds2.length) {
            replacedCount += olds2.length;
            conns = conns.filter(c => !olds2.includes(c));
        }

        conns.push({
            id: genId('conn'),
            fromNode: fromPin.nodeId,
            fromPin: fromPin.id,
            toNode: toPin.nodeId,
            toPin: toPin.id
        });
        setConns(conns);

        // 连接成功后先清空临时连线，否则 render() 里 `if (tempConnection)` 会把虚线也画出来，
        // 且后续指针事件把 tempConnection 置空后不会再次渲染 → 残留"幽灵虚线"
        tempConnection = null;
        render();
        if (replacedCount > 0) {
            showMessage('🔄 ' + (I18N.t('designerConnReplaced') || '已改接：旧的连线已自动替换'));
        }
        return true;
    }

    function deleteConnection(connId) {
        const kept = curConns().filter(c => c.id !== connId);
        if (inFnMode()) curFnDef().connections = kept; else currentDesign.connections = kept;
        render();
    }

    // ==================== 打开设计器 ====================
    function open(existingDesign, communityCtx) {
        showOverlay();
        // 协作上下文（来自 COMMUNITY.openSharedInDesigner）：{ id, version }
        _community = (communityCtx && communityCtx.id) ? { id: communityCtx.id, version: communityCtx.version || 1 } : null;
        registerCommunityBridge();
        if (existingDesign) {
            currentDesign = normalizeDesign(existingDesign);
        } else {
            currentDesign = createDefaultDesign();
            const startNode = createNode('event_start', 50, 200);
            const chapterNode = createNode('chapter_begin', 320, 200);
            const dialogueNode = createNode('dialogue', 600, 200);
            const endNode = createNode('end_game', 900, 200);

            currentDesign.nodes.push(startNode, chapterNode, dialogueNode, endNode);
            currentDesign.startNode = startNode.id;

            const sOut = startNode.outputs.find(p => p.type === 'exec');
            const cIn = chapterNode.inputs.find(p => p.type === 'exec');
            const cOut = chapterNode.outputs.find(p => p.type === 'exec');
            const dIn = dialogueNode.inputs.find(p => p.type === 'exec');
            const dOut = dialogueNode.outputs.find(p => p.type === 'exec');
            const eIn = endNode.inputs.find(p => p.type === 'exec');
            currentDesign.connections = [];
            if (sOut && cIn) currentDesign.connections.push({ id: genId('conn'), fromNode: startNode.id, fromPin: sOut.id, toNode: chapterNode.id, toPin: cIn.id });
            if (cOut && dIn) currentDesign.connections.push({ id: genId('conn'), fromNode: chapterNode.id, fromPin: cOut.id, toNode: dialogueNode.id, toPin: dIn.id });
            if (dOut && eIn) currentDesign.connections.push({ id: genId('conn'), fromNode: dialogueNode.id, fromPin: dOut.id, toNode: endNode.id, toPin: eIn.id });
        }
        selectedNodeId = currentDesign.startNode;
        render();
        // 移动端自动适应屏幕，避免节点超出可视区域
        if (isTouch) requestAnimationFrame(fitView);
        // 协作模式：上报自己的指针 / 订阅别人的指针（非协作时 startPresence 直接返回）
        startPresence();
    }

    // ==================== 蓝图 JSON 格式 v3（紧凑存储格式）====================
    // 目标：手动编写/阅读 blueprint JSON 时少写繁琐内容，冗余信息由加载时自动补全。
    // 相比 v2 的简化点：
    //   1. nodes[].inputs / nodes[].outputs / nodes[].width —— 不再存储，
    //      加载时从 NODE_TEMPLATES 按 node.type 自动重建（引脚 id 重新生成，连线用语义 key 引用）
    //   2. connections[].id —— 不再存储；{ fromNode, fromPin, toNode, toPin }（随机 pin id）
    //      简化为 { from: "nodeId:pinKey", to: "nodeId:pinKey" }
    //   3. 三语文本（text/textEn/textJa、choice.text*、nameEn/nameJa）—— 只写一种语言即可，
    //      其余自动复制；choices 支持纯字符串数组简写
    //   4. variables —— 支持数字/布尔/字符串简写（默认 number 类型）；对象字段 name/type/default/hud 均可省
    //   5. characters —— id（=对象 key）、nameEn/nameJa、默认 icon/color 均可省
    //   6. 音频对象 —— loop 为默认值时省略
    // v2 格式（含 inputs/outputs 完整引脚）仍可读取，加载时统一归一化。

    // 将任意存储格式（v2 / v3）归一化为完整内部格式
    function normalizeDesign(raw) {
        if (!raw || typeof raw !== 'object') raw = {};
        const d = JSON.parse(JSON.stringify(raw));
        d.version = 3;
        d.variables = d.variables || {};
        d.characters = d.characters || {};
        d.functions = d.functions || {};
        d.music = d.music || { globalBgm: null };
        d.nodes = Array.isArray(d.nodes) ? d.nodes : [];
        d.connections = Array.isArray(d.connections) ? d.connections : [];
        d.storyIcon = d.storyIcon || '✨'; // 故事图标（自己创建的蓝图默认星星）
        // 故事梗概（显示在故事卡上，可留空）
        d.description = (typeof d.description === 'string') ? d.description : '';
        // 自定义主题色（空字符串 = 用默认色；只接受 #RRGGBB）
        d.themeColor = (typeof d.themeColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(d.themeColor))
            ? d.themeColor.toLowerCase() : '';
        if (d.music && d.music.globalBgm && d.music.globalBgm.loop === undefined) d.music.globalBgm.loop = true;

        // ── 1. 变量归一化 ──
        // 支持简写：数字/布尔/字符串 → 类型推断；对象字段 name/type/default(defaultValue)/hud(showOnHud)
        const vars = {};
        Object.entries(d.variables).forEach(([key, v]) => {
            let obj;
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                obj = v;
            } else {
                if (typeof v === 'boolean') obj = { type: 'boolean', defaultValue: v };
                else if (typeof v === 'string') obj = { type: 'string', defaultValue: v };
                else obj = { type: 'number', defaultValue: v ?? 0 }; // 数字或 null/undefined
            }
            const type = obj.type || 'number';
            let def = obj.defaultValue !== undefined ? obj.defaultValue : obj.default;
            if (def === undefined) {
                def = type === 'boolean' ? false : (type === 'string' ? '' : 0);
            }
            vars[key] = {
                name: obj.name || key,
                nameEn: obj.nameEn || obj.name || key,
                nameJa: obj.nameJa || obj.name || key,
                type,
                defaultValue: def,
                showOnHud: obj.hud !== undefined ? !!obj.hud : (obj.showOnHud !== undefined ? !!obj.showOnHud : true)
            };
        });
        d.variables = vars;

        // 输入节点用：变量键集合 + 显示名→键别名 + 默认目标变量（没有变量时才回退 player_name）
        const varKeys = Object.keys(vars);
        const varAlias = {};
        varKeys.forEach(k => {
            const v = vars[k];
            [v.name, v.nameEn, v.nameJa].forEach(n => { if (n && varAlias[n] === undefined) varAlias[n] = k; });
        });
        const varCtx = { keys: varKeys, alias: varAlias, defKey: varKeys[0] || 'player_name' };

        // ── 1.5 函数归一化 ──
        // 图函数：{ name, params, nodes, connections, startNode }（函数体 = 子蓝图，fn_entry → ... → fn_return）
        // 旧式函数：{ name, params, returns, body }（body 非空 → JS 函数，向后兼容）
        // rawFnOuts：原始函数 outputs 预扫描 —— 函数体内的嵌套 function 节点也要按被调函数重建动态输出引脚
        const rawFnOuts = {};
        Object.entries(d.functions).forEach(([id, fn]) => {
            if (fn && typeof fn === 'object' && typeof fn.body !== 'string' && Array.isArray(fn.outputs)) {
                rawFnOuts[id] = (Array.isArray(fn.outputs) ? fn.outputs : []).map(sanitizeIdent).filter(Boolean);
            }
        });
        Object.entries(d.functions).forEach(([id, fn]) => {
            if (!fn || typeof fn !== 'object') { delete d.functions[id]; return; }
            const clean = arr => (Array.isArray(arr) ? arr.map(sanitizeIdent).filter(Boolean) : []);
            if (typeof fn.body === 'string' && fn.body.trim() !== '') {
                d.functions[id] = {
                    name: fn.name || id,
                    params: clean(fn.params),
                    returns: clean(fn.returns),
                    body: fn.body
                };
                return;
            }
            const res = normalizeNodeList(Array.isArray(fn.nodes) ? fn.nodes : [], rawFnOuts, varCtx);
            let startNode = (res.nodeById[fn.startNode] && res.nodeById[fn.startNode].type === 'fn_entry')
                ? fn.startNode : null;
            if (!startNode) {
                const entry = res.list.find(n => n.type === 'fn_entry');
                if (entry) startNode = entry.id;
            }
            if (!startNode) {
                // 无入口节点：自动补一个 fn_entry
                const entry = createNode('fn_entry', 80, 120);
                res.list.unshift(entry);
                res.nodeById[entry.id] = entry;
                startNode = entry.id;
            }
            d.functions[id] = {
                name: fn.name || id,
                params: clean(fn.params),
                outputs: clean(fn.outputs), // 输出变量列表（fn_return 面板编辑；主蓝图函数节点按此生成输出引脚）
                nodes: res.list,
                connections: normalizeConnList(fn.connections, res.nodeById),
                startNode
            };
            // fn_return 值绑定清理：只保留 outputs 中的键
            if (d.functions[id].outputs.length) {
                const retNode = res.list.find(n => n.type === 'fn_return');
                if (retNode) {
                    const src = (retNode.data && retNode.data.values) || {};
                    const values = {};
                    d.functions[id].outputs.forEach(o => { values[o] = String(src[o] || ''); });
                    retNode.data.values = values;
                }
            }
        });

        // ── 2. 角色归一化 ──
        Object.entries(d.characters).forEach(([key, c]) => {
            if (!c || typeof c !== 'object') c = { name: c || key }; // 支持字符串简写 { "alice": "艾丽丝" }
            // 表情素材库：{ 表情名: emoji 或 'ur-img:图片id' }（非法项剔除）
            const expressions = {};
            if (c.expressions && typeof c.expressions === 'object') {
                Object.entries(c.expressions).forEach(([en, ev]) => {
                    if (en && ev && (typeof ev === 'string')) expressions[String(en)] = ev;
                });
            }
            d.characters[key] = {
                id: c.id || key,
                name: c.name || key,
                nameEn: c.nameEn || c.name || key,
                nameJa: c.nameJa || c.name || key,
                icon: c.icon || '👤',
                color: c.color || '#4a7dff',
                expressions
            };
        });

        // ── 3. 节点归一化（主蓝图；函数子蓝图由 normalizeNodeList 处理） ──
        // fnOutsMap：函数定义 outputs → 主蓝图 function 节点据此重建输出引脚（须在函数归一化之后）
        const fnOutsMap = {};
        Object.entries(d.functions).forEach(([id, fn]) => {
            if (fn && typeof fn === 'object' && typeof fn.body !== 'string' && Array.isArray(fn.outputs)) fnOutsMap[id] = fn.outputs;
        });
        const mainRes = normalizeNodeList(d.nodes, fnOutsMap, varCtx);
        d.nodes = mainRes.list;
        d.connections = normalizeConnList(d.connections, mainRes.nodeById);

        return d;
    }

    // 节点列表归一化（主蓝图与函数子蓝图共用）：
    // 引脚重建（v3 无 pins → 从模板重建；v2 补 key/nodeId）、三语/默认值补全、自动布局。
    // 返回 { list: 过滤后的有效节点, nodeById }
    function normalizeNodeList(list, fnOutsMap, varCtx) {
        const nodeById = {};
        let autoIndex = 0;
        list.forEach(node => {
            if (!node || typeof node !== 'object' || !node.id) return;
            const tpl = NODE_TEMPLATES[node.type];
            if (!tpl) return; // 未知类型节点保留原样，避免数据丢失

            // v3 无 inputs/outputs → 从模板重建；v2 有 → 补齐 key/nodeId 并去重
            if (!Array.isArray(node.inputs) || node.inputs.length === 0 && tpl.inputs.length > 0) {
                node.inputs = tpl.inputs.map(p => ({ ...p, key: p.id, id: genId('pin'), nodeId: node.id }));
            } else {
                node.inputs = node.inputs.map(p => ({ ...p, key: p.key || p.id, nodeId: node.id }));
            }
            if (!Array.isArray(node.outputs) || node.outputs.length === 0 && tpl.outputs.length > 0) {
                node.outputs = tpl.outputs.map(p => ({ ...p, key: p.id, id: genId('pin'), nodeId: node.id }));
            } else {
                node.outputs = node.outputs.map(p => ({ ...p, key: p.key || p.id, nodeId: node.id }));
            }

            node.width = node.width || 220;
            // x/y 缺省时自动排布（横向流式堆叠）
            if (typeof node.x !== 'number') node.x = 80 + (autoIndex % 5) * 260;
            if (typeof node.y !== 'number') node.y = 120 + Math.floor(autoIndex / 5) * 220;
            autoIndex++;

            node.data = node.data || {};

            // 三语文本补全
            if ((node.type === 'dialogue' || node.type === 'narration') && node.data.text) {
                if (node.data.textEn === undefined) node.data.textEn = node.data.text;
                if (node.data.textJa === undefined) node.data.textJa = node.data.text;
            }
            if (node.type === 'dialogue' && !node.data.characterId) node.data.characterId = 'narrator';
            // 插图：默认图标 / 说明三语补全 / 尺寸兜底
            if (node.type === 'illustration') {
                if (!node.data.icon) node.data.icon = '🖼️';
                if (node.data.caption) {
                    if (node.data.captionEn === undefined) node.data.captionEn = node.data.caption;
                    if (node.data.captionJa === undefined) node.data.captionJa = node.data.caption;
                }
                if (node.data.size !== 'medium') node.data.size = 'large';
            }
            if (node.type === 'function') {
                node.data.fnId = node.data.fnId || '';
                node.data.args = node.data.args || {};
                node.data.resultVars = node.data.resultVars || {};
                // 输出引脚对齐函数定义 outputs：out_exec + 每个输出变量一个 data 引脚（out_<名>）
                const outs = (fnOutsMap && fnOutsMap[node.data.fnId]) || [];
                const execPins = (node.outputs || []).filter(p => p.key === 'out_exec');
                node.outputs = execPins.concat(outs.map(n => ({
                    id: genId('pin'), key: 'out_' + n, name: n, nameEn: n, nameJa: n, type: 'data', nodeId: node.id
                })));
            }
            if (node.type === 'input') {
                if (!node.data.variable) {
                    // 没指定目标变量时，默认落到设计里的第一个变量（之前硬编码 player_name，容易写到一个看不见的变量上）
                    node.data.variable = (varCtx && varCtx.defKey) || 'player_name';
                } else if (varCtx && varCtx.keys.indexOf(node.data.variable) === -1) {
                    // 允许直接写显示名（如「名字」）或旧键名——能对上就解析成正式的变量键
                    const resolved = varCtx.alias[node.data.variable];
                    if (resolved) node.data.variable = resolved;
                }
                node.data.inputType = node.data.inputType === 'number' ? 'number' : 'text';
                if (node.data.promptEn === undefined) node.data.promptEn = node.data.prompt || '';
                if (node.data.promptJa === undefined) node.data.promptJa = node.data.prompt || '';
            }
            if (node.type === 'fn_return') {
                if (typeof node.data.value !== 'string') node.data.value = '';
                if (!node.data.values || typeof node.data.values !== 'object') node.data.values = {};
            }
            if (node.type === 'choice' && Array.isArray(node.data.choices)) {
                // 选项数量与输出引脚对齐（模板默认 1 个，多选项由 UI 动态添加，此处补齐）
                while (node.outputs.length < node.data.choices.length) {
                    const i = node.outputs.length;
                    node.outputs.push({ id: genId('pin'), name: `选项${i + 1}`, nameEn: `Choice ${i + 1}`, nameJa: `選択肢${i + 1}`, type: 'exec', nodeId: node.id, tag: 'neutral' });
                }
                // 统一 key：首个 out_exec，其余 choice_<idx>（v3 连线以此引用）
                node.outputs.forEach((p, i) => { p.key = i === 0 ? 'out_exec' : `choice_${i}`; });
                node.data.choices = node.data.choices.map(ch => {
                    if (typeof ch === 'string') {
                        return { text: ch, textEn: ch, textJa: ch, tag: 'neutral' };
                    }
                    if (ch && typeof ch === 'object') {
                        if (ch.textEn === undefined) ch.textEn = ch.text || '';
                        if (ch.textJa === undefined) ch.textJa = ch.text || '';
                        if (!ch.tag) ch.tag = 'neutral';
                        return ch;
                    }
                    return { text: '', textEn: '', textJa: '', tag: 'neutral' };
                });
            }

            // 音频默认值
            if (node.data.sound && node.data.sound.loop === undefined) node.data.sound.loop = false;
            if (node.data.bgm && node.data.bgm.loop === undefined) node.data.bgm.loop = true;

            nodeById[node.id] = node;
        });
        // 过滤掉无效节点
        return { list: list.filter(n => n && typeof n === 'object' && n.id && NODE_TEMPLATES[n.type]), nodeById };
    }

    // 连接归一化（主蓝图与函数子蓝图共用）：v3 "n1:out_exec" / v2 pin-id 两种写法
    function resolvePinInNode(node, pinRef) {
        if (!node || !pinRef) return null;
        const all = [...(node.inputs || []), ...(node.outputs || [])];
        return all.find(p => p.id === pinRef) || all.find(p => p.key === pinRef) || null;
    }

    function normalizeConnList(conns, nodeById) {
        return (conns || []).map(c => {
            if (!c || typeof c !== 'object') return null;
            // v3: { from: "n1:out_exec", to: "n2:in_exec" }
            if (c.from && c.to) {
                const [fn, fp] = String(c.from).split(':');
                const [tn, tp] = String(c.to).split(':');
                const fromNode = nodeById[fn], toNode = nodeById[tn];
                const fromPin = resolvePinInNode(fromNode, fp);
                const toPin = resolvePinInNode(toNode, tp);
                if (!fromNode || !toNode || !fromPin || !toPin) return null;
                return { id: genId('conn'), fromNode: fn, fromPin: fromPin.id, toNode: tn, toPin: toPin.id };
            }
            // v2: { id, fromNode, fromPin, toNode, toPin }（fromPin/toPin 为 pin 唯一 id）
            if (c.fromNode && c.toNode && c.fromPin && c.toPin) {
                const fromPin = resolvePinInNode(nodeById[c.fromNode], c.fromPin);
                const toPin = resolvePinInNode(nodeById[c.toNode], c.toPin);
                return {
                    id: c.id || genId('conn'),
                    fromNode: c.fromNode,
                    fromPin: (fromPin || { id: c.fromPin }).id,
                    toNode: c.toNode,
                    toPin: (toPin || { id: c.toPin }).id
                };
            }
            return null;
        }).filter(Boolean);
    }

    // 将完整内部格式压缩为 v3 紧凑存储格式
    function serializeDesign(design) {
        const d = design || {};
        const out = {
            id: d.id,
            title: d.title,
            description: d.description || undefined,
            version: 3,
            storyIcon: d.storyIcon || '✨',
            themeColor: d.themeColor || undefined,
            communityId: d.communityId || undefined, // 局域网社区：该设计在服务器上的故事 ID（分享/协作时写入）
            variables: {},
            characters: {},
            music: d.music && d.music.globalBgm ? { globalBgm: { ...d.music.globalBgm } } : null,
            nodes: [],
            connections: [],
            startNode: d.startNode
        };
        if (out.music && out.music.globalBgm && out.music.globalBgm.loop === true) delete out.music.globalBgm.loop;

        // ── variables ──
        Object.entries(d.variables || {}).forEach(([key, v]) => {
            if (!v || typeof v !== 'object') { out.variables[key] = v ?? 0; return; }
            const sameName = v.name === key;
            const triSame = v.nameEn === v.name && v.nameJa === v.name;
            // 最简形式：number 类型 + 未改名 + 三语一致 + HUD 默认开启 → 只写默认值
            if (v.type === 'number' && sameName && triSame && v.showOnHud !== false) {
                out.variables[key] = v.defaultValue ?? 0;
                return;
            }
            const vout = {};
            if (!sameName) vout.name = v.name;
            if (v.type && v.type !== 'number') vout.type = v.type;
            if (v.defaultValue !== undefined && v.defaultValue !== (v.type === 'boolean' ? false : (v.type === 'string' ? '' : 0))) vout.default = v.defaultValue;
            if (v.showOnHud === false) vout.hud = false;
            out.variables[key] = vout;
        });

        // ── characters ──
        Object.entries(d.characters || {}).forEach(([key, c]) => {
            if (!c || typeof c !== 'object') { out.characters[key] = {}; return; }
            const cout = {};
            if (c.name && c.name !== key) cout.name = c.name;
            if (c.icon && c.icon !== '👤') cout.icon = c.icon;
            if (c.color && c.color !== '#4a7dff') cout.color = c.color;
            if (c.expressions && Object.keys(c.expressions).length) cout.expressions = { ...c.expressions };
            out.characters[key] = cout;
        });

        // ── functions（函数库：图函数序列化子蓝图；旧式 body 函数原样保留） ──
        if (d.functions && Object.keys(d.functions).length) {
            out.functions = {};
            Object.entries(d.functions).forEach(([id, fn]) => {
                if (!fn || typeof fn !== 'object') return;
                if (typeof fn.body === 'string' && fn.body.trim() !== '') {
                    out.functions[id] = {
                        name: fn.name || id,
                        params: (fn.params || []).slice(),
                        returns: (fn.returns || []).slice(),
                        body: fn.body
                    };
                    return;
                }
                const fnNodes = Array.isArray(fn.nodes) ? fn.nodes : [];
                const fout = {
                    name: fn.name || id,
                    params: (fn.params || []).slice(),
                    nodes: fnNodes.map(compactNodeV3).filter(Boolean),
                    connections: serializeConnList(fnNodes, fn.connections || []),
                    startNode: fn.startNode
                };
                if (Array.isArray(fn.outputs) && fn.outputs.length) fout.outputs = fn.outputs.slice();
                out.functions[id] = fout;
            });
            if (Object.keys(out.functions).length === 0) delete out.functions;
        }

        // ── nodes ──
        (d.nodes || []).forEach(node => {
            const nout = compactNodeV3(node);
            if (nout) out.nodes.push(nout);
        });

        // ── connections ──
        out.connections = serializeConnList(d.nodes || [], d.connections || []);

        return out;
    }

    // 单节点 → v3 紧凑格式（主蓝图与函数子蓝图共用；不存 inputs/outputs/width）
    function compactNodeV3(node) {
        const nout = { id: node.id, type: node.type };
        if (typeof node.x === 'number') nout.x = node.x;
        if (typeof node.y === 'number') nout.y = node.y;
        const data = node.data || {};

        // data 精简：剔除 UI 临时字段
        const cleanData = (src) => {
            const o = {};
            Object.entries(src || {}).forEach(([k, v]) => {
                if (k === '_musicCtrlId') return;
                if (v === undefined) return;
                o[k] = v;
            });
            return o;
        };

        if (node.type === 'dialogue' || node.type === 'narration') {
            const dd = {};
            if (node.type === 'dialogue' && data.characterId && data.characterId !== 'narrator') dd.characterId = data.characterId;
            if (data.text !== undefined) dd.text = data.text;
            if (data.textEn !== undefined && data.textEn !== data.text) dd.textEn = data.textEn;
            if (data.textJa !== undefined && data.textJa !== data.text) dd.textJa = data.textJa;
            if (data.sound) dd.sound = { ...data.sound };
            if (dd.sound && dd.sound.loop === false) delete dd.sound.loop;
            if (Object.keys(dd).length) nout.data = dd;
        } else if (node.type === 'illustration') {
            // 插图：只存 icon / 说明三语 / 尺寸（默认值省略，保持 v3 紧凑）
            const dd = {};
            if (data.icon) dd.icon = data.icon;
            if (data.caption !== undefined) dd.caption = data.caption;
            if (data.captionEn !== undefined && data.captionEn !== data.caption) dd.captionEn = data.captionEn;
            if (data.captionJa !== undefined && data.captionJa !== data.caption) dd.captionJa = data.captionJa;
            if (data.size && data.size !== 'large') dd.size = data.size;
            if (Object.keys(dd).length) nout.data = dd;
        } else if (node.type === 'function') {
            const dd = {};
            if (data.fnId) dd.fnId = data.fnId;
            if (data.args && Object.keys(data.args).length) dd.args = JSON.parse(JSON.stringify(data.args));
            if (data.resultVar) dd.resultVar = data.resultVar;
            if (data.resultVars && Object.keys(data.resultVars).length) dd.resultVars = JSON.parse(JSON.stringify(data.resultVars));
            if (Object.keys(dd).length) nout.data = dd;
        } else if (node.type === 'input') {
            const dd = {};
            if (data.variable) dd.variable = data.variable;
            if (data.inputType && data.inputType !== 'text') dd.inputType = data.inputType;
            if (data.prompt) dd.prompt = data.prompt;
            if (data.promptEn && data.promptEn !== data.prompt) dd.promptEn = data.promptEn;
            if (data.promptJa && data.promptJa !== data.prompt) dd.promptJa = data.promptJa;
            if (Object.keys(dd).length) nout.data = dd;
        } else if (node.type === 'choice') {
            if (Array.isArray(data.choices)) {
                const allSimple = data.choices.every(ch =>
                    ch && typeof ch === 'object' &&
                    (ch.textEn === undefined || ch.textEn === ch.text) &&
                    (ch.textJa === undefined || ch.textJa === ch.text) &&
                    ch.tag === 'neutral'
                );
                if (allSimple) {
                    nout.data = { choices: data.choices.map(ch => {
                        if (ch.condition) return { text: ch.text, condition: JSON.parse(JSON.stringify(ch.condition)) };
                        return ch.text;
                    }) };
                } else {
                    nout.data = { choices: data.choices.map(ch => ({
                        text: ch.text,
                        ...(ch.textEn && ch.textEn !== ch.text ? { textEn: ch.textEn } : {}),
                        ...(ch.textJa && ch.textJa !== ch.text ? { textJa: ch.textJa } : {}),
                        ...(ch.tag && ch.tag !== 'neutral' ? { tag: ch.tag } : {}),
                        ...(ch.condition ? { condition: JSON.parse(JSON.stringify(ch.condition)) } : {})
                    })) };
                }
            }
        } else {
            const cleaned = cleanData(data);
            // condition 默认字段省略：operator '>=' / leftType 'variable' / rightType 'direct' / compareWith 'direct'
            if (node.type === 'condition') {
                if (cleaned.operator === '>=') delete cleaned.operator;
                if (cleaned.leftType === 'variable') delete cleaned.leftType;
                if (cleaned.leftVariable === 'trust' && cleaned.leftDirect === undefined) delete cleaned.leftVariable;
                if (cleaned.rightType === 'direct') delete cleaned.rightType;
                if (cleaned.compareWith === 'direct') delete cleaned.compareWith;
            }
            // event_start 默认 eventName
            if (node.type === 'event_start' && cleaned.eventName === 'GameStart') delete cleaned.eventName;
            // chapter_begin 默认字段省略
            if (node.type === 'chapter_begin') {
                if (cleaned.bgm == null) delete cleaned.bgm;
                if (!cleaned.chapterSubtitle) delete cleaned.chapterSubtitle;
            }
            // fn_return 空表达式/空值绑定省略；fn_entry 无数据
            if (node.type === 'fn_return') {
                if (!cleaned.value) delete cleaned.value;
                if (cleaned.values && typeof cleaned.values === 'object' && Object.keys(cleaned.values).length === 0) delete cleaned.values;
            }
            if (Object.keys(cleaned).length) nout.data = cleaned;
        }
        return nout;
    }

    // 连接列表 → v3 "from/to" 引用（主蓝图与函数子蓝图共用）
    function serializeConnList(nodes, conns) {
        const res = [];
        (conns || []).forEach(c => {
            if (!c) return;
            const fromNode = (nodes || []).find(n => n.id === c.fromNode);
            const toNode = (nodes || []).find(n => n.id === c.toNode);
            const fromPin = fromNode && [...(fromNode.outputs || []), ...(fromNode.inputs || [])].find(p => p.id === c.fromPin);
            const toPin = toNode && [...(toNode.outputs || []), ...(toNode.inputs || [])].find(p => p.id === c.toPin);
            if (!fromNode || !toNode || !fromPin || !toPin) return;
            res.push({ from: `${c.fromNode}:${fromPin.key}`, to: `${c.toNode}:${toPin.key}` });
        });
        return res;
    }

    function showOverlay() {
        const el = document.getElementById('designer-overlay');
        if (el) {
            el.style.display = 'flex';
            el.classList.add('active');
        }
    }

    function close() {
        stopPlaytest(); // 停止试玩会话并清除高亮
        removeCollabBanner();
        closeTeamChat(); // 关闭协作聊天浮窗
        const collab = _community; // 协作会话（下面要拿它回到故事主页）
        // 从社区故事进来的 → 退出时回到「那个故事」的社区主页，而不是主菜单
        const backToStory = !!(collab && typeof COMMUNITY !== 'undefined' && COMMUNITY.showDetail);
        if (backToStory) save(true); // 先把改动同步到服务器（静默；冲突时会弹「加载最新」）
        stopPresence();              // 我的指针从别人画布上消失
        _community = null;           // 退出协作会话
        const el = document.getElementById('designer-overlay');
        if (el) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
        if (backToStory) {
            try { COMMUNITY.showDetail(collab.id); }
            catch (err) { if (typeof GAME !== 'undefined') GAME.showMainMenu(); }
        } else if (typeof GAME !== 'undefined') GAME.showMainMenu();
    }

    // ==================== 渲染 ====================
    // 当前属性面板中的活跃 textarea 引用，用于防止误删
    let _activeTextarea = null;

    function render() {
        const container = document.getElementById('designer-canvas');
        if (!container) return;

        // 记录当前 textarea 焦点状态
        _activeTextarea = document.activeElement;
        const isEditing = (_activeTextarea && (_activeTextarea.tagName === 'TEXTAREA' || _activeTextarea.tagName === 'INPUT'));

        container.innerHTML = '';
        _resizePanels = [];

        // 工具栏
        const toolbar = createToolbar();
        container.appendChild(toolbar);
        syncToolbarHeight(toolbar); // 面板顶部随工具栏高度走（工具栏会因窗口宽度折行）

        // 变量面板（宽度可拖动调节）
        const varPanel = createVariablesPanel();
        container.appendChild(varPanel);
        setupPanelResize(varPanel, 'left');

        // 画布
        const canvas = document.createElement('div');
        canvas.className = 'bp-canvas';
        canvas.id = 'bp-canvas';
        // 画布使用 CSS background 作为无限网格（无边缘，拖到哪里网格都在）
        const dotColor = 'rgba(128,128,128,0.35)';
        canvas.style.cssText = `flex:1;position:relative;overflow:hidden;cursor:grab;touch-action:none;overscroll-behavior:none;background-color:var(--bg-primary);background-image:radial-gradient(circle,${dotColor} 1px,transparent 1px);background-repeat:repeat;background-size:${20 * scale}px ${20 * scale}px;background-position:${canvasOffset.x}px ${canvasOffset.y}px;`;

        // SVG 层 — 必须与节点层使用相同的 transform，否则连线坐标与引脚位置错位
        // 使用超大尺寸（200000x200000）的 SVG 元素，使其内部坐标系永远覆盖可视区，
        // 解决引线在边界外被 SVG 视口裁剪的问题
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'bp-svg';
        svg.style.cssText = `position:absolute;top:0;left:0;width:200000px;height:200000px;pointer-events:none;z-index:1;transform:translate(${canvasOffset.x}px,${canvasOffset.y}px) scale(${scale});transform-origin:0 0;overflow:visible;`;
        canvas.appendChild(svg);

        // 节点层
        const nodesLayer = document.createElement('div');
        nodesLayer.id = 'bp-nodes-layer';
        // z-index:2 高于 SVG 连线层(1)，保证节点/引脚在连线之上可点击。
        // 否则连线 path(pointer-events:auto) 的端点会盖住引脚，导致引脚点不到、拖不出连线。
        nodesLayer.style.cssText = `position:absolute;top:0;left:0;width:1px;height:1px;z-index:2;transform:translate(${canvasOffset.x}px,${canvasOffset.y}px) scale(${scale});`;
        canvas.appendChild(nodesLayer);

        // 渲染节点
        curNodes().forEach(node => {
            const el = createNodeElement(node);
            nodesLayer.appendChild(el);
        });

        // 协作编辑（从社区进来的故事）：团队聊天按钮浮在画布右下角，边改蓝图边聊
        if (_community) {
            const chatFab = document.createElement('button');
            chatFab.id = 'bp-team-chat-fab';
            chatFab.className = 'bp-team-chat-fab';
            chatFab.innerHTML = '💬';
            chatFab.title = I18N.t('communityTeamChat') || '团队聊天';
            // 画布 pointerdown 会启动平移，按钮上必须拦截
            chatFab.addEventListener('pointerdown', e => e.stopPropagation());
            chatFab.addEventListener('click', e => { e.stopPropagation(); openTeamChat(); });
            canvas.appendChild(chatFab);

            // 远程协作者指针层（画布坐标 → 屏幕坐标，缩放/平移时同步刷新）
            const cursorLayer = document.createElement('div');
            cursorLayer.id = 'bp-cursor-layer';
            cursorLayer.className = 'bp-cursor-layer';
            canvas.appendChild(cursorLayer);
        }

        // ⚠️ 必须先将 canvas 挂载到 container，否则 getPinPosition 中
        //    document.getElementById('bp-canvas') 返回 null，所有连线无法渲染！
        container.appendChild(canvas);

        // 渲染连接（canvas 已在 DOM 中，getPinPosition 可正常工作）
        const _canvasRect = canvas.getBoundingClientRect();
        renderConnections(svg, _canvasRect);

        // 临时连接
        if (tempConnection) {
            renderTempConnection(svg);
        }

        // 画布事件（移动/释放由全局监听器处理，避免拖出画布后失效）
        canvas.addEventListener('pointerdown', onCanvasPointerDown);
        canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
        // 协作：把指针位置（世界坐标）上报给别人看
        canvas.addEventListener('pointermove', onCanvasPointerMove);

        // 拖放变量到画布 → 创建 get_variable 节点
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!e.dataTransfer.types.includes('application/blueprint-var')) return;
            canvas.classList.add('bp-canvas-drag-over');
        });
        canvas.addEventListener('dragleave', (e) => {
            // 只在真正离开画布时移除高亮（不触发给子元素）
            if (!canvas.contains(e.relatedTarget)) {
                canvas.classList.remove('bp-canvas-drag-over');
            }
        });
        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            canvas.classList.remove('bp-canvas-drag-over');
            const varData = e.dataTransfer.getData('application/blueprint-var');
            if (!varData) return;
            try {
                const { key, name, type } = JSON.parse(varData);
                const rect = canvas.getBoundingClientRect();
                // 计算放置位置（世界坐标）
                const dropX = (e.clientX - rect.left - canvasOffset.x) / scale;
                const dropY = (e.clientY - rect.top - canvasOffset.y) / scale;
                // 创建 get_variable 节点
                const node = createNode('get_variable', dropX - 110, dropY - 30); // 居中偏移
                if (node) {
                    node.data.variableName = key;
                    node.data.variableDisplayName = name;
                    curNodes().push(node);
                    selectedNodeId = node.id;
                    render();
                }
            } catch(err) {
                console.warn('Failed to create variable ref node:', err);
            }
        });

        // 属性面板（宽度可拖动调节）
        if (selectedNodeId) {
            const panel = createPropertyPanel();
            container.appendChild(panel);
            setupPanelResize(panel, 'right');
        }

        bindEvents();

        // 如果之前正在编辑文本，恢复焦点和光标位置
        if (isEditing && _activeTextarea) {
            const savedValue = _activeTextarea.value;
            const savedSelectionStart = _activeTextarea.selectionStart;
            const savedSelectionEnd = _activeTextarea.selectionEnd;
            // 找到新创建的对应元素
            const key = _activeTextarea.dataset.key;
            const selector = _activeTextarea.tagName === 'TEXTAREA'
                ? `.prop-textarea[data-key="${key}"]`
                : `.prop-input[data-key="${key}"]`;
            const newEl = document.querySelector(selector);
            if (newEl) {
                newEl.focus();
                newEl.value = savedValue;
                try { newEl.setSelectionRange(savedSelectionStart, savedSelectionEnd); } catch(e) {}
            }
        }
        _activeTextarea = null;

        // 试玩进行中：重建面板并恢复运行轨迹高亮（render 会清空画布容器）
        if (_pt) {
            buildPlaytestPanel();
            ptReapplyHighlights();
        }

        // 协作：画布重建后重画别人的指针与「正在编辑」描边（不进 render 主流程，开销极小）
        syncPresenceUI();
    }

    function createToolbar() {
        const bar = document.createElement('div');
        bar.className = 'designer-toolbar';

        // 工具栏分三行，避免十几个按钮挤成一排堆在一起：
        //   ① 故事信息（标题 / 图标 / 梗概 / 主题色 / 分享）＋ 操作按钮（保存 / 试玩 / 导入导出 / 返回）
        //   ② 节点调色板（横向滚动，不折行）
        //   ③ 状态提示
        const rowTop = document.createElement('div');
        rowTop.className = 'bp-toolbar-row';
        const storyGroup = document.createElement('div');
        storyGroup.className = 'bp-toolbar-group';
        const actionGroup = document.createElement('div');
        actionGroup.className = 'bp-toolbar-group bp-toolbar-actions';
        const paletteRow = document.createElement('div');
        paletteRow.className = 'bp-toolbar-row bp-node-palette';
        const infoRow = document.createElement('div');
        infoRow.className = 'bp-toolbar-row bp-toolbar-info';

        rowTop.appendChild(storyGroup);
        rowTop.appendChild(actionGroup);

        const titleInput = document.createElement('input');
        titleInput.id = 'designer-title-input';
        titleInput.className = 'bp-toolbar-title';
        titleInput.value = currentDesign.title || '';
        titleInput.placeholder = I18N.t('designerSceneName');
        storyGroup.appendChild(titleInput);

        // 故事图标按钮（emoji 或图片；自定义故事默认星星 ✨）
        if (!inFnMode()) {
            const storyIconBtn = document.createElement('button');
            storyIconBtn.id = 'bp-story-icon-btn';
            storyIconBtn.className = 'bp-tb-chip';
            storyIconBtn.title = I18N.t('designerStoryIcon') || '故事图标';
            storyIconBtn.innerHTML = (window.IMGDB ? IMGDB.renderIconHTML(currentDesign.storyIcon || '✨', 20) : (currentDesign.storyIcon || '✨')) + '<span>' + (I18N.t('designerStoryIcon') || '图标') + '</span>';
            storyIconBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openIconPicker({
                    current: currentDesign.storyIcon || '✨',
                    triggerEl: storyIconBtn,
                    onPick: (val) => {
                        currentDesign.storyIcon = val;
                        save(true);
                        render();
                    }
                });
            });
            storyGroup.appendChild(storyIconBtn);

            // 故事梗概（显示在故事卡上的简介）
            const descBtn = document.createElement('button');
            descBtn.id = 'bp-story-desc-btn';
            descBtn.className = 'bp-tb-chip';
            descBtn.title = I18N.t('designerStoryDesc') || '故事梗概';
            descBtn.innerHTML = '📝 <span>' + (I18N.t('designerStoryDesc') || '梗概') + '</span>';
            descBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openStoryDescEditor(descBtn);
            });
            storyGroup.appendChild(descBtn);

            // 自定义主题色（故事卡与剧情画面的强调色）
            const themeBtn = document.createElement('button');
            themeBtn.id = 'bp-story-theme-btn';
            themeBtn.className = 'bp-tb-chip';
            themeBtn.title = I18N.t('designerStoryTheme') || '主题色';
            themeBtn.innerHTML = `<span class="bp-theme-swatch" style="width:14px;height:14px;border-radius:4px;flex-shrink:0;background:${currentDesign.themeColor || DEFAULT_THEME_COLOR};border:1px solid var(--border-color);display:inline-block;"></span><span>${I18N.t('designerStoryTheme') || '主题色'}</span>`;
            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showThemeColorPicker(themeBtn);
            });
            storyGroup.appendChild(themeBtn);

            // 🌐 社区：分享当前故事 / 查看协作状态（协作模式下按钮显示徽标）
            const shareBtn = document.createElement('button');
            shareBtn.id = 'bp-share-btn';
            shareBtn.className = 'bp-tb-chip';
            shareBtn.title = I18N.t('communityTitle') || '故事社区';
            if (_community) {
                shareBtn.innerHTML = '🌐 <span style="color:var(--accent-green,#22c55e);font-weight:700;">' + (I18N.t('communityCollabBadge') || '协作中') + '</span>';
            } else {
                shareBtn.innerHTML = '🌐 <span>' + (I18N.t('communityShare') || '分享') + '</span>';
            }
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleShareClick(shareBtn);
            });
            storyGroup.appendChild(shareBtn);
        }

        // 函数画布模式：标题旁显示 ƒ 函数名徽标
        if (inFnMode()) {
            const badge = document.createElement('span');
            badge.textContent = 'ƒ ' + (curFnDef().name || _activeFnId);
            badge.style.cssText = 'background:rgba(20,184,166,0.15);border:1px solid #14b8a6;color:#5eead4;border-radius:var(--radius-sm);padding:6px 12px;font-size:0.82rem;font-weight:600;white-space:nowrap;';
            storyGroup.appendChild(badge);
        }

        // 节点调色板：函数画布与主蓝图一致（差异仅起始节点——主蓝图 event_start ↔ 函数 fn_entry；
        // 函数额外提供 fn_return 结束函数并写回输出变量；编译器支持函数体内分支/输入/嵌套调用/结局等全部节点）
        const nodeButtons = inFnMode() ? [
            ['dialogue', '💬', I18N.t('designerNodeDialogue')],
            ['narration', '✦', I18N.t('designerNodeNarration')],
            ['illustration', '🖼', I18N.t('designerNodeIllustration')],
            ['choice', '⚡', I18N.t('designerNodeChoice')],
            ['condition', '◈', I18N.t('designerNodeCondition')],
            ['set_variable', '◉', I18N.t('designerNodeSetVar')],
            ['input', '⌨', I18N.t('designerNodeInput')],
            ['function', 'ƒ', I18N.t('designerNodeFunction')],
            ['chapter_begin', '▣', I18N.t('designerNodeChapterBegin')],
            ['end_chapter', '□', I18N.t('designerNodeEndChapter')],
            ['end_game', '■', I18N.t('designerNodeEndGame')],
            ['fn_return', '⏎', I18N.t('designerNodeFnReturn')]
        ] : [
            ['event_start', '▶', I18N.t('designerNodeEventStart')],
            ['chapter_begin', '▣', I18N.t('designerNodeChapterBegin')],
            ['dialogue', '💬', I18N.t('designerNodeDialogue')],
            ['narration', '✦', I18N.t('designerNodeNarration')],
            ['illustration', '🖼', I18N.t('designerNodeIllustration')],
            ['choice', '⚡', I18N.t('designerNodeChoice')],
            ['condition', '◈', I18N.t('designerNodeCondition')],
            ['set_variable', '◉', I18N.t('designerNodeSetVar')],
            ['input', '⌨', I18N.t('designerNodeInput')],
            ['function', 'ƒ', I18N.t('designerNodeFunction')],
            ['end_chapter', '□', I18N.t('designerNodeEndChapter')],
            ['end_game', '■', I18N.t('designerNodeEndGame')]
        ];

        // 色板按语义分组（起始 / 内容 / 逻辑 / 结束），组间加一条细分隔线，扫一眼就能定位
        const groupBreaks = inFnMode() ? [3, 7, 10] : [2, 5, 10];
        nodeButtons.forEach(([type, icon, label], idx) => {
            if (groupBreaks.indexOf(idx) >= 0) {
                const sep = document.createElement('span');
                sep.className = 'bp-toolbar-sep';
                paletteRow.appendChild(sep);
            }
            const btn = document.createElement('button');
            btn.className = 'designer-btn bp-node-btn';
            btn.innerHTML = `${icon} ${label}`;
            btn.style.cssText = `background:${NODE_TEMPLATES[type].color};`; // 底色取节点类型色
            btn.addEventListener('click', () => addNode(type));
            paletteRow.appendChild(btn);
        });

        // 协作模式（从社区故事进来）：「返回」回到那个故事的社区主页，不是主菜单
        const closeLabel = _community ? ('← ' + (I18N.t('designerBackToStory') || '故事主页')) : ('← ' + I18N.t('mainMenu'));
        const actions = inFnMode() ? [
            ['btn-designer-back-main', '← ' + I18N.t('designerFnBackMain'), '#14b8a6', closeFnCanvas],
            ['btn-designer-save', '💾 ' + I18N.t('designerSave'), 'var(--accent-green)', save],
            ['btn-designer-close', closeLabel, 'transparent', close]
        ] : [
            ['btn-designer-music', '🎵 ' + (I18N.t('musicGlobalBgm') || '全局BGM'), 'rgba(139,92,246,0.15)', showMusicDialog],
            ['btn-designer-save', '💾 ' + I18N.t('designerSave'), 'var(--accent-green)', save],
            ['btn-designer-play', '▶ ' + I18N.t('designerPlay'), 'var(--accent-cyan)', startPlaytest],
            ['btn-designer-export', '⬇ ' + I18N.t('designerExport'), 'var(--accent-purple)', exportDesign],
            ['btn-designer-import', '⬆ ' + I18N.t('designerImport'), 'var(--accent-blue)', importDesign],
            ['btn-designer-close', closeLabel, 'transparent', close]
        ];

        actions.forEach(([id, label, color, handler]) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = 'designer-btn bp-tb-btn' + (color === 'transparent' ? ' bp-tb-btn-ghost' : '');
            btn.innerHTML = label;
            if (color !== 'transparent') btn.style.cssText = `background:${color};border-color:${color};`;
            btn.addEventListener('click', handler);
            actionGroup.appendChild(btn);
        });

        // 移动端专用按钮（仅在窄屏显示，见 CSS）
        const mobileBtns = [
            ['btn-toggle-vars', '☰ ' + I18N.t('designerVarSection'), () => {
                const vp = document.getElementById('bp-variables-panel') || document.querySelector('.bp-variables-panel');
                if (vp) vp.classList.toggle('open');
            }],
            ['btn-fit-view', '⊡ ' + I18N.t('designerFitView'), () => fitView()]
        ];
        mobileBtns.forEach(([id, label, handler]) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = 'designer-btn bp-tb-btn bp-tb-btn-ghost mobile-only-btn';
            btn.innerHTML = label;
            btn.addEventListener('click', handler);
            actionGroup.appendChild(btn);
        });

        const info = document.createElement('div');
        info.style.cssText = 'font-size:0.75rem;color:var(--text-muted);white-space:normal;';
        info.innerHTML = inFnMode()
            ? `ƒ ${escapeHtml(curFnDef().name || _activeFnId)} | ${I18N.t('designerNode')}: ${curNodes().length} | ${I18N.t('designerFnGraphHint')}`
            : `💠 ${I18N.t('seedBalance')}: ${SAVE.getSeeds()} | ${I18N.t('designerNode')}: ${currentDesign.nodes.length} | ${I18N.t('designerChoice')}: ${currentDesign.connections.length} | ${I18N.t('designerHintDrag')}`;
        infoRow.appendChild(info);

        // 协作在线者：谁的指针在画布上、谁正在编辑（点击头像可跳到他的位置）
        if (_community) {
            const peers = document.createElement('span');
            peers.id = 'bp-presence-bar';
            peers.className = 'bp-presence-bar';
            peers.style.display = 'none';
            infoRow.appendChild(peers);
        }

        bar.appendChild(rowTop);
        bar.appendChild(paletteRow);
        bar.appendChild(infoRow);

        return bar;
    }

    // 工具栏高度 → CSS 变量 --bp-toolbar-h
    // 左侧变量面板 / 右侧属性面板 / 全局 BGM 信息条都靠它定位。工具栏会随窗口宽度折行变高，
    // 以前写死 top:72px，工具栏一高就被面板压住（踩过），所以这里动态同步 + 监听 resize。
    let _toolbarResizeBound = false;
    function syncToolbarHeight(toolbar) {
        const overlay = document.getElementById('designer-overlay');
        const bar = toolbar || document.querySelector('#designer-canvas .designer-toolbar');
        if (!overlay || !bar) return;
        overlay.style.setProperty('--bp-toolbar-h', (bar.offsetHeight || 72) + 'px');
        if (!_toolbarResizeBound) {
            _toolbarResizeBound = true;
            window.addEventListener('resize', () => {
                const b = document.querySelector('#designer-canvas .designer-toolbar');
                if (b) syncToolbarHeight(b);
            });
        }
    }

    // ==================== 函数（子蓝图编写） ====================
    // 函数体 = 独立子蓝图：fn_entry（入口，参数在属性面板编辑）→ 对话/旁白/变量 → fn_return（返回值表达式）。
    // 在场景侧栏「函数」区添加/进入函数画布；旧版 { body } JS 函数仍可运行（仅编译/执行，不再提供编辑页）。
    function buildUserFn(fn) {
        const params = (fn.params || []).join(',');
        const body = String(fn.body || '').trim();
        return (body.indexOf('return') >= 0)
            ? new Function(params, body)
            : new Function(params, 'return (' + body + ');');
    }

    function sanitizeIdent(s) {
        return String(s || '').replace(/[^A-Za-z0-9_]/g, '');
    }

    function isLegacyFn(fn) {
        return !!(fn && typeof fn.body === 'string' && fn.body.trim() !== '');
    }

    function createFunctionDef() {
        if (!currentDesign.functions) currentDesign.functions = {};
        const id = 'fn_' + Date.now().toString(36) + '_' + (++nextNodeId);
        const entry = createNode('fn_entry', 80, 140);
        currentDesign.functions[id] = {
            name: I18N.t('designerFnDefaultName'),
            params: [],
            nodes: [entry],
            connections: [],
            startNode: entry.id
        };
        save(true);
        openFnCanvas(id);
    }

    function deleteFunctionDef(id) {
        if (!id || !currentDesign.functions[id]) return;
        const used = currentDesign.nodes.filter(n => n.type === 'function' && n.data.fnId === id).length;
        const msg = used > 0
            ? I18N.t('designerFnDeleteUsed', { n: used })
            : I18N.t('designerFnDeleteConfirm');
        if (!window.confirm(msg)) return;
        delete currentDesign.functions[id];
        if (_activeFnId === id) {
            _activeFnId = null;
            selectedNodeId = null;
        }
        save(true);
        render();
    }

    // 求函数的返回值表达式（fn_return 节点的 value；无则返回 ''）
    function getFnReturnExpr(fnDef) {
        if (!fnDef || !Array.isArray(fnDef.nodes)) return '';
        const ret = fnDef.nodes.find(n => n.type === 'fn_return');
        return (ret && ret.data && typeof ret.data.value === 'string') ? ret.data.value.trim() : '';
    }

    // ==================== 浮动面板拖拽工具（指针 + 触摸双通道） ====================
    // 把锚定布局的面板转为自由定位并支持拖动。窄屏(≤820px)为抽屉模式，禁用拖动。
    // document 级监听全局只绑一次（render 会反复重建面板，避免监听器累积泄漏）。
    let _floatDrag = null;    // 当前拖拽会话 { panel, handle, st, save, sx, sy, ox, oy }
    let _floatDragBound = false;

    function floatDragMove(e) {
        if (!_floatDrag) return;
        const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
        const vw = window.innerWidth, vh = window.innerHeight;
        const w = _floatDrag.panel.offsetWidth;
        let nx = _floatDrag.ox + (p.clientX - _floatDrag.sx);
        let ny = _floatDrag.oy + (p.clientY - _floatDrag.sy);
        // 限制在视口内（至少保留 40px 可见，面板不会丢）
        nx = Math.max(40 - w, Math.min(nx, vw - 40));
        ny = Math.max(0, Math.min(ny, vh - 40));
        _floatDrag.st.x = nx;
        _floatDrag.st.y = ny;
        _floatDrag.panel.style.left = nx + 'px';
        _floatDrag.panel.style.top = ny + 'px';
        if (e.cancelable) e.preventDefault();
    }

    function floatDragUp() {
        if (!_floatDrag) return;
        const { handle, save } = _floatDrag;
        _floatDrag = null;
        handle.style.cursor = 'grab';
        if (save) save();
    }

    function makeFloatingDraggable(opts) {
        const { panel, handle, pinSize, getState, save } = opts;
        handle.style.cursor = 'grab';
        handle.style.touchAction = 'none'; // 防止触摸端把拖动当成滚动
        const onDown = (e) => {
            if (window.innerWidth <= 820) return; // 窄屏抽屉不支持自由拖动
            if (e.target && e.target.closest && e.target.closest('button')) return; // 头部按钮不触发拖动
            if (e.type === 'touchstart' && _floatDrag) { if (e.cancelable) e.preventDefault(); return; } // 防指针/触摸双通道重复
            if (e.type === 'pointerdown' && e.button !== undefined && e.button !== 0) return;
            const st = getState();
            if (st.x == null) {
                // 首次拖动：锚定布局 → 自由布局（用 rect 换算，兼容 translateX(-50%) 居中定位）
                const rect = panel.getBoundingClientRect();
                const op = panel.offsetParent;
                const opRect = op ? op.getBoundingClientRect() : { left: 0, top: 0 };
                st.x = rect.left - opRect.left;
                st.y = rect.top - opRect.top;
                panel.style.left = st.x + 'px';
                panel.style.top = st.y + 'px';
                panel.style.bottom = 'auto';
                panel.style.right = 'auto';
                panel.style.transform = 'none';
                if (pinSize) { // 原 bottom:0 拉伸布局需固定尺寸
                    panel.style.width = rect.width + 'px';
                    panel.style.height = rect.height + 'px';
                }
            }
            const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
            _floatDrag = { panel, handle, st, save, sx: p.clientX, sy: p.clientY, ox: st.x, oy: st.y };
            handle.style.cursor = 'grabbing';
            if (e.cancelable) e.preventDefault();
        };
        handle.addEventListener('pointerdown', onDown);
        handle.addEventListener('touchstart', onDown, { passive: false });
        if (!_floatDragBound) {
            _floatDragBound = true;
            // document 级兜底：WebView 可能只支持 pointer 或 touch 其一（与节点拖动同约定）
            document.addEventListener('pointermove', floatDragMove);
            document.addEventListener('touchmove', floatDragMove, { passive: false });
            document.addEventListener('pointerup', floatDragUp);
            document.addEventListener('pointercancel', floatDragUp);
            document.addEventListener('touchend', floatDragUp);
        }
    }

    // ==================== 变量/角色侧栏：位置与显隐（可拖动/可隐藏） ====================
    const VP_STATE_KEY = 'ur-bp-vp-state';
    let _vpState = { x: null, y: null, hidden: false };
    let _vpStateLoaded = false;
    function loadVpState() {
        if (_vpStateLoaded) return;
        _vpStateLoaded = true;
        try {
            const raw = localStorage.getItem(VP_STATE_KEY);
            if (raw) _vpState = Object.assign({ x: null, y: null, hidden: false }, JSON.parse(raw));
        } catch (e) {}
    }
    function saveVpState() {
        try { localStorage.setItem(VP_STATE_KEY, JSON.stringify(_vpState)); } catch (e) {}
    }
    // 侧栏隐藏后的浮动恢复按钮
    function buildVpTab() {
        const tab = document.createElement('button');
        tab.id = 'bp-vp-tab';
        tab.title = I18N.t('designerVpShow');
        tab.textContent = '📊';
        tab.style.cssText = 'position:absolute;left:6px;top:80px;width:36px;height:36px;border-radius:50%;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary);font-size:1rem;cursor:pointer;z-index:10;box-shadow:0 2px 10px rgba(0,0,0,0.35);';
        tab.addEventListener('click', () => {
            _vpState.hidden = false;
            saveVpState();
            render();
        });
        return tab;
    }

    // ==================== 左右面板宽度可自由拖动调节 ====================
    // 面板是 position:absolute 覆盖在画布上的，宽度存 localStorage，跨 render/重开保留
    let _panelW = null;          // { left, right }
    let _panelWLoaded = false;
    const PANEL_W_KEY = { left: 'ur-bp-sidebar-w', right: 'ur-bp-prop-w' };
    const PANEL_W_DEF = { left: 200, right: 260 };
    let _resizePanels = [];      // [{ panel, side }]，每次 render 重建

    function loadPanelW() {
        if (_panelWLoaded) return _panelW;
        _panelWLoaded = true;
        _panelW = { left: PANEL_W_DEF.left, right: PANEL_W_DEF.right };
        try {
            [['left', PANEL_W_KEY.left], ['right', PANEL_W_KEY.right]].forEach(([side, key]) => {
                const v = parseFloat(localStorage.getItem(key));
                if (!isNaN(v) && v > 0) _panelW[side] = v;
            });
        } catch (e) {}
        return _panelW;
    }
    function savePanelW() {
        try {
            localStorage.setItem(PANEL_W_KEY.left, String(Math.round(_panelW.left)));
            localStorage.setItem(PANEL_W_KEY.right, String(Math.round(_panelW.right)));
        } catch (e) {}
    }
    // 当前视口下的宽度区间（不超过视口 70%；左侧栏可窄到 120，属性面板有表单控件故下限 180）
    function panelWLimits(side) {
        return {
            min: side === 'right' ? 180 : 120,
            max: Math.max(260, Math.min(560, Math.round(window.innerWidth * 0.7)))
        };
    }
    function applyPanelW(entry) {
        const panel = entry && entry.panel;
        if (!panel || !panel.classList || panel.isConnected === false) return;
        if (window.innerWidth <= 820) { panel.style.width = ''; return; } // 窄屏抽屉模式交还 CSS
        const lim = panelWLimits(entry.side);
        const w = Math.max(lim.min, Math.min(lim.max, _panelW[entry.side]));
        panel.style.width = w + 'px';
    }

    function setupPanelResize(panel, side) {
        if (!panel || !panel.classList) return;
        if (!panel.classList.contains('bp-variables-panel') && !panel.classList.contains('bp-property-panel')) return;
        loadPanelW();
        applyPanelW({ panel, side });
        // 同一侧只保留最新面板（refreshPropertyPanel 会替换旧面板，旧引用要及时剔除）
        _resizePanels = _resizePanels.filter(p => p.side !== side);
        _resizePanels.push({ panel, side });

        // ⚠️ 面板原本自身 overflow-y:auto，把手作为其子元素会随内容一起滚走（滚下去就抓不到了）。
        //    这里把内容包进内层滚动容器，面板自身不滚动 + 定位上下文，把手便固定不动。
        const hasScroller = Array.prototype.some.call(panel.children || [],
            c => c.classList && c.classList.contains('bp-panel-scroll'));
        if (!hasScroller) {
            const scroller = document.createElement('div');
            scroller.className = 'bp-panel-scroll';
            while (panel.firstChild) scroller.appendChild(panel.firstChild);
            panel.appendChild(scroller);
            panel.style.display = 'flex';
            panel.style.flexDirection = 'column';
            panel.style.overflow = 'hidden';
            panel.style.padding = '0';
        }

        const handle = document.createElement('div');
        handle.className = 'bp-resize-handle';
        handle.title = I18N.t('designerResizeHandle');
        handle.dataset.side = side;
        // 贴面板内侧边缘（面板 overflow-y:auto，超出会被裁掉，故放内侧）
        handle.style[side === 'left' ? 'left' : 'right'] = '0';
        panel.appendChild(handle);

        let dragging = false, startX = 0, startW = panel.offsetWidth;
        const onDown = (e) => {
            if (window.innerWidth <= 820) return;
            dragging = true;
            startX = e.clientX;
            startW = panel.offsetWidth;
            handle.classList.add('dragging');
            document.body.classList.add('bp-resizing');
            try { handle.setPointerCapture(e.pointerId); } catch (err) {}
            e.stopPropagation();
        };
        const onMove = (e) => {
            if (!dragging) return;
            const lim = panelWLimits(side);
            const dx = e.clientX - startX;
            const w = startW + (side === 'left' ? dx : -dx);
            const nw = Math.max(lim.min, Math.min(lim.max, w));
            panel.style.width = nw + 'px';
            _panelW[side] = nw; // 实时记录，避免抖动
            e.stopPropagation();
        };
        const onUp = () => {
            if (!dragging) return;
            dragging = false;
            handle.classList.remove('dragging');
            document.body.classList.remove('bp-resizing');
            savePanelW();
        };
        // 不 preventDefault，保证 dblclick 等兼容事件正常触发
        handle.addEventListener('pointerdown', onDown);
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
        handle.addEventListener('pointercancel', onUp);
        handle.addEventListener('lostpointercapture', onUp);
        handle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            panel.style.width = PANEL_W_DEF[side] + 'px';
            _panelW[side] = PANEL_W_DEF[side];
            savePanelW();
        });
    }

    function createVariablesPanel() {
        loadVpState();
        const isNarrow = window.innerWidth <= 820; // 与 CSS 抽屉断点一致
        if (_vpState.hidden && !isNarrow) return buildVpTab();
        const panel = document.createElement('div');
        panel.className = 'bp-variables-panel';
        panel.id = 'bp-variables-panel';
        panel.style.cssText = 'position:absolute;left:0;top:var(--bp-toolbar-h,72px);bottom:0;width:200px;background:var(--bg-secondary);border-right:1px solid var(--border-color);padding:12px;z-index:10;overflow-y:auto;';
        if (isNarrow) {
            // 窄屏为抽屉模式：清掉自由定位残留，交还 CSS 控制
            panel.style.left = ''; panel.style.top = ''; panel.style.bottom = '';
            panel.style.height = ''; panel.style.width = '';
        } else if (_vpState.x != null) {
            // 恢复上次拖动的位置
            panel.style.left = _vpState.x + 'px';
            panel.style.top = _vpState.y + 'px';
            panel.style.bottom = 'auto';
            // 自由定位时高度由内容决定，限制上限免得溢出视口（内层滚动容器接管滚动）
            panel.style.maxHeight = 'calc(100vh - ' + Math.max(0, _vpState.y || 0) + 'px)';
        }

        // ── 头部：拖拽把手 + 隐藏按钮 ──
        const vpHeader = document.createElement('div');
        vpHeader.className = 'bp-vp-header';
        vpHeader.style.cssText = 'display:flex;align-items:center;gap:6px;margin:-4px -4px 10px;padding:3px 4px;cursor:grab;user-select:none;-webkit-user-select:none;';
        vpHeader.innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem;letter-spacing:1px;">⠿</span>` +
            `<span style="flex:1;font-size:0.85rem;font-weight:700;">📊 ${I18N.t('designerScene')}</span>` +
            `<button class="bp-vp-hide-btn" title="${I18N.t('designerVpHide')}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.9rem;padding:2px 4px;line-height:1;">◀</button>`;
        panel.appendChild(vpHeader);
        vpHeader.querySelector('.bp-vp-hide-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 820) {
                panel.classList.remove('open'); // 窄屏：收起抽屉（工具栏 ☰ 变量 可再打开）
            } else {
                _vpState.hidden = true;
                saveVpState();
                render(); // 重渲染后由 buildVpTab 显示恢复按钮
            }
        });
        makeFloatingDraggable({ panel, handle: vpHeader, pinSize: true, getState: () => _vpState, save: saveVpState });

        // ── 变量区域 ──
        const varSection = document.createElement('div');
        varSection.id = 'bp-var-section';
        varSection.innerHTML = `<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
            <span>${I18N.t('designerVarSection')}</span>
        </div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px;font-style:italic;">${I18N.t('designerDragVarToCanvas')}</div>`;

        Object.entries(currentDesign.variables || {}).forEach(([key, v]) => {
            const item = document.createElement('div');
            item.className = 'bp-var-item';
            item.dataset.varKey = key;
            item.draggable = true;
            const hudOn = v.showOnHud !== false; // 默认开启
            item.style.cssText = 'background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 8px;margin-bottom:6px;font-size:0.75rem;position:relative;cursor:grab;';
            const typeColor = TYPE_COLORS[v.type] || '#9ca3af';
            const hudColor = hudOn ? 'var(--accent-cyan)' : 'var(--text-muted)';
            item.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="flex:1;min-width:0;">
                        <div class="bp-var-name" style="color:var(--text-primary);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(v.name)}</div>
                        <div style="color:var(--text-muted);font-size:0.68rem;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${typeColor};vertical-align:middle;margin-right:3px;"></span>${v.type} = <strong>${v.defaultValue}</strong></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                        <button class="bp-hud-toggle-btn" data-key="${key}" data-on="${hudOn}" style="background:none;border:none;color:${hudColor};cursor:pointer;font-size:0.85rem;padding:2px 4px;line-height:1;opacity:0.7;" title="${I18N.t('designerHudToggle') || '游玩时显示在界面中'}">👁</button>
                        <button class="bp-rename-var-btn" data-key="${key}" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:0.85rem;padding:2px 4px;line-height:1;" title="重命名变量">✏</button>
                        <button class="bp-del-var-btn" data-key="${key}" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:0.85rem;padding:2px 4px;line-height:1;" title="删除变量">✕</button>
                    </div>
                </div>`;
            // 拖拽开始：将变量信息存入 dataTransfer
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/blueprint-var', JSON.stringify({ key, name: v.name, type: v.type }));
                e.dataTransfer.effectAllowed = 'copy';
                item.style.opacity = '0.5';
                item.style.cursor = 'grabbing';
            });
            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
                item.style.cursor = 'grab';
                // 清除画布高亮
                const canvas = document.getElementById('bp-canvas');
                if (canvas) canvas.classList.remove('bp-canvas-drag-over');
            });
            // 触摸端不支持 HTML5 拖放：点击变量直接生成 get_variable 节点到视图中心
            if (isTouch) {
                item.addEventListener('click', () => addVariableNodeAtCenter(key));
            }
            varSection.appendChild(item);
        });
        const addVarBtn = document.createElement('button');
        addVarBtn.id = 'bp-add-var-btn';
        addVarBtn.innerHTML = I18N.t('designerAddVar');
        addVarBtn.style.cssText = 'width:100%;background:transparent;border:1px dashed var(--accent-blue);color:var(--accent-blue);padding:6px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;margin-top:8px;';
        varSection.appendChild(addVarBtn);
        panel.appendChild(varSection);

        // ── 函数区域（函数以子蓝图编写，点击进入函数画布） ──
        const fnSection = document.createElement('div');
        fnSection.id = 'bp-fn-section';
        fnSection.innerHTML = `<div style="font-size:0.75rem;color:var(--text-secondary);margin:14px 0 6px;display:flex;align-items:center;justify-content:space-between;">
            <span>ƒ ${I18N.t('designerFnSection')}</span>
        </div>`;
        const fnEntries = Object.entries(currentDesign.functions || {});
        if (fnEntries.length === 0) {
            const fnEmpty = document.createElement('div');
            fnEmpty.style.cssText = 'font-size:0.68rem;color:var(--text-muted);font-style:italic;margin-bottom:6px;';
            fnEmpty.textContent = I18N.t('designerFnEmpty');
            fnSection.appendChild(fnEmpty);
        }
        fnEntries.forEach(([id, fn]) => {
            if (!fn || typeof fn !== 'object') return;
            const item = document.createElement('div');
            item.className = 'bp-fn-item';
            item.dataset.fnId = id;
            const active = (id === _activeFnId);
            item.style.cssText = `display:flex;align-items:center;gap:6px;background:var(--bg-card);border:1px solid ${active ? '#14b8a6' : 'var(--border-color)'};border-radius:var(--radius-sm);padding:6px 8px;margin-bottom:6px;font-size:0.75rem;position:relative;cursor:pointer;`;
            const isLegacy = isLegacyFn(fn);
            item.innerHTML = `
                <span style="color:#5eead4;font-weight:700;font-size:0.85rem;flex-shrink:0;">ƒ</span>
                <span style="flex:1;min-width:0;color:var(--text-primary);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(fn.name || id)}</span>
                <span style="font-size:0.62rem;color:var(--text-muted);flex-shrink:0;">${isLegacy ? 'JS' : ((fn.params || []).length + 'p')}</span>
                <button class="bp-rename-fn-btn" data-id="${escapeHtml(id)}" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:0.85rem;padding:2px 4px;line-height:1;" title="${I18N.t('designerFnRename')}">✏</button>
                <button class="bp-del-fn-btn" data-id="${escapeHtml(id)}" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:0.85rem;padding:2px 4px;line-height:1;" title="${I18N.t('designerFnDelete')}">✕</button>
            `;
            item.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; // 按钮点击不进入画布
                openFnCanvas(id);
            });
            fnSection.appendChild(item);
        });
        const addFnBtn2 = document.createElement('button');
        addFnBtn2.id = 'bp-add-fn-btn';
        addFnBtn2.innerHTML = I18N.t('designerAddFn');
        addFnBtn2.style.cssText = 'width:100%;background:transparent;border:1px dashed #14b8a6;color:#5eead4;padding:6px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;margin-top:8px;';
        fnSection.appendChild(addFnBtn2);
        panel.appendChild(fnSection);

        // ── 角色区域 ──
        const charSection = document.createElement('div');
        charSection.id = 'bp-char-section';
        charSection.innerHTML = `<div style="font-size:0.75rem;color:var(--text-secondary);margin:14px 0 6px;">${I18N.t('designerCharSection')}</div>`;
        Object.entries(currentDesign.characters || {}).forEach(([key, c]) => {
            const item = document.createElement('div');
            item.className = 'bp-char-item';
            item.dataset.charKey = key;
            item.style.cssText = 'display:flex;align-items:center;gap:6px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 8px;margin-bottom:6px;font-size:0.75rem;position:relative;';
            // 旁白和玩家不允许删（基础角色）
            const isSystem = (key === 'narrator' || key === 'player');
            item.innerHTML = `
                <span class="bp-char-icon-btn" data-key="${key}" style="font-size:1rem;cursor:pointer;padding:2px 4px;border-radius:4px;border:1px solid transparent;min-width:22px;min-height:22px;display:inline-flex;align-items:center;justify-content:center;" title="${I18N.t('designerPickIcon')}">${window.IMGDB ? IMGDB.renderIconHTML(c.icon, 18) : (c.icon || '👤')}</span>
                <span class="bp-char-color-btn" data-key="${key}" style="width:14px;height:14px;border-radius:50%;background:${c.color || '#94a3b8'};border:1.5px solid var(--border-color);cursor:pointer;flex-shrink:0;box-sizing:border-box;" title="${I18N.t('designerCharColor')}"></span>
                <span class="bp-char-name" style="color:${c.color};flex:1;">${escapeHtml(c.name)}</span>
                <button class="bp-char-expr-btn" data-key="${key}" style="background:none;border:none;cursor:pointer;font-size:0.8rem;padding:2px 4px;line-height:1;" title="${I18N.t('designerExprLib') || '表情素材库'}">🎭</button>
                <button class="bp-rename-char-btn" data-key="${key}" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:0.85rem;padding:2px 4px;line-height:1;" title="重命名角色">✏</button>
                ${!isSystem ? `<button class="bp-del-char-btn" data-key="${key}" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:0.85rem;padding:2px 4px;line-height:1;" title="删除角色">✕</button>` : ''}`;
            charSection.appendChild(item);
        });
        panel.appendChild(charSection);

        const addBtn = document.createElement('button');
        addBtn.id = 'bp-add-char-btn';
        addBtn.innerHTML = I18N.t('designerAddChar');
        addBtn.style.cssText = 'width:100%;background:transparent;border:1px dashed var(--accent-purple);color:var(--accent-purple);padding:6px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;margin-top:8px;';
        addBtn.addEventListener('click', addCharacter);
        panel.appendChild(addBtn);

        // 延迟绑定事件（等 DOM 插入后）。
        // 用 setTimeout 而不是 requestAnimationFrame：rAF 在页面不可见/被节流时
        // （后台标签页、无头环境）可能一直不触发，会导致变量/角色面板的按钮点不动。
        setTimeout(() => bindVarCharEvents(), 0);

        return panel;
    }

    // ==================== 变量/角色 CRUD ====================
    function bindVarCharEvents() {
        // ── 函数区事件（添加 / 重命名 / 删除） ──
        const addFnBtn = document.getElementById('bp-add-fn-btn');
        if (addFnBtn) addFnBtn.onclick = () => createFunctionDef();
        document.querySelectorAll('.bp-del-fn-btn').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); deleteFunctionDef(btn.dataset.id); };
        });
        document.querySelectorAll('.bp-rename-fn-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const fn = (currentDesign.functions || {})[btn.dataset.id];
                if (!fn) return;
                const name = window.prompt(I18N.t('designerFnName'), fn.name || '');
                if (name === null) return;
                fn.name = String(name).trim() || fn.name;
                save(true);
                render();
            };
        });
        // 删除变量
        document.querySelectorAll('.bp-del-var-btn').forEach(btn => {
            btn.onclick = () => deleteVariable(btn.dataset.key);
        });
        // HUD 显示开关
        document.querySelectorAll('.bp-hud-toggle-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const key = btn.dataset.key;
                const v = currentDesign.variables[key];
                if (!v) return;
                const newState = btn.dataset.on === 'true' ? false : true;
                v.showOnHud = newState;
                btn.dataset.on = String(newState);
                btn.style.color = newState ? 'var(--accent-cyan)' : 'var(--text-muted)';
                btn.style.opacity = newState ? '0.7' : '0.35';
                btn.title = newState ? (I18N.t('designerHudOn') || '游玩时显示 ✓') : (I18N.t('designerHudOff') || '游玩时不显示');
            };
        });
        // 添加变量
        document.getElementById('bp-add-var-btn')?.addEventListener('click', showAddVariableDialog);
        // 重命名变量
        document.querySelectorAll('.bp-rename-var-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                inlineEditVariableName(btn.dataset.key);
            };
        });
        // 删除角色
        document.querySelectorAll('.bp-del-char-btn').forEach(btn => {
            btn.onclick = () => deleteCharacter(btn.dataset.key);
        });
        // 重命名角色
        document.querySelectorAll('.bp-rename-char-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                inlineEditCharacterName(btn.dataset.key);
            };
        });
        // 点击角色图标 → Emoji/图片 选择器
        document.querySelectorAll('.bp-char-icon-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                showIconPicker(btn.dataset.key, btn);
            };
        });
        // 点击表情库按钮 → 角色表情素材库管理
        document.querySelectorAll('.bp-char-expr-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                showExpressionDialog(btn.dataset.key);
            };
        });
        // 点击角色颜色按钮 → 颜色选择器
        document.querySelectorAll('.bp-char-color-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                showColorPicker(btn.dataset.key, btn);
            };
        });
    }

    // ==================== 变量/角色 重命名（内联编辑）====================
    function inlineEditVariableName(key) {
        const item = document.querySelector(`.bp-var-item[data-var-key="${key}"]`);
        if (!item) return;
        const nameEl = item.querySelector('.bp-var-name');
        if (!nameEl) return;
        const v = currentDesign.variables[key];
        if (!v) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = v.name;
        input.style.cssText = 'width:100%;background:var(--bg-primary);border:1px solid var(--accent-blue);border-radius:4px;padding:2px 4px;color:var(--text-primary);font-size:0.75rem;font-weight:600;box-sizing:border-box;';

        nameEl.replaceWith(input);
        input.focus();
        input.select();

        const finishEdit = (save) => {
            if (save) {
                const val = input.value.trim();
                if (val) v.name = val;
            }
            const newNameEl = document.createElement('div');
            newNameEl.className = 'bp-var-name';
            newNameEl.style.cssText = 'color:var(--text-primary);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            newNameEl.textContent = v.name;
            input.replaceWith(newNameEl);
        };

        input.addEventListener('blur', () => finishEdit(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishEdit(true);
            else if (e.key === 'Escape') finishEdit(false);
        });
    }

    function inlineEditCharacterName(key) {
        const item = document.querySelector(`.bp-char-item[data-char-key="${key}"]`);
        if (!item) return;
        const nameEl = item.querySelector('.bp-char-name');
        if (!nameEl) return;
        const c = currentDesign.characters[key];
        if (!c) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = c.name;
        input.style.cssText = 'width:100%;background:var(--bg-primary);border:1px solid var(--accent-purple);border-radius:4px;padding:2px 4px;color:var(--text-primary);font-size:0.75rem;box-sizing:border-box;';

        nameEl.replaceWith(input);
        input.focus();
        input.select();

        const finishEdit = (save) => {
            if (save) {
                const val = input.value.trim();
                if (val) c.name = val;
            }
            const newNameEl = document.createElement('span');
            newNameEl.className = 'bp-char-name';
            newNameEl.style.cssText = `color:${c.color};flex:1;`;
            newNameEl.textContent = c.name;
            input.replaceWith(newNameEl);
        };

        input.addEventListener('blur', () => finishEdit(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishEdit(true);
            else if (e.key === 'Escape') finishEdit(false);
        });
    }

    function showAddVariableDialog() {
        // 创建一个内嵌的添加行，避免用 prompt
        const section = document.getElementById('bp-var-section');
        if (!section) return;
        // 如果已经显示了输入行就不重复创建
        if (document.getElementById('bp-new-var-row')) return;

        const row = document.createElement('div');
        row.id = 'bp-new-var-row';
        row.style.cssText = 'background:var(--bg-card);border:1px dashed var(--accent-blue);border-radius:var(--radius-sm);padding:8px;margin-bottom:6px;font-size:0.75rem;';
        row.innerHTML = `
            <input id="bp-new-var-name" placeholder="${I18N.t('designerVarNamePlaceholder')}" style="width:100%;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;padding:4px 6px;color:var(--text-primary);font-size:0.75rem;margin-bottom:4px;box-sizing:border-box;">
            <div style="display:flex;gap:4px;margin-bottom:4px;">
                <select id="bp-new-var-type" style="flex:1;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;padding:4px 6px;color:var(--text-primary);font-size:0.75rem;">
                    <option value="number">${I18N.t('designerTypeInt')}</option>
                    <option value="float">${I18N.t('designerTypeFloat')}</option>
                    <option value="boolean">${I18N.t('designerTypeBool')}</option>
                    <option value="string">${I18N.t('designerTypeString')}</option>
                </select>
            </div>
            <input id="bp-new-var-default" placeholder="${I18N.t('designerDefaultVal')}" style="width:100%;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;padding:4px 6px;color:var(--text-primary);font-size:0.75rem;margin-bottom:4px;box-sizing:border-box;">
            <div style="display:flex;gap:4px;">
                <button id="bp-confirm-var-btn" style="flex:1;background:var(--accent-blue);color:#fff;border:none;border-radius:4px;padding:4px;cursor:pointer;font-size:0.75rem;">${I18N.t('designerConfirm')}</button>
                <button id="bp-cancel-var-btn" style="flex:1;background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);border-radius:4px;padding:4px;cursor:pointer;font-size:0.75rem;">${I18N.t('designerCancel')}</button>
            </div>`;

        section.appendChild(row);

        // 聚焦名称输入框
        document.getElementById('bp-new-var-name').focus();

        document.getElementById('bp-confirm-var-btn').onclick = () => confirmAddVariable();
        document.getElementById('bp-cancel-var-btn').onclick = () => row.remove();
        document.getElementById('bp-new-var-name').onkeydown = (e) => { if (e.key === 'Enter') confirmAddVariable(); };
    }

    function confirmAddVariable() {
        const nameEl = document.getElementById('bp-new-var-name');
        const typeEl = document.getElementById('bp-new-var-type');
        const defaultEl = document.getElementById('bp-new-var-default');
        if (!nameEl || !typeEl || !defaultEl) return;

        const name = nameEl.value.trim();
        if (!name) { alert(I18N.t('designerVarNameRequired')); return; }
        const type = typeEl.value;
        let defaultValue;
        try {
            defaultValue = parseDefaultValue(defaultEl.value.trim(), type);
        } catch (err) {
            alert(err.message);
            return;
        }

        const key = 'var_' + name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        currentDesign.variables[key] = {
            name,
            nameEn: name,
            nameJa: name,
            type,
            defaultValue
        };

        render(); // 重绘面板以显示新变量
    }

    function parseDefaultValue(raw, type) {
        if (raw === '') {
            switch (type) {
                case 'number': return 0;
                case 'float': return 0.0;
                case 'boolean': return false;
                case 'string': return '';
            }
        }
        switch (type) {
            case 'number': {
                const n = parseInt(raw, 10);
                if (isNaN(n)) throw new Error('整数格式不正确');
                return n;
            }
            case 'float': {
                const f = parseFloat(raw);
                if (isNaN(f)) throw new Error('浮点数格式不正确');
                return f;
            }
            case 'boolean':
                return raw === 'true' || raw === '1' || raw === '是' ? true : false;
            case 'string':
                return raw;
            default:
                return raw;
        }
    }

    function deleteVariable(key) {
        const v = currentDesign.variables[key];
        if (!v) return;
        if (!confirm(I18N.t('designerConfirmDelVar', { name: v.name }) + '\n\n' + I18N.t('designerConfirmDelVar', { name: v.name }).replace(/[^\n]*/, ''))) return;
        delete currentDesign.variables[key];
        render();
    }

    function deleteCharacter(key) {
        const c = currentDesign.characters[key];
        if (!c) return;
        if (!confirm(I18N.t('designerConfirmDelChar', { name: c.name }))) return;
        delete currentDesign.characters[key];
        render();
    }

    function createNodeElement(node) {
        const tpl = NODE_TEMPLATES[node.type];
        const isSelected = node.id === selectedNodeId;
        const isStart = inFnMode() ? (node.id === (curFnDef().startNode || '')) : (node.id === currentDesign.startNode);

        const el = document.createElement('div');
        el.className = 'bp-node';
        el.dataset.nodeId = node.id;
        el.style.cssText = `
            position:absolute;left:0;top:0;transform:translate(${node.x}px, ${node.y}px);width:220px;
            background:var(--bg-card);border-radius:var(--radius-md);
            border:2px solid ${isSelected ? '#fff' : 'transparent'};
            box-shadow:0 4px 16px rgba(0,0,0,0.4);
            overflow:hidden;z-index:5;cursor:pointer;will-change:transform;touch-action:none;
        `;

        // 标题栏
        const header = document.createElement('div');
        header.style.cssText = `background:${tpl.color};padding:8px 12px;display:flex;align-items:center;justify-content:space-between;`;
        header.innerHTML = `<span style="font-weight:700;font-size:0.9rem;color:#fff;">${getText(tpl.title, tpl.titleEn, tpl.titleJa)}</span>`;
        if (isStart) header.innerHTML += `<span style="font-size:0.6rem;background:rgba(255,255,255,0.2);color:#fff;padding:1px 6px;border-radius:8px;">${I18N.t('designerHintStart')}</span>`;

        // 添加删除按钮（起始节点不允许删除）
        if (!isStart) {
            const delBtn = document.createElement('button');
            delBtn.className = 'bp-node-delete-btn';
            delBtn.innerHTML = '✕';
            delBtn.title = I18N.t('designerDelete') || '删除节点';
            delBtn.style.cssText = 'background:rgba(239,68,68,0.8);border:none;color:#fff;border-radius:4px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.7rem;padding:0;margin-left:6px;transition:background 0.15s;';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm((I18N.t('designerConfirmDelNode') || '确定要删除此节点吗？') + `\n(${getText(tpl.title, tpl.titleEn, tpl.titleJa)})`)) {
                    deleteNode(node.id);
                }
            });
            delBtn.addEventListener('mouseenter', () => { delBtn.style.background = '#ef4444'; });
            delBtn.addEventListener('mouseleave', () => { delBtn.style.background = 'rgba(239,68,68,0.8)'; });
            header.appendChild(delBtn);
        }

        el.appendChild(header);

        // 输入引脚
        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'bp-pins inputs';
        inputsDiv.style.cssText = 'position:relative;padding:6px 0 0 0;';
        node.inputs.forEach(pin => {
            inputsDiv.appendChild(createPin(pin, 'input'));
        });
        el.appendChild(inputsDiv);

        // 内容区域
        const body = document.createElement('div');
        body.className = 'bp-node-body';
        body.style.cssText = 'padding:8px 12px;min-height:40px;font-size:0.8rem;color:var(--text-secondary);touch-action:none;';
        body.innerHTML = getNodeBodyPreview(node);
        // 移动端：点击节点 body 区域直接打开细节面板（不触发拖拽）
        // 使用 click 事件确保在所有触控设备上可靠触发
        body.addEventListener('click', (e) => {
            e.stopPropagation();
            // 选中并打开面板（不启动拖拽）
            if (dragNode) { dragNode = null; }
            selectNodeLight(node.id);
        });
        el.appendChild(body);

        // 输出引脚
        const outputsDiv = document.createElement('div');
        outputsDiv.className = 'bp-pins outputs';
        outputsDiv.style.cssText = 'position:relative;padding:0 0 6px 0;';
        node.outputs.forEach(pin => {
            outputsDiv.appendChild(createPin(pin, 'output'));
        });
        el.appendChild(outputsDiv);

        // 节点拖拽（使用指针事件，兼容鼠标/触摸/触控笔；排除引脚和删除按钮区域）
        // 绑定在整个节点上，扩大可拖拽区域，移动端更易操作
        el.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.bp-pin')) return;
            if (e.target.closest('.bp-node-delete-btn')) return; // 删除按钮不触发拖拽
            if (e.button === 2) return; // 右键不拖拽
            // 移动端：点击 body 区域不启动拖拽（由 body.click 单独处理面板打开），
            // 只有拖拽操作（pointermove > 阈值）才设为拖拽模式。
            if (e.pointerType === 'touch' && e.target.closest('.bp-node-body')) {
                selectNodeLight(node.id);
                e.preventDefault();
                return;
            }
            dragNode = { id: node.id, el, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
            // 轻量选中：不重建 DOM，保证 dragNode.el 始终有效，节点实时跟随鼠标
            selectNodeLight(node.id);
            e.preventDefault(); // 防止触摸时误选中文本/页面滚动
        });

        return el;
    }

    // 引脚被按下时的统一处理（pointerdown / touchstart 共用）：
    //   'done'  → 已连好 / 已取消，调用方不要再开始新的临时连线
    //   'start' → 调用方继续 beginConnection
    function _handlePinPress(pin, direction) {
        if (!tempConnection) return 'start';
        const fromPin = tempConnection.pin;

        // 1) 再次点击起点引脚 → 取消本次连线
        if (fromPin.id === pin.id && fromPin.nodeId === pin.nodeId) {
            tempConnection = null;
            updateSvgLines();
            return 'done';
        }

        // 2) 这两点之间本来就连着 → 视为误触，取消连线（不重复添加、不残留虚线）
        const dup = curConns().some(c =>
            (c.fromNode === fromPin.nodeId && c.fromPin === fromPin.id && c.toNode === pin.nodeId && c.toPin === pin.id) ||
            (c.fromNode === pin.nodeId && c.fromPin === pin.id && c.toNode === fromPin.nodeId && c.toPin === fromPin.id));
        if (dup) {
            tempConnection = null;
            updateSvgLines();
            return 'done';
        }

        // 3) 正常完成连线（"改接"场景：旧连线由 addConnection 自动替换）
        if (_finishConnectionFromTemp(pin, direction)) return 'done';

        // 4) 连接失败（类型不符 / 同方向）→ 收尾旧临时线，从当前引脚重新开始
        tempConnection = null;
        updateSvgLines();
        return 'start';
    }

    function createPin(pin, direction) {
        const el = document.createElement('div');
        el.className = 'bp-pin';
        el.dataset.pinId = pin.id;
        el.dataset.nodeId = pin.nodeId;
        el.dataset.direction = direction;
        el.dataset.type = pin.type;
        el.style.cssText = `
            position:relative;display:flex;align-items:center;gap:6px;
            padding:2px 8px;margin:1px 0;font-size:0.7rem;cursor:crosshair;touch-action:none;
            ${direction === 'output' ? 'justify-content:flex-end;' : ''}
        `;
        el.innerHTML = `
            <span class="bp-pin-circle" style="width:10px;height:10px;border-radius:50%;background:${TYPE_COLORS[pin.type] || '#999'};border:2px solid var(--bg-card);box-shadow:0 0 0 1px ${TYPE_COLORS[pin.type] || '#999'};z-index:6;"></span>
            <span style="color:var(--text-secondary);white-space:nowrap;${direction === 'output' ? 'order:-1;' : ''}">${getText(pin.name, pin.nameEn, pin.nameJa)}</span>
        `;

        // 从任意引脚按下即可开始连线（输出或输入方向均可）
        // 若已有活跃的连接（tempConnection），则直接完成连线（点击引脚 → 点击引脚，无需拖拽）
        el.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            el.dataset.pdFired = '1'; // 标记 pointerdown 已处理，touchstart 兜底跳过
            if (_handlePinPress(pin, direction) === 'done') return;
            beginConnection(pin, direction);
        });

        // 部分 Android WebView/HBuilder WebView 中 Pointer Events 支持不完整，
        // 加上 touchstart 作为兜底。CSS touch-action:none 已禁止浏览器默认滚动，
        // 这里用被动模式（不必 preventDefault）。
        el.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            // 支持 Pointer Events 的环境：pointerdown 已先处理，touchstart 不再重复触发，
            // 否则 tap-to-connect 完成连线后又会 beginConnection 产生新的临时线
            if (el.dataset.pdFired === '1') { delete el.dataset.pdFired; return; }
            if (_handlePinPress(pin, direction) === 'done') return;
            beginConnection(pin, direction);
        }, { passive: true });

        el.addEventListener('mouseenter', () => {
            const c = el.querySelector('.bp-pin-circle');
            if (c) c.style.transform = 'scale(1.4)';
            // 连线过程中高亮可对接的引脚
            if (tempConnection && isCompatibleTarget(pin, direction)) {
                el.style.background = 'rgba(255,255,255,0.12)';
            }
        });
        el.addEventListener('mouseleave', () => {
            const c = el.querySelector('.bp-pin-circle');
            if (c) c.style.transform = 'scale(1)';
            el.style.background = '';
        });

        return el;
    }

    function getNodeBodyPreview(node) {
        const tpl = NODE_TEMPLATES[node.type];
        if (node.type === 'dialogue' || node.type === 'narration') {
            // 对话节点附加表情名标签（该角色表情素材库中的名字）
            const exprTag = (node.type === 'dialogue' && node.data.expression)
                ? `<div style="color:var(--accent-cyan);font-size:0.66rem;">🎭 ${escapeHtml(node.data.expression)}</div>` : '';
            return exprTag + `<div style="color:var(--text-primary);">${escapeHtml(node.data.text || '...').substring(0, 60)}</div>`;
        }
        if (node.type === 'illustration') {
            // 画布节点内直接显示插图缩略图（Emoji 或图片引用，走 IMGDB 渲染）
            const iconHTML = (window.IMGDB && IMGDB.renderIconHTML)
                ? IMGDB.renderIconHTML(node.data.icon || '🖼️', 46)
                : escapeHtml(node.data.icon || '🖼️');
            const cap = escapeHtml(node.data.caption || '');
            return `<div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:46px;height:46px;flex-shrink:0;border-radius:6px;background:var(--bg-page);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;overflow:hidden;">${iconHTML}</div>
                    <div style="min-width:0;flex:1;">
                        <div style="color:#5eead4;font-size:0.68rem;font-weight:600;">🖼 ${escapeHtml(I18N.t('designerNodeIllustration') || '插图')}</div>
                        <div style="color:var(--text-muted);font-size:0.66rem;overflow-wrap:break-word;">${cap.substring(0, 24) || '—'}</div>
                    </div>
                </div>`;
        }
        if (node.type === 'choice') {
            return node.data.choices.map((c, i) => `<div style="color:var(--accent-yellow);font-size:0.7rem;">${i+1}. ${escapeHtml(c.text || '').substring(0, 20)}</div>`).join('');
        }
        if (node.type === 'condition') {
            const d = node.data;
            const leftLabel = d.leftType === 'direct' ? d.leftDirect : (d.leftVariable || '?');
            const rightLabel = d.compareWith === 'direct' ? d.rightDirect : (d.compareWith === 'variable' ? (d.rightVariable || '?') : '📌引针');
            return `<div style="color:var(--accent-pink);font-size:0.75rem;font-weight:600;">${escapeHtml(String(leftLabel))} ${d.operator || '>='} ${escapeHtml(String(rightLabel))}</div>`;
        }
        if (node.type === 'set_variable') {
            const v = (currentDesign.variables || {})[node.data.variableName] || {};
            const op = node.data.operation || 'add';
            const val = node.data.operandValue ?? 10;
            const opLabels = { set: '=', add: '+', sub: '-', mul: '×', div: '÷' };
            const opText = I18N.t('designerOp' + op.charAt(0).toUpperCase() + op.slice(1)) || op;
            return `<div style="color:var(--accent-cyan);font-size:0.75rem;font-weight:600;">${escapeHtml(v.name || node.data.variableName)} <span style="color:var(--accent-yellow);">${opLabels[op] || op}</span> ${val}</div>`;
        }
        if (node.type === 'get_variable') {
            const v = (currentDesign.variables || {})[node.data.variableName] || {};
            return `<div style="color:var(--accent-blue);font-size:0.75rem;">${I18N.t('designerGetVarPrefix')} ${escapeHtml(v.name || node.data.variableName)}</div>`;
        }
        if (node.type === 'chapter_begin') {
            return `<div style="color:var(--text-primary);font-size:0.8rem;">${escapeHtml(node.data.chapterTitle || '新章节').substring(0, 30)}</div>`;
        }
        if (node.type === 'fn_entry') {
            const fd = curFnDef();
            const ps = fd ? (fd.params || []) : [];
            return `<div style="color:#5eead4;font-size:0.75rem;font-weight:600;">ƒ ${escapeHtml(fd ? (fd.name || '') : '')}</div>` +
                `<div style="color:var(--text-muted);font-size:0.68rem;">(${escapeHtml(ps.join(', '))})</div>`;
        }
        if (node.type === 'fn_return') {
            const fd = curFnDef();
            const outs = (fd && fd.outputs) || [];
            let body;
            if (outs.length) {
                const vals = node.data.values || {};
                body = outs.map(o => o + (vals[o] ? '←' + vals[o] : '')).join(', ');
            } else {
                body = node.data.value || '';
            }
            return `<div style="color:#fda4af;font-size:0.72rem;font-weight:600;">⏎ ${body ? escapeHtml(body).substring(0, 40) : I18N.t('designerFnNoReturn')}</div>`;
        }
        if (node.type === 'function') {
            const fn = (currentDesign.functions || {})[node.data.fnId];
            const fnName = fn ? fn.name : (node.data.fnId || I18N.t('designerFnSelect'));
            const isLegacy = isLegacyFn(fn);
            const params = fn ? (fn.params || []).map(p => {
                const a = (node.data.args || {})[p] || {};
                return a.t === 'direct' ? String(a.v ?? 0) : (a.v || p);
            }) : [];
            const ret = isLegacy
                ? (fn.returns || []).map(rk => (node.data.resultVars || {})[rk] || rk).join(', ')
                : (fn.outputs || []).map(o => (node.data.resultVars || {})[o] || o).join(', ');
            return `<div style="color:#5eead4;font-size:0.75rem;font-weight:600;">ƒ ${escapeHtml(String(fnName)).substring(0, 20)}</div>` +
                `<div style="color:var(--text-muted);font-size:0.68rem;">(${escapeHtml(params.join(', '))}) → ${escapeHtml(ret)}</div>`;
        }
        if (node.type === 'input') {
            const typeIcon = node.data.inputType === 'number' ? '#️⃣' : '⌨';
            const varKey = node.data.variable || '';
            const vDef = (currentDesign.variables || {})[varKey];
            // 显示变量「显示名」（键为 var_名字 这类形式，直接显示键很难辨认）
            const vLabel = vDef ? (vDef.name || varKey) : (varKey || '?');
            const warn = (varKey && !vDef) ? '⚠ ' : '';
            return `<div style="color:#7dd3fc;font-size:0.75rem;font-weight:600;">${typeIcon} ${warn}${escapeHtml(vLabel)}</div>` +
                `<div style="color:var(--text-muted);font-size:0.68rem;">${escapeHtml((node.data.prompt || '').substring(0, 24))}</div>`;
        }
        if (node.type === 'end_game') {
            return `<div style="color:var(--accent-red);font-size:0.75rem;">${(window.IMGDB ? IMGDB.renderIconHTML(node.data.endingIcon || '🌟', 14) : '')} ${escapeHtml(node.data.endingType || 'good').toUpperCase()}</div>`;
        }
        return '';
    }

    // ==================== 连接渲染 ====================
    function renderConnections(svg, canvasRect) {
        curConns().forEach(conn => {
            const fromPos = getPinPosition(conn.fromNode, conn.fromPin, canvasRect);
            const toPos = getPinPosition(conn.toNode, conn.toPin, canvasRect);
            if (!fromPos || !toPos) return;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = createBezierPath(fromPos, toPos);
            const pin = getPinById(conn.fromPin);
            const color = TYPE_COLORS[pin?.type || 'exec'];
            path.setAttribute('d', d);
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', pin?.type === 'exec' ? '2' : '1.5');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('class', 'bp-connection');
            path.dataset.connId = conn.id;
            path.style.cursor = 'pointer';
            path.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.shiftKey || e.ctrlKey) deleteConnection(conn.id);
            });
            svg.appendChild(path);
        });
    }

    function renderTempConnection(svg) {
        if (!tempConnection) return;
        const startPos = tempConnection.startPos;
        const endPos = tempConnection.currentPos;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = createBezierPath(startPos, endPos);
        const color = TYPE_COLORS[tempConnection.pin.type || 'exec'];
        path.setAttribute('d', d);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '5,3');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);
    }

    function createBezierPath(from, to) {
        const midX = (from.x + to.x) / 2;
        return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
    }

    // 返回引脚圆心的"世界坐标"（与 SVG 内部坐标系一致：不受 scale/translate 影响）。
    // 原理：节点层有 transform: translate(X, Y) scale(S)，引脚的屏幕坐标 = 世界坐标 * S + offset。
    // 反推：世界坐标 = (屏幕坐标 - offset) / S
    function getPinPosition(nodeId, pinId, canvasRect) {
        const canvas = document.getElementById('bp-canvas');
        if (!canvas) return null;
        const cr = canvasRect || canvas.getBoundingClientRect();
        const nodeEl = document.querySelector(`.bp-node[data-node-id="${nodeId}"]`);
        if (!nodeEl) return null;
        const pinEl = nodeEl.querySelector(`.bp-pin[data-pin-id="${pinId}"] .bp-pin-circle`);
        if (!pinEl) return null;
        const pinRect = pinEl.getBoundingClientRect();
        // 引脚圆心在画布内的像素坐标
        const screenX = pinRect.left - cr.left + pinRect.width / 2;
        const screenY = pinRect.top - cr.top + pinRect.height / 2;
        // 反算回世界坐标（SVG 内部使用同一坐标系）
        return {
            x: (screenX - canvasOffset.x) / scale,
            y: (screenY - canvasOffset.y) / scale
        };
    }

    function getPinById(pinId) {
        for (const node of curNodes()) {
            const pin = [...node.inputs, ...node.outputs].find(p => p.id === pinId);
            if (pin) return pin;
        }
        return null;
    }

    function getPinByIdFull(pinId) {
        for (const node of curNodes()) {
            const pin = [...node.inputs, ...node.outputs].find(p => p.id === pinId);
            if (pin) return { ...pin, node };
        }
        return null;
    }

    function updateNodePreview(node) {
        const el = document.querySelector(`.bp-node[data-node-id="${node.id}"]`);
        if (el) {
            const body = el.querySelector('.bp-node-body');
            if (body) body.innerHTML = getNodeBodyPreview(node);
        }
    }

    // ==================== 连接拖拽 ====================
    // 从任意引脚开始拖拽（记录起点引脚与方向）
    function beginConnection(pin, direction) {
        const pos = getPinPosition(pin.nodeId, pin.id);
        if (!pos) return;
        tempConnection = {
            pin,
            direction,
            startPos: pos,
            currentPos: { x: pos.x, y: pos.y }
        };
        updateSvgLines();
    }

    // 已有一个活跃连接（tempConnection）时，点击目标引脚直接完成连线。
    // 手机端用户无需拖拽，点输出引脚 → 点输入引脚 即可建立连线。
    function _finishConnectionFromTemp(targetPin, targetDirection) {
        if (!tempConnection) return false;
        const fromPin = tempConnection.pin;
        const fromDir = tempConnection.direction;
        // 排除连接到同一个引脚
        if (targetPin.id === fromPin.id && targetPin.nodeId === fromPin.nodeId) return false;
        let outPin, inPin;
        if (fromDir === 'output' && targetDirection === 'input') {
            outPin = fromPin; inPin = targetPin;
        } else if (fromDir === 'input' && targetDirection === 'output') {
            outPin = targetPin; inPin = fromPin;
        } else {
            return false; // 同方向不能连接
        }
        if (!canConnect(outPin, inPin)) return false;
        // 必须检查 addConnection 返回值：目标输入引脚可能已被占用（非 force 失败），
        // 若失败仍返回 false，让调用方清空旧临时线并从新引脚重新开始
        const ok = addConnection(outPin, inPin);
        if (!ok) return false;
        tempConnection = null;
        forceUpdateConnections();
        return true;
    }

    // 判断目标引脚是否可以与当前拖拽中的引脚对接（方向相反 + canConnect）
    function isCompatibleTarget(targetPin, targetDirection) {
        if (!tempConnection) return false;
        const fromDir = tempConnection.direction;
        if (fromDir === targetDirection) return false;
        let outPin, inPin;
        if (fromDir === 'output') { outPin = tempConnection.pin; inPin = targetPin; }
        else { outPin = targetPin; inPin = tempConnection.pin; }
        return canConnect(outPin, inPin);
    }

    // 在鼠标释放位置寻找目标引脚并建立连接（使用 elementFromPoint，稳定可靠）
    function finishConnectionAt(clientX, clientY) {
        if (!tempConnection) return;
        const pinEl = _findPinAt(clientX, clientY);
        if (!pinEl) return;
        const toNodeId = pinEl.dataset.nodeId;
        const toPinId = pinEl.dataset.pinId;
        const toDirection = pinEl.dataset.direction;
        const toPin = getPinByNodeIdAndId(toNodeId, toPinId);
        if (!toPin) return;

        const fromPin = tempConnection.pin;
        const fromDirection = tempConnection.direction;

        // 归一化为 输出->输入 的方向
        let outPin, inPin;
        if (fromDirection === 'output' && toDirection === 'input') {
            outPin = fromPin; inPin = toPin;
        } else if (fromDirection === 'input' && toDirection === 'output') {
            outPin = toPin; inPin = fromPin;
        } else {
            return; // 同方向不能连接
        }
        addConnection(outPin, inPin);
    }

    // ==================== 画布交互（Pointer Events，兼容鼠标/触摸/触控笔）====================
    function _dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function _mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

    // 在坐标 (x, y) 处查找最近的 .bp-pin 元素。
    // 移动端 document.elementFromPoint 在触摸事件处理期间会"隐藏"被触摸元素导致返回 null，
    // 因此优先使用 elementsFromPoint（返回该坐标下所有层级的元素数组，不受触摸状态影响）兜底。
    function _findPinAt(x, y) {
        // 先用 elementFromPoint（桌面端快路径）
        let el = document.elementFromPoint(x, y);
        if (el) {
            const pin = el.closest('.bp-pin');
            if (pin) return pin;
        }
        // 移动端兜底：elementsFromPoint 不隐藏被触摸的元素
        if (typeof document.elementsFromPoint === 'function') {
            const els = document.elementsFromPoint(x, y);
            for (let i = 0; i < els.length; i++) {
                const pin = els[i].closest('.bp-pin');
                if (pin) return pin;
            }
        }
        return null;
    }

    function onCanvasPointerDown(e) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // 双指 → 进入缩放模式
        if (activePointers.size === 2) {
            const pts = [...activePointers.values()];
            pinchStartDist = _dist(pts[0], pts[1]);
            pinchStartScale = scale;
            pinchMidScreen = _mid(pts[0], pts[1]);
            const canvas = document.getElementById('bp-canvas');
            const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
            pinchAnchorWorld = {
                x: (pinchMidScreen.x - rect.left - canvasOffset.x) / scale,
                y: (pinchMidScreen.y - rect.top - canvasOffset.y) / scale
            };
            pinching = true;
            panning = false;
            dragNode = null;
            tempConnection = null;
            return;
        }

        // 仅当点击在空白处（画布/网格/SVG/节点层）才处理平移/取消选中
        const onEmpty = (e.target === e.currentTarget || e.target.classList.contains('bp-canvas') ||
            e.target.id === 'bp-svg' || e.target.id === 'bp-nodes-layer');
        if (!onEmpty) return;

        if (e.pointerType === 'touch') {
            // 触摸：单指拖拽空白处即平移画布（移动端核心交互）
            panning = true;
            panStart = { x: e.clientX, y: e.clientY };
            const canvas = document.getElementById('bp-canvas');
            if (canvas) canvas.style.cursor = 'grabbing';
            e.preventDefault();
        } else {
            // 鼠标：中键/右键平移；左键空白处取消选中
            if (e.button === 1 || e.button === 2) {
                panning = true;
                panStart = { x: e.clientX, y: e.clientY };
                const canvas = document.getElementById('bp-canvas');
                if (canvas) canvas.style.cursor = 'grabbing';
                e.preventDefault();
            } else if (e.button === 0) {
                selectedNodeId = null;
                render();
            }
        }
    }

    // 仅在设计器激活时处理全局鼠标事件
    function designerActive() {
        const overlay = document.getElementById('designer-overlay');
        return overlay && overlay.classList.contains('active');
    }

    function onGlobalMouseMove(e) {
        if (!designerActive()) return;

        // 协作：拖出画布后仍能看到我的指针（画布内的 pointermove 只覆盖画布区域）
        if (_community) trackPointerWorld(e.clientX, e.clientY);

        // 记录指针位置（用于双指缩放）
        if (activePointers.has(e.pointerId)) {
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        // 双指缩放：以起始中点为锚点，保持该点下的世界坐标不动
        if (pinching && activePointers.size >= 2) {
            const pts = [...activePointers.values()];
            const d = _dist(pts[0], pts[1]);
            const canvas = document.getElementById('bp-canvas');
            const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
            const newScale = Math.max(0.3, Math.min(2.5, pinchStartScale * (d / (pinchStartDist || 1))));
            scale = newScale;
            canvasOffset.x = (pinchMidScreen.x - rect.left) - pinchAnchorWorld.x * newScale;
            canvasOffset.y = (pinchMidScreen.y - rect.top) - pinchAnchorWorld.y * newScale;
            applyCanvasTransform();
            forceUpdateConnections(); // 缩放需要立即更新
            return;
        }

        if (panning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            canvasOffset.x += dx / scale;
            canvasOffset.y += dy / scale;
            panStart = { x: e.clientX, y: e.clientY };
            applyCanvasTransform();
            scheduleConnectionUpdate(); // rAF 节流
            return;
        }

        if (dragNode) {
            const dx = (e.clientX - dragNode.startX) / scale;
            const dy = (e.clientY - dragNode.startY) / scale;
            const node = curNodes().find(n => n.id === dragNode.id);
            if (node) {
                node.x = dragNode.nodeX + dx;
                node.y = dragNode.nodeY + dy;
                // 始终作用于当前真实存在的节点元素（防御性：即便 DOM 被重建也能正确跟随）
                const liveEl = document.querySelector(`.bp-node[data-node-id="${dragNode.id}"]`) || dragNode.el;
                // 使用 transform 替代 left/top — 避免触发 reflow，只触发 composite
                liveEl.style.transform = `translate(${node.x}px, ${node.y}px)`;
                scheduleConnectionUpdate(); // rAF 节流，不立即更新 SVG
            }
            return;
        }

        if (tempConnection) {
            const canvas = document.getElementById('bp-canvas');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            // 指针在画布内的像素坐标 → 转世界坐标（与 SVG 坐标系一致）
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            tempConnection.currentPos = {
                x: (screenX - canvasOffset.x) / scale,
                y: (screenY - canvasOffset.y) / scale
            };
            scheduleConnectionUpdate(); // rAF 节流
        }
    }

    function onGlobalMouseUp(e) {
        activePointers.delete(e.pointerId);

        // 双指缩放结束
        if (pinching && activePointers.size < 2) {
            pinching = false;
            // 若仍有一指按在画布上，继续以平移方式处理
            if (activePointers.size === 1) {
                const p = [...activePointers.values()][0];
                panStart = { x: p.x, y: p.y };
                panning = true;
            }
            return;
        }

        if (!designerActive()) return;

        if (panning) {
            panning = false;
            const canvas = document.getElementById('bp-canvas');
            if (canvas) canvas.style.cursor = 'grab';
        }

        if (dragNode) {
            // 拖动结束：立即做一次完整连线更新确保最终状态正确
            forceUpdateConnections();
            dragNode = null;
            reportPresence(true); // 动作从「拖动中」回到「编辑节点」，立刻告诉别人
        }

        if (tempConnection) {
            // 先尝试正常连接
            const fromPin = tempConnection.pin;
            const fromDir = tempConnection.direction;

            // 检查是否命中了目标引脚（移动端用 elementsFromPoint 兜底）
            const pinEl = _findPinAt(e.clientX, e.clientY);
            let connected = false;

            // 松手位置在同一引脚上 → 不完成连线、不弹选择器，
            // 保持 tempConnection 等待下一次点击（tap-to-connect 模式）
            if (pinEl && pinEl.dataset.pinId === fromPin.id && pinEl.dataset.nodeId === fromPin.nodeId) {
                return;
            }

            if (pinEl) {
                // 正常命中其他引脚，尝试连接（finishConnectionAt 内部处理方向判断）
                finishConnectionAt(e.clientX, e.clientY);
                connected = true;
            }

            // 如果没有命中任何引脚 → 弹出选择器
            if (!connected && tempConnection) { // tempConnection 可能被 finishConnectionAt 清空
                showConnectionPicker(fromPin, fromDir, e.clientX, e.clientY);
            }

            tempConnection = null; // 无论成功与否都清空临时连接
        }
    }

    // 应用画布平移/缩放（网格 + 节点层 + SVG 三层同步变换）
    function applyCanvasTransform() {
        const layer = document.getElementById('bp-nodes-layer');
        const svg = document.getElementById('bp-svg');
        const canvas = document.getElementById('bp-canvas');
        const transform = `translate(${canvasOffset.x}px,${canvasOffset.y}px) scale(${scale})`;
        if (canvas) {
            canvas.style.backgroundPosition = `${canvasOffset.x}px ${canvasOffset.y}px`;
            canvas.style.backgroundSize = `${20 * scale}px ${20 * scale}px`;
        }
        if (layer) layer.style.transform = transform;
        if (svg) svg.style.transform = transform;
        updatePresencePositions(); // 别人的指针跟着画布一起平移/缩放
    }

    function updateSvgLines() {
        const svg = document.getElementById('bp-svg');
        if (!svg) return;
        svg.querySelectorAll('path').forEach(p => p.remove());
        const canvas = document.getElementById('bp-canvas');
        const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        renderConnections(svg, canvasRect);
        if (tempConnection) renderTempConnection(svg);
    }

    // 增量更新版本：只修改已有 path 的 'd' 属性，不销毁/重建 DOM 元素
    // 用于拖动节点等高频场景，性能提升 5-10 倍
    function updateSvgLinesFast() {
        const svg = document.getElementById('bp-svg');
        if (!svg) return;

        // 复用已有的 path 元素，只更新路径数据
        const paths = svg.querySelectorAll('.bp-connection');
        const conns = curConns();

        // 如果数量不匹配（有新增/删除），回退到完整更新
        if (paths.length !== conns.length) {
            updateSvgLines();
            return;
        }

        // 高频场景：整个帧共用同一个画布矩形，避免每条连线重复 getBoundingClientRect 触发布局
        const canvas = document.getElementById('bp-canvas');
        const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };

        // 增量更新每条连线的 path
        for (let i = 0; i < conns.length; i++) {
            const conn = conns[i];
            const fromPos = getPinPosition(conn.fromNode, conn.fromPin, canvasRect);
            const toPos = getPinPosition(conn.toNode, conn.toPin, canvasRect);
            if (!fromPos || !toPos) continue;

            const path = paths[i];
            if (path && path.dataset.connId === conn.id) {
                path.setAttribute('d', createBezierPath(fromPos, toPos));
            } else {
                // ID 不匹配，说明状态不一致，回退
                updateSvgLines();
                return;
            }
        }

        // 临时连线也用增量方式更新（查找临时连线 path）
        let tempPath = svg.querySelector('path[stroke-dasharray]');
        if (tempConnection) {
            const d = createBezierPath(tempConnection.startPos, tempConnection.currentPos);
            if (tempPath) {
                tempPath.setAttribute('d', d);
                const color = TYPE_COLORS[tempConnection.pin.type || 'exec'];
                tempPath.setAttribute('stroke', color);
            } else {
                renderTempConnection(svg);
            }
        } else if (tempPath) {
            tempPath.remove();
        }
    }

    function onCanvasWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        scale = Math.max(0.3, Math.min(2, scale * delta));
        applyCanvasTransform();
        forceUpdateConnections(); // 缩放需要立即更新
    }

    // 触摸端无法使用 HTML5 拖放，点击变量项时在视图中心创建 get_variable 引用节点
    function addVariableNodeAtCenter(varKey) {
        const canvas = document.getElementById('bp-canvas');
        const v = (currentDesign.variables || {})[varKey];
        const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const cx = (rect.width / 2 - canvasOffset.x) / scale;
        const cy = (rect.height / 2 - canvasOffset.y) / scale;
        const node = createNode('get_variable', cx - 110, cy - 30);
        if (node) {
            node.data.variableName = varKey;
            node.data.variableDisplayName = v ? v.name : varKey;
            curNodes().push(node);
            selectedNodeId = node.id;
            render();
        }
    }

    // 适应屏幕：计算所有节点包围盒，缩放到刚好容纳于画布
    function fitView() {
        const canvas = document.getElementById('bp-canvas');
        const cw = canvas ? canvas.clientWidth : window.innerWidth;
        const ch = canvas ? canvas.clientHeight : window.innerHeight;
        if (!curNodes().length) {
            scale = 1; canvasOffset = { x: 40, y: 80 };
            applyCanvasTransform(); forceUpdateConnections();
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        curNodes().forEach(n => {
            const el = document.querySelector(`.bp-node[data-node-id="${n.id}"]`);
            const w = el ? el.offsetWidth : 220;
            const h = el ? el.offsetHeight : 80;
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + w); maxY = Math.max(maxY, n.y + h);
        });
        const pad = 40;
        const bw = (maxX - minX) || 1, bh = (maxY - minY) || 1;
        const s = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh, 1.5);
        scale = Math.max(0.3, Math.min(2, s));
        canvasOffset.x = pad - minX * scale + (cw - pad * 2 - bw * scale) / 2;
        canvasOffset.y = pad - minY * scale + (ch - pad * 2 - bh * scale) / 2;
        applyCanvasTransform();
        forceUpdateConnections();
    }

    // 全局事件（模块加载时注册一次，避免每次 render 叠加监听器）
    // 使用 Pointer Events 统一鼠标 / 触摸 / 触控笔，移动端拖拽与平移依赖它
    document.addEventListener('pointermove', onGlobalMouseMove);
    document.addEventListener('pointerup', onGlobalMouseUp);
    document.addEventListener('pointercancel', onGlobalMouseUp);
    // 视口变化时重新夹取面板宽度，避免拖宽后窗口变小、面板仍占过大空间
    window.addEventListener('resize', () => {
        _resizePanels.forEach(applyPanelW);
    });

    // 部分 Android WebView / HBuilder WebView 的 Pointer Events 支持不完整
    // （不触发 pointermove），用 touchmove 兜底：临时连线跟随手指、节点拖拽、画布平移。
    // 画布/节点/引脚均设置了 touch-action:none，touchmove 会持续派发且不受浏览器滚动干扰。
    document.addEventListener('touchmove', (e) => {
        if (!designerActive()) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        const clientX = touch.clientX;
        const clientY = touch.clientY;

        // 双指缩放已由 pointermove 处理（现代 WebView 均支持 pointermove 进行双指缩放），
        // 单指场景才走这里兜底
        if (pinching) return;

        if (panning) {
            const dx = clientX - panStart.x;
            const dy = clientY - panStart.y;
            canvasOffset.x += dx / scale;
            canvasOffset.y += dy / scale;
            panStart = { x: clientX, y: clientY };
            applyCanvasTransform();
            scheduleConnectionUpdate();
            return;
        }

        if (dragNode) {
            const dx = (clientX - dragNode.startX) / scale;
            const dy = (clientY - dragNode.startY) / scale;
            const node = curNodes().find(n => n.id === dragNode.id);
            if (node) {
                node.x = dragNode.nodeX + dx;
                node.y = dragNode.nodeY + dy;
                const liveEl = document.querySelector(`.bp-node[data-node-id="${dragNode.id}"]`) || dragNode.el;
                liveEl.style.transform = `translate(${node.x}px, ${node.y}px)`;
                scheduleConnectionUpdate();
            }
            return;
        }

        if (tempConnection) {
            const canvas = document.getElementById('bp-canvas');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            tempConnection.currentPos = {
                x: (clientX - rect.left - canvasOffset.x) / scale,
                y: (clientY - rect.top - canvasOffset.y) / scale
            };
            scheduleConnectionUpdate();
        }
    }, { passive: true });

    // 部分 Android WebView Pointer Events 支持不完整（不触发 pointerup/pointercancel），
    // 用 touchend 兜底：处理 dragNode 残留与连线残留。
    document.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        if (!touch) return;

        // 清理 activePointers（pointerId 不对应触摸，但指针映射必须清空）
        if (activePointers.size > 0) {
            activePointers.clear();
        }
        pinching = false;
        panning = false;

        // 优先处理节点拖拽残留（tap 时 pointerdown 设置了 dragNode 但 pointerup 可能不触发）
        if (dragNode) {
            forceUpdateConnections();
            dragNode = null;
            const canvas = document.getElementById('bp-canvas');
            if (canvas) canvas.style.cursor = 'grab';
        }

        // 再处理连线残留
        if (tempConnection) {
            const fromPin = tempConnection.pin;
            const fromDir = tempConnection.direction;
            const pinEl = _findPinAt(touch.clientX, touch.clientY);
            let connected = false;

            // 松手位置在同一引脚上 → 保持 tempConnection（tap-to-connect 模式）
            if (pinEl && pinEl.dataset.pinId === fromPin.id && pinEl.dataset.nodeId === fromPin.nodeId) {
                return;
            }

            if (pinEl) {
                finishConnectionAt(touch.clientX, touch.clientY);
                connected = true;
            }
            if (!connected && tempConnection) {
                showConnectionPicker(fromPin, fromDir, touch.clientX, touch.clientY);
            }
            tempConnection = null;
        }
    });

    // 阻止设计器内右键菜单（便于右键拖动画布）
    document.addEventListener('contextmenu', (e) => {
        if (designerActive()) e.preventDefault();
    });

    // ==================== 属性面板 ====================
    function createPropertyPanel() {
        const panel = document.createElement('div');
        panel.className = 'bp-property-panel open';
        panel.style.cssText = 'position:absolute;right:0;top:var(--bp-toolbar-h,72px);bottom:0;width:260px;background:var(--bg-secondary);border-left:1px solid var(--border-color);padding:12px;z-index:10;overflow-y:auto;';

        const node = curNodes().find(n => n.id === selectedNodeId);
        if (!node) return panel;

        // 顶部条：拖动把手（移动端提示）+ 关闭按钮
        const topBar = document.createElement('div');
        topBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;';
        const handle = document.createElement('div');
        handle.style.cssText = 'flex:1;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        handle.innerHTML = '<div style="width:40px;height:4px;border-radius:2px;background:var(--border-color);"></div>';
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.title = I18N.t('closeSettings') || '关闭';
        closeBtn.style.cssText = 'background:none;border:none;color:var(--text-secondary);font-size:1.1rem;cursor:pointer;padding:2px 8px;line-height:1;flex-shrink:0;';
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); selectedNodeId = null; render(); });
        // 点击把手区域也可关闭（移动端底部抽屉上滑把手关闭更自然）
        handle.addEventListener('click', () => { selectedNodeId = null; render(); });
        topBar.appendChild(handle);
        topBar.appendChild(closeBtn);
        panel.appendChild(topBar);

        const tpl = NODE_TEMPLATES[node.type];
        const titleEl = document.createElement('div');
        titleEl.style.cssText = `font-size:1rem;font-weight:700;margin-bottom:12px;color:${tpl.color};`;
        titleEl.textContent = getText(tpl.title, tpl.titleEn, tpl.titleJa);
        panel.appendChild(titleEl);

        const form = document.createElement('div');
        form.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

        if (node.type === 'dialogue') {
            form.innerHTML += createCharacterSelect(node);
            form.innerHTML += createExpressionSelect(node);
            form.innerHTML += createTextArea(I18N.t('designerZhText'), 'text', node.data.text || '');
            form.innerHTML += createTextArea(I18N.t('designerEnText'), 'textEn', node.data.textEn || '');
            form.innerHTML += createTextArea(I18N.t('designerJaText'), 'textJa', node.data.textJa || '');
            // 对话音效
            const soundDOM = createNodeMusicDOM(node.data, 'sound', '🔊 ' + (I18N.t('musicMessageSfx') || '对话音效'));
            form.appendChild(soundDOM);
        } else if (node.type === 'narration') {
            form.innerHTML += createTextArea(I18N.t('designerZhText'), 'text', node.data.text || '');
            form.innerHTML += createTextArea(I18N.t('designerEnText'), 'textEn', node.data.textEn || '');
            form.innerHTML += createTextArea(I18N.t('designerJaText'), 'textJa', node.data.textJa || '');
            // 旁白音效
            const soundDOM = createNodeMusicDOM(node.data, 'sound', '🔊 ' + (I18N.t('musicMessageSfx') || '音效'));
            form.appendChild(soundDOM);
        } else if (node.type === 'illustration') {
            // 插图：图标（Emoji / 图片素材）+ 三语说明 + 显示尺寸
            const illIconHTML = (window.IMGDB && IMGDB.renderIconHTML)
                ? IMGDB.renderIconHTML(node.data.icon || '🖼️', 56)
                : escapeHtml(node.data.icon || '🖼️');
            form.innerHTML += `
                <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:10px;">
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:8px;">🖼 ${I18N.t('designerIllustrationPick')}</div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div id="prop-ill-preview" style="width:56px;height:56px;flex-shrink:0;border-radius:8px;background:var(--bg-page);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;overflow:hidden;">${illIconHTML}</div>
                        <button id="prop-ill-icon-btn" style="background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:0.78rem;cursor:pointer;white-space:nowrap;">${I18N.t('designerPickIcon')}</button>
                    </div>
                </div>
                <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:10px;margin-top:8px;">
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:6px;">${I18N.t('designerIllustrationSize')}</div>
                    <select id="prop-ill-size" style="width:100%;background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:6px;padding:6px;font-size:0.8rem;">
                        <option value="large"${node.data.size !== 'medium' ? ' selected' : ''}>${I18N.t('designerIllustrationSizeLarge')}</option>
                        <option value="medium"${node.data.size === 'medium' ? ' selected' : ''}>${I18N.t('designerIllustrationSizeMedium')}</option>
                    </select>
                </div>`;
            form.innerHTML += createTextArea(I18N.t('designerIllustrationCaption') + '（中）', 'caption', node.data.caption || '');
            form.innerHTML += createTextArea(I18N.t('designerIllustrationCaption') + '（EN）', 'captionEn', node.data.captionEn || '');
            form.innerHTML += createTextArea(I18N.t('designerIllustrationCaption') + '（JA）', 'captionJa', node.data.captionJa || '');
        } else if (node.type === 'choice') {
            form.innerHTML += createChoiceEditor(node);
        } else if (node.type === 'condition') {
            const d = node.data;
            // 完整的比较运算符列表
            const operators = [
                ['>=', '≥ 大于等于'], ['>', '> 大于'], ['<=', '≤ 小于等于'], ['<', '< 小于'],
                ['==', '== 等于'], ['!=', '≠ 不等于'],
                ['&&', '&& 逻辑与'], ['||', '|| 逻辑或'],
                ['contains', '包含'], ['startsWith', '以...开头'], ['endsWith', '以...结尾'],
                ['empty', '为空'], ['notEmpty', '不为空']
            ];
            form.innerHTML += `
                <div style="font-size:0.8rem;font-weight:700;color:var(--accent-pink);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color);">🧮 ${I18N.t('designerConditionJudge')}</div>

                <!-- 左侧值 -->
                <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:10px;margin-bottom:10px;">
                    <label style="font-size:0.7rem;color:var(--text-muted);display:block;margin-bottom:6px;">${I18N.t('designerLeftValue')}</label>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <select class="prop-select" data-key="leftType" style="width:72px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:5px 6px;color:var(--text-primary);font-size:0.75rem;">
                            <option value="variable" ${d.leftType === 'variable' ? 'selected' : ''}>${I18N.t('designerVarSelect')}</option>
                            <option value="direct" ${d.leftType === 'direct' ? 'selected' : ''}>${I18N.t('designerNumSelect')}</option>
                        </select>
                        ${d.leftType === 'variable'
                            ? createVariableSelectInline('leftVariable', d.leftVariable, '')
                            : createInputInline('leftDirect', String(d.leftDirect ?? 0), 'number', '80px')}
                    </div>
                </div>

                <!-- 运算符（居中突出） -->
                <div style="text-align:center;margin:8px 0;">
                    <select class="prop-select" data-key="operator" style="background:var(--accent-pink);color:#fff;border:1px solid var(--accent-pink);border-radius:var(--radius-sm);padding:6px 16px;color:#fff;font-size:0.85rem;font-weight:600;min-width:120px;">
                        ${operators.map(o => `<option value="${o[0]}" ${d.operator === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}
                    </select>
                </div>

                <!-- 右侧值 -->
                <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:10px;margin-bottom:10px;">
                    <label style="font-size:0.7rem;color:var(--text-muted);display:block;margin-bottom:6px;">${I18N.t('designerRightValue')}</label>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <select class="prop-select" data-key="compareWith" style="width:72px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:5px 6px;color:var(--text-primary);font-size:0.75rem;">
                            <option value="direct" ${d.compareWith === 'direct' ? 'selected' : ''}>${I18N.t('designerNumSelect')}</option>
                            <option value="variable" ${d.compareWith === 'variable' ? 'selected' : ''}>${I18N.t('designerVarSelect')}</option>
                            <option value="pin" ${d.compareWith === 'pin' ? 'selected' : ''}>📌引脚</option>
                        </select>
                        ${d.compareWith === 'variable'
                            ? createVariableSelectInline('rightVariable', d.rightVariable, '')
                            : d.compareWith === 'pin'
                            ? `<span style="font-size:0.78rem;color:var(--accent-cyan);padding:4px 8px;background:rgba(34,211,238,0.1);border-radius:4px;">📌 ${I18N.t('designerPinConn')}</span>`
                            : createInputInline('rightDirect', String(d.rightDirect ?? 0), 'number', '80px')}
                    </div>
                </div>

                <!-- 当前条件预览 -->
                <div style="background:linear-gradient(135deg,rgba(236,72,153,0.08),rgba(168,85,247,0.08));border:1px dashed var(--accent-pink);border-radius:var(--radius-sm);padding:8px;text-align:center;">
                    <span style="font-size:0.75rem;color:var(--accent-pink);">当前条件：</span>
                    <strong id="condition-preview" style="font-size:0.85rem;color:var(--accent-pink);"></strong>
                </div>
            `;
        } else if (node.type === 'set_variable') {
            form.innerHTML += createVariableSelect('variableName', node.data.variableName, I18N.t('designerTargetVar'));
            form.innerHTML += `
                <div>
                    <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerOperation')}</label>
                    <select class="prop-select" data-key="operation" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                        <option value="set" ${node.data.operation === 'set' ? 'selected' : ''}>= ${I18N.t('designerOpSet') || '赋值 (设为)'}</option>
                        <option value="add" ${node.data.operation === 'add' ? 'selected' : ''}>+ ${I18N.t('designerOpAdd') || '加法 (+)'}</option>
                        <option value="sub" ${node.data.operation === 'sub' ? 'selected' : ''}>- ${I18N.t('designerOpSub') || '减法 (-)'}</option>
                        <option value="mul" ${node.data.operation === 'mul' ? 'selected' : ''}>× ${I18N.t('designerOpMul') || '乘法 (×)'}</option>
                        <option value="div" ${node.data.operation === 'div' ? 'selected' : ''}>÷ ${I18N.t('designerOpDiv') || '除法 (÷)'}</option>
                    </select>
                </div>
            `;
            form.innerHTML += createInput(I18N.t('designerOperandValue') || '操作数值', 'operandValue', String(node.data.operandValue ?? 10), 'number');
        } else if (node.type === 'get_variable') {
            form.innerHTML += createVariableSelect('variableName', node.data.variableName, I18N.t('designerVarSelect'));
        } else if (node.type === 'chapter_begin') {
            form.innerHTML += createInput(I18N.t('designerChapterTitle'), 'chapterTitle', node.data.chapterTitle || '');
            form.innerHTML += createInput(I18N.t('designerSubtitle'), 'chapterSubtitle', node.data.chapterSubtitle || '');
            // 章节 BGM
            const bgmDOM = createNodeMusicDOM(node.data, 'bgm', '🎵 ' + (I18N.t('musicChapterBgm') || '章节BGM'));
            form.appendChild(bgmDOM);
        } else if (node.type === 'end_game' || node.type === 'end_chapter') {
            form.innerHTML += createSelect(I18N.t('designerEndingType'), 'endingType', node.data.endingType, [
                ['perfect', I18N.t('designerEndingPerfect')], ['good', I18N.t('designerEndingGood')], ['bad', I18N.t('designerEndingBad')], ['hidden', I18N.t('designerEndingHidden')]
            ]);
            // 结局图标（emoji 或图片，通用图标选择器）
            form.innerHTML += `
                <div>
                    <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerEndingIcon')}</label>
                    <div style="display:flex;align-items:center;gap:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:7px 10px;">
                        <span id="prop-ending-icon-preview" style="min-width:30px;text-align:center;">${window.IMGDB ? IMGDB.renderIconHTML(node.data.endingIcon || '🌟', 26) : (node.data.endingIcon || '🌟')}</span>
                        <span style="flex:1;font-size:0.72rem;color:var(--text-muted);">${I18N.t('designerEndingIconHint')}</span>
                        <button id="prop-ending-icon-btn" style="background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:0.75rem;cursor:pointer;white-space:nowrap;">${I18N.t('designerPickIcon')}</button>
                    </div>
                </div>
            `;
            form.innerHTML += createInput(I18N.t('designerEndingTitleLabel'), 'endingTitle', node.data.endingTitle || '');
            form.innerHTML += createTextArea(I18N.t('designerEndingDesc'), 'endingDesc', node.data.endingDesc || '');
            if (node.type === 'end_game') {
                form.innerHTML += createInput(I18N.t('designerRewardSeeds'), 'rewardSeeds', String(node.data.rewardSeeds || 3), 'number');
            }
        } else if (node.type === 'character_info') {
            form.innerHTML += createCharacterSelect(node, true);
        } else if (node.type === 'function') {
            const fns = currentDesign.functions || {};
            const fnIds = Object.keys(fns);
            let fnOpts = `<option value="">— ${I18N.t('designerFnSelect')} —</option>`;
            fnIds.forEach(id => {
                fnOpts += `<option value="${escapeHtml(id)}" ${node.data.fnId === id ? 'selected' : ''}>ƒ ${escapeHtml(fns[id].name || id)}</option>`;
            });
            form.innerHTML += `
                <div>
                    <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerFnSelect')}</label>
                    <select class="fn-fn-select" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">${fnOpts}</select>
                    <button id="fn-open-bp-btn" style="width:100%;margin-top:8px;background:rgba(20,184,166,0.12);border:1px solid #14b8a6;color:#5eead4;border-radius:var(--radius-sm);padding:6px;cursor:pointer;font-size:0.78rem;">ƒ ${I18N.t('designerFnEditBp')}</button>
                </div>
            `;
            const fnDef = fns[node.data.fnId];
            if (fnDef) {
                // 参数来源：变量 / 常量
                (fnDef.params || []).forEach(p => {
                    const a = (node.data.args || {})[p] || { t: 'var', v: p };
                    const isDirect = a.t === 'direct';
                    form.innerHTML += `
                        <div style="margin-top:10px;">
                            <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerFnArg')} · <span style="font-family:monospace;color:#5eead4;">${escapeHtml(p)}</span></label>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <select class="fn-arg-source" data-arg="${escapeHtml(p)}" style="width:86px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:5px 6px;color:var(--text-primary);font-size:0.75rem;flex-shrink:0;">
                                    <option value="var" ${!isDirect ? 'selected' : ''}>${I18N.t('designerVarSelect')}</option>
                                    <option value="direct" ${isDirect ? 'selected' : ''}>${I18N.t('designerNumSelect')}</option>
                                </select>
                                ${isDirect
                                    ? `<input class="fn-arg-value" data-arg="${escapeHtml(p)}" type="number" value="${escapeHtml(String(a.v ?? 0))}" style="flex:1;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:5px 8px;color:var(--text-primary);font-size:0.8rem;">`
                                    : fnArgVarSelect(p, a.v)}
                            </div>
                        </div>
                    `;
                });
                // 输出变量 → 写入目标（图函数：逐输出下拉；输出也可由输出引脚连线到「设置变量」节点写入）
                if (!isLegacyFn(fnDef)) {
                    const outs = fnDef.outputs || [];
                    if (outs.length) {
                        form.innerHTML += `<div style="margin-top:10px;">
                            <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:6px;">${I18N.t('designerFnResultVar')}</label>
                            ${outs.map(o => {
                                const target = (node.data.resultVars || {})[o] || '';
                                const varOpts = Object.entries(currentDesign.variables || {}).map(([k, v]) =>
                                    `<option value="${escapeHtml(k)}" ${target === k ? 'selected' : ''}>${escapeHtml(v.name || k)}</option>`).join('');
                                return `
                                <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                                    <span style="font-family:monospace;color:#5eead4;font-size:0.75rem;width:76px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(o)}">⇒ ${escapeHtml(o)}</span>
                                    <select class="fn-ret-var" data-out="${escapeHtml(o)}"
                                        style="flex:1;min-width:0;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:5px 6px;color:var(--text-primary);font-size:0.78rem;">
                                        <option value="">— ${I18N.t('designerFnNoWrite')} —</option>
                                        ${varOpts}
                                    </select>
                                </div>`;
                            }).join('')}
                            <div style="font-size:0.72rem;color:var(--text-muted);line-height:1.6;margin-top:6px;">${I18N.t('designerFnPinHint')}</div>
                        </div>`;
                    } else {
                        // 旧版单返回值下拉（遗留）
                        const retTarget = node.data.resultVar || (node.data.resultVars && Object.values(node.data.resultVars)[0]) || '';
                        const varOpts2 = Object.entries(currentDesign.variables || {}).map(([k, v]) =>
                            `<option value="${escapeHtml(k)}" ${retTarget === k ? 'selected' : ''}>${escapeHtml(v.name || k)}</option>`).join('');
                        form.innerHTML += `
                            <div style="margin-top:10px;">
                                <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerFnResultVar')}</label>
                                <select class="fn-ret-select" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                                    <option value="">— ${I18N.t('designerFnNoReturn')} —</option>
                                    ${varOpts2}
                                </select>
                            </div>`;
                    }
                } else {
                    (fnDef.returns || []).forEach(rk => {
                        const target = (node.data.resultVars || {})[rk] || rk;
                        form.innerHTML += `
                            <div style="margin-top:10px;">
                                <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerFnTargetVar')} · <span style="font-family:monospace;color:#7dd3fc;">${escapeHtml(rk)}</span></label>
                                <input class="fn-ret-input" data-ret="${escapeHtml(rk)}" type="text" value="${escapeHtml(target)}" placeholder="${escapeHtml(rk)}"
                                    style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;font-family:monospace;">
                            </div>
                        `;
                    });
                }
            } else if (fnIds.length === 0) {
                form.innerHTML += `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;line-height:1.6;">${I18N.t('designerFnEmpty')}</div>`;
            }
        } else if (node.type === 'fn_entry') {
            // 函数入口：编辑函数名与参数列表（写入函数定义；参数在函数体内用 {参数名} 引用）
            const fd = curFnDef();
            if (fd) {
                form.innerHTML += `
                    <div>
                        <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerFnName')}</label>
                        <input class="fn-entry-name" type="text" value="${escapeHtml(fd.name || '')}"
                            style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                    </div>
                    <div style="margin-top:10px;">
                        <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:6px;">${I18N.t('designerFnParams')}</label>
                        ${(fd.params || []).map((p, i) => `
                            <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                                <input class="fn-entry-param" data-idx="${i}" type="text" value="${escapeHtml(p)}" placeholder="param${i + 1}"
                                    style="flex:1;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.8rem;font-family:monospace;">
                                <button class="fn-entry-param-del" data-idx="${i}" style="background:none;border:1px solid var(--accent-red);color:var(--accent-red);border-radius:var(--radius-sm);padding:4px 10px;cursor:pointer;font-size:0.75rem;">×</button>
                            </div>`).join('')}
                        <button id="fn-entry-add-param" style="width:100%;background:transparent;border:1px dashed #14b8a6;color:#5eead4;padding:6px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;">+ ${I18N.t('designerFnAddParam')}</button>
                        <div style="font-size:0.72rem;color:var(--text-muted);line-height:1.6;margin-top:6px;">${I18N.t('designerFnParamHint')}</div>
                    </div>
                `;
            }
        } else if (node.type === 'fn_return') {
            // 输出变量管理（在函数定义上）：每个输出 → 主蓝图函数节点的输出引脚；取值来源 = 函数参数/变量
            const fd = curFnDef();
            const outs = (fd && fd.outputs) || [];
            const vals = node.data.values || {};
            const srcOpts = (cur) => {
                let opts = `<option value="">— ${I18N.t('designerFnNoValue')} —</option>`;
                ((fd && fd.params) || []).forEach(p => {
                    opts += `<option value="${escapeHtml(p)}" ${cur === p ? 'selected' : ''}>ƒ ${escapeHtml(p)}</option>`;
                });
                Object.entries(currentDesign.variables || {}).forEach(([vk, vv]) => {
                    opts += `<option value="${escapeHtml(vk)}" ${cur === vk ? 'selected' : ''}>${escapeHtml(vv.name || vk)}</option>`;
                });
                return opts;
            };
            form.innerHTML += `
                <div>
                    <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:6px;">${I18N.t('designerFnOutputs')}</label>
                    ${outs.map((o, i) => `
                        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                            <input class="fn-output-name" data-idx="${i}" type="text" value="${escapeHtml(o)}" placeholder="out${i + 1}"
                                style="width:86px;flex-shrink:0;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:5px 8px;color:#fda4af;font-size:0.78rem;font-family:monospace;">
                            <span style="color:var(--text-muted);font-size:0.8rem;flex-shrink:0;">=</span>
                            <select class="fn-output-val" data-key="${escapeHtml(o)}"
                                style="flex:1;min-width:0;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:5px 6px;color:var(--text-primary);font-size:0.78rem;">
                                ${srcOpts(vals[o] || '')}
                            </select>
                            <button class="fn-output-del" data-idx="${i}" style="background:none;border:1px solid var(--accent-red);color:var(--accent-red);border-radius:var(--radius-sm);padding:4px 9px;cursor:pointer;font-size:0.75rem;flex-shrink:0;">×</button>
                        </div>`).join('')}
                    <button id="fn-add-output" style="width:100%;background:transparent;border:1px dashed #f43f5e;color:#fda4af;padding:6px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;">+ ${I18N.t('designerFnAddOutput')}</button>
                    <div style="font-size:0.72rem;color:var(--text-muted);line-height:1.6;margin-top:6px;">${I18N.t('designerFnOutputHint')}</div>
                </div>
            `;
            // 旧版返回值表达式：仅当历史数据存在时显示（新流程用输出变量代替）
            if (!outs.length && node.data.value) {
                form.innerHTML += createInput(I18N.t('designerFnLegacyExpr'), 'value', node.data.value);
            }
        } else if (node.type === 'input') {
            // 输入赋值目标变量：从侧栏变量列表中选择
            {
                const curVar = node.data.variable || '';
                const varList = Object.entries(currentDesign.variables || {});
                // 当前值不在变量列表里时，补一条真实反映现状的选项。
                // （否则浏览器会自动选中第一项，看起来「已经选好了」，实际数据还是旧值）
                const strayOpt = varList.some(([k]) => k === curVar) ? ''
                    : `<option value="${escapeHtml(curVar)}" selected>${curVar ? '⚠ ' + escapeHtml(curVar) + I18N.t('designerInputVarUndef') : I18N.t('designerInputVarNone')}</option>`;
                const inVarOpts = strayOpt + varList.map(([k, v]) =>
                    `<option value="${escapeHtml(k)}" ${curVar === k ? 'selected' : ''}>${escapeHtml(v.name || k)}${curVar === k ? '' : ' (' + escapeHtml(k) + ')'}</option>`).join('');
                form.innerHTML += `
                    <div>
                        <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerInputVar')}</label>
                        <select class="prop-select" data-key="variable" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                            ${inVarOpts}
                        </select>
                        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">${I18N.t('designerInputVarHint')}</div>
                    </div>
                `;
            }
            form.innerHTML += `
                <div>
                    <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerInputType')}</label>
                    <select class="prop-select" data-key="inputType" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                        <option value="text" ${node.data.inputType !== 'number' ? 'selected' : ''}>${I18N.t('designerInputTypeText')}</option>
                        <option value="number" ${node.data.inputType === 'number' ? 'selected' : ''}>${I18N.t('designerInputTypeNumber')}</option>
                    </select>
                </div>
            `;
            form.innerHTML += createInput(I18N.t('designerInputPrompt'), 'prompt', node.data.prompt || '');
            form.innerHTML += createInput('Prompt (EN)', 'promptEn', node.data.promptEn || '');
            form.innerHTML += createInput('Prompt (JA)', 'promptJa', node.data.promptJa || '');
            form.innerHTML += `<div style="font-size:0.72rem;color:var(--text-muted);line-height:1.6;margin-top:8px;">${I18N.t('designerInterpHint')}</div>`;
        }

        panel.appendChild(form);
        return panel;
    }

    function createInput(label, key, value, type) {
        return `
            <div>
                <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${label}</label>
                <input class="prop-input" data-key="${key}" type="${type || 'text'}" value="${escapeHtml(value)}" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
            </div>
        `;
    }

    function createTextArea(label, key, value) {
        return `
            <div>
                <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${label}</label>
                <textarea class="prop-textarea" data-key="${key}" rows="2" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;resize:vertical;font-family:inherit;">${escapeHtml(value)}</textarea>
            </div>
        `;
    }

    function createSelect(label, key, value, options) {
        return `
            <div>
                <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${label}</label>
                <select class="prop-select" data-key="${key}" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                    ${options.map(o => `<option value="${o[0]}" ${value === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}
                </select>
            </div>
        `;
    }

    function createCharacterSelect(node, forInfo) {
        const options = Object.entries(currentDesign.characters).map(([k, c]) =>
            `<option value="${k}" ${(forInfo ? node.data.characterId : node.data.characterId) === k ? 'selected' : ''}>${c.icon} ${escapeHtml(c.name)}</option>`
        ).join('');
        const key = forInfo ? 'characterId' : 'characterId';
        return `
            <div>
                <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${I18N.t('designerCharacter')}</label>
                <select class="prop-select" data-key="${key}" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                    <option value="">${I18N.t('designerNarrator')}</option>
                    ${options}
                </select>
            </div>
        `;
    }

    // 对话节点的表情下拉（该角色的表情素材库 + 默认头像；无该角色时隐藏）
    function createExpressionSelect(node) {
        const char = currentDesign.characters[node.data.characterId];
        if (!char) return '';
        const exprs = Object.keys(char.expressions || {});
        let opts = `<option value="" ${!node.data.expression ? 'selected' : ''}>${I18N.t('designerExprDefault')}</option>`;
        exprs.forEach(en => {
            const icon = char.expressions[en] || '';
            const preview = (window.IMGDB && IMGDB.isImgRef(icon)) ? '🖼' : icon;
            opts += `<option value="${escapeHtml(en)}" ${node.data.expression === en ? 'selected' : ''}>${escapeHtml(preview)} ${escapeHtml(en)}</option>`;
        });
        const noExpr = exprs.length === 0;
        return `
            <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                    <label style="font-size:0.75rem;color:var(--text-secondary);">${I18N.t('designerExpression')}</label>
                    <button class="prop-expr-manage-btn" data-char="${escapeHtml(node.data.characterId)}" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:0.7rem;padding:0 2px;line-height:1.2;" title="${I18N.t('designerExprLib')}">🎭 ${I18N.t('designerExprManage') || '管理'}</button>
                </div>
                <select class="prop-select" data-key="expression" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                    ${opts}
                </select>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">${noExpr ? I18N.t('designerExprEmpty') : I18N.t('designerExprHint')}</div>
            </div>
        `;
    }

    function createVariableSelectInline(key, value, label) {
        const options = Object.entries(currentDesign.variables || {}).map(([k, v]) =>
            `<option value="${k}" ${value === k ? 'selected' : ''}>${escapeHtml(v.name)}</option>`
        ).join('');
        return `<select class="prop-select" data-key="${key}" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:4px 6px;color:var(--text-primary);font-size:0.75rem;flex:1;min-width:50px;">
            ${options}
        </select>`;
    }

    // 函数节点参数用的变量下拉（独立 class，不走 prop-select 通用 data-key 处理）
    function fnArgVarSelect(paramKey, selected) {
        const options = Object.entries(currentDesign.variables || {}).map(([k, v]) =>
            `<option value="${escapeHtml(k)}" ${selected === k ? 'selected' : ''}>${escapeHtml(v.name || k)}</option>`
        ).join('');
        return `<select class="fn-arg-var" data-arg="${escapeHtml(paramKey)}" style="flex:1;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:4px 6px;color:var(--text-primary);font-size:0.75rem;min-width:50px;">
            ${options}
        </select>`;
    }

    function createInputInline(key, value, type, width) {
        return `<input class="prop-input" data-key="${key}" type="${type || 'text'}" value="${escapeHtml(value)}" style="width:${width || '60px'};background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:4px 6px;color:var(--text-primary);font-size:0.75rem;">`;
    }

    function createVariableSelect(key, value, label) {
        const options = Object.entries(currentDesign.variables || {}).map(([k, v]) =>
            `<option value="${k}" ${value === k ? 'selected' : ''}>${escapeHtml(v.name)} (${v.type})</option>`
        ).join('');
        return `
            <div>
                <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${label}</label>
                <select class="prop-select" data-key="${key}" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text-primary);font-size:0.85rem;">
                    ${options}
                </select>
            </div>
        `;
    }

    function createChoiceEditor(node) {
        let html = `<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:6px;">${I18N.t('designerNodeChoice')}</div>`;
        node.data.choices.forEach((c, i) => {
            html += `
                <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:8px;margin-bottom:8px;">
                    <input class="choice-input" data-index="${i}" data-field="text" placeholder="${I18N.t('designerZhText')}" value="${escapeHtml(c.text)}" style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--border-color);padding:4px 0;color:var(--text-primary);font-size:0.85rem;margin-bottom:4px;">
                    <input class="choice-input" data-index="${i}" data-field="textEn" placeholder="${I18N.t('designerEnText')}" value="${escapeHtml(c.textEn || '')}" style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--border-color);padding:4px 0;color:var(--text-secondary);font-size:0.75rem;margin-bottom:4px;">
                    <input class="choice-input" data-index="${i}" data-field="textJa" placeholder="${I18N.t('designerJaText')}" value="${escapeHtml(c.textJa || '')}" style="width:100%;background:transparent;border:none;padding:4px 0;color:var(--text-secondary);font-size:0.75rem;">
                    <div style="display:flex;gap:4px;margin-top:6px;">
                        <select class="choice-tag" data-index="${i}" style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:2px 6px;color:var(--text-primary);font-size:0.75rem;">
                            <option value="neutral" ${c.tag === 'neutral' ? 'selected' : ''}>${I18N.t('tagCaution')}</option>
                            <option value="good" ${c.tag === 'good' ? 'selected' : ''}>${I18N.t('tagEmpathy')}</option>
                            <option value="bad" ${c.tag === 'bad' ? 'selected' : ''}>${I18N.t('tagRisk')}</option>
                            <option value="truth" ${c.tag === 'truth' ? 'selected' : ''}>${I18N.t('tagTruth')}</option>
                            <option value="risk" ${c.tag === 'risk' ? 'selected' : ''}>${I18N.t('tagRisk')}</option>
                        </select>
                        <button class="del-choice-btn" data-index="${i}" style="margin-left:auto;background:none;border:1px solid var(--accent-red);color:var(--accent-red);border-radius:var(--radius-sm);padding:2px 8px;font-size:0.7rem;cursor:pointer;">${I18N.t('designerDelete')}</button>
                    </div>
                </div>
            `;
        });
        html += `<button id="add-choice-btn" style="width:100%;background:transparent;border:1px dashed var(--accent-yellow);color:var(--accent-yellow);padding:6px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.8rem;">+ ${I18N.t('designerNodeChoice')}</button>`;
        return html;
    }

    function bindEvents() {
        document.getElementById('designer-title-input')?.addEventListener('input', (e) => {
            currentDesign.title = e.target.value;
        });

        document.querySelectorAll('.prop-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (node) {
                    const key = e.target.dataset.key;
                    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
                    node.data[key] = val;
                    // 文本输入时只更新数据，不重绘整个面板，避免焦点丢失
                    updateNodePreview(node);
                }
            });
        });

        document.querySelectorAll('.prop-textarea').forEach(el => {
            // input 事件：实时保存
            el.addEventListener('input', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (node) {
                    node.data[e.target.dataset.key] = e.target.value;
                    // 文本输入时只更新数据，不重绘整个面板
                    updateNodePreview(node);
                }
            });
            // change 事件：确保失焦时也保存（兼容性备份）
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (node) {
                    node.data[e.target.dataset.key] = e.target.value;
                    updateNodePreview(node);
                }
            });
            // blur 事件：确保失焦时保存
            el.addEventListener('blur', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (node) {
                    node.data[e.target.dataset.key] = e.target.value;
                    updateNodePreview(node);
                }
            });
        });


        document.querySelectorAll('.prop-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (node) {
                    node.data[e.target.dataset.key] = e.target.value;
                    render();
                }
            });
        });

        // 表情素材库入口（对话节点属性面板）→ 打开该角色的表情库管理弹窗
        document.querySelectorAll('.prop-expr-manage-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showExpressionDialog(btn.dataset.char);
            });
        });

        // 结局图标按钮（emoji/图片通用选择器）→ 写入节点 endingIcon
        // 插图节点：选择插图（Emoji / 图片素材）+ 尺寸下拉
        const illIconBtn = document.getElementById('prop-ill-icon-btn');
        if (illIconBtn) {
            illIconBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                openIconPicker({
                    current: node.data.icon || '🖼️',
                    triggerEl: illIconBtn,
                    onPick: (val) => {
                        node.data.icon = val;
                        const pv = document.getElementById('prop-ill-preview');
                        if (pv) {
                            pv.innerHTML = (window.IMGDB && IMGDB.renderIconHTML) ? IMGDB.renderIconHTML(val, 56) : escapeHtml(val);
                        }
                        save(true);
                        render();
                    }
                });
            });
        }
        const illSize = document.getElementById('prop-ill-size');
        if (illSize) {
            illSize.addEventListener('change', () => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                node.data.size = illSize.value === 'medium' ? 'medium' : 'large';
                save(true);
                render();
            });
        }

        const endingIconBtn = document.getElementById('prop-ending-icon-btn');
        if (endingIconBtn) {
            endingIconBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                openIconPicker({
                    current: node.data.endingIcon || '🌟',
                    triggerEl: endingIconBtn,
                    onPick: (val) => {
                        node.data.endingIcon = val;
                        save(true);
                        render();
                    }
                });
            });
        }

        // ── 函数入口属性（函数画布中的 fn_entry 节点） ──
        const fnNameEl = document.querySelector('.fn-entry-name');
        if (fnNameEl) fnNameEl.addEventListener('change', (e) => {
            const fd = curFnDef();
            if (!fd) return;
            fd.name = e.target.value;
            save(true);
            render(); // 同步侧栏函数名与工具栏徽标
        });
        document.querySelectorAll('.fn-entry-param').forEach(el => {
            el.addEventListener('change', (e) => {
                const fd = curFnDef();
                if (!fd) return;
                const i = parseInt(e.target.dataset.idx, 10);
                fd.params = fd.params || [];
                fd.params[i] = sanitizeIdent(e.target.value) || ('p' + (i + 1));
                e.target.value = fd.params[i];
                save(true);
            });
        });
        document.querySelectorAll('.fn-entry-param-del').forEach(el => {
            el.addEventListener('click', () => {
                const fd = curFnDef();
                if (!fd) return;
                const i = parseInt(el.dataset.idx, 10);
                fd.params = fd.params || [];
                fd.params.splice(i, 1);
                save(true);
                render();
            });
        });
        const addParamBtn = document.getElementById('fn-entry-add-param');
        if (addParamBtn) addParamBtn.addEventListener('click', () => {
            const fd = curFnDef();
            if (!fd) return;
            fd.params = fd.params || [];
            fd.params.push('p' + (fd.params.length + 1));
            save(true);
            render();
        });

        // ── 函数输出变量（fn_return 面板）：添加/改名/删除/绑定取值来源 ──
        document.querySelectorAll('.fn-output-name').forEach(el => {
            el.addEventListener('change', (e) => {
                const fd = curFnDef();
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!fd || !node) return;
                const i = parseInt(e.target.dataset.idx, 10);
                const old = fd.outputs[i];
                const neu = sanitizeIdent(e.target.value) || ('out' + (i + 1));
                e.target.value = neu;
                if (old === neu) return;
                fd.outputs[i] = neu;
                // 同步 fn_return 值绑定键
                node.data.values = node.data.values || {};
                node.data.values[neu] = node.data.values[old] || '';
                delete node.data.values[old];
                // 同步主蓝图 function 节点：resultVars 键 + 输出引脚 key/名 + 引脚连线保留（pin id 不变）
                (currentDesign.nodes || []).forEach(fnNode => {
                    if (fnNode.type !== 'function' || fnNode.data.fnId !== _activeFnId) return;
                    const rv = fnNode.data.resultVars || {};
                    if (rv[old] !== undefined) { rv[neu] = rv[old]; delete rv[old]; }
                    (fnNode.outputs || []).forEach(pin => {
                        if (pin.key === 'out_' + old) { pin.key = 'out_' + neu; pin.name = pin.nameEn = pin.nameJa = neu; }
                    });
                });
                save(true);
                render();
            });
        });
        document.querySelectorAll('.fn-output-val').forEach(el => {
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                node.data.values = node.data.values || {};
                node.data.values[e.target.dataset.key] = e.target.value;
                save(true);
            });
        });
        document.querySelectorAll('.fn-output-del').forEach(el => {
            el.addEventListener('click', () => {
                const fd = curFnDef();
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!fd || !node) return;
                const i = parseInt(el.dataset.idx, 10);
                const old = fd.outputs[i];
                fd.outputs.splice(i, 1);
                if (node.data.values) delete node.data.values[old];
                // 同步主蓝图 function 节点：删 resultVars 键 + 删输出引脚及其连线
                const removedPinIds = new Set();
                (currentDesign.nodes || []).forEach(fnNode => {
                    if (fnNode.type !== 'function' || fnNode.data.fnId !== _activeFnId) return;
                    if (fnNode.data.resultVars) delete fnNode.data.resultVars[old];
                    (fnNode.outputs || []).filter(p => p.key === 'out_' + old).forEach(p => removedPinIds.add(p.id));
                    fnNode.outputs = (fnNode.outputs || []).filter(p => p.key !== 'out_' + old);
                });
                if (removedPinIds.size && fd.connections) {
                    fd.connections = fd.connections.filter(c => !removedPinIds.has(c.fromPin) && !removedPinIds.has(c.toPin));
                }
                save(true);
                render();
            });
        });
        const addOutBtn = document.getElementById('fn-add-output');
        if (addOutBtn) addOutBtn.addEventListener('click', () => {
            const fd = curFnDef();
            const node = curNodes().find(n => n.id === selectedNodeId);
            if (!fd || !node) return;
            fd.outputs = fd.outputs || [];
            const name = 'out' + (fd.outputs.length + 1);
            fd.outputs.push(name);
            node.data.values = node.data.values || {};
            node.data.values[name] = '';
            save(true);
            render();
        });

        // ── 函数节点属性 ──
        const fnBpBtn = document.getElementById('fn-open-bp-btn');
        if (fnBpBtn) fnBpBtn.addEventListener('click', () => {
            const node = curNodes().find(n => n.id === selectedNodeId);
            if (node && node.data.fnId) openFnCanvas(node.data.fnId);
        });
        document.querySelectorAll('.fn-ret-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                node.data.resultVar = e.target.value; // 图函数：返回值写入的目标变量（空 = 不接收返回值）
                render();
            });
        });
        // 图函数多输出：每个输出变量绑定写入目标（resultVars[out]=目标变量；空 = 删除绑定，可改用引脚连线）
        document.querySelectorAll('.fn-ret-var').forEach(el => {
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                node.data.resultVars = node.data.resultVars || {};
                const out = e.target.dataset.out;
                if (e.target.value) node.data.resultVars[out] = e.target.value;
                else delete node.data.resultVars[out];
                save(true);
                updateNodePreview(node);
            });
        });
        document.querySelectorAll('.fn-fn-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                node.data.fnId = e.target.value;
                render();
            });
        });
        document.querySelectorAll('.fn-arg-source').forEach(el => {
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                const p = e.target.dataset.arg;
                node.data.args = node.data.args || {};
                const prev = node.data.args[p] || { t: 'var', v: p };
                node.data.args[p] = e.target.value === 'direct'
                    ? { t: 'direct', v: (typeof prev.v === 'number' ? prev.v : 0) }
                    : { t: 'var', v: (prev.t === 'var' ? prev.v : p) };
                render();
            });
        });
        document.querySelectorAll('.fn-arg-value').forEach(el => {
            el.addEventListener('input', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                node.data.args = node.data.args || {};
                node.data.args[e.target.dataset.arg] = { t: 'direct', v: Number(e.target.value) || 0 };
                updateNodePreview(node);
            });
        });
        document.querySelectorAll('.fn-arg-var').forEach(el => {
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                node.data.args = node.data.args || {};
                node.data.args[e.target.dataset.arg] = { t: 'var', v: e.target.value };
                updateNodePreview(node);
            });
        });
        document.querySelectorAll('.fn-ret-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                node.data.resultVars = node.data.resultVars || {};
                const rk = e.target.dataset.ret;
                node.data.resultVars[rk] = e.target.value.trim() || rk;
                updateNodePreview(node);
            });
        });

        document.querySelectorAll('.choice-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                const idx = parseInt(e.target.dataset.index, 10);
                const field = e.target.dataset.field;
                node.data.choices[idx][field] = e.target.value;
                updateChoiceOutput(node, idx);
                // 只更新节点预览，不刷新整个面板
                updateNodePreview(node);
            });
        });

        document.querySelectorAll('.choice-tag').forEach(el => {
            el.addEventListener('change', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                const idx = parseInt(e.target.dataset.index, 10);
                node.data.choices[idx].tag = e.target.value;
                render();
            });
        });

        document.querySelectorAll('.del-choice-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                const node = curNodes().find(n => n.id === selectedNodeId);
                if (!node) return;
                const idx = parseInt(e.target.dataset.index, 10);
                node.data.choices.splice(idx, 1);
                node.outputs = node.outputs.filter((o, i) => i !== idx);
                render();
            });
        });

        document.getElementById('add-choice-btn')?.addEventListener('click', () => {
            const node = curNodes().find(n => n.id === selectedNodeId);
            if (!node) return;
            const idx = node.data.choices.length + 1;
            node.data.choices.push({ text: `选项${idx}`, textEn: `Choice ${idx}`, textJa: `選択肢${idx}`, tag: 'neutral' });
            node.outputs.push({
                id: genId('pin'),
                name: `选项${idx}`,
                nameEn: `Choice ${idx}`,
                nameJa: `選択肢${idx}`,
                type: 'exec',
                nodeId: node.id,
                tag: 'neutral'
            });
            render();
        });
    }

    function updateChoiceOutput(node, idx) {
        const choice = node.data.choices[idx];
        if (node.outputs[idx]) {
            node.outputs[idx].name = choice.text || `选项${idx + 1}`;
            node.outputs[idx].nameEn = choice.textEn || `Choice ${idx + 1}`;
            node.outputs[idx].nameJa = choice.textJa || `選択肢${idx + 1}`;
        }
    }

    function getPinByNodeIdAndId(nodeId, pinId) {
        for (const node of curNodes()) {
            if (node.id !== nodeId) continue;
            return [...node.inputs, ...node.outputs].find(p => p.id === pinId);
        }
        return null;
    }

    // ==================== Emoji 图标选择器 ====================
    const EMOJI_CATEGORIES = [
        { label: '😀', list: ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
        { label: '❤️', list: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','♦️','♣️','♠️','♟️','🃏','🀄','🎴','🎭','🔇','🔈','🔉','🔊','🔔','🔕','🎼','🎵','🎶','🎙️','🎚️','🎛️','🎤','🎧','📢','📣','📯','🔔','🔕'] },
        { label: '👋', list: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','👳','🧕','🤵','👰','🤰','🤱','👨‍🍼','👩‍🍼','🧑‍🍼'] },
        { label: '🐱', list: ['🐱','🐈‍⬛','🐶','🐕','🦮','🐕‍🦺','🐩','🐺','🦊','🦝','🐱','🐈','🦁','🐯','🐅','🐆','🐴','🫎','🐎','🦄','🦓','🦌','🦬','🐮','🐂','🐃','🐄','🐷','🐖','🐗','🐽','🐏','🐑','🐐','🐪','🐫','🦙','🦒','🐘','🦣','🦏','🦛','🐭','🐁','🐀','🐹','🐰','🐇','🐿️','🦫','🦔','🦇','🐻','🐻‍❄️','🐨','🐼','🦥','🦦','🦨','🦘','🦡','🐾','🐉','🐲','🌍','🌎','🌏','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋'] },
        { label: '⭐', list: ['⭐','🌟','✨','⚡','💫','🔥','💥','☄️','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌪️','🌫️','🌊','🌈','🌅','🌄','🌠','🎆','🎇','🎑','💰','💴','💵','💶','💷','💸','💳','🧾','💎','⚖️','🪙','🔧','🔨','⚒️','🛠️','⚙️','🔩','⚙️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🪒','🧴','🧷','🧹','🧺','🧻','🪥','🪒'] },
        { label: '🌸', list: ['🌸','💮','🏵️','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🪴','🌲','🌳','🌴','🌵','🌾','🌿','☘️','🍀','🍁','🍂','🍃','🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍑','🍒','🍓','🫐','🥝','🍅','🫒','🥥','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬','🥦','🧄','🧅','🍄','🥜','🫘','🌰','🍞','🥐','🥖','🫓','🥨','🥯','🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘','🍲','🫕','🥣','🥗','🍿','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🥇','🥈','🥉','🏆','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰','🧩','🧸','♠️','♥️','♦️','♣️','♟️','🃏','🎴','🀄','🎏','🎐','🎎'] },
    ];

    // 已打开的 picker 引用，用于关闭
    let _activePicker = null;

    function showIconPicker(charKey, triggerEl) {
        const char = currentDesign.characters[charKey];
        if (!char) return;
        openIconPicker({
            current: char.icon || '👤',
            triggerEl,
            onPick: (val) => {
                if (currentDesign.characters[charKey]) currentDesign.characters[charKey].icon = val;
                save(true);
                render();
            }
        });
    }

    /**
     * 通用图标选择器：Emoji 网格 + 任意 Emoji 输入 + 图片上传（IMGDB）。
     * @param {object} opts { current, triggerEl, onPick(iconValue) }
     */
    function openIconPicker(opts) {
        const { current, triggerEl, onPick } = opts;
        // 如果已有打开的 picker，先关闭
        if (_activePicker) {
            _activePicker.remove();
            _activePicker = null;
        }

        const picker = document.createElement('div');
        picker.className = 'bp-emoji-picker';
        // z-index 必须高于表情库等弹窗遮罩（10002），否则会被遮罩压暗且无法点击
        picker.style.cssText = `position:fixed;z-index:10060;visibility:hidden;background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:320px;max-height:400px;display:flex;flex-direction:column;overflow:hidden;font-family:inherit;`;

        let html = `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">${I18N.t('designerEmojiPicker')}</div>`;

        // ── 图片上传区（头像/表情可同时支持图片与 Emoji） ──
        const isImg = window.IMGDB && IMGDB.isImgRef(current);
        html += `<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;">`;
        if (isImg) {
            html += `<span class="bp-icon-img-preview" style="flex-shrink:0;">${IMGDB.renderIconHTML(current, 32)}</span>
                <span style="flex:1;font-size:0.72rem;color:var(--text-muted);">${I18N.t('designerUsingImage')}</span>
                <button class="bp-icon-remove-img" style="background:none;border:1px solid var(--accent-red);color:var(--accent-red);border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;">${I18N.t('designerUseEmoji')}</button>`;
        } else {
            html += `<span style="font-size:1.4rem;flex-shrink:0;">${current || '👤'}</span>
                <span style="flex:1;font-size:0.72rem;color:var(--text-muted);">${I18N.t('designerPickImageHint')}</span>
                <label class="bp-icon-img-btn" style="background:var(--accent-blue);color:#fff;border-radius:6px;padding:4px 10px;font-size:0.72rem;cursor:pointer;white-space:nowrap;">🖼 ${I18N.t('designerPickImage')}<input type="file" accept="image/*" class="bp-icon-img-input" style="display:none;"></label>`;
        }
        html += `</div>`;

        // ── 可滚动区（仅 Emoji 网格 + 自定义输入；标题与上传行固定不随滚动消失） ──
        html += `<div class="bp-icon-scroll" style="overflow-y:auto;flex:1;min-height:0;-webkit-overflow-scrolling:touch;">`;

        html += `<div style="display:flex;flex-wrap:wrap;gap:4px;">`;
        // 当前选中标记
        EMOJI_CATEGORIES.forEach(cat => {
            cat.list.forEach(emoji => {
                const isSelected = emoji === current;
                html += `<span class="bp-emoji-opt" data-emoji="${emoji}" style="font-size:1.3rem;padding:3px 5px;border-radius:6px;cursor:pointer;border:2px solid ${isSelected ? 'var(--accent-green)' : 'transparent'};background:${isSelected ? 'rgba(74,125,255,0.15)' : 'transparent'};transition:all 0.15s;" title="${emoji}">${emoji}</span>`;
            });
        });
        html += '</div>';
        // 自定义输入
        html += `<div style="margin-top:10px;display:flex;gap:6px;align-items:center;">
            <input id="bp-custom-emoji" type="text" placeholder="✏ 粘贴任意 Emoji..." maxlength="4" style="flex:1;background:var(--bg);border:1px solid var(--border-color);border-radius:6px;padding:5px 8px;font-size:0.85rem;color:var(--text-primary);outline:none;">
            <button id="bp-confirm-emoji" style="background:var(--accent-green);color:#fff;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:0.8rem;">✓</button>
        </div>`;

        html += `</div>`; // /.bp-icon-scroll 关闭

        picker.innerHTML = html;
        document.body.appendChild(picker);
        _activePicker = picker;

        // ── 定位：贴着触发元素，并夹取到视口内（右侧放不下翻到左侧，底部放不下上移） ──
        const rect = triggerEl ? triggerEl.getBoundingClientRect() : { right: 40, top: 40, left: 40 };
        const pw = picker.offsetWidth || 320;
        const ph = picker.offsetHeight || 400;
        const gap = 6, pad = 8;
        let left = rect.right + gap;
        if (left + pw > window.innerWidth - pad) left = rect.left - pw - gap; // 右侧空间不足 → 翻到左侧
        if (left + pw > window.innerWidth - pad) left = window.innerWidth - pw - pad;
        if (left < pad) left = pad;
        let top = rect.top;
        if (top + ph > window.innerHeight - pad) top = window.innerHeight - ph - pad; // 底部空间不足 → 上移
        if (top < pad) top = pad;
        picker.style.left = left + 'px';
        picker.style.top = top + 'px';
        picker.style.visibility = 'visible';

        // ── 图片上传 ──
        const imgInput = picker.querySelector('.bp-icon-img-input');
        if (imgInput) {
            imgInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                    const { id } = await IMGDB.uploadImageFile(file, file.name);
                    picker.remove();
                    _activePicker = null;
                    onPick(IMGDB.PREFIX + id);
                } catch (err) {
                    console.error('[IMGDB] upload failed:', err);
                    alert(I18N.t('designerImageFail') || ('图片处理失败: ' + err.message));
                }
            });
        }
        // 移除图片 → 回到 emoji 默认
        const removeBtn = picker.querySelector('.bp-icon-remove-img');
        if (removeBtn) {
            removeBtn.onclick = () => {
                picker.remove();
                _activePicker = null;
                onPick('👤');
            };
        }

        // 点击 Emoji 选项
        picker.querySelectorAll('.bp-emoji-opt').forEach(opt => {
            opt.onclick = () => {
                picker.remove();
                _activePicker = null;
                onPick(opt.dataset.emoji);
            };
            // hover 效果
            opt.onmouseenter = () => {
                if (opt.dataset.emoji !== current) opt.style.background = 'rgba(128,128,128,0.15)';
            };
            opt.onmouseleave = () => {
                if (opt.dataset.emoji !== current) opt.style.background = 'transparent';
            };
        });

        // 自定义输入确认
        const customInput = picker.querySelector('#bp-custom-emoji');
        const confirmBtn = picker.querySelector('#bp-confirm-emoji');
        const applyCustom = () => {
            const val = customInput.value.trim();
            if (val) {
                picker.remove();
                _activePicker = null;
                onPick(val);
            }
        };
        confirmBtn.onclick = applyCustom;
        customInput.onkeydown = (e) => { if (e.key === 'Enter') applyCustom(); };
        customInput.focus();

        // 点击外部关闭
        const closeOnOutside = (e) => {
            if (!picker.contains(e.target) && e.target !== triggerEl && !(triggerEl && triggerEl.contains(e.target))) {
                picker.remove();
                _activePicker = null;
                document.removeEventListener('pointerdown', closeOnOutside);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', closeOnOutside), 0);
    }

    // ==================== 角色表情素材库 ====================
    /**
     * 表情库管理面板：每个角色一个素材库（表情名 → emoji/图片），对话节点按名字调用。
     */
    function showExpressionDialog(charKey) {
        const char = currentDesign.characters[charKey];
        if (!char) return;
        if (!char.expressions) char.expressions = {};

        const overlay = document.createElement('div');
        overlay.id = 'bp-expr-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;';
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);width:min(440px,100%);max-height:82vh;overflow-y:auto;padding:16px;font-family:inherit;';
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const renderList = () => {
            const entries = Object.entries(char.expressions || {});
            let html = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-size:1rem;">🎭</span>
                    <strong style="flex:1;font-size:0.95rem;color:var(--text-primary);">${I18N.t('designerExprLib')} — ${escapeHtml(char.name)}</strong>
                    <button class="bp-expr-close" style="background:none;border:none;color:var(--text-secondary);font-size:1.1rem;cursor:pointer;">✕</button>
                </div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:12px;">${I18N.t('designerExprLibHint')}</div>
                <div class="bp-expr-rows"></div>
                <div style="display:flex;gap:6px;margin-top:12px;align-items:center;">
                    <input class="bp-expr-new-name" type="text" maxlength="12" placeholder="${I18N.t('designerExprNamePh')}" style="flex:1;min-width:0;background:var(--bg);border:1px solid var(--border-color);border-radius:6px;padding:6px 8px;font-size:0.8rem;color:var(--text-primary);outline:none;">
                    <button class="bp-expr-add" style="background:var(--accent-green);color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:0.78rem;cursor:pointer;white-space:nowrap;">+ ${I18N.t('designerExprAdd')}</button>
                </div>
            `;
            dialog.innerHTML = html;
            const rows = dialog.querySelector('.bp-expr-rows');

            if (entries.length === 0) {
                rows.innerHTML = `<div style="text-align:center;padding:18px 8px;color:var(--text-muted);font-size:0.78rem;">${I18N.t('designerExprEmpty')}</div>`;
            }
            entries.forEach(([name, icon]) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;padding:7px 10px;margin-bottom:6px;';
                row.innerHTML = `
                    <span class="bp-expr-icon" style="flex-shrink:0;min-width:26px;text-align:center;">${window.IMGDB ? IMGDB.renderIconHTML(icon, 22) : icon}</span>
                    <span style="flex:1;min-width:0;font-size:0.82rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</span>
                    <button class="bp-expr-edit" data-name="${escapeHtml(name)}" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:0.9rem;padding:2px 4px;" title="${I18N.t('designerExprChangeIcon')}">🎨</button>
                    <button class="bp-expr-rename" data-name="${escapeHtml(name)}" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;font-size:0.85rem;padding:2px 4px;" title="${I18N.t('designerExprRename')}">✏</button>
                    <button class="bp-expr-del" data-name="${escapeHtml(name)}" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:0.85rem;padding:2px 4px;" title="${I18N.t('designerDelete')}">✕</button>
                `;
                rows.appendChild(row);
            });

            // 事件
            dialog.querySelector('.bp-expr-close').onclick = () => { overlay.remove(); save(true); render(); };
            overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); save(true); render(); } };
            dialog.onclick = (e) => e.stopPropagation();

            dialog.querySelectorAll('.bp-expr-edit').forEach(btn => {
                btn.onclick = () => {
                    openIconPicker({
                        current: char.expressions[btn.dataset.name],
                        triggerEl: btn,
                        onPick: (val) => { char.expressions[btn.dataset.name] = val; save(true); renderList(); }
                    });
                };
            });
            dialog.querySelectorAll('.bp-expr-rename').forEach(btn => {
                btn.onclick = () => {
                    const oldName = btn.dataset.name;
                    const nn = window.prompt(I18N.t('designerExprNamePh'), oldName);
                    if (nn === null) return;
                    const name = String(nn).trim();
                    if (!name || name === oldName) return;
                    if (char.expressions[name] !== undefined) { alert(I18N.t('designerExprDup')); return; }
                    char.expressions[name] = char.expressions[oldName];
                    delete char.expressions[oldName];
                    save(true);
                    renderList();
                };
            });
            dialog.querySelectorAll('.bp-expr-del').forEach(btn => {
                btn.onclick = () => {
                    delete char.expressions[btn.dataset.name];
                    save(true);
                    renderList();
                };
            });

            // 添加
            const nameInput = dialog.querySelector('.bp-expr-new-name');
            const addBtn = dialog.querySelector('.bp-expr-add');
            const addExpr = () => {
                const name = (nameInput.value || '').trim();
                if (!name) return;
                if (char.expressions[name] !== undefined) { alert(I18N.t('designerExprDup')); return; }
                char.expressions[name] = '😀'; // 先占位，立刻打开选择器
                save(true);
                renderList();
                requestAnimationFrame(() => {
                    const editBtn = dialog.querySelector(`.bp-expr-edit[data-name="${name.replace(/"/g, '&quot;')}"]`);
                    if (editBtn) {
                        openIconPicker({
                            current: char.expressions[name],
                            triggerEl: editBtn,
                            onPick: (val) => { char.expressions[name] = val; save(true); renderList(); }
                        });
                    }
                });
            };
            addBtn.onclick = addExpr;
            nameInput.onkeydown = (e) => { if (e.key === 'Enter') addExpr(); };
        };
        renderList();
    }

    // ==================== 颜色选择器 ====================
    // 自定义故事的默认主题色（与旧版故事卡强调色 var(--accent-yellow)=#eab308 保持一致）
    const DEFAULT_THEME_COLOR = '#eab308';
    // 预设调色板（高对比度、在深色背景下清晰可见的颜色）
    const CHAR_COLOR_PRESETS = [
        // 第一排：基础色（与系统角色默认色一致）
        '#8b5cf6', '#4a7dff', '#22c55e', '#ef4444',
        '#f59e0b', '#eab308', '#06b6d4', '#0ea5e9',
        '#ec4899', '#a855f7', '#f97316', '#fbbf24',
        // 第二排：中性/特殊色
        '#94a3b8', '#64748b', '#10b981', '#14b8a6',
        '#3b82f6', '#6366f1', '#d946ef', '#fb7185',
        '#84cc16', '#e879f9', '#f43f5e', '#facc15'
    ];

    // 通用颜色选择器：预设色板 + 原生取色 + Hex 输入 + 实时预览
    // opts = { current, label, triggerEl, allowReset, onPick(hex), onReset() }
    // 角色颜色 / 故事主题色共用同一套 UI；onPick 负责把颜色写进对应的数据模型
    function openColorPicker(opts) {
        const { current, label, triggerEl, allowReset, onPick, onReset } = opts;
        // 如果已有打开的 picker，先关闭
        if (_activePicker) {
            _activePicker.remove();
            _activePicker = null;
        }

        // 规范化当前色：默认 fallback，避免 undefined
        const currentColor = String(current || DEFAULT_THEME_COLOR).toLowerCase();
        const anchor = triggerEl || { getBoundingClientRect: () => ({ right: 40, top: 40, left: 40 }) };

        const picker = document.createElement('div');
        picker.className = 'bp-color-picker';
        picker.style.cssText = `position:fixed;z-index:10060;background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);width:212px;font-family:inherit;`;

        // 定位在触发元素附近（左侧优先，避免被屏幕右边裁切）
        const rect = anchor.getBoundingClientRect();
        const pickerWidth = 212;
        let left = rect.right + 6;
        if (left + pickerWidth > window.innerWidth - 8) {
            left = rect.left - pickerWidth - 6;
            if (left < 8) left = 8;
        }
        let top = rect.top;
        if (top + 300 > window.innerHeight - 8) top = window.innerHeight - 308;
        if (top < 8) top = 8;
        picker.style.left = left + 'px';
        picker.style.top = top + 'px';

        let html = `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">${I18N.t('designerColorPicker')}</div>`;

        // 预设色板（6 列 × 4 行 = 24 色）
        html += `<div id="bp-color-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px;">`;
        CHAR_COLOR_PRESETS.forEach(hex => {
            const normalized = hex.toLowerCase();
            const isSelected = normalized === currentColor;
            html += `<button type="button" class="bp-color-opt" data-char="${escapeHtml(opts.dataKey || '')}" data-hex="${hex}" style="width:100%;aspect-ratio:1;padding:0;background:${hex};border-radius:6px;cursor:pointer;border:2px solid ${isSelected ? '#fff' : 'transparent'};box-shadow:0 0 0 1px var(--border-color) inset;transition:transform 0.1s;" title="${hex}"></button>`;
        });
        html += `</div>`;

        // 原生颜色选择器（精确选色）
        html += `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
            <input id="bp-color-input-native" type="color" value="${currentColor}" style="width:36px;height:32px;border:1px solid var(--border-color);border-radius:6px;padding:0;cursor:pointer;background:transparent;">
            <input id="bp-color-input-hex" type="text" value="${currentColor}" maxlength="7" placeholder="${I18N.t('designerColorCustom')}" style="flex:1;background:var(--bg);border:1px solid var(--border-color);border-radius:6px;padding:6px 8px;font-size:0.85rem;color:var(--text-primary);outline:none;font-family:monospace;">
        </div>`;

        // 当前预览
        html += `<div id="bp-color-preview-row" style="display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--border-color);">
            <div id="bp-color-preview" style="width:24px;height:24px;border-radius:6px;background:${currentColor};border:1px solid var(--border-color);"></div>
            <span style="font-size:0.75rem;color:var(--text-secondary);flex:1;">${escapeHtml(label || '')}</span>
            ${allowReset ? `<button id="bp-color-reset" style="background:none;border:1px solid var(--border-color);color:var(--text-muted);border-radius:6px;padding:3px 8px;font-size:0.7rem;cursor:pointer;white-space:nowrap;">${I18N.t('designerThemeReset') || '默认'}</button>` : ''}
        </div>`;

        picker.innerHTML = html;
        document.body.appendChild(picker);
        _activePicker = picker;

        // 校验 hex 格式
        const isValidHex = (s) => /^#[0-9a-fA-F]{6}$/.test(s);

        // 应用颜色（实时反馈）：写数据由 onPick 负责，UI 同步在本函数内完成
        const applyColor = (hex, refresh) => {
            if (!isValidHex(hex)) return;
            const normalized = hex.toLowerCase();
            if (typeof onPick === 'function') onPick(normalized);

            // 实时更新原生 / hex 输入框
            const native = picker.querySelector('#bp-color-input-native');
            const text = picker.querySelector('#bp-color-input-hex');
            const preview = picker.querySelector('#bp-color-preview');
            if (native) native.value = normalized;
            if (text && text.value.toLowerCase() !== normalized) text.value = normalized;
            if (preview) preview.style.background = normalized;

            // 高亮当前预设
            picker.querySelectorAll('.bp-color-opt').forEach(opt => {
                opt.style.border = opt.dataset.hex.toLowerCase() === normalized
                    ? '2px solid #fff'
                    : '2px solid transparent';
            });

            // 完整刷新面板（保证最稳）
            if (refresh) render();
        };

        // 点击预设色：直接应用
        picker.querySelectorAll('.bp-color-opt').forEach(opt => {
            opt.onclick = (e) => {
                e.stopPropagation();
                applyColor(opt.dataset.hex, false);
            };
            opt.onmouseenter = () => { opt.style.transform = 'scale(1.1)'; };
            opt.onmouseleave = () => { opt.style.transform = 'scale(1)'; };
        });

        // 原生 color picker 变化
        const nativeInput = picker.querySelector('#bp-color-input-native');
        nativeInput.oninput = (e) => {
            applyColor(e.target.value, false);
        };

        // hex 输入：失焦或回车时应用
        const hexInput = picker.querySelector('#bp-color-input-hex');
        const commitHex = () => {
            const v = hexInput.value.trim();
            if (isValidHex(v)) {
                applyColor(v, false);
            } else {
                // 恢复为当前合法值
                hexInput.value = currentColor;
            }
        };
        hexInput.onblur = commitHex;
        hexInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitHex();
                hexInput.blur();
            }
            // 每次按键实时同步到原生色块
            if (isValidHex(hexInput.value.trim())) {
                nativeInput.value = hexInput.value.trim().toLowerCase();
            }
        };

        // 恢复默认色
        const resetBtn = picker.querySelector('#bp-color-reset');
        if (resetBtn) {
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                if (typeof onReset === 'function') onReset();
                picker.remove();
                _activePicker = null;
                document.removeEventListener('pointerdown', closeOnOutside);
                render();
            };
        }

        // 点击外部关闭（仅提交未失焦的颜色）
        const closeOnOutside = (e) => {
            if (!picker.contains(e.target) && e.target !== triggerEl && !(triggerEl && triggerEl.contains(e.target))) {
                commitHex();
                picker.remove();
                _activePicker = null;
                render(); // 确保最终状态正确
                document.removeEventListener('pointerdown', closeOnOutside);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', closeOnOutside), 0);

        // 阻止 picker 内部点击冒泡触发关闭
        picker.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    // 角色颜色选择器（把颜色写回角色定义，并同步角色面板的颜色按钮/名称色）
    function showColorPicker(charKey, triggerEl) {
        const char = currentDesign.characters[charKey];
        if (!char) return;
        openColorPicker({
            current: char.color || '#4a7dff',
            label: char.name,
            triggerEl,
            dataKey: charKey,
            onPick: (hex) => {
                const ch = currentDesign.characters[charKey];
                if (ch) ch.color = hex;
                // 同步刷新角色面板中的颜色按钮和名称颜色
                const item = document.querySelector(`.bp-char-item[data-char-key="${charKey}"]`);
                if (item) {
                    const colorBtn = item.querySelector('.bp-char-color-btn');
                    const nameSpan = item.querySelector('.bp-char-name');
                    if (colorBtn) colorBtn.style.background = hex;
                    if (nameSpan) nameSpan.style.color = hex;
                }
            }
        });
    }

    // 故事主题色选择器（自定义故事卡 + 剧情画面的强调色）
    function showThemeColorPicker(triggerEl) {
        openColorPicker({
            current: currentDesign.themeColor || DEFAULT_THEME_COLOR,
            label: I18N.t('designerStoryTheme') || '主题色',
            triggerEl,
            allowReset: true,
            onPick: (hex) => {
                currentDesign.themeColor = hex;
                const sw = triggerEl ? triggerEl.querySelector('.bp-theme-swatch') : null;
                if (sw) sw.style.background = hex;
                save(true);
            },
            onReset: () => {
                currentDesign.themeColor = '';
                const sw = triggerEl ? triggerEl.querySelector('.bp-theme-swatch') : null;
                if (sw) sw.style.background = DEFAULT_THEME_COLOR;
                save(true);
            }
        });
    }

    // 故事梗概编辑器（弹窗，改动实时写回 currentDesign.description）
    function openStoryDescEditor(triggerEl) {
        if (_activePicker) { _activePicker.remove(); _activePicker = null; }

        const picker = document.createElement('div');
        picker.className = 'bp-story-desc-editor';
        picker.style.cssText = `position:fixed;z-index:10060;background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);width:320px;max-width:calc(100vw - 24px);font-family:inherit;display:flex;flex-direction:column;gap:8px;`;

        const rect = triggerEl ? triggerEl.getBoundingClientRect() : { right: 40, top: 40, left: 40 };
        const pw = 320, ph = 230, gap = 6, pad = 8;
        let left = rect.left;
        if (left + pw > window.innerWidth - pad) left = window.innerWidth - pw - pad;
        if (left < pad) left = pad;
        let top = rect.bottom + gap;
        if (top + ph > window.innerHeight - pad) top = rect.top - ph - gap;
        if (top < pad) top = pad;
        picker.style.left = left + 'px';
        picker.style.top = top + 'px';

        picker.innerHTML = `
            <div style="font-size:0.8rem;color:var(--text-secondary);font-weight:600;">📝 ${I18N.t('designerStoryDesc') || '故事梗概'}</div>
            <textarea id="bp-story-desc-input" rows="5" placeholder="${escapeHtml(I18N.t('designerStoryDescPlaceholder') || '')}"
                style="width:100%;box-sizing:border-box;resize:vertical;min-height:96px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;padding:8px;font-size:0.85rem;line-height:1.5;color:var(--text-primary);outline:none;font-family:inherit;"></textarea>
            <div style="font-size:0.7rem;color:var(--text-muted);line-height:1.4;">${I18N.t('designerStoryDescHint') || ''}</div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button id="bp-story-desc-done" style="background:var(--accent-green);color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:0.8rem;cursor:pointer;">${I18N.t('designerConfirm') || '完成'}</button>
            </div>`;

        document.body.appendChild(picker);
        _activePicker = picker;

        const ta = picker.querySelector('#bp-story-desc-input');
        ta.value = currentDesign.description || '';

        const commit = () => {
            currentDesign.description = ta.value;
            save(true);
            render();
        };
        ta.addEventListener('input', () => { currentDesign.description = ta.value; });
        ta.addEventListener('blur', () => { save(true); });
        picker.querySelector('#bp-story-desc-done').addEventListener('click', () => {
            commit();
            picker.remove();
            _activePicker = null;
            document.removeEventListener('pointerdown', closeOnOutside);
        });

        const closeOnOutside = (e) => {
            if (!picker.contains(e.target) && e.target !== triggerEl && !(triggerEl && triggerEl.contains(e.target))) {
                commit();
                picker.remove();
                _activePicker = null;
                document.removeEventListener('pointerdown', closeOnOutside);
            }
        };
        setTimeout(() => {
            document.addEventListener('pointerdown', closeOnOutside);
            ta.focus();
        }, 0);
        picker.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    // ==================== 角色管理 ====================
    function addCharacter() {
        const id = 'char_' + genId();
        const names = prompt(I18N.t('designerCharName') + ' (zh/en/ja /)', I18N.t('designerAddChar') + '/New Character/新キャラ');
        if (!names) return;
        const [name, nameEn, nameJa] = names.split('/');
        currentDesign.characters[id] = {
            id,
            name: name.trim() || I18N.t('designerAddChar'),
            nameEn: nameEn?.trim() || 'New Character',
            nameJa: nameJa?.trim() || '新キャラ',
            icon: '👤',
            color: '#4a7dff'
        };
        render();
        // 渲染后自动打开该角色的图标选择器
        requestAnimationFrame(() => {
            const iconBtn = document.querySelector(`.bp-char-icon-btn[data-key="${id}"]`);
            if (iconBtn) showIconPicker(id, iconBtn);
        });
    }

    // ==================== 保存/导出/导入 ====================
    // 协作推送：同一时刻只允许一个 PUT 在飞，期间来的保存合并成「最后一次」再发。
    // 多人疯狂点保存 / 自动保存时，避免一堆大 JSON 请求排队把服务器和界面一起拖慢。
    let _pushing = false, _pushAgain = false;
    function pushToCommunity() {
        if (!_community || typeof COMMUNITY === 'undefined' || !COMMUNITY.pushDesign) return;
        if (_pushing) { _pushAgain = true; return; }
        _pushing = true;
        COMMUNITY.pushDesign(serializeDesign(currentDesign), _community).then(r => {
            if (r && r.conflict) {
                showMessage('⚠ ' + (I18N.t('communityConflict') || '服务器上已有更新的版本'));
                showCollabBanner(r.by || '', r.version);
            }
        }).catch(() => {}).then(() => {
            _pushing = false;
            if (_pushAgain && _community) { _pushAgain = false; pushToCommunity(); }
        });
    }

    function save(silent) {
        if (!currentDesign.title) currentDesign.title = I18N.t('unnamedStory');
        SAVE.saveDesign(serializeDesign(currentDesign));
        // 协作模式：静默推送到社区服务器（版本冲突时提示，不阻塞本地保存）
        pushToCommunity();
        if (!silent) showMessage('✓ ' + I18N.t('designerSaveSuccess'));
    }

    // ==================== 局域网社区协作 ====================
    // 工具栏 🌐 按钮：协作中 → 打开社区面板看状态；否则把当前设计分享到社区
    async function handleShareClick(shareBtn) {
        if (typeof COMMUNITY === 'undefined' || !COMMUNITY.openPanel) return;
        if (_community) { COMMUNITY.openPanel(); return; }
        if (!COMMUNITY.isConnected()) { COMMUNITY.openPanel(); return; }
        const data = serializeDesign(currentDesign);
        try {
            let result = null;
            if (data.communityId) {
                // 之前分享过 → 推送最新内容（作者本人强制更新）
                const r = await COMMUNITY.pushDesign(data, { id: data.communityId, version: 0 });
                if (r && r.ok) result = { id: data.communityId, updated: true };
            } else {
                result = await COMMUNITY.shareDesign(data);
                if (result) {
                    currentDesign.communityId = result.id;
                    save(true); // 把 communityId 一并存进本地存档
                }
            }
            if (result) {
                showMessage('🌐 ' + (I18N.t('communityShareOk') || '已分享到社区') + (result.id ? ' · ID: ' + result.id : ''));
            } else {
                showMessage('⚠ ' + (I18N.t('communityShareFail') || '分享失败'));
            }
        } catch (err) {
            console.error('[DESIGNER] share failed:', err);
            showMessage('⚠ ' + err.message);
        }
    }

    // 远程变更 → 顶部协作横幅（「某某 更新了故事 · 加载最新」）
    let _collabBanner = null;
    function showCollabBanner(by, version) {
        if (!_community || (typeof version === 'number' && version <= _community.version)) return;
        removeCollabBanner();
        const banner = document.createElement('div');
        banner.className = 'bp-collab-banner';
        banner.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:10090;background:rgba(15,23,42,0.96);border:1px solid var(--accent-blue,#3b82f6);border-radius:12px;padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:0.85rem;color:var(--text-primary,#e2e8f0);box-shadow:0 8px 32px rgba(0,0,0,.5);max-width:92vw;';
        banner.innerHTML = '<span>🌐 <b>' + escapeHtml(by || '其他人') + '</b> ' + (I18N.t('communityRemoteUpdate') || '更新了故事') + '</span>';
        const loadBtn = document.createElement('button');
        loadBtn.textContent = I18N.t('communityLoadLatest') || '加载最新';
        loadBtn.style.cssText = 'background:rgba(59,130,246,0.2);border:1px solid var(--accent-blue,#3b82f6);color:var(--accent-blue,#3b82f6);border-radius:8px;padding:5px 12px;cursor:pointer;font-size:0.8rem;flex-shrink:0;';
        loadBtn.addEventListener('click', () => loadCollabLatest());
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'background:transparent;border:none;color:var(--text-secondary,#94a3b8);cursor:pointer;font-size:0.95rem;flex-shrink:0;';
        closeBtn.addEventListener('click', removeCollabBanner);
        banner.appendChild(loadBtn);
        banner.appendChild(closeBtn);
        document.body.appendChild(banner);
        _collabBanner = banner;
    }
    function removeCollabBanner() {
        if (_collabBanner) { _collabBanner.remove(); _collabBanner = null; }
    }

    // 「加载最新」：从服务器取最新版本覆盖本地画布（未保存的修改会丢失）
    async function loadCollabLatest() {
        if (!_community || typeof COMMUNITY === 'undefined' || !COMMUNITY.fetchStory) return;
        try {
            const data = await COMMUNITY.fetchStory(_community.id);
            if (!data || !data.design) { showMessage('⚠ ' + (I18N.t('communityFetchFail') || '获取失败')); return; }
            removeCollabBanner();
            currentDesign = normalizeDesign(data.design);
            _community.version = (data.story && data.story.version) || _community.version;
            selectedNodeId = currentDesign.startNode;
            render();
            showMessage('🌐 ' + (I18N.t('communityLoaded') || '已加载最新版本'));
        } catch (err) {
            console.error('[DESIGNER] load latest failed:', err);
            showMessage('⚠ ' + err.message);
        }
    }

    // ── 协作团队聊天（复用 COMMUNITY 的浮窗，设计器内可边改边聊）──
    function openTeamChat() {
        if (!_community) {
            showMessage('ℹ ' + (I18N.t('communityChatCollabOnly') || '只有协作编辑的故事才有团队聊天'));
            return;
        }
        if (typeof COMMUNITY === 'undefined' || !COMMUNITY.openChatOverlay) return;
        COMMUNITY.openChatOverlay(_community.id);
    }
    function closeTeamChat() {
        if (typeof COMMUNITY !== 'undefined' && COMMUNITY.closeChatOverlay) {
            try { COMMUNITY.closeChatOverlay(); } catch (e) {}
        }
    }

    // ══════════════ 协作在线状态：看得见别人在哪、在改什么 ══════════════
    // 设计：
    //   ① 我 → 服务器：指针世界坐标 + 当前选中节点 + 动作（空闲/浏览/拖拽/连线/编辑）
    //      节流 90ms 且「没动就不发」；另外每 4s 一次心跳保活（服务器 12s 无心跳即剔除）
    //   ② 服务器 → 我：SSE presence 事件（服务器侧 90ms 合并广播），收到只更新指针 DOM，
    //      绝不触发 render()——这是不卡的关键；6s 轮询一次全量列表兜底（SSE 断了也能恢复）
    //   ③ 别人的 node 与我的动作撞车 → 该节点显示他的颜色描边 + 一次性提示（软锁，不阻断）
    //      硬锁会让两个人互相卡死，所以只提示不拦截；真正的冲突由保存时的版本校验兜底。
    let _peers = {};              // uid → { nick, avatar, color, x, y, node, act, ts }
    let _peerEls = {};            // uid → 指针 DOM（render 重建后重画）
    let _presenceHB = null;       // 心跳定时器
    let _presencePoll = null;     // 全量列表兜底轮询
    let _lastPresenceAt = 0;
    let _lastPresenceSig = '';    // 上一次上报内容的指纹（没变化就不发）
    let _pointerWorld = { x: 0, y: 0 };
    let _warnedBusy = {};         // uid|node → true（同一处只提示一次）
    let _unloadBound = false;
    const PRESENCE_MIN_GAP = 90;  // 上报最小间隔(ms)
    const PRESENCE_STALE = 14000; // 本地判定离场（略大于服务器 12s）
    const PRESENCE_MAX = 12;      // 最多渲染多少个指针（防止极端人数拖慢画布）

    function myUid() {
        return (typeof COMMUNITY !== 'undefined' && COMMUNITY.getUid) ? COMMUNITY.getUid() : '';
    }
    function currentAct() {
        if (dragNode) return 'drag';
        if (tempConnection) return 'link';
        if (selectedNodeId) return 'edit';
        return 'idle';
    }
    function actText(act) {
        return ({
            drag: I18N.t('designerPeerDrag') || '拖动中',
            link: I18N.t('designerPeerLink') || '连线中',
            edit: I18N.t('designerPeerEdit') || '编辑节点',
            idle: I18N.t('designerPeerIdle') || '浏览中'
        })[act] || (I18N.t('designerPeerIdle') || '浏览中');
    }

    // 屏幕坐标 → 蓝图世界坐标（别人换算回屏幕时能对上同一个位置）
    function trackPointerWorld(clientX, clientY) {
        const canvas = document.getElementById('bp-canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        _pointerWorld = {
            x: (clientX - rect.left - canvasOffset.x) / scale,
            y: (clientY - rect.top - canvasOffset.y) / scale
        };
    }
    // 指针在画布上移动 → 记世界坐标并节流上报
    function onCanvasPointerMove(e) {
        if (!_community) return;
        trackPointerWorld(e.clientX, e.clientY);
        reportPresence(false);
    }

    function reportPresence(force) {
        if (!_community || typeof COMMUNITY === 'undefined' || !COMMUNITY.reportPresence) return;
        const now = Date.now();
        if (!force && now - _lastPresenceAt < PRESENCE_MIN_GAP) return;
        const payload = {
            x: _pointerWorld.x, y: _pointerWorld.y,
            node: selectedNodeId || '',
            act: currentAct(),
            avatar: (COMMUNITY.getAvatar ? COMMUNITY.getAvatar() : '')
        };
        // 位置几乎没动、动作也没变 → 不重复发（心跳时 force=true 才发）
        const sig = Math.round(payload.x) + ',' + Math.round(payload.y) + ',' + payload.node + ',' + payload.act;
        if (!force && sig === _lastPresenceSig) return;
        _lastPresenceAt = now;
        _lastPresenceSig = sig;
        COMMUNITY.reportPresence(_community.id, payload);
    }

    function startPresence() {
        stopPresence();
        if (!_community || typeof COMMUNITY === 'undefined' || !COMMUNITY.reportPresence) return;
        _warnedBusy = {};
        // 先拉一次全量（进屋就看到已经在改的人），再开始心跳 + 兜底轮询
        COMMUNITY.fetchPresence(_community.id).then(list => setPeers(list)).catch(() => {});
        reportPresence(true);
        _presenceHB = setInterval(() => { if (_community) reportPresence(true); }, 4000);
        _presencePoll = setInterval(() => {
            if (!_community || typeof COMMUNITY === 'undefined') return;
            COMMUNITY.fetchPresence(_community.id).then(list => setPeers(list)).catch(() => {});
        }, 6000);
        if (!_unloadBound) {
            _unloadBound = true;
            window.addEventListener('pagehide', stopPresence);
            window.addEventListener('beforeunload', stopPresence);
        }
    }

    function stopPresence() {
        if (_presenceHB) { clearInterval(_presenceHB); _presenceHB = null; }
        if (_presencePoll) { clearInterval(_presencePoll); _presencePoll = null; }
        const id = _community && _community.id;
        _peers = {}; _peerEls = {}; _lastPresenceSig = '';
        clearPresenceMarks();
        if (id && typeof COMMUNITY !== 'undefined' && COMMUNITY.leavePresence) {
            try { COMMUNITY.leavePresence(id); } catch (e) {}
        }
    }

    // 收到服务器推来的在线者（可能是全量列表，也可能是单个人的增量）
    function setPeers(list) {
        if (!_community) return;
        const me = myUid();
        let changed = false;
        (list || []).forEach(p => {
            if (!p || !p.uid || (me && p.uid === me)) return;   // 自己不画自己的指针
            const prev = _peers[p.uid];
            if (!prev || prev.node !== p.node || prev.act !== p.act || prev.nick !== p.nick) changed = true;
            _peers[p.uid] = {
                uid: p.uid, nick: p.nick || '?', avatar: p.avatar || '🙂',
                color: p.color || '#38bdf8',
                x: (typeof p.x === 'number') ? p.x : 0,
                y: (typeof p.y === 'number') ? p.y : 0,
                node: p.node || '', act: p.act || 'idle', ts: Date.now()
            };
        });
        // 本地剔除已经不在线的（服务器也会剔，这里双保险）
        const now = Date.now();
        Object.keys(_peers).forEach(uid => {
            if (now - _peers[uid].ts > PRESENCE_STALE) { delete _peers[uid]; changed = true; }
        });
        const uids = Object.keys(_peers);
        if (uids.length > PRESENCE_MAX) uids.slice(PRESENCE_MAX).forEach(u => delete _peers[u]);
        syncPresenceUI();
        if (changed) warnIfBusy();
    }

    // 别人的指针 DOM：只在必要时改动（移动改 transform，改名/动作改文本）
    function syncPresenceUI() {
        const layer = document.getElementById('bp-cursor-layer');
        if (!layer) return;
        const uids = Object.keys(_peers);
        // 清理已离场的
        Object.keys(_peerEls).forEach(uid => {
            if (uids.indexOf(uid) < 0) { _peerEls[uid].remove(); delete _peerEls[uid]; }
        });
        uids.forEach(uid => {
            const p = _peers[uid];
            let el = _peerEls[uid];
            if (!el) {
                el = document.createElement('div');
                el.className = 'bp-peer-cursor';
                el.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));">
                        <path d="M5 2 L19 12 L12 13 L15 20 L12 21 L9 14 L5 19 Z" fill="${p.color}" stroke="#0b1220" stroke-width="1"></path>
                    </svg>
                    <span class="bp-peer-name" style="background:${p.color};">${escapeHtml(p.nick)}</span>`;
                layer.appendChild(el);
                _peerEls[uid] = el;
            }
            const label = el.querySelector('.bp-peer-name');
            if (label) {
                const txt = escapeHtml(p.nick) + (p.act && p.act !== 'idle' ? ' · ' + escapeHtml(actText(p.act)) : '');
                if (label.innerHTML !== txt) label.innerHTML = txt;
            }
            el.style.transform = `translate3d(${canvasOffset.x + p.x * scale}px,${canvasOffset.y + p.y * scale}px,0)`;
        });
        renderPresenceBar();
        applyPresenceMarks();
    }

    // 指针位置随画布平移/缩放刷新（高频，只写 transform）
    function updatePresencePositions() {
        const uids = Object.keys(_peers);
        if (!uids.length) return;
        uids.forEach(uid => {
            const el = _peerEls[uid];
            if (!el) return;
            const p = _peers[uid];
            el.style.transform = `translate3d(${canvasOffset.x + p.x * scale}px,${canvasOffset.y + p.y * scale}px,0)`;
        });
    }

    // 工具栏状态行的在线头像（点一下把视图移到他那里）
    function renderPresenceBar() {
        const bar = document.getElementById('bp-presence-bar');
        if (!bar) return;
        const uids = Object.keys(_peers);
        if (!uids.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
        bar.style.display = '';
        bar.innerHTML = '<span style="opacity:.7;">👥</span>' + uids.map(uid => {
            const p = _peers[uid];
            const av = (window.IMGDB && IMGDB.renderIconHTML) ? IMGDB.renderIconHTML(p.avatar || '🙂', 14, 9999) : escapeHtml(p.avatar || '🙂');
            return `<span class="bp-peer-chip" data-uid="${escapeHtml(uid)}" title="${escapeHtml(p.nick + ' · ' + actText(p.act))}" style="border-color:${p.color};color:${p.color};">${av} ${escapeHtml(p.nick)}</span>`;
        }).join('');
        bar.querySelectorAll('.bp-peer-chip').forEach(el => {
            el.addEventListener('click', () => focusPeer(el.getAttribute('data-uid')));
        });
    }

    // 把视图居中到某个协作者的位置
    function focusPeer(uid) {
        const p = _peers[uid];
        const canvas = document.getElementById('bp-canvas');
        if (!p || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvasOffset.x = rect.width / 2 - p.x * scale;
        canvasOffset.y = rect.height / 2 - p.y * scale;
        applyCanvasTransform();
        scheduleConnectionUpdate();
    }

    // 别人正在编辑的节点 → 用他的颜色描边标出来，避免两人同时改同一个节点互相覆盖
    function applyPresenceMarks() {
        const busy = {};
        Object.keys(_peers).forEach(uid => {
            const p = _peers[uid];
            if (!p.node || p.act === 'idle') return;
            busy[p.node] = p;
        });
        document.querySelectorAll('#bp-nodes-layer .bp-node').forEach(el => {
            const id = el.getAttribute('data-node-id');
            const p = busy[id];
            if (p) {
                el.style.outline = '2px solid ' + p.color;
                el.style.outlineOffset = '2px';
                el.style.boxShadow = '0 0 0 4px ' + p.color + '33';
            } else {
                el.style.outline = '';
                el.style.outlineOffset = '';
                el.style.boxShadow = '';
            }
        });
    }
    function clearPresenceMarks() {
        document.querySelectorAll('#bp-nodes-layer .bp-node').forEach(el => {
            el.style.outline = ''; el.style.outlineOffset = ''; el.style.boxShadow = '';
        });
        const bar = document.getElementById('bp-presence-bar');
        if (bar) { bar.innerHTML = ''; bar.style.display = 'none'; }
        const layer = document.getElementById('bp-cursor-layer');
        if (layer) layer.innerHTML = '';
    }

    // 我选中/正要改的节点，别人也在改 → 提示一次（软提醒，不拦截操作）
    function warnIfBusy() {
        if (!selectedNodeId) return;
        Object.keys(_peers).forEach(uid => {
            const p = _peers[uid];
            if (!p || p.node !== selectedNodeId || p.act === 'idle') return;
            const key = uid + '|' + selectedNodeId;
            if (_warnedBusy[key]) return;
            _warnedBusy[key] = true;
            showMessage('⚠ ' + (I18N.t('designerPeerBusy') || '{name} 正在编辑这个节点').replace('{name}', p.nick));
        });
    }

    // 注册远程变更回调（每次 open 时幂等注册，只注册一次）
    let _communityBridgeBound = false;
    function registerCommunityBridge() {
        if (_communityBridgeBound) return;
        if (typeof COMMUNITY === 'undefined' || !COMMUNITY.onRemoteChange) return;
        _communityBridgeBound = true;
        COMMUNITY.onRemoteChange((evt) => {
            if (!_community || !evt || evt.id !== _community.id) return;
            if (evt.action === 'save') {
                // 自己推送的保存也会广播回来（by=自己且版本已知），忽略过时通知
                if (typeof evt.version === 'number' && evt.version > _community.version) {
                    showCollabBanner(evt.by, evt.version);
                }
            } else if (evt.action === 'join') {
                if (evt.by && evt.by !== COMMUNITY.getName()) {
                    showMessage('🌐 ' + evt.by + ' ' + (I18N.t('communityJoined') || '加入了协作编辑'));
                }
            } else if (evt.action === 'presence') {
                // 别人的指针 / 动作更新（服务器已合并广播，这里只改 DOM，不 render）
                if (evt.left) {
                    delete _peers[evt.left];
                    syncPresenceUI();
                } else if (evt.peer) {
                    setPeers([evt.peer]);
                }
            } else if (evt.action === 'delete') {
                showMessage('⚠ ' + (I18N.t('communityDeleted') || '该故事已被作者删除'));
                removeCollabBanner();
                _community = null;
                render();
            }
        });
    }

    async function exportDesign() {
        const data = serializeDesign(currentDesign);
        // 收集设计中引用的所有图片素材（角色头像/表情、结局图标、故事图标），
        // 从 IndexedDB 读出 dataURL 内嵌进导出 JSON 的 assets 字段——
        // 单文件包含全部图片，导入端自动恢复，无需额外资源文件夹
        try {
            if (window.IMGDB) {
                const ids = IMGDB.collectRefsInDesign(data);
                const assets = {};
                for (const id of ids) {
                    const url = await IMGDB.getImage(id);
                    if (url) assets[id] = url;
                }
                if (Object.keys(assets).length) data.assets = assets;
            }
        } catch (err) {
            console.error('[DESIGNER] collect assets failed:', err);
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (currentDesign.title || 'story') + '.blueprint.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importDesign() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    // 恢复内嵌的图片素材（assets: {id: dataURL}）到 IndexedDB，保持原 id 引用不变
                    if (data && data.assets && typeof data.assets === 'object' && window.IMGDB) {
                        for (const [id, dataURL] of Object.entries(data.assets)) {
                            if (typeof dataURL === 'string' && dataURL.indexOf('data:image') === 0) {
                                await IMGDB.putImage(id, dataURL, 'imported');
                            }
                        }
                        delete data.assets; // assets 是传输载体，不属于设计数据
                    }
                    currentDesign = normalizeDesign(data);
                    render();
                    showMessage(I18N.t('designerImportSuccess'));
                } catch (err) {
                    alert(I18N.t('designerImportFail') + err.message);
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    // ==================== 音乐管理 ====================

    /**
     * 显示音乐管理对话框（设置全局 BGM）
     */
    function showMusicDialog() {
        if (!currentDesign.music) currentDesign.music = { globalBgm: null };
        const current = currentDesign.music;

        const overlay = document.createElement('div');
        overlay.className = 'bp-music-overlay';
        overlay.id = 'bp-music-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'bp-music-dialog';
        dialog.style.cssText += 'position:relative;';

        dialog.innerHTML = `
            <h3>🎵 ${I18N.t('musicTitle') || '音乐管理'}</h3>
            <p class="bp-music-subtitle">${I18N.t('musicGlobalBgm') || '全局背景音乐'} — ${I18N.t('musicUploadHint') || '支持 mp3, wav, ogg'}</p>
            <div id="bp-global-music-upload-area"></div>
            <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
                <button id="bp-music-dialog-close" style="background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-secondary);padding:8px 20px;border-radius:8px;cursor:pointer;font-size:0.85rem;">${I18N.t('designerCancel') || '取消'}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 创建上传控件
        const uploadArea = dialog.querySelector('#bp-global-music-upload-area');
        const uploadHTML = createMusicUploadHTML('global-bgm', current.globalBgm, I18N.t('musicGlobalBgm') || '全局BGM');
        uploadArea.innerHTML = uploadHTML;
        bindMusicUploadEvents('global-bgm', (ref) => { current.globalBgm = ref; }, current.globalBgm);

        // 关闭
        const closeDialog = () => {
            overlay.remove();
            render(); // 刷新设计器
        };
        dialog.querySelector('#bp-music-dialog-close').onclick = closeDialog;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
    }

    /**
     * 创建音乐上传控件的 HTML
     */
    function createMusicUploadHTML(id, musicRef, label) {
        const hasMusic = musicRef && musicRef.audioId;
        const name = hasMusic ? escapeHtml(musicRef.name || '') : '';
        const loopChecked = (!musicRef || musicRef.loop !== false) ? 'checked' : '';
        return `
            <div class="designer-music-section">
                <div class="music-section-title">${label}</div>
                <div class="music-upload-row">
                    <label class="music-upload-btn" id="${id}-upload-btn" for="${id}-file-input">📁 ${I18N.t('musicUpload') || '上传'}</label>
                    <span class="music-file-name ${hasMusic ? 'has-music' : ''}" id="${id}-file-name">
                        ${hasMusic ? '🎵 ' + name : (I18N.t('musicNoFile') || '未选择')}
                    </span>
                    ${hasMusic ? '<button class="music-preview-btn" id="' + id + '-preview-btn" title="试听">▶ 试听</button>' : ''}
                    ${hasMusic ? '<button class="music-remove-btn" id="' + id + '-remove-btn">✕ ' + (I18N.t('musicRemove') || '移除') + '</button>' : ''}
                    <input type="file" id="${id}-file-input" accept="audio/*" style="display:none;">
                </div>
                <div class="music-loop-row">
                    <input type="checkbox" id="${id}-loop-check" ${loopChecked}>
                    <label for="${id}-loop-check">🔁 ${I18N.t('musicLoop') || '循环播放'}</label>
                </div>
            </div>
        `;
    }

    /**
     * 绑定音乐上传控件的事件
     */
    function bindMusicUploadEvents(id, onChange, musicRef) {
        const uploadBtn = document.getElementById(id + '-upload-btn');
        const fileInput = document.getElementById(id + '-file-input');
        const removeBtn = document.getElementById(id + '-remove-btn');
        const previewBtn = document.getElementById(id + '-preview-btn');
        const loopCheck = document.getElementById(id + '-loop-check');

        // 试听按钮
        if (previewBtn && musicRef && musicRef.audioId) {
            previewBtn.addEventListener('click', async () => {
                // 如果正在播放同一首，停止
                if (_previewAudio && _previewAudio.dataset.previewId === id) {
                    _previewAudio.pause();
                    _previewAudio.currentTime = 0;
                    _previewAudio = null;
                    previewBtn.textContent = '▶ 试听';
                    return;
                }
                // 停止之前的预览
                if (_previewAudio) {
                    _previewAudio.pause();
                    _previewAudio = null;
                }
                try {
                    const url = await AUDIO.getAudioUrl(musicRef.audioId);
                    if (!url) return;
                    const audio = new Audio(url);
                    audio.dataset.previewId = id;
                    audio.volume = 0.6;
                    audio.addEventListener('ended', () => {
                        previewBtn.textContent = '▶ 试听';
                        _previewAudio = null;
                    });
                    audio.addEventListener('error', () => {
                        previewBtn.textContent = '⚠ 失败';
                        _previewAudio = null;
                    });
                    await audio.play();
                    _previewAudio = audio;
                    previewBtn.textContent = '⏸ 停止';
                } catch (e) {
                    console.warn('[Designer] 试听失败:', e.message);
                    previewBtn.textContent = '⚠ 重试';
                }
            });
        }

        if (uploadBtn && fileInput) {
            // 上传按钮是 <label for="file-input">，由浏览器原生关联触发文件选择，
            // 无需 JS click()（移动端 WebView 对隐藏 file input 的 .click() 支持不佳）
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 20 * 1024 * 1024) {
                    alert(I18N.t('musicFileTooLarge') || '文件过大（超过 20MB），请选择较小的文件');
                    return;
                }
                try {
                    if (typeof AUDIO === 'undefined' || !AUDIO.uploadAudio) {
                        alert('音频系统未加载，请刷新页面。');
                        return;
                    }
                    const ref = await AUDIO.uploadAudio(file);
                    ref.loop = loopCheck ? loopCheck.checked : true;
                    onChange(ref);
                    // 刷新控件
                    const section = document.getElementById(id + '-upload-btn').closest('.designer-music-section');
                    if (section) {
                        section.outerHTML = createMusicUploadHTML(id, ref, section.querySelector('.music-section-title').textContent);
                        bindMusicUploadEvents(id, onChange, ref);
                    }
                } catch (err) {
                    console.error('[Designer] 音乐上传失败:', err);
                    alert('上传失败: ' + err.message);
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                // 停止该音乐的预览
                if (_previewAudio && _previewAudio.dataset.previewId === id) {
                    _previewAudio.pause();
                    _previewAudio = null;
                }
                const section = document.getElementById(id + '-upload-btn').closest('.designer-music-section');
                // 通过 onChange(null) 让外部处理清理
                onChange(null);
                if (section) {
                    const label = section.querySelector('.music-section-title').textContent;
                    section.outerHTML = createMusicUploadHTML(id, null, label);
                    bindMusicUploadEvents(id, onChange, null);
                }
                render(); // 刷新属性面板
            });
        }

        if (loopCheck) {
            loopCheck.addEventListener('change', () => {
                // 循环设置通过 render 时重新读取 data 来生效
                // 这里不做额外处理，由 onChange 回调管理
            });
        }
    }

    /**
     * 创建节点音乐配置区域 DOM（用于属性面板）
     */
    function createNodeMusicDOM(data, field, label) {
        const container = document.createElement('div');
        const musicRef = data[field] || null;
        const id = field + '_' + (data._musicCtrlId || '_' + Math.random().toString(36).slice(2, 8));
        if (!data._musicCtrlId) data._musicCtrlId = id;
        container.innerHTML = createMusicUploadHTML(id, musicRef, label);

        // 绑定事件
        bindMusicUploadEvents(id, (ref) => {
            // 同时更新 loop 状态
            const loopCheck = document.getElementById(id + '-loop-check');
            if (ref) ref.loop = loopCheck ? loopCheck.checked : true;
            data[field] = ref;
            if (!ref) {
                // 移除时标记需要刷新节点预览
                _dirtyConnections = true;
            }
        }, musicRef);

        return container;
    }

    function showMessage(msg) {
        const container = document.getElementById('designer-canvas');
        if (!container) return;
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-card);border:1px solid var(--accent-green);border-radius:var(--radius-md);padding:16px 32px;font-size:1rem;color:var(--accent-green);z-index:10000;animation:cardAppear 0.3s ease;';
        div.textContent = msg;
        container.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }

    // ==================== 试玩调试模式 ====================
    // 在设计器画布内运行蓝图：随剧情推进，运行到的节点与连线依次点亮，
    // 底部浮动面板以对话形式显示消息与选项，方便定位剧情逻辑问题。
    let _pt = null; // 试玩会话状态
    let _ptStylesInjected = false;

    // 试玩相关 i18n（动态注册，避免改 i18n.js 主文件）
    if (typeof I18N !== 'undefined' && I18N.strings) {
        I18N.strings.zh['designerPtTitle'] = '试玩调试';
        I18N.strings.en['designerPtTitle'] = 'Playtest';
        I18N.strings.ja['designerPtTitle'] = 'プレイテスト';
        I18N.strings.zh['designerPtRestart'] = '重开';
        I18N.strings.en['designerPtRestart'] = 'Restart';
        I18N.strings.ja['designerPtRestart'] = '再生';
        I18N.strings.zh['designerPtStop'] = '停止';
        I18N.strings.en['designerPtStop'] = 'Stop';
        I18N.strings.ja['designerPtStop'] = '停止';
        I18N.strings.zh['designerPtDeadEnd'] = '⚠ 流程中断：该节点没有后续连线';
        I18N.strings.en['designerPtDeadEnd'] = '⚠ Dead end: this node has no outgoing connection';
        I18N.strings.ja['designerPtDeadEnd'] = '⚠ 途切れ：このノードに接続がありません';
        I18N.strings.zh['designerPtEnding'] = '到达结局';
        I18N.strings.en['designerPtEnding'] = 'Ending reached';
        I18N.strings.ja['designerPtEnding'] = 'エンディング到達';
        I18N.strings.zh['designerPtFinish'] = '试玩结束';
        I18N.strings.en['designerPtFinish'] = 'Playtest finished';
        I18N.strings.ja['designerPtFinish'] = 'テスト終了';
        I18N.strings.zh['designerPtEmpty'] = '蓝图无法编译：请检查起始节点与连线';
        I18N.strings.en['designerPtEmpty'] = 'Cannot compile blueprint: check the start node and connections';
        I18N.strings.ja['designerPtEmpty'] = 'ブループリントをコンパイルできません：開始ノードと接続を確認';
        I18N.strings.zh['designerPtSceneMissing'] = '场景不存在';
        I18N.strings.en['designerPtSceneMissing'] = 'Scene not found';
        I18N.strings.ja['designerPtSceneMissing'] = 'シーンが見つかりません';
        I18N.strings.zh['designerVpHide'] = '隐藏面板';
        I18N.strings.en['designerVpHide'] = 'Hide panel';
        I18N.strings.ja['designerVpHide'] = 'パネルを隠す';
        I18N.strings.zh['designerVpShow'] = '显示变量面板';
        I18N.strings.en['designerVpShow'] = 'Show variables panel';
        I18N.strings.ja['designerVpShow'] = '変数パネルを表示';
        I18N.strings.zh['designerPtVarsToggle'] = '变量状态';
        I18N.strings.en['designerPtVarsToggle'] = 'Variables';
        I18N.strings.ja['designerPtVarsToggle'] = '変数状態';
        I18N.strings.zh['designerPtVarsHide'] = '隐藏变量';
        I18N.strings.en['designerPtVarsHide'] = 'Hide variables';
        I18N.strings.ja['designerPtVarsHide'] = '変数を隠す';
        I18N.strings.zh['designerPtPause'] = '暂停';
        I18N.strings.en['designerPtPause'] = 'Pause';
        I18N.strings.ja['designerPtPause'] = '一時停止';
        I18N.strings.zh['designerPtResume'] = '继续';
        I18N.strings.en['designerPtResume'] = 'Resume';
        I18N.strings.ja['designerPtResume'] = '再開';
        I18N.strings.zh['designerPtPaused'] = '已暂停 · 点「▶ 继续」恢复运行';
        I18N.strings.en['designerPtPaused'] = 'Paused · click "Resume" to continue';
        I18N.strings.ja['designerPtPaused'] = '一時停止中 ·「▶ 再開」で続行';
    }

    function injectPlaytestStyles() {
        if (_ptStylesInjected) return;
        _ptStylesInjected = true;
        const st = document.createElement('style');
        st.id = 'bp-playtest-styles';
        st.textContent = `
            /* ── 运行轨迹高亮 ── */
            .bp-node.pt-active {
                box-shadow: 0 0 0 3px #22d3ee, 0 0 22px rgba(34,211,238,0.85) !important;
                animation: ptNodePulse 1.1s ease-in-out infinite;
            }
            .bp-node.pt-done { box-shadow: 0 0 0 2px rgba(34,211,238,0.45), 0 4px 16px rgba(0,0,0,0.4) !important; }
            @keyframes ptNodePulse {
                0%, 100% { box-shadow: 0 0 0 3px #22d3ee, 0 0 14px rgba(34,211,238,0.65) !important; }
                50% { box-shadow: 0 0 0 4px #22d3ee, 0 0 26px rgba(34,211,238,0.95) !important; }
            }
            path.bp-connection.pt-edge-active {
                stroke: #22d3ee !important; stroke-width: 3 !important;
                filter: drop-shadow(0 0 5px rgba(34,211,238,0.9));
                stroke-dasharray: 9 5; animation: ptEdgeFlow 0.55s linear infinite;
            }
            path.bp-connection.pt-edge-done {
                stroke: #22d3ee !important; stroke-width: 2.5 !important;
                filter: drop-shadow(0 0 3px rgba(34,211,238,0.4));
            }
            @keyframes ptEdgeFlow { to { stroke-dashoffset: -14; } }

            /* ── 试玩面板 ── */
            #bp-playtest-panel {
                position: absolute; left: 50%; transform: translateX(-50%); bottom: 12px;
                width: min(400px, calc(100vw - 24px)); height: min(46vh, 430px);
                background: var(--bg-card); border: 1px solid var(--border-color);
                border-radius: var(--radius-md); box-shadow: 0 12px 40px rgba(0,0,0,0.55);
                display: flex; flex-direction: column; z-index: 30; overflow: hidden;
                animation: cardAppear 0.25s ease;
            }
            #bp-playtest-panel .pt-header {
                display: flex; align-items: center; gap: 6px; padding: 8px 10px;
                background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); flex-shrink: 0;
            }
            #bp-playtest-panel .pt-title { font-size: 0.82rem; font-weight: 700; color: var(--accent-cyan); }
            #bp-playtest-panel .pt-btn {
                background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-secondary);
                border-radius: var(--radius-sm); padding: 3px 8px; font-size: 0.72rem; cursor: pointer; white-space: nowrap;
            }
            #bp-playtest-panel .pt-btn.pt-stop { border-color: var(--accent-red); color: var(--accent-red); }
            /* ── 变量状态浮条（独立于试玩面板，可拖动/可隐藏） ── */
            #pt-vars-float {
                position: absolute; left: 50%; transform: translateX(-50%);
                bottom: calc(min(46vh, 430px) + 20px);
                max-width: min(420px, calc(100vw - 24px));
                background: var(--bg-card); border: 1px solid var(--border-color);
                border-radius: var(--radius-md); box-shadow: 0 8px 26px rgba(0,0,0,0.5);
                z-index: 29; overflow: hidden; animation: cardAppear 0.25s ease;
            }
            #pt-vars-float.hidden { display: none; }
            #pt-vars-float .ptvf-header {
                display: flex; align-items: center; gap: 6px; padding: 5px 8px;
                background: var(--bg-secondary); border-bottom: 1px solid var(--border-color);
            }
            #pt-vars-float .ptvf-title { font-size: 0.72rem; font-weight: 700; color: var(--accent-cyan); flex: 1; }
            #pt-vars-float .pt-vars {
                display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 10px;
                max-height: 96px; overflow-y: auto;
            }
            #pt-vars-float .pt-vars:empty { display: none; }
            .pt-var-chip {
                font-size: 0.68rem; background: var(--bg-secondary); border: 1px solid var(--border-color);
                border-radius: 8px; padding: 1px 8px; color: var(--text-secondary); white-space: nowrap;
            }
            .pt-var-chip b { color: var(--accent-cyan); font-weight: 700; }
            #bp-playtest-panel .pt-msgs {
                flex: 1; overflow-y: auto; padding: 10px;
                display: flex; flex-direction: column; gap: 8px;
            }
            #bp-playtest-panel .pt-bubble {
                max-width: 88%; padding: 8px 10px; border-radius: 10px;
                font-size: 0.78rem; line-height: 1.55; word-break: break-word;
                animation: cardAppear 0.22s ease; white-space: pre-wrap;
            }
            #bp-playtest-panel .pt-bubble.narrator {
                align-self: center; text-align: center; max-width: 94%;
                background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-secondary);
            }
            #bp-playtest-panel .pt-bubble.character {
                align-self: flex-start; background: var(--bg-secondary);
                border-left: 3px solid var(--pt-char-color, #4a7dff);
            }
            #bp-playtest-panel .pt-bubble.character .pt-char-name {
                font-size: 0.7rem; font-weight: 700; color: var(--pt-char-color, #4a7dff); margin-bottom: 2px;
            }
            #bp-playtest-panel .pt-bubble.system {
                align-self: center; font-size: 0.7rem;
                background: rgba(168,85,247,0.12); border: 1px dashed var(--accent-purple, #a855f7); color: var(--text-secondary);
            }
            #bp-playtest-panel .pt-bubble.player { align-self: flex-end; background: var(--accent-blue, #3b82f6); color: #fff; }
            #bp-playtest-panel .pt-bubble.ending {
                align-self: center; text-align: center; background: rgba(245,158,11,0.1);
                border: 1px solid var(--accent-amber, #f59e0b); color: var(--text-primary);
            }
            #bp-playtest-panel .pt-choices {
                display: flex; flex-direction: column; gap: 6px;
                padding: 8px 10px; border-top: 1px solid var(--border-color); flex-shrink: 0;
            }
            #bp-playtest-panel .pt-choices:empty { display: none; border-top: none; padding: 0; }
            #bp-playtest-panel .pt-choice-btn {
                background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary);
                border-radius: var(--radius-sm); padding: 8px 12px; font-size: 0.78rem; cursor: pointer;
                text-align: left; transition: border-color 0.15s, background 0.15s;
            }
            #bp-playtest-panel .pt-choice-btn:hover { border-color: var(--accent-cyan); background: var(--bg-card); }
            #bp-playtest-panel .pt-choice-btn.disabled { opacity: 0.45; pointer-events: none; }
            #bp-playtest-panel .pt-choice-tag {
                display: inline-block; font-size: 0.62rem; padding: 1px 6px; border-radius: 8px;
                margin-right: 5px; vertical-align: 1px;
            }
            #bp-playtest-panel .pt-status {
                font-size: 0.68rem; color: var(--text-muted); padding: 5px 10px;
                border-top: 1px solid var(--border-color); flex-shrink: 0; min-height: 24px;
            }
        `;
        document.head.appendChild(st);
    }

    function startPlaytest() {
        if (_pt) stopPlaytest();
        save(true); // 静默保存
        const designCopy = JSON.parse(JSON.stringify(currentDesign));
        const chapter = compileBlueprint(designCopy);
        if (!chapter || !chapter.scenes || Object.keys(chapter.scenes).length === 0) {
            showMessage('⚠ ' + I18N.t('designerPtEmpty'));
            return;
        }
        injectPlaytestStyles();

        // 变量初始值（调试面板显示全部变量，不只 HUD 变量）
        const vars = {};
        const varDefs = {};
        const varAlias = {}; // 显示名 → 变量键（{名字} 也能插值）
        Object.entries(designCopy.variables || {}).forEach(([k, v]) => {
            const def = (v && typeof v === 'object') ? v : { defaultValue: v };
            vars[k] = def.defaultValue ?? 0;
            varDefs[k] = def.name || k;
            [def.name, def.nameEn, def.nameJa].forEach(n => {
                if (n && varAlias[n] === undefined) varAlias[n] = k;
            });
        });

        _pt = {
            chapter,
            sceneToNode: chapter.__sceneToNode || {},
            vars, varDefs, varAlias,
            visitedNodes: [],   // 已点亮的节点 id（按顺序）
            visitedEdges: [],   // 已点亮的连线 id（按顺序）
            activeNode: null,
            lastNodeId: null,
            curSceneId: null,
            msgQueue: [],
            timer: null,
            pendingFn: null,   // 暂停时冻结的待执行回调（恢复时续跑）
            paused: false,
            finished: false
        };
        _ptVarsUi.hidden = false; // 新开试玩默认显示变量浮条（拖动位置保留）

        // 面板挂载（render 会清空画布容器，所以每次都重新 build）
        buildPlaytestPanel();
        ptEnterScene(chapter.startScene);
    }

    function stopPlaytest() {
        if (_pt && _pt.timer) clearTimeout(_pt.timer);
        _pt = null;
        ptClearHighlights();
        const panel = document.getElementById('bp-playtest-panel');
        if (panel) panel.remove();
        const varsFloat = document.getElementById('pt-vars-float');
        if (varsFloat) varsFloat.remove();
    }

    function ptRestart() {
        if (!_pt) return;
        if (_pt.timer) clearTimeout(_pt.timer);
        const msgs = document.getElementById('pt-msgs');
        const choices = document.getElementById('pt-choices');
        if (msgs) msgs.innerHTML = '';
        if (choices) choices.innerHTML = '';
        ptClearHighlights();
        const keepChapter = _pt.chapter;
        // 变量复位
        const vars = {};
        Object.entries(keepChapter.runtimeInitialValues || {}).forEach(([k, v]) => { vars[k] = v; });
        _pt.vars = vars;
        _pt.visitedNodes = [];
        _pt.visitedEdges = [];
        _pt.activeNode = null;
        _pt.lastNodeId = null;
        _pt.curSceneId = null;
        _pt.msgQueue = [];
        _pt.finished = false;
        _pt.paused = false;
        _pt.pendingFn = null;
        _pt.timer = null;
        ptSyncPauseBtn();
        ptRenderVars();
        ptEnterScene(keepChapter.startScene);
    }

    function buildPlaytestPanel() {
        const container = document.getElementById('designer-canvas');
        if (!container) return;
        const old = document.getElementById('bp-playtest-panel');
        if (old) old.remove();
        const panel = document.createElement('div');
        panel.id = 'bp-playtest-panel';
        panel.innerHTML = `
            <div class="pt-header" id="pt-header">
                <span style="color:var(--text-muted);font-size:0.75rem;letter-spacing:1px;" title="${I18N.t('designerPtTitle')}">⠿</span>
                <span class="pt-title">▶ ${I18N.t('designerPtTitle')}</span>
                <span style="flex:1;"></span>
                <button class="pt-btn" id="pt-pause-btn">⏸ ${I18N.t('designerPtPause')}</button>
                <button class="pt-btn" id="pt-vars-toggle-btn" title="${I18N.t('designerPtVarsToggle')}">📊</button>
                <button class="pt-btn" id="pt-restart-btn">↺ ${I18N.t('designerPtRestart')}</button>
                <button class="pt-btn pt-stop" id="pt-stop-btn">■ ${I18N.t('designerPtStop')}</button>
            </div>
            <div class="pt-msgs" id="pt-msgs"></div>
            <div class="pt-choices" id="pt-choices"></div>
            <div class="pt-status" id="pt-status"></div>
        `;
        container.appendChild(panel);
        // 恢复上次拖动位置（render 重建面板后保持）
        if (_ptPanelUi.x != null) {
            panel.style.left = _ptPanelUi.x + 'px';
            panel.style.top = _ptPanelUi.y + 'px';
            panel.style.bottom = 'auto';
            panel.style.transform = 'none';
        }
        makeFloatingDraggable({ panel, handle: panel.querySelector('.pt-header'), pinSize: true, getState: () => _ptPanelUi, save: null });
        document.getElementById('pt-restart-btn').addEventListener('click', ptRestart);
        document.getElementById('pt-stop-btn').addEventListener('click', stopPlaytest);
        document.getElementById('pt-pause-btn').addEventListener('click', ptPauseToggle);
        document.getElementById('pt-vars-toggle-btn').addEventListener('click', () => {
            _ptVarsUi.hidden = !_ptVarsUi.hidden;
            applyPtVarsVisibility();
        });
        // 阻止面板内的指针操作传播到画布（避免拖动画布/误选节点）
        ['pointerdown', 'touchstart', 'wheel'].forEach(ev => {
            panel.addEventListener(ev, e => e.stopPropagation());
        });
        ptSyncPauseBtn();
        buildPtVarsFloat();
    }

    // ── 变量状态浮条（独立于试玩面板，可拖动/可隐藏；render 重建后按状态恢复） ──
    let _ptVarsUi = { x: null, y: null, hidden: false };
    // ── 试玩面板拖动位置（模块级，render/重开/停止再开后保留） ──
    let _ptPanelUi = { x: null, y: null };

    function buildPtVarsFloat() {
        const container = document.getElementById('designer-canvas');
        if (!container) return;
        const old = document.getElementById('pt-vars-float');
        if (old) old.remove();
        const fl = document.createElement('div');
        fl.id = 'pt-vars-float';
        fl.innerHTML = `<div class="ptvf-header" id="ptvf-header">` +
            `<span style="color:var(--text-muted);font-size:0.75rem;letter-spacing:1px;">⠿</span>` +
            `<span class="ptvf-title">📊 ${I18N.t('designerPtVarsToggle')}</span>` +
            `<button class="pt-btn" id="ptvf-hide-btn" title="${I18N.t('designerPtVarsHide')}" style="padding:1px 6px;">▼</button>` +
            `</div><div class="pt-vars" id="pt-vars"></div>`;
        if (_ptVarsUi.x != null) {
            fl.style.left = _ptVarsUi.x + 'px';
            fl.style.top = _ptVarsUi.y + 'px';
            fl.style.bottom = 'auto';
            fl.style.transform = 'none';
        }
        container.appendChild(fl);
        document.getElementById('ptvf-hide-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            _ptVarsUi.hidden = true;
            applyPtVarsVisibility();
        });
        makeFloatingDraggable({ panel: fl, handle: fl.querySelector('.ptvf-header'), pinSize: false, getState: () => _ptVarsUi, save: null });
        ['pointerdown', 'touchstart', 'wheel'].forEach(ev => {
            fl.addEventListener(ev, e => e.stopPropagation());
        });
        applyPtVarsVisibility();
        ptRenderVars();
    }

    function applyPtVarsVisibility() {
        const fl = document.getElementById('pt-vars-float');
        if (fl) fl.classList.toggle('hidden', !!_ptVarsUi.hidden);
        const btn = document.getElementById('pt-vars-toggle-btn');
        if (btn) btn.style.opacity = _ptVarsUi.hidden ? '0.45' : '1';
    }

    // ── 运行轨迹高亮 ──
    function ptClearHighlights() {
        document.querySelectorAll('.bp-node.pt-active, .bp-node.pt-done')
            .forEach(el => el.classList.remove('pt-active', 'pt-done'));
        document.querySelectorAll('path.bp-connection.pt-edge-active, path.bp-connection.pt-edge-done')
            .forEach(p => p.classList.remove('pt-edge-active', 'pt-edge-done'));
    }

    // render() 重建 DOM 后恢复轨迹（render 期间 _pt 保持运行）
    function ptReapplyHighlights() {
        if (!_pt) return;
        _pt.visitedEdges.forEach((cid, i) => {
            const p = document.querySelector(`path.bp-connection[data-conn-id="${cid}"]`);
            if (p) p.classList.add(i === _pt.visitedEdges.length - 1 ? 'pt-edge-active' : 'pt-edge-done');
        });
        _pt.visitedNodes.forEach((nid, i) => {
            const el = document.querySelector(`.bp-node[data-node-id="${nid}"]`);
            if (el) el.classList.add(nid === _pt.activeNode ? 'pt-active' : 'pt-done');
        });
    }

    function ptLightNode(nodeId, prevNodeId) {
        const pt = _pt; if (!pt) return;
        // 上一个活跃节点 → 已走过
        document.querySelectorAll('.bp-node.pt-active').forEach(n => { n.classList.remove('pt-active'); n.classList.add('pt-done'); });
        // 上一条活跃连线 → 已走过
        document.querySelectorAll('path.bp-connection.pt-edge-active').forEach(p => { p.classList.remove('pt-edge-active'); p.classList.add('pt-edge-done'); });

        if (nodeId) {
            if (pt.visitedNodes[pt.visitedNodes.length - 1] !== nodeId) pt.visitedNodes.push(nodeId);
            pt.activeNode = nodeId;
            const el = document.querySelector(`.bp-node[data-node-id="${nodeId}"]`);
            if (el) el.classList.add('pt-active');
        }
        // 点亮 prev → cur 的连线
        if (prevNodeId && nodeId) {
            const edges = curConns().filter(c => c.fromNode === prevNodeId && c.toNode === nodeId);
            edges.forEach(c => {
                if (pt.visitedEdges[pt.visitedEdges.length - 1] !== c.id) pt.visitedEdges.push(c.id);
                const p = document.querySelector(`path.bp-connection[data-conn-id="${c.id}"]`);
                if (p) p.classList.add('pt-edge-active');
            });
        }
        ptUpdateStatus(nodeId);
        ptCenterOnNode(nodeId);
    }

    // 画布自动跟随：仅当活跃节点超出可视区（扣除面板高度）时平移
    function ptCenterOnNode(nodeId) {
        const node = curNodes().find(n => n.id === nodeId);
        const canvas = document.getElementById('bp-canvas');
        if (!node || !canvas) return;
        const panel = document.getElementById('bp-playtest-panel');
        const panelH = panel ? panel.offsetHeight + 24 : 0;
        const cw = canvas.clientWidth, ch = canvas.clientHeight;
        const margin = 50;
        const w = 220 * scale, h = 130 * scale;
        const sx = node.x * scale + canvasOffset.x;
        const sy = node.y * scale + canvasOffset.y;
        let dx = 0, dy = 0;
        if (sx < margin) dx = margin - sx;
        else if (sx + w > cw - margin) dx = (cw - margin) - (sx + w);
        const viewBottom = ch - panelH;
        if (sy < margin) dy = margin - sy;
        else if (sy + h > viewBottom - margin) dy = (viewBottom - margin) - (sy + h);
        if (dx || dy) {
            canvasOffset.x += dx;
            canvasOffset.y += dy;
            applyCanvasTransform();
        }
    }

    function ptUpdateStatus(nodeId) {
        const el = document.getElementById('pt-status');
        if (!el) return;
        const pt = _pt; if (!pt) { el.textContent = ''; return; }
        let label = '';
        if (nodeId) {
            const node = curNodes().find(n => n.id === nodeId);
            if (node) {
                const tpl = NODE_TEMPLATES[node.type];
                if (tpl) label = getText(tpl.title, tpl.titleEn, tpl.titleJa);
            }
        }
        el.textContent = `● ${label || '-'} · ${pt.visitedNodes.length} nodes`;
    }

    // ── 运行时引擎（与 game.js playScene 流程一致） ──
    function ptEnterScene(sid) {
        const pt = _pt; if (!pt || pt.finished) return;
        const scene = pt.chapter.scenes[sid];
        if (!scene) {
            ptAppendBubble('system', I18N.t('designerPtSceneMissing') + ': ' + sid);
            ptSetStatus(I18N.t('designerPtDeadEnd'));
            pt.finished = true;
            return;
        }
        pt.curSceneId = sid;
        const nodeId = pt.sceneToNode[sid] || null;
        ptLightNode(nodeId, pt.lastNodeId);
        pt.lastNodeId = nodeId;
        // 函数调用场景：进入时先执行（绑定参数作用域 + 返回值写入变量，供后续消息插值/条件判定）
        pt.fnScope = null; // 每个场景重置函数参数作用域
        if (scene.fnCall) ptExecFnCall(scene);
        pt.msgQueue = (scene.messages || []).slice();
        ptNextMessage(scene);
    }

    // 试玩引擎的函数执行（与 game.js executeFnCall 同规则，变量取自 pt.vars）：
    // 图函数/消息型函数 → 绑定参数作用域 pt.fnScope（消息插值用）+ 返回值表达式求值写入 resultVar；
    // 旧式 JS 函数 → 编译期已算过，仅按 resultVars 兜底
    function ptExecFnCall(scene) {
        const pt = _pt; if (!pt || !scene.fnCall) return;
        const fn = ((pt.chapter && pt.chapter.functions) || {})[scene.fnCall.fnId];
        if (!fn) return;
        try {
            const params = fn.params || [];
            // 绑定参数作用域（{参数名} 插值 + 返回值表达式求值都用）
            const scope = {};
            params.forEach(p => {
                const a = (scene.fnCall.args || {})[p] || {};
                scope[p] = a.t === 'var' ? (pt.vars[a.v] ?? 0) : (a.v ?? 0);
            });
            pt.fnScope = scope;
            // 旧式 JS 函数：无消息序列，立即求值
            if (typeof fn.body === 'string' && fn.body.trim() !== '') {
                const result = buildUserFn(fn).apply(null, params.map(p => scope[p]));
                const returns = fn.returns || [];
                const resultVars = scene.fnCall.resultVars || {};
                if (returns.length === 1) {
                    pt.vars[resultVars[returns[0]] || returns[0]] = result;
                } else if (returns.length > 1 && result && typeof result === 'object') {
                    returns.forEach(rk => { pt.vars[resultVars[rk] || rk] = result ? result[rk] : undefined; });
                }
            } else if (fn.outputValues && Object.keys(fn.outputValues).length) {
                // 图函数：输出变量 = 取值来源（函数参数/体内变量）的值；写入 resultVars 目标
                const outputs = fn.outputs || Object.keys(fn.outputValues);
                const resultVars = scene.fnCall.resultVars || {};
                outputs.forEach(out => {
                    const srcKey = fn.outputValues[out] || out;
                    const val = (scope[srcKey] !== undefined) ? scope[srcKey] : pt.vars[srcKey];
                    const target = resultVars[out] || out;
                    pt.vars[target] = val;
                });
            } else if (scene.fnCall.returnValue) {
                // 图函数：返回值表达式（作用域 = 参数 + 当前变量）
                const result = evalFnExpression(scene.fnCall.returnValue, Object.assign({}, pt.vars, scope));
                const target = scene.fnCall.resultVar
                    || (scene.fnCall.resultVars && Object.values(scene.fnCall.resultVars)[0]);
                if (target) pt.vars[target] = result;
            }
            ptRenderVars();
        } catch (err) {
            console.warn('[PT] fnCall error:', err.message);
        }
    }

    // 安全求值表达式（fn_return 返回值）：作用域键作为形参，值作为实参；带编译缓存
    function evalFnExpression(expr, scope) {
        const keys = Object.keys(scope).filter(k => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k));
        const cacheKey = keys.join(',') + '|' + expr;
        evalFnExpression._cache = evalFnExpression._cache || {};
        let fn = evalFnExpression._cache[cacheKey];
        if (!fn) {
            fn = new Function(keys.join(','), '"use strict"; return (' + expr + ');');
            evalFnExpression._cache[cacheKey] = fn;
        }
        return fn.apply(null, keys.map(k => scope[k]));
    }

    // 运行时变量运算（函数体内 set_variable：操作数可为数字或 {param} 模板字符串）
    function applyVarOperation(current, varEffect) {
        const op = varEffect.operation || 'set';
        let operand = varEffect.operandValue;
        if (typeof operand === 'string') {
            const interp = ptInterpolate(operand);
            const num = Number(interp);
            operand = (interp !== '' && !isNaN(num)) ? num : interp;
        }
        const cur = typeof current === 'number' ? current : (Number(current) || 0);
        switch (op) {
            case 'set': return operand;
            case 'add': return cur + (Number(operand) || 0);
            case 'sub': return cur - (Number(operand) || 0);
            case 'mul': return cur * (Number(operand) || 0);
            case 'div': return (Number(operand) !== 0) ? Math.floor(cur / Number(operand)) : cur;
            default: return current;
        }
    }

    // 试玩文本插值：{varName} → 当前变量值（函数作用域参数优先）
    // {变量名} → 变量值（未定义原样保留）。变量名可用键，也可用显示名（{名字} → var_名字）
    const VAR_TOKEN_RE = /\{([^{\s{}]+)\}/g;

    function ptInterpolate(text) {
        const pt = _pt;
        if (typeof text !== 'string' || text.indexOf('{') === -1) return text;
        return text.replace(VAR_TOKEN_RE, (m, token) => {
            const scope = pt ? pt.fnScope : null;
            if (scope && scope[token] !== undefined) return String(scope[token]);
            let v = pt ? pt.vars[token] : undefined;
            if (v === undefined && pt && pt.varAlias) {
                const key = pt.varAlias[token];
                if (key) v = pt.vars[key];
            }
            return (v === undefined || v === null) ? m : String(v);
        });
    }

    function ptGoto(sid) {
        const pt = _pt; if (!pt || pt.finished) return;
        if (!sid) {
            ptAppendBubble('system', I18N.t('designerPtDeadEnd'));
            ptSetStatus(I18N.t('designerPtDeadEnd'));
            pt.finished = true;
            return;
        }
        ptEnterScene(sid);
    }

    // ── 统一定时调度：暂停中不启动定时器，保留待执行回调（恢复时续跑） ──
    function ptSchedule(fn, delay) {
        const pt = _pt; if (!pt) return;
        pt.pendingFn = fn;
        if (pt.paused) return;
        pt.timer = setTimeout(() => {
            pt.timer = null;
            if (!_pt) return;               // 会话已被停止
            if (_pt.pendingFn === fn) _pt.pendingFn = null;
            fn();
        }, delay);
    }

    // ── 暂停/恢复 ──
    function ptPauseToggle() {
        const pt = _pt;
        if (!pt || pt.finished) return;
        pt.paused = !pt.paused;
        if (pt.paused) {
            if (pt.timer) { clearTimeout(pt.timer); pt.timer = null; }
            ptSetStatus('⏸ ' + I18N.t('designerPtPaused'));
        } else {
            if (pt.pendingFn) {
                const fn = pt.pendingFn;
                pt.pendingFn = null;
                pt.timer = setTimeout(() => { pt.timer = null; fn(); }, 100);
            } else {
                ptUpdateStatus(pt.activeNode); // 无挂起流程（如停在选项界面）→ 还原状态栏
            }
        }
        ptSyncPauseBtn();
    }

    function ptSyncPauseBtn() {
        const btn = document.getElementById('pt-pause-btn');
        if (!btn || !_pt) return;
        btn.textContent = _pt.paused ? ('▶ ' + I18N.t('designerPtResume')) : ('⏸ ' + I18N.t('designerPtPause'));
        const c = _pt.paused ? 'var(--accent-amber, #f59e0b)' : '';
        btn.style.borderColor = c;
        btn.style.color = c;
    }

    function ptNextMessage(scene) {
        const pt = _pt; if (!pt) return;
        if (pt.msgQueue.length === 0) return ptAfterMessages(scene);
        const msg = pt.msgQueue.shift();
        ptRenderMessage(msg);
        const delay = msg.type === 'chapter_card' ? 1400 : (msg.type === 'narrator' ? 420 : 300);
        ptSchedule(() => ptNextMessage(scene), delay);
    }

    // ── 试玩面板内的章节卡（正式游戏中为全屏章节横幅） ──
    function ptAppendChapterCard(title, sub, num) {
        const pt = _pt; if (!pt) return;
        const wrap = document.getElementById('pt-msgs');
        if (!wrap) return;
        const div = document.createElement('div');
        div.className = 'pt-chapter-card';
        div.style.cssText = 'margin:10px 6px;padding:14px 12px;text-align:center;border:1px solid var(--accent-blue,#4a7dff);border-radius:10px;background:rgba(74,125,255,0.10);';
        div.innerHTML =
            '<div style="font-size:0.72rem;letter-spacing:2px;color:var(--text-secondary);margin-bottom:4px;">' + escapeHtml(I18N.t('chapter', { n: num })) + '</div>' +
            '<div style="font-size:1.05rem;font-weight:700;color:var(--text-primary);">' + escapeHtml(title || '') + '</div>' +
            (sub ? '<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;">' + escapeHtml(sub) + '</div>' : '');
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
    }

    function ptAfterMessages(scene) {
        const pt = _pt; if (!pt) return;
        if (scene.input) return ptShowInput(scene);
        if (scene.choices && scene.choices.length > 0) return ptShowChoices(scene);
        if (scene.nextScene) {
            ptSchedule(() => ptGoto(scene.nextScene), 220);
        } else if (scene.isEnding) {
            ptShowEnding(scene);
        } else {
            ptGoto(null); // 死路：无连线
        }
    }

    function ptText(obj) {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        const lang = (typeof I18N !== 'undefined' && I18N.getLanguage) ? I18N.getLanguage() : 'zh';
        return obj[lang] || obj.zh || obj.en || obj.ja || '';
    }

    function ptRenderMessage(msg) {
        const pt = _pt; if (!pt) return;
        // 变量效果：同步内部状态 + HUD（函数体内 runtime 变量运算在此求值）
        if (msg.varEffect && msg.varEffect.variableName) {
            const name = msg.varEffect.variableName;
            if (msg.varEffect.newValue !== undefined) {
                pt.vars[name] = msg.varEffect.newValue;
            } else if (msg.varEffect.runtime && msg.varEffect.operation) {
                pt.vars[name] = applyVarOperation(pt.vars[name], msg.varEffect, pt);
            }
            ptRenderVars();
        }
        // 函数返回（fnOut）：播放到 fn_return 消息时把输出变量写入目标变量（与 game.js 同规则）
        if (msg.fnOut && Array.isArray(msg.fnOut.writes)) {
            msg.fnOut.writes.forEach(w => {
                if (!w || !w.target) return;
                pt.vars[w.target] = (w.const !== undefined) ? w.const : pt.vars[w.src];
            });
            ptRenderVars();
        }
        const text = ptInterpolate(ptText(msg.text));
        if (msg.type === 'character') {
            const name = msg.charName || msg.speaker || '';
            const color = msg.charColor || '#4a7dff';
            const avatarRaw = msg.charAvatar || msg.charAvatarFallback || '👤';
            const avatarHTML = (window.IMGDB && IMGDB.isImgRef(avatarRaw)) ? IMGDB.renderIconHTML(avatarRaw, 16) : escapeHtml(avatarRaw);
            ptAppendBubble('character', text, { name, color, avatarHTML });
        } else if (msg.type === 'illustration') {
            // 插图：试玩面板内同样渲染配图（与正式游戏 addIllustrationMessage 视觉一致）
            const iconRaw = msg.icon || '🖼️';
            const isMedium = msg.size === 'medium';
            const iconHTML = (window.IMGDB && IMGDB.renderIconHTML) ? IMGDB.renderIconHTML(iconRaw, isMedium ? 110 : 150) : escapeHtml(iconRaw);
            const cap = ptInterpolate(ptText(msg.caption));
            const wrap = document.createElement('div');
            wrap.className = 'pt-msg illustration';
            wrap.innerHTML = `
                <div class="illustration-box" style="max-width:${isMedium ? '180px' : '100%'};">
                    <div class="illustration-img" style="font-size:${isMedium ? '3.2rem' : '4.2rem'};line-height:1;">${iconHTML}</div>
                    ${cap ? `<div class="illustration-caption">${escapeHtml(cap)}</div>` : ''}
                </div>`;
            pt.messagesEl.appendChild(wrap);
            pt.messagesEl.scrollTop = pt.messagesEl.scrollHeight;
        } else if (msg.type === 'chapter_card') {
            // 章节开始 → 试玩面板内渲染醒目章节卡（对应正式游戏的全屏章节横幅）
            ptAppendChapterCard(ptInterpolate(ptText(msg.title)), ptInterpolate(ptText(msg.sub)), msg.num || 1);
        } else if (msg.type === 'system') {
            ptAppendBubble('system', text);
        } else if (msg.type === 'player') {
            ptAppendBubble('player', text);
        } else {
            ptAppendBubble('narrator', text);
        }
    }

    // ── 选项界面（与游戏一致的 tag 标签渲染） ──
    function ptShowChoices(scene) {
        const pt = _pt; if (!pt) return;
        const wrap = document.getElementById('pt-choices');
        if (!wrap) return;
        wrap.innerHTML = '';
        scene.choices.forEach((choice, idx) => {
            const btn = document.createElement('button');
            btn.className = 'pt-choice-btn';
            let html = '';
            if (choice.tag) {
                const tagInfo = (typeof STORY !== 'undefined' && STORY.tagMap) ? STORY.tagMap[choice.tag] : null;
                if (tagInfo) {
                    html += `<span class="pt-choice-tag" style="background:rgba(148,163,184,0.18);color:var(--text-secondary);">${I18N.t(tagInfo.key)}</span>`;
                }
            }
            html += escapeHtml(ptInterpolate(ptText(choice.text)));
            btn.innerHTML = html;
            btn.addEventListener('click', () => ptChoose(scene, choice, idx, btn));
            wrap.appendChild(btn);
        });
    }

    // ── 输入赋值（与游戏内 showSceneInput 同构）：输入写入变量后进入下一场景 ──
    function ptShowInput(scene) {
        const pt = _pt; if (!pt) return;
        const wrap = document.getElementById('pt-msgs');
        if (!wrap) return;
        const def = scene.input || {};
        const promptText = ptInterpolate(ptText(def.prompt)) || I18N.t('gameInputDefaultPrompt');
        const isNumber = def.inputType === 'number';
        ptAppendBubble('system', '✏️ ' + promptText);

        const row = document.createElement('div');
        row.className = 'scene-input-row';
        row.style.cssText = 'display:flex;gap:6px;align-items:stretch;padding:2px 6px 6px;';
        const field = document.createElement('input');
        field.className = 'scene-input-field';
        field.type = isNumber ? 'number' : 'text';
        field.maxLength = 24;
        field.autocomplete = 'off';
        field.placeholder = isNumber ? I18N.t('gameInputNumberPlaceholder') : I18N.t('gameInputPlaceholder');
        field.style.cssText = 'flex:1 1 auto;min-width:0;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:8px 10px;color:var(--text-primary);font-size:0.85rem;outline:none;';
        const btn = document.createElement('button');
        btn.className = 'pt-btn';
        btn.style.cssText = 'flex:0 0 auto;';
        btn.textContent = '✓ ' + I18N.t('gameInputConfirm');
        row.appendChild(field);
        row.appendChild(btn);
        wrap.appendChild(row);
        wrap.scrollTop = wrap.scrollHeight;
        try { field.focus(); } catch (e) {}

        const confirm = () => {
            if (!_pt || _pt.finished || _pt.paused) return; // 暂停中/已结束不响应
            let val = field.value.trim();
            if (isNumber) {
                const num = Number(val);
                if (val === '' || isNaN(num)) { field.style.borderColor = 'var(--accent-red)'; return; }
                val = num;
            } else if (!val) {
                val = I18N.t('gameInputAnonymous');
            }
            row.remove();
            pt.vars[def.variable] = val;
            ptRenderVars();
            ptAppendBubble('player', String(val));
            ptSchedule(() => ptGoto(scene.nextScene || null), 300);
        };
        btn.addEventListener('click', confirm);
        field.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); });
    }

    function ptChoose(scene, choice, idx, btnEl) {
        const pt = _pt; if (!pt || pt.finished || pt.paused) return;
        // 禁用全部选项，标记所选
        document.querySelectorAll('#pt-choices .pt-choice-btn').forEach(b => b.classList.add('disabled'));
        if (btnEl) btnEl.classList.remove('disabled');
        // 玩家选择气泡
        ptAppendBubble('player', ptText(choice.text));
        // 应用效果（编译产物的 choice.effects 目前只有 flag 类）
        if (choice.effects) {
            Object.keys(choice.effects).forEach(k => { pt.vars[k] = choice.effects[k]; });
            ptRenderVars();
        }
        // 点亮所选分支连线：优先按 目标节点 配对，其次按选项输出引脚 key
        const nodeId = pt.sceneToNode[pt.curSceneId];
        if (nodeId && choice.nextScene) {
            const edges = curConns().filter(c => c.fromNode === nodeId);
            const target = pt.sceneToNode[choice.nextScene];
            const pinKey = idx === 0 ? 'out_exec' : 'choice_' + idx;
            const hit = (target && edges.find(c => c.toNode === target)) ||
                edges.find(c => {
                    const pin = getPinById(c.fromPin);
                    return pin && pin.key === pinKey;
                });
            document.querySelectorAll('path.bp-connection.pt-edge-active').forEach(p => { p.classList.remove('pt-edge-active'); p.classList.add('pt-edge-done'); });
            if (hit) {
                if (pt.visitedEdges[pt.visitedEdges.length - 1] !== hit.id) pt.visitedEdges.push(hit.id);
                const p = document.querySelector(`path.bp-connection[data-conn-id="${hit.id}"]`);
                if (p) p.classList.add('pt-edge-active');
            }
        }
        ptSchedule(() => {
            const wrap = document.getElementById('pt-choices');
            if (wrap) wrap.innerHTML = '';
            ptGoto(choice.nextScene || null);
        }, 650);
    }

    function ptShowEnding(scene) {
        const pt = _pt; if (!pt) return;
        pt.finished = true;
        const title = scene.endingTitleKey || I18N.t('designerPtEnding');
        const desc = scene.endingDescKey || '';
        ptAppendBubble('ending', '🏁 ' + I18N.t('designerPtEnding') + '\n' + title + (desc ? '\n' + desc : ''));
        ptSetStatus('🏁 ' + I18N.t('designerPtFinish') + ` · ${pt.visitedNodes.length} nodes`);
    }

    // ── 面板工具 ──
    function ptAppendBubble(type, text, opts) {
        const wrap = document.getElementById('pt-msgs');
        if (!wrap) return;
        const div = document.createElement('div');
        div.className = 'pt-bubble ' + type;
        if (type === 'character' && opts) {
            div.style.setProperty('--pt-char-color', opts.color || '#4a7dff');
            const nameEl = document.createElement('div');
            nameEl.className = 'pt-char-name';
            // 头像（emoji 或图片，图片由 IMGDB 异步填充）
            if (opts.avatarHTML) {
                const av = document.createElement('span');
                av.style.cssText = 'margin-right:5px;display:inline-flex;vertical-align:middle;';
                av.innerHTML = opts.avatarHTML;
                nameEl.appendChild(av);
            }
            nameEl.appendChild(document.createTextNode(opts.name || ''));
            div.appendChild(nameEl);
            const bodyEl = document.createElement('div');
            bodyEl.textContent = text;
            div.appendChild(bodyEl);
        } else {
            div.textContent = text;
        }
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
    }

    function ptRenderVars() {
        const pt = _pt;
        const wrap = document.getElementById('pt-vars');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (!pt) return;
        Object.keys(pt.vars).forEach(k => {
            const chip = document.createElement('span');
            chip.className = 'pt-var-chip';
            const label = pt.varDefs[k] || k;
            const v = pt.vars[k];
            chip.innerHTML = `${escapeHtml(String(label))} <b>${escapeHtml(String(v))}</b>`;
            wrap.appendChild(chip);
        });
    }

    function ptSetStatus(text) {
        const el = document.getElementById('pt-status');
        if (el) el.textContent = text;
    }

    // ==================== 运行蓝图 ====================
    function playDesign() {
        save(true); // 静默保存，不弹"保存成功"提示
        const design = JSON.parse(JSON.stringify(currentDesign));
        const chapter = compileBlueprint(design);
        if (chapter) {
            STORY.addDynamicChapters([chapter]);
            GAME.startCustomStory(chapter);
        }
    }

    function playExistingDesign(designData) {
        currentDesign = normalizeDesign(designData);
        const chapter = compileBlueprint(currentDesign);
        if (chapter) {
            STORY.addDynamicChapters([chapter]);
            GAME.startCustomStory(chapter);
        }
    }

    // ==================== 图函数编译 ====================
    // 把函数体子蓝图编译为消息序列：fn_entry 沿执行链行走，
    // dialogue/narration → 消息（参数以 {param} 占位，运行时插值）；set_variable → 运行时 varEffect；fn_return → 捕获返回值表达式。
    function compileFnBody(design, fnDef) {
        const out = { messages: [], returnValue: '', outputValues: null };
        if (!fnDef || !Array.isArray(fnDef.nodes)) return out;
        const byId = {};
        fnDef.nodes.forEach(n => { byId[n.id] = n; });
        const nextExec = (node) => {
            const outPin = (node.outputs || []).find(o => o.key === 'out_exec') || (node.outputs || [])[0];
            const conn = outPin ? (fnDef.connections || []).find(c => c.fromPin === outPin.id) : null;
            return conn ? byId[conn.toNode] : null;
        };
        let node = byId[fnDef.startNode] || fnDef.nodes.find(n => n.type === 'fn_entry');
        let guard = 0;
        while (node && guard++ < 500) {
            if (node.type === 'fn_entry') {
                node = nextExec(node);
            } else if (node.type === 'illustration') {
                const data = node.data || {};
                out.messages.push({
                    type: 'illustration',
                    icon: data.icon || '🖼️',
                    size: data.size === 'medium' ? 'medium' : 'large',
                    caption: { zh: data.caption || '', en: data.captionEn || data.caption || '', ja: data.captionJa || data.caption || '' }
                });
                node = nextExec(node);
            } else if (node.type === 'dialogue' || node.type === 'narration') {
                const data = node.data || {};
                if (node.type === 'dialogue') {
                    const char = (design.characters || {})[data.characterId] || (design.characters || {}).narrator || {};
                    out.messages.push({
                        type: 'character',
                        speaker: data.characterId || 'narrator',
                        charName: char.name || '',
                        charColor: char.color || '#94a3b8',
                        charAvatar: char.icon || '👤',
                        text: { zh: data.text || '', en: data.textEn || data.text || '', ja: data.textJa || data.text || '' }
                    });
                } else {
                    out.messages.push({ type: 'narrator', text: { zh: data.text || '', en: data.textEn || data.text || '', ja: data.textJa || data.text || '' } });
                }
                node = nextExec(node);
            } else if (node.type === 'set_variable') {
                // 函数体内的变量运算：操作数可能引用参数（运行时插值求值）
                const v = (design.variables || {})[node.data.variableName] || {};
                const op = node.data.operation || 'add';
                const val = node.data.operandValue ?? 10;
                const opSymbols = { set: '=', add: '+', sub: '-', mul: '×', div: '÷' };
                const varName = v.name || node.data.variableName;
                out.messages.push({
                    type: 'system',
                    text: { zh: `🔢 ${varName} ${opSymbols[op] || op} ${val}`, en: `🔢 ${varName} ${opSymbols[op] || op} ${val}`, ja: `🔢 ${varName} ${opSymbols[op] || op} ${val}` },
                    varEffect: { variableName: node.data.variableName, operation: op, operandValue: val, runtime: true }
                });
                node = nextExec(node);
            } else if (node.type === 'fn_return') {
                // 输出变量绑定：{ 输出名: 取值来源（函数参数/体内变量名）}；运行时按作用域取值写入 resultVars 目标
                const vals = (node.data && node.data.values) || {};
                if (vals && typeof vals === 'object' && Object.keys(vals).length) {
                    out.outputValues = {};
                    Object.entries(vals).forEach(([k, v]) => { if (k) out.outputValues[k] = String(v || ''); });
                }
                out.returnValue = String((node.data && node.data.value) || '').trim(); // 旧版表达式（遗留兼容）
                break;
            } else {
                break; // 函数体内不支持的其他节点类型 → 停止
            }
        }
        return out;
    }

    // 函数定义 → 运行时形态（chapter.functions）：
    // 图函数 → { name, params, messages, returnValue }；旧式 JS 函数 → { name, params, returns, body } 原样保留
    function runtimeFunctions(design) {
        if (!design.functions || !Object.keys(design.functions).length) return null;
        const out = {};
        Object.entries(design.functions).forEach(([id, fn]) => {
            if (!fn || typeof fn !== 'object') return;
            if (isLegacyFn(fn)) {
                out[id] = { name: fn.name || id, params: (fn.params || []).slice(), returns: (fn.returns || []).slice(), body: fn.body };
            } else {
                const body = compileFnBody(design, fn);
                const rt = { name: fn.name || id, params: (fn.params || []).slice(), messages: body.messages, returnValue: body.returnValue };
                // 输出变量：列表 + 取值绑定（fn_return.values）；运行时据此从作用域取值写入 resultVars 目标
                if (Array.isArray(fn.outputs) && fn.outputs.length) {
                    rt.outputs = fn.outputs.slice();
                    if (body.outputValues && Object.keys(body.outputValues).length) rt.outputValues = body.outputValues;
                }
                out[id] = rt;
            }
        });
        return Object.keys(out).length ? out : null;
    }

    // 角色表情解析：按表情名查角色素材库；无匹配回退默认头像。
    // 返回值兼容 emoji 与 'ur-img:<id>' 图片引用（运行时 IMGDB.renderIconHTML 统一渲染）。
    function resolveExpression(char, exprName) {
        if (char && exprName && char.expressions && char.expressions[exprName]) {
            return char.expressions[exprName];
        }
        return char ? (char.icon || '👤') : '👤';
    }

    function compileBlueprint(design) {
        const chId = 'bp_ch_' + design.id;
        const scenes = {};
        const runtimeVariables = {};

        Object.entries(design.variables || {}).forEach(([k, v]) => {
            runtimeVariables[k] = v.defaultValue;
        });

        // 生成所有场景节点
        const sceneNodes = design.nodes.filter(n => ['dialogue', 'narration', 'choice', 'chapter_begin', 'end_game', 'end_chapter', 'function', 'input'].includes(n.type));
        const visited = new Set();
        let sceneId = 0;

        // 找到起点
        const startNode = design.nodes.find(n => n.id === design.startNode) || design.nodes[0];
        if (!startNode) return null;

        // 为每个执行节点生成一个场景
        // ctx：场景构建上下文 —— 主蓝图与函数子蓝图共用同一套逐节点编译逻辑。
        //   主 ctx：{ nodes, connections, nodeToScene, paramMap:null, isFn:false }
        //   函数 ctx：每个函数调用点新建（每个调用点得到独立场景副本）：
        //     { nodes, connections, nodeToScene, paramMap:{参数:实参引用}, returnSid, resultVars, fnOutputs, isFn:true }
        //     - 文本中的 {参数} 编译期替换（直接值实参 → 字面量；变量实参 → {变量名} 交运行时插值）
        //     - fn_return → fnOut 效果消息（播放到该消息时才把输出写入目标变量，时序正确）
        //     - 线性节点断链（无 out 连线）→ 隐式返回 returnSid
        const nodeToScene = {};
        let chapterCardSeq = 0; // chapter_begin 执行流到达顺序 → 运行时章节编号（第 X 章）
        const fnInlineStack = []; // 函数内联递归守卫（函数直接/间接调用自身时跳过，防止场景爆炸）

        // 编译期参数替换：{参数名} → 实参（direct → 字面量；var → {实参变量名} 运行时插值）
        function substParams(str, paramMap) {
            if (!paramMap || typeof str !== 'string' || str.indexOf('{') === -1) return str;
            return str.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, key) => {
                if (!Object.prototype.hasOwnProperty.call(paramMap, key)) return m;
                const a = paramMap[key];
                return (a && a.t === 'direct') ? String(a.v ?? '') : '{' + (a ? a.v : key) + '}';
            });
        }

        // 线性节点 out_exec 断链时的去向：函数体内 → 隐式返回；主蓝图 → 死路
        function fallThrough(ctx, target) {
            if (target) return target;
            return ctx.isFn ? (ctx.returnSid || null) : null;
        }

        // ctx 内沿 out_exec 引脚找下一执行节点（返回节点而非场景 id）
        function nextExecPin(ctx, node) {
            const outPin = (node.outputs || []).find(o => o.key === 'out_exec') || (node.outputs || [])[0];
            const conn = outPin ? ctx.connections.find(c => c.fromPin === outPin.id) : null;
            return conn ? ctx.nodes.find(n => n.id === conn.toNode) : null;
        }

        function buildSceneIn(ctx, node, path) {
            if (ctx.nodeToScene[node.id]) return ctx.nodeToScene[node.id];
            const sid = `bp_scene_${++sceneId}`;
            ctx.nodeToScene[node.id] = sid;
            const S = (s) => substParams(s, ctx.paramMap); // 文本参数替换

            const messages = [];
            const choices = [];
            let nextScene = null;
            let nextSceneSet = false; // 图函数分支内联时已显式设置 nextScene（跳入函数入口场景），末尾不再按 out_exec 覆盖
            let fnCallData = null; // function 节点 → 运行时函数调用数据
            let inputData = null;  // input 节点 → 运行时输入赋值数据

            // 函数入口（仅函数 ctx）：无消息，直接沿执行链继续；断链 → 隐式返回
            if (node.type === 'fn_entry') {
                const t = nextExecPin(ctx, node);
                const ns = t ? buildSceneIn(ctx, t) : null;
                scenes[sid] = { id: sid, messages, choices: null, nextScene: fallThrough(ctx, ns) };
                return sid;
            }

            // 处理当前节点
            if (node.type === 'chapter_begin') {
                // 章节开始 → 运行时章节卡消息（game.js playNextMessage 拦截后展示全屏章节横幅，
                // 试玩面板由 ptRenderMessage 渲染醒目章节卡；不再折叠成普通旁白）
                const cbTitle = S(node.data.chapterTitle) || '';
                const cbSub = S(node.data.chapterSubtitle) || '';
                chapterCardSeq += 1;
                messages.push({
                    type: 'chapter_card',
                    title: { zh: cbTitle, en: cbTitle, ja: cbTitle },
                    sub: { zh: cbSub, en: cbSub, ja: cbSub },
                    num: chapterCardSeq, // 按执行流到达顺序编号
                    ...(node.data.bgm && node.data.bgm.audioId ? { bgm: node.data.bgm } : {})
                });
            } else if (node.type === 'narration') {
                const msg = { type: 'narrator', text: { zh: S(node.data.text) || '', en: S(node.data.textEn) || '', ja: S(node.data.textJa) || '' } };
                // 附加音效数据
                if (node.data.sound && node.data.sound.audioId) {
                    msg.sound = node.data.sound;
                }
                messages.push(msg);
            } else if (node.type === 'illustration') {
                // 插图节点 → 运行时 illustration 消息（icon 支持 Emoji / ur-img 图片引用）
                const illMsg = {
                    type: 'illustration',
                    icon: node.data.icon || '🖼️',
                    size: node.data.size === 'medium' ? 'medium' : 'large',
                    caption: { zh: S(node.data.caption) || '', en: S(node.data.captionEn) || '', ja: S(node.data.captionJa) || '' }
                };
                if (node.data.sound && node.data.sound.audioId) illMsg.sound = node.data.sound;
                messages.push(illMsg);
            } else if (node.type === 'dialogue') {
                const charId = node.data.characterId || 'narrator';
                const char = design.characters[charId] || design.characters.narrator || {};
                // 关键：把角色的显示信息直接打包进消息，
                // 避免运行时 STORY.getCharacter() 找不到用户自定义角色而 fallback 到 "玩家"
                // 表情：按节点选的表情名查角色表情素材库（emoji 或 ur-img: 图片引用）
                const charMsg = {
                    type: 'character',
                    speaker: charId,
                    charName: char.name || '',
                    charColor: char.color || '#94a3b8',
                    charAvatar: resolveExpression(char, node.data.expression),
                    charAvatarFallback: char.icon || '👤',
                    text: { zh: S(node.data.text) || '', en: S(node.data.textEn) || '', ja: S(node.data.textJa) || '' }
                };
                // 附加音效数据
                if (node.data.sound && node.data.sound.audioId) {
                    charMsg.sound = node.data.sound;
                }
                messages.push(charMsg);
            }

            // 获取下一个执行节点
            if (node.type === 'choice') {
                node.data.choices.forEach((choice, i) => {
                    const outPin = node.outputs[i];
                    if (!outPin) return;
                    const conn = ctx.connections.find(c => c.fromPin === outPin.id);
                    const target = conn ? ctx.nodes.find(n => n.id === conn.toNode) : null;
                    const targetScene = target ? buildSceneIn(ctx, target) : null;
                    choices.push({
                        text: { zh: S(choice.text) || '', en: S(choice.textEn) || '', ja: S(choice.textJa) || '' },
                        nextScene: targetScene,
                        effects: { flag_choice: true },
                        tag: choice.tag || 'neutral',
                        // 条件选项（如 MBTI 判定/结局门槛）：运行时由 filterChoicesByCondition 过滤
                        ...(choice.condition ? { condition: JSON.parse(JSON.stringify(choice.condition)) } : {})
                    });
                });
            } else if (node.type === 'condition') {
                const d = node.data;
                const getVal = (type, variable, direct) => {
                    if (type === 'direct') return direct;
                    if (type === 'variable') return runtimeVariables[variable] !== undefined ? '(' + variable + ')' : 0;
                    return null; // pin 值在运行时解析
                };
                const rightVal = d.compareWith === 'pin' ? '📌' : (d.compareWith === 'variable' ? (d.rightVariable || '?') : (d.rightDirect ?? 0));
                const leftVal = d.leftType === 'variable' ? (d.leftVariable || '?') : (d.leftDirect ?? 0);
                const opStr = `${leftVal} ${d.operator || '>='} ${rightVal}`;

                const trueOut = node.outputs.find(o => o.key === 'out_true');
                const falseOut = node.outputs.find(o => o.key === 'out_false');
                const trueConn = trueOut ? ctx.connections.find(c => c.fromPin === trueOut.id) : null;
                const falseConn = falseOut ? ctx.connections.find(c => c.fromPin === falseOut.id) : null;
                const trueTarget = trueConn ? ctx.nodes.find(n => n.id === trueConn.toNode) : null;
                const falseTarget = falseConn ? ctx.nodes.find(n => n.id === falseConn.toNode) : null;

                // 条件节点显示判断式
                messages.push({ type: 'system', text: { zh: `[${I18N.t('designerConditionJudge')}: ${opStr}]`, en: `[If: ${opStr}]`, ja: `[分岐: ${opStr}]` } });

                // 选择：满足/不满足
                if (trueTarget || falseTarget) {
                    choices.push(
                        { text: { zh: I18N.t('designerCondSatisfied', { op: opStr }), en: `✅ Yes (${opStr})`, ja: `✅ はい (${opStr})` },
                          nextScene: trueTarget ? buildSceneIn(ctx, trueTarget) : null, tag: 'truth' },
                        { text: { zh: I18N.t('designerCondNotMet'), en: I18N.t('designerCondNo'), ja: I18N.t('designerCondNo') },
                          nextScene: falseTarget ? buildSceneIn(ctx, falseTarget) : null, tag: 'caution' }
                    );
                }
            } else if (node.type === 'set_variable') {
                // 变量运算节点：显示操作 + 执行运行时变更
                // 函数体内：操作数编译期未知（分支/参数）→ runtime 标记交运行时求值；
                // 主蓝图：保留编译期快照 newValue（供 HUD 即时更新）
                const v = design.variables[node.data.variableName] || {};
                const op = node.data.operation || 'add';
                const rawVal = node.data.operandValue ?? 10;
                const val = (typeof rawVal === 'string') ? S(rawVal) : rawVal;
                const opSymbols = { set: '=', add: '+', sub: '-', mul: '×', div: '÷' };
                const opNames = { set: I18N.t('designerOpSet') || '设为', add: I18N.t('designerOpAdd') || '增加', sub: I18N.t('designerOpSub') || '减少', mul: I18N.t('designerOpMul') || '乘以', div: I18N.t('designerOpDiv') || '除以' };
                const varName = v.name || node.data.variableName;
                messages.push({
                    type: 'system',
                    text: { zh: `🔢 ${varName} ${opSymbols[op] || op} ${val}`, en: `🔢 ${varName} ${opSymbols[op] || op} ${val}`, ja: `🔢 ${varName} ${opSymbols[op] || op} ${val}` },
                    varEffect: ctx.isFn
                        ? { variableName: node.data.variableName, operation: op, operandValue: val, runtime: true }
                        : { variableName: node.data.variableName, operation: op, operandValue: val }
                });
                // 执行运行时变量更新（仅主蓝图可编译期模拟；函数体有分支/参数，交运行时）
                if (!ctx.isFn && runtimeVariables[node.data.variableName] !== undefined) {
                    const current = runtimeVariables[node.data.variableName];
                    let newValue;
                    switch (op) {
                        case 'set': newValue = val; break;
                        case 'add': newValue = current + val; break;
                        case 'sub': newValue = current - val; break;
                        case 'mul': newValue = current * val; break;
                        case 'div': newValue = val !== 0 ? Math.floor(current / val) : current; break;
                    }
                    runtimeVariables[node.data.variableName] = newValue;
                    // 在 varEffect 中记录新值，供 HUD 更新使用
                    messages[messages.length - 1].varEffect.newValue = newValue;
                }

                nextScene = fallThrough(ctx, (() => {
                    const t = nextExecPin(ctx, node);
                    return t ? buildSceneIn(ctx, t) : null;
                })());
            } else if (node.type === 'function') {
                // 函数调用节点：图函数 → 整张子蓝图按调用点内联为场景副本；
                // 旧式 JS 函数 → 编译期快照 + 运行时求值（fnCall 下发）
                const fnDef = (design.functions || {})[node.data.fnId];
                const params = (fnDef && fnDef.params) || [];
                const argRefs = {};
                params.forEach(p => {
                    const a = (node.data.args || {})[p] || { t: 'var', v: p };
                    let ref = { t: a.t === 'direct' ? 'direct' : 'var', v: a.v };
                    // 函数体内的嵌套调用：实参引用外层参数 → 编译期改写（direct 传值 / var 换成实参变量名）
                    if (ctx.paramMap && Object.prototype.hasOwnProperty.call(ctx.paramMap, ref.v)) {
                        const outer = ctx.paramMap[ref.v];
                        ref = (outer && outer.t === 'direct') ? { t: 'direct', v: outer.v } : { t: 'var', v: outer.v };
                    }
                    argRefs[p] = ref;
                });
                const argStr = params.map(p => argRefs[p].t === 'var' ? argRefs[p].v : String(argRefs[p].v)).join(', ');
                const fnLabel = (fnDef && fnDef.name) || node.data.fnId;
                if (fnDef && Array.isArray(fnDef.nodes) && !isLegacyFn(fnDef)) {
                    // ── 图函数（子蓝图）：调用点消息 ƒ name(args)；续接场景先编译（fn_return 需要 returnSid）；
                    //    函数体每个调用点得到独立场景副本（参数/输出绑定已在编译期烘焙）──
                    const fnText = `ƒ ${fnLabel}(${argStr})`;
                    messages.push({ type: 'system', text: { zh: fnText, en: fnText, ja: fnText } });
                    // 输出绑定推导：输出引脚（out_<名>）连线到「设置变量」节点 → 写入其目标变量（连线优先）；
                    // 否则用属性面板 resultVars 下拉绑定
                    const wired = {};
                    (node.outputs || []).forEach(pin => {
                        if (!pin.key || String(pin.key).indexOf('out_') !== 0) return;
                        const outName = String(pin.key).slice(4);
                        const wire = ctx.connections.find(c => c.fromPin === pin.id);
                        const sink = wire ? ctx.nodes.find(n => n.id === wire.toNode) : null;
                        if (sink && sink.type === 'set_variable' && sink.data.variableName) wired[outName] = sink.data.variableName;
                    });
                    const resultVars = Object.assign({}, wired, node.data.resultVars || {});
                    const rvKeys = Object.keys(resultVars);
                    // 续接场景（调用节点的下一个执行节点）
                    const contTarget = nextExecPin(ctx, node);
                    const contSid = contTarget ? buildSceneIn(ctx, contTarget) : null;
                    const hasOutputs = Array.isArray(fnDef.outputs) && fnDef.outputs.length > 0;
                    const retNodeL = fnDef.nodes.find(n => n.type === 'fn_return');
                    const legacyExpr = (retNodeL && retNodeL.data) ? String(retNodeL.data.value || '').trim() : '';
                    if (fnInlineStack.indexOf(node.data.fnId) >= 0) {
                        // 递归调用（直接/间接自我调用）→ 跳过函数体，避免场景无限展开
                        const recText = `ƒ ⚠ ${fnLabel} ↻`;
                        messages.push({ type: 'system', text: { zh: recText, en: recText, ja: recText } });
                        nextScene = contSid;
                    } else {
                        const paramMap = {};
                        params.forEach(p => { paramMap[p] = argRefs[p]; });
                        const fnCtx = {
                            nodes: fnDef.nodes,
                            connections: fnDef.connections || [],
                            nodeToScene: {},
                            paramMap: paramMap,
                            returnSid: contSid,
                            resultVars: resultVars,
                            fnOutputs: hasOutputs ? fnDef.outputs.slice() : [],
                            isFn: true
                        };
                        fnInlineStack.push(node.data.fnId);
                        const entry = fnDef.nodes.find(n => n.id === fnDef.startNode) || fnDef.nodes.find(n => n.type === 'fn_entry');
                        const entrySid = entry ? buildSceneIn(fnCtx, entry) : null;
                        fnInlineStack.pop();
                        nextScene = entrySid || contSid;
                        nextSceneSet = true;
                    }
                    // 旧版返回值表达式（无输出绑定的历史数据）：保留调用点 fnCall，进入场景时求值
                    if (!hasOutputs && legacyExpr) {
                        fnCallData = {
                            fnId: node.data.fnId,
                            args: JSON.parse(JSON.stringify(argRefs)),
                            resultVar: rvKeys.length ? resultVars[rvKeys[0]] : (node.data.resultVar || ''),
                            resultVars: JSON.parse(JSON.stringify(resultVars)),
                            returnValue: legacyExpr
                        };
                    }
                } else if (fnDef) {
                    // ── 旧式 JS 函数：编译期同步快照（供后续条件编译参考） ──
                    let fnOk = true;
                    try {
                        const argVals = params.map(p => argRefs[p].t === 'var' ? (runtimeVariables[argRefs[p].v] ?? 0) : argRefs[p].v);
                        const result = buildUserFn(fnDef).apply(null, argVals);
                        const returns = fnDef.returns || [];
                        const resultVars = node.data.resultVars || {};
                        if (returns.length === 1) {
                            runtimeVariables[resultVars[returns[0]] || returns[0]] = result;
                        } else if (returns.length > 1 && result && typeof result === 'object') {
                            returns.forEach(rk => { runtimeVariables[resultVars[rk] || rk] = result ? result[rk] : undefined; });
                        }
                    } catch (err) {
                        fnOk = false;
                        console.warn('[DESIGNER] fnCall compile error:', err.message);
                    }
                    const fnText = `ƒ ${fnLabel}(${argStr})` + (fnOk ? '' : ' ⚠');
                    messages.push({ type: 'system', text: { zh: fnText, en: fnText, ja: fnText } });
                    // 运行时数据：args 保留变量引用（{t:'var',v}），由 game.js 在运行时求值
                    fnCallData = {
                        fnId: node.data.fnId,
                        args: JSON.parse(JSON.stringify(argRefs)),
                        resultVars: JSON.parse(JSON.stringify(node.data.resultVars || {}))
                    };
                } else {
                    const fnText = `ƒ ⚠ ${node.data.fnId || '?'}`;
                    messages.push({ type: 'system', text: { zh: fnText, en: fnText, ja: fnText } });
                }
                if (!nextSceneSet) {
                    nextScene = fallThrough(ctx, (() => {
                        const t = nextExecPin(ctx, node);
                        return t ? buildSceneIn(ctx, t) : null;
                    })());
                }
            } else if (node.type === 'input') {
                // 输入节点：运行时输入框（结果写入变量）
                // 提示语交给输入界面渲染（game.js showSceneInput / 试玩 ptShowInput），
                // 不再额外塞一条旁白消息，否则同一句提示会显示两遍。
                const pText = {
                    zh: S(node.data.prompt) || '',
                    en: S(node.data.promptEn || node.data.prompt) || '',
                    ja: S(node.data.promptJa || node.data.prompt) || ''
                };
                inputData = {
                    variable: node.data.variable || 'player_name',
                    inputType: node.data.inputType === 'number' ? 'number' : 'text',
                    prompt: pText
                };
                nextScene = fallThrough(ctx, (() => {
                    const t = nextExecPin(ctx, node);
                    return t ? buildSceneIn(ctx, t) : null;
                })());
            } else if (node.type === 'end_game' || node.type === 'end_chapter') {
                // 结局/章节结束（函数体内亦可）：直接结束，忽略 returnSid
                scenes[sid] = {
                    id: sid,
                    messages,
                    isEnding: true,
                    endingId: 'bp_' + node.id,
                    endingTitleKey: S(node.data.endingTitle || node.data.chapterTitle) || '结局',
                    endingDescKey: S(node.data.endingDesc) || '',
                    endingIcon: node.data.endingIcon || '🌟', // 结局图标（emoji 或 ur-img: 图片引用）
                    endingType: node.data.endingType || 'good'
                };
                return sid;
            } else if (node.type === 'fn_return') {
                // 函数返回（仅函数 ctx）：fnOut 效果消息 —— 播放到此消息时才把输出写入目标变量
                // （相比旧模型「进入调用场景即取值」，时序正确：函数体内的变量运算已生效）
                const vals = (node.data && node.data.values) || {};
                const writes = [];
                (ctx.fnOutputs || []).forEach(out => {
                    if (!out) return;
                    const srcKey = vals[out] || out;
                    const target = (ctx.resultVars || {})[out] || out;
                    if (ctx.paramMap && Object.prototype.hasOwnProperty.call(ctx.paramMap, srcKey)) {
                        const a = ctx.paramMap[srcKey];
                        if (a && a.t === 'direct') writes.push({ target: target, const: a.v ?? 0 });
                        else writes.push({ target: target, src: a ? a.v : srcKey });
                    } else {
                        writes.push({ target: target, src: srcKey });
                    }
                });
                if (writes.length) {
                    const retText = 'ƒ ⏎ ' + writes.map(w => w.target).join(', ');
                    messages.push({ type: 'system', text: { zh: retText, en: retText, ja: retText }, fnOut: { writes: writes } });
                }
                nextScene = ctx.returnSid || null;
            } else {
                nextScene = fallThrough(ctx, (() => {
                    const t = nextExecPin(ctx, node);
                    return t ? buildSceneIn(ctx, t) : null;
                })());
            }

            const sceneObj = {
                id: sid,
                messages,
                choices: choices.length > 0 ? choices : null,
                nextScene: nextScene || null
            };
            if (fnCallData) sceneObj.fnCall = fnCallData;
            if (inputData) sceneObj.input = inputData;
            scenes[sid] = sceneObj;
            return sid;
        }

        // 收集需要在 HUD 中显示的变量 + 变量显示名映射（运行时把文本里的 {显示名} 解析成变量键）
        const hudVariables = [];
        const varNames = {};
        Object.entries(design.variables || {}).forEach(([key, v]) => {
            const nm = { name: v.name || key, en: v.nameEn || v.name || key, ja: v.nameJa || v.name || key };
            varNames[key] = nm;
            if (v.showOnHud !== false) { // 默认开启
                hudVariables.push({
                    key,
                    name: nm.name,
                    nameEn: nm.en,
                    nameJa: nm.ja,
                    type: v.type || 'number',
                    defaultValue: v.defaultValue ?? 0
                });
            }
        });

        // 主 ctx：design 顶层的节点/连线表（函数子蓝图在 function 节点分支内按调用点建立独立 ctx）
        const mainCtx = {
            nodes: design.nodes,
            connections: design.connections,
            nodeToScene: nodeToScene,
            paramMap: null,
            isFn: false
        };
        const startScene = buildSceneIn(mainCtx, startNode);

        // 场景 → 蓝图节点 映射（试玩调试模式用：运行到某场景时点亮对应节点）
        const __sceneToNode = {};
        Object.entries(nodeToScene).forEach(([nodeId, sid]) => { __sceneToNode[sid] = nodeId; });

        // 提取章节BGM（从第一个 chapter_begin 节点）
        let chapterBgm = null;
        const chapterBeginNode = design.nodes.find(n => n.type === 'chapter_begin');
        if (chapterBeginNode && chapterBeginNode.data.bgm && chapterBeginNode.data.bgm.audioId) {
            chapterBgm = chapterBeginNode.data.bgm;
        }

        // 提取全局BGM
        const globalBgm = (design.music && design.music.globalBgm && design.music.globalBgm.audioId)
            ? design.music.globalBgm : null;

        return {
            id: chId,
            titleKey: 'customStory',
            subtitleKey: 'customStory',
            narrator: { zh: design.title || '', en: design.title || '', ja: design.title || '' },
            storyIcon: design.storyIcon || '✨', // 故事图标（emoji 或 ur-img: 图片引用）
            themeColor: design.themeColor || '', // 自定义主题色（空 = 游戏内用默认强调色）
            storyDescription: design.description || '', // 故事梗概（试玩/结局界面展示）
            scenes,
            startScene: startScene,
            functions: runtimeFunctions(design), // 运行时函数定义（图函数已编译为消息+返回值表达式；game.js executeFnCall 使用）
            hudVariables, // 游戏运行时显示在界面上的变量列表
            varNames,     // 变量键 → 显示名（name/en/ja），运行时用于 {显示名} 插值
            runtimeInitialValues: { ...runtimeVariables }, // 初始值快照
            globalBgm: globalBgm,  // 自定义故事全局BGM
            chapterBgm: chapterBgm,  // 章节BGM
            __sceneToNode // 场景id → 节点id（试玩调试高亮用，运行时忽略）
        };
    }

    // ==================== 工具函数 ====================
    function getText(zh, en, ja) {
        const lang = I18N ? I18N.getLanguage() : 'zh';
        if (lang === 'en') return en || zh;
        if (lang === 'ja') return ja || zh;
        return zh;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    return {
        open,
        close,
        playDesign,
        playExistingDesign,
        startPlaytest,
        stopPlaytest,
        save,
        normalizeDesign,
        serializeDesign,
        compileBlueprint,
        communityInfo: () => _community // 调试/测试：当前协作上下文（null = 非协作模式）
    };
})();
