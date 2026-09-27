/**
 * 无心之举 — 局域网故事社区服务器（v2：权限 / 团队 / 打赏 / 评论 / 聊天）
 *
 * 零依赖（纯 Node 内置模块），运行：
 *   node server/community.js            （默认端口 8787，可用 PORT=xxxx 覆盖）
 *
 * 功能：
 *   1. 静态托管整个项目（局域网内手机/其他电脑浏览器直接打开 http://<IP>:8787 即玩）
 *   2. 故事 REST API：分享 / 浏览 / 下载 / 更新（版本冲突 409）/ 删除
 *   3. 权限：创建者为管理员（owner），可决定谁可编辑；团队故事（team）需密码或成员才可访问
 *   4. 团队：加入申请 → 管理员审批；团队聊天室
 *   5. 打赏世界之种 + 评论区 + 下载 JSON
 *   6. SSE 实时广播：save/create/join/delete/comment/chat/tip/request/member/settings
 *   7. 数据持久化 server/community-data.json；全接口 CORS *（file:// 与 App WebView 可用）
 *   8. 统一内网地址：内置 mDNS 响应器广播 <name>.local，同 WiFi 下所有人共用一个网址
 *      （默认 http://wuxin.local:8787，无需记 IP；客户端会自动探测它）
 *
 * API 一览：
 *   GET    /api/info                        服务器信息（名字 + 局域网地址 + 统一地址 + 发现标识）
 *   GET    /api/stories?nick=xxx            故事列表（team 故事对非成员只给元信息）
 *   GET    /api/stories/:id?nick=xxx        完整故事（team 且非成员 → 403 locked）
 *   POST   /api/stories                     分享 {author, avatar, design, visibility, password}
 *   PUT    /api/stories/:id                 更新 {author, design, baseVersion} → 409 冲突
 *   DELETE /api/stories/:id                 删除（管理员）
 *   POST   /api/stories/:id/join            加入协作（在线编辑者上报）
 *   GET    /api/stories/:id/presence        在线协作者（光标 / 正在编辑的节点）
 *   POST   /api/stories/:id/presence        上报我的光标与动作（{x,y,node,act}；leave:1 离场）
 *   POST   /api/stories/:id/unlock          团队解锁 {nick, password}
 *   POST   /api/stories/:id/settings        管理员改设置 {actor, visibility, password, allowEdit}
 *   POST   /api/stories/:id/request         申请加入 {nick, avatar, message}
 *   POST   /api/stories/:id/member          成员管理 {actor, nick, action:approve|reject|remove|setrole, role}
 *   POST   /api/stories/:id/comment         评论 {nick, avatar, text}
 *   POST   /api/stories/:id/chat            团队聊天 {nick, avatar, text}
 *   POST   /api/stories/:id/tip             打赏世界之种 {nick, amount}
 *   GET    /api/events                      SSE 事件流（event: story）
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dgram = require('dgram');

const PORT = parseInt(process.env.PORT, 10) || 8787;
const ROOT = path.join(__dirname, '..');
// 数据文件可用环境变量覆盖：测试服务器（8799 等）用独立文件，避免和正式服务器的
// 账户/故事互相污染（历史教训：旧账户的曾用昵称反查会把「同名测试昵称」解析到旧 uid）
const DATA_FILE = process.env.COMMUNITY_DATA
    ? path.resolve(process.env.COMMUNITY_DATA)
    : path.join(__dirname, 'community-data.json');
const SERVER_NAME = process.env.COMMUNITY_NAME || '无心之举 · 局域网故事社区';
const EDITOR_TTL = 10 * 60 * 1000;   // 在线编辑者判定窗口
const MAX_BODY = 30 * 1024 * 1024;   // 30MB（含内嵌图片的故事可能很大）
const MAX_MSGS = 500;                // 每个故事的评论/聊天保留上限

// ── 统一内网地址（mDNS）────────────────────────────────────
// 启动后在局域网广播 <MDNS_NAME>.local，同一 WiFi 下所有设备共用同一个网址，
// 不必再记「http://192.168.x.y:8787」这种会变的 IP。
//   默认 http://wuxin.local:8787
//   自定义名字：MDNS_NAME=mystory node server/community.js
//   关闭：MDNS=0 node server/community.js
const MDNS_NAME = (String(process.env.MDNS_NAME || 'wuxin').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'wuxin');
const MDNS_HOST = MDNS_NAME + '.local';
const MDNS_GROUP = '224.0.0.251';
const MDNS_PORT = 5353;
const MDNS_ENABLED = process.env.MDNS !== '0';
const MDNS_DEBUG = process.env.MDNS_DEBUG === '1';

// ── 数据存储 ──────────────────────────────────────────────
// db = { stories: {...}, users: { [uid]: { uid, nick, avatar, seeds, received, sent, aliases, updatedAt } } }
// 旧数据里 users 以昵称为键、无 uid 字段 → 视为「可认领」，作者回来时迁移到其 uid 账户
let db = { stories: {}, users: {} };
// 每个昵称的初始世界之种（首次出现时发放，和单机初始值一致）
const INIT_SEEDS = parseInt(process.env.INIT_SEEDS, 10) >= 0 ? parseInt(process.env.INIT_SEEDS, 10) : 20;
function loadDb() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if (!db || typeof db !== 'object') db = { stories: {}, users: {} };
            if (!db.stories) db.stories = {};
            if (!db.users || typeof db.users !== 'object') db.users = {};
            Object.entries(db.users).forEach(([k, u]) => {
                if (typeof u.seeds !== 'number') u.seeds = INIT_SEEDS;
                if (typeof u.received !== 'number') u.received = 0;
                if (typeof u.sent !== 'number') u.sent = 0;
                if (typeof u.nick !== 'string' || !u.nick) u.nick = k;
                if (typeof u.uid !== 'string') u.uid = '';   // 空 = 旧版「按昵称存放」，可被认领
                if (!Array.isArray(u.aliases)) u.aliases = [];
            });
            Object.values(db.stories).forEach(normalizeStory);
        }
    } catch (e) {
        console.error('[COMMUNITY] 读取数据文件失败，使用空库：', e.message);
        db = { stories: {}, users: {} };
    }
}
// 兼容旧数据 / 补全新字段
function randToken(n) {
    const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < (n || 8); i++) out += abc[Math.floor(Math.random() * abc.length)];
    return out;
}
function normalizeStory(s) {
    if (s.visibility !== 'team' && s.visibility !== 'public') s.visibility = 'public';
    if (typeof s.password !== 'string') s.password = '';
    if (!s.owner) s.owner = s.author || '';
    // 认领码：创建时下发作者，之后凭它（或本机 / 本地作品凭据）认领旧作品
    if (typeof s.claimToken !== 'string' || !s.claimToken) s.claimToken = randToken(8);
    // uid 是归属的权威标识；旧故事没有 ownerUid，靠 claimStories 在作者回来时补上
    if (typeof s.ownerUid !== 'string') s.ownerUid = '';
    if (typeof s.ownerNick !== 'string') s.ownerNick = '';
    if (!s.members) s.members = {};
    if (!Array.isArray(s.requests)) s.requests = [];
    if (!Array.isArray(s.allowEdit)) s.allowEdit = [];
    // 故事三态模式：open=所有人可玩可自由编辑 / teamedit=所有人可玩仅团队编辑 / private=仅团队（密码进入）
    // 旧数据只有 visibility/allowEdit → 在此推导，向后兼容
    if (s.mode !== 'open' && s.mode !== 'teamedit' && s.mode !== 'private') {
        s.mode = s.visibility === 'team' ? 'private' : (s.allowEdit.length ? 'teamedit' : 'open');
    }
    s.visibility = s.mode === 'private' ? 'team' : 'public'; // 兼容旧字段（列表筛选/旧测试）
    if (!Array.isArray(s.comments)) s.comments = [];
    if (!Array.isArray(s.chat)) s.chat = [];
    if (!Array.isArray(s.tips)) s.tips = [];
    if (typeof s.tipTotal !== 'number') s.tipTotal = s.tips.reduce((a, t) => a + (t.amount || 0), 0);
    if (!s.editors) s.editors = {};
    return s;
}
let saveTimer = null;
function persist() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 1)); }
        catch (e) { console.error('[COMMUNITY] 写入数据失败：', e.message); }
    }, 300);
}

// ── 身份：uid（稳定标识）+ nick（可改的显示名）──────────────
// 归属 / 权限 / 钱包一律按 uid 判定 —— 改昵称不会丢管理员身份，也不会解除「不能打赏自己」。
// 旧客户端 / 旧数据只有昵称：identOf 在没有 uid 时用昵称当身份，保证向后兼容。
function identOf(o) {
    const uid = String((o && o.uid) || '').trim();
    if (uid) return uid.slice(0, 48);
    return String((o && o.nick) || '').trim().slice(0, 24);
}
// 该身份用过的全部昵称（仅显式声明的曾用昵称），用于把旧版按昵称存放的数据迁移到 uid
function aliasListOf(o) {
    const out = [];
    const push = v => { v = String(v || '').trim().slice(0, 24); if (v && out.indexOf(v) < 0) out.push(v); };
    let arr = o && o.aliases;
    if (typeof arr === 'string') {
        const s = arr.trim();
        if (s.charAt(0) === '[') { try { arr = JSON.parse(s); } catch (e) { arr = s.split(','); } }
        else arr = s ? s.split(',') : [];
    }
    if (Array.isArray(arr)) arr.forEach(push);
    // ⚠️ 不把 o.nick 算进别名：当前昵称人人可填，混进来会让冒名者仅凭同名就认领/合并
    return out;
}
function nickOf(o, fallback) {
    const n = String((o && o.nick) || '').trim().slice(0, 24);
    return n || fallback || '匿名';
}
// 把「可能是旧昵称」的 key 解析成现行 uid：账户被合并/迁移后，按 aliases 反查
function resolveId(key) {
    const k = String(key || '').trim().slice(0, 48);
    if (!k) return '';
    if (db.users[k]) return db.users[k].uid || k;
    const hit = Object.values(db.users).find(u => Array.isArray(u.aliases) && u.aliases.indexOf(k) >= 0);
    return hit ? hit.uid : k;
}
// 兼容旧客户端字段：旧版只发 author/name（没有 nick/uid）
function identOfAny(o) { return identOf({ uid: o && o.uid, nick: (o && (o.nick || o.author || o.name)) || '' }); }
function nickOfAny(o, fallback) { return nickOf({ nick: (o && (o.nick || o.author || o.name)) || '' }, fallback); }
// 身份解析（统一入口）：带 uid 直接用（权威）；只带 nick（旧客户端/脚本）→ 解析到已知账户的 uid。
// 与旧版「昵称即身份」语义一致——否则老调用方改名后权限/归属全部失灵。
function resolveId2(o, fallback) {
    const raw = identOfAny(o) || String(fallback || '').trim();
    if (!raw) return '';
    if (o && o.uid) return raw;
    const rid = resolveId(raw);
    return (rid && db.users[rid]) ? rid : raw;
}

// ── 权限（uid 优先，昵称兜底以兼容旧数据）──────────────────
function isAdmin(story, id, nick) {
    if (story.ownerUid) return !!id && story.ownerUid === id;
    return !!nick && nick === story.owner;
}
function isMember(story, id, nick) {
    if (isAdmin(story, id, nick)) return true;
    const m = story.members || {};
    if (id && m[id]) return true;
    if (nick && m[nick]) return true;
    return false;
}
// 是否可编辑（按 uid 判定，昵称兜底兼容旧数据）：
// - open：所有人可自由编辑
// - teamedit / private：管理员、授权名单（旧语义/管理员手动授予）、或「编辑」角色的团队成员
function canEdit(story, id, nick) {
    if (!id && !nick) return false;
    if (isAdmin(story, id, nick)) return true;
    const mode = story.mode || 'open';
    if (mode === 'open') return true;
    if (id && story.allowEdit.indexOf(id) >= 0) return true;
    if (nick && story.allowEdit.indexOf(nick) >= 0) return true;
    if (!isMember(story, id, nick)) return false;
    const m = (id && story.members[id]) || (nick && story.members[nick]) || null;
    return !(m && m.role === 'viewer'); // 只读成员不能改
}
// 是否可读取完整设计：private 仅团队；open / teamedit 所有人可玩
function canRead(story, id, nick) {
    if ((story.mode || 'open') !== 'private') return true;
    return isMember(story, id, nick);
}
// 认领凭据：填个「曾用昵称」就能夺走别人的作品是不行的，必须至少具备其一
//   ① local  —— 请求来自运行服务器的那台电脑（作者本人的机器）
//   ② mine   —— 客户端本地还留着这个故事（本地设计的 communityId 就是它）
//   ③ token  —— 分享时服务器下发的认领码
function hasClaimProof(opts) {
    opts = opts || {};
    if (opts.local) return true;
    if (Array.isArray(opts.mine) && opts.mine.length) return true;
    if (opts.tokens && Object.keys(opts.tokens).length) return true;
    return false;
}
// 把旧版（归属还是昵称、没有真正 uid 主人）的故事认领给该 uid
function claimStories(uid, names, opts) {
    opts = opts || {};
    if (!uid || !hasClaimProof(opts)) return 0;
    const mine = Array.isArray(opts.mine) ? opts.mine : [];
    const tokens = (opts.tokens && typeof opts.tokens === 'object') ? opts.tokens : {};
    const tokenVals = Object.values(tokens).filter(v => typeof v === 'string');
    let n = 0;
    Object.values(db.stories).forEach(s => {
        if (s.ownerUid === uid) return;
        // 已经有真正的 uid 主人 → 谁也不能靠"我以前叫这名字"抢走
        const legacy = !s.ownerUid || s.ownerUid === s.owner || s.ownerUid === s.author;
        if (!legacy) return;
        const ownerKey = s.ownerUid || s.owner || s.author || '';
        const byMine = !!s.id && mine.indexOf(s.id) >= 0;
        const byToken = !!s.claimToken && (tokens[s.id] === s.claimToken || tokenVals.indexOf(s.claimToken) >= 0);
        const byName = !!ownerKey && names.indexOf(ownerKey) >= 0;
        if (!(byMine || byToken || (opts.local && byName))) return;
        s.ownerUid = uid;
        s.ownerNick = s.ownerNick || s.owner || ownerKey;
        n++;
    });
    return n;
}

function pruneEditors(story) {
    const now = Date.now();
    const out = {};
    for (const [name, ts] of Object.entries(story.editors || {})) {
        if (now - ts < EDITOR_TTL) out[name] = ts;
    }
    story.editors = out;
    return Object.keys(out);
}
function touchEditor(story, name) {
    if (!story.editors) story.editors = {};
    if (name) story.editors[name] = Date.now();
    return pruneEditors(story);
}
// ── 用户账户（世界之种钱包）────────────────────────────────
// 账户按 uid 存放（昵称只是显示名）。首次出现自动开户并发放 INIT_SEEDS 个世界之种；
// 若历史昵称下有旧版按昵称存放的账户，会迁移/合并到 uid 账户，改昵称不丢余额。
// 昵称独占：某个名字已经被另一个 uid 认领（当前昵称或曾用昵称）→ 不能再挂到别人名下
function nickTaken(a, id) {
    if (!a) return false;
    return Object.values(db.users).some(u => u.uid && u.uid !== id && u.uid !== a &&
        (u.nick === a || (Array.isArray(u.aliases) && u.aliases.indexOf(a) >= 0)));
    // ⚠️ u.uid === a 的是「昵称当 key 的旧账户」，正是要被认领/合并的对象，不算占用
}
function userOf(uid, nick, avatar, aliases, opts) {
    opts = opts || {};
    let id = String(uid || '').trim().slice(0, 48);
    const name = String(nick || '').trim().slice(0, 24);
    if (!id) id = name || '匿名';                                  // 旧客户端：用昵称当身份
    const canClaim = hasClaimProof(opts);
    const aliasList = (aliases || []).filter(a => a && a !== id && !nickTaken(a, id));
    // 旧账户形态有两种：完全没有 uid（老老版本），或 uid 就是当年的昵称字符串。
    // 两种都要能被「曾用昵称」认领/合并；但别的真实 uid 账户绝不能动。
    const adoptable = a => {
        const l = db.users[a];
        return !!l && l.uid !== id && (!l.uid || l.uid === a);
    };
    if (!db.users[id]) {
        // 首次见到该 uid：把某个历史昵称遗留的旧账户整条搬过来（保留种子与收发记录）
        // ⚠️ 需要认领凭据，否则随便填个曾用昵称就能吞掉别人的钱包
        let adopted = null;
        if (canClaim) {
            for (const a of aliasList) {
                if (adoptable(a)) { adopted = a; break; }
            }
        }
        if (adopted) {
            const rec = db.users[adopted];
            delete db.users[adopted];
            rec.uid = id;
            db.users[id] = rec;
        } else {
            db.users[id] = { uid: id, nick: name || '匿名', avatar: avatar || '', seeds: INIT_SEEDS, received: 0, sent: 0, aliases: [], updatedAt: Date.now() };
        }
    }
    const u = db.users[id];
    u.uid = id;
    if (!Array.isArray(u.aliases)) u.aliases = [];
    // 合并其余历史昵称遗留的旧账户（种子/收发累加），避免改名后余额「消失」
    if (canClaim) aliasList.forEach(a => {
        if (!adoptable(a)) return;
        const l = db.users[a];
        u.seeds = (u.seeds || 0) + (l.seeds || 0);
        u.received = (u.received || 0) + (l.received || 0);
        u.sent = (u.sent || 0) + (l.sent || 0);
        (l.aliases || []).forEach(x => { if (x && u.aliases.indexOf(x) < 0 && x !== id) u.aliases.push(x); });
        delete db.users[a];
    });
    if (name) u.nick = name;
    if (avatar) u.avatar = avatar;
    [name].concat(aliasList).forEach(a => { if (a && u.aliases.indexOf(a) < 0) u.aliases.push(a); });
    u.updatedAt = Date.now();
    return u;
}
function walletOf(id) {
    const key = String(id || '').trim().slice(0, 48);
    const u = db.users[key];
    return {
        uid: key,
        nick: u ? (u.nick || '') : key,
        avatar: u ? u.avatar : '',
        seeds: u ? u.seeds : INIT_SEEDS,
        received: u ? (u.received || 0) : 0,
        sent: u ? (u.sent || 0) : 0
    };
}
// 打赏转账：from → to（故事的 owner / 管理员）。
// 用 uid 判「自己」（改昵称也拦得住）；昵称只在旧客户端里充当身份。
function transferSeeds(fromId, fromNick, fromAvatar, toId, toNick, amount) {
    const from = userOf(fromId, fromNick, fromAvatar);
    const to = userOf(toId, toNick || '');
    if (from.uid === to.uid) return { ok: false, error: 'self', seeds: from.seeds };
    if (from.seeds < amount) return { ok: false, error: 'insufficient', seeds: from.seeds };
    from.seeds -= amount;
    from.sent = (from.sent || 0) + amount;
    to.seeds += amount;
    to.received = (to.received || 0) + amount;
    return { ok: true, from: from, to: to };
}

function metaOf(story, viewerId, viewerNick) {
    const d = story.design || {};
    // ownerUid 可能是旧版「昵称身份」→ 先解析成现行 uid，钱包/显示名才不会张冠李戴
    const ownerId = resolveId(story.ownerUid || story.owner || story.author);
    const ownerWallet = walletOf(ownerId);
    const members = story.members || {};    return {
        id: story.id,
        title: d.title || '未命名故事',
        icon: d.storyIcon || '✨',
        description: d.description || '',
        themeColor: d.themeColor || '',
        // author 是「作者当前昵称」（改名后跟着变）；owner 是稳定 uid
        author: ownerWallet.nick || story.author || '',
        owner: ownerId,
        ownerNick: ownerWallet.nick || story.ownerNick || story.author || '',
        avatar: story.avatar || '',
        version: story.version || 1,
        updatedAt: story.updatedAt || 0,
        visibility: story.visibility || 'public',
        mode: story.mode || 'open',
        lockedTeam: ((story.mode || 'open') === 'private'),
        editors: pruneEditors(story),
        // members 保持「显示名数组」（界面计数 + 旧测试断言）；身份细节在 memberDetails
        members: Object.keys(members).map(k => (members[k] && members[k].nick) || k),
        memberDetails: Object.entries(members).map(([k, v]) => ({
            uid: (v && v.uid) || k,
            nick: (v && v.nick) || k,
            role: (v && v.role) || 'viewer',
            avatar: (v && v.avatar) || ''
        })),
        allowEdit: story.allowEdit || [],
        requests: (story.requests || []).length,
        tipTotal: story.tipTotal || 0,
        tips: (story.tips || []).length,
        comments: (story.comments || []).length,
        chat: (story.chat || []).length,
        // 作者（管理员）当前钱包：打赏会实时进这个账户
        ownerSeeds: ownerWallet.seeds,
        ownerReceived: ownerWallet.received,
        // 「这是不是我的故事」——按 uid 判定，改昵称也认得出
        mine: (!!viewerId || !!viewerNick) && isAdmin(story, viewerId, viewerNick)
    };
}

// ── SSE 广播 ──────────────────────────────────────────────
const sseClients = new Set();
function broadcast(action, story, extra) {
    const payload = JSON.stringify(Object.assign({
        action,
        id: story.id,
        by: (extra && extra.by) || '',
        version: story.version || 1
    }, extra || {}));
    for (const res of sseClients) {
        try { res.write(`event: story\ndata: ${payload}\n\n`); }
        catch (e) { sseClients.delete(res); }
    }
}

// ── 协作在线状态（谁在编辑 / 光标在哪 / 正在改哪个节点）────────────
// 纯内存，不写盘（每秒多次更新，落盘没意义也没必要）；掉线靠 TTL 自动剔除。
//   presence = { [storyId]: { [uid]: { uid, nick, avatar, color, x, y, node, act, ts } } }
// x/y 是蓝图世界坐标（与节点坐标同一坐标系），客户端按自己的缩放/平移换算，
// 于是「别人看到的指针位置」和他自己屏幕上的位置始终对得上。
const presence = {};
const PRESENCE_TTL = 12 * 1000;      // 超过 12s 没有心跳 → 视为已离场
const PRESENCE_FLUSH = 90;           // 广播合并间隔(ms)：光标高频移动也不会刷爆 SSE
const presenceDirty = new Set();     // 待广播的 "storyId|uid"
let presenceTimer = null;
const PEER_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#ec4899', '#0ea5e9', '#84cc16'];
function colorFor(key) {
    let h = 0;
    const s = String(key || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PEER_COLORS[h % PEER_COLORS.length];
}
// 取在线列表（顺手剔除超时未心跳的人）
function presenceList(storyId) {
    const m = presence[storyId];
    if (!m) return [];
    const now = Date.now();
    const out = [];
    Object.keys(m).forEach(uid => {
        const p = m[uid];
        if (!p || now - (p.ts || 0) > PRESENCE_TTL) { delete m[uid]; return; }
        out.push(p);
    });
    if (!Object.keys(m).length) delete presence[storyId];
    return out;
}
// 合并广播：同一人在 PRESENCE_FLUSH 内的多次光标移动只发最后一条
function presenceFlush() {
    presenceTimer = null;
    const keys = Array.from(presenceDirty);
    presenceDirty.clear();
    keys.forEach(key => {
        const i = key.indexOf('|');
        const storyId = key.slice(0, i);
        const story = db.stories[storyId];
        const m = presence[storyId];
        const p = m && m[key.slice(i + 1)];
        if (!story || !p) return;
        broadcast('presence', story, { peer: p });
    });
}
function presenceMark(storyId, uid) {
    presenceDirty.add(storyId + '|' + uid);
    if (!presenceTimer) presenceTimer = setTimeout(presenceFlush, PRESENCE_FLUSH);
}

// ── HTTP 工具 ─────────────────────────────────────────────
function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function sendJson(res, code, obj) {
    cors(res);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', c => {
            size += c.length;
            if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
            chunks.push(c);
        });
        req.on('end', () => {
            try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
            catch (e) { reject(new Error('invalid json')); }
        });
        req.on('error', reject);
    });
}
function qs(urlPath) {
    const i = urlPath.indexOf('?');
    if (i < 0) return {};
    const out = {};
    urlPath.slice(i + 1).split('&').forEach(kv => {
        const [k, v] = kv.split('=');
        if (k) out[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
    });
    return out;
}
// 查询串里的 JSON 参数（客户端用 encodeURIComponent(JSON.stringify(x)) 传）
function jsonQuery(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    try {
        const o = JSON.parse(v);
        if (Array.isArray(fallback)) return Array.isArray(o) ? o : fallback;
        if (o && typeof o === 'object') return o;
    } catch (e) {}
    return fallback;
}
// 请求方 IP（兼容 IPv4-mapped IPv6）
function clientIp(req) {
    const a = (req.socket && req.socket.remoteAddress) || '';
    return String(a).replace(/^::ffff:/, '');
}
// 是否来自「运行服务器的那台电脑」——认领无主旧数据的凭据之一
// 既认 127.0.0.1，也认服务器自己的局域网 IP（本机用 192.168.x.x 打开也算）
function isLocalReq(req) {
    // 测试用：COMMUNITY_TEST_REMOTE=1 时把所有请求都当成「远程客户端」
    if (process.env.COMMUNITY_TEST_REMOTE === '1') return false;
    const ip = clientIp(req);
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    try { return lanAddresses().indexOf(ip) >= 0; } catch (e) { return false; }
}
function pushMsg(arr, msg) {
    arr.push(msg);
    if (arr.length > MAX_MSGS) arr.splice(0, arr.length - MAX_MSGS);
    return arr;
}
function avatarOf(body) { return (body && body.avatar) || ''; }

const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.map': 'application/json', '.txt': 'text/plain; charset=utf-8'
};
function serveStatic(req, res, urlPath) {
    let p = decodeURIComponent(urlPath.split('?')[0]);
    if (p === '/' || p === '') p = '/index.html';
    const filePath = path.normalize(path.join(ROOT, p));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.stat(filePath, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not Found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Content-Length': st.size,
            'Cache-Control': 'no-cache'
        });
        fs.createReadStream(filePath).pipe(res);
    });
}

// ── API 路由 ──────────────────────────────────────────────
async function handleApi(req, res, urlPath) {
    const method = req.method;
    const q = qs(urlPath);
    const me = resolveId2(q);       // 调用者身份（uid 优先；只带 nick → 解析到已知账户）
    const myNick = nickOf(q, '');   // 调用者当前显示名
    const parts = urlPath.split('?')[0].split('/').filter(Boolean); // ['api','stories',id?,sub?]

    if (method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

    if (method === 'GET' && parts[1] === 'info') {
        return sendJson(res, 200, {
            ok: true,
            name: SERVER_NAME,
            port: PORT,
            lan: lanAddresses(),
            // 自动发现用：统一地址 + 本机 IPv4，客户端据此判断「这是不是无心之举社区」
            service: 'unintended-reply-community',
            version: 6,
            unified: MDNS_ENABLED ? mdnsUrl() : '',
            mdns: MDNS_ENABLED ? MDNS_HOST : '',
            host: lanIPv4(),
            stories: Object.keys(db.stories).length
        });
    }
    // GET /api/whoami → 排障用：告诉客户端「服务器看到的你」以及服务器的局域网地址
    if (method === 'GET' && parts[1] === 'whoami') {
        return sendJson(res, 200, {
            ok: true,
            yourIp: clientIp(req),
            local: isLocalReq(req),
            serverIp: lanIPv4(),
            lan: lanAddresses(),
            port: PORT,
            unified: MDNS_ENABLED ? mdnsUrl() : '',
            mdns: MDNS_ENABLED ? MDNS_HOST : ''
        });
    }
    // GET /api/me?uid=&nick=&avatar=&aliases=[]&mine=[]&claims={} → 我的世界之种钱包
    // 首次调用即开户（发放初始种子）；凭认领凭据把历史昵称遗留的旧账户/旧故事认领给这个 uid
    if (method === 'GET' && parts[1] === 'me') {
        if (!me) return sendJson(res, 400, { ok: false, error: 'nick required' });
        const aliases = aliasListOf(q);
        const claimOpts = {
            local: isLocalReq(req),
            mine: jsonQuery(q.mine, []),
            tokens: jsonQuery(q.claims, {})
        };
        const u = userOf(me, myNick, q.avatar || '', aliases, claimOpts);
        const claimed = claimStories(u.uid, aliases, claimOpts);
        persist();
        return sendJson(res, 200, { ok: true, user: walletOf(u.uid), claimed: claimed, local: claimOpts.local });
    }
    // GET /api/users?limit=20 → 世界之种排行（按收到的打赏）
    if (method === 'GET' && parts[1] === 'users') {
        const limit = Math.max(1, Math.min(50, parseInt(q.limit, 10) || 20));
        const users = Object.values(db.users)
            .map(u => walletOf(u.uid || u.nick))
            .sort((a, b) => b.received - a.received || b.seeds - a.seeds)
            .slice(0, limit);
        return sendJson(res, 200, { ok: true, users: users });
    }
    if (parts[1] !== 'stories') return sendJson(res, 404, { ok: false, error: 'unknown api' });
    const id = parts[2] || '';
    const sub = parts[3] || '';

    // GET /api/stories
    if (method === 'GET' && !id) {
        const list = Object.values(db.stories)
            .map(s => metaOf(s, me, myNick))
            .sort((a, b) => b.updatedAt - a.updatedAt);
        return sendJson(res, 200, { ok: true, stories: list });
    }

    // POST /api/stories（分享新故事）
    if (method === 'POST' && !id && !sub) {
        const body = await readBody(req);
        if (!body.design || typeof body.design !== 'object') return sendJson(res, 400, { ok: false, error: 'design required' });
        const newId = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const ownerId = resolveId2(body, me);           // 稳定身份（uid；旧客户端回落到 author 昵称）
        const ownerNick = nickOfAny(body, myNick);      // 显示名（旧客户端的 author/name）
        const story = normalizeStory({
            id: newId,
            author: ownerNick,
            avatar: avatarOf(body),
            owner: ownerNick,
            ownerUid: ownerId,
            ownerNick: ownerNick,
            design: body.design,
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // 三态模式：open=所有人可玩可自由编辑 / teamedit=所有人可玩仅团队编辑 / private=仅团队
            mode: (body.mode === 'open' || body.mode === 'teamedit' || body.mode === 'private')
                ? body.mode
                : (body.visibility === 'team' ? 'private' : 'open'), // 旧客户端只发 visibility
            visibility: body.visibility === 'team' ? 'team' : 'public',
            password: typeof body.password === 'string' ? body.password : '',
            members: {}, // owner 不入 members，靠 isAdmin 判定
            requests: [],
            allowEdit: [],
            comments: [],
            chat: [],
            tips: [],
            tipTotal: 0,
            editors: {}
        });
        touchEditor(story, ownerNick);
        db.stories[newId] = story;
        userOf(ownerId, ownerNick, avatarOf(body), aliasListOf(body)); // 作者开户（收到打赏的账户）
        broadcast('create', story, { by: ownerNick });
        persist();
        // claimToken 只发给作者本人：换设备/改名后凭它（或本机）认领自己的作品
        return sendJson(res, 200, { ok: true, id: newId, version: 1, claimToken: story.claimToken, wallet: walletOf(ownerId) });
    }

    if (!id || !db.stories[id]) return sendJson(res, 404, { ok: false, error: 'story not found' });
    const story = db.stories[id];

    // GET /api/stories/:id
    if (method === 'GET' && !sub) {
        if (!canRead(story, me, myNick)) {
            return sendJson(res, 403, { ok: false, error: 'locked', story: metaOf(story, me, myNick) });
        }
        const myMembership = (story.members && (story.members[me] || story.members[myNick])) || null;
        return sendJson(res, 200, {
            ok: true,
            story: metaOf(story, me, myNick),
            design: story.design,
            comments: story.comments,
            // 聊天室对「团队成员」和「可编辑者」开放 → 协作编辑时也能聊
            chat: (isMember(story, me, myNick) || canEdit(story, me, myNick)) ? story.chat : [],
            tips: story.tips,
            requests: isAdmin(story, me, myNick) ? story.requests : [],
            myRole: isAdmin(story, me, myNick) ? 'admin' : ((myMembership && myMembership.role) || 'viewer'),
            isMember: isMember(story, me, myNick),
            canEdit: canEdit(story, me, myNick),
            wallet: walletOf(me),
            ownerNick: walletOf(resolveId(story.ownerUid || story.owner || '')).nick || story.author || ''
        });
    }

    // PUT /api/stories/:id（保存设计，带版本冲突检查）
    if (method === 'PUT' && !sub) {
        const body = await readBody(req);
        if (!body.design || typeof body.design !== 'object') return sendJson(res, 400, { ok: false, error: 'design required' });
        const actorId = resolveId2(body, me);
        const actorNick = nickOfAny(body, myNick);
        if (!canEdit(story, actorId, actorNick)) return sendJson(res, 403, { ok: false, error: 'no permission' });
        const base = parseInt(body.baseVersion, 10) || 0;
        if (base && base !== story.version) {
            return sendJson(res, 409, { ok: false, error: 'conflict', version: story.version, by: story.lastAuthor || '' });
        }
        story.design = body.design;
        story.version = (story.version || 1) + 1;
        story.updatedAt = Date.now();
        if (actorNick) story.lastAuthor = actorNick;
        touchEditor(story, actorNick);
        broadcast('save', story, { by: actorNick });
        persist();
        return sendJson(res, 200, { ok: true, version: story.version });
    }

    // DELETE /api/stories/:id
    if (method === 'DELETE' && !sub) {
        if (!isAdmin(story, me, myNick)) return sendJson(res, 403, { ok: false, error: 'no permission' });
        delete db.stories[id];
        broadcast('delete', { id: id, version: 0 }, {});
        persist();
        return sendJson(res, 200, { ok: true });
    }

    // ── 子资源 ─────────────────────────────────────────
    // POST /api/stories/:id/join
    if (method === 'POST' && sub === 'join') {
        const body = await readBody(req);
        const editors = touchEditor(story, body.name || '匿名');
        broadcast('join', story, { by: body.name || '匿名' });
        persist();
        return sendJson(res, 200, { ok: true, editors: editors });
    }

    // GET /api/stories/:id/presence → 当前在线协作者（光标位置 / 正在改哪个节点）
    if (method === 'GET' && sub === 'presence') {
        return sendJson(res, 200, { ok: true, peers: presenceList(id) });
    }
    // POST /api/stories/:id/presence → 上报我的光标与动作（高频，客户端已节流）
    // DELETE 或 {leave:1} → 主动离场（关闭设计器 / 关页面）
    if (sub === 'presence' && (method === 'POST' || method === 'DELETE')) {
        const body = (method === 'POST') ? await readBody(req) : {};
        // presence 是新接口（没有旧客户端），只认显式 uid：不让「昵称当身份」的兼容逻辑
        // 造出无名指针，也不给别人冒用同名身份的机会
        const uid0 = String((body && body.uid) || q.uid || '').trim().slice(0, 48);
        const nick0 = nickOfAny(body, myNick);
        if (!uid0) return sendJson(res, 400, { ok: false, error: 'uid required' });
        if (!presence[id]) presence[id] = {};
        if (method === 'DELETE' || body.leave) {
            delete presence[id][uid0];
            broadcast('presence', story, { left: uid0, by: nick0 });
            return sendJson(res, 200, { ok: true, peers: presenceList(id) });
        }
        const prev = presence[id][uid0] || {};
        // 坐标只保留一位小数：光标显示不需要更精确，能省一半流量
        const num = v => (typeof v === 'number' && isFinite(v)) ? Math.round(v * 10) / 10 : 0;
        const state = {
            uid: uid0,
            nick: nick0,
            avatar: String(body.avatar || prev.avatar || '').slice(0, 64), // 'ur-img:<id>' 形态的自定义头像也要放得下
            color: colorFor(uid0),
            x: num(body.x),
            y: num(body.y),
            node: String(body.node || '').slice(0, 64),
            act: String(body.act || 'idle').slice(0, 24),
            ts: Date.now()
        };
        presence[id][uid0] = state;
        presenceMark(id, uid0);
        // 不落盘：presence 是纯内存状态，服务器重启后自然清空
        return sendJson(res, 200, { ok: true, self: state });
    }

    // POST /api/stories/:id/unlock（团队：密码 或 已是成员）
    if (method === 'POST' && sub === 'unlock') {
        const body = await readBody(req);
        const id2 = resolveId2(body), nick = nickOfAny(body, '');
        if (story.visibility !== 'team') return sendJson(res, 200, { ok: true, role: isAdmin(story, id2, nick) ? 'admin' : 'viewer' });
        const mem = story.members[id2] || story.members[nick];
        if (isMember(story, id2, nick)) {
            return sendJson(res, 200, { ok: true, role: isAdmin(story, id2, nick) ? 'admin' : ((mem && mem.role) || 'editor') });
        }
        if (!story.password || body.password === story.password) {
            story.members[id2] = { uid: id2, nick: nick, role: 'editor', joinedAt: Date.now(), avatar: avatarOf(body) };
            pushMsg(story.chat, { id: 'sys_' + Date.now(), nick: '系统', avatar: '🤖', text: nick + ' 加入了团队', ts: Date.now() });
            broadcast('member', story, { by: nick, role: 'editor' });
            persist();
            return sendJson(res, 200, { ok: true, role: 'editor', joined: true });
        }
        return sendJson(res, 401, { ok: false, error: 'wrong password' });
    }

    // POST /api/stories/:id/settings（管理员：可见性 / 密码 / 可编辑名单）
    if (method === 'POST' && sub === 'settings') {
        const body = await readBody(req);
        const actorId = resolveId2({ uid: body.actorUid, nick: body.actor });
        const actorNick = nickOf({ nick: body.actor }, '');
        if (!isAdmin(story, actorId, actorNick)) return sendJson(res, 403, { ok: false, error: 'no permission' });
        if (typeof body.password === 'string') story.password = body.password;
        if (Array.isArray(body.allowEdit)) story.allowEdit = body.allowEdit.filter(n => typeof n === 'string');
        // 三态模式；旧客户端只发 visibility → 按旧语义推导（公开+名单=teamedit，公开无名单=open）
        if (body.mode === 'open' || body.mode === 'teamedit' || body.mode === 'private') story.mode = body.mode;
        else if (body.visibility === 'team') story.mode = 'private';
        else if (body.visibility === 'public') story.mode = (story.allowEdit && story.allowEdit.length) ? 'teamedit' : 'open';
        story.visibility = story.mode === 'private' ? 'team' : 'public';
        story.updatedAt = Date.now();
        broadcast('settings', story, { by: actorNick, visibility: story.visibility });
        persist();
        return sendJson(res, 200, { ok: true, story: metaOf(story, actorId, actorNick) });
    }

    // POST /api/stories/:id/request（申请加入团队）
    if (method === 'POST' && sub === 'request') {
        const body = await readBody(req);
        const id2 = resolveId2(body), nick = nickOfAny(body, '');
        if (!id2) return sendJson(res, 400, { ok: false, error: 'nick required' });
        if (isMember(story, id2, nick)) return sendJson(res, 200, { ok: true, already: true });
        story.requests = story.requests.filter(r => (r.uid || r.nick) !== id2 && r.nick !== nick);
        story.requests.push({ uid: id2, nick: nick, avatar: avatarOf(body), message: (body.message || '').slice(0, 200), ts: Date.now() });
        broadcast('request', story, { by: nick });
        persist();
        return sendJson(res, 200, { ok: true });
    }

    // POST /api/stories/:id/member（管理员：审批 / 移除 / 改角色）
    if (method === 'POST' && sub === 'member') {
        const body = await readBody(req);
        const actorId = resolveId2({ uid: body.actorUid, nick: body.actor });
        const actorNick = nickOf({ nick: body.actor }, '');
        if (!isAdmin(story, actorId, actorNick)) return sendJson(res, 403, { ok: false, error: 'no permission' });
        // 目标成员：uid 优先（新客户端），昵称兜底（旧数据/旧测试）
        const targetId = resolveId2({ uid: body.targetUid, nick: body.nick });
        const targetNick = nickOf({ nick: body.nick }, '');
        const hit = r => ((r.uid || r.nick) === targetId) || (!!targetNick && r.nick === targetNick);
        const action = body.action || 'approve';
        if (action === 'approve') {
            const req2 = story.requests.filter(hit)[0];
            story.requests = story.requests.filter(r => !hit(r));
            const mNick = (req2 && req2.nick) || targetNick || targetId;
            story.members[targetId] = { uid: targetId, nick: mNick, role: body.role || 'editor', joinedAt: Date.now(), avatar: (req2 && req2.avatar) || '' };
            pushMsg(story.chat, { id: 'sys_' + Date.now(), nick: '系统', avatar: '🤖', text: mNick + ' 已加入团队', ts: Date.now() });
            broadcast('member', story, { by: mNick, role: story.members[targetId].role });
        } else if (action === 'reject') {
            story.requests = story.requests.filter(r => !hit(r));
            broadcast('request', story, { by: targetNick, rejected: true });
        } else if (action === 'remove') {
            delete story.members[targetId];
            if (targetNick && targetId !== targetNick) delete story.members[targetNick];
            story.allowEdit = story.allowEdit.filter(n => n !== targetId && n !== targetNick);
            broadcast('member', story, { by: targetNick, removed: true });
        } else if (action === 'setrole') {
            const m = story.members[targetId] || (targetNick && story.members[targetNick]);
            if (m) {
                m.role = body.role || 'editor';
                if (m.role === 'editor') {
                    if (story.allowEdit.indexOf(targetId) < 0) story.allowEdit.push(targetId);
                } else {
                    // 降为只读 → 撤掉授权名单里的记录，否则名单授权会绕过只读角色
                    story.allowEdit = story.allowEdit.filter(n => n !== targetId && n !== targetNick);
                }
                broadcast('member', story, { by: m.nick || targetNick, role: m.role });
            }
        }
        persist();
        return sendJson(res, 200, { ok: true, story: metaOf(story, actorId, actorNick) });
    }

    // POST /api/stories/:id/comment
    if (method === 'POST' && sub === 'comment') {
        const body = await readBody(req);
        const text = (body.text || '').slice(0, 500);
        if (!text) return sendJson(res, 400, { ok: false, error: 'text required' });
        const msg = { id: 'c_' + Date.now() + Math.random().toString(36).slice(2, 6), uid: resolveId2(body), nick: nickOfAny(body, '匿名'), avatar: avatarOf(body), text: text, ts: Date.now() };
        pushMsg(story.comments, msg);
        broadcast('comment', story, { by: msg.nick, msg: msg });
        persist();
        return sendJson(res, 200, { ok: true, comments: story.comments });
    }

    // POST /api/stories/:id/chat（团队聊天）
    if (method === 'POST' && sub === 'chat') {
        const body = await readBody(req);
        const id2 = resolveId2(body), nick = nickOfAny(body, '');
        // 团队成员 或 有编辑权限的人（正在协作编辑的人）都能聊天
        if (!isMember(story, id2, nick) && !canEdit(story, id2, nick)) {
            return sendJson(res, 403, { ok: false, error: 'team members only' });
        }
        const text = (body.text || '').slice(0, 1000);
        if (!text) return sendJson(res, 400, { ok: false, error: 'text required' });
        const msg = { id: 'm_' + Date.now() + Math.random().toString(36).slice(2, 6), uid: id2, nick: nick, avatar: avatarOf(body), text: text, ts: Date.now() };
        pushMsg(story.chat, msg);
        broadcast('chat', story, { by: nick, msg: msg });
        persist();
        return sendJson(res, 200, { ok: true, chat: story.chat });
    }

    // POST /api/stories/:id/tip（打赏世界之种）
    // ⚠️ 真正的转账：打赏者钱包 -amount，故事管理员（owner）钱包 +amount。
    if (method === 'POST' && sub === 'tip') {
        const body = await readBody(req);
        const id2 = resolveId2(body), nick = nickOfAny(body, '匿名');
        const amount = Math.max(1, Math.min(999, parseInt(body.amount, 10) || 1));
        const ownerId = resolveId(story.ownerUid || story.owner || '');
        if (!ownerId) return sendJson(res, 400, { ok: false, error: 'no owner' });
        const ownerNick = walletOf(ownerId).nick || story.ownerNick || story.author || '';

        // uid 判「自己」→ 改了昵称也拦得住自打赏
        const r = transferSeeds(id2, nick, avatarOf(body), ownerId, ownerNick, amount);
        if (!r.ok) {
            // self = 不能打赏自己的故事；insufficient = 世界之种不够
            return sendJson(res, 400, {
                ok: false,
                error: r.error,
                seeds: r.seeds,
                tipTotal: story.tipTotal || 0
            });
        }

        const msg = { uid: id2, nick: r.from.nick, avatar: avatarOf(body), amount: amount, ts: Date.now(), to: ownerId };
        pushMsg(story.tips, msg);
        story.tipTotal = (story.tipTotal || 0) + amount;
        broadcast('tip', story, { by: msg.nick, amount: amount, total: story.tipTotal, ownerSeeds: r.to.seeds });
        persist();
        return sendJson(res, 200, {
            ok: true,
            tipTotal: story.tipTotal,
            seeds: r.from.seeds,                                       // 打赏后「我」的余额
            owner: { nick: r.to.nick, seeds: r.to.seeds, received: r.to.received }
        });
    }

    return sendJson(res, 404, { ok: false, error: 'unknown api' });
}

// ── 服务器 ────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const urlPath = req.url || '/';
    try {
        if (urlPath.startsWith('/api/')) {
            if (urlPath.startsWith('/api/events')) {
                cors(res);
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });
                res.write(`event: hello\ndata: ${JSON.stringify({ name: SERVER_NAME })}\n\n`);
                sseClients.add(res);
                const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 25000);
                req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
                return;
            }
            return await handleApi(req, res, urlPath);
        }
        serveStatic(req, res, urlPath);
    } catch (e) {
        console.error('[COMMUNITY] 请求处理异常：', e);
        try { sendJson(res, 500, { ok: false, error: e.message }); } catch (_) {}
    }
});

function lanAddresses() {
    const out = [];
    const ifs = os.networkInterfaces();
    for (const name of Object.keys(ifs)) {
        for (const it of ifs[name] || []) {
            if (it.family === 'IPv4' && !it.internal) out.push(`http://${it.address}:${PORT}`);
        }
    }
    return out;
}
// 取一个「最像家用局域网」的 IPv4（优先 192.168.*）
function lanIPv4() {
    const ifs = os.networkInterfaces();
    let fallback = '';
    for (const name of Object.keys(ifs)) {
        for (const it of ifs[name] || []) {
            if (it.family !== 'IPv4' || it.internal) continue;
            if (it.address.startsWith('192.168.')) return it.address;
            if (it.address.startsWith('10.') || it.address.startsWith('172.')) {
                if (!fallback) fallback = it.address;
            } else if (!fallback) fallback = it.address;
        }
    }
    return fallback;
}
function mdnsUrl() { return 'http://' + MDNS_HOST + ':' + PORT; }

// ── mDNS 响应器（DNS 报文手写，零依赖）──────────────────────
function mdnsEncodeName(name) {
    const labels = name.split('.').filter(Boolean);
    const bufs = labels.map(l => Buffer.concat([Buffer.from([l.length & 0x3f]), Buffer.from(l, 'ascii')]));
    return Buffer.concat(bufs.concat([Buffer.from([0])]));
}
function mdnsReadName(msg, off) {
    const labels = [];
    let guard = 0;
    while (off < msg.length && guard++ < 128) {
        const len = msg[off];
        if (len === 0) { off += 1; break; }
        if ((len & 0xc0) === 0xc0) {                       // 压缩指针
            if (off + 2 > msg.length) return null;
            const sub = mdnsReadName(msg, ((len & 0x3f) << 8) | msg[off + 1]);
            if (sub) labels.push(sub.name);
            off += 2;
            break;
        }
        if (off + 1 + len > msg.length) return null;
        labels.push(msg.toString('ascii', off + 1, off + 1 + len));
        off += 1 + len;
    }
    return { name: labels.join('.'), next: off };
}
function mdnsParseQuery(msg) {
    if (msg.length < 12) return null;
    if (msg.readUInt16BE(2) & 0x8000) return null;          // 是响应，忽略（避免自己回自己）
    const qd = msg.readUInt16BE(4);
    if (!qd) return null;
    let off = 12;
    const questions = [];
    for (let i = 0; i < qd; i++) {
        const r = mdnsReadName(msg, off);
        if (!r) return null;
        off = r.next;
        if (off + 4 > msg.length) return null;
        const type = msg.readUInt16BE(off);
        off += 4;                                           // type + class
        questions.push({ name: r.name.toLowerCase(), type: type });
    }
    return { id: msg.readUInt16BE(0), questions: questions };
}
function mdnsBuildReply(id, ip) {
    const header = Buffer.alloc(12);
    header.writeUInt16BE(id, 0);
    header.writeUInt16BE(0x8400, 2);                        // QR=1（响应）AA=1（权威）
    header.writeUInt16BE(0, 4);                             // QDCOUNT
    header.writeUInt16BE(1, 6);                             // ANCOUNT
    const name = mdnsEncodeName(MDNS_HOST);
    const rr = Buffer.alloc(10);
    rr.writeUInt16BE(1, 0);                                 // TYPE  A
    rr.writeUInt16BE(0x8001, 2);                            // CLASS IN + cache-flush
    rr.writeUInt32BE(120, 4);                               // TTL
    rr.writeUInt16BE(4, 8);                                 // RDLENGTH
    const rdata = Buffer.from(ip.split('.').map(n => parseInt(n, 10) & 0xff));
    return Buffer.concat([header, name, rr, rdata]);
}
function mdnsStart() {
    if (!MDNS_ENABLED) return;
    const ip = lanIPv4();
    if (!ip) return;
    let sock;
    try { sock = dgram.createSocket({ type: 'udp4', reuseAddr: true }); }
    catch (e) { return; }
    let ok = false;
    sock.on('error', (e) => {
        if (ok) return;
        console.log('  ⚠ 统一地址暂不可用（' + (e.code || e.message) + '），请使用上面的局域网地址');
        try { sock.close(); } catch (_) {}
    });
    sock.on('message', (msg, rinfo) => {
        let q = null;
        try { q = mdnsParseQuery(msg); } catch (e) { return; }
        if (!q) return;
        if (MDNS_DEBUG) {
            console.log('  [mdns] 收到查询 from ' + rinfo.address + ':' + rinfo.port + ' → ' +
                q.questions.map(x => x.name + '/' + x.type).join(', '));
        }
        if (!q.questions.some(x => x.name === MDNS_HOST && (x.type === 1 || x.type === 255))) return;
        const legacy = rinfo.port !== MDNS_PORT;            // 从临时端口发来的单播查询
        const reply = mdnsBuildReply(legacy ? q.id : 0, ip);
        sock.send(reply, 0, reply.length,
            legacy ? rinfo.port : MDNS_PORT,
            legacy ? rinfo.address : MDNS_GROUP,
            () => {
                if (MDNS_DEBUG) console.log('  [mdns] 已应答 → ' + (legacy ? rinfo.address + ':' + rinfo.port : '组播') + ' = ' + ip);
            });
    });
    sock.bind(MDNS_PORT, () => {
        ok = true;
        try { sock.addMembership(MDNS_GROUP); } catch (e) {}
        try { sock.setMulticastTTL(255); } catch (e) {}
        // 主动公告几次，让同网设备更快发现（无需等它先问）
        const announce = () => {
            try { const p = mdnsBuildReply(0, ip); sock.send(p, 0, p.length, MDNS_PORT, MDNS_GROUP, () => {}); } catch (e) {}
        };
        announce();
        setTimeout(announce, 1000);
        setTimeout(announce, 3000);
    });
}

loadDb();
server.listen(PORT, () => {
    console.log('==============================================');
    console.log('  ' + SERVER_NAME);
    console.log('  本机访问:   http://localhost:' + PORT);
    for (const a of lanAddresses()) console.log('  局域网访问: ' + a);
    if (MDNS_ENABLED) console.log('  统一地址:   ' + mdnsUrl() + '   ← 同一 WiFi 下所有设备都用这个');
    console.log('  数据文件:   ' + DATA_FILE);
    console.log('  关闭服务:   Ctrl+C（已分享的故事会保留在数据文件里）');
    console.log('==============================================');
    mdnsStart();
});
