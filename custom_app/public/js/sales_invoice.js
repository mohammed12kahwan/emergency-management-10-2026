'use strict';


// =====================================================
// ER SALES INVOICE
// طلبات الطوارئ
// =====================================================


frappe.ui.form.on(
    "Sales Invoice",
    {

        refresh: function(frm) {

            setTimeout(
                function() {

                    add_er_emergency_requests_action(
                        frm
                    );

                },
                300
            );

        },

        patient: function(frm) {

            setTimeout(
                function() {

                    add_er_emergency_requests_action(
                        frm
                    );

                },
                500
            );

        }

    }
);


// =====================================================
// إضافة طلبات الطوارئ
// داخل: الحصول على البنود من
// =====================================================

function add_er_emergency_requests_action(frm) {

    frm.add_custom_button(

        __("طلبات الطوارئ"),

        function() {

            open_er_diagnostic_requests(
                frm
            );

        },

        __("Get Items From")

    );

}


// =====================================================
// فتح طلبات الطوارئ
// =====================================================

function open_er_diagnostic_requests(frm) {

    if (!frm.doc.patient) {

        frappe.msgprint({

            title:
                __("تنبيه"),

            message:
                __("يجب اختيار المريض أولًا."),

            indicator:
                "orange"

        });

        return;
    }


    frappe.call({

        method:
            "custom_app.emergency_management.api.sales_invoice.get_patient_diagnostic_requests",

        args: {

            patient:
                frm.doc.patient,

            company:
                frm.doc.company

        },

        freeze:
            true,

        freeze_message:
            __("جاري تحميل طلبات الطوارئ..."),

        callback:
            function(r) {

                if (r.exc) {

                    console.error(
                        "ER REQUESTS ERROR:",
                        r.exc
                    );

                    frappe.msgprint({

                        title:
                            __("خطأ"),

                        message:
                            __("تعذر تحميل طلبات الطوارئ."),

                        indicator:
                            "red"

                    });

                    return;
                }


                const requests =
                    r.message || [];


                if (!requests.length) {

                    frappe.msgprint({

                        title:
                            __("طلبات الطوارئ"),

                        message:
                            __("لا توجد طلبات طوارئ غير مفوترة لهذا المريض."),

                        indicator:
                            "blue"

                    });

                    return;
                }


                show_er_diagnostic_requests_dialog(

                    frm,

                    requests

                );

            }

    });

}


// =====================================================
// نافذة طلبات الطوارئ
// =====================================================

function show_er_diagnostic_requests_dialog(
    frm,
    requests
) {

    const dialog =
        new frappe.ui.Dialog({

            title:
                "📋 طلبات الطوارئ",

            fields: [

                {
                    fieldname:
                        "requests",

                    fieldtype:
                        "Table",

                    label:
                        "الطلبات المتاحة",

                    cannot_add_rows:
                        true,

                    cannot_delete_rows:
                        true,

                    data:
                        requests.map(

                            function(request) {

                                return {

                                    request_number:
                                        request.name,

                                    request_type:
                                        request.request_type,

                                    test_name:
                                        request.test_name,

                                    item_code:
                                        request.item_code,

                                    quantity:
                                        request.quantity,

                                    rate:
                                        request.rate,

                                    amount:
                                        request.amount,

                                    billing_status:
                                        request.billing_status

                                };

                            }

                        ),

                    fields: [

                        {
                            fieldname:
                                "request_number",

                            label:
                                "رقم الطلب",

                            fieldtype:
                                "Data",

                            in_list_view:
                                1,

                            read_only:
                                1

                        },

                        {
                            fieldname:
                                "request_type",

                            label:
                                "النوع",

                            fieldtype:
                                "Data",

                            in_list_view:
                                1,

                            read_only:
                                1

                        },

                        {
                            fieldname:
                                "test_name",

                            label:
                                "الفحص / الخدمة",

                            fieldtype:
                                "Data",

                            in_list_view:
                                1,

                            read_only:
                                1

                        },

                        {
                            fieldname:
                                "item_code",

                            label:
                                "Item",

                            fieldtype:
                                "Data",

                            in_list_view:
                                1,

                            read_only:
                                1

                        },

                        {
                            fieldname:
                                "quantity",

                            label:
                                "الكمية",

                            fieldtype:
                                "Float",

                            in_list_view:
                                1,

                            read_only:
                                1

                        },

                        {
                            fieldname:
                                "rate",

                            label:
                                "السعر",

                            fieldtype:
                                "Currency",

                            in_list_view:
                                1,

                            read_only:
                                1

                        },

                        {
                            fieldname:
                                "amount",

                            label:
                                "الإجمالي",

                            fieldtype:
                                "Currency",

                            in_list_view:
                                1,

                            read_only:
                                1

                        },

                        {
                            fieldname:
                                "billing_status",

                            label:
                                "الفوترة",

                            fieldtype:
                                "Data",

                            in_list_view:
                                1,

                            read_only:
                                1

                        }

                    ]

                }

            ],

            primary_action_label:
                "إضافة المحدد إلى الفاتورة",

            primary_action:
                function() {

                    const grid =
                        dialog.fields_dict
                            .requests
                            .grid;


                    const selected_rows =
                        grid.get_selected_children();


                    if (
                        !selected_rows ||
                        !selected_rows.length
                    ) {

                        frappe.msgprint({

                            title:
                                __("تنبيه"),

                            message:
                                __("اختر طلبًا واحدًا على الأقل."),

                            indicator:
                                "orange"

                        });

                        return;
                    }


                    const selected_names =
                        selected_rows.map(

                            function(row) {

                                return row.request_number;

                            }

                        );


                    const selected_requests =
                        requests.filter(

                            function(request) {

                                return selected_names.includes(
                                    request.name
                                );

                            }

                        );


                    add_er_requests_to_invoice(

                        frm,

                        selected_requests

                    );


                    dialog.hide();

                }

        });


    dialog.show();

}


// =====================================================
// إضافة الطلبات إلى جدول الأصناف
// =====================================================

function add_er_requests_to_invoice(
    frm,
    requests
) {

    let added =
        0;

    let skipped =
        0;


    requests.forEach(

        function(request) {

            // =============================================
            // منع التكرار
            // =============================================

            const exists =
                (frm.doc.items || []).some(

                    function(row) {

                        return (
                            row.er_diagnostic_request ===
                            request.name
                        );

                    }

                );


            if (exists) {

                skipped++;

                return;
            }


            // =============================================
            // إنشاء سطر
            // =============================================

            const row =
                frm.add_child(
                    "items"
                );


            // =============================================
            // Item
            // =============================================

            row.item_code =
                request.item_code;


            // =============================================
            // اسم السلعة
            // =============================================

            row.item_name =
                request.item_name
                || request.test_name
                || request.item_code;


            // =============================================
            // الوصف
            // =============================================

            row.description =
                request.description
                || request.test_name
                || request.item_name
                || request.item_code;


            // =============================================
            // وحدة القياس
            // =============================================

            row.uom =
                request.uom
                || request.stock_uom
                || "Nos";


            row.stock_uom =
                request.stock_uom
                || request.uom
                || "Nos";


            // =============================================
            // الكمية
            // =============================================

            row.qty =
                request.quantity
                || 1;


            // =============================================
            // السعر
            // =============================================

            row.rate =
                request.rate
                || 0;


            // =============================================
            // الإجمالي
            // =============================================

            row.amount =
                row.qty *
                row.rate;


            // =============================================
            // حساب الدخل
            // =============================================

            if (
                request.income_account
            ) {

                row.income_account =
                    request.income_account;

            }


            // =============================================
            // رقم طلب الطوارئ
            // =============================================

            row.er_diagnostic_request =
                request.name;


            added++;

        }

    );


    frm.refresh_field(
        "items"
    );


    // =============================================
    // إعادة حساب الفاتورة
    // =============================================

    frm.trigger(
        "calculate_taxes_and_totals"
    );


    // =============================================
    // رسالة
    // =============================================

    let message =
        "تمت إضافة " +
        added +
        " طلب/طلبات طوارئ إلى الفاتورة.";


    if (skipped) {

        message +=
            "<br>تم تجاهل " +
            skipped +
            " طلب مكرر.";

    }


    frappe.show_alert({

        message:
            message,

        indicator:
            "green"

    });

}