
// =====================================================
// ER VISIT CONSOLE - SHARED UTILITIES
// =====================================================

window.er_visit_console_utils =
    window.er_visit_console_utils || {};


// =====================================================
// ESCAPE HTML
// =====================================================

er_visit_console_utils.escape_html = function(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

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

};


window.escape_html =
    er_visit_console_utils.escape_html;


// =====================================================
// DISPLAY VALUE
// =====================================================

er_visit_console_utils.get_display_value = function(value) {

    if (!value) {

        return "---";

    }


    if (
        typeof value ===
        "object"
    ) {

        return (

            value.name ||
            value.label ||
            value.patient_name ||
            "---"

        );

    }


    return String(value);

};


window.get_display_value =
    er_visit_console_utils.get_display_value;


// =====================================================
// TOGGLE ER SECTION
// =====================================================

er_visit_console_utils.toggle_er_section = function(section_id) {

    const content =
        document.getElementById(
            section_id
        );


    if (!content) {

        return;

    }


    const is_collapsed =
        content.classList.contains(
            "collapsed"
        );


    if (is_collapsed) {

        content.classList.remove(
            "collapsed"
        );

    }
    else {

        content.classList.add(
            "collapsed"
        );

    }


    let toggle =
        content.closest(
            ".er-collapsible-section"
        );


    if (toggle) {

        toggle =
            toggle.querySelector(
                ".er-collapse-toggle"
            );

    }


    if (!toggle) {

        const header =
            content.previousElementSibling;


        if (header) {

            toggle =
                header.querySelector(
                    ".er-collapse-toggle"
                );

        }

    }


    if (toggle) {

        toggle.textContent =
            is_collapsed
                ? "▲"
                : "▼";

    }

};


window.toggle_er_section =
    er_visit_console_utils.toggle_er_section;


// =====================================================
// ENHANCE SECTION COLLAPSE
// =====================================================

er_visit_console_utils.enhance_er_section_collapse =
    function(section) {

        const selectors = {

            details:
                ".er-details-container > .er-card",

            clinical:
                ".clinical-card, .clinical-section-card, .vitals-schedule-card, .medical-history-card",

            labs:
                ".er-labs-card",

            radiology:
                ".er-radiology-card",

            medications:
                ".er-medication-card",

            procedures:
                ".er-procedures-card",

            services:
                ".er-services-section > .section-card"

        };


        const card_selector =
            selectors[section];


        if (!card_selector) {

            return;

        }


        $("#er-content")
            .find(card_selector)
            .each(

                function() {

                    const card =
                        $(this);


                    if (
                        card.find(
                            ".er-collapse-toggle, .er-collapsible-content"
                        ).length
                    ) {

                        return;

                    }


                    const header =
                        card.find(

                            ".er-card-title, " +
                            ".clinical-section-card-header, " +
                            ".er-labs-header, " +
                            ".er-radiology-card-header, " +
                            ".er-medication-card-header, " +
                            ".er-procedures-header"

                        ).first();


                    const fallback_header =
                        header.length
                            ? header
                            : card.children().first();


                    if (
                        !fallback_header.length
                    ) {

                        return;

                    }


                    fallback_header

                        .addClass(
                            "er-enhanced-collapse-header"
                        )

                        .append(

                            $("<button>")

                                .attr({

                                    type:
                                        "button",

                                    title:
                                        "طي / توسيع",

                                    "aria-label":
                                        "طي / توسيع"

                                })

                                .addClass(
                                    "er-collapse-toggle er-enhanced-collapse-toggle"
                                )

                                .text(
                                    "▼"
                                )

                                .on(
                                    "click.erEnhancedCollapse",
                                    function(event) {

                                        event.preventDefault();

                                        event.stopPropagation();


                                        card.toggleClass(
                                            "er-enhanced-collapsed"
                                        );


                                        $(this).text(

                                            card.hasClass(
                                                "er-enhanced-collapsed"
                                            )
                                                ? "▲"
                                                : "▼"

                                        );

                                    }
                                )

                        );

                }

            );

    };


window.enhance_er_section_collapse =
    er_visit_console_utils.enhance_er_section_collapse;


// =====================================================
// FORMAT CURRENCY
// =====================================================

er_visit_console_utils.format_currency = function(value) {

    const number =
        parseFloat(value) || 0;


    return number.toLocaleString(

        "en-US",

        {

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2

        }

    );

};


window.format_currency =
    er_visit_console_utils.format_currency;


// =====================================================
// CURRENT ENCOUNTER
// =====================================================

er_visit_console_utils.get_current_encounter =
    function() {

        if (

            typeof current_encounter !==
            "undefined"

            &&

            current_encounter

        ) {

            return current_encounter;

        }


        try {

            const route =
                frappe.get_route();


            if (

                route &&
                route.length > 1 &&
                route[1]

            ) {

                return route[1];

            }

        }
        catch (error) {
        }


        return null;

    };


window.get_current_encounter =
    er_visit_console_utils.get_current_encounter;


// =====================================================
// ACTIVITY
// =====================================================

er_visit_console_utils.add_activity =
    function(category, message) {

        const encounter =
            get_current_encounter();


        if (!encounter) {

            return;

        }


        frappe.call({

            method:
                "custom_app.emergency_management.page.er_visit_console.er_visit_console.add_er_activity",

            args: {

                encounter:
                    encounter,

                category:
                    category,

                message:
                    message

            },

            freeze:
                false

        });

    };


window.add_er_activity =
    er_visit_console_utils.add_activity;


// =====================================================
// NOTES DIALOG
// =====================================================

er_visit_console_utils.open_notes_dialog =
    function(config) {

        const defaults = {

            title:
                "📝 ملاحظات",

            fieldname:
                "notes",

            label:
                "ملاحظة",

            default_value:
                "",

            callback:
                null,

            row_reference:
                null,

            input_selector:
                null

        };


        const options =
            Object.assign(

                {},
                defaults,
                config

            );


        const dialog_id =
            "er-notes-dialog-" +
            options.fieldname +
            "-" +
            Date.now();


        if (
            $("#" + dialog_id).length
        ) {

            $("#" + dialog_id).remove();

        }


        const dialog =
            new frappe.ui.Dialog({

                title:
                    options.title,

                size:
                    "large",

                fields:
                    [

                        {

                            fieldtype:
                                "Small Text",

                            fieldname:
                                options.fieldname,

                            label:
                                options.label,

                            default:
                                options.default_value
                                ||
                                ""

                        }

                    ],

                primary_action_label:
                    "Save",

                primary_action:
                    function(values) {

                        const note_value =
                            (

                                values
                                &&
                                values[
                                    options.fieldname
                                ]

                            )
                            ||
                            "";


                        if (

                            options.row_reference
                            &&
                            options.row_reference.notes !==
                            undefined

                        ) {

                            options.row_reference.notes =
                                note_value;

                        }


                        if (
                            options.input_selector
                        ) {

                            $(
                                options.input_selector
                            ).val(
                                note_value
                            );

                        }


                        if (
                            typeof options.callback ===
                            "function"
                        ) {

                            options.callback(
                                note_value
                            );

                        }


                        dialog.hide();

                        dialog.remove();

                    }

            });


        dialog.$wrapper.attr(
            "id",
            dialog_id
        );


        dialog.show();


        const textarea =
            dialog.$wrapper.find(

                'textarea[name="' +
                options.fieldname +
                '"]'

            );


        if (
            textarea.length
        ) {

            textarea

                .attr(
                    "rows",
                    10
                )

                .css({

                    "min-height":
                        "220px",

                    "font-size":
                        "14px",

                    "line-height":
                        "1.6"

                });

        }

    };


window.open_notes_dialog =
    er_visit_console_utils.open_notes_dialog;


// =====================================================
// LINK AUTOCOMPLETE PORTAL
//
// مهم:
//
// القائمة يتم نقلها أولًا إلى الـ portal.
// بعد ذلك فقط يتم استدعاء on_portal_ready.
//
// النتيجة:
//
//     القائمة
//        ↓
//     بحث متقدم
//     إضافة جديدة
//
// بدون نسخة أعلى القائمة.
// =====================================================


/* =====================================================
   ER Console - Native Frappe Link Popup
   Global visual normalization
===================================================== */

(function ensure_er_native_link_popup_css() {

    if (
        document.getElementById(
            "er-native-link-popup-global-css"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "er-native-link-popup-global-css";

    style.textContent = `
        /*
         * جميع قوائم Link الخاصة بـ ER Console
         */
        [data-er-native-link-popup="1"],
        [data-er-native-link-popup="1"] ul,
        [data-er-native-link-popup="1"] li,
        [data-er-native-link-popup="1"] li[role="option"],
        [data-er-native-link-popup="1"] [role="option"],
        [data-er-native-link-popup="1"] p,
        [data-er-native-link-popup="1"] span,
        [data-er-native-link-popup="1"] strong,
        [data-er-native-link-popup="1"] i,
        [data-er-native-link-popup="1"] a,
        [data-er-native-link-popup="1"] div {
            cursor: default !important;
        }

        /*
         * الخلفية الواضحة
         */
        [data-er-native-link-popup="1"] ul,
        [data-er-native-link-popup="1"] li,
        [data-er-native-link-popup="1"] li[role="option"],
        [data-er-native-link-popup="1"] [role="option"] {
            background: #ffffff !important;
            background-color: #ffffff !important;
            opacity: 1 !important;
            filter: none !important;
        }

        /*
         * يمنع Frappe / Awesomplete من إعادة
         * المؤشر إلى pointer عند hover/focus.
         */
        [data-er-native-link-popup="1"] li:hover,
        [data-er-native-link-popup="1"] li:focus,
        [data-er-native-link-popup="1"] li[aria-selected="true"],
        [data-er-native-link-popup="1"] [role="option"]:hover,
        [data-er-native-link-popup="1"] [role="option"]:focus,
        [data-er-native-link-popup="1"] [role="option"][aria-selected="true"],
        [data-er-native-link-popup="1"] .link-option,
        [data-er-native-link-popup="1"] .link-option:hover {
            cursor: default !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            opacity: 1 !important;
        }
    `;

    document.head.appendChild(style);

})();

er_visit_console_utils.attach_link_autocomplete_portal =
    function(config) {

        const options = Object.assign(
            {
                control: null,
                portal_selector: null,
                row_reference: null,
                on_select: null,
                on_portal_ready: null
            },
            config || {}
        );

        if (
            !options.control ||
            !options.control.awesomplete ||
            !options.control.$input
        ) {
            return;
        }

        const control = options.control;
        const input = control.$input;
        const awesomplete = control.awesomplete;

        /*
         * Popup واحد لكل Control.
         * لا نستخدم popup مشتركاً بين الحقول.
         */

        let popup =
            $("<div>")
                .addClass(
                    "er-console-native-link-popup"
                )
                .attr(
                    "data-er-native-link-popup",
                    "1"
                )
                .appendTo("body");

        popup.css({
            position: "fixed",
            display: "none",
            visibility: "hidden",
            overflow: "visible",
            zIndex: "2147483647",
            pointerEvents: "auto"
        });

        function position_popup() {

            const ul = awesomplete.ul;

            if (!ul) {
                return;
            }

            /*
             * القائمة الأصلية من Frappe نفسها.
             */

            $(ul).appendTo(popup);

            $(ul).addClass(
                "er-console-native-link-ul"
            );

            $(ul).css({
                position: "static",
                display: "block",
                visibility: "visible",
                width: "100%",
                minWidth: "100%",
                maxWidth: "100%",
                maxHeight: "360px",
                overflowY: "auto",
                overflowX: "hidden",
                margin: "0",
                boxSizing: "border-box",
                background: "#ffffff",
                backgroundColor: "#ffffff",
                opacity: "1",
                filter: "none"
            });

            /*
             * CSS أقوى من Frappe/Awesomplete.
             */

            $(ul).find("*").css({
                cursor: "default",
                opacity: "1",
                filter: "none"
            });

            $(ul).find("li, [role='option']").css({
                cursor: "default",
                background: "#ffffff",
                backgroundColor: "#ffffff",
                color: "#1f2937",
                opacity: "1",
                filter: "none"
            });

            const rect =
                input[0].getBoundingClientRect();

            const viewportWidth =
                window.innerWidth;

            const viewportHeight =
                window.innerHeight;

            let width =
                Math.max(
                    rect.width,
                    280
                );

            width =
                Math.min(
                    width,
                    viewportWidth - 16
                );

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

            popup.css({
                width: width + "px",
                left: left + "px",
                visibility: "visible",
                display: "block"
            });

            /*
             * قياس الارتفاع بعد إظهاره.
             */

            const height =
                Math.min(
                    Math.max(
                        ul.scrollHeight || 240,
                        40
                    ),
                    360
                );

            let top =
                rect.bottom + 4;

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

            popup.css({
                top: top + "px"
            });

            /*
             * إصلاح إضافي بعد أن يعيد Frappe بناء
             * عناصر Create New / Advanced Search.
             */

            setTimeout(
                function() {

                    $(ul).find("li, [role='option']").css({
                        cursor: "default",
                        background: "#ffffff",
                        backgroundColor: "#ffffff",
                        opacity: "1",
                        filter: "none"
                    });

                    $(ul).find("*").css({
                        cursor: "default"
                    });

                },
                0
            );

        }

        function close_popup() {

            popup.css({
                display: "none",
                visibility: "hidden"
            });

        }

        /*
         * فتح Frappe الأصلي.
         */

        input
            .off(
                ".erConsoleNativePopup"
            )
            .on(
                "awesomplete-open.erConsoleNativePopup",
                function() {

                    setTimeout(
                        function() {

                            position_popup();

                            /*
                             * السماح للنافذة الخاصة بالقسم
                             * بالاحتفاظ بمنطقها إن كان موجوداً.
                             */

                            if (
                                typeof options.on_portal_ready ===
                                "function"
                            ) {

                                options.on_portal_ready(
                                    popup
                                );

                            }

                        },
                        0
                    );

                }
            )
            .on(
                "awesomplete-close.erConsoleNativePopup",
                function() {

                    close_popup();

                }
            );

        $(window)
            .off(
                ".erConsoleNativePopup"
            )
            .on(
                "resize.erConsoleNativePopup",
                function() {

                    if (awesomplete.opened) {
                        position_popup();
                    }

                }
            )
            .on(
                "scroll.erConsoleNativePopup",
                function() {

                    if (awesomplete.opened) {
                        position_popup();
                    }

                }
            );

        close_popup();

    };


window.attach_link_autocomplete_portal =
    er_visit_console_utils.attach_link_autocomplete_portal;


// =====================================================
// LINK SPECIAL ACTIONS
//
// المصدر المشترك الوحيد للزرين:
//
// 🔍 بحث متقدم
// ➕ إضافة جديدة
//
// يتم وضعهما في نهاية الـ portal.
// =====================================================

er_visit_console_utils.render_link_special_actions =
    function(config) {

        const options =
            Object.assign(

                {

                    portal_selector:
                        null,

                    on_create:
                        null,

                    on_advanced_search:
                        null,

                    create_label:
                        "➕ إضافة جديدة",

                    advanced_label:
                        "🔍 بحث متقدم"

                },

                config || {}

            );


        if (
            !options.portal_selector
        ) {

            return;

        }


        const $portal =
            $(
                options.portal_selector
            );


        if (
            !$portal.length
        ) {

            return;

        }


        /*
         * حذف النسخة السابقة فقط.
         */

        $portal
            .find(
                ".er-link-special-actions"
            )
            .remove();


        /*
         * إنشاء حاوية واحدة.
         */

        const $actions =
            $("<div>")

                .addClass(
                    "er-link-special-actions"
                )

                .attr(
                    "data-er-special-actions",
                    "1"
                )

                .css({

                    display:
                        "flex",

                    flexDirection:
                        "column",

                    gap:
                        "4px",

                    padding:
                        "6px 4px",

                    marginTop:
                        "4px",

                    width:
                        "100%",

                    boxSizing:
                        "border-box",

                    borderTop:
                        "1px solid #e2e8f0",

                    background:
                        "#f8fafc",

                    position:
                        "relative",

                    zIndex:
                        "10001"

                });


        // =================================================
        // Advanced Search
        // =================================================

        const $advanced =
            $("<button>")

                .attr(
                    "type",
                    "button"
                )

                .addClass(
                    "er-link-special-action er-link-advanced-action"
                )

                .text(
                    options.advanced_label
                )

                .css({

                    width:
                        "100%",

                    border:
                        "1px solid #cbd5e1",

                    background:
                        "#ffffff",

                    padding:
                        "8px 10px",

                    borderRadius:
                        "6px",

                    cursor:
                        "pointer",

                    fontSize:
                        "13px",

                    display:
                        "flex",

                    alignItems:
                        "center",

                    justifyContent:
                        "center",

                    gap:
                        "6px",

                    color:
                        "#1e293b",

                    boxSizing:
                        "border-box"

                });


        // =================================================
        // Create New
        // =================================================

        const $create =
            $("<button>")

                .attr(
                    "type",
                    "button"
                )

                .addClass(
                    "er-link-special-action er-link-create-action"
                )

                .text(
                    options.create_label
                )

                .css({

                    width:
                        "100%",

                    border:
                        "1px solid #cbd5e1",

                    background:
                        "#ffffff",

                    padding:
                        "8px 10px",

                    borderRadius:
                        "6px",

                    cursor:
                        "pointer",

                    fontSize:
                        "13px",

                    display:
                        "flex",

                    alignItems:
                        "center",

                    justifyContent:
                        "center",

                    gap:
                        "6px",

                    color:
                        "#1e293b",

                    boxSizing:
                        "border-box"

                });


        // =================================================
        // Hover
        // =================================================

        $advanced

            .on(
                "mouseenter.erLinkSpecialAction",
                function() {

                    $(this).css(
                        "background",
                        "#e2e8f0"
                    );

                }
            )

            .on(
                "mouseleave.erLinkSpecialAction",
                function() {

                    $(this).css(
                        "background",
                        "#ffffff"
                    );

                }
            );


        $create

            .on(
                "mouseenter.erLinkSpecialAction",
                function() {

                    $(this).css(
                        "background",
                        "#e2e8f0"
                    );

                }
            )

            .on(
                "mouseleave.erLinkSpecialAction",
                function() {

                    $(this).css(
                        "background",
                        "#ffffff"
                    );

                }
            );


        // =================================================
        // Click - Advanced Search
        // =================================================

        $advanced.on(
            "click.erLinkSpecialAction",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    typeof options.on_advanced_search ===
                    "function"
                ) {

                    options.on_advanced_search();

                }

            }
        );


        // =================================================
        // Click - Create New
        // =================================================

        $create.on(
            "click.erLinkSpecialAction",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    typeof options.on_create ===
                    "function"
                ) {

                    options.on_create();

                }

            }
        );


        /*
         * الترتيب النهائي.
         */

        $actions.append(
            $advanced,
            $create
        );


        /*
         * مهم:
         * append في نهاية portal.
         *
         * وبالتالي الأزرار دائمًا
         * أسفل الـ UL.
         */

        $portal.append(
            $actions
        );

    };


window.render_link_special_actions =
    er_visit_console_utils.render_link_special_actions;


// =====================================================
// CREATE NEW DIALOG
// =====================================================

er_visit_console_utils.open_create_new_dialog =
    function(config) {

        const defaults = {

            title:
                "إنشاء جديد",

            doctype:
                null,

            fields:
                [],

            callback:
                null,

            row_reference:
                null,

            control:
                null,

            create_method:
                null

        };


        const options =
            Object.assign(
                {},
                defaults,
                config
            );


        if (
            !options.doctype
        ) {

            frappe.msgprint({

                title:
                    "خطأ",

                message:
                    "يرجى تحديد نوع المستند.",

                indicator:
                    "red"

            });


            return;

        }


        const dialog =
            new frappe.ui.Dialog({

                title:
                    options.title,

                fields:
                    options.fields,

                primary_action_label:
                    "Save",

                primary_action:
                    function(values) {

                        if (
                            !values
                        ) {

                            return;

                        }


                        const create_method =
                            options.create_method
                            ||
                            "frappe.client.insert";


                        const create_args =

                            create_method ===
                            "frappe.client.insert"

                                ?

                            {

                                doc:
                                    Object.assign(

                                        {},
                                        values,

                                        {

                                            doctype:
                                                options.doctype

                                        }

                                    )

                            }

                                :

                            {

                                data:
                                    JSON.stringify(
                                        values
                                    )

                            };


                        frappe.call({

                            method:
                                create_method,

                            args:
                                create_args,

                            freeze:
                                true,

                            callback:
                                function(r) {

                                    if (

                                        r.exc
                                        ||
                                        !r.message
                                        ||
                                        !r.message.name

                                    ) {

                                        frappe.msgprint({

                                            title:
                                                "خطأ",

                                            message:
                                                "فشل إنشاء المستند: " +
                                                (
                                                    r.exc
                                                    ||
                                                    "استجابة غير صحيحة"
                                                ),

                                            indicator:
                                                "red"

                                        });


                                        return;

                                    }


                                    dialog.hide();

                                    dialog.remove();


                                    if (
                                        options.control
                                    ) {

                                        options.control.set_value(
                                            r.message.name
                                        );

                                    }


                                    if (
                                        options.row_reference
                                    ) {

                                        if (

                                            typeof options.row_reference.examination_type !==
                                            "undefined"

                                        ) {

                                            options.row_reference.examination_type =
                                                r.message.name;

                                        }

                                        else if (

                                            typeof options.row_reference.test_name !==
                                            "undefined"

                                        ) {

                                            options.row_reference.test_name =
                                                r.message.name;

                                        }

                                        else if (

                                            typeof options.row_reference.procedure_template !==
                                            "undefined"

                                        ) {

                                            options.row_reference.procedure_template =
                                                r.message.name;

                                        }

                                        else if (

                                            typeof options.row_reference.radiology_examination !==
                                            "undefined"

                                        ) {

                                            options.row_reference.radiology_examination =
                                                r.message.name;

                                        }

                                        else if (

                                            typeof options.row_reference.medication !==
                                            "undefined"

                                        ) {

                                            options.row_reference.medication =
                                                r.message.name;

                                        }

                                    }


                                    if (
                                        typeof options.callback ===
                                        "function"
                                    ) {

                                        options.callback(
                                            r.message
                                        );

                                    }


                                    frappe.show_alert({

                                        message:
                                            "تم الإنشاء بنجاح",

                                        indicator:
                                            "green"

                                    });

                                }

                        });

                    }

            });


        dialog.show();

    };


window.open_create_new_dialog =
    er_visit_console_utils.open_create_new_dialog;


// =====================================================
// ADVANCED SEARCH DIALOG
// =====================================================

er_visit_console_utils.open_advanced_search_dialog =
    function(config) {

        console.log(
            "[ER Console] open_advanced_search_dialog called",
            config
        );


        const defaults = {

            title:
                "بحث متقدم",

            doctype:
                null,

            search_fields:
                [],

            fields:
                [],

            filters:
                {},

            columns:
                [],

            callback:
                null,

            row_reference:
                null,

            control:
                null,

            value_field:
                "name",

            label_field:
                "name"

        };


        const options =
            Object.assign(
                {},
                defaults,
                config
            );


        if (
            !options.doctype
        ) {

            frappe.msgprint({

                title:
                    "خطأ",

                message:
                    "يرجى تحديد نوع المستند.",

                indicator:
                    "red"

            });


            return;

        }


        const dialog =
            new frappe.ui.Dialog({

                title:
                    options.title,

                size:
                    "large",

                fields:
                    [

                        {

                            fieldtype:
                                "Data",

                            fieldname:
                                "search_query",

                            label:
                                "بحث",

                            placeholder:
                                "أدخل نص البحث..."

                        },

                        ...options.fields

                    ],

                primary_action_label:
                    "Search",

                primary_action:
                    function(values) {

                        const query =
                            (

                                values
                                &&
                                values.search_query

                            )
                            ||
                            "";


                        const args = {

                            doctype:
                                options.doctype,

                            fields:
                                options.columns.length

                                    ?

                                options.columns

                                    :

                                [

                                    options.value_field,

                                    options.label_field

                                ],

                            filters:
                                options.filters,

                            order_by:
                                "modified desc",

                            limit_page_length:
                                50

                        };


                        if (
                            query
                        ) {

                            args.or_filters =
                                options.search_fields.map(

                                    function(field) {

                                        return [

                                            options.doctype,

                                            field,

                                            "like",

                                            "%" +
                                            query +
                                            "%"

                                        ];

                                    }

                                );

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

                                        frappe.msgprint({

                                            title:
                                                "خطأ",

                                            message:
                                                "فشل البحث: " +
                                                (
                                                    r.exc ||
                                                    "خطأ غير معروف"
                                                ),

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
                                                "بحث",

                                            message:
                                                "لا توجد نتائج",

                                            indicator:
                                                "orange"

                                        });


                                        return;

                                    }


                                    const results_html =
                                        $("<div>")
                                            .addClass(
                                                "er-search-results"
                                            );


                                    results.forEach(

                                        function(item) {

                                            const row =
                                                $("<div>")

                                                    .addClass(
                                                        "er-search-result-item"
                                                    )

                                                    .attr(
                                                        "data-value",
                                                        item[
                                                            options.value_field
                                                        ]
                                                    )

                                                    .attr(
                                                        "data-label",
                                                        item[
                                                            options.label_field
                                                        ]
                                                    );


                                            options.columns.forEach(

                                                function(field) {

                                                    const cell =
                                                        $("<span>")

                                                            .addClass(
                                                                "er-search-result-cell"
                                                            )

                                                            .text(

                                                                item[field]
                                                                ||
                                                                ""

                                                            );


                                                    row.append(
                                                        cell
                                                    );

                                                }

                                            );


                                            row.on(
                                                "click.erSearchResult",
                                                function() {

                                                    const value =
                                                        $(this)
                                                            .attr(
                                                                "data-value"
                                                            );


                                                    const label =
                                                        $(this)
                                                            .attr(
                                                                "data-label"
                                                            );


                                                    dialog.hide();

                                                    dialog.remove();


                                                    if (
                                                        options.control
                                                    ) {

                                                        options.control.set_value(

                                                            value,

                                                            label

                                                        );

                                                    }


                                                    if (
                                                        options.row_reference
                                                    ) {

                                                        if (

                                                            typeof options.row_reference.examination_type !==
                                                            "undefined"

                                                        ) {

                                                            options.row_reference.examination_type =
                                                                value;

                                                        }

                                                        else if (

                                                            typeof options.row_reference.test_name !==
                                                            "undefined"

                                                        ) {

                                                            options.row_reference.test_name =
                                                                value;

                                                        }

                                                        else if (

                                                            typeof options.row_reference.procedure_template !==
                                                            "undefined"

                                                        ) {

                                                            options.row_reference.procedure_template =
                                                                value;

                                                        }

                                                        else if (

                                                            typeof options.row_reference.radiology_examination !==
                                                            "undefined"

                                                        ) {

                                                            options.row_reference.radiology_examination =
                                                                value;

                                                        }

                                                        else if (

                                                            typeof options.row_reference.medication !==
                                                            "undefined"

                                                        ) {

                                                            options.row_reference.medication =
                                                                value;

                                                        }

                                                    }


                                                    if (
                                                        typeof options.callback ===
                                                        "function"
                                                    ) {

                                                        options.callback(

                                                            value,

                                                            label,

                                                            item

                                                        );

                                                    }

                                                }
                                            );


                                            results_html.append(
                                                row
                                            );

                                        }

                                    );


                                    dialog.$wrapper

                                        .find(
                                            ".modal-body"
                                        )

                                        .append(
                                            results_html
                                        );

                                }

                        });

                    },

                secondary_action_label:
                    "Close",

                secondary_action:
                    function() {

                        dialog.hide();

                        dialog.remove();

                    }

            });


        dialog.show();

    };


window.open_advanced_search_dialog =
    er_visit_console_utils.open_advanced_search_dialog;


// =====================================================
// REFRESH BUTTON
// =====================================================

er_visit_console_utils.bind_refresh_button =
    function(
        button_selector,
        callback
    ) {

        $(document)

            .off(
                "click.erConsoleRefresh",
                button_selector
            )

            .on(
                "click.erConsoleRefresh",
                button_selector,

                function(e) {

                    e.preventDefault();

                    e.stopPropagation();


                    if (
                        typeof callback ===
                        "function"
                    ) {

                        callback();

                    }

                }

            );

    };


window.bind_refresh_button =
    er_visit_console_utils.bind_refresh_button;


// =====================================================
// POINTER CURSOR
// =====================================================

er_visit_console_utils.apply_clickable_cursor =
    function(selector) {

        $(selector).css({

            cursor:
                "pointer"

        });

    };


window.apply_clickable_cursor =
    er_visit_console_utils.apply_clickable_cursor;


// =====================================================
// SEARCH RESULTS PORTAL
// =====================================================

er_visit_console_utils.attach_search_portal =
    function(config) {

        const defaults = {

            input_selector:
                null,

            results_selector:
                null,

            portal_selector:
                null,

            on_show:
                null,

            on_hide:
                null

        };


        const options =
            Object.assign(
                {},
                defaults,
                config
            );


        if (

            !options.input_selector
            ||
            !options.results_selector
            ||
            !options.portal_selector

        ) {

            return;

        }


        const $input =
            $(options.input_selector);


        const $results =
            $(options.results_selector);


        const $portal =
            $(options.portal_selector);


        if (

            !$input.length
            ||
            !$results.length
            ||
            !$portal.length

        ) {

            return;

        }


        $results

            .css({

                position:
                    "absolute",

                zIndex:
                    "9999"

            })

            .appendTo(
                $portal
            );


        function position_portal() {

            if (

                !$input.length
                ||
                !$results.length
                ||
                !$portal.length

            ) {

                return;

            }


            const rect =
                $input[0].getBoundingClientRect();


            const viewportWidth =
                window.innerWidth;


            const viewportHeight =
                window.innerHeight;


            let top =
                rect.bottom + 4;


            let left =
                rect.left;


            const width =
                Math.max(
                    rect.width,
                    280
                );


            if (

                left + width >
                viewportWidth - 8

            ) {

                left =
                    viewportWidth -
                    width -
                    8;

            }


            if (
                left < 8
            ) {

                left =
                    8;

            }


            if (

                top + 320 >
                viewportHeight

            ) {

                top =
                    rect.top -
                    320 -
                    4;

            }


            if (
                top < 8
            ) {

                top =
                    8;

            }


            $portal.css({

                position:
                    "fixed",

                top:
                    top +
                    "px",

                left:
                    left +
                    "px",

                width:
                    width +
                    "px",

                display:
                    "block",

                zIndex:
                    "9999"

            });


            $results.css({

                position:
                    "static",

                width:
                    "100%",

                minWidth:
                    "0",

                left:
                    "auto",

                right:
                    "auto"

            });

        }


        $input

            .off(
                "focus.erSearchPortal"
            )

            .on(
                "focus.erSearchPortal",
                function() {

                    $portal.show();

                    position_portal();

                }
            );


        $input

            .off(
                "blur.erSearchPortal"
            )

            .on(
                "blur.erSearchPortal",
                function() {

                    setTimeout(

                        function() {

                            if (
                                !$portal.find(
                                    ":focus"
                                ).length
                            ) {

                                $portal.hide();

                            }

                        },

                        150

                    );

                }
            );


        $(window)

            .off(
                "scroll.erConsoleSearchPortal"
            )

            .off(
                "resize.erConsoleSearchPortal"
            )

            .on(
                "scroll.erConsoleSearchPortal",
                function() {

                    if (
                        $portal.is(
                            ":visible"
                        )
                    ) {

                        position_portal();

                    }

                }
            )

            .on(
                "resize.erConsoleSearchPortal",
                function() {

                    if (
                        $portal.is(
                            ":visible"
                        )
                    ) {

                        position_portal();

                    }

                }
            );


        $portal

            .off(
                "mouseenter.erSearchPortal"
            )

            .on(
                "mouseenter.erSearchPortal",
                function() {

                    $(this).show();

                }
            );


        $portal

            .off(
                "mouseleave.erSearchPortal"
            )

            .on(
                "mouseleave.erSearchPortal",
                function() {

                    if (
                        !$input.is(
                            ":focus"
                        )
                    ) {

                        $portal.hide();

                    }

                }
            );


        if (
            typeof options.on_show ===
            "function"
        ) {

            options.on_show();

        }


        if (
            typeof options.on_hide ===
            "function"
        ) {

            $portal

                .off(
                    "hide.erSearchPortal"
                )

                .on(
                    "hide.erSearchPortal",
                    options.on_hide
                );

        }

    };


window.attach_search_portal =
    er_visit_console_utils.attach_search_portal;


// =====================================================
// UTILITY EXPORTS
// =====================================================

window.er_visit_console_utils =
    er_visit_console_utils;
