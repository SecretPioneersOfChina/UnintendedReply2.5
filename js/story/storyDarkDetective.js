/**
 * storyDarkDetective.js - 血色迷雾 (detect_ch1-4)
 * 扩写版：三层线索链 + 角色秘密 + 真相反转 + 多结局
 */
var character_artist = { id: 'artist', nameKey: 'detCharArtist', color: '#a855f7', avatar: '🎭', description: '神秘剧团的演员，与死者关系复杂' };
var character_manager = { id: 'manager', nameKey: 'detCharManager', color: '#f59e0b', avatar: '🎩', description: '剧场的总经理，掌握财政大权' };
var character_actress = { id: 'actress', nameKey: 'detCharActress', color: '#ec4899', avatar: '🌹', description: '红遍一时的当红女星，与死者有隐秘过往' };
var character_narrator = { id: 'narrator_det', nameKey: 'detectNarrator', color: '#94a3b8', avatar: '📖', description: '你的助手兼法医顾问' };

/* ========== 第一章：雨夜凶案 ========== */
var detect_ch1 = {
    id: 'detect_ch1',
    titleKey: 'detectCh1Title',
    subtitleKey: 'detectCh1Sub',
    narrator: txt(
        '雨夜。废弃的皇家剧院。彩绘玻璃已经破碎多年，但今夜，一具新鲜的尸体躺在舞台中央。',
        'Rainy night. Abandoned Royal Theatre. Stained glass has been broken for years, but tonight, a fresh corpse lies center stage.',
        '雨の夜。廃墟のロイヤル劇場。ステンドグラスは何年も前に壊れているが、今夜、新しい死体が舞台中央に横たわっている。'
    ),
    scenes: {
        /* 开篇 */
        detect_ch1_start: {
            messages: [
                makeNarrator(txt(
                    '你推开吱嘎作响的剧院大门。雨水从破漏的屋顶滴落，在积水上激起涟漪。舞台中央的聚光灯下，一具男尸仰面躺着——正是剧团最富有的赞助商，王富商。',
                    'You push open the creaking theatre doors. Rain drips through the broken roof, creating ripples in puddles. Under the spotlight center stage, a male corpse lies face-up — the theatre\'s wealthiest patron, Mr. Wang.',
                    'きしむ劇場の扉を押し開ける。破れた屋根から雨が滴り、水たまりに波紋を広げる。舞台中央のスポットライトの下に、男の死体が仰向けに横たわっている——劇団の最も裕福なパトロン、王旦那だ。'
                )),
                makeCharacter('narrator_det', txt(
                    '「侦探，初步判断：死因为钝器击打后脑。死亡时间约两小时前。奇怪的是——没有任何破门痕迹。」',
                    '"Detective, initial assessment: death by blunt force trauma to the back of the head. Time of death about two hours ago. Strangely — no signs of forced entry."',
                    '「探偵、初期判断：鈍器による後頭部打撲が死因。死亡時刻は約2時間前。奇妙なのは——侵入の痕跡が一切ないことだ。」'
                )),
                makeSystem(txt(
                    '📋 案情摘要：\n• 死者：王富商，52岁，剧团最大资助人\n• 死亡时间：今晚9-10点\n• 死因：钝器击打后脑\n• 疑点：门窗完好，凶手可能认识死者',
                    '📋 Case Summary:\n• Victim: Mr. Wang, 52, theatre\'s largest patron\n• TOD: 9-10 PM tonight\n• Cause: Blunt force to back of head\n• Suspicion: No forced entry — killer may know victim',
                    '📋 事件概要：\n• 被害者：王旦那、52歳、劇団最大のパトロン\n• 死亡時刻：本日夜9-10時\n• 死因：鈍器による後頭部打撲\n• 疑点：侵入跡なし——犯人は被害者を知っている可能性'
                ))
            ],
            playerReply: txt('你蹲下查看尸体。', 'You kneel to examine the body.', '死体を調べるためにしゃがみ込む。'),
            choices: [
                makeChoice(txt('🎭 审问演员——他看起来坐立不安', `🎭 Interrogate the actor — he looks restless`, `🎭 俳優を取り調べる——落ち着かない様子だ`), 'detect_ch1_artist', {}, 'truth', txt('演员被带进临时审讯室。', 'The actor is brought into the makeshift interrogation room.', '俳優が仮設取調室に連れてこられる。'), 'neutral'),
                makeChoice(txt('🎩 审问总经理——他是最后一个见到死者的人', `🎩 Interrogate the manager — last to see the victim`, `🎩 支配人を取り調べる——最後に被害者に会った人物`), 'detect_ch1_manager', {}, 'risk', txt('总经理擦了擦额头的汗。', 'The manager wipes sweat from his brow.', '支配人が額の汗を拭う。'), 'neutral'),
                makeChoice(txt('🌹 审问女演员——她似乎哭过', `🌹 Interrogate the actress — she seems to have been crying`, `🌹 女優を取り調べる——泣いた跡がある`), 'detect_ch1_actress', {}, 'empathy', txt('女演员低着头，手指颤抖。', 'The actress lowers her head, fingers trembling.', '女優がうつむき、指が震えている。'), 'neutral'),
                makeChoice(txt('🔍 仔细搜查现场（+隐藏线索）', `🔍 Search the scene carefully (+hidden clue)`, `🔍 現場を徹底的に捜索（+隠し手がかり）`), 'detect_ch1_crimescene', {}, 'trust', txt('你决定先看看现场能发现什么。', 'You decide to see what the scene reveals first.', '現場が何を明らかにするか、先に見てみよう。'), 'good')
            ]
        },

        /* 搜查现场 */
        detect_ch1_crimescene: {
            messages: [
                makeNarrator(txt(
                    '你仔细检查了舞台的每一寸。在道具箱后面，你发现了一把带血的匕首——但死因是钝器，这把刀可能只是凶手的备用方案。更有趣的是，你在舞台地板缝隙里找到了一张被撕碎的照片。',
                    'You carefully inspect every inch of the stage. Behind a prop box, you find a bloodied dagger — but the cause of death is blunt force, so this may be backup. More interestingly, you find a torn photo in a crack in the stage floorboards.',
                    '舞台の隅々まで注意深く調べる。道具箱の後ろに血のついた短剣を発見——しかし死因は鈍器だ。これは予備の凶器かもしれない。さらに興味深いことに、舞台の床板の隙間で破られた写真を見つけた。'
                )),
                makeSystem(txt(
                    '🔍 证据1：带血的匕首（死者血型匹配）\n🔍 证据2：撕碎的照片（隐约可见三人合影——王富商、一名女子和一个孩子）\n🔍 线索：照片背面写有日期「2026.6.15」',
                    '🔍 Evidence 1: Bloodied dagger (matches victim blood type)\n🔍 Evidence 2: Torn photo (faintly shows three — Mr. Wang, a woman, and a child)\n🔍 Clue: Date on back "2026.6.15"',
                    '🔍 証拠1：血のついた短剣（被害者の血液型と一致）\n🔍 証拠2：破られた写真（ぼんやりと3人の姿——王旦那、女性、子供）\n🔍 手がかり：裏面の日付「2026.6.15」'
                ))
            ],
            playerReply: txt('照片上的女人似乎是……女演员？', 'The woman in the photo seems to be... the actress?', '写真の女性は……女優のようだ？'),
            choices: [
                makeChoice(txt('带着照片去质问女演员', `Question the actress with the photo`, `写真を持って女優を問い詰める`), 'detect_ch1_actress_photo', { has_photo: true }, 'truth', txt('你握紧了那张照片。', 'You grip the photo tightly.', '写真を握りしめる。'), 'neutral'),
                makeChoice(txt('先审问演员——他可能知道什么', `Interrogate the actor first — he may know something`, `先に俳優を取り調べる——何か知っているかも`), 'detect_ch1_artist', {}, 'empathy', txt('你决定先收集更多证词。', 'You decide to gather more testimony first.', '先にもっと証言を集めることにした。'), 'good')
            ]
        },

        /* 审问演员 */
        detect_ch1_artist: {
            messages: [
                makeCharacter('artist', txt(
                    '「我发誓不是我！我……我承认我恨他。王富商上个月说要撤资，剧团就要解散了。但杀他？我不会！」',
                    '"I swear it wasn\'t me! I... I admit I hated him. Mr. Wang said last month he was pulling funding — the troupe was going to disband. But kill him? I wouldn\'t!"',
                    '「誓って俺じゃない！確かに……確かに奴を憎んでいた。王旦那は先月、資金を引き上げると言った——一座は解散だ。でも殺すなんて？」'
                )),
                makeSystem(txt('🔎 演员的证词：\n• 动机（中）：怕剧团解散\n• 时间线：声称9点在后台练功，无人证明\n• 可疑点：说话时不断看自己的手', `🔎 Actor testimony:\n• Motive (med): Fear of troupe dissolution\n• Timeline: Claims practicing backstage at 9pm, no alibi\n• Suspicious: Keeps looking at his hands`, `🔎 俳優の証言：\n• 動機（中）：一座解散の恐れ\n• タイムライン：午後9時に舞台裏で練習中と主張、アリバイなし\n• 怪しい点：自分の手を何度も見る`))
            ],
            playerReply: txt('他的手上有擦伤。', 'There are abrasions on his hands.', '彼の手に擦り傷がある。'),
            choices: [
                makeChoice(txt('追问手上的伤', `Press about the hand injuries`, `手の傷を追及する`), 'detect_ch1_artist_hands', {}, 'truth', txt('演员缩回了手。', 'The actor pulls his hands back.', '俳優が手を引っ込める。'), 'neutral'),
                makeChoice(txt('跳过，去审问其他人', `Skip, interrogate others`, `スキップして他の人を取り調べる`), 'detect_ch1_manager', {}, 'empathy', txt('你决定先收集全貌。', 'You decide to get the full picture first.', '全体像を先に把握することにする。'), 'good')
            ]
        },

        /* 追问手的伤 */
        detect_ch1_artist_hands: {
            messages: [
                makeCharacter('artist', txt(
                    '「这个？我……我说实话！王富商今晚来的时候，我跟他打了一架。他侮辱了我的表演，我推了他一把。他摔倒了——但那时候他还活着！我发誓！他站起来后还骂了我一顿，然后去找总经理了。」',
                    '"This? I... I\'ll tell the truth! When Mr. Wang came tonight, I got into a fight with him. He insulted my performance, I pushed him. He fell — but he was alive then! I swear! He got up, cursed me out, then went to find the manager."'
                )),
                makeSystem(txt(
                    '🔎 新线索：演员承认与死者发生肢体冲突\n⏰ 时间线更新：死者9:15左右离开演员，前往总经理办公室',
                    '🔎 New lead: Actor admits physical altercation with victim\n⏰ Timeline update: Victim left actor around 9:15, headed to manager\'s office',
                    '🔎 新たな手がかり：俳優が被害者との身体的衝突を認める\n⏰ タイムライン更新：被害者は9:15頃に俳優を離れ、支配人室へ'
                ))
            ],
            playerReply: txt('那么9:15之后，王富商还活着。', 'So after 9:15, Mr. Wang was still alive.', 'つまり9:15以降、王旦那はまだ生きていた。'),
            choices: [
                makeChoice(txt('去审问总经理', `Go interrogate the manager`, `支配人を取り調べに行く`), 'detect_ch1_manager', {}, 'truth', txt('你走向总经理办公室。', 'You head to the manager\'s office.', '支配人室へ向かう。'), 'neutral')
            ]
        },

        /* 审问总经理 */
        detect_ch1_manager: {
            messages: [
                makeCharacter('manager', txt(
                    '「侦探先生，我很乐意配合调查。是的，王富商9点20分左右来过我办公室——讨论财务问题。他走的时候还活着，我发誓！他离开时大概是9点40分，说去找女演员。」',
                    '"Detective, I\'m happy to cooperate. Yes, Mr. Wang came to my office around 9:20 — to discuss finances. He was alive when he left, I swear! He left around 9:40, said he was going to find the actress."'
                )),
                makeSystem(txt(
                    '🔎 总经理的证词：\n• 动机（强）：剧团濒临破产，王富商撤资意味着总经理职位不保\n• 时间线：9:20-9:40与死者在一起\n• 疑点：办公桌抽屉缝隙有血迹反应',
                    '🔎 Manager testimony:\n• Motive (strong): Theatre near bankruptcy, Wang pulling funding means manager loses job\n• Timeline: 9:20-9:40 with victim\n• Suspicion: Blood residue in desk drawer crack',
                    '🔎 支配人の証言：\n• 動機（強）：劇場は破産寸前、王の資金引き上げは支配人の失職を意味する\n• タイムライン：9:20-9:40に被害者と一緒\n• 疑点：机の引き出しの隙間に血痕反応'
                ))
            ],
            playerReply: txt('抽屉缝隙的血迹……', 'Blood in the desk crack...', '引き出しの隙間の血痕……'),
            choices: [
                makeChoice(txt('要求搜查总经理办公室', `Demand to search the manager's office`, `支配人室の捜索を要求する`), 'detect_ch1_manager_office', {}, 'risk', txt('总经理脸色变了。', 'The manager\'s expression changes.', '支配人の表情が変わる。'), 'neutral'),
                makeChoice(txt('先去审问女演员', `Go interrogate the actress first`, `先に女優を取り調べる`), 'detect_ch1_actress', {}, 'empathy', txt('你决定先听听女演员的说法。', 'You decide to hear the actress first.', '先に女優の話を聞くことにする。'), 'good')
            ]
        },

        /* 搜查办公室 */
        detect_ch1_manager_office: {
            messages: [
                makeCharacter('manager', txt(
                    '「好吧……你发现了。这是王富商的血。他……他今晚威胁要毁了我。他说不仅撤资，还要向警察举报我挪用公款。我……我打了他一拳。但只是打了一拳！他自己走出去的！我发誓！」',
                    '"Fine... you found it. That\'s Wang\'s blood. He... he threatened to destroy me tonight. He said not only would he pull funding, but he\'d report me to the police for embezzlement. I... I punched him. Just one punch! He walked out on his own! I swear!"'
                )),
                makeNarrator(txt(
                    '你在办公桌的暗格里发现了一本账本——记录了总经理两年来挪用的资金，总额高达80万元。',
                    'You find a ledger in a hidden compartment — recording two years of embezzlement by the manager, totaling 800,000 yuan.',
                    '机の隠し仕切りから帳簿を発見——支配人の2年間の横領を記録しており、総額80万元に上る。'
                )),
                makeSystem(txt(
                    '🔍 证据3：带血迹的账本（总经理的挪用记录）\n🔍 新线索：9:35左右有人看到女演员慌张地从二楼跑下来',
                    '🔍 Evidence 3: Bloodied ledger (manager embezzlement records)\n🔍 New lead: Around 9:35, someone saw the actress running downstairs in panic',
                    '🔍 証拠3：血のついた帳簿（支配人の横領記録）\n🔍 新たな手がかり：9:35頃、女優が慌てて2階から駆け下りるのが目撃された'
                ))
            ],
            playerReply: txt('三个嫌疑人都有动机……', 'All three suspects have motives...', '3人の容疑者全員に動機がある……'),
            choices: [
                makeChoice(txt('审问女演员——她的时间线是关键', `Interrogate the actress — her timeline is key`, `女優を取り調べる——彼女のタイムラインが鍵だ`), 'detect_ch1_actress', {}, 'empathy', txt('现在必须听她的故事了。', 'Now you must hear her story.', '今こそ彼女の話を聞く時だ。'), 'neutral')
            ]
        },

        /* 审问女演员 */
        detect_ch1_actress: {
            messages: [
                makeCharacter('actress', txt(
                    '「我……我确实9:30左右在二楼的化妆间。王富商他……他是我以前的恋人。五年前，我们有过一个孩子。但他说会影响他的声誉，逼我……放弃。」',
                    '"I... I was in the dressing room on the second floor around 9:30. Mr. Wang... he was my former lover. Five years ago, we had a child. But he said it would damage his reputation and forced me to... give it up."'
                )),
                makeNarrator(txt(
                    '女演员泣不成声。你意识到这张照片上的人——王富商、女演员、和一个孩子——那是他们五年前的全家福。',
                    'The actress breaks down sobbing. You realize the people in the photo — Mr. Wang, the actress, and a child — that was their family portrait five years ago.',
                    '女優が泣き崩れる。写真の中の人々——王旦那、女優、そして子供——それは5年前の家族写真だったのだ。'
                )),
                makeCharacter('actress', txt(
                    '「不！是他约的我。他说想要「重修旧好」……但我发现他在撒谎。他真正的目的是让我签一份协议——放弃索要任何抚养费。我太生气了，把他赶出了化妆间。那是9点40分左右。」',
                    '"No! He called me. He said he wanted to \'reconcile\'... but I found out he was lying. His real purpose was to make me sign an agreement — waiving any child support. I was so angry, I kicked him out of the dressing room. That was around 9:40."'
                )),
                makeSystem(txt(
                    '🔎 女演员的证词：\n• 动机（中）：情感纠纷 + 抚养费争议\n• 时间线：9:30-9:40在化妆间与死者交谈，之后跑下楼\n• 关键：她提到了照片——但你还没给她看过',
                    '🔎 Actress testimony:\n• Motive (med): Emotional dispute + child support\n• Timeline: 9:30-9:40 talking to victim in dressing room, then ran downstairs\n• Key: She mentioned the photo — but you haven\'t shown it to her yet',
                    '🔎 女優の証言：\n• 動機（中）：感情のもつれ＋養育費争い\n• タイムライン：9:30-9:40に楽屋で被害者と会話、その後階下へ\n• 重要：彼女が写真に言及した——まだ見せていないのに'
                ))
            ],
            playerReply: txt('等等……我没给她看过那张照片，但她自己提到了——她一定知道那张照片的存在。', 'Wait... I never showed her the photo, but she mentioned it herself — she must know it exists.', '待て……写真を見せていないのに、彼女自身が言及した——彼女が写真の存在を知っているに違いない。'),
            choices: [
                makeChoice(txt('🔍 追问：你怎么知道照片的事？', `🔍 Press: How do you know about the photo?`, `🔍 追及：どうして写真のことを知っている？`), 'detect_ch1_actress_photo', { has_photo: true }, 'truth', txt('她愣住了。', 'She freezes.', '彼女が固まる。'), 'perfect'),
                makeChoice(txt('📋 先汇总所有线索', `📋 Consolidate all clues first`, `📋 すべての手がかりをまとめる`), 'detect_ch1_summary', {}, 'empathy', txt('你需要整理一下思路。', 'You need to organize your thoughts.', '思考を整理する必要がある。'), 'good')
            ]
        },

        /* 追问照片 */
        detect_ch1_actress_photo: {
            messages: [
                makeCharacter('actress', txt(
                    '「那张照片……我其实一直在找它。我以为被王富商销毁了。你怎么会——等等。那张照片是在哪里找到的？」',
                    '"That photo... I\'ve actually been looking for it. I thought Wang destroyed it. How did you — wait. Where did you find that photo?"'
                )),
                makeNarrator(txt(
                    '你告诉她照片是在舞台地板缝隙里找到的。她的表情从悲伤变成了惊恐。',
                    'You tell her the photo was found in a crack in the stage floor. Her expression shifts from sadness to terror.',
                    '写真は舞台の床板の隙間で見つけたと伝える。彼女の表情が悲しみから恐怖に変わる。'
                )),
                makeCharacter('actress', txt(
                    '「不可能……今晚之前，那张照片一直锁在我化妆间的首饰盒里。我今晚打开看的时候它还在——直到我9:40回到化妆间，它不见了。」',
                    '"Impossible... until tonight, that photo was locked in my jewelry box in the dressing room. I looked at it tonight and it was there — until I returned to the dressing room at 9:40, and it was gone."'
                )),
                makeSystem(txt(
                    '🚨 重大发现！照片在今晚被盗——凶手拿走了它！\n🚨 女演员的化妆间在9:40-10:00之间被闯入\n🚨 凶手回到现场销毁证据时，不慎遗落在舞台地板',
                    '🚨 Major discovery! The photo was stolen tonight — the killer took it!\n🚨 Actress dressing room was broken into between 9:40-10:00\n🚨 The killer returned to destroy evidence but dropped it in the stage floor',
                    '🚨 大発見！今夜写真が盗まれた——犯人が持っていた！\n🚨 女優の楽屋は9:40-10:00の間に侵入された\n🚨 犯人は証拠を隠滅しに戻ったが、舞台の床に落とした'
                ))
            ],
            playerReply: txt('有人在9:40之后回到了犯罪现场……', 'Someone returned to the crime scene after 9:40...', '誰かが9:40以降に犯行現場に戻った……'),
            choices: [
                makeChoice(txt('进入第二章：锁定真凶', `Proceed to Chapter 2: Identify the Killer`, `第二章へ：真犯人を特定する`), 'detect_ch1_to_ch2', {}, 'truth', txt('线索汇集，真相即将浮出水面。', 'Clues converge, truth is about to surface.', '手がかりが集まり、真実が浮かび上がろうとしている。'), 'perfect')
            ]
        },

        /* 汇总线索 */
        detect_ch1_summary: {
            messages: [
                makeSystem(txt(
                    '📋 当前线索汇总：\n\n1️⃣ 演员：9:00-9:15与死者冲突 ✅\n2️⃣ 总经理：9:20-9:40与死者在一起，账本显示挪用80万\n3️⃣ 女演员：9:30-9:40在化妆间，与死者有旧情和孩子\n4️⃣ 照片：在舞台发现，原在女演员化妆间\n5️⃣ 死因：钝器击打后脑，死亡时间9:40-10:00',
                    '📋 Clue Summary:\n\n1️⃣ Actor: 9:00-9:15 conflict with victim ✅\n2️⃣ Manager: 9:20-9:40 with victim, 800K embezzlement\n3️⃣ Actress: 9:30-9:40 in dressing room, past relationship\n4️⃣ Photo: Found on stage, originally in actress dressing room\n5️⃣ Cause: Blunt force trauma, TOD 9:40-10:00',
                    '📋 手がかりまとめ：\n\n1️⃣ 俳優：9:00-9:15に被害者と衝突 ✅\n2️⃣ 支配人：9:20-9:40に被害者と一緒、80万横領\n3️⃣ 女優：9:30-9:40に楽屋、過去に関係と子供\n4️⃣ 写真：舞台で発見、元は女優の楽屋に\n5️⃣ 死因：鈍器打撲、死亡時刻9:40-10:00'
                ))
            ],
            playerReply: txt('等等——这张照片是在女演员的化妆间被偷的……', 'Wait — the photo was stolen from the actress\'s dressing room...', '待て——写真は女優の楽屋から盗まれた……'),
            choices: [
                makeChoice(txt('进入第二章', `Enter Chapter 2`, `第二章へ`), 'detect_ch1_to_ch2', {}, 'empathy', txt('新的线索链形成了。', 'A new chain of clues takes shape.', '新たな手がかりの連鎖が浮かび上がる。'), 'good')
            ]
        },

        /* 过渡到第二章 */
        detect_ch1_to_ch2: {
            messages: [
                makeNarrator(txt(
                    '夜色更深了。剧院外雷声滚滚。你面前有三个嫌疑人，每个人都有动机、有时间、有机会。但真相只有一个人知道——那就是凶手。',
                    'The night deepens. Thunder rolls outside. Three suspects, each with motive, opportunity, and means. But only one knows the truth — the killer.',
                    '夜が更ける。劇場の外で雷が鳴る。3人の容疑者、それぞれに動機と機会と手段がある。しかし真実を知るのは一人だけ——犯人だ。'
                )),
                makeCharacter('narrator_det', txt(
                    '「侦探，我收到了一条关键信息：总经理办公室的座机在9:45拨打过一个号码——是女演员的手机。」',
                    '"Detective, I received critical information: the manager\'s landline made a call at 9:45 — to the actress\'s cell phone."'
                ))
            ],
            choices: [
                makeChoice(txt('进入第二章', `Enter Chapter 2`, `第二章へ`), 'detect_ch2_investigate', {}, 'empathy', txt('', '', ''), 'good')
            ]
        }
    },
    startScene: 'detect_ch1_start'
};

/* ========== 第二章：审讯交锋 ========== */
var detect_ch2 = {
    id: 'detect_ch2',
    titleKey: 'detectCh2Title',
    subtitleKey: 'detectCh2Sub',
    scenes: {
        detect_ch2_investigate: {
            messages: [
                makeNarrator(txt(
                    '你重新审阅了所有证据。总经理在9:45给女演员打电话——这意味着什么？而女演员声称9:40离开化妆间后直接去了大厅。',
                    'You review all evidence again. The manager called the actress at 9:45 — what does that mean? The actress claims she went directly to the lobby after leaving the dressing room at 9:40.',
                    'すべての証拠を再検討する。支配人が9:45に女優に電話した——それは何を意味する？女優は9:40に楽屋を出た後、直接ロビーに行ったと主張している。'
                )),
                makeCharacter('narrator_det', txt(
                    '「我重新检查了死者的伤口。有趣——凶器是钝器，但伤口形状很特别：是一种五边形图案的印记。我在后台找到一个维修工具箱，里面有一个五边形扳手，尺寸完全匹配。」',
                    '"I re-examined the victim\'s wound. Interesting — blunt force, but the shape is distinctive: a pentagonal pattern. I found a repair toolbox backstage — inside, a pentagonal wrench of exactly matching size."'
                )),
                makeSystem(txt(
                    '🔍 证据4：五边形扳手——凶器找到了！扳手上有少量血迹\n🔍 工具箱属于：维修间，所有剧团成员都可进入',
                    '🔍 Evidence 4: Pentagonal wrench — murder weapon found! Traces of blood on it\n🔍 Toolbox belongs to: maintenance room, accessible by all troupe members',
                    '🔍 証拠4：五角レンチ——凶器発見！微量の血痕あり\n🔍 工具箱の所有者：整備室、劇団員全員がアクセス可能'
                ))
            ],
            playerReply: txt('凶器找到了。现在需要锁定谁在那段时间去了维修间。', 'The weapon is found. Now we need to confirm who went to the maintenance room during that time.', '凶器が見つかった。あの時間に誰が整備室に行ったかを確認する必要がある。'),
            choices: [
                makeChoice(txt('单独审问演员——逼问他关于照片的事', `Interrogate actor alone — press him about the photo`, `俳優を個別に問い詰める——写真について追及`), 'detect_ch2_artist_v2', {}, 'truth', txt('演员紧张地搓着手。', 'The actor rubs his hands nervously.', '俳優が緊張して手をこする。'), 'neutral'),
                makeChoice(txt('单独审问总经理——质问那通电话', `Interrogate manager alone — confront him about the call`, `支配人を個別に問い詰める——電話について追及`), 'detect_ch2_manager_v2', {}, 'risk', txt('总经理面色铁青。', 'The manager looks grim.', '支配人の顔色が悪い。'), 'neutral'),
                makeChoice(txt('单独审问女演员——她到底在隐瞒什么', `Interrogate actress alone — what is she hiding`, `女優を個別に問い詰める——何を隠しているのか`), 'detect_ch2_actress_v2', {}, 'empathy', txt('你需要她的全部真相。', 'You need the full truth from her.', '彼女から全ての真実を聞き出す必要がある。'), 'good'),
                makeChoice(txt('搜查维修间——寻找指纹证据', `Search maintenance room — find fingerprint evidence`, `整備室を捜索——指紋の証拠を探す`), 'detect_ch2_forensic', {}, 'trust', txt('科学证据不会说谎。', 'Scientific evidence doesn\'t lie.', '科学的証拠は嘘をつかない。'), 'perfect')
            ]
        },

        /* 审问演员v2 */
        detect_ch2_artist_v2: {
            messages: [
                makeCharacter('artist', txt(
                    '「好吧……我承认，我确实在9:40左右去了维修间。但我是去拿我的道具剑——今晚的表演道具！明天有彩排！我看到扳手上有血，吓坏了，就赶紧离开了。」',
                    '"Fine... I admit it. I did go to the maintenance room around 9:40. But I was getting my prop sword — for tomorrow\'s rehearsal! I saw blood on the wrench, panicked, and left immediately."'
                )),
                makeNarrator(txt(
                    '检查发现道具剑上确实有新鲜的打磨痕迹——他可能说的是真话。但你注意到他的鞋底有红色的油漆渍。',
                    'Checking reveals the prop sword does have fresh polishing marks — he might be telling the truth. But you notice red paint stains on his shoes.',
                    '確認すると、小道具の剣には確かに新しい研磨痕がある——彼は真実を言っているかもしれない。しかし彼の靴底に赤いペンキの染みがあることに気づく。'
                ))
            ],
            playerReply: txt('你的鞋底为什么有红漆？剧院的地板没有重新粉刷。', 'Why is there red paint on your shoes? The theatre floors weren\'t repainted.', 'なぜ靴に赤いペンキが？劇場の床は塗り直されていない。'),
            choices: [
                makeChoice(txt('继续追问红漆', `Press about the red paint`, `赤いペンキについて追及する`), 'detect_ch2_artist_paint', {}, 'truth', txt('演员脸色大变。', 'The actor\'s face turns pale.', '俳優の顔色が青ざめる。'), 'neutral'),
                makeChoice(txt('先去审问其他人', `Interrogate others first`, `先に他の人を取り調べる`), 'detect_ch2_manager_v2', {}, 'empathy', txt('暂时放过这个疑点。', 'Set this lead aside for now.', 'この手がかりを一旦保留する。'), 'good')
            ]
        },

        /* 演员红漆 */
        detect_ch2_artist_paint: {
            messages: [
                makeCharacter('artist', txt(
                    '「那是……那是因为我今晚在后台画了一幅画。我压力大的时候就会画画。王富商说我永远只是个小丑——他说得对，我确实只会画画。」',
                    '"That\'s because... I was painting backstage tonight. I paint when I\'m stressed. Wang said I\'d always be just a clown — he was right, I really can only paint."'
                )),
                makeNarrator(txt(
                    '你在他的包里发现了一幅未完成的画——画的是剧院舞台，角落里有三个模糊的身影。笔触极其细腻，不像是慌乱中完成的。',
                    'You find an unfinished painting in his bag — depicting the theatre stage, with three blurry figures in the corner. The brushwork is extremely delicate, not like something done in a panic.',
                    '彼のバッグから未完成の絵が見つかる——劇場の舞台を描いており、隅に3つのぼやけた人影がある。筆致は非常に繊細で、慌てて描いたものではない。'
                ))
            ],
            playerReply: txt('这幅画……画了很久了吧？不是今晚才画的。', 'This painting... you\'ve been working on it for a while, haven\'t you? Not just tonight.', 'この絵……ずっと描いていたんだろう？今夜だけじゃない。'),
            choices: [
                makeChoice(txt('转去审问总经理', `Switch to interrogate manager`, `支配人の取り調べに切り替える`), 'detect_ch2_manager_v2', {}, 'empathy', txt('演员的谎言被揭穿，但还不是时候。', 'The actor\'s lie is exposed, but the timing isn\'t right.', '俳優の嘘は暴かれたが、まだ時期ではない。'), 'good')
            ]
        },

        /* 审问总经理v2 */
        detect_ch2_manager_v2: {
            messages: [
                makeCharacter('manager', txt(
                    '「我确实在9:45给女演员打了电话——因为我发现她今晚的状态不对！王富商去化妆间找她之后，她整个人都不对劲。我担心她会做什么傻事。」',
                    '"Yes, I called the actress at 9:45 — because I noticed she was off tonight! After Wang went to her dressing room, she was acting strange. I was worried she might do something foolish."'
                )),
                makeSystem(txt(
                    '🔍 通话记录：总经理 → 女演员，9:45，通话时长2分15秒\n🔍 女演员声称9:40-10:00在大厅——但没人能证实',
                    '🔍 Call log: Manager → Actress, 9:45, duration 2min 15sec\n🔍 Actress claims 9:40-10:00 in lobby — but no one can confirm',
                    '🔍 通話記録：支配人→女優、9:45、通話時間2分15秒\n🔍 女優は9:40-10:00にロビーにいたと主張——しかし確認できる者はいない'
                ))
            ],
            playerReply: txt('2分15秒的通话……', '2 minutes 15 seconds...', '2分15秒の通話…'),
            choices: [
                makeChoice(txt('质问女演员这通电话', `Confront actress about the call`, `女優にこの電話について問い詰める`), 'detect_ch2_actress_v2', {}, 'truth', txt('女演员的反应至关重要。', 'The actress\'s reaction is critical.', '女優の反応が重要だ。'), 'neutral'),
                makeChoice(txt('检查维修间的指纹报告', `Check the maintenance room fingerprint report`, `整備室の指紋報告を確認する`), 'detect_ch2_forensic', {}, 'trust', txt('科学证据是关键。', 'Scientific evidence is key.', '科学的証拠が鍵だ。'), 'perfect')
            ]
        },

        /* 审问女演员v2 */
        detect_ch2_actress_v2: {
            messages: [
                makeCharacter('actress', txt(
                    '「是的，总经理打电话给我。他说他知道我和王富商的过去。他威胁我——如果不帮他作伪证，证明他9:20-9:45都在办公室里，他就会把照片和故事卖给媒体。」',
                    '"Yes, the manager called me. He said he knew about my past with Wang. He threatened me — if I didn\'t provide a false alibi saying he was in his office from 9:20-9:45, he\'d sell the photo and story to the media."'
                )),
                makeNarrator(txt(
                    '她哭了。你意识到女演员一直在被要挟——不只被死者，还有被总经理。',
                    'She cries. You realize the actress has been threatened — not just by the victim, but by the manager as well.',
                    '彼女は泣く。女優は脅されていたのだ——被害者だけでなく、支配人にも。'
                ))
            ],
            playerReply: txt('所以你接到了电话，但你去了维修间吗？', 'So you received the call, but did you go to the maintenance room?', '電話は受けたが、整備室に行ったのか？'),
            choices: [
                makeChoice(txt('追问维修间的事', `Press about the maintenance room`, `整備室のことを追及する`), 'detect_ch2_actress_repair', {}, 'empathy', txt('她低着头沉默了。', 'She lowers her head in silence.', '彼女はうつむいて沈黙する。'), 'neutral'),
                makeChoice(txt('查看指纹报告', `Check the fingerprint report`, `指紋報告を確認する`), 'detect_ch2_forensic', {}, 'trust', txt('证据不会说谎。', 'Evidence won\'t lie.', '証拠は嘘をつかない。'), 'perfect')
            ]
        },

        /* 女演员维修间 */
        detect_ch2_actress_repair: {
            messages: [
                makeCharacter('actress', txt(
                    '「我确实在9:50左右去了维修间。但不是为了杀人——是为了扔掉那个扳手！我发现扳手在化妆间门口的地上，上面有血，我害怕极了。我以为……我以为是我失控的时候做了什么。」',
                    '"I did go to the maintenance room around 9:50. But not to kill — to throw away the wrench! I found it on the ground outside my dressing room, covered in blood. I was terrified. I thought... I thought I might have done something when I lost control."'
                )),
                makeNarrator(txt(
                    '等等——如果扳手是在化妆间门口被发现的，那意味着真正的凶手故意把它放在那里，想嫁祸给女演员。',
                    'Wait — if the wrench was found outside the dressing room door, that means the real killer deliberately placed it there to frame the actress.',
                    '待て——レンチが楽屋の扉の外で見つかったなら、本当の犯人が故意にそこに置いたということだ——女優に罪を着せるために。'
                ))
            ],
            playerReply: txt('有人想嫁祸给你。这说明凶手知道你今晚会去维修间。', 'Someone wants to frame you. That means the killer knew you\'d go to the maintenance room tonight.', '誰かがあなたに罪を着せようとしている。犯人はあなたが今夜整備室に行くことを知っていた。'),
            choices: [
                makeChoice(txt('查看指纹报告——真凶必将留下痕迹', `Check fingerprint report — the killer must have left traces`, `指紋報告を確認——犯人は痕跡を残しているはず`), 'detect_ch2_forensic', {}, 'trust', txt('答案就在那里。', 'The answer is there.', '答えはそこにある。'), 'perfect')
            ]
        },

        /* 指纹报告 */
        detect_ch2_forensic: {
            messages: [
                makeCharacter('narrator_det', txt(
                    '「指纹报告出来了！扳手上提取得到了两组清晰的指纹。第一组：演员——这在他的预料之中，他说过曾经摸过工具箱。第二组……有点奇怪——指纹太清晰了，像是故意印上去的。」',
                    '"The fingerprint report is in! Two clear sets on the wrench. First set: the actor — expected, he admitted touching the toolbox. Second set... strange — too clear, as if deliberately pressed on."'
                )),
                makeSystem(txt(
                    '🔍 第二组指纹匹配：总经理！\n🔍 但指纹位置异常——位于扳手手柄的正面中央，位置「过于标准」\n🔍 推断：指纹是在扳手被用作凶器之后，被人故意按上去的！',
                    '🔍 Second set matches: the Manager!\n🔍 But location is odd — exact center of the handle, "too perfect"\n🔍 Conclusion: The print was deliberately placed AFTER the wrench was used as the weapon!',
                    '🔍 二組目の指紋が一致：支配人！\n🔍 しかし位置が奇妙——ハンドルの正確な中央、「完璧すぎる」\n🔍 推論：レンチが凶器として使われた後、故意に押し付けられた！'
                ))
            ],
            playerReply: txt('凶手想把水搅浑。但这里有个关键矛盾……', 'The killer wants to muddy the waters. But there\'s a key contradiction...', '犯人は混乱を狙っている。しかしここに重要な矛盾がある……'),
            choices: [
                makeChoice(txt('进入第三章：真相浮出水面', `Enter Chapter 3: Truth Emerges`, `第三章へ：真実が浮かび上がる`), 'detect_ch3_confront', {}, 'truth', txt('所有线索串联起来了。', 'All clues connect.', 'すべての手がかりがつながった。'), 'perfect')
            ]
        }
    },
    startScene: 'detect_ch2_investigate'
};

/* ========== 第三章：逆转 ========== */
var detect_ch3 = {
    id: 'detect_ch3',
    titleKey: 'detectCh3Title',
    subtitleKey: 'detectCh3Sub',
    scenes: {
        detect_ch3_confront: {
            messages: [
                makeNarrator(txt(
                    '你召集了所有人。雨停了。剧院里只有一盏灯亮着——舞台中央的聚光灯。就像今晚早些时候一样，只不过现在尸体已经移走，而凶手就站在你们中间。',
                    'You gather everyone. The rain stops. Only one light remains on in the theatre — the center stage spotlight. Just like earlier tonight, except the body is gone and the killer stands among you.',
                    '全員を集める。雨が止む。劇場に残る灯りは一つだけ——舞台中央のスポットライト。今夜初めと同じように、ただ死体はなくなり、犯人があなたたちの中に立っている。'
                )),
                makeCharacter('narrator_det', txt(
                    '「侦探，我找到了最后一个关键线索。总经理办公室的监控录像——不，别担心，剧院没有安装监控。但对面杂货店的摄像头拍到了后门的情况。在9:48，有人从剧院后门匆匆离开。」',
                    '"Detective, I found one last key clue. Surveillance from the manager\'s office — no, don\'t worry, the theatre has no cameras. But the convenience store across the street caught the back door. At 9:48, someone hurriedly left through the theatre\'s back door."'
                )),
                makeNarrator(txt(
                    '照片显示了一个模糊的身影——穿着风衣，体型无法准确辨认。但他/她手里拿着的……是一把带血的五边形扳手。',
                    'The photo shows a blurry figure — in a trench coat, body type unclear. But what he/she is holding... a bloodied pentagonal wrench.',
                    '写真はぼやけた人影を捉えている——トレンチコート姿、体型は不明。しかし手に持っているのは……血のついた五角レンチ。'
                ))
            ],
            playerReply: txt('9:48……死者9:40离开女演员，9:45总经理打电话。那么死亡时间在9:40-9:48之间。', '9:48... victim left actress at 9:40, manager called at 9:45. So TOD between 9:40-9:48.', '9:48…被害者は9:40に女優を離れ、支配人は9:45に電話。つまり死亡時刻は9:40-9:48の間。'),
            choices: [
                makeChoice(txt('指控总经理——他的不在场证明不成立', `Accuse the manager — his alibi doesn't hold`, `支配人を告訴する——アリバイは成立しない`), 'detect_ch4_manager', { final_choice: 'manager' }, 'truth', txt('你指向了总经理。', 'You point at the manager.', '支配人を指さす。'), 'neutral'),
                makeChoice(txt('指控演员——他在绘画中暴露了秘密', `Accuse the actor — his painting reveals a secret`, `俳優を告訴する——絵が秘密を暴露している`), 'detect_ch4_artist', { final_choice: 'artist' }, 'empathy', txt('你看向演员。', 'You look at the actor.', '俳優を見る。'), 'neutral'),
                makeChoice(txt('指控女演员——她的眼泪可能是演技', `Accuse the actress — her tears could be acting`, `女優を告訴する——涙は演技かもしれない`), 'detect_ch4_actress', { final_choice: 'actress' }, 'risk', txt('她回望着你。', 'She looks back at you.', '彼女があなたを見返す。'), 'neutral'),
                makeChoice(txt('需要更多证据——申请时间', `Need more evidence — request more time`, `さらなる証拠が必要——時間を求める`), 'detect_ch3_deeper', {}, 'trust', txt('真相一定隐藏在某处。', 'The truth must be hidden somewhere.', '真実はどこかに隠されている。'), 'good')
            ]
        },

        /* 深入调查 */
        detect_ch3_deeper: {
            messages: [
                makeCharacter('narrator_det', txt(
                    '「我查了所有人的手机定位数据。9:40-9:48之间，有一个人的手机信号在舞台区域和维修间之间移动——那就是演员的手机。但他说他9:40去维修间拿道具剑……那他的证词就和数据吻合。除非……」',
                    '"I checked everyone\'s phone location data. Between 9:40-9:48, one person\'s phone signal moved between the stage area and the maintenance room — the actor\'s. But he claims he went to the maintenance room at 9:40 for his prop sword... so his testimony matches the data. Unless..."'
                )),
                makeNarrator(txt(
                    '等等。演员9:00在舞台与死者争吵，9:15死者离开。演员说他在后台练功到9:40。但他的手机信号显示——9:00-9:15在舞台，然后9:15-9:40在……二楼。二楼是女演员的化妆间。',
                    'Wait. Actor 9:00 on stage arguing with victim, victim left at 9:15. Actor says he practiced backstage until 9:40. But his phone location shows — 9:00-9:15 on stage, then 9:15-9:40 on... the second floor. The second floor is the actress\'s dressing room.',
                    '待て。俳優は9:00に舞台で被害者と口論、被害者は9:15に去った。俳優は舞台裏で9:40まで練習していたと言う。しかし彼の携帯位置情報は——9:00-9:15に舞台、その後9:15-9:40に……2階。2階は女優の楽屋だ。'
                ))
            ],
            playerReply: txt('演员在撒谎。他9:15之后去了二楼——女演员的化妆间。他去找照片！', 'The actor is lying. He went to the second floor after 9:15 — the actress\'s dressing room. He went for the photo!', '俳優が嘘をついている。9:15以降に2階へ行った——女優の楽屋だ。写真を取りに行った！'),
            choices: [
                makeChoice(txt('重新审问演员——直面他的谎言', `Re-interrogate actor — confront his lies`, `俳優を再尋問——嘘を突きつける`), 'detect_ch3_artist_final', {}, 'truth', txt('这一次，你不会让他蒙混过关。', 'This time, you won\'t let him off easy.', '今回は簡単に逃がさない。'), 'perfect'),
                makeChoice(txt('直接做出最终指控', `Make final accusation directly`, `直接最終告発を行う`), 'detect_ch4_manager', { final_choice: 'manager' }, 'risk', txt('你的直觉告诉你答案。', 'Your gut tells you the answer.', '直感が答えを教えている。'), 'neutral')
            ]
        },

        /* 演员最终审问 */
        detect_ch3_artist_final: {
            messages: [
                makeCharacter('artist', txt(
                    '「你……你怎么知道我去过二楼？好吧，我承认！我是去找照片的。那张照片上的孩子……是我的女儿。」',
                    '"How... how did you know I went to the second floor? Fine, I admit it! I was looking for that photo. The child in that photo... is my daughter."'
                )),
                makeNarrator(txt(
                    '你震惊了。演员——那个被死者嘲笑为"永远的小丑"的男人——是女演员五年前那个孩子的父亲。',
                    'You\'re stunned. The actor — the man the victim mocked as "forever a clown" — is the father of the actress\'s child from five years ago.',
                    '衝撃が走る。俳優——被害者に「永遠の道化師」と嘲笑された男——は5年前の女優の子供の父親だった。'
                )),
                makeCharacter('artist', txt(
                    '「王富商知道。他今晚来就是为了告诉我们——他要把这件事公之于众，毁掉她的职业生涯，也毁掉我最后的机会。我只是……我只是想拿到那张照片，保护她。」',
                    '"Wang knew. He came tonight to tell us — he was going to make it public, destroy her career, and ruin my last chance. I just... I just wanted to get the photo, to protect her."'
                )),
                makeSystem(txt(
                    '🚨 大反转！演员是孩子的父亲！\n🚨 但他坚持说没有杀人——只拿走了照片\n🚨 那么谁是真正的凶手？',
                    '🚨 Major twist! The actor is the father!\n🚨 But he insists he didn\'t kill — only took the photo\n🚨 So who is the real killer?',
                    '🚨 大逆転！俳優が父親だった！\n🚨 しかし彼は殺していないと主張——写真だけを持ち去った\n🚨 では真犯人は誰？'
                ))
            ],
            playerReply: txt('有人利用了这个混乱……', 'Someone took advantage of this chaos...', '誰かがこの混乱に乗じた……'),
            choices: [
                makeChoice(txt('进入第四章：最终判决', `Enter Chapter 4: Final Judgment`, `第四章へ：最終判決`), 'detect_ch4_manager', { final_choice: 'manager' }, 'truth', txt('所有细节在你心中串联。', 'All the details click into place in your mind.', 'すべての詳細が頭の中でつながる。'), 'perfect')
            ]
        }
    },
    startScene: 'detect_ch3_confront'
};

/* ========== 第四章：最终判决 ========== */
var detect_ch4 = {
    id: 'detect_ch4',
    titleKey: 'detectCh4Title',
    subtitleKey: 'detectCh4Sub',
    scenes: {
        /* 完美结局：指控总经理 */
        detect_ch4_manager: {
            messages: [
                makeNarrator(txt(
                    '你深吸一口气。所有证据在你脑海中形成一个完整的闭环。你看向总经理。',
                    'You take a deep breath. All evidence forms a complete circle in your mind. You look at the manager.',
                    '深呼吸する。すべての証拠が頭の中で完全な輪を描く。支配人を見る。'
                )),
                makeCharacter('narrator_det', txt(
                    '「侦探——你真的确定吗？」',
                    '"Detective — are you really sure?"',
                    '「探偵——本当に確信があるのか？」'
                )),
                makeNarrator(txt(
                    '你一字一句地说出推理：\n\n"王富商今晚来剧院有三个目的——威胁演员和女演员公开他们的秘密，要挟总经理的挪用公款，以及逼迫女演员签放弃抚养费协议。\n\n他依次见了这三个人。在9:40准备离开时，在舞台上被击倒。\n\n但凶手不是有预谋的——凶器是随手从维修工具箱里拿的。这意味着凶手是临时起意。\n\n谁在那段时间有机会？演员在二楼找照片。女演员在化妆间。总经理——你说你在办公室，但你9:45打了一通电话。\n\n那通电话是给女演员的。但问题来了——如果你9:20-9:40在和死者在一起，他9:40离开，你9:45给她打电话。这中间的5分钟你做了什么？"',
                    'You lay out the deduction word by word:\n\n"Wang came to the theatre tonight with three goals — threaten the actor and actress with exposing their secret, blackmail the manager over embezzlement, and force the actress to sign away child support.\n\nHe met all three. At 9:40, as he was leaving, he was struck down on stage.\n\nBut the murder wasn\'t premeditated — the weapon was grabbed from a repair toolbox. That means it was a crime of opportunity.\n\nWho had the opportunity? The actor was searching the second floor. The actress was in her dressing room. The manager — you say you were in your office, but you made a call at 9:45.\n\nThat call was to the actress. But here\'s the problem — if you were with the victim from 9:20-9:40, and he left at 9:40, then you called her at 9:45. What did you do in those 5 minutes?"'
                )),
                makeCharacter('manager', txt(
                    '「我……我……」',
                    '"I... I..."',
                    '「わ……私は……」'
                )),
                makeNarrator(txt(
                    '总经理的脸变得惨白。他张了张嘴，最后低下了头。\n\n"他……他说他要毁了我。我在走廊上拦住了他，我们争吵起来。他推我，我……我随手拿起了工具箱旁边的扳手。"',
                    'The manager\'s face turns ghostly white. He opens his mouth, then lowers his head.\n\n"He... he said he was going to destroy me. I stopped him in the hallway, we argued. He pushed me, and I... I grabbed the wrench from the toolbox beside me."'
                )),
                makeCharacter('narrator_det', txt(
                    '「【完美破案】动机+凶器+时间线+指纹，全部吻合。案件告破。」',
                    '"【Perfect Solve】Motive+Weapon+Timeline+Fingerprints, all align. Case closed."',
                    '【完全解決】動機+凶器+タイムライン+指紋、すべて一致。事件解決。'
                ))
            ],
            isEnding: true, endingId: 'perfect_detect', endingTitleKey: 'detectEndingPerfectTitle', endingDescKey: 'detectEndingPerfectDesc'
        },

        /* 坏结局1：指控演员 */
        detect_ch4_artist: {
            messages: [
                makeNarrator(txt(
                    '你指向演员。他愣住了。',
                    'You point at the actor. He freezes.',
                    '俳優を指さす。彼が固まる。'
                )),
                makeCharacter('artist', txt(
                    '「不是我！我发誓——我只是去二楼拿了照片！我没有杀他！」',
                    '"It wasn\'t me! I swear — I only went upstairs to get the photo! I didn\'t kill him!"'
                )),
                makeNarrator(txt(
                    '但你的证据不足。演员被带走调查。然而一个月后，真正的凶手——总经理——在一次醉酒后向别人炫耀了他「完美犯罪」的经过，最终落网。\n\n演员被无罪释放，但剧团的声誉已经毁了。女演员带着孩子离开了这座城市。',
                    'But your evidence is insufficient. The actor is taken in. Yet a month later, the real killer — the manager — bragged about his "perfect crime" while drunk and was finally caught.\n\nThe actor is released, but the troupe\'s reputation is ruined. The actress leaves the city with her child.'
                )),
                makeCharacter('narrator_det', txt(
                    '「【错误判断】我们抓错了人。真凶仍然逍遥法外了一个月。」',
                    '"【Wrong Judgment】We caught the wrong person. The real killer was free for a month."',
                    '【誤った判断】間違った人物を捕まえた。真犯人は一ヶ月自由のままでした。'
                ))
            ],
            isEnding: true, endingId: 'bad_detect', endingTitleKey: 'detectEndingBadTitle', endingDescKey: 'detectEndingBadDesc'
        },

        /* 坏结局2：指控女演员 */
        detect_ch4_actress: {
            messages: [
                makeNarrator(txt(
                    '你指向女演员。她愣住了，眼泪滑落。',
                    'You point at the actress. She freezes, tears falling.',
                    '女優を指さす。彼女が固まり、涙がこぼれる。'
                )),
                makeCharacter('actress', txt(
                    '「我……我告诉过你，不是我的……」',
                    '"I... I told you, it wasn\'t me..."'
                )),
                makeNarrator(txt(
                    '女演员被逮捕。但在审讯中，她提到了一个关键细节——她离开化妆间时，看到演员和总经理在走廊尽头争执。她当时没在意，但现在……\n\n太晚了。错误的指控让你错过了真正的凶手。女演员在狱中度过了三年，直到真正的凶手再次行凶才被发现。',
                    'The actress is arrested. But during interrogation, she mentions a key detail — when she left the dressing room, she saw the actor and manager arguing at the end of the hall. She didn\'t think much of it at the time, but now...\n\nToo late. The wrong accusation made you miss the real killer. The actress spent three years in prison before the real killer struck again and was caught.'
                )),
                makeCharacter('narrator_det', txt(
                    '「【冤案】无辜的人替真凶承受了惩罚。这个案子将永远成为你的污点。」',
                    '"【Injustice】The innocent suffered for the guilty. This case will forever be your stain."',
                    '【冤罪】無実の者が罪を被った。この事件は永遠にあなたの汚点となる。'
                ))
            ],
            isEnding: true, endingId: 'bad2_detect', endingTitleKey: 'detectEndingBadTitle2', endingDescKey: 'detectEndingBadDesc2'
        }
    },
    startScene: 'detect_ch4_manager'
};

window.STORY_CHAPTERS.push(detect_ch1, detect_ch2, detect_ch3, detect_ch4);

if (window.CHARACTERS) {
    Object.assign(window.CHARACTERS, {
        artist: character_artist,
        manager: character_manager,
        actress: character_actress,
        narrator_det: character_narrator
    });
}
