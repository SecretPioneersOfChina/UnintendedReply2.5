/**
 * storyLastSurvivor.js - 终末避难所 (survive_ch1-3)
 * 自动拆分自原 story.js（由 split_story.py 生成）
 */

/* Story C: 终末避难所 LastSurvivor */

// 角色
const character_military = { id: 'military', nameKey: 'survCharMilitary', color: '#dc2626', avatar: '⚔️', description: '前上校，主张武力管制' };

const character_scientist = { id: 'scientist', nameKey: 'survCharScientist', color: '#06b6d4', avatar: '🔬', description: '生物学家，搜寻解药' };

const character_civilian = { id: 'civilian', nameKey: 'survCharCivilian', color: '#eab308', avatar: '🌾', description: '农民代表，关心食物' };

// 章节
const survive_ch1 = {
        id: 'survive_ch1',
        titleKey: 'surviveCh1Title',
        subtitleKey: 'surviveCh1Sub',
        narrator: txt(
            `核战争后的第47天。你带领一群幸存者在废弃的地铁站建立避难所。30条生命，3个派系，1个共同的敌人——外面的辐射。`,
            `Day 47 after the nuclear war. You lead a group of survivors in an abandoned subway shelter. 30 lives, 3 factions, 1 common enemy — the radiation outside.`,
            `核戦争から47日目。あなたは廃駅のシェルターで生存者たちを率いている。30の命、3つの派閥、1つの共通の敵——外の放射能。`
        ),
        scenes: {
            survive_ch1_start: {
                id: 'survive_ch1_start',
                messages: [
                    makeNarrator(txt(
                        `你召集了三个派系的代表。这是第一次正式会议。空气凝重，所有人都在等待你的第一个决定。`,
                        `You've called the three faction representatives together. This is the first formal meeting. The air is heavy; everyone waits for your first decision.`,
                        `三つの派閥の代表を招集した。初めての正式な会議だ。空気は重く、全員があなたの最初の決断を待っている。`
                    )),
                    makeCharacter('military', txt(
                        `「我提议立即组织巡逻队。任何违反宵禁的人，无论是谁，都应被立即处决。没有秩序，我们将无法生存。」`,
                        `"I propose we organize a patrol immediately. Anyone who violates curfew, whoever they are, should be executed on the spot. Without order, we cannot survive."`,
                        `「即時パトロール隊を組織することを提案する。夜間外出禁止令に違反した者は誰でも、即座に処刑すべきだ。秩序なしには生き残れない。」`
                    )),
                    makeCharacter('scientist', txt(
                        `「我反对。当务之急是研发辐射防护剂，不是互相残杀。如果我们的食物配给系统能维持90天，疫苗就可能问世。」`,
                        `"I oppose. The priority is developing a radiation protection agent, not killing each other. If our food rationing system can last 90 days, a vaccine may emerge."`,
                        `「反対だ。最優先事項は放射線防護剤の開発で、お互い殺し合うことではない。食料配給システムが90日持てば、ワクチンが生まれるかもしれない。」`
                    )),
                    makeCharacter('civilian', txt(
                        `「我们只关心一件事：食物。我们已经有两个人因为营养不良而倒下。如果我们不立刻扩大种植，我们的孩子们会先死。」`,
                        `"We only care about one thing: food. We already have two people collapse from malnutrition. If we don't expand farming immediately, our children will die first."`,
                        `「私たちが関心があるのは一つだけ：食料だ。栄養失調で倒れる人がすでに2人出ている。今すぐ農業を拡大しなければ、子どもたちが最初に死ぬ。」`
                    ))
                ],
                playerReply: txt(`你感到压力。这是你的第一个决定。`, `You feel the pressure. This is your first decision.`, `プレッシャーを感じる。最初の決断だ。`),
                choices: [
                    makeChoice(txt(`支持军方：建立宵禁和巡逻队。`, `Back the military: establish curfew and patrols.`, `軍を支持：夜間外出禁止令とパトロールを確立する。`), 'survive_ch1_military', { trust_military: 2, trust_scientists: -1, trust_civilians: -1, food_supply: 0, days_survived: 1 }, 'risk', txt(`秩序建立。`, `Order established.`, `秩序が確立された。`), 'neutral'),
                    makeChoice(txt(`支持科学家：全力研发疫苗。`, `Back the scientists: full effort on vaccine.`, `科学者を支持：ワクチン開発に全力。`), 'survive_ch1_scientist', { trust_military: -1, trust_scientists: 2, trust_civilians: 0, food_supply: -10, days_survived: 1 }, 'truth', txt(`实验室启动。`, `Lab launched.`, `研究所が稼働。`), 'good'),
                    makeChoice(txt(`支持平民：扩大种植。`, `Back the civilians: expand farming.`, `平民を支持：農業を拡大する。`), 'survive_ch1_civilian', { trust_military: 0, trust_scientists: -1, trust_civilians: 2, food_supply: 20, days_survived: 1 }, 'trust', txt(`农田扩张。`, `Farms expanded.`, `農地が拡大。`), 'good'),
                    makeChoice(txt(`三派平衡：同时支持三个项目（食物消耗较多）`, `Balance all three: support all projects (more food cost)`, `三派バランス：三つ全てを支援（食料消費多め）`), 'survive_ch1_balance', { trust_military: 1, trust_scientists: 1, trust_civilians: 1, food_supply: -5, days_survived: 1 }, 'empathy', txt(`你试图平衡各方。`, `You try to balance all sides.`, `全ての側面のバランスを試みる。`), 'good')
                ]
            },
            survive_ch1_military: {
                messages: [
                    makeCharacter('military', txt(
                        `「明智的选择。我的人会维护这里的秩序。」`,
                        `"A wise choice. My men will maintain order here."`,
                        `「賢明な選択だ。我が部下がここの秩序を維持しよう。」`
                    )),
                    makeNarrator(txt(
                        `军方开始巡逻。第一个晚上，就有一个平民因为在宵禁后外出打水被当场击毙。派系之间的紧张进一步升级。`,
                        `The military begins patrolling. On the first night, a civilian is shot on the spot for going out after curfew to fetch water. Tensions between factions escalate further.`,
                        `軍がパトロールを開始。最初の夜、夜間外出禁止後に水汲みで外出した平民が即座に射殺された。派閥間の緊張がさらに高まる。`
                    )),
                    makeCharacter('scientist', txt(
                        `「那个被打死的平民……叫张伟。他有一个六岁的女儿。现在那个女孩成了孤儿。上校，这就是你所谓的'秩序'吗？」`,
                        `"That civilian who was shot... his name is Zhang Wei. He has a six-year-old daughter. Now that girl is an orphan. Colonel, is this what you call 'order'?"`,
                        `「射殺された平民は…張偉という。6歳の娘がいる。今やその少女は孤児だ。大佐、これがあなたの言う『秩序』なのか？」`
                    )),
                    makeSystem(txt(
                        `⚠️ 道德危机：一名平民被军方法律处决。他的女儿现在需要人照顾。`,
                        `⚠️ Moral crisis: A civilian executed under martial law. His daughter now needs care.`,
                        `⚠️ 道徳的危機：軍法により平民が処刑された。彼の娘は今、世話を必要としている。`
                    ))
                ],
                playerReply: txt(`你的支持让军方得势，但代价开始显现。`, `Your support empowered the military, but the cost is becoming apparent.`, `あなたの支持で軍が力を持ったが、代償が見え始める。`),
                choices: [
                    makeChoice(txt(`继续支持军方`, `Continue backing the military`, `軍の支持を続ける`), 'survive_ch2_military_path', { trust_military: 1, days_survived: 7 }, 'risk', txt(`军方开始掌控一切。`, `The military begins to control everything.`, `軍が全てを掌握し始める。`), 'neutral'),
                    makeChoice(txt(`重新平衡：向平民道歉并补偿`, `Rebalance: apologize to civilians and compensate`, `再バランス：平民に謝罪し補償する`), 'survive_ch2_balance_path', { trust_civilians: 2, days_survived: 7 }, 'empathy', txt(`你试图修复裂痕。`, `You try to mend the rift.`, `亀裂の修復を試みる。`), 'good')
                ]
            },
            survive_ch1_scientist: {
                messages: [
                    makeCharacter('scientist', txt(
                        `「谢谢你。我们会日夜工作。」`,
                        `"Thank you. We'll work day and night."`,
                        `「ありがとう。我々は昼夜働く。」`
                    )),
                    makeNarrator(txt(
                        `科学家们开始通宵达旦地工作。但食物消耗加快，平民的不满开始累积。军方在暗中观察，等待机会。`,
                        `The scientists begin working around the clock. But food consumption accelerates, and civilian dissatisfaction begins to accumulate. The military watches in the shadows, waiting for an opportunity.`,
                        `科学者たちが昼夜働き始める。だが食料消費が加速し、平民の不満が蓄積し始める。軍は機会を待ちながら影から見ている。`
                    )),
                    makeCharacter('scientist', txt(
                        `「我在实验室里发现了一样东西。一份战前的医学档案——是由一个叫「李文」的医生留下的。他……他是我父亲。他在核弹落下前三天就在研究这种辐射病。他在笔记里写道：「如果有一天这种辐射病爆发，疫苗的关键不在于杀死病毒——而在于让人类的免疫系统自己醒来。」就像我们一样。我们只需要……醒来。」`,
                        `"I found something in the lab. A pre-war medical file — left by a doctor named 'Li Wen'. He... he was my father. He was researching this radiation sickness three days before the bombs fell. He wrote in his notes: 'If this radiation sickness ever breaks out, the key to the vaccine isn\\'t killing the virus — it\\'s waking up the human immune system itself.' Like us. We just need to... wake up."`,
                        `「ラボで何かを見つけた。戦前の医学档案——「李文」という医者が残したもの。彼……彼は私の父だ。原爆が落ちる3日前からこの放射線病を研究していた。彼はノートにこう書いていた。「もしいつかこの放射線病が爆発したら、ワクチンの鍵はウイルスを殺すことではない——人間の免疫システムを自ら目覚めさせることにある。」我々と同じだ。ただ……目覚める必要があるだけ。`
                    ))
                ],
                playerReply: txt(`你赌上了科学。`, `You're betting on science.`, `科学に賭けた。`),
                choices: [
                    makeChoice(txt(`继续支持科学家`, `Continue backing the scientists`, `科学者の支持を続ける`), 'survive_ch2_scientist_path', { trust_scientists: 1, days_survived: 7 }, 'truth', txt(`科学家正在突破。`, `The scientists are making breakthroughs.`, `科学者たちが突破口を開きつある。`), 'good'),
                    makeChoice(txt(`重新平衡：分享研究成果给军方和平民`, `Rebalance: share research results with military and civilians`, `再バランス：研究成果を軍と平民に共有`), 'survive_ch2_balance_path', { trust_military: 1, trust_civilians: 1, days_survived: 7 }, 'empathy', txt(`你试图平衡。`, `You try to balance.`, `バランスを試みる。`), 'good')
                ]
            },
            survive_ch1_civilian: {
                messages: [
                    makeCharacter('civilian', txt(
                        `「感谢你。我们会种植更多食物，让每个人都能吃饱。」`,
                        `"Thank you. We'll grow more food so everyone can eat."`,
                        `「ありがとう。みんなが食べられるよう、もっと作物を育てる。」`
                    )),
                    makeNarrator(txt(
                        `农田扩大，食物储备增加。但军方的耐心正在耗尽。`,
                        `Farms expand, food reserves increase. But the military's patience is wearing thin.`,
                        `農地が拡大、食料備蓄が増加。だが軍の忍耐が限界に近づいている。`
                    ))
                ],
                playerReply: txt(`食物的稳定让一些人松了口气。`, `Food stability has relieved some.`, `食料の安定に安堵する人もいる。`),
                choices: [
                    makeChoice(txt(`继续支持平民`, `Continue backing the civilians`, `平民の支持を続ける`), 'survive_ch2_civilian_path', { trust_civilians: 1, days_survived: 7 }, 'trust', txt(`平民开始主导。`, `Civilians begin to lead.`, `平民が主導権を握り始める。`), 'good'),
                    makeChoice(txt(`重新平衡：与军方分享食物以换取秩序`, `Rebalance: share food with military in exchange for order`, `再バランス：秩序と引き換えに食料を軍と共有`), 'survive_ch2_balance_path', { trust_military: 1, days_survived: 7 }, 'risk', txt(`你试图平衡。`, `You try to balance.`, `バランスを試みる。`), 'neutral')
                ]
            },
            survive_ch1_balance: {
                messages: [
                    makeCharacter('narrator', txt(
                        `你的选择让三方都不完全满意，但至少没有爆发冲突。然而，食物消耗的加剧意味着你们只有60天的窗口。`,
                        `Your choice leaves all three parties not fully satisfied, but at least no conflict erupts. However, accelerating food consumption means you only have a 60-day window.`,
                        `あなたの選択は三派を完全に満足させないが、少なくとも衝突は勃発しない。だが食料消費の加速は、60日の猶予しかないことを意味する。`
                    ))
                ],
                playerReply: txt(`你成为三派间的桥梁。`, `You become a bridge between the three factions.`, `あなたは三派の間の橋となる。`),
                choices: [
                    makeChoice(txt(`继续走平衡路线`, `Continue on the balance path`, `バランス路線を続ける`), 'survive_ch2_balance_path', { days_survived: 7 }, 'empathy', txt(`你继续艰难地维持平衡。`, `You continue struggling to maintain balance.`, `あなたは平衡維持の苦闘を続ける。`), 'good')
                ]
            }
        },
        startScene: 'survive_ch1_start'
    };

// ===== 第二章分支选择辅助函数（原设计遗漏定义）=====
function makeChallengeMilitaryChoice() {
    return makeChoice(
        txt(`公开挑战军方：联合科学家与平民，解除军方武装。`, `Publicly challenge the military: unite scientists and civilians to disarm them.`, `軍に公然と異議を唱える：科学者と平民を団結させ、軍の武装を解除する。`),
        'survive_ch3_coup',
        { trust_military: -2, trust_scientists: 1, days_survived: 0 },
        'risk',
        txt(`内战爆发。`, `Civil war erupts.`, `内戦が勃発する。`),
        'good'
    );
}
function makeAcquiesceChoice() {
    return makeChoice(
        txt(`顺从军方：把秩序交给他们，换取暂时的和平。`, `Acquiesce to the military: hand them order in exchange for temporary peace.`, `軍に従う：秩序を彼らに任せ、一時的な平和を得る。`),
        'survive_ch3_military_takeover',
        { trust_military: 2, trust_scientists: -1, days_survived: 0 },
        'risk',
        txt(`军方接管一切。`, `The military takes over everything.`, `軍が全てを掌握する。`),
        'bad'
    );
}
function makeGiveScientistsChoice() {
    return makeChoice(
        txt(`把食物给科学家：全力研发疫苗。`, `Give food to the scientists: devote full effort to the vaccine.`, `食料を科学者に：ワクチン開発に全力を注ぐ。`),
        'survive_ch3_vaccine',
        { trust_scientists: 2, food_supply: -20, days_survived: 0 },
        'truth',
        txt(`实验室全力运转。`, `The lab runs at full capacity.`, `研究所がフル稼働する。`),
        'good'
    );
}
function makeShareVaccineChoice() {
    return makeChoice(
        txt(`向军方与平民分享研究成果：让所有人见证希望。`, `Share the research with the military and civilians: let everyone witness hope.`, `研究成果を軍と平民に共有：全員に希望を見せる。`),
        'survive_ch3_shared_vaccine',
        { trust_military: 1, trust_civilians: 1, trust_scientists: 1, days_survived: 0 },
        'empathy',
        txt(`疫苗被公平分配。`, `The vaccine is fairly distributed.`, `ワクチンが公平に分配される。`),
        'good'
    );
}
function makeRefuseMilitaryChoice() {
    return makeChoice(
        txt(`拒绝军方的最后通牒：你绝不交出领导权。`, `Refuse the military's ultimatum: you will not hand over leadership.`, `軍の最後通牒を拒否：指導権を決して渡さない。`),
        'survive_ch3_coup',
        { trust_military: -2, trust_civilians: 1, days_survived: 0 },
        'risk',
        txt(`你站在了平民一边。`, `You stand with the civilians.`, `あなたは平民の側に立つ。`),
        'good'
    );
}
function makeCompromiseChoice() {
    return makeChoice(
        txt(`妥协：让出部分权力，避免流血冲突。`, `Compromise: cede some power to avoid bloodshed.`, `妥協：一部の権力を譲り、流血を避ける。`),
        'survive_ch3_military_takeover',
        { trust_military: 1, days_survived: 0 },
        'empathy',
        txt(`军方暂时满意。`, `The military is temporarily satisfied.`, `軍はひとまず満足する。`),
        'bad'
    );
}
function makeTellGoodNewsChoice() {
    return makeChoice(
        txt(`公布救援信号：团结所有人撑到第87天。`, `Announce the rescue signal: unite everyone to hold out until Day 87.`, `救助信号を公表：全員を団結させ87日目まで持ちこたえる。`),
        'survive_ch3_rescue_hope',
        { trust_military: 1, trust_civilians: 1, trust_scientists: 1, days_survived: 0 },
        'trust',
        txt(`所有人都看到了希望。`, `Everyone sees hope.`, `全員が希望を見た。`),
        'good'
    );
}

const survive_ch2 = {
        id: 'survive_ch2',
        titleKey: 'surviveCh2Title',
        subtitleKey: 'surviveCh2Sub',
        scenes: {
            survive_ch2_military_path: {
                messages: [
                    makeNarrator(txt(
                        `第54天。军方在避难所的东侧建立了"秩序区"，平民被禁止进入。科学家们的食物配给被削减。`,
                        `Day 54. The military has established an "Order Zone" on the east side of the shelter; civilians are forbidden to enter. The scientists' food rations are cut.`,
                        `54日目。軍がシェルターの東側に「秩序区」を設置、平民の立ち入りが禁止される。科学者たちの食料配給が削減される。`
                    )),
                    makeCharacter('scientist', txt(
                        `「我的团队有 5 个人已经饿晕了。我们需要更多的食物，否则疫苗研究将完全停滞。」`,
                        `"Five of my team have fainted from hunger. We need more food, or vaccine research will completely stall."`,
                        `「私のチームから5人が飢えで倒れた。もっと食料が必要だ。さもなければワクチン研究は完全に止まる。」`
                    ))
                ],
                playerReply: txt(`军方正在向独裁演变。`, `The military is evolving toward dictatorship.`, `軍が独裁へと変貌している。`),
                choices: [
                    makeChallengeMilitaryChoice(),
                    makeAcquiesceChoice()
                ]
            },
            survive_ch2_scientist_path: {
                messages: [
                    makeNarrator(txt(
                        `第54天。科学家宣布他们接近突破——一种能延长辐射暴露耐受时间的药剂。`,
                        `Day 54. The scientists announce they're close to a breakthrough — a drug that can extend radiation exposure tolerance.`,
                        `54日目。科学者たちが突破口に近いと発表——放射線被曝許容時間を延長する薬剤。`
                    )),
                    makeCharacter('scientist', txt(
                        `「再给我们7天，再给我们20人份的食物，我们就能做出第一批疫苗样品。」`,
                        `"Give us 7 more days, give us 20-person portions of food, and we can produce the first vaccine samples."`,
                        `「あと7日、20人分の食料をくれれば、第一批のワクチンサンプルを作れる。」`
                    )),
                    makeCharacter('military', txt(
                        `「我的士兵已经在挨饿。如果再削减配给，我的人会自己动手拿。」`,
                        `"My soldiers are already going hungry. If rations are cut further, my men will take it themselves."`,
                        `「私の兵士はすでに飢えている。これ以上配給を減らされたら、部下が自分で取りに行く。」`
                    ))
                ],
                playerReply: txt(`你必须做出选择：科学还是秩序？`, `You must choose: science or order?`, `選択を迫られる：科学か秩序か？`),
                choices: [
                    makeGiveScientistsChoice(),
                    makeShareVaccineChoice()
                ]
            },
            survive_ch2_civilian_path: {
                messages: [
                    makeNarrator(txt(
                        `第54天。平民成功地扩大了种植规模。他们现在可以每天提供 50 人份的食物。但军方的耐心到了极限。`,
                        `Day 54. The civilians have successfully expanded farming. They can now provide 50-person food portions daily. But the military's patience has reached its limit.`,
                        `54日目。平民が農業拡大に成功。毎日50人分の食料を提供できるようになった。だが軍の忍耐は限界に達した。`
                    )),
                    makeCharacter('military', txt(
                        `「够了。我的士兵已经为'民主'牺牲了太多。我给你24小时：要么由我接管，要么我们离开，带着一半的食物和武器。」`,
                        `"Enough. My soldiers have sacrificed too much for 'democracy'. I give you 24 hours: either I take over, or we leave with half the food and weapons."`,
                        `「もうたくさんだ。我が兵士は『民主主義』の為にあまりに多くを犠牲にした。24時間やる：私が引き継ぐか、私たちが食料と武器の半分を持って去るかだ。」`
                    ))
                ],
                playerReply: txt(`军方发出最后通牒。`, `The military issues an ultimatum.`, `軍が最後通牒を突きつけた。`),
                choices: [
                    makeRefuseMilitaryChoice(),
                    makeCompromiseChoice()
                ]
            },
            survive_ch2_balance_path: {
                messages: [
                    makeNarrator(txt(
                        `第54天。你的平衡术让三方勉强合作。科学家取得了小进展，军方维持了秩序，平民的食物稳定。但窗口期只剩 33 天。`,
                        `Day 54. Your balancing act keeps all three factions barely cooperating. The scientists make small progress, the military maintains order, the civilians' food is stable. But the window is only 33 days left.`,
                        `54日目。あなたのバランス術で三派が辛うじて協力している。科学者たちは小さな進展を遂げ、軍は秩序を維持し、平民の食料は安定。だが猶予はあと33日。`
                    )),
                    makeCharacter('narrator', txt(
                        `你接到一个意外消息：外部有一个救援队将在第87天抵达，前提是你们能撑到那时。`,
                        `You receive unexpected news: an outside rescue team will arrive on Day 87, provided you can hold out until then.`,
                        `予期せぬニュースが入る：外部の救助隊が87日目に到着する。ただし、あなたがそれまで持ちこたえることが前提だ。`
                    )),
                    makeCharacter('military', txt(
                        `「等等。这个信号的来源——它不是来自军方频道，也不是政府波段。它是从一个民用频率发出的。而且……它知道我们这里有多少人。它说'30个幸存者'——精确到个位数。这是谁发的？」`,
                        `"Wait. The source of this signal — it's not from military channels, nor from government bands. It's coming from a civilian frequency. And... it knows exactly how many we have here. It says '30 survivors' — precise to the individual. Who sent this?"`
                    )),
                    makeCharacter('civilian', txt(
                        `「这不可能是巧合。你们还记得战前那个关于'方舟计划'的传言吗？有人说政府在秘密建造地下城市。如果那是真的……那外面的世界可能根本没有毁灭。」`,
                        `"This can't be a coincidence. Do you remember the pre-war rumors about 'Project Ark'? Some said the government was secretly building underground cities. If that's true... then the outside world might not have been destroyed at all."`
                    )),
                    makeSystem(txt(
                        `⚠️ 新线索：救援信号来自民用频率，且知道避难所的精确人数\n⚠️ 「方舟计划」——一个战前的地下城市传说\n⚠️ 如果外面还有文明……那核战争到底是真是假？`,
                        `⚠️ New lead: Rescue signal from civilian frequency, knows exact shelter population\n⚠️ "Project Ark" — a pre-war underground city legend\n⚠️ If there's still civilization outside... was the nuclear war even real?`,
                        `⚠️ 新たな手がかり：救助信号は民間周波数から、シェルターの正確な人数を知っている\n⚠️ 「箱舟計画」——戦前の地下都市伝説\n⚠️ 外に文明がまだあるなら…核戦争は本当にあったのか？`
                    ))
                ],
                playerReply: txt(`这是一个机会——如果你能维持团结。`, `This is a chance — if you can maintain unity.`, `チャンスだ——もし団結を維持できるなら。`),
                choices: [
                    makeTellGoodNewsChoice()
                ]
            }
        },
        startScene: 'survive_ch2_military_path'
    };



const survive_ch3 = {
        id: 'survive_ch3',
        titleKey: 'surviveCh3Title',
        subtitleKey: 'surviveCh3Sub',
        scenes: {
            survive_ch3_coup: {
                messages: [
                    makeNarrator(txt(
                        `你联合科学家和平民，公开挑战军方。一场内战在避难所内爆发。`,
                        `You unite with scientists and civilians to publicly challenge the military. A civil war erupts inside the shelter.`,
                        `科学者と平民を団結させ、軍を公然と非難する。内戦がシェルター内で勃発する。`
                    )),
                    makeCharacter('scientist', txt(
                        `「我有一批剩余的镇定剂——足以瘫痪军方30人！」`,
                        `"I have a batch of leftover sedatives — enough to paralyze 30 military men!"`,
                        `「残った鎮静剤がある——軍30人を無力化できる！」`
                    )),
                    makeNarrator(txt(
                        `你成功了。军方被解除武装，新的领导层建立。科学家们终于可以全力研究疫苗。最终，在第90天，第一批疫苗问世。`,
                        `You succeed. The military is disarmed, a new leadership is established. The scientists can finally devote themselves fully to the vaccine. Finally, on Day 90, the first batch of vaccine is produced.`,
                        `成功した。軍が武装解除され、新しい指導部が樹立される。科学者たちはついにワクチン研究に専念できる。最終的に90日目に、第一批のワクチンが完成。`
                    ))
                ],
                isEnding: true,
                endingId: 'good_survive',
                endingTitleKey: 'surviveEndingGoodTitle',
                endingDescKey: 'surviveEndingGoodDesc'
            },
            survive_ch3_military_takeover: {
                messages: [
                    makeNarrator(txt(
                        `军方接管了一切。科学家被迫停止研究，平民被严格管控。食物被优先分配给军方的士兵。`,
                        `The military takes over everything. Scientists are forced to stop research, civilians are strictly controlled. Food is distributed to military soldiers first.`,
                        `軍が全てを引き継いだ。科学者は研究を強制中止され、平民は厳重管理下に。食料は軍の兵士に優先配給される。`
                    )),
                    makeNarrator(txt(
                        `第80天。食物耗尽。军方决定放弃弱者，独自突围。留下的只有死亡。`,
                        `Day 80. Food runs out. The military decides to abandon the weak and break out alone. What remains is only death.`,
                        `80日目。食料が尽きる。軍は弱者を見捨て、単独で突破することを決める。残ったのは死だけ。`
                    ))
                ],
                isEnding: true,
                endingId: 'bad_survive',
                endingTitleKey: 'surviveEndingBadTitle',
                endingDescKey: 'surviveEndingBadDesc'
            },
            survive_ch3_vaccine: {
                messages: [
                    makeNarrator(txt(
                        `科学取得突破。军方虽愤怒但无力阻止——因为科学家和平民都站在你这边。`,
                        `Science breaks through. The military is angry but unable to stop it — because scientists and civilians are on your side.`,
                        `科学が突破口を開く。軍は怒るが阻止できない——科学者と平民があなたの側だから。`
                    )),
                    makeCharacter('scientist', txt(
                        `「第一批疫苗已生产！我们可以离开这里了。」`,
                        `"The first batch of vaccine is produced! We can leave here."`,
                        `「第一批のワクチンが完成！ここから出られる。」`
                    )),
                    makeNarrator(txt(
                        `在第75天，整个避难所撤离到新的安全区。你成为这个小型文明的奠基人。`,
                        `On Day 75, the entire shelter evacuates to a new safe zone. You become the founder of this small civilization.`,
                        `75日目、シェルター全体が新しい安全地帯へ避難する。あなたはこの小さな文明の創設者となる。`
                    ))
                ],
                isEnding: true,
                endingId: 'perfect_survive',
                endingTitleKey: 'surviveEndingPerfectTitle',
                endingDescKey: 'surviveEndingPerfectDesc'
            },
            survive_ch3_shared_vaccine: {
                messages: [
                    makeNarrator(txt(
                        `你将疫苗公平分配给所有人。军方终于意识到科学的力量，主动加入到研究团队。`,
                        `You distribute the vaccine fairly to all. The military finally realizes the power of science and actively joins the research team.`,
                        `ワクチンを全員に公平に分配する。軍はついに科学の力を認識し、研究チームに自主的に参加する。`
                    )),
                    makeNarrator(txt(
                        `第85天。30个幸存者全部接种了疫苗。三派系第一次真正合作。`,
                        `Day 85. All 30 survivors are vaccinated. The three factions truly cooperate for the first time.`,
                        `85日目。30人の生存者全員がワクチン接種。三派閥が初めて真に協力する。`
                    ))
                ],
                isEnding: true,
                endingId: 'good_survive',
                endingTitleKey: 'surviveEndingGoodTitle',
                endingDescKey: 'surviveEndingGoodDesc'
            },
            survive_ch3_unity: {
                messages: [
                    makeNarrator(txt(
                        `你成功地说服了所有人留下来。第87天，外部救援队如约到达。`,
                        `You successfully convinced everyone to stay. On Day 87, the outside rescue team arrives as promised.`,
                        `全員を留まらせることに成功。87日目、外部救助隊は約束通り到着する。`
                    )),
                    makeCharacter('military', txt(
                        `「看来你做到了。我承认，你的'民主'比我们想象的更有力量。」`,
                        `"It seems you made it. I admit, your 'democracy' is more powerful than I imagined."`,
                        `「やり遂げたようだ。認める。君の『民主主義』は我々が思っていたより強力だ。」`
                    )),
                    makeNarrator(txt(
                        `你带领所有 30 个幸存者走出了避难所。三个派系第一次以平等的身份面对未来。`,
                        `You lead all 30 survivors out of the shelter. The three factions face the future as equals for the first time.`,
                        `30人の生存者全員をシェルターから導く。三派閥が初めて平等な立場で未来に立ち向かう。`
                    ))
                ],
                isEnding: true,
                endingId: 'perfect_survive',
                endingTitleKey: 'surviveEndingPerfectTitle',
                endingDescKey: 'surviveEndingPerfectDesc'
            },
            survive_ch3_rescue_hope: {
                messages: [
                    makeNarrator(txt(
                        `你的消息让所有人看到了希望。科学家加快了研究，军方维持秩序，平民稳定食物供给。`,
                        `Your message gives everyone hope. The scientists accelerate research, the military maintains order, the civilians stabilize food supply.`,
                        `あなたの知らせが全員に希望を与える。科学者たちは研究を加速し、軍は秩序を維持し、平民は食料供給を安定させる。`
                    )),
                    makeNarrator(txt(
                        `第87天。救援队抵达。30人全部生还。`,
                        `Day 87. The rescue team arrives. All 30 survive.`,
                        `87日目。救助隊が到着。30人全員生還。`
                    ))
                ],
                isEnding: true,
                endingId: 'perfect_survive',
                endingTitleKey: 'surviveEndingPerfectTitle',
                endingDescKey: 'surviveEndingPerfectDesc'
            }
        },
        startScene: 'survive_ch3_coup'
    };


// 推入全局章节集合
window.STORY_CHAPTERS = window.STORY_CHAPTERS || [];
window.STORY_CHAPTERS.push(survive_ch1, survive_ch2, survive_ch3);

// 注册角色到全局
if (window.CHARACTERS) {
    Object.assign(window.CHARACTERS, {
        military: character_military,
        scientist: character_scientist,
        civilian: character_civilian
    });
}
