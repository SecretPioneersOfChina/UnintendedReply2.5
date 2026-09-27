/**
 * storyBlaze.js - 雷霆涅槃 (blaze_ch1-4)
 * 《无心之举 / Unintended Reply》
 *
 * 完全原创热血番。世界·人物·剧情均为原创（OC）。
 *
 * ── 世界观 ──
 * 近未来都市「新穹市」：城市中央悬浮着巨型能源核心「天穹之核」，
 * 驱动整座城市的电力与科技。人类通过植入「源脉」获得异能，
 * 分为七系：炽(火)/霆(雷)/冰/岩/风/灵(感知精神)/暗(禁忌)。
 * 等级由低到高：D / C / B / A / S。官方守护者组织「白塔」维护秩序；
 * 一个名为「溯夜会」的神秘组织正觊觎天穹之核。
 *
 * ── 角色（全部 OC）──
 * 凌澈  Ling Che   —— 17岁，B级「霆」系。前 S 级霆王遗孤，热血坦率。
 * 苏晚晴 Su Wanqing —— 17岁，A级「灵」系。感知精神，冷静理性，青梅竹马。
 * 王大柱 Wang Dazhu —— 18岁，C级「岩」系。肌肉笨蛋，讲义气的死党。
 * 林小满 Lin Xiaoman —— 16岁，D级「风」系。情报天才，机灵跳脱。
 * 沈孤鸿 Shen Guhong —— 前 S 级「冰」系，白塔教官，凌澈的养父与师父。
 * 白瞳  Bai Tong    —— 「溯夜会」首领，S级「暗」系，白发白瞳。
 *
 * ── 剧情线 ──
 * 第一章·天穹异变：城市电力被「暗蚀」污染，异能者集体失控。
 * 第二章·溯夜之影：追查肇事组织，集结小队，揭开天穹之核的旧闻。
 * 第三章·白瞳降临：白瞳夺取天穹之核，凌澈的身世与师父的过去浮出水面。
 * 第四章·雷霆涅槃：最终决战，霆王觉醒，多结局。
 *
 * ── 玩法变量 ──
 * power（源能）、clue（线索）、bond（羁绊）
 * flag_truth（身世真相）、flag_save_all（全员平安）
 *
 * ── 结局（4 个）──
 * blaze_perfect · 守护者传说   blaze_good · 黎明之后
 * blaze_hidden  · 孤鸿之约     blaze_bad  · 熄灭的灯火
 */

// ========== 角色 ==========
var character_lingche = {
    id: 'lingche', nameKey: 'blazeCharLingChe', color: '#f59e0b', avatar: '⚡',
    description: '17岁，B级「霆」系异能者。前 S 级霆王遗孤，热血坦率。'
};
var character_wanqing = {
    id: 'wanqing', nameKey: 'blazeCharWanQing', color: '#60a5fa', avatar: '🔮',
    description: '17岁，A级「灵」系异能者。感知精神，冷静理性。'
};
var character_dazhu = {
    id: 'dazhu', nameKey: 'blazeCharDaZhu', color: '#f87171', avatar: '🪨',
    description: '18岁，C级「岩」系异能者。肌肉笨蛋，讲义气。'
};
var character_xiaoman = {
    id: 'xiaoman', nameKey: 'blazeCharXiaoMan', color: '#34d399', avatar: '🌪️',
    description: '16岁，D级「风」系异能者。情报天才，机灵跳脱。'
};
var character_shen = {
    id: 'shen', nameKey: 'blazeCharShen', color: '#38bdf8', avatar: '❄️',
    description: '前 S 级「冰」系异能者，白塔教官，凌澈的养父与师父。'
};
var character_baitong = {
    id: 'baitong', nameKey: 'blazeCharBaiTong', color: '#a78bfa', avatar: '👁️',
    description: '「溯夜会」首领，S级「暗」系，白发白瞳的谜之男人。'
};

// ========== 动态注册 i18n ==========
if (typeof I18N !== 'undefined' && I18N.strings) {
    I18N.strings.zh['endingBlaze'] = '雷霆涅槃';
    I18N.strings.en['endingBlaze'] = 'Thunder Rebirth';
    I18N.strings.ja['endingBlaze'] = '雷霆涅槃';

    // 角色名
    I18N.strings.zh['blazeCharLingChe'] = '凌澈';
    I18N.strings.en['blazeCharLingChe'] = 'Ling Che';
    I18N.strings.ja['blazeCharLingChe'] = '凌澈';
    I18N.strings.zh['blazeCharWanQing'] = '苏晚晴';
    I18N.strings.en['blazeCharWanQing'] = 'Su Wanqing';
    I18N.strings.ja['blazeCharWanQing'] = '蘇晚晴';
    I18N.strings.zh['blazeCharDaZhu'] = '王大柱';
    I18N.strings.en['blazeCharDaZhu'] = 'Wang Dazhu';
    I18N.strings.ja['blazeCharDaZhu'] = '王大柱';
    I18N.strings.zh['blazeCharXiaoMan'] = '林小满';
    I18N.strings.en['blazeCharXiaoMan'] = 'Lin Xiaoman';
    I18N.strings.ja['blazeCharXiaoMan'] = '林小満';
    I18N.strings.zh['blazeCharShen'] = '沈孤鸿';
    I18N.strings.en['blazeCharShen'] = 'Shen Guhong';
    I18N.strings.ja['blazeCharShen'] = '沈孤鴻';
    I18N.strings.zh['blazeCharBaiTong'] = '白瞳';
    I18N.strings.en['blazeCharBaiTong'] = 'Bai Tong';
    I18N.strings.ja['blazeCharBaiTong'] = '白瞳';

    // 章节标题
    I18N.strings.zh['blazeCh1Title'] = '第一章 · 天穹异变';
    I18N.strings.en['blazeCh1Title'] = 'Ch.1 · The Sky Anomaly';
    I18N.strings.ja['blazeCh1Title'] = '第一章 · 天穹異変';
    I18N.strings.zh['blazeCh1Sub'] = '天穹之核的辉光第一次蒙上阴影，整座城市的异能者开始失控';
    I18N.strings.en['blazeCh1Sub'] = 'For the first time, the light of the Sky Core dims — and espers across the city begin to lose control';
    I18N.strings.ja['blazeCh1Sub'] = '天穹の核の輝きが初めて曇り、街中の異能者が暴走し始める';

    I18N.strings.zh['blazeCh2Title'] = '第二章 · 溯夜之影';
    I18N.strings.en['blazeCh2Title'] = 'Ch.2 · Shadows of Suye';
    I18N.strings.ja['blazeCh2Title'] = '第二章 · 溯夜の影';
    I18N.strings.zh['blazeCh2Sub'] = '一支名为「溯夜会」的暗影浮现，而师父沈孤鸿似乎知道些什么';
    I18N.strings.en['blazeCh2Sub'] = 'A shadowy group called "Suye" surfaces — and Master Shen seems to know something';
    I18N.strings.ja['blazeCh2Sub'] = '「溯夜会」と呼ばれる影が浮上し、師匠の沈孤鴻は何かを知っているようだ';

    I18N.strings.zh['blazeCh3Title'] = '第三章 · 白瞳降临';
    I18N.strings.en['blazeCh3Title'] = 'Ch.3 · White Pupil Descends';
    I18N.strings.ja['blazeCh3Title'] = '第三章 · 白瞳降臨';
    I18N.strings.zh['blazeCh3Sub'] = '天穹之核被夺走的那一刻，凌澈终于知道了自己是谁的儿子';
    I18N.strings.en['blazeCh3Sub'] = 'The moment the Sky Core is taken, Ling Che finally learns whose son he is';
    I18N.strings.ja['blazeCh3Sub'] = '天穹の核が奪われた瞬間、凌澈は自分が誰の子かを知る';

    I18N.strings.zh['blazeCh4Title'] = '第四章 · 雷霆涅槃';
    I18N.strings.en['blazeCh4Title'] = 'Ch.4 · Thunder Rebirth';
    I18N.strings.ja['blazeCh4Title'] = '第四章 · 雷霆涅槃';
    I18N.strings.zh['blazeCh4Sub'] = '当所有雷光归于一人，被封印的霆王血脉于今夜苏醒';
    I18N.strings.en['blazeCh4Sub'] = 'When all lightning returns to a single heart, the sealed bloodline of the Thunder King awakens tonight';
    I18N.strings.ja['blazeCh4Sub'] = 'すべての雷光が一人に帰る時、封印された霆王の血脈が今夜目覚める';

    // 结局
    I18N.strings.zh['blazeEndPerfectTitle'] = '守护者传说';
    I18N.strings.en['blazeEndPerfectTitle'] = 'Legend of the Guardians';
    I18N.strings.ja['blazeEndPerfectTitle'] = '守護者の伝説';
    I18N.strings.zh['blazeEndPerfectDesc'] = '九霄霆王炮贯穿白瞳的暗幕，天穹之核恢复纯净。新穹市第一次响起为守护者而鸣的钟声——凌澈带着小队站在白塔之巅，成为新的传说。';
    I18N.strings.en['blazeEndPerfectDesc'] = 'The Sky-Shattering Thunder Cannon pierces Bai Tong\'s dark veil, and the Sky Core is restored pure. For the first time, the bells ring for the guardians of Xinqiong City — Ling Che stands atop the White Tower with his team, a new legend born.';
    I18N.strings.ja['blazeEndPerfectDesc'] = '九霄霆王砲が白瞳の暗幕を貫き、天穹の核は純粋さを取り戻す。新穹市に初めて守護者のために鐘が鳴る——凌澈は仲間と共に白塔の頂に立ち、新たな伝説となる。';

    I18N.strings.zh['blazeEndGoodTitle'] = '黎明之后';
    I18N.strings.en['blazeEndGoodTitle'] = 'After Dawn';
    I18N.strings.ja['blazeEndGoodTitle'] = '夜明けのあと';
    I18N.strings.zh['blazeEndGoodDesc'] = '白瞳被击败，天穹之核却在最后一刻碎裂。城市失去了永夜后的第一缕晨光，也失去了倚仗千年的力量。凌澈握紧伙伴们的手：「没有晶核的城，我们自己来照亮。」';
    I18N.strings.en['blazeEndGoodDesc'] = 'Bai Tong is defeated, but the Sky Core shatters in the final moment. The city loses its first light after eternal night — and the power it leaned on for a millennium. Ling Che grips his friends\' hands: "No core? Then we\'ll light this city ourselves."';
    I18N.strings.ja['blazeEndGoodDesc'] = '白瞳は倒されたが、天穹の核は最後の瞬間に砕けた。街は永夜の後の初光を失い、千年頼りにしてきた力も失う。凌澈は仲間の手を握る：「核がなくても、俺たちがこの街を照らす。」';

    I18N.strings.zh['blazeEndHiddenTitle'] = '孤鸿之约';
    I18N.strings.en['blazeEndHiddenTitle'] = 'The Lone Goose\'s Promise';
    I18N.strings.ja['blazeEndHiddenTitle'] = '孤鴻の約束';
    I18N.strings.zh['blazeEndHiddenDesc'] = '「别哭，澈儿。师父只是去赴一个十二年前的约。」沈孤鸿以 S 级冰系本源冻结了白瞳的暗蚀，将自己的源脉燃尽。凌澈抱着逐渐透明的师父，第一次喊出了「父亲」。';
    I18N.strings.en['blazeEndHiddenDesc'] = '"Don\'t cry, Che\'er. Your master is only going to keep a twelve-year-old promise." Shen Guhong freezes Bai Tong\'s dark erosion with the very source of his S-class ice, burning out his own life. Ling Che holds his fading master and, for the first time, cries "Father."';
    I18N.strings.ja['blazeEndHiddenDesc'] = '「泣くな、澈。師匠は十二年前の約束を果たしに行くだけだ。」沈孤鴻はS級氷の本源で白瞳の暗蝕を凍てつかせ、自らの源脈を燃やし尽くす。凌澈は透明になっていく師匠を抱きしめ、初めて「父」と叫ぶ。';

    I18N.strings.zh['blazeEndBadTitle'] = '熄灭的灯火';
    I18N.strings.en['blazeEndBadTitle'] = 'The Quenched Light';
    I18N.strings.ja['blazeEndBadTitle'] = '消えた灯火';
    I18N.strings.zh['blazeEndBadDesc'] = '霆王炮在暗幕前熄灭，天穹之核被白瞳夺走，新穹市坠入黑暗。废墟中，苏晚晴擦去凌澈脸上的灰，声音平静：「澈，我们还没输。灯灭了，就再点一盏。」';
    I18N.strings.en['blazeEndBadDesc'] = 'The Thunder Cannon dies before the dark veil, the Sky Core is taken by Bai Tong, and Xinqiong City falls into darkness. In the ruins, Su Wanqing wipes the ash from Ling Che\'s face and says calmly: "Che, we haven\'t lost. If the lamp is out, light another."';
    I18N.strings.ja['blazeEndBadDesc'] = '霆王砲は暗幕の前に消え、天穹の核は白瞳に奪われ、新穹市は闇に堕ちる。瓦礫の中で、蘇晚晴は凌澈の顔の灰を拭い、静かに言う：「澈、私たちはまだ負けてない。灯りが消えたら、もう一度点ければいい。」';
}

// ========== 动态注册结局定义 ==========
var blazeEndings = {
    blaze_perfect: {
        id: 'blaze_perfect', type: 'blaze', icon: '⚡',
        titleKey: 'blazeEndPerfectTitle', descKey: 'blazeEndPerfectDesc',
        condition: function() { return false; } // 由场景 isEnding 触发
    },
    blaze_good: {
        id: 'blaze_good', type: 'blaze', icon: '🌅',
        titleKey: 'blazeEndGoodTitle', descKey: 'blazeEndGoodDesc',
        condition: function() { return false; }
    },
    blaze_hidden: {
        id: 'blaze_hidden', type: 'blaze', icon: '❄️',
        titleKey: 'blazeEndHiddenTitle', descKey: 'blazeEndHiddenDesc',
        condition: function() { return false; }
    },
    blaze_bad: {
        id: 'blaze_bad', type: 'blaze', icon: '🌑',
        titleKey: 'blazeEndBadTitle', descKey: 'blazeEndBadDesc',
        condition: function() { return false; }
    }
};
Object.keys(blazeEndings).forEach(function(id) {
    window.ENDINGS[id] = blazeEndings[id];
});

// ========== 第一章：天穹异变 ==========
var blaze_ch1 = {
    id: 'blaze_ch1',
    titleKey: 'blazeCh1Title',
    subtitleKey: 'blazeCh1Sub',
    startScene: 'blaze_ch1_intro',
    narrator: txt(
        '新穹市，悬浮于城市上空的天穹之核散发着永恒的白昼之光。源脉植入手术后的第十七年，你——凌澈，B 级「霆」系异能者——正翘着课在天桥栏杆上晒太阳。突然，整座城市的灯光像被掐住喉咙一样，齐刷刷地暗了三秒。',
        'Xinqiong City — the Sky Core floating above casts an eternal midday glow. Seventeen years after your Source Vein implant, you — Ling Che, B-class "Thunder" esper — are skipping class, sunbathing on a bridge railing. Suddenly, every light in the city dims for three seconds, as if gripped by the throat.',
        '新穹市、上空に浮かぶ天穹の核が永遠の白昼の光を放つ。源脈移植から十七年——あなた、凌澈、B級「霆」系異能者——は授業をサボって歩道橋の欄干で日向ぼっこをしている。突然、街中の灯りが喉を掴まれたように三秒間暗くなった。'
    ),
    scenes: {
        /* 开篇：白塔档案登记（输入姓名 → 输入年龄 → 进入正片） */
        blaze_ch1_intro: {
            input: {
                variable: 'player_name',
                inputType: 'text',
                prompt: txt(
                    '【白塔·源脉档案登记】检测到未登记的「霆」系源脉波动——报上你的名字，异能者。',
                    '[White Tower · Source Vein Registry] Unregistered "Thunder" vein detected — state your name, esper.',
                    '【白塔・源脈登録】未登録の「霆」系源脈波動を検出——名を名乗れ、異能者。'
                )
            },
            nextScene: 'blaze_ch1_ask_age'
        },
        blaze_ch1_ask_age: {
            input: {
                variable: 'player_age',
                inputType: 'number',
                prompt: txt(
                    '{player_name}……好名字。源脉共振强度会随年龄漂移，最后一步登记：你的年龄？',
                    '{player_name}... a fine name. Vein resonance drifts with age — final entry: your age?',
                    '{player_name}……いい名だ。源脈の共振は年齢で揺らぐ。最後の登録だ：年齢は？'
                )
            },
            nextScene: 'blaze_ch1_start'
        },

        /* 开篇：灯光熄灭 */
        blaze_ch1_start: {
            messages: [
                makeNarrator(txt(
                    '三秒的黑暗之后，天穹之核重新亮起——但颜色不对。原本的白昼之光泛起了淡淡的紫黑色，像一滴墨落进清水里。桥下的街道传来尖叫：一辆悬浮车失控地冲向人群。',
                    'After three seconds of darkness, the Sky Core reignites — but the color is wrong. The daylight glow now carries a faint violet-black tint, like a drop of ink in clear water. Screams rise from the street below: a hover-car veers out of control toward the crowd.',
                    '三秒の暗闇の後、天穹の核が再び輝く——だが色がおかしい。白昼の光に薄紫の黒が混じり、清水に落ちた墨のようだ。橋の下の通りから悲鳴が上がる：暴走したホバーカーが群衆へ突っ込もうとしている。'
                )),
                makeCharacter('lingche', txt(
                    '「喂喂喂……这种时候就别讲什么『维护治安』了！」',
                    '"Whoa whoa whoa... times like this, forget about \'maintaining public order\'!"',
                    '「おいおいおい……こんな時は『治安維持』なんて言ってる場合じゃない！」'
                )),
                makeSystem(txt(
                    '📡 城市警报：全区域异能者失控报告激增。白塔已启动一级响应。\n⚠️ 你脚下的天桥，正在震动。',
                    '📡 City Alert: reports of espers losing control surge across all districts. The White Tower has activated Level-1 response.\n⚠️ The bridge beneath you is trembling.',
                    '📡 都市警報：全域で異能者の暴走報告が急増。白塔はレベル1対応を発動。\n⚠️ 足元の歩道橋が震えている。'
                ))
            ],
            playerReply: txt('失控的悬浮车、紫黑色的天穹之核、脚底震动的天桥——事情绝不简单。', 'A runaway hover-car, a violet-black Sky Core, a trembling bridge — nothing about this is simple.', '暴走するホバーカー、紫黒の天穹の核、震える歩道橋——話は単純じゃない。'),
            choices: [
                makeChoice(txt('⚡ 纵身跃下，用电流逼停失控的悬浮车', `⚡ Leap down and stop the runaway hover-car with a current surge`, `⚡ 飛び降り、電流で暴走ホバーカーを止める`), 'blaze_ch1_hovercar', { power: 10 }, 'truth', txt('电弧在你指间炸开。', 'Arcs burst between your fingers.', '指先で電弧が炸裂する。'), 'perfect'),
                makeChoice(txt('🔮 先联络苏晚晴——让她用感知定位失控的源头', `🔮 Contact Su Wanqing first — use her perception to locate the source`, `🔮 蘇晚晴に連絡——彼女の感知で暴走の源を特定`), 'blaze_ch1_contact', { clue: 1, bond: 1 }, 'empathy', txt('通讯器里传来她冷静的声音。', 'Her calm voice comes through the comm.', '通信機から彼女の冷静な声が聞こえる。'), 'good'),
                makeChoice(txt('🏃 冲下天桥，在混乱中疏散人群', `🏃 Race down the bridge and evacuate the crowd in the chaos`, `🏃 歩道橋を駆け下り、混乱の中で群衆を避難させる`), 'blaze_ch1_evac', { bond: 2 }, 'risk', txt('你逆着人流冲进混乱的中心。', 'You charge into the heart of the chaos, against the tide.', '人波に逆らって混乱の中心へ突っ込む。'), 'neutral')
            ]
        },

        /* 逼停悬浮车 */
        blaze_ch1_hovercar: {
            messages: [
                makeNarrator(txt(
                    '你从天桥跃下，落地时爆开一圈电弧。失控的悬浮车车头已经撞翻了两辆路边的摩托。你抬手，五指张开——蓝色的雷光编织成网，罩住车头。金属在电流中发出尖锐的哀鸣，车轮离地三厘米，硬生生悬停在半空。',
                    'You leap off the bridge, landing with a burst of arcs. The runaway hover-car has already flipped two motorcycles by the roadside. You raise your hand, fingers spread — blue lightning weaves into a net, catching the hood. The metal shrieks as the wheels lift three centimeters, frozen mid-air.',
                    '歩道橋から飛び降り、着地と同時に電弧が炸裂する。暴走ホバーカーは道端のバイク二台を既に跳ね飛ばしていた。手を掲げ、五指を広げる——青い雷光が網を編み、車体を包む。金属が鋭い悲鳴を上げ、車輪が三センチ浮き上がり、空中で静止する。'
                )),
                makeCharacter('lingche', txt(
                    '「呼……好险。喂，车里的人没事吧——」话音未落，驾驶座上的人猛地抬头。他的瞳孔里，浮着一抹和天穹之核一模一样的紫黑色。',
                    '"Phew... close one. Hey, you okay in there—" Before you finish, the driver snaps his head up. In his pupils floats the same violet-black as the Sky Core.',
                    '「ふぅ……危なかった。おい、中の人は無事か——」言い終わらないうちに、運転席の男が顔を上げる。その瞳に、天穹の核と同じ紫黒が浮かんでいる。'
                )),
                makeSystem(txt(
                    '⚠️ 检测到「暗蚀」痕迹：一种污染源脉的异常能量，正从天穹之核方向扩散。',
                    '⚠️ Traces of "Dark Erosion" detected: an anomalous energy polluting Source Veins, spreading from the direction of the Sky Core.',
                    '⚠️ 「暗蝕」の痕跡を検出：源脈を汚染する異常エネルギーが、天穹の核の方向から広がっている。'
                ))
            ],
            playerReply: txt('紫黑色的瞳孔。这不是失控——是有人在污染这座城市。', 'Violet-black pupils. This isn\'t losing control — someone is poisoning the city.', '紫黒の瞳。これは暴走じゃない——誰かがこの街を汚染している。'),
            choices: [
                makeChoice(txt('⚡ 用雷网困住驾驶员，检查他体内的暗蚀', `⚡ Trap the driver in a lightning net and examine the erosion inside him`, `⚡ 雷網で運転手を拘束し、体内の暗蝕を調べる`), 'blaze_ch1_aftermath', { clue: 1, power: 5 }, 'truth', txt('电流如探针般渗入他的源脉。', 'Your current probes into his Source Vein.', '電流が探針のように彼の源脈に滲みる。'), 'good'),
                makeChoice(txt('📞 立刻把异常报告给白塔——这是全域事件', `📞 Immediately report the anomaly to the White Tower — this is city-wide`, `📞 直ちに白塔へ異常を報告——これは全域規模の事件だ`), 'blaze_ch1_report', { clue: 1, bond: 1 }, 'truth', txt('通讯接通的瞬间，你听见了师父的声音。', 'The moment the line connects, you hear your master\'s voice.', '通信が繋がった瞬間、師匠の声が聞こえる。'), 'perfect')
            ]
        },

        /* 联络晚晴 */
        blaze_ch1_contact: {
            messages: [
                makeCharacter('wanqing', txt(
                    '「{player_name}，听我说。天穹之核的共振频率被篡改了——有人在向全城的源脉广播一段『污染指令』。我已经锁定了信号的大致方向：中央塔的地下。」',
                    '"{player_name}, listen. The Sky Core\'s resonance frequency has been tampered with — someone is broadcasting a \'pollution command\' to every Source Vein in the city. I\'ve narrowed the signal\'s direction: beneath the Central Tower."',
                    '「{player_name}、聞いて。天穹の核の共振周波数が改竄されている——誰かが全市の源脈へ『汚染指令』を放送している。信号のおおよその方向は特定した：中央塔の地下。」'
                )),
                makeNarrator(txt(
                    '通讯那头，苏晚晴的声音一如既往地平静，但你听得出来——她在用感知扫过整座城市，消耗极大。隐约有汗水滴落在键盘上的声音。',
                    'On the other end, Su Wanqing\'s voice is as calm as ever, but you can tell — she is sweeping the entire city with her perception, exhausting herself. The faint sound of sweat dripping onto a keyboard.',
                    '通信の向こうで、蘇晚晴の声は相変わらず落ち着いている。だが分かる——彼女は感知で街全体を走査し、大きく消耗している。汗がキーボードに落ちる微かな音。'
                )),
                makeCharacter('lingche', txt(
                    '「喂，晚晴！别硬撑——我马上过去！」',
                    '"Hey, Wanqing! Don\'t push yourself — I\'m coming over!"',
                    '「おい、晚晴！無理するな——今行く！」'
                ))
            ],
            playerReply: txt('中央塔的地下……那里是白塔的禁区，也是师父沈孤鸿的驻地。', 'Beneath the Central Tower... that\'s the White Tower\'s restricted zone — and your master Shen Guhong\'s post.', '中央塔の地下……そこは白塔の立ち入り禁止区域で、師匠の沈孤鴻の駐屯地でもある。'),
            choices: [
                makeChoice(txt('🚀 全力赶往中央塔与晚晴汇合', `🚀 Rush at full speed to the Central Tower to meet Wanqing`, `🚀 全力で中央塔へ——晚晴と合流する`), 'blaze_ch1_tower', { power: 5, bond: 2 }, 'empathy', txt('雷光在你脚下铺成一条道。', 'Lightning paves a road beneath your feet.', '雷光が足元に道を敷く。'), 'good')
            ]
        },

        /* 疏散人群 */
        blaze_ch1_evac: {
            messages: [
                makeNarrator(txt(
                    '你冲进商业广场。失控的不只是车辆——一名 C 级「炽」系异能者的掌心正在凝聚失控的火球，他痛苦地抱着头：「我……停不下来！」你冲上去，抓住他的手腕，将自己的电流灌入他的源脉，用「霆」压制「炽」。',
                    'You charge into the plaza. It\'s not just vehicles — a C-class "Blaze" esper is forming a fireball out of control, clutching his head in pain: "I... can\'t stop!" You grab his wrist, pouring your current into his Source Vein, using Thunder to suppress Blaze.',
                    '商業広場に飛び込む。暴走しているのは車だけじゃない——C級「熾」系異能者の掌に制御不能の火球が凝縮している。彼は頭を抱えて苦しむ：「俺……止められない！」手首を掴み、電流を彼の源脈に流し込み、「霆」で「熾」を抑え込む。'
                )),
                makeCharacter('dazhu', txt(
                    '「{player_name}哥——！我就知道你会在这儿！刚才岩系的能力也差点暴走，被我硬按回去了，嘿嘿！」',
                    '"{player_name}—! Knew you\'d be here! My Rock-class power nearly went wild too, but I slammed it back down, heh!"',
                    '「{player_name}兄——！ここにいると思ったぜ！俺の岩系も暴走しかけたけど、力で押さえ込んだぜ、へへ！」'
                )),
                makeCharacter('lingche', txt(
                    '「大柱，来得正好！用岩壁封住广场四个出口，别让失控者跑出去伤到人！」',
                    '"Dazhu, perfect timing! Seal the four exits with rock walls so no one out of control gets out and hurts people!"',
                    '「大柱、ちょうどいい！岩壁で広場の四つの出口を塞げ。暴走者が外に出て人を傷つけるな！」'
                ))
            ],
            playerReply: txt('王大柱——C 级「岩」系，全校最壮的肌肉笨蛋，也是你最可靠的后背。', 'Wang Dazhu — C-class "Rock", the strongest muscle-head in school, and your most reliable backup.', '王大柱——C級「岩」系、全校一の筋肉バカ、そして最も頼れる背中。'),
            choices: [
                makeChoice(txt('🧱 与大柱并肩封锁广场，再追查暗蚀来源', `🧱 Seal the plaza shoulder-to-shoulder with Dazhu, then trace the erosion`, `🧱 大柱と肩を並べて広場を封鎖し、暗蝕の出所を追う`), 'blaze_ch1_aftermath', { bond: 2, clue: 1 }, 'empathy', txt('你拍了拍大柱的背。', 'You pat Dazhu on the back.', '大柱の背中を叩く。'), 'good'),
                makeChoice(txt('📞 同时联络白塔与晚晴，双线并进', `📞 Contact both the White Tower and Wanqing — advance on two fronts`, `📞 白塔と晚晴の両方に連絡——二線で進む`), 'blaze_ch1_tower', { bond: 1, clue: 1 }, 'truth', txt('通讯频道里，两道声音同时响起。', 'Two voices sound simultaneously in the comm channel.', '通信チャンネルで、二つの声が同時に響く。'), 'perfect')
            ]
        },

        /* 汇合点：天桥事件之后 */
        blaze_ch1_aftermath: {
            messages: [
                makeNarrator(txt(
                    '半小时后，中央广场的临时结界内。被你救下的驾驶员躺在地上，体内的紫黑色已褪去大半——你用电流强行中和了暗蚀。他茫然地睁着眼：「我……我刚才好像看见了一个白头发的人，在中央塔的方向……对我笑。」',
                    'Half an hour later, inside a temporary barrier at Central Plaza. The driver you saved lies on the ground, the violet-black in him mostly faded — you forcibly neutralized the erosion with current. He blinks blankly: "I... I think I saw a white-haired man, toward the Central Tower... smiling at me."',
                    '半時間後、中央広場の臨時結界の中。救出した運転手は地面に横たわり、体内の紫黒はほとんど褪せていた——電流で暗蝕を無理やり中和したのだ。彼はぼんやりと目を開く：「俺……白い髪の男を見た気がする。中央塔の方で……俺に向かって笑ってた。」'
                )),
                makeCharacter('wanqing', txt(
                    '「白发男人——与我的感知吻合。他就在中央塔地下，距离我们不足两公里。澈，我要跟你们一起去。」',
                    '"A white-haired man — matching my perception. He\'s beneath the Central Tower, less than two kilometers away. Che, I\'m coming with you."',
                    '「白い髪の男——私の感知と一致する。中央塔の地下、ここから2キロも離れていない。澈、私も行く。」'
                )),
                makeCharacter('shen', txt(
                    '「不行。」一道冰冷的声音从通讯器里传来。白塔教官沈孤鸿的声音，比平时更冷三分：「中央塔地下是白塔禁区。{player_name}，你带他们回去。这件事，白塔会处理。」',
                    '"No." A cold voice comes through the comm. Master Shen Guhong\'s tone is three degrees colder than usual: "Beneath the Central Tower is a White Tower restricted zone. {player_name}, take them back. The White Tower will handle this."',
                    '「駄目だ。」通信機から冷たい声が響く。白塔教官の沈孤鴻の声は、いつもより三度冷たい：「中央塔の地下は白塔の立ち入り禁止区域だ。{player_name}、お前たちは戻れ。これは白塔が処理する。」'
                )),
                makeSystem(txt(
                    '📡 白塔终端 · 档案同步完成\n━━━━━━━━━━━━━━\n登记名：{player_name}　年龄：{player_age}\n源脉适配率：{power}%　羁绊链接：{bond} 组\n━━━━━━━━━━━━━━\n⚠ 警告：该源脉波形与「霆王本源」高度相似。',
                    '📡 White Tower Terminal · Registry synced\n━━━━━━━━━━━━━━\nName: {player_name}　Age: {player_age}\nVein sync rate: {power}%　Bond links: {bond}\n━━━━━━━━━━━━━━\n⚠ Warning: waveform closely resembles the "Thunder King source."',
                    '📡 白塔端末・登録同期完了\n━━━━━━━━━━━━━━\n登録名：{player_name}　年齢：{player_age}\n源脈適合率：{power}%　絆リンク：{bond}組\n━━━━━━━━━━━━━━\n⚠ 警告：この源脈波形は「霆王本源」と高い類似を示す。'
                ))
            ],
            playerReply: txt('师父的态度很奇怪。他从来不会用这种语气说话——除非，他早就知道地下有什么。', 'Master\'s attitude is strange. He never speaks like this — unless he already knew what lies beneath.', '師匠の態度がおかしい。彼がこんな口調で話すことはない——地下に何があるか、最初から知っているのではないか。'),
            choices: [
                makeChoice(txt('🔥 顶撞师父，坚持追查到底', `🔥 Defy your master and insist on seeing this through`, `🔥 師匠に反発し、最後まで追うと主張する`), 'blaze_ch2_start', { bond: 1, clue: 1 }, 'risk', txt('「师父，对不起——但这次我不能听你的。」', '"Master, sorry — but this time I can\'t listen."', '「師匠、すみません——でも今回は従えません。」'), 'neutral'),
                makeChoice(txt('🤝 先安抚伙伴，再暗中调查师父隐瞒的秘密', `🤝 Calm your friends first, then secretly investigate what Master is hiding`, `🤝 まず仲間を落ち着かせ、師匠が隠す秘密をこっそり調べる`), 'blaze_ch2_stealth', { clue: 2, bond: 2 }, 'empathy', txt('有些真相，不能摆在台面上问。', 'Some truths can\'t be asked in the open.', 'ある真実は、表向きには聞けない。'), 'good'),
                makeChoice(txt('📋 服从命令，先回白塔整理情报', `📋 Follow the order and return to the White Tower to organize intel`, `📋 命令に従い、白塔に戻って情報を整理する`), 'blaze_ch1_report', { clue: 1 }, 'caution', txt('你按下躁动的心，先回家。', 'You suppress your restless heart and head back.', '騒ぐ心を押さえ、まず帰る。'), 'caution')
            ]
        },

        /* 报告白塔 */
        blaze_ch1_report: {
            messages: [
                makeNarrator(txt(
                    '白塔大厅。你带着整理好的情报与暗蚀样本赶到。师父沈孤鸿背对着你，看着墙上的城市全息图——中央塔的地下区域，被他用一层冰晶图标圈了起来。',
                    'White Tower Hall. You arrive with organized intel and an erosion sample. Master Shen Guhong has his back to you, staring at the city hologram — the underground area of the Central Tower, circled with a crystal-ice icon.',
                    '白塔の大広間。整理した情報と暗蝕のサンプルを携えて到着する。師匠の沈孤鴻は背を向け、都市のホログラムを見ている——中央塔の地下区域が、氷晶のアイコンで囲まれている。'
                )),
                makeCharacter('shen', txt(
                    '「样本留下，你可以走了。凌澈——记住，白塔有白塔的规矩。」他停顿了一下，声音低了几分：「……有些力量，不是现在的你能碰的。」',
                    '"Leave the sample. You can go. Ling Che — remember, the White Tower has its rules." He pauses, his voice dropping: "...Some powers are not for you to touch yet."',
                    '「サンプルを置いて行け。凌澈——覚えておけ、白塔には白塔の掟がある。」彼は間を置き、声を潜める：「……ある力は、今のお前が触れるべきではない。」'
                )),
                makeSystem(txt(
                    '🔍 情报整理：\n• 暗蚀来源：中央塔地下（白塔禁区）\n• 肇事者：白发男人，身份不明\n• 师父的反常态度：可疑',
                    '🔍 Intel Summary:\n• Erosion source: beneath Central Tower (White Tower restricted zone)\n• Perpetrator: white-haired man, unknown identity\n• Master\'s unusual attitude: suspicious',
                    '🔍 情報整理：\n• 暗蝕の出所：中央塔地下（白塔立ち入り禁止区域）\n• 犯行者：白い髪の男、正体不明\n• 師匠の不自然な態度：怪しい'
                ))
            ],
            playerReply: txt('师父那句「有些力量不是你能碰的」——听起来，像是在保护我，又像是在隐瞒什么。', '"Some powers are not for you to touch yet" — it sounds like protection... and like concealment.', '「ある力は触れるべきではない」——それは守りであり、隠し事でもあるように聞こえる。'),
            choices: [
                makeChoice(txt('🌙 深夜潜入白塔档案室，查十二年前的旧档', `🌙 Sneak into the White Tower archive at midnight — dig up files from twelve years ago`, `🌙 真夜中に白塔の資料室へ——十二年前の旧資料を調べる`), 'blaze_ch2_archive', { clue: 2 }, 'risk', txt('午夜十二点，档案室的锁发出一声轻响。', 'At midnight, the archive door lock clicks softly.', '真夜中、資料室の鍵が微かに鳴る。'), 'neutral'),
                makeChoice(txt('📞 说服晚晴联手，直接去中央塔外围调查', `📞 Persuade Wanqing to team up and investigate the Central Tower perimeter`, `📞 晚晴を説得して手を組み、中央塔外周を直接調査`), 'blaze_ch2_start', { bond: 2, clue: 1 }, 'empathy', txt('「师父不让去的地方，才更要去。」', '"The places Master forbids are exactly where we should go."', '「師匠が行くなと言う場所こそ、行くべきだ。」'), 'good')
            ]
        },

        /* 汇合中央塔 */
        blaze_ch1_tower: {
            messages: [
                makeNarrator(txt(
                    '中央塔外的绿化带。你与苏晚晴、王大柱汇合。晚晴闭着眼，指尖浮着一层淡蓝色的感知波纹：「地下三层的安保系统，有三十七处白塔的封锁标记。但奇怪的是——它们都在『保护』同一个东西，而不是在『追捕』任何人。」',
                    'At the green belt outside the Central Tower. You regroup with Su Wanqing and Wang Dazhu. Wanqing closes her eyes, a faint blue perception ripple on her fingertips: "Level 3 underground has thirty-seven White Tower lockdown marks. But strangely — they\'re all \'protecting\' one thing, not \'hunting\' anyone."',
                    '中央塔外の緑地帯。蘇晚晴、王大柱と合流する。晚晴は目を閉じ、指先に淡い青の感知波紋を浮かべる：「地下3階の警備システムには、白塔の封鎖標識が三十七箇所。でもおかしいのは——それらは全て同じ物を『守って』いて、誰も『追って』いないこと。」'
                )),
                makeCharacter('dazhu', txt(
                    '「守？守着啥啊？金子还是炸弹？」',
                    '"Protecting? What — gold or bombs?"',
                    '「守る？何をだ？金か爆弾か？」'
                )),
                makeCharacter('xiaoman', txt(
                    '「笨大柱！要是金子，白塔早搬走了！以我林小满的情报网判断——那底下八成是个人。」少女从树影里钻出来，手腕上的风系终端噼啪作响：「风告诉我，地下有个很冷很冷的气息。冰系，S级。」',
                    '"Dummy Dazhu! If it were gold, the Tower would\'ve moved it already! By my intel network\'s judgment — under there, it\'s probably a person." The girl pops out from the tree shadows, her wind-terminal crackling: "The wind tells me there\'s a very, very cold presence below. Ice-class. S-rank."',
                    '「バカ大柱！金なら白塔がとっくに運び出してるだろ！私の情報網の判断じゃ——下には人だろうな。」少女が木陰から飛び出し、手首の風系端末がパチパチ鳴る：「風が教えてくれた。地下にすごく冷たい気配がある。氷系、S級。」'
                ))
            ],
            playerReply: txt('S级的冰系气息——整个新穹市只有一个：师父，沈孤鸿。', 'An S-rank ice presence — there\'s only one in all of Xinqiong City: your master, Shen Guhong.', 'S級の氷の気配——新穹市に一人だけだ：師匠、沈孤鴻。'),
            choices: [
                makeChoice(txt('🌪️ 带着小满的线索，制定潜入地下的计划', `🌪️ Use Xiaoman\'s lead to plan an underground infiltration`, `🌪️ 小満の手がかりで地下潜入の計画を立てる`), 'blaze_ch2_plan', { clue: 1, bond: 2 }, 'truth', txt('风会替你们开路。', 'The wind will clear your path.', '風が道を切り開いてくれる。'), 'good')
            ]
        }
    }
};

// ========== 第二章：溯夜之影 ==========
var blaze_ch2 = {
    id: 'blaze_ch2',
    titleKey: 'blazeCh2Title',
    subtitleKey: 'blazeCh2Sub',
    narrator: txt(
        '白塔的深夜。档案室的老式终端机亮着幽蓝的光，屏幕上是一份被打了「绝密」印记的旧档——十二年前，「霆王」凌啸天在中央塔地下一战中失踪；同夜，他的搭档沈孤鸿从 S 级跌至 A 级。档案最后一页，只有一行字：「溯夜会，已确认存在。」',
        'Late night at the White Tower. The old terminal in the archive glows blue — on screen is a twelve-year-old file stamped "TOP SECRET": that night, "Thunder King" Ling Xiaotian vanished in the battle beneath the Central Tower; the same night, his partner Shen Guhong fell from S-rank to A-rank. The last page bears a single line: "The Suye Society — confirmed to exist."',
        '白塔の深夜。資料室の旧式端末が青い光を放つ。画面には「極秘」の印が押された十二年前の旧資料——あの夜、「霆王」凌啸天は中央塔地下の戦いで失踪した；同じ夜、彼の相棒の沈孤鴻はS級からA級へ落ちた。最終ページに一行だけ：「溯夜会、存在を確認。」'
    ),
    scenes: {
        /* 深夜档案室 */
        blaze_ch2_archive: {
            messages: [
                makeNarrator(txt(
                    '你关掉终端，档案室的灯光闪了一下。一个苍老的声音从身后传来：「档案室的门锁，是冰做的。你觉得你能躲得过我吗？」沈孤鸿站在门口，披着外套，眼里没有责备，只有一种你从未见过的疲惫。',
                    'You power down the terminal; the archive lights flicker. An aged voice comes from behind: "The archive door lock is made of ice. Did you think you could hide from me?" Shen Guhong stands in the doorway, coat over his shoulders, eyes carrying no reproach — only a weariness you\'ve never seen.',
                    '端末の電源を切ると、資料室の灯りが一瞬揺れる。背後から老いた声：「資料室の鍵は氷でできている。私から隠れられると思ったか？」沈孤鴻が入り口に立ち、外套を羽織り、目には咎めではなく——見たことのない疲れがある。'
                )),
                makeCharacter('shen', txt(
                    '「十二年前，你父亲凌啸天在天穹之核面前，和一个叫白瞳的男人对峙。那一战，你父亲用霆王本源封住了『暗』的裂缝，自己却被卷了进去。我拼尽全力，也只来得及接住你。」',
                    '"Twelve years ago, your father Ling Xiaotian faced a man named Bai Tong before the Sky Core. In that battle, your father sealed the crack of \'Dark\' with the Thunder King\'s source — and was dragged in himself. I gave everything I had, and only managed to catch you."',
                    '「十二年前、父の凌啸天は天穹の核の前で、白瞳という男と対峙した。あの戦いで、父は霆王の本源で『闇』の裂け目を封じ、自らはその中へ引き込まれた。私は全力を尽くし、ようやく君を受け止めただけだ。」'
                )),
                makeCharacter('lingche', txt(
                    '「师父……你为什么不告诉我？」',
                    '"Master... why didn\'t you ever tell me?"',
                    '「師匠……どうして教えてくれなかったんだ？」'
                )),
                makeCharacter('shen', txt(
                    '「因为白瞳还活着。他一直在找霆王血脉的下落。澈儿——你父亲用命换来的，不是这座城，是你。别让他白死。」',
                    '"Because Bai Tong is still alive. He has been searching for the Thunder King bloodline all along. Che\'er — what your father traded his life for is not this city. It\'s you. Don\'t let his death be in vain."',
                    '「白瞳はまだ生きているからだ。彼は霆王の血脈の行方をずっと探している。澈——父が命と引き換えに守ったのは、この街じゃない。君だ。無駄死にさせるな。」'
                ))
            ],
            playerReply: txt('白瞳。溯夜会。十二年前的封印。所有碎片拼在一起，指向同一个地方——中央塔地下。', 'Bai Tong. The Suye Society. The seal from twelve years ago. All the pieces point to one place — beneath the Central Tower.', '白瞳。溯夜会。十二年前の封印。すべての欠片が同じ場所を指す——中央塔の地下。'),
            choices: [
                makeChoice(txt('🗡️ 坦白一切：我要去地下，直面白瞳', `🗡️ Come clean: I\'m going underground to face Bai Tong`, `🗡️ 全てを告白する：地下へ行き、白瞳と対峙する`), 'blaze_ch2_plan', { clue: 1, bond: 2 }, 'truth', txt('「师父，我已经不是十二年前的孩子了。」', '"Master, I\'m not the child of twelve years ago anymore."', '「師匠、俺はもう十二年前の子供じゃない。」'), 'perfect'),
                makeChoice(txt('🤝 请求师父同行——有你在我才安心', `🤝 Ask your master to come along — you\'ll feel safe with him`, `🤝 師匠に同行を頼む——一緒なら安心だ`), 'blaze_ch2_plan', { bond: 3 }, 'empathy', txt('沈孤鸿沉默了很久，最终点了点头。', 'Shen Guhong is silent for a long while, then nods.', '沈孤鴻は長く沈黙し、やがて頷いた。'), 'good')
            ]
        },

        /* 正面集结（顶撞师父 / 说服晚晴后） */
        blaze_ch2_start: {
            messages: [
                makeNarrator(txt(
                    '白塔外的广场。你带着一身电光冲到集合点时，苏晚晴、王大柱、林小满已经站在路灯下等你。小满的手腕终端悬着一块全息屏幕，上面是中央塔地下四层的结构图——标注了三十七处白塔封锁点。',
                    'At the plaza outside the White Tower, you arrive crackling with lightning — Su Wanqing, Wang Dazhu, and Lin Xiaoman are already waiting under the streetlight. Xiaoman\'s wrist terminal projects a hologram: the structural map of Central Tower Level 4, with thirty-seven White Tower lockdown points marked.',
                    '白塔外の広場。電光を纏って集合地点に駆けつけると、蘇晚晴、王大柱、林小満が街灯の下で待っていた。小満の手首端末がホログラムを投影している：中央塔地下4階の構造図——白塔の封鎖地点が三十七箇所マークされている。'
                )),
                makeCharacter('xiaoman', txt(
                    '「澈哥！你来晚了三分钟！作为情报担当我郑重宣布——地下四层今晚的守卫换防，是十二年来最薄弱的一次。错过今晚，就得再等三年。」',
                    '"Che-ge! You\'re three minutes late! As your intel officer I solemnly declare — tonight\'s guard rotation on Level 4 is the thinnest in twelve years. Miss tonight, and you wait another three."',
                    '「澈兄！三分遅刻だ！情報担当として厳粛に宣言する——地下4階の今夜の警備交代は、十二年間で最も手薄。今夜を逃したら、あと三年待つことになる。」'
                )),
                makeCharacter('wanqing', txt(
                    '「师父今天一整天都守在地下四层的入口，谁劝也不听。澈——他是在替十二年前那一战赎罪。」她看着你：「所以我们要做的，不是绕过师父，而是带着他一起去。你明白吗？」',
                    '"Master has guarded the Level 4 entrance all day, deaf to all advice. Che — he\'s atoning for the battle twelve years ago." She looks at you: "So what we must do isn\'t to get around Master. It\'s to take him with us. Do you understand?"',
                    '「師匠は今日一日中、地下4階の入り口を守っている。誰が説得しても聞かない。澈——彼は十二年前の戦いの罪を償っているんだ。」彼女は君を見る：「だから私たちがすべきなのは、師匠を避けることじゃない。一緒に連れて行くこと。分かる？」'
                ))
            ],
            playerReply: txt('带着师父一起去——这句话像一道电流，打通了你的思绪。', 'Take Master with us — the words cut through your thoughts like a current.', '師匠を連れて行く——その言葉が、思考を電流のように貫いた。'),
            choices: [
                makeChoice(txt('📂 先找师父摊牌，把十二年前的旧账摊开', `📂 Confront Master first and lay the twelve-year-old ledger bare`, `📂 まず師匠と向き合い、十二年前の旧帳を開く`), 'blaze_ch2_archive', { bond: 1, clue: 1 }, 'truth', txt('有些话，该由徒弟先开口。', 'Some words should start from the disciple.', 'ある言葉は、弟子の方から口にすべきだ。'), 'perfect'),
                makeChoice(txt('🔑 趁着换防空隙，直接潜入地下四层', `🔑 Seize the rotation gap and infiltrate Level 4 directly`, `🔑 交代の隙を突き、地下4階へ直接潜入する`), 'blaze_ch2_infiltrate', { power: 5, clue: 1 }, 'risk', txt('夜色是最好的掩护。', 'The night is the best cover.', '夜は最高の隠れ蓑だ。'), 'neutral')
            ]
        },

        /* 暗中调查（远程调档） */
        blaze_ch2_stealth: {
            messages: [
                makeNarrator(txt(
                    '天台，夜风猎猎。林小满的手指在键盘上快成残影，一枚加密投影被破解，弹出一份泛黄的档案扫描件：「雷霆档案 · 凌啸天 · 绝密」。屏幕上，父亲的侧脸年轻而锋利，与镜中的你有七分相似。',
                    'On the rooftop, wind whips. Lin Xiaoman\'s fingers blur over the keyboard; an encrypted projection cracks and pops out a yellowed file scan: "Thunder Archives · Ling Xiaotian · TOP SECRET." On screen, your father\'s profile is young and sharp — seven parts mirror of the face in your own mirror.',
                    '屋上、夜風が吹き荒れる。林小満の指がキーボードの上で残像のように動く。暗号化された投影が破られ、黄ばんだ資料のスキャンが弾け出る：「雷霆檔案 · 凌啸天 · 極秘」。画面の中で、父の横顔は若く鋭い——鏡の中の自分と七分似ている。'
                )),
                makeCharacter('xiaoman', txt(
                    '「澈哥……这份档案的最后一行写着：『溯夜会首脑「白瞳」，S级暗系，于天穹之核地下一战中被霆王本源封印。若霆王血脉现世，封印将再次动摇。』」她顿了顿，声音很轻：「所以……你父亲其实没死。他只是——被封印在了里面。」',
                    '"Che-ge... the last line of this file reads: \'Bai Tong, head of Suye, S-class Dark, was sealed by the Thunder King\'s source in the battle beneath the Sky Core. Should the Thunder King\'s bloodline surface, the seal will waver once more.\'" She pauses, voice soft: "So... your father isn\'t dead. He\'s just — sealed inside."',
                    '「澈兄……この資料の最後の行には：『溯夜会首領「白瞳」、S級闇系、天穹の核地下の戦いで霆王本源により封印される。霆王の血脈が現れれば、封印は再び揺らぐ。』」彼女は間を置き、声を潜める：「だから……お父さんは実は死んでない。ただ——中に封印されているだけ。」'
                )),
                makeSystem(txt(
                    '🔍 关键情报：\n• 白瞳被霆王本源封印于天穹之核地基\n• 霆王血脉=你 → 封印正在因你而动摇\n• 师父沈孤鸿，正是当年见证封印之人',
                    '🔍 Key Intel:\n• Bai Tong is sealed within the Sky Core foundation by the Thunder King\'s source\n• The Thunder King bloodline = you → the seal is wavering because of you\n• Master Shen Guhong witnessed the seal twelve years ago',
                    '🔍 重要情報：\n• 白瞳は霆王本源により天穹の核の基盤に封印されている\n• 霆王の血脈＝君 → 封印は君のせいで揺らいでいる\n• 師匠の沈孤鴻こそ、十二年前の封印の目撃者'
                ))
            ],
            playerReply: txt('封印在因我而动摇。白瞳正在苏醒——而我，是唯一能补上那道封印的人。', 'The seal wavers because of me. Bai Tong is awakening — and I am the only one who can mend that seal.', '封印は俺のせいで揺らいでいる。白瞳が目覚めようとしている——そして、その封印を修めるのは、俺だけだ。'),
            choices: [
                makeChoice(txt('⚡ 召集伙伴，趁封印未崩直取地下', `⚡ Rally the team and strike underground before the seal collapses`, `⚡ 仲間を集め、封印が崩れる前に地下を直撃する`), 'blaze_ch2_plan', { clue: 1, power: 5 }, 'truth', txt('时间不站在你这边。', 'Time is not on your side.', '時間は味方してくれない。'), 'perfect')
            ]
        },

        /* 小队集结 */
        blaze_ch2_plan: {
            messages: [
                makeNarrator(txt(
                    '白塔地下车库改成的临时作战室。苏晚晴展开感知地图，王大柱搬来三箱能量饮料，林小满的手指在全息键盘上翻飞：「中央塔地下四层，白塔封锁最密集的地方——那里有一扇门，门的后面，就是天穹之核的地基。」',
                    'A makeshift war room in the White Tower\'s underground garage. Su Wanqing unfolds a perception map, Wang Dazhu lugs in three crates of energy drinks, and Lin Xiaoman\'s fingers fly over the holographic keyboard: "Central Tower, Level 4 underground, where the Tower\'s lockdown is densest — there\'s a door. Behind it: the foundation of the Sky Core."',
                    '白塔の地下駐車場を改造した臨時作戦室。蘇晚晴が感知地図を広げ、王大柱がエネルギードリンクを三箱運び、林小満の指がホロキーボードを飛び回る：「中央塔地下4階、白塔の封鎖が最も密集する場所——そこに扉がある。扉の向こうは、天穹の核の基盤だ。」'
                )),
                makeCharacter('dazhu', txt(
                    '「管他门后面是啥，澈哥一句话，我这一身C级岩皮就顶上去！」',
                    '"Whatever\'s behind that door, one word from Che-ge and this C-rank rock hide of mine goes in first!"',
                    '「扉の向こうが何だって、澈兄の一言があれば、このC級の岩肌で突っ込む！」'
                )),
                makeCharacter('xiaoman', txt(
                    '「顶什么顶！情报都没摸清就冲，你以为你是主角啊……等等，好像还真是。」',
                    '"Charge what! We don\'t even have intel — you think you\'re the protagonist or something... wait, I guess you kind of are."',
                    '「突っ込むな！情報も掴んでないのに突っ込むなんて、主人公気取りかよ……って、まあ実際そうか。」'
                )),
                makeCharacter('wanqing', txt(
                    '「澈。地下四层，暗蚀浓度是地面的三十倍。B级以下的源脉会被直接侵蚀——也就是说，能下去的只有我和师父。」她顿了顿：「但你一定要去的话，我会用自己的感知护住你的源脉。哪怕撑不住，也撑到你把话说完整。」',
                    '"Che. Level 4 underground has thirty times the surface erosion density. Source Veins below B-rank will be eroded directly — meaning only Master and I can go down." She pauses: "But if you insist, I\'ll shield your Source Vein with my perception. Even if I can\'t hold on, I\'ll hold until you\'ve said everything you need to say."',
                    '「澈。地下4階の暗蝕濃度は地上の三十倍。B級以下の源脈は直接侵食される——つまり、降りられるのは私と師匠だけ。」彼女は間を置く：「でも、どうしても行くなら、私の感知で君の源脈を守る。たとえ持たなくても、君が言いたいことを言い終えるまでは持たせる。」'
                ))
            ],
            playerReply: txt('有可靠的伙伴，有不得不做的事。凌澈，前进吧。', 'You have reliable friends, and something you must do. Ling Che — move forward.', '頼れる仲間がいて、やらねばならぬことがある。凌澈——進め。'),
            choices: [
                makeChoice(txt('🔑 深夜行动：从通风管道潜入地下四层', `🔑 Midnight operation: infiltrate Level 4 via the ventilation ducts`, `🔑 深夜作戦：換気ダクトから地下4階へ潜入`), 'blaze_ch2_infiltrate', { clue: 1, power: 5, bond: 1 }, 'truth', txt('风系终端撕开了第一道封锁。', 'The wind-terminal tears open the first lockdown.', '風系端末が最初の封鎖を切り開く。'), 'perfect'),
                makeChoice(txt('⚡ 正面突入：用雷霆破门，赌一把速度', `⚡ Head-on assault: blast the door with thunder and gamble on speed`, `⚡ 正面突破：雷霆で扉を吹き飛ばし、速度に賭ける`), 'blaze_ch2_assault', { power: 10, bond: 1 }, 'risk', txt('雷光撕裂了白塔的地下走廊。', 'Lightning tears through the Tower\'s underground corridor.', '雷光が白塔の地下回廊を引き裂く。'), 'neutral')
            ]
        },

        /* 潜入地下四层 */
        blaze_ch2_infiltrate: {
            messages: [
                makeNarrator(txt(
                    '通风管道里，暗蚀的紫黑色雾气贴着管壁流动。苏晚晴的感知屏障包裹着你们，像一层看不见的薄膜。尽头，是一扇巨大的冰晶之门——门缝里渗出的寒意，连你的电弧都变得迟缓。',
                    'Inside the ventilation duct, violet-black erosion mist clings to the walls. Su Wanqing\'s perception barrier wraps you all like an invisible membrane. At the end: a massive crystal-ice door — the cold seeping through its cracks slows even your arcs.',
                    '換気ダクトの中、紫黒の暗蝕の霧が壁に張り付く。蘇晚晴の感知バリアが、目に見えない膜のように皆を包む。突き当たりは巨大な氷晶の扉——隙間から滲む寒気が、電弧さえ鈍らせる。'
                )),
                makeCharacter('xiaoman', txt(
                    '「这扇门的锁……不是白塔的加密，是更老的东西。老到……像是十二年前的遗留物。」她的声音突然变了：「澈哥，风告诉我，门后面有人在等你。等你很多年了。」',
                    '"This door\'s lock... it\'s not White Tower encryption — it\'s older. Old enough... to be a leftover from twelve years ago." Her voice suddenly changes: "Che-ge, the wind says someone\'s waiting for you behind that door. Has been waiting for years."',
                    '「この扉の鍵……白塔の暗号じゃない。もっと古い。古すぎて……十二年前の遺物みたい。」彼女の声が急変する：「澈兄、風が教えてくれた。扉の向こうで誰かが待ってる。何年も待ってたんだ。」'
                )),
                makeSystem(txt(
                    '🔑 解锁成功。冰晶之门在轰鸣中缓缓开启——门后，是一整座以暗蚀为燃料的地下城市残骸。',
                    '🔑 Unlocked. The crystal-ice door groans open — behind it lies the ruined remnant of an entire underground city, fueled by erosion.',
                    '🔑 解錠成功。氷晶の扉が轟音とともに開く——扉の向こうは、暗蝕を燃料とした地下都市の残骸だった。'
                ))
            ],
            playerReply: txt('十二年前，父亲就是在这里，封住了「暗」的裂缝。而现在，裂缝在重新张开。', 'Twelve years ago, your father sealed the crack of "Dark" right here. And now, the crack is reopening.', '十二年前、父はまさにここで「闇」の裂け目を封じた。そして今、裂け目が再び開こうとしている。'),
            choices: [
                makeChoice(txt('⚡ 踏入废墟，直面深处那道等待的身影', `⚡ Step into the ruins and face the figure waiting in the depths`, `⚡ 廃墟へ踏み込み、奥で待つ影と対峙する`), 'blaze_ch3_start', { clue: 2, power: 5 }, 'truth', txt('你迈出了第一步。', 'You take the first step.', '最初の一歩を踏み出す。'), 'perfect')
            ]
        },

        /* 正面突入 */
        blaze_ch2_assault: {
            messages: [
                makeNarrator(txt(
                    '雷光轰开白塔地下走廊的封锁门，警报声瞬间响彻整层。你带着小队冲过三道防线，却在第四层入口撞上了白塔的封锁队——带队的人，正是沈孤鸿。他双手背在身后，脚下凝结出一片冰霜。',
                    'Thunder blasts through the Tower\'s lockdown doors; alarms scream across the floor. You lead your team past three lines of defense, but at the Level 4 entrance you collide with the White Tower lockdown squad — led by none other than Shen Guhong. Hands behind his back, frost spreading beneath his feet.',
                    '雷光が白塔地下回廊の封鎖扉を吹き飛ばし、警報が一瞬で階全体に響き渡る。チームを率いて三つの防衛線を突破するが、4階入り口で白塔の封鎖隊と衝突する——先頭は、まさかの沈孤鴻。両手を背に組み、足元に氷霜が広がる。'
                )),
                makeCharacter('shen', txt(
                    '「我说过——这不是现在的你能碰的力量。凌澈，你若执意要下去，先过我这关。」',
                    '"I told you — this power is not for you to touch yet. Ling Che, if you insist on going down, you\'ll have to get past me first."',
                    '「言ったはずだ——この力は今のお前が触れるべきではない。凌澈、どうしても下りるなら、まず私を倒せ。」'
                )),
                makeCharacter('lingche', txt(
                    '「师父，十二年前您没能拦住白瞳。今天，让我来补上那一战——不是为了证明什么，是因为有人在那里等我父亲赴约！」',
                    '"Master, twelve years ago you couldn\'t stop Bai Tong. Today, let me finish that battle — not to prove anything, but because someone down there is waiting for my father to keep a promise!"',
                    '「師匠、十二年前あなたは白瞳を止められなかった。今日、その戦いを俺が終わらせる——証明のためじゃない。下で誰かが父との約束を待っているからだ！」'
                )),
                makeCharacter('shen', txt(
                    '沈孤鸿愣住了。冰霜在他脚下停顿了一瞬。随即，他缓缓侧身，让开了路：「……去吧。但我跟你一起。」',
                    'Shen Guhong freezes. The frost hesitates beneath his feet. Then, slowly, he steps aside: "...Go. But I\'m coming with you."',
                    '沈孤鴻が固まる。足元の氷霜が一瞬止まる。やがて、ゆっくりと道を譲る：「……行け。だが私も同行する。」'
                ))
            ],
            playerReply: txt('师父让开了路。他从没这样过。今晚，你似乎第一次真正认识了沈孤鸿这个人。', 'Master steps aside. He has never done this. Tonight, you feel like you\'re meeting Shen Guhong for the first time.', '師匠が道を譲った。彼がこんなことをしたのは初めてだ。今夜、初めて沈孤鴻という人間を知った気がする。'),
            choices: [
                makeChoice(txt('⚡ 与师父并肩，踏入地下四层的废墟', `⚡ Walk side by side with your master into the Level 4 ruins`, `⚡ 師匠と肩を並べ、地下4階の廃墟へ踏み込む`), 'blaze_ch3_start', { power: 5, bond: 3 }, 'empathy', txt('师徒二人的身影，被冰与雷的光拉得很长。', 'The shadows of master and disciple stretch long, lit by ice and thunder.', '師弟二人の影が、氷と雷の光に長く伸びる。'), 'perfect')
            ]
        }
    },
    startScene: 'blaze_ch2_archive'
};

// ========== 第三章：白瞳降临 ==========
var blaze_ch3 = {
    id: 'blaze_ch3',
    titleKey: 'blazeCh3Title',
    subtitleKey: 'blazeCh3Sub',
    narrator: txt(
        '中央塔地下四层，天穹之核的地基深处。以暗蚀为燃料的地下城市残骸中央，矗立着一座半透明的晶柱——那就是十二年前的封印。此刻，晶柱的表面布满蛛网般的裂纹，紫黑色的光芒从缝隙中渗出，仿佛有什么东西正在里面睁开眼睛。',
        'Beneath the Central Tower, in the deepest foundation of the Sky Core. At the heart of the erosion-fueled ruin-city stands a translucent crystal pillar — the seal from twelve years ago. Now its surface is covered in web-like cracks, violet-black light seeping through, as if something inside is opening its eyes.',
        '中央塔の地下、天穹の核の基盤の最深部。暗蝕を燃料とした地下都市の残骸の中央に、半透明の晶柱が立っている——十二年前の封印だ。今、その表面は蜘蛛の巣のような亀裂で覆われ、紫黒の光が隙間から滲む。まるで中の何かが目を開けようとしているかのように。'
    ),
    scenes: {
        /* 踏入废墟 */
        blaze_ch3_start: {
            messages: [
                makeNarrator(txt(
                    '小队踏入废墟的刹那，晶柱猛然炸裂。紫黑色的能量如潮水涌出，凝成一个人形——白发，白瞳，披着一件褪色的旧大衣。他悬浮在半空，低头看着你，声音像隔了十二年传来：「霆王的儿子……你终于来了。我等这一刻，等了整整十二年。」',
                    'The moment the team steps into the ruins, the pillar bursts. Violet-black energy floods out like a tide, condensing into a human form — white hair, white pupils, an old faded coat. He floats mid-air, looking down at you, voice arriving as if across twelve years: "Son of the Thunder King... you finally came. I have waited for this moment for twelve whole years."',
                    '廃墟に足を踏み入れた瞬間、晶柱が炸裂する。紫黒のエネルギーが潮のように溢れ出し、人形に凝縮される——白い髪、白い瞳、色褪せた古いコート。彼は空中に浮かび、君を見下ろし、十二年の時を隔てたような声：「霆王の息子……ようやく来たか。この瞬間を、十二年待っていた。」'
                )),
                makeCharacter('baitong', txt(
                    '「天穹之核——它本不该属于这座城市。它是我族千年的圣物，被你们白塔窃走，用来驱动这虚伪的『科学』。我只是……来取回属于我的东西。」',
                    '"The Sky Core — it was never meant for this city. It is a thousand-year relic of my people, stolen by your White Tower to power this sham of \'science.\' I am merely... taking back what belongs to me."',
                    '「天穹の核——それは元々この街のものではない。我が一族千年の聖物だ。それを白塔が盗み、偽りの『科学』を動かすために使ってきた。私はただ……自分のものを取り戻しに来ただけだ。」'
                )),
                makeCharacter('shen', txt(
                    '沈孤鸿踏前一步，冰霜在他脚下蔓延成一道战线：「白瞳，你十二年前就该死了。是霆王用命封住了你——你今日若敢动天穹之核，就先踏过我的尸骨。」',
                    'Shen Guhong steps forward, frost spreading into a battle line beneath him: "Bai Tong, you should have died twelve years ago. The Thunder King sealed you with his life — if you dare touch the Sky Core today, you\'ll step over my bones first."',
                    '沈孤鴻が一歩前に出る。足元の氷霜が戦線となって広がる：「白瞳、お前は十二年前に死ぬべきだった。霆王が命を懸けてお前を封じた——今日、天穹の核に手を出すなら、まず俺の骸を越えていけ。」'
                ))
            ],
            playerReply: txt('十二年前的恩怨，今天要在这里做一个了断。', 'The grudges of twelve years — today, they end here.', '十二年前の因縁——今日、ここで決着をつける。'),
            choices: [
                makeChoice(txt('⚡ 抢先出手，用雷霆试探白瞳的实力', `⚡ Strike first — test Bai Tong\'s strength with thunder`, `⚡ 先手を打つ——雷霆で白瞳の実力を探る`), 'blaze_ch3_probe', { power: 5 }, 'risk', txt('雷光撕裂了紫黑色的潮水。', 'Lightning tears through the violet-black tide.', '雷光が紫黒の潮を引き裂く。'), 'neutral'),
                makeChoice(txt('🗣️ 不急着动手——先问清楚天穹之核的真相', `🗣️ Hold off — demand the truth about the Sky Core first`, `🗣️ 焦らず動かず——天穹の核の真実を問いただす`), 'blaze_ch3_truth', { clue: 1, bond: 1 }, 'truth', txt('你选择先听他说完。', 'You choose to hear him out.', 'まず彼の言葉を聞くことを選ぶ。'), 'perfect')
            ]
        },

        /* 试探实力 */
        blaze_ch3_probe: {
            messages: [
                makeNarrator(txt(
                    '你的雷枪贯穿紫黑之潮，却在白瞳身前三寸处停住——不是被挡下，而是被吞噬。暗蚀像饥饿的深渊，把你的雷电一点一点啃食殆尽。白瞳摇了摇头：「B级的霆，连给你父亲提鞋都不够。十二年前，你父亲一记九霄霆王炮，能劈开我的暗幕。你呢？」',
                    'Your lightning lance pierces the violet-black tide, stopping three inches before Bai Tong — not blocked, but devoured. The erosion feeds on your thunder like a hungry abyss. Bai Tong shakes his head: "B-rank Thunder — not fit to hold your father\'s shoes. Twelve years ago, his Sky-Shattering Thunder Cannon could split my dark veil. What about you?"',
                    '雷槍が紫黒の潮を貫くが、白瞳の三寸前で止まる——防がれたのではなく、喰われたのだ。暗蝕は飢えた深淵のように、雷光を少しずつ喰い尽くす。白瞳は首を振る：「B級の霆か。父の靴も磨くに値しない。十二年前、父の九霄霆王砲は俺の暗幕を切り裂けた。お前はどうだ？」'
                )),
                makeCharacter('lingche', txt(
                    '「……少看不起人了。我B级怎么了？B级也能把你按回封印里去！」',
                    '"...Don\'t look down on me. So what if I\'m B-rank? Even B-rank can shove you back into that seal!"',
                    '「……舐めるな。B級がどうした。B級だってお前を封印に押し戻せる！」'
                )),
                makeCharacter('wanqing', txt(
                    '「澈，别冲动！他在激你——他的暗蚀在吸收你的电流成长！」苏晚晴的感知屏障亮起，替你挡住了一半侵蚀。但她的脸色，肉眼可见地白了下去。',
                    '"Che, don\'t rush! He\'s baiting you — his erosion grows by absorbing your current!" Su Wanqing\'s perception barrier lights up, deflecting half the erosion for you. But her face visibly pales.',
                    '「澈、焦るな！彼は挑発してる——暗蝕は君の電流を吸収して成長している！」蘇晚晴の感知バリアが輝き、侵食の半分を防いでくれる。しかし彼女の顔は、見る間に白くなっていく。'
                ))
            ],
            playerReply: txt('晚晴在硬撑。白瞳在变强。不能这样下去——必须换一个打法。', 'Wanqing is pushing herself. Bai Tong is growing stronger. This can\'t go on — you need a different approach.', '晚晴が無理をしている。白瞳は強くなっている。このままじゃ駄目だ——別の打ち方を見つけなければ。'),
            choices: [
                makeChoice(txt('🔥 拉开距离，让师父的冰封住暗蚀的蔓延', `🔥 Fall back and let Master\'s ice freeze the erosion\'s advance`, `🔥 距離を取り、師匠の氷で暗蝕の進行を凍てつかせる`), 'blaze_ch3_icewall', { bond: 2 }, 'truth', txt('师父的冰墙拔地而起。', 'Master\'s ice wall rises from the ground.', '師匠の氷壁が地面からそびえ立つ。'), 'good'),
                makeChoice(txt('⚡ 赌上全部电流，强行轰击晶柱残骸——引爆封印', `⚡ Bet everything on one current surge — detonate the seal\'s remains`, `⚡ 全電流を賭けて晶柱の残骸を砲撃——封印を起爆する`), 'blaze_ch3_detonate', { power: 10 }, 'risk', txt('你把自己当成了引信。', 'You make yourself the fuse.', '自分自身を導火線にする。'), 'risk')
            ]
        },

        /* 质问真相 */
        blaze_ch3_truth: {
            messages: [
                makeCharacter('baitong', txt(
                    '「想听真相？好，我告诉你。」白瞳抬手，晶柱残骸的碎片在紫黑之潮中重组，投影出十二年前的画面：「你们白塔的『科学』，是把天穹之核的能量切割成源脉，植入每个孩子的身体。你们管这叫——恩赐。可你有没有想过，源脉能量从何而来？」',
                    '"You want the truth? Fine, I\'ll tell you." Bai Tong raises his hand; shards of the pillar reform in the violet-black tide, projecting scenes from twelve years ago: "Your White Tower\'s \'science\' cuts the Sky Core\'s energy into Source Veins and implants them into every child. You call this — a gift. But have you ever asked where the Source Vein energy comes from?"',
                    '「真実が聞きたい？いいだろう、教えてやる。」白瞳が手を挙げる。晶柱の破片が紫黒の潮の中で再構成され、十二年前の映像を投影する：「白塔の『科学』は、天穹の核のエネルギーを源脈に切り分け、全ての子供に植え付けた。お前たちはそれを——恩恵と呼ぶ。だが、源脈のエネルギーがどこから来るか考えたことはあるか？」'
                )),
                makeCharacter('baitong', txt(
                    '「天穹之核是我族的圣物，它从不产生能量——它只借出能量。借出之后，需要『归还』。你们的源脉，每使用一次，都在透支圣物。而当圣物透支殆尽，它就会开始……收取利息。」他看向城市的方向：「利息，就是这座城里每一个异能者的生命力。」',
                    '"The Sky Core is my people\'s relic. It never creates energy — it only lends it. And what is lent must be repaid. Your Source Veins overdraw the relic with every use. And when it is drained, it begins to... collect interest." He looks toward the city: "The interest is the life force of every esper in this city."',
                    '「天穹の核は我が族の聖物だ。それはエネルギーを作らない——貸すだけだ。貸したものは返さねばならない。お前たちの源脈は、使うたびに聖物を透支している。そして聖物が尽きかけた時、それは……利子を取る。」彼は街の方を向く：「利子とは、この街の全ての異能者の生命力だ。」'
                )),
                makeSystem(txt(
                    '🔍 真相：天穹之核 → 源脉 → 异能 → 透支 → 收取「生命力」。白塔千年来的繁荣，建立在「透支」之上。',
                    '🔍 Truth: Sky Core → Source Veins → abilities → overdraw → collecting "life force." A thousand years of White Tower prosperity, built on "overdraft."',
                    '🔍 真実：天穹の核 → 源脈 → 異能 → 透支 → 「生命力」の回収。白塔千年の繁栄は、「透支」の上に築かれていた。'
                ))
            ],
            playerReply: txt('原来如此。师父一直隐瞒的，不是白瞳有多强——而是这座城市的「科学」，从一开始就是一场高利贷。', 'So that\'s it. What Master has been hiding isn\'t how strong Bai Tong is — it\'s that this city\'s "science" was a usury loan from the start.', 'そういうことか。師匠が隠してきたのは、白瞳がどれだけ強いかではなく——この街の「科学」が、最初から高利貸しだったということ。'),
            choices: [
                makeChoice(txt('🗣️ 直指核心：即便如此，用生命做利息的买卖必须终止', `🗣️ Cut to the core: even so, this life-for-interest deal must end`, `🗣️ 核心を突く：それでも、命を利子にする取引は終わらせる`), 'blaze_ch3_icewall', { clue: 2, bond: 1 }, 'truth', txt('「这就是你要夺走天穹之核的理由？」', '"So that\'s your reason for taking the Sky Core?"', '「それが天穹の核を奪う理由か？」'), 'perfect'),
                makeChoice(txt('⚡ 不再废话——动手', `⚡ No more words — fight`, `⚡ 言葉はもういい——戦う`), 'blaze_ch3_detonate', { power: 5 }, 'risk', txt('谈判破裂。', 'Negotiation breaks down.', '交渉は決裂した。'), 'neutral')
            ]
        },

        /* 冰墙战线 */
        blaze_ch3_icewall: {
            messages: [
                makeNarrator(txt(
                    '沈孤鸿的冰墙拔地而起，将紫黑之潮冻结在半空。冰与暗蚀相撞，发出玻璃碎裂般的脆响。师父的呼吸变得粗重——他的源脉在十二年前的封印之战中受损，如今每一道冰墙，都在透支他本就不多的本源。',
                    'Shen Guhong\'s ice wall rises, freezing the violet-black tide mid-air. Ice and erosion collide with the crack of shattering glass. His breathing grows heavy — his Source Vein was damaged in the sealing battle twelve years ago, and every ice wall now drains his already-fading source.',
                    '沈孤鴻の氷壁がそびえ立ち、紫黒の潮を空中で凍てつかせる。氷と暗蝕がぶつかり、ガラスの砕けるような音が響く。師匠の呼吸が荒くなる——彼の源脈は十二年前の封印の戦いで損傷しており、今の氷壁は、尽きかけの本源を一層消耗している。'
                )),
                makeCharacter('shen', txt(
                    '「澈儿！听好——十二年前，你父亲不是败给白瞳。他是为了保护你母亲和你，主动把霆王本源注入封印。这十二年，我守着你，不是为了赎罪，是答应了他——『让那孩子，堂堂正正地长大』。」',
                    '"Che\'er! Listen — twelve years ago, your father didn\'t lose to Bai Tong. He poured the Thunder King\'s source into the seal to protect your mother and you. These twelve years, I watched over you not to atone — but because I promised him: \'Let that child grow up with his head held high.\'"',
                    '「澈！よく聞け——十二年前、父は白瞳に負けたんじゃない。母と君を守るために、自ら霆王本源を封印に注ぎ込んだんだ。この十二年、君を見守ってきたのは罪滅ぼしのためじゃない——彼に約束したからだ：『あの子を、堂々と育て上げろ』と。」'
                )),
                makeCharacter('baitong', txt(
                    '「动人的父子情。可惜——你们的时间，到今晚为止了。」白瞳双手合拢，紫黑之潮骤然收缩，化作一颗漆黑的奇点，向天穹之核的方向直坠而去。',
                    '"Moving, the father-son bond. Pity — your time ends tonight." Bai Tong brings his hands together; the violet-black tide contracts into a pitch-black singularity, plunging toward the Sky Core.',
                    '「感動的な親子愛だ。残念だが——お前たちの時間は今夜までだ。」白瞳が両手を合わせ、紫黒の潮が急収縮し、漆黒の特異点となって、天穹の核へと直墜する。'
                ))
            ],
            playerReply: txt('白瞳的目标从来不是我们——是天穹之核！', 'Bai Tong\'s target was never us — it\'s the Sky Core!', '白瞳の標的は最初から俺たちじゃない——天穹の核だ！'),
            choices: [
                makeChoice(txt('⚡ 全力追击，绝不能让奇点碰到天穹之核', `⚡ Give chase with everything — never let the singularity touch the Sky Core`, `⚡ 全力で追撃——特異点を天穹の核に触れさせるな`), 'blaze_ch3_fall', { power: 10, bond: 2 }, 'truth', txt('你化作一道闪电追了上去。', 'You become a bolt of lightning in pursuit.', '君は一筋の稲妻となって追いかける。'), 'perfect')
            ]
        },

        /* 引爆封印 */
        blaze_ch3_detonate: {
            messages: [
                makeNarrator(txt(
                    '你把全部电流灌入自己，化作一道雷光撞向晶柱残骸。轰——！封印的碎片四散，紫黑之潮短暂地停滞。但代价是惨烈的：你被反震抛飞，撞穿了三道墙壁，源脉传来撕裂般的剧痛。',
                    'You pour every ounce of current into yourself, becoming a bolt of lightning that slams into the pillar\'s remains. BOOM —! The seal shatters outward, the violet-black tide stalling for a moment. But the cost is brutal: you\'re hurled back through three walls, your Source Vein screaming with tearing pain.',
                    '全電流を自分に注ぎ込み、一筋の雷光となって晶柱の残骸に激突する。ドーン——！封印の破片が飛び散り、紫黒の潮が一瞬止まる。だが代償は苛烈だ：反動で三枚の壁を突き破って吹き飛ばされ、源脈が引き裂かれるような激痛に襲われる。'
                )),
                makeCharacter('wanqing', txt(
                    '「澈——！！」苏晚晴的感知几乎在同一瞬间崩溃。她扑过来，用身体挡在你和白瞳之间，指尖的感知波纹拼了命地编织成最后一道防线。',
                    '"Che—!!" Su Wanqing\'s perception collapses almost in the same instant. She throws herself between you and Bai Tong, desperately weaving the last threads of her perception into a final defense.',
                    '「澈——！！」蘇晚晴の感知がほぼ同じ瞬間に崩壊する。彼女は飛び出し、君と白瞳の間に身を投げ、指先の感知の波紋を必死に編んで最後の防衛線とする。'
                )),
                makeCharacter('baitong', txt(
                    '白瞳静静地看着这一切，忽然笑了：「徒劳的勇气。你们人类最有趣的地方，就是在明知必败时，还愿意把命摆上赌桌。」他抬手，紫黑之潮凝成利刃，指向天穹之核的方向。',
                    'Bai Tong watches it all, then smiles: "Futile courage. The most amusing thing about you humans — when you know you\'ll lose, you still put your life on the table." He raises his hand; the tide forms a blade, pointing toward the Sky Core.',
                    '白瞳はそれを静かに見つめ、ふと笑う：「無駄な勇気だ。人間の最も面白いところは、負けると分かっていても、命を賭け台に乗せることだ。」彼は手を掲げ、潮が刃を成して、天穹の核の方向を指す。'
                ))
            ],
            playerReply: txt('挡不住了。天穹之核……要被夺走了。', 'Can\'t hold. The Sky Core... is about to be taken.', '止められない。天穹の核が……奪われる。'),
            choices: [
                makeChoice(txt('⚡ 在意识模糊的最后一刻，追着那道身影冲上去', `⚡ In the last moment before your consciousness fades, chase that figure`, `⚡ 意識が途切れる最後の瞬間、その影を追って飛び出す`), 'blaze_ch3_fall', { power: 5, bond: 1 }, 'truth', txt('你的手，抓住了他的衣角。', 'Your hand catches the edge of his coat.', '君の手が、彼のコートの裾を掴む。'), 'perfect')
            ]
        },

        /* 天穹之核被夺 */
        blaze_ch3_fall: {
            messages: [
                makeNarrator(txt(
                    '奇点击中天穹之核的一瞬，整座城市的光——熄灭了。不是停电，而是天穹之核本身的辉光被那团漆黑吞没。白瞳悬浮在城市上空，脚下是陷入恐慌的新穹市，头顶是黯淡如死物的天穹之核。他俯视着跪在废墟中的你，声音不带一丝波澜：「霆王的儿子。我给你三天时间。三天后，我将开启天穹之核——届时，全城异能者的生命力，都将成为我唤醒圣物的祭品。」',
                    'The instant the singularity strikes the Sky Core, every light in the city — dies. Not a blackout: the Sky Core\'s own glow is swallowed by that pitch darkness. Bai Tong hovers above the city, beneath the dull, lifeless core, above a panicking Xinqiong. He looks down at you kneeling in the rubble, voice utterly flat: "Son of the Thunder King. I give you three days. When they pass, I will open the Sky Core — and the life force of every esper in this city becomes the offering to awaken my relic."',
                    '特異点が天穹の核に命中した瞬間、街中の光が——消えた。停電ではない。天穹の核自身の輝きが、その漆黒に呑み込まれたのだ。白瞳は都市の上空に浮かび、足元は恐慌に陥る新穹市、頭上は死んだように暗い天穹の核。瓦礫の中に跪く君を見下ろし、声は一切の感情を欠く：「霆王の息子よ。三日間やろう。三日後、俺は天穹の核を開く——その時、全市の異能者の生命力が、聖物を目覚めさせる生贄となる。」'
                )),
                makeCharacter('shen', txt(
                    '沈孤鸿拄着冰杖走到你身边，声音沙哑但平稳：「三天。澈儿，你父亲当年用了三天，从 B 级突破到 S 级。他教会你我的每一招，都是为这一天准备的。」他顿了顿：「白塔的历代教官里，我最笨。但带徒弟，我从不认输。」',
                    'Shen Guhong walks to your side, leaning on his ice staff, voice hoarse but steady: "Three days. Che\'er, your father took three days to break through from B-rank to S-rank. Every move he and I taught you was prepared for this day." He pauses: "Among all the Tower\'s instructors, I\'m the slowest. But when it comes to training a disciple, I never admit defeat."',
                    '沈孤鴻は氷杖を支えに君のそばへ歩み寄る。声は嗄れているが安定している：「三日。澈、父は三日でB級からS級へ突破した。彼と私が教えた全ての技は、この日のために用意されたものだ。」彼は間を置く：「白塔の歴代教官の中で、私は一番の鈍才だ。だが弟子を育てることに関しては、決して負けを認めたことはない。」'
                )),
                makeSystem(txt(
                    '⏳ 倒计时开始：三天。\n📋 目标：突破 S 级「霆王」本源，夺回天穹之核。',
                    '⏳ Countdown begins: three days.\n📋 Objective: break through to S-rank "Thunder King" source, reclaim the Sky Core.',
                    '⏳ カウントダウン開始：三日。\n📋 目標：S級「霆王」本源へ突破し、天穹の核を奪還する。'
                ))
            ],
            playerReply: txt('三天。父亲用三天完成的事，我也可以用三天完成。为了这座城市，为了伙伴，为了——不辜负任何一个人的约定。', 'Three days. What my father did in three days, I can do too. For this city, for my friends, for — every promise I refuse to break.', '三日。父が三日で成し遂げたことを、俺も三日で成し遂げる。この街のために、仲間のために、そして——誰の約束も裏切らないために。'),
            choices: [
                makeChoice(txt('⛈️ 闭关三天：在天台雷暴中冲击霆王本源', `⛈️ Seclude for three days: break through to the Thunder King source in the rooftop storm`, `⛈️ 三日間の修行：屋上の雷嵐で霆王本源へ挑む`), 'blaze_ch4_start', { power: 15, bond: 1 }, 'risk', txt('三天后，你从天台走下来，眼底有雷光流转。', 'Three days later, you descend from the rooftop — lightning flickering in your eyes.', '三日後、屋上から降りてくる——その瞳に雷光が揺らめいている。'), 'perfect'),
                makeChoice(txt('🤝 不独自闭关——与伙伴们一起特训、一起布阵', `🤝 Don\'t seclude alone — train and scheme with your team`, `🤝 一人で閉じこもらない——仲間と共に特訓し、布陣する`), 'blaze_ch4_plan', { bond: 5, clue: 1 }, 'empathy', txt('这三天，你们谁也不曾独行。', 'For those three days, none of you walked alone.', 'その三日間、誰一人として独りではなかった。'), 'good'),
                makeChoice(txt('📖 翻阅父亲的遗物，寻找霆王传承的真正意义', `📖 Go through your father\'s belongings — seek the true meaning of the Thunder King legacy`, `📖 父の遺品を調べ、霆王の継承の真の意味を探る`), 'blaze_ch4_heritage', { clue: 2, bond: 2 }, 'truth', txt('你找到了父亲留给你的最后一封信。', 'You find your father\'s last letter to you.', '父が君に残した最後の手紙を見つける。'), 'hidden')
            ]
        }
    },
    startScene: 'blaze_ch3_start'
};

// ========== 第四章：雷霆涅槃 ==========
var blaze_ch4 = {
    id: 'blaze_ch4',
    titleKey: 'blazeCh4Title',
    subtitleKey: 'blazeCh4Sub',
    // 原生故事函数定义（消息型函数：调用时播放 messages → 用 returnValue 表达式求返回值）
    // 蓝图导入后自动转成「函数开始 → 对话/旁白 → 返回值」子蓝图，可在设计器中继续编辑
    functions: {
        resonance_sync: {
            name: '共鸣指数',
            params: ['power', 'bond'],
            returns: ['resonance'], // 输出变量（二创转蓝图后：函数节点 out_resonance 引脚 / returnValue 表达式求值写入）
            messages: [
                makeSystem(txt(
                    '⚡ 源脉共鸣同步序列启动……计算完成。',
                    '⚡ Source-vein resonance sync initiated... computed.',
                    '⚡ 源脈共鳴同期シーケンス起動……計算完了。'
                ))
            ],
            returnValue: 'power + bond * 10'
        }
    },
    narrator: txt(
        '第三天，黄昏。天穹之核的暗色笼罩着整座新穹市，像一个巨大的囚笼。白瞳的最后通牒，还剩下最后的夜晚。',
        'Day three, dusk. The Sky Core\'s darkness hangs over all of Xinqiong City like a vast cage. Bai Tong\'s ultimatum has one night left.',
        '三日目、黄昏。天穹の核の暗色が新穹市全体を覆い、巨大な檻のようだ。白瞳の最後通告まで、残るは最後の一夜。'
    ),
    scenes: {
        /* 天台闭关线：决战前夜源脉共鸣同步（fnCall 消息型函数 → 函数体消息 + 返回值 → 旁白插值展示）
           注：原 blaze_ch4_sync 独立场景因跨章跳转（ch3_fall 选项直接进本场景）成为孤儿，已并入主线 */
        blaze_ch4_start: {
            fnCall: {
                fnId: 'resonance_sync',
                args: { power: { t: 'var', v: 'power' }, bond: { t: 'var', v: 'bond' } },
                resultVar: 'resonance',
                resultVars: { resonance: 'resonance' }
            },
            messages: [
                makeNarrator(txt(
                    '天穹之核的辉光与你的源脉同频共振——共鸣指数 {resonance}。这个数字，将决定今晚你能撬动多少雷霆。',
                    'The Sky Core\'s glow resonates with your Source Vein — resonance index {resonance}. This number decides how much thunder you can move tonight.',
                    '天穹の核の輝きが君の源脈と共鳴する——共鳴指数 {resonance}。この数字が、今夜どれだけの雷を動かせるかを決める。'
                )),
                makeNarrator(txt(
                    '天台，雷云在头顶翻涌。三天的极限修行里，你一次次冲击霆王本源的门槛，一次次被反震回来。此刻你浑身是伤，源脉里残余的电流像断掉的琴弦。你抬头，看见晚晴站在天台入口，手里端着保温杯：「喝点水。然后——我来当你的对手。」',
                    'Rooftop, thunderclouds churning overhead. In three days of brutal training, you\'ve hurled yourself against the Thunder King\'s threshold again and again, each time thrown back. Now you\'re bruised all over, the remaining current in your Source Vein like snapped strings. You look up — Wanqing stands at the roof entrance with a thermos: "Drink some water. Then — I\'ll be your opponent."',
                    '屋上、頭上で雷雲が渦巻く。三日間の限界修行で、何度も霆王本源の扉を叩き、何度も弾き返された。今や全身傷だらけ、源脈に残る電流は切れた琴線のようだ。顔を上げると、晚晴が屋上の入口に立ち、水筒を手にしている：「水を飲んで。それから——私が相手になる。」'
                )),
                makeCharacter('wanqing', txt(
                    '「你父亲突破 S 级时，面对的也是背水一战。{player_name}——雷霆不是靠蛮力凝聚的，是靠『想守护的东西』点燃的。」她伸出指尖，一点感知的微光落进你的源脉：「把我对你的信任，也一并点燃吧。」',
                    '"When your father broke through to S-rank, he faced the same last stand. {player_name} — thunder isn\'t forged from raw force. It\'s lit by what you want to protect." She extends a fingertip; a mote of perception light sinks into your Source Vein: "Set my trust in you on fire too."',
                    '「お父さんがS級へ突破した時も、背水の陣だった。{player_name}——雷霆は蛮力で練るものじゃない。『守りたいもの』によって灯るんだ。」彼女は指先を伸ばし、一点の感知の光が君の源脈に落ちる：「私の信頼も、一緒に燃やして。」'
                )),
                makeNarrator(txt(
                    '那一瞬间，你源脉深处那道尘封的门——裂开了一道缝。霆王本源，第一次在你体内苏醒。',
                    'In that instant, the long-sealed door deep in your Source Vein — cracks open. The Thunder King\'s source awakens within you for the first time.',
                    'その瞬間、源脈の奥で封じられていた扉が——ひび割れた。霆王本源が、初めて君の中で目覚める。'
                ))
            ],
            playerReply: txt('「为了想守护的东西而点燃」——父亲，晚晴，师父，伙伴。这就是我的雷霆。', '"Lit by what I want to protect" — Father, Wanqing, Master, my friends. This is my thunder.', '「守りたいもののために灯す」——父、晚晴、師匠、仲間。これが俺の雷霆だ。'),
            choices: [
                makeChoice(txt('⚡ 握住晚晴的手，借雷霆之约冲破门槛', `⚡ Take Wanqing\'s hand and break through on the vow of thunder`, `⚡ 晚晴の手を握り、雷霆の約束で扉を破る`), 'blaze_ch4_final', { power: 15, bond: 2 }, 'truth', txt('雷霆，涅槃。', 'Thunder, reborn.', '雷霆、涅槃。'), 'perfect')
            ]
        },

        /* 团队特训线 */
        blaze_ch4_plan: {
            messages: [
                makeNarrator(txt(
                    '白塔的训练场，被你们改成了战前动员室。王大柱举着哑铃当讲台，林小满在墙上投影出白瞳的暗幕分析图：「他的暗幕会吸收异能。但有个死角——大柱的岩系没有『能量属性』，是纯物理。也就是说，大柱的拳头，暗幕吸不动。」',
                    'The White Tower training hall, converted into a war-room. Wang Dazhu uses a dumbbell as a podium while Lin Xiaoman projects an analysis of Bai Tong\'s dark veil: "His veil absorbs abilities. But there\'s a blind spot — Dazhu\'s Rock class has no \'energy attribute\'; it\'s pure physics. Meaning: his fist, the veil can\'t absorb."',
                    '白塔の訓練場は、戦前の作戦室に改造された。王大柱がダンベルを演台にして、林小満が白瞳の暗幕の分析図を投影する：「彼の暗幕は異能を吸収する。だが死角がある——大柱の岩系は『エネルギー属性』がなく、純粋な物理だ。つまり、大柱の拳は暗幕が吸えない。」'
                )),
                makeCharacter('dazhu', txt(
                    '「那还等什么！{player_name}哥你负责把他定住，我负责把他揍出屎来！就这么说定了！」',
                    '"Then what are we waiting for! {player_name}, you pin him down, and I\'ll punch the daylights out of him! Deal!"',
                    '「なら待ってる場合か！{player_name}兄はアイツを押さえ込め、俺がぶん殴る！これで決まりだ！」'
                )),
                makeCharacter('wanqing', txt(
                    '「{player_name}，这三天我们一起推演了四十三种战术。我最喜欢第四十四种——」她微微一笑：「没有战术。因为我相信，当你真正站在他面前时，你会知道该怎么做。」',
                    '"{player_name}, in these three days we rehearsed forty-three tactics. My favorite is the forty-fourth —" she smiles: "No tactic. Because I believe that when you truly stand before him, you\'ll know what to do."',
                    '「{player_name}、この三日間で四十三の戦術を推演した。私が一番好きなのは四十四番目——」彼女は微笑む：「戦術なし。だって、本当に彼の前に立った時、君は何をすべきか分かっているから。」'
                )),
                makeSystem(txt(
                    '🤝 羁绊升华：这支小队，已经是一支真正的守护者之队。',
                    '🤝 Bonds forged: this team is already a true guardian squad.',
                    '🤝 絆の昇華：このチームは、既に真の守護者の一団だ。'
                ))
            ],
            playerReply: txt('四十四种战术，第四十四种是「相信」。这大概就是伙伴的意义。', 'Forty-three tactics, and the forty-fourth is "trust." That\'s what partners mean.', '四十三の戦術、四十四番目は「信頼」。それが仲間の意味だ。'),
            choices: [
                makeChoice(txt('🤜 与伙伴击掌，出发——决战天穹之核', `🤜 Fist-bump your team and set out — battle at the Sky Core`, `🤜 仲間と拳を合わせ、出発——天穹の核で決戦だ`), 'blaze_ch4_final', { bond: 3, power: 10 }, 'empathy', txt('四道身影，并肩走入夜色。', 'Four figures walk into the night, shoulder to shoulder.', '四人の影が、肩を並べて夜へ歩む。'), 'perfect')
            ]
        },

        /* 父亲遗物线 */
        blaze_ch4_heritage: {
            messages: [
                makeNarrator(txt(
                    '白塔的旧物仓库。你在师父的旧箱子里，找到一枚锈蚀的霆王徽章——徽章背面刻着一行字：「澈儿，雷霆从来不是一种力量，而是一种守护。当你想保护的东西足够重要，天地间的雷，都会为你让路。——凌啸天」',
                    'The Tower\'s old-storage room. In your master\'s old chest, you find a rusted Thunder King emblem — engraved on the back: "Che\'er, thunder was never a power. It is a guardianship. When what you wish to protect matters enough, all the thunder under heaven will make way for you. — Ling Xiaotian"',
                    '白塔の倉庫。師匠の古い箱の中に、錆びた霆王の徽章を見つける——裏面に刻まれている：「澈へ。雷霆は決して力ではない。一つの守りだ。守りたいものが十分に大切なら、天の下の雷はすべて、君のために道を開ける。——凌啸天」'
                )),
                makeCharacter('shen', txt(
                    '「这枚徽章，是你父亲临终前让我转交给你的。他说，霆王传承的不是本源——是本心。你问过自己吗，澈儿：你要守护的，到底是什么？」',
                    '"This emblem, your father asked me to pass to you before he died. He said the Thunder King legacy isn\'t the source — it\'s the heart. Ask yourself, Che\'er: what is it, exactly, that you wish to guard?"',
                    '「この徽章は、父が臨終の際に君へ渡すよう私に託したものだ。彼は言った——霆王が継承するのは本源ではない。本心だと。自分に問うてみろ、澈：君が守りたいものは、一体何だ？」'
                )),
                makeNarrator(txt(
                    '你握紧那枚冰冷的徽章，掌心却渐渐发烫。源脉深处，一道尘封十二年的门——终于在你的心跳声中，裂开了一道缝。',
                    'You grip the cold emblem — yet your palm grows warm. Deep in your Source Vein, a door sealed for twelve years finally cracks open to the rhythm of your heartbeat.',
                    '冷たい徽章を握り締める——だが掌が次第に熱くなる。源脈の奥で、十二年封じられていた扉が、君の鼓動に合わせて、ようやくひび割れていく。'
                ))
            ],
            playerReply: txt('我要守护的——是这座城市，是伙伴，是师父，是父亲用命换来的那个「堂堂正正长大」的约定。', 'What I wish to guard — this city, my friends, my master, and the promise my father bought with his life: to "grow up with my head held high."', '俺が守りたいもの——この街、仲間、師匠、そして父が命と引き換えに買った「堂々と育つ」という約束。'),
            choices: [
                makeChoice(txt('⚡ 戴上霆王徽章，走向天穹之核', `⚡ Wear the Thunder King emblem and walk toward the Sky Core`, `⚡ 霆王の徽章を身に着け、天穹の核へ歩む`), 'blaze_ch4_final', { flag_truth: true, power: 10, bond: 2 }, 'truth', txt('天地之间，雷声渐起。', 'Across heaven and earth, thunder begins to rise.', '天地の間に、雷鳴が立ち始める。'), 'perfect')
            ]
        },

        /* 最终决战 */
        blaze_ch4_final: {
            messages: [
                makeNarrator(txt(
                    '天穹之核之下，白瞳悬于半空，脚下的城市灯火尽熄，唯有他身周的紫黑之潮在缓缓呼吸。他睁开眼，看着你：「三天之期已到。看来，你已经见过你父亲的遗物了——霆王血脉，果然会自己找上门来。」',
                    'Beneath the Sky Core, Bai Tong hovers mid-air; the city\'s lights are all out, only the violet-black tide breathing slowly around him. He opens his eyes and regards you: "The three days are up. It seems you\'ve found your father\'s keepsake — the Thunder King bloodline does come calling on its own."',
                    '天穹の核の下、白瞳が空中に浮かび、足元の街の灯りは全て消え、彼の周囲の紫黒の潮だけがゆっくりと呼吸している。彼は目を開け、君を見る：「三日の期限が来た。どうやら父の遺品を見つけたようだな——霆王の血脈は、やはり自らやってくる。」'
                )),
                makeCharacter('baitong', txt(
                    '「圣物归还之日，就是这座城市的新生。你们的『科学』、你们的源脉、你们的等级——都将被暗蚀洗净。没有异能的城，才配得上真正的平等。」',
                    '"The day the relic returns is this city\'s rebirth. Your \'science,\' your Source Veins, your ranks — all will be cleansed by the erosion. A city without abilities deserves true equality."',
                    '「聖物が還る日こそ、この街の新生だ。お前たちの『科学』も『源脈』も『等級』も——全て暗蝕が洗い流す。異能のない街こそ、真の平等に値する。」'
                )),
                makeCharacter('lingche', txt(
                    '「少扯什么平等了。你所谓的『洗净』，是要全城的异能者拿命来换！白瞳——我父亲十二年前没做完的事，今天我来替他做完！」',
                    '"Spare me your talk of equality. Your \'cleansing\' costs every esper in this city their lives! Bai Tong — what my father couldn\'t finish twelve years ago, I\'ll finish for him today!"',
                    '「平等なんて言うな。お前の『洗い流す』は、全市の異能者の命を代償にするってことだ！白瞳——父が十二年前にやり残したことを、今日俺が代わりに終わらせる！」'
                )),
                makeSystem(txt(
                    '⚡ 霆王本源，完全觉醒。你抬手，指尖凝出一枚硬币——天穹之核的辉光，第一次回应了你。',
                    '⚡ Thunder King source, fully awakened. You raise your hand, a coin condensing at your fingertip — for the first time, the Sky Core\'s light answers you.',
                    '⚡ 霆王本源、完全覚醒。手を掲げ、指先に一枚のコインが凝縮する——天穹の核の輝きが、初めて君に応える。'
                ))
            ],
            playerReply: txt('硬币上抛的那一刻，整座城市所有的光，都汇聚于你的指尖。',
            'The moment the coin is tossed, all the light of the city gathers at your fingertips.',
            'コインが放たれる瞬間、街中のすべての光が君の指先に集まる。'),
            choices: [
                (function() {
                    var c = makeChoice(txt('🌩️ 九霄霆王炮 · 全力！', `🌩️ Sky-Shattering Thunder Cannon · Full Power!`, `🌩️ 九霄霆王砲 · 全力！`), 'blaze_end_perfect',
                        { flag_save_all: true }, 'truth',
                        txt('雷光撕开暗幕，天地为之失声。', 'Lightning tears the dark veil; heaven and earth fall silent.', '雷光が暗幕を裂き、天地が言葉を失う。'), 'perfect');
                    c.condition = [{ variable: 'power', operator: '>=', value: 50 }, { variable: 'clue', operator: '>=', value: 2 }, { variable: 'bond', operator: '>=', value: 3 }];
                    return c;
                })(),
                (function() {
                    var c = makeChoice(txt('⚡ 雷霆连击 · 倾尽所有', `⚡ Thunder Volley · Everything I have`, `⚡ 雷霆連撃 · 全てを懸けて`), 'blaze_end_good', {}, 'empathy',
                        txt('雷光与暗蚀在天空对撞。', 'Thunder and erosion collide in the sky.', '雷霆と暗蝕が空で激突する。'), 'good');
                    c.condition = { variable: 'power', operator: '>=', value: 45 };
                    return c;
                })(),
                (function() {
                    var c = makeChoice(txt('🤝 放下硬币——握住师父与伙伴的手', `🤝 Lower the coin — take Master\'s and your friends\' hands`, `🤝 コインを下ろす——師匠と仲間の手を握る`), 'blaze_end_hidden', {}, 'empathy',
                        txt('你选择了比雷霆更强大的东西。', 'You choose something stronger than thunder.', '雷霆よりも強いものを選ぶ。'), 'good');
                    c.condition = [{ variable: 'flag_truth', operator: '==', value: true }, { variable: 'bond', operator: '>=', value: 4 }];
                    return c;
                })(),
                (function() {
                    var c = makeChoice(txt('😤 拼尽最后一丝电光——绝不后退', `😤 Burn the last spark — never retreat`, `😤 最後の一筋の電光まで燃やす——絶対に退かない`), 'blaze_end_bad', {}, 'risk',
                        txt('电流在指尖发出最后的悲鸣。', 'The current lets out a final cry at your fingertip.', '指先の電流が最後の悲鳴を上げる。'), 'risk');
                    c.condition = { variable: 'power', operator: '<', value: 45 };
                    return c;
                })()
            ]
        },

        /* ── 结局：完美 · 守护者传说 ── */
        blaze_end_perfect: {
            messages: [
                makeNarrator(txt(
                    '硬币升空，化作一点刺目的白光。九霄霆王炮贯穿暗幕的刹那，整个新穹市的雷云同时炸响——万雷奔涌，汇聚成一道撕裂苍穹的雷柱，将白瞳的暗蚀连根掀翻。天穹之核的紫黑色褪去，重新亮起纯净的白昼之光。',
                    'The coin ascends, a blinding point of white. The moment the Sky-Shattering Thunder Cannon pierces the veil, every thundercloud in Xinqiong City roars at once — ten thousand bolts surge together into a pillar that splits the sky, ripping Bai Tong\'s erosion out by the root. The violet-black fades from the Sky Core, and the pure daylight glow returns.',
                    'コインが昇り、眩い一点の白光となる。九霄霆王砲が暗幕を貫いた刹那、新穹市中の雷雲が同時に轟く——万雷が奔り、天を裂く雷柱となって、白瞳の暗蝕を根こそぎ吹き飛ばす。天穹の核の紫黒が褪せ、純粋な白昼の光が戻る。'
                )),
                makeCharacter('lingche', txt(
                    '「白瞳。你错了——真正的平等，不是让所有人变弱，而是让每个想守护的人，都有变强的理由。」',
                    '"Bai Tong. You were wrong — true equality isn\'t making everyone weak. It\'s giving everyone who wants to protect something a reason to grow strong."',
                    '「白瞳。お前は間違っていた——本当の平等とは、皆を弱くすることじゃない。守りたいものがある全ての人に、強くなる理由を与えることだ。」'
                )),
                makeCharacter('shen', txt(
                    '白塔之巅，沈孤鸿看着雷光中那道身影，难得地笑了：「凌啸天，你儿子……比你还能打。」',
                    'Atop the White Tower, Shen Guhong watches the figure in the lightning and smiles — rarely: "Ling Xiaotian, your son... hits harder than you."',
                    '白塔の頂で、沈孤鴻は雷光の中のその姿を見つめ、珍しく笑う：「凌啸天、お前の息子は……お前より強いな。」'
                )),
                makeSystem(txt(
                    '🔔 新穹市的钟声，第一次为守护者而鸣。',
                    '🔔 The bells of Xinqiong City ring for its guardians for the first time.',
                    '🔔 新穹市の鐘が、初めて守護者のために鳴る。'
                ))
            ],
            isEnding: true,
            endingId: 'blaze_perfect',
            endingTitleKey: 'blazeEndPerfectTitle',
            endingDescKey: 'blazeEndPerfectDesc'
        },

        /* ── 结局：普通 · 黎明之后 ── */
        blaze_end_good: {
            messages: [
                makeNarrator(txt(
                    '雷光与暗蚀在天穹对撞，撕裂了白瞳的暗幕——但他临死前的一击，也让天穹之核布满了裂纹。最后一刻，你勉强用雷网护住了伙伴们，自己却被余波掀翻在废墟里。城市保住了。但天穹之核，碎了。',
                    'Thunder and erosion clash in the sky, tearing Bai Tong\'s veil apart — but his final strike leaves the Sky Core riddled with cracks. In the last moment, you barely shield your friends with a lightning net, only to be hurled into the rubble yourself. The city is saved. But the Sky Core is shattered.',
                    '雷霆と暗蝕が空で激突し、白瞳の暗幕を引き裂く——だが彼の最期の一撃が、天穹の核に無数の亀裂を刻む。最後の瞬間、君は辛うじて雷網で仲間を守り、自分は余波で瓦礫に吹き飛ばされる。街は救われた。だが天穹の核は、砕けた。'
                )),
                makeCharacter('wanqing', txt(
                    '「澈！你怎么样！」她冲过来扶起你，声音第一次带了哭腔。你咳了两声，笑着看她：「没事……就是有点心疼那枚硬币，它可值三块钱呢。」',
                    '"Che! Are you okay!" She rushes over, voice cracking for the first time. You cough twice and grin at her: "I\'m fine... just a little sad about that coin — it cost three yuan, you know."',
                    '「澈！大丈夫か！」彼女が駆け寄って支える。声が初めて震えている。君は二度咳き込み、笑いながら彼女を見る：「大丈夫……ただあのコインがもったいないな。三円もしたんだ。」'
                )),
                makeCharacter('dazhu', txt(
                    '「害，三块钱算啥！澈哥你看——」大柱摊开手，掌心里躺着那枚被雷光熔成一团的小硬币：「咱把它供起来，就当是咱们守护者小队的队徽了！」',
                    '"Pfft, three yuan\'s nothing! Che-ge look—" Dazhu opens his palm, revealing the little coin melted into a lump by the lightning: "Let\'s enshrine it — the badge of our guardian squad!"',
                    '「三円くらい何だってんだ！澈兄見て——」大柱が手のひらを開くと、雷光で一塊に溶けた小銭が転がっている：「これを祀ろうぜ——俺たち守護者小隊の隊章ってことで！」'
                )),
                makeSystem(txt(
                    '🌅 新穹市失去了永夜后的第一缕晨光，也失去了倚仗千年的力量。但破晓时分，城市的第一盏灯，是四个人一起点亮的。',
                    '🌅 Xinqiong loses the first light after eternal night — and the power it leaned on for a millennium. But at dawn, the city\'s first lamp is lit by four pairs of hands together.',
                    '🌅 新穹市は永夜の後の初光を失い、千年頼ってきた力も失う。だが夜明け、街の最初の灯りは、四人の手で一緒に点けられた。'
                ))
            ],
            isEnding: true,
            endingId: 'blaze_good',
            endingTitleKey: 'blazeEndGoodTitle',
            endingDescKey: 'blazeEndGoodDesc'
        },

        /* ── 结局：隐藏 · 孤鸿之约 ── */
        blaze_end_hidden: {
            messages: [
                makeNarrator(txt(
                    '你放下硬币，握住师父与伙伴的手。白瞳冷笑：「放弃雷霆？你以为这样就能阻止我——」话音未落，一道冰蓝色的光冲天而起。沈孤鸿将十二年的本源一次点燃，化作万里冰墙，将白瞳连人带暗蚀一同封入天穹之核的地基。',
                    'You lower the coin and take your master\'s and your friends\' hands. Bai Tong sneers: "Abandoning thunder? You think that stops me—" Before he finishes, an ice-blue light shoots skyward. Shen Guhong ignites twelve years of source at once, a ten-thousand-li wall of ice sealing Bai Tong and his erosion into the Sky Core\'s foundation.',
                    '君はコインを下ろし、師匠と仲間の手を握る。白瞳は嘲笑う：「雷霆を捨てる？それで俺を止められると思っているのか——」言い終わる前に、氷青の光が天へ昇る。沈孤鴻は十二年の本源を一気に燃やし、万里の氷壁となって、白瞳を暗蝕ごと天穹の核の基盤へ封じ込める。'
                )),
                makeCharacter('shen', txt(
                    '「别哭，澈儿。师父只是去赴一个十二年前的约——那个没守住的约，今天，总算守住了。」他的身影开始变得透明，却依然伸出手，揉了揉你的头：「好好长大。替师父……看着这座城，看着大家。」',
                    '"Don\'t cry, Che\'er. Master is only going to keep a twelve-year-old promise — the one I failed to keep. Today, at last, it\'s kept." His figure begins to turn transparent, yet he still reaches out and ruffles your hair: "Grow up well. For your master... watch over this city, watch over everyone."',
                    '「泣くな、澈。師匠は十二年前の約束を果たしに行くだけだ——果たせなかった約束を、今日ようやく果たす。」彼の姿が透明になり始めるが、それでも手を伸ばし、君の頭を撫でる：「しっかり育つのだ。師匠の代わりに……この街を、みんなを見守るのだ。」'
                )),
                makeCharacter('lingche', txt(
                    '「师父——不。父亲！」你终于喊出了那个十二年来只敢在心里默念的称呼。沈孤鸿在消散前，笑了：「……好儿子。比你爹，争气。」',
                    '"Master — no. Father!" You finally cry out the word you\'ve only dared to whisper for twelve years. Before he fades, Shen Guhong smiles: "...Good son. More than your old man ever managed."',
                    '「師匠——いや、父さん！」ついに十二年、心の中でしか呟けなかった言葉を叫ぶ。消えゆく前に、沈孤鴻は笑う：「……いい息子だ。お前の親父より、立派だ。」'
                )),
                makeSystem(txt(
                    '❄️ 天穹之核重新亮起——那道光里，多了一抹再也化不开的冰蓝。',
                    '❄️ The Sky Core reignites — and within its light, a streak of ice-blue that will never thaw.',
                    '❄️ 天穹の核が再び輝く——その光の中に、決して溶けることのない一抹の氷青が混ざっている。'
                ))
            ],
            isEnding: true,
            endingId: 'blaze_hidden',
            endingTitleKey: 'blazeEndHiddenTitle',
            endingDescKey: 'blazeEndHiddenDesc'
        },

        /* ── 结局：坏 · 熄灭的灯火 ── */
        blaze_end_bad: {
            messages: [
                makeNarrator(txt(
                    '最后一丝电流在指尖熄灭。霆王炮没能击穿暗幕——白瞳的暗蚀吞噬了那道雷光，也吞噬了天穹之核最后的光芒。紫黑色的潮水漫过城市，灯光一盏一盏地熄灭。',
                    'The last spark dies at your fingertip. The Thunder Cannon fails to pierce the veil — Bai Tong\'s erosion devours that lightning, and the last light of the Sky Core with it. The violet-black tide floods the city, lamps going out one by one.',
                    '最後の一筋の電流が指先で消える。霆王砲は暗幕を撃ち抜けず——白瞳の暗蝕がその雷光を喰らい、天穹の核の最後の光も共に喰らう。紫黒の潮が街を覆い、灯りが一つずつ消えていく。'
                )),
                makeCharacter('lingche', txt(
                    '「……对不起。我……」你跪在废墟里，声音沙哑。满身伤痕的苏晚晴走过来，在你身边坐下，轻轻擦去你脸上的灰：「澈，我们还没输。灯灭了，就再点一盏。」',
                    '"...I\'m sorry. I..." You kneel in the rubble, voice hoarse. Battered Su Wanqing walks over, sits beside you, and gently wipes the ash from your face: "Che, we haven\'t lost. If the lamp is out, light another."',
                    '「……ごめん。俺……」瓦礫の中に跪き、声が嗄れる。傷だらけの蘇晚晴が歩み寄り、君の隣に座り、そっと顔の灰を拭う：「澈、私たちはまだ負けてない。灯りが消えたら、もう一度点ければいい。」'
                )),
                makeCharacter('dazhu', txt(
                    '「对！一次打不赢就两次，两次打不赢就三次！我王大柱这辈子就没怕过谁！」他把沙包大的拳头举向夜空：「明天的太阳，一定会升起来！」',
                    '"Right! If we can\'t win in one fight, we fight twice; can\'t win in two, we fight three! Wang Dazhu has never been afraid of anyone in his life!" He raises his boulder of a fist toward the night sky: "Tomorrow\'s sun — it WILL rise!"',
                    '「そうだ！一回で勝てなきゃ二回、二回で駄目なら三回！俺、王大柱は生まれてこのかた誰も怖がったことはない！」岩のような拳を夜空へ掲げる：「明日の太陽は——必ず昇る！」'
                )),
                makeSystem(txt(
                    '🌑 新穹市坠入黑暗。但黑暗里，有几盏灯，从未熄灭。',
                    '🌑 Xinqiong City falls into darkness. But in the dark, a few lamps never go out.',
                    '🌑 新穹市は闇に堕ちる。だが暗闇の中で、いくつかの灯りは、決して消えない。'
                ))
            ],
            isEnding: true,
            endingId: 'blaze_bad',
            endingTitleKey: 'blazeEndBadTitle',
            endingDescKey: 'blazeEndBadDesc'
        }
    },
    startScene: 'blaze_ch4_start'
};

// ========== 注册 ==========
window.STORY_CHAPTERS.push(blaze_ch1, blaze_ch2, blaze_ch3, blaze_ch4);

if (window.CHARACTERS) {
    Object.assign(window.CHARACTERS, {
        lingche: character_lingche,
        wanqing: character_wanqing,
        dazhu: character_dazhu,
        xiaoman: character_xiaoman,
        shen: character_shen,
        baitong: character_baitong
    });
}
