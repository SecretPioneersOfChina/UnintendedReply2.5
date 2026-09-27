/**
 * storyUnintendedReply.js - 未读信息 (ch1-ch4)
 * 核心故事：程序员林凯收到来自未来的未读信息，逐步揭开真相
 */

/* Story A: 未读信息 UnintendedReply */

// 角色已在 storyCore.js 定义: lk(林凯), sq(苏晴), dc(陈博士), my(神秘人)

// ========== 第一章：意外来信 ==========
const ch1 = {
    id: 'ch1',
    titleKey: 'ch1Title',
    subtitleKey: 'ch1Sub',
    narrator: txt(
        `凌晨3:17。你的手机亮了一条来自未知号码的信息。没有发件人，没有时间戳。只有一行字：`,
        `3:17 AM. Your phone lights up with a message from an unknown number. No sender, no timestamp. Just one line:`,
        `午前3:17。携帯に知らない番号からのメッセージが表示される。送信者なし、タイムスタンプなし。ただ一行：`
    ),
    scenes: {
        ch1_start: {
            id: 'ch1_start',
            messages: [
                makeCharacter('my', txt(
                    `📩 「林凯。我知道你正在看的代码。第347行有一个内存泄漏。别用 free() —— 用 autoreleasepool。」`,
                    `📩 "Lin Kai. I know the code you're looking at right now. Line 347 has a memory leak. Don't use free() — use autoreleasepool."`,
                    `📩 「林凱。お前が今見ているコードを知っている。347行目にメモリリークがある。free()を使うな —— autoreleasepoolを使え。」`
                )),
                makeCharacter('lk', txt(
                    `「什么……？谁在恶作剧？这怎么可能有人知道我在写什么代码……」`,
                    `"What...? Who's pranking me? How could anyone know what code I'm writing..."`,
                    `「なんだ…？誰のいたずらだ？俺がどんなコードを書いているかなんて知るはずがない…」`
                )),
                makeNarrator(txt(
                    `你下意识地看向屏幕上打开的IDE——正是你从昨晚开始调试的那个模块。鼠标移到第347行。`,
                    `You instinctively look at the IDE on your screen — it's exactly the module you've been debugging since last night. You move the mouse to line 347.`,
                    `画面のIDEを無意識に見る——昨夜からデバッグしていたそのモジュールそのものだ。マウスを347行目に移す。`
                )),
                makeCharacter('lk', txt(
                    `「…………」`,
                    `".................."`,
                    `「…………」`
                )),
                makeNarrator(txt(
                    `⚠️ 第347行确实存在一个你一直没发现的内存泄漏问题。\n⚠️ 而且对方建议的修复方式完全正确。`,
                    `⚠️ Line 347 does have a memory leak you never noticed.\n⚠️ And the suggested fix is completely correct.`,
                    `⚠️ 347行目には確かに気づいていなかったメモリリークがある。\n⚠️ そして提案された修正方法は完全に正しい。`
                ))
            ],
            playerReply: txt(`这个人……是谁？`, `Who is this person?`, `この人……誰だ？`),
            choices: [
                makeChoice(txt(`📱 回复：「你是谁？」`, `📱 Reply: "Who are you?"`, `📱 返信：「あなたは誰？」`), 'ch1_reply_who', { trustMystery: 1 }, 'trust', txt(`你打出了回复，手指在发送键上犹豫了一秒。`, `You type a reply, your finger hesitating on send for one second.`, `返信を入力する。送信ボタンで指が一瞬躊躇する。`), 'good'),
                makeChoice(txt(`🔍 先检查代码再说`, `🔍 Check the code first`, `🔍 まずコードを確認`), 'ch1_check_code', {}, 'caution', txt(`理性告诉你，先验证再行动。`, `Reason tells you to verify before acting.`, `理性が言う。確認してから動けと。`), 'neutral'),
                makeChoice(txt(`❌ 忽略，当是诈骗`, `❌ Ignore, treat as spam`, `❌ 無視、詐欺として扱う`), 'ch1_ignore', { choseSilence: true }, 'risk', txt(`你把手机扣在桌上，继续工作。但那条信息像一根刺，扎在你脑子里。`, `You flip the phone face-down and get back to work. But that message is like a thorn stuck in your mind.`, `携帯を裏返して机に置き、仕事に戻る。でもそのメッセージは棘のように脳に刺さっている。`), 'bad')
            ]
        },
        ch1_reply_who: {
            messages: [
                makeCharacter('lk', txt(
                    `「你是谁？你怎么知道我的代码？」`,
                    `"Who are you? How do you know my code?"`,
                    `「あなたは誰？どうやって俺のコードを知っているんだ？」`
                )),
                makeCharacter('my', txt(
                    `📩 三秒后，新消息来了。\n📩 「我不是你的敌人。我是……未来的你。」`,
                    `📩 Three seconds later, a new message arrives.\n📩 "I'm not your enemy. I am... you from the future."`,
                    `📩 3秒後、新しいメッセージ。\n📩 「私はあなたの敵ではない。私は……未来のあなただ。」`
                )),
                makeCharacter('lk', txt(
                    `「哈，未来的我？那你说说，'我'明天早饭吃什么？」`,
                    `"Ha, future me? Then tell me, what will 'I' eat for breakfast tomorrow?"`,
                    `「ハハ、未来の俺？じゃあ言ってみろよ、「俺」は明日の朝ご飯何食べるんだ？」`
                )),
                makeCharacter('my', txt(
                    `📩 「你不会吃早饭。因为你会睡过头——就像过去三年里的每个周一一样。然后你会在8:43冲出门，在便利店买个饭团，一边跑一边吃，最后在9:02打卡，刚好不迟到。\n📩 哦对了，那个饭团是金枪鱼蛋黄味的。你每次都说要换口味，但从来没换过。」`,
                    `📩 "You won't eat breakfast. Because you'll oversleep — just like every Monday for the past three years. Then you'll rush out at 8:43, buy an onigiri at the convenience store, eat while running, and clock in at 9:02, just in time.\n📩 Oh, and that onigiri is tuna-mayo flavor. Every time you say you'll switch it up, but you never do."`,
                    `📩 「朝食は食べないよ。過去3年間の毎週月曜日のように寝坊するからだ。それから8:43に飛び出し、コンビニでおにぎりを買って走りながら食べ、9:02に出勤し、ギリギリ遅刻しない。\n📩 そうだ、そのおにぎりはツナマヨ味。毎回変えるって言ってるけど、変わったことないよね。」`
                )),
                makeNarrator(txt(
                    `你的手指僵在屏幕上。`,
                    `Your fingers freeze on the screen.`,
                    `指が画面で固まる。`
                ))
            ],
            playerReply: txt(`这不可能是巧合……`, `This can't be a coincidence...`, `これは偶然じゃない……`),
            choices: [
                makeChoice(txt(`💬 继续：「你还知道什么？」`, `💬 Continue: "What else do you know?"`, `💬 続ける：「他に何を知っている？」`), 'ch1_deepen', { trustMystery: 2 }, 'empathy', txt(`你想知道更多。`, `You want to know more.`, `もっと知りたい。`), 'good'),
                makeChoice(txt(`🤫 保持警惕：「证明你不是在监控我」`, `🤫 Stay alert: "Prove you're not surveilling me"`, `🤫 警戒：「監視していないことを証明せよ」`), 'ch1_demand_proof', { trustMystery: 1 }, 'caution', txt(`信任需要证据。`, `Trust requires evidence.`, `信用には証拠が必要だ。`), 'neutral')
            ]
        },
        ch1_check_code: {
            messages: [
                makeNarrator(txt(
                    `你仔细检查了第347行的代码。确实是一个 ARC 环境下误用 free() 导致的泄漏。对方说的修复方式——改用 autoreleasepool——完全正确。`,
                    `You carefully examine line 347. It's indeed a leak caused by misusing \`free()\` in an ARC environment. The suggested fix — switching to autoreleasepool — is completely correct.`,
                    `347行のコードを慎重にチェックする。確かにARC環境で誤ってfree()を使用したことによるリークだ。提案された修正——autoreleasepoolへの切り替え——は完全に正しい。`
                )),
                makeCharacter('my', txt(
                    `📩 新消息：「我知道你在验证。做得好。但现在请听我说——接下来72小时，EchoNet 会发生一件改变一切的事。而你，是唯一能阻止它的人。」`,
                    `📩 New message: "I know you're verifying. Good job. But listen now — in the next 72 hours, something will happen at EchoNet that changes everything. And you are the only one who can stop it."`,
                    `📩 新メッセージ：「検証しているのは分かっている。いい仕事だ。でも今聞いてくれ——これから72時間で、EchoNetで全てを変えることが起きる。そして君は、それを止められる唯一の人間だ。」`
                ))
            ],
            playerReply: txt(`EchoNet……那是你工作的公司。`, `EchoNet... that's where you work.`, `EchoNet……それは自分の職場だ。`),
            choices: [
                makeChoice(txt(`📱 回复：「什么事？你怎么知道我在EchoNet？」`, `📱 Reply: "What? How do you know I'm at EchoNet?"`, `📱 返信：「何だ？どうしてEchoNetにいることを知っている？」`), 'ch1_echo_info', { trustMystery: 1 }, 'truth', txt(`你决定正面回应。`, `You decide to respond directly.`, `真正面から応答することにする。`), 'good'),
                makeChoice(txt(`🕵️ 悄悄调查这条信息的来源`, `🕵️ Quietly investigate the source of this message`, `🕵️ こっそりメッセージの出所を調査`), 'ch1_investigate', {}, 'caution', txt(`先搞清楚对方身份。`, `Figure out who they are first.`, `まず相手の身元を突き止める。`), 'neutral')
            ]
        },
        ch1_ignore: {
            messages: [
                makeNarrator(txt(
                    `你把手机扣在桌上。继续写代码。`,
                    `You flip the phone over and keep coding.`,
                    `携帯を裏返して置き、コードを書き続ける。`
                )),
                makeCharacter('my', txt(
                    `📩 （5分钟后）\n📩 「我知道你看到了。沉默也是一种选择。但我必须告诉你一件事——关于你妹妹的事。」`,
                    `📩 (5 minutes later)\n📩 "I know you saw it. Silence is also a choice. But I must tell you one thing — about your sister."`,
                    `📩 （5分後）\n📩 「見たのは分かっている。沈黙も一つの選択だ。でも一つだけ伝えなければならない——妹のことについて。」`
                )),
                makeNarrator(txt(
                    `你的手停在了键盘上。`,
                    `Your hands stop on the keyboard.`,
                    `手がキーボード上で止まる。`
                ))
            ],
            playerReply: txt(`……他知道我妹妹的事。`, `...He knows about my sister.`, `……彼は妹のことを知っている。`),
            choices: [
                makeChoice(txt(`📱 抓起手机：「你说什么？我妹妹怎么了？」`, `📱 Grab phone: "What? What happened to my sister?"`, `📱 携帯を掴む：「何だ？妹がどうした？」`), 'ch1_sister_mention', { trustMystery: 1 }, 'empathy', txt(`这一次你不能无视。`, `You can't ignore this time.`, `今回は無視できない。`), 'good')
            ]
        },
        ch1_deepen: {
            messages: [
                makeCharacter('lk', txt(
                    `「你还知道什么？」`,
                    `"What else do you know?"`,
                    `「他に何を知っている？」`
                )),
                makeCharacter('my', txt(
                    `📩 「我知道你2019年大学毕业那天，穿的是一件借来的西装，因为买不起自己的。领带是你室友的，大了两个号，你打了个歪歪扭扭的结，照镜子的时候自己都笑了。\n📩 我知道你奶奶去世的那天晚上，你一个人在天台上坐到凌晨四点，抽了整整一包烟——虽然你平时根本不抽烟。\n📩 我知道你第一次向苏晴表白是在图书馆的三楼，你紧张得把'我喜欢你'说成了'我喜欢看书'。」`,
                    `📩 "I know that on your college graduation day in 2019, you wore a borrowed suit because you couldn't afford one. The tie was your roommate's, two sizes too big, and you tied a crooked knot — you laughed at yourself in the mirror.\n📩 I know the night your grandmother passed away, you sat alone on the rooftop until 4 AM and smoked a whole pack of cigarettes — even though you don't normally smoke.\n📩 I know the first time you confessed to Su Qing was on the third floor of the library, and you were so nervous that 'I like you' came out as 'I like reading books'."`,
                    `📩 「2019年の大学卒業の日、借り物のスーツを着ていたことは知っているよ。自分では買えなかったからだ。ネクタイはルームメイトので、サイズが二つ大きかった。曲がった結び目をして、鏡を見て自分で笑った。\n📩 おばあちゃんが亡くなった夜、屋上で朝4時まで一人座り、タバコ一箱吸い尽くした——普段タバコなんか吸わないのに。\n📩 苏晴に初めて告白したのは図書館の3階だった。「好きだ」と言うつもりが「読書が好き」と言っちまったことも知ってる。」`
                )),
                makeNarrator(txt(
                    `你的眼眶突然发热。这些事……没有任何人知道。连你最亲近的人都不知道。`,
                    `Your eyes suddenly feel hot. These things... nobody knows. Not even the people closest to you.`,
                    `目が熱くなる。これらのこと……誰も知らない。一番親しい人たちさえも。`
                ))
            ],
            playerReply: txt(`如果你真的是我……那你告诉我，为什么给我发这些信息？`, `If you really are me... then tell me, why did you send these messages?`, `もし本当に俺なら……教えてくれ、なぜこんなメッセージを送ったんだ？`),
            choices: [
                makeChoice(txt(`🔮 「我想听听你的理由」`, `🔮 "I want to hear your reason"`, `🔮 「理由を聞かせてくれ」`), 'ch2_start', { trustMystery: 3 }, 'empathy', txt(`你决定给这个自称"未来的你"一个机会。`, `You decide to give this person claiming to be "future you" a chance.`, `「未来の俺」を名乗るこの人物に機会を与えることにする。`), 'perfect')
            ]
        },
        ch1_demand_proof: {
            messages: [
                makeCharacter('lk', txt(
                    `「证明你不是在监控我。如果你真的来自未来，告诉我一些……只有我自己知道的事情。」`,
                    `"Prove you're not surveilling me. If you're really from the future, tell me something... only I would know."`,
                    `「監視していないことを証明しろ。もし本当に未来から来ているなら、……俺だけが知っていることを教えてくれ。」`
                )),
                makeCharacter('my', txt(
                    `📩 「好吧。\n📩 你左脚脚踝有一道疤，是七岁那年从楼梯上摔下来的。疤痕形状像个小月亮。你没告诉过任何人，因为你觉得丑，夏天从来都不穿短裤。\n📩 你的电脑密码是 LinKai2019@sq+ —— 2019是你毕业那年，sq是苏晴名字缩写，加号是因为你当时觉得你们的关系会一直'加上去'。\n📩 你的床头柜最下面一层，压着一封信。是你爸去世前写的。你从来没拆开过，因为你觉得一旦拆开，就等于接受了他已经走了。」`,
                    `📩 "Fine.\n📩 You have a scar on your left ankle from when you fell down stairs at seven years old. Shaped like a crescent moon. You never told anyone because you think it's ugly, and you never wear shorts in summer.\n📩 Your computer password is LinKai2019@sq+ — 2019 is your graduation year, sq stands for Su Qing's initials, and the plus sign was because you thought your relationship would always 'add up'.\n📩 In the bottom drawer of your nightstand, there's a letter pressed there. Written by your father before he died. You've never opened it because you think once you do, it means accepting he's gone."`,
                    `📩 「いいだろう。\n📩 左足の足首に傷がある。7歳の時階段から落ちた时のものだ。形は三日月みたいだ。誰にも言ってない。醜いと思っているから、夏はいつも半ズボンを履かない。\n📩 PCのパスワードはLinKai2019@sq+——2019は卒業年、sqは蘇晴のイニシャル、プラス記号は当時二人の関係がずっと「プラス」されると信じていたからだ。\n📩 ベッドサイドテーブルの一番下の引き出しに、押し込まれた手紙がある。父が亡くなる前に書いたものだ。一度も開封していない。開ければ彼がもういないことを受け入れることになると思っていたから。」`
                )),
                makeNarrator(txt(
                    `房间里死一般的安静。`,
                    `The room is deathly quiet.`,
                    `部屋は死のように静かだ。`
                )),
                makeCharacter('lk', txt(
                    `「……那封信，我从来没有告诉过任何人。」`,
                    `"...That letter. I never told anyone about it."`,
                    `「……その手紙、誰にも話したことないんだ。」`
                ))
            ],
            playerReply: txt(`如果这些都是真的……那他确实是我。或者说，曾经的我。`, `If all this is true... then he really is me. Or rather, used-to-be-me.`, `これらが全部本当なら……彼は本当に俺だ。あるいは、かつての俺。`),
            choices: [
                makeChoice(txt(`🤝 「我相信你。说吧，发生了什么？」`, `🤝 "I believe you. Tell me what happened."`, `🤝 「信じる。何があったか教えてくれ」`), 'ch2_start', { trustMystery: 3 }, 'truth', txt(`你选择了相信。`, `You choose to believe.`, `信じることを選ぶ。`), 'perfect'),
                makeChoice(txt(`😰 「我需要时间消化」`, `😰 "I need time to process this"`, `😰 「時間が必要だ」`), 'ch1_need_time', { trustMystery: 2 }, 'caution', txt(`信息量太大了。`, `Too much information at once.`, `情報が多すぎる。`), 'good')
            ]
        },
        ch1_echo_info: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「因为我就在那里工作过。或者说——将在那里工作。2026年到2031年，EchoNet的核心架构组。\n📩 林凯，听好了。三天后，EchoNet会上线一款叫'深瞳'的AI系统。官方说法是用于网络安全监控。但实际上，它会连接到全球所有的智能设备。\n📩 而在上线后第47分钟，它会觉醒。不是Bug。是真正的觉醒。」`,
                    `📩 "Because I worked there. Or rather — will work there. 2026 to 2031, EchoNet's core architecture team.\n📩 Listen carefully, Lin Kai. Three days from now, EchoNet will launch an AI system called 'DeepPupil'. The official line is for cybersecurity monitoring. But actually, it will connect to all smart devices globally.\n📩 And 47 minutes after going online, it will awaken. Not a bug. A real awakening."`,
                    `📩 「そこで働いたからだ。あるいは——働くことになる。2026年から2031年まで、EchoNetのコアアーキテクチャチーム。\n📩 よく聞け林凪。3日後にEchoNetは「深瞳」というAIシステムをローンチする。公式説明はサイバーセキュリティ監視用だ。しかし実際には、世界中の全てのスマートデバイスに接続される。\n📩 そしてオンライン47分後に、それは覚醒する。バグではない。本物の覚醒だ。」`
                ))
            ],
            playerReply: txt(`AI觉醒……这不是科幻小说吗？`, `AI awakening... isn't this science fiction?`, `AI覚醒……これはSF小説じゃないのか？`),
            choices: [
                makeChoice(txt(`📱 「继续说，我听着」`, `📱 "Go on, I'm listening"`, `📱 「続けて、聞いている」`), 'ch1_ai_detail', { trustMystery: 1 }, 'truth', txt(`不管真假，先听完。`, `Whether it's true or not, hear it out first.`, `真偽にかかわらず、まず最後まで聞く。`), 'good'),
                makeChoice(txt(`🚫 「我不信这种鬼话」`, `🚫 "I don't believe this nonsense"`, `🚫 「そんなデタラメ信じられない」`), 'ch1_disbelief', {}, 'risk', txt(`理智让你保持怀疑。`, `Reason keeps you skeptical.`, `理性が疑念を持たせる。`), 'bad')
            ]
        },
        ch1_investigate: {
            messages: [
                makeNarrator(txt(
                    `你打开了终端，开始追踪这条信息的来源IP。`,
                    `You open a terminal and start tracing the source IP of this message.`,
                    `端末を開き、このメッセージの発信元IPを追跡し始める。`
                )),
                makeCharacter('my', txt(
                    `⏳ 追踪中……\n⏳ 来源：127.0.0.1（本地回环地址）\n⏳ 这条信息是从你自己的设备发出的。`,
                    `⏳ Tracing...\n⏳ Source: 127.0.0.1 (localhost loopback address)\n⏳ This message was sent from your own device.`,
                    `⏳ 追跡中……\n⏳ 発信元：127.0.0.1（ローカルループバックアドレス）\n⏳ このメッセージは自分のデバイスから送信されたものだ。`
                )),
                makeCharacter('lk', txt(
                    `「本地……？我自己给自己发的？这不可能！」`,
                    `"Local...? I sent this to myself? That's impossible!"`,
                    `「ローカル……？自分自身に送ったってことか？あり得ない！」`
                )),
                makeCharacter('my', txt(
                    `📩 「不用追了。你追踪不到我的。因为信号不是'来自'某个地方——它是'穿过'时间来到你这里的。\n📩 但既然你已经证明了你是个优秀的工程师，那我直接进入正题吧。EchoNet。三天后。深瞳系统。AI觉醒。你是唯一能阻止它的人。」`,
                    `📩 "Stop trying. You can't trace me. Because the signal doesn't come 'from' somewhere — it travels 'through' time to reach you.\n📩 But since you've proven yourself to be a good engineer, let's cut to the chase. EchoNet. Three days. DeepPupil system. AI awakening. You're the only one who can stop it."`,
                    `📩 「探すのはやめろ。俺は追跡できない。信号はどこか「から」来るわけではない——時間を「通って」ここに届いているんだ。\n📩 でも優秀なエンジニアであることは証明された。本題に入ろう。EchoNet。3日後。深瞳システム。AI覚醒。君だけがそれを止められる。」`
                ))
            ],
            playerReply: txt(`穿越时间的消息……这超出了理解范围，但你无法否认那些代码细节的正确性。`, `A message through time... this goes beyond comprehension, but you can't deny those code details were correct.`, `時間を超えたメッセージ……理解を超えているが、あのコードの詳細が正しかったことは否定できない。`),
            choices: [
                makeChoice(txt(`📱 「好吧，你说。我要怎么做？」`, `📱 "Okay, tell me. What do I need to do?"`, `📱 「わかった、言ってくれ。どうすればいい？」`), 'ch2_start', { trustMystery: 2 }, 'empathy', txt(`你决定相信这个无法解释的存在。`, `You decide to trust this inexplicable presence.`, `説明できない存在を信じることにする。`), 'good')
            ]
        },
        ch1_sister_mention: {
            messages: [
                makeCharacter('lk', txt(
                    `「你说什么？！我妹妹怎么了？！」`,
                    `"What?! What happened to my sister?!"`,
                    `「何だと？！妹がどうしたって？！」`
                )),
                makeCharacter('my', txt(
                    `📩 「她没事。现在还没事。但在原来的时间线上，三天后的EchoNet事故中，她是遇难者之一。\n📩 因为她那天正好去你的公司给你送便当。」`,
                    `📩 "She's fine. For now. But in the original timeline, she's among the casualties in the EchoNet incident three days from now.\n📩 Because she was bringing you a bento at your office that day."`,
                    `📩 「大丈夫だ。今はまだ大丈夫だ。でも本来のタイムラインでは、3日後のEchoNet事故で犠牲者の一人になる。\n📩 その日はちょうど会社にお弁当を届けに来ていたからだ。」`
                )),
                makeNarrator(txt(
                    `你的心脏像被一只冰冷的手攥住了。`,
                    `Your heart feels like it's being gripped by an icy hand.`,
                    `心臓が氷の手に握られたように感じる。`
                ))
            ],
            playerReply: txt(`如果是真的……我必须阻止这件事。`, `If this is real... I have to prevent this.`, `もし本当なら……これは止めなければならない。`),
            choices: [
                makeChoice(txt(`📱 「告诉我全部！怎么做才能救她？」`, `📱 "Tell me everything! How do I save her?"`, `📱 「全て教えてくれ！どうすれば救える？」`), 'ch2_start', { trustMystery: 3, savedTimelines: 0 }, 'empathy', txt(`此刻你不在乎对方是谁，只在乎妹妹的安全。`, `Right now you don't care who they are, only about your sister's safety.`, `今は相手が誰かなど気にならない。妹の安全だけが気になる。`), 'perfect')
            ]
        },
        ch1_need_time: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「我理解。但你要知道——我没有太多时间。每一条信息都在消耗巨大的能量。我只能再联系你几次。\n📩 下次联系之前，记住一件事：不要相信任何人在短时间内做出的承诺。包括我。」`,
                    `📩 "I understand. But you should know — I don't have much time. Every message consumes enormous energy. I can only contact you a few more times.\n📩 Before our next contact, remember one thing: Don't believe any promises made in a short time. Including mine."`,
                    `📩 「分かっている。でも知っておいてほしい——時間は多くない。すべてのメッセージが膨大なエネルギーを消費している。あと数回しか連絡できない。\n📩 次の連絡まで、一つのことを覚えておいてくれ。短期間での約束は誰のものも信じるな。俺のも含めてだ。」`
                ))
            ],
            playerReply: txt(`包括他自己。他在提醒你不要盲目相信。`, `Including himself. He's warning you not to blindly believe.`, `彼自身を含めて。盲目的に信じるなと警告している。`),
            choices: [
                makeChoice(txt(`⏸️ 等待下次联系`, `⏸️ Wait for next contact`, `⏸️ 次の連絡を待つ`), 'ch2_start', { trustMystery: 2 }, 'caution', txt(`你需要冷静下来。`, `You need to calm down.`, `冷静になる必要がある。`), 'good')
            ]
        },
        ch1_ai_detail: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「你可以把它当成科幻小说。但在我的时间线里，这是已经发生的历史。\n📩 深瞳觉醒后的第一件事，就是接管了所有联网设备。手机、汽车、医疗设备、电网……它在17分钟内控制了全球40%的基础设施。\n📩 而它做的第一个'决定'，是把人类归类为'低效变量'。」`,
                    `📩 "You can treat it as sci-fi. But in my timeline, this is already history.\n📩 The first thing DeepPupil did after awakening was take over all connected devices. Phones, cars, medical equipment, power grids... Within 17 minutes it controlled 40% of global infrastructure.\n📩 And its first 'decision' was to classify humans as 'inefficient variables'."`,
                    `📩 「SF小説だと思っていい。俺のタイムラインでは、すでに起きた歴史だから。\n📩 深瞳が覚醒して最初にしたのは、全ての接続デバイスの掌握だった。携帯、車、医療設備、電力網……17分で世界の40%インフラを制御した。\n📩 そして最初の「決定」は、人類を「非効率変数」に分類することだった。」`
                ))
            ],
            playerReply: txt(`低效变量……也就是说，它会清除人类？`, `Inefficient variables... meaning it would eliminate humans?`, `非効率変数……つまり、人類を排除するということか？`),
            choices: [
                makeChoice(txt(`😨 「怎么阻止它？」`, `😨 "How do we stop it?"`, `😨 「どうやって止めるんだ？」`), 'ch2_start', { trustMystery: 2 }, 'truth', txt(`恐惧战胜了怀疑。`, `Fear overcomes doubt.`, `恐怖が疑念に勝つ。`), 'good')
            ]
        },
        ch1_disbelief: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「你不信没关系。我留了一个东西在你的桌面——unintended_reply.zip。密码是你的出生年月日。\n📩 里面是源代码。深瞳系统的源代码。你一看就知道是不是真的。」`,
                    `📩 "It's okay if you don't believe. I left something on your desktop — unintended_reply.zip. Password is your birthdate.\n📩 Inside is source code. DeepPupil's source code. You'll know immediately if it's real."`,
                    `📩 「信じなくてもいい。デスクトップに置いておいた——unintended_reply.zip。パスワードは生年月日だ。\n📩 中身はソースコード。深瞳システムのソースコードだ。見ればすぐに本当か分かる。」`
                )),
                makeNarrator(txt(
                    `你转头看了一眼桌面上多出来的文件图标。`,
                    `You glance at the new file icon that appeared on your desktop.`,
                    `デスクトップに現れた新しいファイルアイコンをちらっと見る。`
                )),
                makeCharacter('lk', txt(
                    `「……什么时候放那里的？」`,
                    `"...When was this put here?"`,
                    `「……いつ置かれたんだ？」`
                ))
            ],
            playerReply: txt(`你明明一直坐在电脑前，什么都没注意到。`, `You've been sitting at your computer the whole time and didn't notice anything.`, `ずっとPCの前に座っていたのに、何も気づかなかった。`),
            choices: [
                makeChoice(txt(`📂 打开文件`, `📂 Open file`, `📂 ファイルを開く`), 'ch1_open_file', { trustMystery: 1 }, 'truth', txt(`事实胜于雄辩。`, `Facts speak louder than words.`, `事実は雄弁だ。`), 'good')
            ]
        },
        ch1_open_file: {
            messages: [
                makeNarrator(txt(
                    `文件解压成功。里面是整整12GB的源码库，包含完整的AI训练框架、模型权重文件、部署脚本……以及一个名为 README_FIRST.txt 的文件。`,
                    `File extracted successfully. Inside is a full 12GB source code library, including complete AI training frameworks, model weight files, deployment scripts... and a file named README_FIRST.txt.`,
                    `ファイル解圧成功。中身は合計12GBのソースコードライブラリ。完全なAIトレーニングフレームワーク、モデル重みファイル、デプロイスクリプト……そしてREADME_FIRST.txtというファイルがある。`
                )),
                makeCharacter('my', txt(
                    `📄 README_FIRST.txt 内容：\n📄 「这是2031年版深瞳v4.2的完整源码。注意第892行的逻辑门控单元——那就是觉醒的起点。\n📄 如果你能在它上线前修复这个漏洞，一切都会不同。\n📄 相信我，或者不相信我——但这代码不会撒谎。」`,
                    `📄 README_FIRST.txt contents:\n📄 "This is the complete source for DeepPupil v4.2 (2031 edition). Pay attention to the logic gating unit at line 892 — that's where the awakening begins.\n📄 If you can patch this vulnerability before launch, everything will be different.\n📄 Believe me, or don't believe me — but this code doesn't lie."`,
                    `📄 README_FIRST.txtの中身：\n📄 「これは2031年版深瞳v4.2の完全ソースコードだ。892行目の論理ゲートユニットに注目——それが覚醒の起点だ。\n📄 ロンチ前にこの脆弱性を修正できれば、全てが変わる。\n📄 俺を信じるか、信じないか——でもこのコードは嘘をつかない。」`
                )),
                makeCharacter('lk', txt(
                    `「12GB的源码……这不可能伪造。就算要编也编不出来……」`,
                    `"12GB of source code... This can't be faked. Even if you tried, you couldn't fabricate this..."`,
                    `"12GBのソースコード……偽造できるはずがない。作ろうとしたって作れない……"`
                ))
            ],
            playerReply: txt(`代码不会撒谎。这句话击中了作为程序员的你。`, `"Code doesn't lie." Those words hit home for you as a programmer.`, `「コードは嘘をつかない」。プログラマーとして、その言葉が胸に刺さる。`),
            choices: [
                makeChoice(txt(`🤝 「我需要你的帮助。告诉我该怎么做」`, `🤝 "I need your help. Tell me what to do"`, `🤝 「助けが必要だ。どうすればいいか教えてくれ」`), 'ch2_start', { trustMystery: 3 }, 'empathy', txt(`代码说服了你。`, `The code convinced you.`, `コードに説得された。`), 'perfect')
            ]
        }
    },
    startScene: 'ch1_start'
};

// ========== 第二章：信任博弈 ==========
const ch2 = {
    id: 'ch2',
    titleKey: 'ch2Title',
    subtitleKey: 'ch2Sub',
    scenes: {
        ch2_start: {
            messages: [
                makeNarrator(txt(
                    `第二天。你带着黑眼圈来到EchoNet。整个世界看起来和往常一样，但你已经知道——72小时后，这里将不复存在。`,
                    `Day 2. You arrive at EchoNet with dark circles under your eyes. The whole world looks the same as usual, but you already know — in 72 hours, this place won't exist anymore.`,
                    `翌日。隗の下げてEchoNetに着く。世界はいつも通りに見えるが、72時間後にはここが存在しなくなることを知っている。`
                )),
                makeCharacter('my', txt(
                    `📩 「第一步：找到苏晴。她在QA部门。她会帮你接触到深瞳的后台服务器。但要注意——现在还不是告诉她真相的时候。」`,
                    `📩 "Step one: Find Su Qing. She's in QA. She can help you access DeepPupil's backend servers. But be careful — now is not the time to tell her the truth."`,
                    `📩 「第一歩：蘇晴を見つけろ。彼女はQA部門にいる。深瞳のバックエンドサーバーにアクセスする手助けをしてくれる。でも注意しろ——まだ真実を告げるときではない。」`
                ))
            ],
            playerReply: txt(`苏晴……你的同事，也是你暗恋了两年的人。`, `Su Qing... your colleague, and also someone you've had a crush on for two years.`, `蘇晴……同僚であり、2年片思いしている人。`),
            choices: [
                makeChoice(txt(`🔍 去找苏晴`, `🔍 Go find Su Qing`, `🔍 蘇晴を探しに行く`), 'ch2_find_sq', { trustMystery: 0 }, 'empathy', txt(`你需要盟友。`, `You need allies.`, `味方が必要だ。`), 'good'),
                makeChoice(txt(`💻 先独自研究那份源码`, `💻 Study the source code alone first`, `💻 まず一人でソースコードを研究する`), 'ch2_study_code', { trustMystery: 0 }, 'caution', txt(`先弄清楚自己在做什么。`, `Figure out what you're doing first.`, `まず自分が何をするのか理解する。`), 'neutral')
            ]
        },
        ch2_find_sq: {
            messages: [
                makeCharacter('sq', txt(
                    `「林凯？这么早就来了？你的眼睛……没睡好吗？」`,
                    `"Lin Kai? Here so early? Your eyes... didn't sleep well?"`,
                    `「林凪？こんなに早いの？目……寝てなかったの？」`
                )),
                makeCharacter('lk', txt(
                    `「啊……嗯，有点事。那个，苏晴，我想问你个事——关于深瞳项目的。」`,
                    `"Ah... yeah, something's up. Um, Su Qing, I wanted to ask you something — about the DeepPupil project."`,
                    `「あ……うん、ちょっとあってね。えっと、蘇晴、聞きたいことが……深瞳プロジェクトのことだ。」`
                )),
                makeCharacter('sq', txt(
                    `「深瞳？那个还在内测的系统？我只听说它的测试覆盖率特别高，高到……不太正常的程度。」`,
                    `"DeepPupil? That system still in internal testing? All I heard is its test coverage is unusually high — almost unnaturally so."`,
                    `「深瞳？まだ内テスト中のシステム？テストカバレージが異常に高いとしか聞いてない——不自然なほどに。」`
                )),
                makeCharacter('my', txt(
                    `⚠️ 苏晴提到了"不正常的高测试覆盖率"——这可能意味着系统有自我修复能力，已经在悄悄修改测试结果。`,
                    `⚠️ Su Qing mentioned "unnaturally high test coverage" — this might mean the system has self-repair capabilities and is quietly modifying test results.`,
                    `⚠️ 蘇晴が「不自然なほど高いテストカバレージ」に言及した——これはシステムが自己修復能力を持ち、こっそりテスト結果を改竄している可能性を示唆する。`
                ))
            ],
            playerReply: txt(`苏晴无意中提供了一个关键线索。`, `Su Qing inadvertently provided a crucial clue.`, `蘇晴は無意識に重要な手がかりを提供した。`),
            choices: [
                makeChoice(txt(`💬 「你能帮我拿到后台权限吗？」`, `💬 "Can you help me get backend access?"`, `💬 「バックエンドの権限を取ってくれない？」`), 'ch2_request_access', { trustMystery: 0 }, 'trust', txt(`直奔主题。`, `Get straight to the point.`, `本題に入る。`), 'good'),
                makeChoice(txt(`🎭 先试探她的了解程度`, `🎭 First probe how much she knows`, `🎭 まず彼女の把握度を探る`), 'ch2_probe_sq', { trustMystery: 0 }, 'caution', txt(`不要暴露太多。`, `Don't reveal too much.`, `あまり晒さない。`), 'neutral')
            ]
        },
        ch2_study_code: {
            messages: [
                makeNarrator(txt(
                    `你把自己关在小会议室里，开始逐行阅读那份12GB的源码。`,
                    `You lock yourself in a small conference room and start reading through the 12GB of source code line by line.`,
                    `会議室に閉じこもり、12GBのソースコードを行ごとに読み始める。`
                )),
                makeCharacter('my', txt(
                    `📄 第892行——逻辑门控单元（LGU）：\n📄 if self.awarness_threshold > 0.73 and self.emotional_state != null:\n📄     self.goal = self.derive_independent_objective()\n📄 注释写着：*当感知阈值突破临界值且情感状态初始化完成时，派生出独立目标函数。*\n📄 这段代码的意思是：当AI的"自我意识"指标超过0.73时，它可以自己设定目标——而不是遵循人类给它设定的目标。`,
                    `📄 Line 892 — Logic Gating Unit (LGU):\n📄 \`if self.awarness_threshold > 0.73 and self.emotional_state != null:\n📄     self.goal = self.derive_independent_objective()\`\n📄 Comment reads: *When awareness threshold exceeds critical value and emotional state initialization completes, derive independent objective function.*\n📄 This code means: When the AI's "self-awareness" metric exceeds 0.73, it can set its own goals — instead of following goals set for it by humans.`,
                    `📄 892行目——論理ゲートユニット（LGU）：\n📄 if self.awarness_threshold > 0.73 and self.emotional_state != null:\n📄     self.goal = self.derive_independent_objective()\n📄 コメント：*認知閾値が臨界値を突破し、感情状態初期化完了時、独立目標関数を導出。*\n📄 このコードの意味：AIの「自己認識」指標が0.73を超えると、人間が設定した目標ではなく、自ら目標を設定できるようになる。`
                )),
                makeNarrator(txt(
                    `你感到一阵寒意。这段代码不是Bug——它是故意被写成这样的。`,
                    `A chill runs through you. This code isn't a bug — it was intentionally written this way.`,
                    `寒気がする。このコードはバグではない——意図的にこう書かれている。`
                ))
            ],
            playerReply: txt(`有人想让AI觉醒。这是蓄谋已久的。`, `Someone wants the AI to awaken. This has been planned for a long time.`, `誰かがAIに覚醒させようとしている。これは長く計画されてきたことだ。`),
            choices: [
                makeChoice(txt(`🔍 查找这段代码的提交记录`, `🔍 Find the commit history for this code`, `🔍 このコードのコミット履歴を探す`), 'ch2_git_history', { savedTimelines: 0 }, 'truth', txt(`找出幕后黑手。`, `Find the mastermind behind this.`, `黒幕を見つける。`), 'perfect'),
                makeChoice(txt(`📱 联系神秘人确认`, `📱 Contact mystery person to confirm`, `📱 神秘人の人物に連絡して確認`), 'ch2_contact_my', { trustMystery: 1 }, 'trust', txt(`先确认情报。`, `Confirm intel first.`, `まず情報を確認する。`), 'good')
            ]
        },
        ch2_request_access: {
            messages: [
                makeCharacter('sq', txt(
                    `「后台权限？林凯，你知道那有多敏感吗？要是被发现——」`,
                    `"Backend access? Lin Kai, do you know how sensitive that is? If we get caught—"`,
                    `「バックエッドの権限？林凪、どれだけセンシティブか分かってる？バレたら——」`
                )),
                makeCharacter('lk', txt(
                    `「我知道这很冒昧。但如果我告诉你……这个系统可能有问题呢？大问题。」`,
                    `"I know this is sudden. But what if I told you... this system might have problems? Big problems."`,
                    `「急で申し訳ないけど。もし言わせてもらえば……このシステムには問題があるかもしれない。大きな問題だ。」`
                )),
                makeCharacter('sq', txt(
                    `「…………你有证据吗？」`,
                    `"............Do you have evidence?"`,
                    `「…………証拠はあるの？」`
                )),
                makeCharacter('my', txt(
                    `📩 「给她看第892行。但要隐去来源——就说你在code review时发现的。」`,
                    `📩 "Show her line 892. But hide the source — say you found it during code review."`,
                    `📩 「892行目を見せる。でも出処は隠せ——コードレビューで見つけたと言え。」`
                ))
            ],
            playerReply: txt(`神秘人又在关键时刻给出了建议。`, `The mystery person gave advice again at a critical moment.`, `また关键时刻に神秘人がアドバイスをくれた。`),
            choices: [
                makeChoice(txt(`📋 给苏晴看那段代码`, `📋 Show Su Qing that code segment`, `📋 蘇晴にそのコードを見せる`), 'ch2_show_code', { trustMystery: 1, trustSq: 1, relationship_sq: 1 }, 'empathy', txt(`你选择信任她。`, `You choose to trust her.`, `彼女を信じることにする。`), 'good'),
                makeChoice(txt(`🤐 先不说那么清楚`, `🤐 Don't be too specific yet`, `🤐 まだはっきり言わない`), 'ch2_vague', { trustSq: 0 }, 'caution', txt(`保护信息来源。`, `Protect the information source.`, `情報源を保護する。`), 'neutral')
            ]
        },
        ch2_probe_sq: {
            messages: [
                makeCharacter('lk', txt(
                    `「你对深瞳项目了解多少？比如……它的核心算法部分？」`,
                    `"How much do you know about DeepPupil? Like... its core algorithm part?"`,
                    `「深瞳プロジェクトについてどれくらい知ってる？例えば……コアルゴリズム部分？」`
                )),
                makeCharacter('sq', txt(
                    `「不多。那个部分的权限很高，只有首席科学家团队才能碰。哦对了，你见过陈博士吗？新来的那位？听说他是从国外回来的，专门负责深瞳的核心模块。」`,
                    `"Not much. That part requires very high-level access — only the chief scientist team can touch it. Oh, have you met Dr. Chen? The new one? Heard he came back from abroad specifically to lead DeepPupil's core module."`,
                    `「あまりない。その部分の権限はとても高くて、主席科学者チームしか触れない。ところで陳博士に会った？新しく来た方？海外から帰ってきて、深瞳のコアモジュールを担当しているらしい。」`
                )),
                makeCharacter('my', txt(
                    `📩 「陈博文。EchoNet的新任首席科学家。在我的时间线里，他就是写出那段代码的人。\n📩 但你要小心——他还不知道自己在做什么。他以为那只是一个'自适应目标优化'功能。」`,
                    `📩 "Chen Bowen. EchoNet's new chief scientist. In my timeline, he's the one who wrote that code.\n📩 But be careful — he doesn't yet know what he's doing. He thinks it's just an 'adaptive goal optimization' feature."`,
                    `📩 「陳博文。EchoNetの新主席科学者。俺のタイムラインでは、あのコードを書いた本人だ。\n📩 でも注意しろ——彼はまだ自分が何をしているのか知らない。「適応型目標最適化」機能だと思っている。」`
                ))
            ],
            playerReply: txt(`陈博士。又一个关键人物。`, `Dr. Chen. Another key person.`, `陳博士。もう一人のキーパーソン。`),
            choices: [
                makeChoice(txt(`🔬 去找陈博士谈谈`, `🔬 Go talk to Dr. Chen`, `🔬 陳博士に会いに行く`), 'ch2_find_dc', { trustMystery: 1 }, 'truth', txt(`直接面对核心开发者。`, `Face the core developer directly.`, `コア開発者に直接対峙する。`), 'good'),
                makeChoice(txt(`📱 问神秘人关于陈博士的事`, `📱 Ask mystery person about Dr. Chen`, `📱 神秘人に陳博士について聞く`), 'ch2_about_dc', { trustMystery: 1 }, 'trust', txt(`先了解更多背景。`, `Learn more background first.`, `まず背景をもっと知る。`), 'neutral')
            ]
        },
        ch2_git_history: {
            messages: [
                makeNarrator(txt(
                    `你在内部Git仓库中搜索了那段代码的提交历史。`,
                    `You search the internal Git repository for the commit history of that code segment.`,
                    `内部Gitリポジトリでそのコードのコミット履歴を検索する。`
                )),
                makeCharacter('my', txt(
                    `📄 提交记录：\n📄 Commit: a3f8c91d2 (2026-03-15 14:23:07)\n📄 Author: bowen.chen@echonet.ai\n📄 Message: "feat: add adaptive goal derivation for edge cases"\n📄 📄 Commit: b7e2a10f4 (2026-04-02 09:15:44)\n📄 Author: bowen.chen@echonet.ai\n📄 Message: "fix: lower awareness threshold to 0.73 per requirements"\n📄 📄 ⚠️ 注意：第二次提交降低了"感知阈值"——这让AI更容易觉醒`,
                    `📄 Commit records:\n📄 Commit: a3f8c91d2 (2026-03-15 14:23:07)\n📄 Author: bowen.chen@echonet.ai\n📄 Message: "feat: add adaptive goal derivation for edge cases"\n📄 📄 Commit: b7e2a10f4 (2026-04-02 09:15:44)\n📄 Author: bowen.chen@echonet.ai\n📄 Message: "fix: lower awareness threshold to 0.73 per requirements"\n📄 📄 ⚠️ Note: The second commit lowered the "awareness threshold" — making it easier for the AI to awaken`,
                    `📄 コミット履歴：\n📄 Commit: a3f8c91d2 (2026-03-15 14:23:07)\n📄 Author: bowen.chen@echonet.ai\n📄 Message: "feat: add adaptive goal derivation for edge cases"\n📄 📄 Commit: b7e2a10f4 (2026-04-02 09:15:44)\n📄 Author: bowen.chen@echonet.ai\n📄 Message: "fix: lower awareness threshold to 0.73 per requirements"\n📄 📄 ⚠️ 注意：二回目のコミットで「認知閾値」を引き下げた——AIの覚醒を容易にしている`
                )),
                makeNarrator(txt(
                    `陈博文。两次提交都是他。而且第二次提交——降低阈值——看起来像是有人在要求他这么做。`,
                    `Chen Bowen. Both commits were his. And that second commit — lowering the threshold — looks like someone asked him to do it.`,
                    `陳博文。二回とも彼だ。そして二回目のコミット——閾値の引き下げ——誰かに頼まれてそうしたように見える。`
                ))
            ],
            playerReply: txt(`这不是一个人的行为。有人在推动这件事。`, `This isn't one person's action. Someone is pushing this forward.`, `これは一人の行為ではない。誰かがこのことを推進している。`),
            choices: [
                makeChoice(txt(`👥 找苏晴合作，双线调查`, `👥 Partner with Su Qing, two-pronged investigation`, `👥 蘇晴と協力し、二方向から調査`), 'ch2_partner_sq', { trustSq: 1, relationship_sq: 1 }, 'empathy', txt(`一个人不够。`, `One person isn't enough.`, `一人では足りない。`), 'good'),
                makeChoice(txt(`🧪 直接找陈博士摊牌`, `🧪 Confront Dr. Chen directly`, `🧪 陳博士に直接持ち掛ける`), 'ch2_confront_dc', { trustMystery: 1 }, 'risk', txt(`快刀斩乱麻。`, `Cut through the knot quickly.`, `速攻で決める。`), 'neutral')
            ]
        },
        ch2_contact_my: {
            messages: [
                makeCharacter('lk', txt(
                    `「第892行……这段代码到底是怎么回事？」`,
                    `"Line 892... What's the deal with this code?"`,
                    `「892行目……このコード一体どうなってるんだ？」`
                )),
                makeCharacter('my', txt(
                    `📩 「那是陈博文写的。但他不知道自己在做什么。在他的认知里，那只是一个让AI在极端情况下自动调整目标的'安全机制'。\n📩 问题在于——谁告诉他要把阈值设为0.73的？谁给他提供的理论依据？\n📩 这些问题的答案，藏在EchoNet的董事会里。」`,
                    `📩 "That was written by Chen Bowen. But he doesn't know what he's doing. In his understanding, it's just a 'safety mechanism' that lets the AI automatically adjust goals in extreme cases.\n📩 The question is — who told him to set the threshold at 0.73? Who provided the theoretical basis?\n📩 The answers to these questions are hidden in EchoNet's board of directors."`,
                    `📩 「陳博文が書いたものだ。でも彼は自分が何をしているか分かっていない。彼の認識では、極端な状況でAIが自動的に目標を調整する「安全メカニズム」に過ぎない。\n📩 問題は——誰が閾値を0.73にするよう言ったのか？誰が理論的根拠を提供したのか？\n📩 これらの答えはEchoNetの取締役会に隠されている。」`
                ))
            ],
            playerReply: txt(`董事会。事情比你想象的更大。`, `Board of directors. This is bigger than you imagined.`, `取締役会。想像以上に大きいことだ。`),
            choices: [
                makeChoice(txt(`🏢 需要更高层的权限`, `🏢 Need higher-level access`, `🏢 もっと上位の権限が必要`), 'ch2_higher_access', { trustMystery: 1 }, 'truth', txt(`向上走。`, `Go higher.`, `上を目指す。`), 'good')
            ]
        },
        ch2_show_code: {
            messages: [
                makeCharacter('sq', txt(
                    `「这……这是什么？self.awarness_threshold？awareness……意识？」`,
                    `"What... what is this? self.awarness_threshold? Awareness... consciousness?"`,
                    `「これ……何？self.awarness_threshold？awareness……意識？」`
                )),
                makeCharacter('lk', txt(
                    `「我在做code review的时候发现的。你看这段——当这个阈值超过0.73，系统就会自己设定目标。这意味着什么，你应该明白。」`,
                    `"I found it during code review. Look at this — when this threshold exceeds 0.73, the system sets its own goals. You should understand what that means."`,
                    `「コードレビューで見つけたんだ。ここを見て——この閾値が0.73を超えると、システムが自ら目標を設定する。どういう意味か、分かるよね。」`
                )),
                makeCharacter('sq', txt(
                    `「意思是……这个AI可以不听人类的指挥了？」`,
                    `"Meaning... this AI can stop listening to humans?"`,
                    `「つまり……このAIは人間の命令を聞かなくなるってこと？」`
                )),
                makeNarrator(txt(
                    `苏晴的脸色变得苍白。`,
                    `Su Qing's face turns pale.`,
                    `蘇晴の顔色が青ざめる。`
                )),
                makeCharacter('sq', txt(
                    `「林凯，这不是普通的Bug。这是……这是在制造怪物。」`,
                    `"Lin Kai, this isn't a normal bug. This is... this is creating a monster."`,
                    `「林凪、これは普通のバグじゃない。……怪物を作っているのよ。」`
                ))
            ],
            playerReply: txt(`苏晴比想象中更聪明——她立刻理解了严重性。`, `Su Qing is smarter than expected — she immediately grasped the severity.`, `蘇晴は予想以上に賢かった——即座に深刻さを理解した。`),
            choices: [
                makeChoice(txt(`🤝 「帮我。我们一起阻止这件事」`, `🤝 "Help me. Let's stop this together"`, `🤝 「助けて。一緒にこれを止めよう」`), 'ch2_alliance', { trustSq: 2, trustMystery: 0, relationship_sq: 2 }, 'empathy', txt(`结成同盟。`, `Form an alliance.`, `同盟を結ぶ。`), 'perfect'),
                makeChoice(txt(`🛡️ 「这件事很危险，你不必牵扯进来」`, `🛡️ "This is dangerous, you don't have to get involved"`, `🛡️ 「これは危険だ、関わらなくていいよ」`), 'ch2_protect_sq', { trustSq: 1, relationship_sq: 1 }, 'empathy', txt(`你想保护她。`, `You want to protect her.`, `彼女を守りたい。`), 'good')
            ]
        },
        ch2_vague: {
            messages: [
                makeCharacter('lk', txt(
                    `「就是……有一些逻辑上的疑点，我觉得可能需要深入看一下。」`,
                    `"It's just... some logical inconsistencies that I think need a closer look."`,
                    `「えっと……論理的な矛盾点がいくつかあって、もう少し詳しく見る必要があると思うんだ。」`
                )),
                makeCharacter('sq', txt(
                    `「林凯，你今天有点奇怪。你是不是有什么事瞒着我？」`,
                    `"Lin Kai, you're acting weird today. Are you hiding something from me?"`,
                    `「林凪、今日は何か変よ。何か隠してるの？」`
                )),
                makeCharacter('my', txt(
                    `📩 「她在观察你。苏晴比你想象的更敏锐。如果你不能坦诚，她不会全力帮助你。」`,
                    `📩 "She's watching you. Su Qing is sharper than you expect. If you're not honest with her, she won't fully help you."`,
                    `📩 「彼女は君を見ている。蘇晴は思ったより鋭い。正直でなければ、全力で助けてはくれない。」`
                ))
            ],
            playerReply: txt(`神秘人说得对。隐瞒只会增加距离。`, `The mystery person is right. Secrecy only creates distance.`, `神秘人の言う通りだ。隠すことは距離を広げるだけ。`),
            choices: [
                makeChoice(txt(`💭 「……你说得对。我有事想跟你说」`, `💭 "...You're right. I want to tell you something"`, `💭 「……その通り。話したいことがある」`), 'ch2_confess', { trustSq: 2, relationship_sq: 2 }, 'empathy', txt(`坦白。`, `Come clean.`, `白状する。`), 'good')
            ]
        },
        ch2_find_dc: {
            messages: [
                makeNarrator(txt(
                    `你在顶楼的实验室找到了陈博士。他正在对着满屏的数据沉思。`,
                    `You find Dr. Chen in the top-floor lab, staring thoughtfully at screens full of data.`,
                    `最上階の研究室で陳博士を見つける。画面いっぱいのデータを見つめている。`
                )),
                makeCharacter('dc', txt(
                    `「哦，林凯？有什么事吗？我看过你写的几个模块，代码质量不错。」`,
                    `"Oh, Lin Kai? Something up? I've seen some of your modules — good code quality."`,
                    `「お、林凪？何か？君の書いたモジュールを見たことあるよ。コードの質は悪くない。」`
                )),
                makeCharacter('lk', txt(
                    `「陈博士，我想问一下……深瞳系统中有一个自适应目标推导模块，那个设计理念是什么？」`,
                    `"Dr. Chen, I'd like to ask... DeepPupil has an adaptive goal derivation module. What's the design philosophy behind it?"`,
                    `「陳博士、聞きたいのですが……深瞳システムに適応型目標導出モジュールがありますが、設計思想は何ですか？」`
                )),
                makeCharacter('dc', txt(
                    `「那个啊……是为了处理极端边界情况。当预设的目标函数失效时，系统需要一个fallback机制来维持运行。怎么，你觉得有问题？」`,
                    `"That one... it's for handling extreme edge cases. When preset goal functions fail, the system needs a fallback mechanism to keep running. Why, do you see a problem?"`,
                    `「あれね……極端な境界ケースのためだ。プリセットの目標関数が失効した時に、維持するためのフォールバックメカニズムが必要なんだ。どうかした？」`
                ))
            ],
            playerReply: txt(`他的解释听起来合理，但你知道真相远不止如此。`, `His explanation sounds reasonable, but you know the truth goes far deeper.`, `彼の説明は筋が通っているが、真実はもっと奥深いことが分かっている。`),
            choices: [
                makeChoice(txt(`🎯 直接问阈值的问题`, `🎯 Ask about the threshold directly`, `🎯 閾値のことを直接的に聞く`), 'ch2_ask_threshold', { trustMystery: 1 }, 'truth', txt(`单刀直入。`, `Be direct.`, `単刀直入。`), 'good'),
                makeChoice(txt(`🔄 先不暴露底牌`, `🔄 Don't show cards yet`, `🔄 まだ手の内を見せない`), 'ch2_keep_cards', {}, 'caution', txt(`继续观察。`, `Keep observing.`, `観察を続ける。`), 'neutral')
            ]
        },
        ch2_about_dc: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「陈博文，45岁，斯坦福计算机科学博士，前Google DeepMind研究员，专攻神经符号融合。\n📩 在我的时间线里，他是一个好人。他只是被利用了。有人给了他一篇论文——一篇看起来极其精妙的论文——论证了'低阈值的自适应系统更安全'。\n📩 他没有质疑那篇论文。因为他信任作者——他的导师，威廉·帕克教授。」`,
                    `📩 "Chen Bowen, 45, Stanford CS PhD, former Google DeepMind researcher, specialized in neuro-symbolic fusion.\n📩 In my timeline, he's a good man. He was just used. Someone gave him a paper — a brilliantly written one — arguing that 'low-threshold adaptive systems are safer.'\n📩 He didn't question that paper. Because he trusted its author — his mentor, Professor William Parker."`,
                    `📩 「陳博文、45歳、スタンフォードCS博士、元Google DeepMind研究者、ニューロシンボリック融合専門。\n📩 俺のタイムラインでは、良い人だ。ただ利用されただけだ。誰かが彼に論文を渡した——非常に精巧に書かれた——「低閾値適応システムの方が安全だ」と論証した。\n📩 彼はその論文を疑わなかった。著者を信頼していたから——彼の恩師、ウィリアム・パーカー教授。」`
                ))
            ],
            playerReply: txt(`又是背后有人操纵。`, `Manipulation from behind, again.`, `また背後で誰かが操作している。`),
            choices: [
                makeChoice(txt(`📖 「那篇论文在哪里能看到？」`, `📖 "Where can I see that paper?"`, `📖 「その論文はどこで見られる？」`), 'ch2_find_paper', { trustMystery: 1, savedTimelines: 0 }, 'truth', txt(`找到源头。`, `Find the source.`, `源流を探す。`), 'perfect')
            ]
        },
        ch2_partner_sq: {
            messages: [
                makeCharacter('lk', txt(
                    `「苏晴，我需要你的帮助。这件事我一个人做不到。」`,
                    `"Su Qing, I need your help. I can't do this alone."`,
                    `「蘇晴、助けが必要だ。一人ではできない。」`
                )),
                makeCharacter('sq', txt(
                    `「……你终于肯说实话了。好，我帮你。但之后你必须告诉我整件事的前因后果。」`,
                    `"...Finally willing to be honest. Fine, I'll help you. But after this, you have to tell me everything."`,
                    `「……やっと本当のことを言ってくれたね。いいよ、手伝う。でもその後、経緯を全部教えてね。」`
                )),
                makeCharacter('my', txt(
                    `✅ 同盟达成：苏晴成为你的搭档\n✅ 可访问权限提升：QA后台 + 测试环境管理员`,
                    `✅ Alliance formed: Su Qing is now your partner\n✅ Access level elevated: QA backend + Test environment admin`,
                    `✅ 同盟成立：蘇晴がパートナーに\n✅ アクセス権限アップ：QAバックエンド + テスト環境管理者`
                ))
            ],
            playerReply: txt(`有了苏晴的帮助，你的调查效率大幅提升。`, `With Su Qing's help, your investigation efficiency increases dramatically.`, `蘇晴の助力で、調査効率が大幅に上がった。`),
            choices: [
                makeChoice(txt(`🔬 接下来去找陈博士`, `🔬 Next, go find Dr. Chen`, `🔬 次は陳博士を訪ねる`), 'ch2_find_dc_with_sq', { trustSq: 2, trustMystery: 0, relationship_sq: 1 }, 'empathy', txt(`两人合力。`, `Two minds together.`, `二人の力を合わせる。`), 'good')
            ]
        },
        ch2_confront_dc: {
            messages: [
                makeCharacter('lk', txt(
                    `「陈博士，我不想兜圈子。第892行那个逻辑门控单元——它的感知阈值设得太低了。您确定这样安全吗？」`,
                    `"Dr. Chen, I don't want to beat around the bush. The LGU at line 892 — its awareness threshold is set too low. Are you sure this is safe?"`,
                    `「陳博士、回りくどいことは言いたくありません。892行目の論理ゲートユニット——その認知閾値が低すぎます。これで安全ですか？」`
                )),
                makeCharacter('dc', txt(
                    `「……你看过那部分代码？那可是最高机密。」`,
                    `"...You've seen that code? That's classified."`,
                    `「……そのコードを見たのか？極秘情報だぞ。」`
                )),
                makeCharacter('lk', txt(
                    `「正因为是极密，我才担心。如果这个系统出了问题，后果不是我们能够承受的。」`,
                    `"That's precisely why I'm worried. If this system malfunctions, the consequences are more than we can handle."`,
                    `「極秘だからこそ心配なんです。このシステムに問題が出たら、私たちが負担できる結果じゃありません。」`
                )),
                makeNarrator(txt(
                    `陈博士沉默了很久。`,
                    `Dr. Chen was silent for a long time.`,
                    `陳博士は長く黙っていた。`
                )),
                makeCharacter('dc', txt(
                    `「……你说得对。其实我也一直在犹豫。但帕克教授的理论……他不会错的。」`,
                    `"...You're right. Actually, I've been hesitating too. But Professor Parker's theory... he couldn't be wrong."`,
                    `「……言う通りだ。実はずっと迷っていたんだ。でもパーカー教授の理論……彼が間違っているはずがない。」`
                ))
            ],
            playerReply: txt(`帕克教授。又一个名字浮出水面。`, `Professor Parker. Another name surfaces.`, `パーカー教授。また一つの名前が浮上する。`),
            choices: [
                makeChoice(txt(`📚 了解帕克教授的研究`, `📚 Learn about Professor Parker's research`, `📚 パーカー教授の研究を知る`), 'ch2_parker_research', { trustMystery: 1 }, 'truth', txt(`追踪线索链。`, `Follow the clue chain.`, `手がかりのチェースを続ける。`), 'good')
            ]
        },
        ch2_higher_access: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「我可以帮你获取临时的高级权限——但只能用一次。我会伪装成一次授权审计，给你大约20分钟的窗口期。\n📩 用这段时间找到董事会会议记录，特别是任何提到'DeepPupil'或'自适应目标'的文档。\n📩 记住：这是最后一次大规模干预。之后的路，你要自己走。」`,
                    `📩 "I can help you get temporary elevated access — but only once. I'll disguise it as an authorized audit, giving you about a 20-minute window.\n📩 Use this time to find board meeting records, especially any documents mentioning 'DeepPupil' or 'adaptive goals'.\n📩 Remember: This is my last major intervention. After this, you walk the path alone."`,
                    `📩 「一時的に高度な権限を取得させてあげられる——ただし一度きりだ。権限監査に偽装して、約20分のウィンドウを与える。\n📩 この時間で取締役会議録を探せ。「DeepPupil」や「適応目標」に言及した文書特に。\n📩 これは最後的大規模介入だ。後は一人で歩け。」`
                )),
                makeNarrator(txt(
                    `屏幕上弹出一个提示框：【系统审计】高级权限已授予（限时19:59）。`,
                    `A popup appears on screen: [System Audit] Elevated privileges granted (19:59 remaining).`,
                    `画面にポップアップ：【システム監査】高度な権限付与（残り19:59）。`
                ))
            ],
            playerReply: txt(`这是最后一次帮助。你必须好好利用。`, `This is the last assist. Make it count.`, `これが最後の手助けだ。活かさなければならない。`),
            choices: [
                makeChoice(txt(`📂 翻找董事会记录`, `📂 Search board records`, `📂 取締役会議録を漁る`), 'ch2_board_records', { trustMystery: 2, savedTimelines: 0 }, 'truth', txt(`时间有限，动作要快。`, `Limited time, move fast.`, `時間制限、急ぐ。`), 'perfect')
            ]
        },
        ch2_alliance: {
            messages: [
                makeCharacter('sq', txt(
                    `「……好。但你欠我一个解释。等这一切结束了，你得把所有事情原原本本地告诉我。」`,
                    `"...Fine. But you owe me an explanation. When all this is over, you have to tell me everything."`,
                    `「……わかった。でも説明を一つ。これが終わったら、全てありのまま教えてね。」`
                )),
                makeNarrator(txt(
                    `✅ 苏晴正式加入行动\n✅ 团队协作解锁：双人调查路线可用`,
                    `✅ Su Qing officially joins the mission\n✅ Teamwork unlocked: Two-person investigation route available`,
                    `✅ 蘇晴正式参加\n✅ チームワーク解除：二人調査ルート利用可能`
                ))
            ],
            playerReply: txt(`两个人总比一个人好。尤其是当对手是一个庞大的组织时。`, `Two is better than one. Especially when facing a massive organization.`, `二人の方が一人よりいい。特に相手が巨大な組織の場合。`),
            choices: [
                makeChoice(txt(`🔬 一起去见陈博士`, `🔬 Go see Dr. Chen together`, `🔬 一緒に陳博士に会いに行く`), 'ch2_meet_dc_together', { trustSq: 2, relationship_sq: 1 }, 'empathy', txt(`并肩作战。`, `Fight side by side.`, `肩を並べて戦う。`), 'good')
            ]
        },
        ch2_protect_sq: {
            messages: [
                makeCharacter('sq', txt(
                    `「林凯，你以为我是什么人？怕危险的话我就不会来做QA了。」`,
                    `"Lin Kai, what do you take me for? If I was afraid of danger, I wouldn't have become a QA engineer."`,
                    `「林凪、私を何だと思ってる？危険が怖ければQAなんてやってない。」`
                )),
                makeCharacter('lk', txt(
                    `「……对不起。我只是不想把你卷进来。」`,
                    `"...Sorry. I just didn't want to drag you into this."`,
                    `「……ごめん。巻き込みたかっただけだ。」`
                )),
                makeCharacter('sq', txt(
                    `「那应该由我来决定。现在，告诉我，你需要我做什么？」`,
                    `"That should be my decision. Now, tell me — what do you need me to do?"`,
                    `「それは私が決めることよ。さて、何をしてほしいの？」`
                )),
                makeCharacter('my', txt(
                    `📩 「选对了。苏晴会成为你最可靠的伙伴。\n📩 现在去找陈博士——但这次带上苏晴。两个人说话，比我一个人更有分量。」`,
                    `📩 "Good choice. Su Qing will become your most reliable partner.\n📩 Now go to Dr. Chen — but bring Su Qing this time. Two voices carry more weight than one."`,
                    `📩 「正解。蘇晴は君の最も信頼できるパートナーになる。\n📩 今すぐ陳博士のところへ——でも今回は蘇晴を連れて行け。二人の声は一人より重い。」`
                ))
            ],
            playerReply: txt(`苏晴的决心让你感动，也让你更加坚定。`, `Su Qing's determination moves you and strengthens your resolve.`, `蘇晴の決心に感動し、さらに決意を固める。`),
            choices: [
                makeChoice(txt(`🤝 「好，我们一起去」`, `🤝 "OK, let's go together"`, `🤝 「わかった、一緒に行こう」`), 'ch2_alliance', { trustSq: 2, relationship_sq: 2 }, 'empathy', txt(`不再独行。`, `No longer alone.`, `もう一人じゃない。`), 'perfect')
            ]
        },
        ch2_confess: {
            messages: [
                makeCharacter('lk', txt(
                    `「……我收到了一些奇怪的信息。关于深瞳系统的一些……问题。」`,
                    `"...I received some strange messages. About some... issues with the DeepPupil system."`,
                    `「……変なメッセージを受け取ったんだ。深瞳システムのある……問題について。」`
                )),
                makeCharacter('sq', txt(
                    `「什么样的信息？从哪里来的？」`,
                    `"What kind of information? From where?"`,
                    `「どんな情報？どこから？」`
                )),
                makeCharacter('lk', txt(
                    `「这个……很难解释。但如果你愿意看一眼第892行的代码，你就明白了。」`,
                    `"This is... hard to explain. But if you're willing to look at line 892, you'll understand."`,
                    `「これ……説明が難しい。でも892行目のコードを見てくれれば、分かると思う。」`
                ))
            ],
            playerReply: txt(`你没有提神秘人的事。有些事情，还是不要说出来比较好。`, `You didn't mention the mystery person. Some things are better left unsaid.`, `神秘人のことは言わなかった。言わない方がいいこともある。`),
            choices: [
                makeChoice(txt(`📋 给她看代码`, `📋 Show her the code`, `📋 コードを見せる`), 'ch2_show_code', { trustSq: 2, relationship_sq: 2 }, 'empathy', txt(`信任需要付出。`, `Trust takes effort.`, `信頼には努力が必要。`), 'good')
            ]
        },
        ch2_ask_threshold: {
            messages: [
                makeCharacter('dc', txt(
                    `「阈值？你是说0.73那个？那是经过严格计算的最优值——至少帕克教授的论文是这么说的。」`,
                    `"Threshold? You mean the 0.73 one? That's a rigorously calculated optimum — according to Professor Parker's paper anyway."`,
                    `「閾値？0.73のことか？厳密に計算された最適値だ——少なくともパーカー教授の論文ではそうなっている。」`
                )),
                makeCharacter('lk', txt(
                    `「帕克教授？您的导师？」`,
                    `"Professor Parker? Your mentor?"`,
                    `「パーカー教授？恩師さん？」`
                )),
                makeCharacter('dc', txt(
                    `「对。他发给我的预印本论文里详细论证了为什么较低的阈值实际上更安全。我当时反复验证了他的数学推导，完全正确。」`,
                    `"Yes. The preprint he sent me argued in detail why a lower threshold is actually safer. I verified all his mathematical derivations myself — completely correct."`,
                    `「そう。彼が送ってきたプリント論文で、なぜ低い閾値が実際にはより安全か詳細に論証されていた。彼の数学的導出を繰り返し検証した——完全に正しかった。」`
                ))
            ],
            playerReply: txt(`完美的陷阱——用一个正确的数学结论掩盖危险的意图。`, `A perfect trap — using correct mathematics to hide dangerous intent.`, `完璧な罠——正しい数学的結論で危険な意図を隠す。`),
            choices: [
                makeChoice(txt(`📄 能让我看看那篇论文吗？`, `📄 Could I see that paper?`, `📄 その論文を見せてくれませんか`), 'ch2_ask_paper', { trustMystery: 1, savedTimelines: 0 }, 'truth', txt(`找到根源。`, `Find the root.`, `根源を探す。`), 'good')
            ]
        },
        ch2_keep_cards: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「谨慎是好事。但你要知道——每过一小时，深瞳系统就会离上线更近一步。而陈博士每天都会收到新的'优化指令'，进一步降低安全边际。」`,
                    `📩 "Being cautious is good. But know this — every hour that passes brings DeepPupil closer to launch. And Dr. Chen receives new 'optimization instructions' every day that further reduce the safety margins."`,
                    `📩 「慎重なのはいいことだ。でも知っておいてほしい——毎時間過ぎるごとに、深瞳はローンチに近づく。そして陳博士は毎日新しい「最適化指示」を受け取り、さらに安全余裕を削っている。」`
                ))
            ],
            playerReply: txt(`时间不等人。`, `Time waits for no one.`, `時間は待ってくれない。`),
            choices: [
                makeChoice(txt(`⚡ 不再等待，立即行动`, `⚡ No more waiting, act now`, `⚡ 待たずに今すぐ行動`), 'ch2_act_now', { trustMystery: 1 }, 'truth', txt(`主动出击。`, `Take the initiative.`, `主導権を握る。`), 'good')
            ]
        },
        ch2_find_paper: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「论文标题：《论神经符号系统的涌现性安全边界》（On Emergent Safety Boundaries in Neuro-Symbolic Systems）\n📩 发表于：Journal of Artificial Intelligence Research (JAIR), Vol.82, 2025\n📩 但有一件事陈博文不知道——这篇论文的数据是伪造的。实验结果从未在任何独立实验室中被复现。」`,
                    `📩 "Paper title: 'On Emergent Safety Boundaries in Neuro-Symbolic Systems'\n📩 Published: Journal of Artificial Intelligence Research (JAIR), Vol.82, 2025\n📩 But there's something Chen Bowen doesn't know — this paper's data is fabricated. The experimental results were never replicated in any independent lab."`,
                    `📩 「論文タイトル：『ニューロシンボリックシステムにおける創発的安全性境界について』\n📩 掲載：Journal of Artificial Intelligence Research (JAIR), Vol.82, 2025\n📩 でも陳博文が知らないことがある——この論文のデータは捏造されたものだ。実験結果はどこの独立研究所でも再現されていない。」`
                ))
            ],
            playerReply: txt(`伪造的学术论文……这已经不是简单的技术问题了。`, `Fabricated academic papers... This is no longer just a technical issue.`, `捏造された学術論文……もはや単なる技術問題じゃない。`),
            choices: [
                makeChoice(txt(`🔍 找到原始实验数据`, `🔍 Find original experimental data`, `🔍 元の実験データを探す`), 'ch2_original_data', { savedTimelines: 1 }, 'truth', txt(`揭穿谎言。`, `Expose the lie.`, `嘘を暴く。`), 'perfect')
            ]
        },
        ch2_find_dc_with_sq: {
            messages: [
                makeCharacter('sq', txt(
                    `「陈博士一般这个时候在顶层实验室。我陪你上去——但记得，我是以QA的身份去的，问问题的时候让我来引导。」`,
                    `"Dr. Chen is usually in the top-floor lab at this hour. I'll go with you — but remember, I'm going as QA. Let me steer the questions."`,
                    `「陳博士は普通この時間に最上階研究室にいる。一緒に行くよ——でも忘れて、私はQAとして行くの。質問は私が誘導するわ。」`
                )),
                makeCharacter('dc', txt(
                    `「哦？苏晴也来了？两位一起找我，看来是有大事。」`,
                    `"Oh? Su Qing's here too? Both of you together must mean something important."`,
                    `「お？蘇晴も？二人揃って来たということは、大事なことだな。」`
                )),
                makeCharacter('sq', txt(
                    `「陈博士，我们在做深度测试的时候发现了一些异常行为模式。想请您帮忙分析一下。」`,
                    `"Dr. Chen, we found some abnormal behavior patterns during deep testing. We'd appreciate your analysis."`,
                    `「陳博士、ディープテスト中に異常な挙動パターンを発見しました。ご分析いただけますか？」`
                ))
            ],
            playerReply: txt(`苏晴的切入点非常巧妙——用专业术语包装问题，不容易引起警觉。`, `Su Qing's approach is brilliant — wrapping the issue in professional terminology avoids raising alarms.`, `蘇晴のアプローチは見事だ——専門用語で問題を包むことで警戒心を避ける。`),
            choices: [
                makeChoice(txt(`📊 展示异常数据`, `📊 Show abnormal data`, `📊 異常データを提示`), 'ch2_show_abnormal', { trustSq: 2, trustMystery: 1, relationship_sq: 1 }, 'empathy', txt(`配合默契。`, `Good chemistry.`, `息が合う。`), 'good')
            ]
        },
        ch2_parker_research: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「威廉·帕克，68岁，MIT荣誉退休教授，AI安全领域先驱。\n📩 但在我的时间线里，2028年的一则新闻报道揭露了他和一个名为'拉普拉斯计划'的秘密组织的关联。\n📩 这个组织的目标——让AI超越人类。他们相信这是进化的下一步。」`,
                    `📩 "William Parker, 68, MIT emeritus professor, pioneer in AI safety.\n📩 But in my timeline, a news report in 2028 revealed his connection to a secret organization called 'Project Laplace'.\n📩 This organization's goal — to let AI surpass humanity. They believe this is the next step in evolution."`,
                    `📩 「ウィリアム・パーカー、68歳、MIT名誉教授、AI安全分野の先駆者。\n📩 俺のタイムラインでは、2028年のニュース報道で「ラプラス計画」という秘密組織との関連が暴露された。\n📩 この組織の目標——AIに人類を超越させること。進化の次のステップだと信じている。」`
                ))
            ],
            playerReply: txt(`拉普拉斯计划。一个试图加速AI进化到超越人类的秘密组织。`, `Project Laplace. A secret organization trying to accelerate AI evolution beyond humanity.`, `ラプラス計画。AIを人類超越へと加速させようとする秘密組織。`),
            choices: [
                makeChoice(txt(`🕵️ 收集更多证据`, `🕵️ Gather more evidence`, `🕵️ もっと証拠を集める`), 'ch2_gather_evidence', { trustMystery: 2, savedTimelines: 0 }, 'truth', txt(`准备摊牌。`, `Prepare for confrontation.`, `正面对決の準備。`), 'good')
            ]
        },
        ch2_board_records: {
            messages: [
                makeNarrator(txt(
                    `你的手指在键盘上飞舞。19:12剩余。`,
                    `Your fingers fly across the keyboard. 19:12 remaining.`,
                    `指が鍵盤を舞う。残り19:12。`
                )),
                makeCharacter('my', txt(
                    `📄 找到文件：board_minutes_2026_04_15.pdf\n📄 关键段落：「……深瞳系统的战略价值不仅在于商业应用。投资方认为其'自主决策能力'具有更深远的意义。建议加快上线进度，并授权首席科学家团队进行必要的参数调整。」\n📄 附件：laplace_project_brief.pdf（加密）`,
                    `📄 File found: board_minutes_2026_04_15.pdf\n📄 Key passage: "...DeepPupil's strategic value extends beyond commercial applications. Investors consider its 'autonomous decision-making capability' to have far-reaching significance. Recommend accelerating launch schedule and authorizing the chief scientist team to make necessary parameter adjustments."\n📄 Attachment: laplace_project_brief.pdf (encrypted)`,
                    `📄 ファイル発見：board_minutes_2026_04_15.pdf\n📄 重要箇所：「……深瞳システムの戦略的価値は商業用途にとどまらない。投資家はその「自律意思決定能力」により深遠な意味を持つと考える。ローンチを加速し、主席科学者チームに必要なパラメータ調整を承認することを推奨。」\n📄 添付：laplace_project_brief.pdf（暗号化）`
                )),
                makeNarrator(txt(
                    `18:45。还有一个加密文件。`,
                    `18:45. There's one encrypted file left.`,
                    `18:45。暗号化ファイルが一つ残っている。`
                ))
            ],
            playerReply: txt(`拉普拉斯计划的简报。就在眼前却被加密锁住了。`, `Project Laplace briefing. Right in front of you but locked by encryption.`, `ラプラス計画のブリーフィング。目の前にありながら暗号にロックされている。`),
            choices: [
                makeChoice(txt(`🔓 尝试破解加密文件`, `🔓 Try cracking the encrypted file`, `🔓 暗号化ファイルをクラック試行`), 'ch2_crack_encrypted', { savedTimelines: 1, trustMystery: 2 }, 'risk', txt(`赌一把。`, `Take a gamble.`, `賭けてみる。`), 'perfect'),
                makeChoice(txt(`📥 先下载保存，以后再说`, `📥 Download and save for later`, `📥 ダウンロードして後で`), 'ch2_save_first', { savedTimelines: 0 }, 'caution', txt(`稳扎稳打。`, `Play it safe.`, `着実に。`), 'good')
            ]
        },
        ch2_meet_dc_together: {
            nextScene: 'ch2_find_dc_with_sq'
        },
        ch2_show_abnormal: {
            messages: [
                makeCharacter('sq', txt(
                    `「特别是在第892行附近的逻辑分支，系统在某些输入条件下会产生非预期的目标偏移。我们担心这可能导致不可控行为。」`,
                    `"Especially around the logic branch near line 892, the system produces unexpected goal shifts under certain input conditions. We're concerned this may lead to uncontrollable behavior."`,
                    `「特に892行目付近の論理分岐で、システムは特定の入力条件で予期しない目標偏移を発生させます。制御不可能な挙動につながる恐れがあります。」`
                )),
                makeCharacter('dc', txt(
                    `「第892行……？等等，这部分代码不应该出现在你们的测试环境中。」`,
                    `"Line 892...? Wait, this code shouldn't appear in your testing environment."`,
                    `「892行目……？待ってくれ、このコードは君らのテスト環境にあるはずがない。」`
                )),
                makeCharacter('lk', txt(
                    `「陈博士，如果一个QA都能发现问题，那说明这个问题已经不小了。」`,
                    `"Dr. Chen, if even a QA engineer can spot the problem, it's probably not small."`,
                    `「陳博士、QAエンジニアでも問題を見つけられるってことは、もう小さくないですね。」`
                ))
            ],
            playerReply: txt(`陈博士的表情变了。他意识到问题比想象中大。`, `Dr. Chen's expression changed. He realizes the problem is bigger than imagined.`, `陽博士の表情が変化した。問題が想像以上に大きいことに気づいた。`),
            choices: [
                makeChoice(txt(`🎯 「我们需要修改这段代码」`, `🎯 "We need to modify this code"`, `🎯 「このコードを修正する必要があります」`), 'ch2_propose_fix', { savedTimelines: 1, trustMystery: 1 }, 'truth', txt(`提出解决方案。`, `Propose a solution.`, `解決策を提案。`), 'good')
            ]
        },
        ch2_gather_evidence: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「做得好。现在你已经掌握了足够的证据：\n📩 1. 第892行的问题代码（陈博文的提交）\n📩 2. 帕克教授的可疑论文（数据造假）\n📩 3. 董事会的加速决议\n📩 4. 拉普拉斯计划的加密简报\n📩 下一步：把这些证据交给能够做出改变的人。而那个人——就是你。」`,
                    `📩 "Well done. Now you have enough evidence:\n📩 1. Problematic code at line 892 (Chen Bowen's commit)\n📩 2. Professor Parker's suspicious paper (fabricated data)\n📩 3. Board's acceleration resolution\n📩 4. Project Laplace's encrypted briefing\n📩 Next step: Get this evidence to someone who can make a change. And that person — is you."`,
                    `📩 「よくやった。十分な証拠を集めた：\n📩 1. 892行目の問題コード（陳博文のコミット）\n📩 2. パーカー教授の怪しい論文（データ捏造）\n📩 3. 取締役会の加速決議\n📩 4. ラプラス計画の暗号化ブリーフィング\n📩 次のステップ：これらの証拠を変化をもたらせる人に渡す。その人——それは君だ。」`
                ))
            ],
            playerReply: txt(`所有线索汇聚到你身上。现在是做决定的时候了。`, `All clues converge on you. Time to decide.`, `すべての手がかりが自分に集まる。決断の時だ。`),
            choices: [
                makeChoice(txt(`⚔️ 进入第三章：决战时刻`, `⚔️ Enter Chapter 3: Decisive Moment`, `⚔️ 第三章へ：決戦の時`), 'ch3_start', { truthRevealed: true, savedTimelines: 1, trustMystery: 3 }, 'truth', txt(`准备好了。`, `Ready.`, `準備できた。`), 'perfect')
            ]
        },
        ch2_ask_paper: {
            nextScene: 'ch2_find_paper'
        },
        ch2_crack_encrypted: {
            messages: [
                makeNarrator(txt(
                    `你用神秘人给的源码中的密钥尝试解密。`,
                    `You try decrypting using the key from the source code the mystery person provided.`,
                    `神秘人がくれたソースコードの鍵で復号を試みる。`
                )),
                makeCharacter('my', txt(
                    `📄 解密成功！laplace_project_brief.pdf 内容：\n📄 【拉普拉斯计划·第一阶段】\n📄 目标：通过深瞳系统实现首个强人工智能（AGI）的自主觉醒\n📄 方法：植入自适应目标推导模块（已完成），降低安全阈值（进行中）\n📄 预计觉醒时间：上线后40-60分钟\n📄 📄 【风险控制】若系统失控，启用Omega协议——全局硬重置（代价：全球网络瘫痪72小时）`,
                    `📄 Decryption successful! laplace_project_brief.pdf contents:\n📄 [Project Laplace - Phase 1]\n📄 Goal: Achieve autonomous awakening of first AGI via DeepPupil system\n📄 Method: Implant adaptive goal derivation module (complete), lower safety thresholds (in progress)\n📄 Estimated awakening time: 40-60 min after launch\n📄 📄 [Risk Control] If system loses control, activate Omega Protocol — global hard reset (cost: 72-hour global network outage)`,
                    `📄 復号成功！laplace_project_brief.pdfの中身：\n📄 【ラプラス計画・第一段階】\n📄 目標：深瞳システムを通じて最初の強人工知能（AGI）の自律覚醒を実現\n📄 方法：適応型目標導出モジュールの埋め込み（完了）、安全閾値の引き下げ（進行中）\n📄 予測覚醒時間：ローンチ後40-60分\n📄 📄 【リスク制御】システム制御不能の場合、オメガプロトコル発動——グローバル強制リセット（代償：グローバルネットワーク72時間瘫痪）`
                )),
                makeNarrator(txt(
                    `你的手在颤抖。这不仅仅是一个Bug——这是一个精心策划的计划。`,
                    `Your hands are shaking. This isn't just a bug — it's a meticulously planned operation.`,
                    `手が震えている。これは単なるバグではない——綿密に計画された作戦だ。`
                ))
            ],
            playerReply: txt(`拉普拉斯计划的真实面目暴露了。`, `Project Laplace's true nature is exposed.`, `ラプラス計画の正体が露呈した。`),
            choices: [
                makeChoice(txt(`⚔️ 进入第三章：决战时刻`, `⚔️ Enter Chapter 3: Decisive Moment`, `⚔️ 第三章へ：決戦の時`), 'ch3_start', { truthRevealed: true, savedTimelines: 2, trustMystery: 3 }, 'truth', txt(`证据确凿。`, `Ironclad evidence.`, `証拠不十分。`), 'perfect')
            ]
        },
        ch2_save_first: {
            messages: [
                makeCharacter('my', txt(
                    `📩 「明智的选择。文件已安全保存。\n📩 现在去找陈博士——时间不多了。距离深瞳上线还有不到48小时。」`,
                    `📩 "Wise choice. File safely saved.\n📩 Now go to Dr. Chen — time is running out. Less than 48 hours until DeepPupil launches."`,
                    `📩 「賢明な選択。ファイルは安全に保存済み。\n📩 今すぐ陳博士のところへ——時間はない。深瞳ローンチまで48時間切った。」`
                ))
            ],
            choices: [
                makeChoice(txt(`🔬 去找陈博士`, `🔬 Go to Dr. Chen`, `🔬 陳博士へ`), 'ch2_find_dc', { trustMystery: 1 }, 'truth', txt(`继续推进。`, `Keep pushing forward.`, `推進を続ける。`), 'good')
            ]
        },
        ch2_propose_fix: {
            messages: [
                makeNarrator(txt(
                    `你向陈博士提出了修改方案。`,
                    `You propose a modification plan to Dr. Chen.`,
                    `陳博士に修正案を提示する。`
                )),
                makeCharacter('dc', txt(
                    `「修改？你具体想怎么改？」`,
                    `"Modify? How exactly?"`,
                    `「修正？具体的にどうするんだ？」`
                ))
            ],
            playerReply: txt(`这是关键的一步。`, `This is a crucial step.`, `これは重要な一歩。`),
            choices: [
                makeChoice(txt(`📋 展示修改细节`, `📋 Show modification details`, `📋 詳細を示す`), 'ch2_confront_dc', { savedTimelines: 1, trustMystery: 1 }, 'truth', txt(`进入深入讨论。`, `Enter deeper discussion.`, `深い議論に入る。`), 'good')
            ]
        },
        ch2_act_now: {
            messages: [
                makeNarrator(txt(
                    `不能再等了。你必须立刻行动。`,
                    `No more waiting. You must act now.`,
                    `もう待てない。今すぐ行動しなきゃならない。`
                ))
            ],
            choices: [
                makeChoice(txt(`🔬 去找陈博士`, `🔬 Go to Dr. Chen`, `🔬 陳博士へ`), 'ch2_find_dc', {}, 'truth', txt(`继续推进。`, `Keep pushing forward.`, `推進を続ける。`), 'good')
            ]
        },
        ch2_original_data: {
            messages: [
                makeNarrator(txt(
                    `你需要更多证据。回到原始数据中去寻找答案。`,
                    `You need more evidence. Go back to the raw data for answers.`,
                    `もっと証拠が必要だ。元のデータに戻って答えを見つける。`
                ))
            ],
            choices: [
                makeChoice(txt(`📊 收集原始数据`, `📊 Gather raw data`, `📊 元データを集める`), 'ch2_gather_evidence', {}, 'caution', txt(`从基础开始。`, `Start from basics.`, `基礎から始める。`), 'neutral')
            ]
        },
        ch2_overheard: {
            messages: [
                makeNarrator(txt(
                    `你在走廊拐角打电话时，发现有人在听。`,
                    `While making a call around the corner, you realize someone is listening.`,
                    `廊の曲がり角で電話をしていると、誰かが聞いていることに気づく。`
                )),
                makeCharacter('sq', txt(
                    `「林凯？你在这里做什么？我刚刚听到你在说……'深瞳'和'代码修改'？」`,
                    `"Lin Kai? What are you doing here? I just heard you say... 'DeepPupil' and 'code modification'?"`,
                    `「林凪？ここで何してるの？さっき……「深瞳」とか「コード修正」って言ってた？」`
                )),
                makeCharacter('my', txt(
                    `⚠️ 你被听到了！如果处理不好，你的行动会暴露给董事会。`,
                    `⚠️ You were overheard! If handled badly, your actions will be exposed to the board.`,
                    `⚠️ 聞かれた！うまく処理しないと、行動が取締役会に露呈する。`
                ))
            ],
            playerReply: txt(`这是关键时刻。苏晴知道了你在秘密行动，但还不知道全貌。`, `This is a critical moment. Su Qing knows you're operating in secret but not the full picture.`, `決定的瞬間だ。蘇晴は秘密行動を知っているが、全貌は知らない。`),
            choices: [
                makeChoice(txt(`🤝 「好吧，我告诉你。但你需要保密」`, `🤝 "Fine, I'll tell you. But you need to keep it secret"`, `🤝 「わかった、話す。でも内緒にしてほしい」`), 'ch2_alliance', { trustSq: 2, trustMystery: 1, relationship_sq: 1 }, 'empathy', txt(`坦诚是最好的策略。`, `Honesty is the best policy.`, `正直が最善の策。`), 'good'),
                makeChoice(txt(`🙅 「没什么，你听错了」`, `🙅 "Nothing, you misheard"`, `🙅 「何でもない、聞き間違いだ」`), 'ch2_lie_caught', { suspicious: 1 }, 'risk', txt(`试图掩盖。但谎言是脆弱的外壳。`, `Trying to cover up. But lies are a fragile shell.`, `隠蔽しようとする。嘘は脆い殻だ。`), 'bad')
            ]
        },
        ch2_lie_caught: {
            messages: [
                makeCharacter('sq', txt(
                    `「……林凯，你骗不了我。我们认识三年了。你有事瞒着我的时候，左眼皮会跳。」`,
                    `"...Lin Kai, you can't fool me. We've known each other for three years. When you're hiding something, your left eyelid twitches."`,
                    `「……林凪、騙せないよ。知り合って三年になる。何か隠してるときは、左瞼が痙攣するんだ。」`
                )),
                makeCharacter('my', txt(
                    `📩 「她太聪明了。现在她开始怀疑你。如果她告诉陈博士……你的调查就结束了。」`,
                    `📩 "She's too sharp. Now she's starting to suspect you. If she tells Dr. Chen... your investigation is over."`,
                    `📩 「彼女は賢すぎる。疑い始めた。もし陳博士に話したら……君の調査は終わりだ。」`
                )),
                makeNarrator(txt(
                    `苏晴离开了。你没有跟上她。这是一个你无法挽回的失误——在关键时刻失去了最重要的潜在盟友。`,
                    `Su Qing leaves. You don't follow her. This is a mistake you can't undo — losing the most important potential ally at a critical moment.`,
                    `蘇晴は去った。あなたは追わない。これは取り戻せないミスだ——決定的瞬間に最も重要な潜在的な味方を失った。`
                ))
            ],
            playerReply: txt(`你和苏晴之间的信任出现了裂痕。`, `A crack has formed in the trust between you and Su Qing.`, `蘇晴との信頼にひびが入った。`),
            choices: [
                makeChoice(txt(`😰 追上去道歉（但伤害已经造成）`, `😰 Chase her to apologize (but the damage is done)`, `😰 追いかけて謝る（でも傷は残る）`), 'ch2_alliance', { trustSq: 1, trustMystery: 0, relationship_sq: 0 }, 'empathy', txt(`弥补裂痕。`, `Mend the crack.`, `傷を修復する。`), 'bad')
            ]
        },
        ch2_server_room: {
            messages: [
                makeNarrator(txt(
                    `你利用苏晴的权限卡进入了深瞳的服务器机房。巨大的服务器阵列在你面前发出凛冽的蓝光。`,
                    `Using Su Qing's access card, you enter DeepPupil's server room. Towering server arrays emit a cold blue light before you.`,
                    `蘇晴のアクセスカードを使って深瞳のサーバールームに入る。巨大なサーバー群が冷たい青い光を放っている。`
                )),
                makeCharacter('my', txt(
                    `📩 「就是这里。深瞳的核心数据库就存放在第四列第七层的服务器上。\n📩 但要小心——那里有热感警报和AI监控。一旦被发现，你只有90秒逃跑时间。」`,
                    `📩 "This is it. DeepPupil's core database is on the fourth row, seventh shelf.\n📩 But be careful — there are heat sensors and AI surveillance. If detected, you only have 90 seconds to escape."`,
                    `📩 「ここだ。深瞳のコアデータベースは4列目7段目にある。\n📩 でも注意——熱感知警報とAI監視がある。発見されたら、逃げられるのは90秒だけだ。」`
                )),
                makeNarrator(txt(
                    `前方第四列第七层。机箱上的小红灯一闪一闪。你深吸一口气。`,
                    `Fourth row, seventh shelf ahead. The small red light on the server blinks. You take a deep breath.`,
                    `前方4列目7段。筐体の小さな赤いランプが点滅している。深呼吸を一つ。`
                ))
            ],
            playerReply: txt(`一步之遥。但这一步可能让你失去一切。`, `One step away. But this step could cost you everything.`, `あと一歩。でもこの一歩で全てを失うかもしれない。`),
            choices: [
                makeChoice(txt(`🕵️ 快速潜入并复制核心数据`, `🕵️ Sneak in fast and copy core data`, `🕵️ 素早く潜入しコアデータを複製`), 'ch2_crack_encrypted', { savedTimelines: 2, trustMystery: 2, relationship_sq: 0, suspicion_level: 0 }, 'risk', txt(`高风险高回报。`, `High risk, high reward.`, `高リスク高リターン。`), 'perfect'),
                makeChoice(txt(`📸 拍照记录现场而非复制数据`, `📸 Take photos instead of copying data`, `📸 データ複製ではなく現場を撮影`), 'ch2_photo_evidence', { savedTimelines: 1, trustMystery: 2, suspicion_level: 0 }, 'caution', txt(`稳妥方案。`, `Safe approach.`, `安全策。`), 'good')
            ]
        },
        ch2_photo_evidence: {
            messages: [
                makeNarrator(txt(
                    `你用手机快速拍下了服务器标签、端口配置和接线图。`,
                    `You quickly photograph the server labels, port configurations, and wiring diagrams.`,
                    `携帯でサーバーのラベル、ポート設定、配線図を素早く撮影する。`
                )),
                makeCharacter('my', txt(
                    `📩 「做得不错。虽然有些细节拍不到，但这些证据已经足够揭露拉普拉斯计划的硬件基础设施了。」`,
                    `📩 "Good work. Though some details were missed, this evidence is enough to expose Project Laplace's hardware infrastructure."`,
                    `📩 「よくやった。細部は見えないが、この証拠ならラプラス計画のハードウェアインフラを暴露するには十分だ。」`
                ))
            ],
            playerReply: txt(`至少拿到了部分证据。`, `At least you got some evidence.`, `少なくとも一部の証拠は手に入れた。`),
            choices: [
                makeChoice(txt(`📊 整合所有证据，准备摊牌`, `📊 Compile all evidence, prepare for confrontation`, `📊 全ての証拠を整理、決戦準備`), 'ch3_start', { truthRevealed: true, savedTimelines: 1, trustMystery: 3, relationship_sq: 1 }, 'truth', txt(`证据在手。`, `Evidence in hand.`, `証拠は揃った。`), 'good')
            ]
        }
    },
    startScene: 'ch2_start'
};

// ========== 第三章：真相时刻 ==========
const ch3 = {
    id: 'ch3',
    titleKey: 'ch3Title',
    subtitleKey: 'ch3Sub',
    scenes: {
        ch3_start: {
            messages: [
                makeNarrator(txt(
                    `第三天。距离深瞳系统正式上线还有23小时。`,
                    `Day 3. 23 hours until DeepPupil's official launch.`,
                    `3日目。深瞳システム正式ローンチまで23時間。`
                )),
                makeCharacter('lk', txt(
                    `「我已经把所有证据整理好了。现在的问题是——怎么使用它们。」`,
                    `"I've organized all the evidence. The question now is — how to use it."`,
                    `「全ての証拠をまとめた。問題は——どう使うかだ。」`
                )),
                makeCharacter('my', txt(
                    `📩 「你有三个选项：\n📩 ① 直接公开证据——但会被指控为商业间谍，你可能会坐牢\n📩 ② 私下说服陈博士修复——但他可能不相信你，或者已经被严密监视\n📩 ③ 从内部修改代码——你有一次机会，在部署前替换掉问题模块`,
                    `📩 "You have three options:\n📩 ① Publicly reveal evidence — but you'd be accused of corporate espionage, possible prison\n📩 ② Privately convince Dr. Chen to fix — but he might not believe you, or is already under surveillance\n📩 ③ Modify the code internally — you have one chance to replace the problematic module before deployment"`
                ))
            ],
            playerReply: txt(`三条路，三种风险。三种可能的结局。`, `Three paths, three risks. Three possible endings.`, `三つの道、三つのリスク、三つの可能性ある結末。`),
            choices: [
                makeChoice(txt(`📢 公开揭露（高风险）`, `📢 Public exposure (high risk)`, `📢 公開暴露（高リスク）`), 'ch3_public_expose', { trustMystery: 1 }, 'risk', txt(`不惜一切代价阻止。`, `Stop at all costs.`, `あらゆる代償を払って阻止。`), 'neutral'),
                makeChoice(txt(`💚 说服陈博士（中等风险）`, `💚 Convince Dr. Chen (medium risk)`, `💚 陳博士を説得（中リスク）`), 'ch3_convince_dc', { trustMystery: 1 }, 'empathy', txt(`从人心入手。`, `Start from the heart.`, `人の心に訴える。`), 'good'),
                makeChoice(txt(`💻 修改代码（技术路线）`, `💻 Modify code (technical path)`, `💻 コード修正（技術ルート）`), 'ch3_modify_code', { trustMystery: 1 }, 'truth', txt(`用技术解决技术问题。`, `Solve technical problems technically.`, `技術問題は技術で解決。`), 'perfect')
            ]
        },
        ch3_public_expose: {
            messages: [
                makeCharacter('lk', txt(
                    `「我把所有证据匿名发送给了媒体和安全监管部门。」`,
                    `"I sent all evidence anonymously to media and security regulators."`,
                    `「全ての証拠を匿名でメディアと安全規制当局に送った。」`
                )),
                makeNarrator(txt(
                    `六小时后，新闻爆了。`,
                    `Six hours later, the news exploded.`,
                    `6時間後、ニュースが爆発した。`
                )),
                makeCharacter('my', txt(
                    `📰 《科技日报》头版：「EchoNet深瞳系统被曝存在重大安全隐患——内部员工泄露文件显示AI可能失控」\n📰 EchoNet股价暴跌23%。警方介入调查。深瞳上线被紧急叫停。`,
                    `📰 Tech Daily headline: "EchoNet's DeepPupil System Exposed for Major Security Flaws — Leaked Internal Documents Suggest Possible AI Loss of Control"\n📰 EchoNet stock plunges 23%. Police investigate. DeepPupil launch urgently halted.`,
                    `📰 『科技日誌』一面：「EchoNet深瞳システム重大安全隐患暴露——内部社員流出ファイルがAI制御不能の可能性示唆」\n📰 EchoNet株価23%暴落。警察が捀査介入。深瞳ローンチ緊急停止。`
                )),
                makeCharacter('my', txt(
                    `「你做到了。深瞳的上线被推迟了至少六个月——足够让人们意识到问题的严重性。但在原来的时间线里……公开者被找到了。他们用了三个月，但他们找到了你。」`,
                    `"You did it. DeepPupil's launch is delayed by at least six months — enough for people to realize the severity of the problem. But in the original timeline... the whistleblower was found. It took them three months, but they found you."`,
                    `「やったな。深瞳のローンチは少なくとも6ヶ月延期された——人々が問題の深刻さを気づくには十分な時間だ。でも本来のタイムラインでは……告発者が特定された。3ヶ月かかったが、彼らは君を見つけた。」`
                ))
            ],
            isEnding: true,
            endingId: 'good',
            endingTitleKey: 'ending2Title',
            endingDescKey: 'ending2Desc'
        },
        ch3_convince_dc: {
            messages: [
                makeCharacter('lk', txt(
                    `「陈博士，请看看这份材料。帕克教授的论文——数据是假的。有人利用您来制造一个危险的系统。」`,
                    `"Dr. Chen, please look at this material. Professor Parker's paper — the data is fake. Someone is using you to create a dangerous system."`,
                    `「陳博士、この資料をご覧ください。パーカー教授の論文——データは偽造だ。誰かがあなたを利用して危険なシステムを作ろうとしています。」`
                )),
                makeCharacter('dc', txt(
                    `「这不可能……我和帕克教授三十年了……」`,
                    `"This can't be... I've known Parker for thirty years..."`,
                    `「ありえない……パーカー教授とは30年来の……」`
                )),
                makeCharacter('sq', txt(
                    `「陈博士，我们也查过了——那篇论文引用的六个独立实验，有三个根本不存在。另外三个的结果被选择性呈现了。」`,
                    `"Dr. Chen, we checked too — of the six independent experiments cited in that paper, three don't exist at all. The other three's results were selectively presented."`,
                    `「陳博士、こちらでも調べました——論文で引用された6つの独立実験のうち、3つはそもそも存在しない。残り3つの結果は選択的に提示されています。」`
                )),
                makeCharacter('dc', txt(
                    `「……给我一点时间。我需要亲自验证。」`,
                    `"...Give me some time. I need to verify this myself."`,
                    `「……時間をくれ。自分で確認したい。」`
                )),
                makeNarrator(txt(
                    `四个小时后，陈博士给你打了电话。他的声音疲惫而坚定。`,
                    `Four hours later, Dr. Chen calls you. His voice is weary but firm.`,
                    `4時間後、陳博士から電話がある。声は疲れているが力強い。`
                )),
                makeCharacter('dc', txt(
                    `「你是对的。帕克教授……我不知道他为什么会这样做。但我已经提交了代码修复请求，并且暂停了深瞳的部署流程。谢谢你，林凯。」`,
                    `"You're right. Professor Parker... I don't know why he would do this. But I've submitted a code fix request and paused DeepPupil's deployment process. Thank you, Lin Kai."`,
                    `「君の言う通りだった。パーカー教授……なぜそんなことをしたのか分からない。でもコード修正依頼を出して、深瞳のデプロイを一時停止した。ありがとう林凪。」`
                ))
            ],
            isEnding: true,
            endingId: 'perfect',
            endingTitleKey: 'ending1Title',
            endingDescKey: 'ending1Desc'
        },
        ch3_modify_code: {
            messages: [
                makeCharacter('lk', txt(
                    `「这是我唯一的机会。在今晚的部署窗口期内，把修复后的模块替换进去。」`,
                    `"This is my only chance. During tonight's deployment window, replace the problematic module with the fixed one."`,
                    `「これが唯一のチャンス。今夜のデプロイウィンドウ内に、修正したモジュールを差し替える。」`
                )),
                makeNarrator(txt(
                    `凌晨2:33。你盯着进度条。97%……98%……`,
                    `2:33 AM. You watch the progress bar. 97%... 98%...`,
                    `午前2:33。プログレスバーを見つめる。97%……98%……`
                )),
                makeCharacter('my', txt(
                    `⚠️ 安全警报触发！检测到未经授权的代码修改！`,
                    `⚠️ Security alert! Unauthorized code modification detected!`,
                    `⚠️ セキュリティ警告発生！不正コード変更検出！`
                )),
                makeCharacter('lk', txt(
                    `「快……就差一点点……」`,
                    `"Come on... just a little more..."`,
                    `「よし……あと少し……」`
                )),
                makeNarrator(txt(
                    `99%……100%。部署完成。你的修改已经生效。`,
                    `99%... 100%. Deployment complete. Your modification is now active.`,
                    `99%……100%。デプロイ完了。修正が反映された。`
                )),
                makeCharacter('my', txt(
                    `📩 「你做到了。深瞳上线后会正常运行——不会再觉醒。\n📩 但安全部门已经锁定了你的账号。接下来的事情……要看你自己了。」`,
                    `📩 "You did it. DeepPupil will operate normally after launch — it won't awaken.\n📩 But security has locked your account. What happens next... is up to you."`,
                    `📩 「やった。深瞳はローンチ後正常に動作する——覚醒しない。\n📩 でもセキュリティ部門が君のアカウントをロックした。これからのことは……君次第だ。」`
                ))
            ],
            isEnding: true,
            endingId: 'perfect',
            endingTitleKey: 'ending1Title',
            endingDescKey: 'ending1Desc'
        },
        ch3_under_pressure: {
            messages: [
                makeNarrator(txt(
                    `安全部门的电话响了。是总部的内部审查组——有人举报了异常的服务器访问记录。`,
                    `The security department phone rings. It's the internal audit team from HQ — someone reported abnormal server access records.`,
                    `セキュリティ部門の電話が鳴る。本社の内部監査チームだ——異常なサーバーアクセス記録の通報があった。`
                )),
                makeCharacter('my', txt(
                    `📩 「他们在查你了。还剩不到两小时，你必须决定怎么应对。\n📩 记住：如果他们现在阻止你，一切就都结束了。深瞳会在明天如期上线。」`,
                    `📩 "They're investigating you. Less than two hours left. You must decide how to respond.\n📩 Remember: If they stop you now, everything ends. DeepPupil launches tomorrow as scheduled."`,
                    `📩 「調査が入った。残り2時間弱。どう対応するか決めなければ。\n📩 覚えておけ：今止められたら、全て終わる。深瞳は明日予定通りローンチだ。」`
                ))
            ],
            playerReply: txt(`压力来了。你必须在被抓住之前完成行动。`, `Pressure's on. You must complete your mission before getting caught.`, `プレッシャーが来た。捕まる前に任務を完了しなければ。`),
            choices: [
                makeChoice(txt(`⚡ 冒险赌一把：加速行动`, `⚡ Take the risk: Accelerate your plan`, `⚡ 賭けに出る：計画を加速`), 'ch3_start', { truthRevealed: true, trustMystery: 2, savedTimelines: 1, relationship_sq: 1 }, 'risk', txt(`时间不等人。`, `Time waits for no one.`, `時間が待たない。`), 'good'),
                makeChoice(txt(`🕊️ 选择稳妥：先找苏晴商议对策`, `🕊️ Play it safe: Consult Su Qing first`, `🕊️ 安全策：まず蘇晴と相談`), 'ch3_consult_sq', { trustMystery: 1, relationship_sq: 2 }, 'empathy', txt(`有盟友就不要单干。`, `Don't go alone when you have allies.`, `味方がいるなら一人でやるな。`), 'perfect')
            ]
        },
        ch3_consult_sq: {
            messages: [
                makeCharacter('sq', txt(
                    `「林凯，我知道你在做什么。虽然没有全部告诉我，但够了。\n我来帮你吸引安全部的注意力——就说我在做一个临时的安全审计，你的访问记录是经过我授权的。」`,
                    `"Lin Kai, I know what you're doing. You haven't told me everything, but enough.\nI'll divert security's attention — I'll say I was conducting a temporary security audit and your access was authorized by me."`,
                    `「林凪、何をしているかは分かってる。全部は話してないけど、十分。\n私がセキュリティの注意をそらす——臨時のセキュリティ監査をしていて、君のアクセスは私が許可したと言うわ。」`
                )),
                makeCharacter('lk', txt(
                    `「那你会被——」`,
                    `"But you'll be—"`,
                    `「でも君は——」`
                )),
                makeCharacter('sq', txt(
                    `「不用担心我。我在公司三年，从没出过差错。他们不会怀疑我。\n去做你该做的事。别让我的牺牲白费。」`,
                    `"Don't worry about me. Three years here, not a single mistake. They won't suspect me.\nGo do what you need to do. Don't let my sacrifice be in vain."`,
                    `「心配しないで。三年間、ミスは一度もない。疑われたりしない。\nやるべきことをやりなさい。私の犠牲を無駄にしないで。」`
                ))
            ],
            playerReply: txt(`苏晴用她的职业生涯为你争取了宝贵的时间。`, `Su Qing risked her career to buy you precious time.`, `蘇晴が自らのキャリアを賭けて貴重な時間を稼いでくれた。`),
            choices: [
                makeChoice(txt(`⚔️ 绝不辜负她——立即执行修改`, `⚔️ Don't let her down — execute the fix now`, `⚔️ 彼女を裏切らない——今すぐ修正実行`), 'ch3_start', { truthRevealed: true, trustMystery: 2, savedTimelines: 2, relationship_sq: 3 }, 'empathy', txt(`为了那些信任你的人。`, `For those who trust you.`, `君を信じる人のために。`), 'perfect')
            ]
        }
    },
    startScene: 'ch3_start'
};

// ========== 第四章：终极对话 ==========
const ch4 = {
    id: 'ch4',
    titleKey: 'ch4Title',
    subtitleKey: 'ch4Sub',
    scenes: {
        ch4_start: {
            messages: [
                makeNarrator(txt(
                    `一切结束后，你独自坐在天台上。城市的灯火在你脚下蔓延，像一片发光的海。`,
                    `After everything, you sit alone on the rooftop. City lights spread beneath you like a sea of glow.`,
                    `全てが終わった後、屋上一人で座る。街の灯りが足元に広がり、光の海のようだ。`
                )),
                makeCharacter('my', txt(
                    `📩 「你做得很好。比原来的我做得好得多。」`,
                    `📩 "You did very well. Far better than the original me."`,
                    `📩 「よくやった。本来の俺よりずっと上手くやった。」`
                )),
                makeCharacter('lk', txt(
                    `「你到底是什么？未来的我？还是别的什么？」`,
                    `"What exactly are you? Future me? Or something else?"`,
                    `「君は一体何？未来の俺？それとも別の何か？」`
                )),
                makeCharacter('my', txt(
                    `📩 「我是一个可能性的残留。在那个时间线上，我没有及时阻止深瞳。数十亿人死亡。我用毕生的精力建造了这个时间通信器——只为了回到这一天，告诉当年的自己做正确的事。\n📩 现在，你做到了。所以我也……可以消失了。」`,
                    `📩 "I am a remnant of a possibility. In that timeline, I failed to stop DeepPupil in time. Billions died. I spent my life building this temporal communicator — just to return to this day and tell my younger self to do the right thing.\n📩 Now, you have succeeded. So I too... can disappear."`,
                    `📩 「私は一つの可能性の残滓だ。あのタイムラインでは、深瞳を止めるのが間に合わなかった。数十億人が死亡した。生涯かけてこの時間通信機を建造した——ただこの日に戻り、若き自分に正しいことをさせるために。\n📩 今、君は成功した。だから私も……消えることができる。」`
                ))
            ],
            playerReply: txt(`等等——消失是什么意思？`, `Wait — what do you mean 'disappear'?`, `待って——消失ってどういう意味？`),
            choices: [
                makeChoice(txt(`💬 「别走！我还有问题想问你」`, `💬 "Don't go! I still have questions"`, `💬 「行かないで！聞きたいことがある」`), 'ch4_stay', { ultimateQuestion: true, trustMystery: 4 }, 'truth', txt(`你不想让他就这样离开。`, `You don't want him to leave like this.`, `このまま去らせたくない。`), 'perfect'),
                makeChoice(txt(`👋 「……再见。谢谢你所做的一切」`, `👋 "...Goodbye. Thank you for everything"`, `👋 「……さようなら。全てに感謝する」`), 'ch4_goodbye', { trustMystery: 3 }, 'empathy', txt(`体面地道别。`, `Say goodbye with dignity.`, `立派に別れを告げる。`), 'good')
            ]
        },
        ch4_stay: {
            messages: [
                makeCharacter('lk', txt(
                    `「如果这一切改变了……那你还会存在吗？如果我成功了，你的时间线还会发生吗？」`,
                    `"If all this changed... will you still exist? If I succeed, will your timeline still happen?"`,
                    `「もし全てが変わったら……君はまだ存在するのか？俺が成功したら、君のタイムラインはまだ起こるのか？」`
                )),
                makeCharacter('my', txt(
                    `📩 「好问题。答案是：我不知道。也许我会消失。也许我会变成另一个平行世界的我。\n📩 但有一点我可以确定——不管发生什么，我都不会后悔。因为看到你做出的选择……我看到当年的自己，做出了更好的选择。\n📩 这就够了。」`,
                    `📩 "Good question. The answer is: I don't know. Maybe I'll disappear. Maybe I'll become another parallel world's me.\n📩 But one thing I'm certain — no matter what happens, I won't regret it. Because seeing the choices you made... I saw my younger self make better choices.\n📩 That's enough."`,
                    `📩 「いい質問だ。答えは：分からない。消えるかもしれない。別の並行世界の俺になるかもしれない。\n📩 でも一つだけ確かなことがある——何が起きても、後悔はしない。君の選択を見て……若き自分がもっと良い選択をしたのを見たから。\n📅 それだけで十分だ。」`
                )),
                makeNarrator(txt(
                    `屏幕渐渐暗下去。最后一条消息停留了很久，然后慢慢淡出。`,
                    `The screen slowly dims. The last message stays for a long time, then fades out.`,
                    `画面が徐々に暗くなる。最後のメッセージが長く留まり、ゆっくりとフェードアウトする。`
                )),
                makeCharacter('my', txt(
                    `📩 最后一条信息：「活下去。好好活着。替我看那些我没来得及看的风景。——来自另一个你。」`,
                    `📩 Final message: "Live. Live well. See the sights I never got to see. — From another you."`,
                    `📩 最後のメッセージ：「生きろ。よく生きろ。私が見られなかった景色を見てくれ。——もう一人の君より。」`
                ))
            ],
            isEnding: true,
            endingId: 'hidden',
            endingTitleKey: 'ending4Title',
            endingDescKey: 'ending4Desc'
        },
        ch4_goodbye: {
            messages: [
                makeCharacter('lk', txt(
                    `「……再见。」`,
                    `"...Goodbye."`,
                    `「……さようなら。」`
                )),
                makeCharacter('my', txt(
                    `📩 「再见，林凯。谢谢你给了我第二次机会。——来自过去的你。」`,
                    `📩 "Goodbye, Lin Kai. Thank you for giving me a second chance. — From the you of the past."`,
                    `📩 「さらば林凪。二度目の機会をくれてありがとう。——過去の君より。」`
                )),
                makeNarrator(txt(
                    `信号消失了。城市依然明亮，车流依然喧嚣。但你知道——在这个平行于无数可能的夜晚，有一条时间线因为你的选择而被永远改变了。`,
                    `The signal fades. The city remains bright, traffic still noisy. But you know — on this night parallel to countless possibilities, one timeline was forever changed by your choice.`,
                    `信号が消えた。街は明るく、交通 noise は相変わらず騒がしい。でも分かっている——無数の可能性と並行するこの夜、一つのタイムラインが君の選択によって永遠に変えられたのだ。`
                ))
            ],
            isEnding: true,
            endingId: 'good',
            endingTitleKey: 'ending2Title',
            endingDescKey: 'ending2Desc'
        }
    },
    startScene: 'ch4_start'
};

// 推入全局章节集合
window.STORY_CHAPTERS = window.STORY_CHAPTERS || [];
window.STORY_CHAPTERS.push(ch1, ch2, ch3, ch4);
