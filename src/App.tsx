// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  User,
  Briefcase,
  Building2,
  Video,
  MapPin,
  ChevronRight,
  Send,
  Sparkles,
  Users,
  Plus,
  Trash2,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Search,
  RefreshCw,
} from 'lucide-react';

// 初期面接空き枠データ
const INITIAL_SLOTS = [
  { id: 'slot-1', date: '明日 10:00〜10:30', active: true, capacity: 1 },
  { id: 'slot-2', date: '明日 14:00〜14:30', active: true, capacity: 1 },
  { id: 'slot-3', date: '明日 16:30〜17:00', active: true, capacity: 1 },
  { id: 'slot-4', date: '明後日 11:00〜11:30', active: true, capacity: 1 },
  { id: 'slot-5', date: '明後日 15:00〜15:30', active: true, capacity: 1 },
  { id: 'slot-6', date: '今週金曜 13:00〜13:30', active: false, capacity: 1 },
];

// 初期応募者データ
const INITIAL_APPLICANTS = [
  {
    id: 'APP-20261112-01',
    name: '佐藤 健太',
    phone: '090-1234-5678',
    email: 'k.sato@example.com',
    source: 'Indeed',
    status: '面接確定',
    answers: {
      store: '新宿本店（駅徒歩2分）',
      shifts: '週3〜4日（土日含む）',
      startTiming: '即日〜1週間以内',
      experience: '接客・販売の経験あり（2年）',
    },
    interviewDate: '明日 14:00〜14:30',
    interviewType: 'Web面接（Zoom）',
    meetingUrl: 'https://zoom.us/j/98412039481',
    appliedAt: '10分前',
    chatLog: [
      { sender: 'bot', text: 'ご応募ありがとうございます！まずお名前とご連絡先を教えてください。' },
      { sender: 'user', text: '佐藤 健太 / 090-1234-5678' },
      { sender: 'bot', text: 'ご希望の勤務店舗を選んでください。' },
      { sender: 'user', text: '新宿本店（駅徒歩2分）' },
      { sender: 'bot', text: 'ご希望のシフト日数はどのくらいですか？' },
      { sender: 'user', text: '週3〜4日（土日含む）' },
      { sender: 'bot', text: '面接希望日時を選択してください。' },
      { sender: 'user', text: '明日 14:00〜14:30（Web面接）' },
    ],
  },
  {
    id: 'APP-20261112-02',
    name: '高橋 美咲',
    phone: '080-9876-5432',
    email: 'm.takahashi@example.com',
    source: 'Indeed',
    status: '日程未確定',
    answers: {
      store: '渋谷スクランブル店',
      shifts: '週2〜3日（平日夕方中心）',
      startTiming: '来月から',
      experience: '未経験',
    },
    interviewDate: '未予約',
    interviewType: '-',
    meetingUrl: '',
    appliedAt: '1時間前',
    chatLog: [
      { sender: 'bot', text: 'ご応募ありがとうございます！まずお名前とご連絡先を教えてください。' },
      { sender: 'user', text: '高橋 美咲 / 080-9876-5432' },
    ],
  },
];

// チャットボットの質問ステップ定義
const BOT_QUESTIONS = [
  {
    key: 'store',
    question: 'ご希望の勤務店舗を選択してください。',
    options: ['新宿本店（駅徒歩2分）', '渋谷スクランブル店', '池袋東口店', 'どの店舗でも可'],
  },
  {
    key: 'shifts',
    question: 'ご希望のシフト勤務日数はどのくらいですか？',
    options: ['週4〜5日（フルタイム希望）', '週3〜4日（土日含む）', '週2〜3日（扶養内・学業両立）', 'まずは相談したい'],
  },
  {
    key: 'startTiming',
    question: 'いつ頃から勤務開始できますか？',
    options: ['即日〜1週間以内', '2週間〜1ヶ月以内', '来月から', '面接時に相談'],
  },
  {
    key: 'experience',
    question: '関連業務（接客・サービス業など）のご経験はありますか？',
    options: ['経験あり（1年以上）', '少し経験あり（1年未満）', '未経験（イチから覚えたい）'],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('applicant'); // 'applicant' | 'admin'
  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [applicants, setApplicants] = useState(INITIAL_APPLICANTS);

  // URLパラメータから応募者名を取得（Indeedメール連携用）
  const [urlApplicantName, setUrlApplicantName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameParam = params.get('name');
    if (nameParam) {
      setUrlApplicantName(nameParam);
      setApplicantForm((prev) => ({ ...prev, name: nameParam }));
    }
  }, []);

  // --- 応募者チャットボット用ステート ---
  const [step, setStep] = useState(0); // 0: プロフィール入力, 1..4: 質問, 5: 日程選択, 6: 面接形式, 7: 完了
  const [applicantForm, setApplicantForm] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [answers, setAnswers] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [interviewType, setInterviewType] = useState('Web面接（Zoom）');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [completedTicket, setCompletedTicket] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const chatEndRef = useRef(null);

  // 初期メッセージのセット
  useEffect(() => {
    const greeting = urlApplicantName
      ? `${urlApplicantName}さん、Indeedからのご応募ありがとうございます！採用自動アシスタントです。`
      : 'ご応募ありがとうございます！採用自動アシスタントです。';

    setMessages([
      {
        id: 'init-1',
        sender: 'bot',
        text: `${greeting}\n約1分の簡単なチャットで面接日程の確定まで完了します。まずお名前とご連絡先を入力してください。`,
      },
    ]);
  }, [urlApplicantName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, step]);

  // ボットメッセージ追加ヘルパー（タイピング演出付き）
  const pushBotMessage = (text, nextStep) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}-${Math.random()}`, sender: 'bot', text },
      ]);
      if (nextStep !== undefined) {
        setStep(nextStep);
      }
    }, 550);
  };

  // ワンクリック自動入力デモ用
  const fillDemoProfile = () => {
    setApplicantForm({
      name: urlApplicantName || '山田 太郎',
      phone: '090-5555-7777',
      email: 'taro.yamada@example.com',
    });
  };

  // ステップ0：プロフィール送信
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!applicantForm.name.trim() || !applicantForm.phone.trim()) return;

    const userText = `氏名：${applicantForm.name}\n電話：${applicantForm.phone}${
      applicantForm.email ? `\nメール：${applicantForm.email}` : ''
    }`;

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: userText }]);
    pushBotMessage(
      `${applicantForm.name}さん、ありがとうございます！続いて4つの簡単な質問にお答えください。\n\n【質問 1/4】\n${BOT_QUESTIONS[0].question}`,
      1
    );
  };

  // ステップ1〜4：選択肢タップ回答
  const handleOptionSelect = (optionText) => {
    const currentQIndex = step - 1;
    const currentQuestion = BOT_QUESTIONS[currentQIndex];

    const updatedAnswers = { ...answers, [currentQuestion.key]: optionText };
    setAnswers(updatedAnswers);

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: optionText }]);

    if (currentQIndex + 1 < BOT_QUESTIONS.length) {
      const nextQ = BOT_QUESTIONS[currentQIndex + 1];
      pushBotMessage(
        `承知いたしました！\n\n【質問 ${currentQIndex + 2}/4】\n${nextQ.question}`,
        step + 1
      );
    } else {
      pushBotMessage(
        'ご回答ありがとうございます！条件にマッチしています。\n続いて、ご希望の面接日時を以下からお選びください。',
        5
      );
    }
  };

  // ステップ5：面接日時選択
  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: slot.date }]);
    pushBotMessage('ご希望の面接方法を選択してください。', 6);
  };

  // ステップ6：面接形式選択 → 予約確定
  const handleConfirmBooking = (type) => {
    setInterviewType(type);
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: type }]);

    const newId = `APP-20261112-0${applicants.length + 1}`;
    const zoomUrl = type.includes('Web') ? `https://zoom.us/j/${Math.floor(10000000000 + Math.random() * 90000000000)}` : '';

    const newApplicantRecord = {
      id: newId,
      name: applicantForm.name,
      phone: applicantForm.phone,
      email: applicantForm.email || '未入力',
      source: 'Indeed（チャット経由）',
      status: '面接確定',
      answers,
      interviewDate: selectedSlot.date,
      interviewType: type,
      meetingUrl: zoomUrl,
      appliedAt: 'たった今',
      chatLog: [
        ...messages.map((m) => ({ sender: m.sender, text: m.text })),
        { sender: 'user', text: type },
      ],
    };

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setApplicants((prev) => [newApplicantRecord, ...prev]);
      setCompletedTicket(newApplicantRecord);
      setStep(7);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-done-${Date.now()}`,
          sender: 'bot',
          text: `ご予約が確定しました！\n当日お会いできるのを楽しみにしております。`,
        },
      ]);
    }, 650);
  };

  // チャットリセット
  const resetChat = () => {
    setStep(0);
    setApplicantForm({ name: urlApplicantName || '', phone: '', email: '' });
    setAnswers({});
    setSelectedSlot(null);
    setCompletedTicket(null);
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'bot',
        text: 'ご応募ありがとうございます！採用自動アシスタントです。\n約1分の簡単なチャットで面接日程の確定まで完了します。まずお名前とご連絡先を入力してください。',
      },
    ]);
  };

  // --- 採用担当者管理画面用ステート ---
  const [adminSubTab, setAdminSubTab] = useState('applicants'); // 'applicants' | 'slots'
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [newSlotText, setNewSlotText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSlotActive = (slotId) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, active: !s.active } : s))
    );
  };

  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!newSlotText.trim()) return;
    setSlots((prev) => [
      ...prev,
      { id: `slot-${Date.now()}`, date: newSlotText.trim(), active: true, capacity: 1 },
    ]);
    setNewSlotText('');
  };

  const handleDeleteSlot = (slotId) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const activeSlots = slots.filter((s) => s.active);

  const filteredApplicants = applicants.filter(
    (app) =>
      app.name.includes(searchQuery) ||
      app.answers?.store?.includes(searchQuery) ||
      app.status.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* 上部ナビゲーションバー（モード切替） */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight">
                面接オートボット <span className="text-xs font-normal text-indigo-300 ml-1">ATS連携版</span>
              </h1>
              <p className="text-[11px] text-slate-400">Indeed応募自動対応・日程調整システム</p>
            </div>
          </div>

          {/* 画面切り替えタブ */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('applicant')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'applicant'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              応募者画面（チャット）
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              採用担当者管理画面
              <span className="ml-1 bg-white/20 text-white text-[11px] px-1.5 py-0.2 rounded-full">
                {applicants.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'applicant' ? (
          /* ================= 応募者チャットボット画面 ================= */
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-120px)] min-h-[580px]">
            {/* チャットヘッダー */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative">
                  <Sparkles className="w-5 h-5 text-white" />
                  <span className="w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-600 rounded-full absolute bottom-0 right-0"></span>
                </div>
                <div>
                  <div className="font-bold text-sm">株式会社サンプル 採用窓口</div>
                  <div className="text-[11px] text-indigo-100 flex items-center gap-1">
                    ● オンライン（24時間自動面接予約）
                  </div>
                </div>
              </div>
              <button
                onClick={resetChat}
                title="最初からやり直す"
                className="text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                リセット
              </button>
            </div>

            {/* 進捗バー */}
            <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between text-[11px] text-indigo-700 font-medium">
              <span>面接予約ステップ</span>
              <span>{Math.min(step + 1, 7)} / 7 完了</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5">
              <div
                className="bg-indigo-600 h-1.5 transition-all duration-500"
                style={{ width: `${(Math.min(step + 1, 7) / 7) * 100}%` }}
              ></div>
            </div>

            {/* メッセージ履歴エリア */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* タイピングインジケーター */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                </div>
              )}

              {/* 完了チケットカード */}
              {step === 7 && completedTicket && (
                <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 shadow-md space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm border-b border-slate-100 pb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    面接予約確定チケット
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-400">予約番号</span>
                      <span className="font-mono font-bold">{completedTicket.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">お名前</span>
                      <span className="font-bold">{completedTicket.name} 様</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">希望店舗</span>
                      <span className="font-medium">{completedTicket.answers.store}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">面接日時</span>
                      <span className="font-bold text-indigo-600">{completedTicket.interviewDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">面接形式</span>
                      <span className="font-medium">{completedTicket.interviewType}</span>
                    </div>
                  </div>

                  {completedTicket.meetingUrl ? (
                    <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 space-y-1.5">
                      <div className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" /> Web面接用URL（自動発行）
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200">
                        <span className="text-[11px] text-indigo-600 truncate font-mono">
                          {completedTicket.meetingUrl}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(completedTicket.meetingUrl);
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 shrink-0"
                        >
                          {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>当日はご希望店舗のスタッフ入口まで5分前にお越しください。</span>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveTab('admin')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    採用担当者管理画面で反映を確認する
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* 入力・選択肢アクションエリア */}
            {!isTyping && step < 7 && (
              <div className="p-3.5 bg-white border-t border-slate-200">
                {step === 0 && (
                  <form onSubmit={handleProfileSubmit} className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">プロフィール入力</span>
                      <button
                        type="button"
                        onClick={fillDemoProfile}
                        className="text-[11px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded font-medium transition"
                      >
                        ✨ ワンクリック自動入力
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="お名前（例：山田 太郎）"
                      value={applicantForm.name}
                      onChange={(e) => setApplicantForm({ ...applicantForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        required
                        placeholder="電話番号（必須）"
                        value={applicantForm.phone}
                        onChange={(e) => setApplicantForm({ ...applicantForm, phone: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="email"
                        placeholder="メール（任意）"
                        value={applicantForm.email}
                        onChange={(e) => setApplicantForm({ ...applicantForm, email: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      チャットを始める
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {step >= 1 && step <= 4 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-slate-400 font-medium mb-1">タップして回答を選択</div>
                    {BOT_QUESTIONS[step - 1].options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleOptionSelect(opt)}
                        className="w-full text-left px-3.5 py-2.5 text-sm bg-indigo-50/70 hover:bg-indigo-600 hover:text-white text-indigo-900 font-medium rounded-xl border border-indigo-200 transition flex items-center justify-between group"
                      >
                        <span>{opt}</span>
                        <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-white" />
                      </button>
                    ))}
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    <div className="text-[11px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> 空き面接枠（リアルタイム連動）
                    </div>
                    {activeSlots.length === 0 ? (
                      <div className="text-xs text-rose-500 py-3 text-center">
                        現在選択可能な空き枠がありません。管理画面から枠を追加してください。
                      </div>
                    ) : (
                      activeSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotSelect(slot)}
                          className="w-full text-left px-3.5 py-2.5 text-sm bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-900 font-bold rounded-xl border border-emerald-200 transition flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600 group-hover:text-white" />
                            {slot.date}
                          </span>
                          <span className="text-xs bg-white/80 text-emerald-700 px-2 py-0.5 rounded-full">
                            予約可
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {step === 6 && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleConfirmBooking('Web面接（Zoom）')}
                      className="p-3 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-900 rounded-xl border border-indigo-200 transition flex flex-col items-center gap-1.5 text-center group"
                    >
                      <Video className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                      <span className="text-xs font-bold">Web面接（Zoom）</span>
                      <span className="text-[10px] opacity-75">スマホで自宅から参加</span>
                    </button>
                    <button
                      onClick={() => handleConfirmBooking('対面面接（店舗来社）')}
                      className="p-3 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-900 rounded-xl border border-amber-200 transition flex flex-col items-center gap-1.5 text-center group"
                    >
                      <Building2 className="w-6 h-6 text-amber-600 group-hover:text-white" />
                      <span className="text-xs font-bold">対面面接（来社）</span>
                      <span className="text-[10px] opacity-75">希望店舗へ直接来社</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================= 採用担当者管理画面（ATS） ================= */
          <div className="space-y-6">
            {/* サマリーカード */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">総応募者数</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{applicants.length} 名</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">面接日程 確定済み</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {applicants.filter((a) => a.status === '面接確定').length} 名
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">チャット予約完了率</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">
                  {Math.round(
                    (applicants.filter((a) => a.status === '面接確定').length / applicants.length) *
                      100
                  )}
                  %
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">公開中の面接空き枠</div>
                <div className="text-2xl font-bold text-amber-600 mt-1">{activeSlots.length} 枠</div>
              </div>
            </div>

            {/* 管理画面サブタブ */}
            <div className="flex border-b border-slate-200 gap-6">
              <button
                onClick={() => setAdminSubTab('applicants')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                  adminSubTab === 'applicants'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-4 h-4" />
                応募者一覧・予約状況
              </button>
              <button
                onClick={() => setAdminSubTab('slots')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                  adminSubTab === 'slots'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                面接空き枠（シフト）設定
              </button>
            </div>

            {adminSubTab === 'applicants' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 応募者リスト */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold text-sm text-slate-800">Indeed応募者一覧</h2>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="名前・店舗・ステータス検索"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredApplicants.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApplicant(app)}
                        className={`p-4 hover:bg-slate-50 cursor-pointer transition flex flex-wrap items-center justify-between gap-3 ${
                          selectedApplicant?.id === app.id ? 'bg-emerald-50/60' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{app.name}</span>
                            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {app.source}
                            </span>
                            <span className="text-[11px] text-slate-400">{app.appliedAt}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            希望：{app.answers?.store || '-'} ／ {app.answers?.shifts || '-'}
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <span
                            className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                              app.status === '面接確定'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {app.status}
                          </span>
                          <div className="text-xs font-bold text-indigo-600">
                            {app.interviewDate}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 応募者詳細・チャットログ */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  {selectedApplicant ? (
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <div className="text-xs text-slate-400 font-mono">{selectedApplicant.id}</div>
                        <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                          {selectedApplicant.name} 様
                        </h3>
                        <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                          <div>TEL：{selectedApplicant.phone}</div>
                          <div>Mail：{selectedApplicant.email}</div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
                        <div className="font-bold text-slate-700">事前アンケート回答</div>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-slate-400">希望店舗：</span>
                          <span className="col-span-2 font-medium">{selectedApplicant.answers?.store}</span>
                          <span className="text-slate-400">シフト：</span>
                          <span className="col-span-2 font-medium">{selectedApplicant.answers?.shifts}</span>
                          <span className="text-slate-400">開始時期：</span>
                          <span className="col-span-2 font-medium">{selectedApplicant.answers?.startTiming}</span>
                          <span className="text-slate-400">経験：</span>
                          <span className="col-span-2 font-medium">{selectedApplicant.answers?.experience}</span>
                        </div>
                      </div>

                      {selectedApplicant.meetingUrl && (
                        <div className="bg-indigo-50 p-3 rounded-xl text-xs space-y-1">
                          <div className="font-bold text-indigo-800">発行済みWeb面接URL</div>
                          <a
                            href={selectedApplicant.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 underline flex items-center gap-1 break-all"
                          >
                            {selectedApplicant.meetingUrl}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-bold text-slate-700 mb-2">チャット応答履歴</div>
                        <div className="space-y-2 max-h-56 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {selectedApplicant.chatLog.map((log, i) => (
                            <div
                              key={i}
                              className={`text-[11px] p-2 rounded-lg ${
                                log.sender === 'user'
                                  ? 'bg-indigo-600 text-white ml-6'
                                  : 'bg-white border border-slate-200 text-slate-700 mr-6'
                              }`}
                            >
                              {log.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
                      <Users className="w-8 h-8 mb-2 opacity-40" />
                      左の一覧から応募者をクリックすると
                      <br />
                      事前アンケート結果とチャット履歴を確認できます
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 面接空き枠設定タブ */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 max-w-2xl">
                <div className="mb-4">
                  <h2 className="font-bold text-base text-slate-800">面接空き枠の受付設定</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ここでONになっている枠だけが、応募者チャットボットの日程選択肢にリアルタイム表示されます。
                  </p>
                </div>

                {/* 新規枠追加フォーム */}
                <form onSubmit={handleAddSlot} className="flex gap-2 mb-5">
                  <input
                    type="text"
                    placeholder="新しい面接枠を追加（例：来週月曜 11:00〜11:30）"
                    value={newSlotText}
                    onChange={(e) => setNewSlotText(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-1 transition"
                  >
                    <Plus className="w-4 h-4" />
                    枠を追加
                  </button>
                </form>

                {/* 枠一覧 */}
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                        slot.active
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={slot.active}
                          onChange={() => toggleSlotActive(slot.id)}
                          className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <span className="font-bold text-sm text-slate-800">{slot.date}</span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            slot.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {slot.active ? '受付中' : '停止中'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}