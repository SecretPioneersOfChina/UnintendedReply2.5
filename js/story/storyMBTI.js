/**
 * storyMBTI.js - 心灵之约：与大师对话，测试 MBTI 人格类型
 * 《无心之举 / Unintended Reply》
 *
 * 玩法：玩家在山中遇到一位神秘大师，通过 8 个维度问题
 * （E/I、S/N、T/F、J/P 各 2 题），最终揭示 MBTI 人格类型。
 */

// ========== 角色 ==========
var character_master = {
    id: 'master',
    nameKey: 'mbtiCharMaster',
    color: '#a78bfa',
    avatar: '🧘',
    description: '山中修行的智者，能看透人心'
};

// ========== MBTI 16 类型数据 ==========
var MBTI_TYPES = {
    ISTJ: { zh: '物流师',     en: 'Logistician',   ja: '管理者',     icon: '🗂️', desc_zh: '你实际、注重事实，可靠且有条理。你善于执行既定计划，是团队中坚实的后盾。对承诺，你言出必行。', desc_en: 'You are practical, factual, reliable and organized. You excel at executing established plans and are the solid backbone of any team. When you make a promise, you keep it.', desc_ja: '現実的で事実重視、頼りになり整然としている。既定計画の実行に長け、チームの堅固な支えとなる。約束は必ず守る。' },
    ISFJ: { zh: '守卫者',     en: 'Defender',       ja: '擁護者',     icon: '🛡️', desc_zh: '你安静、体贴，珍视承诺。你默默守护着身边的人，用行动而非言语表达关怀。你记得每个人的喜好与烦恼。', desc_en: 'You are quiet, considerate and value commitment. You quietly protect those around you, expressing care through actions rather than words. You remember everyone\'s likes and worries.', desc_ja: '物静かで思いやりがあり、約束を大切にする。言葉ではなく行動で気遣いを示し、身近な人々を静かに守る。皆の好みや悩みを覚えている。' },
    INFJ: { zh: '提倡者',     en: 'Advocate',       ja: '提唱者',     icon: '🕊️', desc_zh: '你理想主义且富有洞察力。你追求生活的意义，渴望让世界变得更好。你能敏锐地感知他人的情感与需要。', desc_en: 'You are idealistic and insightful. You seek meaning in life and yearn to make the world a better place. You perceive others\' emotions and needs with sharp intuition.', desc_ja: '理想主義で洞察力に富む。人生の意味を追い求め、世界をより良くしたいと願う。他者の感情とニーズを鋭く感じ取る。' },
    INTJ: { zh: '建筑师',     en: 'Architect',      ja: '建築家',     icon: '🏛️', desc_zh: '你独立、战略性强，总是着眼于未来。你用逻辑构建宏大的计划，不被眼前的琐事干扰。独处是你最好的思考状态。', desc_en: 'You are independent and strategic, always looking toward the future. You build grand plans with logic, undisturbed by trivialities. Solitude is where you think best.', desc_ja: '独立心が強く戦略的で、常に未来を見据える。論理で壮大な計画を組み立て、些末なことに惑わされない。一人の時間が最良の思考をもたらす。' },
    ISTP: { zh: '鉴赏家',     en: 'Virtuoso',       ja: '巨匠',       icon: '🔧', desc_zh: '你冷静、灵活，善于动手解决实际问题。你在危机中保持镇定，享受探索与试错带来的乐趣。', desc_en: 'You are calm and flexible, skilled at solving practical problems with your hands. You stay composed in crisis and enjoy the thrill of exploration and trial-and-error.', desc_ja: '冷静で柔軟、実践的な問題解決に長ける。危機でも動じず、探求と試行錯誤の楽しさを味わう。' },
    ISFP: { zh: '探险家',     en: 'Adventurer',     ja: '冒険家',     icon: '🎨', desc_zh: '你温和、敏感，忠于自己的价值观。你用艺术的方式感受世界，在平凡中发现诗意。', desc_en: 'You are gentle and sensitive, loyal to your own values. You experience the world artistically, finding poetry in the ordinary.', desc_ja: '穏やかで繊細、自分の価値観に忠実。芸術的な感覚で世界を体験し、日常に詩情を見出す。' },
    INFP: { zh: '调停者',     en: 'Mediator',       ja: '調停者',     icon: '🌙', desc_zh: '你富有同理心，坚持内心理想。你是温柔的梦想家，即使世界不完美，也相信美好值得守护。', desc_en: 'You are empathetic and hold fast to your inner ideals. A gentle dreamer, you believe beauty is worth protecting even in an imperfect world.', desc_ja: '共感力が高く、内なる理想を貫く。優しい夢想家であり、不完全な世界でも美しさを守る価値があると信じる。' },
    INTP: { zh: '逻辑学家',   en: 'Logician',       ja: '論理学者',   icon: '🔬', desc_zh: '你好奇、理性，热爱思考。你不满足于表面答案，不断追问「为什么」，探索理论的边界。', desc_en: 'You are curious and rational, a lover of thought. Unsatisfied with surface answers, you keep asking "why" and explore the edges of theory.', desc_ja: '好奇心旺盛で理性的、考えることを愛する。表面的な答えに満足せず「なぜ」を問い続け、理論の限界を探る。' },
    ESTP: { zh: '企业家',     en: 'Entrepreneur',   ja: '起業家',     icon: '🎯', desc_zh: '你精力充沛，是行动派。你喜欢冒险，活在当下，总能在紧急关头做出果断决策。', desc_en: 'You are energetic and action-oriented. You love adventure and live in the moment, making decisive calls in critical moments.', desc_ja: '精力旺盛な行動派。冒険を愛し、今を生きる。緊急時に果断な決断を下せる。' },
    ESFP: { zh: '表演者',     en: 'Entertainer',    ja: '芸能人',     icon: '🎉', desc_zh: '你热情、乐观，是聚会的焦点。你让平凡的生活充满乐趣，身边的人总能被你感染。', desc_en: 'You are warm and optimistic, the life of the party. You fill ordinary life with joy, and those around you are always lifted by your presence.', desc_ja: '情熱的で楽観的、パーティーの中心人物。平凡な日常に楽しさを満たし、周囲をいつも明るくする。' },
    ENFP: { zh: '竞选者',     en: 'Campaigner',     ja: '運動家',     icon: '🌟', desc_zh: '你充满热情与创造力，拥抱一切可能性。你激励他人，用真诚连接每一个灵魂。', desc_en: 'You are full of passion and creativity, embracing every possibility. You inspire others and connect with every soul through sincerity.', desc_ja: '情熱と創造力に満ち、あらゆる可能性を受け入れる。誠実さで人を繋ぎ、他者を鼓舞する。' },
    ENTP: { zh: '辩论家',     en: 'Debater',        ja: '討論者',     icon: '💡', desc_zh: '你机智、敏捷，喜欢挑战常规。你是天生的创新者，总能看到别人忽略的角度。', desc_en: 'You are witty and quick, a challenger of conventions. A natural innovator, you always spot angles others overlook.', desc_ja: '機知に富み機敏、常識への挑戦者。生まれながらの革新者で、他者が見落とす視点を見つける。' },
    ESTJ: { zh: '总经理',     en: 'Executive',      ja: '幹部',       icon: '📋', desc_zh: '你果断、务实，是天生的组织者。你高效地让事情发生，用秩序和规则守护团队的运转。', desc_en: 'You are decisive and pragmatic, a born organizer. You make things happen efficiently, guarding your team\'s operation with order and rules.', desc_ja: '果断で実務的、生まれながらの組織者。効率よく物事を成し遂げ、秩序と規則でチームの運営を守る。' },
    ESFJ: { zh: '执政官',     en: 'Consul',         ja: '領事',       icon: '🤝', desc_zh: '你温暖、尽责，重视和谐。你是社区的黏合剂，总能察觉谁需要帮助，并伸出援手。', desc_en: 'You are warm and dutiful, valuing harmony. You are the glue of any community, always noticing who needs help and lending a hand.', desc_ja: '温かく責任感が強く、調和を重んじる。コミュニティの接着剤であり、助けを必要とする人に気づき手を差し伸べる。' },
    ENFJ: { zh: '主人公',     en: 'Protagonist',    ja: '主人公',     icon: '🌈', desc_zh: '你有魅力、利他，是天生的领导者。你鼓舞并引导他人，让每个人的潜能都被看见。', desc_en: 'You are charismatic and altruistic, a born leader. You inspire and guide others, making everyone\'s potential visible.', desc_ja: 'カリスマ性があり利他的、生まれながらのリーダー。人を鼓舞し導き、皆の可能性を引き出す。' },
    ENTJ: { zh: '指挥官',     en: 'Commander',      ja: '指揮官',     icon: '👑', desc_zh: '你自信、果断，是天生的战略家。你带领团队走向胜利，把远大的愿景变成现实。', desc_en: 'You are confident and decisive, a natural strategist. You lead teams to victory, turning grand visions into reality.', desc_ja: '自信と果断さを兼ね備えた生まれながらの戦略家。チームを勝利へ導き、壮大なビジョンを現実にする。' }
};

var MBTI_CODES = Object.keys(MBTI_TYPES);

// ========== 动态注册 i18n 翻译（避免改动 i18n.js 主文件） ==========
if (typeof I18N !== 'undefined' && I18N.strings) {
    // 结局类型文案
    I18N.strings.zh['endingMbti'] = '心灵启示';
    I18N.strings.en['endingMbti'] = 'Revelation';
    I18N.strings.ja['endingMbti'] = '啓示';
    // 大师角色名
    I18N.strings.zh['mbtiCharMaster'] = '慧心大师';
    I18N.strings.en['mbtiCharMaster'] = 'Master Huixin';
    I18N.strings.ja['mbtiCharMaster'] = '慧心大師';
    // 章节标题
    I18N.strings.zh['mbtiCh1Title'] = '心灵之约';
    I18N.strings.en['mbtiCh1Title'] = 'The Spiritual Meeting';
    I18N.strings.ja['mbtiCh1Title'] = '心の約束';
    I18N.strings.zh['mbtiCh1Sub'] = '在云雾缭绕的山中，一位神秘的大师等待着你';
    I18N.strings.en['mbtiCh1Sub'] = 'On a misty mountain, a mysterious master awaits you';
    I18N.strings.ja['mbtiCh1Sub'] = '霧に包まれた山で、神秘的な大師が待っている';
    // 16 种 MBTI 类型标题与描述
    MBTI_CODES.forEach(function(code) {
        var d = MBTI_TYPES[code];
        I18N.strings.zh['mbti_' + code] = d.zh + ' · ' + code;
        I18N.strings.en['mbti_' + code] = d.en + ' · ' + code;
        I18N.strings.ja['mbti_' + code] = d.ja + ' · ' + code;
        I18N.strings.zh['mbti_' + code + '_desc'] = d.desc_zh;
        I18N.strings.en['mbti_' + code + '_desc'] = d.desc_en;
        I18N.strings.ja['mbti_' + code + '_desc'] = d.desc_ja;
    });
}

// ========== 动态注册结局定义（提供图标与类型文案） ==========
MBTI_CODES.forEach(function(code) {
    window.ENDINGS['mbti_' + code] = {
        id: 'mbti_' + code,
        type: 'mbti',
        icon: MBTI_TYPES[code].icon,
        titleKey: 'mbti_' + code,
        descKey: 'mbti_' + code + '_desc',
        condition: function() { return false; } // 不由 checkEnding 触发，仅由场景 isEnding 触发
    };
});

// ========== 生成 16 个结局场景 ==========
function makeMbtiEndingScenes() {
    var scenes = {};
    MBTI_CODES.forEach(function(code) {
        var d = MBTI_TYPES[code];
        scenes['mbti_end_' + code] = {
            messages: [
                makeCharacter('master', txt(
                    `你的灵魂之印，是「${d.zh}」。`,
                    `Your soul's mark is the "${d.en}".`,
                    `あなたの魂の印は「${d.ja}」。`
                )),
                makeNarrator(txt(
                    `大师轻轻拂袖，山间的云雾仿佛为他所动，缓缓散开。他注视着你，眼中带着了然的笑意。`,
                    `The master gently waves his sleeve, and the mountain mist seems to part at his will. He gazes at you with knowing warmth.`,
                    `大師はそっと袖を払い、山の霧が彼の意のままに晴れていく。彼はあなたを見つめ、理解した笑みを浮かべる。`
                ))
            ],
            isEnding: true,
            endingId: 'mbti_' + code,
            endingTitleKey: 'mbti_' + code,
            endingDescKey: 'mbti_' + code + '_desc'
        };
    });
    return scenes;
}

// ========== 生成结果选择场景（16 个互斥条件选项） ==========
function makeMbtiResultScene() {
    var choices = [];
    MBTI_CODES.forEach(function(code) {
        var cond = [];
        // 每维度统一用前向计数判定：计数 >= 2 → 前向字母，否则 → 后向字母
        // 第 1 位 E/I：e_count >= 2 → E，否则 I
        cond.push({ variable: 'e_count', operator: code.charAt(0) === 'E' ? '>=' : '<', value: 2 });
        // 第 2 位 S/N：s_count >= 2 → S，否则 N
        cond.push({ variable: 's_count', operator: code.charAt(1) === 'S' ? '>=' : '<', value: 2 });
        // 第 3 位 T/F：t_count >= 2 → T，否则 F
        cond.push({ variable: 't_count', operator: code.charAt(2) === 'T' ? '>=' : '<', value: 2 });
        // 第 4 位 J/P：j_count >= 2 → J，否则 P
        cond.push({ variable: 'j_count', operator: code.charAt(3) === 'J' ? '>=' : '<', value: 2 });

        var c = makeChoice(txt(`✨ 聆听大师的启示`, `✨ Hear the master's revelation`, `✨ 大師の啓示を聞く`), 'mbti_end_' + code, {}, 'truth');
        c.condition = cond;
        choices.push(c);
    });

    return {
        id: 'mbti_result',
        messages: [
            makeCharacter('master', txt(
                `八问已毕。你的答案，如同八颗石子，落入了我的心湖。`,
                `Eight questions complete. Your answers, like eight pebbles, have fallen into the lake of my mind.`,
                `八つの問いが終わった。あなたの答えは、八つの小石のように、私の心の湖に落ちた。`
            )),
            makeNarrator(txt(
                `大师闭目片刻。山中万籁俱寂，连风都屏住了呼吸。`,
                `The master closes his eyes for a moment. The mountain falls silent, even the wind holds its breath.`,
                `大師はしばし目を閉じる。山は静寂に包まれ、風さえも息を潜めた。`
            )),
            makeCharacter('master', txt(
                `……我看到了。你的内心，有一枚独特的印记。让我为你揭示它。`,
                `...I see it. Deep within you lies a unique mark. Allow me to reveal it.`,
                `……見えた。あなたの内側に、独特な印がある。それを明かそう。`
            ))
        ],
        playerReply: txt(`你屏息凝神，等待大师的答案。`, `You hold your breath, awaiting the master's answer.`, `息を殺して、大師の答えを待つ。`),
        choices: choices
    };
}

// ========== 章节：心灵之约 ==========
var mbti_ch1 = {
    id: 'mbti_ch1',
    titleKey: 'mbtiCh1Title',
    subtitleKey: 'mbtiCh1Sub',
    narrator: txt(
        `清晨的雾气还没有散尽。你沿着石阶向上，山路的尽头，隐约立着一座竹庐。`,
        `The morning mist has not yet cleared. You climb the stone steps; at the end of the mountain path, a bamboo hut stands faintly in view.`,
        `朝の霧はまだ晴れていない。石段を登ると、山道の果てに、かすかに竹の庵が立っている。`
    ),
    scenes: {
        mbti_intro: {
            id: 'mbti_intro',
            messages: [
                makeNarrator(txt(
                    `竹庐的门开着。一位白发老者端坐其中，面前是一壶冒着热气的清茶。`,
                    `The bamboo hut's door stands open. A white-haired elder sits within, a pot of steaming tea before him.`,
                    `竹の庵の扉が開いている。白髪の老人が座し、目の前には湯気の立つ茶がある。`
                )),
                makeCharacter('master', txt(
                    `「来者即是缘。坐吧。」`,
                    `"A visitor is fate. Please, sit."`,
                    `「来た者は縁だ。座りなさい。」`
                )),
                makeNarrator(txt(
                    `你依言坐下。老者为你斟了一杯茶，茶香清冽，沁人心脾。`,
                    `You sit as instructed. The elder pours you a cup of tea; its fragrance is crisp and refreshing.`,
                    `言われた通りに座る。老人は茶を注いでくれる。香りは清らかで、心に沁みる。`
                )),
                makeCharacter('master', txt(
                    `「世人多以为我懂人心，其实我只是懂得倾听。\n年轻人，若你愿意，我想问你八个问题——不是为了评判你，而是为了看清你。\n你，愿意吗？」`,
                    `"Most people think I understand the human heart. In truth, I merely know how to listen.\nYoung one, if you are willing, I would ask you eight questions — not to judge you, but to see you clearly.\nAre you willing?"`,
                    `「世間は私が人心を知っていると思うが、実際はただ傾聴を知っているだけだ。\n若者よ、よければ八つの質問をしよう——君を裁くためではなく、君をはっきりと見るために。\nよいか？」`
                ))
            ],
            playerReply: txt(`你点了点头。`, `You nod.`, `うなずいた。`),
            choices: [
                makeChoice(txt(`🙏 「我愿意，请大师提问」`, `🙏 "I'm willing. Please ask, Master"`, `🙏 「お願いします、どうぞ」`), 'mbti_q1', {}, 'empathy', txt(`你郑重地坐直了身子。`, `You sit up straight with reverence.`, `背筋を伸ばして座り直す。`), 'good')
            ]
        },

        // ---- E/I 维度 ----
        mbti_q1: {
            messages: [
                makeCharacter('master', txt(
                    `「第一问。想象你刚从一场热闹的聚会归来。此刻的你，更接近哪种状态？」`,
                    `"Question one. Imagine you have just returned from a lively gathering. Which state do you feel closer to right now?"`,
                    `「第一問。賑やかな集まりから帰ってきたところを想像してごらん。今の君は、どちらの状態に近い？」`
                ))
            ],
            playerReply: txt(`你在心中描绘那个画面。`, `You picture that scene in your mind.`, `心にその場面を描く。`),
            choices: [
                makeChoice(txt(`⚡ 「感觉浑身充满了能量，甚至想再聊一会儿」`, `⚡ "I feel full of energy — I could keep talking for hours"`, `⚡ 「エネルギーに満ちて、まだ話していたい気分だ」`), 'mbti_q2', { e_count: 1 }, 'truth', txt(`聚会的热闹让你感到充实。`, `The lively gathering left you energized.`, `賑やかな集まりが活力を与えてくれる。`), 'good'),
                makeChoice(txt(`🌙 「终于安静下来了……我需要独处恢复元气」`, `🌙 "Finally quiet... I need solitude to recharge"`, `🌙 「やっと静かになった……一人で充電が必要だ」`), 'mbti_q2', { i_count: 1 }, 'caution', txt(`独处的宁静让你安心。`, `The peace of solitude soothes you.`, `一人の静けさが心を落ち着かせる。`), 'good')
            ]
        },
        mbti_q2: {
            messages: [
                makeCharacter('master', txt(
                    `「第二问。当你来到一个陌生的场合，面对一群素不相识的人，你通常会？」`,
                    `"Question two. When you arrive at an unfamiliar gathering, facing a crowd of strangers, what do you usually do?"`,
                    `「第二問。見知らぬ場所に足を踏み入れ、知らない人々に囲まれたとき、君はたいていどうする？」`
                ))
            ],
            playerReply: txt(`你回想着过往的经历。`, `You recall your past experiences.`, `これまでの経験を思い返す。`),
            choices: [
                makeChoice(txt(`👋 「主动走过去，自然地开启话题」`, `👋 "Walk over and naturally start a conversation"`, `👋 「積極的に歩み寄り、自然に話を始める」`), 'mbti_q3', { e_count: 1 }, 'truth', txt(`你相信热情能打破陌生。`, `You believe warmth breaks the ice.`, `熱意が打ち解け合いをもたらすと信じる。`), 'good'),
                makeChoice(txt(`👀 「先在旁边观察，等合适的时机再介入」`, `👀 "Observe from the side first, join when the moment is right"`, `👀 「まず周囲を観察し、頃合いを見て加わる」`), 'mbti_q3', { i_count: 1 }, 'caution', txt(`你相信观察比贸然更明智。`, `You believe observation is wiser than rushing in.`, `急ぐより観察の方が賢明だと信じる。`), 'good')
            ]
        },

        // ---- S/N 维度 ----
        mbti_q3: {
            messages: [
                makeCharacter('master', txt(
                    `「第三问。学习新事物时，什么最能让你真正『学会』？」`,
                    `"Question three. When learning something new, what truly makes you 'learn' it?"`,
                    `「第三問。新しいことを学ぶとき、何が君を本当に『学んだ』と感じさせる？」`
                ))
            ],
            playerReply: txt(`你认真思考着自己的学习方式。`, `You seriously consider your learning style.`, `自分の学び方を真剣に考える。`),
            choices: [
                makeChoice(txt(`📖 「具体的例子、清晰的步骤和实际操作」`, `📖 "Concrete examples, clear steps, and hands-on practice"`, `📖 「具体的な例、明確な手順、実際の操作だ」`), 'mbti_q4', { s_count: 1 }, 'caution', txt(`你脚踏实地。`, `You are down to earth.`, `地に足がついている。`), 'good'),
                makeChoice(txt(`💭 「理解背后的原理，以及它带来的可能性」`, `💭 "Understanding the principles behind it, and the possibilities it brings"`, `💭 「背後にある原理と、それがもたらす可能性を理解することだ」`), 'mbti_q4', { n_count: 1 }, 'truth', txt(`你仰望星空。`, `You look to the stars.`, `星空を見上げる。`), 'good')
            ]
        },
        mbti_q4: {
            messages: [
                makeCharacter('master', txt(
                    `「第四问。面对一个重要的决定，你更倾向于依靠什么？」`,
                    `"Question four. Facing an important decision, what do you tend to rely on?"`,
                    `「第四問。重要な決断に直面したとき、君は何に頼る傾向がある？」`
                ))
            ],
            playerReply: txt(`你想起了自己最引以为傲的决定。`, `You recall the decision you're most proud of.`, `最も誇りに思う決断を思い出す。`),
            choices: [
                makeChoice(txt(`📊 「过往的经验和实实在在的事实」`, `📊 "Past experience and solid facts"`, `📊 「過去の経験と確かな事実だ」`), 'mbti_q5', { s_count: 1 }, 'caution', txt(`事实是最稳的锚。`, `Facts are the steadiest anchor.`, `事実が最も確かな錨だ。`), 'good'),
                makeChoice(txt(`💡 「直觉、灵感和对未来的预见」`, `💡 "Intuition, inspiration, and foresight"`, `💡 「直感、ひらめき、未来への見通しだ」`), 'mbti_q5', { n_count: 1 }, 'truth', txt(`你相信内心的声音。`, `You trust your inner voice.`, `内なる声を信じる。`), 'good')
            ]
        },

        // ---- T/F 维度 ----
        mbti_q5: {
            messages: [
                makeCharacter('master', txt(
                    `「第五问。一位好友深夜向你倾诉烦恼。你的第一反应是？」`,
                    `"Question five. A close friend pours their heart out to you late at night. What is your first reaction?"`,
                    `「第五問。親友が深夜、悩みを打ち明けてきた。君の最初の反応は？」`
                ))
            ],
            playerReply: txt(`你设身处地地想了想。`, `You put yourself in their shoes.`, `相手の立場になって考えてみる。`),
            choices: [
                makeChoice(txt(`🧠 「帮他分析问题，理清头绪，找出方案」`, `🧠 "Help them analyze the problem, sort things out, find a solution"`, `🧠 「問題を分析し、整理し、解決策を見つける手伝いをする」`), 'mbti_q6', { t_count: 1 }, 'truth', txt(`你用理性支持朋友。`, `You support friends with reason.`, `理性で友を支える。`), 'good'),
                makeChoice(txt(`💗 「先感受他的情绪，陪伴和理解他」`, `💗 "First feel his emotions, accompany and understand him"`, `💗 「まず彼の感情に寄り添い、理解しようとする」`), 'mbti_q6', { f_count: 1 }, 'empathy', txt(`你用温度拥抱朋友。`, `You embrace friends with warmth.`, `温もりで友を包む。`), 'good')
            ]
        },
        mbti_q6: {
            messages: [
                makeCharacter('master', txt(
                    `「第六问。评价一件事或一个人时，你更看重什么？」`,
                    `"Question six. When evaluating something or someone, what do you value more?"`,
                    `「第六問。物事や人を評価するとき、君がより重んじるのは？」`
                ))
            ],
            playerReply: txt(`你想起最近一次评价他人时的感受。`, `You recall the last time you evaluated someone.`, `最近誰かを評価した時の気持ちを思い出す。`),
            choices: [
                makeChoice(txt(`⚖️ 「逻辑是否严密，事实是否站得住脚」`, `⚖️ "Whether the logic is sound and the facts hold up"`, `⚖️ 「論理が厳密か、事実が立証できるかだ」`), 'mbti_q7', { t_count: 1 }, 'truth', txt(`你以原则立身。`, `You stand by principles.`, `原則に基づいて立つ。`), 'good'),
                makeChoice(txt(`🤗 「大家的感受是否被照顾到」`, `🤗 "Whether everyone's feelings have been considered"`, `🤗 「皆の気持ちに配慮されているかだ」`), 'mbti_q7', { f_count: 1 }, 'empathy', txt(`你以人心为尺。`, `You measure by the heart.`, `心を物差しにする。`), 'good')
            ]
        },

        // ---- J/P 维度 ----
        mbti_q7: {
            messages: [
                makeCharacter('master', txt(
                    `「第七问。计划一场旅行时，你的风格是？」`,
                    `"Question seven. When planning a trip, what is your style?"`,
                    `「第七問。旅の計画を立てるとき、君の流儀は？」`
                ))
            ],
            playerReply: txt(`你想象着收拾行李的画面。`, `You imagine packing your bags.`, `荷物をまとめる情景を想像する。`),
            choices: [
                makeChoice(txt(`🗺️ 「提前做好详细的攻略和时间表」`, `🗺️ "Plan detailed itineraries and schedules in advance"`, `🗺️ 「事前に詳細なプランとスケジュールを立てる」`), 'mbti_q8', { j_count: 1 }, 'caution', txt(`你运筹帷幄。`, `You plan ahead.`, `先を見通して動く。`), 'good'),
                makeChoice(txt(`🧭 「定好目的地就出发，剩下的随缘」`, `🧭 "Pick a destination and go — let the rest happen"`, `🧭 「目的地だけ決めて出発し、後は成り行き任せ」`), 'mbti_q8', { p_count: 1 }, 'truth', txt(`你随遇而安。`, `You go with the flow.`, `流れに身を任せる。`), 'good')
            ]
        },
        mbti_q8: {
            messages: [
                makeCharacter('master', txt(
                    `「第八问，也是最后一问。面对一周后的截止日期，你通常如何应对？」`,
                    `"Question eight — the last one. Facing a deadline one week away, how do you usually handle it?"`,
                    `「第八問、そして最後の問い。一週間後の締切に直面したとき、君はたいていどう対応する？」`
                ))
            ],
            playerReply: txt(`你诚实面对自己的工作习惯。`, `You honestly face your work habits.`, `自分の仕事習慣に正直に向き合う。`),
            choices: [
                makeChoice(txt(`📅 「提前规划，稳步推进，按时完成」`, `📅 "Plan early, move steadily, finish on time"`, `📅 「前もって計画し、着実に進め、期限内に終わらせる」`), 'mbti_result', { j_count: 1 }, 'caution', txt(`你享受掌控节奏。`, `You enjoy being in control of the pace.`, `ペースを握ることを楽しむ。`), 'good'),
                makeChoice(txt(`🔥 「前期放松，最后时刻集中爆发」`, `🔥 "Relax early, then burst into action at the last moment"`, `🔥 「最初はのんびり、最後の瞬間に集中して爆発する」`), 'mbti_result', { p_count: 1 }, 'risk', txt(`你在压力下绽放。`, `You bloom under pressure.`, `プレッシャーの中で花開く。`), 'good')
            ]
        },

        // 结果场景 + 16 个结局场景（动态生成）
        mbti_result: makeMbtiResultScene()
    },
    startScene: 'mbti_intro'
};

// 合并动态生成的结局场景
Object.assign(mbti_ch1.scenes, makeMbtiEndingScenes());

// ========== 注册 ==========
window.STORY_CHAPTERS.push(mbti_ch1);

if (window.CHARACTERS) {
    Object.assign(window.CHARACTERS, {
        master: character_master
    });
}
