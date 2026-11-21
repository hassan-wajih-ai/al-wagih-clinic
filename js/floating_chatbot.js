/**
 * Al Wagih Clinic - Floating Reception Chatbot Widget
 * روبوت الاستقبال ومساعد المريض الذكي العائم
 */
(function() {
    if (typeof window === 'undefined') return;

    function initFloatingChatbot() {
        if (document.getElementById('alwagih-floating-chatbot-container')) return;

        const container = document.createElement('div');
        container.id = 'alwagih-floating-chatbot-container';
        container.className = 'fixed bottom-5 left-5 z-50 font-sans';
        container.dir = 'rtl';

        container.innerHTML = `
            <!-- Chatbot Window -->
            <div id="alwagih-chatbot-window" class="hidden flex flex-col w-[350px] sm:w-[380px] h-[520px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-3 transition-all duration-300">
                <!-- Header -->
                <div class="p-4 bg-gradient-to-r from-indigo-600 to-sky-600 text-white flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg shadow-inner">
                            🤖
                        </div>
                        <div>
                            <h4 class="text-xs font-black leading-tight">مساعد الوجيه الذكي</h4>
                            <p class="text-[10px] text-indigo-100 flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>متصل 24/7 للرد الفوري</span>
                            </p>
                        </div>
                    </div>
                    <button type="button" onclick="window.AlWagihChatbot.toggle()" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition">
                        ✕
                    </button>
                </div>

                <!-- Chat Stream -->
                <div id="alwagih-chatbot-stream" class="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs bg-slate-50/50 dark:bg-slate-950/50">
                    <div class="flex justify-start">
                        <div class="max-w-[85%] rounded-2xl p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm leading-relaxed rounded-tr-none">
                            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1">🤖 مساعد الاستقبال</span>
                            مرحباً بك في مركز الوجيه الطبي التخصصي! 🏥<br>
                            أنا هنا لمساعدتك في مواعيد العيادات، تعليمات التحاليل والأشعة، أو تأكيد موعد كشفك.
                        </div>
                    </div>

                    <!-- Quick Suggestions -->
                    <div class="space-y-1.5 pt-1">
                        <span class="text-[10px] font-bold text-slate-400 block">أسئلة شائعة وسريعة:</span>
                        <div class="flex flex-wrap gap-1.5">
                            <button type="button" onclick="window.AlWagihChatbot.askPreset('ما هي مواعيد عيادات الباطنة والقلب؟')" class="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200/60 dark:border-indigo-800/60 transition">
                                🩺 مواعيد العيادات
                            </button>
                            <button type="button" onclick="window.AlWagihChatbot.askPreset('ما هي شروط الصيام لتحليل السكر الصائم ووظائف الكلى؟')" class="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-[10px] font-semibold border border-sky-200/60 dark:border-sky-800/60 transition">
                                🧪 شروط صيام التحاليل
                            </button>
                            <button type="button" onclick="window.AlWagihChatbot.askPreset('هل فحص الرنين المغناطيسي بالصبغة يحتاج وظائف كلى؟')" class="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200/60 dark:border-purple-800/60 transition">
                                🩻 تعليمات أشعة الصبغة
                            </button>
                            <button type="button" onclick="window.AlWagihChatbot.askPreset('أريد تأكيد موعد حجزي غداً')" class="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200/60 dark:border-emerald-800/60 transition">
                                ⏱️ تأكيد الحجز (صفر غياب)
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Input Footer -->
                <form id="alwagih-chatbot-form" onsubmit="window.AlWagihChatbot.submit(event)" class="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <input type="text" id="alwagih-chatbot-input" placeholder="اكتب استفسارك هنا..." class="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <button type="submit" class="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center text-sm shadow-md transition">
                        ➤
                    </button>
                </form>
            </div>

            <!-- Floating Toggle Button -->
            <button type="button" id="alwagih-chatbot-toggle-btn" onclick="window.AlWagihChatbot.toggle()" class="btn-press flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all border border-indigo-400/40">
                <span class="text-base">💬</span>
                <span>المساعد الطبي الذكي</span>
            </button>
        `;

        document.body.appendChild(container);
    }

    const AlWagihChatbot = {
        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initFloatingChatbot);
            } else {
                initFloatingChatbot();
            }
        },

        toggle() {
            const win = document.getElementById('alwagih-chatbot-window');
            if (win) {
                const isHidden = win.classList.contains('hidden');
                win.classList.toggle('hidden', !isHidden);
                if (isHidden) {
                    const input = document.getElementById('alwagih-chatbot-input');
                    if (input) input.focus();
                }
            }
        },

        askPreset(question) {
            const input = document.getElementById('alwagih-chatbot-input');
            if (input) {
                input.value = question;
                this.submit({ preventDefault: () => {} });
            }
        },

        submit(e) {
            if (e && e.preventDefault) e.preventDefault();
            const input = document.getElementById('alwagih-chatbot-input');
            const stream = document.getElementById('alwagih-chatbot-stream');
            if (!input || !input.value.trim() || !stream) return;

            const userText = input.value.trim();
            input.value = '';

            // Append user bubble
            const userBubble = document.createElement('div');
            userBubble.className = 'flex justify-end';
            userBubble.innerHTML = `
                <div class="max-w-[85%] rounded-2xl p-2.5 bg-indigo-600 text-white font-medium text-xs shadow-sm leading-relaxed rounded-tl-none">
                    ${userText}
                </div>
            `;
            stream.appendChild(userBubble);
            stream.scrollTop = stream.scrollHeight;

            // Bot response
            setTimeout(() => {
                let answer = 'شكراً لتواصلك! يمكنك التواصل مباشرة مع قسم الاستقبال لحجز كشفك أو الاستفسار عن حالتك على مدار الساعة.';
                if (typeof window.EnterpriseSystems !== 'undefined' && window.EnterpriseSystems.zeroNoShow) {
                    answer = window.EnterpriseSystems.zeroNoShow.askChatbot(userText);
                }

                const botBubble = document.createElement('div');
                botBubble.className = 'flex justify-start';
                botBubble.innerHTML = `
                    <div class="max-w-[85%] rounded-2xl p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm leading-relaxed rounded-tr-none">
                        <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1">🤖 مساعد الوجيه الذكي</span>
                        ${answer}
                    </div>
                `;
                stream.appendChild(botBubble);
                stream.scrollTop = stream.scrollHeight;
            }, 300);
        }
    };

    window.AlWagihChatbot = AlWagihChatbot;
    AlWagihChatbot.init();
})();
