/**
 * نظام التقارير ومؤشرات الأداء والتصدير المتقدم (Universal Reports & Export Engine)
 * يدعم التصدير المباشر لـ Excel عبر SheetJS مع نظام Fallback تلقائي مدمج بدون أي اعتماديات خارجية
 * يشمل: تقارير الورديات، اليومية المالية، مطالبات الشركات، جرد المخازن، الـ CRM، والبصمة
 */

const Reports = {
    /**
     * محرك التنزيل والتصدير الموحد والمقاوم للأخطاء
     * يجرب SheetJS (XLSX) أولاً، وفي حال عدم توفر المكتبة أو حدوث خطأ، يقوم بإنشاء ملف Excel أصلي (HTML/XML Spreadsheet)
     * يدعم اللغة العربية RTL وترميز UTF-8 بالكامل بنسبة 100%
     */
    downloadExcel(filename, sheets) {
        if (!sheets || sheets.length === 0) {
            Utils.showToast('لا توجد بيانات متاحة للتصدير', 'warning');
            return;
        }

        const safeFilename = filename.endsWith('.xlsx') || filename.endsWith('.xls') ? filename : `${filename}.xlsx`;

        // 1. المحاولة الأولى: استخدام SheetJS إن كانت متوفرة
        if (typeof XLSX !== 'undefined') {
            try {
                const wb = XLSX.utils.book_new();
                sheets.forEach(sh => {
                    const ws = XLSX.utils.json_to_sheet(sh.data);
                    // ضبط اتجاه الورقة من اليمين لليسار RTL
                    if (!ws['!views']) ws['!views'] = [];
                    ws['!views'].push({ rightToLeft: true });
                    XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
                });

                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                this._triggerBlobDownload(blob, safeFilename);
                Utils.showToast(`تم تصدير ملف ${safeFilename} بنجاح`, 'success');
                return;
            } catch (err) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('SheetJS error, falling back to native Excel HTML engine:', err);
                }
            }
        }

        // 2. المحاولة البديلة التلقائية (Zero-Dependency Native Excel Fallback):
        // توليد جدول Excel بتنسيق HTML بمظهر احترافي ودعم كامل للغة العربية UTF-8
        try {
            let html = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <!--[if gte mso 9]>
                    <xml>
                        <x:ExcelWorkbook>
                            <x:ExcelWorksheets>
            `;

            sheets.forEach(sh => {
                html += `
                    <x:ExcelWorksheet>
                        <x:Name>${sh.name.replace(/[^\w\s\u0600-\u06FF]/g, '')}</x:Name>
                        <x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions>
                    </x:ExcelWorksheet>
                `;
            });

            html += `
                            </x:ExcelWorksheets>
                        </x:ExcelWorkbook>
                    </xml>
                    <![endif]-->
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
                        table { border-collapse: collapse; margin-bottom: 30px; width: 100%; direction: rtl; }
                        th { background-color: #0284c7; color: #ffffff; border: 1px solid #cbd5e1; padding: 10px; font-size: 13px; text-align: right; }
                        td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; text-align: right; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .title-row { font-size: 16px; font-weight: bold; background-color: #e0f2fe; color: #0369a1; }
                    </style>
                </head>
                <body dir="rtl">
            `;

            sheets.forEach(sh => {
                html += `<h2 style="color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 5px;">${sh.name}</h2>`;
                if (sh.data && sh.data.length > 0) {
                    const headers = Object.keys(sh.data[0]);
                    html += `<table><thead><tr>`;
                    headers.forEach(h => html += `<th>${h}</th>`);
                    html += `</tr></thead><tbody>`;

                    sh.data.forEach(row => {
                        html += `<tr>`;
                        headers.forEach(h => {
                            const val = row[h] !== undefined && row[h] !== null ? row[h] : '—';
                            html += `<td>${val}</td>`;
                        });
                        html += `</tr>`;
                    });

                    html += `</tbody></table><br/>`;
                }
            });

            html += `</body></html>`;

            const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const xlsFilename = safeFilename.replace(/\.xlsx$/i, '.xls');
            this._triggerBlobDownload(blob, xlsFilename);
            Utils.showToast(`تم تصدير ملف ${xlsFilename} بنجاح (وضع التوافق العالي)`, 'success');
        } catch (fallbackErr) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('All export methods failed:', fallbackErr);
            }
            Utils.showToast('تعذر التصدير: ' + fallbackErr.message, 'error');
        }
    },

    _triggerBlobDownload(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            if (typeof setTimeout !== 'undefined') {
                setTimeout(() => {
                    try {
                        if (link.parentNode) link.parentNode.removeChild(link);
                        if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
                            URL.revokeObjectURL(url);
                        }
                    } catch (e) {}
                }, 500);
            }
        } catch (e) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('Trigger blob download error:', e);
            }
        }
    },

    /**
     * 1. تصدير تقرير إغلاق وردية الاستقبال (8 ساعات)
     */
    exportShiftToExcel(shiftInfo, appointments) {
        try {
            const list = appointments || [];
            const totalCases = list.length;
            const completedCases = list.filter(a => a.status === 'completed' || a.status === 'confirmed').length;
            const totalCash = list
                .filter(a => (a.status === 'completed' || a.status === 'confirmed') && a.payment_type !== 'corporate')
                .reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const totalCorporate = list
                .filter(a => (a.status === 'completed' || a.status === 'confirmed') && a.payment_type === 'corporate')
                .reduce((sum, a) => sum + Number(a.company_claim_amount || a.amount || 0), 0);

            const summaryRows = [
                { 'البيان': 'اسم العيادة / المركز', 'القيمة / التفاصيل': shiftInfo.clinicName || 'عيادات الشفاء التخصصية' },
                { 'البيان': 'موظف الاستقبال المسؤول', 'القيمة / التفاصيل': shiftInfo.staffName || 'موظف الاستقبال' },
                { 'البيان': 'تاريخ الوردية', 'القيمة / التفاصيل': new Date().toLocaleDateString('ar-EG') },
                { 'البيان': 'إجمالي الحالات المسجلة', 'القيمة / التفاصيل': totalCases },
                { 'البيان': 'الحالات المكتملة والمؤكدة', 'القيمة / التفاصيل': completedCases },
                { 'البيان': 'متحصلات الخزينة النقدية (ج.م)', 'القيمة / التفاصيل': totalCash },
                { 'البيان': 'مستحقات تعاقدات الشركات الآجلة (ج.م)', 'القيمة / التفاصيل': totalCorporate },
                { 'البيان': 'إجمالي إيراد الوردية الشامل (ج.م)', 'القيمة / التفاصيل': totalCash + totalCorporate }
            ];

            const detailedRows = list.map((apt, idx) => ({
                'م': idx + 1,
                'اسم المريض': apt.patient_name || (apt.patient ? apt.patient.full_name : 'مريض غير محدد'),
                'الهاتف': apt.patient_phone || (apt.patient ? apt.patient.phone : '—'),
                'الطبيب المعالج': apt.doctor_name || (apt.doctor ? apt.doctor.full_name : '—'),
                'الموعد': apt.time_slot ? Utils.formatTime(apt.time_slot) : '—',
                'طريقة الدفع': apt.payment_type === 'corporate' ? `تعاقد (${apt.contract_name || 'شركة'})` : 'نقدي',
                'إجمالي الكشف (ج.م)': Number(apt.amount || 0),
                'المدفوع نقداً (ج.م)': Number(apt.patient_paid_amount || (apt.payment_type === 'corporate' ? 0 : apt.amount)),
                'مستحق على الشركة (ج.م)': Number(apt.company_claim_amount || 0),
                'الحالة': apt.status === 'completed' ? 'مكتمل' : (apt.status === 'confirmed' ? 'مؤكد' : apt.status)
            }));

            const dateStr = new Date().toISOString().split('T')[0];
            this.downloadExcel(`تقرير_وردية_الاستقبال_${dateStr}.xlsx`, [
                { name: 'ملخص الوردية', data: summaryRows },
                { name: 'كشف الحالات التفصيلي', data: detailedRows.length > 0 ? detailedRows : [{ 'ملاحظة': 'لا توجد كشوفات مسجلة' }] }
            ]);
        } catch (err) {
            Utils.showToast('تعذر تصدير تقرير الوردية: ' + err.message, 'error');
        }
    },

    /**
     * 2. تصدير فاتورة مطالبة شهرية/دورية لشركة متعاقدة
     */
    exportCorporateClaimToExcel(contract, appointments, invoiceNumber) {
        try {
            const cName = contract ? contract.name : 'شركة متعاقدة';
            const discountRate = contract ? Number(contract.discount_percentage || 0) : 0;
            const copayRate = contract ? Number(contract.patient_copay_percentage || 0) : 0;
            const list = appointments || [];

            const grossTotal = list.reduce((sum, a) => sum + Number(a.gross_amount || a.amount || 200), 0);
            const discountTotal = (grossTotal * discountRate) / 100;
            const netClaim = list.reduce((sum, a) => sum + Number(a.company_claim || a.company_claim_amount || (a.amount || 200) - ((a.amount || 200) * discountRate / 100)), 0);

            const invHeader = [
                { 'البند': 'رقم المطالبة / الفاتورة', 'البيان': invoiceNumber || `INV-CORP-${Date.now().toString().slice(-6)}` },
                { 'البند': 'الجهة / الشركة المتعاقدة', 'البيان': cName },
                { 'البند': 'نسبة الخصم المعتمدة', 'البيان': `${discountRate}%` },
                { 'البند': 'نسبة تحمل المريض (Co-Pay)', 'البيان': `${copayRate}%` },
                { 'البند': 'تاريخ إصدار الفاتورة', 'البيان': new Date().toLocaleDateString('ar-EG') },
                { 'البند': 'إجمالي عدد الكشوفات والحالات', 'البيان': list.length },
                { 'البند': 'إجمالي القيمة الأصلية (ج.م)', 'البيان': grossTotal },
                { 'البند': 'قيمة الخصم التعاقدي (ج.م)', 'البيان': discountTotal },
                { 'البند': 'صافي المستحق على الشركة للتحصيل (ج.م)', 'البيان': netClaim },
                { 'البند': 'حالة المطالبة', 'البيان': 'مستحقة السداد للعيادة' }
            ];

            const patientRows = list.map((apt, idx) => {
                const origVal = Number(apt.gross_amount || apt.amount || 200);
                const disc = (origVal * discountRate) / 100;
                const paidByPatient = Number(apt.patient_paid || apt.patient_paid_amount || 0);
                const claim = Number(apt.company_claim || apt.company_claim_amount || (origVal - disc - paidByPatient));

                return {
                    'م': idx + 1,
                    'رقم الحركة': apt.id ? `#${String(apt.id).slice(-6)}` : `REC-${idx + 1}`,
                    'اسم المريض': apt.patient_name || (apt.patient ? apt.patient.full_name : 'مريض متعاقد'),
                    'تاريخ الكشف': apt.date || new Date().toISOString().split('T')[0],
                    'الطبيب المعالج': apt.doctor_name || (apt.doctor ? apt.doctor.full_name : 'استشاري العيادة'),
                    'القيمة الأصلية (ج.م)': origVal,
                    'قيمة الخصم (ج.م)': disc,
                    'مسدد من المريض (Co-Pay)': paidByPatient,
                    'المطالبة المستحقة على الشركة (ج.م)': claim
                };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            this.downloadExcel(`مطالبة_شركة_${cName.replace(/\s+/g, '_')}_${dateStr}.xlsx`, [
                { name: 'فاتورة المطالبة الرسمية', data: invHeader },
                { name: 'كشف حساب المرضى التفصيلي', data: patientRows.length > 0 ? patientRows : [{ 'ملاحظة': 'لا توجد كشوفات مسجلة لهذه الشركة' }] }
            ]);
        } catch (err) {
            Utils.showToast('تعذر تصدير مطالبة الشركة: ' + err.message, 'error');
        }
    },

    /**
     * 3. تصدير دفتر اليومية المالية للمحاسب
     */
    exportFinancialLedgerToExcel(records) {
        const rows = (records || []).map((rec, idx) => ({
            'م': idx + 1,
            'رقم الحركة': rec.id ? `#${String(rec.id).slice(-6)}` : `REC-${idx + 1}`,
            'اسم المريض': rec.patient_name,
            'الطبيب المعالج': rec.doctor_name,
            'التاريخ': rec.date,
            'طريقة السداد': rec.payment_type === 'corporate' ? `تعاقد (${rec.contract_name || 'شركة'})` : 'نقدي',
            'القيمة الأصلية (ج.م)': Number(rec.gross_amount || 0),
            'الخصم (ج.م)': Number(rec.discount_amount || 0),
            'المدفوع نقداً (ج.م)': Number(rec.patient_paid || 0),
            'مطالبة الشركة (ج.م)': Number(rec.company_claim || 0),
            'الحالة المالية': rec.status === 'voided' ? 'ملغى' : 'معتمد'
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`دفتر_اليومية_المالية_${dateStr}.xlsx`, [
            { name: 'اليومية المالية', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد حركات مالية' }] }
        ]);
    },

    /**
     * 4. تصدير سجل التدقيق والرقابة المالية (Financial Audit Trail)
     */
    exportAuditTrailToExcel(logs) {
        const rows = (logs || []).map((log, idx) => ({
            'م': idx + 1,
            'توقيت الحركة': log.timestamp,
            'نوع الإجراء': log.action_type,
            'المصرح بالحركة': log.authorized_by,
            'سبب التعديل أو الإلغاء المعتمد': log.reason,
            'ملاحظات تفصيلية': log.notes || '—'
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`سجل_الرقابة_والتدقيق_المالي_${dateStr}.xlsx`, [
            { name: 'سجل التدقيق الرقابي', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد حركات تدقيق' }] }
        ]);
    },

    /**
     * 5. تصدير مرضى ومتابعات نظام CRM
     */
    exportCRMToExcel(patients) {
        const rows = (patients || []).map((p, idx) => ({
            'م': idx + 1,
            'اسم المريض': p.full_name,
            'رقم الهاتف': p.phone,
            'مصدر الاستقطاب': p.lead_source,
            'تصنيف المريض': p.patient_tier === 'vip' ? '⭐ VIP' : (p.patient_tier === 'chronic' ? '🩺 مزمن' : (p.patient_tier === 'corporate' ? '🏢 تعاقد' : 'عادي')),
            'مرحلة الرحلة': p.stage,
            'تاريخ المتابعة القادم': p.next_follow_up || '—',
            'ملاحظات واحتياجات المريض': p.notes || '—'
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`سجل_مرضى_CRM_${dateStr}.xlsx`, [
            { name: 'قاعدة بيانات CRM', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد بيانات مرضى' }] }
        ]);
    },

    /**
     * 6. تصدير سجل حضور وانصراف جهاز البصمة
     */
    exportAttendanceToExcel(logs) {
        const rows = (logs || []).map((l, idx) => ({
            'م': idx + 1,
            'اسم الموظف / الطبيب': l.employee_name,
            'معرف البصمة': l.fingerprint_id,
            'بصمة الحضور': l.check_in,
            'بصمة الانصراف': l.check_out || '—',
            'دقائق التأخير': l.late_minutes || 0,
            'إضافي العمل (دقيقة)': l.overtime_minutes || 0,
            'الحالة': l.status === 'present' ? 'حاضر (بصمة)' : 'متأخر'
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`سجل_حضور_البصمة_${dateStr}.xlsx`, [
            { name: 'حضور وانصراف البصمة', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد سجلات حضور' }] }
        ]);
    },

    /**
     * 7. تصدير قرارات الجزاءات والخصومات
     */
    exportPenaltiesToExcel(penalties) {
        const rows = (penalties || []).map((p, idx) => ({
            'م': idx + 1,
            'اسم الموظف': p.employee_name,
            'تاريخ الجزاء': p.date,
            'نوع وقيمة الجزاء': p.penalty_type === 'days' ? `خصم ${p.days} يوم` : `خصم ${Utils.formatCurrency(p.amount)}`,
            'السبب المعتمد': p.reason,
            'المصرح بالجزاء': p.issued_by,
            'حالة الترحيل للرواتب': 'معتمد ومخصوم'
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`سجل_الجزاءات_والخصومات_${dateStr}.xlsx`, [
            { name: 'سجل الجزاءات المعتمدة', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد جزاءات مسجلة' }] }
        ]);
    },

    /**
     * 8. تصدير الجداول التشغيلية (Staff Roster)
     */
    exportRosterToExcel(roster) {
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const rows = (roster || []).map((r, idx) => ({
            'م': idx + 1,
            'الموظف': r.employee_name,
            'الوظيفة': r.job_title,
            'يوم العمل': days[r.day_of_week] || r.day_of_week,
            'الوردية': r.shift_name,
            'ساعات العمل المقررة': r.hours
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`الجدول_التشغيلي_للورديات_${dateStr}.xlsx`, [
            { name: 'الجدول التشغيلي', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد ورديات محددة' }] }
        ]);
    },

    /**
     * 9. تصدير كشف حساب الموردين وأوامر الشراء
     */
    exportSuppliersToExcel(suppliers) {
        const rows = (suppliers || []).map((s, idx) => ({
            'م': idx + 1,
            'اسم المورد / الشركة الطبية': s.name,
            'مسؤول الاتصال': s.contact_name,
            'رقم الهاتف': s.phone,
            'تاريخ آخر توريد': s.last_order_date || '—',
            'الرصيد المستحق للمورد (ج.م)': Number(s.balance_due || 0),
            'حالة الحساب': s.balance_due > 0 ? 'مستحق السداد' : 'خالص'
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`كشف_حساب_الموردين_${dateStr}.xlsx`, [
            { name: 'الموردين والمشتريات', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا يوجد موردين مسجلين' }] }
        ]);
    },

    /**
     * 10. تصدير جرد المخزن والمستلزمات الطبية وكارت الصنف
     */
    exportInventoryToExcel(items) {
        const rows = (items || []).map((item, idx) => ({
            'م': idx + 1,
            'اسم الصنف / المستلزم': item.name,
            'التصنيف': item.category || 'مستلزمات طبية',
            'رقم التشغيلة (Batch Number)': item.batch_number || '—',
            'الوحدة': item.unit || 'قطعة',
            'الرصيد المتاح': item.quantity,
            'حد إعادة الطلب': item.min_threshold,
            'حالة الرصيد': item.quantity <= item.min_threshold ? '⚠️ منخفض جداً' : 'متوفر',
            'تاريخ الصلاحية': item.expiry_date || '—'
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`جرد_مخزن_العيادة_${dateStr}.xlsx`, [
            { name: 'جرد المستلزمات الطبية', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'المخزن فارغ' }] }
        ]);
    },

    /**
     * 11. تصدير دليل التعاقدات ونسب التحمل (Co-Pay)
     */
    exportContractsToExcel(contracts) {
        const rows = (contracts || []).map((c, idx) => ({
            'م': idx + 1,
            'الشركة / جهة التعاقد': c.name,
            'نسبة خصم الشركة': `${c.discount_percentage}%`,
            'نسبة تحمل المريض نقداً (Co-Pay)': `${c.patient_copay_percentage || 0}%`,
            'سقف التغطية للكشف (ج.م)': Number(c.max_coverage || 5000),
            'مسؤول التواصل': c.contact_person || '—',
            'رقم الهاتف': c.phone || '—',
            'حالة التعاقد': 'نشط وساري'
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        this.downloadExcel(`دليل_التعاقدات_والتأمين_${dateStr}.xlsx`, [
            { name: 'الشركات والتعاقدات', data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد تعاقدات مسجلة' }] }
        ]);
    },

    /**
     * 12. تصدير مسير الرواتب HR Payroll
     */
    exportPayrollToExcel(employees, monthStr) {
        const rows = (employees || []).map((emp, idx) => {
            const base = Number(emp.base_salary || 0);
            const allow = Number(emp.allowances || 0);
            const ded = Number(emp.deductions || 0);
            const net = base + allow - ded;
            return {
                'م': idx + 1,
                'اسم الموظف': emp.full_name,
                'المسمى الوظيفي': emp.job_title,
                'الراتب الأساسي (ج.م)': base,
                'البدلات والمكافآت (ج.م)': allow,
                'الاستقطاعات والغياب (ج.م)': ded,
                'صافي الراتب المستحق (ج.م)': net,
                'حالة الصرف': emp.payroll_status || 'معتمد'
            };
        });

        const dateStr = monthStr || new Date().toISOString().split('T')[0].slice(0, 7);
        this.downloadExcel(`مسير_الرواتب_${dateStr}.xlsx`, [
            { name: `رواتب_${dateStr}`, data: rows.length > 0 ? rows : [{ 'ملاحظة': 'لا توجد بيانات رواتب' }] }
        ]);
    },

    /**
     * طباعة فاتورة مطالبة رسمية لشركة متعاقدة بصيغة PDF
     */
    printCorporateClaimPDF(contract, appointments, invoiceNumber) {
        const cName = contract ? contract.name : 'شركة متعاقدة';
        const discountRate = contract ? Number(contract.discount_percentage || 0) : 0;
        const list = appointments || [];
        const grossTotal = list.reduce((sum, a) => sum + Number(a.gross_amount || a.amount || 200), 0);
        const discountTotal = (grossTotal * discountRate) / 100;
        const netClaim = list.reduce((sum, a) => sum + Number(a.company_claim || a.company_claim_amount || (a.amount || 200) - ((a.amount || 200) * discountRate / 100)), 0);
        const invNo = invoiceNumber || `INV-CORP-${Date.now().toString().slice(-6)}`;

        const printWindow = window.open('', '_blank', 'width=850,height=900');
        if (!printWindow) {
            Utils.showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'warning');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة مطالبة مالية - ${cName}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0284c7; padding-bottom: 20px; }
                    .header h1 { margin: 0; color: #0284c7; font-size: 22px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; background: #f8fafc; padding: 20px; border-radius: 12px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; }
                    th { background: #e0f2fe; color: #0369a1; }
                    .total-box { margin-top: 25px; padding: 15px; background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; }
                    .signatures { margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>نظام الوجيه لإدارة العيادات والمراكز الطبية</h1>
                        <p style="margin: 4px 0 0; color: #64748b;">مطالبة مالية دورية للجهات والشركات المتعاقدة</p>
                    </div>
                    <div style="text-align: left;">
                        <div style="font-weight: bold;">رقم الفاتورة: ${invNo}</div>
                        <div style="color: #64748b; font-size: 12px;">التاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
                    </div>
                </div>

                <div class="info-grid">
                    <div><strong>الجهة المتعاقدة:</strong> ${cName}</div>
                    <div><strong>نسبة الخصم المتفق عليها:</strong> ${discountRate}%</div>
                    <div><strong>مسؤول التواصل:</strong> ${contract ? (contract.contact_person || 'قسم التأمين والتعاقدات') : '—'}</div>
                    <div><strong>الهاتف:</strong> ${contract ? (contract.phone || '—') : '—'}</div>
                </div>

                <h3>كشف الحالات والخدمات الطبية المقدمة (${list.length} حالة):</h3>
                <table>
                    <thead>
                        <tr>
                            <th>م</th>
                            <th>اسم المريض</th>
                            <th>تاريخ الكشف</th>
                            <th>الطبيب المعالج</th>
                            <th>القيمة الأصلية</th>
                            <th>الخصم (${discountRate}%)</th>
                            <th>المستحق للتحصيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map((a, i) => {
                            const val = Number(a.gross_amount || a.amount || 200);
                            const disc = (val * discountRate) / 100;
                            const claim = Number(a.company_claim || a.company_claim_amount || (val - disc));
                            return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${a.patient_name || 'مريض تعاقد'}</td>
                                    <td>${a.date || new Date().toISOString().split('T')[0]}</td>
                                    <td>${a.doctor_name || 'د. استشاري'}</td>
                                    <td>${val} ج.م</td>
                                    <td>${disc} ج.م</td>
                                    <td><strong>${claim} ج.م</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="total-box">
                    <span>إجمالي المبلغ المطلوب سداده من الشركة:</span>
                    <span>${Utils.formatCurrency(netClaim)}</span>
                </div>

                <div class="signatures">
                    <div>توقيع المدير المالي للعيادة: __________________</div>
                    <div>ختم المركز الطبي: __________________</div>
                </div>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    /**
     * طباعة وتوليد إيصال كشف طبي (PDF Receipt)
     */
    printAppointmentReceipt(apt) {
        if (!apt) return;
        const patientName = apt.patient_name || (apt.patient ? apt.patient.full_name : 'مريض');
        const doctorName = apt.doctor_name || (apt.doctor ? apt.doctor.full_name : 'د. المناوب');
        const isCorporate = apt.payment_type === 'corporate';
        const contractName = apt.contract_name || 'شركة متعاقدة';
        const discountRate = apt.discount_percentage || 0;
        const totalAmount = Utils.formatCurrency(apt.amount || apt.gross_amount || 200);
        const paidAmount = Utils.formatCurrency(apt.patient_paid_amount || apt.patient_paid || (isCorporate ? 0 : (apt.amount || 200)));
        const companyAmount = Utils.formatCurrency(apt.company_claim_amount || apt.company_claim || 0);
        const receiptNo = apt.id ? String(apt.id).slice(-6) : Math.floor(100000 + Math.random() * 900000);
        const dateStr = new Date().toLocaleDateString('ar-EG');
        const timeStr = apt.time_slot ? Utils.formatTime(apt.time_slot) : '12:00 م';

        const printWindow = window.open('', '_blank', 'width=600,height=750');
        if (!printWindow) {
            Utils.showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'warning');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>إيصال كشف طبي #${receiptNo}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; color: #1e293b; }
                    .receipt-card { border: 2px dashed #0284c7; padding: 25px; border-radius: 16px; max-width: 450px; margin: auto; }
                    .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px; }
                    .header h2 { margin: 0; color: #0284c7; font-size: 20px; }
                    .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
                    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8fafc; font-size: 13px; }
                    .row .label { color: #64748b; }
                    .row .value { font-weight: bold; color: #0f172a; }
                    .corp-badge { background: #ede9fe; color: #6d28d9; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
                    .total { background: #f0f9ff; padding: 12px; border-radius: 10px; margin-top: 15px; display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; color: #0369a1; }
                    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; }
                </style>
            </head>
            <body>
                <div class="receipt-card">
                    <div class="header">
                        <h2>نظام الوجيه لإدارة العيادات</h2>
                        <p>إيصال كشف طبي ${isCorporate ? '— تعاقد شركات وتأمين' : '— نقدي'}</p>
                    </div>
                    <div class="row">
                        <span class="label">رقم الإيصال:</span>
                        <span class="value">#${receiptNo}</span>
                    </div>
                    <div class="row">
                        <span class="label">اسم المريض:</span>
                        <span class="value">${patientName}</span>
                    </div>
                    <div class="row">
                        <span class="label">الطبيب المعالج:</span>
                        <span class="value">${doctorName}</span>
                    </div>
                    <div class="row">
                        <span class="label">طريقة المحاسبة:</span>
                        <span class="value">${isCorporate ? `<span class="corp-badge">🏢 تعاقد: ${contractName} (${discountRate}% خصم)</span>` : '💵 نقدي'}</span>
                    </div>
                    <div class="row">
                        <span class="label">قيمة الكشف الأصلية:</span>
                        <span class="value">${totalAmount}</span>
                    </div>
                    ${isCorporate ? `
                        <div class="row">
                            <span class="label">المستحق على الشركة:</span>
                            <span class="value" style="color: #6d28d9;">${companyAmount}</span>
                        </div>
                    ` : ''}
                    <div class="total">
                        <span>المسدد نقداً من المريض:</span>
                        <span>${paidAmount}</span>
                    </div>
                    <div class="row" style="border: none; margin-top: 10px;">
                        <span class="label">التاريخ والوقت:</span>
                        <span class="value">${dateStr} — ${timeStr}</span>
                    </div>
                    <div class="footer">
                        نتمنى لكم دوام الصحة والعافية • يرجى الاحتفاظ بالإيصال لمراجعة الاستقبال
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    /**
     * رسم بياني للإيرادات الأسبوعية (Chart.js)
     */
    initRevenueChart(canvasId, labels, dataPoints) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || typeof Chart === 'undefined') return null;

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels || ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                datasets: [{
                    label: 'الإيرادات اليومية (ج.م)',
                    data: dataPoints || [3200, 4500, 4100, 5200, 4850, 6100, 2400],
                    backgroundColor: 'rgba(2, 132, 199, 0.85)',
                    borderColor: '#0284c7',
                    borderWidth: 1.5,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { family: 'Cairo', size: 12 } }
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { font: { family: 'Cairo' } } },
                    x: { ticks: { font: { family: 'Cairo' } } }
                }
            }
        });
    },

    /**
     * رسم بياني لنسب الحضور مقابل الإلغاء
     */
    initAttendanceChart(canvasId, attended, cancelled, pending) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || typeof Chart === 'undefined') return null;

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['حضور وكشف', 'ملغى / لم يحضر', 'قيد الانتظار'],
                datasets: [{
                    data: [attended || 72, cancelled || 8, pending || 20],
                    backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: 'Cairo', size: 11 } }
                    }
                }
            }
        });
    }
};

window.Reports = Reports;
