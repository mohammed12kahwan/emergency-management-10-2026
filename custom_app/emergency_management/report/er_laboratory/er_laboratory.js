frappe.query_reports["ER Laboratory"] = {
    filters: [
        {
            fieldname: "collection_date",
            label: __("تاريخ الجمع"),
            fieldtype: "Date",
        },
        {
            fieldname: "status",
            label: __("الحالة"),
            fieldtype: "Select",
            options: "\nفارغ / لم يتم الجمع\nتم الجمع",
        },
        {
            fieldname: "patient",
            label: __("رقم المريض"),
            fieldtype: "Link",
            options: "Patient",
        },
        {
            fieldname: "sales_invoice",
            label: __("رقم الفاتورة"),
            fieldtype: "Link",
            options: "Sales Invoice",
        },
        {
            fieldname: "sample_number",
            label: __("رقم العينة"),
            fieldtype: "Link",
            options: "Sample Collection",
        },
        {
            fieldname: "medical_department",
            label: __("القسم الطبي"),
            fieldtype: "Link",
            options: "Medical Department",
        },
    ],

    onload: function (report) {
        report.page.add_inner_button(__("تحديث"), function () {
            report.refresh();
        });

        const department_message_button =
            report.page.add_inner_button(
                __("💬 الرسائل"),
                function () {

                    er_department_message_open_department_inbox(
                        "laboratory"
                    );

                }
            );

        if (
            typeof er_department_message_bind_page_button ===
            "function"
        ) {

            er_department_message_bind_page_button(
                department_message_button,
                "laboratory"
            );

        }

    },
};
