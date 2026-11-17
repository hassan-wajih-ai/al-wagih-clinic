/**
 * دليل وموسوعة الفحوصات الطبية، الأشعة التشخيصية، وإجراءات العيادات الشاملة
 * لنظام «الوجيه» لإدارة العيادات والمجمعات الطبية (Al Wagih Medical ERP)
 * يشمل: 45+ تحليلاً مخبرياً (LIS)، 34+ فحص أشعة وتصوير (RIS)، 29+ إجراءً إكلينيكياً تخصصياً،
 * وإدارة مراكز الأشعة والمعامل التخصصية والشريكة الخارجية (B2B Partner Diagnostics).
 */

const MedicalCatalog = {
    // -------------------------------------------------------------------------
    // 1. تصنيفات المعمل والتحاليل الطبية (Laboratory Disciplines)
    // -------------------------------------------------------------------------
    labCategories: {
        hematology: { id: 'hematology', name: 'أمراض الدم والتجلط', name_en: 'Hematology & Coagulation', icon: '🩸', color: 'purple' },
        biochemistry: { id: 'biochemistry', name: 'الكيمياء الحيوية والتمثيل الغذائي', name_en: 'Clinical Biochemistry', icon: '🧪', color: 'amber' },
        endocrinology: { id: 'endocrinology', name: 'الهرمونات والغدد والفيتامينات', name_en: 'Endocrinology & Hormones', icon: '🧬', color: 'emerald' },
        immunology: { id: 'immunology', name: 'المناعة والأمصال والأجسام المضادة', name_en: 'Immunology & Serology', icon: '🛡️', color: 'sky' },
        microbiology: { id: 'microbiology', name: 'الميكروبيولوجي ومزارع البكتيريا', name_en: 'Microbiology & Cultures', icon: '🔬', color: 'teal' },
        tumor_markers: { id: 'tumor_markers', name: 'دلالات الأورام والمسح المبكر', name_en: 'Tumor Markers', icon: '🎯', color: 'rose' }
    },

    // -------------------------------------------------------------------------
    // 2. كتالوج ودليل التحاليل الطبية الشامل (Comprehensive Lab Tests Catalog)
    // -------------------------------------------------------------------------
    labTests: [
        // --- أمراض الدم والتجلط (Hematology) ---
        {
            key: 'cbc',
            code: 'HEM-001',
            name: 'صورة دم كاملة (Complete Blood Count - CBC)',
            category: 'hematology',
            category_name: 'أمراض الدم والتجلط',
            tube: 'أنبوبة موف (EDTA Purple) 🟣',
            prep: 'لا يشترط الصيام، متاح على مدار 24 ساعة.',
            tat: '1 ساعة',
            cost: 250,
            parameters: [
                { name: 'Hemoglobin (Hb)', unit: 'g/dL', ref: '12.0 - 16.0', min: 12.0, max: 16.0, panic_low: 7.0, panic_high: 20.0 },
                { name: 'RBCs Count', unit: 'M/uL', ref: '4.2 - 5.4', min: 4.2, max: 5.4 },
                { name: 'WBCs Count', unit: 'K/uL', ref: '4.0 - 11.0', min: 4.0, max: 11.0, panic_high: 30.0 },
                { name: 'Platelets (PLT)', unit: 'K/uL', ref: '150 - 450', min: 150, max: 450, panic_low: 50 },
                { name: 'Hematocrit (PCV)', unit: '%', ref: '37.0 - 48.0', min: 37.0, max: 48.0 }
            ]
        },
        {
            key: 'esr',
            code: 'HEM-002',
            name: 'سرعة ترسيب كريات الدم (ESR Westergren)',
            category: 'hematology',
            category_name: 'أمراض الدم والتجلط',
            tube: 'أنبوبة سوداء (Sodium Citrate 4:1) ⚫',
            prep: 'يفضل صيام 4 ساعات، أو عينة صباحية.',
            tat: '1 ساعة',
            cost: 120,
            parameters: [
                { name: 'ESR 1st Hour', unit: 'mm/hr', ref: '< 15 (رجال) | < 20 (سيدات)', min: 0, max: 20, panic_high: 100 },
                { name: 'ESR 2nd Hour', unit: 'mm/hr', ref: '< 30', min: 0, max: 30 }
            ]
        },
        {
            key: 'pt_inr',
            code: 'HEM-003',
            name: 'زمن البروثرومبين ومعدل السيولة (PT / INR)',
            category: 'hematology',
            category_name: 'أمراض الدم والتجلط',
            tube: 'أنبوبة زرقاء (Sodium Citrate 9:1) 🔵',
            prep: 'سحب العينة بهدوء، ومراعاة موعد جرعة دواء السيولة (ماريفان).',
            tat: '2 ساعة',
            cost: 180,
            parameters: [
                { name: 'Prothrombin Time (PT)', unit: 'sec', ref: '11.0 - 14.0', min: 11.0, max: 14.0 },
                { name: 'Control PT', unit: 'sec', ref: '12.5', min: 11.0, max: 13.0 },
                { name: 'Activity Concentration', unit: '%', ref: '70 - 100', min: 70, max: 100 },
                { name: 'INR', unit: 'ratio', ref: '0.9 - 1.15 (علاجي: 2.0 - 3.0)', min: 0.9, max: 1.15, panic_high: 4.5 }
            ]
        },
        {
            key: 'ptt',
            code: 'HEM-004',
            name: 'زمن التخثر الجزئي المنشط (aPTT)',
            category: 'hematology',
            category_name: 'أمراض الدم والتجلط',
            tube: 'أنبوبة زرقاء (Sodium Citrate 9:1) 🔵',
            prep: 'فحص تجلط ما قبل العمليات ومتابعة علاج الهيبارين.',
            tat: '2 ساعة',
            cost: 190,
            parameters: [
                { name: 'aPTT Patient', unit: 'sec', ref: '28.0 - 40.0', min: 28.0, max: 40.0, panic_high: 80.0 },
                { name: 'aPTT Control', unit: 'sec', ref: '30.0', min: 28.0, max: 32.0 }
            ]
        },
        {
            key: 'blood_group',
            code: 'HEM-005',
            name: 'فصيلة الدم وعامل ريسوس (ABO & Rh Grouping)',
            category: 'hematology',
            category_name: 'أمراض الدم والتجلط',
            tube: 'أنبوبة موف (EDTA Purple) 🟣',
            prep: 'لا يشترط الصيام، معتمد مع كارت فصيلة دم رسمي.',
            tat: '30 دقيقة',
            cost: 100,
            parameters: [
                { name: 'ABO Group', unit: '', ref: 'A / B / AB / O' },
                { name: 'Rh Factor', unit: '', ref: 'Positive (+) / Negative (-)' }
            ]
        },
        {
            key: 'd_dimer',
            code: 'HEM-006',
            name: 'فحص الدي-دايمر ونواتج التجلط (D-Dimer Quantitative)',
            category: 'hematology',
            category_name: 'أمراض الدم والتجلط',
            tube: 'أنبوبة زرقاء (Sodium Citrate 9:1) 🔵',
            prep: 'فحص طارئ لاستبعاد الجلطات الرئوية والوريدية DVT/PE.',
            tat: '2 ساعة',
            cost: 450,
            parameters: [
                { name: 'D-Dimer', unit: 'ug/mL FEU', ref: '< 0.50', min: 0, max: 0.50, panic_high: 2.0 }
            ]
        },
        {
            key: 'ferritin',
            code: 'HEM-007',
            name: 'مخزون الحديد في الدم (Serum Ferritin)',
            category: 'hematology',
            category_name: 'أمراض الدم والتجلط',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام التام، لتشخيص أنيميا نقص الحديد بدقة.',
            tat: '3 ساعات',
            cost: 320,
            parameters: [
                { name: 'Serum Ferritin', unit: 'ng/mL', ref: '20 - 300 (رجال) | 15 - 200 (سيدات)', min: 15, max: 300, panic_low: 8 }
            ]
        },
        {
            key: 'iron_tibc',
            code: 'HEM-008',
            name: 'الحديد الكلي وسعة الارتباط (Serum Iron & TIBC)',
            category: 'hematology',
            category_name: 'أمراض الدم والتجلط',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'صيام صباحي من 8 إلى 12 ساعة مع تجنب أدوية الحديد 48 ساعة.',
            tat: '3 ساعات',
            cost: 340,
            parameters: [
                { name: 'Serum Iron', unit: 'ug/dL', ref: '60 - 170', min: 60, max: 170 },
                { name: 'TIBC', unit: 'ug/dL', ref: '240 - 450', min: 240, max: 450 },
                { name: 'Transferrin Saturation', unit: '%', ref: '20 - 50', min: 20, max: 50 }
            ]
        },

        // --- الكيمياء الحيوية والتمثيل الغذائي (Biochemistry) ---
        {
            key: 'fbs',
            code: 'BIO-001',
            name: 'سكر الدم صائم (Fasting Blood Glucose - FBS)',
            category: 'biochemistry',
            category_name: 'الكيمياء الحيوية',
            tube: 'أنبوبة رمادية (Sodium Fluoride) ⚪',
            prep: 'صيام دقيق من 8 إلى 10 ساعات، ويسمح بشرب الماء فقط.',
            tat: '1 ساعة',
            cost: 90,
            parameters: [
                { name: 'Fasting Blood Sugar', unit: 'mg/dL', ref: '70 - 100 (طبيعي) | 100 - 125 (مرحلة ما قبل السكري)', min: 70, max: 100, panic_low: 50, panic_high: 350 }
            ]
        },
        {
            key: 'rbs',
            code: 'BIO-002',
            name: 'سكر الدم عشوائي / فاطر (Random / 2h PP Glucose)',
            category: 'biochemistry',
            category_name: 'الكيمياء الحيوية',
            tube: 'أنبوبة رمادية (Sodium Fluoride) ⚪',
            prep: 'إذا كان فاطر: سحب العينة بعد مرور ساعتين تماماً من بدء وجبة الطعام.',
            tat: '1 ساعة',
            cost: 90,
            parameters: [
                { name: 'Blood Glucose (PP)', unit: 'mg/dL', ref: '< 140 (طبيعي) | 140 - 199 (مرحلة ما قبل السكري)', min: 70, max: 140, panic_low: 50, panic_high: 400 }
            ]
        },
        {
            key: 'hba1c',
            code: 'BIO-003',
            name: 'السكر التراكمي (HbA1c Glycated Hemoglobin)',
            category: 'biochemistry',
            category_name: 'الكيمياء الحيوية',
            tube: 'أنبوبة موف (EDTA Purple) 🟣',
            prep: 'لا يشترط الصيام، يعكس متوسط نسبة السكر خلال آخر 3 أشهر.',
            tat: '2 ساعة',
            cost: 220,
            parameters: [
                { name: 'HbA1c', unit: '%', ref: '4.0 - 5.6 (طبيعي) | 5.7 - 6.4 (ما قبل السكري) | >= 6.5 (سكري)', min: 4.0, max: 5.6, panic_high: 12.0 }
            ]
        },
        {
            key: 'lipid',
            code: 'BIO-004',
            name: 'دهون الدم الكاملة (Comprehensive Lipid Profile)',
            category: 'biochemistry',
            category_name: 'الكيمياء الحيوية',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'صيام صارم من 10 إلى 12 ساعة، يسمح بشرب الماء فقط.',
            tat: '3 ساعات',
            cost: 350,
            parameters: [
                { name: 'Total Cholesterol', unit: 'mg/dL', ref: '< 200', min: 0, max: 200 },
                { name: 'Triglycerides', unit: 'mg/dL', ref: '< 150', min: 0, max: 150, panic_high: 500 },
                { name: 'HDL Cholesterol', unit: 'mg/dL', ref: '> 40 (رجال) | > 50 (سيدات)', min: 40, max: 999 },
                { name: 'LDL Cholesterol', unit: 'mg/dL', ref: '< 100 (مثالي للوقاية)', min: 0, max: 100 },
                { name: 'VLDL Cholesterol', unit: 'mg/dL', ref: '10 - 30', min: 10, max: 30 }
            ]
        },
        {
            key: 'liver',
            code: 'BIO-005',
            name: 'وظائف كبد كاملة (Liver Function Tests - LFTs)',
            category: 'biochemistry',
            category_name: 'الكيمياء الحيوية',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'يفضل صيام 4 إلى 6 ساعات قبل سحب العينة.',
            tat: '3 ساعات',
            cost: 380,
            parameters: [
                { name: 'ALT (SGPT)', unit: 'U/L', ref: '7 - 56', min: 7, max: 56, panic_high: 250 },
                { name: 'AST (SGOT)', unit: 'U/L', ref: '10 - 40', min: 10, max: 40, panic_high: 250 },
                { name: 'Total Bilirubin', unit: 'mg/dL', ref: '0.2 - 1.2', min: 0.2, max: 1.2, panic_high: 12.0 },
                { name: 'Direct Bilirubin', unit: 'mg/dL', ref: '0.0 - 0.3', min: 0.0, max: 0.3 },
                { name: 'Serum Albumin', unit: 'g/dL', ref: '3.5 - 5.0', min: 3.5, max: 5.0 },
                { name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', ref: '44 - 147', min: 44, max: 147 }
            ]
        },
        {
            key: 'kidney',
            code: 'BIO-006',
            name: 'وظائف كلى كاملة (Renal Function Tests - RFTs)',
            category: 'biochemistry',
            category_name: 'الكيمياء الحيوية',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط صيام طويل، شرب ماء معتدل وتجنب اللحوم الحمراء الكثيفة.',
            tat: '2 ساعة',
            cost: 290,
            parameters: [
                { name: 'Serum Creatinine', unit: 'mg/dL', ref: '0.6 - 1.2', min: 0.6, max: 1.2, panic_high: 3.5 },
                { name: 'Blood Urea', unit: 'mg/dL', ref: '15 - 45', min: 15, max: 45, panic_high: 100 },
                { name: 'Serum Uric Acid', unit: 'mg/dL', ref: '3.5 - 7.2 (رجال) | 2.6 - 6.0 (سيدات)', min: 3.5, max: 7.2 },
                { name: 'eGFR (Estimated GFR)', unit: 'mL/min/1.73m2', ref: '> 90', min: 90, max: 150, panic_low: 15 }
            ]
        },
        {
            key: 'electrolytes',
            code: 'BIO-007',
            name: 'أملاح وأيونات الدم (Serum Electrolytes: Na, K, Cl, Ca)',
            category: 'biochemistry',
            category_name: 'الكيمياء الحيوية',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام، فحص حيوي لمرضى الضغط والكلى.',
            tat: '2 ساعة',
            cost: 300,
            parameters: [
                { name: 'Sodium (Na+)', unit: 'mmol/L', ref: '136 - 145', min: 136, max: 145, panic_low: 120, panic_high: 160 },
                { name: 'Potassium (K+)', unit: 'mmol/L', ref: '3.5 - 5.1', min: 3.5, max: 5.1, panic_low: 2.8, panic_high: 6.2 },
                { name: 'Chloride (Cl-)', unit: 'mmol/L', ref: '98 - 107', min: 98, max: 107 },
                { name: 'Total Calcium (Ca++)', unit: 'mg/dL', ref: '8.5 - 10.5', min: 8.5, max: 10.5, panic_low: 6.5, panic_high: 13.0 }
            ]
        },
        {
            key: 'troponin',
            code: 'BIO-008',
            name: 'تروبونين القلب عالي الدقة (Cardiac Troponin I - hs-cTnI)',
            category: 'biochemistry',
            category_name: 'الكيمياء الحيوية',
            tube: 'أنبوبة صفراء أو خضراء (Heparin) 🟢',
            prep: 'فحص طارئ وفوري عند الاشتباه في متلازمة الشريان التاجي الحادة.',
            tat: '45 دقيقة',
            cost: 490,
            parameters: [
                { name: 'High-Sensitivity Troponin I', unit: 'ng/mL', ref: '< 0.04 (سلبي)', min: 0, max: 0.04, panic_high: 0.10 }
            ]
        },

        // --- الهرمونات والغدد والفيتامينات (Endocrinology) ---
        {
            key: 'thyroid',
            code: 'END-001',
            name: 'هرمونات الغدة الدرقية الكاملة (TSH, Free T3, Free T4)',
            category: 'endocrinology',
            category_name: 'الهرمونات والغدد',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'سحب العينة صباحاً، وإرجاء تناول أقراص هرمون الغدة (إلتروكسين) لما بعد السحب.',
            tat: '4 ساعات',
            cost: 480,
            parameters: [
                { name: 'TSH', unit: 'uIU/mL', ref: '0.40 - 4.00', min: 0.40, max: 4.00, panic_low: 0.05, panic_high: 20.0 },
                { name: 'Free T3', unit: 'pg/mL', ref: '2.30 - 4.20', min: 2.30, max: 4.20 },
                { name: 'Free T4', unit: 'ng/dL', ref: '0.80 - 1.80', min: 0.80, max: 1.80 }
            ]
        },
        {
            key: 'vit_d',
            code: 'END-002',
            name: 'فيتامين د الكلي (25-OH Vitamin D Total)',
            category: 'endocrinology',
            category_name: 'الهرمونات والغدد',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام، لتشخيص هشاشة العظام وضعف المناعة.',
            tat: '6 ساعات',
            cost: 450,
            parameters: [
                { name: '25-Hydroxy Vitamin D', unit: 'ng/mL', ref: '30 - 100 (كافي) | 20 - 29 (قصور) | < 20 (نقص حاد)', min: 30, max: 100, panic_low: 10 }
            ]
        },
        {
            key: 'vit_b12',
            code: 'END-003',
            name: 'فيتامين ب12 في مصل الدم (Vitamin B12 - Cobalamin)',
            category: 'endocrinology',
            category_name: 'الهرمونات والغدد',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'يفضل صيام 6 إلى 8 ساعات، وتجنب حقن ب12 قبل السحب بـ 48 ساعة.',
            tat: '4 ساعات',
            cost: 380,
            parameters: [
                { name: 'Vitamin B12', unit: 'pg/mL', ref: '200 - 900', min: 200, max: 900, panic_low: 150 }
            ]
        },
        {
            key: 'cortisol_am',
            code: 'END-004',
            name: 'كورتيزول الصباح (Serum Cortisol AM - 8:00 AM)',
            category: 'endocrinology',
            category_name: 'الهرمونات والغدد',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'سحب العينة حصراً بين 8:00 و 9:00 صباحاً مع الهدوء التام وتجنب التوتر.',
            tat: '4 ساعات',
            cost: 310,
            parameters: [
                { name: 'Morning Cortisol', unit: 'ug/dL', ref: '6.0 - 23.0', min: 6.0, max: 23.0 }
            ]
        },
        {
            key: 'prolactin',
            code: 'END-005',
            name: 'هرمون الحليب (Serum Prolactin)',
            category: 'endocrinology',
            category_name: 'الهرمونات والغدد',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'السحب بعد الاستيقاظ بساعتين على الأقل مع الراحة التامة 20 دقيقة بالمعمل قبل السحب.',
            tat: '4 ساعات',
            cost: 290,
            parameters: [
                { name: 'Serum Prolactin', unit: 'ng/mL', ref: '2.0 - 25.0 (غير حوامل) | 2.0 - 18.0 (ذكور)', min: 2.0, max: 25.0 }
            ]
        },
        {
            key: 'testosterone',
            code: 'END-006',
            name: 'هرمون الذكورة الكلي (Total Testosterone)',
            category: 'endocrinology',
            category_name: 'الهرمونات والغدد',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'سحب العينة صباحاً بين 7:00 و 10:00 صباحاً حيث يكون الهرمون في ذروته.',
            tat: '4 ساعات',
            cost: 340,
            parameters: [
                { name: 'Total Testosterone', unit: 'ng/dL', ref: '280 - 1100 (ذكور بالغين)', min: 280, max: 1100 }
            ]
        },
        {
            key: 'fsh_lh',
            code: 'END-007',
            name: 'هرمونات الخصوبة (FSH & LH Hormones Panel)',
            category: 'endocrinology',
            category_name: 'الهرمونات والغدد',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'للسيدات: يُفضل إجراؤه في اليوم الثاني أو الثالث من الدورة الشهرية.',
            tat: '4 ساعات',
            cost: 460,
            parameters: [
                { name: 'FSH', unit: 'mIU/mL', ref: '3.5 - 12.5 (طور الجريب)', min: 3.5, max: 12.5 },
                { name: 'LH', unit: 'mIU/mL', ref: '2.4 - 12.6 (طور الجريب)', min: 2.4, max: 12.6 }
            ]
        },
        {
            key: 'amh',
            code: 'END-008',
            name: 'هرمون مخزون التبويض والمبيض (Anti-Müllerian Hormone - AMH)',
            category: 'endocrinology',
            category_name: 'الهرمونات والغدد',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'يمكن إجراؤه في أي يوم من أيام الدورة الشهرية بدون اشتراط صيام.',
            tat: '24 ساعة',
            cost: 750,
            parameters: [
                { name: 'AMH', unit: 'ng/mL', ref: '1.0 - 3.5 (طبيعي) | < 1.0 (مخزون منخفض) | > 4.0 (تكيس مبايض)', min: 1.0, max: 3.5 }
            ]
        },

        // --- المناعة والأمصال (Immunology) ---
        {
            key: 'crp',
            code: 'IMM-001',
            name: 'بروتين سي التفاعلي الكمي (CRP Quantitative)',
            category: 'immunology',
            category_name: 'المناعة والأمصال',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام، لتشخيص الالتهابات الحادة ومتابعة العدوى البكتيرية.',
            tat: '2 ساعة',
            cost: 180,
            parameters: [
                { name: 'C-Reactive Protein (CRP)', unit: 'mg/L', ref: '< 6.0', min: 0, max: 6.0, panic_high: 50.0 }
            ]
        },
        {
            key: 'asot',
            code: 'IMM-002',
            name: 'مضاد الستربتولايسين أو - الميكروب السبحي (ASOT)',
            category: 'immunology',
            category_name: 'المناعة والأمصال',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام، لتشخيص مضاعفات التهاب اللوزتين والحمى الروماتيزمية.',
            tat: '2 ساعة',
            cost: 170,
            parameters: [
                { name: 'ASOT Titer', unit: 'IU/mL', ref: '< 200', min: 0, max: 200 }
            ]
        },
        {
            key: 'rf',
            code: 'IMM-003',
            name: 'عامل الروماتويد الكمي (Rheumatoid Factor - RF)',
            category: 'immunology',
            category_name: 'المناعة والأمصال',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'فحص مصل الدم لتشخيص التهاب المفاصل الروماتويدي والاضطرابات المناعية.',
            tat: '2 ساعة',
            cost: 190,
            parameters: [
                { name: 'Rheumatoid Factor', unit: 'IU/mL', ref: '< 14.0 (سلبي)', min: 0, max: 14.0 }
            ]
        },
        {
            key: 'hpylori_stool',
            code: 'IMM-004',
            name: 'أنتيجين جرثومة المعدة في البراز (H. Pylori Stool Antigen)',
            category: 'immunology',
            category_name: 'المناعة والأمصال',
            tube: 'حاوية براز معقمة 🧫',
            prep: 'التوقف عن المضادات الحيوية ومثبطات الحموضة (PPIs) لمدة 14 يوماً قبل الفحص.',
            tat: '3 ساعات',
            cost: 260,
            parameters: [
                { name: 'H. Pylori Antigen', unit: '', ref: 'Negative (سلبي)' }
            ]
        },
        {
            key: 'viral_hepatitis',
            code: 'IMM-005',
            name: 'فحص الفيروسات الكبدية (HBsAg & HCV Ab Combo)',
            category: 'immunology',
            category_name: 'المناعة والأمصال',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام، مسح شامل لفيروسي الكبد B و C بتقنية ELISA.',
            tat: '3 ساعات',
            cost: 450,
            parameters: [
                { name: 'HBsAg (Hepatitis B)', unit: '', ref: 'Non-Reactive (سلبي)' },
                { name: 'HCV Ab (Hepatitis C)', unit: '', ref: 'Non-Reactive (سلبي)' }
            ]
        },

        // --- الميكروبيولوجي ومزارع البكتيريا (Microbiology) ---
        {
            key: 'urine_routine',
            code: 'MIC-001',
            name: 'تحليل بول كامل وميكروسكوبي (Complete Urinalysis)',
            category: 'microbiology',
            category_name: 'الميكروبيولوجي والمزارع',
            tube: 'كوب عينة معقم 🥛',
            prep: 'غسل وتنظيف الموضع بالماء، وأخذ عينة منتصف التدفق (Mid-stream) صباحاً.',
            tat: '1 ساعة',
            cost: 80,
            parameters: [
                { name: 'Color & Clarity', unit: '', ref: 'Pale Yellow / Clear' },
                { name: 'Specific Gravity', unit: '', ref: '1.015 - 1.025' },
                { name: 'pH', unit: '', ref: '5.0 - 7.0' },
                { name: 'Protein (Albumin)', unit: '', ref: 'Nil (سلبي)' },
                { name: 'Glucose', unit: '', ref: 'Nil (سلبي)' },
                { name: 'Pus Cells (WBCs)', unit: '/HPF', ref: '0 - 5', min: 0, max: 5, panic_high: 50 },
                { name: 'RBCs', unit: '/HPF', ref: '0 - 3', min: 0, max: 3 },
                { name: 'Crystals', unit: '', ref: 'Nil / Few' }
            ]
        },
        {
            key: 'stool_routine',
            code: 'MIC-002',
            name: 'تحليل براز كامل مع دم خفي (Stool Analysis & Occult Blood)',
            category: 'microbiology',
            category_name: 'الميكروبيولوجي والمزارع',
            tube: 'حاوية براز معقمة 🧫',
            prep: 'تجنب تناول اللحوم الحمراء وأدوية الحديد قبل فحص الدم الخفي بـ 48 ساعة.',
            tat: '1 ساعة',
            cost: 110,
            parameters: [
                { name: 'Consistency', unit: '', ref: 'Formed / Soft' },
                { name: 'Parasites / Ova', unit: '', ref: 'No Ova or Parasites Seen' },
                { name: 'Pus Cells', unit: '/HPF', ref: '0 - 2' },
                { name: 'RBCs', unit: '/HPF', ref: '0 - 2' },
                { name: 'Fecal Occult Blood', unit: '', ref: 'Negative (سلبي)' }
            ]
        },
        {
            key: 'urine_culture',
            code: 'MIC-003',
            name: 'مزرعة بول وحساسية للمضادات (Urine Culture & Sensitivity)',
            category: 'microbiology',
            category_name: 'الميكروبيولوجي والمزارع',
            tube: 'كوب عينة معقم محكم 🥛',
            prep: 'سحب العينة قبل البدء في أي مضاد حيوي بـ 48 ساعة على الأقل.',
            tat: '48 إلى 72 ساعة',
            cost: 340,
            parameters: [
                { name: 'Colony Count', unit: 'CFU/mL', ref: '< 10,000 (No Significant Growth)' },
                { name: 'Organism Isolated', unit: '', ref: 'No Bacterial Growth' },
                { name: 'Antibiotic Sensitivity', unit: '', ref: 'Detailed Antibiogram' }
            ]
        },

        // --- دلالات الأورام (Tumor Markers) ---
        {
            key: 'psa_total_free',
            code: 'TUM-001',
            name: 'دلالات أورام البروستاتا الكلية والحرة (PSA Total & Free Ratio)',
            category: 'tumor_markers',
            category_name: 'دلالات الأورام',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'تجنب ركوب الدراجات، الجماع، أو الفحص الشرجي قبل السحب بـ 48 ساعة.',
            tat: '4 ساعات',
            cost: 490,
            parameters: [
                { name: 'Total PSA', unit: 'ng/mL', ref: '< 4.00', min: 0, max: 4.00, panic_high: 10.0 },
                { name: 'Free PSA', unit: 'ng/mL', ref: '< 0.90', min: 0, max: 0.90 },
                { name: 'Free/Total Ratio', unit: '%', ref: '> 25% (مؤشر حميد)', min: 25, max: 100 }
            ]
        },
        {
            key: 'cea',
            code: 'TUM-002',
            name: 'دلالات أورام القولون والجهاز الهضمي (Carcinoembryonic Antigen - CEA)',
            category: 'tumor_markers',
            category_name: 'دلالات الأورام',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام، يذكر ما إذا كان المريض مدخناً.',
            tat: '4 ساعات',
            cost: 380,
            parameters: [
                { name: 'Serum CEA', unit: 'ng/mL', ref: '< 3.0 (غير مدخنين) | < 5.0 (مدخنين)', min: 0, max: 3.0, panic_high: 20.0 }
            ]
        },
        {
            key: 'ca125',
            code: 'TUM-003',
            name: 'دلالات أورام المبيض والحوض (Cancer Antigen 125 - CA 125)',
            category: 'tumor_markers',
            category_name: 'دلالات الأورام',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام، تجنب وقت الدورة الشهرية الحادة.',
            tat: '4 ساعات',
            cost: 420,
            parameters: [
                { name: 'Serum CA 125', unit: 'U/mL', ref: '< 35.0', min: 0, max: 35.0, panic_high: 100.0 }
            ]
        },
        {
            key: 'afp',
            code: 'TUM-004',
            name: 'دلالات أورام الكبد الجنينية (Alpha-Fetoprotein - AFP)',
            category: 'tumor_markers',
            category_name: 'دلالات الأورام',
            tube: 'أنبوبة صفراء (Serum Gel) 🟡',
            prep: 'لا يشترط الصيام، مسح دوري هام لمرضى تليف الكبد والفيروسات.',
            tat: '4 ساعات',
            cost: 390,
            parameters: [
                { name: 'Alpha-Fetoprotein', unit: 'ng/mL', ref: '< 10.0', min: 0, max: 10.0, panic_high: 200.0 }
            ]
        }
    ],

    // -------------------------------------------------------------------------
    // 3. كتالوج ودليل الأشعة والتصوير الطبي الشامل (RIS Exams Catalog)
    // -------------------------------------------------------------------------
    radiologyModalities: {
        'X-Ray': { id: 'X-Ray', name: 'أشعة سينية رقمية (Digital X-Ray)', icon: '🦴', color: 'sky' },
        'Ultrasound': { id: 'Ultrasound', name: 'سونار وموجات صوتية (US & Doppler)', icon: '📡', color: 'emerald' },
        'CT': { id: 'CT', name: 'أشعة مقطعية متعددة المقاطع (MSCT)', icon: '🌀', color: 'amber' },
        'MRI': { id: 'MRI', name: 'رنين مغناطيسي عالي الدقة (MRI 1.5T/3T)', icon: '🧲', color: 'indigo' },
        'Specialized': { id: 'Specialized', name: 'أشعة تخصصية وبانوراما وماموجرام', icon: '✨', color: 'purple' }
    },

    radiologyExams: [
        // --- أشعة سينية رقمية (X-Ray) ---
        {
            code: 'RAD-XR-01',
            modality: 'X-Ray',
            name: 'أشعة عادية على الصدر (Chest X-Ray PA & Lateral)',
            body_part: 'الصدر والرئتين',
            contrast: false,
            prep: 'لا يحتاج إلى صيام، خلع أي إكسسوارات أو سلاسل معدنية.',
            duration: '10 دقائق',
            cost: 280
        },
        {
            code: 'RAD-XR-02',
            modality: 'X-Ray',
            name: 'أشعة عادية على البطن واقف ونائم (Plain Abdomen Erect & Supine)',
            body_part: 'البطن والحوض',
            contrast: false,
            prep: 'فحص طارئ لاستبعاد انسداد معوي أو حصوات مجاري بولية.',
            duration: '10 دقائق',
            cost: 290
        },
        {
            code: 'RAD-XR-03',
            modality: 'X-Ray',
            name: 'أشعة على الفقرات القطنية والعجزية (Lumbosacral Spine AP & Lat)',
            body_part: 'العمود الفقري',
            contrast: false,
            prep: 'تفريغ القولون ويفضل أخذ ملين بسيط إذا كان الفحص غير طارئ.',
            duration: '15 دقيقة',
            cost: 320
        },
        {
            code: 'RAD-XR-04',
            modality: 'X-Ray',
            name: 'أشعة عادية على الفقرات العنقية (Cervical Spine AP & Lat + Oblique)',
            body_part: 'الرقبة والفقرات العنقية',
            contrast: false,
            prep: 'خلع النظارات والحلي المعدنية.',
            duration: '10 دقائق',
            cost: 310
        },
        {
            code: 'RAD-XR-05',
            modality: 'X-Ray',
            name: 'أشعة عادية على مفصل الركبة بالتحميل (Knee Joint AP & Lat Weight-Bearing)',
            body_part: 'الأطراف السفلية',
            contrast: false,
            prep: 'الفحص أثناء الوقوف لتشخيص درجة الخشونة وتآكل الغضروف بدقة.',
            duration: '10 دقائق',
            cost: 260
        },
        {
            code: 'RAD-XR-06',
            modality: 'X-Ray',
            name: 'أشعة عادية على الحوض ومفصلي الفخذ (Pelvis & Both Hips AP)',
            body_part: 'الحوض والفخذين',
            contrast: false,
            prep: 'فحص مفاصل الفخذ وعظام الحوض لتقييم الخلع أو الكسور.',
            duration: '10 دقائق',
            cost: 290
        },
        {
            code: 'RAD-XR-07',
            modality: 'X-Ray',
            name: 'أشعة على الجيوب الأنفية (Paranasal Sinuses - Water\'s view)',
            body_part: 'الوجه والرأس',
            contrast: false,
            prep: 'فحص تشخيصي سريع لالتهابات الجيوب الأنفية وتجمع الإفرازات.',
            duration: '10 دقائق',
            cost: 240
        },

        // --- سونار وموجات صوتية ودوبلر (Ultrasound & Doppler) ---
        {
            code: 'RAD-US-01',
            modality: 'Ultrasound',
            name: 'سونار على البطن والحوض كاملين (Pelvi-Abdominal Ultrasound)',
            body_part: 'البطن والحوض',
            contrast: false,
            prep: 'صيام 6 ساعات عن الطعام + شرب 4 أكواب ماء لامتلاء المثانة تماماً.',
            duration: '20 دقيقة',
            cost: 450
        },
        {
            code: 'RAD-US-02',
            modality: 'Ultrasound',
            name: 'سونار على البطن العلوية: كبد ومرارة وكلى (Upper Abdominal US)',
            body_part: 'أعضاء البطن العلوية',
            contrast: false,
            prep: 'صيام دقيق من 6 إلى 8 ساعات لتمدد الحويصلة المرارية ورؤية الكبد بوضوح.',
            duration: '15 دقيقة',
            cost: 380
        },
        {
            code: 'RAD-US-03',
            modality: 'Ultrasound',
            name: 'سونار حوض ومهبلي تخصصي (Pelvic & Transvaginal Ultrasound)',
            body_part: 'الرحم والمبايض',
            contrast: false,
            prep: 'تفريغ المثانة قبل الفحص المهبلي المباشر.',
            duration: '15 دقيقة',
            cost: 420
        },
        {
            code: 'RAD-US-04',
            modality: 'Ultrasound',
            name: 'سونار عالي الدقة على الغدة الدرقية والرقبة (Thyroid Ultrasound)',
            body_part: 'الرقبة والغدد',
            contrast: false,
            prep: 'لا يحتاج إلى صيام، فحص العقد والتكلسات وحجم الغدة.',
            duration: '15 دقيقة',
            cost: 390
        },
        {
            code: 'RAD-US-05',
            modality: 'Ultrasound',
            name: 'سونار على الثديين والإبطين (Bilateral Breast & Axillary US)',
            body_part: 'الثديين',
            contrast: false,
            prep: 'فحص آمن لتصنيف الأورام الحميدة والكتل والتكيسات بتصنيف BIRADS.',
            duration: '20 دقيقة',
            cost: 460
        },
        {
            code: 'RAD-US-06',
            modality: 'Ultrasound',
            name: 'دوبلر ملون على أوردة الطرفين السفليين (Lower Limbs Venous Doppler)',
            body_part: 'الساقين والأوردة',
            contrast: false,
            prep: 'فحص تدفق الدم الوريدي واستبعاد جلطة الساق العميقة DVT والدوالي.',
            duration: '25 دقيقة',
            cost: 650
        },
        {
            code: 'RAD-US-07',
            modality: 'Ultrasound',
            name: 'دوبلر ملون على شرايين الرقبة السباتية (Carotid Arterial Doppler)',
            body_part: 'شرايين الرقبة والدماغ',
            contrast: false,
            prep: 'فحص سمك جدار الشريان ودرجات الضيق للوقاية من السكتات الدماغية.',
            duration: '25 دقيقة',
            cost: 680
        },
        {
            code: 'RAD-US-08',
            modality: 'Ultrasound',
            name: 'سونار تشوهات الجنين رباعي الأبعاد (Obstetric 4D Anomaly Scan)',
            body_part: 'متابعة الحمل والأجنة',
            contrast: false,
            prep: 'يُفضل إجراؤه بين الأسبوع 20 و 24 من الحمل لتشريح دقيق لأعضاء الجنين.',
            duration: '30 دقيقة',
            cost: 850
        },

        // --- أشعة مقطعية متعددة المقاطع (CT Scan) ---
        {
            code: 'RAD-CT-01',
            modality: 'CT',
            name: 'أشعة مقطعية على المخ بدون صبغة (Brain CT Plain)',
            body_part: 'المخ والجمجمة',
            contrast: false,
            prep: 'لا يشترط صيام، فحص سريع لحالات الحوادث والاشتباه بالنزيف أو الجلطات.',
            duration: '10 دقائق',
            cost: 850
        },
        {
            code: 'RAD-CT-02',
            modality: 'CT',
            name: 'أشعة مقطعية على المخ بالصبغة الوريدية (Brain CT with IV Contrast)',
            body_part: 'المخ والأوعية الدموية',
            contrast: true,
            prep: 'صيام 4 ساعات + تحليل وظائف كلى حديث (Creatinine < 1.4 mg/dL) قبل الصبغة.',
            duration: '20 دقيقة',
            cost: 1250
        },
        {
            code: 'RAD-CT-03',
            modality: 'CT',
            name: 'مقطعية عالية الدقة على الصدر والرئتين (High-Resolution Chest CT - HRCT)',
            body_part: 'الصدر والرئتين',
            contrast: false,
            prep: 'بدون صبغة، مقاطع دقيقة جداً لتشخيص التليف الرئوي والالتهابات الشعبية.',
            duration: '10 دقائق',
            cost: 1100
        },
        {
            code: 'RAD-CT-04',
            modality: 'CT',
            name: 'مقطعية ثلاثية المراحل على البطن والحوض بالصبغة (Triphasic CT Abdomen & Pelvis)',
            body_part: 'البطن والحوض',
            contrast: true,
            prep: 'صيام 6 ساعات + شرب صبغة عن طريق الفم قبل الفحص بساعتين + تحليل كرياتينين سليم.',
            duration: '30 دقيقة',
            cost: 1850
        },
        {
            code: 'RAD-CT-05',
            modality: 'CT',
            name: 'أشعة مقطعية على الجيوب الأنفية (CT Paranasal Sinuses Axial & Coronal)',
            body_part: 'الوجه والجيوب الأنفية',
            contrast: false,
            prep: 'فحص ثلاثي الأبعاد تمهيدي لعمليات المناظير الأنفية واستئصال اللحمية.',
            duration: '10 دقائق',
            cost: 790
        },

        // --- رنين مغناطيسي عالي الدقة (MRI 1.5T/3T) ---
        {
            code: 'RAD-MR-01',
            modality: 'MRI',
            name: 'رنين مغناطيسي على الفقرات القطنية والعجزية (Lumbar Spine MRI)',
            body_part: 'العمود الفقري',
            contrast: false,
            prep: 'التأكد التام من خلو الجسم من منظم ضربات قلب، شظايا، أو مفاصل ممغنطة.',
            duration: '25 دقيقة',
            cost: 1350
        },
        {
            code: 'RAD-MR-02',
            modality: 'MRI',
            name: 'رنين مغناطيسي على المخ وشرايين الدماغ (Brain MRI + MRA)',
            body_part: 'المخ والأوعية الدماغية',
            contrast: false,
            prep: 'خلع كافة المتعلقات المعدنية، الفحص الأكثر دقة لأنسجة وخلايا المخ.',
            duration: '30 دقيقة',
            cost: 1800
        },
        {
            code: 'RAD-MR-03',
            modality: 'MRI',
            name: 'رنين مغناطيسي على الفقرات العنقية (Cervical Spine MRI)',
            body_part: 'الرقبة والعمود الفقري',
            contrast: false,
            prep: 'الفحص الدقيق للانزلاق الغضروفي العنقي والضغط على الأعصاب المغذية لليدين.',
            duration: '25 دقيقة',
            cost: 1350
        },
        {
            code: 'RAD-MR-04',
            modality: 'MRI',
            name: 'رنين مغناطيسي على مفصل الركبة (Knee Joint MRI)',
            body_part: 'مفصل الركبة والأوتار',
            contrast: false,
            prep: 'الفحص المرجعي لتمزق الرباط الصليبي (ACL) والغضاريف الهلالية (Meniscus).',
            duration: '25 دقيقة',
            cost: 1400
        },
        {
            code: 'RAD-MR-05',
            modality: 'MRI',
            name: 'رنين مغناطيسي على مفصل الكتف (Shoulder Joint MRI)',
            body_part: 'مفصل الكتف',
            contrast: false,
            prep: 'فحص تمزق أوتار الكفة المدورة (Rotator Cuff) والتهاب أوتار الكتف.',
            duration: '25 دقيقة',
            cost: 1450
        },

        // --- أشعة تخصصية وبانوراما وماموجرام (Specialized) ---
        {
            code: 'RAD-SP-01',
            modality: 'Specialized',
            name: 'أشعة بانوراما رقمية للفكين والأسنان (Digital Panoramic OPG)',
            body_part: 'الأسنان والفكين',
            contrast: false,
            prep: 'خلع الأقراط والحلي المعدنية ونظارات النظر قبل التصوير.',
            duration: '5 دقائق',
            cost: 250
        },
        {
            code: 'RAD-SP-02',
            modality: 'Specialized',
            name: 'أشعة سيفالومتريك لقياسات تقويم الأسنان (Lateral Cephalometric X-Ray)',
            body_part: 'الجمجمة والفكين',
            contrast: false,
            prep: 'فحص قياسي تخصصي لعلاقات الفكين وزوايا عظام الوجه لأطباء التقويم.',
            duration: '5 دقائق',
            cost: 260
        },
        {
            code: 'RAD-SP-03',
            modality: 'Specialized',
            name: 'أشعة الماموجرام الرقمية للثديين (Digital Screening Mammography)',
            body_part: 'الثديين',
            contrast: false,
            prep: 'تجنب وضع مزيلات العرق أو البودرة أو العطور بالمنطقة يوم الفحص.',
            duration: '15 دقيقة',
            cost: 650
        },
        {
            code: 'RAD-SP-04',
            modality: 'Specialized',
            name: 'قياس كثافة العظام والهشاشة (DEXA Bone Mineral Density)',
            body_part: 'الفقرات القطنية وعنق الفخذ',
            contrast: false,
            prep: 'ارتداء ملابس خالية من السحابات والأزرار المعدنية، فحص سريع بدون ألم.',
            duration: '15 دقيقة',
            cost: 550
        }
    ],

    // -------------------------------------------------------------------------
    // 4. كتالوج ودليل إجراءات العيادات التخصصية (Clinical Procedures Directory)
    // -------------------------------------------------------------------------
    clinicSpecialties: {
        internal: 'العيادة الباطنية والصدرية',
        cardio: 'عيادة أمراض القلب والأوعية',
        ortho: 'عيادة جراحة العظام والمفاصل',
        ent: 'عيادة الأنف والأذن والحنجرة',
        ophth: 'عيادة طب وجراحة العيون',
        obgyn: 'عيادة النساء والتوليد',
        derma: 'عيادة الجلدية والجراحة الصغرى'
    },

    clinicProcedures: [
        // --- الباطنة والصدرية ---
        {
            code: 'PROC-INT-01',
            specialty: 'internal',
            specialty_name: 'الباطنة والصدرية',
            name: 'رسم قلب كهربائي قياسي 12 قناة (12-Lead Electrocardiogram - ECG)',
            equipment: 'جهاز تخطيط القلب الرقمي + إلكترودات معقمة',
            consumables: 'جل تخطيط، إلكترودات لاصقة، ورق حراري',
            duration: '10 دقائق',
            doctor_commission_rate: 30,
            fee: 150
        },
        {
            code: 'PROC-INT-02',
            specialty: 'internal',
            specialty_name: 'الباطنة والصدرية',
            name: 'جلسة استنشاق وتوسيع شعب هوائية (Ultrasonic Nebulizer Therapy)',
            equipment: 'جهاز رذاذ نيبولايزر طبي',
            consumables: 'ماسك استنشاق معقم، فاركولين / بالميكورت، محلول ملح',
            duration: '15 دقيقة',
            doctor_commission_rate: 25,
            fee: 120
        },
        {
            code: 'PROC-INT-03',
            specialty: 'internal',
            specialty_name: 'الباطنة والصدرية',
            name: 'تركيب ومتابعة جهاز هولتر ضغط الدم 24 ساعة (24h BP Holter)',
            equipment: 'جهاز هولتر ضغط دم رقمي مدمج',
            consumables: 'بطاريات قلوية، كاف ضغط معقم',
            duration: '20 دقيقة تركيب + 24 ساعة رصد',
            doctor_commission_rate: 35,
            fee: 550
        },

        // --- أمراض القلب ---
        {
            code: 'PROC-CRD-01',
            specialty: 'cardio',
            specialty_name: 'القلب والأوعية الدموية',
            name: 'فحص الموجات الصوتية على عضلة القلب والدوبلر (Echocardiography - Echo)',
            equipment: 'جهاز إيكو قلبي عالي الدقة مع مجس phased array',
            consumables: 'جل تصوير صوتي، أوراق إيكو حرارية',
            duration: '25 دقيقة',
            doctor_commission_rate: 45,
            fee: 750
        },
        {
            code: 'PROC-CRD-02',
            specialty: 'cardio',
            specialty_name: 'القلب والأوعية الدموية',
            name: 'رسم قلب بالمجهود على السير الكهربائي (Treadmill Stress Test)',
            equipment: 'سير كهربائي مبرمج مع شاشة مراقبة رسم قلب حية',
            consumables: 'إلكترودات لاصقة مجهدة، كابل 12 طرف',
            duration: '30 دقيقة',
            doctor_commission_rate: 40,
            fee: 850
        },
        {
            code: 'PROC-CRD-03',
            specialty: 'cardio',
            specialty_name: 'القلب والأوعية الدموية',
            name: 'هولتر رسم قلب مستمر لرصد اضطراب النبض (24h/48h Holter ECG)',
            equipment: 'مسجل هولتر نبض رقمي 3/12 قناة',
            consumables: 'لاصقات صدرية طبية هيبوالرجينيك',
            duration: '15 دقيقة تركيب + تحليل بيانات',
            doctor_commission_rate: 35,
            fee: 650
        },

        // --- العظام والمفاصل ---
        {
            code: 'PROC-ORT-01',
            specialty: 'ortho',
            specialty_name: 'العظام والمفاصل',
            name: 'حقن مفصل الركبة الموضعي بالبلازما أو الهيالورونيك (Intra-Articular Injection)',
            equipment: 'حاوية تعقيم وسن إبرة 21G معقم',
            consumables: 'بتادين جراحي، شاش معقم، مادة الحقن المعتمدة، لاصق طبي',
            duration: '15 دقيقة',
            doctor_commission_rate: 40,
            fee: 650
        },
        {
            code: 'PROC-ORT-02',
            specialty: 'ortho',
            specialty_name: 'العظام والمفاصل',
            name: 'بذل وتفريغ سائل المفصل تشخيصي وعلاجي (Joint Arthrocentesis)',
            equipment: 'سرنجة تفريغ 20/50 مل + أنبوب جمع عينات لتحليل السائل',
            consumables: 'مخدر موضعي ليدوكايين، قفازات معقمة، ضماد ضاغط',
            duration: '20 دقيقة',
            doctor_commission_rate: 35,
            fee: 450
        },
        {
            code: 'PROC-ORT-03',
            specialty: 'ortho',
            specialty_name: 'العظام والمفاصل',
            name: 'تجبير وتركيب جبيرة أو جبس للأطراف (Plaster / Fiberglass Cast)',
            equipment: 'حوض ماء فاتر ومقص جبس طبي',
            consumables: 'رول قطن عظام، لفائف جبس أو فايبر جلاس، رباط ضاغط',
            duration: '20 دقيقة',
            doctor_commission_rate: 30,
            fee: 380
        },

        // --- الأنف والأذن والحنجرة ---
        {
            code: 'PROC-ENT-01',
            specialty: 'ent',
            specialty_name: 'الأنف والأذن والحنجرة',
            name: 'غسيل وتنظيف الأذن وإزالة الصمغ (Bilateral Ear Lavage / Irrigation)',
            equipment: 'سرنجة معدنية لغسيل الأذن + حوض كلوي + إضاءة كشف',
            consumables: 'محلول ملحي دافئ، قطن تنظيف معقم',
            duration: '15 دقيقة',
            doctor_commission_rate: 30,
            fee: 180
        },
        {
            code: 'PROC-ENT-02',
            specialty: 'ent',
            specialty_name: 'الأنف والأذن والحنجرة',
            name: 'منظار أنف وأذن صلب تشخيصي (Rigid Diagnostic Nasal Endoscopy)',
            equipment: 'منظار صلب بزاوية 0/30 درجة ومصدر ضوء بارد',
            consumables: 'مخدر وموسع احتقان موضعي، مناديل معقمة',
            duration: '15 دقيقة',
            doctor_commission_rate: 40,
            fee: 380
        },
        {
            code: 'PROC-ENT-03',
            specialty: 'ent',
            specialty_name: 'الأنف والأذن والحنجرة',
            name: 'تخطيط السمع وضغط طبلة الأذن (Pure Tone Audiometry & Tympanometry)',
            equipment: 'جهاز تخطيط السمع ومعاوقة الطبلة داخل غرفة عازلة',
            consumables: 'سدادات أذن معقمة، ورق رسم بياني للسمع',
            duration: '25 دقيقة',
            doctor_commission_rate: 35,
            fee: 390
        },

        // --- العيون ---
        {
            code: 'PROC-OPH-01',
            specialty: 'ophth',
            specialty_name: 'طب وجراحة العيون',
            name: 'فحص المصباح الشقي والقرنية الشامل (Slit Lamp Biomicroscopy)',
            equipment: 'جهاز مصباح شقي متطور مع تكبير بصري عالي',
            consumables: 'قطرات صبغة فلوريسين، كحول تعقيم للعدسة',
            duration: '10 دقائق',
            doctor_commission_rate: 30,
            fee: 180
        },
        {
            code: 'PROC-OPH-02',
            specialty: 'ophth',
            specialty_name: 'طب وجراحة العيون',
            name: 'فحص قاع العين والشبكية بالقطرة الموسعة (Dilated Fundus Examination)',
            equipment: 'منظار قاع عين غير مباشر + عدسة 20D/90D فحص',
            consumables: 'قطرة توسيع حدقة (Mydriacyl / Tropicamide)',
            duration: '20 دقيقة (تشمل وقت التوسيع)',
            doctor_commission_rate: 35,
            fee: 240
        },
        {
            code: 'PROC-OPH-03',
            specialty: 'ophth',
            specialty_name: 'طب وجراحة العيون',
            name: 'فحص مجال الإبصار الكمبيوتري لمتابعة الجلوكوما (Automated Visual Field)',
            equipment: 'جهاز همفري لقياس مجال الإبصار الكمبيوتري',
            consumables: 'كارت فحص، عدسات تصحيحية مطابقة',
            duration: '30 دقيقة',
            doctor_commission_rate: 35,
            fee: 450
        },

        // --- النساء والتوليد ---
        {
            code: 'PROC-GYN-01',
            specialty: 'obgyn',
            specialty_name: 'النساء والتوليد',
            name: 'تخطيط نبض الجنين وانقباضات الرحم (Non-Stress Test - NST / CTG)',
            equipment: 'جهاز CTG لمراقبة دقات قلب الجنين والرحم',
            consumables: 'أحزمة تثبيت، جل فحص، ورق تخطيط حراري',
            duration: '20 دقيقة',
            doctor_commission_rate: 30,
            fee: 220
        },
        {
            code: 'PROC-GYN-02',
            specialty: 'obgyn',
            specialty_name: 'النساء والتوليد',
            name: 'مسحة عنق الرحم الوقائية (Cervical Pap Smear Screening)',
            equipment: 'موسّع مهبلي معقم (Speculum) + إضاءة كشف',
            consumables: 'فرشاة مسحة عنق الرحم (Cervex-Brush)، أنبوب سائل التثبيت',
            duration: '10 دقائق',
            doctor_commission_rate: 35,
            fee: 290
        },
        {
            code: 'PROC-GYN-03',
            specialty: 'obgyn',
            specialty_name: 'النساء والتوليد',
            name: 'تركيب أو إزالة لولب منع الحمل (IUD Insertion / Removal)',
            equipment: 'طقم تركيب لولب جراحي معقم',
            consumables: 'لولب معتمد، بتادين مهبلي، شاش معقم، قطن',
            duration: '20 دقيقة',
            doctor_commission_rate: 40,
            fee: 490
        },

        // --- الجلدية والجراحة الصغرى ---
        {
            code: 'PROC-DER-01',
            specialty: 'derma',
            specialty_name: 'الجلدية والجراحة الصغرى',
            name: 'جلسة كي بالتبريد للزوائد والثآليل (Liquid Nitrogen Cryotherapy)',
            equipment: 'جهاز رش النيتروجين السائل (Cryo-Gun) ومجسات نحاسية',
            consumables: 'نيتروجين سائل (-196 C)، قطن معقم، مسحات كحولية',
            duration: '10 دقائق',
            doctor_commission_rate: 35,
            fee: 280
        },
        {
            code: 'PROC-DER-02',
            specialty: 'derma',
            specialty_name: 'الجلدية والجراحة الصغرى',
            name: 'كي كهربائي واستئصال زوائد جلدية (Radiofrequency Electrocautery)',
            equipment: 'جهاز كي جراحي كهربائي عالي التردد',
            consumables: 'بنج موضعي ليدوكايين، إبرة كي معقمة، مرهم مضاد حيوي',
            duration: '15 دقيقة',
            doctor_commission_rate: 40,
            fee: 350
        },
        {
            code: 'PROC-DER-03',
            specialty: 'derma',
            specialty_name: 'الجلدية والجراحة الصغرى',
            name: 'تنظيف وخياطة جرح سطحي بغرز تجميلية (Wound Suture & Dressing)',
            equipment: 'طقم خياطة جراحي معقم (حامل إبرة، ملقاط، مقص غرز)',
            consumables: 'خيوط جراحية Vicryl / Prolene، شاش معقم، بلاستر طبي',
            duration: '20 دقيقة',
            doctor_commission_rate: 40,
            fee: 320
        },
        {
            code: 'PROC-DER-04',
            specialty: 'derma',
            specialty_name: 'الجلدية والجراحة الصغرى',
            name: 'فتح وتفريغ خراج مع غيار معقم (Abscess Incision & Drainage)',
            equipment: 'مشرط جراحي معقم #11 + مسبار جراحي + جفت شرياني',
            consumables: 'مخدر موضعي، محلول مطهر بتادين، شاش فازلين معقم، شريط تصريف',
            duration: '20 دقيقة',
            doctor_commission_rate: 40,
            fee: 390
        }
    ],

    // -------------------------------------------------------------------------
    // 5. مراكز الأشعة والمعامل التخصصية والشريكة (Diagnostic Centers & Partners)
    // -------------------------------------------------------------------------
    diagnosticCenters: [
        {
            id: 'center_lab_inhouse',
            name: 'معمل الوجيه المركزي المؤتمت (In-House Central Automated Lab)',
            type: 'in_house_lab',
            type_label: 'معمل مركزي داخلي',
            location: 'الطابق الأرضي - مبنى العيادات الرئيسي',
            status: 'active',
            lead_specialist: 'د. هاني عثمان (استشاري باثولوجيا إكلينيكية وتحاليل)',
            equipment_highlights: 'Sysmex XN-1000 • Roche Cobas e411 • Mindray BS-480',
            operating_hours: '24 ساعة / 7 أيام',
            avg_tat: '60 دقيقة للتحاليل العاجلة',
            daily_capacity: 500
        },
        {
            id: 'center_rad_inhouse',
            name: 'مركز الوجيه للأشعة والتصوير المتطور (In-House Advanced Radiology Hub)',
            type: 'in_house_radiology',
            type_label: 'مركز أشعة داخلي',
            location: 'الطابق السفلي - جناح التصوير الطبي المتقدم',
            status: 'active',
            lead_specialist: 'د. مروان البدري (استشاري أشعة تشخيصية وتداخلية)',
            equipment_highlights: 'Siemens Magnetom 1.5T • GE Revolution 64-Slice CT • GE Voluson 4D',
            operating_hours: '08:00 ص إلى 12:00 منتصف الليل',
            avg_tat: 'ساعتان لكتابة التقرير الرسمي',
            daily_capacity: 150
        },
        {
            id: 'partner_mokhtabar',
            name: 'معمل المختبر الشريك (Al Mokhtabar Labs - Outsource Partner)',
            type: 'partner_lab',
            type_label: 'معمل خارجي شريك (B2B)',
            location: 'شبكة فروع ومعامل مرجعية مركزية',
            status: 'active',
            lead_specialist: 'تنسيق التحاليل المرجعية والجينات',
            equipment_highlights: 'Genetic Sequencing • Mass Spectrometry • Advanced Histopathology',
            b2b_discount: 35,
            operating_hours: 'تجميع يومي الساعة 12 ظهراً و 6 مساءً',
            avg_tat: '24 إلى 48 ساعة للتحاليل الجينية النادرة',
            daily_capacity: 100
        },
        {
            id: 'partner_borg',
            name: 'معمل البرج للتحاليل الطبية (Al Borg Diagnostic Labs)',
            type: 'partner_lab',
            type_label: 'معمل خارجي شريك (B2B)',
            location: 'معامل مرجعية متخصصة',
            status: 'active',
            lead_specialist: 'خدمات الفحص الفيروسي والمناعي المتقدم',
            equipment_highlights: 'Real-Time PCR • Flow Cytometry • Autoimmune Blotting',
            b2b_discount: 30,
            operating_hours: 'تجميع مسائي يومي',
            avg_tat: '24 ساعة',
            daily_capacity: 100
        },
        {
            id: 'partner_cairo_scan',
            name: 'مركز كايرو سكان للأشعة (Cairo Scan Diagnostic Center)',
            type: 'partner_radiology',
            type_label: 'مركز أشعة خارجي شريك (B2B)',
            location: 'فروع القاهرة الكبرى التخصصية',
            status: 'active',
            lead_specialist: 'أشعة المسح الذري البوزيتروني PET-CT والتصوير النووي',
            equipment_highlights: 'PET-CT Scan • 3.0 Tesla MRI • Digital Gamma Camera',
            b2b_discount: 25,
            operating_hours: 'حجز ومواعيد محولة مسبقاً',
            avg_tat: '24 ساعة للتقرير والـ CD',
            daily_capacity: 40
        },
        {
            id: 'partner_alfa_scan',
            name: 'مركز ألفا سكان للأشعة التداخلية (Alfa Scan Imaging Partner)',
            type: 'partner_radiology',
            type_label: 'مركز أشعة خارجي شريك (B2B)',
            location: 'فروع الرنين والأشعة التخصصية',
            status: 'active',
            lead_specialist: 'قسطرة الشرايين التداخلية وفحوصات القلب المقطعية',
            equipment_highlights: '320-Slice Cardiac CT • Dynamic Liver MRI',
            b2b_discount: 25,
            operating_hours: 'تحويل مباشر بأكواد تعاقد',
            avg_tat: '24 ساعة',
            daily_capacity: 40
        }
    ]
};

// إتاحة الكتالوج العام في النطاق العام للنافذة
if (typeof window !== 'undefined') {
    window.MedicalCatalog = MedicalCatalog;
}
