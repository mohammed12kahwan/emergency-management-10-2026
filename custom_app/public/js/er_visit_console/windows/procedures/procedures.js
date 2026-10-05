
'use strict';


// =====================================================
// ER PROCEDURES
// الإجراءات الطبية
// =====================================================


let er_procedure_entry_rows = [];

let er_procedure_templates = [];


// =====================================================
// فتح قسم الإجراءات
// =====================================================

function load_procedures_section() {

    er_procedure_entry_rows = [];

    $("#er-content").html(`

        <div class="er-procedures-section">

             <!-- =========================================
                  إضافة الإجراءات
             ========================================== -->

            <div class="er-procedures-card er-collapsible-section">

                <div
                    class="er-procedures-header"
                    style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        user-select: none;
                    "
                    onclick="toggle_er_section('procedure-entry-content')"
                >

                    <h3>
                        ⚕️ إضافة الإجراءات الطبية
                    </h3>

                    <button
                        type="button"
                        class="er-collapse-toggle"
                        id="procedure-entry-toggle"
                        title="طي / توسيع"
                        style="
                            background: none;
                            border: none;
                            cursor: pointer;
                            font-size: 16px;
                            padding: 4px 8px;
                            color: #666;
                        "
                    >▼</button>

                </div>


                <div
                    id="procedure-entry-content"
                    class="er-collapsible-content"
                >

                    <div
                        id="procedure-entry-loading"
                        class="er-procedures-state"
                    >
                        ⏳ جاري تحميل الإجراءات...
                    </div>


                <div
                    class="table-responsive"
                >

                    <table
                        class="table table-bordered er-procedure-entry-table"
                    >

                        <thead>

                            <tr>

                                <th>
                                    #
                                </th>

                                <th>
                                    الإجراء
                                </th>

                                <th>
                                    الخدمة
                                </th>

                                <th>
                                    الكمية
                                </th>

                                <th>
                                    ملاحظة
                                </th>

                                <th>
                                    حذف
                                </th>

                            </tr>

                        </thead>


                        <tbody
                            id="procedure-entry-tbody"
                        ></tbody>


                        <tfoot style="display:none;">

                            <tr>

                                <th
                                    colspan="4"
                                    style="text-align:right;"
                                >
                                    إجمالي الإجراءات
                                </th>

                                <th
                                    id="procedure-entry-grand-total"
                                >
                                    0.00
                                </th>

                                <th></th>

                            </tr>

                        </tfoot>

                    </table>

                </div>


                <div
                    class="er-procedure-entry-controls"
                    style="margin-top: 8px;"
                >
                    <button
                        type="button"
                        class="btn btn-success btn-sm"
                        id="add-procedure-entry-row-inline"
                    >
                        ➕ إضافة إجراء
                    </button>
                
                <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    id="save-procedure-entry-rows"
                    style="margin-inline-start:6px;"
                >
                    💾 حفظ طلب الإجراء
                </button>

                    <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        id="submit-procedure-entries"
                    >
                        💾 إرسال الإجراءات
                    </button>

                </div>


                <div
                    id="procedure-entry-empty"
                    class="er-procedures-state"
                    style="display:none;"
                >
                    لم تتم إضافة أي إجراء بعد.
                    اضغط على «➕ إضافة إجراء».
                </div>

            </div>

        </div>


            <!-- =========================================
                 الإجراءات السابقة
            ========================================== -->

             <div
                 class="er-procedures-card er-collapsible-section"
             >

                 <div
                     class="er-procedures-header"
                     style="
                         display: flex;
                         justify-content: space-between;
                         align-items: center;
                         cursor: pointer;
                         user-select: none;
                     "
                     onclick="toggle_er_section('procedure-requests-content')"
                 >

                     <h3>
                         📋 الإجراءات المطلوبة
                     </h3>

                     <div
                         style="display: flex; align-items: center; gap: 4px;"
                     >

                         <button
                             type="button"
                             class="btn btn-outline-secondary btn-sm"
                             id="refresh-procedure-requests"
                             title="تحديث الإجراءات"
                             style="
                                 font-size: 14px;
                             "
                         >🔄</button>

                         <button
                             type="button"
                             class="er-collapse-toggle"
                             id="procedure-requests-toggle"
                             title="طي / توسيع"
                             style="
                                 background: none;
                                 border: none;
                                 cursor: pointer;
                                 font-size: 16px;
                                 padding: 4px 8px;
                                 color: #666;
                             "
                         >▼</button>

                     </div>

                 </div>


                 <div
                     id="procedure-requests-content"
                     class="er-collapsible-content"
                 >

                     <div
                         id="procedure-requests-loading"
                         class="er-procedures-state"
                         style="display:none;"
                     >
                         ⏳ جاري تحميل الإجراءات...
                     </div>


                     <div
                         id="procedure-requests-empty"
                         class="er-procedures-state"
                         style="display:none;"
                     ></div>


                     <div
                         id="procedure-requests-container"
                         class="er-procedure-requests-container"
                     ></div>

                 </div>

             </div>

        </div>

        <div id="procedure-autocomplete-portal"></div>

        <div id="er_procedures_activity" style="margin-top: 24px;"></div>

    `);

    render_activity_timeline("er_procedures_activity", "procedures");

    load_procedure_templates();

    load_procedure_requests();

}


// =====================================================
// تحميل قوالب الإجراءات
// =====================================================

function load_procedure_templates() {

    const loading =
        $("#procedure-entry-loading");


    frappe.db.get_list(

        "Clinical Procedure Template",

        {

            fields: [

                "name",
                "template",
                "item",
                "rate"

            ],

            filters: {

                disabled:
                    0

            },

            order_by:
                "template asc",

            limit_page_length:
                100

        }

    ).then(

        function(templates) {

            er_procedure_templates =
                templates || [];


            loading.hide();


            if (
                !er_procedure_entry_rows.length
            ) {

                add_procedure_entry_row();

            }

        }

    ).catch(

        function(error) {

            console.error(
                "ER PROCEDURE TEMPLATE ERROR:",
                error
            );


            loading
                .text(
                    "تعذر تحميل قوالب الإجراءات."
                );

        }

    );


    bind_refresh_button(
        "#refresh-procedure-requests",
        function() {

            load_procedure_requests();

        }
    );


    if (
        typeof toggle_er_section ===
        "function"
    ) {

        $("#procedure-entry-toggle").on(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                toggle_er_section(
                    "procedure-entry-content"
                );

            }
        );


        $("#procedure-requests-toggle").on(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                toggle_er_section(
                    "procedure-requests-content"
                );

            }
        );

    }


    $(document).off(
        "click.erProceduresSubmit",
        "#submit-procedure-entries"
    );


    $(document).on(
        "click.erProceduresSubmit",
        "#submit-procedure-entries",
        function() {

            submit_procedure_entries();

        }
    );

}


// =====================================================
// إضافة صف إجراء
// =====================================================

function add_procedure_entry_row() {

    er_procedure_entry_rows.push({

        id:
            Date.now() +
            Math.random(),

        procedure_template:
            "",

        item_code:
            "",

        quantity:
            1,

        rate:
            0,

        amount:
            0

    }    );


    render_procedure_entry_table();

}


// =====================================================
// رسم جدول الإدخال
// =====================================================

function render_procedure_entry_table() {

    const tbody =
        $("#procedure-entry-tbody");


    const empty =
        $("#procedure-entry-empty");


    if (!tbody.length) {
        return;
    }


    tbody.empty();


    if (
        !er_procedure_entry_rows.length
    ) {

        empty.show();

        update_procedure_grand_total();

        return;
    }


    empty.hide();


    er_procedure_entry_rows.forEach(

        function(row, index) {

            render_procedure_entry_row_portal(
                row,
                index
            );

        }

    );


    update_procedure_grand_total();

}


// =====================================================
// رسم صف واحد (بوابة خارجية)
// =====================================================



// =====================================================
// تحديث إجمالي صف
// =====================================================

function render_procedure_entry_row_portal(row, index) {
    const tbody = $("#procedure-entry-tbody");
    const tr = $("<tr>").attr("data-row-id", row.id);
    const input_wrapper = $("<div>");
    const procedure_control = frappe.ui.form.make_control({
        parent: input_wrapper[0],
        df: {
            fieldname: "procedure_template_" + row.id,
            fieldtype: "Link",
            options: "Clinical Procedure Template",
            placeholder: "ابحث باسم الإجراء..."
        },
        render_input: true
    });
    procedure_control.new_doc =
        function() {

            const dialog =
                new frappe.ui.Dialog({

                    title:
                        "🩺 قالب إجراء جديد",

                    fields:
                        [

                            {

                                fieldtype:
                                    "Data",

                                fieldname:
                                    "template",

                                label:
                                    "اسم الإجراء",

                                reqd:
                                    1

                            },

                            {

                                fieldtype:
                                    "Small Text",

                                fieldname:
                                    "description",

                                label:
                                    "الوصف",

                                reqd:
                                    1

                            },

                            {

                                fieldtype:
                                    "Link",

                                fieldname:
                                    "item_group",

                                label:
                                    "المجموعة",

                                options:
                                    "Item Group",

                                reqd:
                                    1

                            },

                            {

                                fieldtype:
                                    "Data",

                                fieldname:
                                    "item_code",

                                label:
                                    "كود الخدمة"

                            },

                            {

                                fieldtype:
                                    "Currency",

                                fieldname:
                                    "rate",

                                label:
                                    "السعر القياسي",

                                hidden:
                                    1

                            }

                        ],

                    primary_action_label:
                        "حفظ",

                    primary_action:
                        function(values) {

                            if (
                                !values.template
                                ||
                                !String(
                                    values.template
                                ).trim()
                            ) {

                                frappe.msgprint({

                                    title:
                                        "الإجراءات",

                                    message:
                                        "أدخل اسم الإجراء.",

                                    indicator:
                                        "orange"

                                });


                                return;

                            }


                            frappe.call({

                                method:
                                    "frappe.client.insert",

                                args: {

                                    doc: {

                                        doctype:
                                            "Clinical Procedure Template",

                                        template:
                                            String(
                                                values.template
                                            ).trim(),

                                        description:
                                            values.description
                                            ||
                                            "",

                                        item_group:
                                            values.item_group
                                            ||
                                            "",

                                        item_code:
                                            values.item_code
                                            ||
                                            "",

                                        rate:
                                            parseFloat(
                                                values.rate
                                            )
                                            ||
                                            0,

                                        is_billable:
                                            1,

                                        link_existing_item:
                                            0,

                                        disabled:
                                            0

                                    }

                                },

                                freeze:
                                    true,

                                freeze_message:
                                    "جاري إنشاء قالب الإجراء...",

                                callback:
                                    function(r) {

                                        if (
                                            r.exc
                                            ||
                                            !r.message
                                        ) {

                                            frappe.msgprint({

                                                title:
                                                    "الإجراءات",

                                                message:
                                                    "فشل إنشاء قالب الإجراء.",

                                                indicator:
                                                    "red"

                                            });


                                            return;

                                        }


                                        const doc =
                                            r.message;


                                        procedure_control.set_value(
                                            doc.name
                                        );


                                        row.procedure_template =
                                            doc.template
                                            ||
                                            doc.name
                                            ||
                                            "";

                                        row.item_code =
                                            doc.item
                                            ||
                                            "";

                                        row.rate =
                                            parseFloat(
                                                doc.rate
                                            )
                                            ||
                                            0;

                                        row.amount =
                                            row.quantity
                                            *
                                            row.rate;


                                        render_procedure_entry_table();


                                        dialog.hide();

                                    }

                            });

                        }

        });


        dialog.show();

    };

    procedure_control.refresh();


    if (
        procedure_control &&
        procedure_control.$input &&
        procedure_control.$input[0]
    ) {

        procedure_control.$input[0].addEventListener(
            "awesomplete-select",
            function(e) {

                var suggestion =
                    e.text;

                if (
                    suggestion &&
                    suggestion.value ===
                    "create_new__link_option"
                ) {

                    e.preventDefault();

                    e.stopPropagation();

                    if (
                        procedure_control.awesomplete
                    ) {

                        procedure_control.awesomplete.close();

                    }


                    procedure_control.new_doc();

                }

            },
            true
        );

    }


    if (
        procedure_control &&
        procedure_control.awesomplete &&
        procedure_control.$input
    ) {

        attach_link_autocomplete_portal({

            control:
                procedure_control,

            portal_selector:
                "#procedure-autocomplete-portal",

            row_reference:
                row,

            on_portal_ready:
                function() {}

        });

    }


    if (row.procedure_template) {
        procedure_control.set_value(row.procedure_template);

        frappe.db.get_doc(
            "Clinical Procedure Template",
            row.procedure_template
        ).then(function(template) {
            procedure_control.set_value(
                row.procedure_template,
                template.template || row.procedure_template
            );
        }).catch(function() {});
    }

    function apply_procedure_template(template) {
        row.procedure_template = template.template || template.name || "";
        row.item_code = template.item || "";
        row.rate = parseFloat(template.rate) || 0;
        row.amount = (parseFloat(row.quantity) || 0) * row.rate;
        render_procedure_entry_table();
    }

    procedure_control.$input.on("change.erProcedurePortal", function() {
        const value = procedure_control.get_value() || "";
        row.procedure_template = value;
        if (!value) {
            row.item_code = "";
            row.rate = 0;
            row.amount = 0;
            update_procedure_grand_total();
            return;
        }
        frappe.db.get_doc("Clinical Procedure Template", value).then(apply_procedure_template);
    });

    /* Native Frappe Link Control فقط. */


    tr.append($("<td>").text(index + 1));
    tr.append($("<td>").append(input_wrapper));
    tr.append($("<td>").append($("<input>").attr("type", "text").prop("readonly", true).addClass("form-control").val(row.item_code || "")));

    const quantity_input = $("<input>").attr({ type: "number", min: "0.01", step: "0.01" }).addClass("form-control").val(row.quantity || 1);
    quantity_input.on("input.erProcedurePortal", function() {
        row.quantity = parseFloat($(this).val()) || 0;
        row.amount = row.quantity * row.rate;
        update_procedure_grand_total();
    });
    tr.append($("<td>").append(quantity_input));

    const notes_textarea = $("<textarea>").addClass("form-control er-procedure-notes").attr("rows", 2).val(row.notes || "");
    notes_textarea.on("input.erProcedurePortal", function() { row.notes = $(this).val(); });
    notes_textarea.on("click.erProcedureNotes", function() {
        open_notes_dialog({ title: "📝 ملاحظات الإجراء", fieldname: "procedure_note", label: "ملاحظة", default_value: row.notes || "", row_reference: row, input_selector: notes_textarea });
    });
    tr.append($("<td>").append(notes_textarea));

    const delete_button = $("<button>").attr("type", "button").addClass("btn btn-sm btn-danger").text("🗑").on("click.erProcedurePortal", function() {
        er_procedure_entry_rows = er_procedure_entry_rows.filter(function(item) { return item.id !== row.id; });
        render_procedure_entry_table();
    });
    tr.append($("<td>").css("text-align", "center").append(delete_button));
    tbody.append(tr);
}


// =====================================================
// إجمالي الإجراءات
// =====================================================

function update_procedure_grand_total() {

    let total =
        0;


    er_procedure_entry_rows.forEach(

        function(row) {

            total +=
                parseFloat(
                    row.amount
                ) || 0;

        }

    );


    $("#procedure-entry-grand-total")
        .text(
            format_currency(
                total
            )
        );

}


// =====================================================
// إرسال جميع الإجراءات
// =====================================================

function submit_procedure_entries() {

    const encounter =
        current_encounter;


    if (!encounter) {

        frappe.msgprint({

            title:
                "تنبيه",

            message:
                "لا توجد زيارة طبية محددة.",

            indicator:
                "orange"

        });

        return;

    }


    const rows =
        er_procedure_entry_rows.filter(

            function(row) {

                return (
                    row.procedure_template
                );

            }

        );


    if (!rows.length) {

        frappe.msgprint({

            title:
                "تنبيه",

            message:
                "أضف إجراء واحدًا على الأقل.",

            indicator:
                "orange"

        });

        return;

    }


    for (
        let i = 0;
        i < rows.length;
        i++
    ) {

        if (
            !rows[i].quantity ||
            rows[i].quantity <= 0
        ) {

            frappe.msgprint({

                title:
                    "تنبيه",

                message:
                    "الكمية في الصف رقم " +
                    (i + 1) +
                    " غير صحيحة.",

                indicator:
                    "orange"

            });

            return;

        }

    }


    $("#submit-procedure-entries")
        .prop(
            "disabled",
            true
        );


    create_procedure_requests(
        encounter,
        rows,
        0,
        0,
        []
    );

}


// =====================================================
// إنشاء الطلبات واحدًا تلو الآخر
// =====================================================

function create_procedure_requests(
    encounter,
    rows,
    index,
    created_count,
    request_numbers
) {

    if (
        index >= rows.length
    ) {

        $("#submit-procedure-entries")
            .prop(
                "disabled",
                false
            );


        let message =
            "تم إنشاء " +
            created_count +
            " إجراء طبي بنجاح.";


        if (
            request_numbers.length
        ) {

            message +=
                "<br><br>أرقام الطلبات:<br>" +
                request_numbers.join(
                    "<br>"
                );

        }


        frappe.msgprint({

            title:
                "تم إرسال الإجراءات",

            message:
                message,

            indicator:
                "green"

        });


        er_procedure_entry_rows = [];

        render_procedure_entry_table();

        load_procedure_requests();

        return;
    }


    const row =
        rows[index];


    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.python.procedure.create_clinical_procedure",

        args: {

            data:
                JSON.stringify({

                    encounter:
                        encounter,

                    procedure_template:
                        row.procedure_template,

                    quantity:
                        row.quantity,

                    notes:
                        row.notes ||
                        ""

                })

        },

        freeze:
            false,

        callback:
            function(r) {

                if (
                    r.exc ||
                    !r.message ||
                    !r.message.request_number
                ) {
                    if (index === 0 && typeof er_visit_console_utils.add_activity === "function") {
                        er_visit_console_utils.add_activity(
                            "procedures",
                            "Procedure requested: " + (row.procedure_template || "Unknown")
                        );
                    }

                    console.error(
                        "ER PROCEDURE CREATE ERROR:",
                        r
                    );

                    frappe.msgprint({

                        title:
                            "خطأ",

                        message:
                            "فشل إنشاء الإجراء في الصف رقم " +
                            (index + 1),

                        indicator:
                            "red"

                    });


                    $("#submit-procedure-entries")
                        .prop(
                            "disabled",
                            false
                        );

                    return;

                }


                request_numbers.push(

                    r.message.request_number

                );


                create_procedure_requests(

                    encounter,

                    rows,

                    index + 1,

                    created_count + 1,

                    request_numbers

                );

            },

        error:
            function(err) {

                console.error(
                    "ER PROCEDURE AJAX ERROR:",
                    err
                );


                frappe.msgprint({

                    title:
                        "خطأ في الاتصال",

                    message:
                        "تعذر إنشاء الإجراء في الصف رقم " +
                        (index + 1),

                    indicator:
                        "red"

                });


                $("#submit-procedure-entries")
                    .prop(
                        "disabled",
                        false
                    );

            }

    });

}


// =====================================================
// تحميل الطلبات السابقة
// =====================================================

function load_procedure_requests() {

    const encounter =
        current_encounter;


    const loading =
        $("#procedure-requests-loading");


    const empty =
        $("#procedure-requests-empty");


    const container =
        $("#procedure-requests-container");


    if (!container.length) {
        return;
    }


    container.empty();

    empty.hide();


    if (!encounter) {

        empty
            .text(
                "لا توجد زيارة طبية محددة."
            )
            .show();

        return;

    }


    loading.show();


    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.python.procedure.get_clinical_procedures",

        args: {

            encounter:
                encounter

        },

        callback:
            function(r) {

                loading.hide();


                if (r.exc) {

                    console.error(
                        "ER PROCEDURE REQUEST ERROR:",
                        r.exc
                    );

                    empty
                        .text(
                            "حدث خطأ أثناء تحميل الإجراءات."
                        )
                        .show();

                    return;

                }


                const requests =
                    r.message || [];


                if (
                    !requests.length
                ) {

                    empty
                        .text(
                            "لا توجد إجراءات طبية مطلوبة لهذه الزيارة."
                        )
                        .show();

                    return;

                }


                requests.forEach(
                    render_procedure_request
                );

            },

        error:
            function(err) {

                loading.hide();

                console.error(
                    "ER PROCEDURE AJAX ERROR:",
                    err
                );

                empty
                    .text(
                        "تعذر الاتصال بالخادم."
                    )
                    .show();

            }

    });

}


// =====================================================
// بطاقة الإجراء السابق
// =====================================================

function render_procedure_request(
    request
) {

    const container =
        $("#procedure-requests-container");


    const card =
        $("<div>")
            .addClass(
                "er-procedure-request-card"
            );


    const header =
        $("<div>")
            .addClass(
                "er-procedure-request-header"
            );


    header.append(

        $("<div>")
            .addClass(
                "er-procedure-request-title"
            )
            .text(
                request.test_name ||
                request.item_name ||
                "إجراء طبي"
            )

    );


    header.append(

        $("<span>")
            .addClass(
                "er-procedure-status"
            )
            .text(
                get_procedure_billing_label(
                    request.billing_status
                )
            )

    );


    card.append(
        header
    );


    const details =
        $("<div>")
            .addClass(
                "er-procedure-request-details"
            );


    append_procedure_detail(
        details,
        "رقم الطلب",
        request.name ||
        "---"
    );


    append_procedure_detail(
        details,
        "الإجراء",
        request.test_name ||
        request.item_name ||
        "---"
    );


    append_procedure_detail(
        details,
        "الخدمة",
        request.item_code ||
        "---"
    );


    append_procedure_detail(
        details,
        "الكمية",
        request.quantity ||
        1
    );
append_procedure_detail(
        details,
        "حالة الفوترة",
        get_procedure_billing_label(
            request.billing_status
        )
    );


    if (
        request.sales_invoice
    ) {

        append_procedure_detail(
            details,
            "رقم الفاتورة",
            request.sales_invoice
        );

    }


    if (
        request.request_date
    ) {

        append_procedure_detail(
            details,
            "تاريخ الطلب",
            request.request_date
        );

    }


    if (
        request.clinical_procedure
    ) {

        append_procedure_detail(
            details,
            "Clinical Procedure",
            request.clinical_procedure
        );

    }


    card.append(
        details
    );


    if (
        request.notes
    ) {

        const notes =
            $("<div>")
                .addClass(
                    "er-procedure-result"
                );


        notes.append(

            $("<div>")
                .addClass(
                    "er-procedure-result-title"
                )
                .text(
                    "ملاحظات الطبيب"
                )

        );


        notes.append(

            $("<div>")
                .addClass(
                    "er-procedure-result-text"
                )
                .text(
                    request.notes
                )

        );


        card.append(
            notes
        );

    }


    container.append(
        card
    );

}


// =====================================================
// إضافة تفصيل
// =====================================================

function append_procedure_detail(
    container,
    label,
    value
) {

    const item =
        $("<div>")
            .addClass(
                "er-procedure-detail"
            );


    item.append(

        $("<span>")
            .addClass(
                "er-procedure-detail-label"
            )
            .text(
                label
            )

    );


    item.append(

        $("<strong>")
            .addClass(
                "er-procedure-detail-value"
            )
            .text(
                value
            )

    );


    container.append(
        item
    );

}


// =====================================================
// حالة الفوترة
// =====================================================

function get_procedure_billing_label(
    status
) {

    const map = {

        "Pending":
            "غير مفوتر",

        "Partly Invoiced":
            "مفوتر جزئيًا",

        "Invoiced":
            "✅ تمت الفوترة"

    };


    return (
        map[status] ||
        status ||
        "غير مفوتر"
    );

}


// =====================================================
// ربط الأزرار
// =====================================================

$(document).on(

    "click",

    "#add-procedure-entry-row-inline",

    function() {

        add_procedure_entry_row();

    }

);


bind_refresh_button(
    "#refresh-procedure-requests",
    function() {
        load_procedure_requests();
    }
);


/* ER PROCEDURE SAVE BUTTON */

$(document).off(
    "click.erProcedureSave",
    "#save-procedure-entry-rows"
);

$(document).on(
    "click.erProcedureSave",
    "#save-procedure-entry-rows",
    function(event) {

        event.preventDefault();
        event.stopPropagation();

        const button = $(this);

        if (button.prop("disabled")) {
            return;
        }

        if (
            typeof submit_procedure_entries !==
            "function"
        ) {

            frappe.msgprint({
                title: "الإجراءات",
                message:
                    "دالة حفظ طلب الإجراء غير متاحة.",
                indicator: "red"
            });

            return;
        }

        button
            .prop("disabled", true)
            .text("⏳ جاري الحفظ...");

        submit_procedure_entries(function(success) {

            button
                .prop("disabled", false)
                .text("💾 حفظ طلب الإجراء");

            if (success === false) {
                return;
            }

            frappe.show_alert({
                message:
                    "تم حفظ طلب الإجراء بنجاح",
                indicator: "green"
            });

        });

    }
);



/* ER PROCEDURE SAVE SYNC V2 */

$(document).off(
    "click.erProcedureSaveV2",
    "#save-procedure-entry-rows"
);

$(document).on(
    "click.erProcedureSaveV2",
    "#save-procedure-entry-rows",
    function(event) {

        event.preventDefault();
        event.stopPropagation();

        const button = $(this);

        if (button.prop("disabled")) {
            return;
        }

        /*
         * مزامنة الصفوف الظاهرة مع مصفوفة الإجراءات.
         */
        $(
            'tbody[id*="procedure"][id*="tbody"] tr'
        ).each(function(index) {

            const row =
                er_procedure_entry_rows[index];

            if (!row) {
                return;
            }

            const inputs =
                $(this).find(
                    "input, textarea, select"
                );

            const procedureValue =
                String(
                    inputs.eq(0).val() || ""
                ).trim();

            const notesValue =
                String(
                    inputs.eq(1).val() || ""
                ).trim();

            if (procedureValue) {

                [
                    "procedure",
                    "procedure_template",
                    "procedure_name",
                    "clinical_procedure",
                    "procedure_template_name"
                ].forEach(function(field) {

                    if (
                        Object.prototype.hasOwnProperty.call(
                            row,
                            field
                        )
                    ) {
                        row[field] = procedureValue;
                    }

                });

            }

            if (
                inputs.length > 1
            ) {

                [
                    "notes",
                    "description",
                    "reason"
                ].forEach(function(field) {

                    if (
                        Object.prototype.hasOwnProperty.call(
                            row,
                            field
                        )
                    ) {
                        row[field] = notesValue;
                    }

                });

            }

        });

        button
            .prop("disabled", true)
            .text("⏳ جاري الحفظ...");

        submit_procedure_entries(function(success) {

            button
                .prop("disabled", false)
                .text("💾 حفظ طلب الإجراء");

            if (success === false) {
                return;
            }

            frappe.show_alert({
                message:
                    "تم حفظ طلب الإجراء بنجاح",
                indicator: "green"
            });

        });

    }
);


/* =====================================================
   FINAL PROCEDURE SAVE BUTTON — SINGLE HANDLER
===================================================== */

(function () {

    function bind_final_procedure_save() {

        $(document).off(
            "click",
            "#save-procedure-entry-rows"
        );

        $("body").off(
            "click",
            "#save-procedure-entry-rows"
        );

        $(document).on(
            "click",
            "#save-procedure-entry-rows",
            function (event) {

                event.preventDefault();
                event.stopImmediatePropagation();

                const button = $(this);

                if (button.prop("disabled")) {
                    return;
                }

                const tbody =
                    $("#procedure-entry-tbody");

                const rows = [];

                tbody.find("tr").each(
                    function () {

                        const visibleControls =
                            $(this)
                                .find("input:visible, textarea:visible, select:visible");

                        let procedureValue = "";
                        let notesValue = "";

                        visibleControls.each(
                            function () {

                                const value =
                                    String(
                                        $(this).val() || ""
                                    ).trim();

                                if (!value) {
                                    return;
                                }

                                const cls =
                                    String(
                                        $(this).attr("class") || ""
                                    ).toLowerCase();

                                if (
                                    !procedureValue &&
                                    (
                                        cls.includes("procedure") ||
                                        cls.includes("link")
                                    )
                                ) {

                                    procedureValue = value;
                                    return;

                                }

                                if (
                                    !procedureValue
                                ) {

                                    procedureValue = value;
                                    return;

                                }

                                if (
                                    !notesValue
                                ) {

                                    notesValue = value;

                                }

                            }
                        );

                        if (procedureValue) {

                            rows.push({
                                procedure:
                                    procedureValue,

                                procedure_template:
                                    procedureValue,

                                procedure_name:
                                    procedureValue,

                                clinical_procedure:
                                    procedureValue,

                                procedure_template_name:
                                    procedureValue,

                                notes:
                                    notesValue,

                                description:
                                    notesValue,

                                reason:
                                    notesValue,

                                quantity:
                                    1

                            });

                        }

                    }
                );

                if (!rows.length) {

                    frappe.msgprint({
                        title: "الإجراءات",
                        message:
                            "أدخل اسم الإجراء أولًا ثم اضغط حفظ.",
                        indicator: "orange"
                    });

                    return;
                }

                /*
                 * اجعل المصدر الذي تقرأ منه
                 * submit_procedure_entries()
                 * هو الصفوف الظاهرة فعليًا.
                 */
                er_procedure_entry_rows =
                    rows;

                button
                    .prop("disabled", true)
                    .text("⏳ جاري الحفظ...");

                if (
                    typeof submit_procedure_entries !==
                    "function"
                ) {

                    button
                        .prop("disabled", false)
                        .text("💾 حفظ طلب الإجراء");

                    frappe.msgprint({
                        title: "الإجراءات",
                        message:
                            "دالة حفظ طلب الإجراء غير متاحة.",
                        indicator: "red"
                    });

                    return;
                }

                submit_procedure_entries();

                setTimeout(
                    function () {

                        button
                            .prop("disabled", false)
                            .text("💾 حفظ طلب الإجراء");

                    },
                    1500
                );

            }
        );

    }

    bind_final_procedure_save();

})();
