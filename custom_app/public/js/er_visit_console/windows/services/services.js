// =========================================================
// ER SERVICE REQUESTS
// خدمات الطوارئ
//
// الملف الفعلي:
// apps/custom_app/custom_app/public/js/er_visit_console/services.js
//
// الخدمات هنا:
// 1. تحويل داخلي
// 2. تحويل خارجي
// 3. استشارة
// 4. ملاحظة طوارئ
//
// الأدوية / المختبر / الأشعة لها نوافذ مستقلة.
//
// مهم:
// - التحويل الداخلي يرسل بيانات ER Admission Request إلى Python.
// - الاستشارة تستخدم Healthcare Practitioner.
// - لا يتم إنشاء طلبات الأدوية من هنا.
// - لا يتم إنشاء صف تلقائي عند فتح النافذة.
// - الجدول السفلي موحد لطلبات الزيارة.
// =========================================================

"use strict";


// =========================================================
// البيانات الحالية
// =========================================================

let er_service_rows = [];


// =========================================================
// بيانات الزيارة
// =========================================================

let er_service_context = {

    encounter: null,

    patient: null,

    patient_name: null,

    practitioner: null,

    practitioner_name: null,

    er_patient_intake: null,

    bed: null

};


// =========================================================
// ذاكرة القوائم
// =========================================================

let er_service_lookup_cache = {

    departments: [],

    service_unit_types: []

};


// =========================================================
// أنواع الخدمات
// =========================================================

const ER_SERVICE_TYPES = [

    {
        value: "Admission",

        api_value: "Transfer",

        label: "🏥 ملاحظة طوارئ"
    },

    {
        value: "Transfer_Internal",

        api_value: "Transfer",

        label: "🚑 تحويل داخلي"
    },

    {
        value: "Transfer_External",

        api_value: "Transfer",

        label: "🚑 تحويل خارجي"
    },

    {
        value: "Discharge",

        api_value: "Discharge",

        label: "🏠 خروج"
    },

    {
        value: "Consultation",

        api_value: "Consultation",

        label: "👨‍⚕️ استشارة"
    }

];


// =========================================================
// الأولويات
// =========================================================

const ER_SERVICE_PRIORITIES = [

    {
        value: "Normal",

        label: "عادي"
    },

    {
        value: "Urgent",

        label: "عاجل"
    },

    {
        value: "STAT",

        label: "فوري STAT"
    }

];


// =========================================================
// حالات الطلب
// =========================================================

const ER_SERVICE_STATUS_LABELS = {

    Pending:
        "بانتظار التنفيذ",

    "Pending Approval":
        "بانتظار الموافقة",

    Approved:
        "تمت الموافقة",

    "In Progress":
        "قيد التنفيذ",

    Completed:
        "مكتمل",

    Cancelled:
        "ملغي",

    Rejected:
        "مرفوض"

};


// =========================================================
// أسماء أنواع الطلبات
// =========================================================

function get_er_service_type_label(value) {

    const labels = {

        Laboratory:
            "🧪 المختبر",

        Radiology:
            "🩻 الأشعة",

        Medication:
            "💊 دواء",

        Consultation:
            "👨‍⚕️ استشارة",

        Admission:
            "🏥 ملاحظة طوارئ",

        Transfer:
            "🚑 تحويل",

        Transfer_Internal:
            "🚑 تحويل داخلي",

        Transfer_External:
            "🚑 تحويل خارجي",

        Discharge:
            "🏠 خروج"

    };


    return labels[value]
        || value
        || "---";

}


// =========================================================
// أسماء الأولويات
// =========================================================

function get_er_service_priority_label(value) {

    const item =
        ER_SERVICE_PRIORITIES.find(
            function(row) {

                return row.value === value;

            }
        );


    return item
        ? item.label
        : (value || "---");

}


// =========================================================
// أسماء الحالات
// =========================================================

function get_er_service_status_label(value) {

    return ER_SERVICE_STATUS_LABELS[value]
        || value
        || "---";

}


// =========================================================
// الحصول على الزيارة الحالية
// =========================================================

function get_current_er_encounter() {

    if (
        typeof current_encounter !== "undefined"
        &&
        current_encounter
    ) {

        return current_encounter;

    }


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


    return null;

}


// =========================================================
// تحميل بيانات الزيارة
// =========================================================

function load_er_service_context(callback) {

    const encounter =
        get_current_er_encounter();


    if (!encounter) {

        frappe.msgprint({

            title:
                "الخدمات",

            message:
                "لم يتم فتح زيارة طوارئ محددة. افتح الزيارة أولًا ثم ادخل إلى تبويب الخدمات.",

            indicator:
                "orange"

        });

        return;

    }


    er_service_context.encounter =
        encounter;


    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_encounter_details",

        args: {

            encounter:
                encounter

        },

        callback:
            function(r) {

                const data =
                    r.message || {};

                const patient =
                    data.patient || {};


                er_service_context.patient =
                    patient.name
                    ||
                    data.patient
                    ||
                    null;


                er_service_context.patient_name =
                    patient.patient_name
                    ||
                    data.patient_name
                    ||
                    null;


                er_service_context.practitioner =
                    data.practitioner
                    ||
                    null;


                er_service_context.practitioner_name =
                    data.practitioner_name
                    ||
                    null;


                er_service_context.er_patient_intake =
                    data.er_patient_intake
                    ||
                    null;


                er_service_context.bed =
                    data.bed
                    ||
                    null;


                if (callback) {

                    callback();

                }

            },

        error:
            function() {

                frappe.msgprint({

                    title:
                        "الخدمات",

                    message:
                        "تعذر تحميل بيانات الزيارة الحالية.",

                    indicator:
                        "red"

                });

            }

    });

}


// =========================================================
// تحميل الأقسام
// =========================================================

function load_er_service_departments(callback) {

    frappe.call({

        method:
            "frappe.client.get_list",

        args: {

            doctype:
                "Medical Department",

            fields: [

                "name",

                "department",

                "patient_care_type"

            ],

            order_by:
                "department asc",

            limit_page_length:
                0

        },

        callback:
            function(r) {

                er_service_lookup_cache.departments =
                    r.message || [];


                if (callback) {

                    callback(
                        er_service_lookup_cache.departments
                    );

                }

            },

        error:
            function() {

                er_service_lookup_cache.departments =
                    [];


                if (callback) {

                    callback([]);

                }

            }

    });

}


// =========================================================
// تحميل أنواع وحدات الرقود
// =========================================================

function load_er_service_unit_types(callback) {

    frappe.call({

        method:
            "frappe.client.get_list",

        args: {

            doctype:
                "Healthcare Service Unit Type",

            filters: {

                disabled:
                    0

            },

            fields: [

                "name",

                "service_unit_type",

                "inpatient_occupancy"

            ],

            order_by:
                "service_unit_type asc",

            limit_page_length:
                0

        },

        callback:
            function(r) {

                er_service_lookup_cache.service_unit_types =
                    r.message || [];


                if (callback) {

                    callback(
                        er_service_lookup_cache.service_unit_types
                    );

                }

            },

        error:
            function() {

                er_service_lookup_cache.service_unit_types =
                    [];


                if (callback) {

                    callback([]);

                }

            }

    });

}


// =========================================================
// تحميل الخدمات حسب نوع الطلب
// =========================================================

function load_er_service_items(
    request_type,
    callback
) {

    if (!request_type) {

        if (callback) {

            callback([]);

        }

        return;

    }


    frappe.call({

        method:
            "custom_app.emergency_management.api.service_requests.get_service_items",

        args: {

            request_type:
                request_type

        },

        callback:
            function(r) {

                const items =
                    r.message || [];


                if (callback) {

                    callback(
                        items
                    );

                }

            },

        error:
            function() {

                if (callback) {

                    callback([]);

                }

            }

    });

}


// =========================================================
// واجهة الخدمات
// =========================================================

function load_services_section() {

    er_service_rows = [];


    er_service_lookup_cache = {

        departments: [],

        service_unit_types: []

    };


    $("#er-content").html(`

        <div
            class="er-services-section"
            style="
                width:100%;
                box-sizing:border-box;
                direction:rtl;
            "
        >

            <div
                class="section-card"
                style="
                    width:100%;
                    box-sizing:border-box;
                    margin-bottom:15px;
                "
            >

                <div
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        gap:10px;
                        flex-wrap:wrap;
                    "
                >

                    <h3 style="margin:0;">
                        🛎 الخدمات
                    </h3>


                    <button
                        type="button"
                        class="btn btn-success btn-sm"
                        id="add-er-service-row"
                    >
                        ➕ إضافة خدمة
                    </button>

                </div>


                <div
                    id="er-service-entry-empty"
                    class="alert alert-info"
                    style="
                        margin-top:15px;
                        margin-bottom:0;
                    "
                >
                    اضغط «إضافة خدمة» لإضافة طلب جديد.
                </div>


                <div
                    id="er-service-entry-container"
                    style="
                        width:100%;
                        margin-top:15px;
                    "
                ></div>

            </div>


            <div
                class="section-card"
                style="
                    width:100%;
                    box-sizing:border-box;
                "
            >

                <div
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        gap:10px;
                        flex-wrap:wrap;
                        cursor: pointer;
                        user-select: none;
                    "
                    onclick="toggle_er_section('er-service-requests-content')"
                >

                    <h3 style="margin:0;">
                        📋 جميع طلبات الزيارة
                    </h3>


                    <button
                        type="button"
                        class="er-collapse-toggle"
                        id="er-service-requests-toggle"
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
                    id="er-service-requests-content"
                    class="er-collapsible-content"
                >


                <div
                    id="er-service-loading"
                    class="alert alert-info"
                    style="
                        display:none;
                        margin-top:15px;
                    "
                >
                    ⏳ جاري تحميل جميع الطلبات...
                </div>


                <div
                    id="er-service-empty"
                    class="alert alert-secondary"
                    style="
                        display:none;
                        margin-top:15px;
                    "
                ></div>


                <div
                    style="
                        width:100%;
                        overflow-x:auto;
                        margin-top:15px;
                    "
                >

                    <table
                        class="table table-bordered"
                        style="
                            width:100%;
                            margin-bottom:0;
                        "
                    >

                        <thead>

                            <tr>

                                <th style="width:170px;">
                                    رقم الطلب
                                </th>

                                <th>
                                    النوع
                                </th>

                                <th>
                                    الأولوية
                                </th>

                                <th>
                                    التفاصيل
                                </th>

                                <th>
                                    الطبيب
                                </th>

                                <th>
                                    التاريخ
                                </th>

                                <th>
                                    الحالة
                                </th>

                            </tr>

                        </thead>


                        <tbody
                            id="er-service-requests-body"
                        ></tbody>

                    </table>

                </div>

            </div>

        </div>

        <div id="er_services_activity" style="margin-top: 24px;"></div>

    `);

    render_activity_timeline("er_services_activity", "services");

    load_er_service_context(
        function() {

            load_er_service_departments();

            load_er_service_unit_types();

            load_er_service_requests();

        }
    );

}


// =========================================================
// إضافة خدمة
// =========================================================

function add_er_service_row() {

    const row = {

        id:
            "service-"
            +
            Date.now()
            +
            "-"
            +
            Math.random()
                .toString(36)
                .substring(2, 8),

        request_type:
            "",

        priority:
            "Normal",

        details:
            {},

        service_item:
            null,

        notes:
            ""

    };


    er_service_rows.push(
        row
    );


    render_er_service_rows();

}


// =========================================================
// رسم جميع الصفوف
// =========================================================

function render_er_service_rows() {

    const container =
        $("#er-service-entry-container");


    const empty =
        $("#er-service-entry-empty");


    if (!container.length) {

        return;

    }


    container.empty();


    if (!er_service_rows.length) {

        empty.show();

        return;

    }


    empty.hide();


    er_service_rows.forEach(
        function(row, index) {

            render_er_service_row(
                row,
                index,
                container
            );

        }
    );

}


// =========================================================
// رسم صف واحد
// =========================================================

function render_er_service_row(
    row,
    index,
    container
) {

    const card =
        $("<div>")

            .addClass(
                "er-service-request-card"
            )

            .attr(
                "data-row-id",
                row.id
            )

            .css({

                border:
                    "1px solid #d9d9d9",

                borderRadius:
                    "8px",

                padding:
                    "15px",

                marginBottom:
                    "12px",

                background:
                    "#fff"

            });


    const header =
        $("<div>")

            .css({

                display:
                    "flex",

                alignItems:
                    "center",

                justifyContent:
                    "space-between",

                gap:
                    "10px",

                flexWrap:
                    "wrap",

                marginBottom:
                    "12px"

            });


    header.append(

        $("<strong>")
            .text(
                "طلب خدمة جديد #"
                +
                (index + 1)
            )

    );


    header.append(

        $("<button>")

            .attr(
                "type",
                "button"
            )

            .addClass(
                "btn btn-danger btn-sm"
            )

            .text(
                "🗑 حذف"
            )

            .on(
                "click",
                function() {

                    er_service_rows =
                        er_service_rows.filter(
                            function(item) {

                                return item.id !== row.id;

                            }
                        );


                    render_er_service_rows();

                }
            )

    );


    card.append(
        header
    );


    // =====================================================
    // النوع + الأولوية
    // =====================================================

    const topRow =
        $("<div>")
            .css({

                display:
                    "grid",

                gridTemplateColumns:
                    "repeat(2,minmax(0,1fr))",

                gap:
                    "12px",

                marginBottom:
                    "12px"

            });


    // -----------------------------------------------------
    // نوع الخدمة
    // -----------------------------------------------------

    const typeField =
        $("<div>");


    typeField.append(

        $("<label>")
            .text(
                "نوع الخدمة"
            )

    );


    const typeSelect =
        $("<select>")
            .addClass(
                "form-control"
            );


    typeSelect.append(

        $("<option>")
            .val("")
            .text(
                "اختر نوع الخدمة"
            )

    );


    ER_SERVICE_TYPES.forEach(
        function(service) {

            typeSelect.append(

                $("<option>")

                    .val(
                        service.value
                    )

                    .text(
                        service.label
                    )

            );

        }
    );


    typeSelect.val(
        row.request_type
    );


    typeSelect.on(
        "change",
        function() {

            row.request_type =
                $(this).val();

            row.details =
                {};

            row.service_item =
                null;

            row.notes =
                "";

            render_er_service_rows();

        }
    );


    typeField.append(
        typeSelect
    );


    topRow.append(
        typeField
    );


    // -----------------------------------------------------
    // الأولوية
    // -----------------------------------------------------

    const priorityField =
        $("<div>");


    priorityField.append(

        $("<label>")
            .text(
                "الأولوية"
            )

    );


    const prioritySelect =
        $("<select>")
            .addClass(
                "form-control"
            );


    ER_SERVICE_PRIORITIES.forEach(
        function(priority) {

            prioritySelect.append(

                $("<option>")

                    .val(
                        priority.value
                    )

                    .text(
                        priority.label
                    )

            );

        }
    );


    prioritySelect.val(
        row.priority
        ||
        "Normal"
    );


    prioritySelect.on(
        "change",
        function() {

            row.priority =
                $(this).val();

        }
    );


    priorityField.append(
        prioritySelect
    );


    topRow.append(
        priorityField
    );


    // =====================================================
    // الخدمة المطلوبة
    // =====================================================

    const serviceItemField =
        $("<div>");


    serviceItemField.append(

        $("<label>")

            .text(
                "الخدمة المطلوبة"
            )

    );


    const serviceItemSelect =
        $("<select>")
            .addClass(
                "form-control"
            );


    serviceItemSelect.append(

        $("<option>")
            .val("")
            .text(
                "جاري تحميل الخدمات..."
            )

    );


    serviceItemSelect.prop(
        "disabled",
        true
    );


    if (row.request_type === "Discharge") {

        serviceItemSelect.append(

            $("<option>")
                .val("")
                .text(
                    "غير مطبق للخروج"
                )

        );

        serviceItemSelect.prop(
            "disabled",
            true
        );

        serviceItemSelect.val("");

        row.service_item =
            null;

    } else {

        load_er_service_items(
            row.request_type,
            function(items) {

                serviceItemSelect.empty();

                serviceItemSelect.append(

                    $("<option>")
                        .val("")
                        .text(
                            items.length
                                ?
                                "اختر الخدمة"
                                :
                                "لا توجد خدمات متاحة"
                        )

                );


                if (items.length) {

                    items.forEach(
                        function(item) {

                            serviceItemSelect.append(

                                $("<option>")

                                    .val(
                                        item.value
                                    )

                                    .text(
                                        item.label
                                    )

                            );

                        }
                    );


                    serviceItemSelect.prop(
                        "disabled",
                        false
                    );


                    serviceItemSelect.val(
                        row.service_item
                        ||
                        ""
                    );

                } else {

                    serviceItemSelect.prop(
                        "disabled",
                        true
                    );

                }

            }
        );

    }


    serviceItemSelect.on(
        "change",
        function() {

            row.service_item =
                $(this).val()
                ||
                null;

        }
    );


    serviceItemField.append(
        serviceItemSelect
    );


    topRow.append(
        serviceItemField
    );


    card.append(
        topRow
    );


    // =====================================================
    // الحقول الخاصة بالخدمة
    // =====================================================

    const dynamicFields =
        $("<div>")
            .addClass(
                "er-service-dynamic-fields"
            )
            .css({

                display:
                    "grid",

                gridTemplateColumns:
                    "repeat(2,minmax(0,1fr))",

                gap:
                    "12px",

                marginBottom:
                    "12px"

            });


    build_service_specific_fields(
        row,
        dynamicFields
    );


    card.append(
        dynamicFields
    );


    // =====================================================
    // الملاحظات العامة
    // =====================================================

    const notesField =
        $("<div>");


    notesField.append(

        $("<label>")
            .text(
                "ملاحظات إضافية"
            )

    );


    const notes =
        $("<textarea>")

            .addClass(
                "form-control"
            )

            .attr(
                "rows",
                "2"
            )

            .attr(
                "placeholder",
                "ملاحظات إضافية"
            )

            .val(
                row.notes
                ||
                ""
            )

            .on(
                "input",
                function() {

                    row.notes =
                        $(this).val();

                }
            );


    notesField.append(
        notes
    );


    card.append(
        notesField
    );


    container.append(
        card
    );

}


// =========================================================
// حقل نص
// =========================================================

function add_text_field(
    parent,
    label,
    key,
    row,
    placeholder
) {

    const field =
        $("<div>");


    field.append(

        $("<label>")
            .text(
                label
            )

    );


    const input =
        $("<input>")

            .attr(
                "type",
                "text"
            )

            .addClass(
                "form-control"
            )

            .attr(
                "placeholder",
                placeholder
                ||
                ""
            )

            .val(
                row.details[key]
                ||
                ""
            )

            .on(
                "input",
                function() {

                    row.details[key] =
                        $(this).val();

                }
            );


    field.append(
        input
    );


    parent.append(
        field
    );

}


// =========================================================
// حقل textarea
// =========================================================

function add_textarea_field(
    parent,
    label,
    key,
    row,
    placeholder
) {

    const field =
        $("<div>");


    field.append(

        $("<label>")
            .text(
                label
            )

    );


    const textarea =
        $("<textarea>")

            .addClass(
                "form-control"
            )

            .attr(
                "rows",
                "2"
            )

            .attr(
                "placeholder",
                placeholder
                ||
                ""
            )

            .val(
                row.details[key]
                ||
                ""
            )

            .on(
                "input",
                function() {

                    row.details[key] =
                        $(this).val();

                }
            );


    field.append(
        textarea
    );


    parent.append(
        field
    );

}


// =========================================================
// حقل Select
// =========================================================

function add_select_field(
    parent,
    label,
    key,
    row,
    options,
    placeholder
) {

    const field =
        $("<div>");


    field.append(

        $("<label>")
            .text(
                label
            )

    );


    const select =
        $("<select>")
            .addClass(
                "form-control"
            );


    select.append(

        $("<option>")
            .val("")
            .text(
                placeholder
                ||
                "اختر"
            )

    );


    (options || []).forEach(
        function(option) {

            select.append(

                $("<option>")

                    .val(
                        option.value
                    )

                    .text(
                        option.label
                    )

            );

        }
    );


    select.val(
        row.details[key]
        ||
        ""
    );


    select.on(
        "change",
        function() {

            row.details[key] =
                $(this).val();

        }
    );


    field.append(
        select
    );


    parent.append(
        field
    );


    return select;

}


// =========================================================
// حقل الطبيب
//
// مرتبط مباشرة بـ:
// Healthcare Practitioner
//
// نستخدم frappe.ui.form.make_control
// للحصول على Link Autocomplete من النظام.
// =========================================================

function add_practitioner_link_field(
    parent,
    row
) {

    const field =
        $("<div>");


    field.append(

        $("<label>")
            .text(
                "الطبيب المطلوب"
            )

    );


    const wrapper =
        $("<div>")
            .addClass(
                "er-service-practitioner-control"
            );


    field.append(
        wrapper
    );


    parent.append(
        field
    );


    const control =
        frappe.ui.form.make_control({

            parent:
                wrapper[0],

            df: {

                fieldname:
                    "referred_to_" +
                    row.id,

                fieldtype:
                    "Link",

                label:
                    "الطبيب المطلوب",

                options:
                    "Healthcare Practitioner",

                placeholder:
                    "ابحث عن الطبيب"

            },

            render_input:
                true

        });


    control.refresh();


    if (
        row.details.referred_to
    ) {

        control.set_value(
            row.details.referred_to
        );

    }


    control.$input.on(
        "change",
        function() {

            row.details.referred_to =
                control.get_value()
                ||
                "";

        }
    );


    return control;

}


// =========================================================
// قائمة الأقسام
// =========================================================

function add_department_field(
    parent,
    row
) {

    const options =
        er_service_lookup_cache
            .departments
            .map(
                function(item) {

                    return {

                        value:
                            item.name,

                        label:
                            item.department
                            ||
                            item.name

                    };

                }
            );


    add_select_field(

        parent,

        "القسم المطلوب",

        "requested_department",

        row,

        options,

        options.length
        ?
        "اختر القسم"
        :
        "لا توجد أقسام متاحة"

    );

}


// =========================================================
// نوع وحدة الرقود
// =========================================================

function add_service_unit_type_field(
    parent,
    row
) {

    const options =
        er_service_lookup_cache
            .service_unit_types
            .map(
                function(item) {

                    return {

                        value:
                            item.name,

                        label:
                            item.service_unit_type
                            ||
                            item.name

                    };

                }
            );


    add_select_field(

        parent,

        "نوع وحدة الرقود",

        "requested_service_unit_type",

        row,

        options,

        options.length
        ?
        "اختر نوع الوحدة"
        :
        "لا توجد وحدات رقود متاحة"

    );

}


// =========================================================
// الحقول الخاصة بالخدمات
// =========================================================

function build_service_specific_fields(
    row,
    parent
) {

    switch (row.request_type) {

        // =================================================
        // ملاحظة طوارئ
        // =================================================

        case "Admission":

            add_department_field(
                parent,
                row
            );


            add_service_unit_type_field(
                parent,
                row
            );


            add_text_field(
                parent,
                "سبب الرقود",
                "reason",
                row,
                "سبب طلب الملاحظة طوارئ"
            );


            add_text_field(
                parent,
                "مدة الرقود المتوقعة (أيام)",
                "expected_length_of_stay",
                row,
                "مثال: 3"
            );

            break;


        // =================================================
        // التحويل الداخلي
        // =================================================

        case "Transfer_Internal":

            add_department_field(
                parent,
                row
            );


            add_service_unit_type_field(
                parent,
                row
            );


            add_text_field(
                parent,
                "سبب الرقود",
                "reason",
                row,
                "سبب طلب التحويل والملاحظة طوارئ"
            );


            add_text_field(
                parent,
                "مدة الرقود المتوقعة (أيام)",
                "expected_length_of_stay",
                row,
                "مثال: 3"
            );

            break;


        // =================================================
        // التحويل الخارجي
        // =================================================

        case "Transfer_External":

            add_text_field(
                parent,
                "الجهة المحول إليها",
                "destination",
                row,
                "اسم المستشفى أو المنشأة الصحية"
            );


            add_text_field(
                parent,
                "سبب التحويل",
                "reason",
                row,
                "سبب الحاجة للتحويل الخارجي"
            );


            add_textarea_field(
                parent,
                "معلومات إضافية",
                "instructions",
                row,
                "المعلومات الطبية المهمة عند التحويل"
            );

            break;


        // =================================================
        // الاستشارة
        // =================================================

        case "Consultation":

            add_text_field(
                parent,
                "التخصص المطلوب",
                "specialty",
                row,
                "مثال: جراحة عامة / قلبية / باطنية"
            );


            add_practitioner_link_field(
                parent,
                row
            );


            add_textarea_field(
                parent,
                "سبب الاستشارة",
                "reason",
                row,
                "سبب طلب الاستشارة"
            );

            break;


        case "Discharge":

            add_textarea_field(
                parent,
                "ملاحظات الخروج",
                "notes",
                row,
                "ملاحظات أو تعليمات عند الإخلاء"
            );

            break;


        default:

            break;

    }

}


// =========================================================
// التحقق من البيانات
// =========================================================

function validate_er_service_rows() {

    if (!er_service_rows.length) {

        return true;

    }


    for (
        let index = 0;
        index < er_service_rows.length;
        index++
    ) {

        const row =
            er_service_rows[index];


        if (!row.request_type) {

            frappe.msgprint({

                title:
                    "بيانات الخدمة",

                message:
                    "يجب اختيار نوع الخدمة في الطلب رقم "
                    +
                    (index + 1)
                    +
                    ".",

                indicator:
                    "orange"

            });


            return false;

        }


        // =================================================
        // ملاحظة طوارئ
        // =================================================

        if (
            row.request_type ===
            "Admission"
        ) {

            if (
                !row.details.requested_department
            ) {

                frappe.msgprint({

                    title:
                        "الملاحظة طوارئ",

                    message:
                        "يجب اختيار القسم المطلوب.",

                    indicator:
                        "orange"

                });


                return false;

            }


            if (
                !row.details.reason
            ) {

                frappe.msgprint({

                    title:
                        "الملاحظة طوارئ",

                    message:
                        "يجب إدخال سبب الرقود.",

                    indicator:
                        "orange"

                });


                return false;

            }

        }


        // =================================================
        // التحويل الداخلي
        // =================================================

        if (
            row.request_type ===
            "Transfer_Internal"
        ) {

            if (
                !row.details.requested_department
            ) {

                frappe.msgprint({

                    title:
                        "التحويل الداخلي",

                    message:
                        "يجب اختيار القسم المطلوب.",

                    indicator:
                        "orange"

                });


                return false;

            }


            if (
                !row.details.reason
            ) {

                frappe.msgprint({

                    title:
                        "التحويل الداخلي",

                    message:
                        "يجب إدخال سبب الرقود.",

                    indicator:
                        "orange"

                });


                return false;

            }

        }


        // =================================================
        // التحويل الخارجي
        // =================================================

        if (
            row.request_type ===
            "Transfer_External"
        ) {

            if (
                !row.details.destination
            ) {

                frappe.msgprint({

                    title:
                        "التحويل الخارجي",

                    message:
                        "يجب إدخال الجهة المحول إليها.",

                    indicator:
                        "orange"

                });


                return false;

            }


            if (
                !row.details.reason
            ) {

                frappe.msgprint({

                    title:
                        "التحويل الخارجي",

                    message:
                        "يجب إدخال سبب التحويل.",

                    indicator:
                        "orange"

                });


                return false;

            }

        }


        // =================================================
        // الاستشارة
        // =================================================

        if (
            row.request_type ===
            "Consultation"
        ) {

            if (
                !row.details.specialty
            ) {

                frappe.msgprint({

                    title:
                        "الاستشارة",

                    message:
                        "يجب تحديد التخصص المطلوب.",

                    indicator:
                        "orange"

                });


                return false;

            }


            if (
                !row.details.referred_to
            ) {

                frappe.msgprint({

                    title:
                        "الاستشارة",

                    message:
                        "يجب اختيار الطبيب المطلوب من أطباء المستشفى.",

                    indicator:
                        "orange"

                });


                return false;

            }


            if (
                !row.details.reason
            ) {

                frappe.msgprint({

                    title:
                        "الاستشارة",

                    message:
                        "يجب إدخال سبب الاستشارة.",

                    indicator:
                        "orange"

                });


                return false;

            }

        }


        // =================================================
        // تحقق عام
        // =================================================

        const hasAnyDetail =
            Object.keys(
                row.details || {}
            ).some(
                function(key) {

                    return String(
                        row.details[key] || ""
                    ).trim();

                }
            );


        if (
            !hasAnyDetail
            &&
            !(row.notes || "").trim()
        ) {

            frappe.msgprint({

                title:
                    "بيانات الخدمة",

                message:
                    "يجب إدخال تفاصيل الخدمة في الطلب رقم "
                    +
                    (index + 1)
                    +
                    ".",

                indicator:
                    "orange"

            });

            return false;

        }


        // =================================================
        // الخدمة المطلوبة
        // =================================================

        if (
            row.request_type !== "Discharge"
            &&
            !row.service_item
        ) {

            frappe.msgprint({

                title:
                    "بيانات الخدمة",

                message:
                    "يجب اختيار الخدمة المطلوبة في الطلب رقم "
                    +
                    (index + 1)
                    +
                    ".",

                indicator:
                    "orange"

            });


            return false;

        }

    }


    return true;

}


// =========================================================
// بناء تفاصيل الطلب
// =========================================================

function build_service_notes(
    row
) {

    const parts = [];


    const labels = {

        requested_department:
            "القسم المطلوب",

        requested_service_unit_type:
            "نوع وحدة الرقود",

        expected_length_of_stay:
            "مدة الرقود المتوقعة",

        destination:
            "الجهة المحول إليها",

        reason:
            "السبب",

        instructions:
            "التعليمات",

        specialty:
            "التخصص",

        referred_to:
            "الطبيب المطلوب"

    };


    if (
        row.request_type ===
        "Transfer_Internal"
    ) {

        parts.push(
            "نوع التحويل: تحويل داخلي"
        );

    }


    if (
        row.request_type ===
        "Transfer_External"
    ) {

        parts.push(
            "نوع التحويل: تحويل خارجي"
        );

    }


    if (
        row.request_type ===
        "Admission"
    ) {

        parts.push(
            "نوع الخدمة: ملاحظة طوارئ"
        );

    }


    if (
        row.request_type ===
        "Discharge"
    ) {

        parts.push(
            "نوع الخدمة: خروج"
        );

    }


    if (
        row.service_item
    ) {

        parts.push(
            "الخدمة المطلوبة: "
            +
            String(
                row.service_item
            ).trim()
        );

    }


    Object.keys(
        row.details || {}
    ).forEach(
        function(key) {

            const value =
                String(
                    row.details[key] || ""
                ).trim();


            if (!value) {

                return;

            }


            let displayValue =
                value;


            // ---------------------------------------------
            // القسم
            // ---------------------------------------------

            if (
                key ===
                "requested_department"
            ) {

                const item =
                    er_service_lookup_cache
                        .departments
                        .find(
                            function(entry) {

                                return entry.name ===
                                    value;

                            }
                        );


                if (item) {

                    displayValue =
                        item.department
                        ||
                        item.name;

                }

            }


            // ---------------------------------------------
            // نوع وحدة الرقود
            // ---------------------------------------------

            if (
                key ===
                "requested_service_unit_type"
            ) {

                const item =
                    er_service_lookup_cache
                        .service_unit_types
                        .find(
                            function(entry) {

                                return entry.name ===
                                    value;

                            }
                        );


                if (item) {

                    displayValue =
                        item.service_unit_type
                        ||
                        item.name;

                }

            }


            // ---------------------------------------------
            // الطبيب
            // ---------------------------------------------

            if (
                key ===
                "referred_to"
            ) {

                displayValue =
                    value;

            }


            parts.push(

                (
                    labels[key]
                    ||
                    key
                )
                +
                ": "
                +
                displayValue

            );

        }
    );


    const notes =
        String(
            row.notes
            ||
            ""
        ).trim();


    if (notes) {

        parts.push(
            "ملاحظات: "
            +
            notes
        );

    }


    return parts.join(
        "\n"
    );

}


// =========================================================
// إنشاء طلب خدمة عبر Python
// =========================================================

function create_single_er_service_request(
    data,
    callback
) {

    frappe.call({

        method:
            "custom_app.emergency_management.api.service_requests.create_service_request",

        args: {

            data: {

                patient:
                    data.patient,

                er_patient_intake:
                    data.er_patient_intake,

                bed:
                    data.bed,

                request_type:
                    data.request_type,

                requested_by:
                    frappe.session.user,

                doctor:
                    data.doctor,

                priority:
                    data.priority,

                notes:
                    data.notes,

                transfer_mode:
                    data.transfer_mode
                    ||
                    null,

                requested_department:
                    data.requested_department
                    ||
                    null,

                requested_service_unit_type:
                    data.requested_service_unit_type
                    ||
                    null,

                expected_length_of_stay:
                    data.expected_length_of_stay
                    ||
                    null,

                admission_reason:
                    data.admission_reason
                    ||
                    null

            }

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
                    !r.message.success
                ) {

                    if (callback) {

                        callback(
                            false,
                            null
                        );

                    }

                    return;

                }


                if (callback) {

                    callback(
                        true,
                        r.message
                    );

                }

            },

        error:
            function() {

                if (callback) {

                    callback(
                        false,
                        null
                    );

                }

            }

    });

}


// =========================================================
// حفظ الخدمات
// =========================================================

function save_er_service_requests(
    callback
) {

    if (!validate_er_service_rows()) {

        if (callback) {

            callback(false);

        }

        return;

    }


    if (!er_service_rows.length) {

        if (callback) {

            callback(true);

        }

        return;

    }


    const encounter =
        get_current_er_encounter();


    if (!encounter) {

        frappe.msgprint({

            title:
                "الخدمات",

            message:
                "لم يتم تحديد الزيارة الحالية.",

            indicator:
                "red"

        });


        if (callback) {

            callback(false);

        }

        return;

    }


    const patient =
        er_service_context.patient;


    const doctor =
        er_service_context.practitioner;


    const intake =
        er_service_context.er_patient_intake;


    const currentBed =
        er_service_context.bed;


    if (!patient) {

        frappe.msgprint({

            title:
                "الخدمات",

            message:
                "تعذر تحديد المريض من الزيارة الحالية.",

            indicator:
                "red"

        });


        if (callback) {

            callback(false);

        }

        return;

    }


    const requests =
        er_service_rows.map(
            function(row) {

                let apiType =
                    row.request_type;


                let transferMode =
                    null;


                if (
                    row.request_type ===
                    "Admission"
                ) {

                    apiType =
                        "Transfer";

                    transferMode =
                        "Admission";

                }


                if (
                    row.request_type ===
                    "Transfer_Internal"
                ) {

                    apiType =
                        "Transfer";

                    transferMode =
                        "Internal";

                }


                if (
                    row.request_type ===
                    "Transfer_External"
                ) {

                    apiType =
                        "Transfer";

                    transferMode =
                        "External";

                }


                if (
                    row.request_type ===
                    "Discharge"
                ) {

                    apiType =
                        "Discharge";

                }


                return {

                    request_type:
                        apiType,

                    transfer_mode:
                        transferMode,

                    priority:
                        row.priority
                        ||
                        "Normal",

                    service_item:
                        row.service_item
                        ||
                        null,

                    notes:
                        build_service_notes(
                            row
                        ),

                    requested_department:
                        row.details
                            .requested_department
                        ||
                        null,

                    requested_service_unit_type:
                        row.details
                            .requested_service_unit_type
                        ||
                        null,

                    expected_length_of_stay:
                        row.details
                            .expected_length_of_stay
                        ||
                        null,

                     admission_reason:
                        row.details.reason
                        ||
                        null,

                    bed:
                        currentBed

                };

            }
        );


    let index =
        0;


    function create_next() {

        if (
            index >=
            requests.length
        ) {

            er_service_rows =
                [];


            load_er_service_requests();


            if (callback) {

                callback(true);

            }


            return;

        }


        const data =
            requests[index];


        create_single_er_service_request(

            {

                patient:
                    patient,

                er_patient_intake:
                    intake,

                bed:
                    data.bed,

                request_type:
                    data.request_type,

                doctor:
                    doctor,

                priority:
                    data.priority,

                service_item:
                    data.service_item,

                notes:
                    data.notes,

                transfer_mode:
                    data.transfer_mode,

                requested_department:
                    data.requested_department,

                requested_service_unit_type:
                    data.requested_service_unit_type,

                expected_length_of_stay:
                    data.expected_length_of_stay,

                admission_reason:
                    data.admission_reason,

            },

            function(
                success,
                response
            ) {

                if (!success) {

                    frappe.msgprint({

                        title:
                            "الخدمات",

                        message:
                            "تعذر إنشاء طلب الخدمة رقم "
                            +
                            (index + 1)
                            +
                            ".",

                        indicator:
                            "red"

                    });


                    if (callback) {

                        callback(false);

                    }


                    return;

                }


                if (
                    response
                    &&
                    response.admission_request
                ) {

                    frappe.show_alert({

                        message:
                            "تم إنشاء طلب الملاحظة طوارئ "
                            +
                            response
                                .admission_request
                                .name
                            +
                            " وإرساله لمكتب الدخول والخروج.",

                        indicator:
                            "green"

                    });

                 }


                 if (
                     response
                     &&
                     response.discharge
                ) {

                    frappe.show_alert({

                        message:
                            "تم إخلاء السرير بنجاح."
                            + (response.discharge.bed ? (" السرير: " + response.discharge.bed + ".") : ""),

                        indicator:
                            "green"

                    });


                    try {

                        localStorage.setItem(
                            "er_bed_dashboard_refresh",
                            String(
                                Date.now()
                            )
                        );

                    } catch (e) {}

                }


                index += 1;

                create_next();

            }

        );

    }


    create_next();

}


// =========================================================
// الحفظ الموحد
// =========================================================

window.save_all_er_requests =
    window.save_all_er_requests
    ||
    function(callback) {

        save_er_service_requests(
            function(success) {

                if (
                    typeof callback ===
                    "function"
                ) {

                    callback(success);

                }

            }
        );

    };


// =========================================================
// توافق قديم
// =========================================================

function submit_er_service_requests() {

    save_er_service_requests();

}


// =========================================================
// شارة الحالة
// =========================================================

function create_er_service_status_badge(
    status
) {

    const badge =
        $("<span>")

            .addClass(
                "badge"
            )

            .text(
                get_er_service_status_label(
                    status
                )
            );


    if (
        status ===
        "Completed"
    ) {

        badge.addClass(
            "badge-success"
        );

    }

    else if (
        status ===
        "Cancelled"
        ||
        status ===
        "Rejected"
    ) {

        badge.addClass(
            "badge-danger"
        );

    }

    else if (
        status ===
        "In Progress"
        ||
        status ===
        "Approved"
    ) {

        badge.addClass(
            "badge-warning"
        );

    }

    else {

        badge.addClass(
            "badge-secondary"
        );

    }


    return badge;

}


// =========================================================
// إضافة صف للجدول الموحد
// =========================================================

function append_er_unified_request_row(
    request
) {

    const tbody =
        $("#er-service-requests-body");


    if (!tbody.length) {

        return;

    }


    const tr =
        $("<tr>");


    const name =
        request.name
        ||
        "---";


    const requestNumber =
        $("<td>");


    const requestLink =
        $("<a>")

            .css({

                fontWeight:
                    "700",

                whiteSpace:
                    "nowrap",

                cursor:
                    "pointer"

            })

            .text(
                name
            );


    requestLink.on(
        "click",
        function(event) {

            event.preventDefault();


            if (
                request.doctype
                &&
                name !== "---"
            ) {

                frappe.set_route(
                    "Form",
                    request.doctype,
                    name
                );

            }

        }
    );


    requestNumber.append(
        requestLink
    );


    tr.append(
        requestNumber
    );


    tr.append(

        $("<td>")
            .text(
                get_er_service_type_label(
                    request.request_type
                )
            )

    );


    tr.append(

        $("<td>")
            .text(
                get_er_service_priority_label(
                    request.priority
                )
            )

    );


    tr.append(

        $("<td>")

            .css(
                "white-space",
                "pre-wrap"
            )

            .text(
                request.notes
                ||
                request.details
                ||
                "---"
            )

    );


    tr.append(

        $("<td>")
            .text(
                request.doctor
                ||
                request.practitioner
                ||
                "---"
            )

    );


    tr.append(

        $("<td>")
            .text(
                format_er_service_datetime(
                    request.requested_datetime
                    ||
                    request.creation
                )
            )

    );


    const statusCell =
        $("<td>");


    statusCell.append(

        create_er_service_status_badge(
            request.status
            ||
            "Pending"
        )

    );


    tr.append(
        statusCell
    );


    tbody.append(
        tr
    );

}


// =========================================================
// تحميل طلبات الخدمات
// =========================================================

function load_er_patient_service_requests_for_unified_table(
    patient,
    intake
) {

    return new Promise(
        function(resolve) {

            const filters = {

                patient:
                    patient

            };


            if (intake) {

                filters.er_patient_intake =
                    intake;

            }


            frappe.call({

                method:
                    "frappe.client.get_list",

                args: {

                    doctype:
                        "ER Patient Service Request",

                    filters:
                        filters,

                    fields: [

                        "name",

                        "patient",

                        "er_patient_intake",

                        "request_type",

                        "priority",

                        "doctor",

                        "status",

                        "notes",

                        "requested_datetime",

                        "creation"

                    ],

                    order_by:
                        "creation desc",

                    limit_page_length:
                        0

                },

                callback:
                    function(r) {

                        const requests =
                            r.message || [];


                        requests.forEach(
                            function(request) {

                                request.doctype =
                                    "ER Patient Service Request";


                                append_er_unified_request_row(
                                    request
                                );

                            }
                        );


                        resolve(
                            requests.length
                        );

                    },

                error:
                    function() {

                        resolve(0);

                    }

            });

        }
    );

}


// =========================================================
// Medication Request
//
// لا نقرأ أي حقول غير مؤكدة.
// =========================================================

function load_er_medication_requests_for_unified_table(
    patient,
    encounter
) {

    return new Promise(
        function(resolve) {

            if (!encounter) {

                resolve(0);

                return;

            }


            frappe.call({

                method:
                    "frappe.client.get_list",

                args: {

                    doctype:
                        "Medication Request",

                    filters: {

                        reason_reference:
                            encounter

                    },

                    fields: [

                        "name",

                        "status",

                        "creation"

                    ],

                    order_by:
                        "creation desc",

                    limit_page_length:
                        0

                },

                callback:
                    function(r) {

                        const requests =
                            r.message || [];


                        requests.forEach(
                            function(request) {

                                append_er_unified_request_row({

                                    name:
                                        request.name,

                                    request_type:
                                        "Medication",

                                    priority:
                                        "Normal",

                                    notes:
                                        "طلب دواء",

                                    doctor:
                                        "---",

                                    status:
                                        request.status
                                        ||
                                        "Pending",

                                    creation:
                                        request.creation,

                                    doctype:
                                        "Medication Request"

                                });

                            }
                        );


                        resolve(
                            requests.length
                        );

                    },

                error:
                    function() {

                        resolve(0);

                    }

            });

        }
    );

}


// =========================================================
// تحميل الجدول الموحد
// =========================================================

function load_er_service_requests() {

    const tbody =
        $("#er-service-requests-body");


    if (!tbody.length) {

        return;

    }


    const loading =
        $("#er-service-loading");


    const empty =
        $("#er-service-empty");


    const patient =
        er_service_context.patient;


    const intake =
        er_service_context.er_patient_intake;


    const encounter =
        er_service_context.encounter;


    if (!patient) {

        tbody.empty();


        empty
            .text(
                "تعذر تحديد المريض الحالي."
            )
            .show();


        return;

    }


    loading.show();

    empty.hide();

    tbody.empty();


    Promise.all([

        load_er_patient_service_requests_for_unified_table(
            patient,
            intake
        ),

        load_er_medication_requests_for_unified_table(
            patient,
            encounter
        )

    ])
        .then(
            function(results) {

                const total =
                    results.reduce(
                        function(sum, count) {

                            return sum + count;

                        },
                        0
                    );


                if (!total) {

                    empty
                        .text(
                            "لا توجد طلبات لهذه الزيارة."
                        )
                        .show();

                }

            }
        )
        .catch(
            function() {

                empty
                    .text(
                        "تعذر تحميل الطلبات."
                    )
                    .show();

            }
        )
        .finally(
            function() {

                loading.hide();

            }
        );

}


// =========================================================
// تنسيق التاريخ
// =========================================================

function format_er_service_datetime(
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


// =========================================================
// تحديث الجدول
// =========================================================

function refresh_er_unified_requests() {

    load_er_service_context(
        function() {

            load_er_service_requests();

        }
    );

}


// =========================================================
// الأحداث
// =========================================================

$(document)
    .off(
        "click",
        "#add-er-service-row"
    );


$(document)
    .on(
        "click",
        "#add-er-service-row",
        function() {

            add_er_service_row();

        }
    );


$(document)
    .off(
        "click",
        "#refresh-er-service-requests"
    );


$(document)
    .on(
        "click",
        "#refresh-er-service-requests",
        function() {

            refresh_er_unified_requests();

        }
    );
