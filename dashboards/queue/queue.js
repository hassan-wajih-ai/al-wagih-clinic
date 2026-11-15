/**
 * منطق شاشة الانتظار والنداء الآلي الذكي (Smart TV Queue Controller)
 * يشمل: نداء صوتي آلي ثنائي النغمة (Web Audio API Chime) وتحويل النص إلى صوت بالعربية (Web Speech Synthesis)
 */

const QueueApp = {
    audioContext: null,
    isMuted: false,
    volume: 1.0,
    activeCalling: [],
    upcomingQueue: [],

    init() {
        this.startClock();
        this.loadQueueData();
        this.renderQueue();

        // ربط مفتاح التحديث الدوري أو استقبال الأحداث
        setInterval(() => this.simulateQueueUpdate(), 30000);
    },

    startClock() {
        const update = () => {
            const now = new Date();
            const timeEl = document.getElementById('live-clock');
            const dateEl = document.getElementById('live-date');
            
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
        };
        update();
        setInterval(update, 1000);
    },

    loadQueueData() {
        // الحالات الحالية في غرف الكشف (Now Serving)
        this.activeCalling = [
            {
                ticket: 'A-101',
                patient_name: 'أحمد سعيد عبد الله',
                clinic: 'عيادة الباطنة والقلب',
                doctor: 'د. أحمد الشناوي',
                room: 'غرفة 1',
                called_at: 'الآن',
                status: 'in_consultation'
            },
            {
                ticket: 'B-204',
                patient_name: 'مريم عادل خليل',
                clinic: 'عيادة الأطفال وحديثي الولادة',
                doctor: 'د. سارة محمود',
                room: 'غرفة 3',
                called_at: 'منذ دقيقة',
                status: 'in_consultation'
            },
            {
                ticket: 'C-305',
                patient_name: 'يوسف حسام الشريف',
                clinic: 'عيادة جراحة العظام والمفاصل',
                doctor: 'د. كريم عبد العزيز',
                room: 'غرفة 2',
                called_at: 'منذ 3 دقائق',
                status: 'in_consultation'
            },
            {
                ticket: 'L-801',
                patient_name: 'طارق حسام مصطفى',
                clinic: 'المختبر وسحب العينات (LIS)',
                doctor: 'أ. هاني عثمان (أخصائي التحاليل)',
                room: 'معمل 1',
                called_at: 'منذ 5 دقائق',
                status: 'in_consultation'
            }
        ];

        // الحالات التالية في صالة الانتظار (Next in Line)
        this.upcomingQueue = [
            { ticket: 'A-102', patient_name: 'خالد مصطفى العوضي', clinic: 'عيادة الباطنة', room: 'غرفة 1', wait_time: '5 دقائق' },
            { ticket: 'B-205', patient_name: 'ياسمين عبد الرحمن', clinic: 'عيادة الأطفال', room: 'غرفة 3', wait_time: '10 دقائق' },
            { ticket: 'C-306', patient_name: 'حامد زكريا النمر', clinic: 'عيادة العظام', room: 'غرفة 2', wait_time: '15 دقيقة' },
            { ticket: 'R-401', patient_name: 'كمال نبيل صقر', clinic: 'الأشعة والتصوير (RIS)', room: 'غرفة الرنين MRI', wait_time: '20 دقيقة' },
            { ticket: 'A-103', patient_name: 'سلوى محمود شاهين', clinic: 'عيادة الباطنة', room: 'غرفة 1', wait_time: '25 دقيقة' }
        ];
    },

    renderQueue() {
        // 1. رسم غرف الكشف الحالية
        const nowServingContainer = document.getElementById('now-serving-container');
        if (nowServingContainer) {
            nowServingContainer.innerHTML = this.activeCalling.map((item, idx) => `
                <div class="active-calling-card bg-slate-900 rounded-3xl border-2 p-5 shadow-2xl relative overflow-hidden transition-all duration-300">
                    <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                        <span class="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>بالغرفة الآن</span>
                        </span>
                        <span class="text-sm font-black text-sky-400 bg-sky-950/60 border border-sky-800/40 px-3 py-1 rounded-xl font-mono">
                            ${item.room}
                        </span>
                    </div>

                    <div class="flex items-baseline justify-between my-2">
                        <div>
                            <span class="text-xs text-slate-400 block font-medium">رقم التذكرة:</span>
                            <div class="text-4xl sm:text-5xl font-black font-mono tracking-wider text-white">
                                ${item.ticket}
                            </div>
                        </div>
                        <button onclick="QueueApp.announceTicket('${item.ticket}', '${item.clinic}', '${item.room}')" class="btn-press p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold border border-slate-700 flex items-center gap-1 shadow-sm" title="إعادة النداء الصوتي">
                            <span>🔊 نداء</span>
                        </button>
                    </div>

                    <div class="mt-4 pt-3 border-t border-slate-800/80 space-y-1">
                        <div class="text-sm font-black text-slate-200">${item.clinic}</div>
                        <div class="text-xs text-slate-400 flex items-center justify-between">
                            <span>الطبيب: ${item.doctor}</span>
                            <span class="text-emerald-400 font-bold">${item.patient_name}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // 2. رسم قائمة الانتظار التالية
        const upcomingList = document.getElementById('upcoming-queue-list');
        const countBadge = document.getElementById('waiting-count');
        if (countBadge) countBadge.textContent = `${this.upcomingQueue.length} بالانتظار`;

        if (upcomingList) {
            if (this.upcomingQueue.length === 0) {
                upcomingList.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">لا توجد حالات انتظار إضافية حالياً.</div>`;
            } else {
                upcomingList.innerHTML = this.upcomingQueue.map(item => `
                    <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
                        <div class="flex items-center gap-3">
                            <span class="text-base font-black font-mono text-amber-400 bg-amber-950/40 border border-amber-900/30 px-2.5 py-1 rounded-xl">
                                ${item.ticket}
                            </span>
                            <div>
                                <div class="text-xs font-bold text-white">${item.patient_name}</div>
                                <div class="text-[11px] text-slate-400">${item.clinic} • ${item.room}</div>
                            </div>
                        </div>
                        <span class="text-[11px] text-slate-500 font-mono">${item.wait_time}</span>
                    </div>
                `).join('');
            }
        }
    },

    /**
     * إطلاق نغمة رنين الجرس المستشفى الأنيقة (Airport / Hospital 2-Tone Chime)
     */
    playChime() {
        if (this.isMuted) return Promise.resolve();

        return new Promise((resolve) => {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return resolve();

                if (!this.audioContext) {
                    this.audioContext = new AudioContext();
                }

                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }

                const ctx = this.audioContext;
                const now = ctx.currentTime;

                // النغمة الأولى (Tone 1: 523.25 Hz - C5)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(523.25, now);
                gain1.gain.setValueAtTime(0.3 * this.volume, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(now);
                osc1.stop(now + 0.6);

                // النغمة الثانية (Tone 2: 659.25 Hz - E5)
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(659.25, now + 0.25);
                gain2.gain.setValueAtTime(0.35 * this.volume, now + 0.25);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now + 0.25);
                osc2.stop(now + 1.2);

                setTimeout(resolve, 900);
            } catch (e) {
                resolve();
            }
        });
    },

    /**
     * النداء الصوتي الآلي الذكي باللغة العربية عبر Web Speech API
     */
    async announceTicket(ticket, clinic, room) {
        if (this.isMuted) return;

        // 1. تشغيل جرس التنبيه أولاً
        await this.playChime();

        // 2. النداء الصوتي باللغة العربية
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // إلغاء أي نداء سابق

            // تجزئة رمز التذكرة لنطق سليم (مثال: A-101 -> ألف مائة وواحد)
            const ticketClean = ticket.replace('-', ' ');
            const textToSpeak = `تذكرة رقم ${ticketClean}، ${clinic}، ${room}`;

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.85; // سرعة هادئة وواضحة
            utterance.pitch = 1.0;
            utterance.volume = this.volume;

            // اختيار صوت عربي مناسب إن وجد
            const voices = window.speechSynthesis.getVoices();
            const arabicVoice = voices.find(v => v.lang.includes('ar') || v.name.includes('Arabic'));
            if (arabicVoice) {
                utterance.voice = arabicVoice;
            }

            window.speechSynthesis.speak(utterance);
        }

        Utils.showToast(`📢 نداء: تذكرة ${ticket} إلى ${room}`, 'info');
    },

    /**
     * استدعاء الحالة التالية بالصوت والشاشة
     */
    callNextRandom() {
        if (this.upcomingQueue.length === 0) {
            Utils.showToast('لا توجد حالات إضافية في قائمة الانتظار', 'warning');
            return;
        }

        const next = this.upcomingQueue.shift();
        const targetActive = this.activeCalling.find(a => a.room === next.room) || this.activeCalling[0];

        targetActive.ticket = next.ticket;
        targetActive.patient_name = next.patient_name;
        targetActive.clinic = next.clinic;
        targetActive.called_at = 'الآن';

        this.renderQueue();
        this.announceTicket(next.ticket, next.clinic, next.room);
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('mute-toggle-btn');
        const icon = document.getElementById('mute-icon');
        if (this.isMuted) {
            if (btn) btn.className = 'btn-press p-2.5 rounded-xl bg-slate-800 text-rose-400 border border-slate-700';
            if (icon) icon.textContent = '🔇';
            Utils.showToast('تم كتم النداء الصوتي للشاشة', 'warning');
        } else {
            if (btn) btn.className = 'btn-press p-2.5 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700';
            if (icon) icon.textContent = '🔊';
            Utils.showToast('تم تفعيل النداء الصوتي للشاشة بنجاح', 'success');
        }
    },

    setVolume(val) {
        this.volume = parseFloat(val);
    },

    simulateQueueUpdate() {
        // تحديث أوقات الانتظار تلقائياً
        this.renderQueue();
    }
};

window.QueueApp = QueueApp;
document.addEventListener('DOMContentLoaded', () => QueueApp.init());
