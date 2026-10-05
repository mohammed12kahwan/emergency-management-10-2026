frappe.pages["er_tracking_board"].on_page_load = function (wrapper) {

    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "لوحة متابعة مرضى الطوارئ",
        single_column: true
    });

    load_er_board(page);

    // تحديث تلقائي كل 10 ثواني
    setInterval(() => {
        load_er_board(page);
    }, 10000);

};


/* =========================================================
   تحميل بيانات لوحة المتابعة
========================================================= */

function load_er_board(page) {

    frappe.call({

        method:
            "custom_app.emergency_management.api.tracking_board.get_tracking_board",

        freeze: false,

        callback: function (r) {

            if (!r.message) {

                page.main.html(`
                    <div class="er-empty-state">
                        لا توجد بيانات
                    </div>
                `);

                return;
            }

            render_er_board(page, r.message);

        }

    });

}


/* =========================================================
   رسم لوحة المتابعة
========================================================= */

function render_er_board(page, data) {

    const patients = data.patients || [];
    const stats = data.statistics || {};
    const esi_distribution = data.esi_distribution || [];
    const status_distribution = data.status_distribution || {};

    let html = `

<div class="er-dashboard" dir="rtl">

    <!-- =================================================
         HEADER
    ================================================= -->

    <div class="er-header">

        <div class="er-title">

            <span class="er-title-icon">
                🚑
            </span>

            <span>
                لوحة متابعة مرضى الطوارئ
            </span>

        </div>


        <div class="er-actions">

            <button
                class="er-btn er-btn-primary"
                onclick="load_er_board_from_button()">

                🔄 تحديث

            </button>

        </div>

    </div>


    <!-- =================================================
         STATISTICS
    ================================================= -->

    <div class="er-cards">


        <!-- إجمالي المرضى -->

        <div class="er-card total">

            <div class="er-card-title">
                إجمالي المرضى
            </div>

            <div class="er-card-number">
                ${stats.total || 0}
            </div>

        </div>


        <!-- الحالات الحرجة -->

        <div class="er-card critical">

            <div class="er-card-title">
                حالات حرجة
            </div>

            <div class="er-card-number">
                ${stats.critical || 0}
            </div>

        </div>


        <!-- بانتظار الفرز -->

        <div class="er-card waiting">

            <div class="er-card-title">
                بانتظار الفرز
            </div>

            <div class="er-card-number">
                ${stats.waiting_triage || 0}
            </div>

        </div>


        <!-- بانتظار الطبيب -->

        <div class="er-card doctor">

            <div class="er-card-title">
                بانتظار الطبيب
            </div>

            <div class="er-card-number">
                ${stats.waiting_doctor || 0}
            </div>

        </div>


        <!-- تحت العلاج -->

        <div class="er-card treatment">

            <div class="er-card-title">
                تحت العلاج
            </div>

            <div class="er-card-number">
                ${stats.under_treatment || 0}
            </div>

        </div>


        <!-- الأسرة المتاحة -->

        <div class="er-card beds">

            <div class="er-card-title">
                الأسرة المتاحة
            </div>

            <div class="er-card-number">
                ${stats.available_beds || 0}
            </div>

        </div>


        <!-- متوسط الانتظار -->

        <div class="er-card wait-average">

            <div class="er-card-title">
                متوسط الانتظار
            </div>

            <div class="er-card-number">

                ${formatWaitMinutes(
                    stats.average_wait_minutes
                )}

            </div>

        </div>

    </div>


    <!-- =================================================
         ESI DISTRIBUTION
    ================================================= -->

    <div class="er-distribution-card">

        <div class="er-section-title">

            <span>
                🩺
            </span>

            توزيع حالات الفرز ESI

        </div>


        <div class="er-esi-distribution">

`;

    esi_distribution.forEach(function (item) {

        html += `

            <div
                class="er-esi-item"
                style="--esi-color: ${item.color || "#999"}">

                <div class="er-esi-color"></div>

                <div class="er-esi-label">

                    ${item.label || "-"}

                </div>

                <div class="er-esi-count">

                    ${item.count || 0}

                </div>

            </div>

        `;

    });


    html += `

        </div>

    </div>


    <!-- =================================================
         TOOLBAR
    ================================================= -->

    <div class="er-toolbar">

        <div class="er-search-wrapper">

            <span class="er-search-icon">
                🔍
            </span>

            <input
                id="er-search"
                class="er-search"
                placeholder="ابحث عن المريض أو رقم الزيارة أو الطبيب..."
                onkeyup="filterPatients()">

        </div>


        <div class="er-last-update">

            آخر تحديث:

            <span>
                ${formatDateTime(data.updated_at)}
            </span>

        </div>

    </div>


    <!-- =================================================
         PATIENT TABLE
    ================================================= -->

    <div class="er-table-wrapper">

        <table class="er-table">

            <thead>

                <tr>

                    <th>
                        رقم الزيارة
                    </th>

                    <th>
                        المريض
                    </th>

                    <th>
                        الحالة
                    </th>

                    <th>
                        ESI
                    </th>

                    <th>
                        وقت الانتظار
                    </th>

                    <th>
                        الوصول
                    </th>

                    <th>
                        الطبيب
                    </th>

                    <th>
                        السرير
                    </th>

                    <th>
                        الموقع
                    </th>

                </tr>

            </thead>


            <tbody id="patients-table">

`;

    /* =====================================================
       المرضى
    ===================================================== */

    patients.forEach(function (p) {

        const patient_name =
            p.اسم_المريض ||
            p.patient ||
            "-";


        const doctor_name =
            p.doctor_name ||
            p.assigned_doctor ||
            "-";


        const bed_name =
            p.bed_name ||
            p.assigned_bed ||
            "-";


        html += `

                <tr
                    class="patient-row
                    ${p.wait_alert ? "wait-alert-row" : ""}"
                    data-status="${escapeHtml(p.status || "")}"
                    data-esi="${escapeHtml(p.esi_label || "")}">

                    <!-- رقم الزيارة -->

                    <td>

                        <strong class="visit-number">

                            ${escapeHtml(p.name)}

                        </strong>

                    </td>


                    <!-- المريض -->

                    <td>

                        <div class="patient-name">

                            ${escapeHtml(patient_name)}

                        </div>

                    </td>


                    <!-- الحالة -->

                    <td>

                        ${statusBadge(p.status)}

                    </td>


                    <!-- ESI -->

                    <td>

                        ${esiBadge(
                            p.esi_label,
                            p.esi_color
                        )}

                    </td>


                    <!-- وقت الانتظار -->

                    <td>

                        ${waitBadge(
                            p.wait_time,
                            p.wait_alert
                        )}

                    </td>


                    <!-- الوصول -->

                    <td>

                        ${formatDate(
                            p.arrival_time ||
                            p.visit_date_time
                        )}

                    </td>


                    <!-- الطبيب -->

                    <td>

                        <span class="doctor-name">

                            ${escapeHtml(doctor_name)}

                        </span>

                    </td>


                    <!-- السرير -->

                    <td>

                        <span class="bed-name">

                            ${escapeHtml(bed_name)}

                        </span>

                    </td>


                    <!-- الموقع -->

                    <td>

                        ${escapeHtml(
                            p.current_location || "-"
                        )}

                    </td>

                </tr>

        `;

    });


    html += `

            </tbody>

        </table>

    </div>


    <!-- =================================================
         EMPTY STATE
    ================================================= -->

    ${
        patients.length === 0

        ? `

            <div class="er-empty-state">

                لا توجد حالات نشطة حاليًا

            </div>

        `

        : ""

    }


</div>

`;

    page.main.html(html);

}


/* =========================================================
   زر التحديث
========================================================= */

function load_er_board_from_button() {

    const wrapper = document.querySelector(
        ".layout-main-section"
    );

    if (!wrapper) {

        location.reload();

        return;

    }

    const page = {
        main: {
            html: function () {}
        }
    };

    // إعادة تحميل الصفحة لضمان الحصول على أحدث البيانات
    location.reload();

}


/* =========================================================
   Status Badge
========================================================= */

function statusBadge(status) {

    if (!status) {

        return `
            <span class="badge badge-open">
                -
            </span>
        `;

    }


    let class_name = "badge-open";


    switch (status) {

        case "وصل للطوارئ":

            class_name = "badge-arrived";

            break;


        case "تحت الفرز":

            class_name = "badge-triage";

            break;


        case "بانتظار الطبيب":

            class_name = "badge-doctor";

            break;


        case "قيد الفحص":

            class_name = "badge-examination";

            break;


        case "طلب فحوصات":

            class_name = "badge-investigation";

            break;


        case "بانتظار النتائج":

            class_name = "badge-results";

            break;


        case "قرار الطبيب":

            class_name = "badge-decision";

            break;


        case "في سرير الطوارئ":

            class_name = "badge-bed";

            break;


        case "تنويم":

            class_name = "badge-admission";

            break;


        case "خروج":

            class_name = "badge-discharge";

            break;


        case "تحويل":

            class_name = "badge-transfer";

            break;


        case "ملغي":

            class_name = "badge-cancelled";

            break;

    }


    return `

        <span class="badge ${class_name}">

            ${escapeHtml(status)}

        </span>

    `;

}


/* =========================================================
   ESI Badge
========================================================= */

function esiBadge(level, color) {

    if (!level) {

        return `
            <span class="esi-empty">
                -
            </span>
        `;

    }


    return `

        <span
            class="esi-badge"
            style="
                background-color: ${color || "#999"};
            ">

            ${escapeHtml(level)}

        </span>

    `;

}


/* =========================================================
   Wait Badge
========================================================= */

function waitBadge(wait_time, alert) {

    if (!wait_time) {

        wait_time = "00:00";

    }


    if (alert) {

        return `

            <span class="wait-badge wait-alert">

                ⚠️

                ${escapeHtml(wait_time)}

            </span>

        `;

    }


    return `

        <span class="wait-badge">

            ⏱️

            ${escapeHtml(wait_time)}

        </span>

    `;

}


/* =========================================================
   Format Wait Minutes
========================================================= */

function formatWaitMinutes(minutes) {

    if (!minutes || minutes <= 0) {

        return "00:00";

    }


    const hours =
        Math.floor(minutes / 60);


    const mins =
        minutes % 60;


    return (

        String(hours).padStart(2, "0") +

        ":" +

        String(mins).padStart(2, "0")

    );

}


/* =========================================================
   Format Date
========================================================= */

function formatDate(value) {

    if (!value) {

        return "-";

    }


    try {

        return frappe.datetime.str_to_user(
            value
        );

    }

    catch (e) {

        return value;

    }

}


/* =========================================================
   Format DateTime
========================================================= */

function formatDateTime(value) {

    if (!value) {

        return "-";

    }


    try {

        return frappe.datetime.str_to_user(
            value
        );

    }

    catch (e) {

        return value;

    }

}


/* =========================================================
   Search
========================================================= */

function filterPatients() {

    const input =
        document.getElementById("er-search");


    if (!input) {

        return;

    }


    const filter =
        input.value
            .toLowerCase()
            .trim();


    const rows =
        document.querySelectorAll(
            "#patients-table tr"
        );


    rows.forEach(function (row) {

        const text =
            row.innerText.toLowerCase();


        row.style.display =
            text.includes(filter)
                ? ""
                : "none";

    });

}


/* =========================================================
   Escape HTML
========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {

        return "";

    }


    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}