/**
 * 无心之举 — 局域网故事社区（客户端 v2）
 * 全局变量 COMMUNITY。依赖：I18N / SAVE / DESIGNER / GAME（同页全局），IMGDB 可选。
 *
 * 服务器：server/community.js（零依赖 Node 脚本）
 *   node server/community.js   →  http://<局域网IP>:8787
 *
 * 能力：
 *   - 首页（主菜单）直接进入社区；界面与「选择故事」一致（卡片网格渲染进 #messages）
 *   - 自动识别服务器：页面由社区服务器提供 → 同源；否则用 localStorage 记住的手动地址
 *   - 身份：昵称 + 头像（emoji 预设 或 上传图片，存 localStorage）
 *   - 浏览所有公开故事 + 团队故事（🔒 需密码或申请加入）
 *   - 故事详情：下载 JSON / 存到本地 / 协作编辑 / 打赏世界之种 / 评论区 / 团队聊天室
 *   - 管理员面板：可见性（公开 ⇄ 团队）、团队密码、成员与编辑权限、加入申请审批
 *   - SSE 实时刷新：评论/聊天/打赏/申请/成员/设置/保存/删除
 *
 * 设计器协作约定（与 js/designer.js 对接）：
 *   - DESIGNER.open(design, { id, version })  第二参为协作上下文 → 进入协作模式
 *   - 设计器 save() → COMMUNITY.pushDesign(serialize, community)（409 冲突时提示）
 *   - COMMUNITY.onRemoteChange(fn)  设计器注册远程变更回调
 */
const COMMUNITY = (function () {

    const LS_SERVER = 'ur-community-server';
    const LS_NAME = 'ur-community-name';
    const LS_AVATAR = 'ur-community-avatar';
    const LS_UID = 'ur-community-uid';           // 稳定身份标识（改名也不变）
    const LS_ALIASES = 'ur-community-aliases';   // 用过的历史昵称（用于认领旧数据）
    const LS_CLAIMS = 'ur-community-claims';     // 我分享过的故事的认领码 { [storyId]: token }
    const AVATAR_PRESETS = ['🙂', '😎', '🤠', '👽', '🤖', '🐱', '🦊', '🐼', '🦄', '👻', '🎭', '🌙', '🔥', '🍀', '🎧', '📚'];

    let _server = '';
    let _serverName = '';
    let _serverInfo = null;
    let _es = null;
    let _connected = false;
    let _remoteHandlers = [];
    let _view = null;        // null | { story: id }
    let _detail = null;      // 当前详情数据
    let _filter = 'all';     // all | public | team | mine
    let _metaCache = {};     // id → 故事元信息快照（判断 owner 用）
    let _wallet = null;      // 我的世界之种钱包（服务器账户，社区内权威余额）
    let _chatOverlay = null; // 协作聊天浮窗 { id, el }

    // ══════════════ 身份 ══════════════
    function getName() {
        try {
            let n = localStorage.getItem(LS_NAME);
            if (!n) {
                const tpl = (I18N && I18N.t) ? I18N.t('communityDefaultName') : '故事作者{n}';
                n = (tpl || '故事作者{n}').replace('{n}', String(1000 + Math.floor(Math.random() * 9000)));
                localStorage.setItem(LS_NAME, n);
            }
            return n;
        } catch (e) { return '用户'; }
    }
    // 稳定身份：只在首次生成一次，之后改昵称也不变 → 管理员身份 / 钱包 / 团队成员都跟着人走
    function getUid() {
        try {
            let u = localStorage.getItem(LS_UID);
            if (!u) { u = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem(LS_UID, u); }
            return u;
        } catch (e) { return 'u_local'; }
    }
    // 历史昵称列表：改名时把旧名记下来，进社区时一起上报 → 服务器把这些名字下的旧数据认领给当前 uid
    function getAliases() {
        try {
            const a = JSON.parse(localStorage.getItem(LS_ALIASES) || '[]');
            return Array.isArray(a) ? a.filter(x => typeof x === 'string' && x) : [];
        } catch (e) { return []; }
    }
    function rememberAlias(n) {
        n = String(n || '').trim().slice(0, 20);
        if (!n) return;
        try {
            const a = getAliases();
            if (a.indexOf(n) < 0) { a.push(n); localStorage.setItem(LS_ALIASES, JSON.stringify(a.slice(-12))); }
        } catch (e) {}
    }
    // 每次改名：先记住旧昵称，再写入新昵称并记住它
    function setName(n) {
        const next = (n || '').trim().slice(0, 20);
        if (!next) return;
        let prev = '';
        try { prev = localStorage.getItem(LS_NAME) || ''; } catch (e) {}
        if (prev && prev !== next) rememberAlias(prev);
        try { localStorage.setItem(LS_NAME, next); } catch (e) {}
        rememberAlias(next);
    }
    function getAvatar() { try { return localStorage.getItem(LS_AVATAR) || '🙂'; } catch (e) { return '🙂'; } }
    function setAvatar(a) { try { localStorage.setItem(LS_AVATAR, a || '🙂'); } catch (e) {} }
    function identityReady() { try { return !!localStorage.getItem(LS_NAME); } catch (e) { return true; } }
    // 身份三件套：所有 API 调用都带上，服务器据此判定归属 / 权限 / 钱包
    function ident() { return { uid: getUid(), nick: getName(), aliases: getAliases() }; }
    // 认领码：分享时服务器下发，存在本机。换设备/改名后凭它证明「这是我发的」
    function getClaims() {
        try {
            const o = JSON.parse(localStorage.getItem(LS_CLAIMS) || '{}');
            return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
        } catch (e) { return {}; }
    }
    function rememberClaim(id, token) {
        if (!id || !token) return;
        try {
            const o = getClaims();
            o[id] = token;
            localStorage.setItem(LS_CLAIMS, JSON.stringify(o));
        } catch (e) {}
    }
    // 手抄的认领码（从服务器那台机器上抄过来 / 别人转交），不带故事 id 也能认领
    function rememberClaimCode(code) {
        code = String(code || '').trim().toUpperCase().slice(0, 16);
        if (!code) return;
        try {
            const o = getClaims();
            o['manual_' + code] = code;
            localStorage.setItem(LS_CLAIMS, JSON.stringify(o));
        } catch (e) {}
    }
    // 本地保存的、由我分享出去的作品（design.communityId）。认领旧作品的凭据之一
    function mineIds() {
        const out = [];
        try {
            if (typeof SAVE !== 'undefined' && SAVE.getDesigns) {
                SAVE.getDesigns().forEach(d => { if (d && d.communityId) out.push(d.communityId); });
            }
        } catch (e) {}
        return out;
    }

    // ══════════════ 连接 ══════════════
    function isConnected() { return _connected; }
    function getServer() { return _server; }
    function getServerName() { return _serverName; }
    // 断开连接（换服务器 / 重新搜索）
    function disconnect() {
        stopSSE();
        _connected = false; _server = ''; _serverName = ''; _serverInfo = null;
        _wallet = null;
        closeChatOverlay();
    }

    async function connect(base, silent) {
        base = (base || '').trim().replace(/\/+$/, '');
        if (base && !/^https?:\/\//i.test(base)) base = 'http://' + base;   // 手动输入 192.168.1.5:8787 也能用
        if (!base) return false;
        try {
            const r = await fetch(base + '/api/info', { method: 'GET', cache: 'no-store' });
            const j = await r.json();
            if (!r.ok || !j.ok) throw new Error('bad');
            _server = base; _serverName = j.name || ''; _connected = true; _serverInfo = j;
            try { localStorage.setItem(LS_SERVER, base); } catch (e) {}
            if (j.port) setPort(j.port);                                     // 记住端口，下次扫描直接用
            if (j.unified) { try { localStorage.setItem(LS_UNIFIED, j.unified); } catch (e) {} }
            startSSE();
            getMe(); // 同步「我的世界之种」钱包（服务器账户为社区内的权威余额）
            if (!silent) toast('🌐 ' + (j.name || base));
            return true;
        } catch (e) {
            _server = ''; _serverName = ''; _connected = false; _serverInfo = null; stopSSE();
            if (!silent) toast('⚠ ' + I18N.t('communityConnectFail'));
            return false;
        }
    }
    // 快速自动连接：同源 → 上次用过的地址 → 统一地址 → 本机。不做网段扫描（扫描由社区面板驱动）
    async function autoConnect() {
        const found = await discover({ quickOnly: true });
        if (found.length) return connect(found[0].url, true);
        return false;
    }

    // ══════════════ 局域网自动发现 ══════════════
    // 目标：不用手填 IP。先试「同一个地址」（服务器用 mDNS 广播的 http://wuxin.local:8787），
    // 再探测本机与上次用过的地址，最后按常见网段并发扫描（可取消、可加深）。
    const DEFAULT_PORT = 8787;
    const DEFAULT_MDNS = 'wuxin.local';
    const LS_PORT = 'ur-community-port';
    const LS_UNIFIED = 'ur-community-unified';
    // 常见家用/热点网段（覆盖面从高到低）
    const SWEEP_PREFIXES = [
        '192.168.1', '192.168.0', '192.168.2', '192.168.3', '192.168.4',
        '192.168.31', '192.168.50', '192.168.43', '192.168.137', '192.168.8',
        '192.168.100', '10.0.0', '10.0.1', '172.20.10'
    ];
    const QUICK_PREFIX_COUNT = 5;    // 默认只扫最可能的几个网段（够用且快）
    const PROBE_TIMEOUT = 700;       // 单个地址探测超时（局域网内 700ms 足够）
    const SWEEP_CONCURRENCY = 48;    // 并发探测数
    const MAX_FOUND = 3;             // 找到这么多个就提前收工

    let _scanHandle = null;
    let _deepScan = false;
    let _scannedOnce = false;        // 本次会话是否已自动扫过一遍（避免每次回首页都重扫）
    let _autoConnecting = false;

    function getPort() {
        try { return parseInt(localStorage.getItem(LS_PORT), 10) || DEFAULT_PORT; }
        catch (e) { return DEFAULT_PORT; }
    }
    function setPort(p) { try { if (p) localStorage.setItem(LS_PORT, String(p)); } catch (e) {} }
    // 统一地址用的主机名：优先用上次服务器上报的（管理员可能改过 MDNS_NAME）
    function mdnsHost() {
        try {
            const u = localStorage.getItem(LS_UNIFIED) || '';
            const m = u.match(/^https?:\/\/([^:\/]+)/);
            if (m && m[1]) return m[1];
        } catch (e) {}
        return DEFAULT_MDNS;
    }
    function unifiedUrl() { return 'http://' + mdnsHost() + ':' + getPort(); }
    function getServerInfo() { return _serverInfo; }
    function isMdnsName(u) { try { return /\.local$/i.test(new URL(u).hostname); } catch (e) { return false; } }

    // 探测一个地址：命中返回服务器信息，否则 null
    function probeOnce(base, timeoutMs) {
        return new Promise((resolve) => {
            let settled = false;
            const ctrl = new AbortController();
            const handle = _scanHandle;
            const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} settle(null); }, timeoutMs);
            const onGlobal = () => { try { ctrl.abort(); } catch (e) {} settle(null); };
            function settle(v) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (handle) handle.ctrl.signal.removeEventListener('abort', onGlobal);
                resolve(v);
            }
            if (handle) handle.ctrl.signal.addEventListener('abort', onGlobal, { once: true });
            fetch(base.replace(/\/+$/, '') + '/api/info', { signal: ctrl.signal, cache: 'no-store' })
                .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
                .then(j => {
                    if (!j || !j.ok) return settle(null);
                    settle({
                        url: base.replace(/\/+$/, ''),
                        name: j.name || '', port: j.port || 0,
                        host: j.host || '', unified: j.unified || '',
                        stories: j.stories || 0, mdns: !!j.mdns,
                        service: j.service || ''
                    });
                })
                .catch(() => settle(null));
        });
    }

    // 扫描网段：优先「当前页面所在网段」（若页面就是从某台机器提供的）
    function sweepPrefixes() {
        const out = [];
        const push = (p) => { if (p && out.indexOf(p) < 0) out.push(p); };
        const hn = location.hostname;
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hn) && !hn.startsWith('127.')) push(hn.split('.').slice(0, 3).join('.'));
        SWEEP_PREFIXES.forEach(push);
        return out;
    }

    // ── 本机局域网 IP（WebRTC 主机候选）─────────────────────
    // 手机/平板上页面是 file:// 或 App WebView，location.hostname 拿不到网段，
    // 只能靠 WebRTC 的 host candidate 反查本机 IP，再据此扫自己所在 /24。
    let _localIps = null;
    function localIps() {
        return new Promise((resolve) => {
            if (_localIps) return resolve(_localIps);
            let settled = false;
            const ips = [];
            const finish = () => {
                if (settled) return;
                settled = true;
                _localIps = ips;
                resolve(ips);
            };
            try {
                const PC = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
                if (!PC) return finish();
                const pc = new PC({ iceServers: [] });
                try { pc.createDataChannel('ip'); } catch (e) {}
                pc.onicecandidate = (ev) => {
                    const c = ev && ev.candidate && ev.candidate.candidate;
                    if (!c) return;
                    const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(c);
                    if (!m) return;
                    const ip = m[1];
                    if (ip === '0.0.0.0' || ip.indexOf('127.') === 0) return;
                    if (ips.indexOf(ip) < 0) ips.push(ip);
                };
                setTimeout(() => { try { pc.close(); } catch (e) {} finish(); }, 1200);
                try {
                    pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => {});
                } catch (e) { finish(); }
            } catch (e) { finish(); }
        });
    }
    // 要扫的网段顺序：本机网段 → 上次连过的服务器网段 → 页面网段 → 常见网段
    async function subnetsToScan() {
        const out = [];
        // 环回网段不在扫描范围（阶段 1 已经试过；扫 127.0.0.x 只会命中自己）
        const push = (p) => { if (p && p.indexOf('127.') !== 0 && out.indexOf(p) < 0) out.push(p); };
        const ips = await localIps();
        ips.forEach(ip => push(ip.split('.').slice(0, 3).join('.')));
        try {
            const saved = localStorage.getItem(LS_SERVER) || '';
            const m = /^https?:\/\/(\d+\.\d+\.\d+)\./.exec(saved);
            if (m) push(m[1]);
        } catch (e) {}
        sweepPrefixes().forEach(push);
        return out;
    }

    // 并发池
    async function runPool(items, worker, concurrency, handle) {
        let idx = 0;
        const runners = [];
        for (let k = 0; k < concurrency; k++) {
            runners.push((async () => {
                for (;;) {
                    if (handle.cancelled || handle.done) return;
                    const i = idx++;
                    if (i >= items.length) return;
                    await worker(items[i]);
                }
            })());
        }
        await Promise.all(runners);
    }

    function cancelDiscovery() {
        if (_scanHandle) {
            _scanHandle.cancelled = true;
            try { _scanHandle.ctrl.abort(); } catch (e) {}
            _scanHandle = null;
        }
    }

    /**
     * 自动发现社区服务器。
     * opts: { quickOnly, skipQuick, deep, maxFound,
     *         onFound(info, handle), onProgress(handle), onPhase(name, handle) }
     * 返回找到的服务器数组。同一台服务器即使有多个地址（127.0.0.1 / localhost / wuxin.local /
     * 局域网 IP）也只算一个 —— 按服务器自报的 host:port 去重。
     */
    async function discover(opts) {
        opts = opts || {};
        cancelDiscovery();
        const maxFound = opts.maxFound || MAX_FOUND;
        const handle = { cancelled: false, done: false, ctrl: new AbortController(), scanned: 0, total: 0, found: [], phase: 'quick' };
        _scanHandle = handle;
        const seen = {};
        const fire = (fn, a, b) => { try { if (fn) fn(a, b); } catch (e) {} };
        // 服务器身份（host:port）优先；拿不到就退回 URL
        function keyOf(info) { return (info.host && info.port) ? ('ip:' + info.host + ':' + info.port) : ('url:' + info.url); }
        function add(info) {
            if (!info) return;
            const k = keyOf(info);
            if (seen[k]) return;
            seen[k] = 1;
            seen['url:' + info.url] = 1;
            handle.found.push(info);
            fire(opts.onFound, info, handle);
        }
        function step() {
            handle.scanned++;
            if (handle.scanned % 8 === 0) fire(opts.onProgress, handle);
        }
        const enough = () => { if (handle.found.length >= maxFound) handle.done = true; };

        // ── 阶段 1：快速候选（几乎瞬时）──
        if (opts.skipQuick) {
            handle.total = 0;
        } else {
            fire(opts.onPhase, 'quick', handle);
            const quick = [];
            if (/^https?:$/.test(location.protocol) && location.origin && location.origin !== 'null') quick.push(location.origin);
            let saved = '';
            try { saved = localStorage.getItem(LS_SERVER) || ''; } catch (e) {}
            if (saved) quick.push(saved.replace(/\/+$/, ''));
            quick.push(unifiedUrl());
            quick.push('http://127.0.0.1:' + getPort());
            quick.push('http://localhost:' + getPort());
            const uniqQuick = quick.filter((u, i) => u && quick.indexOf(u) === i);
            handle.total = uniqQuick.length;
            await runPool(uniqQuick, async (u) => {
                const info = await probeOnce(u, PROBE_TIMEOUT);
                step();
                if (info) add(info);
            }, 8, handle);
            fire(opts.onProgress, handle);
        }
        if (handle.cancelled || handle.done || opts.quickOnly) {
            handle.done = true;
            if (_scanHandle === handle) _scanHandle = null;
            return handle.found;
        }

        // ── 阶段 2：网段扫描（本机网段优先；手机/平板靠 WebRTC 反查）──
        fire(opts.onPhase, 'sweep', handle);
        const allPrefixes = await subnetsToScan();
        const limit = (opts.deep || _deepScan) ? allPrefixes.length : Math.min(QUICK_PREFIX_COUNT, allPrefixes.length);
        async function sweepRange(list) {
            const hosts = [];
            list.forEach(p => {
                for (let i = 1; i <= 254; i++) {
                    const u = 'http://' + p + '.' + i + ':' + getPort();
                    if (!seen['url:' + u]) hosts.push(u);
                }
            });
            if (!hosts.length) return;
            handle.total = handle.scanned + hosts.length;
            fire(opts.onProgress, handle);
            await runPool(hosts, async (u) => {
                const info = await probeOnce(u, PROBE_TIMEOUT);
                step();
                if (info) { add(info); enough(); }
            }, SWEEP_CONCURRENCY, handle);
        }
        await sweepRange(allPrefixes.slice(0, limit));
        // 默认只扫最可能的几个网段；一个都没找到就自动扩展剩余网段（不用手动点深度扫描）
        if (!handle.cancelled && !handle.done && !handle.found.length && allPrefixes.length > limit) {
            fire(opts.onPhase, 'deep', handle);
            await sweepRange(allPrefixes.slice(limit));
        }

        handle.done = true;
        fire(opts.onProgress, handle);
        if (_scanHandle === handle) _scanHandle = null;
        return handle.found;
    }

    function isScanning() { return !!(_scanHandle && !_scanHandle.cancelled && !_scanHandle.done); }
    function getScan() { return _scanHandle; }
    function setDeepScan(v) { _deepScan = !!v; }
    function getDeepScan() { return _deepScan; }
    function startSSE() {
        stopSSE();
        if (!_server || typeof EventSource === 'undefined') return;
        try {
            _es = new EventSource(_server + '/api/events');
            _es.addEventListener('story', (ev) => {
                let d = null;
                try { d = JSON.parse(ev.data); } catch (e) { return; }
                _remoteHandlers.forEach(fn => { try { fn(d); } catch (e) { console.error(e); } });
                onRemoteEvent(d);
            });
            _es.onerror = () => {};
        } catch (e) { console.error('[COMMUNITY] SSE 启动失败', e); }
    }
    function stopSSE() { if (_es) { try { _es.close(); } catch (e) {} _es = null; } }
    function onRemoteChange(fn) { if (typeof fn === 'function') _remoteHandlers.push(fn); }

    // 收到广播：正在看该故事 → 刷新；否则轻提示
    function onRemoteEvent(d) {
        if (!d || !d.id) return;
        // 协作聊天浮窗（设计器里）也跟着实时刷新
        if (_chatOverlay && _chatOverlay.id === d.id &&
            ['chat', 'tip', 'member', 'request', 'settings', 'save', 'join'].indexOf(d.action) >= 0) {
            refreshChatOverlay();
        }
        // 打赏广播 → 重新拉一次钱包（打赏者是我就扣钱，被赏者是我则进账）
        if (d.action === 'tip') { getMe(); }
        const viewing = _view && _view.story === d.id;
        if (viewing && ['comment', 'chat', 'tip', 'member', 'request', 'settings', 'save'].indexOf(d.action) >= 0) {
            refreshDetail(true);
            return;
        }
        if (d.action === 'delete' && viewing) {
            toast('⚠ ' + I18N.t('communityDeleted'));
            showHome();
            return;
        }
        const meta = _metaCache[d.id];
        if (d.action === 'request' && meta && (meta.mine || meta.owner === getUid()) && d.by !== getName()) {
            toast('📨 ' + d.by + ' ' + (I18N.t('communityAppliedTip') || '申请加入你的团队'));
        }
    }

    // ══════════════ API ══════════════
    async function api(path, opts) {
        if (!_server) throw new Error(I18N.t('communityNeedServer'));
        const res = await fetch(_server + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
        let j = null;
        try { j = await res.json(); } catch (e) {}
        return { status: res.status, data: j || {} };
    }
    // GET 请求的身份查询串：uid（身份）+ nick（显示名）+ aliases（曾用昵称）
    // + mine（本地作品清单）+ claims（认领码）→ 后两项是认领旧作品的凭据
    function identQuery() {
        const i = ident();
        return 'uid=' + encodeURIComponent(i.uid) + '&nick=' + encodeURIComponent(i.nick)
            + '&aliases=' + encodeURIComponent(JSON.stringify(i.aliases))
            + '&mine=' + encodeURIComponent(JSON.stringify(mineIds()))
            + '&claims=' + encodeURIComponent(JSON.stringify(getClaims()));
    }
    async function listStories() {
        const r = await api('/api/stories?' + identQuery());
        if (r.status !== 200 || !r.data.ok) return [];
        const list = r.data.stories || [];
        list.forEach(s => { _metaCache[s.id] = s; });
        return list;
    }
    async function fetchStory(id) {
        const r = await api('/api/stories/' + encodeURIComponent(id) + '?' + identQuery());
        if (r.data && r.data.story) _metaCache[id] = r.data.story;
        return r.data || {}; // {ok, story, design, comments, chat, tips, requests, myRole, isMember, canEdit, wallet} | {ok:false,error:'locked',story}
    }
    async function shareDesign(design, opts) {
        opts = opts || {};
        const r = await api('/api/stories', {
            method: 'POST',
            body: JSON.stringify(Object.assign(ident(), {
                author: getName(), avatar: getAvatar(), design,
                visibility: opts.visibility || (opts.mode === 'private' ? 'team' : 'public'),
                mode: opts.mode || (opts.visibility === 'team' ? 'private' : 'open'),
                password: opts.password || ''
            }))
        });
        if (r.status === 200 && r.data.ok) {
            if (r.data.claimToken) rememberClaim(r.data.id, r.data.claimToken);
            return { id: r.data.id, version: r.data.version, claimToken: r.data.claimToken };
        }
        return null;
    }
    async function pushDesign(design, community) {
        try {
            const r = await api('/api/stories/' + encodeURIComponent(community.id), {
                method: 'PUT',
                body: JSON.stringify(Object.assign(ident(), { author: getName(), design, baseVersion: community.version || 0 }))
            });
            if (r.status === 200 && r.data.ok) { community.version = r.data.version; return { ok: true, version: r.data.version }; }
            if (r.status === 409) return { ok: false, conflict: true, version: r.data.version || 0, by: r.data.by || '' };
            if (r.status === 403) return { ok: false, denied: true };
            return { ok: false, error: r.data.error || ('http ' + r.status) };
        } catch (e) { return { ok: false, error: e.message }; }
    }
    async function deleteStory(id) {
        const r = await api('/api/stories/' + encodeURIComponent(id) + '?' + identQuery(), { method: 'DELETE' });
        return r.status === 200 && !!r.data.ok;
    }
    async function joinStory(id) {
        await api('/api/stories/' + encodeURIComponent(id) + '/join', { method: 'POST', body: JSON.stringify(Object.assign(ident(), { name: getName(), avatar: getAvatar() })) });
    }
    async function unlock(id, password) {
        const r = await api('/api/stories/' + encodeURIComponent(id) + '/unlock', {
            method: 'POST', body: JSON.stringify(Object.assign(ident(), { avatar: getAvatar(), password: password || '' }))
        });
        return r.data || {};
    }
    async function requestJoin(id, message) {
        const r = await api('/api/stories/' + encodeURIComponent(id) + '/request', {
            method: 'POST', body: JSON.stringify(Object.assign(ident(), { avatar: getAvatar(), message: message || '' }))
        });
        return !!(r.data && r.data.ok);
    }
    // target = { uid, nick }（成员身份稳定标识 + 显示名）
    async function memberAction(id, target, action, role) {
        target = target || {};
        const r = await api('/api/stories/' + encodeURIComponent(id) + '/member', {
            method: 'POST', body: JSON.stringify({
                actor: getName(), actorUid: getUid(),
                targetUid: target.uid || '', nick: target.nick || '',
                action: action, role: role || 'editor'
            })
        });
        return !!(r.data && r.data.ok);
    }
    async function saveSettings(id, patch) {
        const r = await api('/api/stories/' + encodeURIComponent(id) + '/settings', {
            method: 'POST', body: JSON.stringify(Object.assign(ident(), { actor: getName(), actorUid: getUid() }, patch))
        });
        return r.data || {};
    }
    async function postComment(id, text) {
        const r = await api('/api/stories/' + encodeURIComponent(id) + '/comment', {
            method: 'POST', body: JSON.stringify(Object.assign(ident(), { avatar: getAvatar(), text: text }))
        });
        return r.data || {};
    }
    async function postChat(id, text) {
        const r = await api('/api/stories/' + encodeURIComponent(id) + '/chat', {
            method: 'POST', body: JSON.stringify(Object.assign(ident(), { avatar: getAvatar(), text: text }))
        });
        return r.data || {};
    }
    // ── 协作在线状态（光标 / 正在编辑哪个节点）──────────────────────
    // 设计器里每 ~90ms 上报一次（只在指针移动或动作变化时），服务器合并广播给别人，
    // 于是画布上能看到别人的指针、名字和「正在编辑这个节点」的彩色描边。
    async function reportPresence(id, state) {
        if (!_server || !id) return null;
        try {
            const r = await api('/api/stories/' + encodeURIComponent(id) + '/presence', {
                method: 'POST', body: JSON.stringify(Object.assign(ident(), state || {}))
            });
            return (r.status === 200 && r.data && r.data.ok) ? (r.data.self || r.data) : null;
        } catch (e) { return null; }
    }
    async function fetchPresence(id) {
        if (!_server || !id) return [];
        try {
            const r = await api('/api/stories/' + encodeURIComponent(id) + '/presence');
            return (r.status === 200 && r.data && Array.isArray(r.data.peers)) ? r.data.peers : [];
        } catch (e) { return []; }
    }
    // 关掉设计器 / 关页面时主动离场，别人画布上的指针立刻消失（不用等 12s 超时）
    async function leavePresence(id) {
        if (!_server || !id) return;
        try {
            await api('/api/stories/' + encodeURIComponent(id) + '/presence', {
                method: 'POST', body: JSON.stringify(Object.assign(ident(), { leave: 1 }))
            });
        } catch (e) {}
    }

    async function postTip(id, amount) {
        const r = await api('/api/stories/' + encodeURIComponent(id) + '/tip', {
            method: 'POST', body: JSON.stringify(Object.assign(ident(), { avatar: getAvatar(), amount: amount }))
        });
        return r.data || {};
    }

    // ── 世界之种钱包（服务器账户）──────────────────────────
    async function getMe() {
        try {
            const r = await api('/api/me?' + identQuery() + '&avatar=' + encodeURIComponent(getAvatar()));
            if (r.status === 200 && r.data && r.data.ok) return applyWallet(r.data.user);
        } catch (e) {}
        return null;
    }
    // 排障：服务器看到的我（IP）+ 服务器自己的局域网地址
    async function whoAmI() {
        try {
            const r = await api('/api/whoami');
            return (r.status === 200 && r.data && r.data.ok) ? r.data : null;
        } catch (e) { return null; }
    }
    async function getUsers(limit) {
        try {
            const r = await api('/api/users?limit=' + (limit || 20));
            return (r.data && r.data.users) || [];
        } catch (e) { return []; }
    }
    // 服务器账户是社区内的权威余额：拿到后同步到本地存档，顶栏 💠 数字保持一致
    function applyWallet(w) {
        if (!w) return null;
        _wallet = { uid: w.uid || getUid(), nick: w.nick, seeds: w.seeds, received: w.received || 0, sent: w.sent || 0 };
        try {
            if (typeof SAVE !== 'undefined' && SAVE.getSeeds && SAVE.addSeeds) {
                const diff = _wallet.seeds - SAVE.getSeeds();
                if (diff !== 0) SAVE.addSeeds(diff);
            }
        } catch (e) {}
        refreshSeedDisplay();
        return _wallet;
    }
    // 直接刷新顶栏「世界之种」文字（不依赖 game.js 的内部函数）
    function refreshSeedDisplay() {
        try {
            const el = document.getElementById('seed-display');
            if (!el || typeof SAVE === 'undefined') return;
            const name = (typeof I18N !== 'undefined' && I18N.t) ? I18N.t('worldSeed') : '世界之种';
            el.textContent = '💠 ' + name + ' x' + SAVE.getSeeds();
        } catch (e) {}
    }
    function getWallet() { return _wallet; }

    // ══════════════ 动作 ══════════════
    async function downloadStory(id) {
        const data = await fetchStory(id);
        if (!data.ok || !data.design) { toast('⚠ ' + I18N.t('communityFetchFail')); return false; }
        const d = JSON.parse(JSON.stringify(data.design));
        delete d.communityId;
        d.id = 'dl_' + Date.now();
        SAVE.saveDesign(d);
        toast('⬇ ' + I18N.t('communityDownloaded'));
        return true;
    }
    async function downloadJson(id) {
        const data = await fetchStory(id);
        if (!data.ok || !data.design) { toast('⚠ ' + I18N.t('communityFetchFail')); return false; }
        let out = JSON.parse(JSON.stringify(data.design));
        // 本地 IndexedDB 里有引用的图片素材就一起内嵌，保证单文件可用
        try {
            if (window.IMGDB && IMGDB.collectRefsInDesign) {
                const ids = IMGDB.collectRefsInDesign(out);
                const assets = {};
                for (const aid of ids) { const url = await IMGDB.getImage(aid); if (url) assets[aid] = url; }
                if (Object.keys(assets).length) out.assets = assets;
            }
        } catch (e) {}
        const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ((out.title || 'story').replace(/[\\/:*?"<>|]/g, '_')) + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast('⬇ JSON');
        return true;
    }
    async function openSharedInDesigner(id) {
        const data = await fetchStory(id);
        if (!data.ok) {
            if (data.error === 'locked') { toast('🔒 ' + I18N.t('communityLocked')); showDetail(id); return false; }
            toast('⚠ ' + I18N.t('communityFetchFail'));
            return false;
        }
        if (!data.canEdit) { toast('🔒 ' + I18N.t('communityEditDenied')); return false; }
        const design = JSON.parse(JSON.stringify(data.design));
        design.communityId = data.story.id;
        design.id = 'comm_' + data.story.id;
        try { joinStory(data.story.id); } catch (e) {}
        DESIGNER.open(design, { id: data.story.id, version: data.story.version || 1 });
        return true;
    }
    // 打赏世界之种：真正的转账 —— 从我的钱包转到故事管理员（作者）账户
    async function tipStory(id, amount) {
        if (!_wallet) await getMe();
        const r = await postTip(id, amount);
        if (r.ok) {
            applyWallet({
                uid: getUid(),
                nick: getName(),
                seeds: r.seeds,
                received: (_wallet && _wallet.received) || 0,
                sent: ((_wallet && _wallet.sent) || 0) + amount
            });
            const ownerName = (r.owner && r.owner.nick) || '';
            toast('💠 ' + T('communityTipSent', '已打赏') + ' ' + amount + (ownerName ? ' → ' + ownerName : ''));
            // 作者本人可能就在旁边（同一浏览器/另一台设备）→ 广播会让他刷新
            return true;
        }
        if (r.error === 'self') toast('ℹ ' + T('communityTipSelf', '这是你自己的故事，心意收下啦'));
        else if (r.error === 'insufficient') toast('⚠ ' + T('communityTipNoSeeds', '世界之种不足'));
        else toast('⚠ ' + T('communityTipFail', '打赏失败'));
        return false;
    }

    // ══════════════ UI 基础 ══════════════
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }
    function T(key, fallback) { const v = (I18N && I18N.t) ? I18N.t(key) : ''; return v || fallback || key; }
    function iconHTML(icon, size, radius) {
        if (window.IMGDB && IMGDB.renderIconHTML) return IMGDB.renderIconHTML(icon || '✨', size || 24, radius === undefined ? 6 : radius);
        return esc(icon || '✨');
    }
    function mk(tag, css, html) {
        const el = document.createElement(tag);
        if (css) el.style.cssText = css;
        if (html !== undefined) el.innerHTML = html;
        return el;
    }
    function btn(label, color, onClick, css) {
        const b = mk('button', (css || '') + 'flex:1 1 auto;min-width:70px;background:' + color + '22;border:1px solid ' + color + ';color:' + color + ';border-radius:var(--radius-sm);padding:6px 10px;font-size:0.78rem;cursor:pointer;');
        b.textContent = label;
        b.addEventListener('click', (e) => { e.stopPropagation(); onClick(b); });
        return b;
    }
    function host() { return document.getElementById('messages'); }
    function beginScreen() {
        const h = host();
        if (!h) return null;
        h.innerHTML = '';
        const ca = document.getElementById('choice-area');
        if (ca) ca.style.display = 'none';
        const hud = document.getElementById('bp-variable-hud');
        if (hud) hud.style.display = 'none';
        const app = document.getElementById('app');
        if (app) app.classList.add('active');
        const sp = document.getElementById('splash-screen');
        if (sp) sp.classList.add('hidden');
        return h;
    }
    let _toastEl = null, _toastTimer = null;
    // 未连服务器时 api() 会抛错，await 又没有 catch → 点击「毫无反应」。
    // 所有需要联网的按钮先过这道闸，给用户明确反馈。
    function ensureConnected() {
        if (_connected && _server) return true;
        toast('⚠ ' + T('communityNeedServer', '请先连接社区服务器'));
        return false;
    }
    function toast(msg) {
        if (typeof document === 'undefined') return;
        if (!_toastEl) {
            _toastEl = mk('div', 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:10101;background:rgba(15,23,42,0.95);color:#e2e8f0;border:1px solid rgba(148,163,184,0.4);border-radius:10px;padding:9px 16px;font-size:0.85rem;pointer-events:none;transition:opacity .25s;opacity:0;max-width:80vw;');
            document.body.appendChild(_toastEl);
        }
        _toastEl.textContent = msg;
        _toastEl.style.opacity = '1';
        clearTimeout(_toastTimer);
        _toastTimer = setTimeout(() => { if (_toastEl) _toastEl.style.opacity = '0'; }, 2400);
    }

    // ══════════════ 身份设置界面 ══════════════
    function showIdentitySetup(then) {
        const h = beginScreen();
        if (!h) return;
        const card = mk('div', 'background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:var(--radius-md);padding:18px;max-width:520px;margin:0 auto;');
        card.innerHTML = `
            <div style="font-size:1.2rem;font-weight:700;margin-bottom:6px;">🌐 ${esc(T('communityIdentity', '设置你的身份'))}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px;">${esc(T('communityIdentityHint', '昵称和头像会显示在你分享的故事、评论和聊天里'))}</div>
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
                <div id="comm-avatar-preview" style="width:56px;height:56px;border-radius:50%;background:var(--bg-page);border:2px solid var(--accent-blue);display:flex;align-items:center;justify-content:center;font-size:1.8rem;flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">${esc(T('communityName', '昵称'))}</div>
                    <input id="comm-name-input" maxlength="20" style="width:100%;background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:8px 10px;font-size:0.9rem;">
                </div>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px;">${esc(T('communityPickAvatar', '选择头像'))}</div>
            <div id="comm-avatar-grid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;"></div>
            <div style="margin-bottom:12px;background:var(--bg-page);border:1px dashed var(--border-color);border-radius:8px;padding:10px;">
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:5px;">${esc(T('communityAliasLabel', '曾用昵称（可选，认领旧作品）'))}</div>
                <input id="comm-alias-input" maxlength="140" placeholder="${esc(T('communityAliasPh', '以前用过的昵称，多个用逗号隔开'))}" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:7px 10px;font-size:0.82rem;">
                <div style="font-size:0.7rem;color:var(--text-muted);margin-top:5px;line-height:1.5;">${esc(T('communityAliasHint', '改名不会丢身份和世界之种。如果以前的名字下还有作品，填上旧昵称就能认领回来。'))}</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin:9px 0 5px;">${esc(T('communityCodeLabel', '认领码（可选）'))}</div>
                <input id="comm-code-input" maxlength="32" placeholder="${esc(T('communityCodePh', '旧作品的认领码，多个用逗号隔开'))}" style="width:100%;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:7px 10px;font-size:0.82rem;">
                <div style="font-size:0.7rem;color:var(--text-muted);margin-top:5px;line-height:1.5;">${esc(T('communityCodeHint', '为防止冒名：光填别人的曾用昵称抢不走作品。认领需要其一 —— ①你在这台开服务器的电脑上 ②这台机器上还留着你分享的那篇作品 ③填对认领码（分享时服务器给的）。'))}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <label style="font-size:0.78rem;background:rgba(148,163,184,0.15);border:1px solid var(--border-color);color:var(--text-secondary);border-radius:8px;padding:7px 12px;cursor:pointer;">
                    🖼 ${esc(T('communityUploadAvatar', '上传图片'))}
                    <input id="comm-avatar-file" type="file" accept="image/*" style="display:none;">
                </label>
                <button id="comm-avatar-ok" style="flex:1;background:rgba(59,130,246,0.18);border:1px solid var(--accent-blue);color:var(--accent-blue);border-radius:8px;padding:9px 14px;cursor:pointer;font-size:0.9rem;font-weight:600;">${esc(T('communitySave', '保存并进入社区'))}</button>
            </div>`;
        h.appendChild(card);

        const preview = card.querySelector('#comm-avatar-preview');
        const nameInput = card.querySelector('#comm-name-input');
        let picked = getAvatar();
        nameInput.value = getName();
        function paint() { preview.innerHTML = iconHTML(picked, 40, 9999); }
        paint();

        const grid = card.querySelector('#comm-avatar-grid');
        AVATAR_PRESETS.forEach(a => {
            const b = mk('button', 'width:38px;height:38px;border-radius:50%;border:1px solid var(--border-color);background:var(--bg-page);font-size:1.2rem;cursor:pointer;');
            b.textContent = a;
            b.addEventListener('click', () => { picked = a; paint(); });
            grid.appendChild(b);
        });
        card.querySelector('#comm-avatar-file').addEventListener('change', async (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f || !window.IMGDB) return;
            try {
                const up = await IMGDB.uploadImageFile(f, f.name);
                if (up && up.id) { picked = 'ur-img:' + up.id; paint(); }
            } catch (err) { toast('⚠ ' + err.message); }
        });
        card.querySelector('#comm-avatar-ok').addEventListener('click', () => {
            // 曾用昵称 → 记入身份别名历史，服务器据此认领旧作品/旧账户
            const aliasRaw = (card.querySelector('#comm-alias-input') || {}).value || '';
            aliasRaw.split(/[,，、]+/).forEach(n => { n = n.trim(); if (n) rememberAlias(n.slice(0, 24)); });
            const codeRaw = (card.querySelector('#comm-code-input') || {}).value || '';
            codeRaw.split(/[,，、\s]+/).forEach(c => { if (c.trim()) rememberClaimCode(c); });
            setName(nameInput.value);
            setAvatar(picked);
            if (then) then(); else showHome();
        });
    }

    // ══════════════ 自动发现面板 ══════════════
    let _discoState = { running: false, done: false, found: [], scanned: 0, total: 0 };
    let _discoTimer = null;
    let _discoUserStop = false;      // 用户手动点了「停止」→ 不再自动连接

    function copyText(text) {
        const done = () => toast('📋 ' + T('communityCopied', '已复制'));
        const fb = () => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                done();
            } catch (e) { toast('⚠ ' + text); }
        };
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done, fb);
                return;
            }
        } catch (e) {}
        fb();
    }

    // 面板每次重建都从这里重绘（扫描在后台持续推进，退到别的页面再回来也不会断）
    function syncDiscoUI() {
        const statusEl = document.getElementById('comm-disco-status');
        if (!statusEl) return false;
        const fillEl = document.getElementById('comm-disco-fill');
        const stopEl = document.getElementById('comm-disco-stop');
        const listEl = document.getElementById('comm-disco-list');
        const st = _discoState;
        if (st.running) {
            const pct = st.total ? Math.max(3, Math.round(st.scanned / st.total * 100)) : 3;
            statusEl.textContent = '⏳ ' + T('communitySearching', '正在自动搜索附近的社区服务器…') + '  ' + st.scanned + '/' + st.total;
            statusEl.className = 'comm-disco-status is-busy';
            fillEl.style.width = pct + '%';
            stopEl.style.display = '';
            stopEl.textContent = T('communitySearchStop', '停止');
        } else {
            stopEl.style.display = 'none';
            if (st.found.length) {
                statusEl.textContent = '✅ ' + T('communitySearchFound', '找到 {n} 个社区服务器').replace('{n}', st.found.length);
                statusEl.className = 'comm-disco-status is-ok';
                fillEl.style.width = '100%';
            } else {
                statusEl.textContent = '⚠ ' + T('communitySearchNone', '附近没有找到社区服务器');
                statusEl.className = 'comm-disco-status is-none';
                fillEl.style.width = '0%';
            }
        }
        // 结果列表：内容变了才重建
        const sig = st.found.map(x => x.url).join('|');
        if (listEl && listEl.getAttribute('data-sig') !== sig) {
            listEl.setAttribute('data-sig', sig);
            listEl.innerHTML = '';
            st.found.forEach(info => {
                const item = mk('div', '');
                item.className = 'comm-disco-item';
                const tag = info.mdns ? ' <span class="comm-disco-tag">' + esc(T('communityUnifiedTag', '统一地址')) + '</span>' : '';
                item.innerHTML = `<div class="comm-disco-item-main">
                        <div class="comm-disco-item-name">🌐 ${esc(info.name || info.url)}${tag}</div>
                        <div class="comm-disco-item-url">${esc(info.url)} · ${info.stories} ${esc(T('communityStoryCount', '个故事'))}</div>
                    </div>`;
                item.appendChild(btn(T('communityConnect', '连接'), 'var(--accent-blue)', async () => {
                    cancelDiscovery();
                    _discoState.running = false; _discoState.done = true;
                    if (await connect(info.url, false)) showHome();
                }, 'flex:0 0 auto;min-width:64px;'));
                listEl.appendChild(item);
            });
        }
        return true;
    }

    // 扫描进行中时按固定节奏重绘（面板被重建/离开页面会自动停）
    function ensureDiscoTicker() {
        if (_discoTimer) return;
        const t = setInterval(() => {
            if (_discoTimer !== t) { clearInterval(t); return; }      // 已被新面板替换
            const alive = syncDiscoUI();
            if (!alive || !_discoState.running) {
                clearInterval(t);
                if (_discoTimer === t) _discoTimer = null;
            }
        }, 260);
        _discoTimer = t;
    }

    async function runDiscovery(deep) {
        if (_discoState.running) return;
        _discoState = { running: true, done: false, found: [], scanned: 0, total: 0 };
        _discoUserStop = false;
        syncDiscoUI();
        ensureDiscoTicker();
        const found = await discover({
            deep: deep,
            onProgress: (hd) => { _discoState.scanned = hd.scanned; _discoState.total = hd.total; },
            onFound: (info, hd) => { _discoState.found = hd.found.slice(); }
        });
        _scannedOnce = true;
        _discoState.running = false;
        _discoState.done = true;
        _discoState.found = found;
        syncDiscoUI();
        // 只找到一个 → 直接连上，用户什么都不用点（除非他刚点了「停止」）
        if (found.length === 1 && !_connected && !_autoConnecting && !_discoUserStop) {
            _autoConnecting = true;
            const ok = await connect(found[0].url, false);
            _autoConnecting = false;
            if (ok) showHome();
        }
    }

    function discoveryPanel() {
        const box = mk('div', '');
        box.className = 'comm-disco';
        box.innerHTML = `
            <div class="comm-disco-head">
                <span id="comm-disco-status" class="comm-disco-status">…</span>
                <button id="comm-disco-stop" class="comm-disco-mini" style="display:none;"></button>
            </div>
            <div class="comm-disco-bar"><i id="comm-disco-fill"></i></div>
            <div id="comm-disco-list" class="comm-disco-list" data-sig=""></div>
            <div class="comm-disco-unified">
                <span class="comm-disco-unified-k">🔗 ${esc(T('communityUnified', '统一内网地址'))}</span>
                <code class="comm-disco-code">${esc(unifiedUrl())}</code>
                <button id="comm-disco-copy" class="comm-disco-mini">${esc(T('communityCopy', '复制'))}</button>
                <div class="comm-disco-hint">${esc(T('communityUnifiedHint', '同一 WiFi 下所有人打开这个网址就能进入同一个社区，不用记 IP'))}</div>
                <div id="comm-disco-ip" class="comm-disco-hint">${esc(T('communityDetectingIp', '正在识别本机地址…'))}</div>
            </div>
            <details class="comm-disco-more">
                <summary>${esc(T('communityManualToggle', '没找到？手动输入地址 / 深度扫描'))}</summary>
                <div class="comm-disco-manual">
                    <input id="comm-disco-input" class="comm-disco-input" autocomplete="off" spellcheck="false">
                    <button id="comm-disco-connect" class="comm-disco-mini comm-disco-primary">${esc(T('communityConnect', '连接'))}</button>
                </div>
                <div class="comm-disco-hint">${esc(T('communityManualHint', '知道 WiFi 名字并不能推出服务器地址：需要开服务器那台电脑的 IP。在它上面看服务器启动日志，或命令行运行 ipconfig，把 IPv4 地址填进来，如 http://192.168.1.5:8787'))}</div>
                <label class="comm-disco-deep">
                    <input type="checkbox" id="comm-disco-deep"> ${esc(T('communitySearchDeep', '深度扫描更多网段（更慢，覆盖 10.x / 手机热点等）'))}
                </label>
            </details>`;

        const inputEl = box.querySelector('#comm-disco-input');
        const deepEl = box.querySelector('#comm-disco-deep');
        inputEl.placeholder = T('communityServerPh', '服务器地址，如 http://192.168.1.5:8787');
        try { inputEl.value = localStorage.getItem(LS_SERVER) || ''; } catch (e) {}
        deepEl.checked = _deepScan;

        box.querySelector('#comm-disco-stop').addEventListener('click', () => {
            cancelDiscovery();
            _discoUserStop = true;
            _discoState.running = false;
            _discoState.done = true;
            _scannedOnce = true;
            syncDiscoUI();
        });
        box.querySelector('#comm-disco-copy').addEventListener('click', () => copyText(unifiedUrl()));
        // 手机/平板上页面是 file://，拿不到自己网段 → 用 WebRTC 反查本机 IP，
        // 显示出来既能让用户核对网段，也能解释「为什么扫的是这些地址」
        localIps().then(ips => {
            const el = box.querySelector('#comm-disco-ip');
            if (!el) return;
            el.textContent = ips.length
                ? '📱 ' + T('communityMyIp', '你的地址') + '：' + ips.join(' / ') + '（' + T('communityScanHint', '将优先扫描这些网段') + '）'
                : '⚠ ' + T('communityNoIp', '没识别到本机地址，将扫描常见网段；也可在下面手动填服务器地址');
        });
        deepEl.addEventListener('change', () => { _deepScan = !!deepEl.checked; });
        const doConnect = async () => {
            const v = (inputEl.value || '').trim();
            if (!v) return;
            cancelDiscovery();
            _discoState.running = false; _discoState.done = true;
            if (await connect(v, false)) showHome();
        };
        box.querySelector('#comm-disco-connect').addEventListener('click', doConnect);
        inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConnect(); });

        // 面板装好后立即同步一次；没扫过就自动开扫
        setTimeout(() => {
            if (_discoTimer) { clearInterval(_discoTimer); _discoTimer = null; }
            syncDiscoUI();
            ensureDiscoTicker();
            if (!_scannedOnce && !_discoState.running && !_connected) runDiscovery(_deepScan);
        }, 0);
        return box;
    }

    // 已连接时告诉用户「怎么把别人拉进来」
    function inviteBar() {
        const box = mk('div', '');
        box.className = 'comm-invite';
        const uni = (_serverInfo && _serverInfo.unified) || '';
        const lan = (_serverInfo && _serverInfo.lan && _serverInfo.lan[0]) || '';
        box.innerHTML = `
            <div class="comm-invite-line">
                <span class="comm-invite-k">🔗 ${esc(T('communityInviteUnified', '统一地址'))}</span>
                <code class="comm-disco-code">${esc(uni || unifiedUrl())}</code>
                <button class="comm-disco-mini" id="comm-invite-copy1">${esc(T('communityCopy', '复制'))}</button>
            </div>
            ${lan ? `<div class="comm-invite-line">
                <span class="comm-invite-k">🖥 ${esc(T('communityInviteLan', '本机地址'))}</span>
                <code class="comm-disco-code">${esc(lan)}</code>
                <button class="comm-disco-mini" id="comm-invite-copy2">${esc(T('communityCopy', '复制'))}</button>
            </div>` : ''}
            <div class="comm-disco-hint">${esc(T('communityInviteHint', '让其他人连同一个 WiFi，打开上面的地址就能进入这个社区'))}</div>`;
        box.querySelector('#comm-invite-copy1').addEventListener('click', () => copyText(uni || unifiedUrl()));
        const c2 = box.querySelector('#comm-invite-copy2');
        if (c2) c2.addEventListener('click', () => copyText(lan));
        return box;
    }

    // ══════════════ 顶部状态条 ══════════════
    function headerBar(h) {
        const bar = mk('div', 'background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:12px;');
        const status = _connected
            ? '🟢 ' + T('communityConnected', '已连接') + ' · ' + esc(_server)
            : '🔴 ' + T('communityNotConnected', '未连接社区服务器');
        const mySeeds = (_wallet && typeof _wallet.seeds === 'number') ? _wallet.seeds
            : ((typeof SAVE !== 'undefined' && SAVE.getSeeds) ? SAVE.getSeeds() : 0);
        bar.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                <div style="font-size:1.2rem;font-weight:700;">🌐 ${esc(T('communityTitle', '故事社区'))}</div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:var(--text-secondary);">
                        ${iconHTML(getAvatar(), 26, 9999)}
                        <span>${esc(getName())}</span>
                        <span id="comm-me-seeds" style="font-size:0.72rem;color:var(--accent-yellow);background:rgba(250,204,21,0.12);border:1px solid rgba(250,204,21,0.35);border-radius:999px;padding:2px 8px;">💠 ${mySeeds}</span>
                    </div>
                    <button id="comm-edit-me" style="background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);border-radius:8px;padding:5px 10px;font-size:0.75rem;cursor:pointer;">✏️</button>
                </div>
            </div>
            <div style="font-size:0.75rem;color:${_connected ? 'var(--accent-green)' : 'var(--text-muted)'};margin-top:6px;">${status}${_serverName ? ' · ' + esc(_serverName) : ''}</div>`;
        bar.appendChild(_connected ? inviteBar() : discoveryPanel());
        h.appendChild(bar);
        bar.querySelector('#comm-edit-me').addEventListener('click', () => showIdentitySetup(showHome));
        return bar;
    }

    function filterRow(h, onPick) {
        const row = mk('div', 'display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;');
        const tabs = [
            ['all', T('communityFilterAll', '全部')],
            ['public', T('communityFilterPublic', '公开')],
            ['team', T('communityFilterTeam', '团队')],
            ['mine', T('communityFilterMine', '我的')]
        ];
        tabs.forEach(pair => {
            const k = pair[0], label = pair[1];
            const b = mk('button', 'background:' + (_filter === k ? 'rgba(59,130,246,0.2)' : 'transparent') + ';border:1px solid ' + (_filter === k ? 'var(--accent-blue)' : 'var(--border-color)') + ';color:' + (_filter === k ? 'var(--accent-blue)' : 'var(--text-secondary)') + ';border-radius:8px;padding:6px 14px;font-size:0.8rem;cursor:pointer;');
            b.textContent = label;
            b.addEventListener('click', () => { _filter = k; onPick(); });
            row.appendChild(b);
        });
        h.appendChild(row);
    }

    // ══════════════ 社区首页 ══════════════
    // 进社区后后台同步「我的世界之种」，只刷新顶栏种子数，不阻塞首屏渲染
    function refreshSeedChip() {
        const chip = document.getElementById('comm-me-seeds');
        if (!chip) return;
        const mySeeds = (_wallet && typeof _wallet.seeds === 'number') ? _wallet.seeds
            : ((typeof SAVE !== 'undefined' && SAVE.getSeeds) ? SAVE.getSeeds() : 0);
        chip.textContent = '💠 ' + mySeeds;
    }

    async function showHome() {
        const h = beginScreen();
        if (!h) return;
        _view = null; _detail = null;
        // 先立即渲染首页（顶栏 + 网格骨架），钱包同步放后台，避免网络往返期间白屏
        headerBar(h);
        filterRow(h, showHome);

        const grid = mk('div', '');
        grid.className = 'story-card-grid';
        h.appendChild(grid);

        if (!_connected) {
            // 文案固定、无外部输入，直接作为 HTML 以支持换行
            grid.appendChild(mk('div', 'grid-column:1/-1;font-size:0.82rem;color:var(--text-muted);line-height:1.8;',
                T('communityNeedServerHint', '连上社区服务器后，这里就会列出所有人的故事。<br>还没人开服务器？随便找一台电脑运行 <code>node server/community.js</code>，其他人打开它给出的统一地址即可。')));
        } else {
            grid.appendChild(mk('div', 'grid-column:1/-1;font-size:0.8rem;color:var(--text-muted);', '…'));
            if (_connected) {
                // 后台同步钱包，拿到后只刷新顶栏种子数
                getMe().then(refreshSeedChip).catch(() => {});
                const list = await listStories();
                grid.innerHTML = '';
                const me = getName();
                const myUid = getUid();
                const shown = list.filter(s =>
                    _filter === 'all' ? true :
                    _filter === 'public' ? s.visibility === 'public' :
                    _filter === 'team' ? s.visibility === 'team' :
                    !!(s.mine || s.owner === myUid || s.author === me));
                if (!shown.length) grid.appendChild(mk('div', 'grid-column:1/-1;font-size:0.85rem;color:var(--text-muted);', esc(T('communityEmpty', '还没有人分享故事'))));
                shown.forEach(s => grid.appendChild(storyCard(s)));
            }
        }

        const shareBtn = btn('🌐 ' + T('communityShareMy', '分享我的故事'), 'var(--accent-yellow)', () => showSharePicker(), 'flex:0 0 auto;width:100%;padding:10px;font-size:0.85rem;margin-top:14px;');
        h.appendChild(shareBtn);

        const back = mk('button', 'margin-top:8px;width:100%;padding:12px;', '');
        back.className = 'ending-btn';
        back.textContent = '← ' + T('mainMenu', '返回主菜单');
        back.addEventListener('click', () => { if (typeof GAME !== 'undefined' && GAME.showMainMenu) GAME.showMainMenu(); });
        h.appendChild(back);
    }

    function storyCard(s) {
        const mine = !!(s.mine || s.owner === getUid() || s.author === getName());
        const theme = s.themeColor || 'var(--accent-yellow)';
        const card = mk('div', 'background:var(--bg-card);border:1px solid ' + theme + ';border-radius:var(--radius-md);padding:14px;cursor:pointer;' + (s.lockedTeam ? 'border-style:dashed;' : ''));
        card.className = 'story-card story-card-custom';
        card.innerHTML = `
            <div style="font-size:1.7rem;margin-bottom:4px;min-height:2rem;">${iconHTML(s.icon || '✨', 30)}</div>
            <div style="font-size:1.05rem;font-weight:700;color:${theme};overflow-wrap:break-word;word-break:break-word;">${esc(s.title || '')} ${s.lockedTeam ? '🔒' : ''}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin:4px 0;overflow-wrap:break-word;word-break:break-word;">${esc(s.description || '')}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);line-height:1.7;">
                ${iconHTML(s.avatar || '👤', 14, 9999)} ${esc(s.author || '—')} · v${s.version || 1}<br>
                💠 ${s.tipTotal || 0} · 💬 ${s.comments || 0} · 👥 ${(s.members || []).length}
                ${s.lockedTeam ? ' · 🔒 ' + esc(T('communityVisTeam', '仅团队')) : ''}
            </div>`;
        const row = mk('div', 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;');
        row.appendChild(btn('👁 ' + T('communityDetail', '详情'), 'var(--accent-blue)', () => showDetail(s.id)));
        row.appendChild(btn('⬇ ' + T('communityDownload', '下载'), 'var(--accent-green)', async () => {
            if (s.lockedTeam) { showDetail(s.id); return; }
            await downloadStory(s.id);
        }));
        if (mine) row.appendChild(btn('🗑', 'var(--accent-red)', async () => {
            if (!confirm(T('communityDeleteConfirm', '确定删除？'))) return;
            await deleteStory(s.id);
            showHome();
        }, 'flex:0 0 auto;'));
        card.appendChild(row);
        card.addEventListener('click', () => showDetail(s.id));
        return card;
    }

    function showSharePicker() {
        const h = beginScreen();
        if (!h) return;
        headerBar(h);
        const wrap = mk('div', '');
        wrap.innerHTML = `<div style="font-size:0.9rem;font-weight:700;margin-bottom:10px;">🌐 ${esc(T('communityPickLocal', '选择要分享的本地故事'))}</div>`;
        h.appendChild(wrap);
        let designs = [];
        try { designs = SAVE.getDesigns(); } catch (e) {}
        if (!designs.length) wrap.appendChild(mk('div', 'font-size:0.82rem;color:var(--text-muted);', esc(T('communityNoLocal', '还没有本地自创故事'))));
        designs.forEach(d => {
            const row = mk('div', 'display:flex;align-items:center;gap:10px;padding:10px;border:1px dashed var(--border-color);border-radius:10px;margin-bottom:8px;flex-wrap:wrap;');
            row.innerHTML = `<div style="font-size:1.3rem;">${iconHTML(d.storyIcon || '✨', 24)}</div>
                <div style="flex:1;min-width:0;font-weight:600;overflow-wrap:break-word;">${esc(d.title || T('unnamedStory', '未命名'))}</div>`;
            const opts = mk('select', 'background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:6px;font-size:0.75rem;');
            // 三态模式：open=所有人可玩可自由编辑 / teamedit=所有人可玩仅团队编辑 / private=仅团队
            opts.innerHTML = `<option value="open">🌍 ${esc(T('communityModeOpen', '所有人可玩 · 可自由编辑'))}</option>
                <option value="teamedit">🤝 ${esc(T('communityModeTeamEdit', '所有人可玩 · 仅团队可编辑'))}</option>
                <option value="private">🔒 ${esc(T('communityModePrivate', '仅团队 · 密码才能进'))}</option>`;
            opts.value = 'open';
            const pwd = mk('input', 'width:120px;background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:6px 8px;font-size:0.75rem;');
            pwd.placeholder = T('communityPasswordPh', '团队密码(可选)');
            pwd.style.display = 'none'; // 只有 private 模式才需要密码
            opts.addEventListener('change', () => { pwd.style.display = opts.value === 'private' ? '' : 'none'; });
            const b = btn(T('communityShare', '分享'), 'var(--accent-yellow)', async () => {
                if (!ensureConnected()) return;
                const r = await shareDesign(d, { mode: opts.value, password: pwd.value });
                if (r) {
                    d.communityId = r.id;
                    SAVE.saveDesign(d);
                    toast('🌐 ' + T('communityShareOk', '已分享到社区'));
                    showHome();
                } else toast('⚠ ' + T('communityShareFail', '分享失败'));
            }, 'flex:0 0 auto;');
            row.appendChild(opts); row.appendChild(pwd); row.appendChild(b);
            wrap.appendChild(row);
        });
        h.appendChild(backBtn(showHome));
    }

    // ══════════════ 故事详情 ══════════════
    async function showDetail(id) {
        const h = beginScreen();
        if (!h) return;
        _view = { story: id };
        headerBar(h);
        h.appendChild(mk('div', 'font-size:0.85rem;color:var(--text-muted);', '…'));
        await refreshDetail(false);
    }

    async function refreshDetail(silent) {
        const h = host();
        if (!_view || !h) return;
        const id = _view.story;
        const data = await fetchStory(id);
        h.innerHTML = '';
        headerBar(h);

        if (!data.ok) {
            // 🔒 团队故事且非成员
            const meta = data.story || _metaCache[id] || {};
            const card = mk('div', 'background:var(--bg-card);border:1px solid var(--accent-purple);border-radius:var(--radius-md);padding:16px;');
            card.innerHTML = `
                <div style="font-size:1.6rem;">${iconHTML(meta.icon || '✨', 32)}</div>
                <div style="font-size:1.1rem;font-weight:700;margin-top:4px;">${esc(meta.title || '')} 🔒</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);margin:6px 0;">${esc(meta.description || '')}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);">${esc(T('communityAuthor', '作者'))}: ${esc(meta.author || '—')} · 💠 ${meta.tipTotal || 0}</div>
                <div style="font-size:0.85rem;color:var(--accent-purple);margin-top:10px;">🔒 ${esc(T('communityLocked', '该故事仅团队成员可见'))}</div>`;
            const row = mk('div', 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center;');
            const pwd = mk('input', 'flex:1;min-width:120px;background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:8px 10px;font-size:0.82rem;');
            pwd.type = 'password';
            pwd.placeholder = T('communityPassword', '团队密码');
            const ub = btn(T('communityUnlock', '解锁'), 'var(--accent-purple)', async () => {
                const r = await unlock(id, pwd.value);
                if (r.ok) { toast('🔓'); await refreshDetail(true); }
                else toast('⚠ ' + T('communityUnlockFail', '密码错误'));
            }, 'flex:0 0 auto;');
            const msg = mk('input', 'flex:1;min-width:140px;background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:8px 10px;font-size:0.82rem;');
            msg.placeholder = T('communityApplyMsgPh', '申请留言（可不填）');
            const ab = btn(T('communityApply', '申请加入'), 'var(--accent-blue)', async () => {
                const ok = await requestJoin(id, msg.value);
                toast(ok ? '📨 ' + T('communityApplied', '申请已发送') : '⚠');
            }, 'flex:0 0 auto;');
            row.appendChild(pwd); row.appendChild(ub); row.appendChild(msg); row.appendChild(ab);
            card.appendChild(row);
            h.appendChild(card);
            h.appendChild(backBtn(showHome));
            return;
        }

        _detail = data;
        const s = data.story || {};
        // 归属 / 成员身份一律由服务器按 uid 判定 → 改昵称也仍然认得出
        const isOwner = !!(s.mine || data.myRole === 'admin');
        const canEdit = !!data.canEdit;
        const theme = s.themeColor || 'var(--accent-yellow)';
        if (data.wallet) applyWallet(data.wallet);
        const canChat = isOwner || !!data.isMember || canEdit;
        // 三态模式徽标
        const modeBadge = s.mode === 'private' ? '🔒 ' + esc(T('communityModePrivate', '仅团队 · 密码才能进'))
            : s.mode === 'teamedit' ? '🤝 ' + esc(T('communityModeTeamEdit', '所有人可玩 · 仅团队可编辑'))
            : '🌍 ' + esc(T('communityModeOpen', '所有人可玩 · 可自由编辑'));

        const info = mk('div', 'background:var(--bg-card);border:1px solid ' + theme + ';border-radius:var(--radius-md);padding:14px 16px;margin-bottom:12px;');
        info.innerHTML = `
            <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">
                <div style="font-size:2rem;">${iconHTML(s.icon || '✨', 40)}</div>
                <div style="flex:1;min-width:180px;">
                    <div style="font-size:1.15rem;font-weight:700;color:${theme};overflow-wrap:break-word;">${esc(s.title || '')} ${s.lockedTeam ? '🔒' : ''}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin:4px 0;">${esc(s.description || '')}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);line-height:1.8;">
                        ${iconHTML(s.avatar || '👤', 14, 9999)} ${esc(s.author || '—')} ${isOwner ? '👑 ' + esc(T('communityAdmin', '管理员')) : ''} · v${s.version || 1}
                        · 💬 ${(data.comments || []).length} · 👥 ${(s.members || []).length}
                        · ${modeBadge}
                    </div>
                </div>
                <div style="flex:0 0 auto;text-align:right;font-size:0.72rem;color:var(--text-muted);line-height:1.9;">
                    <div style="color:var(--accent-yellow);font-size:1rem;font-weight:700;">💠 ${s.tipTotal || 0}</div>
                    <div>${esc(T('communityTipTotal', '世界之种'))}</div>
                    <div>${esc(T('communityOwnerGot', '作者已收到'))} 💠 ${s.ownerReceived || 0}</div>
                </div>
            </div>`;
        h.appendChild(info);

        // ② 区块卡片网格：复用「选择故事」页的 .story-card-grid，
        //    宽屏自动多列 → 不再把所有区块纵向堆成一条超长列表
        const grid = mk('div', '');
        grid.className = 'story-card-grid';
        h.appendChild(grid);

        // 操作 + 打赏卡
        const act = mk('div', 'background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px;');
        act.innerHTML = `<div style="font-size:0.85rem;font-weight:700;margin-bottom:10px;">⚙ ${esc(T('communityActions', '操作'))}</div>`;
        const ops = mk('div', 'display:flex;gap:8px;flex-wrap:wrap;');
        ops.appendChild(btn('⬇ ' + T('communityDownloadJson', '下载 JSON'), 'var(--accent-purple)', () => downloadJson(id)));
        ops.appendChild(btn('💾 ' + T('communitySaveLocal', '存到本地'), 'var(--accent-green)', () => downloadStory(id)));
        ops.appendChild(btn('✏️ ' + T('communityCollab', '协作编辑'), 'var(--accent-blue)', () => openSharedInDesigner(id)));
        if (canChat) ops.appendChild(btn('💬 ' + T('communityTeamChat', '团队聊天'), 'var(--accent-cyan)', () => openChatOverlay(id)));
        // teamedit / private 模式下非成员：给个「申请加入」入口（private 在锁定页也有）
        if (!isOwner && !data.isMember && !canEdit && s.mode !== 'private') {
            ops.appendChild(btn('📨 ' + T('communityApply', '申请加入'), 'var(--accent-purple)', async () => {
                const ok2 = await requestJoin(id, '');
                toast(ok2 ? '📨 ' + T('communityApplied', '申请已发送') : '⚠ ' + T('communityApplyFail', '申请失败'));
            }));
        }
        act.appendChild(ops);

        const tipBox = mk('div', 'margin-top:12px;padding-top:10px;border-top:1px solid var(--border-color);');
        const mySeeds = (_wallet && typeof _wallet.seeds === 'number') ? _wallet.seeds
            : ((typeof SAVE !== 'undefined' && SAVE.getSeeds) ? SAVE.getSeeds() : 0);
        tipBox.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.78rem;color:var(--text-secondary);">
                <span>💠 ${esc(T('communityTip', '打赏世界之种'))}</span>
                <span style="margin-left:auto;color:var(--text-muted);">${esc(T('communityMySeeds', '我的世界之种'))}:
                    <b style="color:var(--accent-yellow);">${mySeeds}</b></span>
            </div>`;
        const tipRow = mk('div', 'display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap;');
        [1, 5, 10].forEach(n => {
            tipRow.appendChild(btn('+' + n, 'var(--accent-yellow)', async () => { await tipStory(id, n); await refreshDetail(true); }, 'flex:0 0 auto;min-width:52px;'));
        });
        tipBox.appendChild(tipRow);
        if (isOwner) tipBox.appendChild(mk('div', 'font-size:0.7rem;color:var(--text-muted);margin-top:6px;',
            '👑 ' + esc(T('communityOwnerTipHint', '打赏会转入作者账户；自己的故事不能打赏自己'))));
        act.appendChild(tipBox);
        if (!canEdit) act.appendChild(mk('div', 'font-size:0.75rem;color:var(--text-muted);margin-top:8px;',
            '🔒 ' + esc(T('communityEditDenied', '你没有编辑权限（管理员可授权）'))));
        grid.appendChild(act);

        if (isOwner) grid.appendChild(adminPanel(id, s, data));
        if (canChat) grid.appendChild(chatPanel(id, data, true));
        grid.appendChild(chatPanel(id, data, false));
        h.appendChild(backBtn(showHome));
        if (!silent && h.scrollTo) h.scrollTo(0, 0);
    }

    function backBtn(then) {
        const b = mk('button', 'margin-top:12px;width:100%;padding:11px;', '');
        b.className = 'ending-btn';
        b.textContent = '← ' + T('communityBack', '返回');
        b.addEventListener('click', () => { if (then) then(); else showHome(); });
        return b;
    }

    // 管理员面板：可见性 / 密码 / 成员 / 申请
    function adminPanel(id, s, data) {
        // 默认折叠：详情页改成网格后，管理面板内容多，展开会撑高整张卡片
        const box = mk('details', 'background:var(--bg-card);border:1px solid var(--accent-yellow);border-radius:var(--radius-md);padding:12px 14px;');
        const sum = mk('summary', 'cursor:pointer;font-size:0.9rem;font-weight:700;display:flex;align-items:center;gap:6px;');
        sum.innerHTML = `👑 ${esc(T('communityAdminPanel', '管理面板'))}
            <span style="font-size:0.7rem;font-weight:400;color:var(--text-muted);">📨 ${(data.requests || []).length} · 👥 ${(s.members || []).length}</span>`;
        box.appendChild(sum);
        const body = mk('div', 'margin-top:10px;');

        const visRow = mk('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;');
        const sel = mk('select', 'background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:7px;font-size:0.8rem;');
        // 三态模式：open=所有人可玩可自由编辑 / teamedit=所有人可玩仅团队编辑 / private=仅团队
        sel.innerHTML = `<option value="open">🌍 ${esc(T('communityModeOpen', '所有人可玩 · 可自由编辑'))}</option>
            <option value="teamedit">🤝 ${esc(T('communityModeTeamEdit', '所有人可玩 · 仅团队可编辑'))}</option>
            <option value="private">🔒 ${esc(T('communityModePrivate', '仅团队 · 密码才能进'))}</option>`;
        sel.value = s.mode || (s.visibility === 'team' ? 'private' : ((s.allowEdit || []).length ? 'teamedit' : 'open'));
        const pwd = mk('input', 'flex:1;min-width:120px;background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:7px 10px;font-size:0.8rem;');
        pwd.placeholder = T('communityPasswordPh', '团队密码(可留空)');
        pwd.style.display = sel.value === 'private' ? '' : 'none';
        sel.addEventListener('change', () => { pwd.style.display = sel.value === 'private' ? '' : 'none'; });
        const saveB = btn(T('communitySave', '保存设置'), 'var(--accent-yellow)', async () => {
            const r = await saveSettings(id, { mode: sel.value, password: pwd.value });
            toast(r.ok ? '✓ ' + T('communitySettingsSaved', '设置已保存') : '⚠');
            await refreshDetail(true);
        }, 'flex:0 0 auto;');
        visRow.appendChild(sel); visRow.appendChild(pwd); visRow.appendChild(saveB);
        body.appendChild(visRow);

        const reqs = data.requests || [];
        const reqBox = mk('div', 'margin-bottom:10px;');
        reqBox.innerHTML = `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:6px;">📨 ${esc(T('communityRequests', '加入申请'))} (${reqs.length})</div>`;
        if (!reqs.length) reqBox.appendChild(mk('div', 'font-size:0.75rem;color:var(--text-muted);', '—'));
        reqs.forEach(r => {
            const row = mk('div', 'display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--border-color);flex-wrap:wrap;');
            row.innerHTML = `<div style="flex:1;min-width:0;font-size:0.8rem;">${iconHTML(r.avatar || '👤', 20, 9999)} <b>${esc(r.nick)}</b> <span style="color:var(--text-muted);">${esc(r.message || '')}</span></div>`;
            row.appendChild(btn(T('communityApprove', '同意'), 'var(--accent-green)', async () => { await memberAction(id, { uid: r.uid, nick: r.nick }, 'approve'); await refreshDetail(true); }, 'flex:0 0 auto;min-width:56px;'));
            row.appendChild(btn(T('communityReject', '拒绝'), 'var(--accent-red)', async () => { await memberAction(id, { uid: r.uid, nick: r.nick }, 'reject'); await refreshDetail(true); }, 'flex:0 0 auto;min-width:56px;'));
            reqBox.appendChild(row);
        });
        body.appendChild(reqBox);

        const memBox = mk('div', '');
        memBox.innerHTML = `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:6px;">👥 ${esc(T('communityMembers', '团队成员'))}</div>`;
        // memberDetails 带 uid（身份）+ nick（显示名）；成员管理按 uid 操作，改昵称也认得同一个人
        const members = (s.memberDetails && s.memberDetails.length) ? s.memberDetails
            : (s.members || []).map(n => ({ uid: n, nick: n }));
        if (!members.length) memBox.appendChild(mk('div', 'font-size:0.75rem;color:var(--text-muted);', '—'));
        members.forEach(m => {
            const row = mk('div', 'display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--border-color);flex-wrap:wrap;');
            row.innerHTML = `<div style="flex:1;min-width:0;font-size:0.8rem;">${iconHTML(m.avatar || '👤', 20, 9999)} <b>${esc(m.nick)}</b></div>`;
            const roleSel = mk('select', 'background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:6px;padding:4px;font-size:0.72rem;');
            roleSel.innerHTML = `<option value="editor">✏️ ${esc(T('communityRoleEditor', '可编辑'))}</option><option value="viewer">👁 ${esc(T('communityRoleViewer', '只读'))}</option>`;
            roleSel.value = ((s.allowEdit || []).indexOf(m.uid) >= 0) ? 'editor' : 'viewer';
            roleSel.addEventListener('change', async () => { await memberAction(id, m, 'setrole', roleSel.value); await refreshDetail(true); });
            row.appendChild(roleSel);
            row.appendChild(btn(T('communityRemove', '移除'), 'var(--accent-red)', async () => { await memberAction(id, m, 'remove'); await refreshDetail(true); }, 'flex:0 0 auto;min-width:52px;'));
            memBox.appendChild(row);
        });
        body.appendChild(memBox);
        box.appendChild(body);
        return box;
    }

    // 消息面板（team=true 团队聊天 / false 评论区）
    function chatPanel(id, data, isTeam) {
        const list = isTeam ? (data.chat || []) : (data.comments || []);
        const box = mk('div', 'background:var(--bg-card);border:1px solid ' + (isTeam ? 'var(--accent-green)' : 'var(--border-color)') + ';border-radius:var(--radius-md);padding:12px;margin-bottom:12px;');
        box.innerHTML = `<div style="font-size:0.85rem;font-weight:700;margin-bottom:8px;">${isTeam ? '💬 ' + esc(T('communityTeamChat', '团队聊天')) : '💬 ' + esc(T('communityComments', '评论'))} (${list.length})</div>`;
        const scroll = mk('div', 'max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:4px 2px;');
        if (!list.length) scroll.appendChild(mk('div', 'font-size:0.75rem;color:var(--text-muted);', '—'));
        list.forEach(m => scroll.appendChild(bubble(m)));
        box.appendChild(scroll);

        const row = mk('div', 'display:flex;gap:8px;margin-top:10px;');
        const inp = mk('input', 'flex:1;min-width:0;background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:8px 10px;font-size:0.82rem;');
        inp.placeholder = isTeam ? T('communityChatPh', '和团队说点什么…') : T('communityCommentPh', '说点什么…');
        const send = btn(T('communitySend', '发送'), isTeam ? 'var(--accent-green)' : 'var(--accent-blue)', async () => {
            const text = (inp.value || '').trim();
            if (!text) return;
            if (!ensureConnected()) return;
            inp.value = '';
            if (isTeam) await postChat(id, text); else await postComment(id, text);
            await refreshDetail(true);
        }, 'flex:0 0 auto;min-width:64px;');
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send.click(); });
        row.appendChild(inp); row.appendChild(send);
        box.appendChild(row);
        return box;
    }

    // 微信风格气泡：自己靠右
    function bubble(m) {
        const mine = (m.uid && m.uid === getUid()) || m.nick === getName();
        const wrap = mk('div', 'display:flex;gap:8px;align-items:flex-start;' + (mine ? 'flex-direction:row-reverse;' : ''));
        const av = mk('div', 'width:32px;height:32px;border-radius:50%;background:var(--bg-page);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.1rem;');
        av.innerHTML = iconHTML(m.avatar || '👤', 26, 9999);
        const body = mk('div', 'max-width:74%;');
        const name = mk('div', 'font-size:0.68rem;color:var(--text-muted);margin-bottom:3px;' + (mine ? 'text-align:right;' : ''), esc(m.nick || ''));
        const b = mk('div', 'padding:8px 12px;border-radius:12px;font-size:0.85rem;line-height:1.5;overflow-wrap:break-word;word-break:break-word;background:' + (mine ? 'rgba(59,130,246,0.22)' : 'var(--bg-page)') + ';border:1px solid ' + (mine ? 'var(--accent-blue)' : 'var(--border-color)') + ';' + (mine ? 'border-top-right-radius:3px;' : 'border-top-left-radius:3px;') + 'color:var(--text-primary);', esc(m.text || ''));
        body.appendChild(name); body.appendChild(b);
        wrap.appendChild(av); wrap.appendChild(body);
        return wrap;
    }

    // ══════════════ 协作聊天浮窗 ══════════════
    // 在设计器里协作编辑时使用：独立小窗，不占用画布，随时和团队说话。
    let _chatTimer = null;
    async function openChatOverlay(storyId) {
        if (!_connected) { toast('⚠ ' + T('communityNeedServer', '请先连接社区服务器')); return null; }
        const id = storyId || (_chatOverlay && _chatOverlay.id);
        if (!id) return null;
        // 已开着同一个故事 → 只是重新显示并刷新
        if (_chatOverlay && _chatOverlay.id === id) {
            _chatOverlay.el.style.display = '';
            await refreshChatOverlay();
            return _chatOverlay.el;
        }
        closeChatOverlay();

        const el = mk('div', 'position:fixed;right:14px;bottom:14px;width:300px;max-width:calc(100vw - 20px);height:400px;max-height:66vh;background:var(--bg-card);border:1px solid var(--accent-cyan);border-radius:var(--radius-md);box-shadow:0 12px 40px rgba(0,0,0,0.55);display:flex;flex-direction:column;z-index:10050;overflow:hidden;');
        el.id = 'comm-chat-overlay';
        el.innerHTML = `
            <div id="comm-chat-head" style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--border-color);cursor:move;background:var(--bg-secondary);">
                <span style="font-size:0.85rem;font-weight:700;">💬 ${esc(T('communityTeamChat', '团队聊天'))}</span>
                <span id="comm-chat-online" style="font-size:0.68rem;color:var(--text-muted);"></span>
                <button id="comm-chat-close" style="margin-left:auto;background:none;border:none;color:var(--text-muted);font-size:1rem;cursor:pointer;line-height:1;">✕</button>
            </div>
            <div id="comm-chat-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:10px;"></div>
            <div style="display:flex;gap:6px;padding:8px;border-top:1px solid var(--border-color);">
                <input id="comm-chat-input" style="flex:1;min-width:0;background:var(--bg-page);border:1px solid var(--border-color);color:var(--text-primary);border-radius:8px;padding:7px 10px;font-size:0.8rem;">
                <button id="comm-chat-send" style="background:rgba(34,197,94,0.15);border:1px solid var(--accent-green);color:var(--accent-green);border-radius:8px;padding:7px 12px;font-size:0.78rem;cursor:pointer;">${esc(T('communitySend', '发送'))}</button>
            </div>`;
        document.body.appendChild(el);
        _chatOverlay = { id: id, el: el };

        const inp = el.querySelector('#comm-chat-input');
        inp.placeholder = T('communityChatPh', '和团队说点什么…');
        el.querySelector('#comm-chat-close').addEventListener('click', closeChatOverlay);
        const send = async () => {
            const text = (inp.value || '').trim();
            if (!text) return;
            if (!ensureConnected()) return;
            inp.value = '';
            await postChat(id, text);
            await refreshChatOverlay();
        };
        el.querySelector('#comm-chat-send').addEventListener('click', send);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
        makeChatDraggable(el, el.querySelector('#comm-chat-head'));

        await refreshChatOverlay();
        // 轮询兜底：SSE 不通（App WebView / 网络抖动）时也能看到新消息
        if (_chatTimer) clearInterval(_chatTimer);
        _chatTimer = setInterval(() => {
            if (_chatOverlay) refreshChatOverlay();
            else { clearInterval(_chatTimer); _chatTimer = null; }
        }, 8000);
        return el;
    }

    async function refreshChatOverlay() {
        if (!_chatOverlay) return;
        const id = _chatOverlay.id;
        const data = await fetchStory(id);
        if (!_chatOverlay || _chatOverlay.id !== id) return;
        const list = _chatOverlay.el.querySelector('#comm-chat-list');
        const online = _chatOverlay.el.querySelector('#comm-chat-online');
        if (!list) return;
        if (!data.ok) {
            list.innerHTML = `<div style="font-size:0.75rem;color:var(--text-muted);">🔒 ${esc(T('communityLocked', '该故事仅团队成员可见'))}</div>`;
            return;
        }
        const chat = data.chat || [];
        if (online) {
            const eds = (data.story && data.story.editors) || [];
            online.textContent = eds.length ? '🟢 ' + eds.length + ' ' + T('communityOnline', '在线') : '';
        }
        const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
        list.innerHTML = '';
        if (!chat.length) list.appendChild(mk('div', 'font-size:0.75rem;color:var(--text-muted);', '—'));
        chat.forEach(m => list.appendChild(bubble(m)));
        if (atBottom) list.scrollTop = list.scrollHeight;
    }

    function closeChatOverlay() {
        if (_chatTimer) { clearInterval(_chatTimer); _chatTimer = null; }
        if (_chatOverlay) { try { _chatOverlay.el.remove(); } catch (e) {} _chatOverlay = null; }
    }
    function isChatOverlayOpen() { return !!_chatOverlay; }

    // 浮窗拖动（鼠标 + 触摸）
    function makeChatDraggable(el, handle) {
        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
        const start = (e) => {
            dragging = true;
            const pt = e.touches ? e.touches[0] : e;
            sx = pt.clientX; sy = pt.clientY;
            const r = el.getBoundingClientRect();
            ox = r.left; oy = r.top;
            el.style.left = r.left + 'px'; el.style.top = r.top + 'px';
            el.style.right = 'auto'; el.style.bottom = 'auto';
        };
        const move = (e) => {
            if (!dragging) return;
            const pt = e.touches ? e.touches[0] : e;
            el.style.left = Math.max(4, Math.min(window.innerWidth - 60, ox + pt.clientX - sx)) + 'px';
            el.style.top = Math.max(4, Math.min(window.innerHeight - 40, oy + pt.clientY - sy)) + 'px';
            if (e.cancelable) e.preventDefault();
        };
        const end = () => { dragging = false; };
        handle.addEventListener('mousedown', start);
        handle.addEventListener('touchstart', start, { passive: true });
        document.addEventListener('mousemove', move);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('mouseup', end);
        document.addEventListener('touchend', end);
    }

    // ══════════════ 入口 ══════════════
    function open() {
        if (!identityReady()) { showIdentitySetup(showHome); return; }
        showHome();
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { autoConnect(); });
        else autoConnect();
    }

    return {
        open, openPanel: open, closePanel: () => {},
        showHome, showDetail, showIdentitySetup,
        connect, autoConnect, isConnected, getServer, getServerName, getServerInfo, disconnect,
        // 自动发现
        discover, cancelDiscovery, isScanning, getScan, runDiscovery,
        unifiedUrl, getPort, setPort, mdnsHost, probeOnce, sweepPrefixes,
        setDeepScan, getDeepScan,
        getName, setName, getAvatar, setAvatar,
        // 稳定身份（改昵称不变）+ 历史昵称 + 认领凭据
        getUid, getAliases, rememberAlias, ident,
        mineIds, getClaims, rememberClaim, rememberClaimCode, whoAmI, localIps,
        listStories, fetchStory, shareDesign, pushDesign, deleteStory, joinStory,
        unlock, requestJoin, memberAction, saveSettings, postComment, postChat, postTip,
        downloadStory, downloadJson, openSharedInDesigner, tipStory,
        // 页面导航（设计器「返回」要回到故事主页，而不是主菜单）
        showHome, showDetail,
        // 协作在线状态：光标 / 谁在改哪个节点
        reportPresence, fetchPresence, leavePresence,
        // 世界之种钱包（打赏真转账）+ 协作聊天浮窗
        getMe, getUsers, getWallet, applyWallet, refreshSeedDisplay,
        openChatOverlay, refreshChatOverlay, closeChatOverlay, isChatOverlayOpen,
        onRemoteChange
    };
})();
