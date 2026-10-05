frappe.pages["er-laboratory"].on_page_load = function (wrapper) {

    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "لوحة المختبر",
        single_column: true
    });

    const root = $(wrapper).find(".layout-main-section");

    root.html(`
        <div class="er-laboratory">

            <div class="er-lab-page-header">
                <div>
                    <h2>🔬 لوحة تشغيل المختبر</h2>
                    <div class="er-lab-page-subtitle">
                        طلبات المختبر القادمة من قسم الطوارئ
                    </div>
                </div>

                <div class="er-lab-header-actions">
                    <button
                        type="button"
                        class="btn btn-light"
                        id="er-lab-notifications"
                        title="طلبات المختبر الجديدة"
                    >
                        🔔 <span class="badge" id="er-lab-notification-count">0</span>
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary"
                        id="er-lab-refresh"
                    >
                        🔄 تحديث
                    </button>
                </div>
            </div>

            <div id="er-lab-notification-panel" class="er-lab-notification-panel" style="display:none;"></div>

            <div class="er-lab-statistics">

                <div class="er-lab-stat">
                    <span>طلبات جديدة</span>
                    <strong id="er-lab-stat-pending">0</strong>
                </div>

                <div class="er-lab-stat">
                    <span>بانتظار العينة</span>
                    <strong id="er-lab-stat-waiting-sample">0</strong>
                </div>

                <div class="er-lab-stat">
                    <span>تم سحب العينة</span>
                    <strong id="er-lab-stat-sample-collected">0</strong>
                </div>

                <div class="er-lab-stat">
                    <span>قيد الفحص</span>
                    <strong id="er-lab-stat-in-progress">0</strong>
                </div>

                <div class="er-lab-stat">
                    <span>مكتمل</span>
                    <strong id="er-lab-stat-completed">0</strong>
                </div>

                <div class="er-lab-stat">
                    <span>غير مفوتر</span>
                    <strong id="er-lab-stat-unpaid">0</strong>
                </div>

            </div>

            <div
                id="er-lab-loading"
                class="er-lab-state"
            >
                ⏳ جاري تحميل طلبات المختبر...
            </div>

            <div
                id="er-lab-empty"
                class="er-lab-state"
                style="display:none;"
            >
                لا توجد طلبات مختبر.
            </div>

            <div
                id="er-lab-requests"
                class="er-lab-requests"
            ></div>

        </div>
    `);

    function status_label(status) {

        const labels = {
            "Pending": "مطلوب",
            "Sample Collected": "تم سحب العينة",
            "In Progress": "قيد الفحص",
            "Completed": "مكتمل",
            "Cancelled": "ملغي"
        };

        return labels[status] || status || "-";
    }

    function billing_label(status) {

        const labels = {
            "Pending": "غير مفوتر",
            "Partly Invoiced": "مفوتر جزئيًا",
            "Invoiced": "مفوتر"
        };

        return labels[status] || status || "غير مفوتر";
    }

    function status_class(status) {

        if (status === "Sample Collected") {
            return "sample-collected";
        }

        if (status === "In Progress") {
            return "in-progress";
        }

        if (status === "Completed") {
            return "completed";
        }

        if (status === "Cancelled") {
            return "cancelled";
        }

        return "pending";
    }

    function escape_html(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function format_date(value) {

        if (!value) {
            return "-";
        }

        return frappe.datetime.str_to_user(
            value
        );
    }

    function render_statistics(requests) {

        let pending = 0;
        let waiting_sample = 0;
        let sample_collected = 0;
        let in_progress = 0;
        let completed = 0;
        let unpaid = 0;

        requests.forEach(function (request) {

            if (request.lab_status === "Pending") {
                pending++;
            }

            if (
                request.lab_status === "Pending" &&
                !request.sample_collection
            ) {
                waiting_sample++;
            }

            if (
                request.lab_status === "Sample Collected"
            ) {
                sample_collected++;
            }

            if (
                request.lab_status === "In Progress"
            ) {
                in_progress++;
            }

            if (
                request.lab_status === "Completed"
            ) {
                completed++;
            }

            if (
                request.billing_status === "Pending" ||
                request.billing_status === "Partly Invoiced"
            ) {
                unpaid++;
            }
        });

        root.find("#er-lab-stat-pending").text(
            pending
        );

        root.find("#er-lab-stat-waiting-sample").text(
            waiting_sample
        );

        root.find("#er-lab-stat-sample-collected").text(
            sample_collected
        );

        root.find("#er-lab-stat-in-progress").text(
            in_progress
        );

        root.find("#er-lab-stat-completed").text(
            completed
        );

        root.find("#er-lab-stat-unpaid").text(
            unpaid
        );
    }

    const notified_requests =
        window.er_lab_notified_requests ||
        (window.er_lab_notified_requests = new Map());

    function priority_class(priority) {
        const value = String(priority || "").toLowerCase();
        if (value.includes("critical") || value.includes("red") || value.includes("عاجل")) {
            return "critical";
        }
        if (value.includes("high") || value.includes("orange") || value.includes("عالي")) {
            return "high";
        }
        return "normal";
    }

    function render_notifications(requests, announce) {
        const pending = (requests || []).filter(function (request) {
            return (
                request.work_source !== "sales_invoice" &&
                request.lab_status === "Pending" &&
                !request.sample_collection
            );
        });
        const panel = root.find("#er-lab-notification-panel").empty();
        root.find("#er-lab-notification-count").text(pending.length);

        pending.forEach(function (request) {
            const priority = priority_class(request.priority);
            panel.append(`
                <button type="button" class="er-lab-notification ${priority}"
                    data-request="${escape_html(request.name)}">
                    🔬 طلب مختبر جديد: ${escape_html(request.test_name || "فحص مخبري")}
                    <small>${escape_html(request.patient_name || request.patient || "")}</small>
                </button>
            `);

            const last_notified = notified_requests.get(request.name) || 0;
            if (announce && Date.now() - last_notified >= 4 * 60 * 1000) {
                frappe.show_alert({
                    message: `طلب مختبر طوارئ جديد: ${request.test_name || request.name}`,
                    indicator: priority === "critical" ? "red" : priority === "high" ? "orange" : "blue",
                }, 8);
                notified_requests.set(request.name, Date.now());
            }
        });
    }

    function render_requests(requests) {

        const container =
            root.find("#er-lab-requests");

        container.empty();

        if (
            !requests ||
            !requests.length
        ) {

            root.find("#er-lab-empty")
                .text(
                    "لا توجد طلبات مختبر حاليًا."
                )
                .show();

            return;
        }

        root.find("#er-lab-empty").hide();

        requests.forEach(
            render_request
        );
    }

    function render_request(request) {

        const status =
            request.lab_status || "Pending";

        const statusClass =
            status_class(status);

        const billing =
            request.billing_status || "Pending";

        const sampleReady =
            !!request.sample_collection;

        const card = $(`
            <div class="er-lab-request-card">

                <div class="er-lab-request-top">

                    <div>
                        <div class="er-lab-request-title">
                            ${escape_html(
                                request.test_name ||
                                request.item_code ||
                                "فحص مخبري"
                            )}
                        </div>

                        <div class="er-lab-request-number">
                            ${escape_html(
                                request.name
                            )}
                        </div>
                    </div>

                    <div class="er-lab-status ${statusClass}" style="border-left:4px solid ${escape_html(request.acuity_color || request.priority_color || "#6c757d")}">
                        ${escape_html(
                            status_label(status)
                        )}
                    </div>

                </div>

                <div class="er-lab-request-grid">

                    <div>
                        <span>المريض</span>
                        <strong>
                            ${escape_html(
                                request.patient_name ||
                                request.patient ||
                                "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>زيارة الطوارئ</span>
                        <strong>
                            ${escape_html(
                                request.patient_encounter ||
                                "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>الخدمة</span>
                        <strong>
                            ${escape_html(
                                request.item_code ||
                                "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Lab Test</span>
                        <strong>
                            ${escape_html(
                                request.lab_test ||
                                "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>حالة الفوترة</span>
                        <strong>
                            ${escape_html(
                                billing_label(
                                    billing
                                )
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>رقم الفاتورة</span>
                        <strong>
                            ${escape_html(
                                request.sales_invoice ||
                                "غير مفوتر"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>العينة المطلوبة</span>
                        <strong>
                            ${escape_html(
                                request.required_sample ||
                                "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>كمية العينة</span>
                        <strong>
                            ${
                                request.sample_qty ||
                                "-"
                            }
                            ${
                                escape_html(
                                    request.sample_uom ||
                                    ""
                                )
                            }
                        </strong>
                    </div>

                    <div>
                        <span>رقم العينة</span>
                        <strong>
                            ${escape_html(
                                request.sample_collection ||
                                "لم يتم إنشاء العينة"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>حالة العينة</span>
                        <strong>
                            ${escape_html(
                                request.sample_status ||
                                "غير منشأة"
                            )}
                        </strong>
                    </div>

                </div>

                <div class="er-lab-request-footer">

                    <div class="er-lab-meta">
                        تاريخ الطلب:
                        ${escape_html(
                            format_date(
                                request.creation
                            )
                        )}
                    </div>

                    <div class="er-lab-actions"></div>

                </div>

            </div>
        `);

        const actions =
            card.find(
                ".er-lab-actions"
            );

        // ---------------------------------------------
        // تم سحب العينة
        // ---------------------------------------------

        if (
            status === "Sample Collected"
        ) {

            actions.append(`
                <button
                    type="button"
                    class="btn btn-warning btn-sm er-lab-start-test"
                >
                    ▶️ بدء الفحص
                </button>
            `);
        }

        // ---------------------------------------------
        // Lab Test
        // ---------------------------------------------

        if (request.lab_test) {

            actions.append(`
                <button
                    type="button"
                    class="btn btn-secondary btn-sm er-lab-open-test"
                >
                    🔬 فتح Lab Test
                </button>
            `);
        }

        // ---------------------------------------------
        // Sample Collection
        // ---------------------------------------------

        if (request.sample_collection) {

            actions.append(`
                <button
                    type="button"
                    class="btn btn-light btn-sm er-lab-open-sample"
                >
                    🧪 فتح العينة
                </button>
            `);
        }

        if (request.diagnostic_report) {

            actions.append(`
                <button
                    type="button"
                    class="btn btn-light btn-sm er-lab-open-report"
                >
                    📄 تقرير التشخيص
                </button>
            `);
        }

        // ---------------------------------------------
        // الفاتورة المباشرة
        // ---------------------------------------------

        if (
            request.work_source === "sales_invoice" &&
            !request.lab_test
        ) {

            actions.append(`
                <button
                    type="button"
                    class="btn btn-primary btn-sm er-lab-prepare-invoice"
                >
                    🧪 تجهيز طلب المختبر والعينة
                </button>
            `);
        }

        // ---------------------------------------------
        // الفاتورة
        // ---------------------------------------------

        if (
            request.sales_invoice
        ) {

            actions.append(`
                <button
                    type="button"
                    class="btn btn-light btn-sm er-lab-open-invoice"
                >
                    🧾 الفاتورة
                </button>
            `);
        }

        // ---------------------------------------------
        // أحداث الأزرار
        // ---------------------------------------------

        card.on(
            "click",
            ".er-lab-start-test",
            function () {

                frappe.call({
                    method:
                        "custom_app.emergency_management.page.er_laboratory.er_laboratory.start_lab_test",

                    args: {
                        diagnostic_request:
                            request.name
                    },

                    freeze: true,

                    freeze_message:
                        "جاري بدء الفحص...",

                    callback:
                        function (r) {

                            if (r.exc) {
                                return;
                            }

                            frappe.show_alert({
                                message:
                                    "تم بدء الفحص",
                                indicator:
                                    "green"
                            });

                            load_requests();
                        }
                });
            }
        );

        card.on(
            "click",
            ".er-lab-open-test",
            function () {

                frappe.set_route(
                    "Form",
                    "Lab Test",
                    request.lab_test
                );
            }
        );

        card.on(
            "click",
            ".er-lab-open-sample",
            function () {

                frappe.set_route(
                    "Form",
                    "Sample Collection",
                    request.sample_collection
                );
            }
        );

        card.on(
            "click",
            ".er-lab-open-report",
            function () {

                frappe.set_route(
                    "Form",
                    "Diagnostic Report",
                    request.diagnostic_report
                );
            }
        );

        card.on(
            "click",
            ".er-lab-prepare-invoice",
            function () {

                const button = $(this);

                button.prop("disabled", true);

                frappe.call({
                    method:
                        "custom_app.emergency_management.page.er_laboratory.er_laboratory.prepare_direct_sales_invoice",

                    args: {
                        sales_invoice:
                            request.sales_invoice,

                        item_code:
                            request.item_code
                    },

                    freeze: true,

                    freeze_message:
                        "جاري إنشاء طلب المختبر والعينة...",

                    callback: function (r) {

                        button.prop("disabled", false);

                        if (r.exc) {
                            return;
                        }

                        const result =
                            r.message || {};

                        frappe.show_alert({
                            message:
                                result.message ||
                                "تم تجهيز طلب المختبر والعينة",
                            indicator:
                                "green"
                        });

                        load_requests();
                    }
                });
            }
        );

        card.on(
            "click",
            ".er-lab-open-invoice",
            function () {

                frappe.set_route(
                    "Form",
                    "Sales Invoice",
                    request.sales_invoice
                );
            }
        );

        root.find("#er-lab-requests")
            .append(card);
    }


    function ensure_one_click_sample_action() {

        const requests_root = root.find("#er-lab-requests");

        if (!requests_root.length) {
            return;
        }

        root.find("#er-lab-one-click-sample-bar").remove();

        requests_root.after(`
            <div
                id="er-lab-one-click-sample-bar"
                style="
                    margin-top:12px;
                    padding:12px;
                    border:1px solid var(--border-color);
                    border-radius:8px;
                    background:var(--card-bg,#f8f9fa);
                    display:flex;
                    align-items:center;
                    gap:8px;
                    flex-wrap:wrap;
                    direction:rtl;
                "
            >
                <select
                    id="er-lab-one-click-request"
                    class="form-control"
                    style="min-width:280px;max-width:420px;"
                >
                    <option value="">اختر طلب المختبر</option>
                </select>

                <button
                    type="button"
                    id="er-lab-one-click-sample"
                    class="btn btn-success"
                >
                    💾🩸 حفظ وجمع وتسجيل العينة
                </button>

                <span
                    id="er-lab-one-click-status"
                    class="text-muted"
                ></span>
            </div>
        `);

        function load_one_click_requests() {

            frappe.call({
                method:
                    "custom_app.emergency_management.page.er_laboratory.er_laboratory.get_laboratory_requests",

                args: {},

                callback: function(r) {

                    const select =
                        root.find("#er-lab-one-click-request");

                    if (!select.length) {
                        return;
                    }

                    select.empty();

                    select.append(
                        '<option value="">اختر طلب المختبر</option>'
                    );

                    if (
                        r.exc ||
                        !r.message ||
                        !r.message.length
                    ) {
                        return;
                    }

                    r.message.forEach(function(request) {

                        const status =
                            String(
                                request.sample_status ||
                                request.lab_status ||
                                request.status ||
                                ""
                            ).trim();

                        if (
                            status === "Collected" ||
                            status === "Sample Collected"
                        ) {
                            return;
                        }

                        const label =
                            (request.test_name ||
                             request.lab_test ||
                             request.name ||
                             "طلب مختبر");

                        select.append(
                            $("<option>", {
                                value: request.name,
                                text:
                                    label +
                                    " — " +
                                    request.name
                            })
                        );
                    });

                    if (select.find("option").length === 2) {
                        select.prop("selectedIndex", 1);
                    }
                }
            });
        }

        load_one_click_requests();

        requests_root.off(
            "click.erOneClickSample",
            "#er-lab-one-click-sample"
        );

        requests_root.parent().off(
            "click.erOneClickSample",
            "#er-lab-one-click-sample"
        );

        $(document)
            .off(
                "click.erOneClickSample",
                "#er-lab-one-click-sample"
            )
            .on(
                "click.erOneClickSample",
                "#er-lab-one-click-sample",
                function() {

                    const button = $(this);

                    const request_name =
                        root.find("#er-lab-one-click-request").val();

                    if (!request_name) {
                        frappe.msgprint(
                            "اختر طلب المختبر أولاً."
                        );
                        return;
                    }

                    button.prop(
                        "disabled",
                        true
                    );

                    root.find("#er-lab-one-click-status").text(
                        "جاري حفظ وجمع وتسجيل العينة..."
                    );

                    frappe.call({

                        method:
                            "custom_app.emergency_management.page.er_laboratory.er_laboratory.save_collect_register_sample",

                        args: {
                            diagnostic_request:
                                request_name
                        },

                        freeze: true,

                        freeze_message:
                            "جاري حفظ وجمع وتسجيل العينة...",

                        callback: function(r) {

                            button.prop(
                                "disabled",
                                false
                            );

                            if (r.exc) {

                                root.find("#er-lab-one-click-status").text(
                                    ""
                                );

                                return;
                            }

                            const message =
                                r.message || {};

                            frappe.show_alert({
                                message:
                                    message.message ||
                                    "تم حفظ وجمع وتسجيل العينة بنجاح",
                                indicator:
                                    "green"
                            });

                            root.find("#er-lab-one-click-status").text(
                                "تم تسجيل العينة بنجاح"
                            );

                            const report =
                                message.diagnostic_report;

                            /*
                             * التقرير الناتج من عملية تسجيل العينة
                             * هو التقرير الذي سيتم إدخال النتائج فيه.
                             */
                            if (report) {

                                frappe.set_route(
                                    "Form",
                                    "Diagnostic Report",
                                    report
                                );

                                return;
                            }

                            load_one_click_requests();
                            load_requests();
                        }
                    });
                }
            );
    }

    function load_requests() {

        root.find("#er-lab-loading").show();

        root.find("#er-lab-empty").hide();

        frappe.call({

            method:
                "custom_app.emergency_management.page.er_laboratory.er_laboratory.get_laboratory_requests",

            callback:
                function (r) {

                    root.find("#er-lab-loading").hide();

                    if (r.exc) {

                        root.find("#er-lab-empty")
                            .text(
                                "تعذر تحميل طلبات المختبر."
                            )
                            .show();

                        return;
                    }

                    const requests =
                        r.message || [];

                    render_statistics(
                        requests
                    );

                    render_requests(
                        requests
                    );
                    render_notifications(requests, true);
                },

            error:
                function () {

                    root.find("#er-lab-loading").hide();

                    root.find("#er-lab-empty")
                        .text(
                            "تعذر الاتصال بالخادم."
                        )
                        .show();
                }
        });
    }

    root.find("#er-lab-refresh").on(
        "click",
        function () {
            load_requests();
        }
    );

    root.find("#er-lab-notifications").on("click", function () {
        root.find("#er-lab-notification-panel").toggle();
    });

    root.find("#er-lab-notification-panel").on("click", ".er-lab-notification", function () {
        frappe.set_route("Form", "ER Diagnostic Request", $(this).data("request"));
    });

    if (window.er_lab_notification_timer) {
        clearInterval(window.er_lab_notification_timer);
    }

    window.er_lab_notification_timer = setInterval(function () {
        load_requests();
    }, 15 * 1000);

    frappe.realtime.on(
        "er_lab_sample_collected",
        function () {
            load_requests();
        }
    );

    frappe.realtime.on(
        "er_lab_test_started",
        function () {
            load_requests();
        }
    );

    load_requests();
    ensure_one_click_sample_action();
};
