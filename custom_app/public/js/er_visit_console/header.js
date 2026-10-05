'use strict';


function er_department_message_escape(value) {

    return String(
        value == null
            ? ""
            : value
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function er_department_message_update_badge(
    messages
) {

    const badge =
        document.getElementById(
            "er-department-message-badge"
        );

    if (!badge) {
        return;
    }

    const unread =
        (messages || [])
            .filter(
                function(item) {
                    return !!item.unread;
                }
            )
            .length;

    if (unread > 0) {

        badge.textContent =
            unread > 9
                ? "9+"
                : String(unread);

        badge.style.display =
            "inline-block";

    }
    else {

        badge.style.display =
            "none";

    }

}



function er_department_message_update_window_badges(
    messages
) {

    const rows =
        Array.isArray(messages)
            ? messages
            : [];

    $(".er-department-message-window-button")
        .each(
            function() {

                const button =
                    $(this);

                const department =
                    button.attr(
                        "data-er-department-message-source"
                    )
                    || "";

                const badge =
                    button.find(
                        ".er-department-message-window-badge"
                    );

                if (!badge.length) {
                    return;
                }

                const unread =
                    rows.filter(
                        function(item) {

                            return (
                                !!item.unread
                                &&
                                item.target_department ===
                                    department
                            );

                        }
                    ).length;

                if (unread > 0) {

                    badge.text(
                        unread > 9
                            ? "جديد 9+"
                            : "جديد " + String(unread)
                    );

                    badge.css(
                        "display",
                        "inline-block"
                    );

                }
                else {

                    badge.css(
                        "display",
                        "none"
                    );

                }

            }
        );

}


function init_er_department_message_window_buttons() {

    $(document)
        .off(
            "click.erDepartmentWindowMessages",
            ".er-department-message-window-button"
        );

    $(document)
        .on(
            "click.erDepartmentWindowMessages",
            ".er-department-message-window-button",
            function(e) {

                e.preventDefault();
                e.stopPropagation();

                const department =
                    $(this).attr(
                        "data-er-department-message-source"
                    )
                    || "";

                er_department_message_open_dialog(
                    department
                );

            }
        );

    if (
        !window.__er_department_message_poll_timer
    ) {

        window.__er_department_message_poll_timer =
            setInterval(
                function() {

                    const encounter =
                        window.current_encounter;

                    if (!encounter) {
                        return;
                    }

                    er_department_message_load(
                        encounter,
                        null
                    );

                },
                30000
            );

    }

}


function er_department_message_load(
    encounter,
    on_done
) {

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_er_department_messages",

        args: {
            encounter:
                encounter
        },

        callback:
            function(r) {

                const messages =
                    (
                        r &&
                        r.message
                    )
                    ||
                    [];

                er_department_message_update_badge(
                    messages
                );

                er_department_message_update_window_badges(
                    messages
                );

                if (
                    typeof on_done ===
                    "function"
                ) {

                    on_done(
                        messages
                    );

                }

            }

    });

}


function er_department_message_render_list(
    wrapper,
    messages
) {

    const list =
        wrapper.find(
            ".er-department-message-list"
        );

    if (!list.length) {
        return;
    }

    list.empty();

    if (!messages.length) {

        list.html(
            '<div style="padding:14px;color:#888;text-align:center;">' +
            'لا توجد مراسلات لهذه الزيارة.' +
            '</div>'
        );

        return;

    }

    messages.forEach(
        function(item) {

            const unread_class =
                item.unread
                    ? " er-department-message-unread"
                    : "";

            const unread_badge =
                item.unread
                    ? '<span style="margin-right:6px;padding:2px 7px;border-radius:10px;background:#fff1f0;color:#c62828;font-size:11px;font-weight:700;">جديد</span>'
                    : "";

            const message =
                $(

                    '<div class="er-department-message-item' +
                    unread_class +
                    '" style="padding:10px 12px;border:1px solid #e6e8eb;border-radius:8px;margin-bottom:8px;background:#fff;cursor:pointer;">' +

                        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +

                            '<strong style="font-size:13px;">' +
                                er_department_message_escape(
                                    item.from
                                    || ""
                                ) +
                                " → " +
                                er_department_message_escape(
                                    item.to
                                    || ""
                                ) +
                            '</strong>' +

                            unread_badge +

                        '</div>' +

                        '<div style="font-size:11px;color:#999;margin-top:4px;">' +
                            er_department_message_escape(
                                item.creation
                                || ""
                            ) +
                            " — " +
                            er_department_message_escape(
                                item.user
                                || ""
                            ) +
                        '</div>' +

                        '<div style="white-space:pre-wrap;font-size:13px;margin-top:8px;">' +
                            er_department_message_escape(
                                item.message
                                || ""
                            ) +
                        '</div>' +

                    '</div>'

                );

            message.attr(
                "data-notification",
                item.notification
                    || ""
            );

            list.append(
                message
            );

        }
    );

}



function er_department_message_update_page_buttons() {

    $(
        ".er-department-message-page-button"
    ).each(
        function() {

            const button =
                $(this);

            const department =
                button.attr(
                    "data-er-department"
                );

            const badge =
                button.find(
                    ".er-department-message-page-badge"
                );

            if (
                !department
                ||
                !badge.length
            ) {
                return;
            }

            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_er_department_message_inbox",

                args: {
                    department:
                        department
                },

                callback:
                    function(r) {

                        const data =
                            (
                                r &&
                                r.message
                            )
                            ||
                            {};

                        const count =
                            Number(
                                data.unread_count
                                || 0
                            );

                        if (count > 0) {

                            badge.text(
                                count > 9
                                    ? "جديد 9+"
                                    : "جديد " + count
                            );

                            badge.show();

                        }
                        else {

                            badge.hide();

                        }

                    }

            });

        }
    );

}


function er_department_message_bind_page_button(
    button,
    department
) {

    if (!button) {
        return;
    }

    const $button =
        $(button);

    $button
        .addClass(
            "er-department-message-page-button"
        )
        .attr(
            "data-er-department",
            department
        );

    let badge =
        $button.find(
            ".er-department-message-page-badge"
        );

    if (!badge.length) {

        badge = $(
            '<span class="er-department-message-page-badge" ' +
            'style="' +
            'display:none;' +
            'margin-right:6px;' +
            'padding:2px 7px;' +
            'border-radius:10px;' +
            'background:#fff1f0;' +
            'color:#c62828;' +
            'font-size:10px;' +
            'font-weight:700;' +
            '">' +
            '</span>'
        );

        $button.append(
            badge
        );

    }

    $button.off(
        "click.erDepartmentPageMessage"
    );

    $button.on(
        "click.erDepartmentPageMessage",
        function(e) {

            e.preventDefault();
            e.stopPropagation();

            er_department_message_open_department_inbox(
                department
            );

        }
    );

    er_department_message_update_page_buttons();

}


function er_department_message_open_department_inbox(
    department
) {

    const dialog =
        new frappe.ui.Dialog({

            title:
                "💬 مراسلات الأقسام",

            size:
                "large",

            fields: [
                {
                    fieldname:
                        "body",

                    fieldtype:
                        "HTML"
                }
            ]

        });

    const wrapper =
        dialog.fields_dict
            .body
            .$wrapper;

    wrapper.html(
        `
        <div
            dir="rtl"
            class="er-department-message-page-inbox"
        >

            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:10px;
                    margin-bottom:12px;
                "
            >

                <strong>
                    💬 رسائل القسم
                </strong>

                <button
                    type="button"
                    class="btn btn-secondary btn-sm er-department-inbox-refresh"
                >
                    🔄 تحديث
                </button>

            </div>

            <div
                style="
                    display:flex;
                    gap:8px;
                    margin-bottom:12px;
                "
            >

                <input
                    type="text"
                    class="form-control er-department-new-encounter"
                    placeholder="رقم الزيارة الطبية"
                >

                <button
                    type="button"
                    class="btn btn-primary er-department-new-message"
                    style="white-space:nowrap;"
                >
                    ✉️ رسالة جديدة
                </button>

            </div>

            <div
                class="er-department-inbox-list"
                style="
                    max-height:430px;
                    overflow-y:auto;
                "
            ></div>

        </div>
        `
    );

    function load_inbox() {

        const list =
            wrapper.find(
                ".er-department-inbox-list"
            );

        list.html(
            '<div style="padding:18px;text-align:center;color:#888;">جاري تحميل الرسائل...</div>'
        );

        frappe.call({

            method:
                "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_er_department_message_inbox",

            args: {
                department:
                    department
            },

            callback:
                function(r) {

                    const data =
                        (
                            r &&
                            r.message
                        )
                        ||
                        {};

                    const messages =
                        Array.isArray(
                            data.messages
                        )
                        ?
                        data.messages
                        :
                        [];

                    list.empty();

                    if (!messages.length) {

                        list.html(
                            '<div style="padding:20px;text-align:center;color:#888;">لا توجد مراسلات.</div>'
                        );

                        er_department_message_update_page_buttons();

                        return;
                    }

                    messages.forEach(
                        function(item) {

                            const row =
                                $(
                                    '<div ' +
                                    'style="' +
                                    'padding:12px;' +
                                    'margin-bottom:8px;' +
                                    'border:1px solid #e5e7eb;' +
                                    'border-radius:8px;' +
                                    'cursor:pointer;' +
                                    '">' +
                                    '<div style="display:flex;justify-content:space-between;gap:8px;">' +
                                    '<strong class="er-msg-route"></strong>' +
                                    '<span class="er-msg-unread" style="display:none;padding:2px 7px;border-radius:10px;background:#fff1f0;color:#c62828;font-size:11px;font-weight:700;">جديد</span>' +
                                    '</div>' +
                                    '<div class="er-msg-meta" style="font-size:11px;color:#777;margin-top:4px;"></div>' +
                                    '<div class="er-msg-body" style="font-size:13px;white-space:pre-wrap;margin-top:7px;"></div>' +
                                    '</div>'
                                );

                            row.find(
                                ".er-msg-route"
                            ).text(
                                (
                                    item.from
                                    || ""
                                )
                                +
                                " → "
                                +
                                (
                                    item.to
                                    || ""
                                )
                            );

                            row.find(
                                ".er-msg-meta"
                            ).text(
                                "الزيارة: "
                                +
                                (
                                    item.encounter
                                    || "-"
                                )
                                +
                                " | "
                                +
                                (
                                    item.creation
                                    || ""
                                )
                            );

                            row.find(
                                ".er-msg-body"
                            ).text(
                                item.message
                                || ""
                            );

                            if (
                                item.unread
                            ) {

                                row.find(
                                    ".er-msg-unread"
                                ).show();

                            }

                            row.attr(
                                "data-encounter",
                                item.encounter
                                || ""
                            );

                            row.attr(
                                "data-notification",
                                item.notification
                                || ""
                            );

                            list.append(
                                row
                            );

                        }
                    );

                    er_department_message_update_page_buttons();

                }

        });

    }

    wrapper.on(
        "click",
        ".er-department-inbox-refresh",
        function() {

            load_inbox();

        }
    );

    wrapper.on(
        "click",
        ".er-department-new-message",
        function() {

            const encounter =
                (
                    wrapper.find(
                        ".er-department-new-encounter"
                    ).val()
                    ||
                    ""
                ).trim();

            if (!encounter) {

                frappe.msgprint(
                    "أدخل رقم الزيارة الطبية."
                );

                return;

            }

            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_er_department_message_encounter",

                args: {
                    reference_doctype:
                        "Patient Encounter",
                    reference_name:
                        encounter
                },

                callback:
                    function(r) {

                        const data =
                            (
                                r &&
                                r.message
                            )
                            ||
                            {};

                        if (!data.success) {

                            frappe.msgprint(
                                data.message
                                ||
                                "تعذر العثور على الزيارة."
                            );

                            return;

                        }

                        dialog.hide();

                        er_department_message_open_dialog(
                            department,
                            data.encounter
                        );

                    }

            });

        }
    );

    wrapper.on(
        "click",
        ".er-department-inbox-list > div",
        function() {

            const row =
                $(this);

            const encounter =
                row.attr(
                    "data-encounter"
                );

            const notification =
                row.attr(
                    "data-notification"
                );

            if (!encounter) {
                return;
            }

            function open_message() {

                dialog.hide();

                er_department_message_open_dialog(
                    department,
                    encounter
                );

            }

            if (!notification) {

                open_message();

                return;

            }

            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.er_visit_console.mark_er_department_message_read",

                args: {
                    notification:
                        notification
                },

                callback:
                    function() {

                        er_department_message_update_page_buttons();

                        open_message();

                    }

            });

        }
    );

    dialog.show();

    load_inbox();

}


function er_department_message_open_dialog(
    preferred_source,
    encounter_override
) {

    const encounter =
        encounter_override
        ||
        window.current_encounter;

    if (!encounter) {

        frappe.msgprint({
            title:
                "مراسلات الأقسام",

            message:
                "لا توجد زيارة طبية محددة.",

            indicator:
                "orange"
        });

        return;

    }

    const dialog =
        new frappe.ui.Dialog({

            title:
                "💬 مراسلات الأقسام",

            size:
                "large",

            fields: [
                {
                    fieldname:
                        "message_html",

                    fieldtype:
                        "HTML"
                }
            ]

        });

    const wrapper =
        dialog.fields_dict
            .message_html
            .$wrapper;

    wrapper.html(
        `
        <div
            class="er-department-message-dialog"
            dir="rtl"
        >

            <div
                style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:10px;
                    margin-bottom:12px;
                "
            >

                <div>

                    <label
                        style="
                            display:block;
                            margin-bottom:5px;
                            font-weight:600;
                        "
                    >
                        من القسم
                    </label>

                    <select
                        class="form-control er-department-message-source"
                    ></select>

                </div>

                <div>

                    <label
                        style="
                            display:block;
                            margin-bottom:5px;
                            font-weight:600;
                        "
                    >
                        إلى القسم
                    </label>

                    <select
                        class="form-control er-department-message-target"
                    ></select>

                </div>

            </div>

            <div
                style="
                    margin-bottom:12px;
                "
            >

                <label
                    style="
                        display:block;
                        margin-bottom:5px;
                        font-weight:600;
                    "
                >
                    الملاحظة / الرسالة
                </label>

                <textarea
                    class="form-control er-department-message-text"
                    rows="4"
                    placeholder="اكتب الملاحظة التي تريد إرسالها إلى القسم الآخر..."
                ></textarea>

            </div>

            <div
                style="
                    display:flex;
                    justify-content:flex-start;
                    margin-bottom:14px;
                "
            >

                <button
                    type="button"
                    class="btn btn-primary er-department-message-send"
                >
                    📤 إرسال الرسالة
                </button>

            </div>

            <div
                style="
                    font-weight:700;
                    margin-bottom:8px;
                    border-bottom:1px solid #e6e8eb;
                    padding-bottom:7px;
                "
            >
                💬 سجل المراسلات
            </div>

            <div
                class="er-department-message-list"
                style="
                    max-height:340px;
                    overflow-y:auto;
                "
            >
                <div
                    style="
                        padding:14px;
                        color:#888;
                        text-align:center;
                    "
                >
                    جاري تحميل المراسلات...
                </div>
            </div>

        </div>
        `
    );

    function render_target_options() {

        const source =
            wrapper.find(
                ".er-department-message-source"
            ).val();

        const target =
            wrapper.find(
                ".er-department-message-target"
            );

        target.empty();

        (
            dialog.__er_department_context &&
            dialog.__er_department_context.departments
                ? dialog.__er_department_context.departments
                : []
        )
        .forEach(
            function(item) {

                if (
                    item.value ===
                    source
                ) {
                    return;
                }

                target.append(
                    $("<option>")
                        .val(item.value)
                        .text(item.label)
                );

            }
        );

    }

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_visit_console.er_visit_console.get_er_department_context",

        args: {
            encounter:
                encounter
        },

        callback:
            function(r) {

                const context =
                    r &&
                    r.message
                        ? r.message
                        : {};

                dialog.__er_department_context =
                    context;

                const departments =
                    context.departments
                    || [];

                const source =
                    wrapper.find(
                        ".er-department-message-source"
                    );

                source.empty();

                departments.forEach(
                    function(item) {

                        source.append(
                            $("<option>")
                                .val(item.value)
                                .text(item.label)
                        );

                    }
                );

                const preferred_available =
                    preferred_source
                    &&
                    departments.some(
                        function(item) {
                            return (
                                item.value ===
                                preferred_source
                            );
                        }
                    );

                if (preferred_available) {

                    source.val(
                        preferred_source
                    );

                }
                else if (
                    departments.some(
                        function(item) {
                            return item.value === "emergency";
                        }
                    )
                ) {

                    source.val(
                        "emergency"
                    );

                }
                else if (
                    departments.length
                ) {

                    source.val(
                        departments[0].value
                    );

                }

                render_target_options();

                er_department_message_load(
                    encounter,
                    function(messages) {

                        er_department_message_render_list(
                            wrapper,
                            messages
                        );

                    }
                );

            }

    });

    wrapper.on(
        "change",
        ".er-department-message-source",
        function() {

            render_target_options();

        }
    );

    wrapper.on(
        "click",
        ".er-department-message-send",
        function() {

            const source =
                wrapper.find(
                    ".er-department-message-source"
                ).val();

            const target =
                wrapper.find(
                    ".er-department-message-target"
                ).val();

            const message =
                (
                    wrapper.find(
                        ".er-department-message-text"
                    ).val()
                    ||
                    ""
                )
                .trim();

            if (!source || !target) {

                frappe.msgprint(
                    "حدد القسم المرسل والقسم المستلم."
                );

                return;

            }

            if (!message) {

                frappe.msgprint(
                    "اكتب الرسالة أولًا."
                );

                return;

            }

            const button =
                wrapper.find(
                    ".er-department-message-send"
                );

            button.prop(
                "disabled",
                true
            );

            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.er_visit_console.send_er_department_message",

                args: {

                    encounter:
                        encounter,

                    source_department:
                        source,

                    target_department:
                        target,

                    message:
                        message

                },

                freeze:
                    true,

                freeze_message:
                    "جاري إرسال الرسالة...",

                callback:
                    function(r) {

                        button.prop(
                            "disabled",
                            false
                        );

                        if (
                            r &&
                            r.message &&
                            r.message.success
                        ) {

                            wrapper.find(
                                ".er-department-message-text"
                            ).val(
                                ""
                            );

                            frappe.show_alert(
                                {
                                    message:
                                        r.message.message
                                        ||
                                        "تم إرسال الرسالة.",
                                    indicator:
                                        "green"
                                }
                            );

                            er_department_message_load(
                                encounter,
                                function(messages) {

                                    er_department_message_render_list(
                                        wrapper,
                                        messages
                                    );

                                }
                            );

                        }
                        else {

                            frappe.msgprint({
                                title:
                                    "مراسلات الأقسام",

                                message:
                                    "تعذر إرسال الرسالة.",

                                indicator:
                                    "red"
                            });

                        }

                    }

            });

        }
    );

    wrapper.on(
        "click",
        ".er-department-message-item",
        function() {

            const notification =
                $(this).attr(
                    "data-notification"
                );

            if (!notification) {
                return;
            }

            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.er_visit_console.mark_er_department_message_read",

                args: {
                    notification:
                        notification
                },

                callback:
                    function() {

                        er_department_message_load(
                            encounter,
                            function(messages) {

                                er_department_message_render_list(
                                    wrapper,
                                    messages
                                );

                            }
                        );

                    }

            });

        }
    );

    dialog.show();

}


function init_er_department_messages() {

    const button =
        document.getElementById(
            "er-department-message-button"
        );

    if (!button) {
        return;
    }

    $(document).off(
        "click.erDepartmentMessages",
        "#er-department-message-button"
    );

    $(document).on(
        "click.erDepartmentMessages",
        "#er-department-message-button",
        function(e) {

            e.preventDefault();
            e.stopPropagation();

            er_department_message_open_dialog();

        }
    );

    init_er_department_message_window_buttons();

    er_department_message_load(
        window.current_encounter,
        null
    );

}


function init_er_notifications() {

    const btn = document.getElementById('er-notification-button');

    const panel = document.getElementById('er-notification-panel');

    const badge = document.getElementById('er-notification-badge');

    const list = document.getElementById('er-notification-list');


    if (!btn || !panel) {

        return;

    }


    $(document).off('click.erVisitNotifications', '#er-notification-button');

    $(document).off('click.erVisitNotificationsClose');

    $(document).off('click.erVisitNotificationsPanel', '#er-notification-panel');


    $(document).on('click.erVisitNotifications', '#er-notification-button', function(e) {

        e.stopPropagation();

        const isOpen = panel.style.display === 'block';

        panel.style.display = isOpen ? 'none' : 'block';

        if (!isOpen) {

            panel.style.opacity = '0';

            panel.style.transform = 'translateY(-8px)';

            panel.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

            requestAnimationFrame(function() {

                panel.style.opacity = '1';

                panel.style.transform = 'translateY(0)';

            });

            load_er_notifications();

        }

    });


    $(document).on('click.erVisitNotificationsPanel', '#er-notification-panel', function(e) {

        e.stopPropagation();

    });


    $(document).off('click.erVisitNotificationsClose', '#er-notification-close');

    $(document).on('click.erVisitNotificationsClose', '#er-notification-close', function(e) {

        e.preventDefault();

        e.stopPropagation();

        panel.style.display = 'none';

    });


    $(document).off('click.erVisitNotificationsCloseOutside');

    $(document).on('click.erVisitNotificationsCloseOutside', function(e) {

        if (!$(e.target).closest('#er-notification-button, #er-notification-panel').length) {

            panel.style.display = 'none';

        }

    });

}


function load_er_notifications() {

    const encounter = window.current_encounter;

    if (!encounter) {

        return;

    }


    const list = document.getElementById('er-notification-list');

    if (!list) {

        return;

    }


    list.innerHTML = '<div style="padding: 12px 14px; color: #999;">جاري تحميل الإشعارات...</div>';


    frappe.call({

        method: 'custom_app.emergency_management.page.er_visit_console.er_visit_console.get_activity_timeline',

        args: { encounter: encounter, category: '' },

        callback: function(r) {

            const items = (r.message && r.message.activities) || [];

            const badge = document.getElementById('er-notification-badge');


            if (badge) {

                if (items.length > 0) {

                    badge.textContent = items.length > 9 ? '9+' : String(items.length);

                    badge.style.display = 'inline-block';

                } else {

                    badge.style.display = 'none';

                }

            }


            list.innerHTML = '';


            if (!items.length) {

                list.innerHTML = '<div style="padding: 12px 14px; color: #999;">لا توجد إشعارات جديدة</div>';

                return;

            }


            items.slice(0, 5).forEach(function(item) {

                const div = document.createElement('div');

                div.className = 'er-notification-item';

                div.style.cssText = 'padding: 8px 14px; border-bottom: 1px solid #f5f5f5; display: flex; align-items: flex-start; gap: 8px;';

                div.innerHTML = '<span style="font-size: 16px;">' + (item.icon || '📌') + '</span>' +

                    '<div style="flex: 1;">' +

                    '<div style="font-weight: 600; font-size: 13px;">' + (item.title || '') + '</div>' +

                    '<div style="font-size: 12px; color: #666; margin-top: 2px;">' + (item.content || '') + '</div>' +

                    '<div style="font-size: 11px; color: #999; margin-top: 2px;">' + (item.time || '') + '</div>' +

                    '</div>';

                list.appendChild(div);

            });


            if (items.length > 5) {

                const more = document.createElement('div');

                more.style.cssText = 'padding: 8px 14px; text-align: center; color: #126e35; font-size: 12px; font-weight: 600; cursor: pointer;';

                more.textContent = 'عرض كل الأنشطة (' + items.length + ')';

                list.appendChild(more);

            }

        }

    });

}
