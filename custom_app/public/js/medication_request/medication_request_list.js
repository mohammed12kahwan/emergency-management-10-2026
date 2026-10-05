/* =========================================================
   MEDICATION REQUEST
   ER PHARMACY - FRAPPE NATIVE LIST VIEW
   ---------------------------------------------------------
   يعتمد بالكامل على List View القياسي في Frappe
   ولا يغيّر هيكل الصفحة الأصلي.

   المرحلة الحالية:
   - تخصيص أعمدة العرض
   - ترجمة الحالات
   - تلوين الحالة
   - إبقاء الفلاتر والبحث والفرز وPagination الأصلية
   - لا توجد فاتورة أو حركة مخزون في هذه المرحلة
========================================================= */

(() => {
    "use strict";


    // =====================================================
    // CONSTANTS
    // =====================================================

    const ER_ADMIN_STATUS = {
        PENDING: "Pending",
        COMPLETED: "Completed",
        CANCELLED: "Cancelled"
    };


    // =====================================================
    // HELPERS
    // =====================================================

    function escape_html(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return frappe.utils.escape_html(
            String(value)
        );
    }


    function request_status_label(value) {

        const labels = {

            "draft-Medication Request Status":
                "مسودة",

            "active-Medication Request Status":
                "نشط",

            "completed-Medication Request Status":
                "مكتمل",

            "stopped-Medication Request Status":
                "متوقف",

            "cancelled-Medication Request Status":
                "ملغي",

            "canceled-Medication Request Status":
                "ملغي",

            "active-Request Status":
                "قيد الانتظار"
        };

        return (
            labels[value] ||
            value ||
            "غير محدد"
        );
    }


    function administration_status_label(value) {

        const labels = {

            Pending:
                "بانتظار الصرف",

            Completed:
                "تم الصرف",

            Cancelled:
                "ملغي"
        };

        return (
            labels[value] ||
            value ||
            "غير محدد"
        );
    }


    function administration_status_class(value) {

        if (
            value ===
            ER_ADMIN_STATUS.COMPLETED
        ) {
            return "er-mr-status-completed";
        }


        if (
            value ===
            ER_ADMIN_STATUS.CANCELLED
        ) {
            return "er-mr-status-cancelled";
        }


        return "er-mr-status-pending";
    }


    function priority_label(value) {

        const labels = {

            "Routine-Priority":
                "اعتيادي",

            "Urgent-Priority":
                "عاجل",

            "Stat-Priority":
                "طارئ"
        };

        return (
            labels[value] ||
            value ||
            "-"
        );
    }


    // =====================================================
    // STATUS COLOR
    // =====================================================

    function request_status_class(value) {

        if (!value) {
            return "er-mr-request-default";
        }


        const status =
            String(value).toLowerCase();


        if (
            status.includes("completed")
        ) {
            return "er-mr-request-completed";
        }


        if (
            status.includes("cancelled") ||
            status.includes("canceled")
        ) {
            return "er-mr-request-cancelled";
        }


        if (
            status.includes("stopped")
        ) {
            return "er-mr-request-stopped";
        }


        if (
            status.includes("active")
        ) {
            return "er-mr-request-active";
        }


        return "er-mr-request-default";
    }


    // =====================================================
    // CSS
    // يتم حقنه مرة واحدة
    // ولا يغيّر بنية Frappe
    // =====================================================

    function inject_styles() {

        if (
            document.getElementById(
                "er-medication-request-list-css"
            )
        ) {
            return;
        }


        const style =
            document.createElement("style");


        style.id =
            "er-medication-request-list-css";


        style.textContent = `

            /* ---------------------------------------------
               RTL alignment for this DocType only
            --------------------------------------------- */

            body[data-route*="medication-request"]
            .list-row-container,
            body[data-route*="medication-request"]
            .list-row {
                direction: rtl;
            }


            /* ---------------------------------------------
               Row hover
            --------------------------------------------- */

            body[data-route*="medication-request"]
            .list-row-container
            .list-row:hover {
                background: #f8fbff;
            }


            /* ---------------------------------------------
               Patient
            --------------------------------------------- */

            .er-mr-patient {
                font-weight: 600;
                color: #1f2937;
            }


            /* ---------------------------------------------
               Medication Item
            --------------------------------------------- */

            .er-mr-item {
                font-weight: 600;
                color: #374151;
            }


            /* ---------------------------------------------
               Quantity
            --------------------------------------------- */

            .er-mr-quantity {
                font-weight: 700;
                color: #1f2937;
            }


            /* ---------------------------------------------
               Administration Status
            --------------------------------------------- */

            .er-mr-admin-status,
            .er-mr-request-status {
                display: inline-flex;
                align-items: center;
                justify-content: center;

                min-width: 82px;

                padding: 4px 9px;

                border-radius: 999px;

                font-size: 11px;
                font-weight: 600;

                white-space: nowrap;
            }


            .er-mr-status-pending {
                background: #fff7e6;
                color: #996800;
            }


            .er-mr-status-completed {
                background: #ecfdf3;
                color: #166534;
            }


            .er-mr-status-cancelled {
                background: #fef2f2;
                color: #b91c1c;
            }


            /* ---------------------------------------------
               Original request status
            --------------------------------------------- */

            .er-mr-request-active {
                background: #ecfdf3;
                color: #166534;
            }


            .er-mr-request-completed {
                background: #ecfdf3;
                color: #166534;
            }


            .er-mr-request-cancelled {
                background: #fef2f2;
                color: #b91c1c;
            }


            .er-mr-request-stopped {
                background: #fff7ed;
                color: #9a3412;
            }


            .er-mr-request-default {
                background: #f3f4f6;
                color: #4b5563;
            }

        `;


        document.head.appendChild(style);
    }


    // =====================================================
    // LIST VIEW SETTINGS
    // =====================================================

    frappe.listview_settings["Medication Request"] = {

        // -------------------------------------------------
        // الحقول الإضافية المطلوبة للعرض
        // -------------------------------------------------

        add_fields: [

            "patient",

            "patient_name",

            "medication",

            "medication_item",

            "quantity",

            "dosage_form",

            "dosage",

            "period",

            "priority",

            "status",

            "er_administration_status",

            "order_date",

            "practitioner_name",

            "reason_reference",

            "order_group"

        ],


        // -------------------------------------------------
        // ترتيب الطلبات
        // -------------------------------------------------

        order_by:
            "creation desc",


        // -------------------------------------------------
        // Onload
        // -------------------------------------------------

        onload(listview) {

            console.log(
                "ER Pharmacy Medication Request List loaded"
            );


            inject_styles();

            const button =
                listview.page.add_inner_button(
                    __("💬 الرسائل"),
                    function () {

                        er_department_message_open_department_inbox(
                            "pharmacy"
                        );

                    }
                );

            er_department_message_bind_page_button(
                button,
                "pharmacy"
            );

        },


        // -------------------------------------------------
        // Refresh
        // -------------------------------------------------

        refresh(listview) {

            inject_styles();

            er_department_message_update_page_buttons();

        },


        // -------------------------------------------------
        // Formatters
        // -------------------------------------------------

        formatters: {

            patient_name(value) {

                return `
                    <span class="er-mr-patient">
                        ${escape_html(
                            value || "-"
                        )}
                    </span>
                `;
            },


            medication_item(value) {

                return `
                    <span class="er-mr-item">
                        ${escape_html(
                            value || "-"
                        )}
                    </span>
                `;
            },


            quantity(value) {

                return `
                    <span class="er-mr-quantity">
                        ${escape_html(
                            value ?? 0
                        )}
                    </span>
                `;
            },


            priority(value) {

                return escape_html(
                    priority_label(value)
                );
            },


            er_administration_status(value) {

                const label =
                    administration_status_label(
                        value
                    );


                const css =
                    administration_status_class(
                        value
                    );


                return `
                    <span
                        class="
                            er-mr-admin-status
                            ${css}
                        "
                    >
                        ${escape_html(label)}
                    </span>
                `;
            },


            status(value) {

                const label =
                    request_status_label(
                        value
                    );


                const css =
                    request_status_class(
                        value
                    );


                return `
                    <span
                        class="
                            er-mr-request-status
                            ${css}
                        "
                    >
                        ${escape_html(label)}
                    </span>
                `;
            }

        }

    };

})();