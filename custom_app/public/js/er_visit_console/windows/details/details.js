'use strict';

/* =====================================================
   ER VISIT CONSOLE
   DETAILS TAB
===================================================== */

function details_value(value, fallback = "---") {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }


    if (typeof value === "object") {

        return (
            value.name ||
            value.label ||
            value.patient_name ||
            value.value ||
            fallback
        );

    }


    return String(value);
}


/* =====================================================
   تحميل تفاصيل الزيارة
===================================================== */

function load_details_section() {

    if (!current_encounter) {
        return;
    }


    let data =
        window.er_current_data || {};


    let patient =
        data.patient || {};


    let er =
        data.er || {};


    let age =
        calculate_age(
            patient.dob
        );


    let doctor =
        details_value(
            data.practitioner_name ||
            data.practitioner
        );


    let patient_name =
        details_value(
            patient.patient_name ||
            patient.name
        );


    let patient_id =
        details_value(
            patient.name ||
            patient.patient
        );


    let gender =
        details_value(
            patient.gender
        );


    let mobile =
        details_value(
            patient.mobile ||
            patient.phone
        );


    let encounter_number =
        details_value(
            data.name ||
            current_encounter
        );


    let visit_date =
        details_value(
            data.encounter_date ||
            data.posting_date
        );


    let status =
        details_value(
            data.status
        );


    let visit_type =
        details_value(
            er.visit_type
        );


    let arrival_mode =
        details_value(
            er.arrival_mode
        );


    let priority =
        details_value(
            er.priority
        );


    let current_location =
        details_value(
            er.current_location
        );


    let waiting_area =
        details_value(
            er.waiting_area
        );


    let assigned_bed =
        details_value(
            er.assigned_bed
        );


    let complaint =
        details_value(
            er.chief_complaint ||
            data.chief_complaint
        );


    $("#er-content")
        .html(`

            <div class="er-details-container">


                <!-- =================================
                     معلومات المريض
                ================================= -->

                <div class="er-card">

                    <h4 class="er-card-title">

                        <span class="er-icon">
                            👤
                        </span>

                        <span>
                            معلومات المريض
                        </span>

                    </h4>


                    <div class="er-fields">


                        <div class="er-field">

                            <label>
                                اسم المريض
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_patient_name"
                                value="${escape_html(
                                    patient_name
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                رقم المريض
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_patient_id"
                                value="${escape_html(
                                    patient_id
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                الجنس
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_gender"
                                value="${escape_html(
                                    gender
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                العمر
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_age"
                                value="${escape_html(
                                    age
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                تاريخ الميلاد
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_dob"
                                value="${escape_html(
                                    details_value(
                                        patient.dob
                                    )
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                الجوال
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_mobile"
                                value="${escape_html(
                                    mobile
                                )}"
                                readonly
                            >

                        </div>


                    </div>

                </div>


                <!-- =================================
                     معلومات الزيارة
                ================================= -->

                <div class="er-card">

                    <h4 class="er-card-title">

                        <span class="er-icon">
                            🏥
                        </span>

                        <span>
                            معلومات الزيارة
                        </span>

                    </h4>


                    <div class="er-fields">


                        <div class="er-field">

                            <label>
                                رقم الزيارة
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_encounter"
                                value="${escape_html(
                                    encounter_number
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                الطبيب
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_doctor"
                                value="${escape_html(
                                    doctor
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                تاريخ الزيارة
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_visit_date"
                                value="${escape_html(
                                    visit_date
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                الحالة
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_status"
                                value="${escape_html(
                                    status
                                )}"
                                readonly
                            >

                        </div>


                    </div>

                </div>


                <!-- =================================
                     معلومات الطوارئ
                ================================= -->

                <div class="er-card">

                    <h4 class="er-card-title">

                        <span class="er-icon">
                            🚑
                        </span>

                        <span>
                            معلومات الطوارئ
                        </span>

                    </h4>


                    <div class="er-fields">


                        <div class="er-field">

                            <label>
                                نوع الزيارة
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_visit_type"
                                value="${escape_html(
                                    visit_type
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                طريقة الوصول
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_arrival_mode"
                                value="${escape_html(
                                    arrival_mode
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                الأولوية
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_priority"
                                value="${escape_html(
                                    priority
                                )}"
                                readonly
                            >

                        </div>


                    </div>

                </div>


                <!-- =================================
                     الموقع
                ================================= -->

                <div class="er-card">

                    <h4 class="er-card-title">

                        <span class="er-icon">
                            📍
                        </span>

                        <span>
                            الموقع
                        </span>

                    </h4>


                    <div class="er-fields">


                        <div class="er-field">

                            <label>
                                الموقع الحالي
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_current_location"
                                value="${escape_html(
                                    current_location
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                منطقة الانتظار
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_waiting_area"
                                value="${escape_html(
                                    waiting_area
                                )}"
                                readonly
                            >

                        </div>


                        <div class="er-field">

                            <label>
                                السرير
                            </label>

                            <input
                                class="er-edit-field"
                                id="detail_assigned_bed"
                                value="${escape_html(
                                    assigned_bed
                                )}"
                                readonly
                            >

                        </div>


                    </div>

                </div>


                <!-- =================================
                     الشكوى الرئيسية
                ================================= -->

                <div class="er-card er-wide-card">

                    <h4 class="er-card-title">

                        <span class="er-icon">
                            📝
                        </span>

                        <span>
                            الشكوى الرئيسية
                        </span>

                    </h4>


                    <div class="er-complaint-field">

                        <textarea
                            class="er-edit-field er-chief-complaint-compact"
                            id="detail_chief_complaint"
                            readonly
                        >${escape_html(
                            complaint
                        )}</textarea>

                    </div>

                </div>


            </div>

            <div id="er_details_activity" style="margin-top: 24px;"></div>

        `);

    render_activity_timeline("er_details_activity", "details");

}


/* =====================================================
   حفظ تفاصيل الزيارة
===================================================== */

