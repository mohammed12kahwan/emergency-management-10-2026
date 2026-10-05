frappe.ui.form.on("Diagnostic Report", {
    refresh(frm) {
        frm.set_df_property("status", "label", "الحالة");
        frm.set_df_property("observation", "label", "الملاحظات");
        frm.page.set_title("تقرير التشخيص");

        if (!frm.is_new() && !frm.custom_bulk_approve_added) {
            const bulk_approve_button = frm.add_custom_button(
                __("اعتماد جميع النتائج"),
                function () {
                    if (frm.doc.status === "Approved") {
                        frappe.show_alert({
                            message: __("جميع نتائج التقرير معتمدة بالفعل."),
                            indicator: "green",
                        });
                        return;
                    }

                    frappe.confirm(
                        __("هل تريد اعتماد جميع نتائج هذا التقرير دفعة واحدة؟"),
                        function () {
                            bulk_approve_button
                                .prop("disabled", true)
                                .text(__("جاري اعتماد النتائج..."));

                            frappe.call({
                                method:
                                    "custom_app.emergency_management.page.er_laboratory.er_laboratory.approve_all_diagnostic_report_observations",

                                args: {
                                    report_name: frm.doc.name,
                                },

                                freeze: true,

                                freeze_message:
                                    __("جاري اعتماد جميع النتائج..."),

                                callback: function (response) {
                                    bulk_approve_button
                                        .prop("disabled", false)
                                        .text(__("اعتماد جميع النتائج"));

                                    if (response.exc) {
                                        return;
                                    }

                                    const result =
                                        response.message || {};

                                    frappe.show_alert({
                                        message:
                                            result.message ||
                                            __("تم اعتماد جميع النتائج."),
                                        indicator: "green",
                                    });

                                    frm.reload_doc();
                                },

                                error: function () {
                                    bulk_approve_button
                                        .prop("disabled", false)
                                        .text(__("اعتماد جميع النتائج"));
                                },
                            });
                        }
                    );
                }
            );

            bulk_approve_button
                .addClass("btn-success btn-lg")
                .css({
                    "font-weight": "700",
                    "font-size": "14px",
                    "padding": "8px 18px",
                    "margin-right": "8px",
                    "border-radius": "7px",
                });

            frm.custom_bulk_approve_added = true;
        }

        if (!frm.is_new() && !frm.custom_print_added) {
            frm.add_custom_button(__("طباعة التقرير"), function () {
                frappe.call({
                    method: "custom_app.emergency_management.page.er_visit_console.python.labs.labs.mark_diagnostic_report_printed",
                    args: { report_name: frm.doc.name },
                    callback: function (response) {
                        if (!response.exc) {
                            frm.print_doc();
                        }
                    },
                });
            });
            frm.custom_print_added = true;
        }
    },
});

(function () {
    if (
        typeof healthcare === "undefined" ||
        !healthcare.Diagnostic ||
        !healthcare.Diagnostic.DiagnosticReport ||
        !healthcare.Diagnostic.DiagnosticReport.prototype
    ) {
        return;
    }

    const controller = healthcare.Diagnostic.DiagnosticReport.prototype;
    if (controller.er_custom_refresh) {
        return;
    }

    controller.er_custom_refresh = controller.refresh;
    controller.refresh = function () {
        if (this.frm.doc.ref_doctype !== "Lab Test") {
            return this.er_custom_refresh();
        }

        const report_controller = this;
        frappe.call({
            method: "custom_app.emergency_management.page.er_laboratory.er_laboratory.get_er_diagnostic_report_observations",
            args: { report_name: this.frm.doc.name },
            freeze: true,
            callback: function (response) {
                report_controller.ObservationWidgets = [];
                report_controller.create_widget({
                    message: response.message || [[], 0],
                });
            },
        });
        this.save_action("load");
    };
})();
