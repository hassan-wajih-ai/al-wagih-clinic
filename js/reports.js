/**
 * نظام التقارير ومؤشرات الأداء والتصدير (Reports & Export Engine)
 * يعتمد 100% على مكتبات المتصفح المجانية: SheetJS (xlsx) + jsPDF + Chart.js
 */

const Reports = {
    /**
     * تصدير تقرير إغلاق وردية الاستقبال (8 ساعات) إلى ملف Excel احترافي
     * @param {Object} shiftInfo - معلومات الوردية (الموظف، التاريخ، ساعات الوردية)
     * @param {Array} appointments - قائمة كشوفات الوردية
     */
    exportShiftToExcel(shiftInfo, appointments) {
        if (typeof XLSX === 'undefined') {
            Utils.showToast('مكتبة SheetJS غير متوفرة حالياً', 'error');
            return;
        }

        try {
            // 1. تجهيز بيانات الملخص المالي للوردية
            const totalCases = appointments.length;
            const completedCases = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').length;
            const cancelledCases = appointments.filter(a => a.status === 'cancelled').length;
            const totalRevenue = appointments
                .filter(a => a.status === 'completed' || a.status === 'confirmed')
                .reduce((sum, a) => sum + Number(a.amount || 0), 0);

            // 2. بناء سطور ملف Excel
            const excelRows = [];

            // ترويسة التقرير
            excelRows.push({ 'البيان': 'تقرير إغلاق وردية الاستقبال (8 ساعات)', 'القيمة / التفاصيل': '' });
            excelRows.push({ 'البيان': 'اسم العيادة', 'القيمة / التفاصيل': shiftInfo.clinicName || 'عيادات الشفاء التخصصية' });
            excelRows.push({ 'البيان': 'الفرع', 'القيمة / التفاصيل': shiftInfo.branchName || 'فرع المعادي الرئيسي' });
            excelRows.push({ 'البيان': 'موظف الاستقبال المسؤول', 'القيمة / التفاصيل': shiftInfo.staffName || 'موظف الاستقبال' });
            excelRows.push({ 'البيان': 'تاريخ الوردية', 'القيمة / التفاصيل': new Date().toLocaleDateString('ar-EG') });
            excelRows.push({ 'البيان': 'مدة الوردية', 'القيمة / التفاصيل': '8 ساعات عمل متصلة' });
            excelRows.push({ 'البيان': 'إجمالي الحالات المسجلة', 'القيمة / التفاصيل': totalCases });
            excelRows.push({ 'البيان': 'الحالات المؤكدة والمكتملة', 'القيمة / التفاصيل': completedCases });
            excelRows.push({ 'البيان': 'الحالات الملغاة', 'القيمة / التفاصيل': cancelledCases });
            excelRows.push({ 'البيان': 'صافي المتحصلات النقدية (ج.م)', 'القيمة / التفاصيل': totalRevenue });
            excelRows.push({ 'البيان': '---------------------------', 'القيمة / التفاصيل': '---------------------------' });

            // تفاصيل الكشوفات الفردية
            excelRows.push({ 'البيان': 'تفاصيل كشوفات الوردية:', 'القيمة / التفاصيل': '' });

            const detailedRows = appointments.map((apt, idx) => ({
                'م': idx + 1,
                'اسم المريض': apt.patient_name || (apt.patient ? apt.patient.full_name : 'غير محدد'),
                'رقم الهاتف': apt.patient_phone || (apt.patient ? apt.patient.phone : '—'),
                'الطبيب المعالج': apt.doctor_name || (apt.doctor ? apt.doctor.full_name : '—'),
                'توقيت الحجز': apt.time_slot,
                'قيمة الكشف (ج.م)': Number(apt.amount || 0),
                'حالة الكشف': apt.status === 'completed' ? 'مكتمل' : (apt.status === 'confirmed' ? 'مؤكد' : (apt.status === 'cancelled' ? 'ملغى' : 'قيد الانتظار'))
            }));

            // إنشاء المصنف وأوراق العمل
            const wb = XLSX.utils.book_new();
            
            // ورقة الملخص
            const wsSummary = XLSX.utils.json_to_sheet(excelRows);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص الوردية');

            // ورقة التفاصيل
            const wsDetails = XLSX.utils.json_to_sheet(detailedRows);
            XLSX.utils.book_append_sheet(wb, wsDetails, 'سجل الكشوفات التفصيلي');

            // تسمية الملف وتنزيله
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `تقرير_وردية_الاستقبال_${dateStr}.xlsx`;
            XLSX.writeFile(wb, fileName);

            Utils.showToast(`تم تصدير ملف الإكسيل بنجاح: ${fileName}`, 'success');
        } catch (err) {
            console.error('Excel Export Error:', err);
            Utils.showToast('تعذر تصدير الإكسيل: ' + err.message, 'error');
        }
    },

    /**
     * طباعة وتوليد إيصال كشف طبي (PDF Receipt) فوري للمريض
     * @param {Object} apt - بيانات الحجز
     */
    printAppointmentReceipt(apt) {
        const patientName = apt.patient_name || (apt.patient ? apt.patient.full_name : 'مريض');
        const doctorName = apt.doctor_name || (apt.doctor ? apt.doctor.full_name : 'د. المناوب');
        const amount = Utils.formatCurrency(apt.amount || 200);
        const receiptNo = apt.id ? String(apt.id).slice(-6) : Math.floor(100000 + Math.random() * 900000);
        const dateStr = new Date().toLocaleDateString('ar-EG');
        const timeStr = apt.time_slot ? Utils.formatTime(apt.time_slot) : '12:00 م';

        // نافذة طباعة مجهزة مع تصميم إيصال احترافي
        const printWindow = window.open('', '_blank', 'width=600,height=700');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>إيصال كشف طبي #${receiptNo}</title>
                <style>
                    body { font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif; padding: 25px; color: #1e293b; }
                    .receipt-card { border: 2px dashed #0284c7; padding: 25px; border-radius: 16px; max-width: 450px; margin: auto; }
                    .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px; }
                    .header h2 { margin: 0; color: #0284c7; font-size: 20px; }
                    .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
                    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8fafc; font-size: 13px; }
                    .row .label { color: #64748b; }
                    .row .value { font-weight: bold; color: #0f172a; }
                    .total { background: #f0f9ff; padding: 12px; border-radius: 10px; margin-top: 15px; display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; color: #0369a1; }
                    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="receipt-card">
                    <div class="header">
                        <h2>نظام الوجيه لإدارة العيادات</h2>
                        <p>إيصال تحصيل كشف عيادة رسمية</p>
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
                        <span class="label">التاريخ والوقت:</span>
                        <span class="value">${dateStr} — ${timeStr}</span>
                    </div>
                    <div class="row">
                        <span class="label">طريقة السداد:</span>
                        <span class="value">نقدي (خزينة الاستقبال)</span>
                    </div>
                    <div class="total">
                        <span>المبلغ المدفوع:</span>
                        <span>${amount}</span>
                    </div>
                    <div class="footer">
                        نتمنى لكم دوام الصحة والعافية • يرجى الاحتفاظ بالإيصال لمراجعة الاستقبال
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    /**
     * رسم المخطط البياني للإيرادات (Chart.js)
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
                    y: {
                        beginAtZero: true,
                        ticks: { font: { family: 'Cairo' } }
                    },
                    x: {
                        ticks: { font: { family: 'Cairo' } }
                    }
                }
            }
        });
    },

    /**
     * رسم المخطط البياني لنسب الحضور والإلغاء (Chart.js Doughnut)
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
