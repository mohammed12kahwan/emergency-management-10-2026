'use strict';

/*
 * ER Visit Console
 * التمريض / الفحص السريري
 *
 * المبدأ:
 * - لا DocType جديد.
 * - لا Nursing Vitals.
 * - Vital Signs القياسي هو المصدر الوحيد للعلامات الحيوية.
 * - ER Clinical Note هو مصدر ملاحظات التمريض.
 * - ER Patient Intake / ER Patient Queue / Patient Encounter هي مصادر سياق الزيارة.
 * - لا يوجد API مخصص لهذا الملف.
 */


function er_clinical_escape(value) {

    return $('<div>')
        .text(value == null ? '' : String(value))
        .html();

}


function er_clinical_get_current_encounter() {

    if (
        typeof current_encounter !== 'undefined'
        &&
        current_encounter
    ) {
        return current_encounter;
    }


    const route =
        typeof frappe !== 'undefined'
            ? frappe.get_route()
            : [];


    if (
        route
        &&
        route.length > 1
        &&
        route[1]
    ) {
        return route[1];
    }


    return null;

}


function er_clinical_age_from_dob(dob) {

    if (!dob) {
        return '—';
    }


    const birth =
        new Date(String(dob) + 'T00:00:00');


    if (Number.isNaN(birth.getTime())) {
        return '—';
    }


    const today =
        new Date();


    let age =
        today.getFullYear() -
        birth.getFullYear();


    const month =
        today.getMonth() -
        birth.getMonth();


    if (
        month < 0
        ||
        (
            month === 0
            &&
            today.getDate() < birth.getDate()
        )
    ) {
        age -= 1;
    }


    return age >= 0 ? age : '—';

}


function er_clinical_fetch_context() {

    const encounter_name =
        er_clinical_get_current_encounter();


    if (!encounter_name) {

        return Promise.reject(
            new Error('لا توجد زيارة طبية محددة.')
        );

    }


    return frappe.db
        .get_doc(
            'Patient Encounter',
            encounter_name
        )
        .then(function(encounter) {

            if (!encounter || !encounter.patient) {

                throw new Error(
                    'الزيارة الطبية لا تحتوي على مريض.'
                );

            }


            const intake_promise =
                encounter.er_patient_intake
                    ? frappe.db.get_doc(
                        'ER Patient Intake',
                        encounter.er_patient_intake
                    )
                    : Promise.resolve(null);


            const patient_promise =
                frappe.db.get_doc(
                    'Patient',
                    encounter.patient
                );


            const queue_promise =
                encounter.er_patient_intake
                    ? frappe.db.get_list(
                        'ER Patient Queue',
                        {
                            filters: {
                                patient_intake:
                                    encounter.er_patient_intake
                            },

                            fields: [
                                'name',
                                'patient_intake',
                                'patient',
                                'patient_name',
                                'queue_number',
                                'queue_status',
                                'triage_level',
                                'priority',
                                'waiting_area',
                                'current_location',
                                'assigned_nurse',
                                'bed',
                                'bed_status',
                                'arrival_time',
                                'waiting_minutes',
                                'called_time',
                                'response_minutes',
                                'examination_start'
                            ],

                            order_by:
                                'modified desc',

                            page_length:
                                1
                        }
                    )
                    : Promise.resolve([]);


            const triage_name_promise =
                encounter.er_patient_intake
                    ? intake_promise.then(function(intake) {

                        return intake && intake.triage_record
                            ? intake.triage_record
                            : null;

                    })
                    : Promise.resolve(null);


            return Promise.all([
                intake_promise,
                patient_promise,
                queue_promise,
                triage_name_promise
            ]).then(function(result) {

                return {
                    encounter:
                        encounter,

                    intake:
                        result[0],

                    patient:
                        result[1],

                    queue:
                        result[2] && result[2][0]
                            ? result[2][0]
                            : null,

                    triage_name:
                        result[3] || null
                };

            });

        });

}


function er_clinical_get_vitals(context) {

    if (
        !context
        ||
        !context.patient
    ) {
        return Promise.resolve([]);
    }


    const patient_name =
        context.patient.name;


    const intake_name =
        context.intake
        &&
        context.intake.name
            ? context.intake.name
            : null;


    const encounter_name =
        context.encounter
        &&
        context.encounter.name
            ? context.encounter.name
            : null;


    const triage_name =
        context.triage_name
            ? context.triage_name
            : null;


    const fields = [
        'name',
        'creation',
        'docstatus',
        'patient',
        'patient_name',
        'encounter',
        'er_intake',
        'signs_date',
        'signs_time',
        'temperature',
        'pulse',
        'respiratory_rate',
        'bp_systolic',
        'bp_diastolic',
        'spo2',
        'pain_score',
        'custom_blood_glucose',
        'height',
        'weight',
        'bmi',
        'critical_alert',
        'esi_level',
        'triage_notes',
        'esi_reason',
        'triage_result',
        'triage_nurse',
        'recorded_by',
        'vital_signs_note'
    ];


    const promises = [];


    /*
     * المصدر الرئيسي للسجل:
     * كل Vital Signs المرتبط بالـ ER Patient Intake.
     *
     * هذا يشمل:
     * 1) قراءة الترياج الأولى.
     * 2) قراءات التمريض اللاحقة.
     */
    if (intake_name) {

        promises.push(
            frappe.db.get_list(
                'Vital Signs',
                {
                    filters: {
                        patient:
                            patient_name,

                        er_intake:
                            intake_name
                    },

                    fields:
                        fields,

                    order_by:
                        'signs_date desc, signs_time desc, creation desc',

                    page_length:
                        1000
                }
            )
        );

    }


    /*
     * نضيف أيضًا أي Vital Signs مرتبط بالـ Encounter
     * حتى لا نفقد قراءة موجودة على الزيارة الطبية فقط.
     */
    if (encounter_name) {

        promises.push(
            frappe.db.get_list(
                'Vital Signs',
                {
                    filters: {
                        patient:
                            patient_name,

                        encounter:
                            encounter_name
                    },

                    fields:
                        fields,

                    order_by:
                        'signs_date desc, signs_time desc, creation desc',

                    page_length:
                        1000
                }
            )
        );

    }


    /*
     * احتياط أخير:
     * سجل الترياج نفسه يجب أن يظهر حتى لو كان الربط
     * بالـ Intake أو Encounter غير موجود لأي سبب.
     */
    if (triage_name) {

        promises.push(
            frappe.db.get_doc(
                'Vital Signs',
                triage_name
            ).catch(function() {
                return null;
            })
        );

    }


    /*
     * إذا لم يوجد Intake ولا Encounter،
     * نرجع إلى آخر Vital Signs للمريض.
     */
    if (!promises.length) {

        promises.push(
            frappe.db.get_list(
                'Vital Signs',
                {
                    filters: {
                        patient:
                            patient_name
                    },

                    fields:
                        fields,

                    order_by:
                        'signs_date desc, signs_time desc, creation desc',

                    page_length:
                        1000
                }
            )
        );

    }


    return Promise
        .all(promises)
        .then(function(results) {

            const by_name = {};


            results.forEach(function(result) {

                if (!result) {
                    return;
                }


                /*
                 * get_list يرجع Array
                 */
                if (Array.isArray(result)) {

                    result.forEach(function(row) {

                        if (
                            row
                            &&
                            row.name
                        ) {
                            by_name[row.name] =
                                row;
                        }

                    });

                    return;
                }


                /*
                 * get_doc يرجع سجلًا واحدًا.
                 */
                if (result.name) {

                    by_name[result.name] =
                        result;

                }

            });


            const rows =
                Object.keys(by_name)
                    .map(function(name) {
                        return by_name[name];
                    });


            /*
             * الأحدث أولًا.
             *
             * لذلك:
             * vitals[0] = آخر قراءة للمستطيل
             * وبقية rows = التاريخ الكامل للزيارة
             */
            rows.sort(function(a, b) {

                const a_date =
                    a.signs_date
                        ? String(a.signs_date)
                        : '';

                const b_date =
                    b.signs_date
                        ? String(b.signs_date)
                        : '';


                if (a_date !== b_date) {
                    return b_date.localeCompare(a_date);
                }


                const a_time =
                    a.signs_time != null
                        ? String(a.signs_time)
                        : '';

                const b_time =
                    b.signs_time != null
                        ? String(b.signs_time)
                        : '';


                if (a_time !== b_time) {
                    return b_time.localeCompare(a_time);
                }


                const a_creation =
                    a.creation
                        ? String(a.creation)
                        : '';

                const b_creation =
                    b.creation
                        ? String(b.creation)
                        : '';


                return b_creation.localeCompare(a_creation);

            });


            return rows;

        })
        .catch(function(error) {

            console.error(
                'ER Clinical: failed to fetch Vital Signs',
                error
            );

            return [];

        });

}


async function er_clinical_get_nursing_notes(context) {

    const encounter =
        context && context.encounter
            ? context.encounter
            : {};

    const encounter_name =
        typeof encounter === "string"
            ? encounter
            : encounter.name;

    if (!encounter_name) {
        return [];
    }

    try {

        const response =
            await frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Patient Encounter",
                    name: encounter_name
                }
            });

        const doc =
            response && response.message
                ? response.message
                : {};

        const rows =
            Array.isArray(doc.er_clinical_notes)
                ? doc.er_clinical_notes
                : [];

        return rows
            .filter(function(row) {
                return String(
                    row.note_type || ""
                ).trim() === "Nursing Note";
            })
            .sort(function(a, b) {

                const ta =
                    String(
                        a.note_time ||
                        a.modified ||
                        ""
                    );

                const tb =
                    String(
                        b.note_time ||
                        b.modified ||
                        ""
                    );

                return tb.localeCompare(ta);

            })
            .slice(0, 50);

    }
    catch (error) {

        console.error(
            "ER NURSING NOTES LOAD ERROR:",
            error
        );

        return [];
    }
}

function er_clinical_get_triage_levels() {

    return frappe.db.get_list(
        'ER Triage Level',
        {
            fields: [
                'name'
            ],

            order_by:
                'name asc',

            page_length:
                100
        }
    ).catch(function() {

        return [];

    });

}


function er_clinical_get_active_vital(
    context,
    vitals
) {

    const triage_name =
        context
        &&
        context.triage_name
            ? context.triage_name
            : null;


    /*
     * الشاشة التمريضية تعرض أحدث قراءة فعلية دائمًا.
     * triage_record يستخدم فقط كاحتياط عندما لا توجد قراءة في القائمة.
     */
    if (
        vitals
        &&
        vitals.length
    ) {
        return vitals[0];
    }


    if (triage_name) {
        return frappe.db
            .get_doc(
                'Vital Signs',
                triage_name
            )
            .catch(function() {
                return null;
            });
    }


    return null;

}


function er_clinical_render_vital_value(value) {

    if (
        value === null
        ||
        value === undefined
        ||
        value === ''
    ) {
        return '—';
    }


    return er_clinical_escape(value);

}


function er_clinical_build_context_summary(context) {

    const encounter =
        context.encounter || {};


    const patient =
        context.patient || {};


    const intake =
        context.intake || {};


    const queue =
        context.queue || {};


    const full_name =
        patient.patient_name
        ||
        encounter.patient_name
        ||
        intake['اسم_المريض']
        ||
        patient.name
        ||
        '—';


    const age =
        er_clinical_age_from_dob(
            patient.dob
        );


    const gender =
        patient.sex
        ||
        patient.gender
        ||
        '—';


    const status =
        (encounter && encounter.er_visit_status)
        ||
        intake.status
        ||
        queue.queue_status
        ||
        '—';


    const triage =
        intake.acuity
        ||
        queue.triage_level
        ||
        '—';


    const waiting_area =
        queue.waiting_area
        ||
        '—';


    const bed =
        queue.bed
        ||
        intake.assigned_bed
        ||
        '—';


    const nurse =
        queue.assigned_nurse
        ||
        '—';


    return `

        <div class="er-clinical-context-card">

            <div class="er-clinical-context-title">
                🧑‍⚕️ بيانات المريض والزيارة
            </div>

            <div class="er-clinical-context-grid">

                <div class="er-clinical-context-item">
                    <span>المريض</span>
                    <strong>
                        ${er_clinical_escape(full_name)}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>رقم المريض</span>
                    <strong>
                        ${er_clinical_escape(patient.name || '—')}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>العمر</span>
                    <strong>
                        ${er_clinical_escape(age)}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>الجنس</span>
                    <strong>
                        ${er_clinical_escape(gender)}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>رقم الزيارة الطبية</span>
                    <strong>
                        ${er_clinical_escape(encounter.name || '—')}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>حالة الطوارئ</span>
                    <strong data-er-clinical-status>
                        ${er_clinical_escape(status)}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>مستوى الفرز</span>
                    <strong data-er-clinical-esi>
                        ${er_clinical_escape(triage)}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>منطقة الانتظار</span>
                    <strong>
                        ${er_clinical_escape(waiting_area)}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>السرير</span>
                    <strong>
                        ${er_clinical_escape(bed)}
                    </strong>
                </div>

                <div class="er-clinical-context-item">
                    <span>الممرض المسؤول</span>
                    <strong>
                        ${er_clinical_escape(nurse)}
                    </strong>
                </div>

            </div>

        </div>

    `;

}


function er_clinical_render_vitals_form(
    context,
    active_vital,
    triage_levels
) {

    const vital =
        active_vital || {};


    const intake =
        context.intake || {};


    const is_triage =
        intake.status === 'تحت الفرز';


    /*
     * إذا كان هناك سجل Vital Signs محفوظ وما زال مسودة،
     * نظهر زر تسجيل الترياج بعد الحفظ وإعادة بناء النافذة.
     */
    const has_pending_vital =
        !!(
            vital.name
            &&
            Number(vital.docstatus || 0) !== 1
        );


    const triage_options =
        (triage_levels || [])
            .map(function(row) {

                const selected =
                    row.name ===
                    (vital.esi_level || intake.acuity)
                        ? 'selected'
                        : '';


                return `
                    <option
                        value="${er_clinical_escape(row.name)}"
                        ${selected}
                    >
                        ${er_clinical_escape(row.name)}
                    </option>
                `;

            })
            .join('');


    return `

        <div
            class="er-clinical-nursing-card"
            data-vital-name="${er_clinical_escape(vital.name || '')}"
            data-vital-docstatus="${Number(vital.docstatus || 0)}"
            data-er-nursing-is-triage="${is_triage ? '1' : '0'}"
        >

            <div class="er-clinical-card-header">

                <div>

                    <div class="er-clinical-card-title">
                        ❤️ العلامات الحيوية والمتابعة التمريضية
                    </div>

                    <div class="er-clinical-card-subtitle">
                        ${is_triage
                            ? 'استكمال سجل الترياج المرتبط بالزيارة'
                            : 'إنشاء قراءة جديدة في Vital Signs القياسي'
                        }
                    </div>

                </div>

                <div class="er-clinical-vital-status">

                    <span>
                        ${vital.docstatus === 1
                            ? 'معتمد'
                            : vital.name
                                ? 'مسودة'
                                : 'قراءة جديدة'
                        }
                    </span>

                    <strong data-er-clinical-vital-name>
                        ${er_clinical_escape(vital.name || '—')}
                    </strong>

                </div>

            </div>


            <div class="er-clinical-form-section er-nursing-source-form" style="display:none !important;">

                <div class="er-clinical-section-title">
                    العلامات الحيوية الأساسية
                </div>

                <div class="er-clinical-field-grid">

                    <label>
                        <span>الحرارة °C</span>
                        <input
                            type="number"
                            step="0.1"
                            class="form-control"
                            data-er-vital-field="temperature"
                            value="${er_clinical_escape(vital.temperature || '')}"
                            placeholder="37.0"
                        >
                    </label>

                    <label>
                        <span>النبض bpm</span>
                        <input
                            type="number"
                            class="form-control"
                            data-er-vital-field="pulse"
                            value="${er_clinical_escape(vital.pulse || '')}"
                            placeholder="80"
                        >
                    </label>

                    <label>
                        <span>معدل التنفس /min</span>
                        <input
                            type="number"
                            class="form-control"
                            data-er-vital-field="respiratory_rate"
                            value="${er_clinical_escape(vital.respiratory_rate || '')}"
                            placeholder="18"
                        >
                    </label>

                    <label>
                        <span>الضغط الانقباضي</span>
                        <input
                            type="number"
                            class="form-control"
                            data-er-vital-field="bp_systolic"
                            value="${er_clinical_escape(vital.bp_systolic || '')}"
                            placeholder="120"
                        >
                    </label>

                    <label>
                        <span>الضغط الانبساطي</span>
                        <input
                            type="number"
                            class="form-control"
                            data-er-vital-field="bp_diastolic"
                            value="${er_clinical_escape(vital.bp_diastolic || '')}"
                            placeholder="80"
                        >
                    </label>

                    <label>
                        <span>SpO₂ %</span>
                        <input
                            type="number"
                            step="0.1"
                            class="form-control"
                            data-er-vital-field="spo2"
                            value="${er_clinical_escape(vital.spo2 || '')}"
                            placeholder="98"
                        >
                    </label>

                    <label>
                        <span>درجة الألم 0–10</span>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            class="form-control"
                            data-er-vital-field="pain_score"
                            value="${vital.pain_score == null ? '' : er_clinical_escape(vital.pain_score)}"
                            placeholder="0"
                        >
                    </label>

                    <label>
                        <span>سكر الدم</span>
                        <input
                            type="number"
                            step="0.1"
                            class="form-control"
                            data-er-vital-field="custom_blood_glucose"
                            value="${er_clinical_escape(vital.custom_blood_glucose || '')}"
                            placeholder="—"
                        >
                    </label>

                    <label>
                        <span>الطول cm</span>
                        <input
                            type="number"
                            step="0.1"
                            class="form-control"
                            data-er-vital-field="height"
                            value="${er_clinical_escape(vital.height || '')}"
                            placeholder="—"
                        >
                    </label>

                    <label>
                        <span>الوزن kg</span>
                        <input
                            type="number"
                            step="0.1"
                            class="form-control"
                            data-er-vital-field="weight"
                            value="${er_clinical_escape(vital.weight || '')}"
                            placeholder="—"
                        >
                    </label>
                </div>

            </div>


            <div class="er-clinical-form-section er-nursing-source-form" style="display:none !important;">

                <div class="er-clinical-section-title">
                    تقييم التمريض والترياج
                </div>

                <div class="er-clinical-field-grid">

                    <label>
                        <span>مستوى الفرز ESI</span>
                        <select
                            class="form-control"
                            data-er-vital-field="esi_level"
                        >
                            <option value="">اختر مستوى الفرز</option>
                            ${triage_options}
                        </select>
                    </label>

                    <label>
                        <span>نتيجة الفرز</span>
                        <select
                            class="form-control"
                            data-er-vital-field="triage_result"
                        >
                            <option value="">اختر</option>
                            <option value="Stable" ${vital.triage_result === 'Stable' ? 'selected' : ''}>Stable</option>
                            <option value="Urgent" ${vital.triage_result === 'Urgent' ? 'selected' : ''}>Urgent</option>
                            <option value="Critical" ${vital.triage_result === 'Critical' ? 'selected' : ''}>Critical</option>
                            <option value="Resuscitation" ${vital.triage_result === 'Resuscitation' ? 'selected' : ''}>Resuscitation</option>
                        </select>
                    </label>

                    <label>
                        <span>ممرض الفرز</span>
                        <select
                            class="form-control"
                            data-er-vital-field="triage_nurse"
                            data-current-triage-nurse="${er_clinical_escape(vital.triage_nurse || '')}"
                        >
                            <option value="">اختر اسم الممرض</option>
                        </select>
                    </label>




                </div>


                <div class="er-clinical-checkbox-row">

                    <label>
                        <input
                            type="checkbox"
                            data-er-vital-field="critical_alert"
                            ${vital.critical_alert ? 'checked' : ''}
                        >
                        تنبيه حرج
                    </label>

                </div>

            </div>


            <div class="er-clinical-form-section er-nursing-source-form" style="display:none !important;">

                <div class="er-clinical-section-title">
                    ملاحظات الترياج والمتابعة
                </div>

                <label class="er-clinical-wide-field">

                    <span>ملاحظات الترياج</span>

                    <textarea
                        class="form-control"
                        rows="3"
                        data-er-vital-field="triage_notes"
                    >${er_clinical_escape(vital.triage_notes || '')}</textarea>

                </label>


                <label class="er-clinical-wide-field">

                    <span>سبب مستوى الفرز</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-vital-field="esi_reason"
                    >${er_clinical_escape(vital.esi_reason || '')}</textarea>

                </label>


                <label class="er-clinical-wide-field">

                    <span>ملاحظة العلامات الحيوية</span>

                    <textarea
                        class="form-control"
                        rows="3"
                        data-er-vital-field="vital_signs_note"
                    >${er_clinical_escape(vital.vital_signs_note || '')}</textarea>

                </label>

            </div>


            <div
                style="display:none;"
                data-er-nursing-hidden-vital-actions
            >

                <button
                    type="button"
                    data-er-clinical-action="save-vitals"
                >
                    حفظ
                </button>

                <button
                    type="button"
                    data-er-clinical-action="submit-triage"
                >
                    تسجيل الترياج
                </button>

            </div>

            <div
                class="er-clinical-save-status"
                data-er-clinical-save-status
                style="display:none;"
            ></div>

        </div>

    `;

}


function er_clinical_render_vitals_history(
    vitals,
    current_name
) {

    if (
        !vitals
        ||
        !vitals.length
    ) {

        return `

            <div class="er-clinical-empty">
                لا توجد قراءات حيوية مسجلة لهذه الزيارة.
            </div>

        `;

    }


    const rows =
        vitals
            .map(function(vital) {

                const bp =
                    (
                        vital.bp_systolic ||
                        vital.bp_diastolic
                    )
                        ? String(
                            vital.bp_systolic || ''
                        )
                        +
                        '/'
                        +
                        String(
                            vital.bp_diastolic || ''
                        )
                        : '—';


                const active =
                    vital.name === current_name
                        ? 'er-clinical-history-active'
                        : '';

                const status_label =
                    Number(vital.docstatus || 0) === 1
                        ? 'معتمد'
                        : 'مسودة';


                const is_draft =
                    Number(vital.docstatus || 0) === 0;


                const select_cell =
                    is_draft
                        ? `
                            <input
                                type="checkbox"
                                class="form-check-input"
                                data-er-vital-select
                                value="${er_clinical_escape(vital.name)}"
                                title="تحديد هذه المسودة لتسجيلها"
                            >
                          `
                        : '—';


                return `

                    <tr class="${active}">

                        <td class="text-center">
                            ${select_cell}
                        </td>

                        <td>
                            ${er_clinical_escape(
                                vital.signs_date || '—'
                            )}
                        </td>

                        <td>
                            ${er_clinical_escape(
                                vital.signs_time || '—'
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.temperature
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.pulse
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.respiratory_rate
                            )}
                        </td>

                        <td>
                            ${er_clinical_escape(bp)}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.spo2
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.pain_score
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.esi_level
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.recorded_by
                            )}
                        </td>

                        <td>
                            ${
                                Number(vital.docstatus || 0) === 1
                                    ? 'معتمد'
                                    : 'مسودة'
                            }
                        </td>

                    </tr>

                `;

            })
            .join('');


    return `

        <div class="er-clinical-history-card">

            <div class="er-clinical-card-header">

                <div class="er-clinical-card-title">
                    📊 سجل العلامات الحيوية
                </div>

            </div>


            <div
                class="er-clinical-history-actions"
                style="display:flex;justify-content:flex-start;align-items:center;gap:10px;margin:10px 0;"
            >
                <button
                    type="button"
                    class="btn btn-success"
                    data-er-clinical-action="register-selected-vitals"
                    disabled
                >
                    ✅ تسجيل المسودة المحددة
                </button>

                <span
                    data-er-clinical-selected-vitals-count
                    class="text-muted"
                >
                    لم يتم اختيار مسودة
                </span>
            </div>


            <div class="table-responsive">

                <table class="table table-bordered er-clinical-history-table">

                    <thead>

                        <tr>
                            <th>اختيار</th>
                            <th>التاريخ</th>
                            <th>الوقت</th>
                            <th>الحرارة</th>
                            <th>النبض</th>
                            <th>التنفس</th>
                            <th>الضغط</th>
                            <th>SpO₂</th>
                            <th>الألم</th>
                            <th>ESI</th>
                            <th>المسجل</th>
                            <th>الحالة</th>
                        </tr>

                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>

        </div>

    `;

}



/* =========================================================
 * NURSING — DOCTOR ORDERS / EXECUTION
 *
 * يعرض طلبات الطبيب لنفس Patient Encounter.
 * لا ينشئ طلبات طبية جديدة من التمريض.
 * الدواء يستخدم مسار administer_medication الموجود أصلًا.
 * ========================================================= */

async function er_clinical_get_nursing_orders(
    context
) {
    const encounter =
        context &&
        context.encounter
            ? context.encounter
            : {};

    const encounter_name =
        typeof encounter === "string"
            ? encounter
            : encounter.name;

    if (!encounter_name) {
        return {
            medications: [],
            diagnostics: []
        };
    }

    const medication_promise =
        frappe.db.get_list(
            "Medication Request",
            {
                filters: {
                    order_group:
                        encounter_name
                },

                fields: [
                    "name",
                    "medication",
                    "medication_item",
                    "patient",
                    "patient_name",
                    "practitioner",
                    "practitioner_name",
                    "quantity",
                    "dosage_form",
                    "dosage",
                    "order_description",
                    "priority",
                    "order_group",
                    "er_administration_status",
                    "er_administered_on",
                    "er_administered_by",
                    "er_administration_notes",
                    "creation"
                ],

                order_by:
                    "creation desc",

                page_length:
                    100
            }
        ).catch(function(error) {
            console.error(
                "ER NURSING MEDICATION ORDERS LOAD ERROR:",
                error
            );

            return [];
        });

    const diagnostic_promise =
        frappe.db.get_list(
            "ER Diagnostic Request",
            {
                filters: {
                    patient_encounter:
                        encounter_name
                },

                fields: [
                    "name",
                    "request_type",
                    "test_name",
                    "item_code",
                    "quantity",
                    "lab_status",
                    "radiology_status",
                    "billing_status",
                    "patient",
                    "patient_encounter",
                    "creation"
                ],

                order_by:
                    "creation desc",

                page_length:
                    100
            }
        ).catch(function(error) {
            console.error(
                "ER NURSING DIAGNOSTIC ORDERS LOAD ERROR:",
                error
            );

            return [];
        });

    const result =
        await Promise.all([
            medication_promise,
            diagnostic_promise
        ]);

    return {
        medications:
            result[0] || [],

        diagnostics:
            result[1] || []
    };
}


function er_clinical_nursing_order_status(
    row
) {
    if (
        row &&
        row.er_administration_status
    ) {
        return row.er_administration_status;
    }

    if (
        row &&
        row.request_type ===
            "Laboratory"
    ) {
        return row.lab_status || "Pending";
    }

    if (
        row &&
        row.request_type ===
            "Radiology"
    ) {
        return row.radiology_status || "Requested";
    }

    return "Pending";
}


/* ============================================================
 * NURSING — LAB / RADIOLOGY RESULT POPUPS
 * العرض من نفس مصادر النتائج الأصلية.
 * لا ينشئ سجلاً جديداً ولا ينسخ النتيجة إلى مصدر آخر.
 * ============================================================ */

function er_clinical_escape_result(value) {

    return $("<div>")
        .text(
            value == null
                ? ""
                : String(value)
        )
        .html();

}


function er_clinical_lab_result_value(
    source,
    names
) {

    const obj =
        source || {};

    for (
        let index = 0;
        index < names.length;
        index += 1
    ) {

        const value =
            obj[names[index]];

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        ) {
            return value;
        }

    }

    return "";

}


function er_clinical_render_lab_result_popup(
    data
) {

    const request =
        data &&
        data.diagnostic_request
            ? data.diagnostic_request
            : {};

    const lab_test =
        data &&
        data.lab_test
            ? data.lab_test
            : {};

    const lab_results =
        data &&
        Array.isArray(data.lab_results)
            ? data.lab_results
            : [];

    const test_name =
        request.test_name ||
        request.item_name ||
        lab_test.test_name ||
        lab_test.item_name ||
        "فحوصات المختبر";

    const lab_status =
        request.lab_status ||
        lab_test.lab_status ||
        "—";

    let rows_html = "";

    lab_results.forEach(
        function(result) {

            if (
                !result ||
                typeof result !== "object"
            ) {
                return;
            }

            const test =
                result.test ||
                result.preferred_display_name ||
                result.observation_template ||
                "—";

            const value =
                result.result !== undefined &&
                result.result !== null &&
                String(result.result).trim() !== ""
                    ? result.result
                    : "—";

            const unit =
                result.unit ||
                "—";

            const reference_range =
                result.reference_range ||
                "—";

            const status =
                result.status ||
                "—";

            const result_time =
                result.result_time ||
                "—";

            rows_html +=
                "<tr>" +
                    "<td>" +
                        er_clinical_escape_result(test) +
                    "</td>" +
                    "<td>" +
                        er_clinical_escape_result(value) +
                    "</td>" +
                    "<td>" +
                        er_clinical_escape_result(unit) +
                    "</td>" +
                    "<td>" +
                        er_clinical_escape_result(reference_range) +
                    "</td>" +
                    "<td>" +
                        er_clinical_escape_result(status) +
                    "</td>" +
                    "<td>" +
                        er_clinical_escape_result(result_time) +
                    "</td>" +
                "</tr>";

        }
    );

    if (!rows_html) {

        rows_html =
            "<tr>" +
                '<td colspan="6" style="text-align:center;color:#7b8794;padding:20px;">' +
                    "لم تصدر نتيجة مختبر لهذا الطلب بعد." +
                "</td>" +
            "</tr>";

    }

    const dialog =
        new frappe.ui.Dialog({

            title:
                "🧪 نتيجة المختبر",

            size:
                "large",

            fields: [
                {
                    fieldname:
                        "result_html",

                    fieldtype:
                        "HTML"
                }
            ]

        });

    const html =
        `
            <div
                style="
                    direction:rtl;
                    padding:4px;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        margin-bottom:12px;
                        padding:10px 14px;
                        border:1px solid #d8dee9;
                        border-radius:8px;
                        background:#f8f9fa;
                    "
                >

                    <strong>
                        ${er_clinical_escape_result(test_name)}
                    </strong>

                    <span>
                        الحالة:
                        ${er_clinical_escape_result(lab_status)}
                    </span>

                </div>

                <div
                    style="
                        overflow-x:auto;
                    "
                >

                    <table
                        class="table table-bordered er-lab-result-table"
                        style="
                            width:100%;
                            margin-bottom:0;
                        "
                    >

                        <thead>

                            <tr>

                                <th>الاختبار</th>
                                <th>النتيجة</th>
                                <th>الوحدة</th>
                                <th>المدى المرجعي</th>
                                <th>الحالة</th>
                                <th>وقت النتيجة</th>

                            </tr>

                        </thead>

                        <tbody>
                            ${rows_html}
                        </tbody>

                    </table>

                </div>

            </div>
        `;

    dialog.fields_dict.result_html.$wrapper.html(
        html
    );

    dialog.show();


    const modal_header =
        dialog.$wrapper.find(
            ".modal-header"
        );


    const print_button =
        $(
            '<button type="button" ' +
            'class="btn btn-sm btn-secondary er-nursing-lab-print-result" ' +
            'style="margin-left:8px;">' +
            '🖨️ طباعة' +
            '</button>'
        );


    print_button.on(
        "click.erNursingLabPrint",
        function() {

            const print_window =
                window.open(
                    "",
                    "_blank",
                    "width=1200,height=900"
                );


            if (!print_window) {

                frappe.msgprint(
                    "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع."
                );

                return;

            }


            print_window.document.open();


            print_window.document.write(
                `
                    <!doctype html>

                    <html dir="rtl">

                    <head>

                        <meta charset="utf-8">

                        <title>
                            نتيجة المختبر
                        </title>

                        <style>

                            @page {
                                size: A4 landscape;
                                margin: 12mm;
                            }

                            body {
                                direction: rtl;
                                font-family:
                                    Arial,
                                    "Noto Sans Arabic",
                                    sans-serif;
                                margin: 0;
                                color: #222;
                            }

                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 12px;
                            }

                            th,
                            td {
                                border: 1px solid #999;
                                padding: 8px;
                                text-align: center;
                                vertical-align: middle;
                            }

                            th {
                                font-weight: 700;
                                background: #f0f0f0;
                            }

                            .er-print-header {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                gap: 16px;
                                margin-bottom: 12px;
                                padding-bottom: 10px;
                                border-bottom: 2px solid #222;
                            }

                        </style>

                    </head>

                    <body>

                        ${html}

                    </body>

                    </html>
                `
            );


            print_window.document.close();


            print_window.focus();


            setTimeout(
                function() {

                    print_window.print();

                },
                300
            );

        }
    );


    if (modal_header.length) {

        modal_header.prepend(
            print_button
        );

    }

}


function er_clinical_open_lab_result(
    row,
    context
) {

    if (!row || !row.name) {
        return;
    }

    const encounter =
        context &&
        context.encounter
            ? (
                typeof context.encounter === "string"
                    ? context.encounter
                    : context.encounter.name
            )
            : "";

    if (!encounter) {

        frappe.msgprint({
            title:
                "🧪 نتيجة المختبر",
            message:
                "لا توجد زيارة طبية مرتبطة بالطلب الحالي.",
            indicator:
                "orange"
        });

        return;

    }

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.python.labs.labs.get_lab_result",

        args: {
            encounter:
                encounter,

            diagnostic_request:
                row.name
        },

        freeze:
            false,

        callback:
            function(response) {

                if (
                    response.exc
                    ||
                    !response.message
                ) {

                    frappe.msgprint({
                        title:
                            "🧪 نتيجة المختبر",
                        message:
                            "تعذر تحميل نتيجة المختبر.",
                        indicator:
                            "red"
                    });

                    return;
                }

                er_clinical_render_lab_result_popup(
                    response.message
                );

            }

    });

}


function er_clinical_open_radiology_result(
    row,
    context
) {

    if (!row || !row.name) {
        return;
    }

    const encounter =
        context &&
        context.encounter
            ? (
                typeof context.encounter === "string"
                    ? context.encounter
                    : context.encounter.name
            )
            : "";

    if (!encounter) {

        frappe.msgprint({
            title:
                "🩻 تقرير الأشعة",
            message:
                "لا توجد زيارة طبية مرتبطة بالطلب الحالي.",
            indicator:
                "orange"
        });

        return;

    }

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.python.radiology.radiology.get_radiology_result",

        args: {
            encounter:
                encounter,

            diagnostic_request:
                row.name
        },

        freeze:
            false,

        callback:
            function(response) {

                if (
                    response.exc
                    ||
                    !response.message
                ) {

                    frappe.msgprint({
                        title:
                            "🩻 تقرير الأشعة",
                        message:
                            "تعذر تحميل تقرير الأشعة.",
                        indicator:
                            "red"
                    });

                    return;
                }

                const data =
                    response.message || {};

                const request =
                    data.diagnostic_request || {};

                const radiology =
                    data.radiology || {};

                const result_text =
                    er_clinical_lab_result_value(
                        radiology,
                        [
                            "result",
                            "report",
                            "radiology_report",
                            "findings",
                            "impression"
                        ]
                    )
                    ||
                    er_clinical_lab_result_value(
                        request,
                        [
                            "result",
                            "report",
                            "radiology_report"
                        ]
                    )
                    ||
                    "";

                if (
                    typeof open_radiology_result_modal ===
                    "function"
                ) {

                    open_radiology_result_modal({

                        result:
                            result_text,

                        examination_type:
                            radiology.examination_type
                            ||
                            radiology.service
                            ||
                            request.test_name
                            ||
                            "فحص أشعة",

                        examination_no:
                            radiology.name
                            ||
                            "—",

                        request_no:
                            request.name
                            ||
                            "—",

                        patient_name:
                            request.patient_name
                            ||
                            $(".d-patient-name").first().text()
                            ||
                            "—"

                    });

                    return;

                }

                const dialog =
                    new frappe.ui.Dialog({

                        title:
                            "🩻 تقرير الأشعة",

                        size:
                            "large",

                        fields: [
                            {
                                fieldname:
                                    "report_html",
                                fieldtype:
                                    "HTML"
                            }
                        ]

                    });

                dialog.fields_dict
                    .report_html
                    .$wrapper
                    .html(
                        `
                            <div
                                style="
                                    direction:rtl;
                                    line-height:1.9;
                                "
                            >

                                <div
                                    style="
                                        display:grid;
                                        grid-template-columns:
                                            repeat(3,minmax(0,1fr));
                                        gap:8px;
                                        margin-bottom:12px;
                                    "
                                >

                                    <div>
                                        <strong>الفحص</strong>
                                        <div>
                                            ${er_clinical_escape_result(
                                                radiology.examination_type
                                                ||
                                                radiology.service
                                                ||
                                                request.test_name
                                                ||
                                                "فحص أشعة"
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <strong>رقم الفحص</strong>
                                        <div>
                                            ${er_clinical_escape_result(
                                                radiology.name || "—"
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <strong>رقم الطلب</strong>
                                        <div>
                                            ${er_clinical_escape_result(
                                                request.name || "—"
                                            )}
                                        </div>
                                    </div>

                                </div>

                                <div
                                    style="
                                        min-height:240px;
                                        padding:18px;
                                        border:1px solid #d9e2e8;
                                        border-radius:8px;
                                        background:#fff;
                                        white-space:pre-wrap;
                                    "
                                >
                                    ${
                                        result_text
                                            ? er_clinical_escape_result(result_text)
                                            : "لم يصدر تقرير الأشعة لهذا الطلب بعد."
                                    }
                                </div>

                            </div>
                        `
                    );

                dialog.show();

            }

    });

}




function er_clinical_result_value_present(
    value
) {

    if (
        value === null
        ||
        value === undefined
    ) {
        return false;
    }

    const value_text =
        String(value).trim().toLowerCase();

    return (
        value_text !== ""
        &&
        value_text !== "-"
        &&
        value_text !== "—"
        &&
        value_text !== "null"
    );

}


function er_clinical_lab_result_is_ready(
    data
) {

    const results =
        data &&
        Array.isArray(
            data.lab_results
        )
            ? data.lab_results
            : [];

    return results.some(
        function(result) {

            return (
                result
                &&
                er_clinical_result_value_present(
                    result.result
                )
            );

        }
    );

}


function er_clinical_radiology_result_is_ready(
    data
) {

    const radiology =
        data &&
        data.radiology
            ? data.radiology
            : {};

    const values = [
        radiology.result,
        radiology.report,
        radiology.radiology_report,
        radiology.findings,
        radiology.impression,
        radiology.report_pdf,
        radiology.image_attachment
    ];

    if (
        values.some(
            function(value) {

                return er_clinical_result_value_present(
                    value
                );

            }
        )
    ) {
        return true;
    }

    const status =
        String(
            radiology.status
            ||
            ""
        ).trim().toLowerCase();

    return (
        status === "completed"
        ||
        status === "approved"
    );

}


function er_clinical_update_result_badge(
    button,
    ready
) {

    if (!button || !button.length) {
        return;
    }

    const badge =
        button.find(
            ".er-clinical-result-ready-badge"
        );

    if (!badge.length) {
        return;
    }

    badge.css(
        "display",
        ready
            ? "inline-block"
            : "none"
    );

}


function er_clinical_update_result_ready_badges(
    host
) {

    if (!host) {
        return;
    }

    const diagnostics =
        host.__er_nursing_orders &&
        Array.isArray(
            host.__er_nursing_orders.diagnostics
        )
            ? host.__er_nursing_orders.diagnostics
            : [];

    diagnostics.forEach(
        function(row) {

            if (
                !row
                ||
                !row.name
                ||
                !row.patient_encounter
            ) {
                return;
            }

            const is_lab =
                row.request_type ===
                "Laboratory";

            const is_radiology =
                row.request_type ===
                "Radiology";

            if (
                !is_lab
                &&
                !is_radiology
            ) {
                return;
            }

            const selector =
                is_lab
                    ? ".er-nursing-view-lab-result"
                    : ".er-nursing-view-radiology-result";

            const button =
                $(host)
                    .find(selector)
                    .filter(
                        function() {

                            return (
                                $(this).attr(
                                    "data-request-name"
                                )
                                ===
                                String(row.name)
                            );

                        }
                    )
                    .first();

            if (!button.length) {
                return;
            }

            const method =
                is_lab
                    ? "custom_app.emergency_management.page.er_visit_console.python.labs.labs.get_lab_result"
                    : "custom_app.emergency_management.page.er_visit_console.python.radiology.radiology.get_radiology_result";

            frappe.call({

                method:
                    method,

                args: {

                    encounter:
                        row.patient_encounter,

                    diagnostic_request:
                        row.name

                },

                freeze:
                    false,

                callback:
                    function(response) {

                        let ready =
                            false;

                        if (
                            !response.exc
                            &&
                            response.message
                        ) {

                            ready =
                                is_lab
                                    ? er_clinical_lab_result_is_ready(
                                        response.message
                                    )
                                    : er_clinical_radiology_result_is_ready(
                                        response.message
                                    );

                        }

                        er_clinical_update_result_badge(
                            button,
                            ready
                        );

                    }

            });

        }
    );

}




function er_clinical_render_nursing_orders(
    host,
    orders,
    filter
) {
    if (!host) {
        return;
    }

    const medications =
        orders &&
        Array.isArray(orders.medications)
            ? orders.medications
            : [];

    const diagnostics =
        orders &&
        Array.isArray(orders.diagnostics)
            ? orders.diagnostics
            : [];

    let rows = [];

    if (
        filter === "all" ||
        filter === "medications"
    ) {
        medications.forEach(
            function(row) {
                rows.push({
                    kind: "medication",
                    creation:
                        row.creation || "",
                    row: row
                });
            }
        );
    }

    if (
        filter === "all" ||
        filter === "diagnostics" ||
        filter === "labs" ||
        filter === "radiology"
    ) {
        diagnostics.forEach(
            function(row) {

                const request_type =
                    row.request_type || "";

                if (
                    request_type !== "Laboratory" &&
                    request_type !== "Radiology"
                ) {
                    return;
                }

                if (
                    filter === "labs" &&
                    request_type !== "Laboratory"
                ) {
                    return;
                }

                if (
                    filter === "radiology" &&
                    request_type !== "Radiology"
                ) {
                    return;
                }

                rows.push({
                    kind:
                        request_type === "Laboratory"
                            ? "lab"
                            : "radiology",

                    creation:
                        row.creation || "",

                    row: row
                });
            }
        );
    }

    rows.sort(function(a, b) {
        return String(b.creation || "")
            .localeCompare(
                String(a.creation || "")
            );
    });

    const body_rows =
        rows.length
            ? rows.map(
                function(entry, index) {
                    const row =
                        entry.row || {};

                    const type_label =
                        entry.kind ===
                        "medication"
                            ? "💊 دواء"
                            : entry.kind ===
                              "lab"
                                ? "🧪 مختبر"
                                : "🩻 أشعة";

                    let item =
                        "";

                    let details =
                        "";

                    let status =
                        er_clinical_nursing_order_status(
                            row
                        );

                    let action =
                        "—";

                    if (
                        entry.kind ===
                        "medication"
                    ) {
                        item =
                            row.medication_item ||
                            row.medication ||
                            "—";

                        details =
                            [
                                row.dosage,
                                row.dosage_form,
                                row.quantity
                                    ? "الكمية: " +
                                      row.quantity
                                    : "",
                                row.order_description
                            ]
                                .filter(Boolean)
                                .join(" | ");

                        if (
                            String(
                                row.er_administration_status ||
                                ""
                            ).toLowerCase() !==
                            "completed"
                        ) {
                            action =
                                '<button type="button" ' +
                                'class="btn btn-success btn-sm er-nursing-administer-medication" ' +
                                'data-request-name="' +
                                er_clinical_escape(
                                    row.name
                                ) +
                                '">' +
                                "💉 تسجيل إعطاء الجرعة" +
                                "</button>";
                        } else {
                            action =
                                "✅ تم الإعطاء";
                        }
                    }

                    if (
                        entry.kind === "lab"
                    ) {
                        item =
                            row.test_name ||
                            row.item_code ||
                            "—";

                        details =
                            row.item_code ||
                            "";

                        action =
                            '<button type="button" ' +
                            'class="btn btn-info btn-sm er-nursing-view-lab-result" ' +
                            'data-request-name="' +
                            er_clinical_escape(
                                row.name
                            ) +
                            '">' +
                            "🧪 عرض النتيجة " +
                            '<span class="er-clinical-result-ready-badge" ' +
                            'style="display:none;margin-right:5px;padding:1px 6px;border-radius:10px;background:#fff;color:#c62828;font-size:11px;font-weight:800;">' +
                            "1" +
                            "</span>" +
                            "</button>";
                    }

                    if (
                        entry.kind ===
                        "radiology"
                    ) {
                        item =
                            row.test_name ||
                            row.item_code ||
                            "—";

                        details =
                            row.item_code ||
                            "";

                        action =
                            '<button type="button" ' +
                            'class="btn btn-warning btn-sm er-nursing-view-radiology-result" ' +
                            'data-request-name="' +
                            er_clinical_escape(
                                row.name
                            ) +
                            '">' +
                            "🩻 عرض التقرير " +
                            '<span class="er-clinical-result-ready-badge" ' +
                            'style="display:none;margin-right:5px;padding:1px 6px;border-radius:10px;background:#fff;color:#c62828;font-size:11px;font-weight:800;">' +
                            "1" +
                            "</span>" +
                            "</button>";
                    }

                    return (
                        "<tr>" +
                        "<td>" +
                        (index + 1) +
                        "</td>" +

                        "<td>" +
                        er_clinical_escape(
                            type_label
                        ) +
                        "</td>" +

                        "<td>" +
                        er_clinical_escape(
                            item
                        ) +
                        "</td>" +

                        "<td>" +
                        er_clinical_escape(
                            details
                        ) +
                        "</td>" +

                        "<td>" +
                        er_clinical_escape(
                            status
                        ) +
                        "</td>" +

                        "<td>" +
                        action +
                        "</td>" +

                        "</tr>"
                    );
                }
            ).join("")
            : (
                '<tr><td colspan="6" ' +
                'style="text-align:center;color:#7b8794;padding:18px;">' +
                "لا توجد طلبات للطبيب مرتبطة بهذه الزيارة." +
                "</td></tr>"
            );

    const all_count =
        medications.length +
        diagnostics.filter(function(row) {
            return (
                row.request_type ===
                    "Laboratory" ||
                row.request_type ===
                    "Radiology"
            );
        }).length;

    const medication_count =
        medications.length;

    const lab_count =
        diagnostics.filter(function(row) {
            return (
                row.request_type ===
                "Laboratory"
            );
        }).length;

    const radiology_count =
        diagnostics.filter(function(row) {
            return (
                row.request_type ===
                "Radiology"
            );
        }).length;

    host.innerHTML = `
        <div class="er-clinical-history-card er-nursing-doctor-orders-card">

            <div class="er-clinical-card-header">
                <div>
                    <div class="er-clinical-card-title">
                        📋 طلبات الطبيب — تنفيذ التمريض
                    </div>

                    <div class="er-clinical-card-subtitle">
                        الطلبات المرتبطة بنفس الزيارة الطبية.
                        التمريض ينفذ ويتابع ولا ينشئ وصفة طبية جديدة.
                    </div>
                </div>
            </div>

            <div
                class="er-nursing-doctor-order-toolbar"
                style="
                    display:flex;
                    flex-wrap:wrap;
                    justify-content:space-between;
                    align-items:center;
                    gap:8px;
                    margin:0 0 8px;
                    padding:7px;
                    border:1px solid var(--border-color,#d9e2e8);
                    border-radius:8px;
                    background:#f8fafc;
                    direction:rtl;
                "
            >

                <div
                    class="er-nursing-doctor-order-filters"
                    style="
                        display:flex;
                        flex-wrap:wrap;
                        align-items:center;
                        gap:5px;
                    "
                >

                    <button
                        type="button"
                        class="btn btn-primary btn-sm er-nursing-order-filter active"
                        data-nursing-order-filter="all"
                    >
                        📋 الكل (${all_count})
                    </button>

                    <button
                        type="button"
                        class="btn btn-success btn-sm er-nursing-order-filter"
                        data-nursing-order-filter="medications"
                    >
                        💊 الأدوية (${medication_count})
                    </button>

                    <button
                        type="button"
                        class="btn btn-info btn-sm er-nursing-order-filter"
                        data-nursing-order-filter="labs"
                    >
                        🧪 المختبر (${lab_count})
                    </button>

                    <button
                        type="button"
                        class="btn btn-warning btn-sm er-nursing-order-filter"
                        data-nursing-order-filter="radiology"
                    >
                        🩻 الأشعة (${radiology_count})
                    </button>

                </div>

                <button
                    type="button"
                    class="btn btn-default btn-sm er-nursing-order-refresh"
                >
                    🔄 تحديث
                </button>

            </div>

            <div
                class="table-responsive"
                style="overflow:visible!important;"
            >
                <table
                    class="table table-bordered er-clinical-history-table"
                    style="margin-bottom:0;"
                >
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>النوع</th>
                            <th>العنصر / الفحص</th>
                            <th>التفاصيل</th>
                            <th>الحالة</th>
                            <th>الإجراء</th>
                        </tr>
                    </thead>

                    <tbody data-nursing-orders-body>
                        ${body_rows}
                    </tbody>
                </table>
            </div>

        </div>
    `;
}


function er_clinical_nursing_orders_init(
    context
) {
    const host =
        document.getElementById(
            "er-clinical-nursing-orders"
        );

    if (!host) {
        return;
    }

    host.innerHTML =
        '<div class="er-clinical-empty">⏳ جاري تحميل طلبات الطبيب...</div>';

    er_clinical_get_nursing_orders(
        context
    ).then(
        function(orders) {

            host.__er_nursing_orders =
                orders || {
                    medications: [],
                    diagnostics: []
                };

            host.__er_nursing_filter =
                "all";

            er_clinical_render_nursing_orders(
                host,
                host.__er_nursing_orders,
                "all"
            );

            er_clinical_update_result_ready_badges(
                host
            );

            $(host)
                .off(
                    "click.erNursingOrders",
                    ".er-nursing-order-filter"
                )
                .on(
                    "click.erNursingOrders",
                    ".er-nursing-order-filter",
                    function() {

                        const filter =
                            $(this).data(
                                "nursing-order-filter"
                            );

                        host.__er_nursing_filter =
                            filter;

                        $(host)
                            .find(
                                ".er-nursing-order-filter"
                            )
                            .removeClass(
                                "active"
                            );

                        $(this).addClass(
                            "active"
                        );

                        er_clinical_render_nursing_orders(
                            host,
                            host.__er_nursing_orders,
                            filter
                        );
                        er_clinical_update_result_ready_badges(
                            host
                        );
                    }
                );

            $(host)
                .off(
                    "click.erNursingAdmin",
                    ".er-nursing-administer-medication"
                )
                .on(
                    "click.erNursingAdmin",
                    ".er-nursing-administer-medication",
                    function() {

                        const request_name =
                            $(this).data(
                                "request-name"
                            );

                        if (!request_name) {
                            return;
                        }

                        if (
                            typeof administer_medication ===
                            "function"
                        ) {
                            administer_medication(
                                request_name,
                                function() {
                                    er_clinical_nursing_orders_init(
                                        context
                                    );
                                }
                            );

                            return;
                        }

                        frappe.msgprint({
                            title:
                                "Medication Request",
                            message:
                                "مسار إعطاء الجرعة الموجود في نافذة الأدوية غير متاح حاليًا.",
                            indicator:
                                "orange"
                        });
                    }
                );

            $(host)
                .off(
                    "click.erNursingResultLab",
                    ".er-nursing-view-lab-result"
                )
                .on(
                    "click.erNursingResultLab",
                    ".er-nursing-view-lab-result",
                    function() {

                        const request_name =
                            $(this).attr(
                                "data-request-name"
                            );

                        const rows =
                            host.__er_nursing_orders &&
                            Array.isArray(
                                host.__er_nursing_orders.diagnostics
                            )
                                ? host.__er_nursing_orders.diagnostics
                                : [];

                        const row =
                            rows.find(
                                function(item) {
                                    return (
                                        item &&
                                        item.name === request_name
                                    );
                                }
                            );

                        er_clinical_open_lab_result(
                            row,
                            context
                        );

                    }
                );

            $(host)
                .off(
                    "click.erNursingResultRadiology",
                    ".er-nursing-view-radiology-result"
                )
                .on(
                    "click.erNursingResultRadiology",
                    ".er-nursing-view-radiology-result",
                    function() {

                        const request_name =
                            $(this).attr(
                                "data-request-name"
                            );

                        const rows =
                            host.__er_nursing_orders &&
                            Array.isArray(
                                host.__er_nursing_orders.diagnostics
                            )
                                ? host.__er_nursing_orders.diagnostics
                                : [];

                        const row =
                            rows.find(
                                function(item) {
                                    return (
                                        item &&
                                        item.name === request_name
                                    );
                                }
                            );

                        er_clinical_open_radiology_result(
                            row,
                            context
                        );

                    }
                );

            $(host)
                .off(
                    "click.erNursingRefresh",
                    ".er-nursing-order-refresh"
                )
                .on(
                    "click.erNursingRefresh",
                    ".er-nursing-order-refresh",
                    function() {

                        er_clinical_nursing_orders_init(
                            context
                        );
                    }
                );
        }
    ).catch(
        function(error) {

            console.error(
                "ER NURSING ORDERS INIT ERROR:",
                error
            );

            host.innerHTML =
                '<div class="er-clinical-empty" style="color:#b91c1c;">' +
                "تعذر تحميل طلبات الطبيب." +
                "</div>";
        }
    );
}


function er_clinical_render_nursing_notes(
    notes
) {

    if (
        !notes
        ||
        !notes.length
    ) {

        return `

            <div class="er-clinical-empty">
                لا توجد ملاحظات تمريضية مسجلة.
            </div>

        `;

    }


    const rows =
        notes
            .map(function(note) {

                return `

                    <tr>

                        <td>
                            ${er_clinical_escape(
                                note.note_time || '—'
                            )}
                        </td>

                        <td>
                            ${er_clinical_escape(
                                note.user || '—'
                            )}
                        </td>

                        <td>
                            ${er_clinical_escape(
                                note.practitioner || '—'
                            )}
                        </td>

                        <td>
                            ${er_clinical_escape(
                                note.note || '—'
                            )}
                        </td>

                    </tr>

                `;

            })
            .join('');


    return `

        <div class="er-clinical-history-card">

            <div class="er-clinical-card-header">

                <div class="er-clinical-card-title">
                    📝 سجل ملاحظات التمريض
                </div>

            </div>

            <div class="table-responsive">

                <table class="table table-bordered er-clinical-history-table">

                    <thead>

                        <tr>
                            <th>الوقت</th>
                            <th>المستخدم</th>
                            <th>الممارس</th>
                            <th>الملاحظة</th>
                        </tr>

                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>

        </div>

    `;

}


function er_clinical_ensure_nursing_assessment_css() {

    if ($("#er-clinical-nursing-assessment-css").length) {
        return;
    }

    $("head").append(`
        <style id="er-clinical-nursing-assessment-css">

            /* =====================================================
             * NURSING TAB — COMPACT CLINICAL LAYOUT
             * لا يغير الحقول أو الحفظ أو مصادر البيانات
             * ===================================================== */

            .er-clinical-workspace {
                margin: 0 !important;
            }

            .er-clinical-body {
                padding: 4px !important;
            }

            .er-clinical-body > * {
                margin-top: 0 !important;
                margin-bottom: 6px !important;
            }

            /* ---------- Card headers ---------- */

            .er-clinical-card-header {
                padding: 0 !important;
                margin: 0 0 5px !important;
            }

            .er-clinical-card-title {
                font-size: 13px !important;
                line-height: 18px !important;
                font-weight: 700 !important;
            }

            .er-clinical-card-subtitle {
                font-size: 10px !important;
                line-height: 14px !important;
                margin-top: 1px !important;
            }

            /* ---------- Vital Signs card ---------- */

            .er-clinical-nursing-card {
                padding: 7px !important;
                margin: 0 0 6px !important;
                border-radius: 7px !important;
            }

            .er-clinical-nursing-card .er-clinical-form-section {
                margin: 0 0 6px !important;
                padding: 0 !important;
            }

            .er-clinical-nursing-card
            .er-clinical-section-title {
                font-size: 11px !important;
                line-height: 16px !important;
                margin: 0 0 4px !important;
                padding: 0 !important;
            }

            .er-clinical-field-grid {
                display: grid !important;
                grid-template-columns:
                    repeat(5, minmax(110px, 1fr)) !important;
                gap: 5px !important;
            }

            .er-clinical-field-grid label {
                margin: 0 !important;
                min-width: 0 !important;
            }

            .er-clinical-field-grid label > span {
                display: block !important;
                font-size: 10px !important;
                line-height: 13px !important;
                margin-bottom: 2px !important;
                white-space: nowrap !important;
            }

            .er-clinical-field-grid .form-control {
                height: 29px !important;
                min-height: 29px !important;
                padding: 3px 6px !important;
                font-size: 12px !important;
                margin: 0 !important;
            }

            .er-clinical-vital-status {
                padding: 3px 6px !important;
                font-size: 10px !important;
                line-height: 14px !important;
            }

            /* ---------- ABCDE ---------- */

            .er-clinical-nursing-assessment-card {
                margin: 0 0 6px !important;
                padding: 8px !important;
                border-radius: 7px !important;
            }

            .er-clinical-assessment-section-title {
                font-size: 12px !important;
                line-height: 17px !important;
                margin: 5px 0 4px !important;
            }

            .er-clinical-assessment-section-title:first-child {
                margin-top: 0 !important;
            }

            .er-clinical-assessment-hint {
                font-size: 10px !important;
                line-height: 14px !important;
                margin: 0 0 5px !important;
            }

            .er-clinical-assessment-grid {
                display: grid !important;
                grid-template-columns:
                    repeat(5, minmax(0, 1fr)) !important;
                gap: 5px !important;
            }

            .er-clinical-assessment-item {
                min-width: 0 !important;
            }

            .er-clinical-assessment-item > span,
            .er-clinical-sample-item > span,
            .er-clinical-escalation-item > span {
                display: block !important;
                font-size: 10px !important;
                line-height: 13px !important;
                font-weight: 600 !important;
                margin-bottom: 2px !important;
            }

            .er-clinical-assessment-item textarea,
            .er-clinical-sample-item textarea,
            .er-clinical-escalation-item textarea {
                min-height: 40px !important;
                height: 40px !important;
                padding: 3px 5px !important;
                font-size: 11px !important;
                line-height: 15px !important;
                resize: vertical !important;
                margin: 0 !important;
            }

            .er-clinical-assessment-item select,
            .er-clinical-escalation-item select {
                height: 29px !important;
                min-height: 29px !important;
                padding: 3px 5px !important;
                font-size: 11px !important;
                margin: 0 !important;
            }

            /* ---------- SAMPLE ---------- */

            .er-clinical-sample-grid {
                display: grid !important;
                grid-template-columns:
                    repeat(4, minmax(0, 1fr)) !important;
                gap: 5px !important;
            }

            .er-clinical-sample-item {
                min-width: 0 !important;
                margin: 0 !important;
            }

            .er-clinical-sample-item.wide {
                grid-column: 1 / -1 !important;
            }

            /* ---------- Escalation ---------- */

            .er-clinical-escalation-grid {
                display: grid !important;
                grid-template-columns:
                    150px minmax(0, 1fr) !important;
                gap: 5px !important;
                align-items: start !important;
            }

            /* ---------- Nursing note ---------- */

            .er-clinical-nursing-note-card {
                margin: 0 0 6px !important;
                padding: 8px !important;
                border-radius: 7px !important;
            }

            .er-clinical-wide-field {
                margin: 0 !important;
            }

            .er-clinical-wide-field > span {
                display: block !important;
                font-size: 10px !important;
                line-height: 13px !important;
                margin-bottom: 2px !important;
            }

            .er-clinical-wide-field textarea {
                height: 50px !important;
                min-height: 50px !important;
                padding: 4px 6px !important;
                font-size: 11px !important;
                line-height: 15px !important;
                margin: 0 !important;
            }

            .er-clinical-action-bar {
                display: flex !important;
                gap: 5px !important;
                margin-top: 5px !important;
            }

            .er-clinical-action-bar .btn {
                height: 30px !important;
                padding: 4px 10px !important;
                font-size: 11px !important;
            }

            /* ---------- Status / history / notes ---------- */

            .er-clinical-save-status {
                font-size: 10px !important;
                line-height: 14px !important;
                margin-top: 3px !important;
            }

            .er-clinical-body [class*="history"],
            .er-clinical-body [class*="History"] {
                margin-bottom: 6px !important;
            }

            .er-clinical-body table {
                font-size: 10px !important;
            }

            .er-clinical-body th,
            .er-clinical-body td {
                padding: 3px 5px !important;
                line-height: 15px !important;
            }

            /* ---------- Responsive ---------- */

            @media (max-width: 1100px) {

                .er-clinical-field-grid {
                    grid-template-columns:
                        repeat(4, minmax(100px, 1fr)) !important;
                }

                .er-clinical-assessment-grid {
                    grid-template-columns:
                        repeat(3, minmax(0, 1fr)) !important;
                }

                .er-clinical-sample-grid {
                    grid-template-columns:
                        repeat(3, minmax(0, 1fr)) !important;
                }
            }

            @media (max-width: 800px) {

                .er-clinical-field-grid,
                .er-clinical-assessment-grid,
                .er-clinical-sample-grid,
                .er-clinical-escalation-grid {
                    grid-template-columns:
                        repeat(2, minmax(0, 1fr)) !important;
                }

                .er-clinical-sample-item.wide {
                    grid-column: 1 / -1 !important;
                }
            }

            @media (max-width: 520px) {

                .er-clinical-field-grid,
                .er-clinical-assessment-grid,
                .er-clinical-sample-grid,
                .er-clinical-escalation-grid {
                    grid-template-columns: 1fr !important;
                }
            }

        </style>
    `);
}



function er_clinical_build_note_form() {

    er_clinical_ensure_nursing_assessment_css();

    const airway_breathing_options = `
        <option value="">اختر الحالة</option>
        <option value="Normal - طبيعي">طبيعي</option>
        <option value="Abnormal - غير طبيعي">غير طبيعي</option>
        <option value="Unable to Assess - غير قابل للتقييم">غير قابل للتقييم</option>
    `;

    const circulation_exposure_options = `
        <option value="">اختر الحالة</option>
        <option value="Stable - مستقر">مستقر</option>
        <option value="Abnormal - غير طبيعي">غير طبيعي</option>
        <option value="Unable to Assess - غير قابل للتقييم">غير قابل للتقييم</option>
    `;

    const disability_options = `
        <option value="">اختر الحالة</option>
        <option value="Alert - واعٍ">واعٍ</option>
        <option value="Altered - متغير الوعي">متغير الوعي</option>
        <option value="Unable to Assess - غير قابل للتقييم">غير قابل للتقييم</option>
    `;

    return `

        <div class="er-clinical-nursing-assessment-card">

            <div class="er-clinical-card-header">

                <div>

                    <div class="er-clinical-card-title">
                        🩺 التقييم السريري التمريضي
                    </div>

                    <div class="er-clinical-card-subtitle">
                        التقييم الأولي للطوارئ.
                        العلامات الرقمية والـESI تحفظ في Vital Signs.
                    </div>

                </div>

            </div>


            <div class="er-clinical-assessment-section-title">
                ABCDE — التقييم الأولي
            </div>

            <div class="er-clinical-assessment-hint">
                التقييم يبدأ بالمشكلات المهددة للحياة ثم توثيق التفاصيل اللازمة لاستلام الطبيب للحالة.
            </div>


            <div class="er-clinical-assessment-grid">


                <div class="er-clinical-assessment-item">

                    <span>A — مجرى الهواء</span>

                    <select
                        class="form-control"
                        data-er-nursing-assessment="airway_status"
                    >
                        ${airway_breathing_options}
                    </select>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="airway_notes"
                        placeholder="انسداد، إفرازات، قيء، القدرة على الكلام..."
                    ></textarea>

                </div>


                <div class="er-clinical-assessment-item">

                    <span>B — التنفس</span>

                    <select
                        class="form-control"
                        data-er-nursing-assessment="breathing_status"
                    >
                        ${airway_breathing_options}
                    </select>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="breathing_notes"
                        placeholder="جهد التنفس، النمط، الأصوات، دعم الأكسجين..."
                    ></textarea>

                </div>


                <div class="er-clinical-assessment-item">

                    <span>C — الدورة الدموية</span>

                    <select
                        class="form-control"
                        data-er-nursing-assessment="circulation_status"
                    >
                        ${circulation_exposure_options}
                    </select>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="circulation_notes"
                        placeholder="نزف، تروية، لون الجلد، امتلاء شعيري، برودة..."
                    ></textarea>

                </div>


                <div class="er-clinical-assessment-item">

                    <span>D — الحالة العصبية</span>

                    <select
                        class="form-control"
                        data-er-nursing-assessment="disability_status"
                    >
                        ${disability_options}
                    </select>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="disability_notes"
                        placeholder="الوعي، الاستجابة، الحالة الذهنية، التغير عن المعتاد..."
                    ></textarea>

                </div>


                <div class="er-clinical-assessment-item">

                    <span>E — التعرض والفحص العام</span>

                    <select
                        class="form-control"
                        data-er-nursing-assessment="exposure_status"
                    >
                        ${circulation_exposure_options}
                    </select>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="exposure_notes"
                        placeholder="إصابة، نزف، تورم، تشوه، حروق، طفح..."
                    ></textarea>

                </div>

            </div>


            <div
                class="er-clinical-assessment-section-title"
                style="margin-top:14px;"
            >
                SAMPLE — التاريخ السريع
            </div>


            <div class="er-clinical-sample-grid">


                <label class="er-clinical-sample-item">

                    <span>S — الأعراض والشكوى</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="sample_symptoms"
                        placeholder="الأعراض الحالية ووقت بدايتها..."
                    ></textarea>

                </label>


                <label class="er-clinical-sample-item">

                    <span>A — الحساسية</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="sample_allergies"
                        placeholder="حساسية دوائية أو غذائية أو لا توجد..."
                    ></textarea>

                </label>


                <label class="er-clinical-sample-item">

                    <span>M — الأدوية الحالية</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="sample_medications"
                        placeholder="الأدوية المستخدمة حاليًا..."
                    ></textarea>

                </label>


                <label class="er-clinical-sample-item">

                    <span>P — التاريخ المرضي السابق</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="sample_history"
                        placeholder="أمراض مزمنة، عمليات، دخول سابق..."
                    ></textarea>

                </label>


                <label class="er-clinical-sample-item">

                    <span>L — آخر تناول للطعام والشراب</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="sample_last_intake"
                        placeholder="الوقت وآخر طعام أو شراب..."
                    ></textarea>

                </label>


                <label class="er-clinical-sample-item">

                    <span>E — الأحداث المرتبطة</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="sample_events"
                        placeholder="ما الذي حدث قبل المرض أو الإصابة؟"
                    ></textarea>

                </label>


                <label class="er-clinical-sample-item wide">

                    <span>مخاطر أو ملاحظة تمريضية عامة</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="general_risk"
                        placeholder="أي خطر أو ملاحظة تحتاج الانتباه أثناء الانتظار..."
                    ></textarea>

                </label>

            </div>


            <div
                class="er-clinical-assessment-section-title"
                style="margin-top:14px;"
            >
                التواصل والتصعيد للطبيب
            </div>


            <div class="er-clinical-escalation-grid">

                <div class="er-clinical-escalation-item">

                    <span>تم إبلاغ الطبيب</span>

                    <select
                        class="form-control"
                        data-er-nursing-assessment="doctor_notified"
                    >
                        <option value="">غير محدد</option>
                        <option value="Yes - نعم">نعم</option>
                        <option value="No - لا">لا</option>
                    </select>

                </div>


                <div class="er-clinical-escalation-item">

                    <span>سبب الإبلاغ أو التصعيد</span>

                    <textarea
                        class="form-control"
                        rows="2"
                        data-er-nursing-assessment="escalation_reason"
                        placeholder="سبب إبلاغ الطبيب أو التصعيد..."
                    ></textarea>

                </div>

            </div>

        </div>


        <div class="er-clinical-nursing-note-card">

            <div class="er-clinical-card-header">

                <div>

                    <div class="er-clinical-card-title">
                        📝 ملاحظة تمريضية إضافية
                    </div>

                    <div class="er-clinical-card-subtitle">
                        تحفظ مع التقييم في ER Clinical Note بنوع Nursing Note.
                    </div>

                </div>

            </div>


            <label class="er-clinical-wide-field">

                <span>ملاحظة التمريض</span>

                <textarea
                    class="form-control"
                    rows="4"
                    data-er-nursing-note
                    placeholder="تفاصيل إضافية غير موجودة أعلاه..."
                ></textarea>

            </label>


            <div class="er-clinical-action-bar">

                <button
                    type="button"
                    class="btn btn-primary"
                    data-er-clinical-action="save-note"
                >
                    💾 حفظ التقييم والملاحظة التمريضية
                </button>

            </div>


            <div
                class="er-clinical-save-status"
                data-er-nursing-note-status
            ></div>

        </div>

    `;
}


async function er_clinical_render_global_patient_header() {

    const content = $('#er-content');

    if (!content.length) {
        return;
    }

    const shell = content.closest('.er-visit-console');

    if (!shell.length) {
        return;
    }

    /*
     * إخفاء الرأس القديم المختصر.
     * الرأس الجديد هو المصدر المرئي الموحد لكل النوافذ.
     */
    shell.find('.er-main-header').hide();

    let host =
        shell.find('.er-global-patient-header');

    /*
     * موضع العرض الموجود أصلًا داخل er_visit_console.
     * البطاقة الأصلية نفسها تُركّب هنا دون تغيير تصميمها.
     */
    let triage_mount =
        shell.find('#er-global-patient-header').first();

    if (!host.length) {

        shell.prepend(`

            <div class="er-global-patient-header">

                <!-- =================================================
                     CARD 1 — PATIENT / VISIT
                ================================================= -->

                <div class="er-global-patient-card">

                    <div class="er-global-card-title">
                        🧑‍⚕️ بيانات المريض والزيارة
                    </div>

                    <div class="er-global-patient-grid">

                        <div class="er-global-item">
                            <span>المريض</span>
                            <strong data-global-patient-name>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>رقم المريض</span>
                            <strong data-global-patient-id>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>العمر</span>
                            <strong data-global-patient-age>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>الجنس</span>
                            <strong data-global-patient-gender>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>رقم الزيارة الطبية</span>
                            <strong data-global-encounter>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>حالة الطوارئ</span>
                            <strong data-global-status>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>مستوى الفرز</span>
                            <strong data-global-triage>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>منطقة الانتظار</span>
                            <strong data-global-waiting-area>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>السرير</span>
                            <strong data-global-bed>—</strong>
                        </div>

                        <div class="er-global-item">
                            <span>الممرض المسؤول</span>
                            <strong data-global-nurse>—</strong>
                        </div>

                    </div>

                </div>


                <!-- =================================================
                     CARD 2 — TRIAGE / LATEST VITAL SIGNS
                ================================================= -->

                <div class="er-global-vitals-card">

                    <div class="er-global-card-title">
                        ❤️ الترياج والعلامات الحيوية — آخر إدخال
                    </div>

                    <div class="er-global-vitals-meta">

                        <span>
                            سجل Vital Signs:
                            <strong data-global-vital-name>—</strong>
                        </span>

                        <span>
                            التاريخ:
                            <strong data-global-vital-date>—</strong>
                        </span>

                        <span>
                            الوقت:
                            <strong data-global-vital-time>—</strong>
                        </span>

                    </div>

                    <div class="er-global-vitals-grid">

                        <div class="er-global-vital">
                            <span>الحرارة °C</span>
                            <strong data-global-vital="temperature">—</strong>
                        </div>

                        <div class="er-global-vital">
                            <span>النبض bpm</span>
                            <strong data-global-vital="pulse">—</strong>
                        </div>

                        <div class="er-global-vital">
                            <span>التنفس /min</span>
                            <strong data-global-vital="respiratory_rate">—</strong>
                        </div>

                        <div class="er-global-vital">
                            <span>الضغط</span>
                            <strong data-global-vital="bp">—</strong>
                        </div>

                        <div class="er-global-vital">
                            <span>SpO₂ %</span>
                            <strong data-global-vital="spo2">—</strong>
                        </div>

                        <div class="er-global-vital">
                            <span>الألم 0–10</span>
                            <strong data-global-vital="pain_score">—</strong>
                        </div>

                        <div class="er-global-vital">
                            <span>سكر الدم</span>
                            <strong data-global-vital="custom_blood_glucose">—</strong>
                        </div>

                        <div class="er-global-vital">
                            <span>نتيجة الفرز</span>
                            <strong data-global-vital="triage_result">—</strong>
                        </div>

                    </div>

                    <div class="er-global-vitals-notes">

                        <span>ملاحظات الترياج</span>

                        <strong
                            data-global-vital="triage_notes"
                        >—</strong>

                    </div>

                </div>

            </div>

        `);

        /*
         * إذا كان er_visit_console قد وفر مكان الرأس مسبقًا،
         * استبدل الحاوية الفارغة بالبطاقة الأصلية نفسها.
         * لا يتم تغيير HTML أو CSS الخاص بالبطاقة.
         */
        host =
            shell.find('.er-global-patient-header')
                .first();

        const mount =
            shell.find('#er-global-patient-header')
                .first();

        if (
            mount.length &&
            host.length &&
            !mount.is(host)
        ) {
            host.attr(
                'id',
                'er-global-patient-header'
            );

            mount.replaceWith(host);
        }


        host =
            shell.find('.er-global-patient-header');

    }


    /*
     * الموضع الرسمي للرأس:
     * مباشرة قبل شريط أسماء النوافذ.
     * لا نضعه عائمًا ولا داخل محتوى أي نافذة.
     */
    const tabs =
        shell.find('.er-tabs').first();

    if (tabs.length) {
        tabs.before(host);
    } else {
        content.before(host);
    }



    /*
     * إذا كان er_visit_console قد وفر حاوية الرأس،
     * استبدلها بالبطاقة الأصلية نفسها.
     */
    if (
        triage_mount.length &&
        host.length &&
        !triage_mount.is(host)
    ) {
        triage_mount.after(host);
        triage_mount.hide();
    }


    try {

        const context =
            await er_clinical_fetch_context();

        const vitals =
            await er_clinical_get_vitals(context);

        /*
         * er_clinical_get_vitals مرتبة حسب:
         * التاريخ ← الوقت ← الإنشاء.
         *
         * لذلك vitals[0] هو آخر إدخال فعلي لهذه الزيارة.
         */
        const latest =
            vitals && vitals.length
                ? vitals[0]
                : null;

        const patient =
            context.patient || {};

        const encounter =
            context.encounter || {};

        const intake =
            context.intake || {};

        const queue =
            context.queue || {};


        const patient_name =
            patient.patient_name
            ||
            intake['اسم_المريض']
            ||
            patient.name
            ||
            '—';

        const patient_id =
            patient.name
            ||
            '—';

        const age =
            patient.dob
                ? er_clinical_age_from_dob(patient.dob)
                : (intake.age || '—');

        const gender =
            patient.sex
            ||
            intake.gender
            ||
            '—';

        const encounter_name =
            encounter.name
            ||
            '—';

        const status =
            (encounter && encounter.er_visit_status)
            ||
            intake.status
            ||
            '—';

        const triage =
            (latest && latest.esi_level)
            ||
            intake.acuity
            ||
            '—';

        const waiting =
            queue.waiting_area
            ||
            intake.waiting_area
            ||
            '—';

        const bed =
            queue.bed
            ||
            intake.assigned_bed
            ||
            '—';

        const nurse =
            queue.assigned_nurse
            ||
            (latest && latest.triage_nurse)
            ||
            '—';


        /*
         * قرار الطبيب | Physician Decision
         * المصدر الوحيد: ER Patient Intake
         * التمريض يقرأ القرار فقط ولا يحرره.
         */
        const disposition =
            intake.disposition
            ||
            'لم يحدد الطبيب بعد | Not Decided';

        const outcome =
            intake.outcome
            ||
            '—';

        const transfer_to =
            intake.transfer_to
            ||
            '—';

        const transfer_reason =
            intake.transfer_reason
            ||
            '—';

        let decision_box =
            host.find(
                '[data-nursing-doctor-decision]'
            ).first();

        if (!decision_box.length) {

            const html = `
                <div
                    data-nursing-doctor-decision
                    style="
                        width:100%;
                        margin-top:8px;
                        padding:9px 10px;
                        border:1px solid #d8e0e6;
                        border-radius:7px;
                        background:#f8fafb;
                        box-sizing:border-box;
                    "
                >

                    <div
                        style="
                            font-size:12px;
                            font-weight:700;
                            color:#34495e;
                            margin-bottom:7px;
                            padding-bottom:6px;
                            border-bottom:1px solid #e3e9ed;
                        "
                    >
                        🩺 قرار الطبيب | Physician Decision
                    </div>

                    <div
                        style="
                            display:grid;
                            grid-template-columns:repeat(4,minmax(0,1fr));
                            gap:7px;
                        "
                    >

                        <div>
                            <div
                                style="
                                    font-size:10px;
                                    color:#758591;
                                    margin-bottom:3px;
                                "
                            >
                                مصير الحالة | Disposition
                            </div>

                            <strong
                                data-nursing-disposition
                                style="
                                    font-size:11px;
                                    color:#263746;
                                "
                            ></strong>
                        </div>

                        <div>
                            <div
                                style="
                                    font-size:10px;
                                    color:#758591;
                                    margin-bottom:3px;
                                "
                            >
                                النتيجة | Outcome
                            </div>

                            <strong
                                data-nursing-outcome
                                style="
                                    font-size:11px;
                                    color:#263746;
                                "
                            ></strong>
                        </div>

                        <div data-nursing-transfer-box>
                            <div
                                style="
                                    font-size:10px;
                                    color:#758591;
                                    margin-bottom:3px;
                                "
                            >
                                جهة التحويل | Transfer To
                            </div>

                            <strong
                                data-nursing-transfer-to
                                style="
                                    font-size:11px;
                                    color:#263746;
                                "
                            ></strong>
                        </div>

                        <div data-nursing-transfer-reason-box>
                            <div
                                style="
                                    font-size:10px;
                                    color:#758591;
                                    margin-bottom:3px;
                                "
                            >
                                سبب التحويل | Transfer Reason
                            </div>

                            <strong
                                data-nursing-transfer-reason
                                style="
                                    font-size:11px;
                                    color:#263746;
                                "
                            ></strong>
                        </div>

                    </div>

                    <div
                        style="
                            margin-top:6px;
                            font-size:9.5px;
                            color:#7a8993;
                        "
                    >
                        للقراءة والتنفيذ بواسطة التمريض
                        | Read-only for nursing execution
                    </div>

                </div>
            `;

            const patient_grid =
                host.find(
                    '.er-global-patient-grid'
                ).first();

            if (patient_grid.length) {
                patient_grid.after(html);
            } else {
                host.append(html);
            }

            decision_box =
                host.find(
                    '[data-nursing-doctor-decision]'
                ).first();
        }

        decision_box
            .find('[data-nursing-disposition]')
            .text(disposition);

        decision_box
            .find('[data-nursing-outcome]')
            .text(outcome);

        decision_box
            .find('[data-nursing-transfer-to]')
            .text(transfer_to);

        decision_box
            .find('[data-nursing-transfer-reason]')
            .text(transfer_reason);

        const transfer_visible =
            String(disposition)
                .toLowerCase()
                .indexOf('تحويل') >= 0
            ||
            String(disposition)
                .toLowerCase()
                .indexOf('transfer') >= 0
            ||
            transfer_to !== '—'
            ||
            transfer_reason !== '—';

        decision_box
            .find('[data-nursing-transfer-box]')
            .toggle(transfer_visible);

        decision_box
            .find('[data-nursing-transfer-reason-box]')
            .toggle(transfer_visible);


        host.find('[data-global-patient-name]')
            .text(patient_name);

        host.find('[data-global-patient-id]')
            .text(patient_id);

        host.find('[data-global-patient-age]')
            .text(age);

        host.find('[data-global-patient-gender]')
            .text(gender);

        host.find('[data-global-encounter]')
            .text(encounter_name);

        host.find('[data-global-status]')
            .text(status);

        host.find('[data-global-triage]')
            .text(triage);

        host.find('[data-global-waiting-area]')
            .text(waiting);

        host.find('[data-global-bed]')
            .text(bed);

        host.find('[data-global-nurse]')
            .text(nurse);


        const fields = [
            'temperature',
            'pulse',
            'respiratory_rate',
            'spo2',
            'pain_score',
            'custom_blood_glucose',
            'triage_result',
            'triage_notes'
        ];


        fields.forEach(function(fieldname) {

            const value =
                latest &&
                latest[fieldname] !== null &&
                latest[fieldname] !== undefined &&
                latest[fieldname] !== ''
                    ? latest[fieldname]
                    : '—';

            host.find(
                '[data-global-vital="' +
                fieldname +
                '"]'
            ).text(value);

        });


        const bp =
            latest &&
            (
                latest.bp_systolic ||
                latest.bp_diastolic
            )
                ? (
                    (latest.bp_systolic || '—')
                    +
                    ' / '
                    +
                    (latest.bp_diastolic || '—')
                )
                : '—';


        host.find('[data-global-vital="bp"]')
            .text(bp);


        host.find('[data-global-vital-name]')
            .text(
                latest && latest.name
                    ? latest.name
                    : 'لا توجد قراءة'
            );


        host.find('[data-global-vital-date]')
            .text(
                latest && latest.signs_date
                    ? latest.signs_date
                    : '—'
            );


        host.find('[data-global-vital-time]')
            .text(
                latest && latest.signs_time
                    ? latest.signs_time
                    : '—'
            );

    } catch (error) {

        console.error(
            'ER GLOBAL PATIENT HEADER LOAD FAILED',
            error
        );

    }

}
window.er_clinical_render_global_patient_header =
    er_clinical_render_global_patient_header;



function load_clinical_section() {

    const root =
        $('#er-content');


    if (!root.length) {
        return;
    }


    root.html(`

        <div class="clinical-section er-clinical-workspace">

            <div class="clinical-card">

                <div class="clinical-title">

                    <div class="clinical-title-main">

                        <span class="clinical-title-icon">
                            🩺
                        </span>

                        <div class="clinical-title-content">

                            <div class="clinical-title-text">
                                التمريض
                            </div>

                            <div class="clinical-title-subtitle">
                                العلامات الحيوية والمتابعة التمريضية
                            </div>

                        </div>

                    </div>

                    <div class="clinical-title-status">

                        <span class="clinical-status-dot"></span>

                        <span>
                            زيارة نشطة
                        </span>

                    </div>

                </div>



                <div
                    class="er-clinical-navigation-bar"
                    style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:7px;
                        align-items:center;
                        margin:10px 0;
                        padding:8px;
                        border:1px solid #d9e2e8;
                        border-radius:8px;
                        background:#f7fafc;
                        direction:rtl;
                    "
                >

                    <div
                    class="er-clinical-loading"
                    data-er-clinical-loading
                >
                    جاري تحميل بيانات الزيارة...
                </div>


                <div
                    class="er-clinical-body"
                    data-er-clinical-body
                    style="display:none;"
                ></div>

            </div>

        </div>

    `);


    er_clinical_load_workspace();

}


async function er_clinical_load_workspace() {

    const body =
        $('[data-er-clinical-body]');


    const loading =
        $('[data-er-clinical-loading]');


    try {

        const context =
            await er_clinical_fetch_context();


        const results =
            await Promise.all([
                er_clinical_get_vitals(context),
                er_clinical_get_nursing_notes(context),
                er_clinical_get_triage_levels()
            ]);


        const vitals =
            results[0] || [];


        const notes =
            results[1] || [];


        const triage_levels =
            results[2] || [];


        const active_vital =
            await er_clinical_get_active_vital(
                context,
                vitals
            );


        body.html(

            er_clinical_render_vitals_form(
                context,
                active_vital,
                triage_levels
            )

            +

            er_clinical_build_note_form()

            +

            `
                <div
                    id="er-clinical-nursing-orders"
                    style="margin-top:0;margin-bottom:8px;"
                ></div>
            `

            +

            er_clinical_render_vitals_history(
                vitals,
                active_vital
                    ? active_vital.name
                    : null
            )

            +

            er_clinical_render_nursing_notes(
                notes
            )

            +

            `
                <div
                    class="er-clinical-activity-card"
                    id="er_clinical_activity"
                ></div>
            `

        );


        loading.hide();
        body.show();


        er_clinical_store_vital_snapshot();

        er_clinical_nursing_orders_init(
            context
        );

        er_clinical_bind_events(
            context
        );

        if (
            typeof window.er_nursing_init_vitals_popup ===
            'function'
        ) {

            window.er_nursing_init_vitals_popup();

        }


        if (
            typeof render_activity_timeline ===
            'function'
        ) {

            render_activity_timeline(
                'er_clinical_activity',
                'clinical'
            );

        }

    }
    catch (error) {

        console.error(
            'ER CLINICAL WORKSPACE ERROR:',
            error
        );


        loading
            .text(
                error.message
                ||
                'تعذر تحميل نافذة التمريض.'
            )
            .css(
                {
                    color:
                        '#b91c1c'
                }
            );

    }

}




/* ============================================================
   ER NURSING — NEW VITAL SIGNS
   Start a completely new Vital Signs record.
============================================================ */

function er_clinical_start_new_vital() {

    const card =
        $('.er-clinical-nursing-card').first();

    if (!card.length) {
        return;
    }


    /*
     * إنشاء Vital Signs جديد:
     * نزيل اسم السجل حتى يستخدم er_clinical_save_vitals()
     * مسار INSERT وليس UPDATE.
     *
     * نحافظ فقط على بيانات الترياج المخفية المطلوبة
     * للتسجيل، وعلى رأسها ESI.
     */
    const preserved_triage_values = {};

    [
        'esi_level',
        'triage_result',
        'triage_nurse',
        'triage_notes',
        'esi_reason'
    ].forEach(function(fieldname) {

        const input =
            card.find(
                '[data-er-vital-field="' +
                fieldname +
                '"]'
            ).first();

        if (input.length) {

            preserved_triage_values[fieldname] =
                input.val() || '';

        }

    });


    card.attr(
        'data-vital-name',
        ''
    );

    card.attr(
        'data-vital-docstatus',
        '0'
    );

    card.removeData(
        'er-vital-snapshot'
    );


    card.find(
        '[data-er-vital-field]'
    ).each(function() {

        const input =
            $(this);

        if (
            Object.prototype.hasOwnProperty.call(
                preserved_triage_values,
                String(
                    input.attr(
                        'data-er-vital-field'
                    ) || ''
                )
            )
        ) {
            return;
        }


        if (input.is(':checkbox')) {

            input.prop(
                'checked',
                false
            );

        }
        else {

            input.val('');

        }

    });


    Object.keys(
        preserved_triage_values
    ).forEach(function(fieldname) {

        const value =
            preserved_triage_values[fieldname];

        if (!value) {
            return;
        }

        const input =
            card.find(
                '[data-er-vital-field="' +
                fieldname +
                '"]'
            ).first();

        if (input.length) {

            input.val(
                value
            );

        }

    });


    card.find(
        '[data-er-clinical-vital-name]'
    ).text(
        '—'
    );


    card.find(
        '[data-er-clinical-save-status]'
    )
    .text(
        'قراءة جديدة — أدخل العلامات الحيوية ثم اضغط حفظ.'
    );


    card.find(
        '[data-er-clinical-action="open-vital"]'
    )
    .prop(
        'disabled',
        true
    );


    card.find(
        '[data-er-clinical-action="save-vitals"]'
    )
    .text(
        '💾 حفظ العلامات الحيوية'
    );


    card.find(
        '.er-clinical-card-subtitle'
    )
    .text(
        'إنشاء قراءة جديدة في Vital Signs القياسي'
    );


    frappe.show_alert({
        message:
            'تم تفريغ بيانات العلامات الحيوية. سيتم إنشاء سجل Vital Signs جديد.',
        indicator:
            'blue'
    });


    const first_field =
        card.find(
            '[data-er-vital-field="temperature"]'
        ).first();

    if (first_field.length) {

        first_field.trigger(
            'focus'
        );

    }

}


/*
 * Delegated event:
 * works even when the nursing workspace is rebuilt/refreshed.
 * Namespaced so it is never duplicated.
 */

$(document)
    .off(
        'click.erClinicalNewVital',
        '[data-er-clinical-action="new-vital"]'
    )
    .on(
        'click.erClinicalNewVital',
        '[data-er-clinical-action="new-vital"]',
        function() {
            er_clinical_start_new_vital();
        }
    );

/* ============================================================
   ER NURSING — VITAL SIGNS CHANGE GUARD
   يمنع الحفظ الصامت إذا لم يحدث أي تعديل على السجل السابق.
============================================================ */

function er_clinical_get_vital_form_state(card) {

    const state = {};

    const fields = [
        'temperature',
        'pulse',
        'respiratory_rate',
        'bp_systolic',
        'bp_diastolic',
        'spo2',
        'pain_score',
        'custom_blood_glucose',
        'height',
        'weight',
        'esi_level',
        'triage_result',
        'triage_nurse',
        'triage_notes',
        'esi_reason',
        'vital_signs_note'
    ];

    fields.forEach(function(fieldname) {

        const input =
            card.find(
                '[data-er-vital-field="' +
                fieldname +
                '"]'
            );

        state[fieldname] =
            input.length
                ? (input.val() || '')
                : '';

    });

    state.critical_alert =
        card.find(
            '[data-er-vital-field="critical_alert"]'
        ).is(':checked')
            ? 1
            : 0;

    return state;
}


function er_clinical_store_vital_snapshot() {

    const card =
        $('.er-clinical-nursing-card');

    if (!card.length) {
        return;
    }

    const name =
        card.attr('data-vital-name') || '';

    if (!name) {

        card.removeData(
            'er-vital-snapshot'
        );

        return;
    }

    card.data(
        'er-vital-snapshot',
        JSON.stringify(
            er_clinical_get_vital_form_state(card)
        )
    );
}


function er_clinical_vital_has_changes(card) {

    const name =
        card.attr('data-vital-name') || '';

    if (!name) {
        return true;
    }

    const snapshot =
        card.data('er-vital-snapshot');

    if (!snapshot) {
        return true;
    }

    return (
        snapshot !==
        JSON.stringify(
            er_clinical_get_vital_form_state(card)
        )
    );
}


function er_clinical_confirm_unchanged_vital(card) {

    if (
        !card.length ||
        !card.attr('data-vital-name') ||
        er_clinical_vital_has_changes(card)
    ) {

        return Promise.resolve(true);

    }

    return new Promise(function(resolve) {

        frappe.confirm(
            'لم يتم إجراء أي تعديل على العلامات الحيوية السابقة.<br><br>هل تريد الحفظ؟',
            function() {
                resolve(true);
            },
            function() {
                resolve(false);
            }
        );

    });
}


function er_clinical_collect_vital_values() {

    const values =
        {};


    const fields = [

        'temperature',
        'pulse',
        'respiratory_rate',
        'bp_systolic',
        'bp_diastolic',
        'spo2',
        'pain_score',
        'custom_blood_glucose',
        'height',
        'weight',
        'esi_level',
        'triage_result',
        'triage_nurse',
        'triage_notes',
        'esi_reason',
        'vital_signs_note'

    ];


    fields.forEach(function(fieldname) {

        const input =
            $(
                '[data-er-vital-field="' +
                fieldname +
                '"]'
            );


        if (!input.length) {
            return;
        }


        values[fieldname] =
            input.val() || '';

    });



    values.critical_alert =
        $(
            '[data-er-vital-field="critical_alert"]'
        ).is(':checked')
            ? 1
            : 0;


    return values;

}


function er_clinical_validate_vitals(values) {

    const numeric_fields = [

        'temperature',
        'pulse',
        'respiratory_rate',
        'bp_systolic',
        'bp_diastolic',
        'spo2',
        'pain_score',
        'custom_blood_glucose',
        'height',
        'weight',

    ];


    for (
        let index = 0;
        index < numeric_fields.length;
        index += 1
    ) {

        const fieldname =
            numeric_fields[index];


        const value =
            values[fieldname];


        if (
            value === ''
            ||
            value === null
            ||
            value === undefined
        ) {
            continue;
        }


        if (
            Number.isNaN(
                Number(value)
            )
        ) {

            return (
                'القيمة غير صحيحة في الحقل: ' +
                fieldname
            );

        }

    }


    if (
        values.pain_score !== ''
        &&
        (
            Number(values.pain_score) < 0
            ||
            Number(values.pain_score) > 10
        )
    ) {

        return 'درجة الألم يجب أن تكون بين 0 و10.';

    }


    if (
        values.spo2 !== ''
        &&
        (
            Number(values.spo2) < 0
            ||
            Number(values.spo2) > 100
        )
    ) {

        return 'قيمة SpO₂ يجب أن تكون بين 0 و100.';

    }


    return null;

}


function er_clinical_build_vital_doc(
    context,
    values
) {

    const encounter =
        context.encounter || {};


    const intake =
        context.intake || {};


    const patient =
        context.patient || {};


    const doc = {

        doctype:
            'Vital Signs',

        patient:
            patient.name,

        patient_name:
            patient.patient_name
            ||
            encounter.patient_name
            ||
            intake['اسم_المريض']
            ||
            patient.name,

        encounter:
            encounter.name,

        er_intake:
            intake.name,

        signs_date:
            frappe.datetime.get_today(),

        signs_time:
            frappe.datetime.now_time(),

        recorded_by:
            frappe.session.user

    };


    Object.keys(values).forEach(function(fieldname) {

        const value =
            values[fieldname];


        if (
            value !== ''
            &&
            value !== null
            &&
            value !== undefined
        ) {

            doc[fieldname] =
                value;

        }

    });


    return doc;

}


function er_clinical_save_existing_vital(
    vital_name,
    values
) {

    return frappe.db
        .set_value(
            'Vital Signs',
            vital_name,
            values
        )
        .then(function(result) {

            return (
                result
                &&
                result.message
            )
                ? result.message
                : {
                    name:
                        vital_name
                };

        });

}


async function er_clinical_save_vitals(
    context
) {

    /*
     * HARD LOCK:
     * set BEFORE any await so two simultaneous click handlers
     * can never both reach INSERT/UPDATE.
     */
    if (
        window.__er_clinical_vitals_save_in_progress
    ) {

        frappe.show_alert({
            message:
                'عملية حفظ العلامات الحيوية قيد التنفيذ.',
            indicator:
                'orange'
        });

        return null;
    }

    window.__er_clinical_vitals_save_in_progress =
        true;

    try {

        const values =
            er_clinical_collect_vital_values();


    const validation_error =
        er_clinical_validate_vitals(
            values
        );


    if (validation_error) {

        frappe.msgprint({
            title:
                'العلامات الحيوية',

            message:
                validation_error,

            indicator:
                'orange'
        });

        return null;

    }


    if (
        !context.patient
        ||
        !context.patient.name
    ) {

        frappe.msgprint({
            title:
                'العلامات الحيوية',

            message:
                'لا يوجد مريض مرتبط بالزيارة.',

            indicator:
                'orange'
        });

        return null;

    }


    const card =
        $('.er-clinical-nursing-card');


    const existing_name =
        card.attr(
            'data-vital-name'
        )
        ||
        '';


    const intake =
        context.intake || {};


    /*
     * إذا كان السجل الحالي موجودًا ولم يحدث أي تعديل،
     * نطلب تأكيد المستخدم بدل الحفظ الصامت.
     */
    const allow_unchanged_save =
        await er_clinical_confirm_unchanged_vital(
            card
        );

    if (!allow_unchanged_save) {
        return null;
    }


    let result;

    /*
     * القاعدة:
     * - لا يوجد اسم: INSERT مرة واحدة.
     * - يوجد اسم: UPDATE لنفس السجل.
     */
    if (existing_name) {

        result =
            await er_clinical_save_existing_vital(
                existing_name,
                values
            );

    }
    else {

        result =
            await frappe.db.insert(
                er_clinical_build_vital_doc(
                    context,
                    values
                )
            );

    }


    const name =
        result.name ||
        existing_name;


    card.attr(
        'data-vital-name',
        name
    );


    card.find(
        '[data-er-clinical-vital-name]'
    ).text(
        name
    );


    card.find(
        '[data-er-clinical-save-status]'
    )
    .text(
        'تم حفظ العلامات الحيوية بنجاح. يمكنك الآن تسجيل الترياج.'
    );


    frappe.show_alert({
        message:
            'تم حفظ العلامات الحيوية: ' +
            name,

        indicator:
            'green'
    });

    return name;

    } finally {

        window.__er_clinical_vitals_save_in_progress =
            false;

    }

}


async function er_clinical_submit_triage(
    context
) {

    if (
        window.__er_clinical_triage_submit_in_progress
    ) {

        frappe.show_alert({
            message:
                'عملية تسجيل الترياج قيد التنفيذ.',
            indicator:
                'orange'
        });

        return null;
    }

    window.__er_clinical_triage_submit_in_progress =
        true;

    try {

        const card =
            $('.er-clinical-nursing-card');


    let name =
        card.attr(
            'data-vital-name'
        )
        ||
        '';


    if (!name) {

        return er_clinical_save_vitals(
            context
        ).then(function(saved_name) {

            if (!saved_name) {
                return null;
            }


            return er_clinical_submit_triage_doc(
                saved_name
            );

        });

    }


    return await er_clinical_submit_triage_doc(
        name
    );

    } finally {

        window.__er_clinical_triage_submit_in_progress =
            false;

    }

}


function er_clinical_submit_triage_doc(
    vital_name
) {

    if (!vital_name) {
        return Promise.resolve(null);
    }


    return frappe.db
        .get_doc(
            'Vital Signs',
            vital_name
        )
        .then(function(vital) {

            if (!vital) {

                throw new Error(
                    'سجل Vital Signs غير موجود.'
                );

            }


            if (
                vital.docstatus === 1
            ) {

                return vital;

            }


            if (
                !vital.esi_level
            ) {

                throw new Error(
                    'يجب تحديد مستوى ESI قبل تسجيل الترياج.'
                );

            }


            return new Promise(
                function(resolve, reject) {

                    frappe.call({

                        method:
                            'frappe.client.submit',

                        args: {

                            doc:
                                JSON.stringify({
                                    doctype:
                                        'Vital Signs',

                                    name:
                                        vital_name
                                })

                        },

                        freeze:
                            true,

                        freeze_message:
                            'جاري تسجيل الترياج...',

                        callback:
                            function(response) {

                                if (
                                    response.exc
                                    ||
                                    !response.message
                                ) {

                                    reject(
                                        new Error(
                                            'تعذر تسجيل سجل الترياج.'
                                        )
                                    );

                                    return;

                                }


                                resolve(
                                    response.message
                                );

                            }

                    });

                }
            );

        })
        .then(function(result) {

            frappe.show_alert({

                message:
                    'تم تسجيل الترياج بنجاح.',

                indicator:
                    'green'

            });


            return er_clinical_load_workspace()
                .then(function() {

                    return result;

                });

        });

}


function er_clinical_build_nursing_assessment_note(
    assessment,
    additional_note
) {

    const data =
        assessment || {};

    const sections = [
        {
            title: "ABCDE — التقييم الأولي",
            fields: [
                ["A — مجرى الهواء", "airway_status"],
                ["ملاحظات مجرى الهواء", "airway_notes"],
                ["B — التنفس", "breathing_status"],
                ["ملاحظات التنفس", "breathing_notes"],
                ["C — الدورة الدموية", "circulation_status"],
                ["ملاحظات الدورة الدموية", "circulation_notes"],
                ["D — الحالة العصبية", "disability_status"],
                ["ملاحظات الحالة العصبية", "disability_notes"],
                ["E — التعرض والفحص العام", "exposure_status"],
                ["ملاحظات التعرض والفحص العام", "exposure_notes"]
            ]
        },
        {
            title: "SAMPLE — التاريخ السريع",
            fields: [
                ["S — الأعراض والشكوى", "sample_symptoms"],
                ["A — الحساسية", "sample_allergies"],
                ["M — الأدوية الحالية", "sample_medications"],
                ["P — التاريخ المرضي السابق", "sample_history"],
                ["L — آخر تناول للطعام والشراب", "sample_last_intake"],
                ["E — الأحداث المرتبطة", "sample_events"],
                ["مخاطر أو ملاحظة تمريضية عامة", "general_risk"]
            ]
        },
        {
            title: "التواصل والتصعيد للطبيب",
            fields: [
                ["تم إبلاغ الطبيب", "doctor_notified"],
                ["سبب الإبلاغ أو التصعيد", "escalation_reason"]
            ]
        }
    ];

    const lines = [];

    sections.forEach(function(section) {

        const section_lines = [];

        section.fields.forEach(function(item) {

            const label = item[0];
            const fieldname = item[1];

            const value =
                data[fieldname] == null
                    ? ""
                    : String(data[fieldname]).trim();

            if (!value) {
                return;
            }

            section_lines.push(
                label + ": " + value
            );

        });

        if (section_lines.length) {

            if (lines.length) {
                lines.push("");
            }

            lines.push(
                section.title
            );

            lines.push(
                "--------------------"
            );

            section_lines.forEach(function(line) {
                lines.push(line);
            });

        }

    });

    const extra =
        additional_note == null
            ? ""
            : String(additional_note).trim();

    if (extra) {

        if (lines.length) {
            lines.push("");
        }

        lines.push(
            "ملاحظة تمريضية إضافية"
        );

        lines.push(
            "--------------------"
        );

        lines.push(
            extra
        );

    }

    return lines.join("\n");

}


function er_clinical_collect_nursing_assessment() {

    const assessment = {};

    $(
        ".er-clinical-workspace [data-er-nursing-assessment]"
    ).each(function() {

        const fieldname =
            $(this).attr(
                "data-er-nursing-assessment"
            );

        if (!fieldname) {
            return;
        }

        const value =
            $(this).val();

        assessment[fieldname] =
            value == null
                ? ""
                : String(value).trim();

    });

    return assessment;
}


async function er_clinical_save_nursing_note(context) {

    const assessment =
        er_clinical_collect_nursing_assessment();

    const additional_note =
        String(
            $(
                ".er-clinical-workspace [data-er-nursing-note]"
            ).val() || ""
        ).trim();

    const has_assessment =
        Object.values(assessment).some(function(value) {
            return String(value || "").trim() !== "";
        });

    if (!has_assessment && !additional_note) {

        frappe.msgprint({
            title: "التقييم التمريضي",
            message:
                "أدخل بيانات التقييم السريري أو الملاحظة التمريضية أولًا.",
            indicator: "orange"
        });

        throw new Error(
            "لا توجد بيانات تمريضية للحفظ."
        );
    }

    const intake =
        context && context.intake
            ? context.intake
            : {};

    const encounter_context =
        context && context.encounter
            ? context.encounter
            : {};

    const encounter_name =
        typeof encounter_context === "string"
            ? encounter_context
            : encounter_context.name;

    if (!encounter_name) {

        throw new Error(
            "لا توجد Patient Encounter مرتبطة بالزيارة الحالية."
        );
    }

    const response =
        await frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Patient Encounter",
                name: encounter_name
            }
        });

    const encounter =
        response && response.message
            ? response.message
            : null;

    if (!encounter) {
        throw new Error(
            "تعذر تحميل Patient Encounter."
        );
    }

    const notes =
        Array.isArray(encounter.er_clinical_notes)
            ? encounter.er_clinical_notes
            : [];

    const row =
        notes.length
            ? null
            : null;

    let child;

    if (
        frappe.model &&
        typeof frappe.model.add_child === "function"
    ) {

        child =
            frappe.model.add_child(
                encounter,
                "ER Clinical Note",
                "er_clinical_notes"
            );

    } else {

        child = {
            doctype: "ER Clinical Note",
            parent: encounter.name,
            parenttype: "Patient Encounter",
            parentfield: "er_clinical_notes",
            idx: notes.length + 1
        };

        notes.push(child);
        encounter.er_clinical_notes = notes;
    }

    child.note_time =
        frappe.datetime.now_datetime();

    child.user =
        frappe.session.user;

    child.note_type =
        "Nursing Note";

    child.practitioner =
        encounter_context.practitioner || "";

    child.department =
        encounter_context.medical_department || "";

    child.reference_type =
        "ER Patient Intake";

    child.reference_name =
        intake.name || "";

    child.note =
        er_clinical_build_nursing_assessment_note(
            assessment,
            additional_note
        );

    child.nursing_airway_status =
        assessment.airway_status || "";

    child.nursing_airway_notes =
        assessment.airway_notes || "";

    child.nursing_breathing_status =
        assessment.breathing_status || "";

    child.nursing_breathing_notes =
        assessment.breathing_notes || "";

    child.nursing_circulation_status =
        assessment.circulation_status || "";

    child.nursing_circulation_notes =
        assessment.circulation_notes || "";

    child.nursing_disability_status =
        assessment.disability_status || "";

    child.nursing_disability_notes =
        assessment.disability_notes || "";

    child.nursing_exposure_status =
        assessment.exposure_status || "";

    child.nursing_exposure_notes =
        assessment.exposure_notes || "";

    child.nursing_sample_symptoms =
        assessment.sample_symptoms || "";

    child.nursing_sample_allergies =
        assessment.sample_allergies || "";

    child.nursing_sample_medications =
        assessment.sample_medications || "";

    child.nursing_sample_history =
        assessment.sample_history || "";

    child.nursing_sample_last_intake =
        assessment.sample_last_intake || "";

    child.nursing_sample_events =
        assessment.sample_events || "";

    child.nursing_general_risk =
        assessment.general_risk || "";

    child.nursing_doctor_notified =
        assessment.doctor_notified || "";

    child.nursing_escalation_reason =
        assessment.escalation_reason || "";

    const save_response =
        await frappe.call({
            method: "frappe.client.save",
            args: {
                doc: encounter
            },
            freeze: true,
            freeze_message:
                "جاري حفظ التقييم التمريضي..."
        });

    if (
        !save_response ||
        !save_response.message
    ) {

        throw new Error(
            "تعذر حفظ Patient Encounter."
        );
    }

    $(".er-clinical-workspace [data-er-nursing-note]")
        .val("");

    $(".er-clinical-workspace [data-er-nursing-assessment]")
        .val("");

    $(".er-clinical-workspace [data-er-nursing-note-status]")
        .text(
            "تم حفظ التقييم كبيانات فعلية داخل ER Clinical Note."
        );

    frappe.show_alert({
        message:
            "تم حفظ التقييم التمريضي وربطه بالزيارة بنجاح.",
        indicator:
            "green"
    });

    return save_response.message;
}

function er_clinical_update_selected_vitals_state(root) {

    const selected =
        root.find(
            '[data-er-vital-select]:checked'
        );

    const button =
        root.find(
            '[data-er-clinical-action="register-selected-vitals"]'
        );

    const count =
        root.find(
            '[data-er-clinical-selected-vitals-count]'
        );

    const total =
        selected.length;

    button.prop(
        'disabled',
        total === 0
    );

    count.text(
        total
            ? 'تم اختيار ' + total + ' مسودة'
            : 'لم يتم اختيار مسودة'
    );
}


async function er_clinical_register_vital_direct(name) {

    if (!name) {

        throw new Error(
            'رقم سجل Vital Signs غير موجود.'
        );

    }


    /*
     * اجلب أحدث نسخة من السجل مباشرة من قاعدة البيانات.
     */
    let vital =
        await frappe.db.get_doc(
            'Vital Signs',
            name
        );


    if (!vital) {

        throw new Error(
            'سجل Vital Signs غير موجود: ' +
            name
        );

    }


    if (
        Number(vital.docstatus || 0) === 1
    ) {

        return vital;

    }


    /*
     * ESI من نموذج التمريض الحالي.
     */
    const form_values =
        er_clinical_collect_vital_values();


    const form_esi =
        String(
            form_values.esi_level || ''
        ).trim();


    let esi_level =
        String(
            vital.esi_level || ''
        ).trim();


    /*
     * إذا كان ESI موجودًا في النموذج وغير موجود في السجل،
     * اكتبه في نفس السجل.
     */
    if (
        !esi_level
        &&
        form_esi
    ) {

        await frappe.db.set_value(
            'Vital Signs',
            name,
            'esi_level',
            form_esi
        );

    }


    /*
     * مهم جدًا:
     * بعد أي set_value نعيد جلب الوثيقة من قاعدة البيانات.
     * هكذا نضمن أحدث modified ولا يحدث Timestamp Conflict.
     */
    vital =
        await frappe.db.get_doc(
            'Vital Signs',
            name
        );


    if (!vital) {

        throw new Error(
            'تعذر إعادة تحميل سجل Vital Signs قبل التسجيل.'
        );

    }


    esi_level =
        String(
            vital.esi_level || ''
        ).trim();


    if (!esi_level) {

        throw new Error(
            'يجب تحديد مستوى ESI قبل تسجيل الترياج.'
        );

    }


    if (
        Number(vital.docstatus || 0) === 1
    ) {

        return vital;

    }


    /*
     * submit على أحدث نسخة كاملة من الوثيقة.
     * لا نستخدم نسخة قديمة ولا ننشئ سجلًا جديدًا.
     */
    return new Promise(function(resolve, reject) {

        frappe.call({

            method:
                'frappe.client.submit',

            args: {
                doc:
                    JSON.stringify(vital)
            },

            freeze:
                true,

            freeze_message:
                'جاري تسجيل الترياج...',

            callback:
                function(response) {

                    if (
                        response.exc
                        ||
                        !response.message
                    ) {

                        reject(
                            new Error(
                                'تعذر تسجيل سجل الترياج: ' +
                                name
                            )
                        );

                        return;

                    }


                    resolve(
                        response.message
                    );

                }

        });

    });

}




/* ============================================================
   ER NURSING — TRIAGE NURSE
   Source: Healthcare Practitioner
   Stored value: Practitioner name
   Displayed value: Practitioner name/title
============================================================ */

async function er_clinical_load_triage_nurses(root) {

    const select =
        root.find(
            '[data-er-vital-field="triage_nurse"]'
        );


    if (!select.length) {
        return;
    }


    let current =
        String(
            select.attr('data-current-triage-nurse') || ''
        ).trim();


    try {

        const practitioners =
            await frappe.db.get_list(
                'Healthcare Practitioner',
                {
                    fields: [
                        'name',
                        'practitioner_name',
                        'user_id'
                    ],

                    order_by:
                        'practitioner_name asc',

                    page_length:
                        500
                }
            );


        const options = [
            '<option value="">اختر اسم الممرض</option>'
        ];


        const seen = {};


        (practitioners || []).forEach(function(row) {

            const value =
                String(
                    row.name || ''
                ).trim();


            if (!value || seen[value]) {
                return;
            }


            seen[value] = true;


            const label =
                String(
                    row.practitioner_name ||
                    row.name ||
                    ''
                ).trim();


            options.push(
                '<option value="' +
                er_clinical_escape(value) +
                '">' +
                er_clinical_escape(label) +
                '</option>'
            );

        });


        /*
         * إذا لم يكن هناك ممرض محفوظ مسبقًا،
         * ابحث تلقائيًا عن Healthcare Practitioner
         * المرتبط بالمستخدم الحالي الذي فتح النظام.
         */
        if (!current && frappe.session.user) {

            const own_practitioner =
                (practitioners || []).find(function(row) {

                    return (
                        String(
                            row.user_id || ''
                        ).trim()
                        ===
                        String(
                            frappe.session.user || ''
                        ).trim()
                    );

                });


            if (own_practitioner) {

                current =
                    String(
                        own_practitioner.name || ''
                    ).trim();

            }

        }


        /*
         * Preserve an existing legacy value if it does not
         * match the current Practitioner list.
         */
        if (
            current
            &&
            !seen[current]
        ) {

            options.push(
                '<option value="' +
                er_clinical_escape(current) +
                '">' +
                er_clinical_escape(current) +
                ' (سجل سابق)' +
                '</option>'
            );

        }


        select.html(
            options.join('')
        );


        if (current) {

            select.val(current);

        }


        /*
         * إذا تم اختيار الممارس تلقائيًا من المستخدم الحالي،
         * نضعه أيضًا في الخاصية حتى يبقى الاختيار واضحًا
         * عند إعادة بناء النافذة.
         */
        if (
            current
        ) {

            select.attr(
                'data-current-triage-nurse',
                current
            );

        }

    }
    catch (error) {

        console.error(
            'ER TRIAGE NURSE LOAD ERROR:',
            error
        );

        select.html(
            '<option value="">تعذر تحميل أسماء الممرضين</option>'
        );

    }

}



function er_clinical_bind_events(
    context
) {

    const root =
        $('.er-clinical-workspace');


    er_clinical_load_triage_nurses(
        root
    );


    root.off(
        '.erClinicalNursing'
    );


    root.on(
        'click.erClinicalNursing',
        '[data-er-clinical-nav]',
        function(event) {

            event.preventDefault();
            event.stopPropagation();

            const section =
                $(this).attr('data-er-clinical-nav');

            if (!section) {
                return;
            }

            if (
                typeof window.open_er_section ===
                'function'
            ) {
                window.open_er_section(section);
                return;
            }

            if (
                typeof open_er_section ===
                'function'
            ) {
                open_er_section(section);
                return;
            }

            frappe.msgprint({
                title: 'تنقل الزيارة',
                message: 'تعذر فتح قسم الزيارة المطلوب.',
                indicator: 'red'
            });

        }
    );



    root.on(
        'click.erClinicalNursing',
        '[data-er-clinical-action="save-vitals"]',
        async function() {

            const button =
                $(this);


            button
                .prop(
                    'disabled',
                    true
                )
                .text(
                    '⏳ جاري الحفظ...'
                );


            try {

                const saved_name =
                    await er_clinical_save_vitals(
                        context
                    );

                if (saved_name) {

                    await er_clinical_load_workspace();

                    if (
                        typeof er_clinical_render_global_patient_header ===
                        'function'
                    ) {

                        await er_clinical_render_global_patient_header();

                    }


                    /*
                     * مهم:
                     * load_workspace() يعيد بناء النافذة بالكامل،
                     * لذلك يجب إظهار زر تسجيل الترياج بعد اكتمال
                     * إعادة البناء وليس قبلها.
                     */
                    $('.er-clinical-nursing-card')
                        .find(
                            '[data-er-clinical-action="submit-triage"]'
                        )
                        .show();
                }

            }
            catch (error) {

                console.error(
                    'ER CLINICAL SAVE VITAL ERROR:',
                    error
                );


                frappe.msgprint({

                    title:
                        'العلامات الحيوية',

                    message:
                        error.message
                        ||
                        'تعذر حفظ العلامات الحيوية.',

                    indicator:
                        'red'

                });

            }
            finally {

                button
                    .prop(
                        'disabled',
                        false
                    )
                    .text(
                        '💾 حفظ العلامات الحيوية'
                    );

            }

        }
    );


    root.on(
        'click.erClinicalNursing',
        '[data-er-clinical-action="submit-triage"]',
        async function() {

            const button =
                $(this);


            button
                .prop(
                    'disabled',
                    true
                )
                .text(
                    '⏳ جاري تسجيل الترياج...'
                );


            try {

                /*
                 * نحفظ أولًا ما تم إدخاله ثم نعتمد
                 * نفس سجل Vital Signs.
                 */

                const registered =
                    await er_clinical_submit_triage(
                        context
                    );

                if (registered !== null) {

                    button.hide();

                }

            }
            catch (error) {

                console.error(
                    'ER TRIAGE SUBMIT ERROR:',
                    error
                );


                frappe.msgprint({

                    title:
                        'تسجيل الترياج',

                    message:
                        error.message
                        ||
                        'تعذر تسجيل الترياج.',

                    indicator:
                        'red'

                });

            }
            finally {

                button
                    .prop(
                        'disabled',
                        false
                    )
                    .text(
                        '✅ تسجيل الترياج'
                    );

            }

        }
    );


    root.on(
        'click.erClinicalNursing',
        '[data-er-clinical-action="save-note"]',
        async function() {

            const button =
                $(this);


            button
                .prop(
                    'disabled',
                    true
                )
                .text(
                    '⏳ جاري الحفظ...'
                );


            try {

                await er_clinical_save_nursing_note(
                    context
                );

            }
            catch (error) {

                console.error(
                    'ER NURSING NOTE ERROR:',
                    error
                );


                frappe.msgprint({

                    title:
                        'ملاحظة التمريض',

                    message:
                        error.message
                        ||
                        'تعذر حفظ الملاحظة التمريضية.',

                    indicator:
                        'red'

                });

            }
            finally {

                button
                    .prop(
                        'disabled',
                        false
                    )
                    .text(
                        '💾 حفظ الملاحظة التمريضية'
                    );

            }

        }
    );


    root.on(
        'change.erClinicalNursing',
        '[data-er-vital-select]',
        function() {

            er_clinical_update_selected_vitals_state(
                root
            );

        }
    );


    root.on(
        'click.erClinicalNursing',
        '[data-er-clinical-action="register-selected-vitals"]',
        async function() {

            const button =
                $(this);

            const names =
                root.find(
                    '[data-er-vital-select]:checked'
                )
                .map(function() {
                    return $(this).val();
                })
                .get();

            if (!names.length) {
                return;
            }

            button
                .prop('disabled', true)
                .text('⏳ جاري تسجيل الترياج...');

            let success_count = 0;
            const errors = [];

            try {

                for (
                    let index = 0;
                    index < names.length;
                    index += 1
                ) {

                    try {

                        await er_clinical_register_vital_direct(
                            names[index]
                        );

                        success_count += 1;

                    }
                    catch (error) {

                        errors.push(
                            names[index] +
                            ': ' +
                            (
                                error.message ||
                                String(error)
                            )
                        );

                    }

                }

                if (success_count) {

                    frappe.show_alert({
                        message:
                            'تم تسجيل ' +
                            success_count +
                            ' من المسودات بنجاح.',
                        indicator:
                            'green'
                    });

                }

                if (errors.length) {

                    frappe.msgprint({
                        title:
                            'تعذر تسجيل بعض المسودات',
                        message:
                            errors.join('<br>'),
                        indicator:
                            'orange'
                    });

                }

                /*
                 * تحديث واحد فقط بعد انتهاء جميع عمليات التسجيل.
                 * السجلات المعتمدة ستظهر "معتمد" ولن يظهر لها checkbox.
                 */
                if (
                    success_count
                ) {

                    await er_clinical_load_workspace();

                }

            }
            finally {

                button
                    .prop(
                        'disabled',
                        false
                    )
                    .text(
                        '✅ تسجيل المسودة المحددة'
                    );

            }

        }
    );


}


$(document)
    .off(
        'click.erClinicalHistory',
        '#patient-medical-history'
    )
    .on(
        'click.erClinicalHistory',
        '#patient-medical-history',
        function() {

            const encounter =
                er_clinical_get_current_encounter();


            if (!encounter) {

                frappe.msgprint({

                    title:
                        'تنبيه',

                    message:
                        'لا توجد زيارة حالية محددة.',

                    indicator:
                        'orange'
                });

                return;

            }


            frappe.call({

                method:
                    'custom_app.emergency_management.page.er_visit_console.python.clinical.get_patient_history',

                args: {

                    encounter:
                        encounter

                },

                freeze:
                    true,

                freeze_message:
                    'جاري تحميل سجل المريض...',

                callback:
                    function(response) {

                        if (
                            response.exc
                            ||
                            !response.message
                        ) {

                            console.error(
                                'ER PATIENT HISTORY ERROR:',
                                response.exc
                            );

                            return;

                        }


                        open_patient_history_dialog(
                            response.message
                        );

                    }

            });

        }
    );


function open_patient_history_dialog(
    data
) {

    const dialog =
        new frappe.ui.Dialog({

            title:
                '📋 سجل المريض',

            size:
                'extra-large',

            fields: [

                {
                    fieldname:
                        'history_html',

                    fieldtype:
                        'HTML'
                }

            ]

        });


    const html = `

        <div class="patient-history-container">

            <div class="patient-history-header">

                <div>

                    <strong>
                        المريض
                    </strong>

                    <span>
                        ${er_clinical_escape(
                            data.patient_name || '—'
                        )}
                    </span>

                </div>


                <div>

                    <strong>
                        رقم المريض
                    </strong>

                    <span>
                        ${er_clinical_escape(
                            data.patient || '—'
                        )}
                    </span>

                </div>

            </div>


            <div class="patient-history-tabs">

                <button
                    type="button"
                    class="btn btn-primary patient-history-tab active"
                    data-tab="vitals"
                >
                    ❤️ العلامات الحيوية
                </button>


                <button
                    type="button"
                    class="btn btn-default patient-history-tab"
                    data-tab="medical"
                >
                    📋 التاريخ الطبي
                </button>

            </div>


            <div class="patient-history-filter">

                <label>
                    زيارة المريض
                </label>


                <select
                    id="history-encounter-filter"
                    class="form-control"
                >

                    ${
                        (data.visits || [])
                            .map(function(visit) {

                                const selected =
                                    visit.name ===
                                    data.selected_encounter
                                        ? 'selected'
                                        : '';


                                return `

                                    <option
                                        value="${er_clinical_escape(
                                            visit.name
                                        )}"
                                        ${selected}
                                    >
                                        ${er_clinical_escape(
                                            visit.name
                                        )}
                                        -
                                        ${er_clinical_escape(
                                            visit.encounter_date || ''
                                        )}
                                    </option>

                                `;

                            })
                            .join('')
                    }

                </select>

            </div>


            <div
                id="patient-history-vitals"
                class="patient-history-tab-content"
            >

                ${render_patient_vitals_table(
                    data.selected_vitals || []
                )}

            </div>


            <div
                id="patient-history-medical"
                class="patient-history-tab-content"
                style="display:none;"
            >

                ${render_patient_medical_history(
                    data.visits || [],
                    data.selected_encounter
                )}

            </div>

        </div>

    `;


    dialog.fields_dict
        .history_html
        .$wrapper
        .html(
            html
        );


    dialog.show();


    dialog.$wrapper.on(
        'click.erPatientHistory',
        '.patient-history-tab',
        function() {

            const tab =
                $(this).data('tab');


            dialog.$wrapper
                .find('.patient-history-tab')
                .removeClass('btn-primary')
                .addClass('btn-default');


            $(this)
                .removeClass('btn-default')
                .addClass('btn-primary');


            if (
                tab === 'vitals'
            ) {

                dialog.$wrapper
                    .find('#patient-history-vitals')
                    .show();

                dialog.$wrapper
                    .find('#patient-history-medical')
                    .hide();

            }
            else {

                dialog.$wrapper
                    .find('#patient-history-vitals')
                    .hide();

                dialog.$wrapper
                    .find('#patient-history-medical')
                    .show();

            }

        }
    );


    dialog.$wrapper.on(
        'change.erPatientHistory',
        '#history-encounter-filter',
        function() {

            const selected_encounter =
                $(this).val();


            frappe.call({

                method:
                    'custom_app.emergency_management.page.er_visit_console.python.clinical.get_patient_history',

                args: {

                    encounter:
                        er_clinical_get_current_encounter(),

                    selected_encounter:
                        selected_encounter

                },

                freeze:
                    true,

                freeze_message:
                    'جاري تحميل الزيارة...',

                callback:
                    function(response) {

                        if (
                            response.exc
                            ||
                            !response.message
                        ) {
                            return;
                        }


                        const result =
                            response.message;


                        dialog.$wrapper
                            .find('#patient-history-vitals')
                            .html(
                                render_patient_vitals_table(
                                    result.selected_vitals || []
                                )
                            );


                        dialog.$wrapper
                            .find('#patient-history-medical')
                            .html(
                                render_patient_medical_history(
                                    result.visits || [],
                                    result.selected_encounter
                                )
                            );

                    }

            });

        }
    );

}


function render_patient_vitals_table(
    vitals
) {

    if (
        !vitals
        ||
        !vitals.length
    ) {

        return `

            <div class="patient-history-empty">

                <span class="patient-history-empty-icon">
                    ❤️
                </span>

                <div class="patient-history-empty-text">
                    لا توجد علامات حيوية لهذه الزيارة
                </div>

            </div>

        `;

    }


    const rows =
        vitals
            .map(function(vital) {

                return `

                    <tr>

                        <td>
                            ${er_clinical_escape(
                                vital.signs_date || '—'
                            )}
                        </td>

                        <td>
                            ${er_clinical_escape(
                                vital.signs_time || '—'
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.temperature
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.pulse
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.respiratory_rate
                            )}
                        </td>

                        <td>
                            ${er_clinical_escape(
                                (
                                    vital.bp_systolic
                                    ||
                                    vital.bp_diastolic
                                )
                                    ? String(
                                        vital.bp_systolic || ''
                                    )
                                    +
                                    '/'
                                    +
                                    String(
                                        vital.bp_diastolic || ''
                                    )
                                    : '—'
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.spo2
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.esi_level
                            )}
                        </td>

                        <td>
                            ${er_clinical_render_vital_value(
                                vital.recorded_by
                            )}
                        </td>

                    </tr>

                `;

            })
            .join('');


    return `

        <div class="table-responsive patient-history-vitals-table">

            <table class="table table-bordered">

                <thead>

                    <tr>

                        <th>التاريخ</th>
                        <th>الوقت</th>
                        <th>الحرارة</th>
                        <th>النبض</th>
                        <th>التنفس</th>
                        <th>الضغط</th>
                        <th>SpO₂</th>
                        <th>ESI</th>
                        <th>المسجل</th>

                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

        </div>

    `;

}


function render_patient_medical_history(
    visits,
    selected_encounter
) {

    if (
        !visits
        ||
        !visits.length
    ) {

        return `

            <div class="patient-history-empty">

                <span class="patient-history-empty-icon">
                    📋
                </span>

                <div class="patient-history-empty-text">
                    لا توجد زيارات سابقة
                </div>

            </div>

        `;

    }


    let selected =
        visits.find(function(visit) {

            return (
                visit.name ===
                selected_encounter
            );

        });


    if (!selected) {
        selected = visits[0];
    }


    return `

        <div class="medical-history-card">

            <div class="medical-history-row">

                <strong>
                    رقم الزيارة
                </strong>

                <span>
                    ${er_clinical_escape(
                        selected.name || '—'
                    )}
                </span>

            </div>


            <div class="medical-history-row">

                <strong>
                    تاريخ الزيارة
                </strong>

                <span>
                    ${er_clinical_escape(
                        selected.encounter_date || '—'
                    )}
                </span>

            </div>


            <div class="medical-history-row">

                <strong>
                    وقت زيارة الطبيب
                </strong>

                <span>
                    ${er_clinical_escape(
                        selected.encounter_time || '—'
                    )}
                </span>

            </div>


            <div class="medical-history-row">

                <strong>
                    نوع الزيارة
                </strong>

                <span>
                    ${er_clinical_escape(
                        selected.er_visit_type || '—'
                    )}
                </span>

            </div>


            <div class="medical-history-row">

                <strong>
                    حالة زيارة الطوارئ
                </strong>

                <span>
                    ${er_clinical_escape(
                        selected.er_visit_status || '—'
                    )}
                </span>

            </div>


            <div class="medical-history-row">

                <strong>
                    الطبيب
                </strong>

                <span>
                    ${er_clinical_escape(
                        selected.practitioner_name || '—'
                    )}
                </span>

            </div>

        </div>

    `;

}


window.open_patient_history_dialog =
    open_patient_history_dialog;

console.log(
    'ER NURSING / CLINICAL JS READY'
);


/* ============================================================
   ER NURSING — VITAL SIGNS FIXED POPUP
   نفس تصميم نافذة Vital Signs في ER Patient Intake.
   لا ينشئ مسار حفظ جديد:
   popup -> hidden nursing fields -> existing save-vitals handler
   والمصدر الوحيد يبقى Vital Signs القياسي.
============================================================ */

(function() {

    "use strict";


    function get_card() {

        return $(".er-clinical-nursing-card").first();

    }


    function get_field(card, fieldname) {

        return card.find(
            '[data-er-vital-field="' +
            fieldname +
            '"]'
        ).first();

    }


    function get_value(card, fieldname) {

        const field =
            get_field(
                card,
                fieldname
            );

        if (!field.length) {
            return "";
        }

        if (field.is(":checkbox")) {
            return field.is(":checked") ? 1 : 0;
        }

        return field.val() || "";

    }


    function set_value(card, fieldname, value) {

        const field =
            get_field(
                card,
                fieldname
            );

        if (!field.length) {
            return;
        }

        if (field.is(":checkbox")) {

            field.prop(
                "checked",
                !!Number(value || 0)
            );

        } else {

            field.val(
                value == null
                    ? ""
                    : value
            );

        }

    }


    function read_header_value(labels) {

        const header =
            $(".er-global-patient-card").first();

        if (!header.length) {
            return "—";
        }

        let value = "";

        header.find("small, span, div").each(function() {

            if (value) {
                return;
            }

            const label =
                $(this)
                    .clone()
                    .children()
                    .remove()
                    .end()
                    .text()
                    .trim();

            if (!labels.includes(label)) {
                return;
            }

            const box =
                $(this).closest("div");

            const strong =
                box.find("strong").first();

            if (strong.length) {

                value =
                    strong
                        .text()
                        .trim();

            }

        });

        return value || "—";
    }


    function get_patient_info() {

        return {

            patient:
                read_header_value([
                    "المريض",
                    "Patient"
                ]),

            patient_id:
                read_header_value([
                    "معرف المريض",
                    "رقم المريض",
                    "Patient ID",
                    "ID"
                ]),

            visit:
                read_header_value([
                    "الزيارة",
                    "الزيارة الطبية",
                    "Medical Visit"
                ])

        };

    }


    function hide_original_form(card) {

        card.find(
            ".er-clinical-form-section"
        ).hide().attr(
            "data-nursing-vitals-fixed-hidden",
            "1"
        );

        card.find(
            ".er-clinical-action-bar"
        ).hide().attr(
            "data-nursing-vitals-fixed-hidden",
            "1"
        );

        card.find(
            "[data-er-clinical-save-status]"
        ).hide().attr(
            "data-nursing-vitals-fixed-hidden",
            "1"
        );

    }


    function sync_controls(card) {

        if (!card || !card.length) {
            return;
        }


        const header =
            card.find(
                ".er-clinical-card-header"
            ).first();


        if (!header.length) {
            return;
        }


        let toolbar =
            header.find(
                ".er-nursing-vitals-toolbar"
            ).first();


        if (!toolbar.length) {

            toolbar = $(`
                <div
                    class="er-nursing-vitals-toolbar"
                    data-er-nursing-vitals-toolbar
                >

                    <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-er-nursing-open-vitals>
                        ➕ إضافة علامات جديدة
                    </button>

                    <button
                        type="button"
                        class="btn btn-default btn-sm"
                        data-er-nursing-refresh-vitals>
                        🔄 تحديث
                    </button>

                    <button
                        type="button"
                        class="btn btn-default btn-sm"
                        data-er-nursing-history-vitals>
                        📊 العلامات الحيوية السابقة
                    </button>

                </div>
            `);


            header.append(
                toolbar
            );

        }
        else {

            toolbar.find(
                "[data-er-nursing-open-vitals]"
            ).text(
                "➕ إضافة علامات جديدة"
            );

        }

    }


    function ensure_css() {

        if (
            $("#er-nursing-vitals-fixed-style").length
        ) {
            return;
        }

        $("body").append(`
            <style id="er-nursing-vitals-fixed-style">

                .er-nursing-vitals-fixed-popup {
                    position: fixed;
                    inset: 0;
                    z-index: 1100;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding: 8px;
                    box-sizing: border-box;
                }

                .er-nursing-vitals-fixed-backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(15, 23, 42, .34);
                }

                .er-nursing-vitals-fixed-window {
                    position: relative;
                    z-index: 1;
                    width: 430px;
                    max-width: calc(100vw - 16px);
                    max-height: calc(100vh - 16px);
                    background: #fff;
                    border: 1px solid #d9dee5;
                    border-radius: 8px;
                    box-shadow: 0 8px 30px rgba(15,23,42,.18);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .er-nursing-vitals-fixed-header {
                    padding: 6px 7px;
                    border-bottom: 1px solid #e5e7eb;
                    background: #fff;
                }

                .er-nursing-vitals-fixed-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 12px;
                    font-weight: 700;
                    line-height: 1;
                    margin-bottom: 5px;
                }

                .er-nursing-vitals-fixed-close {
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    border: 0;
                    background: transparent;
                    font-size: 20px;
                    line-height: 20px;
                    color: #64748b;
                    cursor: pointer;
                }

                .er-nursing-vitals-patient-line {
                    display: grid;
                    grid-template-columns: 1.6fr .55fr .9fr;
                    gap: 3px;
                    margin-bottom: 3px;
                }

                .er-nursing-vitals-patient-line > div {
                    min-width: 0;
                    padding: 3px 5px;
                    border: 1px solid #e5e7eb;
                    border-radius: 5px;
                    background: #f8fafc;
                }

                .er-nursing-vitals-patient-line small {
                    display: block;
                    font-size: 8px;
                    line-height: 1.1;
                    color: #64748b;
                }

                .er-nursing-vitals-patient-line strong {
                    display: block;
                    margin-top: 1px;
                    font-size: 10px;
                    line-height: 1.1;
                    color: #1e293b;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }

                .er-nursing-vitals-fixed-meta {
                    padding: 3px 5px;
                    border: 1px solid #e5e7eb;
                    border-radius: 5px;
                    background: #f8fafc;
                    font-size: 8px;
                    line-height: 1.2;
                    color: #64748b;
                }

                .er-nursing-vitals-fixed-body {
                    padding: 5px 7px;
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .er-nursing-vitals-section-title {
                    margin: 4px 0 3px;
                    padding-bottom: 2px;
                    border-bottom: 1px solid #edf1f5;
                    font-size: 9px;
                    font-weight: 700;
                    color: #475569;
                }

                .er-nursing-vitals-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 3px 5px;
                }

                .er-nursing-vitals-grid label {
                    min-width: 0;
                }

                .er-nursing-vitals-grid label span {
                    display: block;
                    margin-bottom: 1px;
                    font-size: 8px;
                    line-height: 1.1;
                    color: #64748b;
                }

                .er-nursing-vital-input {
                    width: 100%;
                    height: 24px;
                    min-height: 24px;
                    box-sizing: border-box;
                    padding: 2px 5px;
                    border: 1px solid #d8dee6;
                    border-radius: 4px;
                    background: #fff;
                    font-size: 10px;
                }

                .er-nursing-vital-wide {
                    grid-column: 1 / -1;
                }

                .er-nursing-vital-textarea {
                    height: 35px;
                    min-height: 35px;
                    resize: vertical;
                    line-height: 1.2;
                }

                .er-nursing-vital-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 4px 0;
                    font-size: 9px;
                }

                .er-nursing-vitals-fixed-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 4px;
                    padding: 5px 7px;
                    border-top: 1px solid #e5e7eb;
                    background: #fff;
                }

                .er-nursing-vitals-fixed-footer .btn {
                    min-height: 28px;
                    padding: 3px 10px;
                    font-size: 10px;
                }

                .er-clinical-history-highlight {
                    box-shadow:
                        0 0 0 2px rgba(59, 130, 246, .25);
                    transition:
                        box-shadow .2s ease;
                }

                .er-nursing-vitals-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 5px;
                    flex-wrap: wrap;
                    margin-top: 6px;
                }

                .er-nursing-vitals-toolbar .btn {
                    min-height: 28px;
                    padding: 3px 9px;
                    font-size: 10px;
                }

                @media (max-width: 520px) {

                    .er-nursing-vitals-fixed-popup {
                        padding: 5px;
                    }

                    .er-nursing-vitals-fixed-window {
                        width: 100%;
                        max-width: 100%;
                        max-height: calc(100vh - 10px);
                    }

                }

            </style>
        `);

    }


    function copy_popup_to_card(root, card) {

        const fields = [
            "temperature",
            "pulse",
            "respiratory_rate",
            "bp_systolic",
            "bp_diastolic",
            "spo2",
            "pain_score",
            "custom_blood_glucose",
            "height",
            "weight",
            "vital_signs_note"
        ];

        fields.forEach(function(fieldname) {

            set_value(
                card,
                fieldname,
                root.find(
                    '[data-popup-field="' +
                    fieldname +
                    '"]'
                ).val() || ""
            );

        });


        set_value(
            card,
            "critical_alert",
            root.find(
                '[data-popup-field="critical_alert"]'
            ).is(":checked")
                ? 1
                : 0
        );

    }


    function sync_popup_from_card(root, card) {

        const fields = [
            "temperature",
            "pulse",
            "respiratory_rate",
            "bp_systolic",
            "bp_diastolic",
            "spo2",
            "pain_score",
            "custom_blood_glucose",
            "height",
            "weight",
            "vital_signs_note"
        ];

        fields.forEach(function(fieldname) {

            root.find(
                '[data-popup-field="' +
                fieldname +
                '"]'
            ).val(
                get_value(
                    card,
                    fieldname
                )
            );

        });


        root.find(
            '[data-popup-field="critical_alert"]'
        ).prop(
            "checked",
            !!Number(
                get_value(
                    card,
                    "critical_alert"
                )
            )
        );

    }


    function close_popup(root) {

        if (!root || !root.length) {
            return;
        }

        root.remove();

    }


    function open_popup(start_new) {

        let card =
            get_card();

        if (!card.length) {
            return;
        }

        if (
            $(".er-nursing-vitals-fixed-popup").length
        ) {
            return;
        }


        if (
            start_new &&
            typeof er_clinical_start_new_vital ===
            "function"
        ) {

            er_clinical_start_new_vital();

            card =
                get_card();

            if (!card.length) {
                return;
            }

        }


        ensure_css();


        const patient_info =
            get_patient_info();


        const esc =
            frappe.utils.escape_html;


        const popup_html = `

            <div class="er-nursing-vitals-fixed-popup">

                <div class="er-nursing-vitals-fixed-backdrop"></div>

                <div class="er-nursing-vitals-fixed-window">

                    <div class="er-nursing-vitals-fixed-header">

                        <div class="er-nursing-vitals-fixed-title">

                            <span>
                                🆕 علامات حيوية جديدة / New Vital Signs
                            </span>

                            <button
                                type="button"
                                class="er-nursing-vitals-fixed-close">
                                ×
                            </button>

                        </div>

                        <div class="er-nursing-vitals-patient-line">

                            <div>
                                <small>المريض</small>
                                <strong>
                                    ${esc(String(patient_info.patient || "—"))}
                                </strong>
                            </div>

                            <div>
                                <small>ID</small>
                                <strong>
                                    ${esc(String(patient_info.patient_id || "—"))}
                                </strong>
                            </div>

                            <div>
                                <small>الزيارة</small>
                                <strong>
                                    ${esc(String(patient_info.visit || "—"))}
                                </strong>
                            </div>

                        </div>

                        <div class="er-nursing-vitals-fixed-meta">
                            إدخال قراءة جديدة في Vital Signs القياسي. التاريخ والوقت يُسجلان تلقائيًا.
                        </div>

                    </div>


                    <div class="er-nursing-vitals-fixed-body">

                        <div class="er-nursing-vitals-section-title">
                            العلامات الحيوية الأساسية
                        </div>

                        <div class="er-nursing-vitals-grid">

                            <label>
                                <span>الحرارة °C / Temperature</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    class="er-nursing-vital-input"
                                    data-popup-field="temperature">
                            </label>

                            <label>
                                <span>النبض bpm / Pulse</span>
                                <input
                                    type="number"
                                    class="er-nursing-vital-input"
                                    data-popup-field="pulse">
                            </label>

                            <label>
                                <span>التنفس / Resp. Rate</span>
                                <input
                                    type="number"
                                    class="er-nursing-vital-input"
                                    data-popup-field="respiratory_rate">
                            </label>

                            <label>
                                <span>الأكسجين % / SpO₂</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    class="er-nursing-vital-input"
                                    data-popup-field="spo2">
                            </label>

                        </div>


                        <div class="er-nursing-vitals-section-title">
                            الضغط والسكر والألم / BP, Glucose & Pain
                        </div>

                        <div class="er-nursing-vitals-grid">

                            <label>
                                <span>الضغط الانقباضي / SYS</span>
                                <input
                                    type="number"
                                    class="er-nursing-vital-input"
                                    data-popup-field="bp_systolic">
                            </label>

                            <label>
                                <span>الضغط الانبساطي / DIA</span>
                                <input
                                    type="number"
                                    class="er-nursing-vital-input"
                                    data-popup-field="bp_diastolic">
                            </label>

                            <label>
                                <span>سكر الدم / Glucose</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    class="er-nursing-vital-input"
                                    data-popup-field="custom_blood_glucose">
                            </label>

                            <label>
                                <span>درجة الألم 0–10 / Pain</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    class="er-nursing-vital-input"
                                    data-popup-field="pain_score">
                            </label>

                        </div>


                        <div class="er-nursing-vitals-section-title">
                            الطول والوزن / Height & Weight
                        </div>

                        <div class="er-nursing-vitals-grid">

                            <label>
                                <span>الطول cm / Height</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    class="er-nursing-vital-input"
                                    data-popup-field="height">
                            </label>

                            <label>
                                <span>الوزن kg / Weight</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    class="er-nursing-vital-input"
                                    data-popup-field="weight">
                            </label>

                        </div>


                        <div class="er-nursing-vitals-section-title">
                            الملاحظات
                        </div>

                        <div class="er-nursing-vitals-grid">

                            <label class="er-nursing-vital-wide">
                                <span>ملاحظات العلامات الحيوية</span>
                                <textarea
                                    class="er-nursing-vital-input er-nursing-vital-textarea"
                                    data-popup-field="vital_signs_note"></textarea>
                            </label>

                        </div>

                    </div>


                    <div class="er-nursing-vitals-fixed-footer">

                        <button
                            type="button"
                            class="btn btn-primary er-nursing-vitals-save-btn">
                            💾 حفظ علامات حيوية جديدة
                        </button>

                        <button
                            type="button"
                            class="btn btn-secondary er-nursing-vitals-cancel-btn">
                            إغلاق / Close
                        </button>

                    </div>

                </div>

            </div>
        `;


        $("body").append(
            popup_html
        );


        const root =
            $(".er-nursing-vitals-fixed-popup").last();


        sync_popup_from_card(
            root,
            card
        );


        let popup_vital_saved =
            false;


        const toolbar_button =
            card.find(
                "[data-er-nursing-open-vitals]"
            ).first();


        if (toolbar_button.length) {

            toolbar_button.text(
                "🆕 علامات حيوية جديدة"
            );

        }


        const cleanup =
            function() {

                if (toolbar_button.length) {

                    toolbar_button.text(
                        "➕ إضافة علامات جديدة"
                    );

                }

                close_popup(
                    root
                );

            };


        root.find(
            ".er-nursing-vitals-fixed-close, .er-nursing-vitals-cancel-btn, .er-nursing-vitals-fixed-backdrop"
        ).on(
            "click",
            cleanup
        );


        root.find(
            ".er-nursing-vitals-save-btn"
        ).on(
            "click.erNursingVitalsFixedSave",
            async function() {

                const button =
                    $(this);


                /*
                 * ====================================================
                 * المرحلة الثانية: تسجيل السجل المحفوظ.
                 *
                 * نفس الزر نفسه.
                 *
                 * هذا هو نفس المسار الموجود في ER Patient Intake:
                 *
                 * 1) ربط triage_record بالسجل الجديد.
                 * 2) استدعاء submit_initial_triage().
                 * ====================================================
                 */
                if (popup_vital_saved) {

                    button
                        .prop(
                            "disabled",
                            true
                        )
                        .text(
                            "جاري التسجيل / Recording..."
                        );


                    try {

                        const current_card =
                            get_card();


                        if (!current_card.length) {
                            throw new Error(
                                "تعذر العثور على بطاقة التمريض."
                            );
                        }


                        const saved_name =
                            current_card.attr(
                                "data-vital-name"
                            ) || "";


                        if (!saved_name) {
                            throw new Error(
                                "لا يوجد سجل Vital Signs محفوظ للتسجيل."
                            );
                        }


                        const context =
                            await er_clinical_fetch_context();


                        const intake =
                            context.intake || {};


                        const intake_name =
                            intake.name || "";


                        if (!intake_name) {
                            throw new Error(
                                "تعذر تحديد ER Patient Intake المرتبط بالزيارة."
                            );
                        }


                        /*
                         * مطابق لسلوك ER Patient Intake:
                         * triage_record = Vital Signs الجديد.
                         */
                        await frappe.call({
                            method:
                                "frappe.client.set_value",
                            args: {
                                doctype:
                                    "ER Patient Intake",
                                name:
                                    intake_name,
                                fieldname:
                                    "triage_record",
                                value:
                                    saved_name
                            },
                            freeze:
                                true,
                            freeze_message:
                                "جاري ربط العلامات الحيوية بالفرز..."
                        });


                        /*
                         * التسجيل الحقيقي:
                         * نفس method المستخدمة في ER Patient Intake.
                         */
                        const submit_response =
                            await frappe.call({
                                method:
                                    "custom_app.emergency_management.doctype.er_patient_intake.er_patient_intake.submit_initial_triage",
                                args: {
                                    intake_name:
                                        intake_name
                                },
                                freeze:
                                    true,
                                freeze_message:
                                    "جاري تسجيل العلامات الحيوية / Recording vital signs..."
                            });


                        if (
                            !submit_response ||
                            submit_response.exc ||
                            !submit_response.message
                        ) {
                            throw new Error(
                                "تعذر تسجيل العلامات الحيوية."
                            );
                        }


                        const recorded =
                            submit_response.message;


                        button
                            .text(
                                "تم التسجيل / Recorded"
                            )
                            .prop(
                                "disabled",
                                false
                            );


                        frappe.show_alert({
                            message:
                                "تم تسجيل العلامات الحيوية: " +
                                (
                                    recorded.name ||
                                    saved_name
                                ),
                            indicator:
                                "green"
                        });


                        close_popup(
                            root
                        );


                        await er_clinical_load_workspace();


                        if (
                            typeof er_clinical_render_global_patient_header ===
                            "function"
                        ) {

                            await er_clinical_render_global_patient_header();

                        }

                    }
                    catch (error) {

                        console.error(
                            "ER NURSING VITAL POPUP REGISTER ERROR:",
                            error
                        );


                        button
                            .prop(
                                "disabled",
                                false
                            )
                            .text(
                                "✅ تسجيل"
                            );


                        frappe.msgprint({
                            title:
                                "تعذر تسجيل العلامات الحيوية",
                            message:
                                error.message ||
                                "حدث خطأ أثناء التسجيل.",
                            indicator:
                                "red"
                        });

                    }

                    return;
                }


                /*
                 * ====================================================
                 * المرحلة الأولى: الحفظ.
                 *
                 * لا يوجد trigger() لزر مخفي.
                 * لا يوجد setTimeout.
                 * نستدعي دالة الحفظ الأصلية مباشرة.
                 * ====================================================
                 */
                const current_card =
                    get_card();


                if (!current_card.length) {
                    return;
                }


                copy_popup_to_card(
                    root,
                    current_card
                );


                button
                    .prop(
                        "disabled",
                        true
                    )
                    .text(
                        "جاري الحفظ / Saving..."
                    );


                try {

                    const context =
                        await er_clinical_fetch_context();


                    const saved_name =
                        await er_clinical_save_vitals(
                            context
                        );


                    if (!saved_name) {

                        button
                            .prop(
                                "disabled",
                                false
                            )
                            .text(
                                "💾 حفظ علامات حيوية جديدة"
                            );

                        return;
                    }


                    /*
                     * er_clinical_save_vitals() يضع الاسم
                     * على بطاقة التمريض بعد نجاح INSERT.
                     */
                    const saved_card =
                        get_card();


                    const actual_name =
                        saved_card.length
                            ? (
                                saved_card.attr(
                                    "data-vital-name"
                                ) || ""
                            )
                            : saved_name;


                    if (!actual_name) {

                        throw new Error(
                            "تم تنفيذ الحفظ ولكن لم يتم العثور على سجل Vital Signs الجديد."
                        );

                    }


                    /*
                     * الحفظ نجح فعليًا.
                     * نفس الزر يتحول الآن إلى تسجيل.
                     */
                    popup_vital_saved =
                        true;


                    button
                        .prop(
                            "disabled",
                            false
                        )
                        .text(
                            "✅ تسجيل"
                        );


                    root.find(
                        ".er-nursing-vitals-fixed-title span"
                    ).text(
                        "✅ علامات حيوية محفوظة — جاهزة للتسجيل"
                    );


                    frappe.show_alert({
                        message:
                            "تم حفظ العلامات الحيوية: " +
                            actual_name,
                        indicator:
                            "green"
                    });

                }
                catch (error) {

                    console.error(
                        "ER NURSING VITAL POPUP SAVE ERROR:",
                        error
                    );


                    button
                        .prop(
                            "disabled",
                            false
                        )
                        .text(
                            "💾 حفظ علامات حيوية جديدة"
                        );


                    frappe.msgprint({
                        title:
                            "تعذر حفظ العلامات الحيوية",
                        message:
                            error.message ||
                            "حدث خطأ أثناء الحفظ.",
                        indicator:
                            "red"
                    });

                }

            }
        );

    }


    function init() {

        const card =
            get_card();

        if (!card.length) {
            return;
        }

        ensure_css();

        sync_controls(
            card
        );


        const open =
            card.find(
                "[data-er-nursing-open-vitals]"
            ).first();

        open.off(
            "click.erNursingVitalsFixedOpen"
        );

        open.on(
            "click.erNursingVitalsFixedOpen",
            function() {

                open_popup(
                    true
                );

            }
        );


        const refresh =
            card.find(
                "[data-er-nursing-refresh-vitals]"
            ).first();

        refresh.off(
            "click.erNursingVitalsFixedRefresh"
        );

        refresh.on(
            "click.erNursingVitalsFixedRefresh",
            async function() {

                const button =
                    $(this);

                button.prop(
                    "disabled",
                    true
                );

                try {

                    await er_clinical_load_workspace();

                    if (
                        typeof er_clinical_render_global_patient_header ===
                        "function"
                    ) {

                        await er_clinical_render_global_patient_header();

                    }

                }
                finally {

                    button.prop(
                        "disabled",
                        false
                    );

                }

            }
        );


        const history =
            card.find(
                "[data-er-nursing-history-vitals]"
            ).first();

        history.off(
            "click.erNursingVitalsFixedHistory"
        );

        history.on(
            "click.erNursingVitalsFixedHistory",
            function() {

                const history_card =
                    $(".er-clinical-history-card")
                        .filter(
                            function() {

                                return (
                                    $(this).find(
                                        '[data-er-clinical-action="register-selected-vitals"]'
                                    ).length
                                    &&
                                    $(this).find(
                                        ".er-clinical-history-table"
                                    ).length
                                );

                            }
                        )
                        .first();

                if (!history_card.length) {

                    frappe.show_alert({
                        message:
                            "لا توجد علامات حيوية سابقة لهذه الزيارة.",
                        indicator:
                            "orange"
                    });

                    return;
                }

                const dialog =
                    new frappe.ui.Dialog({
                        title:
                            "📊 العلامات الحيوية السابقة",
                        size:
                            "large",
                        fields: [
                            {
                                fieldname:
                                    "history_html",
                                fieldtype:
                                    "HTML"
                            }
                        ]
                    });

                dialog.fields_dict
                    .history_html
                    .$wrapper
                    .html(
                        history_card
                            .html()
                    );

                dialog.show();

            }
        );

    }


    window.er_nursing_init_vitals_popup =
        init;

    setTimeout(
        init,
        300
    );

})();

/* ER GLOBAL HEADER — public entry point */
window.er_clinical_render_global_patient_header =
    er_clinical_render_global_patient_header;
