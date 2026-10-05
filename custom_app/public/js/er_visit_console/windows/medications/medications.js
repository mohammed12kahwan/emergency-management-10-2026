"use strict";

// =====================================================
// ER MEDICATIONS
// أدوية الطوارئ
//
// DocTypes المستخدمة فعليًا:
//
// Medication
// Medication Request
// Dosage Form
// Prescription Dosage
// Prescription Duration
// Item
//
// الربط:
//
// Medication Request
//     patient
//     practitioner
//     medication
//     medication_item
//     dosage_form
//     dosage
//     period
//     order_group
//     reason_reference
//
// مهم:
//
// - الجرعة الطبية تحفظ في order_description.
// - التكرار = Prescription Dosage.
// - المدة = Prescription Duration.
// - الشكل = Dosage Form.
// - لا يتم خصم المخزون عند إنشاء الطلب.
// - الصرف المخزني يتم عبر administer_medication.
// - تسجيل الإعطاء فقط يتم عبر record_medication_administration.
// - القوائم المنسدلة تعمل خارج الجدول.
// - القوائم تظهر فور دخول المؤشر إلى الحقل.
// =====================================================


// =====================================================
// الصفوف الحالية
// =====================================================

let er_medication_entry_rows = [];


// =====================================================
// أدوات النص
// =====================================================

function medication_text(value) {

    return String(
        value || ""
    ).trim();

}


// =====================================================
// تنظيف القوائم
// =====================================================

function cleanup_medication_dropdown_portals() {

    $(
        [
            ".er-medication-row-suggestions-portal",
            ".er-medication-link-suggestions-portal"
        ].join(",")
    ).remove();

}


// =====================================================
// CSS للقوائم
// =====================================================

function ensure_medication_dropdown_portal_styles() {

    if (
        document.getElementById(
            "er-medication-dropdown-portal-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "er-medication-dropdown-portal-styles";


    style.textContent = `

        .er-medication-row-suggestions-portal,
        .er-medication-link-suggestions-portal {

            position: fixed !important;

            display: none;

            z-index: 1040 !important;

            max-height: 320px;

            overflow-y: auto;

            overflow-x: hidden;

            box-sizing: border-box;

            background:
                var(--card-bg, #ffffff);

            color:
                var(--text-color, #1f272e);

            border:
                1px solid
                var(--border-color, #d9d9d9);

            border-radius: 8px;

            box-shadow:
                0 10px 30px
                rgba(0, 0, 0, .22);

            direction:
                rtl;

            padding:
                4px;

        }


        .er-medication-suggestion-item,
        .er-medication-link-suggestion-item {

            display:
                block;

            width:
                100%;

            min-height:
                40px;

            padding:
                9px 12px;

            border:
                0;

            border-radius:
                6px;

            background:
                transparent;

            color:
                inherit;

            text-align:
                right;

            cursor:
                pointer;

            white-space:
                normal;

        }


        .er-medication-suggestion-item:hover,
        .er-medication-link-suggestion-item:hover {

            background:
                var(--control-bg, #f5f5f5);

        }


        .er-medication-link-control {

            position:
                relative;

            width:
                100%;

        }


        .er-medication-link-control input {

            width:
                100%;

        }

    `;


    document.head.appendChild(
        style
    );

}


// =====================================================
// الحصول على موقع الحقل
// =====================================================

function get_medication_anchor_rect(
    anchor
) {

    if (!anchor) {

        return null;

    }


    if (anchor.jquery) {

        anchor =
            anchor[0];

    }


    if (
        !anchor
        ||
        typeof anchor.getBoundingClientRect !==
            "function"
    ) {

        return null;

    }


    return anchor.getBoundingClientRect();

}


// =====================================================
// وضع القائمة
// =====================================================

function position_medication_portal(
    portal
) {

    const anchor =
        portal.data(
            "anchor"
        );


    const rect =
        get_medication_anchor_rect(
            anchor
        );


    if (!rect) {

        return;

    }


    const viewportHeight =
        window.innerHeight
        ||
        document.documentElement.clientHeight
        ||
        800;


    const viewportWidth =
        window.innerWidth
        ||
        document.documentElement.clientWidth
        ||
        1200;


    const width =
        Math.max(
            rect.width,
            280
        );


    const safeWidth =
        Math.min(
            width,
            viewportWidth - 16
        );


    const spaceBelow =
        viewportHeight -
        rect.bottom;


    const spaceAbove =
        rect.top;


    let maxHeight =
        Math.min(
            320,
            Math.max(
                140,
                spaceBelow - 12
            )
        );


    let top =
        rect.bottom +
        4;


    if (
        spaceBelow < 180
        &&
        spaceAbove > 180
    ) {

        maxHeight =
            Math.min(
                320,
                Math.max(
                    140,
                    spaceAbove - 12
                )
            );


        top =
            rect.top -
            maxHeight -
            4;

    }


    if (
        top < 8
    ) {

        top = 8;

    }


    let left =
        rect.left;


    if (
        left +
        safeWidth >
        viewportWidth -
        8
    ) {

        left =
            viewportWidth -
            safeWidth -
            8;

    }


    if (
        left < 8
    ) {

        left = 8;

    }


    portal.css({

        top:
            top +
            "px",

        left:
            left +
            "px",

        width:
            safeWidth +
            "px",

        maxHeight:
            maxHeight +
            "px"

    });

}


// =====================================================
// إظهار القائمة
// =====================================================

function show_medication_portal(
    portal
) {

    position_medication_portal(
        portal
    );


    portal.show();


    position_medication_portal(
        portal
    );

}


// =====================================================
// إعادة وضع القوائم
// =====================================================

function reposition_all_medication_dropdowns() {

    $(
        [
            ".er-medication-row-suggestions-portal:visible",
            ".er-medication-link-suggestions-portal:visible"
        ].join(",")
    ).each(

        function() {

            position_medication_portal(
                $(this)
            );

        }

    );

}


$(window).off(
    "resize.erMedications"
);


$(window).on(
    "resize.erMedications",
    function() {

        reposition_all_medication_dropdowns();

    }
);


$(window).off(
    "scroll.erMedications"
);


$(window).on(
    "scroll.erMedications",
    function() {

        reposition_all_medication_dropdowns();

    }
);


// =====================================================
// إنشاء Portal لحقل Link
//
// مهم:
// - لا نستخدم row.details.
// - القيمة تحفظ مباشرة في row[fieldKey].
// - عند focus بدون نص يتم جلب أول 30 سجل.
// =====================================================

function create_medication_link_portal(
    config
) {

    const wrapper =
        config.wrapper;


    const row =
        config.row;


    const fieldKey =
        config.fieldKey;


    const doctype =
        config.doctype;


    const placeholder =
        config.placeholder
        ||
        "ابحث...";


    const searchFields =
        config.searchFields
        ||
        [
            "name"
        ];


    const formatResult =
        config.formatResult
        ||
        function(item) {

            return item.name;

        };


    const input =
        $("<input>")

            .attr(
                "type",
                "text"
            )

            .attr(
                "autocomplete",
                "off"
            )

            .attr(
                "spellcheck",
                "false"
            )

            .attr(
                "placeholder",
                placeholder
            )

            .addClass(
                "form-control"
            )

            .val(
                row[fieldKey]
                ||
                ""
            );


    wrapper
        .empty()
        .append(
            input
        );


    const portal =
        $("<div>")
            .addClass(
                "er-medication-link-suggestions-portal"
            );


    portal.data(
        "anchor",
        input[0]
    );


    $("body").append(
        portal
    );


    let timer =
        null;


    function hide_portal() {

        portal
            .empty()
            .hide();

    }


    function render_results(
        items
    ) {

        portal.empty();


        if (
            !items.length
        ) {

            portal
                .append(

                    $("<div>")
                        .css({

                            padding:
                                "10px",

                            color:
                                "#777",

                            textAlign:
                                "right"

                        })
                        .text(
                            "لا توجد نتائج"
                        )

                );


            show_medication_portal(
                portal
            );


            return;

        }


        items.forEach(
            function(item) {

                const button =
                    $("<button>")

                        .attr(
                            "type",
                            "button"
                        )

                        .addClass(
                            "er-medication-link-suggestion-item"
                        )

                        .text(
                            formatResult(
                                item
                            )
                        );


                button.on(
                    "mousedown",
                    function(event) {

                        event.preventDefault();

                    }
                );


                button.on(
                    "click",
                    function(event) {

                        event.preventDefault();

                        event.stopPropagation();


                        const value =
                            item.name
                            ||
                            "";


                        row[fieldKey] =
                            value;


                        if (
                            config.onSelect
                        ) {

                            config.onSelect(
                                item,
                                value
                            );

                        }


                        input.val(
                            formatResult(
                                item
                            )
                        );


                        hide_portal();

                    }
                );


                portal.append(
                    button
                );

            }
        );


        show_medication_portal(
            portal
        );

    }


    function search(
        value
    ) {

        value =
            medication_text(
                value
            );


        const filters =
            config.filters
            ||
            {};


        const orFilters =
            [];


        // =================================================
        // البحث:
        // عند وجود نص → LIKE
        // عند عدم وجود نص → لا OR filter
        // حتى تظهر القائمة مباشرة.
        // =================================================

        if (
            value
        ) {

            searchFields.forEach(
                function(fieldname) {

                    orFilters.push([

                        doctype,

                        fieldname,

                        "like",

                        "%" +
                        value +
                        "%"

                    ]);

                }
            );

        }


        const args = {

            doctype:
                doctype,

            filters:
                filters,

            fields:
                config.fields
                ||
                [
                    "name"
                ],

            order_by:
                "name asc",

            limit_page_length:
                30

        };


        if (
            orFilters.length
        ) {

            args.or_filters =
                orFilters;

        }


        frappe.call({

            method:
                "frappe.client.get_list",

            args:
                args,

            callback:
                function(r) {

                    if (
                        r.exc
                    ) {

                        hide_portal();

                        return;

                    }


                    render_results(
                        r.message
                        ||
                        []
                    );

                },

            error:
                function() {

                    hide_portal();

                }

        });

    }


    input.on(
        "input",
        function() {

            clearTimeout(
                timer
            );


            const value =
                medication_text(
                    $(this).val()
                );


            row[fieldKey] =
                value;


            timer =
                setTimeout(
                    function() {

                        search(
                            value
                        );

                    },
                    150
                );

        }
    );


    // =====================================================
    // مهم:
    // فتح القائمة بمجرد دخول المؤشر.
    // =====================================================

    input.on(
        "click",
        function() {

            if (
                !portal.is(
                    ":visible"
                )
            ) {

                const value =
                    medication_text(
                        $(this).val()
                    );


                search(
                    value
                );

            }

        }
    );


    input.on(
        "focus",
        function() {

            const value =
                medication_text(
                    $(this).val()
                );


            search(
                value
            );

        }
    );


    input.on(
        "mouseenter",
        function() {

            if (
                !portal.is(":visible")
            ) {

                const value =
                    medication_text(
                        $(this).val()
                    );


                search(
                    value
                );

            }

        }
    );


    input.on(
        "blur",
        function() {

            setTimeout(
                function() {

                    if (
                        !portal.is(":hover")
                    ) {

                        hide_portal();

                    }

                },
                250
            );

        }
    );


    return {

        input:
            input,

        portal:
            portal,

        destroy:
            function() {

                portal.remove();

            }

    };

}


// =====================================================
// واجهة الأدوية
// =====================================================

function load_medications_section() {

    er_medication_entry_rows =
        [];


    cleanup_medication_dropdown_portals();


    ensure_medication_dropdown_portal_styles();


    $("#er-content").html(`

        <div
            class="er-medications-section"
        >

            <!-- ================================================= -->
            <!-- إضافة الأدوية -->
            <!-- ================================================= -->

            <div
                class="er-medication-card"
            >

                <div
                    class="er-medication-card-header"
                    style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        user-select: none;
                    "
                    onclick="toggle_er_section('medication-entry-content')"
                >

                    <h3
                        class="er-medication-card-title"
                    >
                        💊
                        <span>
                            إضافة الأدوية
                        </span>
                    </h3>

                    <button
                        type="button"
                        class="er-collapse-toggle"
                        id="medication-entry-toggle"
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
                    id="medication-entry-content"
                    class="er-collapsible-content"
                >

                    <div
                        id="medication-entry-empty"
                        class="medication-table-state"
                        style="display:none;"
                    >
                        اضغط على «إضافة دواء» لإضافة دواء.
                    </div>


                <div
                    class="er-medication-table-wrapper"
                >

                    <table
                        class="er-medication-table"
                    >

                        <thead>

                            <tr>

                                <th>#</th>

                                <th>
                                    اسم الدواء
                                </th>

                                <th>
                                    الجرعة الطبية
                                </th>

                                <th>
                                    الشكل الدوائي
                                </th>

                                <th>
                                    التكرار
                                </th>

                                <th>
                                    المدة
                                </th>

                                <th>
                                    الكمية
                                </th>

                                <th>
                                    تكرار
                                </th>

                                <th>
                                    حذف
                                </th>

                            </tr>

                        </thead>


                        <tbody
                            id="medication-entry-tbody"
                        >
                        </tbody>

                    </table>

                </div>


                <div
                    id="medication-entry-controls"
                    class="er-medication-entry-controls"
                    style="margin-top: 8px;"
                >
                    <button
                        type="button"
                        class="btn btn-success btn-sm"
                        id="add-medication-entry-row-inline"
                    >
                        ➕ إضافة دواء
                    </button>

                    <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        id="save-medication-entry-rows"
                        style="margin-inline-start: 6px;"
                    >
                        💾 حفظ طلب الدواء
                    </button>

                    <button
                        type="button"
                        class="btn btn-outline-secondary btn-sm"
                        id="refresh-medication-window"
                        style="margin-inline-start: 6px;"
                        title="تحديث نافذة الأدوية"
                    >
                        🔄 تحديث
                    </button>
                </div>

            </div>


            <!-- ================================================= -->
            <!-- الطلبات -->
            <!-- ================================================= -->

            <div
                class="er-medication-card"
            >

                <div
                    class="er-medication-card-header"
                    style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        user-select: none;
                    "
                    onclick="toggle_er_section('medication-requests-content')"
                >

                    <h3
                        class="er-medication-card-title"
                    >
                        📋 طلبات الأدوية
                    </h3>

                     <button
                         type="button"
                         class="er-collapse-toggle"
                         id="medication-requests-toggle"
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

                     <button
                         type="button"
                         class="btn btn-outline-secondary btn-sm"
                         id="refresh-medication-requests"
                         title="تحديث طلبات الأدوية"
                         style="
                             margin-right: 6px;
                             font-size: 14px;
                         "
                     >🔄</button>

                 </div>


                 <div
                     id="medication-requests-content"
                     class="er-collapsible-content"
                 >

                     <div
                         id="medication-requests-loading"
                         class="medication-table-state"
                         style="display:none;"
                     >
                         ⏳ جاري تحميل طلبات الأدوية...
                     </div>


                     <div
                         id="medication-requests-empty"
                         class="medication-table-state"
                         style="display:none;"
                     >
                     </div>


                     <div
                         class="er-medication-table-wrapper"
                     >

                         <table
                             id="medication-requests-table"
                             class="er-medication-table"
                         >

                        <thead>

                            <tr>

                                <th>#</th>

                                <th>
                                    رقم الطلب
                                </th>

                                <th>
                                    الدواء
                                </th>

                                <th>
                                    الجرعة
                                </th>

                                <th>
                                    الشكل
                                </th>

                                <th>
                                    التكرار
                                </th>

                                <th>
                                    المدة
                                </th>

                                <th>
                                    الكمية
                                </th>

                                <th>
                                    الطبيب
                                </th>

                                <th>
                                    الحالة
                                </th>

                            </tr>

                        </thead>


                        <tbody
                            id="medication-requests-body"
                        >
                        </tbody>

                     </table>

                 </div>

                 </div>

             </div>


            <!-- ================================================= -->
            <!-- الإعطاء -->
            <!-- ================================================= -->

            <div
                class="er-medication-card medication-administration-section"
            >

                <div
                    class="er-medication-card-header medication-administration-section"
                    style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        user-select: none;
                    "
                    onclick="toggle_er_section('medication-administration-content')"
                >

                    <h3
                        class="er-medication-card-title"
                    >

                        💉
                        <span>
                            أدوية بانتظار الإعطاء
                        </span>

                        <span
                            id="medication-administration-count"
                            class="medication-administration-count"
                        >
                            0
                        </span>

                    </h3>

                    <button
                        type="button"
                        class="er-collapse-toggle"
                        id="medication-administration-toggle"
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
                     id="medication-administration-content"
                     class="er-collapsible-content"
                 >

                    <div
                        id="medication-administration-container"
                        class="medication-administration-container"
                    ></div>

                </div>
                </div>

                </div>
            </div>

        </div>

        <div id="er_medications_activity" style="margin-top: 24px;"></div>

    `);

    render_activity_timeline("er_medications_activity", "medications");

    add_medication_entry_row();


    load_medication_requests();


    if (
        typeof toggle_er_section ===
        "function"
    ) {

        $("#medication-entry-toggle").on(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                toggle_er_section(
                    "medication-entry-content"
                );

            }
        );


        $("#medication-requests-toggle").on(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                toggle_er_section(
                    "medication-requests-content"
                );

            }
        );


        $("#medication-administration-toggle").on(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                toggle_er_section(
                    "medication-administration-content"
                );

            }
        );

    }

}


// =====================================================
// إضافة صف
// =====================================================

function add_medication_entry_row() {

    er_medication_entry_rows.push({

        id:
            "med-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(
                    2,
                    8
                ),

        drug:
            "",

        medication_name:
            "",

        medication_item:
            "",

        dose:
            "",

        dosage_form:
            "",

        dosage:
            "",

        frequency:
            "",

        duration:
            "",

        period:
            "",

        quantity:
            1

    });


    render_medication_entry_table();

}


// =====================================================
// رسم الجدول
// =====================================================

function render_medication_entry_table() {

    const tbody =
        $("#medication-entry-tbody");


    const empty =
        $("#medication-entry-empty");


    if (!tbody.length) {

        return;

    }


    cleanup_medication_dropdown_portals();


    tbody.empty();


    if (
        !er_medication_entry_rows.length
    ) {

        empty.show();

        return;

    }


    empty.hide();


    er_medication_entry_rows.forEach(
        function(
            row,
            index
        ) {

            render_medication_entry_row(
                row,
                index
            );

        }
    );

}


// =====================================================
// رسم صف دواء
// =====================================================

function render_medication_entry_row(
    row,
    index
) {

    const tbody =
        $("#medication-entry-tbody");


    if (!tbody.length) {

        return;

    }


    const tr =
        $("<tr>")
            .attr(
                "data-row-id",
                row.id
            );


    // =================================================
    // الرقم
    // =================================================

    tr.append(

        $("<td>")
            .text(
                index + 1
            )

    );


    // =================================================
    // الدواء
    // =================================================

    const drugCell =
        $("<td>");


    const drugWrapper =
        $("<div>")
            .addClass(
                "er-medication-search-wrapper"
            );


    const drugInput =
        $("<input>")

            .attr(
                "type",
                "text"
            )

            .attr(
                "autocomplete",
                "off"
            )

            .attr(
                "spellcheck",
                "false"
            )

            .attr(
                "placeholder",
                "اكتب اسم الدواء أو ابحث..."
            )

            .addClass(
                "form-control er-medication-drug-search"
            )

            .val(
                row.medication_name
                ||
                row.drug
                ||
                ""
            );


    const drugSuggestions =
        $("<div>")
            .addClass(
                "er-medication-row-suggestions er-medication-row-suggestions-portal"
            );


    drugSuggestions.data(
        "anchor",
        drugInput[0]
    );


    $("body").append(
        drugSuggestions
    );


    drugWrapper.append(
        drugInput
    );


    drugCell.append(
        drugWrapper
    );


    tr.append(
        drugCell
    );


    let medicationTimer =
        null;


    function search_medication_list(
        searchValue
    ) {

        const value =
            medication_text(
                searchValue
            );


        const args = {

            doctype:
                "Medication",

            filters: {

                disabled:
                    0

            },

            fields: [

                "name",

                "generic_name",

                "dosage_form",

                "default_prescription_dosage",

                "default_prescription_duration"

            ],

            order_by:
                "name asc",

            limit_page_length:
                30

        };


        if (value) {

            args.or_filters = [

                [
                    "Medication",
                    "name",
                    "like",
                    "%" +
                    value +
                    "%"
                ],

                [
                    "Medication",
                    "generic_name",
                    "like",
                    "%" +
                    value +
                    "%"
                ]

            ];

        }


        frappe.call({

            method:
                "frappe.client.get_list",

            args:
                args,

            callback:
                function(r) {

                    if (
                        r.exc
                    ) {

                        drugSuggestions
                            .empty()
                            .hide();

                        return;

                    }


                    const medications =
                        r.message
                        ||
                        [];


                    drugSuggestions.empty();


                    if (
                        !medications.length
                    ) {

                        drugSuggestions
                            .append(

                                $("<div>")
                                    .css({

                                        padding:
                                            "10px",

                                        color:
                                            "#777",

                                        textAlign:
                                            "right"

                                    })
                                    .text(
                                        "لا توجد أدوية"
                                    )

                            );


                        show_medication_portal(
                            drugSuggestions
                        );


                        return;

                    }


                    medications.forEach(
                        function(
                            medication
                        ) {

                            const button =
                                $("<button>")

                                    .attr(
                                        "type",
                                        "button"
                                    )

                                    .addClass(
                                        "er-medication-suggestion-item"
                                    );


                            const generic =
                                medication.generic_name
                                ?
                                    " — " +
                                    medication.generic_name
                                :
                                    "";


                            button.text(

                                (
                                    medication.name
                                    ||
                                    "---"
                                )
                                +
                                generic

                            );


                            button.on(
                                "mousedown",
                                function(event) {

                                    event.preventDefault();

                                }
                            );


                            button.on(
                                "click",
                                function(event) {

                                    event.preventDefault();

                                    event.stopPropagation();


                                    row.drug =
                                        medication.name;


                                    row.medication_name =
                                        medication.name;


                                    row.medication_item =
                                        "";


                                    row.dosage_form =
                                        medication.dosage_form
                                        ||
                                        row.dosage_form
                                        ||
                                        "";


                                    row.dosage =
                                        medication.default_prescription_dosage
                                        ||
                                        row.dosage
                                        ||
                                        "";


                                    row.period =
                                        medication.default_prescription_duration
                                        ||
                                        row.period
                                        ||
                                        "";


                                    row.frequency =
                                        row.dosage;


                                    row.duration =
                                        row.period;


                                    drugInput.val(
                                        medication.name
                                    );


                                    drugSuggestions
                                        .empty()
                                        .hide();


                                    update_medication_row_controls(
                                        row
                                    );

                                }
                            );


                            drugSuggestions.append(
                                button
                            );

                        }
                    );


                    show_medication_portal(
                        drugSuggestions
                    );


                    const addNewButton =
                        $("<button>")

                            .attr(
                                "type",
                                "button"
                            )

                            .addClass(
                                "er-medication-suggestion-item"
                            )

                            .css({

                                color:
                                    "#0d6efd",

                                fontWeight:
                                    "bold"

                            })

                            .text(
                                "➕ دواء جديد"
                            );


                    addNewButton.on(
                        "mousedown",
                        function(event) {

                            event.preventDefault();

                        }
                    );


                    addNewButton.on(
                        "click",
                        function(event) {

                            event.preventDefault();

                            event.stopPropagation();


                            drugSuggestions
                                .empty()
                                .hide();


                            open_medication_create_dialog(
                                drugInput,
                                row
                            );

                        }
                    );


                    drugSuggestions.append(
                        addNewButton
                    );


                    const advancedSearchButton =
                        $("<button>")

                            .attr(
                                "type",
                                "button"
                            )

                            .addClass(
                                "er-medication-suggestion-item"
                            )

                            .css({

                                color:
                                    "#6f42c1",

                                fontWeight:
                                    "bold"

                            })

                            .text(
                                "🔍 بحث متقدم"
                            );


                    advancedSearchButton.on(
                        "mousedown",
                        function(event) {

                            event.preventDefault();

                        }
                    );


                    advancedSearchButton.on(
                        "click",
                        function(event) {

                            event.preventDefault();

                            event.stopPropagation();


                            drugSuggestions
                                .empty()
                                .hide();


                            open_medication_advanced_search_dialog(
                                drugInput,
                                row
                            );

                        }
                    );


                    drugSuggestions.append(
                        advancedSearchButton
                    );


                    show_medication_portal(
                        drugSuggestions
                    );

                },

            error:
                function() {

                    drugSuggestions
                        .empty()
                        .hide();

                }

        });

    }


    function open_medication_create_dialog(
        input,
        row
    ) {

        const dialog =
            new frappe.ui.Dialog({

                title:
                    "💊 دواء جديد",

                fields:
                    [

                        {

                            fieldtype:
                                "Data",

                            fieldname:
                                "generic_name",

                            label:
                                "الاسم العلمي",

                            reqd:
                                1

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "medication_class",

                            label:
                                "تصنيف الدواء",

                            options:
                                "Medication Class",

                            reqd:
                                1

                        },

                        {

                            fieldtype:
                                "Float",

                            fieldname:
                                "strength",

                            label:
                                "التركيز",

                            reqd:
                                1,

                            precision:
                                "2"

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "strength_uom",

                            label:
                                "وحدة التركيز",

                            options:
                                "UOM",

                            reqd:
                                1

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "dosage_form",

                            label:
                                "الشكل الدوائي",

                            options:
                                "Dosage Form"

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "default_prescription_dosage",

                            label:
                                "التكرار الافتراضي",

                            options:
                                "Prescription Dosage"

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "default_prescription_duration",

                            label:
                                "المدة الافتراضية",

                            options:
                                "Prescription Duration"

                        }

                    ],

                primary_action_label:
                    "حفظ",

                primary_action:
                    function(values) {

                        if (
                            !values.generic_name
                            ||
                            !String(
                                values.generic_name
                            ).trim()
                        ) {

                            frappe.msgprint({

                                title:
                                    "الأدوية",

                                message:
                                    "أدخل الاسم العلمي للدواء.",

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
                                        "Medication",

                                    generic_name:
                                        String(
                                            values.generic_name
                                        ).trim(),

                                    medication_class:
                                        values.medication_class
                                        ||
                                        "",

                                    strength:
                                        parseFloat(
                                            values.strength
                                        )
                                        ||
                                        0,

                                    strength_uom:
                                        values.strength_uom
                                        ||
                                        "",

                                    dosage_form:
                                        values.dosage_form
                                        ||
                                        "",

                                    default_prescription_dosage:
                                        values.default_prescription_dosage
                                        ||
                                        "",

                                    default_prescription_duration:
                                        values.default_prescription_duration
                                        ||
                                        "",

                                    disabled:
                                        0

                                }

                            },

                            freeze:
                                true,

                            freeze_message:
                                "جاري إنشاء الدواء...",

                            callback:
                                function(r) {

                                    if (
                                        r.exc
                                        ||
                                        !r.message
                                    ) {

                                        frappe.msgprint({

                                            title:
                                                "الأدوية",

                                            message:
                                                "فشل إنشاء الدواء.",

                                            indicator:
                                                "red"

                                        });


                                        return;

                                    }


                                    const doc =
                                        r.message;


                                    row.drug =
                                        doc.name;

                                    row.medication_name =
                                        doc.name;

                                    row.medication_item =
                                        "";

                                    row.dosage_form =
                                        doc.dosage_form
                                        ||
                                        row.dosage_form
                                        ||
                                        "";

                                    row.dosage =
                                        doc.default_prescription_dosage
                                        ||
                                        row.dosage
                                        ||
                                        "";

                                    row.period =
                                        doc.default_prescription_duration
                                        ||
                                        row.period
                                        ||
                                        "";

                                    row.frequency =
                                        row.dosage;

                                    row.duration =
                                        row.period;


                                    input.val(
                                        doc.name
                                    );


                                    update_medication_row_controls(
                                        row
                                    );


                                    dialog.hide();

                                }

                        });

                    }

            });


        dialog.show();

    }


    function open_medication_advanced_search_dialog(
        input,
        row
    ) {

        const dialog =
            new frappe.ui.Dialog({

                title:
                    "🔍 بحث متقدم - الأدوية",

                fields:
                    [

                        {

                            fieldtype:
                                "Data",

                            fieldname:
                                "generic_name",

                            label:
                                "الاسم العلمي"

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "medication_class",

                            label:
                                "تصنيف الدواء",

                            options:
                                "Medication Class"

                        },

                        {

                            fieldtype:
                                "Float",

                            fieldname:
                                "strength",

                            label:
                                "التركيز",

                            precision:
                                "2"

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "strength_uom",

                            label:
                                "وحدة التركيز",

                            options:
                                "UOM"

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "dosage_form",

                            label:
                                "الشكل الدوائي",

                            options:
                                "Dosage Form"

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "default_prescription_dosage",

                            label:
                                "التكرار الافتراضي",

                            options:
                                "Prescription Dosage"

                        },

                        {

                            fieldtype:
                                "Link",

                            fieldname:
                                "default_prescription_duration",

                            label:
                                "المدة الافتراضية",

                            options:
                                "Prescription Duration"

                        }

                    ],

                primary_action_label:
                    "بحث",

                primary_action:
                    function(values) {

                        perform_medication_advanced_search(
                            values,
                            row,
                            input,
                            dialog
                        );

                    }

            });


        dialog.show();

    }


    function perform_medication_advanced_search(
        criteria,
        row,
        input,
        dialog
    ) {

        const filters =
            {
                disabled:
                    0
            };


        if (
            criteria.medication_class
        ) {

            filters.medication_class =
                criteria.medication_class;

        }


        if (
            criteria.strength
        ) {

            filters.strength = [
                ">=",
                parseFloat(
                    criteria.strength
                )
            ];

        }


        if (
            criteria.strength_uom
        ) {

            filters.strength_uom =
                criteria.strength_uom;

        }


        if (
            criteria.dosage_form
        ) {

            filters.dosage_form =
                criteria.dosage_form;

        }


        if (
            criteria.default_prescription_dosage
        ) {

            filters.default_prescription_dosage =
                criteria.default_prescription_dosage;

        }


        if (
            criteria.default_prescription_duration
        ) {

            filters.default_prescription_duration =
                criteria.default_prescription_duration;

        }


        const orFilters = [];


        if (
            criteria.generic_name
        ) {

            orFilters.push([

                "Medication",

                "name",

                "like",

                "%" +
                String(
                    criteria.generic_name
                ).trim() +
                "%"

            ]);

            orFilters.push([

                "Medication",

                "generic_name",

                "like",

                "%" +
                String(
                    criteria.generic_name
                ).trim() +
                "%"

            ]);

        }


        const args = {

            doctype:
                "Medication",

            filters:
                filters,

            fields: [
                "name",
                "generic_name",
                "dosage_form",
                "default_prescription_dosage",
                "default_prescription_duration"
            ],

            order_by:
                "name asc",

            limit_page_length:
                50

        };


        if (
            orFilters.length
        ) {

            args.or_filters =
                orFilters;

        }


        frappe.call({

            method:
                "frappe.client.get_list",

            args:
                args,

            freeze:
                true,

            freeze_message:
                "جاري البحث...",

            callback:
                function(r) {

                    if (
                        r.exc
                    ) {

                        frappe.msgprint({

                            title:
                                "الأدوية",

                            message:
                                "فشل البحث.",
                            indicator:
                                "red"

                        });


                        return;

                    }


                    const results =
                        r.message
                        ||
                        [];


                    if (
                        !results.length
                    ) {

                        frappe.msgprint({

                            title:
                                "الأدوية",

                            message:
                                "لا توجد نتائج.",
                            indicator:
                                "orange"

                        });


                        return;

                    }


                    show_medication_search_results(
                        results,
                        row,
                        input,
                        dialog
                    );

                },

            error:
                function() {

                    frappe.msgprint({

                        title:
                            "الأدوية",

                        message:
                                "فشل الاتصال بالخادم.",
                        indicator:
                            "red"

                    });

                }

        });

    }


    function show_medication_search_results(
        results,
        row,
        input,
        parentDialog
    ) {

        const resultsDialog =
            new frappe.ui.Dialog({

                title:
                    "نتائج البحث - الأدوية",

                fields: [],

                primary_action_label:
                    "إغلاق",

                primary_action:
                    function() {

                        resultsDialog.hide();

                    }

            });


        const table = $(
            "<table>"
        )

            .addClass(
                "table table-bordered"
            )

            .css({
                width: "100%",
                marginTop: "8px"
            });


        const thead =
            $("<thead>");


        const headerRow =
            $("<tr>");


        [
            "اسم الدواء",
            "الاسم العلمي",
            "الشكل الدوائي",
            "التكرار",
            "المدة"
        ].forEach(function(text) {

            headerRow.append(
                $("<th>").text(
                    text
                )
            );

        });


        thead.append(
            headerRow
        );


        table.append(
            thead
        );


        const tbody =
            $("<tbody>");


        results.forEach(
            function(medication) {

                const tr =
                    $("<tr>")

                        .css({
                            cursor: "pointer"
                        })

                        .on(
                            "click",
                            function() {

                                row.drug =
                                    medication.name;

                                row.medication_name =
                                    medication.name;

                                row.medication_item =
                                    "";

                                row.dosage_form =
                                    medication.dosage_form
                                    ||
                                    row.dosage_form
                                    ||
                                    "";

                                row.dosage =
                                    medication.default_prescription_dosage
                                    ||
                                    row.dosage
                                    ||
                                    "";

                                row.period =
                                    medication.default_prescription_duration
                                    ||
                                    row.period
                                    ||
                                    "";

                                row.frequency =
                                    row.dosage;

                                row.duration =
                                    row.period;


                                input.val(
                                    medication.name
                                );


                                update_medication_row_controls(
                                    row
                                );


                                resultsDialog.hide();

                                parentDialog.hide();

                            }
                        );


                tr.append(
                    $("<td>").text(
                        medication.name ||
                        "---"
                    )
                );


                tr.append(
                    $("<td>").text(
                        medication.generic_name ||
                        "---"
                    )
                );


                tr.append(
                    $("<td>").text(
                        medication.dosage_form ||
                        "---"
                    )
                );


                tr.append(
                    $("<td>").text(
                        medication.default_prescription_dosage ||
                        "---"
                    )
                );


                tr.append(
                    $("<td>").text(
                        medication.default_prescription_duration ||
                        "---"
                    )
                );


                tbody.append(
                    tr
                );

            }
        );


        table.append(
            tbody
        );


        resultsDialog.$wrapper
            .find(
                ".modal-body"
            )
            .append(
                table
            );


        resultsDialog.show();

    }


    drugInput.on(
        "click",
        function() {

            if (
                !drugSuggestions.is(
                    ":visible"
                )
            ) {

                const value =
                    medication_text(
                        $(this).val()
                    );


                search_medication_list(
                    value
                );

            }

        }
    );


    drugInput.on(
        "input",
        function() {

            clearTimeout(
                medicationTimer
            );


            const value =
                medication_text(
                    $(this).val()
                );


            row.medication_name =
                value;


            row.drug =
                value;


            row.medication_item =
                "";


            medicationTimer =
                setTimeout(
                    function() {

                        search_medication_list(
                            value
                        );

                    },
                    150
                );

        }
    );


    drugInput.on(
        "focus",
        function() {

            const value =
                medication_text(
                    $(this).val()
                );


            search_medication_list(
                value
            );

        }
    );


    drugInput.on(
        "mouseenter",
        function() {

            if (
                !drugSuggestions.is(":visible")
            ) {

                const value =
                    medication_text(
                        $(this).val()
                    );


                search_medication_list(
                    value
                );

            }

        }
    );


    drugInput.on(
        "blur",
        function() {

            setTimeout(
                function() {

                    if (
                        !drugSuggestions.is(":hover")
                    ) {

                        drugSuggestions.hide();

                    }

                },
                250
            );

        }
    );


    // =================================================
    // الجرعة الطبية
    // =================================================

    const doseInput =
        $("<input>")

            .attr(
                "type",
                "text"
            )

            .attr(
                "placeholder",
                "مثال: 500 mg"
            )

            .addClass(
                "form-control"
            )

            .val(
                row.dose
                ||
                ""
            );


    doseInput.on(
        "input",
        function() {

            row.dose =
                $(this).val();

        }
    );


    tr.append(

        $("<td>")
            .append(
                doseInput
            )

    );


    // =================================================
    // الشكل الدوائي
    // =================================================

    const dosageFormCell =
        $("<td>");


    const dosageFormWrapper =
        $("<div>")
            .addClass(
                "er-medication-link-control"
            );


    dosageFormCell.append(
        dosageFormWrapper
    );


    tr.append(
        dosageFormCell
    );


    create_medication_link_portal({

        wrapper:
            dosageFormWrapper,

        row:
            row,

        fieldKey:
            "dosage_form",

        doctype:
            "Dosage Form",

        fields: [
            "name"
        ],

        searchFields: [
            "name"
        ],

        placeholder:
            "اختر الشكل الدوائي",

        formatResult:
            function(item) {

                return item.name;

            }

    });


    // =================================================
    // التكرار
    // =================================================

    const dosageCell =
        $("<td>");


    const dosageWrapper =
        $("<div>")
            .addClass(
                "er-medication-link-control"
            );


    dosageCell.append(
        dosageWrapper
    );


    tr.append(
        dosageCell
    );


    create_medication_link_portal({

        wrapper:
            dosageWrapper,

        row:
            row,

        fieldKey:
            "dosage",

        doctype:
            "Prescription Dosage",

        fields: [
            "name"
        ],

        searchFields: [
            "name"
        ],

        placeholder:
            "اختر التكرار",

        formatResult:
            function(item) {

                return item.name;

            },

        onSelect:
            function(
                item,
                value
            ) {

                row.frequency =
                    value;

            }

    });


    // =================================================
    // المدة
    // =================================================

    const periodCell =
        $("<td>");


    const periodWrapper =
        $("<div>")
            .addClass(
                "er-medication-link-control"
            );


    periodCell.append(
        periodWrapper
    );


    tr.append(
        periodCell
    );


    create_medication_link_portal({

        wrapper:
            periodWrapper,

        row:
            row,

        fieldKey:
            "period",

        doctype:
            "Prescription Duration",

        fields: [
            "name"
        ],

        searchFields: [
            "name"
        ],

        placeholder:
            "اختر مدة الدواء",

        formatResult:
            function(item) {

                return item.name;

            },

        onSelect:
            function(
                item,
                value
            ) {

                row.duration =
                    value;

            }

    });


    // =================================================
    // الكمية
    // =================================================

    const quantityInput =
        $("<input>")

            .attr(
                "type",
                "number"
            )

            .attr(
                "min",
                "1"
            )

            .attr(
                "step",
                "1"
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
                parseInt(
                    $(this).val(),
                    10
                )
                ||
                1;

        }
    );


    tr.append(

        $("<td>")
            .append(
                quantityInput
            )

    );


    // =================================================
    // حذف
    // =================================================

    const deleteButton =
        $("<button>")

            .attr(
                "type",
                "button"
            )

            .addClass(
                "btn btn-danger btn-sm"
            )

            .text(
                "🗑"
            );


    deleteButton.on(
        "click",
        function() {

            er_medication_entry_rows =
                er_medication_entry_rows.filter(
                    function(item) {

                        return (
                            item.id !==
                            row.id
                        );

                    }
                );


            render_medication_entry_table();

        }
    );


    // =================================================
    // تكرار الطلب
    // =================================================

    const repeatButton =
        $("<button>")

            .attr(
                "type",
                "button"
            )

            .addClass(
                "btn btn-info btn-sm"
            )

            .text(
                "🔁"
            );

    repeatButton.on(
        "click",
        function() {

            const newRow =
                {

                    id:
                        "med-" +
                        Date.now() +
                        "-" +
                        Math.random()
                            .toString(36)
                            .substring(
                                2,
                                8
                            ),

                    drug:
                        "",

                    medication_name:
                        "",

                    medication_item:
                        "",

                    dose:
                        row.dose
                        ||
                        "",

                    dosage_form:
                        row.dosage_form
                        ||
                        "",

                    dosage:
                        row.dosage
                        ||
                        "",

                    frequency:
                        row.frequency
                        ||
                        "",

                    duration:
                        row.duration
                        ||
                        "",

                    period:
                        row.period
                        ||
                        "",

                    quantity:
                        row.quantity
                        ||
                        1

                };


            er_medication_entry_rows.push(
                newRow
            );


            render_medication_entry_table();

        }
    );


    tr.append(

        $("<td>")
            .css(
                "text-align",
                "center"
            )
            .append(
                repeatButton
            )

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


// =====================================================
// تحديث حقول الصف
//
// بعد اختيار Medication لا نعيد رسم الجدول.
// =====================================================

function update_medication_row_controls(
    row
) {

    const tr =
        $(
            '#medication-entry-tbody tr[data-row-id="' +
            row.id +
            '"]'
        );


    if (
        !tr.length
    ) {

        return;

    }


    const controls =
        tr.find(
            ".er-medication-link-control"
        );


    if (
        row.dosage_form
        &&
        controls.eq(0)
            .find("input")
            .length
    ) {

        controls
            .eq(0)
            .find("input")
            .val(
                row.dosage_form
            );

    }


    if (
        row.dosage
        &&
        controls.eq(1)
            .find("input")
            .length
    ) {

        controls
            .eq(1)
            .find("input")
            .val(
                row.dosage
            );

    }


    if (
        row.period
        &&
        controls.eq(2)
            .find("input")
            .length
    ) {

        controls
            .eq(2)
            .find("input")
            .val(
                row.period
            );

    }

}


// =====================================================
// التحقق
// =====================================================

function validate_medication_entries(
    rows
) {

    if (!rows.length) {

        frappe.msgprint({

            title:
                "الأدوية",

            message:
                "أضف دواء واحدًا على الأقل.",

            indicator:
                "orange"

        });

        return false;

    }


    for (
        let index = 0;
        index < rows.length;
        index++
    ) {

        const row =
            rows[index];


        if (!row.drug) {

            frappe.msgprint({

                title:
                    "الأدوية",

                message:
                    "يجب اختيار الدواء في الصف "
                    +
                    (
                        index + 1
                    ),

                indicator:
                    "orange"

            });


            return false;

        }


        if (!row.dose) {

            frappe.msgprint({

                title:
                    "الأدوية",

                message:
                    "يجب إدخال الجرعة الطبية في الصف "
                    +
                    (
                        index + 1
                    ),

                indicator:
                    "orange"

            });


            return false;

        }


        if (!row.dosage_form) {

            frappe.msgprint({

                title:
                    "الأدوية",

                message:
                    "يجب اختيار الشكل الدوائي في الصف "
                    +
                    (
                        index + 1
                    ),

                indicator:
                    "orange"

            });


            return false;

        }


        if (!row.dosage) {

            frappe.msgprint({

                title:
                    "الأدوية",

                message:
                    "يجب اختيار التكرار في الصف "
                    +
                    (
                        index + 1
                    ),

                indicator:
                    "orange"

            });


            return false;

        }


        if (!row.period) {

            frappe.msgprint({

                title:
                    "الأدوية",

                message:
                    "يجب اختيار مدة الدواء في الصف "
                    +
                    (
                        index + 1
                    ),

                indicator:
                    "orange"

            });


            return false;

        }


        if (
            !row.quantity
            ||
            row.quantity < 1
        ) {

            frappe.msgprint({

                title:
                    "الأدوية",

                message:
                    "الكمية غير صحيحة في الصف "
                    +
                    (
                        index + 1
                    ),

                indicator:
                    "orange"

            });


            return false;

        }

    }


    return true;

}


// =====================================================
// حفظ طلبات الأدوية
//
// يستخدمه زر الحفظ الموحد.
// =====================================================

function save_er_medication_requests(
    callback
) {

    const encounter =
        get_current_encounter();


    if (!encounter) {

        frappe.msgprint({

            title:
                "الأدوية",

            message:
                "لا توجد زيارة طبية محددة.",

            indicator:
                "orange"

        });


        if (callback) {

            callback(false);

        }

        return;

    }


    const rows =
        er_medication_entry_rows.filter(
            function(row) {

                return !!row.drug;

            }
        );


    if (
        !rows.length
    ) {

        if (callback) {

            callback(true);

        }

        return;

    }


    if (
        !validate_medication_entries(
            rows
        )
    ) {

        if (callback) {

            callback(false);

        }

        return;

    }


    frappe.call({

        method:
            "custom_app.emergency_management.api.medications.create_medication_requests",

        args: {

            encounter:
                encounter,

            medications:
                JSON.stringify(

                    rows.map(
                        function(row) {

                            return {

                                drug:
                                    row.drug,

                                dose:
                                    row.dose,

                                dosage_form:
                                    row.dosage_form,

                                frequency:
                                    row.dosage
                                    ||
                                    row.frequency
                                    ||
                                    "",

                                duration:
                                    row.period
                                    ||
                                    row.duration
                                    ||
                                    "",

                                quantity:
                                    row.quantity

                            };

                        }
                    )

                )

        },

        freeze:
            true,

        freeze_message:
            "جاري إنشاء طلبات الأدوية...",

        callback:
            function(r) {

                if (
                    r.exc
                    ||
                    !r.message
                    ||
                    !r.message.success
                ) {

                    frappe.msgprint({

                        title:
                            "الأدوية",

                        message:
                            "تعذر إنشاء طلبات الأدوية.",

                        indicator:
                            "red"

                    });


                    if (callback) {

                        callback(false);

                    }

                    return;

                }


                const result =
                    r.message
                    ||
                    {};


                const count =
                    result.count
                    ||
                    0;


                frappe.show_alert({

                    message:
                        "تم إنشاء "
                        +
                        count
                        +
                        " طلب دواء بنجاح.",

                    indicator:
                        "green"

                });


                er_medication_entry_rows =
                    [];


                load_medication_requests();


                if (callback) {

                    callback(true);

                }

            },

        error:
            function() {

                if (callback) {

                    callback(false);

                }

            }

    });

}


// =====================================================
// توافق قديم
// =====================================================

function submit_medication_entries() {

    save_er_medication_requests();

}


// =====================================================
// استخراج الجرعة
// =====================================================

function get_medication_dose(
    description
) {

    if (!description) {

        return "---";

    }


    const match =
        String(
            description
        ).match(
            /الجرعة:\s*([^\n]+)/i
        );


    return match
        ?
        match[1].trim()
        :
        "---";

}


// =====================================================
// استخراج التكرار
// =====================================================

function get_medication_frequency(
    description
) {

    if (!description) {

        return "---";

    }


    const match =
        String(
            description
        ).match(
            /التكرار:\s*([^\n]+)/i
        );


    return match
        ?
        match[1].trim()
        :
        "---";

}


// =====================================================
// استخراج المدة
// =====================================================

function get_medication_duration(
    description
) {

    if (!description) {

        return "---";

    }


    const match =
        String(
            description
        ).match(
            /المدة:\s*([^\n]+)/i
        );


    return match
        ?
        match[1].trim()
        :
        "---";

}


// =====================================================
// تحميل طلبات الأدوية
// =====================================================

function load_medication_requests() {

    const encounter =
        get_current_encounter();


    const tbody =
        $("#medication-requests-body");


    const loading =
        $("#medication-requests-loading");


    const empty =
        $("#medication-requests-empty");


    if (!tbody.length) {

        return;

    }


    if (!encounter) {

        empty
            .text(
                "لا توجد زيارة طبية محددة."
            )
            .show();

        return;

    }


    loading.show();

    empty.hide();

    tbody.empty();


    frappe.call({

        method:
            "custom_app.emergency_management.api.medications.get_medication_requests",

        args: {

            encounter:
                encounter

        },

        callback:
            function(r) {

                loading.hide();


                if (r.exc) {

                    empty
                        .text(
                            "تعذر تحميل طلبات الأدوية."
                        )
                        .show();


                    render_medication_administration_section(
                        []
                    );


                    return;

                }


                const requests =
                    r.message
                    ||
                    [];


                if (!requests.length) {

                    empty
                        .text(
                            "لا توجد طلبات أدوية لهذه الزيارة."
                        )
                        .show();


                    render_medication_administration_section(
                        []
                    );


                    return;

                }


                requests.forEach(
                    function(
                        request,
                        index
                    ) {

                        render_medication_request_row(
                            request,
                            index
                        );

                    }
                );


                render_medication_administration_section(
                    requests
                );

            },

        error:
            function() {

                loading.hide();


                empty
                    .text(
                        "تعذر الاتصال بالخادم لتحميل طلبات الأدوية."
                    )
                    .show();


                render_medication_administration_section(
                    []
                );

            }

    });

}


// =====================================================
// حالة الطلب
// =====================================================

function get_medication_status_label(
    status
) {

    const map = {

        Draft:
            "مسودة",

        Active:
            "نشط",

        Completed:
            "مكتمل",

        Stopped:
            "متوقف",

        Cancelled:
            "ملغي",

        Canceled:
            "ملغي",

        "On Hold":
            "معلق",

        Replaced:
            "مستبدل",

        Pending:
            "بانتظار الإجراء"

    };


    return (
        map[status]
        ||
        status
        ||
        "---"
    );

}


// =====================================================
// Badge
// =====================================================

function create_medication_status_badge(
    status
) {

    return $("<span>")

        .addClass(
            "medication-status"
        )

        .text(
            get_medication_status_label(
                status
            )
        );

}


// =====================================================
// رسم صف الطلب
// =====================================================

function render_medication_request_row(
    request,
    index
) {

    const tbody =
        $("#medication-requests-body");


    if (!tbody.length) {

        return;

    }


    const row =
        $("<tr>");


    row.append(

        $("<td>")
            .text(
                index + 1
            )

    );


    const requestLink =
        $("<a>")

            .attr(
                "href",
                "#"
            )

            .text(
                request.name
                ||
                "---"
            );


    requestLink.on(
        "click",
        function(event) {

            event.preventDefault();


            if (
                request.name
            ) {

                frappe.set_route(
                    "Form",
                    "Medication Request",
                    request.name
                );

            }

        }
    );


    row.append(

        $("<td>")
            .append(
                requestLink
            )

    );


    row.append(

        $("<td>")
            .text(
                request.medication
                ||
                request.medication_item
                ||
                "---"
            )

    );


    row.append(

        $("<td>")
            .text(
                request.dose
                ||
                get_medication_dose(
                    request.order_description
                )
            )

    );


    row.append(

        $("<td>")
            .text(
                request.dosage_form
                ||
                "---"
            )

    );


    row.append(

        $("<td>")
            .text(
                request.frequency
                ||
                request.dosage
                ||
                get_medication_frequency(
                    request.order_description
                )
                ||
                "---"
            )

    );


    row.append(

        $("<td>")
            .text(
                request.duration
                ||
                request.period
                ||
                get_medication_duration(
                    request.order_description
                )
                ||
                "---"
            )

    );


    row.append(

        $("<td>")
            .text(
                request.quantity
                ||
                1
            )

    );


    row.append(

        $("<td>")
            .text(
                request.practitioner_name
                ||
                request.practitioner
                ||
                "---"
            )

    );


    const statusCell =
        $("<td>");


    statusCell.append(

        create_medication_status_badge(
            request.er_administration_status
            ||
            request.status
        )

    );


    row.append(
        statusCell
    );


    tbody.append(
        row
    );

}


// =====================================================
// قسم إعطاء الجرعات
// =====================================================

function render_medication_administration_section(
    requests
) {

    const container =
        $("#medication-administration-container");


    const count =
        $("#medication-administration-count");


    if (!container.length) {

        return;

    }


    container.empty();


    const pending =
        (
            requests
            ||
            []
        ).filter(
            function(request) {

                return (
                    request.er_administration_status ===
                    "Pending"
                    ||
                    !request.er_administration_status
                );

            }
        );


    const completed =
        (
            requests
            ||
            []
        ).filter(
            function(request) {

                return (
                    request.er_administration_status ===
                    "Completed"
                );

            }
        );


    count.text(
        pending.length
    );


    if (!pending.length) {

        container.append(

            $("<div>")

                .addClass(
                    "medication-administration-empty"
                )

                .text(

                    completed.length
                    ?
                    "تم تسجيل إعطاء جميع الجرعات لهذه الزيارة."
                    :
                    "لا توجد أدوية بانتظار الإعطاء."

                )

        );


        if (completed.length) {

            append_completed_medications(
                container,
                completed
            );

        }


        return;

    }


    pending.forEach(
        function(request) {

            append_pending_medication_card(
                container,
                request
            );

        }
    );


    if (completed.length) {

        append_completed_medications(
            container,
            completed
        );

    }

}


// =====================================================
// بطاقة دواء بانتظار الإعطاء
// =====================================================

function append_pending_medication_card(
    container,
    request
) {

    const card =
        $("<div>")

            .addClass(
                "medication-administration-card pending-card"
            )

            .attr(
                "data-request-name",
                request.name
            );


    const header =
        $("<div>")
            .addClass(
                "medication-administration-header"
            );


    header.append(

        $("<div>")
            .addClass(
                "medication-administration-name"
            )
            .text(
                request.medication
                ||
                request.medication_item
                ||
                "---"
            )

    );


    card.append(
        header
    );


    const details =
        $("<div>")
            .addClass(
                "medication-administration-details"
            );


    append_administration_detail(
        details,
        "الجرعة",
        request.dose
        ||
        get_medication_dose(
            request.order_description
        )
    );


    append_administration_detail(
        details,
        "الشكل",
        request.dosage_form
        ||
        "---"
    );


    append_administration_detail(
        details,
        "التكرار",
        request.frequency
        ||
        request.dosage
        ||
        get_medication_frequency(
            request.order_description
        )
        ||
        "---"
    );


    append_administration_detail(
        details,
        "المدة",
        request.duration
        ||
        request.period
        ||
        get_medication_duration(
            request.order_description
        )
        ||
        "---"
    );


    append_administration_detail(
        details,
        "الكمية",
        request.quantity
        ||
        1
    );


    append_administration_detail(
        details,
        "رقم الطلب",
        request.name
        ||
        "---"
    );


    card.append(
        details
    );


    const button =
        $("<button>")

            .attr(
                "type",
                "button"
            )

            .attr(
                "data-request-name",
                request.name
            )

            .addClass(
                "btn btn-success medication-administer-btn"
            )

            .text(
                "💉 تسجيل إعطاء الجرعة"
            );


    card.append(

        $("<div>")
            .addClass(
                "medication-administration-actions"
            )
            .append(
                button
            )

    );


    container.append(
        card
    );

}


// =====================================================
// تفاصيل الإعطاء
// =====================================================

function append_administration_detail(
    container,
    label,
    value
) {

    const item =
        $("<div>")
            .addClass(
                "medication-administration-detail"
            );


    item.append(

        $("<span>")
            .addClass(
                "detail-label"
            )
            .text(
                label
            )

    );


    item.append(

        $("<strong>")
            .addClass(
                "detail-value"
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
// الجرعات المكتملة
// =====================================================

function append_completed_medications(
    container,
    requests
) {

    container.append(

        $("<div>")
            .addClass(
                "medication-administration-completed-title"
            )
            .text(
                "✓ الجرعات التي تم تسجيلها"
            )

    );


    requests.forEach(
        function(request) {

            const card =
                $("<div>")
                    .addClass(
                        "medication-administration-card completed-card"
                    );


            const header =
                $("<div>")
                    .addClass(
                        "medication-administration-header"
                    );


            header.append(

                $("<div>")
                    .addClass(
                        "medication-administration-name"
                    )
                    .text(
                        request.medication
                        ||
                        request.medication_item
                        ||
                        "---"
                    )

            );


            card.append(
                header
            );


            const details =
                $("<div>")
                    .addClass(
                        "medication-administration-details"
                    );


            append_administration_detail(
                details,
                "الجرعة",
                request.dose
                ||
                get_medication_dose(
                    request.order_description
                )
            );


            append_administration_detail(
                details,
                "وقت الإعطاء",
                format_medication_datetime(
                    request.er_administered_on
                )
            );


            append_administration_detail(
                details,
                "تم بواسطة",
                request.er_administered_by
                ||
                "---"
            );


            if (
                request.er_administration_notes
            ) {

                append_administration_detail(
                    details,
                    "ملاحظات",
                    request.er_administration_notes
                );

            }


            card.append(
                details
            );


            container.append(
                card
            );

        }
    );

}


// =====================================================
// تسجيل إعطاء الجرعة فقط
// =====================================================

function administer_medication(
    request_name,
    on_success
) {

    const encounter =
        get_current_encounter();


    if (
        !encounter
        ||
        !request_name
    ) {

        frappe.msgprint({

            title:
                "الأدوية",

            message:
                "لا توجد زيارة أو طلب دواء محدد.",

            indicator:
                "orange"

        });

        return;

    }


    frappe.confirm(

        "هل تم إعطاء الجرعة للمريض بالفعل؟",

        function() {

            const button =
                $(
                    '.medication-administer-btn[data-request-name="' +
                    request_name +
                    '"]'
                );


            button
                .prop(
                    "disabled",
                    true
                )
                .text(
                    "⏳ جاري التسجيل..."
                );


            frappe.call({

                method:
                    "custom_app.emergency_management.api.medications.record_medication_administration",

                args: {

                    medication_request:
                        request_name,

                    encounter:
                        encounter

                },

                freeze:
                    true,

                freeze_message:
                    "جاري تسجيل إعطاء الجرعة...",

                callback:
                    function(r) {

                        if (
                            r.exc
                        ) {

                            frappe.msgprint({

                                title:
                                    "خطأ",

                                message:
                                    "تعذر تسجيل إعطاء الدواء.",

                                indicator:
                                    "red"

                            });

                            return;

                        }


                        frappe.msgprint({

                            title:
                                "تم التسجيل",

                            message:
                                "تم تسجيل إعطاء الجرعة بنجاح.",

                            indicator:
                                "green"

                        });


                        load_medication_requests();

                        if (
                            typeof on_success ===
                            "function"
                        ) {
                            on_success(
                                r.message
                            );
                        }

                    },

                error:
                    function() {

                    },

                always:
                    function() {

                        button
                            .prop(
                                "disabled",
                                false
                            )
                            .text(
                                "💉 تسجيل إعطاء الجرعة"
                            );

                    }

            });

        }

    );

}


// =====================================================
// التاريخ
// =====================================================

function format_medication_datetime(
    value
) {

    if (!value) {

        return "---";

    }


    try {

        return frappe.datetime.str_to_user(
            value
        );

    }

    catch (error) {

        return value;

    }

}


// =====================================================
// الأحداث
// =====================================================

$(document).off(
    "click.erMedications",
    "#add-medication-entry-row"
);


$(document).on(
    "click.erMedications",
    "#add-medication-entry-row",
    function() {

        add_medication_entry_row();

    }
);

$(document).off(
    "click.erMedications",
    "#add-medication-entry-row-inline"
);

$(document).on(
    "click.erMedications",
    "#add-medication-entry-row-inline",
    function() {

        add_medication_entry_row();

    }
);


$(document).off(
    "click.erMedications",
    "#refresh-medication-requests"
);


$(document).on(
    "click.erMedications",
    "#refresh-medication-requests",
    function() {

        load_medication_requests();

    }
);


$(document).off(
    "click.erMedications",
    ".medication-administer-btn"
);


$(document).on(
    "click.erMedications",
    ".medication-administer-btn",
    function() {

        const request_name =
            $(this).attr(
                "data-request-name"
            );


        administer_medication(
            request_name
        );

    }
);


// =====================================================
// الحفظ الموحد
// =====================================================

window.save_er_medication_requests =
    save_er_medication_requests;


// =====================================================
// إغلاق القوائم عند النقر خارجها
// =====================================================

$(document).off(
    "click.erMedicationsOutside"
);


$(document).on(
    "click.erMedicationsOutside",
    function(event) {

        if (
            !$(event.target)
                .closest(
                    [
                        ".er-medication-search-wrapper",
                        ".er-medication-row-suggestions-portal",
                        ".er-medication-link-control",
                        ".er-medication-link-suggestions-portal"
                    ].join(",")
                )
                .length
        ) {

            $(
                ".er-medication-row-suggestions-portal, " +
                ".er-medication-link-suggestions-portal"
            )
                .hide();

        }

    }
);


/* ER MEDICATION BUTTONS — REAL SAVE */

$(document).off(
    "click.erMedicationsRealSave",
    "#save-medication-entry-rows"
);

$(document).on(
    "click.erMedicationsRealSave",
    "#save-medication-entry-rows",
    function(event) {

        event.preventDefault();
        event.stopPropagation();

        const button = $(this);

        if (button.prop("disabled")) {
            return;
        }

        button
            .prop("disabled", true)
            .text("⏳ جاري الحفظ...");

        save_er_medication_requests(
            function(success) {

                button
                    .prop("disabled", false)
                    .text("💾 حفظ طلب الدواء");

                if (success) {
                    $("#medication-entry-tbody").empty();
                    add_medication_entry_row();
                }

            }
        );

    }
);


/* ER MEDICATION WINDOW REFRESH — REAL */

$(document).off(
    "click.erMedicationsWindowRefresh",
    "#refresh-medication-window"
);

$(document).on(
    "click.erMedicationsWindowRefresh",
    "#refresh-medication-window",
    function(event) {

        event.preventDefault();
        event.stopPropagation();

        const button = $(this);

        if (button.prop("disabled")) {
            return;
        }

        button
            .prop("disabled", true)
            .text("⏳ جاري التحديث...");

        if (typeof load_medications_section === "function") {
            load_medications_section();
        }

        setTimeout(function() {
            $("#refresh-medication-window")
                .prop("disabled", false)
                .text("🔄 تحديث");
        }, 800);

    }
);
