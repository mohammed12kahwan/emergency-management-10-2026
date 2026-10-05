'use strict';


/* =====================================================
   ER LABS
   المختبر

   يعتمد على:
   - Item
   - ER Diagnostic Request
   - Lab Test

   التصميم:
   - إضافة فحص
   - تعديل الكمية
   - عرض السعر والإجمالي
   - عرض الطلبات السابقة
   - عرض نتائج المختبر
   - القائمة المنسدلة تستخدم نفس أسلوب Radiology
   - الأزرار الخاصة تظهر أسفل القائمة فقط
   - نتائج المختبر قابلة للطي والتوسيع
===================================================== */


/* =====================================================
   الصفوف الحالية
===================================================== */

let er_lab_entry_rows = [];


/* =====================================================
   حالة قسم نتائج المختبر
===================================================== */

let er_lab_results_collapsed = false;


/* =====================================================
   فتح قسم المختبر
===================================================== */

function load_labs_section() {

    er_lab_entry_rows = [];


    $("#er-content").html(`

        <div class="er-labs-section">

            <!-- =================================================
                 بوابة القائمة المنسدلة
            ================================================= -->

            <div
                id="lab-autocomplete-portal"
                class="er-autocomplete-portal"
            ></div>


            <!-- =================================================
                 إضافة الفحوصات
            ================================================= -->

            <div class="er-labs-card">

                <div
                    class="er-labs-header"
                    style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    "
                >

                    <h3>
                        🧪 إضافة فحوصات المختبر
                    </h3>


                    <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        id="refresh-lab-requests"
                        style="cursor: pointer;"
                    >
                        🔄 تحديث
                    </button>

                </div>


                <div
                    id="lab-entry-empty"
                    class="er-labs-state"
                    style="display:none;"
                >
                    أضف فحصًا مخبريًا واحدًا على الأقل.
                </div>


                <div class="table-responsive">

                    <table
                        class="table table-bordered er-lab-entry-table"
                        id="lab-entry-table"
                    >

                        <thead>

                            <tr>

                                <th>
                                    #
                                </th>

                                <th>
                                    الفحص
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
                            id="lab-entry-tbody"
                        ></tbody>


                        <tfoot style="display:none;">

                            <tr>

                                <th
                                    colspan="4"
                                    style="text-align:right;"
                                >
                                    إجمالي الفحوصات
                                </th>

                                <th
                                    id="lab-entry-grand-total"
                                >
                                    0.00
                                </th>

                                <th></th>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>


            <!-- =================================================
                 زر إضافة فحص
            ================================================= -->

            <div
                id="lab-entry-controls"
                class="er-lab-entry-controls"
                style="margin-top: 8px; text-align:center;"
            >

                <button
                    type="button"
                    class="btn btn-success btn-sm"
                    id="add-lab-entry-row-inline"
                >
                    ➕ إضافة فحص
                </button>

                <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    id="save-lab-requests-inline"
                    style="margin-right: 8px;"
                >
                    💾 حفظ طلب المختبر
                </button>

            </div>


            <!-- =================================================
                 الطلبات السابقة
            ================================================= -->

            <div class="er-labs-card">

                <div
                    class="er-labs-header"
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                    "
                >

                    <h3>
                        📋 طلبات المختبر
                    </h3>


                    <button
                        type="button"
                        class="er-collapse-toggle"
                        id="lab-requests-toggle"
                        title="طي / توسيع"
                        style="
                            background:none;
                            border:none;
                            cursor:pointer;
                            font-size:16px;
                            padding:4px 8px;
                            color:#666;
                        "
                    >
                        ▼
                    </button>

                </div>


                <div
                    id="lab-requests-content"
                    class="er-collapsible-content"
                >

                    <div
                        id="lab-requests-loading"
                        class="er-labs-state"
                        style="display:none;"
                    >
                        ⏳ جاري تحميل الفحوصات...
                    </div>


                    <div
                        id="lab-requests-empty"
                        class="er-labs-state"
                        style="display:none;"
                    ></div>


                    <div
                        id="lab-requests-container"
                        class="er-lab-requests-container"
                    ></div>

                </div>


                <!-- =================================================
                     نتائج المختبر
                ================================================= -->

                <div class="er-lab-results-section">

                    <div
                        class="er-lab-section-header"
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                        "
                    >

                        <h3>
                            🧪 نتائج المختبر
                        </h3>


                        <button
                            type="button"
                            class="er-collapse-toggle"
                            id="lab-results-toggle"
                            title="طي / توسيع"
                            style="
                                background:none;
                                border:none;
                                cursor:pointer;
                                font-size:16px;
                                padding:4px 8px;
                                color:#666;
                            "
                        >
                            ▼
                        </button>

                    </div>


                    <div
                        id="lab-results-content"
                        class="er-collapsible-content"
                    >

                        <div
                            id="lab-results-container"
                            class="er-lab-results-container"
                        ></div>


                        <div
                            id="lab-results-empty"
                            class="er-labs-state"
                            style="display:none;"
                        >
                            لا توجد نتائج مختبر مكتملة.
                        </div>

                    </div>

                </div>

            </div>


            <!-- =================================================
                 Activity Timeline
            ================================================= -->

            <div
                id="er_labs_activity"
                style="margin-top:24px;"
            ></div>

        </div>

    `);


    /* =================================================
       زر التحديث
    ================================================= */

    bind_refresh_button(
        "#refresh-lab-requests",
        function() {

            load_lab_requests();

        }
    );


    /* =================================================
       طي / توسيع الطلبات السابقة
    ================================================= */

    if (
        typeof toggle_er_section ===
        "function"
    ) {

        $("#lab-requests-toggle").on(
            "click.erLabs",
            function() {

                toggle_er_section(
                    "lab-requests-content"
                );

            }
        );


        $("#lab-results-toggle").on(
            "click.erLabs",
            function() {

                er_lab_results_collapsed =
                    !er_lab_results_collapsed;


                const $content =
                    $("#lab-results-content");


                const $button =
                    $("#lab-results-toggle");


                if (
                    er_lab_results_collapsed
                ) {

                    $content.hide();

                    $button.text("◀");

                }
                else {

                    $content.show();

                    $button.text("▼");

                }

            }
        );

    }


    /* =================================================
       Timeline
    ================================================= */

    render_activity_timeline(
        "er_labs_activity",
        "labs"
    );


    /* =================================================
       صف أول
    ================================================= */

    add_lab_entry_row();


    /* =================================================
       تحميل الطلبات السابقة
    ================================================= */

    load_lab_requests();

}


/* =====================================================
   إضافة صف فحص
===================================================== */

function add_lab_entry_row() {

    er_lab_entry_rows.push({

        id:
            "lab-"
            +
            Date.now()
            +
            "-"
            +
            Math.random()
                .toString(36)
                .substring(
                    2,
                    8
                ),

        item_code:
            "",

        test_name:
            "",

        quantity:
            1,

        rate:
            0,

        amount:
            0,

        notes:
            ""

    });


    render_lab_entry_table();

}


/* =====================================================
   رسم جدول إضافة الفحوصات
===================================================== */

function render_lab_entry_table() {

    const tbody =
        $("#lab-entry-tbody");


    const empty =
        $("#lab-entry-empty");


    if (
        !tbody.length
    ) {

        return;

    }


    tbody.empty();


    if (
        !er_lab_entry_rows.length
    ) {

        if (
            empty.length
        ) {

            empty.show();

        }


        update_lab_grand_total();

        return;

    }


    if (
        empty.length
    ) {

        empty.hide();

    }


    er_lab_entry_rows.forEach(

        function(
            row,
            index
        ) {

            render_lab_entry_row_portal(
                row,
                index
            );

        }

    );


    /*
     * لا ننشئ القائمة المنسدلة هنا.
     * portal يتم التحكم به من attach_link_autocomplete_portal.
     */

    update_lab_grand_total();

}


/* =====================================================
   رسم صف فحص واحد
===================================================== */

function render_lab_entry_row_portal(
    row,
    index
) {

    const tbody =
        $("#lab-entry-tbody");


    if (
        !tbody.length
    ) {

        return;

    }


    const tr =
        $("<tr>")
            .attr(
                "data-row-id",
                row.id
            );


    /* =================================================
       الرقم
    ================================================= */

    tr.append(

        $("<td>")
            .text(
                index + 1
            )

    );


    /* =================================================
       حقل الفحص
    ================================================= */

    const input_wrapper =
        $("<div>");


    const test_control =
        frappe.ui.form.make_control({

            parent:
                input_wrapper[0],

            df: {

                fieldname:
                    "lab_test_" +
                    row.id,

                fieldtype:
                    "Link",

                options:
                    "Lab Test Template",

                placeholder:
                    "ابحث باسم الفحص أو الكود..."

            },

            render_input:
                true

        });


    test_control.refresh();

    /*
     * عند اختيار Lab Test Template:
     * test_name = اسم القالب
     * item_code = Item المرتبط بالقالب
     *
     * مثال:
     * ER CBC -> LAB-CBC
     */
    if (
        test_control.$input &&
        test_control.$input.length
    ) {

        test_control.$input
            .off(
                "change.erLabTemplateBinding"
            )
            .on(
                "change.erLabTemplateBinding",
                function() {

                    const template =
                        String(
                            test_control.get_value() ||
                            $(this).val() ||
                            ""
                        ).trim();

                    row.test_name =
                        template;

                    row.item_code =
                        "";

                    if (!template) {
                        render_lab_entry_table();
                        return;
                    }

                    frappe.db.get_value(
                        "Lab Test Template",
                        template,
                        "item"
                    ).then(
                        function(result) {

                            const item =
                                result &&
                                result.message
                                    ? result.message.item
                                    : "";

                            row.item_code =
                                item || "";

                            render_lab_entry_table();

                        }
                    );

                }
            );
    }


    test_control.new_doc =
        function() {

            const dialog =
                new frappe.ui.Dialog({

                    title:
                        "🧪 فحص مختبري جديد",

                    fields:
                        [

                            {

                                fieldtype:
                                    "Data",

                                fieldname:
                                    "lab_test_name",

                                label:
                                    "اسم الفحص",

                                reqd:
                                    1

                            },

                            {

                                fieldtype:
                                    "Link",

                                fieldname:
                                    "item",

                                label:
                                    "الخدمة",

                                options:
                                    "Item"

                            },

                            {

                                fieldtype:
                                    "Currency",

                                fieldname:
                                    "standard_rate",

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
                                !values.lab_test_name
                                ||
                                !String(
                                    values.lab_test_name
                                ).trim()
                            ) {

                                frappe.msgprint({

                                    title:
                                        "المختبر",

                                    message:
                                        "أدخل اسم الفحص.",

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
                                            "Lab Test Template",

                                        lab_test_name:
                                            String(
                                                values.lab_test_name
                                            ).trim(),

                                        item:
                                            values.item
                                            ||
                                            "",

                                        standard_rate:
                                            parseFloat(
                                                values.standard_rate
                                            )
                                            ||
                                            0

                                    }

                                },

                                freeze:
                                    true,

                                freeze_message:
                                    "جاري إنشاء الفحص المخبري...",

                                callback:
                                    function(r) {

                                        if (
                                            r.exc
                                            ||
                                            !r.message
                                        ) {

                                            frappe.msgprint({

                                                title:
                                                    "المختبر",

                                                message:
                                                    "فشل إنشاء الفحص المخبري.",

                                                indicator:
                                                    "red"

                                            });


                                            return;

                                        }


                                        const doc =
                                            r.message;


                                        test_control.set_value(
                                            doc.name
                                        );


                                        row.test_name =
                                            doc.lab_test_name
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
                                                doc.standard_rate
                                            )
                                            ||
                                            0;

                                        row.amount =
                                            row.quantity
                                            *
                                            row.rate;


                                        render_lab_entry_table();


                                        dialog.hide();

                                    }

                            });

                        }

        });


        dialog.show();

    };


    /*
     * القيمة الحالية
     */

    if (
        row.test_name
    ) {

        test_control.set_value(
            row.test_name
        );


        frappe.db.get_doc(

            "Lab Test Template",

            row.test_name

        )
        .then(

            function(template) {

                test_control.set_value(

                    row.test_name,

                    template.lab_test_name
                    ||
                    row.test_name

                );

            }

        )
        .catch(

            function() {}

        );

    }


    /* =================================================
       تطبيق بيانات الفحص
    ================================================= */

    function apply_lab_template(
        template
    ) {

        template =
            template
            ||
            {};


        row.test_name =
            template.lab_test_name
            ||
            template.name
            ||
            "";


        row.item_code =
            template.item
            ||
            "";


        row.rate =
            parseFloat(
                template.standard_rate
            )
            ||
            0;


        row.amount =
            (
                parseFloat(
                    row.quantity
                )
                ||
                0
            )
            *
            row.rate;


        render_lab_entry_table();

    }


    /* =================================================
       عند تغيير الفحص
    ================================================= */

    test_control.$input.on(
        "change.erLabPortal",
        function() {

            const value =
                test_control.get_value()
                ||
                "";


            row.test_name =
                value;


            if (
                !value
            ) {

                row.item_code =
                    "";

                row.rate =
                    0;

                row.amount =
                    0;


                update_lab_grand_total();

                return;

            }


            frappe.db.get_doc(

                "Lab Test Template",

                value

            )
            .then(

                apply_lab_template

            )
            .catch(

                function(error) {

                    console.error(
                        "ER LAB TEMPLATE LOAD ERROR:",
                        error
                    );

                }

            );

        }
    );


    /* =================================================
       إضافة فحص جديد
    ================================================= */


    /* =================================================
       البحث المتقدم
    ================================================= */


    /* =================================================
       ربط القائمة بالـ portal
    ================================================= */

    if (
        test_control
        &&
        test_control.awesomplete
    ) {

        attach_link_autocomplete_portal({

            control:
                test_control,

            portal_selector:
                "#lab-autocomplete-portal",

            row_reference:
                row,

            on_portal_ready:
                function() {
                    /*
                     * Native Frappe Link Popup only.
                     * لا نضيف Create New / Advanced Search مخصصين.
                     */
                }

        });

    }


    tr.append(

        $("<td>")
            .append(
                input_wrapper
            )

    );


    /* =================================================
       الخدمة
    ================================================= */

    tr.append(

        $("<td>")
            .append(

                $("<input>")

                    .attr(
                        "type",
                        "text"
                    )

                    .prop(
                        "readonly",
                        true
                    )

                    .addClass(
                        "form-control"
                    )

                    .val(
                        row.item_code
                        ||
                        ""
                    )

            )

    );


    /* =================================================
       الكمية
    ================================================= */

    const quantity_input =
        $("<input>")
            .attr({

                type:
                    "number",

                min:
                    "0.01",

                step:
                    "0.01"

            })
            .addClass(
                "form-control"
            )
            .val(
                row.quantity
                ||
                1
            );


    quantity_input.on(
        "input.erLabPortal",
        function() {

            row.quantity =
                parseFloat(
                    $(this).val()
                )
                ||
                0;


            row.amount =
                row.quantity
                *
                (
                    parseFloat(
                        row.rate
                    )
                    ||
                    0
                );


            update_lab_grand_total();

        }
    );


    tr.append(

        $("<td>")
            .append(
                quantity_input
            )

    );


    /* =================================================
       الملاحظات
    ================================================= */

    const notes_textarea =
        $("<textarea>")
            .addClass(
                "form-control er-lab-notes"
            )
            .attr(
                "rows",
                2
            )
            .val(
                row.notes
                ||
                ""
            );


    notes_textarea.on(
        "input.erLabPortal",
        function() {

            row.notes =
                $(this).val();

        }
    );


    notes_textarea.on(
        "click.erLabNotes",
        function() {

            open_notes_dialog({

                title:
                    "📝 ملاحظات الفحص",

                fieldname:
                    "lab_note",

                label:
                    "ملاحظة",

                default_value:
                    row.notes
                    ||
                    "",

                row_reference:
                    row,

                input_selector:
                    notes_textarea

            });

        }
    );


    if (
        typeof apply_clickable_cursor ===
        "function"
    ) {

        apply_clickable_cursor(
            notes_textarea
        );

    }


    tr.append(

        $("<td>")
            .append(
                notes_textarea
            )

    );


    /* =================================================
       حذف
    ================================================= */

    const delete_button =
        $("<button>")
            .attr(
                "type",
                "button"
            )
            .addClass(
                "btn btn-sm btn-danger"
            )
            .text(
                "🗑"
            );


    delete_button.on(
        "click.erLabPortal",
        function() {

            er_lab_entry_rows =
                er_lab_entry_rows.filter(

                    function(item) {

                        return (
                            item.id
                            !==
                            row.id
                        );

                    }

                );


            render_lab_entry_table();

        }
    );


    tr.append(

        $("<td>")
            .css(
                "text-align",
                "center"
            )
            .append(
                delete_button
            )

    );


    tbody.append(
        tr
    );

}


/* =====================================================
   إجمالي الفحوصات
===================================================== */

function update_lab_grand_total() {

    let total =
        0;


    er_lab_entry_rows.forEach(

        function(row) {

            total +=
                parseFloat(
                    row.amount
                )
                ||
                0;

        }

    );


    $("#lab-entry-grand-total")
        .text(

            format_currency(
                total
            )

        );

}


/* =====================================================
   التحقق من بيانات المختبر
===================================================== */

function validate_lab_entries(
    rows
) {

    if (
        !rows
        ||
        !rows.length
    ) {

        return true;

    }


    for (
        let i = 0;
        i < rows.length;
        i++
    ) {

        const row =
            rows[i];


        if (
            !row.item_code
        ) {

            frappe.msgprint({

                title:
                    "المختبر",

                message:
                    "يجب اختيار الفحص في الصف رقم "
                    +
                    (i + 1),

                indicator:
                    "orange"

            });


            return false;

        }


        if (
            !row.quantity
            ||
            row.quantity <= 0
        ) {

            frappe.msgprint({

                title:
                    "المختبر",

                message:
                    "الكمية في الصف رقم "
                    +
                    (i + 1)
                    +
                    " غير صحيحة.",

                indicator:
                    "orange"

            });


            return false;

        }

    }


    return true;

}


/* =====================================================
   حفظ طلبات المختبر
===================================================== */

function save_er_lab_requests(callback) {
    const done = typeof callback === "function" ? callback : function() {};
    const encounter = current_encounter;

    if (!encounter) {
        frappe.msgprint("لا توجد زيارة طبية محددة.");
        done(false);
        return;
    }

    // Read the selected Lab Test Template from the visible Link control.
    er_lab_entry_rows.forEach(function(row) {
        const tr = $('#lab-entry-tbody tr[data-row-id="' + row.id + '"]');
        if (!tr.length) return;

        const input = tr.find(".frappe-control input").first();
        if (!input.length) return;

        const value = String(input.val() || "").trim();
        if (value) {
            row.test_name = value;
        }

        // Never allow the template name itself to remain as item_code.
        if (row.test_name && row.item_code === row.test_name) {
            row.item_code = "";
        }
    });

    const rows = er_lab_entry_rows.filter(function(row) {
        return !!String(row.test_name || row.item_code || "").trim();
    });

    if (!rows.length) {
        done(true);
        return;
    }

    // Resolve the real Item from each Lab Test Template before validation
    // and before create_lab_requests_batch().
    Promise.all(
        rows.map(function(row) {
            const template = String(row.test_name || "").trim();

            if (!template) {
                return Promise.reject(
                    new Error("يجب اختيار فحص المختبر.")
                );
            }

            return frappe.db.get_value(
                "Lab Test Template",
                template,
                "item"
            ).then(function(result) {
                const item =
                    result &&
                    result.message &&
                    result.message.item
                        ? String(result.message.item).trim()
                        : "";

                if (!item) {
                    throw new Error(
                        'الفحص "' +
                        template +
                        '" لا يحتوي على Item مرتبط.'
                    );
                }

                row.test_name = template;
                row.item_code = item;

                return row;
            });
        })
    )
    .then(function() {
        // Safety check: the template name must NEVER be used as item_code.
        const invalid = rows.find(function(row) {
            return (
                !row.item_code ||
                row.item_code === row.test_name
            );
        });

        if (invalid) {
            throw new Error(
                'تعذر تحديد Item الصحيح للفحص "' +
                (invalid.test_name || "") +
                '".'
            );
        }

        console.log(
            "ER LAB REQUESTS FINAL:",
            JSON.parse(JSON.stringify(rows))
        );

        if (!validate_lab_entries(rows)) {
            done(false);
            return;
        }

        create_lab_requests_batch(
            encounter,
            rows,
            0,
            0,
            [],
            done
        );
    })
    .catch(function(error) {
        console.error(
            "ER LAB ITEM RESOLUTION FINAL ERROR:",
            error
        );

        frappe.msgprint({
            title: "المختبر",
            indicator: "red",
            message:
                error && error.message
                    ? error.message
                    : "تعذر تحديد Item المرتبط بفحص المختبر."
        });

        done(false);
    });
}


/* =====================================================
   إنشاء طلبات المختبر بالتتابع
===================================================== */

function create_lab_requests_batch(

    encounter,

    rows,

    index,

    created_count,

    request_numbers,

    callback

) {

    if (
        index >=
        rows.length
    ) {

        er_lab_entry_rows = [];


        render_lab_entry_table();


        load_lab_requests();


        if (
            created_count
            &&
            request_numbers.length
        ) {

            frappe.show_alert({

                message:
                    "تم إنشاء "
                    +
                    created_count
                    +
                    " طلب مختبر بنجاح.",

                indicator:
                    "green"

            });

        }


        if (
            callback
        ) {

            callback(
                true
            );

        }


        return;

    }


    const row =
        rows[index];


    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.python.labs.labs.create_lab_request",

        args: {

            data:

                JSON.stringify({

                    encounter:
                        encounter,

                    test_name:
                        row.test_name
                        ||
                        row.item_code,

                    item_code:
                        row.item_code,

                    quantity:
                        row.quantity,

                    rate:
                        row.rate,

                    notes:
                        row.notes
                        ||
                        ""

                })

        },

        freeze:
            false,


        callback:
            function(r) {

                if (
                    r.exc
                    ||
                    !r.message
                    ||
                    !r.message.request_number
                ) {

                    console.error(

                        "ER LAB CREATE ERROR:",

                        r

                    );


                    frappe.msgprint({

                        title:
                            "المختبر",

                        message:
                            "فشل إنشاء طلب المختبر في الصف رقم "
                            +
                            (index + 1),

                        indicator:
                            "red"

                    });


                    if (
                        callback
                    ) {

                        callback(
                            false
                        );

                    }


                    return;

                }


                request_numbers.push(

                    r.message.request_number

                );


                if (
                    index === 0
                    &&
                    typeof er_visit_console_utils !==
                    "undefined"
                    &&
                    er_visit_console_utils
                    &&
                    typeof er_visit_console_utils.add_activity ===
                    "function"
                ) {

                    er_visit_console_utils.add_activity(

                        "labs",

                        "Laboratory request added: "
                        +
                        (
                            row.test_name
                            ||
                            row.item_code
                            ||
                            "Unknown"
                        )

                    );

                }


                create_lab_requests_batch(

                    encounter,

                    rows,

                    index + 1,

                    created_count + 1,

                    request_numbers,

                    callback

                );

            },


        error:
            function(err) {

                console.error(

                    "ER LAB CREATE AJAX ERROR:",

                    err

                );


                frappe.msgprint({

                    title:
                        "المختبر",

                    message:
                        "تعذر إنشاء طلب المختبر في الصف رقم "
                        +
                        (index + 1),

                    indicator:
                        "red"

                });


                if (
                    callback
                ) {

                    callback(
                        false
                    );

                }

            }

    });

}


/* =====================================================
   تحميل الطلبات السابقة
===================================================== */

function load_lab_requests() {

    console.log(
        "ER LAB DEBUG: load_lab_requests() called"
    );


    console.log(
        "ER LAB DEBUG: current_encounter =",
        current_encounter
    );


    const encounter =
        current_encounter;


    const loading =
        $("#lab-requests-loading");


    const empty =
        $("#lab-requests-empty");


    const container =
        $("#lab-requests-container");


    const results_container =
        $("#lab-results-container");


    const results_empty =
        $("#lab-results-empty");


    if (
        !container.length
    ) {

        return;

    }


    container.empty();


    results_container.empty();


    empty.hide();


    results_empty.hide();


    if (
        !encounter
    ) {

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
            "custom_app.emergency_management.page.er_visit_console.python.labs.labs.get_lab_requests",

        args: {

            encounter:
                encounter

        },


        callback:
            function(r) {

                loading.hide();


                if (
                    r.exc
                ) {

                    console.error(
                        "ER LAB REQUESTS ERROR:",
                        r.exc
                    );


                    empty
                        .text(
                            "حدث خطأ أثناء تحميل فحوصات المختبر."
                        )
                        .show();


                    return;

                }


                const requests =
                    r.message
                    ||
                    [];


                if (
                    !requests.length
                ) {

                    empty
                        .text(
                            "لا توجد فحوصات مخبرية مطلوبة لهذه الزيارة."
                        )
                        .show();


                    results_empty.show();


                    return;

                }


                const completed_requests =
                    requests.filter(

                        function(request) {

                            return (
                                request.lab_results
                                &&
                                request.lab_results.length
                            );

                        }

                    );


                const active_requests =
                    requests.filter(

                        function(request) {

                            return (
                                !request.lab_results
                                ||
                                !request.lab_results.length
                            );

                        }

                    );


                active_requests.forEach(

                    render_lab_request

                );


                completed_requests.forEach(

                    render_lab_result

                );


                if (
                    !completed_requests.length
                ) {

                    results_empty.show();

                }


                /*
                 * الحفاظ على حالة الطي الحالية
                 */

                if (
                    er_lab_results_collapsed
                ) {

                    $("#lab-results-content").hide();

                    $("#lab-results-toggle")
                        .text("◀");

                }
                else {

                    $("#lab-results-content").show();

                    $("#lab-results-toggle")
                        .text("▼");

                }

            },


        error:
            function(err) {

                loading.hide();


                console.error(
                    "ER LAB REQUEST AJAX ERROR:",
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


/* =====================================================
   عرض نتيجة المختبر
===================================================== */

function render_lab_result(
    request
) {

    const container =
        $("#lab-results-container");


    if (
        !container.length
    ) {

        return;

    }


    const card =
        $("<div>")
            .addClass(
                "er-lab-result-card"
            );


    const header =
        $("<div>")
            .addClass(
                "er-lab-result-header"
            );


    header.append(

        $("<strong>")
            .text(

                request.test_name
                ||
                request.item_name
                ||
                "فحص مختبري"

            )

    );


    header.append(

        $("<span>")
            .addClass(
                "er-lab-status"
            )
            .text(

                get_lab_status_label(
                    request.lab_status
                )

            )

    );


    card.append(
        header
    );


    const meta =
        $("<div>")
            .addClass(
                "er-lab-result-meta"
            );


    append_lab_detail(
        meta,
        "رقم الطلب",
        request.name
        ||
        "---"
    );


    append_lab_detail(
        meta,
        "Lab Test",
        request.lab_test
        ||
        "---"
    );


    append_lab_detail(
        meta,
        "رقم العينة",
        request.sample
        ||
        "---"
    );


    card.append(
        meta
    );


    const table =
        $("<table>")
            .addClass(
                "table table-bordered er-lab-result-table"
            );


    table.append(

        $("<thead>")
            .append(

                $("<tr>")

                    .append(

                        $("<th>")
                            .text(
                                "الاختبار"
                            )

                    )

                    .append(

                        $("<th>")
                            .text(
                                "النتيجة"
                            )

                    )

                    .append(

                        $("<th>")
                            .text(
                                "الوحدة"
                            )

                    )

                    .append(

                        $("<th>")
                            .text(
                                "المدى المرجعي"
                            )

                    )

                    .append(

                        $("<th>")
                            .text(
                                "الحالة"
                            )

                    )

                    .append(

                        $("<th>")
                            .text(
                                "وقت النتيجة"
                            )

                    )

            )

    );


    const body =
        $("<tbody>");


    (
        request.lab_results
        ||
        []
    )
    .forEach(

        function(result) {

            body.append(

                $("<tr>")

                    .append(

                        $("<td>")
                            .text(
                                result.test
                                ||
                                "---"
                            )

                    )

                    .append(

                        $("<td>")
                            .text(
                                result.result
                                ||
                                "---"
                            )

                    )

                    .append(

                        $("<td>")
                            .text(
                                result.unit
                                ||
                                "---"
                            )

                    )

                    .append(

                        $("<td>")
                            .text(
                                result.reference_range
                                ||
                                "---"
                            )

                    )

                    .append(

                        $("<td>")
                            .text(
                                result.status
                                ||
                                "---"
                            )

                    )

                    .append(

                        $("<td>")
                            .text(
                                result.result_time
                                ||
                                "---"
                            )

                    )

            );

        }

    );


    table.append(
        body
    );


    card.append(
        table
    );


    if (
        request.diagnostic_report
    ) {

        card.append(

            $("<button>")

                .attr(
                    "type",
                    "button"
                )

                .addClass(
                    "btn btn-sm btn-secondary"
                )

                .text(
                    "فتح تقرير التشخيص"
                )

                .on(
                    "click.erLabResult",
                    function() {

                        frappe.set_route(

                            "Form",

                            "Diagnostic Report",

                            request.diagnostic_report

                        );

                    }
                )

        );

    }


    container.append(
        card
    );

}


/* =====================================================
   عرض بطاقة طلب المختبر
===================================================== */

function render_lab_request(
    request
) {

    const container =
        $("#lab-requests-container");


    if (
        !container.length
    ) {

        return;

    }


    const card =
        $("<div>")
            .addClass(
                "er-lab-request-card"
            );


    /* =================================================
       Header
    ================================================= */

    const header =
        $("<div>")
            .addClass(
                "er-lab-request-header"
            );


    header.append(

        $("<div>")
            .addClass(
                "er-lab-request-title"
            )
            .text(

                request.test_name
                ||
                request.item_name
                ||
                "فحص مخبري"

            )

    );


    header.append(

        $("<span>")
            .addClass(
                "er-lab-status"
            )
            .text(

                get_lab_status_label(
                    request.lab_status
                )

            )

    );


    card.append(
        header
    );


    /* =================================================
       Details
    ================================================= */

    const details =
        $("<div>")
            .addClass(
                "er-lab-request-details"
            );


    append_lab_detail(
        details,
        "رقم الطلب",
        request.name
        ||
        "---"
    );


    append_lab_detail(
        details,
        "الفحص",
        request.test_name
        ||
        request.item_name
        ||
        "---"
    );


    append_lab_detail(
        details,
        "الخدمة",
        request.item_code
        ||
        "---"
    );


    append_lab_detail(
        details,
        "الكمية",
        request.quantity
        ||
        1
    );
append_lab_detail(
        details,
        "حالة الفوترة",
        get_lab_billing_label(
            request.billing_status
        )
    );


    if (
        request.sales_invoice
    ) {

        append_lab_detail(
            details,
            "رقم الفاتورة",
            request.sales_invoice
        );

    }


    if (
        request.request_date
    ) {

        append_lab_detail(
            details,
            "تاريخ الطلب",
            request.request_date
        );

    }


    if (
        request.lab_test
    ) {

        append_lab_detail(
            details,
            "Lab Test",
            request.lab_test
        );

    }


    card.append(
        details
    );


    /* =================================================
       النتيجة
    ================================================= */

    const result =
        $("<div>")
            .addClass(
                "er-lab-result"
            );


    result.append(

        $("<div>")
            .addClass(
                "er-lab-result-title"
            )
            .text(
                "نتيجة الفحص"
            )

    );


    result.append(

        $("<div>")
            .addClass(
                "er-lab-result-text"
            )
            .text(

                request.result
                ||
                "لا توجد نتيجة مسجلة حتى الآن."

            )

    );


    card.append(
        result
    );


    /* =================================================
       الملاحظات
    ================================================= */

    if (
        request.notes
    ) {

        const notes =
            $("<div>")
                .addClass(
                    "er-lab-result"
                );


        notes.append(

            $("<div>")
                .addClass(
                    "er-lab-result-title"
                )
                .text(
                    "ملاحظات الطبيب"
                )

        );


        notes.append(

            $("<div>")
                .addClass(
                    "er-lab-result-text"
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


/* =====================================================
   إضافة تفصيل
===================================================== */

function append_lab_detail(
    container,
    label,
    value
) {

    const item =
        $("<div>")
            .addClass(
                "er-lab-detail"
            );


    item.append(

        $("<span>")
            .addClass(
                "er-lab-detail-label"
            )
            .text(
                label
            )

    );


    item.append(

        $("<strong>")
            .addClass(
                "er-lab-detail-value"
            )
            .text(
                value
            )

    );


    container.append(
        item
    );

}


/* =====================================================
   حالات المختبر
===================================================== */

function get_lab_status_label(
    status
) {

    const map = {

        Pending:
            "مطلوب",

        Draft:
            "مسودة",

        "Sample Collected":
            "تم سحب العينة",

        "In Progress":
            "قيد التنفيذ",

        Completed:
            "مكتمل",

        Cancelled:
            "ملغي"

    };


    return (
        map[status]
        ||
        status
        ||
        "---"
    );

}


/* =====================================================
   حالة الفوترة
===================================================== */

function get_lab_billing_label(
    status
) {

    const map = {

        Pending:
            "غير مفوتر",

        "Partly Invoiced":
            "مفوتر جزئيًا",

        Invoiced:
            "✅ تمت الفوترة"

    };


    return (
        map[status]
        ||
        status
        ||
        "غير مفوتر"
    );

}


/* =====================================================
   تنسيق العملة
===================================================== */

function format_currency(
    value
) {

    const number =
        parseFloat(
            value
        )
        ||
        0;


    return number.toLocaleString(

        "en-US",

        {

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2

        }

    );

}


/* =====================================================
   زر إضافة فحص
===================================================== */

$(document).off(
    "click.erLabs",
    "#add-lab-entry-row-inline"
);


$(document).on(
    "click.erLabs",
    "#add-lab-entry-row-inline",
    function() {

        add_lab_entry_row();

    }
);


/* =====================================================
   زر حفظ طلبات المختبر
===================================================== */

function bind_lab_save_button() {

    $(document).off(
        "click.erLabsDirectSaveFinal",
        "#save-lab-requests-inline"
    );

    $(document).on(
        "click.erLabsDirectSaveFinal",
        "#save-lab-requests-inline",
        function(event) {

            event.preventDefault();
            event.stopPropagation();

            const button =
                $(this);

            if (
                button.data(
                    "er-lab-saving"
                )
            ) {
                return;
            }

            button.data(
                "er-lab-saving",
                true
            );

            button.prop(
                "disabled",
                true
            );

            try {

                window.save_er_lab_requests(
                    function() {

                        button.prop(
                            "disabled",
                            false
                        );

                        button.data(
                            "er-lab-saving",
                            false
                        );

                    }
                );

            } catch (error) {

                console.error(
                    "ER LAB SAVE FINAL ERROR:",
                    error
                );

                button.prop(
                    "disabled",
                    false
                );

                button.data(
                    "er-lab-saving",
                    false
                );

                frappe.msgprint({
                    title:
                        "المختبر",

                    message:
                        "تعذر تنفيذ حفظ طلب المختبر. راجع Console.",

                    indicator:
                        "red"
                });
            }
        }
    );
}

bind_lab_save_button();
/* =====================================================
   زر التحديث

   لا نسجل bind إضافي هنا لأن
   load_labs_section() يستخدم bind_refresh_button().
===================================================== */


/* =====================================================
   تصدير الحفظ
===================================================== */

window.save_er_lab_requests =
    save_er_lab_requests;
