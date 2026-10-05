frappe.pages['er_bed_dashboard'].on_page_load = function(wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'لوحة الأسرة',
        single_column: true
    });


    $(wrapper).find(".layout-main-section").html(`

        <div class="er-bed-dashboard">

            <div class="bed-header" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;position:relative;">

                <h2 style="margin:0;">
                    لوحة متابعة الأسرة
                </h2>


                <div style="display:flex;align-items:center;gap:10px;">

                    <button
                        type="button"
                        id="er-bed-refresh"
                        style="
                            background:#fff;
                            border:1px solid #ddd;
                            border-radius:8px;
                            padding:6px 12px;
                            cursor:pointer;
                            font-size:14px;
                        "
                    >
                        🔄 تحديث
                    </button>


                    <button
                        type="button"
                        id="er-bed-notification-bell"
                        style="
                            background:#fff;
                            border:1px solid #ddd;
                            border-radius:8px;
                            padding:6px 12px;
                            cursor:pointer;
                            font-size:14px;
                            position:relative;
                            display:inline-flex;
                            align-items:center;
                            gap:6px;
                        "
                    >

                        🔔 الإشعارات
                        <span
                            id="er-bed-notification-badge"
                            style="
                                display:none;
                                background:#d9534f;
                                color:#fff;
                                border-radius:4px;
                                padding:2px 6px;
                                font-size:12px;
                            "
                        >0</span>

                    </button>


                    <div
                        id="er-bed-notification-panel"
                        style="
                            display:none;
                            position:absolute;
                            right:10px;
                            top:50px;
                            width:360px;
                            max-height:420px;
                            overflow-y:auto;
                            background:#fff;
                            border:1px solid #eee;
                            border-radius:8px;
                            padding:8px;
                            z-index:200;
                            box-shadow:0 4px 12px rgba(0,0,0,.08);
                            direction:rtl;
                        "
                    ></div>

                </div>

            </div>


            <div id="beds-container" class="beds-container"></div>

        </div>

    `);


    load_er_bed_notifications();


    $("#er-bed-refresh").on(
        "click",
        function() {
            const btn = $(this);
            const original = btn.html();
            btn.prop("disabled", true);
            btn.html("⏳ جاري التحديث...");
            frappe.call({
                method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_beds",
                callback: function(r) {
                    btn.prop("disabled", false);
                    btn.html(original);
                    if (!r.message) {
                        frappe.msgprint({
                            title: "تحديث",
                            message: "تعذر تحميل بيانات الأسرة.",
                            indicator: "orange"
                        });
                        return;
                    }
                    const beds = r.message;
                    const groups = group_beds_by_area(beds);
                    let html = render_room_sections(groups);
                    $("#beds-container").html(html);
                    update_bed_notification_badges(window.er_bed_notifications_data);
                    bind_bed_actions();
                    load_er_bed_notifications();
                },
                error: function() {
                    btn.prop("disabled", false);
                    btn.html(original);
                    frappe.msgprint({
                        title: "تحديث",
                        message: "خطأ في الاتصال بالخادم.",
                        indicator: "red"
                    });
                }
            });
        }
    );


    $("#er-bed-notification-bell").on(
        "click",
        function(e) {

            e.stopPropagation();


            const panel =
                $("#er-bed-notification-panel");


            if (!panel.length) {

                return;

            }


            if (panel.is(":visible")) {

                panel.hide();

            } else {

                panel.show();

                load_er_bed_notifications();

            }

        }
    );


    $("#er-bed-notification-panel").on(
        "click",
        "a",
        function() {

            $("#er-bed-notification-panel").hide();

        }
    );


    $(document).on(
        "click",
        function() {

            $("#er-bed-notification-panel").hide();

        }
    );


    function load_er_bed_notifications() {

        if (!frappe.session.user) {

            return;

        }


        frappe.call({

            method:
                "custom_app.emergency_management.api.service_requests.get_er_notifications",

            callback:
                function(r) {

                    if (!r.message) {

                        return;

                    }


                    const data =
                        r.message;


                    const badge =
                        $("#er-bed-notification-badge");


                    if (
                        data.unread
                        &&
                        data.unread > 0
                    ) {

                        badge.text(
                            data.unread
                        );

                        badge.show();

                    } else {

                        badge.hide();

                    }


                    const panel =
                        $("#er-bed-notification-panel");


                    if (!panel.length) {

                        return;

                    }


                    let html =
                        "";


                    html +=
                        build_er_bed_notification_section(
                            "العلامات الحيوية",
                            data.vital_signs,
                            "/app/er-bed-dashboard"
                        );

                    html +=
                        build_er_bed_notification_section(
                            "المختبر",
                            data.laboratory,
                            "/app/er-laboratory"
                        );

                    html +=
                        build_er_bed_notification_section(
                            "الأشعة",
                            data.radiology,
                            "/app/er-visit-console"
                        );

                    html +=
                        build_er_bed_notification_section(
                            "الخروج",
                            data.discharge,
                            "/app/er-visit-console"
                        );

                    html +=
                        build_er_bed_notification_section(
                            "التنويم",
                            data.admission,
                            "/app/er-admission-request"
                        );


                    if (!html) {

                        html =
                            "<p>لا توجد إشعارات حالياً.</p>";

                    }


                    panel.html(
                        html
                    );


                    window.er_bed_notifications_data =
                        data;

                    update_bed_notification_badges(
                        data
                    );

                }

        });

    }


    function build_er_bed_notification_section(
        title,
        items,
        default_link
    ) {

        if (
            !items
            ||
            !items.length
        ) {

            return "";

        }


        let html =
            '<details open>';


        html +=
            '<summary><strong>'
            +
            title
            +
            ' ('
            +
            items.length
            +
            ')</strong></summary>';


        html +=
            '<ul style="padding-right:18px;">';


        items.forEach(
            function(item) {

                let link =
                    item.link
                    ||
                    default_link
                    ||
                    "#";


                html +=
                    '<li style="margin-bottom:6px;">'
                    +
                    '<a href="'
                    +
                    link
                    +
                    '" style="color:#337ab7;text-decoration:none;">'
                    +
                    (item.message || item.name || "إشعار")
                    +
                    '</a>';


                if (
                    item.patient_name
                    &&
                    item.bed_name
                ) {

                    html +=
                        '<br><small>'
                        +
                        item.patient_name
                        +
                        ' - '
                        +
                        item.bed_name
                        +
                        '</small>';

                } else if (
                    item.patient_name
                ) {

                    html +=
                        '<br><small>'
                        +
                        item.patient_name
                        +
                        '</small>';

                }


                html +=
                    '</li>';

            }
        );


        html +=
            '</ul></details><hr>';


        return html;

    }


    function update_bed_notification_badges(
        notifications
    ) {

        if (
            !notifications
        ) {

            return;

        }


        const counts =
            {};


        [
            notifications.vital_signs,
            notifications.laboratory,
            notifications.radiology,
            notifications.discharge,
            notifications.admission
        ].forEach(
            function(items) {

                (items || []).forEach(
                    function(item) {

                        const bed_name =
                            item.bed
                            ||
                            item.bed_name;


                        if (
                            !bed_name
                        ) {

                            return;

                        }


                        counts[bed_name] =
                            (
                                counts[bed_name]
                                ||
                                0
                            ) + 1;

                    }
                );

            }
        );


        Object.keys(
            counts
        ).forEach(
            function(bed_name) {

                const badge =
                    $(`.bed-patient-notification-badge[data-bed="${bed_name}"]`);


                if (!badge.length) {

                    return;

                }


                badge.text(
                    counts[bed_name]
                );


                if (
                    counts[bed_name] > 0
                ) {

                    badge.attr(
                        "data-count",
                        counts[bed_name]
                    );

                    badge.show();

                } else {

                    badge.removeAttr(
                        "data-count"
                    );

                    badge.hide();

                }

            }
        );


        // إخفاء الشارات التي لم تعد لها إشعارات
        document.querySelectorAll(
            ".bed-patient-notification-badge[data-bed]"
        ).forEach(
            function(el) {

                const bed_name =
                    el.getAttribute(
                        "data-bed"
                    );


                if (
                    !counts[bed_name]
                ) {

                    $(el).removeAttr(
                        "data-count"
                    ).hide();

                }

            }
        );

    }


    load_beds();


    window.addEventListener(
        "storage",
        function(e) {

            if (
                e.key ===
                "er_bed_dashboard_refresh"
            ) {

                if (
                    typeof load_beds ===
                    "function"
                ) {

                    load_beds();

                }

            }

        }
    );



    function format_vital_time(recorded_time) {
        if (!recorded_time) return "---";
        try {
            const s = (typeof recorded_time === "string" ? recorded_time : String(recorded_time)).replace(" ", "T").replace(/\.\d+$/, "");
            const d = new Date(s);
            if (isNaN(d.getTime())) return recorded_time;
            return d.toLocaleString();
        } catch (e) {
            return recorded_time;
        }
    }

    function render_bed_card(bed) {
        const isOccupied = !!bed.patient;
        const cardClass = isOccupied ? "bed-card OCCUPIED" : "bed-card AVAILABLE";
        const accent = bed.triage_color || "#5a7ea8";

        function lightenColor(hex, alpha) {
            hex = hex.replace("#", "");
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
        }

        // مؤشر موعد العلامات الحيوية — يعتمد على حقل Vital Signs.next_vital_due الموجود
        let indicator = "";
        if (isOccupied && bed.vital_due_state) {
            const cls = bed.vital_due_state === "overdue"
                ? "next-vital-indicator overdue"
                : "next-vital-indicator";
            const title = bed.vital_due_label || "موعد العلامات الحيوية";
            indicator = '<span class="' + cls + '" title="' + title + '" data-bed="' + bed.id + '">\u23F0</span>';
        }

        // مؤشر طلب تنويم معلق لهذا السرير
        let admissionIndicator = "";
        if (bed.pending_admission) {
            admissionIndicator = '<span class="admission-pending-indicator" title="مريض جديد — بانتظار قبول الترقيد">⏳</span>';
        }

        // صف إشعار خاص بهذا المريض فقط — مرئي دائماً عند وجود عدد
        const badge = isOccupied
            ? '<span class="bed-patient-notification-badge" data-bed="' + bed.id + '"></span>'
            : "";

        const tint = accent && isOccupied ? lightenColor(accent, 0.18) : "";
        const style = tint
            ? '--triage-color:' + accent + ';border-right-color:' + accent + ';background:' + tint + ';'
            : '';

        let meta = "";
        if (isOccupied) {
            let triageLine = "";
            if (bed.triage_level) {
                triageLine = '<div class="triage-info"><span class="triage-dot" style="background:' + accent + ';"></span>' + (bed.triage_level || "") + '</div>';
            }
            let vitalLine = "";
            if (bed.vital_signs && Object.keys(bed.vital_signs).length) {
                vitalLine = '<div class="bed-sub last-vital">آخر قراءة: ' + format_vital_time(bed.vital_signs.recorded_time) + '</div>';
            }
            meta = '<div class="patient-info">' + (bed.patient_name || "") + '</div>'
                + '<div class="bed-sub intake-ref">' + (bed.intake || "") + '</div>'
                + triageLine
                + vitalLine;
        } else {
            meta = '<div class="empty-bed">سرير متاح</div>';
        }

        // أزرار مرائحة (تظهر بالـ hover أو بالـ tap) — مركّزة ومصفوفة لبطاقة واحدة فقط
        let actions = "";
        if (isOccupied) {
            let buttons = [];
            buttons.push('<button type="button" class="btn btn-sm bed-action-btn new-vitals-btn" data-bed="' + bed.id + '">علامات حيوية جديدة</button>');
            buttons.push('<button type="button" class="btn btn-sm bed-action-btn prev-vitals-btn" data-bed="' + bed.id + '">العلامات الحيوية السابقة</button>');
            buttons.push('<button type="button" class="btn btn-sm bed-action-btn history-btn" data-bed="' + bed.id + '">التاريخ الطبي</button>');
            buttons.push('<button type="button" class="btn btn-sm bed-action-btn open-visit-btn" data-bed="' + bed.id + '">فتح زيارة الطوارئ</button>');

            if (bed.can_admit_inpatient && !bed.has_active_inpatient) {
                buttons.push('<button type="button" class="btn btn-sm bed-action-btn admission-btn" data-bed="' + bed.id + '">ترقيد</button>');
            }

            if (bed.has_active_inpatient) {
                buttons.push('<button type="button" class="btn btn-sm bed-action-btn ip-transfer-btn" data-bed="' + bed.id + '">تحويل داخلي</button>');
                buttons.push('<button type="button" class="btn btn-sm bed-action-btn external-transfer-btn" data-bed="' + bed.id + '">تحويل خارجي</button>');
                buttons.push('<button type="button" class="btn btn-sm bed-action-btn ip-discharge-btn" data-bed="' + bed.id + '">خروج المريض</button>');
            } else {
                buttons.push('<button type="button" class="btn btn-sm bed-action-btn er-transfer-btn" data-bed="' + bed.id + '">تحويل داخلي</button>');
                buttons.push('<button type="button" class="btn btn-sm bed-action-btn er-discharge-btn" data-bed="' + bed.id + '">خروج المريض</button>');
            }

            actions = '<div class="bed-actions">' + buttons.join('') + '</div>';
        }

        const svg = '<svg class="bed-svg" viewBox="0 0 120 44" aria-label="سرير">'
            + '<rect class="bed-headboard" x="6" y="10" width="12" height="10" rx="2"/>'
            + '<rect class="bed-mattress" x="20" y="18" width="88" height="14" rx="6"/>'
            + '<line class="bed-side-rail" x1="12" y1="12" x2="18" y2="12"/>'
            + '<line class="bed-leg" x1="20" y1="32" x2="20" y2="38"/>'
            + '<line class="bed-leg" x1="100" y1="32" x2="100" y2="38"/>'
            + '</svg>';

        return '<div class="' + cardClass + '" data-bed="' + bed.id + '" data-status="' + (bed.status || "") + '" data-is-available="' + (bed.is_available ? 1 : 0) + '" data-is-occupied="' + (bed.current_patient ? 1 : 0) + '" style="' + style + '">'
            + '<div class="bed-top">' + indicator + admissionIndicator + svg + '<div class="bed-title"><span class="bed-name">' + (bed.arabic_name || bed.bed_code || "") + '</span>' + badge + '</div></div>'
            + '<div class="bed-meta">' + meta + '</div>'
            + actions
            + '</div>';
    }

    function load_beds() {
        frappe.call({
            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_beds",
            callback: function(r) {
                if (!r.message) {
                    frappe.msgprint({
                        title: "لوحة الأسرة",
                        message: "تعذر تحميل بيانات الأسرة.",
                        indicator: "orange"
                    });
                    return;
                }
                const beds = r.message;
                const groups = group_beds_by_area(beds);
                let html = render_room_sections(groups);
                $("#beds-container").html(html);
                update_bed_notification_badges(window.er_bed_notifications_data);
                bind_bed_actions();
            },
            error: function() {
                frappe.msgprint({
                    title: "لوحة الأسرة",
                    message: "خطأ في الاتصال بالخادم.",
                    indicator: "red"
                });
            }
        });
    }

    function group_beds_by_area(beds) {
        const groups = {};
        beds.forEach(function(bed) {
            const area = bed.waiting_area_label || bed.current_location_label || "عام";
            if (!groups[area]) {
                groups[area] = [];
            }
            groups[area].push(bed);
        });
        Object.keys(groups).forEach(function(area) {
            groups[area].sort(function(a, b) {
                const nameA = (a.arabic_name || a.bed_code || a.name || "").toLowerCase();
                const nameB = (b.arabic_name || b.bed_code || b.name || "").toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });
        });
        return groups;
    }

    function render_room_sections(groups) {
        let html = "";
        Object.keys(groups).sort().forEach(function(area_name) {
            const beds = groups[area_name];
            const occupied = beds.filter(function(b) { return !!b.patient; }).length;
            const available = beds.length - occupied;
            const collapsed = occupied === 0 ? ' style="display:none;"' : '';
            html += '<div class="room-section" data-area="' + area_name + '">';
            html += '<div class="room-header" onclick="window._toggleRoomSection(this)">';
            html += '<div class="room-header-left">';
            html += '<span class="room-toggle-icon">' + (occupied === 0 ? '▸' : '▾') + '</span>';
            html += '<span class="room-name">' + area_name + '</span>';
            html += '</div>';
            html += '<div class="room-header-right">';
            html += '<span class="room-counts">' + beds.length + ' سرير | ' + occupied + ' مشغول | ' + available + ' متاح</span>';
            html += '</div>';
            html += '</div>';
            html += '<div class="room-beds"' + collapsed + '>';
            beds.forEach(function(bed) {
                html += render_bed_card(bed);
            });
            html += '</div>';
            html += '</div>';
        });
        return html;
    }

    window._toggleRoomSection = function(header) {
        const section = $(header).closest(".room-section");
        const beds = section.find(".room-beds");
        const icon = $(header).find(".room-toggle-icon");
        if (beds.is(":visible")) {
            beds.slideUp(150);
            icon.text("▸");
        } else {
            beds.slideDown(150);
            icon.text("▾");
        }
    };

    function bind_bed_actions() {
        const container = $("#beds-container");

        container.off("click.bedActions").on("click.bedActions", ".bed-action-btn", function(e) {
            e.preventDefault();
            e.stopPropagation();
            const bed_name = $(this).data("bed");
            if (!bed_name) return;
            if ($(this).hasClass("new-vitals-btn")) {
                open_new_vitals_dialog(bed_name);
            } else if ($(this).hasClass("prev-vitals-btn")) {
                open_previous_vitals_dialog(bed_name);
            } else if ($(this).hasClass("history-btn")) {
                open_history_dialog(bed_name);
            } else if ($(this).hasClass("open-visit-btn")) {
                open_er_visit_for_bed(bed_name);
            } else if ($(this).hasClass("admission-btn")) {
                open_admission_for_bed(bed_name);
            } else if ($(this).hasClass("er-transfer-btn")) {
                open_er_internal_transfer_dialog(bed_name);
            } else if ($(this).hasClass("ip-transfer-btn")) {
                open_inpatient_internal_transfer_dialog(bed_name);
            } else if ($(this).hasClass("external-transfer-btn")) {
                open_external_transfer_dialog(bed_name);
            } else if ($(this).hasClass("er-discharge-btn")) {
                open_er_discharge_dialog(bed_name);
            } else if ($(this).hasClass("ip-discharge-btn")) {
                open_inpatient_discharge_dialog(bed_name);
            }
        });

        container.off("click.bedCardTap").on("click.bedCardTap", ".bed-card", function(e) {
            if ($(e.target).closest(".bed-actions").length) return;
            if ($(e.target).closest(".next-vital-indicator").length) return;
            const card = $(this);
            const bed_name = card.data("bed");
            const card_data = card.data();
            if (!bed_name) return;
            if (window._bedClickTimer && window._bedClickBed === bed_name) {
                clearTimeout(window._bedClickTimer);
                window._bedClickTimer = null;
                window._bedClickBed = null;
                const is_available = (typeof card_data.isAvailable !== "undefined") ? !!card_data.isAvailable : (typeof card_data.is_available !== "undefined") ? !!card_data.is_available : null;
                const is_occupied = (typeof card_data.isOccupied !== "undefined") ? !!card_data.isOccupied : (typeof card_data.is_occupied !== "undefined") ? !!card_data.is_occupied : null;
                if (!card.find(".patient-info").length || is_available === true || is_occupied === false) {
                    open_empty_bed_assignment_dialog(bed_name);
                } else {
                    open_patient_action_dialog(bed_name);
                }
            } else {
                window._bedClickBed = bed_name;
                window._bedClickTimer = setTimeout(function() {
                    open_bed_details_dialog(bed_name);
                    window._bedClickTimer = null;
                    window._bedClickBed = null;
                }, 280);
            }
        });

        container.off("click.vitalIndicator").on("click.vitalIndicator", ".next-vital-indicator", function(e) {
            e.preventDefault();
            e.stopPropagation();
            const bed_name = $(this).data("bed");
            if (!bed_name) return;
            open_new_vitals_dialog(bed_name);
        });
    }

    // ---------- تفاصيل السرير عند النقر المفرد ----------
    function open_bed_details_dialog(bed_name) {
        frappe.call({
            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
            args: { bed_name: bed_name },
            callback: function(r) {
                if (!r.message) return;
                const data = r.message;
                let html = '<div style="direction:rtl;padding:8px;">';
                html += '<h3 style="margin-top:0;">تفاصيل السرير: ' + (data.bed_name || bed_name) + '</h3>';
                html += '<table class="table table-bordered table-sm" style="width:100%;">';
                html += '<tr><td><b>المريض</b></td><td>' + (data.patient_name || "---") + '</td></tr>';
                html += '<tr><td><b>رقم المريض</b></td><td>' + (data.patient || "---") + '</td></tr>';
                html += '<tr><td><b>زيارة الطوارئ</b></td><td>' + (data.er_patient_intake || "---") + '</td></tr>';
                html += '<tr><td><b>السرير الحالي</b></td><td>' + (data.bed_name || "---") + '</td></tr>';
                html += '<tr><td><b>منطقة الانتظار</b></td><td>' + (data.waiting_area || "---") + '</td></tr>';
                html += '<tr><td><b>الموقع الحالي</b></td><td>' + (data.current_location || "---") + '</td></tr>';
                html += '<tr><td><b>الفرز</b></td><td>' + (data.triage_level || "---") + '</td></tr>';
                html += '<tr><td><b>الحالة</b></td><td>' + (data.status || "---") + '</td></tr>';
                html += '<tr><td><b>الزيارة الطبية</b></td><td>' + (data.patient_encounter || "---") + '</td></tr>';
                html += '<tr><td><b>الطبيب</b></td><td>' + (data.assigned_doctor || "---") + '</td></tr>';
                html += '<tr><td><b>الممرض</b></td><td>' + (data.assigned_nurse || "---") + '</td></tr>';
                if (data.vital_signs && Object.keys(data.vital_signs).length) {
                    html += '<tr><td colspan="2"><b>آخر العلامات الحيوية</b></td></tr>';
                    html += '<tr><td>الوقت</td><td>' + (data.vital_signs.recorded_time || "---") + '</td></tr>';
                    html += '<tr><td>الحرارة</td><td>' + (data.vital_signs.temperature || "---") + '</td></tr>';
                    html += '<tr><td>النبض</td><td>' + (data.vital_signs.heart_rate || "---") + '</td></tr>';
                    html += '<tr><td>الضغط</td><td>' + (data.vital_signs.systolic_bp || "---") + '/' + (data.vital_signs.diastolic_bp || "---") + '</td></tr>';
                    html += '<tr><td>SpO2</td><td>' + (data.vital_signs.spo2 || "---") + '</td></tr>';
                }
                if (data.patient_inpatient_record) {
                    html += '<tr><td><b>سجل الإقامة</b></td><td>' + data.patient_inpatient_record + '</td></tr>';
                    html += '<tr><td><b>الوحدة الحالية</b></td><td>' + (data.service_unit || "---") + '</td></tr>';
                }
                html += '</table>';
                html += '</div>';
                const d = new frappe.ui.Dialog({
                    title: "تفاصيل السرير - " + (data.patient_name || ""),
                    fields: [{ fieldtype: "HTML", options: html }]
                });
                d.show();
            }
        });
    }

    // ---------- نافذة العلامات الحيوية الجديدة ----------
    function open_new_vitals_dialog(bed_name) {
        frappe.call({
            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
            args: { bed_name: bed_name },
            callback: function(r) {
                if (!r.message) return;
                const data = r.message;
                const d = new frappe.ui.Dialog({
                    title: "علامات حيوية جديدة - " + (data.patient_name || ""),
                    fields: [
                        { fieldtype: "Float", fieldname: "temperature", label: "الحرارة (°C)", columns: 6 },
                        { fieldtype: "Int", fieldname: "heart_rate", label: "النبض", columns: 6 },
                        { fieldtype: "Int", fieldname: "systolic_bp", label: "الضغط الانقباصي", columns: 6 },
                        { fieldtype: "Int", fieldname: "diastolic_bp", label: "الضغط الانبساطي", columns: 6 },
                        { fieldtype: "Int", fieldname: "respiratory_rate", label: "معدل التنفس", columns: 6 },
                        { fieldtype: "Float", fieldname: "spo2", label: "SpO2 %", columns: 6 },
                        { fieldtype: "Int", fieldname: "pain_score", label: "درجة الألم", columns: 6 },
                        { fieldtype: "Float", fieldname: "blood_glucose", label: "السكر", columns: 6 },
                        { fieldtype: "Select", fieldname: "consciousness", label: "الوعي", options: "Alert\nConfused\nDrowsy\nUnresponsive", columns: 6 },
                        { fieldtype: "Small Text", fieldname: "notes", label: "ملاحظات" }
                    ]
                });
                d.set_primary_action("حفظ", function() {
                    const values = d.get_values();
                    frappe.call({
                        method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.save_vital_signs",
                        args: { bed_name: bed_name, data: values },
                        callback: function(res) {
                            if (res.exc) {
                                frappe.msgprint("خطأ في حفظ العلامات الحيوية.");
                                return;
                            }
                            frappe.show_alert({ message: "تم حفظ العلامات الحيوية.", indicator: "green" }, 3000);
                            d.hide();
                            load_beds();
                            load_er_bed_notifications();
                        }
                    });
                });
                d.show();
            }
        });
    }


    // ---------- نافذة إجراءات المريض المتحكم بها عند النقر المزدوج ----------
    function open_patient_action_dialog(bed_name) {
        frappe.call({
            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
            args: { bed_name: bed_name },
            callback: function(r) {
                if (!r.message) {
                    frappe.msgprint({ title: "إجراءات المريض", message: "تعذر تحميل بيانات السرير.", indicator: "orange" });
                    return;
                }
                const data = r.message;
                if (!data.patient) {
                    frappe.msgprint({ title: "إجراءات المريض", message: "لا يوجد مريض في السرير.", indicator: "orange" });
                    return;
                }

                const patient = data.patient;
                const patient_name = data.patient_name || patient;
                const intake = data.intake || "";
                const encounter = data.patient_encounter || "";
                const triage = data.triage_record || "";
                const triage_level = data.triage_level || "";
                const current_bed = data.bed_name || bed_name;
                const current_area = data.waiting_area || data.current_location || "";
                const inpatient_record = data.patient_inpatient_record || "";
                const has_inpatient = !!inpatient_record;

                let actionOptions = [];
                if (!has_inpatient) {
                    actionOptions.push({ value: "admission", label: "🏥 تنويم" });
                    actionOptions.push({ value: "er_discharge", label: "🚪 خروج" });
                    actionOptions.push({ value: "er_transfer", label: "🔄 تحويل داخلي" });
                } else {
                    actionOptions.push({ value: "ip_transfer", label: "🔄 تحويل داخلي" });
                    actionOptions.push({ value: "external_transfer", label: "🚑 تحويل خارجي" });
                    actionOptions.push({ value: "ip_discharge", label: "🚪 خروج" });
                }

                const d = new frappe.ui.Dialog({
                    title: "إجراءات المريض — " + patient_name,
                    fields: [
                        { fieldtype: "Data", fieldname: "patient_display", label: "المريض", default: patient_name, read_only: 1 },
                        { fieldtype: "Data", fieldname: "intake_display", label: "زيارة الطوارئ", default: intake, read_only: 1 },
                        { fieldtype: "Data", fieldname: "bed_display", label: "السرير الحالي", default: current_bed, read_only: 1 },
                        { fieldtype: "Data", fieldname: "area_display", label: "المنطقة", default: current_area, read_only: 1 },
                        { fieldtype: "Data", fieldname: "triage_display", label: "الفرز", default: triage_level, read_only: 1 },
                        { fieldtype: "HTML", fieldname: "inpatient_warning", options: has_inpatient ? '<div class="alert alert-warning" style="direction:rtl;">المريض لديه سجل إقامة نشط: ' + inpatient_record + '. استخدم خروج المريض - التنويم.</div>' : '' },
                        {
                            fieldtype: "Select",
                            fieldname: "selected_action",
                            label: "الإجراء",
                            options: actionOptions.map(function(o) { return o.label; }).join("\n"),
                            reqd: 1
                        },
                        { fieldtype: "HTML", fieldname: "action_fields_area", options: '<div id="action-fields-container" style="margin-top:12px;"></div>' }
                    ]
                });

                const actionFieldsContainer = d.$wrapper.find("#action-fields-container");

                d.fields_dict.selected_action.$wrapper.on("change", "select", function() {
                    const selectedLabel = $(this).val();
                    const selectedOption = actionOptions.find(function(o) { return o.label === selectedLabel; });
                    if (!selectedOption) return;
                    renderActionFields(selectedOption.value, d, actionFieldsContainer, data);
                });

                d.set_primary_action("تأكيد", function() {
                    const selectedLabel = d.get_value("selected_action");
                    const selectedOption = actionOptions.find(function(o) { return o.label === selectedLabel; });
                    if (!selectedOption) {
                        frappe.msgprint("اختر إجراءً.");
                        return;
                    }
                    executeSelectedAction(selectedOption.value, d, data, bed_name, has_inpatient, inpatient_record, current_area);
                });

                d.show();
            },
            error: function() {
                frappe.msgprint({ title: "إجراءات المريض", message: "خطأ في الاتصال بالخادم.", indicator: "red" });
            }
        });
    }

    function renderActionFields(action, d, container, bedData) {
        container.empty();
        if (action === "admission") {
            container.html('<div class="section-head"><strong>حقول التنويم</strong></div>');
            const fieldsHtml = '<table class="table table-bordered" style="direction:rtl;">' +
                '<tr><td><b>المريض</b></td><td>' + (bedData.patient_name || "") + '</td></tr>' +
                '<tr><td><b>زيارة الطوارئ</b></td><td>' + (bedData.intake || "") + '</td></tr>' +
                '<tr><td><b>الزيارة الطبية</b></td><td>' + (bedData.patient_encounter || "") + '</td></tr>' +
                '<tr><td><b>الفرز</b></td><td>' + (bedData.triage_record || "") + '</td></tr>' +
                '<tr><td><b>طلب الترقيد</b></td><td>' + (bedData.admission_request || "") + '</td></tr>' +
                '<tr><td><b>الطبيب</b></td><td>' + (bedData.requesting_doctor || bedData.assigned_doctor || "") + '</td></tr>' +
                '<tr><td><b>القسم</b></td><td>' + (bedData.requested_department || "") + '</td></tr>' +
                '<tr><td><b>سبب الترقيد</b></td><td>' + (bedData.admission_reason || "") + '</td></tr>' +
                '</table>';
            container.append(fieldsHtml);
        } else if (action === "er_discharge") {
            container.html('<div class="section-head"><strong>حقول خروج المريض - الطوارئ</strong></div>');
        } else if (action === "ip_discharge") {
            container.html('<div class="section-head"><strong>حقول خروج المريض - التنويم</strong></div>');
        } else if (action === "er_transfer") {
            container.html('<div class="section-head"><strong>حقول التحويل الداخلي - الطوارئ</strong></div>');
        } else if (action === "ip_transfer") {
            container.html('<div class="section-head"><strong>حقول التحويل الداخلي - التنويم</strong></div>');
        } else if (action === "external_transfer") {
            container.html('<div class="section-head"><strong>حقول التحويل الخارجي</strong></div>');
        }
    }

    function executeSelectedAction(action, d, bedData, bed_name, has_inpatient, inpatient_record, current_area) {
        const btn = d.get_primary_btn();
        if (btn) { btn.prop("disabled", true); btn.html("جاري التنفيذ..."); }

        if (action === "admission") {
            d.hide();
            open_admission_for_bed(bed_name);
        } else if (action === "er_discharge") {
            d.hide();
            open_er_discharge_dialog(bed_name);
        } else if (action === "ip_discharge") {
            d.hide();
            open_inpatient_discharge_dialog(bed_name);
        } else if (action === "er_transfer") {
            d.hide();
            open_er_internal_transfer_dialog(bed_name);
        } else if (action === "ip_transfer") {
            d.hide();
            open_inpatient_internal_transfer_dialog(bed_name);
        } else if (action === "external_transfer") {
            d.hide();
            open_external_transfer_dialog(bed_name);
        }

        if (btn) { btn.prop("disabled", false); btn.html("تأكيد"); }
    }


    // ---------- نافذة ترقيد المريض في سرير فارغ ----------
    function open_empty_bed_assignment_dialog(bed_name) {
        frappe.call({
            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
            args: { bed_name: bed_name },
            callback: function(r) {
                if (!r.message) {
                    frappe.msgprint({ title: "ترقيد المريض", message: "تعذر تحميل بيانات السرير.", indicator: "orange" });
                    return;
                }
                const bedData = r.message;
                const bedArea = bedData.waiting_area || bedData.current_location || "";

                frappe.call({
                    method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_er_observation_patients",
                    args: { area: bedArea },
                    callback: function(pr) {
                        const patients = pr.message || [];
                        const patientOptions = patients.map(function(p) {
                            return {
                                label: (p.patient_name || p.patient) + " - " + (p.acuity || "") + " - " + (p.status || ""),
                                value: p.name
                            };
                        });

                        const d = new frappe.ui.Dialog({
                            title: "ترقيد المريض — " + (bedData.bed_name || bed_name),
                            fields: [
                                { fieldtype: "Data", fieldname: "bed_display", label: "السرير", default: bedData.bed_name || bed_name, read_only: 1 },
                                { fieldtype: "Data", fieldname: "area_display", label: "المنطقة", default: bedArea, read_only: 1 },
                                {
                                    fieldtype: "Select",
                                    fieldname: "selected_patient",
                                    label: "المريض",
                                    options: patientOptions,
                                    reqd: 1
                                },
                                { fieldtype: "HTML", fieldname: "patient_info", options: '<div id="patient-details" style="margin-top:8px;"></div>' }
                            ]
                        });

                        d.fields_dict.selected_patient.$wrapper.on("change", "select", function() {
                            const selectedIntake = $(this).val();
                            const selectedPatient = patients.find(function(p) { return p.name === selectedIntake; });
                            const detailsDiv = d.$wrapper.find("#patient-details");
                            if (selectedPatient) {
                                detailsDiv.html(
                                    '<table class="table table-bordered table-sm" style="direction:rtl;">' +
                                    '<tr><td><b>المريض</b></td><td>' + (selectedPatient.patient_name || "") + '</td></tr>' +
                                    '<tr><td><b>رقم المريض</b></td><td>' + (selectedPatient.patient || "") + '</td></tr>' +
                                    '<tr><td><b>الفرز</b></td><td>' + (selectedPatient.acuity || "") + '</td></tr>' +
                                    '<tr><td><b>الحالة</b></td><td>' + (selectedPatient.status || "") + '</td></tr>' +
                                    '</table>'
                                );
                            } else {
                                detailsDiv.empty();
                            }
                        });

                        d.set_primary_action("ترقيد", function() {
                            const selectedIntake = d.get_value("selected_patient");
                            if (!selectedIntake) {
                                frappe.msgprint("اختر مريضًا.");
                                return;
                            }
                            const selectedPatient = patients.find(function(p) { return p.name === selectedIntake; });
                            if (!selectedPatient) {
                                frappe.msgprint("اختر مريضًا صالحًا.");
                                return;
                            }

                            const btn = d.get_primary_btn();
                            if (btn) { btn.prop("disabled", true); btn.html("جاري الترقيد..."); }

                            frappe.call({
                                method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.assign_patient_to_bed",
                                args: {
                                    bed_name: bed_name,
                                    patient: selectedPatient.patient,
                                    intake: selectedPatient.name,
                                },
                                callback: function(res) {
                                    if (btn) { btn.prop("disabled", false); btn.html("ترقيد"); }
                                    const msg = res.message || {};
                                    if (res.exc || !msg.success) {
                                        frappe.msgprint("تعذر ترقيد المريض." + (msg.message ? (" " + msg.message) : ""));
                                        return;
                                    }
                                    frappe.show_alert({ message: "تم ترقيد المريض بنجاح.", indicator: "green" }, 3000);
                                    d.hide();
                                    load_beds();
                                    load_er_bed_notifications();
                                }
                            });
                        });

                        d.show();
                    }
                });
            }
        });
    }


    // ---------- نافذة العلامات الحيوية السابقة ----------
    function open_previous_vitals_dialog(bed_name) {
        frappe.call({
            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
            args: { bed_name: bed_name },
            callback: function(r) {
                if (!r.message) return;
                const data = r.message;
                const hist = data.medical_history || {};
                const rows = [];

                (hist.vitals || []).forEach(function(v) {
                    rows.push({
                        when: format_vital_time(v.signs_date || v.signs_time || v.recorded_time),
                        temp: v.temperature,
                        pulse: v.pulse || v.heart_rate,
                        bp: (v.bp_systolic || "") + "/" + (v.bp_diastolic || ""),
                        spo2: v.spo2
                    });
                });

                let body = "";
                if (rows.length) {
                    rows.forEach(function(v) {
                        body += '<tr><td>' + (v.when || "---") + '</td><td>' + (v.temp || "---") + '</td><td>' + (v.pulse || "---") + '</td><td>' + (v.bp || "---") + '</td><td>' + (v.spo2 || "---") + '</td></tr>';
                    });
                } else {
                    body = '<tr><td colspan="5" style="text-align:center;">لا توجد علامات حيوية سابقة.</td></tr>';
                }

                const html = '<p style="margin:0 0 8px;">العلامات الحيوية السابقة للمريض: ' + (data.patient_name || "") + '</p>'
                    + '<table class="table table-sm table-bordered" style="width:100%;margin-bottom:0;">'
                    + '<thead><tr><th>الوقت</th><th>الحرارة</th><th>النبض</th><th>الضغط</th><th>SpO2</th></tr></thead>'
                    + '<tbody>' + body + '</tbody></table>';

                const d = new frappe.ui.Dialog({
                    title: "العلامات الحيوية السابقة",
                    fields: [{ fieldtype: "HTML", options: html }]
                });
                d.show();
            }
        });
    }

    // ---------- فتح زيارة الطوارئ ----------
    function open_er_visit_for_bed(bed_name) {
        frappe.call({
            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
            args: { bed_name: bed_name },
            callback: function(r) {
                if (!r.message) return;
                const encounter = r.message.patient_encounter;
                if (!encounter) {
                    frappe.msgprint({
                        title: "فتح زيارة الطوارئ",
                        message: "لا توجد زيارة طبية مرتبطة بهذا السرير.",
                        indicator: "orange"
                    });
                    return;
                }
                frappe.set_route("er_visit_console", encounter);
            }
        });
    }

    // ---------- ترقيد المريض إلى التنويم ----------
    function open_admission_for_bed(bed_name) {
        frappe.call({
            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.validate_inpatient_admission",
            args: { bed_name: bed_name },
            callback: function(r) {
                const validation = r.message || {};
                if (!validation.can_admit) {
                    frappe.msgprint({
                        title: "ترقيد المريض",
                        message: validation.message || "المريض غير مؤهل للترقيد.",
                        indicator: "orange"
                    });
                    return;
                }

                const expected_discharge = frappe.datetime.nowdate();
                if (validation.expected_length_of_stay) {
                    const check_in = frappe.datetime.now_datetime();
                    const check_in_date = frappe.datetime.get_date(check_in);
                    const discharge_date = frappe.datetime.add_days(check_in_date, validation.expected_length_of_stay);
                    expected_discharge = frappe.datetime.format_date(discharge_date);
                }

                const d = new frappe.ui.Dialog({
                    title: "ترقيد المريض إلى التنويم",
                    fields: [
                        { fieldtype: "Data", fieldname: "patient_name", label: "المريض", default: validation.patient_name || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "intake", label: "زيارة الطوارئ", default: validation.intake || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "encounter", label: "الزيارة الطبية", default: validation.encounter || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "triage_record", label: "سجل الفرز", default: validation.triage_record || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "admission_request", label: "طلب الترقيد", default: validation.admission_request || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "requesting_doctor", label: "الطبيب requesting", default: validation.requesting_doctor || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "requested_department", label: "القسم المطلوب", default: validation.requested_department || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "requested_service_unit_type", label: "نوع الوحدة المطلوبة", default: validation.requested_service_unit_type || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "admission_reason", label: "سبب الترقيد", default: validation.admission_reason || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "priority", label: "الأولوية", default: validation.priority || "", read_only: 1 },
                        { fieldtype: "Data", fieldname: "expected_length_of_stay", label: "مدة الإقامة المتوقعة", default: validation.expected_length_of_stay || "", read_only: 1 },
                        {
                            fieldtype: "Link",
                            fieldname: "service_unit",
                            label: "الوحدة الداخلية",
                            options: "Healthcare Service Unit",
                            reqd: 1,
                            get_query: function() {
                                return {
                                    filters: {
                                        "is_group": 0,
                                        "inpatient_occupancy": 1,
                                        "occupancy_status": "Vacant"
                                    }
                                };
                            }
                        },
                        { fieldtype: "Datetime", fieldname: "check_in", label: "وقت الدخول", default: frappe.datetime.now_datetime(), reqd: 1 },
                        { fieldtype: "Date", fieldname: "expected_discharge", label: "تاريخ الخروج المتوقع", default: expected_discharge, reqd: 1 }
                    ]
                });
                d.set_primary_action("ترقيد", function() {
                    const service_unit = d.get_value("service_unit");
                    const check_in = d.get_value("check_in");
                    const expected_discharge_date = d.get_value("expected_discharge");
                    if (!service_unit) {
                        frappe.msgprint("اختر الوحدة الداخلية.");
                        return;
                    }
                    if (!check_in) {
                        frappe.msgprint("حدد وقت الدخول.");
                        return;
                    }
                    if (!expected_discharge_date) {
                        frappe.msgprint("حدد تاريخ الخروج المتوقع.");
                        return;
                    }
                    const btn = d.get_primary_btn();
                    if (btn) {
                        btn.prop("disabled", true);
                        btn.html("جاري الترقيد...");
                    }
                    frappe.call({
                        method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.admit_patient_to_inpatient",
                        args: { bed_name: bed_name, service_unit: service_unit },
                        callback: function(res) {
                            if (btn) {
                                btn.prop("disabled", false);
                                btn.html("ترقيد");
                            }
                            const msg = res.message || {};
                            if (res.exc || msg.status !== "success") {
                                frappe.msgprint("تعذر ترقيد المريض." + (msg.message ? (" " + msg.message) : ""));
                                return;
                            }
                            frappe.show_alert({ message: "تم ترقيد المريض إلى التنويم بنجاح.", indicator: "green" }, 3000);
                            d.hide();
                            load_beds();
                            load_er_bed_notifications();
                        }
                    });
                });
                d.show();
            }
        });
    }
}

// ==========================
// تحويل داخلي - الطوارئ
// ==========================

function open_er_internal_transfer_dialog(bed_name) {
    frappe.call({
        method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_er_internal_transfer_options",
        args: { bed_name: bed_name },
        callback: function(r) {
            const data = r.message || {};
            if (!data.from_bed) {
                frappe.msgprint({
                    title: "تحويل داخلي",
                    message: "لا يمكن تحميل بيانات السرير.",
                    indicator: "orange"
                });
                return;
            }

            const dest_options = (data.available_destinations || []).map(function(d) {
                return {
                    label: (d.arabic_name || d.bed_code || d.name) + " - " + (d.status_name || ""),
                    value: d.name
                };
            });

            const d = new frappe.ui.Dialog({
                title: "تحويل داخلي - الطوارئ",
                fields: [
                    { fieldtype: "Data", fieldname: "from_bed", label: "السرير الحالي", default: data.from_bed_name || data.from_bed, read_only: 1 },
                    { fieldtype: "Data", fieldname: "patient", label: "المريض", default: data.patient_name || "", read_only: 1 },
                    { fieldtype: "Data", fieldname: "intake", label: "زيارة الطوارئ", default: data.intake || "", read_only: 1 },
                    { fieldtype: "Data", fieldname: "waiting_area", label: "منطقة الانتظار", default: data.waiting_area || "", read_only: 1 },
                    { fieldtype: "Data", fieldname: "current_location", label: "الموقع الحالي", default: data.current_location || "", read_only: 1 },
                    {
                        fieldtype: "Select",
                        fieldname: "destination_bed",
                        label: "السرير الوجهة",
                        options: dest_options,
                        reqd: 1
                    },
                    { fieldtype: "Data", fieldname: "reason", label: "سبب التحويل", reqd: 1 },
                    { fieldtype: "Small Text", fieldname: "notes", label: "ملاحظات" },
                    { fieldtype: "Datetime", fieldname: "transfer_datetime", label: "تاريخ ووقت التحويل", default: frappe.datetime.now_datetime(), reqd: 1 }
                ]
            });
            d.set_primary_action("تحويل", function() {
                const destination_bed = d.get_value("destination_bed");
                const reason = d.get_value("reason");
                const notes = d.get_value("notes");
                const transfer_datetime = d.get_value("transfer_datetime");
                if (!destination_bed) {
                    frappe.msgprint("اختر السرير الوجهة.");
                    return;
                }
                if (!reason) {
                    frappe.msgprint("حدد سبب التحويل.");
                    return;
                }
                if (!transfer_datetime) {
                    frappe.msgprint("حدد تاريخ ووقت التحويل.");
                    return;
                }
                const btn = d.get_primary_btn();
                if (btn) {
                    btn.prop("disabled", true);
                    btn.html("جاري التحويل...");
                }
                frappe.call({
                    method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.execute_er_internal_transfer",
                    args: {
                        bed_name: bed_name,
                        destination_bed: destination_bed,
                        reason: reason,
                        notes: notes,
                        transfer_datetime: transfer_datetime
                    },
                    callback: function(res) {
                        if (btn) {
                            btn.prop("disabled", false);
                            btn.html("تحويل");
                        }
                        const msg = res.message || {};
                        if (res.exc || !msg.success) {
                            frappe.msgprint("تعذر التحويل الداخلي." + (msg.message ? (" " + msg.message) : ""));
                            return;
                        }
                        frappe.show_alert({ message: "تم التحويل الداخلي بنجاح.", indicator: "green" }, 3000);
                        d.hide();
                        load_beds();
                        load_er_bed_notifications();
                    }
                });
            });
            d.show();
        }
    });
}

// ==========================
// تحويل داخلي - التنويم
// ==========================

function open_inpatient_internal_transfer_dialog(bed_name) {
    frappe.call({
        method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
        args: { bed_name: bed_name },
        callback: function(r) {
            const data = r.message || {};
            if (!data.patient) {
                frappe.msgprint({
                    title: "تحويل داخلي",
                    message: "لا يوجد مريض في السرير.",
                    indicator: "orange"
                });
                return;
            }

            if (!data.patient_inpatient_record) {
                frappe.msgprint({
                    title: "تحويل داخلي",
                    message: "لا يوجد سجل إقامة نشط للمريض.",
                    indicator: "orange"
                });
                return;
            }

            frappe.call({
                method: "custom_app.emergency_management.api.admission_office.get_available_service_units",
                args: {},
                callback: function(su) {
                    const units = su.message || [];

                    const departmentMap = {};
                    units.forEach(function(u) {
                        const dept = u.department || "عام";
                        if (!departmentMap[dept]) {
                            departmentMap[dept] = [];
                        }
                        departmentMap[dept].push(u);
                    });

                    const departments = Object.keys(departmentMap).sort();
                    const departmentOptions = departments.map(function(d) {
                        return { label: d, value: d };
                    });

                    const d = new frappe.ui.Dialog({
                        title: "تحويل داخلي - التنويم",
                        fields: [
                            { fieldtype: "Data", fieldname: "inpatient_record", label: "سجل الإقامة", default: data.patient_inpatient_record || "", read_only: 1 },
                            { fieldtype: "Data", fieldname: "patient", label: "المريض", default: data.patient_name || "", read_only: 1 },
                            { fieldtype: "Data", fieldname: "current_service_unit", label: "الوحدة الحالية", default: data.service_unit || "", read_only: 1 },
                            {
                                fieldtype: "Select",
                                fieldname: "destination_department",
                                label: "القسم الوجهة",
                                options: departmentOptions,
                                reqd: 1,
                                change: function() {
                                    const selectedDept = d.get_value("destination_department");
                                    const deptUnits = departmentMap[selectedDept] || [];
                                    const unitOptions = deptUnits.map(function(u) {
                                        return {
                                            label: u.healthcare_service_unit_name + " - " + (u.service_unit_type || ""),
                                            value: u.name
                                        };
                                    });
                                    d.set_value("new_service_unit", "");
                                    d.fields_dict.new_service_unit.df.options = unitOptions;
                                    d.fields_dict.new_service_unit.refresh();
                                    if (!unitOptions.length) {
                                        frappe.show_alert({
                                            message: "لا توجد وحدات متاحة في هذا القسم.",
                                            indicator: "orange"
                                        }, 3000);
                                    }
                                }
                            },
                            {
                                fieldtype: "Select",
                                fieldname: "new_service_unit",
                                label: "الوحدة الجديدة",
                                options: [],
                                reqd: 1
                            },
                            { fieldtype: "Data", fieldname: "service_unit_type", label: "نوع الوحدة", default: "", read_only: 1 },
                            { fieldtype: "Data", fieldname: "reason", label: "سبب التحويل", reqd: 1 },
                            { fieldtype: "Small Text", fieldname: "notes", label: "ملاحظات" },
                            { fieldtype: "Datetime", fieldname: "check_in", label: "وقت الدخول", default: frappe.datetime.now_datetime(), reqd: 1 }
                        ]
                    });
                    d.set_primary_action("تحويل", function() {
                        const new_service_unit = d.get_value("new_service_unit");
                        const reason = d.get_value("reason");
                        const notes = d.get_value("notes");
                        const check_in = d.get_value("check_in");
                        if (!new_service_unit) {
                            frappe.msgprint("اختر الوحدة الجديدة.");
                            return;
                        }
                        if (!reason) {
                            frappe.msgprint("حدد سبب التحويل.");
                            return;
                        }
                        const btn = d.get_primary_btn();
                        if (btn) {
                            btn.prop("disabled", true);
                            btn.html("جاري التحقق...");
                        }
                        frappe.call({
                            method: "custom_app.emergency_management.api.admission_office.validate_transfer_eligibility",
                            args: {
                                inpatient_record_name: data.patient_inpatient_record,
                                new_service_unit: new_service_unit
                            },
                            callback: function(valRes) {
                                const val = valRes.message || {};
                                if (valRes.exc || !val.eligible) {
                                    if (btn) {
                                        btn.prop("disabled", false);
                                        btn.html("تحويل");
                                    }
                                    const blockers = (val.blockers && val.blockers.length) ? val.blockers.join("\n") : (val.message || "المريض غير مؤهل للتحويل الداخلي.");
                                    frappe.msgprint({
                                        title: "تحويل داخلي",
                                        message: blockers,
                                        indicator: "orange"
                                    });
                                    return;
                                }
                                if (btn) {
                                    btn.html("جاري التحويل...");
                                }
                                frappe.call({
                                    method: "custom_app.emergency_management.api.admission_office.transfer_inpatient",
                                    args: {
                                        inpatient_record_name: data.patient_inpatient_record,
                                        new_service_unit: new_service_unit,
                                        check_in: check_in
                                    },
                                    callback: function(res) {
                                        if (btn) {
                                            btn.prop("disabled", false);
                                            btn.html("تحويل");
                                        }
                                        const msg = res.message || {};
                                        if (res.exc || !msg.success) {
                                            frappe.msgprint("تعذر التحويل الداخلي." + (msg.message ? (" " + msg.message) : ""));
                                            return;
                                        }
                                        frappe.show_alert({ message: "تم التحويل الداخلي بنجاح.", indicator: "green" }, 3000);
                                        d.hide();
                                        load_beds();
                                        load_er_bed_notifications();
                                    }
                                });
                            }
                        });
                    });
                    d.show();
                }
            });
        }
    });
}

// ==========================
// تحويل خارجي
// ==========================

function open_external_transfer_dialog(bed_name) {
    frappe.call({
        method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
        args: { bed_name: bed_name },
        callback: function(r) {
            const data = r.message || {};
            if (!data.patient) {
                frappe.msgprint({
                    title: "تحويل خارجي",
                    message: "لا يوجد مريض في السرير.",
                    indicator: "orange"
                });
                return;
            }

            const inpatient_record = data.patient_inpatient_record;
            if (!inpatient_record) {
                frappe.msgprint({
                    title: "تحويل خارجي",
                    message: "لا يوجد سجل إقامة نشط للمريض.",
                    indicator: "orange"
                });
                return;
            }

            frappe.call({
                method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_external_transfer_options",
                args: { inpatient_record_name: inpatient_record },
                callback: function(tr) {
                    const transfer_data = tr.message || {};

                    const d = new frappe.ui.Dialog({
                        title: "تحويل خارجي",
                        fields: [
                            { fieldtype: "Data", fieldname: "inpatient_record", label: "سجل الإقامة", default: transfer_data.inpatient_record || "", read_only: 1 },
                            { fieldtype: "Data", fieldname: "patient", label: "المريض", default: transfer_data.patient_name || "", read_only: 1 },
                            { fieldtype: "Data", fieldname: "service_unit", label: "الوحدة الحالية", default: transfer_data.service_unit_name || "", read_only: 1 },
                            { fieldtype: "Data", fieldname: "receiving_hospital", label: "المستشفى المستقبلة", reqd: 1 },
                            { fieldtype: "Data", fieldname: "destination_department", label: "القسم المستقبل" },
                            { fieldtype: "Data", fieldname: "destination_doctor", label: "الطبيب المستقبل" },
                            { fieldtype: "Data", fieldname: "contact_info", label: "معلومات الاتصال" },
                            { fieldtype: "Data", fieldname: "destination", label: "الوجهة", reqd: 1 },
                            { fieldtype: "Data", fieldname: "reason", label: "سبب التحويل", reqd: 1 },
                            { fieldtype: "Datetime", fieldname: "transfer_datetime", label: "تاريخ ووقت التحويل", default: frappe.datetime.now_datetime(), reqd: 1 },
                            { fieldtype: "Small Text", fieldname: "notes", label: "ملاحظات سريرية" },
                            { fieldtype: "Small Text", fieldname: "ambulance_info", label: "معلومات النقل" },
                            { fieldtype: "Small Text", fieldname: "transfer_instructions", label: "تعليمات التحويل" }
                        ]
                    });
                    d.set_primary_action("تحويل خارجي", function() {
                        const destination = d.get_value("destination");
                        const reason = d.get_value("reason");
                        const transfer_datetime = d.get_value("transfer_datetime");
                        const receiving_hospital = d.get_value("receiving_hospital");
                        const destination_department = d.get_value("destination_department");
                        const destination_doctor = d.get_value("destination_doctor");
                        const contact_info = d.get_value("contact_info");
                        const notes = d.get_value("notes");
                        const ambulance_info = d.get_value("ambulance_info");
                        const transfer_instructions = d.get_value("transfer_instructions");

                        if (!destination) {
                            frappe.msgprint("حدد الوجهة.");
                            return;
                        }
                        if (!reason) {
                            frappe.msgprint("حدد سبب التحويل.");
                            return;
                        }
                        if (!transfer_datetime) {
                            frappe.msgprint("حدد تاريخ ووقت التحويل.");
                            return;
                        }
                        const btn = d.get_primary_btn();
                        if (btn) {
                            btn.prop("disabled", true);
                            btn.html("جاري التحويل...");
                        }
                        frappe.call({
                            method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.execute_external_transfer",
                            args: {
                                inpatient_record_name: inpatient_record,
                                destination: destination,
                                reason: reason,
                                transfer_datetime: transfer_datetime,
                                notes: notes,
                                receiving_hospital: receiving_hospital,
                                destination_department: destination_department,
                                destination_doctor: destination_doctor,
                                contact_info: contact_info,
                                ambulance_info: ambulance_info,
                                transfer_instructions: transfer_instructions
                            },
                            callback: function(res) {
                                if (btn) {
                                    btn.prop("disabled", false);
                                    btn.html("تحويل خارجي");
                                }
                                const msg = res.message || {};
                                if (res.exc || !msg.success) {
                                    frappe.msgprint("تعذر التحويل الخارجي." + (msg.message ? (" " + msg.message) : ""));
                                    return;
                                }
                                frappe.show_alert({ message: "تم التحويل الخارجي بنجاح.", indicator: "green" }, 3000);
                                d.hide();
                                load_beds();
                                load_er_bed_notifications();
                            }
                        });
                    });
                    d.show();
                }
            });
        }
    });
}

// ==========================
// خروج المريض - الطوارئ
// ==========================

function open_er_discharge_dialog(bed_name) {
    frappe.call({
        method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_er_discharge_options",
        args: { bed_name: bed_name },
        callback: function(r) {
            const data = r.message || {};
            if (!data.patient) {
                frappe.msgprint({
                    title: "خروج المريض",
                    message: "لا يوجد مريض في السرير.",
                    indicator: "orange"
                });
                return;
            }

            const reasons = (data.discharge_reasons || []).map(function(item) {
                return item.value;
            });

            const d = new frappe.ui.Dialog({
                title: "خروج المريض - الطوارئ",
                fields: [
                    { fieldtype: "Data", fieldname: "bed", label: "السرير", default: data.bed || "", read_only: 1 },
                    { fieldtype: "Data", fieldname: "patient", label: "المريض", default: data.patient_name || "", read_only: 1 },
                    { fieldtype: "Data", fieldname: "intake", label: "زيارة الطوارئ", default: data.intake || "", read_only: 1 },
                    { fieldtype: "Data", fieldname: "current_service", label: "الخدمة الحالية", default: data.current_service || "", read_only: 1 },
                    {
                        fieldtype: "Select",
                        fieldname: "reason",
                        label: "سبب الخروج",
                        options: reasons.join("\n"),
                        reqd: 1,
                        change: function() {
                            const reason = d.get_value("reason");
                            const notesField = d.fields_dict.notes;
                            if (!notesField) return;
                            if (reason === "وفاة") {
                                notesField.$wrapper.find("label").text("تفاصيل الوفاة / السبب");
                                notesField.df.reqd = 1;
                            } else if (reason === "خروج برغبة") {
                                notesField.$wrapper.find("label").text("تفاصيل الخروج البرغبة / الموافقة");
                                notesField.df.reqd = 1;
                            } else if (reason === "شفاء") {
                                notesField.$wrapper.find("label").text("ملاحظات الخروج");
                                notesField.df.reqd = 0;
                            } else {
                                notesField.$wrapper.find("label").text("ملاحظات الخروج");
                                notesField.df.reqd = 0;
                            }
                        }
                    },
                    { fieldtype: "Small Text", fieldname: "notes", label: "ملاحظات الخروج", reqd: 0 },
                    { fieldtype: "Datetime", fieldname: "discharge_datetime", label: "تاريخ ووقت الخروج", default: frappe.datetime.now_datetime(), reqd: 1 }
                ]
            });
            d.set_primary_action("خروج", function() {
                const reason = d.get_value("reason");
                const notes = d.get_value("notes");
                const discharge_datetime = d.get_value("discharge_datetime");
                if (!reason) {
                    frappe.msgprint("حدد سبب الخروج.");
                    return;
                }
                if (!discharge_datetime) {
                    frappe.msgprint("حدد تاريخ ووقت الخروج.");
                    return;
                }
                const btn = d.get_primary_btn();
                if (btn) {
                    btn.prop("disabled", true);
                    btn.html("جاري الخروج...");
                }
                frappe.call({
                    method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.execute_er_discharge",
                    args: {
                        bed_name: bed_name,
                        reason: reason,
                        notes: notes,
                        discharge_datetime: discharge_datetime
                    },
                    callback: function(res) {
                        if (btn) {
                            btn.prop("disabled", false);
                            btn.html("خروج");
                        }
                        const msg = res.message || {};
                        if (res.exc || !msg.success) {
                            frappe.msgprint("تعذر خروج المريض." + (msg.message ? (" " + msg.message) : ""));
                            return;
                        }
                        frappe.show_alert({ message: "تم خروج المريض من الطوارئ بنجاح.", indicator: "green" }, 3000);
                        d.hide();
                        load_beds();
                        load_er_bed_notifications();
                    }
                });
            });
            d.show();
        }
    });
}

// ==========================
// خروج المريض - التنويم
// ==========================

function open_inpatient_discharge_dialog(bed_name) {
    frappe.call({
        method: "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",
        args: { bed_name: bed_name },
        callback: function(r) {
            const data = r.message || {};
            if (!data.patient) {
                frappe.msgprint({
                    title: "خروج المريض",
                    message: "لا يوجد مريض في السرير.",
                    indicator: "orange"
                });
                return;
            }

            const inpatient_record = data.patient_inpatient_record;
            if (!inpatient_record) {
                frappe.msgprint({
                    title: "خروج المريض",
                    message: "لا يوجد سجل إقامة نشط للمريض.",
                    indicator: "orange"
                });
                return;
            }

            const d = new frappe.ui.Dialog({
                title: "خروج المريض - التنويم",
                fields: [
                    { fieldtype: "Data", fieldname: "inpatient_record", label: "سجل الإقامة", default: inpatient_record, read_only: 1 },
                    { fieldtype: "Data", fieldname: "patient", label: "المريض", default: data.patient_name || "", read_only: 1 },
                    { fieldtype: "Data", fieldname: "service_unit", label: "الوحدة الحالية", default: data.service_unit || "", read_only: 1 },
                    { fieldtype: "Small Text", fieldname: "discharge_note", label: "ملاحظات الخروج", reqd: 1 },
                    { fieldtype: "Small Text", fieldname: "discharge_instructions", label: "تعليمات ما بعد الخروج" },
                    { fieldtype: "Date", fieldname: "followup_date", label: "موعد المتابعة" }
                ]
            });
            d.set_primary_action("خروج", function() {
                const discharge_note = d.get_value("discharge_note");
                const discharge_instructions = d.get_value("discharge_instructions");
                const followup_date = d.get_value("followup_date");
                if (!discharge_note) {
                    frappe.msgprint("أضف ملاحظات الخروج.");
                    return;
                }
                const btn = d.get_primary_btn();
                if (btn) {
                    btn.prop("disabled", true);
                    btn.html("جاري الخروج...");
                }
                frappe.call({
                    method: "custom_app.emergency_management.api.admission_office.discharge_inpatient",
                    args: {
                        inpatient_record_name: inpatient_record,
                        discharge_note: discharge_note,
                        discharge_instructions: discharge_instructions,
                        followup_date: followup_date
                    },
                    callback: function(res) {
                        if (btn) {
                            btn.prop("disabled", false);
                            btn.html("خروج");
                        }
                        const msg = res.message || {};
                        if (res.exc || !msg.success) {
                            frappe.msgprint("تعذر خروج المريض." + (msg.message ? (" " + msg.message) : ""));
                            return;
                        }
                        frappe.show_alert({ message: "تم خروج المريض من التنويم بنجاح.", indicator: "green" }, 3000);
                        d.hide();
                        load_beds();
                        load_er_bed_notifications();
                    }
                });
            });
            d.show();
        }
    });
}

// ==========================
// نافذة الأدوية
// ==========================
// نافذة الأدوية
// ==========================

function load_bed_service_items(
    request_type,
    callback
) {

    if (!request_type) {

        if (callback) {

            callback([]);

        }

        return;

    }


    if (request_type === "Observation") {

        frappe.call({

            method:
                "custom_app.emergency_management.api.service_requests.get_er_waiting_areas",

            args: {},

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


                    update_bed_notification_badges(
                        data
                    );

                }

        });


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


                update_bed_notification_badges(
                    data
                );

            }

    });


}

// ==========================
// نافذة الخدمات الطبية
// ==========================

function open_service_dialog(bed_name, default_request_type){


    frappe.call({


        method:
        "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",


        args:{
            bed_name: bed_name
        },


        callback:function(r){


            if(!r.message){

                return;
            }



            let data = r.message;



            let dialog = new frappe.ui.Dialog({


                title:"📋 طلب خدمة طبية",


                fields:[


                    {
                        fieldtype:"Data",
                        fieldname:"patient",
                        label:"المريض",
                        default:data.patient_name || "",
                        read_only:1
                    },


                    {
                        fieldtype:"Data",
                        fieldname:"bed",
                        label:"السرير",
                        default:data.bed_name || "",
                        read_only:1
                    },


                    {
                        fieldtype:"Select",
                        fieldname:"service_item",
                        label:"الخدمة الطبية",
                        options: [
                            {"value": "", "label": "جاري تحميل الخدمات..."}
                        ],
                        reqd:1
                    },


                    {
                        fieldtype:"Select",
                        fieldname:"request_type",
                        label:"نوع الطلب",

                        options:
`
مختبر|Laboratory
Radiology|Radiology
الأدوية|Medication
استشارة|Consultation
تنويم|Admission
تحويل داخلي|Transfer_Internal
تحويل خارجي|Transfer_External
ملاحظة في الطوارئ|Observation
نقل|Transfer
خروج المريض|Discharge
`,

                        reqd:1
                    },


                    {
                        fieldtype:"Select",
                        fieldname:"priority",
                        label:"الأولوية",

                        options:
`
عاجل|Urgent
متوسط|Normal
منخفض|Low
`
                    },


                    {
                        fieldtype:"Small Text",
                        fieldname:"notes",
                        label:"ملاحظات"
                    }


                ],


                primary_action_label:"📤 إرسال الطلب",
                                primary_action:function(values){


                    values.request_type = (
                        values.request_type
                        ||
                        ""
                    ).split("|")[1] || values.request_type;


                    frappe.call({




                        method:
                        "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.create_service_request",



                        args:{


                            bed_name:bed_name,


                            data:values


                        },


                        callback:function(res){


                            if(!res.exc){


                                const message =
                                    res.message
                                    &&
                                    res.message.message
                                    &&
                                    res.message.message.message;


                                frappe.msgprint({


                                    title:"تم الإرسال",


                                    message:
                                    message
                                    ||
                                    ("تم إنشاء طلب الخدمة: " + res.message.name),

                                    indicator:"green"



                                });




                                dialog.hide();



                                if (
                                    res.message
                                    &&
                                    res.message.message
                                    &&
                                    res.message.message.discharge
                                ) {


                                    try {

                                        localStorage.setItem(
                                            "er_bed_dashboard_refresh",
                                            String(
                                                Date.now()
                                            )
                                        );

                                    } catch (e) {}

                                }


                            }


                        }


                    });


                }


            });



            dialog.show();


            const serviceItemField =
                dialog.fields_dict.service_item;

            const requestTypeField =
                dialog.fields_dict.request_type;


            function refresh_service_item_options(
                request_type,
                keep_value
            ) {

                if (!serviceItemField) {

                    return;

                }


                const current_value =
                    keep_value
                    ?
                    serviceItemField.getValue()
                    :
                    "";


                serviceItemField.$wrapper.html(
                    '<select class="form-control" disabled><option>جاري تحميل الخدمات...</option></select>'
                );


                if (request_type === "Discharge") {

                    serviceItemField.$wrapper.html(
                        '<select class="form-control" disabled><option>غير مطبق للخروج</option></select>'
                    );


                    serviceItemField.set_value(
                        ""
                    );

                    return;

                }


                load_bed_service_items(
                    request_type,
                    function(items) {

                        let options =
                            '<option value="">اختر الخدمة</option>';


                        if (!items.length) {

                            options =
                                '<option value="">لا توجد خدمات متاحة</option>';

                        }


                        items.forEach(
                            function(item) {

                                options +=
                                    '<option value="'
                                    +
                                    (item.value || "")
                                    +
                                    '">'
                                    +
                                    (item.label || item.value || "---")
                                    +
                                    '</option>';

                            }
                        );


                        serviceItemField.$wrapper.html(
                            '<select class="form-control">'
                            +
                            options
                            +
                            '</select>'
                        );


                        const new_select =
                            serviceItemField.$wrapper.find(
                                "select"
                            );


                        new_select.on(
                            "change",
                            function() {

                                serviceItemField.set_value(
                                    $(this).val()
                                );

                            }
                        );


                        if (
                            current_value
                            &&
                            items.some(
                                function(item) {

                                    return (
                                        item.value ===
                                        current_value
                                    );

                                }
                            )
                        ) {

                            serviceItemField.set_value(
                                current_value
                            );

                        }

                    }
                );

            }


            refresh_service_item_options(
                requestTypeField.getValue(),
                false
            );


            requestTypeField.$wrapper.on(
                "change",
                "select",
                function() {

                    const request_type =
                        $(this).val();


                    refresh_service_item_options(
                        request_type,
                        false
                    );

                }
            );


        }
 
 
    });
 
 
}



// ==========================
// نافذة الأدوية
// ==========================

function open_medication_dialog(bed_name){

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",

        args:{
            bed_name: bed_name
        },

        callback:function(r){

            if(!r.message){

                return;
            }


            const data =
                r.message;


            if(!data.patient_encounter){

                frappe.msgprint({

                    title:
                        "الأدوية",

                    message:
                        "لا توجد زيارة طبية مرتبطة بهذا السرير.",

                    indicator:
                        "orange"

                });


                return;

            }


            frappe.call({

                method:
                    "custom_app.emergency_management.api.medications.get_medication_requests",

                args:{
                    encounter: data.patient_encounter
                },

                callback:function(med_r){

                    let requests =
                        med_r.message || [];


                    let html =
                        '<div class="bed-drawer">';


                    html +=
                        '<h3>💊 أدوية المريض: '
                        +
                        (data.patient_name || "")
                        +
                        '</h3>';


                    html +=
                        '<details open><summary><strong>طلب دواء جديد</strong></summary>';


                    html +=
                        '<div class="bed-section-content">';


                    html +=
                        '<p>استخدم قسم الأدوية في زيارة الطوارئ لإنشاء طلب جديد.</p>';


                    html +=
                        '<button type="button" class="btn btn-primary btn-sm open-medication-section" data-encounter="'
                        +
                        data.patient_encounter
                        +
                        '">فتح قسم الأدوية في زيارة الطوارئ</button>';


                    html +=
                        '</div></details>';


                    html +=
                        '<details open><summary><strong>طلبات الأدوية الحالية ('
                        +
                        requests.length
                        +
                        ')</strong></summary>';


                    html +=
                        '<div class="bed-section-content">';


                    if (!requests.length) {

                        html +=
                            '<p>لا توجد طلبات أدوية حالياً.</p>';

                    } else {

                        html +=
                            '<table class="table table-striped table-bordered">';


                        html +=
                            '<thead><tr><th>الطلب</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>';


                        requests.forEach(
                            function(req) {

                                html +=
                                    '<tr>';


                                html +=
                                    '<td>'
                                    +
                                    (req.name || "---")
                                    +
                                    '</td>';


                                html +=
                                    '<td>'
                                    +
                                    (req.status || "---")
                                    +
                                    '</td>';


                                html +=
                                    '<td>'
                                    +
                                    (req.creation || "---")
                                    +
                                    '</td>';


                                html +=
                                    '</tr>';

                            }
                        );


                        html +=
                            '</tbody></table>';

                    }


                    html +=
                        '</div></details>';


                    html +=
                        '</div>';


                    let dialog = new frappe.ui.Dialog({

                        title:"💊 أدوية المريض",

                        fields:[

                            {
                                fieldtype:"HTML",
                                fieldname:"medication_html"
                            }

                        ],

                        size:"large"

                    });


                    dialog.fields_dict.medication_html.$wrapper.html(
                        html
                    );


                    dialog.show();


                    dialog.$wrapper.on(
                        "click",
                        ".open-medication-section",
                        function() {

                            const encounter =
                                $(this).data(
                                    "encounter"
                                );


                            if (encounter) {

                                sessionStorage.setItem(
                                    "er_visit_open_tab",
                                    "medications"
                                );


                                frappe.set_route(
                                    "er_visit_console",
                                    encounter
                                );

                            }

                        }
                    );

                }

            });

        }

    });

}

// ==========================
// نافذة المختبر
// ==========================

function open_lab_dialog(bed_name){

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",

        args:{
            bed_name: bed_name
        },

        callback:function(r){

            if(!r.message){

                return;
            }


            const data =
                r.message;


            if (
                !data.patient_encounter
            ) {

                frappe.msgprint({

                    title:
                        "المختبر",

                    message:
                        "لا توجد زيارة طبية مرتبطة بهذا السرير.",

                    indicator:
                        "orange"

                });


                return;

            }


            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.python.labs.labs.get_lab_requests",

                args:{
                    encounter: data.patient_encounter
                },

                callback:function(lab_r){

                    let requests =
                        lab_r.message || [];


                    let html =
                        '<div class="bed-drawer">';


                    html +=
                        '<h3>🧪 مختبر المريض: '
                        +
                        (data.patient_name || "")
                        +
                        '</h3>';


                    html +=
                        '<details open><summary><strong>الفحوصات المطلوبة ('
                        +
                        requests.length
                        +
                        ')</strong></summary>';


                    html +=
                        '<div class="bed-section-content">';


                    if (!requests.length) {

                        html +=
                            '<p>لا توجد طلبات مختبر حالياً.</p>';

                    } else {

                        html +=
                            '<table class="table table-striped table-bordered">';


                        html +=
                            '<thead><tr><th>الطلب</th><th>الفحص</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>';


                        requests.forEach(
                            function(req) {

                                html +=
                                    '<tr>';

                                html +=
                                    '<td>'
                                    +
                                    (req.name || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (req.test_name || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (req.lab_status || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (req.request_date || req.creation || "---")
                                    +
                                    '</td>';

                                html +=
                                    '</tr>';

                            }
                        );


                        html +=
                            '</tbody></table>';

                    }


                    html +=
                        '</div></details>';


                    html +=
                        '<details><summary><strong>طلب فحوصات جديد</strong></summary>';


                    html +=
                        '<div class="bed-section-content">';


                    html +=
                        '<p>استخدم قسم المختبر في زيارة الطوارئ لإنشاء طلب جديد.</p>';


                    html +=
                        '<button type="button" class="btn btn-primary btn-sm open-lab-section" data-encounter="'
                        +
                        data.patient_encounter
                        +
                        '">فتح قسم المختبر في زيارة الطوارئ</button>';


                    html +=
                        '</div></details>';


                    html +=
                        '</div>';


                    let dialog = new frappe.ui.Dialog({

                        title:"🧪 مختبر المريض",

                        fields:[

                            {
                                fieldtype:"HTML",
                                fieldname:"lab_html"
                            }

                        ],

                        size:"large"

                    });


                    dialog.fields_dict.lab_html.$wrapper.html(
                        html
                    );


                    dialog.show();


                    dialog.$wrapper.on(
                        "click",
                        ".open-lab-section",
                        function() {

                            const encounter =
                                $(this).data(
                                    "encounter"
                                );


                            if (encounter) {

                                sessionStorage.setItem(
                                    "er_visit_open_tab",
                                    "labs"
                                );


                                frappe.set_route(
                                    "er_visit_console",
                                    encounter
                                );

                            }

                        }
                    );

                }

            });

        }

    });

}


// ==========================
// نافذة الأشعة
// ==========================

function open_radiology_dialog(bed_name){

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",

        args:{
            bed_name: bed_name
        },

        callback:function(r){

            if(!r.message){

                return;
            }


            const data =
                r.message;


            if (
                !data.patient_encounter
            ) {

                frappe.msgprint({

                    title:
                        "الأشعة",

                    message:
                        "لا توجد زيارة طبية مرتبطة بهذا السرير.",

                    indicator:
                        "orange"

                });


                return;

            }


            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.python.radiology.radiology.get_radiology_requests",

                args:{
                    encounter: data.patient_encounter
                },

                callback:function(rad_r){

                    let requests =
                        rad_r.message || [];


                    let html =
                        '<div class="bed-drawer">';


                    html +=
                        '<h3>🩻 أشعة المريض: '
                        +
                        (data.patient_name || "")
                        +
                        '</h3>';


                    html +=
                        '<details open><summary><strong>الفحوصات المطلوبة ('
                        +
                        requests.length
                        +
                        ')</strong></summary>';


                    html +=
                        '<div class="bed-section-content">';


                    if (!requests.length) {

                        html +=
                            '<p>لا توجد طلبات أشعة حالياً.</p>';

                    } else {

                        html +=
                            '<table class="table table-striped table-bordered">';


                        html +=
                            '<thead><tr><th>الطلب</th><th>النوع</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>';


                        requests.forEach(
                            function(req) {

                                html +=
                                    '<tr>';

                                html +=
                                    '<td>'
                                    +
                                    (req.name || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (req.test_name || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (req.status || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (req.request_date || req.creation || "---")
                                    +
                                    '</td>';

                                html +=
                                    '</tr>';

                            }
                        );


                        html +=
                            '</tbody></table>';

                    }


                    html +=
                        '</div></details>';


                    html +=
                        '<details><summary><strong>طلب أشعة جديد</strong></summary>';


                    html +=
                        '<div class="bed-section-content">';


                    html +=
                        '<p>استخدم قسم الأشعة في زيارة الطوارئ لإنشاء طلب جديد.</p>';


                    html +=
                        '<button type="button" class="btn btn-primary btn-sm open-radiology-section" data-encounter="'
                        +
                        data.patient_encounter
                        +
                        '">فتح قسم الأشعة في زيارة الطوارئ</button>';


                    html +=
                        '</div></details>';


                    html +=
                        '</div>';


                    let dialog = new frappe.ui.Dialog({

                        title:"🩻 أشعة المريض",

                        fields:[

                            {
                                fieldtype:"HTML",
                                fieldname:"radiology_html"
                            }

                        ],

                        size:"large"

                    });


                    dialog.fields_dict.radiology_html.$wrapper.html(
                        html
                    );


                    dialog.show();


                    dialog.$wrapper.on(
                        "click",
                        ".open-radiology-section",
                        function() {

                            const encounter =
                                $(this).data(
                                    "encounter"
                                );


                            if (encounter) {

                                sessionStorage.setItem(
                                    "er_visit_open_tab",
                                    "radiology"
                                );


                                frappe.set_route(
                                    "er_visit_console",
                                    encounter
                                );

                            }

                        }
                    );

                }

            });

        }

    });

}


// ==========================
// نافذة النتائج / التاريخ الطبي
// ==========================

function open_history_dialog(bed_name){

    frappe.call({

        method:
            "custom_app.emergency_management.page.er_bed_dashboard.er_bed_dashboard.get_bed_details",

        args:{
            bed_name: bed_name
        },

        callback:function(r){

            if(!r.message){

                return;
            }


            const data =
                r.message;


            if (
                !data.patient_encounter
            ) {

                frappe.msgprint({

                    title:
                        "التاريخ الطبي",

                    message:
                        "لا توجد زيارة طبية مرتبطة بهذا السرير.",

                    indicator:
                        "orange"

                });


                return;

            }


            frappe.call({

                method:
                    "custom_app.emergency_management.page.er_visit_console.python.clinical.get_patient_history",

                args:{
                    encounter: data.patient_encounter
                },

                callback:function(hist_r){

                    const history =
                        hist_r.message || {};


                    let html =
                        '<div class="bed-drawer">';


                    html +=
                        '<h3>📋 التاريخ الطبي للمريض: '
                        +
                        (data.patient_name || "")
                        +
                        '</h3>';


                    if (history.encounters && history.encounters.length) {

                        html +=
                            '<details open><summary><strong>الزيارات السابقة</strong></summary>';

                        html +=
                            '<div class="bed-section-content">';

                        html +=
                            '<table class="table table-striped table-bordered">';

                        html +=
                            '<thead><tr><th>الزيارة</th><th>التاريخ</th><th>الطبيب</th><th>الحالة</th></tr></thead><tbody>';

                        history.encounters.forEach(
                            function(enc) {

                                html +=
                                    '<tr>';

                                html +=
                                    '<td>'
                                    +
                                    (enc.name || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (enc.encounter_date || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (enc.practitioner || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (enc.er_visit_status || "---")
                                    +
                                    '</td>';

                                html +=
                                    '</tr>';

                            }
                        );

                        html +=
                            '</tbody></table>';

                        html +=
                            '</div></details>';

                    }


                    if (history.vitals && history.vitals.length) {

                        html +=
                            '<details><summary><strong>العلامات الحيوية السابقة</strong></summary>';

                        html +=
                            '<div class="bed-section-content">';

                        html +=
                            '<table class="table table-striped table-bordered">';

                        html +=
                            '<thead><tr><th>التاريخ</th><th>الحرارة</th><th>النبض</th><th>الضغط</th><th>SpO2</th></tr></thead><tbody>';

                        history.vitals.forEach(
                            function(v) {

                                html +=
                                    '<tr>';

                                html +=
                                    '<td>'
                                    +
                                    (v.signs_date || v.recorded_time || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (v.temperature || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (v.heart_rate || v.pulse || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (v.systolic_bp || "---")
                                    +
                                    '/'
                                    +
                                    (v.diastolic_bp || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (v.spo2 || "---")
                                    +
                                    '</td>';

                                html +=
                                    '</tr>';

                            }
                        );

                        html +=
                            '</tbody></table>';

                        html +=
                            '</div></details>';

                    }


                    if (history.medical_records && history.medical_records.length) {

                        html +=
                            '<details><summary><strong>السجلات الطبية</strong></summary>';

                        html +=
                            '<div class="bed-section-content">';

                        html +=
                            '<table class="table table-striped table-bordered">';

                        html +=
                            '<thead><tr><th>الموضوع</th><th>التاريخ</th><th>الحالة</th></tr></thead><tbody>';

                        history.medical_records.forEach(
                            function(rec) {

                                html +=
                                    '<tr>';

                                html +=
                                    '<td>'
                                    +
                                    (rec.subject || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (rec.communication_date || "---")
                                    +
                                    '</td>';

                                html +=
                                    '<td>'
                                    +
                                    (rec.status || "---")
                                    +
                                    '</td>';

                                html +=
                                    '</tr>';

                            }
                        );

                        html +=
                            '</tbody></table>';

                        html +=
                            '</div></details>';

                    }


                    html +=
                        '</div>';


                    let dialog = new frappe.ui.Dialog({

                        title:"📋 التاريخ الطبي",

                        fields:[

                            {
                                fieldtype:"HTML",
                                fieldname:"history_html"
                            }

                        ],

                        size:"large"

                    });


                    dialog.fields_dict.history_html.$wrapper.html(
                        html
                    );


                    dialog.show();

                }

            });

        }

    });

}


function render_vital_signs_html(vital) {


    if (!vital || !Object.keys(vital).length) {

        return `<p>لا توجد علامات حيوية مسجلة.</p>`;

    }



    let html = "";



    if (vital.recorded_time) {

        html += `<p><b>الوقت:</b> ${vital.recorded_time}</p>`;

    }



    if (vital.temperature) {

        html += `<p>🌡 الحرارة: ${vital.temperature}</p>`;

    }



    if (vital.systolic_bp || vital.diastolic_bp) {

        html += `<p>🩸 الضغط: ${vital.systolic_bp || "---"}/${vital.diastolic_bp || "---"}</p>`;

    }



    if (vital.heart_rate) {

        html += `<p>❤️ النبض: ${vital.heart_rate}</p>`;

    }



    if (vital.respiratory_rate) {

        html += `<p>🫁 التنفس: ${vital.respiratory_rate}</p>`;

    }



    if (vital.spo2) {

        html += `<p>🫧 SpO2: ${vital.spo2}</p>`;

    }



    if (vital.pain_score) {

        html += `<p>😣 الألم: ${vital.pain_score}</p>`;

    }



    if (vital.consciousness) {

        html += `<p>🧠 الوعي: ${vital.consciousness}</p>`;

    }



    if (vital.blood_glucose) {

        html += `<p>🍬 السكر: ${vital.blood_glucose}</p>`;

    }



    return html;



}


function build_lab_results_html(lab_results) {


    if (!lab_results.length) {

        return `<p>لا توجد نتائج مختبر لهذا المريض.</p>`;

    }



    let html = `<table class="table table-striped table-bordered">`;

    html += `<thead><tr><th>الطلب</th><th>الفحص</th><th>حالة الفحص</th><th>التقرير</th><th>تاريخ النتيجة</th></tr></thead><tbody>`;



    lab_results.forEach(function(row) {


        html += `<tr>`;

        html += `<td>${row.name || "---"}</td>`;

        html += `<td>${row.test_name || "---"}</td>`;

        html += `<td>${row.lab_test_status || row.lab_status || "---"}</td>`;

        html += `<td>${row.diagnostic_report ? `<a href="/app/diagnostic-report/${row.diagnostic_report}" target="_blank">${row.diagnostic_report}</a>` : "---"}</td>`;

        html += `<td>${row.result_date || "---"}</td>`;

        html += `</tr>`;

    });



    html += `</tbody></table>`;

    return html;



}


function build_radiology_results_html(radiology_results) {


    if (!radiology_results.length) {

        return `<p>لا توجد نتائج أشعة لهذا المريض.</p>`;

    }



    let html = `<table class="table table-striped table-bordered">`;

    html += `<thead><tr><th>الطلب</th><th>الفحص</th><th>الحالة</th><th>النتيجة</th><th>التقرير</th><th>صورة</th></tr></thead><tbody>`;



    radiology_results.forEach(function(row) {


        let rad = row.radiology || {};

        let reportLink = rad.report_pdf
            ? `<a href="${rad.report_pdf}" target="_blank">📄 PDF</a>`
            : "---";

        let imageLink = rad.image_attachment
            ? `<a href="${rad.image_attachment}" target="_blank">🖼 صورة</a>`
            : "---";



        html += `<tr>`;

        html += `<td>${row.name || "---"}</td>`;

        html += `<td>${row.test_name || rad.examination_type || "---"}</td>`;

        html += `<td>${rad.radiology_status || "---"}</td>`;

        html += `<td>${rad.result || "---"}</td>`;

        html += `<td>${reportLink}</td>`;

        html += `<td>${imageLink}</td>`;

        html += `</tr>`;

    });



    html += `</tbody></table>`;

    return html;



}


function build_medical_history_html(history) {


    if (!history || !Object.keys(history).length) {

        return `<p>لا يوجد سجل طبي متاح.</p>`;

    }



    let html = "";



    if (history.encounters && history.encounters.length) {

        html += `<h5>الزيارات السابقة</h5>`;

        html += `<table class="table table-striped table-bordered">`;

        html += `<thead><tr><th>الزيارة</th><th>التاريخ</th><th>الطبيب</th><th>النوع</th><th>الحالة</th></tr></thead><tbody>`;



        history.encounters.forEach(function(enc) {


            html += `<tr>`;

            html += `<td>${enc.name || "---"}</td>`;

            html += `<td>${enc.encounter_date || "---"}</td>`;

            html += `<td>${enc.practitioner || "---"}</td>`;

            html += `<td>${enc.er_visit_type || "---"}</td>`;

            html += `<td>${enc.er_visit_status || "---"}</td>`;

            html += `</tr>`;

        });



        html += `</tbody></table>`;

    }



    if (history.medical_records && history.medical_records.length) {

        html += `<h5>السجل الطبي</h5>`;

        html += `<table class="table table-striped table-bordered">`;

        html += `<thead><tr><th>الموضوع</th><th>التاريخ</th><th>الحالة</th><th>النوع</th></tr></thead><tbody>`;



        history.medical_records.forEach(function(rec) {


            html += `<tr>`;

            html += `<td>${rec.subject || "---"}</td>`;

            html += `<td>${rec.communication_date || "---"}</td>`;

            html += `<td>${rec.status || "---"}</td>`;

            html += `<td>${rec.reference_doctype || "---"}</td>`;

            html += `</tr>`;

        });



        html += `</tbody></table>`;

    }



    if (!html) {

        html = `<p>لا يوجد سجل طبي متاح.</p>`;

    }



    return html;

}
