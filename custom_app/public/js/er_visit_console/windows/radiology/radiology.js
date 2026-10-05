'use strict';

/* =====================================================
    ER RADIOLOGY
    الأشعة

    التصميم:
    - لا يوجد زر إرسال مستقل.
    - الحفظ يتم بواسطة زر "💾 حفظ الكل".
    - زر تحديث مستقل فقط.
    - الطلبات السابقة تظهر أسفل نافذة الأشعة.
    - يعتمد على Radiology Examination الموجود بالنظام.
    - لا نستخدم حقل غير موجود في Radiology Examination.
===================================================== */


/* =====================================================
    الصفوف الحالية
===================================================== */

let er_radiology_entry_rows = [];

let er_current_radiology_control = null;


/* =====================================================
    أنواع الأشعة
===================================================== */

const ER_RADIOLOGY_TYPES = [

    {
        value: "",
        label: "اختر نوع الأشعة"
    },

    {
        value: "X-Ray",
        label: "أشعة سينية X-Ray"
    },

    {
        value: "CT Scan",
        label: "أشعة مقطعية CT"
    },

    {
        value: "MRI",
        label: "رنين مغناطيسي MRI"
    },

    {
        value: "Ultrasound",
        label: "موجات فوق صوتية Ultrasound"
    },

    {
        value: "ECG",
        label: "تخطيط قلب ECG"
    },

    {
        value: "Echo",
        label: "إيكو Echo"
    },

    {
        value: "Other",
        label: "أخرى"
    }

];


/* =====================================================
   الزيارة الحالية
===================================================== */

function get_current_radiology_encounter() {

    if (
        typeof current_encounter !== "undefined"
        &&
        current_encounter
    ) {

        return current_encounter;

    }


    try {

        const route =
            frappe.get_route();

        if (
            route
            &&
            route.length > 1
            &&
            route[1]
        ) {

            return route[1];

        }

    }

    catch (error) {

    }


    return null;

}


/* =====================================================
   تنظيف الصفوف
===================================================== */

function clear_radiology_rows() {

    er_radiology_entry_rows = [];

}


/* =====================================================
   التحقق من وجود بيانات جديدة
===================================================== */

function has_new_er_radiology_requests() {

    return (
        Array.isArray(
            er_radiology_entry_rows
        )
        &&
        er_radiology_entry_rows.some(

            function(row) {

                return (
                    row
                    &&
                    (
                        String(
                            row.examination_type
                            ||
                            ""
                        ).trim()
                        ||
                        String(
                            row.body_part
                            ||
                            ""
                        ).trim()
                    )
                );

            }

        )
    );

}


/* =====================================================
   فتح قسم الأشعة
===================================================== */

function load_radiology_section() {

    if (
        !Array.isArray(
            er_radiology_entry_rows
        )
    ) {

        er_radiology_entry_rows = [];

    }


    $("#er-content").html(`

        <div class="er-radiology-section">

            <div
                id="er-radiology-autocomplete-portal"
                class="er-autocomplete-portal"
            ></div>


            <!-- =================================================
                 إضافة فحوصات الأشعة
            ================================================= -->

            <div class="er-radiology-card">

                <div class="er-radiology-header">

                    <h3>
                        🩻 إضافة فحوصات الأشعة
                    </h3>

                    <div class="er-radiology-header-actions">

                        <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            id="refresh-radiology-requests"
                        >
                            🔄 تحديث
                        </button>

                    </div>

                </div>


                <div
                    id="radiology-entry-empty"
                    class="er-radiology-state"
                >
                    أضف فحص أشعة واحدًا على الأقل.
                </div>


                <div class="table-responsive">

                    <table
                        class="table table-bordered er-radiology-entry-table"
                        id="radiology-entry-table"
                    >

                        <thead>

                            <tr>

                                <th>
                                    #
                                </th>

                                <th>
                                    نوع الأشعة
                                </th>

                                <th>
                                    الخدمة
                                </th>

                                <th>
                                    منطقة الجسم
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
                            id="radiology-entry-tbody"
                        ></tbody>


                        <tfoot style="display:none;">

                            <tr>

                                <th
                                    colspan="5"
                                    style="text-align:right;"
                                >
                                    إجمالي الأشعة
                                </th>

                                <th
                                    id="radiology-entry-grand-total"
                                >
                                    0.00
                                </th>

                                <th></th>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>


            <div
                class="text-center"
                style="margin-top: 8px;"
            >

                <button
                    type="button"
                    class="btn btn-success btn-sm"
                    id="add-radiology-entry-row"
                >
                    ➕ إضافة صف جديد
                </button>

                <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    id="save-radiology-entry-rows"
                    style="margin-inline-start: 6px;"
                >
                    💾 حفظ طلب الأشعة
                </button>

            </div>


            <!-- =================================================
                 الطلبات السابقة
            ================================================= -->

            <div class="er-radiology-card">

                <div class="er-radiology-header">

                    <h3>
                        📋 طلبات الأشعة
                    </h3>

                    <button
                        type="button"
                        class="er-collapse-toggle"
                        id="radiology-requests-toggle"
                        title="طي / توسيع"
                        style="
                            background: none;
                            border: none;
                            cursor: pointer;
                            font-size: 16px;
                            padding: 4px 8px;
                            color: #666;
                        "
                    >
                        ▼
                    </button>

                </div>


                <div
                    id="radiology-requests-content"
                    class="er-collapsible-content"
                >

                    <div
                        id="radiology-requests-loading"
                        class="er-radiology-state"
                        style="display:none;"
                    >
                        ⏳ جاري تحميل فحوصات الأشعة...
                    </div>


                    <div
                        id="radiology-requests-empty"
                        class="er-radiology-state"
                        style="display:none;"
                    ></div>


                    <div
                        id="radiology-requests-container"
                        class="er-radiology-requests-container"
                    ></div>

                </div>

            </div>


            <div
                id="er_radiology_activity"
                style="margin-top: 24px;"
            ></div>

        </div>

    `);


    bind_refresh_button(
        "#refresh-radiology-requests",
        function() {

            refresh_radiology_requests();

        }
    );


    if (
        typeof toggle_er_section ===
        "function"
    ) {

        $("#radiology-requests-toggle").on(
            "click",
            function() {

                toggle_er_section(
                    "radiology-requests-content"
                );

            }
        );

    }


    render_activity_timeline(
        "er_radiology_activity",
        "radiology"
    );


    if (
        !er_radiology_entry_rows.length
    ) {

        add_radiology_entry_row();

    }
    else {

        render_radiology_entry_table();

    }


    load_radiology_requests();

}


/* =====================================================
   إضافة صف أشعة
===================================================== */

function add_radiology_entry_row() {

    er_radiology_entry_rows.push({

        id:
            "rad-"
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

        radiology_examination:
            "",

        examination_type:
            "",

        item_code:
            "",

        item_name:
            "",

        body_part:
            "",

        quantity:
            1,

        rate:
            0,

        amount:
            0,

        description:
            "",

        notes:
            ""

    });


    render_radiology_entry_table();

}


/* =====================================================
   رسم جدول الإدخال
===================================================== */

function render_radiology_entry_table() {

    const tbody =
        $("#radiology-entry-tbody");

    const empty =
        $("#radiology-entry-empty");


    if (!tbody.length) {

        return;

    }


    tbody.empty();


    if (
        !er_radiology_entry_rows.length
    ) {

        empty.show();

        update_radiology_grand_total();

        return;

    }


    empty.hide();


    er_radiology_entry_rows.forEach(

        function(
            row,
            index
        ) {

            render_radiology_entry_row(
                row,
                index
            );

        }

    );


    update_radiology_grand_total();

}


/* =====================================================
   إنشاء أزرار أسفل القائمة المنسدلة

   مهم:
   - حاوية واحدة فقط.
   - الأحداث تسجل مرة واحدة فقط.
   - لا يوجد mousedown + click لنفس الزر.
===================================================== */

/* =====================================================
   رسم صف أشعة
===================================================== */


/* =====================================================
   Radiology Native Frappe Link Popup - Visual Fix
===================================================== */

(function ensure_radiology_native_link_popup_css() {

    if (
        document.getElementById(
            "er-radiology-native-link-popup-css"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "er-radiology-native-link-popup-css";

    style.textContent = `
        /* القائمة نفسها */
        ul.er-radiology-native-link-popup,
        ul.er-radiology-native-link-popup.awesomplete,
        ul.er-radiology-native-link-popup[class] {
            background: #ffffff !important;
            background-color: #ffffff !important;
            opacity: 1 !important;
            filter: none !important;
            color: #1f2937 !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            box-shadow: 0 8px 24px rgba(0,0,0,.18) !important;
            cursor: default !important;
        }

        /* كل عنصر نتيجة */
        ul.er-radiology-native-link-popup > li,
        ul.er-radiology-native-link-popup > li[role="option"],
        ul.er-radiology-native-link-popup li[role="option"] {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #1f2937 !important;
            opacity: 1 !important;
            filter: none !important;
            cursor: default !important;
        }

        /* العناصر الداخلية */
        ul.er-radiology-native-link-popup li *,
        ul.er-radiology-native-link-popup [role="option"] *,
        ul.er-radiology-native-link-popup p,
        ul.er-radiology-native-link-popup span,
        ul.er-radiology-native-link-popup strong,
        ul.er-radiology-native-link-popup i {
            background-color: transparent !important;
            color: inherit !important;
            cursor: default !important;
            opacity: 1 !important;
            filter: none !important;
        }

        /* إلغاء اللون الباهت عند hover/focus */
        ul.er-radiology-native-link-popup > li:hover,
        ul.er-radiology-native-link-popup > li:focus,
        ul.er-radiology-native-link-popup > li[aria-selected="true"],
        ul.er-radiology-native-link-popup li:hover [role="option"],
        ul.er-radiology-native-link-popup li[aria-selected="true"] [role="option"] {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #1f2937 !important;
            cursor: default !important;
            opacity: 1 !important;
        }

        /* أزرار Frappe الأصلية */
        ul.er-radiology-native-link-popup .link-option {
            background: transparent !important;
            color: #1f2937 !important;
            cursor: default !important;
        }

        ul.er-radiology-native-link-popup .link-option:hover {
            background: #ffffff !important;
            color: #1f2937 !important;
            cursor: default !important;
        }
    `;

    document.head.appendChild(style);

})();

function render_radiology_entry_row(
    row,
    index
) {

    const tbody =
        $("#radiology-entry-tbody");


    if (!tbody.length) {

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
       نوع الأشعة
    ================================================= */

    const examinationTd =
        $("<td>");


    const examinationControl =
        frappe.ui.form.make_control({

            parent:
                examinationTd[0],

            df: {

                fieldtype:
                    "Link",

                label:
                    "نوع الأشعة",

                tooltip:
                    "",

                options:
                    "Radiology Examination",

                placeholder:
                    "ابحث باسم الفحص..."

            },

            render_input:
                true

        });


    examinationControl.$input
        .addClass(
            "er-radiology-link-input"
        )
        .val(
            row.examination_type
            ||
            row.radiology_examination
            ||
            ""
        );


    examinationControl.refresh();


    /*
     * Frappe Native Link Popup
     *
     * لا نغير محتوى Frappe ولا أزراره.
     * ننقل UL الأصلي فقط إلى BODY حتى لا
     * تقصه table-responsive أو حدود الجدول.
     */

    (function setup_radiology_native_link_popup(control) {

        if (
            !control ||
            !control.awesomplete ||
            !control.$input
        ) {
            return;
        }

        const awesomplete =
            control.awesomplete;

        const $input =
            control.$input;

        const namespace =
            ".erRadiologyNativePopup";

        function position_dropdown() {

            const ul =
                awesomplete.ul;

            if (!ul) {
                return;
            }

            /*
             * نقل القائمة الأصلية من Frappe
             * مباشرة إلى BODY.
             */

            if (ul.parentNode !== document.body) {

                $(ul).appendTo("body");

            }

            $(ul).addClass(
                "er-radiology-native-link-popup"
            );

            const rect =
                $input[0].getBoundingClientRect();

            const viewportWidth =
                window.innerWidth;

            const viewportHeight =
                window.innerHeight;

            let width =
                Math.max(
                    rect.width,
                    280
                );

            if (
                width >
                viewportWidth - 16
            ) {
                width =
                    viewportWidth - 16;
            }

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
             * UL نفسه Fixed.
             * وليس فقط الحاوية.
             */

            const $ul =
                $(ul);

            $ul.css({

                position:
                    "fixed",

                top:
                    "auto",

                left:
                    "auto",

                width:
                    width + "px",

                minWidth:
                    width + "px",

                maxWidth:
                    width + "px",

                maxHeight:
                    "360px",

                overflowY:
                    "auto",

                overflowX:
                    "hidden",

                margin:
                    "0",

                zIndex:
                    "2147483647",

                boxSizing:
                    "border-box"

            });

            /*
             * قراءة الارتفاع بعد إظهار القائمة.
             */

            let height =
                Math.min(
                    Math.max(
                        ul.scrollHeight || 240,
                        40
                    ),
                    360
                );

            let top =
                rect.bottom + 4;

            /*
             * إذا لم توجد مساحة أسفل الحقل،
             * تظهر فوقه مثل نافذة Frappe.
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

            $ul.css({

                top:
                    top + "px",

                left:
                    left + "px",

                right:
                    "auto"

            });

        }

        $input
            .off(
                "awesomplete-open" +
                namespace
            )
            .on(
                "awesomplete-open" +
                namespace,
                function() {

                    /*
                     * ننتظر Frappe حتى ينهي
                     * بناء الخيارات الأصلية.
                     */

                    setTimeout(
                        function() {

                            position_dropdown();

                        },
                        0
                    );

                }
            );

        $input
            .off(
                "awesomplete-close" +
                namespace
            )
            .on(
                "awesomplete-close" +
                namespace,
                function() {

                    const ul =
                        awesomplete.ul;

                    if (ul) {

                        $(ul).css({
                            display:
                                "none"
                        });

                    }

                }
            );

        $(window)
            .off(
                "scroll" +
                namespace
            )
            .on(
                "scroll" +
                namespace,
                function() {

                    if (
                        awesomplete.opened
                    ) {

                        position_dropdown();

                    }

                }
            );

        $(window)
            .off(
                "resize" +
                namespace
            )
            .on(
                "resize" +
                namespace,
                function() {

                    if (
                        awesomplete.opened
                    ) {

                        position_dropdown();

                    }

                }
            );

    })(examinationControl);


    /*
     * Frappe Link الأصلي:
     * لا نعيد رسم عناصر القائمة.
     * فقط نحدد سلوك "إضافة جديدة" كنافذة
     * Frappe Dialog داخل ER Console.
     */

    examinationControl.new_doc = function() {

        const dialog =
            new frappe.ui.Dialog({

                title:
                    "🩻 إضافة فحص أشعة جديد",

                fields: [

                    {
                        fieldtype:
                            "Data",

                        fieldname:
                            "examination_type",

                        label:
                            "نوع الفحص",

                        reqd:
                            1
                    },

                    {
                        fieldtype:
                            "Data",

                        fieldname:
                            "er_body_part",

                        label:
                            "منطقة الجسم",

                        reqd:
                            1
                    },

                    {
                        fieldtype:
                            "Small Text",

                        fieldname:
                            "result",

                        label:
                            "النتيجة"
                    }

                ],

                primary_action_label:
                    "حفظ",

                primary_action:
                    function(values) {

                        if (
                            !values.examination_type
                            ||
                            !String(
                                values.examination_type
                            ).trim()
                        ) {

                            frappe.msgprint({
                                title: "الأشعة",
                                message: "أدخل نوع الفحص.",
                                indicator: "orange"
                            });

                            return;
                        }

                        if (
                            !values.er_body_part
                            ||
                            !String(
                                values.er_body_part
                            ).trim()
                        ) {

                            frappe.msgprint({
                                title: "الأشعة",
                                message: "أدخل منطقة الجسم.",
                                indicator: "orange"
                            });

                            return;
                        }

                        frappe.call({

                            method:
                                "frappe.client.insert",

                            args: {

                                doc: {

                                    doctype:
                                        "Radiology Examination",

                                    examination_type:
                                        String(
                                            values.examination_type
                                        ).trim(),

                                    er_body_part:
                                        String(
                                            values.er_body_part
                                        ).trim(),

                                    result:
                                        values.result
                                        ||
                                        ""

                                }

                            },

                            freeze:
                                true,

                            freeze_message:
                                "جاري إنشاء فحص الأشعة...",

                            callback:
                                function(r) {

                                    if (
                                        r.exc
                                        ||
                                        !r.message
                                    ) {

                                        return;

                                    }

                                    const doc =
                                        r.message;

                                    /*
                                     * تعيين السجل الجديد في Link
                                     * باستخدام API الأصلي.
                                     */

                                    examinationControl.set_value(
                                        doc.name
                                    );

                                    /*
                                     * تحديث بيانات الصف.
                                     */

                                    row.examination_type =
                                        doc.examination_type
                                        ||
                                        values.examination_type
                                        ||
                                        "";

                                    row.radiology_examination =
                                        doc.name
                                        ||
                                        "";

                                    row.body_part =
                                        doc.er_body_part
                                        ||
                                        values.er_body_part
                                        ||
                                        "";

                                    resolve_radiology_service(
                                        row.examination_type,
                                        row,
                                        function() {

                                            render_radiology_entry_table();

                                        }
                                    );

                                    dialog.hide();

                                }

                        });

                    }

            });

        dialog.show();

    };


    /*
     * القائمة Advanced Search ونتائج Link
     * تبقى من Frappe نفسها.
     */

    if (
        examinationControl.awesomplete
    ) {

        examinationControl.awesomplete.item =
            function(item) {

                const link_item =
                    this.get_item(
                        item.value
                    )
                    ||
                    item;


                const label =
                    link_item.label
                    ||
                    link_item.value
                    ||
                    "";


                const option =
                    $("<div>")
                        .attr(
                            "role",
                            "option"
                        )
                        .data(
                            "item.autocomplete",
                            link_item
                        )
                        .prop(
                            "aria-selected",
                            "false"
                        );


                const paragraph =
                    $("<p>")
                        .attr(
                            "title",
                            label
                        )
                        .append(

                            $("<strong>")
                                .text(
                                    label
                                )

                        );


                option
                    .append(
                        paragraph
                    )
                    .on(
                        "click",
                        function(event) {

                            examinationControl
                                .awesomplete
                                .select(

                                    event.currentTarget,

                                    event.currentTarget

                                );


                            examinationControl
                                .show_link_and_clear_buttons();

                        }
                    );


                return option[0];

            };

    }


    /* =================================================
       إضافة فحص جديد
    ================================================= */

    /* =================================================
       البحث المتقدم
    ================================================= */


    tr.append(
        examinationTd
    );


    /* =================================================
       الخدمة
    ================================================= */

    const serviceInput =
        $("<input>")
            .attr(
                "type",
                "text"
            )
            .attr(
                "readonly",
                true
            )
            .addClass(
                "form-control"
            )
            .val(
                row.item_name
                ||
                row.item_code
                ||
                ""
            );


    tr.append(

        $("<td>")
            .append(
                serviceInput
            )

    );


    /* =================================================
       منطقة الجسم
    ================================================= */

    const bodyPartInput =
        $("<input>")
            .attr(
                "type",
                "text"
            )
            .attr(
                "placeholder",
                "مثال: Chest / يد / رأس"
            )
            .addClass(
                "form-control"
            )
            .val(
                row.body_part
                ||
                ""
            );


    bodyPartInput.on(
        "input",
        function() {

            row.body_part =
                $(this).val();

        }
    );


    tr.append(

        $("<td>")
            .append(
                bodyPartInput
            )

    );


    /* =================================================
       الكمية
    ================================================= */

    const quantityInput =
        $("<input>")
            .attr(
                "type",
                "number"
            )
            .attr(
                "min",
                "0.01"
            )
            .attr(
                "step",
                "0.01"
            )
            .addClass(
                "form-control"
            )
            .val(
                row.quantity
                ||
                1
            );


    quantityInput.on(
        "input",
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


            update_radiology_grand_total();

        }
    );


    tr.append(

        $("<td>")
            .append(
                quantityInput
            )

    );


    /* =================================================
       ملاحظة
    ================================================= */

    const notesTextarea =
        $("<textarea>")
            .addClass(
                "form-control er-radiology-notes"
            )
            .attr(
                "rows",
                1
            )
            .val(
                row.notes
                ||
                ""
            );


    notesTextarea.on(
        "input",
        function() {

            row.notes =
                $(this).val();

        }
    );


    notesTextarea.on(
        "click.erRadiologyNotes",
        function() {

            open_notes_dialog({

                title:
                    "📝 ملاحظات الأشعة",

                fieldname:
                    "radiology_note",

                label:
                    "ملاحظة",

                default_value:
                    row.notes
                    ||
                    "",

                row_reference:
                    row,

                input_selector:
                    notesTextarea

            });

        }
    );


    apply_clickable_cursor(
        notesTextarea
    );


    tr.append(

        $("<td>")
            .append(
                notesTextarea
            )

    );


    /* =================================================
       حذف
    ================================================= */

    const deleteButton =
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


    deleteButton.on(
        "click",
        function() {

            er_radiology_entry_rows =
                er_radiology_entry_rows.filter(

                    function(item) {

                        return (
                            item.id
                            !==
                            row.id
                        );

                    }

                );


            render_radiology_entry_table();

        }
    );


    tr.append(

        $("<td>")
            .css(
                "text-align",
                "center"
            )
            .append(
                deleteButton
            )

    );


    tbody.append(
        tr
    );

}


/* =====================================================
   اكتشاف خدمة الأشعة
===================================================== */

function resolve_radiology_service(
    examinationType,
    row,
    callback
) {

    if (
        !examinationType
    ) {

        callback();

        return;

    }


    const searchTerms = {

        "X-Ray":
            [
                "%X-Ray%",
                "%X Ray%",
                "%Radiology%",
                "%أشعة%"
            ],

        "CT Scan":
            [
                "%CT%",
                "%Computed Tomography%",
                "%أشعة مقطعية%"
            ],

        "MRI":
            [
                "%MRI%",
                "%Magnetic Resonance%",
                "%رنين%"
            ],

        "Ultrasound":
            [
                "%Ultrasound%",
                "%US%",
                "%موجات%"
            ],

        "ECG":
            [
                "%ECG%",
                "%Electrocardiogram%",
                "%تخطيط%"
            ],

        "Echo":
            [
                "%Echo%",
                "%Echocardiography%",
                "%إيكو%"
            ],

        "Other":
            [
                "%Radiology%",
                "%أشعة%"
            ]

    };


    const terms =
        searchTerms[
            examinationType
        ]
        ||
        [
            "%" +
            examinationType +
            "%"
        ];


    let termIndex =
        0;


    function findNext() {

        if (
            termIndex >=
            terms.length
        ) {

            callback();

            return;

        }


        const search =
            terms[
                termIndex
            ];


        frappe.call({

            method:
                "frappe.client.get_list",

            args: {

                doctype:
                    "Item",

                filters: {

                    disabled:
                        0,

                    is_sales_item:
                        1

                },

                or_filters: [

                    [
                        "Item",
                        "name",
                        "like",
                        search
                    ],

                    [
                        "Item",
                        "item_name",
                        "like",
                        search
                    ]

                ],

                fields: [

                    "name",
                    "item_name",
                    "standard_rate"

                ],

                order_by:
                    "item_name asc",

                limit_page_length:
                    10

            },

            callback:
                function(r) {

                    if (
                        !r.exc
                        &&
                        r.message
                        &&
                        r.message.length
                    ) {

                        const item =
                            r.message[0];


                        row.item_code =
                            item.name
                            ||
                            "";

                        row.item_name =
                            item.item_name
                            ||
                            item.name
                            ||
                            "";

                        row.rate =
                            parseFloat(
                                item.standard_rate
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


                        callback();

                        return;

                    }


                    termIndex++;

                    findNext();

                },

            error:
                function() {

                    termIndex++;

                    findNext();

                }

        });

    }


    findNext();

}


/* =====================================================
   تحديث إجمالي الصف
===================================================== */

function update_radiology_row_amount(
    row
) {

    const tr =
        $(
            '#radiology-entry-tbody tr[data-row-id="' +
            row.id +
            '"]'
        );


    tr.find(
        ".er-radiology-row-amount"
    )
    .text(

        format_radiology_currency(
            row.amount
        )

    );

}


/* =====================================================
   إجمالي الأشعة
===================================================== */

function update_radiology_grand_total() {

    let total =
        0;


    er_radiology_entry_rows.forEach(

        function(row) {

            total +=
                parseFloat(
                    row.amount
                )
                ||
                0;

        }

    );


    $("#radiology-entry-grand-total")
        .text(

            format_radiology_currency(
                total
            )

        );

}


/* =====================================================
   التحقق من الصفوف
===================================================== */

function validate_radiology_entries(
    rows
) {

    if (
        !rows.length
    ) {

        frappe.msgprint({

            title:
                "الأشعة",

            message:
                "أضف فحص أشعة واحدًا على الأقل.",

            indicator:
                "orange"

        });


        return false;

    }


    for (

        let i = 0;

        i < rows.length;

        i++

    ) {

        const row =
            rows[i];


        if (
            !row.examination_type
        ) {

            frappe.msgprint({

                title:
                    "الأشعة",

                message:
                    "يجب اختيار نوع الأشعة في الصف رقم "
                    +
                    (i + 1),

                indicator:
                    "orange"

            });


            return false;

        }


        if (
            !row.item_code
        ) {

            frappe.msgprint({

                title:
                    "الأشعة",

                message:
                    "لم يتم العثور على خدمة الأشعة المرتبطة بنوع الفحص في الصف رقم "
                    +
                    (i + 1)
                    +
                    ".",

                indicator:
                    "orange"

            });


            return false;

        }


        if (
            !row.body_part
            ||
            !String(
                row.body_part
            ).trim()
        ) {

            frappe.msgprint({

                title:
                    "الأشعة",

                message:
                    "يجب إدخال منطقة الجسم في الصف رقم "
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
            parseFloat(
                row.quantity
            ) <= 0
        ) {

            frappe.msgprint({

                title:
                    "الأشعة",

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
   حفظ طلبات الأشعة
===================================================== */

function save_er_radiology_requests(
    callback
) {

    const finish =
        function(success) {

            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    success
                );

            }

        };


    const encounter =
        get_current_radiology_encounter();


    if (
        !encounter
    ) {

        frappe.msgprint({

            title:
                "الأشعة",

            message:
                "لا توجد زيارة طبية محددة.",

            indicator:
                "orange"

        });


        finish(false);

        return;

    }


    const rows =
        er_radiology_entry_rows.filter(

            function(row) {

                return (
                    row
                    &&
                    row.examination_type
                );

            }

        );


    if (
        !rows.length
    ) {

        finish(true);

        return;

    }


    if (
        !validate_radiology_entries(
            rows
        )
    ) {

        finish(false);

        return;

    }


    create_radiology_requests_batch(

        encounter,

        rows,

        0,

        0,

        [],

        function(success) {

            finish(
                success
            );

        }

    );

}


/* =====================================================
   التوافق مع الكود القديم
===================================================== */

function submit_radiology_entries(
    callback
) {

    save_er_radiology_requests(
        callback
    );

}


/* =====================================================
   إنشاء الطلبات بالتتابع
===================================================== */

function create_radiology_requests_batch(

    encounter,

    rows,

    index,

    created_count,

    request_numbers,

    finalCallback

) {

    if (
        index >=
        rows.length
    ) {

        er_radiology_entry_rows = [];


        render_radiology_entry_table();


        load_radiology_requests();


        if (
            created_count
        ) {

            frappe.show_alert({

                message:
                    "تم إنشاء "
                    +
                    created_count
                    +
                    " طلب أشعة بنجاح.",

                indicator:
                    "green"

            });


            if (
                typeof add_er_activity ===
                "function"
            ) {

                add_er_activity(

                    encounter,

                    "radiology",

                    "تم إنشاء "
                    +
                    created_count
                    +
                    " طلب أشعة: "
                    +
                    (
                        rows[0].examination_type
                        ||
                        "أشعة"
                    )

                );

            }

        }


        if (
            typeof finalCallback ===
            "function"
        ) {

            finalCallback(
                true
            );

        }


        return;

    }


    const row =
        rows[index];


    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.python.radiology.radiology.create_radiology_examination",

        args: {

            data:

                JSON.stringify({

                    encounter:
                        encounter,

                    examination_type:
                        row.examination_type,

                    body_part:
                        String(
                            row.body_part
                            ||
                            ""
                        ).trim(),

                    quantity:
                        parseFloat(
                            row.quantity
                        )
                        ||
                        1,

                    description:
                        row.description
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
                        "ER RADIOLOGY CREATE ERROR:",
                        r
                    );


                    frappe.msgprint({

                        title:
                            "الأشعة",

                        message:
                            "فشل إنشاء طلب الأشعة في الصف رقم "
                            +
                            (index + 1)
                            +
                            ".",

                        indicator:
                            "red"

                    });


                    if (
                        typeof finalCallback ===
                        "function"
                    ) {

                        finalCallback(
                            false
                        );

                    }


                    return;

                }


                request_numbers.push(
                    r.message.request_number
                );


                create_radiology_requests_batch(

                    encounter,

                    rows,

                    index + 1,

                    created_count + 1,

                    request_numbers,

                    finalCallback

                );

            },


        error:
            function(err) {

                console.error(
                    "ER RADIOLOGY CREATE AJAX ERROR:",
                    err
                );


                frappe.msgprint({

                    title:
                        "الأشعة",

                    message:
                        "تعذر إنشاء طلب الأشعة في الصف رقم "
                        +
                        (index + 1)
                        +
                        ".",

                    indicator:
                        "red"

                });


                if (
                    typeof finalCallback ===
                    "function"
                ) {

                    finalCallback(
                        false
                    );

                }

            }

    });

}


/* =====================================================
   تحميل الطلبات السابقة
===================================================== */

function load_radiology_requests() {

    const encounter =
        get_current_radiology_encounter();


    const loading =
        $("#radiology-requests-loading");


    const empty =
        $("#radiology-requests-empty");


    const container =
        $("#radiology-requests-container");


    if (
        !container.length
    ) {

        return;

    }


    container.empty();

    empty.hide();


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
            "custom_app.emergency_management.page.er_visit_console.python.radiology.radiology.get_radiology_requests",

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
                        "ER RADIOLOGY REQUESTS ERROR:",
                        r.exc
                    );


                    empty
                        .text(
                            "حدث خطأ أثناء تحميل فحوصات الأشعة."
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
                            "لا توجد فحوصات أشعة مطلوبة لهذه الزيارة."
                        )
                        .show();


                    return;

                }


                requests.forEach(

                    function(request) {

                        render_radiology_request(
                            request
                        );

                    }

                );

            },


        error:
            function(err) {

                loading.hide();


                console.error(
                    "ER RADIOLOGY REQUEST AJAX ERROR:",
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
   عرض طلب أشعة سابق
===================================================== */

function render_radiology_request(
    request
) {

    const container =
        $("#radiology-requests-container");


    if (
        !container.length
    ) {

        return;

    }


    const card =
        $("<div>")
            .addClass(
                "er-radiology-request-card"
            );


    const examName =
        (
            request.examination_type
            ||
            request.test_name
            ||
            ""
        ).toLowerCase();


    let examIcon =
        "🩻";


    if (
        examName.includes("x-ray")
        ||
        examName.includes("xray")
    ) {

        examIcon =
            "📡";

    }
    else if (
        examName.includes("ct")
    ) {

        examIcon =
            "🖥️";

    }
    else if (
        examName.includes("mri")
        ||
        examName.includes("رنين")
    ) {

        examIcon =
            "🧲";

    }
    else if (
        examName.includes("ultrasound")
        ||
        examName.includes("sound")
        ||
        examName.includes("موجات")
    ) {

        examIcon =
            "🔊";

    }
    else if (
        examName.includes("ecg")
        ||
        examName.includes("eeg")
    ) {

        examIcon =
            "💓";

    }
    else if (
        examName.includes("echo")
        ||
        examName.includes("صدى")
    ) {

        examIcon =
            "🫀";

    }
    else if (
        examName.includes("mammography")
        ||
        examName.includes(" mammo")
    ) {

        examIcon =
            "🎀";

    }
    else if (
        examName.includes("dexa")
        ||
        examName.includes("density")
    ) {

        examIcon =
            "🦴";

    }
    else if (
        examName.includes("pet")
    ) {

        examIcon =
            "☢️";

    }


    const iconSpan =
        $("<span>")
            .addClass(
                "er-radiology-request-icon"
            )
            .text(
                examIcon
            );


    const header =
        $("<div>")
            .addClass(
                "er-radiology-request-header"
            );


    header.prepend(
        iconSpan
    );


    header.append(

        $("<div>")
            .addClass(
                "er-radiology-request-title"
            )
            .text(

                request.examination_type
                ||
                request.test_name
                ||
                "فحص أشعة"

            )

    );


    header.append(

        $("<span>")
            .addClass(
                "er-radiology-status"
            )
            .text(

                get_radiology_status_label(
                    request.radiology_status
                )

            )

    );


    card.append(
        header
    );


    const details =
        $("<div>")
            .addClass(
                "er-radiology-request-details"
            );


    append_radiology_detail(
        details,
        "رقم الطلب",
        request.name
        ||
        "---"
    );


    append_radiology_detail(
        details,
        "رقم فحص الأشعة",
        request.examination_no
        ||
        request.radiology_examination
        ||
        "---"
    );


    append_radiology_detail(
        details,
        "نوع الأشعة",
        request.examination_type
        ||
        request.test_name
        ||
        "---"
    );


    append_radiology_detail(
        details,
        "الخدمة",
        request.item_code
        ||
        "---"
    );


    append_radiology_detail(
        details,
        "منطقة الجسم",
        request.body_part
        ||
        request.er_body_part
        ||
        "---"
    );


    append_radiology_detail(
        details,
        "الكمية",
        request.quantity
        ||
        1
    );
append_radiology_detail(
        details,
        "الفوترة",
        get_radiology_billing_label(
            request.billing_status
        )
    );


    if (
        request.sales_invoice
    ) {

        append_radiology_detail(
            details,
            "رقم الفاتورة",
            request.sales_invoice
        );

    }


    append_radiology_detail(
        details,
        "تاريخ الطلب",
        request.request_date
        ||
        "---"
    );


    if (
        request.requested_by
    ) {

        append_radiology_detail(
            details,
            "طالب الفحص",
            request.requested_by
        );

    }


    if (
        request.technician
    ) {

        append_radiology_detail(
            details,
            "الفني",
            request.technician
        );

    }


    card.append(
        details
    );


    const resultBox =
        $("<div>")
            .addClass(
                "er-radiology-result"
            );


    resultBox.append(

        $("<div>")
            .addClass(
                "er-radiology-result-title"
            )
            .text(
                "التقرير / النتيجة"
            )

    );


    if (
        request.result
    ) {

        const resultAction =
            $("<div>")
                .addClass(
                    "er-radiology-result-action"
                );


        resultAction.append(

            $("<span>")
                .addClass(
                    "er-radiology-result-icon"
                )
                .text(
                    "📝"
                )

        );


        resultAction.append(

            $("<span>")
                .addClass(
                    "er-radiology-result-label"
                )
                .text(
                    "نتيجة الأشعة"
                )

        );


        resultAction.append(

            $("<button>")
                .attr(
                    "type",
                    "button"
                )
                .addClass(
                    "er-radiology-result-view-btn"
                )
                .attr(
                    "data-result",
                    request.result
                )
                .attr(
                    "data-examination-type",
                    request.examination_type
                    ||
                    request.test_name
                    ||
                    ""
                )
                .attr(
                    "data-examination-no",
                    request.examination_no
                    ||
                    request.radiology_examination
                    ||
                    ""
                )
                .attr(
                    "data-request-no",
                    request.name
                    ||
                    ""
                )
                .attr(
                    "data-patient-name",
                    request.patient_name
                    ||
                    request.patient
                    ||
                    ""
                )
                .text(
                    "عرض"
                )

        );


        resultBox.append(
            resultAction
        );

    }
    else {

        resultBox.append(

            $("<div>")
                .addClass(
                    "er-radiology-result-empty"
                )
                .text(
                    "لا توجد نتيجة مسجلة حتى الآن."
                )

        );

    }


    if (
        request.report_pdf
    ) {

        resultBox.append(

            $("<a>")

                .attr(
                    "href",
                    request.report_pdf
                )

                .attr(
                    "target",
                    "_blank"
                )

                .addClass(
                    "btn btn-sm btn-secondary er-radiology-report-btn"
                )

                .text(
                    "📄 فتح التقرير"
                )

        );

    }


    if (
        request.image_attachment
    ) {

        const attachment =
            String(
                request.image_attachment
                ||
                ""
            ).trim();


        const attachmentLower =
            attachment.toLowerCase();


        const isImage =
            /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(
                attachmentLower
            );


        const isVideo =
            /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(
                attachmentLower
            );


        if (
            isImage
        ) {

            resultBox.append(

                $("<div>")
                    .addClass(
                        "er-radiology-attachment-preview"
                    )
                    .append(

                        $("<img>")
                            .attr(
                                "src",
                                attachment
                            )
                            .attr(
                                "alt",
                                "صورة الأشعة"
                            )
                            .attr(
                                "loading",
                                "lazy"
                            )
                            .addClass(
                                "er-radiology-image-preview"
                            )

                    )

            );

        }
        else if (
            isVideo
        ) {

            /*
             * لا نعرض الفيديو داخل بطاقة النتائج.
             * يظهر كمرفق قابل للفتح فقط.
             */

            resultBox.append(

                $("<div>")
                    .addClass(
                        "er-radiology-attachment-icon"
                    )
                    .css({

                        "display":
                            "inline-flex",

                        "align-items":
                            "center",

                        "gap":
                            "6px",

                        "margin":
                            "6px 0",

                        "padding":
                            "6px 10px",

                        "border":
                            "1px solid #cbd5e1",

                        "border-radius":
                            "6px",

                        "background":
                            "#f8fafc",

                        "font-size":
                            "13px"

                    })
                    .append(

                        $("<span>")
                            .text(
                                "📎"
                            )

                    )
                    .append(

                        $("<span>")
                            .text(
                                "مرفق فيديو"
                            )

                    )

            );

        }


        resultBox.append(

            $("<a>")

                .attr(
                    "href",
                    attachment
                )

                .attr(
                    "target",
                    "_blank"
                )

                .attr(
                    "rel",
                    "noopener noreferrer"
                )

                .addClass(
                    "btn btn-sm btn-secondary er-radiology-image-btn"
                )

                .text(

                    isVideo
                        ? "🎥 فتح الفيديو"
                        : isImage
                            ? "🖼 فتح الصورة"
                            : "📎 فتح المرفق"

                )

        );

    }


    card.append(
        resultBox
    );


    if (
        request.notes
    ) {

        const notes =
            $("<div>")
                .addClass(
                    "er-radiology-result"
                );


        notes.append(

            $("<div>")
                .addClass(
                    "er-radiology-result-title"
                )
                .text(
                    "ملاحظات الطبيب"
                )

        );


        notes.append(

            $("<div>")
                .addClass(
                    "er-radiology-result-text"
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

function append_radiology_detail(
    container,
    label,
    value
) {

    const item =
        $("<div>")
            .addClass(
                "er-radiology-detail"
            );


    item.append(

        $("<span>")
            .addClass(
                "er-radiology-detail-label"
            )
            .text(
                label
            )

    );


    item.append(

        $("<strong>")
            .addClass(
                "er-radiology-detail-value"
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
   حالة الأشعة
===================================================== */

function get_radiology_status_label(
    status
) {

    const map = {

        Requested:
            "مطلوب",

        Scheduled:
            "مجدول",

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

function get_radiology_billing_label(
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

function format_radiology_currency(
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
   حماية HTML
===================================================== */

function escape_radiology_html(
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
   التحديث
===================================================== */

function refresh_radiology_requests() {

    load_radiology_requests();

}


/* =====================================================
   الأحداث
===================================================== */


/* -----------------------------------------------------
   إضافة أشعة
----------------------------------------------------- */

$(document).off(
    "click.erRadiology",
    "#add-radiology-entry-row"
);


$(document).on(
    "click.erRadiology",
    "#add-radiology-entry-row",
    function() {

        add_radiology_entry_row();

    }
);


/* -----------------------------------------------------
   تحديث
----------------------------------------------------- */

$(document).off(
    "click.erRadiologyRefresh",
    "#refresh-radiology-requests"
);


$(document).on(
    "click.erRadiologyRefresh",
    "#refresh-radiology-requests",
    function() {

        refresh_radiology_requests();

    }
);



/* -----------------------------------------------------
   حفظ طلبات الأشعة — مباشر
----------------------------------------------------- */

$(document).off(
    "click.erRadiologySave",
    "#save-radiology-entry-rows"
);

$(document).on(
    "click.erRadiologySave",
    "#save-radiology-entry-rows",
    function(event) {

        event.preventDefault();
        event.stopPropagation();

        const button = $(this);

        if (button.prop("disabled")) {
            return;
        }

        const encounter =
            get_current_radiology_encounter();

        if (!encounter) {

            frappe.msgprint({
                title: "الأشعة",
                message: "لا توجد زيارة طبية محددة.",
                indicator: "orange"
            });

            return;
        }

        const rows = [];

        $("#radiology-entry-tbody > tr").each(
            function(index) {

                const row =
                    er_radiology_entry_rows[index];

                if (!row) {
                    return;
                }

                const examination =
                    $(this)
                        .find(".er-radiology-link-input")
                        .first()
                        .val() || "";

                const bodyPart =
                    $(this)
                        .children("td")
                        .eq(3)
                        .find("input")
                        .first()
                        .val() || "";

                const description =
                    $(this)
                        .find("textarea")
                        .first()
                        .val() ||
                    row.description ||
                    "";

                row.examination_type =
                    String(examination).trim();

                row.body_part =
                    String(bodyPart).trim();

                row.description =
                    String(description).trim();

                if (row.examination_type) {
                    rows.push({
                        examination_type:
                            row.examination_type,

                        body_part:
                            row.body_part,

                        quantity:
                            parseFloat(row.quantity) || 1,

                        description:
                            row.description
                    });
                }

            }
        );

        if (!rows.length) {

            frappe.msgprint({
                title: "الأشعة",
                message: "أدخل نوع الأشعة أولًا ثم اضغط حفظ.",
                indicator: "orange"
            });

            return;
        }

        button
            .prop("disabled", true)
            .text("⏳ جاري الحفظ...");

        let index = 0;
        let created = 0;

        function save_next() {

            if (index >= rows.length) {

                button
                    .prop("disabled", false)
                    .text("💾 حفظ طلب الأشعة");

                er_radiology_entry_rows = [];

                render_radiology_entry_table();

                load_radiology_requests();

                frappe.show_alert({
                    message:
                        "تم حفظ " +
                        created +
                        " طلب أشعة بنجاح",
                    indicator: "green"
                });

                return;
            }

            const row = rows[index];

            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.python.radiology.radiology.create_radiology_examination",

                args: {
                    data: JSON.stringify({

                        encounter:
                            encounter,

                        examination_type:
                            row.examination_type,

                        body_part:
                            row.body_part,

                        quantity:
                            row.quantity,

                        description:
                            row.description

                    })
                },

                freeze: true,

                freeze_message:
                    "جاري حفظ طلب الأشعة...",

                callback:
                    function(r) {

                        if (
                            r.exc ||
                            !r.message ||
                            !r.message.request_number
                        ) {

                            console.error(
                                "RADIOLOGY SAVE ERROR:",
                                r
                            );

                            button
                                .prop("disabled", false)
                                .text("💾 حفظ طلب الأشعة");

                            frappe.msgprint({
                                title: "الأشعة",
                                message:
                                    "تعذر حفظ طلب الأشعة. راجع Console.",
                                indicator: "red"
                            });

                            return;
                        }

                        created += 1;
                        index += 1;

                        save_next();

                    }

            });

        }

        save_next();

    }
);

/* =====================================================
   الحفظ الموحد
===================================================== */

window.save_er_radiology_requests =
    save_er_radiology_requests;


/* =====================================================
   الاسم القديم
===================================================== */

window.submit_radiology_entries =
    submit_radiology_entries;


/* =====================================================
   جاهزية
===================================================== */

console.log(
    "ER RADIOLOGY JS READY"
);


/* =====================================================
   عرض نتيجة الأشعة بشكل كبير
   مع شعار المستشفى + زر الطباعة
===================================================== */

$(document).off(
    "click.erRadiologyResult",
    ".er-radiology-result-view-btn"
);


$(document).on(
    "click.erRadiologyResult",
    ".er-radiology-result-view-btn",
    function(e) {

        e.preventDefault();
        e.stopPropagation();


        const resultText =
            $(this).attr(
                "data-result"
            )
            ||
            "";


        if (
            !resultText.trim()
        ) {

            return;

        }


        const examinationType =
            $(this).attr(
                "data-examination-type"
            )
            ||
            "فحص أشعة";


        const examinationNo =
            $(this).attr(
                "data-examination-no"
            )
            ||
            "";


        const requestNo =
            $(this).attr(
                "data-request-no"
            )
            ||
            "";


        const patientName =
            $(this).attr(
                "data-patient-name"
            )
            ||
            "";


        open_radiology_result_modal({

            result:
                resultText,

            examination_type:
                examinationType,

            examination_no:
                examinationNo,

            request_no:
                requestNo,

            patient_name:
                patientName

        });

    }
);


/* =====================================================
   نافذة تقرير الأشعة
===================================================== */

function open_radiology_result_modal(data) {

    const logoUrl =
        "/private/files/" +
        encodeURIComponent(
            "شعار المستشفى2.ico"
        );


    const overlay =
        $("<div>")
            .addClass(
                "er-radiology-result-modal"
            )
            .css({

                "position":
                    "fixed",

                "top":
                    "0",

                "left":
                    "0",

                "right":
                    "0",

                "bottom":
                    "0",

                "width":
                    "100vw",

                "height":
                    "100vh",

                "z-index":
                    "100000",

                "display":
                    "flex",

                "align-items":
                    "flex-start",

                "justify-content":
                    "center",

                "padding":
                    "20px",

                "box-sizing":
                    "border-box",

                "overflow-y":
                    "auto"

            });


    const modal =
        $("<div>")
            .addClass(
                "er-radiology-result-modal-content"
            )
            .css({

                "max-width":
                    "1000px",

                "width":
                    "95%",

                "max-height":
                    "calc(100vh - 40px)",

                "margin":
                    "0 auto",

                "background":
                    "#fff",

                "border-radius":
                    "12px",

                "overflow":
                    "hidden",

                "display":
                    "flex",

                "flex-direction":
                    "column",

                "box-shadow":
                    "0 10px 40px rgba(0,0,0,.25)"

            });


    const header =
        $("<div>")
            .addClass(
                "er-radiology-result-modal-header"
            )
            .css({

                "display":
                    "flex",

                "align-items":
                    "center",

                "justify-content":
                    "space-between",

                "gap":
                    "10px"

            });


    const title =
        $("<div>")
            .addClass(
                "er-radiology-result-modal-title"
            )
            .text(
                "🩻 تقرير / نتيجة الأشعة"
            );


    const headerActions =
        $("<div>")
            .css({

                "display":
                    "flex",

                "align-items":
                    "center",

                "gap":
                    "8px"

            });


    const printButton =
        $("<button>")
            .attr(
                "type",
                "button"
            )
            .addClass(
                "btn btn-primary btn-sm"
            )
            .css({
                "font-weight": "600"
            })
            .text(
                "🖨 طباعة التقرير"
            );


    const closeButton =
        $("<button>")
            .addClass(
                "er-radiology-result-modal-close"
            )
            .text(
                "✕"
            );


    headerActions.append(
        printButton,
        closeButton
    );


    header.append(
        title,
        headerActions
    );


    const report =
        $("<div>")
            .css({

                "padding":
                    "30px",

                "background":
                    "#fff",

                "direction":
                    "rtl",

                "text-align":
                    "right",

                "overflow-y":
                    "auto",

                "max-height":
                    "calc(100vh - 120px)",

                "box-sizing":
                    "border-box"

            });


    const logoContainer =
        $("<div>")
            .css({

                "text-align":
                    "center",

                "margin-bottom":
                    "15px"

            });


    const logo =
        $("<img>")
            .attr(
                "src",
                logoUrl
            )
            .attr(
                "alt",
                "شعار المستشفى"
            )
            .css({

                "max-width":
                    "110px",

                "max-height":
                    "110px",

                "object-fit":
                    "contain"

            });


    logoContainer.append(
        logo
    );


    const hospitalTitle =
        $("<div>")
            .css({

                "text-align":
                    "center",

                "font-size":
                    "24px",

                "font-weight":
                    "700",

                "margin-bottom":
                    "4px"

            })
            .text(
                "المستشفى"
            );


    const reportTitle =
        $("<div>")
            .css({

                "text-align":
                    "center",

                "font-size":
                    "20px",

                "font-weight":
                    "600",

                "margin-bottom":
                    "25px"

            })
            .text(
                "تقرير / نتيجة الأشعة"
            );


    report.append(
        logoContainer,
        hospitalTitle,
        reportTitle
    );


    const infoBox =
        $("<div>")
            .css({

                "display":
                    "grid",

                "grid-template-columns":
                    "repeat(auto-fit, minmax(220px, 1fr))",

                "gap":
                    "10px",

                "margin-bottom":
                    "20px",

                "padding":
                    "15px",

                "border":
                    "1px solid #ddd",

                "border-radius":
                    "8px",

                "background":
                    "#f8f9fa"

            });


    function addInfo(
        label,
        value
    ) {

        if (
            !value
        ) {

            return;

        }


        const item =
            $("<div>")
                .css({
                    "font-size":
                        "14px"
                });


        item.append(

            $("<span>")
                .css({

                    "font-weight":
                        "600",

                    "margin-left":
                        "6px"

                })
                .text(
                    label + ":"
                )

        );


        item.append(

            $("<span>")
                .text(
                    value
                )

        );


        infoBox.append(
            item
        );

    }


    addInfo(
        "اسم المريض",
        data.patient_name
    );


    addInfo(
        "نوع الأشعة",
        data.examination_type
    );


    addInfo(
        "رقم فحص الأشعة",
        data.examination_no
    );


    addInfo(
        "رقم الطلب",
        data.request_no
    );


    report.append(
        infoBox
    );


    report.append(

        $("<div>")
            .css({

                "font-size":
                    "18px",

                "font-weight":
                    "700",

                "border-bottom":
                    "2px solid #ddd",

                "padding-bottom":
                    "8px",

                "margin-bottom":
                    "15px"

            })
            .text(
                "نتيجة الفحص"
            )

    );


    const body =
        $("<div>")
            .addClass(
                "er-radiology-result-modal-body"
            )
            .css({

                "font-size":
                    "16px",

                "line-height":
                    "2",

                "white-space":
                    "pre-wrap",

                "word-break":
                    "break-word",

                "min-height":
                    "250px",

                "max-height":
                    "50vh",

                "overflow-y":
                    "auto",

                "padding":
                    "20px",

                "border":
                    "1px solid #ddd",

                "border-radius":
                    "8px",

                "background":
                    "#fff"

            })
            .text(
                data.result
            );


    report.append(
        body
    );


    const footer =
        $("<div>")
            .css({

                "margin-top":
                    "35px",

                "padding-top":
                    "15px",

                "border-top":
                    "1px solid #ddd",

                "text-align":
                    "center",

                "font-size":
                    "12px",

                "color":
                    "#666"

            })
            .text(
                "تم إصدار هذا التقرير من نظام إدارة المستشفى"
            );


    report.append(
        footer
    );


    modal.append(
        header,
        report
    );


    overlay.append(
        modal
    );


    $("body").append(
        overlay
    );


    function closeResultModal() {

        overlay.remove();


        $(document).off(
            "keydown.erRadiologyResultModal"
        );

    }


    closeButton.on(
        "click",
        closeResultModal
    );


    overlay.on(
        "click",
        function(e) {

            if (
                e.target ===
                overlay[0]
            ) {

                closeResultModal();

            }

        }
    );


    $(document).off(
        "keydown.erRadiologyResultModal"
    );


    $(document).on(
        "keydown.erRadiologyResultModal",
        function(e) {

            if (
                e.key ===
                "Escape"
            ) {

                closeResultModal();

            }

        }
    );


    printButton.on(
        "click",
        function() {

            print_radiology_report({

                logo_url:
                    logoUrl,

                result:
                    data.result,

                examination_type:
                    data.examination_type,

                examination_no:
                    data.examination_no,

                request_no:
                    data.request_no,

                patient_name:
                    data.patient_name

            });

        }
    );

}


/* =====================================================
   طباعة تقرير الأشعة
===================================================== */

function print_radiology_report(data) {

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=900,height=1000"
        );


    if (
        !printWindow
    ) {

        frappe.msgprint({

            title:
                "الطباعة",

            message:
                "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة للمتصفح.",

            indicator:
                "orange"

        });


        return;

    }


    function escapeHtml(value) {

        return String(
            value
            ||
            ""
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


    const reportText =
        escapeHtml(
            data.result
        );


    const patientName =
        escapeHtml(
            data.patient_name
        );


    const examinationType =
        escapeHtml(
            data.examination_type
        );


    const examinationNo =
        escapeHtml(
            data.examination_no
        );


    const requestNo =
        escapeHtml(
            data.request_no
        );


    printWindow.document.open();


    printWindow.document.write(
        `
        <!DOCTYPE html>

        <html lang="ar" dir="rtl">

        <head>

            <meta charset="UTF-8">

            <title>
                تقرير الأشعة
            </title>

            <style>

                @page {
                    size: A4;
                    margin: 18mm;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 0;
                    direction: rtl;
                    font-family:
                        "Arial",
                        "Tahoma",
                        sans-serif;
                    color: #111;
                    background: #fff;
                }

                .report {
                    width: 100%;
                }

                .logo {
                    display: block;
                    margin: 0 auto 10px auto;
                    max-width: 110px;
                    max-height: 110px;
                    object-fit: contain;
                }

                .hospital-name {
                    text-align: center;
                    font-size: 25px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }

                .report-title {
                    text-align: center;
                    font-size: 21px;
                    font-weight: bold;
                    margin-bottom: 25px;
                }

                .info {
                    border: 1px solid #aaa;
                    padding: 12px;
                    margin-bottom: 22px;
                    border-radius: 5px;
                    display: grid;
                    grid-template-columns:
                        1fr 1fr;
                    gap: 10px;
                    font-size: 14px;
                }

                .info-item {
                    padding: 5px;
                }

                .label {
                    font-weight: bold;
                }

                .result-title {
                    font-size: 18px;
                    font-weight: bold;
                    border-bottom:
                        2px solid #222;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }

                .result {
                    border: 1px solid #aaa;
                    padding: 20px;
                    min-height: 300px;
                    font-size: 16px;
                    line-height: 2;
                    white-space: pre-wrap;
                    word-break: break-word;
                }

                .footer {
                    margin-top: 40px;
                    padding-top: 12px;
                    border-top:
                        1px solid #aaa;
                    text-align: center;
                    font-size: 11px;
                }

                @media print {

                    body {
                        -webkit-print-color-adjust:
                            exact;
                        print-color-adjust:
                            exact;
                    }

                }

            </style>

        </head>

        <body>

            <div class="report">

                <img
                    class="logo"
                    src="${escapeHtml(data.logo_url)}"
                    alt="شعار المستشفى"
                >

                <div class="hospital-name">
                    المستشفى
                </div>

                <div class="report-title">
                    تقرير / نتيجة الأشعة
                </div>

                <div class="info">

                    ${
                        patientName
                        ?
                        `
                        <div class="info-item">
                            <span class="label">
                                اسم المريض:
                            </span>
                            ${patientName}
                        </div>
                        `
                        :
                        ""
                    }

                    ${
                        examinationType
                        ?
                        `
                        <div class="info-item">
                            <span class="label">
                                نوع الأشعة:
                            </span>
                            ${examinationType}
                        </div>
                        `
                        :
                        ""
                    }

                    ${
                        examinationNo
                        ?
                        `
                        <div class="info-item">
                            <span class="label">
                                رقم فحص الأشعة:
                            </span>
                            ${examinationNo}
                        </div>
                        `
                        :
                        ""
                    }

                    ${
                        requestNo
                        ?
                        `
                        <div class="info-item">
                            <span class="label">
                                رقم الطلب:
                            </span>
                            ${requestNo}
                        </div>
                        `
                        :
                        ""
                    }

                </div>

                <div class="result-title">
                    نتيجة الفحص
                </div>

                <div class="result">
                    ${reportText}
                </div>

                <div class="footer">
                    تم إصدار هذا التقرير من نظام إدارة المستشفى
                </div>

            </div>

        </body>

        </html>
        `
    );


    printWindow.document.close();


    const logo =
        printWindow.document.querySelector(
            ".logo"
        );


    if (
        logo
    ) {

        logo.onload =
            function() {

                printWindow.focus();

                printWindow.print();

            };


        logo.onerror =
            function() {

                printWindow.focus();

                printWindow.print();

            };

    }
    else {

        printWindow.focus();

        printWindow.print();

    }

}


/* =====================================================
   دعم الضغط على نص النتيجة
===================================================== */

$(document).off(
    "click.erRadiologyResultText",
    ".er-radiology-result-text"
);


$(document).on(
    "click.erRadiologyResultText",
    ".er-radiology-result-text",
    function() {

        const resultText =
            $(this)
                .text()
                .replace(
                    " 🔍 اضغط لعرض النتيجة كاملة",
                    ""
                )
                .trim();


        if (
            !resultText
        ) {

            return;

        }


        open_radiology_result_modal({

            result:
                resultText,

            examination_type:
                "فحص أشعة",

            examination_no:
                "",

            request_no:
                "",

            patient_name:
                ""

        });

    }
);
