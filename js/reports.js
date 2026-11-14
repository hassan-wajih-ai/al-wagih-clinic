/**
 * نظام التقارير ومؤشرات الأداء والتصدير المتقدم (Reports & Export Engine)
 * يشمل: تقارير الورديات، الفواتير اليومية، مطالبات الشركات المتعاقدة، جرد المخزن، ومسير الرواتب HR
 */

const Reports = {
    /**
     * تصدير تقرير إغلاق وردية الاستقبال (8 ساعات) إلى ملف Excel
     */
    exportShiftToExcel(shiftInfo, appointments) {
        if (typeof XLSX === 'undefined') {
            Utils.showToast('مكتبة SheetJS غير متوفرة حالياً', 'error');
            return;
        }

        try {
            const totalCases = appointments.length;
            const completedCases = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').length;
            const totalCash = appointments
                .filter(a => (a.status === 'completed' || a.status === 'confirmed') && a.payment_type !== 'corporate')
                .reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const totalCorporate = appointments
                .filter(a => (a.status === 'completed' || a.status === 'confirmed') && a.payment_type === 'corporate')
                .reduce((sum, a) => sum + Number(a.company_claim_amount || a.amount || 0), 0);

            const excelRows = [];
            excelRows.push({ 'البيان': 'تقرير إغلاق وردية الاستقبال (8 ساعات)', 'القيمة / التفاصيل': '' });
            excelRows.push({ 'البيان': 'اسم العيادة', 'القيمة / التفاصيل': shiftInfo.clinicName || 'عيادات الشفاء' });
            excelRows.push({ 'البيان': 'موظف الاستقبال المسؤول', 'القيمة / التفاصيل': shiftInfo.staffName || 'موظف الاستقبال' });
            excelRows.push({ 'البيان': 'تاريخ الوردية', 'القيمة / التفاصيل': new Date().toLocaleDateString('ar-EG') });
            excelRows.push({ 'البيان': 'إجمالي الحالات', 'القيمة / التفاصيل': totalCases });
            excelRows.push({ 'البيان': 'الحالات المكتملة والمؤكدة', 'القيمة / التفاصيل': completedCases });
            excelRows.push({ 'البيان': 'متحصلات الخزينة النقدية (ج.م)', 'القيمة / التفاصيل': totalCash });
            excelRows.push({ 'البيان': 'مستحقات تعاقدات الشركات الآجلة (ج.م)', 'القيمة / التفاصيل': totalCorporate });
            excelRows.push({ 'البيان': '---------------------------', 'القيمة / التفاصيل': '---------------------------' });

            const detailedRows = appointments.map((apt, idx) => ({
                'م': idx + 1,
                'اسم المريض': apt.patient_name || (apt.patient ? apt.patient.full_name : 'غير محدد'),
                'الهاتف': apt.patient_phone || (apt.patient ? apt.patient.phone : '—'),
                'طريقة الدفع': apt.payment_type === 'corporate' ? `تعاقد (${apt.contract_name || 'شركة'})` : 'نقدي',
                'إجمالي الكشف': Number(apt.amount || 0),
                'المدفوع نقداً': Number(apt.patient_paid_amount || (apt.payment_type === 'corporate' ? 0 : apt.amount)),
                'مستحق على الشركة': Number(apt.company_claim_amount || 0),
                'الحالة': apt.status
            }));

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(excelRows), 'ملخص الوردية');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailedRows), 'سجل الكشوفات التفصيلي');
            XLSX.writeFile(wb, `تقرير_وردية_الاستقبال_${new Date().toISOString().split('T')[0]}.xlsx`);

            Utils.showToast('تم تصدير تقرير الوردية بنجاح', 'success');
        } catch (err) {
            Utils.showToast('تعذر التصدير: ' + err.message, 'error');
        }
    },

    /**
     * تصدير فاتورة مطالبة شهرية/دورية لشركة متعاقدة (Corporate Billing Invoice)
     */
    exportCorporateClaimToExcel(contract, appointments, invoiceNumber) {
        if (typeof XLSX === 'undefined') return;

        const totalCases = appointments.length;
        const grossTotal = appointments.reduce((sum, a) => sum + Number(a.amount || 200), 0);
        const discountRate = Number(contract.discount_percentage || 0);
        const discountTotal = (grossTotal * discountRate) / 100;
        const netClaim = grossTotal - discountTotal;

        const wb = XLSX.utils.book_new();

        // 1. ورقة المطالبة الرسمية
        const invoiceHeader = [
            { 'البند': 'رقم المطالبة / الفاتورة', 'البيان': invoiceNumber || `INV-CORP-${Date.now().toString().slice(-6)}` },
            { 'البند': 'الجهة / الشركة المتعاقدة', 'البيان': contract.name },
            { 'البند': 'نسبة الخصم المعتمدة', 'البيان': `${discountRate}%` },
            { 'البند': 'تاريخ إصدار الفاتورة', 'البيان': new Date().toLocaleDateString('ar-EG') },
            { 'البند': 'إجمالي عدد الكشوفات والحالات', 'البيان': totalCases },
            { 'البند': 'إجمالي القيمة قبل الخصم (ج.م)', 'البيان': grossTotal },
            { 'البند': 'قيمة الخصم التعاقدي (ج.م)', 'البيان': discountTotal },
            { 'البند': 'صافي المبلغ المستحق للتحصيل (ج.م)', 'البيان': netClaim },
            { 'البند': 'حالة المطالبة', 'البيان': 'مستحقة السداد للعيادة' }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceHeader), 'فاتورة المطالبة');

        // 2. كشف الحساب التفصيلي بالمرضى
        const patientDetails = appointments.map((apt, idx) => {
            const aptAmount = Number(apt.amount || 200);
            const disc = (aptAmount * discountRate) / 100;
            return {
                'م': idx + 1,
                'اسم المريض': apt.patient_name || 'مريض متعاقد',
                'رقم الملف': apt.file_number || `FILE-${1000 + idx}`,
                'تاريخ الكشف': apt.date || new Date().toISOString().split('T')[0],
                'الطبيب المعالج': apt.doctor_name || 'استشاري العيادة',
                'قيمة الكشف': aptAmount,
                'نسبة الخصم': `${discountRate}%`,
                'قيمة الخصم': disc,
                'المستحق على الشركة': aptAmount - disc
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientDetails), 'كشف حساب المرضى التفصيلي');

        XLSX.writeFile(wb, `مطالبة_شركة_${contract.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
        Utils.showToast(`تم تصدير فاتورة مطالبة ${contract.name} بنجاح`, 'success');
    },

    /**
     * طباعة فاتورة مطالبة رسمية لشركة متعاقدة بصيغة PDF
     */
    printCorporateClaimPDF(contract, appointments, invoiceNumber) {
        const grossTotal = appointments.reduce((sum, a) => sum + Number(a.amount || 200), 0);
        const discountRate = Number(contract.discount_percentage || 0);
        const discountTotal = (grossTotal * discountRate) / 100;
        const netClaim = grossTotal - discountTotal;
        const invNo = invoiceNumber || `INV-CORP-${Date.now().toString().slice(-6)}`;

        const printWindow = window.open('', '_blank', 'width=800,height=900');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة مطالبة مالية - ${contract.name}</title>
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
                    <div><strong>الجهة المتعاقدة:</strong> ${contract.name}</div>
                    <div><strong>نسبة الخصم المتفق عليها:</strong> ${discountRate}%</div>
                    <div><strong>مسؤول التواصل:</strong> ${contract.contact_person || 'قسم التأمين والتعاقدات'}</div>
                    <div><strong>الهاتف:</strong> ${contract.phone || '—'}</div>
                </div>

                <h3>كشف الحالات والخدمات الطبية المقدمة:</h3>
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
                        ${appointments.map((a, i) => {
                            const val = Number(a.amount || 200);
                            const disc = (val * discountRate) / 100;
                            return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${a.patient_name || 'مريض تعاقد'}</td>
                                    <td>${a.date || new Date().toISOString().split('T')[0]}</td>
                                    <td>${a.doctor_name || 'د. استشاري'}</td>
                                    <td>${val} ج.م</td>
                                    <td>${disc} ج.م</td>
                                    <td><strong>${val - disc} ج.م</strong></td>
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
     * تصدير جرد المخزن والمستلزمات الطبية إلى Excel
     */
    exportInventoryToExcel(items) {
        if (typeof XLSX === 'undefined') return;

        const rows = items.map((item, idx) => ({
            'م': idx + 1,
            'اسم الصنف / المستلزم': item.name,
            'التصنيف': item.category || 'مستلزمات طبية',
            'الوحدة': item.unit || 'قطعة',
            'الرصيد المتاح': item.quantity,
            'حد إعادة الطلب': item.min_threshold,
            'حالة الرصيد': item.quantity <= item.min_threshold ? '⚠️ منخفض جداً' : 'متوفر',
            'سعر الوحدة (ج.م)': item.unit_price || 0,
            'تاريخ الصلاحية': item.expiry_date || '—'
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'جرد المستلزمات الطبية');
        XLSX.writeFile(wb, `جرد_مخزن_العيادة_${new Date().toISOString().split('T')[0]}.xlsx`);
        Utils.showToast('تم تصدير جرد المخزن إلى Excel بنجاح', 'success');
    },

    /**
     * تصدير مسير الرواتب HR Payroll إلى Excel
     */
    exportPayrollToExcel(employees, monthStr) {
        if (typeof XLSX === 'undefined') return;

        const rows = employees.map((emp, idx) => {
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

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `رواتب ${monthStr || 'الشهر'}`);
        XLSX.writeFile(wb, `مسير_الرواتب_${monthStr || 'الشهر'}.xlsx`);
        Utils.showToast('تم تصدير مسير الرواتب بنجاح', 'success');
    },

    /**
     * طباعة وتوليد إيصال كشف طبي (PDF Receipt) مع دعم التعاقدات والخصومات
     */
    printAppointmentReceipt(apt) {
        const patientName = apt.patient_name || (apt.patient ? apt.patient.full_name : 'مريض');
        const doctorName = apt.doctor_name || (apt.doctor ? apt.doctor.full_name : 'د. المناوب');
        const isCorporate = apt.payment_type === 'corporate';
        const contractName = apt.contract_name || 'شركة متعاقدة';
        const discountRate = apt.discount_percentage || 0;
        const totalAmount = Utils.formatCurrency(apt.amount || 200);
        const paidAmount = Utils.formatCurrency(apt.patient_paid_amount || (isCorporate ? 0 : (apt.amount || 200)));
        const companyAmount = Utils.formatCurrency(apt.company_claim_amount || 0);
        const receiptNo = apt.id ? String(apt.id).slice(-6) : Math.floor(100000 + Math.random() * 900000);
        const dateStr = new Date().toLocaleDateString('ar-EG');
        const timeStr = apt.time_slot ? Utils.formatTime(apt.time_slot) : '12:00 م';

        const printWindow = window.open('', '_blank', 'width=600,height=750');
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
                            <span class="value text-purple-700">${companyAmount}</span>
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
