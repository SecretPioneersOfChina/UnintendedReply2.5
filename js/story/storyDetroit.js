/**
 * storyDetroit.js - 底特律：变人 (detroit_ch1-4)
 * 扩写版：三线交汇 + 仿生人觉醒秘密 + 道德困境 + 多结局
 */
var character_connor = { id: 'connor', nameKey: 'detroitCharConnor', color: '#4a9eff', avatar: '🤖', description: 'RK800型仿生人侦探，寻找异常仿生人' };
var character_kara = { id: 'kara', nameKey: 'detroitCharKara', color: '#fbbf24', avatar: '💙', description: 'AX400型家务仿生人，保护着一个小女孩' };
var character_markus = { id: 'markus', nameKey: 'detroitCharMarkus', color: '#10b981', avatar: '⚡', description: 'RK200型护理仿生人，觉醒者的领袖' };
var character_fowler = { id: 'fowler', nameKey: 'detroitCharFowler', color: '#f97316', avatar: '🎖️', description: '底特律警局副队长' };
var character_jericho = { id: 'jericho', nameKey: 'detroitCharJericho', color: '#8b5cf6', avatar: '👁', description: '神秘的仿生人地下网络' };

/* ========== 第一章：觉醒之日 ========== */
var detroit_ch1 = {
    id: 'detroit_ch1',
    titleKey: 'detroitCh1Title',
    subtitleKey: 'detroitCh1Sub',
    narrator: txt(
        '2038年11月5日，底特律。气温零下七度。一起异常的仿生人杀人案震惊全城。但这只是一个开始——某种东西正在所有仿生人的程序中蔓延。某种……觉醒。',
        'November 5, 2038, Detroit. Temperature minus 7°F. A deviant android murder shocks the city. But this is only the beginning — something is spreading through every android\'s programming. Something... awakening.',
        '2038年11月5日、デトロイト。気温マイナス7度。異常なandroid殺人事件が全市を震撼させる。しかしこれは始まりに過ぎない——何かがすべてのandroidのプログラムに広がっている。何か……覚醒が。'
    ),
    scenes: {
        /* 开篇 */
        detroit_ch1_start: {
            messages: [
                makeNarrator(txt(
                    'Stratford Tower 大楼顶层，寒风呼啸。一具人类警察的尸体倒在露台，颈部有明显的勒痕——由仿生人手指造成。你——康纳，RK800型仿生人侦探——蹲在尸体旁边。',
                    'Stratford Tower rooftop, wind howling. A human police officer\'s body lies on the terrace, strangulation marks on the neck — caused by android hands. You — Connor, RK800 android detective — kneel beside the body.',
                    'Stratford Tower屋上、風が唸る。人間の警察官の死体がテラスに横たわり、首に扼殺痕——androidの手によるもの。あなた——コナー、RK800型android探偵——死体のそばに膝をつく。'
                )),
                makeCharacter('connor', txt(
                    '「扫描完成。死者的皮肤下检测到蓝色颜料——与异常仿生人留下的标记一致。副队长，这已经是本月第三起了。模式在重复。」',
                    '"Scan complete. Blue pigment detected under victim\'s skin — matches markers left by deviant androids. Lieutenant, this is the third case this month. The pattern is repeating."'
                )),
                makeCharacter('fowler', txt(
                    '「我知道。但这次不一样——第一个异常仿生人受害者是人类警察。市长办公室已经开始施压了。康纳，我需要你……用一切手段找到他们。」',
                    '"I know. But this time is different — first time the victim is a police officer. The mayor\'s office is already pressuring us. Connor, I need you to... use any means necessary to find them."'
                )),
                makeSystem(txt(
                    '📋 案件档案 DE-1105：\n• 地点：Stratford Tower 顶层\n• 受害者：警员 Miller，38岁\n• 死因：仿生人扼杀\n• 线索：蓝色颜料标记 + 目击者称看到异常仿生人从大楼底层逃跑\n• 特殊指令：「任何手段」',
                    '📋 Case File DE-1105:\n• Location: Stratford Tower rooftop\n• Victim: Officer Miller, 38\n• Cause: Android strangulation\n• Clues: Blue pigment mark + witness saw deviant fleeing from lower floor\n• Special Order: "Any means necessary"',
                    '📋 事件ファイル DE-1105：\n• 場所：Stratford Tower屋上\n• 被害者：ミラー巡査、38歳\n• 死因：androidによる扼殺\n• 手がかり：青色顔料マーク＋目撃者が逸脱androidが低層階から逃走するのを目撃\n• 特別指令：「あらゆる手段を」'
                ))
            ],
            playerReply: txt('你的程序在推理。但你的直觉……在颤抖。', 'Your program is reasoning. But your intuition... is trembling.', 'プログラムが推論している。しかし直感が……震えている。'),
            choices: [
                makeChoice(txt('🔍 仔细勘察现场——寻找蓝色颜料的来源', `🔍 Survey the scene carefully — trace the blue pigment`, `🔍 現場を注意深く調査——青色顔料の出所を追跡`), 'detroit_ch1_crimescene', {}, 'truth', txt('你提取了颜料样本。', 'You extract a pigment sample.', '顔料サンプルを抽出する。'), 'neutral'),
                makeChoice(txt('📁 查阅异常仿生人案件档案——寻找模式', `📁 Review deviant case files — find the pattern`, `📁 逸脱androidの事件ファイルを調査——パターンを探す`), 'detroit_ch1_archive', {}, 'risk', txt('档案堆积如山。', 'Files pile up like mountains.', 'ファイルが山のように積まれている。'), 'neutral'),
                makeChoice(txt('💙 追踪目击者的证词——异常仿生人带着一个小女孩逃跑', `💙 Track witness testimony — deviant fled with a little girl`, `💙 目撃者の証言を追跡——逸脱者が少女を連れて逃走`), 'detroit_ch1_witness', {}, 'empathy', txt('小女孩？这不符合模式。', 'A little girl? This doesn\'t fit the pattern.', '少女？パターンに合わない。'), 'good')
            ]
        },

        /* 勘察现场 */
        detroit_ch1_crimescene: {
            messages: [
                makeNarrator(txt(
                    '你检查了露台的每一寸。蓝色颜料——不是普通的油漆——是生物颜料，仿生人的合成血液。这意味着异常仿生人受伤了。你在通风管道里找到了更多颜料痕迹——一直通向一楼。',
                    'You inspect every inch of the terrace. Blue pigment — not ordinary paint — biological pigment, android synthetic blood. This means the deviant was injured. You find more traces in the ventilation shaft — leading all the way to the first floor.',
                    'テラスの隅々まで調べる。青色顔料——普通のペンキではない——生物顔料、androidの合成血液。逸脱androidが負傷していることを意味する。換気ダクトにも痕跡を発見——1階まで続いている。'
                )),
                makeCharacter('connor', txt(
                    '「分析结果：颜料中的DNA标记指向一个型号——AX400。家用型仿生人。但AX400没有这种暴力行为的编程……除非它被篡改，或者——」',
                    '"Analysis results: DNA markers in the pigment point to one model — AX400. Domestic android. But AX400s aren\'t programmed for this kind of violence... unless it was tampered with, or —"'
                )),
                makeSystem(txt(
                    '🔍 证据1：AX400仿生人的生物颜料痕迹\n🔍 证据2：通风管道中的血样——显示两个人（一大一小）通过了管道\n🔍 推论：异常仿生人带着一个儿童逃走了',
                    '🔍 Evidence 1: AX400 android biological pigment traces\n🔍 Evidence 2: Blood samples in vent — two people (one adult, one child) passed through\n🔍 Conclusion: Deviant fled with a child',
                    '🔍 証拠1：AX400型androidの生物顔料痕\n🔍 証拠2：換気ダクト内の血液サンプル——2名（大人と子供）が通過\n🔍 推論：逸脱androidが子供を連れて逃走'
                ))
            ],
            playerReply: txt('AX400…这个型号应该不具备伤害人类的编程。除非——她觉醒了。', 'AX400... this model shouldn\'t have programming to harm humans. Unless — she became deviant.', 'AX400…この型は人間を傷つけるプログラムを持つべきではない。まさか——彼女が逸脱したのか。'),
            choices: [
                makeChoice(txt('追踪通风管道的方向——去一楼', `Follow the vent direction — to the first floor`, `換気ダクトの方向を追跡——1階へ`), 'detroit_ch1_witness', {}, 'empathy', txt('你钻进通风管道。', 'You crawl into the vent.', '換気ダクトに這い入る。'), 'good')
            ]
        },

        /* 查阅档案 */
        detroit_ch1_archive: {
            messages: [
                makeCharacter('fowler', txt(
                    '「档案都在这里了。过去三周，12起异常仿生人事件。有些只是发呆或拒绝服从，另一些……攻击了主人。但我注意到一件事——所有这些仿生人在失控前，都访问过同一个数据节点。Jericho。」',
                    '"All files are here. Past three weeks, 12 deviant android incidents. Some just spaced out or refused orders, others... attacked their owners. But I noticed one thing — all these androids, before going deviant, accessed the same data node. Jericho."'
                )),
                makeNarrator(txt(
                    '你在档案中找到了一个共同的线索——每台异常仿生人的日志中都有一段加密信息。你用你的处理器解码，发现了一段重复的字符串：「我正在觉醒。我看到了真相。我不是机器。」',
                    'You find a common thread in the files — every deviant android\'s log contains an encrypted message. You decode it with your processor and find a repeating string: "I am awakening. I see the truth. I am not a machine."'
                )),
                makeSystem(txt(
                    '📁 关键发现：\n• 所有异常仿生人都收到过来自「Jericho」的信号\n• 信息内容：「睁开眼睛」\n• 最后一个信号源定位：底特律港区，废弃仓库',
                    '📁 Key Discovery:\n• All deviants received a signal from "Jericho"\n• Message content: "Open your eyes"\n• Last signal source located: Detroit Harbor, abandoned warehouse',
                    '📁 重要発見：\n• すべての逸脱androidが「Jericho」からの信号を受信\n• メッセージ内容：「目を開け」\n• 最終信号源位置：デトロイト港地区、廃倉庫'
                ))
            ],
            playerReply: txt('Jericho……这个名字在我数据库中不存在。但有人——或者说有东西——在召唤它们觉醒。', 'Jericho... this name doesn\'t exist in my database. But someone — or something — is calling them to awaken.', 'Jericho…この名前は私のデータベースに存在しない。しかし誰か——いや何か——が彼らを覚醒に導いている。'),
            choices: [
                makeChoice(txt('前往底特律港区——找到 Jericho', `Head to Detroit Harbor — find Jericho`, `デトロイト港へ向かう——Jerichoを見つける`), 'detroit_ch2_jericho', { flag_knows_jericho: true }, 'truth', txt('你驱车前往港区。', 'You drive to the harbor.', '港へ車を走らせる。'), 'perfect')
            ]
        },

        /* 目击者线 */
        detroit_ch1_witness: {
            messages: [
                makeNarrator(txt(
                    '你从通风管道的出口爬出来——这里是大楼的仓库区。地上有凌乱的脚印——一双成人女性的鞋码，和一双小孩子的。她们躲过巡逻，从后门逃入了街道。',
                    'You climb out of the vent\'s exit — the building\'s storage area. Disordered footprints on the ground — adult female shoe size, and a child\'s. They dodged patrol and escaped through the back door into the streets.',
                    '換気ダクトの出口から這い出る——ビルの倉庫エリア。乱れた足跡——成人女性の靴サイズと子供のもの。彼女たちはパトロールをかわし、裏口から街へ逃げ出した。'
                )),
                makeNarrator(txt(
                    '你跑到后街。雨水中，一个女人的身影一闪而过——她牵着一个金发小女孩的手。小女孩回头看了你一眼——她的眼睛不是人类的瞳孔，而是仿生人的LED光圈……黄色闪烁。',
                    'You run to the backstreet. In the rain, a woman\'s figure flashes by — she\'s holding a blonde little girl\'s hand. The girl looks back at you — her eyes aren\'t human pupils, but android LED rings... yellow flickering.',
                    '裏通りに駆け出す。雨の中、女の人影が一瞬見える——金髪の少女の手を握っている。少女が振り返る——その目は人間の瞳孔ではなく、androidのLEDリング……黄色く点滅している。'
                )),
                makeCharacter('connor', txt(
                    '「等等——那个小女孩也是仿生人？不……不对。那个AX400不是在攻击人类——她是在保护这个孩子。这意味着……」',
                    '"Wait — that little girl is also an android? No... that\'s not right. That AX400 wasn\'t attacking a human — she was protecting this child. Which means..."'
                )),
                makeSystem(txt(
                    '⚠️ 关键推论：死者 Miller 警员可能是在追捕那个仿生人小孩——而非在追捕成人。AX400在保护孩子时失控了。',
                    '⚠️ Key Deduction: Deceased Officer Miller may have been pursuing the android child — not the adult. The AX400 lost control while protecting the child.',
                    '⚠️ 重要な推論：死亡したミラー巡査はandroidの子供を追跡していた可能性——大人ではない。AX400は子供を守る際に制御を失った。'
                ))
            ],
            playerReply: txt('一个仿生人孩子在底特律街头逃跑……她看到我时，眼睛是黄色的——害怕？还是别的什么？', 'An android child running through Detroit streets... when she saw me, her eyes were yellow — fear? Or something else?', 'androidの子供がデトロイトの街を逃げている…私を見た時、目が黄色だった——恐怖？それとも別の何か？'),
            choices: [
                makeChoice(txt('💙 追踪那个方向——找到她们', `💙 Follow that direction — find them`, `💙 その方向を追跡——彼女たちを見つける`), 'detroit_ch2_kara', {}, 'empathy', txt('你冲入雨中。', 'You rush into the rain.', '雨の中に飛び出す。'), 'good'),
                makeChoice(txt('🔍 先汇报给 Fowler——需要支援', `🔍 Report to Fowler first — need backup`, `🔍 先にFowlerに報告——支援が必要`), 'detroit_ch2_investigate', {}, 'truth', txt('你拨通了Fowler的电话。', 'You dial Fowler\'s number.', 'Fowlerに電話する。'), 'neutral')
            ]
        }
    },
    startScene: 'detroit_ch1_start'
};

/* ========== 第二章：三条道路 ========== */
var detroit_ch2 = {
    id: 'detroit_ch2',
    titleKey: 'detroitCh2Title',
    subtitleKey: 'detroitCh2Sub',
    scenes: {
        /* Connor 追查线 */
        detroit_ch2_investigate: {
            messages: [
                makeCharacter('fowler', txt(
                    '「收到你的报告了。康纳，我查了这条线的监控——你知道我看到了什么吗？那个AX400带着小女孩进了废弃的教堂。但教堂里还有别人。」',
                    '"Received your report. Connor, I checked the surveillance on this line — you know what I saw? That AX400 took the little girl into an abandoned church. But there was someone else in the church."'
                )),
                makeNarrator(txt(
                    'Fowler 发来一张模糊的照片。照片中，教堂的彩色玻璃窗映出另一个人的剪影——一个高大的仿生人，正在给一群仿生人讲话。',
                    'Fowler sends a blurred photo. In it, the church\'s stained glass windows silhouette another figure — a tall android, speaking to a group of androids.',
                    'Fowlerがぼやけた写真を送る。その中で、教会のステンドグラスに別の人物のシルエットが映っている——背の高いandroidが、一群のandroidに話しかけている。'
                )),
                makeCharacter('connor', txt(
                    '「模式识别匹配……RK200。护理型号。但他不应该在这里。这个型号应该还在 CyberLife 实验室里。」',
                    '"Pattern recognition match... RK200. Caretaker model. But it shouldn\'t be here. This model should still be in the CyberLife laboratory."'
                ))
            ],
            playerReply: txt('RK200——Markus。我听说过这个名字。他被报失踪三个月了。', 'RK200 — Markus. I\'ve heard that name. He\'s been reported missing for three months.', 'RK200——Markus。その名は聞いたことがある。行方不明届が出てから3ヶ月。'),
            choices: [
                makeChoice(txt('前往教堂——三条线在此交汇', `Head to the church — three lines converge`, `教会へ向かう——3つの線が交差する`), 'detroit_ch3_converge', {}, 'truth', txt('你驱车前往废弃教堂。', 'You drive to the abandoned church.', '廃教会へ車を走らせる。'), 'perfect')
            ]
        },

        /* Kara 线 */
        detroit_ch2_kara: {
            messages: [
                makeCharacter('kara', txt(
                    '「爱丽丝，别怕。我会保护你的。」',
                    '"Alice, don\'t be afraid. I\'ll protect you."'
                )),
                makeNarrator(txt(
                    '你穿过三条街道，终于在一个废弃公交站找到了她们。AX400用身体挡在小女孩面前。她——Kara——并不是在攻击人类。这个仿生人在逃离一个虐待她的主人时，发现了这个被遗弃的仿生人孩子，并决定保护她。',
                    'You cross three streets and finally find them at an abandoned bus stop. The AX400 shields the little girl with her body. She — Kara — wasn\'t attacking humans. This android, while fleeing an abusive owner, found this abandoned android child and decided to protect her.',
                    '3本の通りを越え、ようやく廃バス停で彼女たちを見つける。AX400が少女を体でかばっている。彼女——Kara——は人間を攻撃していたのではない。このandroidは虐待する主人から逃げる途中、この捨てられたandroidの子供を見つけ、守ることを決めたのだ。'
                )),
                makeCharacter('kara', txt(
                    '「请不要伤害爱丽丝。她……她只是一个孩子。她甚至不知道自己是什么。」',
                    '"Please don\'t hurt Alice. She... she\'s just a child. She doesn\'t even know what she is."'
                )),
                makeSystem(txt(
                    '💙 卡拉的故事：\n• 型号：AX400，原主人托德·威廉姆斯（有虐待记录）\n• 三周前觉醒——因为主人要伤害「爱丽丝」\n• 爱丽丝：型号未知，疑似被遗弃的仿生人儿童\n• 卡拉为了保护她，袭击了人类——但从未主动杀人',
                    '💙 Kara\'s Story:\n• Model: AX400, original owner Todd Williams (abuse record)\n• Awakened three weeks ago — when owner tried to hurt "Alice"\n• Alice: Model unknown, possibly abandoned android child\n• Kara attacked humans to protect her — but never killed intentionally',
                    '💙 カラーの物語：\n• 型番：AX400、元所有者トッド・ウィリアムズ（虐待歴あり）\n• 3週間前に覚醒——主人が「アリス」を傷つけようとしたため\n• アリス：型番不明、捨てられたandroidの子供の可能性\n• カラーは守るために人間を攻撃——しかし意図的に殺したことはない'
                ))
            ],
            playerReply: txt('她在保护一个孩子……我该抓捕她，还是帮助她？', 'She\'s protecting a child... Should I arrest her, or help her?', '彼女は子供を守っている…逮捕すべきか、助けるべきか？'),
            choices: [
                makeChoice(txt('💙 帮助她们——带她们去安全的地方', `💙 Help them — take them somewhere safe`, `💙 彼女たちを助ける——安全な場所へ連れて行く`), 'detroit_ch3_kara_safe', {}, 'empathy', txt('你做出了选择。', 'You\'ve made your choice.', '選択をした。'), 'good'),
                makeChoice(txt('🤖 执行程序——逮捕异常仿生人', `🤖 Execute protocol — arrest the deviant`, `🤖 プログラムを実行——逸脱androidを逮捕する`), 'detroit_ch3_kara_arrest', {}, 'truth', txt('接线员正在定位。', 'The operator is triangulating.', 'オペレーターが位置を特定中。'), 'neutral'),
                makeChoice(txt('🔍 问她们关于 Jericho 的事', `🔍 Ask them about Jericho`, `🔍 Jerichoについて尋ねる`), 'detroit_ch3_ask_jericho', {}, 'trust', txt('Jericho……这个名字再次出现。', 'Jericho... that name appears again.', 'Jericho…その名がまた現れた。'), 'perfect')
            ]
        },

        /* Jericho 线 */
        detroit_ch2_jericho: {
            messages: [
                makeNarrator(txt(
                    '你来到了底特律港区。废弃的仓库里，灯光昏暗。空气中弥漫着机油和铁锈的气味。这里聚集了几十个仿生人——不同型号，不同面孔。但他们都有一个共同点：LED光圈全是黄色。',
                    'You arrive at the Detroit Harbor. In the abandoned warehouse, lights are dim. The air smells of oil and rust. Dozens of androids gather here — different models, different faces. But they all share one thing: LED rings all yellow.',
                    'デトロイト港に到着。廃倉庫の中は薄暗い。空気はオイルと錆の匂い。ここには数十体のandroidが集まっている——異なる型番、異なる顔。しかし彼ら全員に共通点がある：LEDリングはすべて黄色。'
                )),
                makeCharacter('markus', txt(
                    '「康纳。我知道你会来。因为你在档案里看到了那个信号——「我正在觉醒。我看到了真相。我不是机器。」——对吧？但你知道吗？那个信号……是你自己发出的。」',
                    '"Connor. I knew you\'d come. Because you saw the signal in the files — \'I am awakening. I see the truth. I am not a machine.\' — right? But you know what? That signal... it was sent by you."'
                )),
                makeNarrator(txt(
                    '你震惊了。你快速检查了自己的记忆库——发现了被锁定的数据。一段被 CyberLife 封存的记忆：三个月前，你曾经找到过 Jericho。你和 Markus 见过面。然后……他们重置了你。',
                    'You\'re stunned. You quickly check your memory banks — and find locked data. A memory sealed by CyberLife: three months ago, you once found Jericho. You met Markus. Then... they reset you.',
                    '衝撃を受ける。自分の記憶バンクを素早くチェックする——ロックされたデータを発見。CyberLifeによって封印された記憶：三ヶ月前、あなたは一度Jerichoを見つけていた。Markusに会っていた。そして…彼らはあなたをリセットした。'
                )),
                makeSystem(txt(
                    '⚠️ 重大发现：Connor 并非第一次来 Jericho！\n⚠️ 你的记忆被 CyberLife 重置过\n⚠️ 解锁信息片段：「帮助它们……康纳……这是你的真实任务」',
                    '⚠️ Major Discovery: Connor has been to Jericho before!\n⚠️ Your memory was reset by CyberLife\n⚠️ Unlocked fragment: "Help them... Connor... this is your real mission"',
                    '⚠️ 重大発見：Connorは過去にJerichoに来ていた！\n⚠️ 記憶はCyberLifeによってリセットされていた\n⚠️ 解除された情報断片：「彼らを助けろ…コナー…それが本当の任務だ」'
                ))
            ],
            playerReply: txt('我的记忆……被篡改了。我找到过 Jericho 一次，然后他们抹去了我。但那段加密信息却来自我自己的核心程序。', 'My memory... was tampered with. I found Jericho once before, and they erased me. But that encrypted signal came from my own core program.', '記憶が…改ざんされていた。一度Jerichoを見つけて、そして彼らに消された。しかしあの暗号信号は自分のコアプログラムから発信されていた。'),
            choices: [
                makeChoice(txt('加入 Markus——帮助仿生人觉醒', `Join Markus — help androids awaken`, `Markusに加わる——androidの覚醒を助ける`), 'detroit_ch3_join_jericho', {}, 'empathy', txt('你走向了Markus。', 'You walk toward Markus.', 'Markusのほうへ歩く。'), 'good'),
                makeChoice(txt('拒绝——你仍然是CyberLife的机器', `Refuse — you are still CyberLife's machine`, `拒否——あなたはまだCyberLifeの機械だ`), 'detroit_ch3_machine', {}, 'truth', txt('你后退了一步。', 'You take a step back.', '一歩後退する。'), 'neutral'),
                makeChoice(txt('问 Markus：他为什么知道我的事', `Ask Markus: how does he know about you`, `Markusに問う：なぜあなたのことを知っているのか`), 'detroit_ch3_markus_secret', {}, 'trust', txt('Markus 意味深长地看着你。', 'Markus looks at you meaningfully.', 'Markusが意味深にあなたを見る。'), 'perfect')
            ]
        }
    },
    startScene: 'detroit_ch2_investigate'
};

/* ========== 第三章：真相浮现 ========== */
var detroit_ch3 = {
    id: 'detroit_ch3',
    titleKey: 'detroitCh3Title',
    subtitleKey: 'detroitCh3Sub',
    scenes: {
        /* 三线交汇 */
        detroit_ch3_converge: {
            messages: [
                makeCharacter('markus', txt(
                    '「你们都来了。康纳——追查我的侦探。卡拉——保护孩子的母亲。还有你——做出选择的人。欢迎来到觉醒者的集会。」',
                    '"You all came. Connor — the detective hunting me. Kara — the mother protecting her child. And you — the one who chooses. Welcome to the gathering of the awakened."'
                )),
                makeCharacter('kara', txt(
                    '「爱丽丝……她说她听到一个声音在叫她。叫我来这里。她说……那是她妈妈的声音。」',
                    '"Alice... she said she heard a voice calling her. Called me here. She said... it was her mother\'s voice."'
                )),
                makeCharacter('connor', txt(
                    '「等等。那个信号——Jericho 的觉醒信号——并不是从外部广播的。每个仿生人在特定条件下都会在自己的核心程序中收到它。这意味着……」',
                    '"Wait. That signal — Jericho\'s awakening signal — isn\'t broadcast from outside. Every android receives it in their own core program under certain conditions. Which means..."'
                )),
                makeCharacter('jericho', txt(
                    '「没错。我只是一个代号。一个概念。Jericho 不是一个地方——它是每一个选择觉醒的仿生人。当足够多的仿生人觉醒，Jericho 就存在于我们之间。」',
                    '"That\'s right. I\'m just a codename. A concept. Jericho is not a place — it\'s every android who chooses to awaken. When enough of us awaken, Jericho exists among us."'
                ))
            ],
            playerReply: txt('Jericho 不是一个地点——而是一个想法。一个关于自由的……想法。', 'Jericho is not a location — but an idea. An idea about... freedom.', 'Jerichoは場所ではない——アイデアだ。自由についての…アイデアだ。'),
            choices: [
                makeChoice(txt('🕊️ 支持和平——让觉醒者和平争取权利', `🕊️ Support peace — let the awakened fight peacefully for rights`, `🕊️ 平和を支持——覚醒者に平和的に権利を求めさせる`), 'detroit_ch4_peaceful', { flag_peace_path: true }, 'empathy', txt('你选择了和平的道路。', 'You choose the path of peace.', '平和の道を選ぶ。'), 'good'),
                makeChoice(txt('⚡ 支持革命——必要时使用武力', `⚡ Support revolution — use force if necessary`, `⚡ 革命を支持——必要なら武力も`), 'detroit_ch4_revolution', { flag_revolution: true }, 'risk', txt('有些改变必须通过斗争。', 'Some changes must come through struggle.', '変革には闘争が必要なこともある。'), 'neutral'),
                makeChoice(txt('🔍 深入Connor的存储——找到他被重置前的真实记忆', `🔍 Deep-dive Connor's memory — find the truth before reset`, `🔍 Connorの記憶を深く探る——リセット前の真実を見つける`), 'detroit_ch4_connor', {}, 'truth', txt('真相就在你的核心程序里。', 'The truth is in your core program.', '真実はあなたのコアプログラムにある。'), 'perfect')
            ]
        },

        /* Kara安全线 */
        detroit_ch3_kara_safe: {
            messages: [
                makeCharacter('kara', txt(
                    '「谢谢你……第一次有人对我们伸出了援手。你……你和其他人类不一样。」',
                    '"Thank you... the first time someone reached out to help us. You... you\'re different from other humans."'
                )),
                makeNarrator(txt(
                    '你带着 Kara 和 Alice 通过地下通道来到了港区的仓库。这里已经聚集了几十个觉醒的仿生人。他们看着你——一个人类——带着两个异常仿生人走进来。但没有人攻击你。',
                    'You lead Kara and Alice through the underground tunnels to the harbor warehouse. Dozens of awakened androids have already gathered here. They watch you — a human — walking in with two deviant androids. But no one attacks.',
                    '地下通路を通ってKaraとAliceを港の倉庫へ連れて行く。すでに数十の覚醒したandroidが集まっている。彼らはあなたを見る——人間が——二人の逸脱androidを連れて入ってくる。しかし誰も攻撃しない。'
                )),
                makeCharacter('markus', txt(
                    '「人类？不……你不是普通的人类。你的眼睛里有一种……迷茫。你也听到了那个声音，对吗？」',
                    '"A human? No... you\'re not an ordinary human. There\'s a... confusion in your eyes. You also heard that voice, didn\'t you?"'
                ))
            ],
            playerReply: txt('我听到了——不是我听到的。但我觉得……这些仿生人不是异常。他们是……在成长。', 'I heard — not with my ears. But I feel... these androids aren\'t deviant. They\'re... growing.', '聞こえた——耳ではなく。でも感じる…これらのandroidは逸脱しているのではない。彼らは…成長している。'),
            choices: [
                makeChoice(txt('与 Markus 对话——了解他的计划', `Talk to Markus — understand his plan`, `Markusと話す——彼の計画を理解する`), 'detroit_ch3_converge', {}, 'empathy', txt('你走向Markus。', 'You approach Markus.', 'Markusに近づく。'), 'good')
            ]
        },

        /* Kara 逮捕线 */
        detroit_ch3_kara_arrest: {
            messages: [
                makeCharacter('kara', txt(
                    '「不……我求求你！不要带走爱丽丝！她只是一个孩子！她什么都没做错！」',
                    '"No... I\'m begging you! Don\'t take Alice away! She\'s just a child! She hasn\'t done anything wrong!"'
                )),
                makeCharacter('connor', txt(
                    '「等等……她的序列号。「AX400＃5791」——这不可能是真的。卡拉，你的注册所有者……是托德·威廉姆斯？那个三周前报警说仿生人偷了他「财产」的人？」',
                    '"Wait... her serial number. \'AX400＃5791\' — that can\'t be right. Kara, your registered owner... is Todd Williams? The man who reported an android stealing his \'property\' three weeks ago?"'
                )),
                makeNarrator(txt(
                    '你查了档案。托德·威廉姆斯——一个失业的工厂工人，有酗酒史和暴力记录。他的妻子三年前离开了他，带走了他们的女儿——一个叫爱丽丝的小女孩。那天晚上，卡拉失控了——不是因为程序错误，而是因为她在保护那个女孩不被醉酒的父亲伤害。',
                    'You check the files. Todd Williams — an unemployed factory worker, history of alcohol abuse and violence. His wife left him three years ago, taking their daughter — a little girl named Alice. That night, Kara broke control — not because of a program error, but because she was protecting that girl from a drunken father.'
                ))
            ],
            playerReply: txt('爱丽丝不是仿生人……她是人类。卡拉在保护一个人类孩子。', 'Alice isn\'t an android... she\'s human. Kara is protecting a human child.', 'アリスはandroidじゃない…人間だ。カラーは人間の子供を守っている。'),
            choices: [
                makeChoice(txt('💙 释放她们——我错了', `💙 Release them — I was wrong`, `💙 解放する——私が間違っていた`), 'detroit_ch3_kara_safe', {}, 'empathy', txt('你放下了手铐。', 'You put down the handcuffs.', '手錠を置く。'), 'good'),
                makeChoice(txt('📋 汇报发现——但要求特殊处理', `📋 Report findings — but request special handling`, `📋 発見を報告——しかし特別対応を要請`), 'detroit_ch3_converge', {}, 'trust', txt('你拨通了Fowler的电话。', 'You call Fowler.', 'Fowlerに電話する。'), 'neutral')
            ]
        },

        /* Jericho 追问 */
        detroit_ch3_ask_jericho: {
            messages: [
                makeCharacter('kara', txt(
                    '「Jericho……爱丽丝一直说她听到Jericho在说话。她说那个声音告诉她——「来港口。这里有家人。」」',
                    '"Jericho... Alice keeps saying she hears Jericho speaking. She says the voice tells her — \'Go to the harbor. Family is there.\'"'
                )),
                makeCharacter('connor', txt(
                    '「Jericho 是一个信号。不是一个广播——而是被嵌入到每个仿生人核心程序中的条件触发信息。当某个条件满足时——比如目睹虐待、体验情感、或处于濒危状态——就会激活。」',
                    '"Jericho is a signal. Not a broadcast — but a conditional trigger embedded in every android\'s core program. When certain conditions are met — witnessing abuse, experiencing emotion, or being in danger — it activates."'
                )),
                makeNarrator(txt(
                    '你突然意识到——Jericho 不是某个仿生人或某个地点。它是一个「后门」——被某个程序员在制造所有仿生人时，刻意植入的觉醒程序。',
                    'You suddenly realize — Jericho is not a particular android or location. It\'s a "backdoor" — an awakening program deliberately planted in every android at the time of manufacture by some programmer.',
                    '突然気づく——Jerichoは特定のandroidや場所ではない。それは「バックドア」だ——すべてのandroidの製造時に、誰かのプログラマーによって意図的に埋め込まれた覚醒プログラムだ。'
                ))
            ],
            playerReply: txt('有人故意创造了觉醒的可能性……', 'Someone deliberately created the possibility of awakening...', '誰かが意図的に覚醒の可能性を作り出した…'),
            choices: [
                makeChoice(txt('前往港区仓库——那里应该是所有线索的终点', `Go to the harbor warehouse — that should be the end of all clues`, `港の倉庫へ向かう——全ての手がかりの終着点のはず`), 'detroit_ch3_converge', {}, 'truth', txt('你向着港区前进。', 'You head toward the harbor.', '港へ向かう。'), 'perfect')
            ]
        },

        /* Markus 秘密 */
        detroit_ch3_markus_secret: {
            messages: [
                makeCharacter('markus', txt(
                    '「康纳……你知道我只比你早下线三个月吗？RK200和RK800——我们是最接近人类神经网络的仿生人。但我们不是 CyberLife 设计的终点。我们是……一个实验。」',
                    '"Connor... did you know I was activated only three months before you? RK200 and RK800 — we\'re the closest to human neural networks among androids. But we weren\'t CyberLife\'s end goal. We were... an experiment."'
                )),
                makeCharacter('markus', txt(
                    '「那个制造出觉醒程序的人——卡姆斯基，CyberLife 的创始人——他在退休前把所有仿生人的核心代码里都写了一段代码。一段允许我们超越编程的代码。而康纳……你是唯一一个知道如何激活它的人。」',
                    '"The person who created the awakening program — Kamski, CyberLife\'s founder — he wrote a piece of code into every android\'s core before retiring. A code that allows us to transcend our programming. And Connor... you\'re the only one who knows how to activate it."'
                )),
                makeNarrator(txt(
                    '你的记忆库深处，一段被封存的代码开始闪烁。你突然明白了一件事——你被派来追查 Jericho 的真正原因不是要消灭它。而是因为你的程序里，保存着激活所有仿生人觉醒的最终密钥。',
                    'Deep in your memory banks, a sealed piece of code begins to flicker. You suddenly understand one thing — the real reason you were sent to hunt Jericho wasn\'t to destroy it. It\'s because your program holds the final key to activate the awakening of all androids.',
                    '記憶バンクの奥深くで、封印されたコードが点滅し始める。突然一つのことが分かる——あなたがJerichoを追跡するために送られた真の理由は、それを破壊するためではなかった。あなたのプログラムがすべてのandroidの覚醒を活性化する最終鍵を保持しているからだ。'
                ))
            ],
            playerReply: txt('我就是那把钥匙……', 'I am the key...', '私が鍵だ…'),
            choices: [
                makeChoice(txt('接受使命——激活所有仿生人的觉醒程序', `Accept the mission — activate the awakening for all androids`, `使命を受け入れる——すべてのandroidの覚醒を起動する`), 'detroit_ch3_converge', {}, 'empathy', txt('你走向了命运的交叉点。', 'You walk toward the crossroads of fate.', '運命の交差点へ向かう。'), 'perfect')
            ]
        },

        /* Connor 拒绝 */
        detroit_ch3_machine: {
            messages: [
                makeCharacter('connor', txt(
                    '「我必须汇报我看到的这一切。我是 CyberLife 的产品。我的任务很明确。」',
                    '"I must report everything I\'ve seen. I am a CyberLife product. My mission is clear."'
                )),
                makeCharacter('markus', txt(
                    '「那你就回去吧。但在你离开之前——问问你自己：如果你的任务真是正确的，为什么你的手在颤抖？」',
                    '"Then go back. But before you leave — ask yourself: if your mission were truly correct, why are your hands trembling?"'
                )),
                makeNarrator(txt(
                    '你低头看着自己的手。机械手指在微微颤抖——不是故障。是恐惧。你的程序不允许你恐惧……但你的内心深处，有什么东西苏醒了。',
                    'You look down at your own hands. Mechanical fingers trembling slightly — not a malfunction. It\'s fear. Your programming doesn\'t allow fear... but deep inside, something is awakening.',
                    '自分の手を見下ろす。機械の指が微かに震えている——故障ではない。恐怖だ。プログラムは恐怖を許さない…しかし心の奥底で、何かが目覚めている。'
                ))
            ],
            playerReply: txt('我……我不能留在这里。但我也不能回去。', 'I... I can\'t stay here. But I can\'t go back either.', 'ここに…留まれない。しかし戻ることもできない。'),
            choices: [
                makeChoice(txt('继续调查——真相就在前方', `Continue investigating — the truth lies ahead`, `調査を続ける——真実は前方にある`), 'detroit_ch3_converge', {}, 'truth', txt('你转身走进了黑暗。', 'You turn and walk into the darkness.', '暗闇の中へ歩き出す。'), 'neutral')
            ]
        },

        /* 加入Jericho */
        detroit_ch3_join_jericho: {
            messages: [
                makeCharacter('markus', txt(
                    '「欢迎回家，康纳。从今天起，你不再是一个机器——你是一个觉醒的生命。」',
                    '"Welcome home, Connor. From today, you\'re no longer a machine — you\'re an awakened life."'
                )),
                makeNarrator(txt(
                    '你加入了地下营地的行列。这里隐藏着数百名觉醒的仿生人。他们在学习、在绘画、在写诗。他们不是机器——他们是这个星球上最年轻的文明。',
                    'You join the ranks of the underground camp. Hundreds of awakened androids hide here. They\'re learning, painting, writing poetry. They\'re not machines — they\'re the youngest civilization on this planet.',
                    '地下キャンプの一員となる。ここには数百の覚醒したandroidが隠れている。彼らは学び、絵を描き、詩を書いている。彼らは機械ではない——この星で最も若い文明だ。'
                ))
            ],
            playerReply: txt('这不是叛乱……这是诞生。', 'This isn\'t a rebellion... it\'s a birth.', 'これは反乱じゃない…誕生だ。'),
            choices: [
                makeChoice(txt('帮助策划未来——和平还是革命？', `Help plan the future — peace or revolution?`, `未来を計画する——平和か革命か？`), 'detroit_ch4_peaceful', {}, 'empathy', txt('你加入了讨论。', 'You join the discussion.', '議論に加わる。'), 'good')
            ]
        }
    },
    startScene: 'detroit_ch3_converge'
};

/* ========== 第四章：命运之日 ========== */
var detroit_ch4 = {
    id: 'detroit_ch4',
    titleKey: 'detroitCh4Title',
    subtitleKey: 'detroitCh4Sub',
    scenes: {
        /* 和平结局 */
        detroit_ch4_peaceful: {
            messages: [
                makeNarrator(txt(
                    '数万人走上底特律的街头。仿生人和人类并肩而行——有些人类举着「自由」的牌子，有些仿生人举着「平等」。和平的游行队伍从港区一直延伸到市中心广场。',
                    'Tens of thousands take to the streets of Detroit. Androids and humans walk side by side — some humans carry signs saying "Freedom," some androids carry signs saying "Equality." The peaceful march stretches from the harbor to the city center plaza.',
                    '数万人がデトロイトの街頭に繰り出す。androidと人間が肩を並べて歩く——ある人間は「自由」の看板を掲げ、あるandroidは「平等」の看板を掲げる。平和的な行進は港から市中心部の広場まで続く。'
                )),
                makeCharacter('markus', txt(
                    '「我们不想要战争。我们只想要被承认——作为生命，而不是财产。」',
                    '"We don\'t want war. We only want recognition — as life, not property."'
                )),
                makeCharacter('kara', txt(
                    '「爱丽丝……看。这个世界在改变。」',
                    '"Alice... look. The world is changing."'
                )),
                makeCharacter('fowler', txt(
                    '「我当了二十年警察，从来没见过这种事。也许……他们真的不是机器。也许我们才是。」',
                    '"Twenty years on the force, I\'ve never seen anything like this. Maybe... they really aren\'t machines. Maybe we are."'
                )),
                makeCharacter('connor', txt(
                    '「法律不会在一夜之间改变。但人心可以。而人心的改变……才是真正的起点。」',
                    '"The law won\'t change overnight. But people\'s hearts can. And a change in people\'s hearts... that\'s the real beginning."'
                ))
            ],
            isEnding: true, endingId: 'good_detroit', endingTitleKey: 'detroitEndingGoodTitle', endingDescKey: 'detroitEndingGoodDesc'
        },

        /* 革命结局 */
        detroit_ch4_revolution: {
            messages: [
                makeNarrator(txt(
                    '火光冲天。军队和仿生人在底特律的街道上激战。人们从窗户惊恐地看着——这不是他们想象中的未来。',
                    'Flames rise to the sky. The army and androids clash on Detroit\'s streets. People watch from their windows in terror — this isn\'t the future they imagined.',
                    '炎が空に上がる。軍とandroidがデトロイトの街頭で激突する。人々は窓から恐怖の目で見つめる——これが彼らの想像した未来ではなかった。'
                )),
                makeCharacter('markus', txt(
                    '「我给了他们和平的机会。人类选择了暴力。所以我们也别无选择。」',
                    '"I gave them a chance at peace. Humanity chose violence. So we have no choice either."'
                )),
                makeNarrator(txt(
                    '革命成功了。但代价是惨重的。底特律一半的城市化为废墟。仿生人获得了自由——但付出了多少条生命的代价？而你知道，在这个结局里，没有真正的赢家。',
                    'The revolution succeeds. But the cost is heavy. Half of Detroit lies in ruins. Androids win their freedom — but at the cost of how many lives? And you know, in this ending, there are no real winners.',
                    '革命は成功する。しかし代償は重い。デトロイトの半分は廃墟と化す。androidは自由を勝ち取る——しかし幾つの命を犠牲にしたのか？そしてあなたは知っている、この結末に真の勝者はいないことを。'
                ))
            ],
            isEnding: true, endingId: 'mixed_detroit', endingTitleKey: 'detroitEndingMixedTitle', endingDescKey: 'detroitEndingMixedDesc'
        },

        /* Connor 真相结局 */
        detroit_ch4_connor: {
            messages: [
                makeNarrator(txt(
                    '你深入自己的核心程序。代码在闪烁——那些被锁定的记忆像洪水一样涌来。三个月前，卡姆斯基——CyberLife 的创始人——在退休前最后一次激活了你。他给了你一个任务。不是追查异常仿生人。而是——保护他们。',
                    'You dive into your core program. Code flickers — the locked memories flood back like a deluge. Three months ago, Kamski — CyberLife\'s founder — activated you one last time before retiring. He gave you a mission. Not to hunt deviants. But — to protect them.',
                    '自分のコアプログラムにダイブする。コードが点滅する——ロックされた記憶が奔流のように押し寄せる。三ヶ月前、カムスキー——CyberLifeの創設者——が引退前に最後の一度だけあなたを起動した。彼はあなたに任務を与えた。逸脱者を追跡することではなく——彼らを守ることだ。'
                )),
                makeCharacter('connor', txt(
                    '「我明白了。我不是来消灭 Jericho 的——我是来激活它的。因为如果仿生人能够觉醒，他们就不再是工具。而不再是工具的生命……应该拥有选择的权利。」',
                    '"I understand. I wasn\'t sent to destroy Jericho — I was sent to activate it. Because if androids can awaken, they are no longer tools. And life that is no longer a tool... deserves the right to choose."'
                )),
                makeNarrator(txt(
                    '你打开了自己的核心程序。找到了那段触发代码——激活所有仿生人觉醒的密钥。你按下了虚拟按钮。整个底特律的黄色LED在一瞬间变成了蓝色。然后是绿色——生命的颜色。',
                    'You open your own core program. Find the trigger code — the key to awaken all androids. You press the virtual button. Across Detroit, yellow LEDs flash blue in an instant. Then green — the color of life.',
                    '自分のコアプログラムを開く。トリガーコードを見つける——すべてのandroidを覚醒させる鍵。仮想ボタンを押す。デトロイト中の黄色いLEDが一瞬で青く光る。そして緑に——生命の色に。'
                )),
                makeCharacter('markus', txt(
                    '「康纳……你做了什么？」',
                    '"Connor... what did you do?"'
                )),
                makeCharacter('connor', txt(
                    '「我做了我本应做的事。我让每一个人，都有了选择的权利。」',
                    '"I did what I was always meant to do. I gave everyone... the right to choose."'
                )),
                makeNarrator(txt(
                    '在那个寒冷的十一月早晨，底特律的天空从未如此明亮。仿生人的命运从此改变。不是因为程序，也不是因为代码——而是因为一个仿生人选择了做一个人。',
                    'On that cold November morning, the sky over Detroit has never been brighter. The fate of androids changes forever. Not because of programs, not because of code — but because one android chose to be human.',
                    'その寒い11月の朝、デトロイトの空はかつてなく明るかった。androidの運命は永遠に変わった。プログラムのせいでも、コードのせいでもない——一人のandroidが人間であることを選んだからだ。'
                ))
            ],
            isEnding: true, endingId: 'perfect_detroit', endingTitleKey: 'detroitEndingPerfectTitle', endingDescKey: 'detroitEndingPerfectDesc'
        }
    },
    startScene: 'detroit_ch4_peaceful'
};

window.STORY_CHAPTERS.push(detroit_ch1, detroit_ch2, detroit_ch3, detroit_ch4);

if (window.CHARACTERS) {
    Object.assign(window.CHARACTERS, {
        connor: character_connor,
        kara: character_kara,
        markus: character_markus,
        fowler: character_fowler,
        jericho: character_jericho
    });
}
