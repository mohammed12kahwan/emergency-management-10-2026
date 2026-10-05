'use strict';

/* =====================================================
   ER VISIT CONSOLE
   Emergency Department Visit Console
===================================================== */

let current_encounter = null;
let er_wrapper = null;


/* =====================================================
   حساب العمر
===================================================== */

function calculate_age(dob) {

    if (!dob) {

        return "---";

    }

    try {

        const birth_date =
            new Date(dob);

        const today =
            new Date();

        if (
            isNaN(
                birth_date.getTime()
            )
        ) {

            return "---";

        }

        let age =
            today.getFullYear() -
            birth_date.getFullYear();

        const month_difference =
            today.getMonth() -
            birth_date.getMonth();

        if (
            month_difference < 0
            ||
            (
                month_difference === 0
                &&
                today.getDate() <
                birth_date.getDate()
            )
        ) {

            age--;

        }

        return age >= 0
            ? age + " سنة"
            : "---";

    }

    catch (error) {

        console.error(
            "AGE CALCULATION ERROR:",
            error
        );

        return "---";

    }

}


/* =====================================================
   تنسيق تبويبات الزيارة ثلاثية الأبعاد
===================================================== */

function ensure_er_visit_tab_styles() {

    if (
        document.getElementById(
            "er-visit-3d-tab-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "er-visit-3d-tab-styles";


    style.textContent = `

        /* =================================================
           شريط التبويبات
        ================================================= */

        .er-visit-console .er-tabs {

            display: grid !important;

            grid-template-columns:
                repeat(
                    auto-fit,
                    minmax(
                        145px,
                        1fr
                    )
                );

            gap: 12px;

            width: 100%;

            margin:
                18px 0 22px 0;

            padding:
                8px;

            box-sizing: border-box;

            direction: rtl;

        }


        /* =================================================
           أزرار التبويبات
        ================================================= */

        .er-visit-console .er-tabs .er-tab {

            position: relative;

            min-height: 58px;

            padding:
                13px 16px;

            border:
                1px solid
                rgba(0,0,0,.12);

            border-radius:
                14px;

            background:
                linear-gradient(
                    145deg,
                    #b4c6e6 0%,
                    #5cdfe9 100%
                );

            color:
                #243447;

            font-size:
                15px;

            font-weight:
                800;

            line-height:
                1.3;

            text-align:
                center;

            cursor:
                pointer;

            box-shadow:
                0 5px 0
                rgba(40, 52, 68, .16),
                0 9px 18px
                rgba(40, 52, 68, .13);

            transform:
                translateY(0);

            transition:
                transform .14s ease,
                box-shadow .14s ease,
                filter .14s ease;

            overflow:
                hidden;

            z-index:
                1;

        }


        .er-visit-console .er-tabs .er-tab::before {

            content: "";

            position: absolute;

            inset:
                0;

            background:
                linear-gradient(
                    180deg,
                    rgba(255,255,255,.38),
                    rgba(255,255,255,0)
                );

            pointer-events:
                none;

        }


        .er-visit-console .er-tabs .er-tab:hover {

            transform:
                translateY(-2px);

            filter:
                brightness(1.02);

            box-shadow:
                0 7px 0
                rgba(40, 52, 68, .16),
                0 13px 24px
                rgba(40, 52, 68, .17);

        }


        .er-visit-console .er-tabs .er-tab:active {

            transform:
                translateY(3px);

            box-shadow:
                0 2px 0
                rgba(40, 52, 68, .16),
                0 5px 12px
                rgba(40, 52, 68, .12);

        }


        /* =================================================
           ألوان التبويبات
        ================================================= */

        .er-visit-console .er-tabs .er-tab.details {

            border-color:
                #2f6f9f;

            background:
                linear-gradient(
                    145deg,
                    #4eabe6,
                    #b7ddf5
                );

        }


        .er-visit-console .er-tabs .er-tab.clinical {

            border-color:
                #2e8b57;

            background:
                linear-gradient(
                    145deg,
                    #e4f8eb,
                    #bee9cd
                );

        }


        .er-visit-console .er-tabs .er-tab.labs {

            border-color:
                #9a6a00;

            background:
                linear-gradient(
                    145deg,
                    #fff7d6,
                    #ffe9a5
                );

        }


        .er-visit-console .er-tabs .er-tab.radiology {

            border-color:
                #5b54a4;

            background:
                linear-gradient(
                    145deg,
                    #efedff,
                    #d8d4ff
                );

        }


        .er-visit-console .er-tabs .er-tab.medications {

            border-color:
                #9b3f3f;

            background:
                linear-gradient(
                    145deg,
                    #ffe7e7,
                    #f7c7c7
                );

        }


        .er-visit-console .er-tabs .er-tab.procedures {

            border-color:
                #7b4e2d;

            background:
                linear-gradient(
                    145deg,
                    #f8eadf,
                    #ecd0ba
                );

        }


        .er-visit-console .er-tabs .er-tab.services {

            border-color:
                #007f8c;

            background:
                linear-gradient(
                    145deg,
                    #ddfbff,
                    #b7e9ee
                );

        }


        /* =================================================
           التبويب النشط
        ================================================= */

        .er-visit-console .er-tabs .er-tab.active {

            color:
                #ffffff;

            transform:
                translateY(-2px);

            box-shadow:
                0 7px 0
                rgba(0,0,0,.20),
                0 14px 28px
                rgba(0,0,0,.20);

        }


        .er-visit-console .er-tabs .er-tab.details.active {

            background:
                linear-gradient(
                    145deg,
                    #3d8ec5,
                    #24648f
                );

        }


        .er-visit-console .er-tabs .er-tab.clinical.active {

            background:
                linear-gradient(
                    145deg,
                    #3ca86a,
                    #247345
                );

        }


        .er-visit-console .er-tabs .er-tab.labs.active {

            background:
                linear-gradient(
                    145deg,
                    #d59b10,
                    #9a6b00
                );

        }


        .er-visit-console .er-tabs .er-tab.radiology.active {

            background:
                linear-gradient(
                    145deg,
                    #756ed0,
                    #4f4a93
                );

        }


        .er-visit-console .er-tabs .er-tab.medications.active {

            background:
                linear-gradient(
                    145deg,
                    #c95b5b,
                    #953c3c
                );

        }


        .er-visit-console .er-tabs .er-tab.procedures.active {

            background:
                linear-gradient(
                    145deg,
                    #a56b43,
                    #754728
                );

        }


        .er-visit-console .er-tabs .er-tab.services.active {

            background:
                linear-gradient(
                    145deg,
                    #10a8b7,
                    #007580
                );

        }


        /* =================================================
           شاشات أصغر
        ================================================= */

        @media (max-width: 900px) {

            .er-visit-console .er-tabs {

                grid-template-columns:
                    repeat(
                        2,
                        minmax(
                            0,
                            1fr
                        )
                    );

            }

        }


        @media (max-width: 560px) {

            .er-visit-console .er-tabs {

                grid-template-columns:
                    1fr;

            }


            .er-visit-console .er-tabs .er-tab {

                min-height:
                    52px;

            }


        }

    `;


    document.head.appendChild(
        style
    );

}


/* =====================================================
   تحميل الصفحة
===================================================== */

frappe.pages['er_visit_console'].on_page_load =
function(wrapper) {

    er_wrapper =
        wrapper;


    frappe.ui.make_app_page({

        parent:
            wrapper,

        title:
            "🩺 زيارة الطوارئ",

        single_column:
            true

    });


    ensure_er_visit_tab_styles();

    bind_er_events();

};


/* =====================================================
   عند فتح الصفحة
===================================================== */

frappe.pages['er_visit_console'].on_page_show =
function() {

    ensure_er_visit_tab_styles();


    let route =
        frappe.get_route();


    if (
        route.length > 1
        &&
        route[1]
    ) {

        current_encounter =
            route[1];


        load_encounter_details(
            current_encounter
        );

    }

    else {

        current_encounter =
            null;


        load_encounter_list();

    }

};


/* =====================================================
   قائمة زيارات الطوارئ
===================================================== */

function load_encounter_list() {

    $(er_wrapper)
        .find(
            ".layout-main-section"
        )
        .html(`

            <div class="er-list-page">

                <div
                    class="er-page-title-banner er-list-header"
                >

                    <div class="patient-main">

                        <div
                            class="patient-icon er-header-icon"
                        >
                            🩺
                        </div>

                        <div
                            class="patient-header-info"
                        >

                            <h2>
                                مركز إدارة زيارات الطوارئ
                            </h2>

                            <div class="patient-age">
                                قائمة المرضى الحاليين
                            </div>

                        </div>

                    </div>

                </div>


                <div
                    class="er-card er-search-card"
                >

                    <div class="er-field">

                        <label>
                            البحث
                        </label>

                        <input
                            id="er-search"
                            class="form-control"
                            placeholder="🔍 البحث باسم المريض أو رقم الزيارة"
                        >

                    </div>

                </div>


                <div
                    id="encounter-table"
                    style="margin-top:16px;"
                >

                    جاري التحميل...
                    </div>


                    <!-- الشكوى الرئيسية -->

                    <div
                        class="er-header-complaint"
                        id="header-chief-complaint"
                        style="
                            display: none;
                            align-items: center;
                            gap: 6px;
                            padding: 4px 10px;
                            background: rgba(255,255,255,.15);
                            border-radius: 6px;
                            color: white;
                            font-size: 12px;
                            max-width: 280px;
                        "
                    >

                        <span>📝</span>

                        <span
                            id="header-complaint-text"
                            style="
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            "
                        ></span>

                    </div>


                </div>

        `);


    frappe.call({

    method:
        "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_active_encounters",

    callback:
        function(r) {

            const rows =
                r.message || [];

            let html = "";

            if (rows.length) {

                html = `

                    <table
                        class="table table-bordered er-encounter-table"
                    >

                        <thead>

                            <tr>

                                <th>#</th>

                                <th>
                                    زيارة الطوارئ
                                </th>

                                <th>
                                    زيارة الطبيب
                                </th>

                                <th>
                                    المريض
                                </th>

                                <th>
                                    الطبيب
                                </th>

                                <th>
                                    التاريخ
                                </th>

                                <th>
                                    الحالة
                                </th>

                                <th>
                                    الإجراء
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                `;


                rows.forEach(
                    function(row, index) {

                        const pending =
                            Number(
                                row.is_doctor_pending || 0
                            ) === 1;

                        const intake =
                            row.er_patient_intake || "";

                        const patient =
                            row.patient_name ||
                            row.patient ||
                            "---";

                        const doctor =
                            row.practitioner_name ||
                            row.practitioner ||
                            "---";


                        if (pending) {

                            html += `

                                <tr
                                    class="er-doctor-pending-row"
                                    data-intake="${escape_html(
                                        intake
                                    )}"
                                >

                                    <td>
                                        ${index + 1}
                                    </td>

                                    <td>
                                        ${escape_html(
                                            intake || "---"
                                        )}
                                    </td>

                                    <td>
                                        ---
                                    </td>

                                    <td>
                                        <strong>
                                            ${escape_html(
                                                patient
                                            )}
                                        </strong>
                                    </td>

                                    <td>
                                        ${escape_html(
                                            doctor
                                        )}
                                    </td>

                                    <td>
                                        ${escape_html(
                                            row.encounter_date ||
                                            "---"
                                        )}
                                    </td>

                                    <td>

                                        <span class="er-badge">
                                            ${escape_html(
                                                row.status ||
                                                "بانتظار الطبيب"
                                            )}
                                        </span>

                                    </td>

                                    <td>

                                        <button
                                            type="button"
                                            class="btn btn-sm btn-primary er-doctor-visit-btn"
                                            data-intake="${escape_html(
                                                intake
                                            )}"
                                        >
                                            زيارة طبيب
                                        </button>

                                    </td>

                                </tr>

                            `;

                            return;
                        }


                        html += `

                            <tr
                                class="open-er-encounter"
                                data-name="${escape_html(
                                    row.name || ""
                                )}"
                                style="cursor:pointer;"
                            >

                                <td>
                                    ${index + 1}
                                </td>

                                <td>
                                    ${escape_html(
                                        intake || "---"
                                    )}
                                </td>

                                <td>
                                    ${escape_html(
                                        row.name || "---"
                                    )}
                                </td>

                                <td>
                                    ${escape_html(
                                        patient
                                    )}
                                </td>

                                <td>
                                    ${escape_html(
                                        doctor
                                    )}
                                </td>

                                <td>
                                    ${escape_html(
                                        row.encounter_date ||
                                        "---"
                                    )}
                                </td>

                                <td>

                                    <span class="er-badge">
                                        ${escape_html(
                                            row.status ||
                                            "---"
                                        )}
                                    </span>

                                </td>

                                <td>

                                    <button
                                        type="button"
                                        class="btn btn-sm btn-light"
                                        disabled
                                    >
                                        فتح الصف
                                    </button>

                                </td>

                            </tr>

                        `;

                    }
                );


                html += `

                        </tbody>

                    </table>

                `;

            }

            else {

                html = `

                    <div class="alert alert-info">

                        لا توجد زيارات حالياً

                    </div>

                `;

            }


            $("#encounter-table").html(
                html
            );


            /*
             * ========================================================
             * زيارة طبيب
             * ========================================================
             */

            $(document)
                .off(
                    "click.erDoctorVisit",
                    ".er-doctor-visit-btn"
                )
                .on(
                    "click.erDoctorVisit",
                    ".er-doctor-visit-btn",
                    function(e) {

                        e.preventDefault();
                        e.stopPropagation();

                        const button =
                            $(this);

                        const intake =
                            button.attr(
                                "data-intake"
                            );

                        if (!intake) {

                            frappe.msgprint({
                                title:
                                    "زيارة طبيب",
                                message:
                                    "رقم زيارة الطوارئ غير موجود.",
                                indicator:
                                    "red"
                            });

                            return;
                        }


                        button
                            .prop(
                                "disabled",
                                true
                            )
                            .text(
                                "جاري إنشاء زيارة الطبيب..."
                            );


                        frappe.call({

                            method:
                                "custom_app.emergency_management.doctype.er_patient_intake.er_patient_intake.create_doctor_visit",

                            args: {

                                intake_name:
                                    intake

                            },

                            freeze:
                                true,

                            freeze_message:
                                "جاري إنشاء زيارة الطبيب...",

                            callback:
                                function(res) {

                                    const encounter =
                                        res.message;


                                    if (!encounter) {

                                        frappe.msgprint({
                                            title:
                                                "زيارة طبيب",
                                            message:
                                                "تعذر إنشاء Patient Encounter.",
                                            indicator:
                                                "red"
                                        });

                                        button
                                            .prop(
                                                "disabled",
                                                false
                                            )
                                            .text(
                                                "زيارة طبيب"
                                            );

                                        return;
                                    }


                                    frappe.show_alert({
                                        message:
                                            "تم إنشاء زيارة الطبيب",
                                        indicator:
                                            "green"
                                    });


                                    frappe.set_route(
                                        "er_visit_console",
                                        encounter
                                    );

                                },

                            error:
                                function() {

                                    button
                                        .prop(
                                            "disabled",
                                            false
                                        )
                                        .text(
                                            "زيارة طبيب"
                                        );

                                    frappe.msgprint({
                                        title:
                                            "زيارة طبيب",
                                        message:
                                            "حدث خطأ أثناء إنشاء زيارة الطبيب.",
                                        indicator:
                                            "red"
                                    });

                                }

                        });

                    }
                );

        }

});

}


/* =====================================================
   أحداث القائمة
===================================================== */

function bind_er_events() {

    $(document).off(
        "click.erVisitConsoleOpen",
        ".open-er-encounter"
    );


    $(document).on(
        "click.erVisitConsoleOpen",
        ".open-er-encounter",
        function() {

            let name =
                $(this).attr(
                    "data-name"
                );


            if (name) {

                frappe.set_route(
                    "er_visit_console",
                    name
                );

            }

        }
    );


    $(document).off(
        "click.erVisitConsoleSaveAll",
        "#er-save-all"
    );


    $(document).on(
        "click.erVisitConsoleSaveAll",
        "#er-save-all",
        function() {

            save_all_er_visit_requests();

        }
    );


    $(document).off(
        "click.erVisitConsoleRefresh",
        "#er-refresh"
    );


    $(document).on(
        "click.erVisitConsoleRefresh",
        "#er-refresh",
        function() {

            refresh_er_visit();

        }
    );


    $(document).off(
        "click.erVisitConsoleBedBoard",
        "#er-bed-board"
    );


    $(document).on(
        "click.erVisitConsoleBedBoard",
        "#er-bed-board",
        function() {

            frappe.set_route(
                "er_bed_dashboard"
            );

        }
    );


    


}


/* =====================================================
   تفاصيل الزيارة
===================================================== */


/* ============================================================
   إظهار الرأس الأصلي بعد اكتمال تحميل clinical.js
   لا ينشئ بطاقة جديدة؛ يستدعي التصميم الأصلي فقط.
============================================================ */

function load_encounter_details(
    encounter
) {

    if (!encounter) {

        return;

    }


    current_encounter =
        encounter;

    window.current_encounter =
        encounter;


    ensure_er_visit_tab_styles();


    $(er_wrapper)
        .find(
            ".layout-main-section"
        )
        .html(`

                <div
                    class="er-visit-console"
                >


                    <!-- =================================
                         رأس المريض المضغوط
                    ================================= -->

                    <!-- =================================
                         الرأس العام لبيانات المريض & الزيارة
                    ================================= -->

                    <div
                        id="er-global-patient-header"
                        class="er-global-patient-header-anchor"
                    ></div>



                    <!-- =================================
                         التبويبات
                    ================================= -->

                    <div
                        class="er-tabs"
                >


                    <button
                        type="button"
                        class="er-tab details active"
                        onclick="open_er_section('details')"
                    >
                        🏥 تفاصيل
                    </button>


                    <button
                        type="button"
                        class="er-tab clinical"
                        onclick="open_er_section('clinical')"
                    >
                        🩺 التمريض
                    </button>


                    <button
                        type="button"
                        class="er-tab doctor"
                        onclick="open_er_section('doctor')"
                    >
                        🩺 الطبيب
                    </button>


                    <button
                        type="button"
                        class="er-tab labs"
                        onclick="open_er_section('labs')"
                    >
                        🧪 مختبر
                    </button>


                    <button
                        type="button"
                        class="er-tab radiology"
                        onclick="open_er_section('radiology')"
                    >
                        🩻 أشعة
                    </button>


                    <button
                        type="button"
                        class="er-tab medications"
                        onclick="open_er_section('medications')"
                    >
                        💊 أدوية
                    </button>


                    <button
                        type="button"
                        class="er-tab procedures"
                        onclick="open_er_section('procedures')"
                    >
                        ⚕️ إجراءات
                    </button>


                </div>


                <!-- =================================
                     محتوى التبويب
                ================================= -->

                <div
                    id="er-content"
                ></div>


                <!-- =================================
                     شريط الإجراءات السفلي الثابت
                ================================= -->

                <div
                    class="er-action-bar er-action-bar-fixed"
                >

                    <div
                        class="er-action-bar-left"
                    >

                        <button
                            type="button"
                            id="er-notification-button"
                            class="er-action-btn er-notif-btn"
                            title="الإشعارات"
                        >
                            <span>🔔</span>

                            <span
                                id="er-notification-badge"
                                class="er-notification-badge"
                            ></span>
                        </button>


                        <button
                            type="button"
                            id="er-department-message-button"
                            class="er-action-btn er-notif-btn"
                            title="مراسلات الأقسام"
                            aria-label="مراسلات الأقسام"
                        >
                            <span>💬</span>

                            <span
                                id="er-department-message-badge"
                                class="er-notification-badge"
                                style="display:none;"
                            ></span>
                        </button>


                        <button
                            type="button"
                            id="er-bed-board"
                            class="er-action-btn"
                            title="لوحة الأسرة"
                        >
                            🛏 لوحة الأسرة
                        </button>


                        <button
                            type="button"
                            id="er-medical-history"
                            class="er-action-btn"
                            title="السجل الطبي"
                        >
                            📋 السجل الطبي
                        </button>

                        <button
                            type="button"
                            id="er-triage"
                            class="er-action-btn"
                            title="الترياج"
                            aria-label="الترياج"
                        >
                            🩺 الترياج
                        </button>

                    </div>


                    <div
                        class="er-action-bar-right"
                    >

                        <button
                            type="button"
                            id="er-refresh"
                            class="er-action-btn er-refresh-btn"
                            title="تحديث بيانات الزيارة"
                            aria-label="تحديث بيانات الزيارة"
                        >
                            🔄 تحديث
                        </button>


                        <button
                            type="button"
                            id="er-save-all"
                            class="er-action-btn er-save-btn"
                            title="حفظ كل البيانات الجديدة في الزيارة"
                            aria-label="حفظ كل البيانات الجديدة في الزيارة"
                        >
                            💾 حفظ
                        </button>

                     </div>


                      <!-- =================================
                           لوحة الإشعارات
                      ================================= -->

                      <div
                          id="er-notification-panel"
                          class="er-notification-panel"
                      >

                          <div
                              class="er-notification-panel-header"
                          >

                              <span>
                                  🔔 الإشعارات
                              </span>

                              <button
                                  type="button"
                                  id="er-notification-close"
                                  class="er-notification-close"
                              >
                                  ✕
                              </button>

                          </div>


                          <div
                              id="er-notification-list"
                              class="er-notification-list"
                          ></div>

                      </div>

                  </div>


            </div>

        `);


    init_er_notifications();
    init_er_department_messages();


    /* =============================================
       تحميل بيانات الزيارة
    ============================================= */

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_encounter_details",

        args: {

            encounter:
                encounter

        },

        callback:
            function(r) {

                if (!r.message) {

                    frappe.msgprint(
                        "تعذر تحميل بيانات الزيارة"
                    );

                    return;

                }


                let data =
                    r.message;


                /* =====================================
                   بيانات المريض & الزيارة — ت.compact header
                ===================================== */

                let patient =
                    data.patient
                    ||
                    {};


                let patient_name =
                    patient.patient_name
                    ||
                    patient.name
                    ||
                    "---";


                let age =
                    calculate_age(
                        patient.dob
                    );


                $("#patient_name")
                    .text(
                        patient_name
                    );


                $("#patient_age")
                    .text(
                        age
                    );


                /* =====================================
                   الطبيب
                ===================================== */

                let doctor_name =
                    get_display_value(
                        data.practitioner_name
                    );


                if (
                    doctor_name ===
                    "---"
                ) {

                    doctor_name =
                        get_display_value(
                            data.practitioner
                        );

                }


                $("#doctor")
                    .text(
                        doctor_name
                    );


                /* =====================================
                   بيانات الزيارة
                ===================================== */

                $("#encounter_id")
                    .text(
                        data.name
                        ||
                        encounter
                        ||
                        "---"
                    );


                $("#visit_date")
                    .text(
                        data.encounter_date
                        ||
                        data.posting_date
                        ||
                        "---"
                    );


                /* =====================================
                   بيانات الطوارئ — مخزن للتفاصيل
                ===================================== */

                let er =
                    data.er
                    ||
                    {};


                /* =====================================
                   شكاوى رئيسية — الترويسة الم.compact
                ===================================== */

                const complaintText =
                    er.chief_complaint
                    ||
                    data.chief_complaint
                    ||
                    "";


                const $headerComplaint =
                    $("#header-chief-complaint");

                const $headerComplaintText =
                    $("#header-complaint-text");


                if (
                    complaintText
                    &&
                    $headerComplaint.length
                ) {

                    $headerComplaintText.text(
                        complaintText
                    );

                    $headerComplaint.show();

                } else if ($headerComplaint.length) {

                    $headerComplaint.hide();

                }


                /* =====================================
                   لون الأولوية ESI
                ===================================== */

                apply_esi_color(
                    er.priority
                );


                /* =====================================
                   معلومات السرير
                ===================================== */

                const bed_info =
                    er.assigned_bed
                    ||
                    er.waiting_area
                    ||
                    er.current_location
                    ||
                    "";

                const $bedInfo =
                    $("#header-bed-info");

                const $bedText =
                    $("#header-bed-text");

                if (
                    bed_info &&
                    $bedInfo.length
                ) {

                    $bedText.text(
                        bed_info
                    );

                    $bedInfo.show();

                }

                else if ($bedInfo.length) {

                    $bedInfo.hide();

                }


                /* =====================================
                   حفظ البيانات الحالية
                ===================================== */

                window.er_current_data =
                    data;

                /* =====================================
                   الرأس الأصلي:
                   بيانات المريض + الترياج + آخر Vital Signs
                   انتظار تحميل clinical.js فقط
                ===================================== */
                (function render_original_er_header() {

                    let tries = 0;

                    const timer = setInterval(function () {

                        tries++;

                        if (
                            typeof window.er_clinical_render_global_patient_header ===
                            "function"
                        ) {

                            clearInterval(timer);

                            window.er_clinical_render_global_patient_header();

                            console.log(
                                "ER ORIGINAL TRIAGE HEADER: rendered"
                            );

                            return;
                        }

                        if (tries >= 50) {

                            clearInterval(timer);

                            console.error(
                                "ER ORIGINAL TRIAGE HEADER: function unavailable"
                            );
                        }

                    }, 100);

                })();


                /* =====================================
                   تحميل التفاصيل
                ===================================== */

                load_details_section();

            }

    });

}


/* =====================================================
   تحويل قيمة Link أو Object إلى نص
===================================================== */

function get_display_value(
    value
) {

    if (!value) {

        return "---";

    }


    if (
        typeof value ===
        "object"
    ) {

        return (
            value.name
            ||
            value.label
            ||
            value.patient_name
            ||
            "---"
        );

    }


    return String(
        value
    );

}


/* =====================================================
   لون الأولوية ESI
===================================================== */

function apply_esi_color(
    priority
) {

    if (!priority) {

        return;

    }


    $(".er-visit-console")
        .removeClass(
            [
                "er-esi-1",
                "er-esi-2",
                "er-esi-3",
                "er-esi-4",
                "er-esi-5"
            ].join(" ")
        );


    let value =
        String(
            priority
        )
            .toLowerCase()
            .replace(
                "esi",
                ""
            )
            .trim();


    if (
        [
            "1",
            "2",
            "3",
            "4",
            "5"
        ].includes(
            value
        )
    ) {

        $(".er-visit-console")
            .addClass(
                "er-esi-" +
                value
            );

    }

}


/* =====================================================
   تحويل النص إلى HTML آمن
===================================================== */

function escape_html(
    value
) {

    if (
        value === null
        ||
        value === undefined
    ) {

        return "";

    }


    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   البحث داخل قائمة الزيارات
===================================================== */

$(document).off(
    "keyup.erVisitSearch",
    "#er-search"
);


$(document).on(
    "keyup.erVisitSearch",
    "#er-search",
    function() {

        let value =
            $(this)
                .val()
                .toLowerCase();


        $("#encounter-table tbody tr")
            .filter(
                function() {

                    $(this).toggle(

                        $(this)
                            .text()
                            .toLowerCase()
                            .indexOf(
                                value
                            ) > -1

                    );

                }
            );

    }
);


/* =====================================================
   العودة لقائمة الزيارات
===================================================== */

/* =====================================================
   تحديث رأس الزيارة
===================================================== */

function refresh_encounter_header() {

    if (!current_encounter) {

        return;

    }


    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_encounter_details",

        args: {

            encounter:
                current_encounter

        },

        callback:
            function(r) {

                if (!r.message) {

                    return;

                }


                let data =
                    r.message;


                let patient =
                    data.patient
                    ||
                    {};


                $("#patient_name")
                    .text(
                        patient.patient_name
                        ||
                        patient.name
                        ||
                        "---"
                    );


                $("#patient_age")
                    .text(
                        calculate_age(
                            patient.dob
                        )
                    );


                /* =====================================
                   الطبيب
                ===================================== */

                let doctor_name =
                    get_display_value(
                        data.practitioner_name
                        ||
                        data.practitioner
                    );


                $("#doctor")
                    .text(
                        doctor_name
                    );


                $("#encounter_id")
                    .text(
                        data.name
                        ||
                        current_encounter
                        ||
                        "---"
                    );


                $("#visit_date")
                    .text(
                        data.encounter_date
                        ||
                        data.posting_date
                        ||
                        "---"
                    );


                let er =
                    data.er
                    ||
                    {};


                apply_esi_color(
                    er.priority
                );

            }

    });

}


/* =====================================================
   فحص وجود أدوية جديدة
===================================================== */

function has_new_er_medication_requests() {

    return (
        typeof er_medication_entry_rows !==
        "undefined"
        &&
        Array.isArray(
            er_medication_entry_rows
        )
        &&
        er_medication_entry_rows.some(
            function(row) {

                return (
                    row
                    &&
                    String(
                        row.drug ||
                        ""
                    ).trim()
                );

            }
        )
    );

}


/* =====================================================
   فحص وجود خدمات جديدة
===================================================== */

function has_new_er_service_requests() {

    return (
        typeof er_service_rows !==
        "undefined"
        &&
        Array.isArray(
            er_service_rows
        )
        &&
        er_service_rows.some(
            function(row) {

                return (
                    row
                    &&
                    String(
                        row.request_type ||
                        ""
                    ).trim()
                );

            }
        )
    );

}


/* =====================================================
   فحص وجود مختبر جديد
===================================================== */

function has_new_er_lab_requests() {

    return (
        typeof er_lab_entry_rows !==
        "undefined"
        &&
        Array.isArray(
            er_lab_entry_rows
        )
        &&
        er_lab_entry_rows.some(
            function(row) {

                return (
                    row
                    &&
                    (
                        String(
                            row.item_code ||
                            ""
                        ).trim()
                        ||
                        String(
                            row.test_name ||
                            ""
                        ).trim()
                    )
                );

            }
        )
    );

}


/* =====================================================
   فحص وجود أشعة جديدة
===================================================== */

function has_new_er_radiology_requests() {

    return (
        typeof er_radiology_entry_rows !==
        "undefined"
        &&
        Array.isArray(
            er_radiology_entry_rows
        )
        &&
        er_radiology_entry_rows.some(
            function(row) {

                return (
                    row
                    &&
                    String(
                        row.examination_type ||
                        ""
                    ).trim()
                );

            }
        )
    );

}


/* =====================================================
   فحص وجود إجراءات جديدة
===================================================== */

function has_new_er_procedure_requests() {

    return (
        typeof er_procedure_entry_rows !==
        "undefined"
        &&
        Array.isArray(
            er_procedure_entry_rows
        )
        &&
        er_procedure_entry_rows.some(
            function(row) {

                return (
                    row &&
                    String(
                        row.procedure_template || ""
                    ).trim()
                );

            }
        )
    );

}


/* =====================================================
   فحص وجود بيانات سريرية جديدة
===================================================== */





/* =====================================================
   حفظ نافذة الأدوية
===================================================== */

function save_er_medications_from_all(
    callback
) {

    if (
        typeof save_er_medication_requests !==
        "function"
    ) {

        callback(true);

        return;

    }


    if (
        !has_new_er_medication_requests()
    ) {

        callback(true);

        return;

    }


    save_er_medication_requests(
        function(success) {

            callback(
                success !== false
            );

        }
    );

}


/* =====================================================
   حفظ نافذة الخدمات
===================================================== */

function save_er_services_from_all(
    callback
) {

    if (
        typeof save_er_service_requests !==
        "function"
    ) {

        callback(true);

        return;

    }


    if (
        !has_new_er_service_requests()
    ) {

        callback(true);

        return;

    }


    save_er_service_requests(
        function(success) {

            callback(
                success !== false
            );

        }
    );

}


/* =====================================================
   حفظ نافذة الفحص السريري
===================================================== */





/* =====================================================
   حفظ المختبر
===================================================== */

function save_er_labs_from_all(
    callback
) {

    if (
        typeof save_er_lab_requests !==
        "function"
    ) {

        console.warn(
            "save_er_lab_requests() is not available."
        );

        callback(true);

        return;

    }


    if (
        !has_new_er_lab_requests()
    ) {

        callback(true);

        return;

    }


    try {

        save_er_lab_requests(
            function(success) {

                callback(
                    success !== false
                );

            }
        );

    }

    catch (error) {

        console.error(
            "ER LAB SAVE ALL ERROR:",
            error
        );


        callback(false);

    }

}


/* =====================================================
   حفظ الأشعة
===================================================== */

function save_er_radiology_from_all(
    callback
) {

    /*
     * إذا كانت شاشة الأشعة تحتوي على
     * save_er_radiology_requests()
     * نستخدمها.
     *
     * وإلا نستخدم الدالة القديمة
     * submit_radiology_entries()
     * مع انتظار اكتمال الطلب.
     */

    if (
        typeof save_er_radiology_requests ===
        "function"
    ) {

        if (
            !has_new_er_radiology_requests()
        ) {

            callback(true);

            return;

        }


        try {

            save_er_radiology_requests(
                function(success) {

                    callback(
                        success !== false
                    );

                }
            );

        }

        catch (error) {

            console.error(
                "ER RADIOLOGY SAVE ALL ERROR:",
                error
            );


            callback(false);

        }


        return;

    }


    if (
        typeof submit_radiology_entries !==
        "function"
    ) {

        callback(true);

        return;

    }


    if (
        !has_new_er_radiology_requests()
    ) {

        callback(true);

        return;

    }


    try {

        submit_radiology_entries();


        setTimeout(
            function() {

                callback(true);

            },
            1000
        );

    }

    catch (error) {

        console.error(
            "ER RADIOLOGY SAVE ALL ERROR:",
            error
        );


        callback(false);

    }

}


/* =====================================================
   حفظ الإجراءات
===================================================== */

function save_er_procedures_from_all(
    callback
) {

    if (
        typeof submit_procedure_entries !==
        "function"
    ) {

        callback(true);

        return;

    }


    if (
        !er_procedure_entry_rows ||
        !er_procedure_entry_rows.some(
            function(row) {

                return row &&
                    row.procedure_template;

            }
        )
    ) {

        callback(true);

        return;

    }


    try {

        submit_procedure_entries();


        setTimeout(
            function() {

                callback(true);

            },
            1000
        );

    }

    catch (error) {

        console.error(
            "ER PROCEDURES SAVE ALL ERROR:",
            error
        );


        callback(false);

    }

}


/* =====================================================
   حساب هل يوجد قسم جديد فعليًا
===================================================== */

function get_er_save_state() {

    return {

        medications:
            has_new_er_medication_requests(),

        services:
            has_new_er_service_requests(),

        labs:
            has_new_er_lab_requests(),

        radiology:
            has_new_er_radiology_requests(),

        procedures:
            has_new_er_procedure_requests(),

    };

}


/* =====================================================
   حفظ كل بيانات الزيارة
===================================================== */

function save_all_er_visit_requests() {

    if (!current_encounter) {

        frappe.msgprint({

            title:
                "زيارة الطوارئ",

            message:
                "لا توجد زيارة طوارئ محددة.",

            indicator:
                "orange"

        });

        return;

    }


    const button =
        $("#er-save-all")
            .add(
                $("[data-doctor-save]").first()
            );


    if (
        !button.length
    ) {

        return;

    }


    button
        .prop(
            "disabled",
            true
        )
        .text(
            "⏳ جاري حفظ الكل..."
        );


    const saveSteps = [

        {
            name:
                "الطبيب",

            fn:
                function(done) {

                    if (
                        typeof window.save_er_doctor_assessment ===
                        "function"
                    ) {

                        window.save_er_doctor_assessment(
                            done
                        );

                    } else {

                        done(true);

                    }

                }
        },

        {
            name:
                "الأدوية",

            fn:
                save_er_medications_from_all
        },

        {
            name:
                "الخدمات",

            fn:
                save_er_services_from_all
        },

        {
            name:
                "المختبر",

            fn:
                save_er_labs_from_all
        },

        {
            name:
                "الأشعة",

            fn:
                save_er_radiology_from_all
        },

        {
            name:
                "الإجراءات",

            fn:
                save_er_procedures_from_all
        },];


    let index =
        0;


    let savedCount =
        0;


    let failedSections =
        [];


    function next() {

        if (
            index >=
            saveSteps.length
        ) {

            button
                .prop(
                    "disabled",
                    false
                )
                .text(
                    "💾 حفظ"
                );


            refresh_encounter_header();


            if (
                !savedCount
                &&
                !failedSections.length
            ) {

                frappe.show_alert({

                    message:
                        "لا توجد بيانات جديدة للحفظ.",

                    indicator:
                        "blue"

                });


                return;

            }


            if (
                failedSections.length
            ) {

                frappe.msgprint({

                    title:
                        "الحفظ",

                    message:
                        "تم الحفظ، لكن تعذر حفظ: "
                        +
                        failedSections.join(
                            "، "
                        ),

                    indicator:
                        "orange"

                });


                return;

            }


            frappe.show_alert({

                message:
                    "✅ تم حفظ البيانات الجديدة بنجاح.",

                indicator:
                    "green"

            });


            return;

        }


        const step =
            saveSteps[index];


        const beforeState =
            get_er_save_state();


        let beforeHasData =
            false;


        switch (
            step.name
        ) {

            case "الأدوية":

                beforeHasData =
                    beforeState.medications;

                break;


            case "الخدمات":

                beforeHasData =
                    beforeState.services;

                break;


            case "المختبر":

                beforeHasData =
                    beforeState.labs;

                break;


            case "الأشعة":

                beforeHasData =
                    beforeState.radiology;

                break;


            case "الإجراءات":

                beforeHasData =
                    beforeState.procedures;

                break;


            case "الفحص السريري":

                beforeHasData =
                    beforeState.clinical;

                break;

        }


        step.fn(

            function(success) {

                if (
                    success === false
                ) {

                    if (
                        beforeHasData
                    ) {

                        failedSections.push(
                            step.name
                        );

                    }

                }

                else if (
                    beforeHasData
                ) {

                    savedCount++;

                }


                index++;

                next();

            }

        );

    }


    next();

}


/* =====================================================
   توافق مع الاسم القديم
===================================================== */

/* =====================================================
   تحديث بيانات الزيارة
===================================================== */

function refresh_er_visit() {

    if (!current_encounter) {

        frappe.msgprint(
            "لا توجد زيارة محددة"
        );

        return;

    }


    const encounter =
        current_encounter;


    if (
        typeof load_encounter_details ===
        "function"
    ) {

        load_encounter_details(
            encounter
        );

    }


    frappe.show_alert({

        message:
            "تم تحديث بيانات الزيارة.",

        indicator:
            "blue"

    });

}


/* =====================================================
    تفعيل التبويب الحالي
===================================================== */

function activate_er_tab(
    tab_name
) {

    $(".er-tab")
        .removeClass(
            "active"
        );


    $(".er-tab." + tab_name)
        .addClass(
            "active"
        );

}


/* =====================================================
   تحميل قسم من أقسام الزيارة
===================================================== */

function open_er_section(
    section
) {

    activate_er_tab(
        section
    );


    

    if (
        typeof er_clinical_render_global_patient_header ===
        "function"
    ) {
        er_clinical_render_global_patient_header();
    }

switch (section) {


        case "details":

            if (
                typeof load_details_section ===
                "function"
            ) {

                load_details_section();

            }

            break;


        case "clinical":

            if (
                typeof load_clinical_section ===
                "function"
            ) {

                load_clinical_section();

            }

            break;


        case "labs":

            if (
                typeof load_labs_section ===
                "function"
            ) {

                load_labs_section();

            }

            break;


        case "radiology":

            if (
                typeof load_radiology_section ===
                "function"
            ) {

                load_radiology_section();

            }

            break;


        case "medications":

            if (
                typeof load_medications_section ===
                "function"
            ) {

                load_medications_section();

            }

            break;


        case "procedures":

            if (
                typeof load_procedures_section ===
                "function"
            ) {

                load_procedures_section();

            }

            break;


        case "doctor":

            if (
                typeof window.load_doctor_section ===
                "function"
            ) {

                console.log(
                    "ER DOCTOR TAB -> window.load_doctor_section()"
                );

                window.load_doctor_section();

            } else {

                console.error(
                    "ER DOCTOR: window.load_doctor_section is NOT available"
                );

                frappe.msgprint({
                    title: "نافذة الطبيب | Doctor Window",
                    message: "تعذر تشغيل نافذة الطبيب. دالة التحميل غير متاحة.",
                    indicator: "red"
                });

            }

            break;


        case "services":

            if (
                typeof load_services_section ===
                "function"
            ) {

                load_services_section();

            }

            break;

    }

    setTimeout(function() {
        if (typeof enhance_er_section_collapse === "function") {
            enhance_er_section_collapse(section);
        }
    }, 0);

}


/* =====================================================
   ER VISIT COMPACT HEADER / TAB PRESENTATION
===================================================== */

function ensure_er_visit_compact_styles() {

    if (
        document.getElementById(
            "er-visit-compact-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "er-visit-compact-styles";


    style.textContent = `

        .er-visit-console .er-main-header {

            min-height:
                110px !important;

            padding:
                12px 16px 12px 56px !important;

            gap:
                12px !important;

            margin-bottom:
                10px !important;

            position:
                relative !important;

        }


        .er-visit-console .er-main-header .patient-icon {

            position: absolute;

            top: 8px;

            left: 8px;

            width:
                26px !important;

            height:
                36px !important;

            font-size:
                18px !important;

            min-width:
                36px !important;

            border-radius:
                8px !important;

            background:
                linear-gradient(
                    145deg,
                    #0e68d4,
                    #2563eb
                ) !important;

            border:
                1px solid
                    rgba(255,255,255,.45) !important;

            box-shadow:
                inset 0 1px 2px
                    rgba(255,255,255,.45),
                inset 0 -2px 3px
                    rgba(0,0,0,.14),
                0 2px 4px
                    rgba(0,0,0,.22) !important;

            text-shadow:
                0 1px 2px
                    rgba(0,0,0,.25);

            cursor: default;

        }


        .er-visit-console .er-main-header h2 {

            font-size:
                20px !important;

            margin:
                0 !important;

        }


        .er-visit-console .er-header-info-card {

            padding:
                10px 12px !important;

            min-height:
                50px !important;

        }


        .er-visit-console .complaint-card {

            padding:
                12px 16px !important;

            margin:
                8px 0 10px 0 !important;

        }


        .er-visit-console .complaint-card .er-icon {

            width:
                34px !important;

            height:
                34px !important;

            min-width:
                34px !important;

            font-size:
                17px !important;

            line-height:
                34px !important;

            display:
                inline-flex !important;

            align-items:
                center !important;

            justify-content:
                center !important;

        }


        .er-visit-console .complaint-card .er-card-title {

            margin-bottom:
                8px !important;

            font-size:
                15px !important;

        }


        .er-visit-console .er-complaint-value {

            max-height:
                56px !important;

            overflow:
                auto !important;

        }


        .er-visit-console .er-tabs {

            margin-top:
                8px !important;

            margin-bottom:
                14px !important;

        }


        /* =============================================
           إزالة أزرار الإرسال القديمة
           ============================================= */

        #submit-lab-entries,
        #submit-radiology-entries,
        #submit-medication-entries,
        #submit-er-service-requests,
        #submit-procedure-entries {

            display:
                none !important;

        }


        /* =============================================
           مساحة موحدة لأزرار النوافذ
           ============================================= */

    `;


    document.head.appendChild(
        style
    );

}


ensure_er_visit_compact_styles();


/* =====================================================
   تشغيل شاشة الزيارة
===================================================== */

/* =====================================================
   جاهزية النظام
===================================================== */


/* =====================================================
   REUSABLE ACTIVITY/TIMELINE COMPONENT
   ===================================================== */

/**
 * Renders an Activity/Timeline section at the bottom of any window.
 * Call this at the end of each section loading function.
 * @param {string} container_id - The ID of the timeline container element.
 * @param {string} category - Optional category filter (e.g., "labs", "medications", "triage", "services", "details").
 */
function render_activity_timeline(container_id, category) {
    const container = document.getElementById(container_id);
    if (!container) return;

    const encounter = window.current_encounter;
    if (!encounter) {
        container.innerHTML = '<div class="er-collapsible-section">' +
            '<div class="er-collapsible-header"><span>📋 النشاط</span></div>' +
            '<div class="er-collapsible-content"><p class="text-muted">لا توجد زيارة محددة.</p></div>' +
            '</div>';
        return;
    }

    container.innerHTML = '<p class="text-muted">⏳ جاري تحميل النشاط...</p>';

    frappe.call({
        method: "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_activity_timeline",
        args: { encounter: encounter, category: category || "" },
        callback: function(r) {
            if (r.message && r.message.activities && r.message.activities.length) {
                const section_id = container_id + "-section-" + Date.now();
                let html = '<div class="er-collapsible-section">';
                html += '<div class="er-collapsible-header" onclick="toggle_er_section(\'' + section_id + '\')">';
                html += '<span>📋 النشاط</span>';
                html += '<button type="button" class="er-collapse-toggle" style="background:none;border:none;cursor:pointer;font-size:16px;padding:4px 8px;color:#666;">▲</button>';
                html += '</div>';
                html += '<div id="' + section_id + '" class="er-collapsible-content"><div class="er-timeline">';

                r.message.activities.forEach(function(item) {
                    html += '<div class="er-timeline-item">';
                    html += '<div class="er-timeline-icon">' + (item.icon || "📌") + '</div>';
                    html += '<div class="er-timeline-content">';
                    html += '<div class="er-timeline-header">';
                    html += '<strong>' + (item.title || "") + '</strong>';
                    html += '<span class="er-timeline-time text-muted">' + (item.time || "") + '</span>';
                    html += '</div>';
                    html += '<div class="er-timeline-body">' + (item.content || "") + '</div>';
                    html += '</div></div>';
                });

                html += '</div></div></div>';
                container.innerHTML = html;
            } else {
                container.innerHTML = '<div class="er-collapsible-section">' +
                    '<div class="er-collapsible-header">' +
                    '<span>📋 النشاط</span>' +
                    '</div>' +
                    '<div class="er-collapsible-content">' +
                    '<p class="text-muted">لا يوجد نشاط مسجل.</p>' +
                    '</div></div>';
            }
        }
    });
}





/* ============================================================
   ER DOCTOR WORKSPACE — FINAL NATIVE DOCTYPE BINDING
============================================================ */

(function () {

    "use strict";

    var ROOT_ID = "er-doctor-native-final";
    var STYLE_ID = "er-doctor-native-final-style";

    var state = {
        encounter: null,
        intake: null,
        patient: null,
        note: null,
        controls: {},
        vitals: [],
        original_visit_status: ""
    };

    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function current_encounter_name() {

        try {
            if (
                typeof current_encounter !== "undefined" &&
                current_encounter
            ) {
                return current_encounter;
            }
        } catch (e) {}

        try {
            if (
                window.current_encounter
            ) {
                return window.current_encounter;
            }
        } catch (e) {}

        return null;
    }

    function call(method, args) {

        return new Promise(function (resolve, reject) {

            frappe.call({
                method: method,
                args: args || {},
                callback: function (r) {

                    if (r && r.exc) {
                        reject(r.exc);
                        return;
                    }

                    resolve(
                        r ? r.message : null
                    );
                },
                error: reject
            });

        });
    }

    function get_doc(doctype, name) {
        return call(
            "frappe.client.get",
            {
                doctype: doctype,
                name: name
            }
        );
    }

    function get_list(
        doctype,
        fields,
        filters
    ) {

        return call(
            "frappe.client.get_list",
            {
                doctype: doctype,
                fields: fields,
                filters: filters || [],
                limit_page_length: 100,
                order_by: "modified desc"
            }
        );
    }

    function save_doc(doc) {
        return call(
            "frappe.client.save",
            {
            }
        );
    }

    function load_doctype(doctype) {

        return new Promise(function (resolve, reject) {

            if (
                frappe.model &&
                typeof frappe.model.with_doctype ===
                    "function"
            ) {

                try {

                    frappe.model.with_doctype(
                        doctype,
                        function () {
                            resolve();
                        }
                    );

                    return;

                } catch (e) {
                    reject(e);
                    return;
                }
            }

            resolve();
        });
    }

    function get_meta(doctype) {

        try {
            if (
                typeof frappe.get_meta ===
                    "function"
            ) {
                return frappe.get_meta(
                    doctype
                );
            }
        } catch (e) {}

        try {
            if (
                frappe.meta &&
                typeof frappe.meta.get_meta ===
                    "function"
            ) {
                return frappe.meta.get_meta(
                    doctype
                );
            }
        } catch (e) {}

        return null;
    }

    function get_df(
        doctype,
        fieldname
    ) {

        var meta =
            get_meta(
                doctype
            );

        if (
            meta &&
            meta.fields
        ) {

            for (
                var n = 0;
                n < meta.fields.length;
                n++
            ) {

                if (
                    meta.fields[n].fieldname ===
                    fieldname
                ) {
                    return meta.fields[n];
                }
            }
        }

        try {

            return frappe.meta.get_docfield(
                doctype,
                fieldname
            );

        } catch (e) {}

        return null;
    }

    function make_bound_control(
        root,
        host_name,
        doctype,
        fieldname,
        doc,
        label,
        read_only
    ) {

        var host =
            root.querySelector(
                '[data-doctor-host="' +
                host_name +
                '"]'
            );

        if (!host) {
            return null;
        }

        host.innerHTML = "";

        var source_df =
            get_df(
                doctype,
                fieldname
            );

        if (!source_df) {

            host.innerHTML =
                '<div class="doctor-bind-error">' +
                "DocType field not found: " +
                esc(doctype) +
                "." +
                esc(fieldname) +
                "</div>";

            console.error(
                "ER DOCTOR DOCFIELD NOT FOUND",
                doctype,
                fieldname
            );

            return null;
        }

        var df =
            JSON.parse(
                JSON.stringify(
                    source_df
                )
            );

        if (label) {
            df.label = label;
        }

        df.read_only =
            read_only ? 1 : 0;

        /*
         * assigned_bed في نافذة الطبيب يستخدم نفس Query
         * المركزي للأسرة:
         * - الأسرة المتاحة فقط.
         * - السرير الحالي للمريض يبقى ظاهرًا.
         */
        if (
            doctype === "ER Patient Intake" &&
            fieldname === "assigned_bed"
        ) {
            df.get_query = function () {
                return {
                    query:
                        "custom_app.emergency_management.utils.bed.search_available_beds",

                    filters: {
                        intake:
                            doc && doc.name
                                ? doc.name
                                : "",

                        patient:
                            doc && doc.patient
                                ? doc.patient
                                : ""
                    }
                };
            };
        }

        /*
         * مهم:
         * هذا Control مأخوذ من تعريف الـDocField
         * الحقيقي وليس HTML input مستقل.
         */
        var control =
            frappe.ui.form.make_control({
                parent: host,
                df: df,
                render_input: true
            });

        control.refresh();

        /*
         * تأكيد القيمة من المستند الحقيقي.
         */
        try {
            if (
                doc &&
                Object.prototype.hasOwnProperty.call(
                    doc,
                    fieldname
                )
            ) {

                var bound_value =
                    doc[fieldname];

                /*
                 * Frappe Time Control expects HH:mm:ss.
                 * Some MariaDB/Frappe datetime/time values can
                 * arrive with microseconds, e.g. 23:08:12.662196.
                 * Normalize only the UI value; do not alter the
                 * underlying DocType field.
                 */
                if (
                    source_df.fieldtype === "Time" &&
                    typeof bound_value === "string"
                ) {
                    var normalized_time =
                        bound_value
                            .trim()
                            .split(".")[0];

                    var time_parts =
                        normalized_time.split(":");

                    if (time_parts.length === 2) {
                        time_parts.push("00");
                    }

                    if (time_parts.length === 3) {
                        bound_value =
                            time_parts
                                .map(function (part) {
                                    var n =
                                        parseInt(part, 10);

                                    return isNaN(n)
                                        ? "00"
                                        : String(n).padStart(2, "0");
                                })
                                .join(":");
                    }
                }

                control.set_value(
                    bound_value
                );
            }
        } catch (e) {}

        /*
         * مزامنة مباشرة بين Control والمستند.
         */
        if (
            !read_only &&
            control.$input
        ) {

            control.$input.on(
                "change input",
                function () {

                    try {
                        doc[fieldname] =
                            control.get_value();
                    } catch (e) {}

                }
            );
        }

        state.controls[
            host_name
        ] = control;

        return control;
    }

    function make_note_control(
        root,
        host_name,
        fieldname,
        label
    ) {

        var host =
            root.querySelector(
                '[data-doctor-host="' +
                host_name +
                '"]'
            );

        if (!host) {
            return null;
        }

        host.innerHTML = "";

        var df =
            get_df(
                "ER Clinical Note",
                fieldname
            );

        if (!df) {

            host.innerHTML =
                '<div class="doctor-bind-error">' +
                "DocType field not found: ER Clinical Note." +
                esc(fieldname) +
                "</div>";

            return null;
        }

        var clone =
            JSON.parse(
                JSON.stringify(
                    df
                )
            );

        clone.label =
            label;

        clone.read_only = 0;

        var control =
            frappe.ui.form.make_control({
                parent: host,
                df: clone,
                render_input: true
            });

        control.refresh();

        try {

            if (
                state.note &&
                state.note[fieldname]
            ) {
                control.set_value(
                    state.note[fieldname]
                );
            }

        } catch (e) {}

        if (control.$input) {

            control.$input.on(
                "change input",
                function () {

                    try {
                        state.note[fieldname] =
                            control.get_value();
                    } catch (e) {}

                }
            );
        }

        state.controls[
            host_name
        ] = control;

        return control;
    }

    function render_shell() {

        var target =
            document.querySelector(
                "#er-content"
            );

        if (!target) {
            return null;
        }

        target.innerHTML = `

<div id="${ROOT_ID}" dir="rtl">

    <div class="doctor-native-card">

        <div class="doctor-native-header">

            <div class="doctor-native-title">
                🩺 نافذة الطبيب | Doctor Workspace
            </div>

            <div class="doctor-native-subtitle">
                Patient Encounter · ER Patient Intake · Vital Signs · ER Clinical Note
            </div>

        </div>

        <div
            class="doctor-native-loading"
            data-doctor-loading
        >
            جاري تحميل الحقول المرتبطة بالـDocType
            | Loading real DocType fields...
        </div>

        <div
            class="doctor-native-content"
            data-doctor-content
            style="display:none;"
        >

            


            
            <section
                class="doctor-native-section doctor-native-top-navigation"
                style="
                    margin-bottom:10px;
                    padding:9px 10px;
                    border:1px solid #d9e2e8;
                    border-radius:8px;
                    background:#f7fafc;
                "
            >

                <div
                    class="doctor-native-services"
                    style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:7px;
                        align-items:center;
                        direction:rtl;
                    "
                >

                    <button
                        type="button"
                        class="btn btn-primary doctor-native-work-button"
                        style="display:inline-flex;align-items:center;justify-content:center;min-width:90px;min-height:34px;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;line-height:1.2;box-sizing:border-box;"
                        data-doctor-save
                    >
                        💾 حفظ
                    </button>

                    <button
                        type="button"
                        class="btn btn-default doctor-native-work-button"
                        style="display:inline-flex;align-items:center;justify-content:center;min-width:90px;min-height:34px;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;line-height:1.2;box-sizing:border-box;"
                        data-doctor-refresh
                    >
                        🔄 تحديث
                    </button>

                </div>

            </section>


<section class="doctor-native-section">

                <div class="doctor-native-section-title">
                    الترياج | Triage
                </div>

                <div class="doctor-native-grid">

                    <div data-doctor-host="triage_record"></div>
                    <div data-doctor-host="triage_last_status_update"></div>
                    <div
                        class="doctor-native-wide"
                        data-doctor-host="triage_notes"
                    ></div>

                    <div
                        class="doctor-native-wide"
                        data-doctor-triage-result
                    ></div>

                    <div
                        class="doctor-native-wide"
                        data-doctor-triage-reason
                    ></div>

                    <div
                        class="doctor-native-wide"
                        data-doctor-critical-alert
                    ></div>

                </div>

            </section>


<section class="doctor-native-section">

                <div class="doctor-native-section-title">
                    تقييم التمريض المزامن | Nursing Assessment — Read Only
                </div>

                <div
                    data-doctor-nursing-assessment
                    class="doctor-native-grid"
                ></div>

            </section>


<section class="doctor-native-section doctor-native-patient-history">

                <div class="doctor-native-section-title">
                    التاريخ الطبي المهم | Relevant Medical History
                </div>

                <div class="doctor-native-grid">

                    <div data-doctor-host="patient_blood_group"></div>

                    <div data-doctor-host="patient_allergies"></div>

                    <div
                        class="doctor-native-wide"
                        data-doctor-host="patient_medication"
                    ></div>

                    <div
                        class="doctor-native-wide"
                        data-doctor-host="patient_medical_history"
                    ></div>

                    <div
                        class="doctor-native-wide"
                        data-doctor-host="patient_surgical_history"
                    ></div>

                    <div data-doctor-host="patient_occupation"></div>

                    <div data-doctor-host="patient_tobacco"></div>

                    <div data-doctor-host="patient_alcohol"></div>

                    <div
                        class="doctor-native-wide"
                        data-doctor-host="patient_environment"
                    ></div>

                </div>

                <div class="doctor-native-muted" style="margin-top:6px;">
                    تظهر هنا المعلومات المسجلة في ملف المريض، وتُستخدم حسب الصلة السريرية بالحالة الحالية.
                </div>

            </section>


<section class="doctor-native-section">

                <div class="doctor-native-section-title">
                    التقييم الطبي | Medical Assessment
                </div>

                <div class="doctor-native-grid doctor-assessment-grid">

                    <div data-doctor-host="er_chief_complaint"></div>

                    <div class="doctor-native-wide"
                         data-doctor-host="encounter_comment"></div>

                    <div data-doctor-host="symptoms"></div>

                    <div class="doctor-native-wide"
                         data-doctor-host="er_physical_examination"></div>

                    <div class="doctor-native-wide"
                         data-doctor-host="er_doctor_notes"></div>

                    <div class="doctor-native-wide"
                         data-doctor-host="diagnosis"></div>

                </div>

            </section>


<section class="doctor-native-section">

                <div class="doctor-native-section-title">
                    التدوين السريري | Clinical Documentation
                </div>

                <div class="doctor-native-grid doctor-clinical-note-grid">

                    <div data-doctor-host="note_type"></div>

                    <div
                        class="doctor-clinical-note-field"
                        style="grid-column:2!important;grid-row:1!important;align-self:start!important;display:flex!important;flex-direction:column!important;width:100%!important;margin:0!important;padding:0!important;"
                    >
                        <div
                            class="doctor-clinical-note-label"
                            style="display:block!important;height:auto!important;margin:0 0 3px 0!important;padding:0!important;font-size:10.5px!important;line-height:13px!important;font-weight:600!important;"
                        >
                            ملاحظة التدوين السريري | Clinical Note
                        </div>
                        <div
                            data-doctor-host="clinical_note"
                            style="display:block!important;width:100%!important;margin:0!important;padding:0!important;"
                        ></div>
                    </div>

                </div>

            </section>


<section
                class="doctor-native-section doctor-native-order-editor-section"
                data-doctor-order-editor
            >
                <div class="doctor-native-section-title">
                    إصدار الطلبات الطبية | Medical Orders
                </div>

                <div
                    class="doctor-native-order-buttons"
                    style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:7px;
                        align-items:center;
                        direction:rtl;
                        margin-bottom:10px;
                    "
                >
<button
                        type="button"
                        class="btn btn-default doctor-native-order-inline-button"
                        data-doctor-order-type="مختبر"
                        title="إصدار مختبر"
                        style="min-height:38px;min-width:72px;padding:8px 12px;border-radius:8px;border:1px solid #7fbd8e;background:#eef9f0;color:#23623a;font-size:12px;font-weight:800;line-height:1.2;"
                    >
                        🧪 طلب مختبر
                    </button>
<button
                        type="button"
                        class="btn btn-default doctor-native-order-inline-button"
                        data-doctor-order-type="أشعة"
                        title="إصدار أشعة"
                        style="min-height:38px;min-width:72px;padding:8px 12px;border-radius:8px;border:1px solid #82afd6;background:#eef6fd;color:#1e5a87;font-size:12px;font-weight:800;line-height:1.2;"
                    >
                        🩻 طلب أشعة
                    </button>
<button
                        type="button"
                        class="btn btn-default doctor-native-order-inline-button"
                        data-doctor-order-type="دواء"
                        title="إصدار دواء"
                        style="min-height:38px;min-width:72px;padding:8px 12px;border-radius:8px;border:1px solid #d8b94d;background:#fff8df;color:#725600;font-size:12px;font-weight:800;line-height:1.2;"
                    >
                        💊 طلب دواء
                    </button>
<button
                        type="button"
                        class="btn btn-default doctor-native-order-inline-button"
                        data-doctor-order-type="إجراء"
                        title="إصدار إجراء"
                        style="min-height:38px;min-width:72px;padding:8px 12px;border-radius:8px;border:1px solid #b68bcf;background:#f7f0fb;color:#67458b;font-size:12px;font-weight:800;line-height:1.2;"
                    >
                        🩺 طلب إجراء
                    </button>
<button
                        type="button"
                        class="btn btn-default doctor-native-order-inline-button"
                        data-doctor-order-type="خدمة"
                        title="إصدار خدمة"
                        style="min-height:38px;min-width:72px;padding:8px 12px;border-radius:8px;border:1px solid #7bb6b6;background:#eef8f8;color:#356161;font-size:12px;font-weight:800;line-height:1.2;"
                    >
                        📋 طلب خدمة
                    </button>
                </div>

                <div
                    style="
                        display:grid;
                        grid-template-columns:repeat(3,minmax(0,1fr));
                        gap:8px;
                        margin-bottom:10px;
                        direction:rtl;
                    "
                >
                    <div>
                        <div style="font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">
                            المريض
                        </div>
                        <div
                            data-doctor-order-context-patient
                            style="
                                min-height:38px;
                                display:flex;
                                align-items:center;
                                padding:7px 10px;
                                border:1px solid #d9e2e8;
                                border-radius:7px;
                                background:#f8fafc;
                                font-size:12px;
                            "
                        >
                            —
                        </div>
                    </div>

                    <div>
                        <div style="font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">
                            الزيارة الطبية
                        </div>
                        <div
                            data-doctor-order-context-encounter
                            style="
                                min-height:38px;
                                display:flex;
                                align-items:center;
                                padding:7px 10px;
                                border:1px solid #d9e2e8;
                                border-radius:7px;
                                background:#f8fafc;
                                font-size:12px;
                                direction:ltr;
                                text-align:left;
                            "
                        >
                            —
                        </div>
                    </div>

                    <div>
                        <div style="font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">
                            أولوية الطلب
                        </div>
                        <select
                            data-doctor-order-input="priority"
                            class="form-control"
                            style="min-height:38px;"
                        >
                            <option value="Normal">عادي</option>
                            <option value="Urgent">عاجل</option>
                            <option value="STAT">STAT</option>
                        </select>
                    </div>
                </div>

                <div
                    style="
                        border:1px solid #d9e2e8;
                        border-radius:8px;
                        background:#ffffff;
                        padding:10px;
                        margin-bottom:12px;
                    "
                >
                    <div
                        style="
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            gap:10px;
                            margin-bottom:9px;
                        "
                    >
                        <strong style="font-size:13px;color:#34495e;">
                            بيانات الطلب الجديد — الحقول في صف واحد
                        </strong>

                        <select
                            data-doctor-order-type-select
                            class="form-control"
                            style="max-width:190px;min-height:36px;"
                        >
                            <option value="">اختر نوع الطلب</option>
                            <option value="دواء">دواء</option>
                            <option value="مختبر">مختبر</option>
                            <option value="أشعة">أشعة</option>
                            <option value="إجراء">إجراء</option>
                            <option value="خدمة">خدمة</option>
                        </select>
                    </div>

                    <div
                        data-doctor-order-fields
                        style="
                            display:grid;
                            grid-template-columns:repeat(6,minmax(120px,1fr));
                            gap:8px;
                            direction:rtl;
                            align-items:end;
                            overflow:visible!important;
                            position:relative;
                            z-index:10050;
                            padding-bottom:4px;
                            width:100%;
                        "
                    >
                        <div
                            style="
                                grid-column:1/-1;
                                padding:10px;
                                border:1px dashed #d7e0e7;
                                border-radius:7px;
                                color:#7a8792;
                                text-align:center;
                                font-size:12px;
                            "
                        >
                            اختر نوع الطلب لإظهار الحقول المطلوبة.
                        </div>
                    </div>

                    <div
                        style="
                            display:flex;
                            justify-content:flex-start;
                            gap:8px;
                            margin-top:10px;
                        "
                    >
                        <button
                            type="button"
                            class="btn btn-primary"
                            data-doctor-order-add
                        >
                            ＋ إضافة إلى الجدول
                        </button>
                    </div>
                </div>

                <div
                    style="
                        font-size:13px;
                        font-weight:800;
                        color:#34495e;
                        margin-bottom:7px;
                    "
                >
                    جدول الطلبات | Orders
                </div>

                <div
                    style="
                        overflow-x:auto;
                        border:1px solid #d9e2e8;
                        border-radius:8px;
                        background:#ffffff;
                    "
                >
                    <table
                        class="table table-bordered"
                        style="margin:0;font-size:10px;min-width:1050px;"
                    >
                        <thead>
                            <tr style="background:#f5f8fa;">
                                <th style="width:35px;text-align:center;">#</th>
                                <th style="width:70px;">النوع</th>
                                <th style="min-width:120px;">العنصر / الفحص</th>
                                <th style="min-width:85px;">الجرعة الطبية</th>
                                <th style="min-width:85px;">الشكل الدوائي</th>
                                <th style="min-width:85px;">التكرار</th>
                                <th style="min-width:70px;">المدة</th>
                                <th style="width:60px;">الكمية</th>
                                <th style="min-width:120px;">التفاصيل</th>
                                <th style="width:65px;">الأولوية</th>
                                <th style="width:85px;">الحالة</th>
                                <th style="min-width:150px;">السجلات المرتبطة</th>
                                <th style="width:50px;">حذف</th>
                            </tr>
                        </thead>
                        <tbody data-doctor-order-rows>
                            <tr>
                                <td
                                    colspan="9"
                                    style="
                                        text-align:center;
                                        color:#84919c;
                                        padding:18px;
                                    "
                                >
                                    لا توجد طلبات مضافة. استخدم أزرار "طلب" أعلاه.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div
                    style="
                        display:flex;
                        justify-content:flex-start;
                        margin-top:10px;
                    "
                >
                    <button
                        type="button"
                        class="btn btn-primary"
                        data-doctor-order-save
                    >
                        💾 حفظ الطلبات
                    </button>
                </div>
            </section>


<section class="doctor-native-section">

                <div class="doctor-native-section-title">
                    المراقبة وإعادة التقييم | Monitoring & Reassessment
                </div>

                <div class="doctor-native-grid">

                    <div
                        class="doctor-native-wide"
                        data-doctor-host="er_reassessment_notes"
                    ></div>

                </div>

            </section>


<section class="doctor-native-section">

                <div class="doctor-native-section-title">
                    مصير الحالة | Disposition
                </div>

                <div class="doctor-native-grid">

                    <div data-doctor-host="disposition"></div>
                    <div data-doctor-host="outcome"></div>
                    <div data-doctor-host="transfer_to"></div>
                    <div data-doctor-host="transfer_reason"></div>
                    <div data-doctor-host="death_type"></div>

                </div>

                <div class="doctor-native-note">
                    القرار السريري لمصير الحالة مسؤولية الطبيب
                    | Clinical disposition is a physician decision.
                </div>

            </section>


<section class="doctor-native-section">

                <div class="doctor-native-section-title">
                    سجل التدوين | Clinical Notes History
                </div>

                <div class="doctor-notes-wrap">

                    <table class="doctor-native-table">

                        <thead>

                            <tr>
                                <th>الوقت | Time</th>
                                <th>الطبيب | Practitioner</th>
                                <th>القسم | Department</th>
                                <th>النوع | Type</th>
                                <th>التدوين | Note</th>
                            </tr>

                        </thead>

                        <tbody data-doctor-notes></tbody>

                    </table>

                </div>

            </section>

            

            

        </div>

    </div>

</div>`;

        return document.querySelector(
            "#" + ROOT_ID
        );
    }

    function ensure_styles() {

        var old =
            document.getElementById(
                STYLE_ID
            );

        if (old) {
            old.remove();
        }

        var style =
            document.createElement(
                "style"
            );

        style.id =
            STYLE_ID;

        style.textContent = `
#${ROOT_ID}{
    width:100%!important;
    max-width:1100px!important;
    margin:0 auto!important;
    padding:6px!important;
    direction:rtl!important;
}
#${ROOT_ID} *{box-sizing:border-box!important}

#${ROOT_ID} .doctor-native-card{
    width:100%!important;
    background:#fff!important;
    border:1px solid #d7dee5!important;
    border-radius:8px!important;
    overflow:visible!important;
}
#${ROOT_ID} .doctor-native-header{
    padding:8px 12px!important;
    background:#f5f7f9!important;
    border-bottom:1px solid #d7dee5!important;
}
#${ROOT_ID} .doctor-native-title{
    font-size:14px!important;
    font-weight:700!important;
    color:#263746!important;
}
#${ROOT_ID} .doctor-native-subtitle{
    margin-top:2px!important;
    font-size:9px!important;
    color:#768691!important;
}

#${ROOT_ID} .doctor-native-content{
    display:block!important;
    width:100%!important;
    padding:4px!important;
}
#${ROOT_ID} .doctor-native-section{
    display:block!important;
    width:100%!important;
    margin:0 0 7px!important;
    padding:6px!important;
    border:1px solid #d9e2e8!important;
    border-radius:7px!important;
    background:#fff!important;
    overflow:visible!important;
}
#${ROOT_ID} .doctor-native-section-title{
    display:block!important;
    width:100%!important;
    margin:0 0 5px!important;
    padding:0 0 3px!important;
    border-bottom:1px solid #e7ebee!important;
    font-size:11px!important;
    line-height:14px!important;
    font-weight:700!important;
    color:#34495e!important;
}
#${ROOT_ID} .doctor-native-grid{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:6px!important;
    width:100%!important;
    align-items:start!important;
}
#${ROOT_ID} .doctor-native-wide{
    grid-column:1 / -1!important;
}
#${ROOT_ID} [data-doctor-host]{
    width:100%!important;
    min-width:0!important;
    margin:0!important;
}
#${ROOT_ID} .form-group{margin:0!important}
#${ROOT_ID} .control-label{
    display:block!important;
    margin:0 0 2px!important;
    font-size:10px!important;
    line-height:13px!important;
    font-weight:600!important;
}
#${ROOT_ID} .form-control{
    width:100%!important;
    min-height:34px!important;
    height:34px!important;
    padding:5px 7px!important;
    font-size:10px!important;
    line-height:22px!important;
}
#${ROOT_ID} textarea.form-control{
    min-height:72px!important;
    height:72px!important;
    padding:6px 7px!important;
    line-height:1.35!important;
    resize:vertical!important;
}
#${ROOT_ID} .frappe-control,
#${ROOT_ID} .control-input,
#${ROOT_ID} .control-input-wrapper,
#${ROOT_ID} .input-with-feedback,
#${ROOT_ID} .awesomplete,
#${ROOT_ID} .link-field{
    width:100%!important;
    min-width:0!important;
}
#${ROOT_ID} .link-btn{
    width:30px!important;
    height:30px!important;
}
#${ROOT_ID} .help-box{display:none!important}

#${ROOT_ID} .doctor-native-services,
#${ROOT_ID} .doctor-native-actions,
#${ROOT_ID} .doctor-native-order-buttons{
    display:flex!important;
    flex-wrap:wrap!important;
    gap:6px!important;
    align-items:center!important;
}
#${ROOT_ID} .doctor-native-services button,
#${ROOT_ID} .doctor-native-order-buttons button,
#${ROOT_ID} [data-doctor-save],
#${ROOT_ID} [data-doctor-refresh]{
    min-height:34px!important;
    height:34px!important;
    padding:5px 10px!important;
    font-size:10px!important;
    font-weight:700!important;
    border-radius:7px!important;
}

#${ROOT_ID} .doctor-native-order-editor-section{
    position:relative!important;
    z-index:1!important;
    overflow:visible!important;
}
#${ROOT_ID} .doctor-native-order-editor-section table{
    width:100%!important;
    font-size:9px!important;
}
#${ROOT_ID} .doctor-native-order-editor-section th,
#${ROOT_ID} .doctor-native-order-editor-section td{
    padding:5px!important;
    vertical-align:middle!important;
}

#${ROOT_ID} .doctor-assessment-grid{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:4px!important;
    align-items:start!important;
}
#${ROOT_ID} .doctor-assessment-grid > [data-doctor-host="er_chief_complaint"]{
    grid-column:1!important;
    grid-row:1!important;
}
#${ROOT_ID} .doctor-assessment-grid > [data-doctor-host="symptoms"]{
    grid-column:2!important;
    grid-row:1!important;
}
#${ROOT_ID} .doctor-assessment-grid > [data-doctor-host="encounter_comment"]{
    grid-column:1 / -1!important;
    grid-row:2!important;
}
#${ROOT_ID} .doctor-assessment-grid > [data-doctor-host="er_physical_examination"]{
    grid-column:1 / -1!important;
    grid-row:3!important;
}
#${ROOT_ID} .doctor-assessment-grid > [data-doctor-host="er_doctor_notes"]{
    grid-column:1!important;
    grid-row:4!important;
}
#${ROOT_ID} .doctor-assessment-grid > [data-doctor-host="diagnosis"]{
    grid-column:2!important;
    grid-row:4!important;
}
#${ROOT_ID} .doctor-assessment-grid textarea.form-control{
    min-height:34px!important;
    height:34px!important;
    padding:2px 4px!important;
    font-size:8.5px!important;
    line-height:1.2!important;
}
#${ROOT_ID} .doctor-assessment-grid .control-label{
    font-size:9px!important;
    line-height:11px!important;
    margin-bottom:1px!important;
}

#${ROOT_ID} [data-doctor-nursing-assessment]{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
}
#${ROOT_ID} .doctor-native-patient-history .form-control{
    min-height:30px!important;
    height:30px!important;
    padding:3px 5px!important;
    font-size:9px!important;
    line-height:20px!important;
}
#${ROOT_ID} .doctor-native-patient-history textarea.form-control{
    min-height:38px!important;
    height:38px!important;
    line-height:1.2!important;
}
#${ROOT_ID} .doctor-native-patient-history .control-label{
    font-size:9px!important;
    line-height:11px!important;
    margin-bottom:1px!important;
}
#${ROOT_ID} .doctor-native-patient-history .form-group{
    margin-bottom:0!important;
}

#${ROOT_ID} .doctor-native-muted{
    font-size:9px!important;
    line-height:13px!important;
}

#${ROOT_ID} .doctor-vitals-wrap,
#${ROOT_ID} .doctor-notes-wrap{
    width:100%!important;
    overflow:auto!important;
}
#${ROOT_ID} .doctor-native-table{
    width:100%!important;
    min-width:620px!important;
    border-collapse:collapse!important;
    font-size:8.5px!important;
}
#${ROOT_ID} .doctor-native-table th,
#${ROOT_ID} .doctor-native-table td{
    padding:3px 4px!important;
    border:1px solid #e0e5e9!important;
    line-height:12px!important;
    vertical-align:top!important;
}
#${ROOT_ID} .doctor-native-table th{
    font-size:8.5px!important;
    font-weight:700!important;
    white-space:nowrap!important;
}
#${ROOT_ID} .doctor-native-table td:last-child{
    min-width:220px!important;
    white-space:pre-wrap!important;
}


#${ROOT_ID} [data-doctor-host="encounter_comment"] textarea.form-control,
#${ROOT_ID} [data-doctor-host="er_physical_examination"] textarea.form-control,
#${ROOT_ID} [data-doctor-host="er_doctor_notes"] textarea.form-control,
#${ROOT_ID} [data-doctor-host="er_reassessment_notes"] textarea.form-control,
#${ROOT_ID} [data-doctor-host="clinical_note"] textarea.form-control{
    width:100%!important;
    min-height:34px!important;
    height:34px!important;
    padding:2px 4px!important;
    font-size:8.5px!important;
    line-height:1.2!important;
    resize:vertical!important;
}

#${ROOT_ID} [data-doctor-host="encounter_comment"] textarea.form-control{
    min-height:30px!important;
    height:30px!important;
}

body .modal-backdrop.show{z-index:1040!important}
body .modal.show,
body .modal.in{z-index:1055!important}

@media(max-width:700px){
    #${ROOT_ID}{padding:4px!important}
    #${ROOT_ID} .doctor-native-grid,
    #${ROOT_ID} [data-doctor-nursing-assessment],
    #${ROOT_ID} .doctor-assessment-grid{
        grid-template-columns:1fr!important;
    }
    #${ROOT_ID} .doctor-native-wide,
    #${ROOT_ID} .doctor-assessment-grid > [data-doctor-host]{
        grid-column:1!important;
    }
}

`;

        document.head.appendChild(
            style
        );
    }

    function render_vitals(
        root
    ) {

        var tbody =
            root.querySelector(
                "[data-doctor-vitals]"
            );

        if (!tbody) {
            return;
        }

        if (
            !state.vitals.length
        ) {

            tbody.innerHTML =
                '<tr><td colspan="11">' +
                "لا توجد علامات حيوية | No Vital Signs" +
                "</td></tr>";

            return;
        }

        tbody.innerHTML =
            state.vitals.map(
                function (v) {

                    var bp =
                        v.bp ||
                        (
                            v.bp_systolic &&
                            v.bp_diastolic
                                ? v.bp_systolic +
                                  "/" +
                                  v.bp_diastolic
                                : ""
                        );

                    return (
                        "<tr>" +
                        "<td>" +
                        esc(v.signs_date) +
                        "</td>" +
                        "<td>" +
                        esc(v.signs_time) +
                        "</td>" +
                        "<td>" +
                        esc(v.temperature) +
                        "</td>" +
                        "<td>" +
                        esc(v.pulse) +
                        "</td>" +
                        "<td>" +
                        esc(v.respiratory_rate) +
                        "</td>" +
                        "<td>" +
                        esc(bp) +
                        "</td>" +
                        "<td>" +
                        esc(
                            v.spo2 ||
                            v.custom_spo2
                        ) +
                        "</td>" +
                        "<td>" +
                        esc(v.pain_score) +
                        "</td>" +
                        "<td>" +
                        esc(
                            v.custom_blood_glucose
                        ) +
                        "</td>" +
                        "<td>" +
                        esc(v.esi_level) +
                        "</td>" +
                        "<td style='white-space:pre-wrap'>" +
                        esc(
                            v.vital_signs_note ||
                            v.triage_notes
                        ) +
                        "</td>" +
                        "</tr>"
                    );

                }
            ).join("");
    }

    function calculate_patient_age(dob) {

        if (!dob) {
            return "";
        }

        var birth = new Date(
            String(dob) + "T00:00:00"
        );

        if (isNaN(birth.getTime())) {
            return "";
        }

        var now = new Date();

        var age =
            now.getFullYear() -
            birth.getFullYear();

        var month =
            now.getMonth() -
            birth.getMonth();

        if (
            month < 0 ||
            (
                month === 0 &&
                now.getDate() < birth.getDate()
            )
        ) {
            age -= 1;
        }

        return age >= 0 ? age : "";
    }

    function render_patient_summary(root) {

        var patient =
            state.patient || {};

        var encounter =
            state.encounter || {};

        var intake =
            state.intake || {};

        var name =
            patient.patient_name ||
            encounter.patient_name ||
            encounter.patient ||
            "";

        var patient_id =
            patient.name ||
            encounter.patient ||
            "";

        var age =
            calculate_patient_age(
                patient.dob
            );

        var sex =
            patient.sex ||
            encounter.patient_sex ||
            "";

        var name_el =
            root.querySelector(
                "[data-doctor-patient-name]"
            );

        var id_el =
            root.querySelector(
                "[data-doctor-patient-id]"
            );

        var age_el =
            root.querySelector(
                "[data-doctor-patient-age]"
            );

        var sex_el =
            root.querySelector(
                "[data-doctor-patient-sex]"
            );

        var intake_el =
            root.querySelector(
                "[data-doctor-intake]"
            );

        var encounter_el =
            root.querySelector(
                "[data-doctor-encounter]"
            );

        if (name_el) {
            name_el.textContent =
                name || "—";
        }

        if (id_el) {
            id_el.textContent =
                patient_id || "—";
        }

        if (age_el) {
            age_el.textContent =
                age === "" ? "—" : String(age);
        }

        if (sex_el) {
            sex_el.textContent =
                sex || "—";
        }

        if (intake_el) {
            intake_el.textContent =
                intake.name || "—";
        }

        if (encounter_el) {
            encounter_el.textContent =
                encounter.name || "—";
        }
    }

    function render_nursing_assessment(root) {
        var host =
            root.querySelector(
                "[data-doctor-nursing-assessment]"
            );

        if (!host) {
            return;
        }

        var rows =
            state.encounter &&
            Array.isArray(state.encounter.er_clinical_notes)
                ? state.encounter.er_clinical_notes
                    .filter(function(row) {
                        return row &&
                            row.note_type === "Nursing Note";
                    })
                    .slice()
                    .sort(function(a, b) {
                        return String(b.note_time || "")
                            .localeCompare(
                                String(a.note_time || "")
                            );
                    })
                : [];

        if (!rows.length) {
            host.innerHTML =
                '<div class="doctor-native-muted" ' +
                'style="grid-column:1/-1;padding:5px;border:1px dashed #d9e2e8;border-radius:5px;">' +
                'لا يوجد تقييم تمريضي محفوظ لهذه الزيارة.' +
                '</div>';
            return;
        }

        var row = rows[0];

        var items = [
            ["مجرى الهواء | Airway", row.nursing_airway_status, row.nursing_airway_notes],
            ["التنفس | Breathing", row.nursing_breathing_status, row.nursing_breathing_notes],
            ["الدورة الدموية | Circulation", row.nursing_circulation_status, row.nursing_circulation_notes],
            ["الحالة العصبية | Disability", row.nursing_disability_status, row.nursing_disability_notes],
            ["الفحص العام | Exposure", row.nursing_exposure_status, row.nursing_exposure_notes],
            ["الأعراض | Symptoms", row.nursing_sample_symptoms, ""],
            ["الحساسية | Allergies", row.nursing_sample_allergies, ""],
            ["الأدوية الحالية | Medications", row.nursing_sample_medications, ""],
            ["التاريخ المرضي | Past History", row.nursing_sample_history, ""],
            ["آخر تناول | Oral Intake", row.nursing_sample_last_intake, ""],
            ["الأحداث السابقة | Events", row.nursing_sample_events, ""],
            ["عوامل الخطورة | General Risk", row.nursing_general_risk, ""],
            ["إبلاغ الطبيب | Doctor Notified", row.nursing_doctor_notified, ""],
            ["سبب التصعيد | Escalation", row.nursing_escalation_reason, ""]
        ];

        var html =
            '<div style="' +
                'grid-column:1/-1;' +
                'display:grid;' +
                'grid-template-columns:repeat(3,minmax(0,1fr));' +
                'gap:4px;' +
                'width:100%;' +
            '">' ;

        items.forEach(function(item) {
            html +=
                '<div style="' +
                    'border:1px solid #dfe5e9;' +
                    'border-radius:5px;' +
                    'background:#f8fafc;' +
                    'padding:4px 5px;' +
                    'min-height:28px;' +
                    'overflow:hidden;' +
                '">' +
                    '<div style="' +
                        'font-size:8.5px;' +
                        'line-height:11px;' +
                        'font-weight:700;' +
                        'color:#68737d;' +
                        'margin-bottom:1px;' +
                        'white-space:nowrap;' +
                        'overflow:hidden;' +
                        'text-overflow:ellipsis;' +
                    '">' +
                        esc(item[0]) +
                    '</div>' +
                    '<div style="' +
                        'font-size:9px;' +
                        'line-height:12px;' +
                        'font-weight:700;' +
                        'color:#34495e;' +
                        'white-space:pre-wrap;' +
                        'word-break:break-word;' +
                    '">' +
                        esc(item[1] || "—") +
                    '</div>' +
                    (
                        item[2]
                            ? '<div style="' +
                              'font-size:8px;' +
                              'line-height:11px;' +
                              'color:#7a8792;' +
                              'margin-top:1px;' +
                              'white-space:pre-wrap;' +
                              'word-break:break-word;' +
                              '">' +
                              esc(item[2]) +
                              '</div>'
                            : ""
                    ) +
                '</div>';
        });

        html +=
            '<div style="' +
                'grid-column:1/-1;' +
                'font-size:8px;' +
                'line-height:11px;' +
                'color:#7a8792;' +
                'margin-top:1px;' +
            '">' +
            'آخر تقييم تمريضي محفوظ في نفس الزيارة — قراءة فقط.' +
            '</div></div>';

        host.innerHTML = html;
    }

    function render_triage_summary(root) {
        var latest =
            state.vitals &&
            state.vitals.length
                ? state.vitals[0]
                : null;

        var result_el =
            root.querySelector("[data-doctor-triage-result]");
        var reason_el =
            root.querySelector("[data-doctor-triage-reason]");
        var alert_el =
            root.querySelector("[data-doctor-critical-alert]");

        var result =
            latest &&
            (latest.triage_result || latest.esi_level || "");

        var reason =
            latest && latest.esi_reason
                ? latest.esi_reason
                : "";

        var alert =
            latest && latest.critical_alert
                ? latest.critical_alert
                : "";

        var box =
            'border:1px solid #d9e2e8;border-radius:5px;' +
            'padding:5px 7px;background:#f8fafc;' +
            'font-size:9px;line-height:13px;min-height:30px;';

        if (result_el) {
            result_el.innerHTML =
                '<div style="' + box + '">' +
                '<strong style="font-size:9px;">النتيجة | Triage Result</strong>' +
                '<div style="margin-top:2px;font-weight:700;">' +
                esc(result || "—") +
                '</div></div>';
        }

        if (reason_el) {
            reason_el.innerHTML =
                '<div style="' + box + '">' +
                '<strong style="font-size:9px;">السبب | Triage Reason</strong>' +
                '<div style="margin-top:2px;">' +
                esc(reason || "—") +
                '</div></div>';
        }

        if (alert_el) {
            alert_el.innerHTML = alert
                ? '<div style="grid-column:1/-1;border:1px solid #e4b1b1;' +
                  'border-radius:5px;padding:5px 7px;background:#fff7f7;' +
                  'font-size:9px;line-height:13px;">' +
                  '<strong>تنبيه حرج | Critical Alert</strong>' +
                  '<div style="margin-top:2px;">' +
                  esc(alert) +
                  '</div></div>'
                : "";
        }
    }

    function load_vitals(
        root
    ) {

        var e =
            state.encounter;

        if (
            !e ||
            !e.patient
        ) {
            state.vitals = [];
            render_vitals(root);
            return Promise.resolve();
        }


        var intake_name =
            state.intake &&
            state.intake.name
                ? state.intake.name
                : (
                    e.er_patient_intake
                        ? e.er_patient_intake
                        : null
                );


        var candidate = [
            "name",
            "creation",
            "signs_date",
            "signs_time",
            "temperature",
            "pulse",
            "respiratory_rate",
            "bp",
            "bp_systolic",
            "bp_diastolic",
            "spo2",
            "custom_spo2",
            "pain_score",
            "custom_blood_glucose",
            "esi_level",
            "triage_notes",
            "vital_signs_note",
            "critical_alert",
            "triage_result",
            "esi_reason"
        ];


        var fields =
            candidate.filter(
                function (name) {
                    return !!get_df(
                        "Vital Signs",
                        name
                    );
                }
            );


        var requests = [];


        /*
         * 1) كل Vital Signs المرتبط بالـ Encounter
         */
        requests.push(
            call(
                "frappe.client.get_list",
                {
                    doctype: "Vital Signs",
                    fields: fields,
                    filters: [
                        [
                            "Vital Signs",
                            "patient",
                            "=",
                            e.patient
                        ],
                        [
                            "Vital Signs",
                            "encounter",
                            "=",
                            e.name
                        ]
                    ],
                    order_by:
                        "signs_date desc, signs_time desc, creation desc",
                    limit_page_length:
                        1000
                }
            )
        );


        /*
         * 2) كل Vital Signs المرتبط بالـ ER Patient Intake
         *
         * هذا يشمل سجل الترياج الذي يكون:
         * encounter = None
         * er_intake = ERI-...
         */
        if (intake_name) {

            requests.push(
                call(
                    "frappe.client.get_list",
                    {
                        doctype: "Vital Signs",
                        fields: fields,
                        filters: [
                            [
                                "Vital Signs",
                                "patient",
                                "=",
                                e.patient
                            ],
                            [
                                "Vital Signs",
                                "er_intake",
                                "=",
                                intake_name
                            ]
                        ],
                        order_by:
                            "signs_date desc, signs_time desc, creation desc",
                        limit_page_length:
                            1000
                    }
                )
            );

        }


        return Promise
            .all(requests)
            .then(
                function (results) {

                    var by_name = {};


                    results.forEach(
                        function (rows) {

                            (
                                Array.isArray(rows)
                                    ? rows
                                    : []
                            ).forEach(
                                function (row) {

                                    if (
                                        row &&
                                        row.name
                                    ) {
                                        by_name[row.name] =
                                            row;
                                    }

                                }
                            );

                        }
                    );


                    var rows =
                        Object.keys(by_name)
                            .map(
                                function (name) {
                                    return by_name[name];
                                }
                            );


                    /*
                     * الأحدث أولًا.
                     * الجدول يعرض جميع السجلات،
                     * وأحدث سجل يكون في الأعلى.
                     */
                    rows.sort(
                        function (a, b) {

                            var a_date =
                                a.signs_date
                                    ? String(a.signs_date)
                                    : "";

                            var b_date =
                                b.signs_date
                                    ? String(b.signs_date)
                                    : "";


                            if (
                                a_date !==
                                b_date
                            ) {
                                return b_date.localeCompare(
                                    a_date
                                );
                            }


                            var a_time =
                                a.signs_time != null
                                    ? String(a.signs_time)
                                    : "";

                            var b_time =
                                b.signs_time != null
                                    ? String(b.signs_time)
                                    : "";


                            if (
                                a_time !==
                                b_time
                            ) {
                                return b_time.localeCompare(
                                    a_time
                                );
                            }


                            var a_creation =
                                a.creation
                                    ? String(a.creation)
                                    : "";

                            var b_creation =
                                b.creation
                                    ? String(b.creation)
                                    : "";


                            return b_creation.localeCompare(
                                a_creation
                            );

                        }
                    );


                    state.vitals =
                        rows;


                    render_vitals(
                        root
                    );


                    render_triage_summary(
                        root
                    );

                }
            );
    }
    function render_history(
        root
    ) {

        var tbody =
            root.querySelector(
                "[data-doctor-notes]"
            );

        if (!tbody) {
            return;
        }

        var rows =
            (
                state.encounter &&
                state.encounter.er_clinical_notes
            ) || [];

        if (!rows.length) {

            tbody.innerHTML =
                '<tr><td colspan="5">' +
                "لا توجد تدوينات سريرية | No Clinical Notes" +
                "</td></tr>";

            return;
        }

        tbody.innerHTML =
            rows.map(
                function (r) {

                    return (
                        "<tr>" +
                        "<td>" +
                        esc(r.note_time) +
                        "</td>" +
                        "<td>" +
                        esc(r.practitioner) +
                        "</td>" +
                        "<td>" +
                        esc(r.department) +
                        "</td>" +
                        "<td>" +
                        esc(r.note_type) +
                        "</td>" +
                        "<td style='white-space:pre-wrap'>" +
                        esc(r.note) +
                        "</td>" +
                        "</tr>"
                    );

                }
            ).join("");
    }

    function bind_fields(
        root
    ) {

        var e =
            state.encounter;

        var i =
            state.intake;

        state.controls = {};

        /*
         * ============================
         * Patient Encounter
         * ============================
         */

        make_bound_control(
            root,
            "encounter_status",
            "Patient Encounter",
            "er_visit_status",
            e,
            "حالة الزيارة | Visit Status",
            true
        );

        make_bound_control(
            root,
            "practitioner",
            "Patient Encounter",
            "practitioner",
            e,
            "الطبيب المعالج | Attending Physician",
            true
        );

        make_bound_control(
            root,
            "medical_department",
            "Patient Encounter",
            "medical_department",
            e,
            "القسم الطبي | Medical Department",
            true
        );

        make_bound_control(
            root,
            "er_visit_type",
            "Patient Encounter",
            "er_visit_type",
            e,
            "نوع الزيارة | Visit Type",
            true
        );

        make_bound_control(
            root,
            "encounter_date",
            "Patient Encounter",
            "encounter_date",
            e,
            "تاريخ زيارة الطبيب | Encounter Date",
            true
        );

        make_bound_control(
            root,
            "encounter_time",
            "Patient Encounter",
            "encounter_time",
            e,
            "وقت زيارة الطبيب | Encounter Time",
            true
        );

        make_bound_control(
            root,
            "symptoms",
            "Patient Encounter",
            "symptoms",
            e,
            "الأعراض | Symptoms",
            false
        );

        make_bound_control(
            root,
            "encounter_comment",
            "Patient Encounter",
            "encounter_comment",
            e,
            "قصة الحالة والتفاصيل السريرية | HPI / Clinical Details",
            false
        );

        make_bound_control(
            root,
            "er_physical_examination",
            "Patient Encounter",
            "er_physical_examination",
            e,
            "الفحص السريري | Physical Examination",
            false
        );

        make_bound_control(
            root,
            "er_arrival_mode",
            "Patient Encounter",
            "er_arrival_mode",
            e,
            "طريقة الوصول | Arrival Mode",
            true
        );

        make_bound_control(
            root,
            "er_arrival_time",
            "Patient Encounter",
            "er_arrival_time",
            e,
            "وقت الوصول | Arrival Time",
            true
        );

        make_bound_control(
            root,
            "er_acuity",
            "Patient Encounter",
            "er_acuity",
            e,
            "مستوى الفرز | Acuity",
            true
        );

        make_bound_control(
            root,
            "Patient Encounter",
            "er_chief_complaint",
            e,
            "الشكوى الرئيسية | Chief Complaint",
            true
        );

        make_bound_control(
            root,
            "er_priority",
            "Patient Encounter",
            "er_priority",
            e,
            "الأولوية | Priority",
            true
        );

        make_bound_control(
            root,
            "er_waiting_area",
            "Patient Encounter",
            "er_waiting_area",
            e,
            "منطقة الانتظار | Waiting Area",
            true
        );

        make_bound_control(
            root,
            "er_vital_sign",
            "Patient Encounter",
            "er_vital_sign",
            e,
            "العلامات الحيوية | Vital Signs",
            true
        );

        make_bound_control(
            root,
            "er_doctor_notes",
            "Patient Encounter",
            "er_doctor_notes",
            e,
            "التقييم والقرار الطبي | Assessment / MDM",
            false
        );

        make_bound_control(
            root,
            "diagnosis",
            "Patient Encounter",
            "diagnosis",
            e,
            "التشخيص | Diagnosis",
            false
        );

        make_bound_control(
            root,
            "er_reassessment_notes",
            "Patient Encounter",
            "er_reassessment_notes",
            e,
            "ملاحظات إعادة التقييم",
            false
        );

        /*
         * ============================
         * Patient
         * ============================
         *
         * These values are read from the real Patient document.
         * No duplicate doctor-side storage is created.
         */

        var p =
            state.patient;

        if (p) {

            make_bound_control(
                root,
                "patient_blood_group",
                "Patient",
                "blood_group",
                p,
                "فصيلة الدم | Blood Group",
                true
            );

            make_bound_control(
                root,
                "patient_allergies",
                "Patient",
                "allergies",
                p,
                "الحساسية | Allergies",
                true
            );

            make_bound_control(
                root,
                "patient_medication",
                "Patient",
                "medication",
                p,
                "الأدوية الحالية | Current Medications",
                true
            );

            make_bound_control(
                root,
                "patient_medical_history",
                "Patient",
                "medical_history",
                p,
                "التاريخ المرضي | Medical History",
                true
            );

            make_bound_control(
                root,
                "patient_surgical_history",
                "Patient",
                "surgical_history",
                p,
                "التاريخ الجراحي | Surgical History",
                true
            );

            make_bound_control(
                root,
                "patient_occupation",
                "Patient",
                "occupation",
                p,
                "المهنة | Occupation",
                true
            );

            var tobacco_value =
                [
                    p.tobacco_current_use || "",
                    p.tobacco_past_use
                        ? "سابق: " + p.tobacco_past_use
                        : ""
                ]
                .filter(Boolean)
                .join(" | ");

            var tobacco_host =
                root.querySelector(
                    '[data-doctor-host="patient_tobacco"]'
                );

            if (tobacco_host) {
                tobacco_host.innerHTML =
                    '<div class="form-group">' +
                    '<label class="control-label">' +
                    'التبغ | Tobacco Use' +
                    '</label>' +
                    '<div class="form-control" ' +
                    'style="background:#f8f9fa;min-height:36px;' +
                    'padding-top:8px;white-space:pre-wrap;">' +
                    esc(tobacco_value || "—") +
                    '</div>' +
                    '</div>';
            }

            var alcohol_value =
                [
                    p.alcohol_current_use || "",
                    p.alcohol_past_use
                        ? "سابق: " + p.alcohol_past_use
                        : ""
                ]
                .filter(Boolean)
                .join(" | ");

            var alcohol_host =
                root.querySelector(
                    '[data-doctor-host="patient_alcohol"]'
                );

            if (alcohol_host) {
                alcohol_host.innerHTML =
                    '<div class="form-group">' +
                    '<label class="control-label">' +
                    'الكحول | Alcohol Use' +
                    '</label>' +
                    '<div class="form-control" ' +
                    'style="background:#f8f9fa;min-height:36px;' +
                    'padding-top:8px;white-space:pre-wrap;">' +
                    esc(alcohol_value || "—") +
                    '</div>' +
                    '</div>';
            }

            make_bound_control(
                root,
                "patient_environment",
                "Patient",
                "surrounding_factors",
                p,
                "عوامل البيئة والمخاطر | Environmental/Risk Factors",
                true
            );
        }

        /*
         * ============================
         * ER Patient Intake
         * ============================
         */

        if (i) {

            make_bound_control(
                root,
                "triage_record",
                "ER Patient Intake",
                "triage_record",
                i,
                "سجل الترياج | Triage Record",
                true
            );

            var triage_update_host =
                root.querySelector(
                    '[data-doctor-host="triage_last_status_update"]'
                );

            if (triage_update_host) {

                var triage_update =
                    i.last_status_update || "";

                var triage_update_display =
                    triage_update
                        ? frappe.datetime.str_to_user(
                            String(triage_update)
                        )
                        : "—";

                triage_update_host.innerHTML =
                    '<div class="form-group">' +
                    '<label class="control-label">' +
                    'آخر تحديث | Last Status Update' +
                    '</label>' +
                    '<div class="form-control" ' +
                    'style="background:#f8f9fa;min-height:36px;' +
                    'padding-top:8px;">' +
                    esc(triage_update_display) +
                    '</div>' +
                    '</div>';
            }

            make_bound_control(
                root,
                "triage_notes",
                "ER Patient Intake",
                "notes",
                i,
                "ملاحظات الترياج | Triage Notes",
                true
            );

            make_bound_control(
                root,
                "current_location",
                "ER Patient Intake",
                "current_location",
                i,
                "الموقع الحالي | Current Location",
                true
            );

            var assigned_bed_control =
                make_bound_control(
                    root,
                    "assigned_bed",
                    "ER Patient Intake",
                    "assigned_bed",
                    i,
                    "السرير | Assigned Bed",
                    false
                );

            var assigned_bed_host =
                root.querySelector(
                    '[data-doctor-host="assigned_bed"]'
                );

            if (
                assigned_bed_host &&
                i &&
                i.assigned_bed
            ) {
                var bed_notice =
                    document.createElement("div");

                bed_notice.style.cssText =
                    "margin-top:4px;padding:5px 7px;" +
                    "border-radius:5px;" +
                    "background:#eef5fb;" +
                    "border:1px solid #c8d9e8;" +
                    "font-size:10px;" +
                    "line-height:15px;" +
                    "color:#36566f;";

                bed_notice.textContent =
                    "المريض موجود حاليًا على السرير: " +
                    String(i.assigned_bed) +
                    " — يمكنك إبقاؤه أو اختيار سرير متاح آخر.";

                assigned_bed_host.appendChild(
                    bed_notice
                );
            }

            make_bound_control(
                root,
                "case_category",
                "ER Patient Intake",
                "case_category",
                i,
                "تصنيف الحالة | Case Category",
                true
            );

            make_bound_control(
                root,
                "case_type",
                "ER Patient Intake",
                "case_type",
                i,
                "نوع الحالة | Case Type",
                true
            );

            make_bound_control(
                root,
                "injury_type",
                "ER Patient Intake",
                "injury_type",
                i,
                "نوع الإصابة | Injury Type",
                true
            );

            make_bound_control(
                root,
                "referred_from",
                "ER Patient Intake",
                "referred_from",
                i,
                "محول من | Referred From",
                true
            );

            /*
             * قرار الطبيب:
             * ER Patient Intake
             */

            make_bound_control(
                root,
                "disposition",
                "ER Patient Intake",
                "disposition",
                i,
                "المصير",
                false
            );

            make_bound_control(
                root,
                "outcome",
                "ER Patient Intake",
                "outcome",
                i,
                "النتيجة | Outcome",
                false
            );

            make_bound_control(
                root,
                "transfer_to",
                "ER Patient Intake",
                "transfer_to",
                i,
                "جهة التحويل | Transfer To",
                false
            );

            make_bound_control(
                root,
                "transfer_reason",
                "ER Patient Intake",
                "transfer_reason",
                i,
                "سبب التحويل | Transfer Reason",
                false
            );

            make_bound_control(
                root,
                "death_type",
                "ER Patient Intake",
                "death_type",
                i,
                "نوع الوفاة | Death Type",
                false
            );
        }

        /*
         * ============================
         * ER Clinical Note
         * ============================
         */

        state.note =
            frappe.model.get_new_doc(
                "ER Clinical Note"
            );

        state.note.practitioner =
            e.practitioner || "";

        state.note.department =
            e.medical_department || "";

        if (
            "note_type" in state.note
        ) {
            state.note.note_type =
                "Clinical Note";
        }

        make_note_control(
            root,
            "note_type",
            "note_type",
            "نوع التدوين | Note Type"
        );

        make_note_control(
            root,
            "clinical_note",
            "note",
            "التدوين السريري | Clinical Note"
        );

        /*
         * إظهار/إخفاء حقول التحويل والوفاة.
         */

        update_disposition_visibility(
            root
        );
    }

    
/* ER DOCTOR SERVICES — DIRECT DOCTYPE */

/* =========================================================
 * DOCTOR INLINE MEDICAL ORDERS
 * لا Dialog — الإدخال والحفظ داخل نافذة الطبيب.
 * ========================================================= */

function er_doctor_order_root() {
    return document.getElementById(ROOT_ID);
}

function er_doctor_order_encounter() {
    if (
        state &&
        state.encounter &&
        state.encounter.name
    ) {
        return state.encounter.name;
    }

    return current_encounter_name();
}

function er_doctor_order_patient() {
    if (
        state &&
        state.encounter &&
        state.encounter.patient
    ) {
        return state.encounter.patient;
    }

    if (
        state &&
        state.intake &&
        state.intake.patient
    ) {
        return state.intake.patient;
    }

    return "";
}

function er_doctor_order_make_control(
    parent,
    df,
    value
) {
    const control =
        frappe.ui.form.make_control({
            df: df,
            parent: parent,
            render_input: true
        });

    control.refresh();

    if (
        value !== undefined &&
        value !== null &&
        value !== ""
    ) {
        control.set_value(value);
    }

    return control;
}

function er_doctor_order_input_value(
    formState,
    name
) {
    if (
        formState &&
        formState.controls &&
        formState.controls[name] &&
        typeof formState.controls[name].get_value ===
            "function"
    ) {
        return String(
            formState.controls[name].get_value() || ""
        ).trim();
    }

    const root =
        er_doctor_order_root();

    if (!root) {
        return "";
    }

    const input =
        root.querySelector(
            '[data-doctor-order-field="' +
            name +
            '"]'
        );

    return input
        ? String(input.value || "").trim()
        : "";
}

function er_doctor_order_make_link_field(
    container,
    name,
    label,
    options,
    value
) {
    const wrap =
        document.createElement("div");

    const label_el =
        document.createElement("div");

    label_el.textContent =
        label || name;

    label_el.style.cssText =
        "font-size:9px;font-weight:700;color:#68737d;margin-bottom:2px;line-height:11px;";

    const host =
        document.createElement("div");

    wrap.appendChild(label_el);
    wrap.appendChild(host);
    container.appendChild(wrap);

    return er_doctor_order_make_control(
        host,
        {
            fieldtype: "Link",
            fieldname: name,
            options: options,
            reqd: 0
        },
        value || ""
    );
}

function er_doctor_order_make_text_field(
    container,
    name,
    label,
    type,
    value
) {
    const wrap =
        document.createElement("div");

    wrap.innerHTML =
        '<label style="display:block;margin:0;">' +
        '<span style="display:block;font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">' +
        esc(label) +
        "</span>" +
        '<input class="form-control" type="' +
        esc(type || "text") +
        '" data-doctor-order-field="' +
        esc(name) +
        '" value="' +
        esc(value || "") +
        '" style="min-height:38px;">' +
        "</label>";

    container.appendChild(
        wrap.firstElementChild
    );
}

function er_doctor_order_make_textarea(
    container,
    name,
    label,
    value
) {
    const wrap =
        document.createElement("div");

    wrap.innerHTML =
        '<label style="display:block;margin:0;">' +
        '<span style="display:block;font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">' +
        esc(label) +
        "</span>" +
        '<textarea class="form-control" rows="2" data-doctor-order-field="' +
        esc(name) +
        '" style="min-height:54px;">' +
        esc(value || "") +
        "</textarea>" +
        "</label>";

    container.appendChild(
        wrap.firstElementChild
    );
}


/* =========================================================
 * Doctor Order Link Popup Portal
 *
 * الهدف:
 * 1) منع جدول الطلبات من قص قائمة Link.
 * 2) إبقاء جدول الطلبات داخل نافذة الطبيب.
 * 3) نقل قائمة Frappe الأصلية فقط إلى BODY.
 * 4) عدم إنشاء Popup بديل.
 * ========================================================= */

(function ensure_er_doctor_order_link_portal() {

    if (
        window.__ER_DOCTOR_ORDER_LINK_PORTAL__
    ) {
        return;
    }

    window.__ER_DOCTOR_ORDER_LINK_PORTAL__ =
        true;

    const style =
        document.createElement("style");

    style.id =
        "er-doctor-order-link-portal-style";

    style.textContent = `
        /*
         * منطقة الطلبات نفسها لا تدخل
         * في stacking level مرتفع.
         */
        #${ROOT_ID} .doctor-native-order-editor-section{
            position:relative!important;
            z-index:auto!important;
            overflow:visible!important;
        }

        #${ROOT_ID} .doctor-native-order-editor-section [data-doctor-order-fields]{
            position:relative!important;
            z-index:auto!important;
            overflow:visible!important;
        }

        #${ROOT_ID} .doctor-native-order-editor-section table{
            position:relative!important;
            z-index:auto!important;
        }

        /*
         * قائمة Link المنقولة إلى BODY.
         */
        body > ul.er-doctor-order-link-portal{
            position:fixed!important;
            z-index:1060!important;
            display:block;
            margin:0!important;
            box-sizing:border-box!important;
            background:#fff!important;
            border:1px solid #cbd5e1!important;
            border-radius:7px!important;
            box-shadow:0 8px 24px rgba(0,0,0,.18)!important;
            max-height:360px!important;
            overflow-y:auto!important;
            overflow-x:hidden!important;
        }

        body > ul.er-doctor-order-link-portal li{
            background:#fff!important;
        }
    `;

    document.head.appendChild(style);

    function position_popup(input, ul) {

        if (!input || !ul) {
            return;
        }

        const rect =
            input.getBoundingClientRect();

        const viewportWidth =
            window.innerWidth;

        const viewportHeight =
            window.innerHeight;

        let width =
            Math.max(
                rect.width || 0,
                260
            );

        width =
            Math.min(
                width,
                viewportWidth - 16
            );

        let left =
            rect.left;

        if (
            left + width >
            viewportWidth - 8
        ) {
            left =
                viewportWidth -
                width -
                8;
        }

        if (left < 8) {
            left = 8;
        }

        /*
         * نضع القائمة أسفل الحقل أولًا.
         */
        let top =
            rect.bottom + 4;

        const height =
            Math.min(
                Math.max(
                    ul.scrollHeight || 240,
                    80
                ),
                360
            );

        /*
         * إذا لم تتسع المساحة أسفل الحقل،
         * تظهر فوقه.
         */
        if (
            top + height >
            viewportHeight - 8
        ) {
            top =
                rect.top -
                height -
                4;
        }

        if (top < 8) {
            top = 8;
        }

        ul.style.position =
            "fixed";

        ul.style.left =
            left + "px";

        ul.style.top =
            top + "px";

        ul.style.width =
            width + "px";

        ul.style.minWidth =
            width + "px";

        ul.style.maxWidth =
            width + "px";

        ul.style.zIndex =
            "1060";

        ul.classList.add(
            "er-doctor-order-link-portal"
        );
    }

    function portal_input(input) {

        if (!input) {
            return;
        }

        const awesompleteBox =
            input.closest(
                ".awesomplete"
            );

        if (!awesompleteBox) {
            return;
        }

        const ul =
            awesompleteBox.querySelector(
                "ul"
            );

        if (!ul) {
            return;
        }

        /*
         * فقط حقول Link داخل جدول الطلبات.
         */
        if (
            !input.closest(
                "[data-doctor-order-fields]"
            )
        ) {
            return;
        }

        if (
            ul.parentNode !==
            document.body
        ) {
            document.body.appendChild(ul);
        }

        portal_input.current_input =
            input;

        position_popup(
            input,
            ul
        );

        /*
         * إعادة التموضع عند التمرير
         * وتغيير حجم النافذة.
         */
        if (
            !ul.__erDoctorPortalBound
        ) {
            ul.__erDoctorPortalBound =
                true;

            const reposition =
                function () {

                    if (
                        ul.style.display ===
                        "none"
                    ) {
                        return;
                    }

                    const currentInput =
                        portal_input.current_input;

                    if (!currentInput) {
                        return;
                    }

                    position_popup(
                        currentInput,
                        ul
                    );
                };

            window.addEventListener(
                "resize",
                reposition
            );

            window.addEventListener(
                "scroll",
                reposition,
                true
            );
        }
    }

    /*
     * Frappe/Awesomplete يطلق الحدث
     * عند فتح قائمة Link.
     */
    document.addEventListener(
        "awesomplete-open",
        function (event) {

            const input =
                event.target;

            if (
                !input ||
                !input.closest(
                    "[data-doctor-order-fields]"
                )
            ) {
                return;
            }

            /*
             * ننتظر دورة رسم واحدة حتى
             * تكون UL موجودة فعلًا.
             */
            requestAnimationFrame(
                function () {
                    portal_input(input);
                }
            );
        },
        true
    );

})();


function er_doctor_order_prepare_horizontal_fields(
    host
) {
    if (!host) {
        return;
    }

    Array.from(host.children).forEach(
        function (child) {
            child.style.flex = "0 0 185px";
            child.style.minWidth = "185px";
            child.style.boxSizing = "border-box";
        }
    );
}

function er_doctor_order_make_radiology_item_control(
    container,
    formState
) {
    const cell =
        document.createElement("div");

    cell.style.cssText =
        "min-width:0;width:100%;position:relative;";

    const title =
        document.createElement("div");

    title.style.cssText =
        "font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;";

    title.textContent =
        "نوع الأشعة / الصنف";

    cell.appendChild(title);

    const host =
        document.createElement("div");

    cell.appendChild(host);
    container.appendChild(cell);

    /*
     * هذه هي أصناف الأشعة الفعلية الموجودة
     * والمستخدمة في RADIOLOGY_ITEMS.
     */
    const radiology_codes = [
        "RAD-XRAY",
        "RAD-CT",
        "RAD-MRI",
        "RAD-ULTRASOUND",
        "RAD-ECG",
        "RAD-ECHO",
        "اشعة"
    ];

    const radiology_query =
        function () {
            return {
                filters: {
                    name: [
                        "in",
                        radiology_codes
                    ],
                    disabled: 0,
                    is_sales_item: 1
                }
            };
        };

    const control =
        er_doctor_order_make_control(
            host,
            {
                fieldtype: "Link",
                fieldname: "item_code",
                options: "Item",
                reqd: 1,
                get_query: radiology_query
            }
        );

    if (control) {
        if (control.df) {
            control.df.get_query =
                radiology_query;
        }

        control.get_query =
            radiology_query;

        if (control.$input) {
            control.$input.attr(
                "placeholder",
                "اختر صنف الأشعة..."
            );
        }
    }

    formState.controls.item_code =
        control;

    return control;
}

function er_doctor_order_render_fields(
    type
) {
    const root =
        er_doctor_order_root();

    if (!root) {
        return;
    }

    const fieldsHost =
        root.querySelector(
            "[data-doctor-order-fields]"
        );

    if (!fieldsHost) {
        return;
    }

    fieldsHost.innerHTML = "";

    const formState = {
        type: type || "",
        controls: {}
    };

    state.doctor_order_form =
        formState;

    if (!type) {
        fieldsHost.innerHTML =
            '<div style="grid-column:1/-1;padding:10px;border:1px dashed #d7e0e7;border-radius:7px;color:#7a8792;text-align:center;font-size:12px;">' +
            "اختر نوع الطلب لإظهار الحقول المطلوبة." +
            "</div>";
        return;
    }

    if (type === "دواء") {
        const drugCell =
            document.createElement("div");

        drugCell.innerHTML =
            '<div style="font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">الدواء</div>';

        const drugHost =
            document.createElement("div");

        drugCell.appendChild(drugHost);
        fieldsHost.appendChild(drugCell);

        formState.controls.drug =
            er_doctor_order_make_control(
                drugHost,
                {
                    fieldtype: "Link",
                    fieldname: "drug",
                    options: "Medication",
                    reqd: 1
                }
            );

        er_doctor_order_make_text_field(
            fieldsHost,
            "dose",
            "الجرعة",
            "text"
        );

        formState.controls.dosage_form =
            er_doctor_order_make_link_field(
                fieldsHost,
                "dosage_form",
                "الشكل الدوائي",
                "Dosage Form"
            );

        formState.controls.frequency =
            er_doctor_order_make_link_field(
                fieldsHost,
                "frequency",
                "التكرار",
                "Prescription Dosage"
            );

        formState.controls.duration =
            er_doctor_order_make_link_field(
                fieldsHost,
                "duration",
                "المدة",
                "Prescription Duration"
            );

        er_doctor_order_make_text_field(
            fieldsHost,
            "quantity",
            "الكمية",
            "number",
            "1"
        );

        er_doctor_order_make_textarea(
            fieldsHost,
            "notes",
            "ملاحظات الطبيب"
        );

        er_doctor_order_prepare_horizontal_fields(fieldsHost);
        return;
    }

    if (type === "مختبر") {
        const templateCell =
            document.createElement("div");

        templateCell.innerHTML =
            '<div style="font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">الفحص المخبري</div>';

        const templateHost =
            document.createElement("div");

        templateCell.appendChild(
            templateHost
        );

        fieldsHost.appendChild(
            templateCell
        );

        formState.controls.lab_test_template =
            er_doctor_order_make_control(
                templateHost,
                {
                    fieldtype: "Link",
                    fieldname: "lab_test_template",
                    options: "Lab Test Template",
                    reqd: 1
                }
            );

        er_doctor_order_make_text_field(
            fieldsHost,
            "quantity",
            "كمية الفحص",
            "number",
            "1"
        );

        er_doctor_order_make_textarea(
            fieldsHost,
            "notes",
            "ملاحظات الفحص"
        );

        er_doctor_order_prepare_horizontal_fields(fieldsHost);
        return;
    }

    if (type === "أشعة") {
        er_doctor_order_make_radiology_item_control(
            fieldsHost,
            formState
        );

        er_doctor_order_make_text_field(
            fieldsHost,
            "body_part",
            "منطقة الجسم",
            "text"
        );

        er_doctor_order_make_text_field(
            fieldsHost,
            "quantity",
            "كمية الفحص",
            "number",
            "1"
        );

        er_doctor_order_make_textarea(
            fieldsHost,
            "description",
            "وصف الطبيب"
        );

        er_doctor_order_make_textarea(
            fieldsHost,
            "notes",
            "ملاحظات إضافية"
        );

        er_doctor_order_prepare_horizontal_fields(fieldsHost);
        return;
    }

    if (type === "إجراء") {
        const templateCell =
            document.createElement("div");

        templateCell.innerHTML =
            '<div style="font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">الإجراء الطبي</div>';

        const templateHost =
            document.createElement("div");

        templateCell.appendChild(
            templateHost
        );

        fieldsHost.appendChild(
            templateCell
        );

        formState.controls.procedure_template =
            er_doctor_order_make_control(
                templateHost,
                {
                    fieldtype: "Link",
                    fieldname: "procedure_template",
                    options: "Clinical Procedure Template",
                    reqd: 1
                }
            );

        er_doctor_order_make_text_field(
            fieldsHost,
            "quantity",
            "الكمية",
            "number",
            "1"
        );

        er_doctor_order_make_textarea(
            fieldsHost,
            "notes",
            "ملاحظات الإجراء"
        );

        er_doctor_order_prepare_horizontal_fields(fieldsHost);
        return;
    }

    if (type === "خدمة") {
        const subtypeWrap =
            document.createElement("div");

        subtypeWrap.innerHTML =
            '<label style="display:block;margin:0;">' +
            '<span style="display:block;font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">نوع الخدمة</span>' +
            '<select class="form-control" data-doctor-order-field="service_request_type" style="min-height:38px;">' +
            '<option value="Consultation">استشارة</option>' +
            '<option value="Transfer">تحويل</option>' +
            '<option value="Observation">ملاحظة</option>' +
            '<option value="Discharge">خروج</option>' +
            '</select>' +
            '</label>';

        fieldsHost.appendChild(
            subtypeWrap.firstElementChild
        );

        er_doctor_order_make_text_field(
            fieldsHost,
            "service_item",
            "الخدمة المطلوبة",
            "text"
        );

        const doctorCell =
            document.createElement("div");

        doctorCell.innerHTML =
            '<div style="font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">الطبيب المطلوب</div>';

        const doctorHost =
            document.createElement("div");

        doctorCell.appendChild(
            doctorHost
        );

        fieldsHost.appendChild(
            doctorCell
        );

        formState.controls.service_doctor =
            er_doctor_order_make_control(
                doctorHost,
                {
                    fieldtype: "Link",
                    fieldname: "service_doctor",
                    options: "Healthcare Practitioner"
                },
                state.encounter &&
                state.encounter.practitioner
                    ? state.encounter.practitioner
                    : ""
            );

        const bedCell =
            document.createElement("div");

        bedCell.innerHTML =
            '<div style="font-size:11px;font-weight:700;color:#68737d;margin-bottom:4px;">السرير</div>';

        const bedHost =
            document.createElement("div");

        bedCell.appendChild(
            bedHost
        );

        fieldsHost.appendChild(
            bedCell
        );

        formState.controls.bed =
            er_doctor_order_make_control(
                bedHost,
                {
                    fieldtype: "Link",
                    fieldname: "bed",
                    options: "ER Bed"
                },
                state.intake &&
                state.intake.assigned_bed
                    ? state.intake.assigned_bed
                    : ""
            );

        er_doctor_order_make_textarea(
            fieldsHost,
            "notes",
            "تفاصيل / ملاحظات"
        );
    }


    er_doctor_order_prepare_horizontal_fields(fieldsHost);
}

function er_doctor_order_render_rows() {
    const root =
        er_doctor_order_root();

    if (!root) {
        return;
    }

    const tbody =
        root.querySelector(
            "[data-doctor-order-rows]"
        );

    if (!tbody) {
        return;
    }

    const rows =
        Array.isArray(
            state.doctor_order_rows
        )
            ? state.doctor_order_rows
            : [];

    if (!rows.length) {
        tbody.innerHTML =
            '<tr><td colspan="13" style="text-align:center;color:#84919c;padding:12px;font-size:10px;">لا توجد طلبات مضافة. استخدم أزرار "طلب" أعلاه.</td></tr>';
        return;
    }

    tbody.innerHTML =
        rows.map(function(row, index) {
            const values =
                row.values || {};

            let item = "—";
            let details = "—";

            if (row.type === "دواء") {
                item =
                    values.drug || "—";

                details =
                    values.notes || "—";
            } else if (row.type === "مختبر") {
                item =
                    values.lab_test_template || "—";

                details =
                    values.notes || "—";
            } else if (row.type === "أشعة") {
                item =
                    values.examination_type || "—";

                details =
                    [
                        values.body_part,
                        values.description
                    ]
                        .filter(Boolean)
                        .join(" • ") || "—";
            } else if (row.type === "إجراء") {
                item =
                    values.procedure_template || "—";

                details =
                    values.notes || "—";
            } else if (row.type === "خدمة") {
                item =
                    values.service_item || "خدمة";

                details =
                    values.service_request_type ||
                    "Consultation";
            }

            const is_medication =
                row.type === "دواء";

            const dose =
                is_medication
                    ? (values.dose || "—")
                    : "—";

            const dosage_form =
                is_medication
                    ? (values.dosage_form || "—")
                    : "—";

            const frequency =
                is_medication
                    ? (values.frequency || "—")
                    : "—";

            const duration =
                is_medication
                    ? (values.duration || "—")
                    : "—";

            const quantity =
                values.quantity !== undefined &&
                values.quantity !== null &&
                values.quantity !== ""
                    ? values.quantity
                    : "1";

            const status =
                row.saved
                    ? "تم الإرسال"
                    : "مسودة";

            const statusColor =
                row.saved
                    ? "#2e7d32"
                    : "#806000";

            return (
                "<tr>" +
                '<td style="text-align:center;padding:4px 5px;">' +
                    (index + 1) +
                "</td>" +

                "<td style=\"padding:4px 5px;\">" +
                    esc(row.type) +
                "</td>" +

                "<td style=\"padding:4px 5px;\">" +
                    esc(item) +
                "</td>" +

                "<td style=\"padding:4px 5px;\">" +
                    esc(dose) +
                "</td>" +

                "<td style=\"padding:4px 5px;\">" +
                    esc(dosage_form) +
                "</td>" +

                "<td style=\"padding:4px 5px;\">" +
                    esc(frequency) +
                "</td>" +

                "<td style=\"padding:4px 5px;\">" +
                    esc(duration) +
                "</td>" +

                '<td style="text-align:center;padding:4px 5px;">' +
                    esc(quantity) +
                "</td>" +

                "<td style=\"padding:4px 5px;\">" +
                    esc(details) +
                "</td>" +

                "<td style=\"padding:4px 5px;\">" +
                    esc(
                        row.priority_label ||
                        row.priority ||
                        "Normal"
                    ) +
                "</td>" +

                '<td style="padding:4px 5px;color:' +
                    statusColor +
                    ';font-weight:700;">' +
                    esc(status) +
                    (
                        row.request_name
                            ? "<br><small>" +
                              esc(row.request_name) +
                              "</small>"
                            : ""
                    ) +
                "</td>" +

                '<td style="padding:4px 5px;">' +
                    er_doctor_order_links_html(row) +
                "</td>" +

                '<td style="text-align:center;padding:4px 5px;">' +
                    (
                        row.saved
                            ? "—"
                            : '<button type="button" class="btn btn-xs btn-danger" data-doctor-order-delete="' +
                              esc(row.id) +
                              '">🗑</button>'
                    ) +
                "</td>" +

                "</tr>"
            );
        }).join("");
}

function er_doctor_order_links_html(
    row
) {
    const links =
        Array.isArray(row.request_links)
            ? row.request_links
            : [];

    if (!links.length) {
        return "—";
    }

    return links.map(
        function(link) {
            if (
                !link ||
                !link.name ||
                !link.doctype
            ) {
                return "";
            }

            return (
                '<button type="button" ' +
                'class="btn btn-xs btn-default doctor-order-link" ' +
                'data-doctor-order-link-doctype="' +
                esc(link.doctype) +
                '" ' +
                'data-doctor-order-link-name="' +
                esc(link.name) +
                '" ' +
                'style="display:inline-flex;gap:4px;align-items:center;margin:2px;direction:ltr;">' +
                esc(link.doctype) +
                ' : ' +
                esc(link.name) +
                "</button>"
            );
        }
    ).filter(Boolean).join("<br>");
}

function er_doctor_order_priority_label(
    value
) {
    const map = {
        Normal: "عادي",
        Urgent: "عاجل",
        STAT: "STAT"
    };

    return map[value] || value || "عادي";
}

function er_doctor_order_read_form() {
    const root =
        er_doctor_order_root();

    const formState =
        state.doctor_order_form || {};

    const type =
        String(
            formState.type || ""
        ).trim();

    const priorityInput =
        root &&
        root.querySelector(
            '[data-doctor-order-input="priority"]'
        );

    const priority =
        priorityInput
            ? priorityInput.value || "Normal"
            : "Normal";

    const values = {};

    if (type === "دواء") {
        values.drug =
            er_doctor_order_input_value(
                formState,
                "drug"
            );

        values.dose =
            er_doctor_order_input_value(
                formState,
                "dose"
            );

        values.dosage_form =
            er_doctor_order_input_value(
                formState,
                "dosage_form"
            );

        values.frequency =
            er_doctor_order_input_value(
                formState,
                "frequency"
            );

        values.duration =
            er_doctor_order_input_value(
                formState,
                "duration"
            );

        values.quantity =
            parseFloat(
                er_doctor_order_input_value(
                    formState,
                    "quantity"
                )
            ) || 0;

        values.notes =
            er_doctor_order_input_value(
                formState,
                "notes"
            );
    }

    if (type === "مختبر") {
        values.lab_test_template =
            er_doctor_order_input_value(
                formState,
                "lab_test_template"
            );

        values.quantity =
            parseFloat(
                er_doctor_order_input_value(
                    formState,
                    "quantity"
                )
            ) || 0;

        values.notes =
            er_doctor_order_input_value(
                formState,
                "notes"
            );
    }

    if (type === "أشعة") {
        values.item_code =
            er_doctor_order_input_value(
                formState,
                "item_code"
            );

        /*
         * يبقى examination_type للتوافق مع
         * التحقق القديم، بينما المصدر الحقيقي
         * للطلب هو Item / item_code.
         */
        values.examination_type =
            values.item_code || "";

        values.body_part =
            er_doctor_order_input_value(
                formState,
                "body_part"
            );

        values.quantity =
            parseFloat(
                er_doctor_order_input_value(
                    formState,
                    "quantity"
                )
            ) || 0;

        values.description =
            er_doctor_order_input_value(
                formState,
                "description"
            );

        values.notes =
            er_doctor_order_input_value(
                formState,
                "notes"
            );
    }

    if (type === "إجراء") {
        values.procedure_template =
            er_doctor_order_input_value(
                formState,
                "procedure_template"
            );

        values.quantity =
            parseFloat(
                er_doctor_order_input_value(
                    formState,
                    "quantity"
                )
            ) || 0;

        values.notes =
            er_doctor_order_input_value(
                formState,
                "notes"
            );
    }

    if (type === "خدمة") {
        values.service_request_type =
            er_doctor_order_input_value(
                formState,
                "service_request_type"
            ) || "Consultation";

        values.service_item =
            er_doctor_order_input_value(
                formState,
                "service_item"
            );

        values.service_doctor =
            er_doctor_order_input_value(
                formState,
                "service_doctor"
            );

        values.bed =
            er_doctor_order_input_value(
                formState,
                "bed"
            );

        values.notes =
            er_doctor_order_input_value(
                formState,
                "notes"
            );
    }

    return {
        type: type,
        priority: priority,
        priority_label:
            er_doctor_order_priority_label(
                priority
            ),
        values: values
    };
}

function er_doctor_order_validate_row(
    row
) {
    if (!row.type) {
        return "اختر نوع الطلب.";
    }

    if (row.type === "دواء") {
        if (!row.values.drug) {
            return "اختر الدواء.";
        }

        if (
            !row.values.quantity ||
            row.values.quantity <= 0
        ) {
            return "كمية الدواء يجب أن تكون أكبر من صفر.";
        }
    }

    if (row.type === "مختبر") {
        if (!row.values.lab_test_template) {
            return "اختر الفحص المخبري.";
        }

        if (
            !row.values.quantity ||
            row.values.quantity <= 0
        ) {
            return "كمية الفحص يجب أن تكون أكبر من صفر.";
        }
    }

    if (row.type === "أشعة") {
        if (!row.values.examination_type) {
            return "أدخل نوع الأشعة.";
        }

        if (!row.values.body_part) {
            return "أدخل منطقة الجسم.";
        }

        if (
            !row.values.quantity ||
            row.values.quantity <= 0
        ) {
            return "كمية الفحص يجب أن تكون أكبر من صفر.";
        }
    }

    if (row.type === "إجراء") {
        if (!row.values.procedure_template) {
            return "اختر الإجراء الطبي.";
        }

        if (
            !row.values.quantity ||
            row.values.quantity <= 0
        ) {
            return "كمية الإجراء يجب أن تكون أكبر من صفر.";
        }
    }

    if (row.type === "خدمة") {
        if (
            !row.values.service_request_type
        ) {
            return "اختر نوع الخدمة.";
        }
    }

    return "";
}

async function er_doctor_order_save_all() {
    const root =
        er_doctor_order_root();

    const encounter =
        er_doctor_order_encounter();

    if (!encounter) {
        frappe.show_alert({
            message:
                "لا توجد زيارة طبية محددة.",
            indicator: "red"
        });
        return;
    }

    const rows =
        (
            Array.isArray(
                state.doctor_order_rows
            )
                ? state.doctor_order_rows
                : []
        ).filter(function(row) {
            return !row.saved;
        });

    if (!rows.length) {
        frappe.show_alert({
            message:
                "لا توجد طلبات جديدة للحفظ.",
            indicator: "orange"
        });
        return;
    }

    const saveButton =
        root &&
        root.querySelector(
            "[data-doctor-order-save]"
        );

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent =
            "⏳ جاري حفظ الطلبات...";
    }

    try {
        const medicationRows =
            rows.filter(function(row) {
                return row.type === "دواء";
            });

        if (medicationRows.length) {
            const result =
                await call(
                    "custom_app.emergency_management.api.medications.create_medication_requests",
                    {
                        encounter: encounter,
                        medications:
                            JSON.stringify(
                                medicationRows.map(
                                    function(row) {
                                        return {
                                            drug:
                                                row.values.drug,

                                            dose:
                                                row.values.dose,

                                            dosage_form:
                                                row.values.dosage_form,

                                            frequency:
                                                row.values.frequency,

                                            duration:
                                                row.values.duration,

                                            quantity:
                                                row.values.quantity,

                                            priority:
                                                row.priority,

                                            order_description:
                                                row.values.notes
                                        };
                                    }
                                )
                            )
                    }
                );

            const created =
                result &&
                Array.isArray(result.requests)
                    ? result.requests
                    : [];

            medicationRows.forEach(
                function(row, index) {
                    const item =
                        created[index];

                    row.saved = true;

                    row.request_name =
                        item &&
                        (
                            item.name ||
                            item.request_number
                        )
                            ? (
                                item.name ||
                                item.request_number
                            )
                            : "Medication Request";

                    row.request_links = [];

                    if (
                        item &&
                        item.name
                    ) {
                        row.request_links.push({
                            doctype:
                                "Medication Request",
                            name:
                                item.name
                        });
                    }
                }
            );
        }

        for (
            let index = 0;
            index < rows.length;
            index++
        ) {
            const row = rows[index];

            if (row.saved) {
                continue;
            }

            if (row.type === "مختبر") {
                const result =
                    await call(
                        "frappe.client.get_value",
                        {
                            doctype:
                                "Lab Test Template",

                            filters: {
                                name:
                                    row.values.lab_test_template
                            },

                            fieldname:
                                "item"
                        }
                    );

                const item =
                    result &&
                    result.item
                        ? String(
                            result.item
                        ).trim()
                        : "";

                if (!item) {
                    throw new Error(
                        "الفحص المخبري لا يحتوي على Item مرتبط."
                    );
                }

                const created =
                    await call(
                        "custom_app.emergency_management.page.er_visit_console.python.labs.labs.create_lab_request",
                        {
                            data:
                                JSON.stringify({
                                    encounter:
                                        encounter,

                                    test_name:
                                        row.values.lab_test_template,

                                    item_code:
                                        item,

                                    quantity:
                                        row.values.quantity,

                                    notes:
                                        row.values.notes
                                })
                        }
                    );

                row.saved = true;

                row.request_name =
                    created &&
                    (
                        created.request_number ||
                        created.name
                    )
                        ? (
                            created.request_number ||
                            created.name
                        )
                        : "ER Diagnostic Request";
            }

            if (row.type === "أشعة") {
                const created =
                    await call(
                        "custom_app.emergency_management.page.er_visit_console.python.radiology.radiology.create_radiology_examination",
                        {
                            data:
                                JSON.stringify({
                                    encounter:
                                        encounter,

                                    examination_type:
                                        row.values.examination_type,

                                    item_code:
                                        row.values.item_code,

                                    body_part:
                                        row.values.body_part,

                                    quantity:
                                        row.values.quantity,

                                    description:
                                        row.values.description ||
                                        row.values.notes
                                })
                        }
                    );

                row.saved = true;

                row.request_name =
                    created &&
                    (
                        created.request_number ||
                        created.name ||
                        created.diagnostic_request
                    )
                        ? (
                            created.request_number ||
                            created.name ||
                            created.diagnostic_request
                        )
                        : "ER Diagnostic Request";

                row.request_links = [];

                if (
                    created &&
                    created.diagnostic_request
                ) {
                    row.request_links.push({
                        doctype:
                            "ER Diagnostic Request",
                        name:
                            created.diagnostic_request
                    });
                }

                if (
                    created &&
                    (
                        created.radiology_examination ||
                        created.radiology
                    )
                ) {
                    row.request_links.push({
                        doctype:
                            "Radiology Examination",
                        name:
                            created.radiology_examination ||
                            created.radiology
                    });
                }
            }

            if (row.type === "إجراء") {
                const created =
                    await call(
                        "custom_app.emergency_management.page.er_visit_console.python.procedure.create_clinical_procedure",
                        {
                            data:
                                JSON.stringify({
                                    encounter:
                                        encounter,

                                    procedure_template:
                                        row.values.procedure_template,

                                    quantity:
                                        row.values.quantity,

                                    notes:
                                        row.values.notes
                                })
                        }
                    );

                row.saved = true;

                row.request_name =
                    created &&
                    (
                        created.request_number ||
                        created.name
                    )
                        ? (
                            created.request_number ||
                            created.name
                        )
                        : "Clinical Procedure";
            }

            if (row.type === "خدمة") {
                const created =
                    await call(
                        "custom_app.emergency_management.api.service_requests.create_service_request",
                        {
                            data: {
                                patient:
                                    er_doctor_order_patient(),

                                er_patient_intake:
                                    state.intake &&
                                    state.intake.name
                                        ? state.intake.name
                                        : null,

                                bed:
                                    row.values.bed ||
                                    (
                                        state.intake &&
                                        state.intake.assigned_bed
                                            ? state.intake.assigned_bed
                                            : null
                                    ),

                                request_type:
                                    row.values.service_request_type,

                                requested_by:
                                    frappe.session.user,

                                doctor:
                                    row.values.service_doctor ||
                                    (
                                        state.encounter &&
                                        state.encounter.practitioner
                                            ? state.encounter.practitioner
                                            : null
                                    ),

                                priority:
                                    row.priority,

                                notes:
                                    row.values.notes,

                                service_item:
                                    row.values.service_item ||
                                    null,

                                transfer_mode:
                                    null,

                                requested_department:
                                    null,

                                requested_service_unit_type:
                                    null,

                                expected_length_of_stay:
                                    null,

                                admission_reason:
                                    null
                            }
                        }
                    );

                row.saved = true;

                row.request_name =
                    created &&
                    (
                        created.request_number ||
                        created.name
                    )
                        ? (
                            created.request_number ||
                            created.name
                        )
                        : "ER Patient Service Request";
            }
        }

        er_doctor_order_render_rows();

        frappe.show_alert({
            message:
                "تم حفظ الطلبات وربطها بالمسارات الطبية المختصة.",
            indicator: "green"
        });

        if (
            typeof load_medication_requests ===
            "function"
        ) {
            load_medication_requests();
        }

        if (
            typeof load_lab_requests ===
            "function"
        ) {
            load_lab_requests();
        }

        if (
            typeof load_radiology_requests ===
            "function"
        ) {
            load_radiology_requests();
        }

        if (
            typeof load_procedure_requests ===
            "function"
        ) {
            load_procedure_requests();
        }

        if (
            typeof load_er_service_requests ===
            "function"
        ) {
            load_er_service_requests();
        }

    } catch (error) {
        console.error(
            "ER DOCTOR INLINE ORDER SAVE ERROR:",
            error
        );

        frappe.show_alert({
            message:
                error &&
                error.message
                    ? error.message
                    : "تعذر حفظ الطلبات.",
            indicator: "red"
        });
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
                "💾 حفظ الطلبات";
        }
    }
}

function er_doctor_inline_order_editor(
    initial_ui_type
) {
    const root =
        er_doctor_order_root();

    if (!root) {
        return;
    }

    if (
        !Array.isArray(
            state.doctor_order_rows
        )
    ) {
        state.doctor_order_rows = [];
    }

    const editor =
        root.querySelector(
            "[data-doctor-order-editor]"
        );

    if (!editor) {
        return;
    }

    const encounter =
        er_doctor_order_encounter();

    const patient =
        er_doctor_order_patient();

    const patientHost =
        editor.querySelector(
            "[data-doctor-order-context-patient]"
        );

    if (patientHost) {
        patientHost.textContent =
            patient || "—";
    }

    const encounterHost =
        editor.querySelector(
            "[data-doctor-order-context-encounter]"
        );

    if (encounterHost) {
        encounterHost.textContent =
            encounter || "—";
    }

    const select =
        editor.querySelector(
            "[data-doctor-order-type-select]"
        );

    if (select && initial_ui_type) {
        select.value =
            initial_ui_type;
    }

    if (select) {
        select.onchange =
            function() {
                er_doctor_order_render_fields(
                    select.value || ""
                );
            };
    }

    const addButton =
        editor.querySelector(
            "[data-doctor-order-add]"
        );

    if (addButton) {
        addButton.onclick =
            function() {
                const draft =
                    er_doctor_order_read_form();

                const error =
                    er_doctor_order_validate_row(
                        draft
                    );

                if (error) {
                    frappe.show_alert({
                        message: error,
                        indicator: "orange"
                    });
                    return;
                }

                draft.id =
                    "ORD-" +
                    String(
                        Date.now()
                    ) +
                    "-" +
                    String(
                        state.doctor_order_rows.length +
                        1
                    );

                draft.encounter =
                    encounter;

                draft.saved =
                    false;

                state.doctor_order_rows.push(
                    draft
                );

                er_doctor_order_render_rows();

                frappe.show_alert({
                    message:
                        "تمت إضافة الطلب إلى الجدول.",
                    indicator: "green"
                });
            };
    }

    er_doctor_order_render_fields(
        select
            ? select.value || ""
            : ""
    );

    er_doctor_order_render_rows();
}

function er_doctor_open_service_doctype(initial_ui_type) {
    er_doctor_inline_order_editor(
        initial_ui_type || ""
    );

    return;


    const e = state.encounter || {};
    const i = state.intake || {};

    const patient = e.patient || i.patient || "";
    const intake = i.name || e.er_patient_intake || "";
    const doctor = e.practitioner || "";
    const bed = i.assigned_bed || "";

    if (!patient) {
        frappe.msgprint({
            title: __("الخدمات"),
            message: __("تعذر تحديد المريض من الزيارة الحالية."),
            indicator: "red",
        });
        return;
    }

    const TYPE_MAP = {
        "مختبر": "Laboratory",
        "أشعة": "Radiology",
        "دواء": "Medication",
        "إجراء": "Procedure",
        "استشارة": "Consultation",
        "تحويل": "Transfer",
        "ملاحظة": "Observation",
        "خروج": "Discharge",
    };

    const TYPE_LABELS = {
        Laboratory: "مختبر",
        Radiology: "أشعة",
        Medication: "دواء",
        Procedure: "إجراء",
        Consultation: "استشارة",
        Transfer: "تحويل",
        Observation: "ملاحظة",
        Discharge: "خروج",
    };

    const dialog = new frappe.ui.Dialog({
        title: __("طلب خدمة"),
        size: "large",
        fields: [
            {
                fieldname: "visit_section",
                fieldtype: "Section Break",
                label: __("بيانات الزيارة"),
            },
            {
                fieldname: "patient",
                fieldtype: "Link",
                options: "Patient",
                label: __("المريض"),
                default: patient,
                read_only: 1,
            },
            {
                fieldname: "er_patient_intake",
                fieldtype: "Link",
                options: "ER Patient Intake",
                label: __("زيارة الطوارئ"),
                default: intake,
                read_only: 1,
            },
            {
                fieldname: "visit_col",
                fieldtype: "Column Break",
            },
            {
                fieldname: "doctor_context",
                fieldtype: "Link",
                options: "Healthcare Practitioner",
                label: __("طبيب الزيارة"),
                default: doctor,
                read_only: 1,
            },
            {
                fieldname: "bed_context",
                fieldtype: "Link",
                options: "ER Bed",
                label: __("السرير الحالي"),
                default: bed,
                read_only: 1,
            },

            {
                fieldname: "request_section",
                fieldtype: "Section Break",
                label: __("تفاصيل الطلب"),
            },
            {
                fieldname: "request_type",
                fieldtype: "Select",
                label: __("نوع الطلب"),
                options: [
                    "",
                    "مختبر",
                    "أشعة",
                    "دواء",
                    "إجراء",
                    "استشارة",
                    "تحويل",
                    "ملاحظة",
                    "خروج",
                ].join("\n"),
                reqd: 1,
            },
            {
                fieldname: "priority",
                fieldtype: "Select",
                label: __("الأولوية"),
                options: [
                    "Normal",
                    "Urgent",
                    "STAT",
                ].join("\n"),
                default: "Normal",
                reqd: 1,
            },
            {
                fieldname: "request_col",
                fieldtype: "Column Break",
            },
            {
                fieldname: "status",
                fieldtype: "Select",
                label: __("الحالة"),
                options: [
                    "Pending",
                    "Approved",
                    "In Progress",
                    "Completed",
                    "Cancelled",
                ].join("\n"),
                default: "Pending",
                read_only: 1,
            },

            {
                fieldname: "dynamic_section",
                fieldtype: "Section Break",
                label: __("بيانات الخدمة"),
            },
            {
                fieldname: "service_item",
                fieldtype: "Data",
                label: __("الخدمة المطلوبة"),
            },
            {
                fieldname: "doctor",
                fieldtype: "Link",
                options: "Healthcare Practitioner",
                label: __("الطبيب المطلوب"),
                default: doctor,
            },
            {
                fieldname: "dynamic_col",
                fieldtype: "Column Break",
            },
            {
                fieldname: "bed",
                fieldtype: "Link",
                options: "ER Bed",
                label: __("السرير"),
                default: bed,
            },
            {
                fieldname: "assigned_to",
                fieldtype: "Link",
                options: "User",
                label: __("المكلف بالتنفيذ"),
            },

            {
                fieldname: "medication_drug",
                fieldtype: "Link",
                options: "Medication",
                label: __("الدواء"),
            },
            {
                fieldname: "medication_dose",
                fieldtype: "Data",
                label: __("الجرعة"),
            },
            {
                fieldname: "medication_dosage_form",
                fieldtype: "Data",
                label: __("الشكل الدوائي"),
            },
            {
                fieldname: "medication_frequency",
                fieldtype: "Data",
                label: __("التكرار"),
            },
            {
                fieldname: "medication_duration",
                fieldtype: "Data",
                label: __("المدة"),
            },
            {
                fieldname: "medication_quantity",
                fieldtype: "Float",
                label: __("الكمية"),
                default: 1,
            },

            {
                fieldname: "lab_test_template",
                fieldtype: "Link",
                options: "Lab Test Template",
                label: __("الفحص المخبري"),
            },
            {
                fieldname: "lab_quantity",
                fieldtype: "Float",
                label: __("كمية الفحص"),
                default: 1,
            },

            {
                fieldname: "radiology_examination_type",
                fieldtype: "Data",
                label: __("نوع الأشعة"),
            },
            {
                fieldname: "radiology_body_part",
                fieldtype: "Data",
                label: __("منطقة الجسم"),
            },
            {
                fieldname: "radiology_quantity",
                fieldtype: "Float",
                label: __("كمية الفحص"),
                default: 1,
            },
            {
                fieldname: "radiology_description",
                fieldtype: "Small Text",
                label: __("وصف الطبيب"),
            },

            {
                fieldname: "procedure_template",
                fieldtype: "Link",
                options: "Clinical Procedure Template",
                label: __("الإجراء الطبي"),
            },
            {
                fieldname: "procedure_quantity",
                fieldtype: "Float",
                label: __("الكمية"),
                default: 1,
            },

            {
                fieldname: "notes_section",
                fieldtype: "Section Break",
                label: __("ملاحظات الطلب"),
            },
            {
                fieldname: "notes",
                fieldtype: "Small Text",
                label: __("التفاصيل / الملاحظات"),
            },
            {
                fieldname: "system_section",
                fieldtype: "Section Break",
                label: __("بيانات النظام"),
            },
            {
                fieldname: "requested_by",
                fieldtype: "Link",
                options: "User",
                label: __("طلب بواسطة"),
                default: frappe.session.user,
                read_only: 1,
            },
            {
                fieldname: "requested_datetime",
                fieldtype: "Datetime",
                label: __("وقت الطلب"),
                default: frappe.datetime.now_datetime(),
                read_only: 1,
            },
        ],

        primary_action_label: __("حفظ الطلب"),

        primary_action(values) {
            const ui_type =
                String(values.request_type || "").trim();

            const request_type =
                TYPE_MAP[ui_type] || "";

            if (!request_type) {
                frappe.msgprint({
                    title: __("طلب طبي"),
                    message: __("يجب اختيار نوع الطلب."),
                    indicator: "red",
                });
                return;
            }

            const encounter_name =
                (
                    typeof state !== "undefined" &&
                    state &&
                    state.encounter &&
                    state.encounter.name
                )
                    ? state.encounter.name
                    : (
                        typeof current_encounter !== "undefined"
                            ? current_encounter
                            : ""
                    );

            if (!encounter_name) {
                frappe.msgprint({
                    title: __("طلب طبي"),
                    message: __("لا توجد زيارة طبية محددة."),
                    indicator: "red",
                });
                return;
            }

            const priority =
                values.priority || "Normal";

            const notes =
                String(values.notes || "").trim();

            function finish_success(label, name) {
                dialog.hide();

                frappe.show_alert({
                    message:
                        label +
                        (name ? " : " + name : ""),
                    indicator: "green",
                });

                console.info(
                    "ER DOCTOR REQUEST CREATED:",
                    request_type,
                    name || ""
                );
            }

            function finish_error(title, message) {
                frappe.msgprint({
                    title: title,
                    message:
                        message ||
                        __("تعذر إنشاء الطلب."),
                    indicator: "red",
                });
            }

            /* =================================================
               دواء → Medication Request
               ================================================= */
            if (request_type === "Medication") {
                const drug =
                    String(values.medication_drug || "").trim();

                const dose =
                    String(values.medication_dose || "").trim();

                const dosage_form =
                    String(
                        values.medication_dosage_form || ""
                    ).trim();

                const frequency =
                    String(
                        values.medication_frequency || ""
                    ).trim();

                const duration =
                    String(
                        values.medication_duration || ""
                    ).trim();

                const quantity =
                    parseFloat(
                        values.medication_quantity
                    ) || 0;

                if (!drug) {
                    finish_error(
                        __("الأدوية"),
                        __("اختر الدواء.")
                    );
                    return;
                }

                if (quantity <= 0) {
                    finish_error(
                        __("الأدوية"),
                        __("كمية الدواء يجب أن تكون أكبر من صفر.")
                    );
                    return;
                }

                frappe.call({
                    method:
                        "custom_app.emergency_management.api.medications.create_medication_requests",

                    args: {
                        encounter:
                            encounter_name,

                        medications:
                            JSON.stringify([
                                {
                                    drug: drug,
                                    dose: dose,
                                    dosage_form: dosage_form,
                                    frequency: frequency,
                                    duration: duration,
                                    quantity: quantity,
                                    priority: priority,
                                    order_description: notes,
                                }
                            ]),
                    },

                    freeze: true,

                    freeze_message:
                        __("جاري إنشاء طلب الدواء..."),

                    callback(r) {
                        if (
                            r.exc ||
                            !r.message ||
                            r.message.success === false
                        ) {
                            finish_error(
                                __("الأدوية"),
                                __("تعذر إنشاء طلب الدواء.")
                            );
                            return;
                        }

                        const requests =
                            r.message.requests || [];

                        const name =
                            requests[0] &&
                            (
                                requests[0].name ||
                                requests[0].request_number
                            );

                        finish_success(
                            __("تم إنشاء طلب الدواء"),
                            name
                        );

                        if (
                            typeof load_medication_requests ===
                            "function"
                        ) {
                            load_medication_requests();
                        }
                    },

                    error(err) {
                        console.error(
                            "ER DOCTOR MEDICATION REQUEST ERROR:",
                            err
                        );

                        finish_error(
                            __("الأدوية"),
                            err &&
                            err.message
                                ? err.message
                                : __("تعذر إنشاء طلب الدواء.")
                        );
                    },
                });

                return;
            }

            /* =================================================
               مختبر → ER Diagnostic Request + Lab Test
               ================================================= */
            if (request_type === "Laboratory") {
                const template =
                    String(
                        values.lab_test_template || ""
                    ).trim();

                const quantity =
                    parseFloat(
                        values.lab_quantity
                    ) || 0;

                if (!template) {
                    finish_error(
                        __("المختبر"),
                        __("اختر الفحص المخبري.")
                    );
                    return;
                }

                if (quantity <= 0) {
                    finish_error(
                        __("المختبر"),
                        __("كمية الفحص يجب أن تكون أكبر من صفر.")
                    );
                    return;
                }

                frappe.db.get_value(
                    "Lab Test Template",
                    template,
                    "item"
                ).then(function(result) {
                    const item =
                        result &&
                        result.message &&
                        result.message.item
                            ? String(
                                result.message.item
                            ).trim()
                            : "";

                    if (!item) {
                        throw new Error(
                            "الفحص المحدد لا يحتوي على Item مرتبط."
                        );
                    }

                    frappe.call({
                        method:
                            "custom_app.emergency_management.page.er_visit_console.python.labs.labs.create_lab_request",

                        args: {
                            data:
                                JSON.stringify({
                                    encounter:
                                        encounter_name,

                                    test_name:
                                        template,

                                    item_code:
                                        item,

                                    quantity:
                                        quantity,

                                    notes:
                                        notes,
                                }),
                        },

                        freeze: true,

                        freeze_message:
                            __("جاري إنشاء طلب المختبر..."),

                        callback(r) {
                            if (
                                r.exc ||
                                !r.message
                            ) {
                                finish_error(
                                    __("المختبر"),
                                    __("تعذر إنشاء طلب المختبر.")
                                );
                                return;
                            }

                            const name =
                                r.message.request_number ||
                                r.message.name ||
                                "";

                            finish_success(
                                __("تم إنشاء طلب المختبر"),
                                name
                            );

                            if (
                                typeof load_lab_requests ===
                                "function"
                            ) {
                                load_lab_requests();
                            }
                        },

                        error(err) {
                            console.error(
                                "ER DOCTOR LAB REQUEST ERROR:",
                                err
                            );

                            finish_error(
                                __("المختبر"),
                                err &&
                                err.message
                                    ? err.message
                                    : __("تعذر إنشاء طلب المختبر.")
                            );
                        },
                    });
                }).catch(function(err) {
                    console.error(
                        "ER DOCTOR LAB ITEM ERROR:",
                        err
                    );

                    finish_error(
                        __("المختبر"),
                        err &&
                        err.message
                            ? err.message
                            : __("تعذر تحديد Item المرتبط بالفحص.")
                    );
                });

                return;
            }

            /* =================================================
               أشعة → ER Diagnostic Request + Radiology Examination
               ================================================= */
            if (request_type === "Radiology") {
                const examination_type =
                    String(
                        values.radiology_examination_type || ""
                    ).trim();

                const body_part =
                    String(
                        values.radiology_body_part || ""
                    ).trim();

                const quantity =
                    parseFloat(
                        values.radiology_quantity
                    ) || 0;

                const description =
                    String(
                        values.radiology_description || ""
                    ).trim();

                if (!examination_type) {
                    finish_error(
                        __("الأشعة"),
                        __("أدخل نوع الأشعة.")
                    );
                    return;
                }

                if (!body_part) {
                    finish_error(
                        __("الأشعة"),
                        __("أدخل منطقة الجسم.")
                    );
                    return;
                }

                if (quantity <= 0) {
                    finish_error(
                        __("الأشعة"),
                        __("كمية الفحص يجب أن تكون أكبر من صفر.")
                    );
                    return;
                }

                frappe.call({
                    method:
                        "custom_app.emergency_management.page.er_visit_console.python.radiology.radiology.create_radiology_examination",

                    args: {
                        data:
                            JSON.stringify({
                                encounter:
                                    encounter_name,

                                examination_type:
                                    examination_type,

                                body_part:
                                    body_part,

                                quantity:
                                    quantity,

                                description:
                                    description ||
                                    notes,
                            }),
                    },

                    freeze: true,

                    freeze_message:
                        __("جاري إنشاء طلب الأشعة..."),

                    callback(r) {
                        if (
                            r.exc ||
                            !r.message
                        ) {
                            finish_error(
                                __("الأشعة"),
                                __("تعذر إنشاء طلب الأشعة.")
                            );
                            return;
                        }

                        const name =
                            r.message.request_number ||
                            r.message.name ||
                            "";

                        finish_success(
                            __("تم إنشاء طلب الأشعة"),
                            name
                        );

                        if (
                            typeof load_radiology_requests ===
                            "function"
                        ) {
                            load_radiology_requests();
                        }
                    },

                    error(err) {
                        console.error(
                            "ER DOCTOR RADIOLOGY REQUEST ERROR:",
                            err
                        );

                        finish_error(
                            __("الأشعة"),
                            err &&
                            err.message
                                ? err.message
                                : __("تعذر إنشاء طلب الأشعة.")
                        );
                    },
                });

                return;
            }

            /* =================================================
               إجراء → Clinical Procedure
               ================================================= */
            if (request_type === "Procedure") {
                const procedure_template =
                    String(
                        values.procedure_template || ""
                    ).trim();

                const quantity =
                    parseFloat(
                        values.procedure_quantity
                    ) || 0;

                if (!procedure_template) {
                    finish_error(
                        __("الإجراءات"),
                        __("اختر الإجراء الطبي.")
                    );
                    return;
                }

                if (quantity <= 0) {
                    finish_error(
                        __("الإجراءات"),
                        __("كمية الإجراء يجب أن تكون أكبر من صفر.")
                    );
                    return;
                }

                frappe.call({
                    method:
                        "custom_app.emergency_management.page.er_visit_console.python.procedure.create_clinical_procedure",

                    args: {
                        data:
                            JSON.stringify({
                                encounter:
                                    encounter_name,

                                procedure_template:
                                    procedure_template,

                                quantity:
                                    quantity,

                                notes:
                                    notes,
                            }),
                    },

                    freeze: true,

                    freeze_message:
                        __("جاري إنشاء طلب الإجراء..."),

                    callback(r) {
                        if (
                            r.exc ||
                            !r.message ||
                            !r.message.request_number
                        ) {
                            finish_error(
                                __("الإجراءات"),
                                __("تعذر إنشاء طلب الإجراء.")
                            );
                            return;
                        }

                        finish_success(
                            __("تم إنشاء طلب الإجراء"),
                            r.message.request_number
                        );

                        if (
                            typeof load_procedure_requests ===
                            "function"
                        ) {
                            load_procedure_requests();
                        }
                    },

                    error(err) {
                        console.error(
                            "ER DOCTOR PROCEDURE REQUEST ERROR:",
                            err
                        );

                        finish_error(
                            __("الإجراءات"),
                            err &&
                            err.message
                                ? err.message
                                : __("تعذر إنشاء طلب الإجراء.")
                        );
                    },
                });

                return;
            }

            /* =================================================
               الخدمات التشغيلية الموجودة أصلًا
               Consultation / Transfer / Observation / Discharge
               ================================================= */
            if (
                request_type === "Consultation" ||
                request_type === "Transfer" ||
                request_type === "Observation" ||
                request_type === "Discharge"
            ) {
                frappe.call({
                    method:
                        "custom_app.emergency_management.api.service_requests.create_service_request",

                    args: {
                        data: {
                            patient:
                                patient,

                            er_patient_intake:
                                intake || null,

                            bed:
                                values.bed ||
                                bed ||
                                null,

                            request_type:
                                request_type,

                            requested_by:
                                frappe.session.user,

                            doctor:
                                values.doctor ||
                                doctor ||
                                null,

                            priority:
                                priority,

                            notes:
                                notes,

                            service_item:
                                values.service_item
                                    ? String(
                                        values.service_item
                                    ).trim()
                                    : null,

                            transfer_mode:
                                null,

                            requested_department:
                                null,

                            requested_service_unit_type:
                                null,

                            expected_length_of_stay:
                                null,

                            admission_reason:
                                null,
                        },
                    },

                    freeze: true,

                    freeze_message:
                        __("جاري إنشاء طلب الخدمة..."),

                    callback(r) {
                        if (
                            r.exc ||
                            !r.message ||
                            r.message.success === false
                        ) {
                            finish_error(
                                __("الخدمات"),
                                __("تعذر إنشاء طلب الخدمة.")
                            );
                            return;
                        }

                        finish_success(
                            __("تم إنشاء طلب الخدمة"),
                            r.message.request_number ||
                            r.message.name ||
                            ""
                        );

                        if (
                            typeof load_er_service_requests ===
                            "function"
                        ) {
                            load_er_service_requests();
                        }
                    },

                    error(err) {
                        console.error(
                            "ER DOCTOR SERVICE REQUEST ERROR:",
                            err
                        );

                        finish_error(
                            __("الخدمات"),
                            err &&
                            err.message
                                ? err.message
                                : __("تعذر إنشاء طلب الخدمة.")
                        );
                    },
                });

                return;
            }

            finish_error(
                __("طلب طبي"),
                __("نوع الطلب المحدد لا يملك مسار إنشاء مرتبطًا.")
            );
        },
    });

    function set_visible(fieldname, visible) {
        const field =
            dialog.fields_dict[fieldname];

        if (!field) {
            return;
        }

        dialog.set_df_property(
            fieldname,
            "hidden",
            !visible
        );
    }

    function set_label(fieldname, label) {
        const field =
            dialog.fields_dict[fieldname];

        if (!field) {
            return;
        }

        dialog.set_df_property(
            fieldname,
            "label",
            label
        );
    }

    function update_service_layout() {
        const ui_type =
            String(
                dialog.get_value("request_type") || ""
            ).trim();

        const request_type =
            TYPE_MAP[ui_type] || "";

        const is_diagnostic =
            request_type === "Laboratory" ||
            request_type === "Radiology";

        const is_medication =
            request_type === "Medication";

        const is_consultation =
            request_type === "Consultation";

        const is_transfer =
            request_type === "Transfer";

        const is_observation =
            request_type === "Observation";

        const is_discharge =
            request_type === "Discharge";

        const has_type = !!request_type;

        const is_procedure =
            request_type === "Procedure";

        /*
         * حقول الطلبات الطبية المتخصصة:
         * كل نافذة في النظام تملك نموذج تنفيذها
         * ونطلب هنا فقط البيانات اللازمة لإنشاء
         * السجل الذي تلتقطه تلك النافذة.
         */
        set_visible(
            "medication_drug",
            is_medication
        );

        set_visible(
            "medication_dose",
            is_medication
        );

        set_visible(
            "medication_dosage_form",
            is_medication
        );

        set_visible(
            "medication_frequency",
            is_medication
        );

        set_visible(
            "medication_duration",
            is_medication
        );

        set_visible(
            "medication_quantity",
            is_medication
        );

        set_visible(
            "lab_test_template",
            request_type === "Laboratory"
        );

        set_visible(
            "lab_quantity",
            request_type === "Laboratory"
        );

        set_visible(
            "radiology_examination_type",
            request_type === "Radiology"
        );

        set_visible(
            "radiology_body_part",
            request_type === "Radiology"
        );

        set_visible(
            "radiology_quantity",
            request_type === "Radiology"
        );

        set_visible(
            "radiology_description",
            request_type === "Radiology"
        );

        set_visible(
            "procedure_template",
            is_procedure
        );

        set_visible(
            "procedure_quantity",
            is_procedure
        );

        /*
         * الخدمة المطلوبة:
         * Consultation / Transfer فقط.
         */
        set_visible(
            "service_item",
            is_consultation ||
            is_transfer
        );

        /*
         * الطبيب يظهر فقط في الاستشارة.
         */
        set_visible(
            "doctor",
            is_consultation
        );

        /*
         * السرير مطلوب بصريًا للعمليات المرتبطة
         * بالملاحظة أو التحويل أو الخروج.
         */
        set_visible(
            "bed",
            is_transfer ||
            is_observation ||
            is_discharge
        );

        /*
         * المكلف بالتنفيذ للطلبات التشغيلية.
         */
        set_visible(
            "assigned_to",
            has_type
        );

        /*
         * الملاحظات والأولوية دائمًا جزء من الطلب.
         */
        set_visible(
            "notes",
            true
        );

        /*
         * تعديل عنوان service_item حسب نوع الطلب.
         */
        if (is_transfer) {
            set_label(
                "service_item",
                __("جهة / خدمة التحويل")
            );
        } else if (is_consultation) {
            set_label(
                "service_item",
                __("التخصص / الخدمة الاستشارية")
            );
        } else if (is_diagnostic) {
            set_label(
                "service_item",
                __("الفحص / الخدمة المطلوبة")
            );
        } else if (is_medication) {
            set_label(
                "service_item",
                __("الخدمة الدوائية المطلوبة")
            );
        } else if (is_procedure) {
            set_label(
                "service_item",
                __("الإجراء الطبي")
            );
        } else {
            set_label(
                "service_item",
                __("الخدمة المطلوبة")
            );
        }

        /*
         * رسالة إرشادية داخل النافذة.
         */
        const request_field =
            dialog.fields_dict.request_type;

        if (
            request_field &&
            request_field.$wrapper
        ) {
            request_field.$wrapper
                .find(".er-service-help")
                .remove();

            let help = "";

            if (is_diagnostic) {
                help =
                    __("للطلبات المخبرية والأشعة، استخدم أيضًا نافذة المختبر أو الأشعة لمتابعة التنفيذ والنتيجة.");
            } else if (is_medication) {
                help =
                    __("يُنشأ طلب الدواء مباشرة في Medication Request، ثم يظهر للتنفيذ والمتابعة في نافذة الأدوية.");
            } else if (is_procedure) {
                help =
                    __("يُنشأ طلب الإجراء عبر مسار Clinical Procedure الموجود أصلًا، ثم يظهر في نافذة الإجراءات.");
            } else if (is_consultation) {
                help =
                    __("حدد التخصص أو الخدمة الاستشارية والطبيب المطلوب.");
            } else if (is_transfer) {
                help =
                    __("هذا الطلب تشغيلي للتحويل. قرار التحويل وسبب التحويل يبقيان في مصير الحالة.");
            } else if (is_observation) {
                help =
                    __("طلب تشغيلي لإبقاء المريض في منطقة الملاحظة.");
            } else if (is_discharge) {
                help =
                    __("هذا طلب تشغيلي لإجراءات الخروج. القرار الطبي يبقى في مصير الحالة.");
            }

            if (help) {
                request_field.$wrapper.append(
                    `<div class="er-service-help"
                          style="
                              margin-top:7px;
                              padding:8px 10px;
                              border-radius:6px;
                              background:#f7f8fa;
                              border:1px solid #e5e7eb;
                              color:#5b6470;
                              font-size:12px;
                              line-height:1.6;">
                        ${frappe.utils.escape_html(help)}
                    </div>`
                );
            }
        }

        dialog.fields_dict.dynamic_section.df.hidden =
            !has_type;

        dialog.fields_dict.dynamic_section.refresh();
    }

    /*
     * تنسيق احترافي للنافذة بدون إضافة CSS عام
     * يؤثر على بقية الصفحة.
     */
    dialog.$wrapper.on(
        "shown.bs.modal",
        function() {
            const modal_dialog =
                dialog.$wrapper.find(".modal-dialog");

            modal_dialog.css({
                "max-width": "820px",
                "width": "calc(100% - 30px)",
            });

            dialog.$wrapper
                .find(".modal-content")
                .css({
                    "border-radius": "12px",
                    "border": "1px solid #d9dee5",
                    "box-shadow":
                        "0 12px 35px rgba(0,0,0,.16)",
                    "overflow": "hidden",
                });

            dialog.$wrapper
                .find(".modal-header")
                .css({
                    "padding": "14px 18px",
                    "border-bottom":
                        "1px solid #e7eaee",
                });

            dialog.$wrapper
                .find(".modal-body")
                .css({
                    "padding": "18px",
                    "background": "#ffffff",
                });

            update_service_layout();
        }
    );

    dialog.fields_dict.request_type.$input.on(
        "change",
        update_service_layout
    );

    dialog.show();

    update_service_layout();

    if (initial_ui_type) {
        dialog.set_value(
            "request_type",
            initial_ui_type
        );
        update_service_layout();
    }
}







/* =========================================================
 * Doctor Order Buttons — INLINE TABLE
 * ========================================================= */

/* =========================================================
 * Doctor Order Linked Records
 * ========================================================= */
if (
    !window.__ER_DOCTOR_ORDER_LINK_HANDLER_BOUND__
) {
    window.__ER_DOCTOR_ORDER_LINK_HANDLER_BOUND__ =
        true;

    document.addEventListener(
        "click",
        function (ev) {
            const button =
                ev.target.closest(
                    ".doctor-order-link"
                );

            if (!button) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();

            const doctype =
                button.getAttribute(
                    "data-doctor-order-link-doctype"
                );

            const name =
                button.getAttribute(
                    "data-doctor-order-link-name"
                );

            if (!doctype || !name) {
                return;
            }

            frappe.set_route(
                "Form",
                doctype,
                name
            );
        },
        true
    );
}

if (
    !window.__ER_DOCTOR_ORDERS_INLINE_TABLE_BOUND__
) {
    window.__ER_DOCTOR_ORDERS_INLINE_TABLE_BOUND__ =
        true;

    document.addEventListener(
        "click",
        function (ev) {
            const requestButton =
                ev.target.closest(
                    ".doctor-native-order-inline-button"
                );

            if (!requestButton) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();

            const type =
                String(
                    requestButton.getAttribute(
                        "data-doctor-order-type"
                    ) || ""
                ).trim();

            if (!type) {
                return;
            }

            er_doctor_open_service_doctype(
                type
            );
        },
        true
    );

    document.addEventListener(
        "click",
        function (ev) {
            const saveButton =
                ev.target.closest(
                    "[data-doctor-order-save]"
                );

            if (!saveButton) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();

            er_doctor_order_save_all();
        },
        true
    );

    document.addEventListener(
        "click",
        function (ev) {
            const deleteButton =
                ev.target.closest(
                    "[data-doctor-order-delete]"
                );

            if (!deleteButton) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();

            const id =
                String(
                    deleteButton.getAttribute(
                        "data-doctor-order-delete"
                    ) || ""
                );

            state.doctor_order_rows =
                (
                    Array.isArray(
                        state.doctor_order_rows
                    )
                        ? state.doctor_order_rows
                        : []
                ).filter(function(row) {
                    return String(row.id) !== id;
                });

            er_doctor_order_render_rows();
        },
        true
    );
}

if (!window.__ER_DOCTOR_SERVICES_DIRECT_BOUND__) {
    window.__ER_DOCTOR_SERVICES_DIRECT_BOUND__ = true;

    document.addEventListener(
        "click",
        function (ev) {
            const button = ev.target.closest(
                '[data-doctor-service="services"]'
            );

            if (!button) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();

            if (
                typeof open_er_section ===
                "function"
            ) {
                open_er_section("services");
            }
        },
        true
    );
}

function update_disposition_visibility() {
    const controls = state.controls || {};

    const outcome_control = controls.outcome;
    const transfer_to_control = controls.transfer_to;
    const transfer_reason_control = controls.transfer_reason;
    const death_type_control = controls.death_type;

    function get_value(control) {
        try {
            if (control && typeof control.get_value === "function") {
                return control.get_value();
            }

            if (control && control.$input) {
                return control.$input.val();
            }
        } catch (e) {
            console.warn("ER Doctor disposition get_value failed:", e);
        }

        return "";
    }

    function get_host(fieldname) {
        const selector =
            `[data-doctor-host="${fieldname}"]`;

        const host = document.querySelector(selector);
        if (!host) {
            return null;
        }

        return (
            host.closest("[data-doctor-field]") ||
            host.closest(".form-group") ||
            host.closest(".frappe-control") ||
            host
        );
    }

    function set_visibility(fieldname, visible, required) {
        const control = controls[fieldname];
        const host = get_host(fieldname);

        if (host) {
            host.style.display = visible ? "" : "none";
        }

        if (control && control.df) {
            control.df.reqd = !!required;

            try {
                control.refresh();
            } catch (e) {
                console.warn(
                    "ER Doctor disposition refresh failed:",
                    fieldname,
                    e
                );
            }
        }

        if (control && control.$wrapper) {
            control.$wrapper.toggle(visible);
        }
    }

    const outcome = String(get_value(outcome_control) || "").trim();

    /*
     * ER Patient Intake actual DocType:
     *
     * transfer_to:
     * eval:doc.outcome=="تحويل خارجي" || doc.outcome=="تحويل داخلي"
     *
     * transfer_reason:
     * eval:doc.outcome=="تحويل خارجي" || doc.outcome=="تحويل داخلي"
     *
     * death_type:
     * eval:doc.outcome=="وفاة"
     *
     * transfer_to + transfer_reason are mandatory in those cases.
     * death_type is NOT mandatory.
     */

    const is_transfer =
        outcome === "تحويل خارجي" ||
        outcome === "تحويل داخلي";

    const is_death = outcome === "وفاة";

    set_visibility("transfer_to", is_transfer, is_transfer);
    set_visibility("transfer_reason", is_transfer, is_transfer);
    set_visibility("death_type", is_death, false);

    if (outcome_control && outcome_control.$input) {
        if (!outcome_control.__er_doctor_disposition_bound__) {
            outcome_control.__er_doctor_disposition_bound__ = true;

            outcome_control.$input.on(
                "change.er_doctor_disposition",
                function () {
                    update_disposition_visibility();
                }
            );

            outcome_control.$input.on(
                "input.er_doctor_disposition",
                function () {
                    update_disposition_visibility();
                }
            );
        }
    }
}

    function load_documents() {

        var name =
            current_encounter_name();

        if (!name) {

            return Promise.reject(
                "current_encounter غير موجود"
            );
        }

        return get_doc(
            "Patient Encounter",
            name
        )
        .then(
            function (encounter) {

                if (!encounter) {

                    return Promise.reject(
                        "Patient Encounter not found"
                    );
                }

                state.encounter =
                    encounter;

                /*
                 * er_visit_status is a Select field.
                 * Keep the server value as a scalar string and
                 * restore it before saving the whole Encounter.
                 */
                state.original_visit_status =
                    typeof encounter.er_visit_status ===
                        "string"
                        ? encounter.er_visit_status
                        : "";

                if (
                    encounter.er_patient_intake
                ) {

                    return get_doc(
                        "ER Patient Intake",
                        encounter.er_patient_intake
                    );
                }

                return null;
            }
        )
        .then(
            function (intake) {

                state.intake =
                    intake;

                if (
                    state.encounter &&
                    state.encounter.patient
                ) {

                    return get_doc(
                        "Patient",
                        state.encounter.patient
                    );
                }

                return null;
            }
        )
        .then(
            function (patient) {

                state.patient =
                    patient;

                return Promise.all([
                    load_doctype(
                        "Patient Encounter"
                    ),
                    load_doctype(
                        "ER Patient Intake"
                    ),
                    load_doctype(
                        "Vital Signs"
                    ),
                    load_doctype(
                        "ER Clinical Note"
                    ),
                    load_doctype(
                        "Patient"
                    ),
                    load_doctype(
                        "Patient Encounter Symptom"
                    )
                ]);
            }
        );
    }

    function load_data(
        root
    ) {

        var loading =
            root.querySelector(
                "[data-doctor-loading]"
            );

        var content =
            root.querySelector(
                "[data-doctor-content]"
            );

        if (loading) {
            loading.style.display =
                "block";
        }

        if (content) {
            content.style.display =
                "none";
        }

        load_documents()
            .then(
                function () {

                    /*
                     * Patient Encounter is the source for the
                     * doctor-facing visit status.
                     * Refresh the authoritative value before
                     * creating the bound controls.
                     */
                    return get_doc(
                        "Patient Encounter",
                        state.encounter.name
                    )
                    .then(function (fresh_encounter) {

                        if (fresh_encounter) {
                            state.encounter =
                                fresh_encounter;

                            state.original_visit_status =
                                typeof fresh_encounter.er_visit_status ===
                                    "string"
                                    ? fresh_encounter.er_visit_status
                                    : "";
                        }

                        bind_fields(
                            root
                        );

                        render_patient_summary(
                            root
                        );
                    });

                    return load_vitals(
                        root
                    );
                }
            )
            .then(
                function () {

                    render_history(
                        root
                    );

                    render_nursing_assessment(
                        root
                    );

                    if (loading) {
                        loading.style.display =
                            "none";
                    }

                    if (content) {
                        content.style.display =
                            "block";
                    }

                    console.log(
                        "ER DOCTOR FINAL NATIVE BINDING READY",
                        {
                            encounter:
                                state.encounter &&
                                state.encounter.name,

                            intake:
                                state.intake &&
                                state.intake.name,

                            patient:
                                state.encounter &&
                                state.encounter.patient,

                            doctor_field:
                                "Patient Encounter.practitioner",

                            department_field:
                                "Patient Encounter.medical_department",

                            diagnosis_field:
                                "Patient Encounter.diagnosis",

                            note_field:
                                "ER Clinical Note.note",

                            disposition_field:
                                "ER Patient Intake.disposition",

                            vitals_doctype:
                                "Vital Signs"
                        }
                    );

                }
            )
            .catch(
                function (err) {

                    console.error(
                        "ER DOCTOR FINAL LOAD ERROR",
                        err
                    );

                    if (loading) {

                        loading.innerHTML =
                            "تعذر تحميل الحقول المرتبطة بالـDocType | Failed to load real DocType fields<br><small>" +
                            esc(
                                String(err)
                            ) +
                            "</small>";
                    }
                }
            );
    }

    function save_doctor(done) {

        var e =
            state.encounter;

        var i =
            state.intake;

        if (!e) {

            frappe.msgprint(
                "لا يوجد Patient Encounter."
            );

            return;
        }

        if (!i) {

            frappe.msgprint(
                "لا يوجد ER Patient Intake مرتبط."
            );

            return;
        }

        /*
         * ====================================================
         * Read values FROM Frappe Controls
         * and write them explicitly to their real documents.
         * ====================================================
         */

        function value_of(host_name) {

            var control =
                state.controls[host_name];

            if (!control) {
                return "";
            }

            try {

                var value =
                    control.get_value();

                if (
                    value === null ||
                    value === undefined
                ) {
                    return "";
                }

                return value;

            } catch (err) {

                return "";
            }
        }

        /*
         * ----------------------------------------------------
         * Patient Encounter scalar fields
         * ----------------------------------------------------
         */

        var doctor_notes =
            value_of(
                "er_doctor_notes"
            );

        e.er_doctor_notes =
            String(
                doctor_notes || ""
            );

        /*
         * Patient Encounter.er_visit_status is server-owned.
         * save_doctor_assessment() sets the correct projection.
         * Do not manufacture or validate workflow state in the UI.
         */

        /*
         * ----------------------------------------------------
         * Clinical Details — Patient Encounter.encounter_comment
         * ----------------------------------------------------
         */

        e.encounter_comment =
            String(
                value_of(
                    "encounter_comment"
                ) || ""
            );

        /*
         * ----------------------------------------------------
         * Physical Examination — Patient Encounter.er_physical_examination
         * ----------------------------------------------------
         */

        e.er_physical_examination =
            String(
                value_of(
                    "er_physical_examination"
                ) || ""
            );

        e.er_reassessment_notes =
            String(
                value_of(
                    "er_reassessment_notes"
                ) || ""
            );

        /*
         * ----------------------------------------------------
         * Symptoms — Patient Encounter.symptoms
         * ----------------------------------------------------
         */

        var symptoms_control =
            state.controls.symptoms;

        if (symptoms_control) {

            try {

                var symptoms_value =
                    symptoms_control.get_value();

                if (
                    Array.isArray(
                        symptoms_value
                    )
                ) {

                    frappe.model.clear_table(
                        e,
                        "symptoms"
                    );

                    symptoms_value.forEach(
                        function (item) {

                            var complaint = "";

                            if (
                                typeof item ===
                                "string"
                            ) {

                                complaint = item;

                            } else if (
                                item &&
                                typeof item ===
                                "object"
                            ) {

                                complaint =
                                    item.complaint ||
                                    item.name ||
                                    "";
                            }

                            if (!complaint) {
                                return;
                            }

                            var row =
                                frappe.model.add_child(
                                    e,
                                    "Patient Encounter Symptom",
                                    "symptoms"
                                );

                            row.complaint =
                                complaint;
                        }
                    );
                }

            } catch (symptoms_error) {

                console.warn(
                    "ER DOCTOR SYMPTOMS READ WARNING",
                    symptoms_error
                );
            }
        }

        /*
         * ----------------------------------------------------
         * Diagnosis — Patient Encounter.diagnosis
         * ----------------------------------------------------
         */

        var diagnosis_control =
            state.controls.diagnosis;

        if (diagnosis_control) {

            try {

                var diagnosis_value =
                    diagnosis_control.get_value();

                if (
                    Array.isArray(
                        diagnosis_value
                    )
                ) {

                    frappe.model.clear_table(
                        e,
                        "diagnosis"
                    );

                    diagnosis_value.forEach(
                        function (item) {

                            var name = "";

                            if (
                                typeof item ===
                                "string"
                            ) {

                                name =
                                    item;

                            } else if (
                                item &&
                                typeof item ===
                                "object"
                            ) {

                                name =
                                    item.diagnosis ||
                                    item.name ||
                                    "";
                            }

                            if (!name) {
                                return;
                            }

                            var row =
                                frappe.model.add_child(
                                    e,
                                    "Patient Encounter Diagnosis",
                                    "diagnosis"
                                );

                            row.diagnosis =
                                name;
                        }
                    );

                }

            } catch (diagnosis_error) {

                console.warn(
                    "ER DOCTOR DIAGNOSIS READ WARNING",
                    diagnosis_error
                );
            }
        }

        /*
         * ----------------------------------------------------
         * Clinical Note — ER Clinical Note child table
         * ----------------------------------------------------
         */

        var note_text =
            state.note &&
            state.note.note
                ? String(
                    state.note.note
                ).trim()
                : "";

        if (note_text) {

            var row =
                frappe.model.add_child(
                    e,
                    "ER Clinical Note",
                    "er_clinical_notes"
                );

            row.note =
                note_text;

            row.note_type =
                (
                    state.note.note_type ||
                    "Clinical Note"
                );

            row.practitioner =
                e.practitioner ||
                "";

            row.department =
                e.medical_department ||
                "";

            if (
                "note_time" in row
            ) {

                row.note_time =
                    frappe.datetime.now_datetime();
            }

            if (
                "user" in row
            ) {

                row.user =
                    frappe.session.user;
            }
        }

        /*
         * ----------------------------------------------------
         * ER Patient Intake
         *
         * DO NOT save the entire Intake document.
         * Update ONLY physician-owned disposition fields.
         * This prevents status corruption.
         * ----------------------------------------------------
         */

        var intake_values = {

            disposition:
                value_of(
                    "disposition"
                ),

            outcome:
                value_of(
                    "outcome"
                ),

            transfer_to:
                value_of(
                    "transfer_to"
                ),

            transfer_reason:
                value_of(
                    "transfer_reason"
                ),

            death_type:
                value_of(
                    "death_type"
                )

        };

        var intake_bed_value =
            value_of(
                "assigned_bed"
            );

        var button =
            document.querySelector(
                "#" +
                ROOT_ID +
                " [data-doctor-save]"
            );

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "جارٍ الحفظ | Saving...";
        }

        /*
         * ----------------------------------------------------
         * 1. Save Patient Encounter
         * ----------------------------------------------------
         */

        frappe.call({
            method:
                "custom_app.emergency_management.doctype.er_patient_intake.er_patient_intake.save_doctor_assessment",
            args: {
                encounter:
                    JSON.stringify(e),

                intake_data:
                    JSON.stringify(
                        Object.assign(
                            {
                                assigned_bed:
                                    intake_bed_value
                            },
                            intake_values
                        )
                    )
            }
        })

            .then(
                function (saved_encounter) {

                    state.encounter =
                        saved_encounter;

                    /*
                     * ------------------------------------------------
                     * 2. Update only physician disposition fields
                     * ------------------------------------------------
                     */

                    return frappe.db.set_value(
                        "ER Patient Intake",
                        i.name,
                        intake_values
                    );
                }
            )

            .then(
                function () {

                    /*
                     * The server-side save_doctor_assessment()
                     * is the ONLY owner of the ER Workflow transition.
                     *
                     * It already performs:
                     *     بانتظار الطبيب -> قيد الفحص
                     *
                     * Do NOT call transition_er_visit() again here.
                     * Doing so creates a duplicate workflow request and
                     * causes inconsistent behavior between visits.
                     */
                    i.status =
                        "قيد الفحص";

                    if (state.encounter) {
                        state.encounter.er_visit_status =
                            "مع الطبيب";
                    }

                    return null;
                }
            )

            .then(
                function (result) {

                    /*
                     * Keep local Intake synchronized.
                     */

                    i.assigned_bed =
                        intake_bed_value || "";

                    Object.keys(
                        intake_values
                    ).forEach(
                        function (fieldname) {

                            i[fieldname] =
                                intake_values[
                                    fieldname
                                ];

                        }
                    );

                    if (
                        typeof done === "function"
                    ) {
                        done(true);
                    }

                    /*
                     * Recreate the empty Clinical Note draft.
                     */
                    state.note =
                        frappe.model.get_new_doc(
                            "ER Clinical Note"
                        );

                    state.note.practitioner =
                        state.encounter.practitioner ||
                        "";

                    state.note.department =
                        state.encounter.medical_department ||
                        "";

                    if (
                        "note_type" in state.note
                    ) {

                        state.note.note_type =
                            "Clinical Note";
                    }

                    /*
                     * Refresh from server.
                     */
                    load_data(
                        document.querySelector(
                            "#" +
                            ROOT_ID
                        )
                    );
                }
            )

            .catch(
                function (err) {

                    console.error(
                        "ER DOCTOR FINAL SAVE ERROR",
                        err
                    );

                    if (
                        typeof done === "function"
                    ) {
                        done(false);
                    }

                    frappe.msgprint({

                        title:
                            "حفظ الطبيب | Doctor Save",

                        message:
                            "تعذر حفظ البيانات. راجع Console.",

                        indicator:
                            "red"

                    });
                }
            )

            .finally(
                function () {

                    if (button) {

                        button.disabled =
                            false;

                        button.textContent =
                            "حفظ التقييم والقرار | Save";
                    }
                }
            );
    }

    /* UNIFIED DOCTOR SAVE EXPORT */
window.save_er_doctor_assessment = save_doctor;

function bind_events(
        root
    ) {

        var save =
            root.querySelector(
                "[data-doctor-save]"
            );

        if (save) {

            save.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    /*
                     * زر حفظ الطبيب يحفظ تقييم الطبيب فقط.
                     * لا يدخل مسار حفظ طلبات الطوارئ.
                     */
                    save_doctor();

                }
            );
        }

        var refresh =
            root.querySelector(
                "[data-doctor-refresh]"
            );

        if (refresh) {

            refresh.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    load_data(
                        root
                    );

                }
            );
        }

        root.addEventListener(
            "click",
            function (event) {

                var service =
                    event.target.closest(
                        "[data-doctor-service]"
                    );

                if (
                    !service
                ) {
                    return;
                }

                event.preventDefault();

                var section =
                    service.getAttribute(
                        "data-doctor-service"
                    );

                if (
                    typeof open_er_section ===
                    "function"
                ) {

                    open_er_section(
                        section
                    );
                }
            }
        );
    }

    window.load_doctor_section =
        function () {

            ensure_styles();

            var root =
                render_shell();

            if (!root) {

                frappe.msgprint({
                    title:
                        "نافذة الطبيب | Doctor Workspace",
                    message:
                        "تعذر العثور على #er-content.",
                    indicator:
                        "red"
                });

                return;
            }

            bind_events(
                root
            );

            load_data(
                root
            );
        };

    console.log(
        "ER DOCTOR FINAL NATIVE DOCTYPE MODULE LOADED"
    );

})();


/* STEP 7-2B — TRIAGE BUTTON EVENT */
$(document)
    .off("click.erTriage", "#er-triage")
    .on("click.erTriage", "#er-triage", async function () {
        const $btn = $(this);

        try {
            $btn.prop("disabled", true);

            const encounter =
                typeof get_current_encounter === "function"
                    ? get_current_encounter()
                    : null;

            if (!encounter) {
                frappe.msgprint({
                    title: __("الترياج"),
                    message: __("لا توجد زيارة طوارئ حالية مرتبطة بهذه الشاشة."),
                    indicator: "orange",
                });
                return;
            }

            const rows = await frappe.db.get_list("ER Patient Intake", {
                fields: ["name", "patient_encounter", "modified"],
                filters: {
                    patient_encounter: encounter,
                },
                order_by: "modified desc",
                limit_page_length: 1,
            });

            if (!rows || !rows.length) {
                frappe.msgprint({
                    title: __("الترياج"),
                    message: __("لم يتم العثور على سجل ER Patient Intake لهذه الزيارة."),
                    indicator: "orange",
                });
                return;
            }

            frappe.set_route("Form", "ER Patient Intake", rows[0].name);
        } catch (error) {
            console.error("ER TRIAGE BUTTON ERROR:", error);

            frappe.msgprint({
                title: __("الترياج"),
                message: __("تعذر فتح شاشة الترياج. راجع Console."),
                indicator: "red",
            });
        } finally {
            $btn.prop("disabled", false);
        }
    });


/* MEDICAL HISTORY — FINAL INTAKE METHOD */

$(document)
    .off(
        "click.erVisitConsoleMedicalHistory",
        "#er-medical-history"
    )
    .on(
        "click.erVisitConsoleMedicalHistory",
        "#er-medical-history",
        function () {

            const $btn = $(this);

            const encounter =
                typeof get_current_encounter === "function"
                    ? get_current_encounter()
                    : (
                        typeof current_encounter !== "undefined"
                            ? current_encounter
                            : null
                    );

            if (!encounter) {
                frappe.msgprint({
                    title: __("السجل الطبي"),
                    message: __("لا توجد زيارة طوارئ حالية."),
                    indicator: "orange"
                });
                return;
            }

            $btn.prop("disabled", true);

            frappe.db.get_value(
                "Patient Encounter",
                encounter,
                ["patient", "patient_name"]
            )
            .then(function (r) {

                const data =
                    r && r.message
                        ? r.message
                        : {};

                const patient =
                    data.patient || null;

                if (!patient) {
                    frappe.msgprint({
                        title: __("السجل الطبي"),
                        message: __("تعذر تحديد المريض الحالي."),
                        indicator: "orange"
                    });
                    return;
                }

                /*
                 * نفس آلية زر ER Patient Intake:
                 * تحديد المريض قبل فتح شاشة التاريخ الطبي.
                 */
                frappe.route_options = {
                    patient: patient
                };

                frappe.set_route(
                    "patient_history",
                    patient
                );

                /*
                 * Fallback:
                 * في حال تم رسم حقل "حدد المريض" بعد الانتقال،
                 * نضع المريض الحالي داخله مباشرة.
                 */
                setTimeout(function () {

                    try {

                        const page_main =
                            $(frappe.container.page.main);

                        const patient_input =
                            page_main
                                .find(
                                    '[data-fieldname="patient"] input'
                                )
                                .first();

                        if (
                            patient_input.length &&
                            patient_input.val() !== patient
                        ) {

                            patient_input
                                .val(patient)
                                .trigger("input")
                                .trigger("change");

                        }

                    } catch (e) {
                        console.warn(
                            "MEDICAL HISTORY PATIENT FIELD FALLBACK:",
                            e
                        );
                    }

                }, 700);

            })
            .catch(function (error) {

                console.error(
                    "ER MEDICAL HISTORY ERROR:",
                    error
                );

                frappe.msgprint({
                    title: __("السجل الطبي"),
                    message: __("تعذر فتح التاريخ الطبي للمريض الحالي."),
                    indicator: "red"
                });

            })
            .finally(function () {

                $btn.prop(
                    "disabled",
                    false
                );

            });

        }
    );

/* ============================================================
 * ER_DOCTOR_ROLE_BUTTON_COLOR_V1
 * زيارة طبيب — Doctor Role Button
 * ============================================================ */

(function () {

    if (window.__erDoctorRoleButtonColorV1) {
        return;
    }

    window.__erDoctorRoleButtonColorV1 = true;

    function is_doctor_role() {

        var roles =
            window.frappe &&
            Array.isArray(frappe.user_roles)
                ? frappe.user_roles
                : [];

        return (
            roles.indexOf("ER Doctor") !== -1 ||
            roles.indexOf("Physician") !== -1 ||
            roles.indexOf("Healthcare Practitioner") !== -1
        );
    }

    function paint_doctor_visit_buttons() {

        if (!is_doctor_role()) {
            return;
        }

        var buttons =
            document.querySelectorAll(
                "button, .btn"
            );

        buttons.forEach(function (button) {

            var label =
                (button.textContent || "")
                    .replace(/\s+/g, " ")
                    .trim();

            if (label === "زيارة طبيب") {

                button.classList.add(
                    "er-doctor-role-button"
                );

            }

        });

    }

    var style =
        document.createElement("style");

    style.id =
        "er-doctor-role-button-style-v1";

    style.textContent = `

        .er-doctor-role-button {
            background: #2563eb !important;
            border-color: #1d4ed8 !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            box-shadow: none !important;
        }

        .er-doctor-role-button:hover,
        .er-doctor-role-button:focus {
            background: #1d4ed8 !important;
            border-color: #1e40af !important;
            color: #ffffff !important;
        }

    `;

    document.head.appendChild(style);

    paint_doctor_visit_buttons();

    var observer =
        new MutationObserver(
            function () {
                paint_doctor_visit_buttons();
            }
        );

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );

    setTimeout(
        function () {
            observer.disconnect();
        },
        30000
    );

})();

