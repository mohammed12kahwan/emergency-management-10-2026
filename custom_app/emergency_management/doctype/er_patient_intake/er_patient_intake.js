/*
 * ER Patient Intake
 * TWO WINDOW UI — CLEAN START
 *
 * Uses the real Frappe DocType fields.
 * No make_control.
 * No duplicate data fields.
 * No new DocTypes.
 */

frappe.ui.form.on("ER Patient Intake", {

    refresh(frm) {

        /*
         * Single UI entry point.
         * render_er_two_window_ui() itself mounts the native
         * Frappe sections exactly once and is internally guarded.
         */
        render_er_two_window_ui(frm);

        /* Visual design must run AFTER the workspace is rendered. */

        setTimeout(function () {
        }, 150);

        setTimeout(function () {
        }, 500);

        inject_er_intake_design_polish(frm);
    load_er_patient_summary(frm);

        refresh_er_patient_intake_conditionals(frm);
    },


    patient(frm) {

        setTimeout(
            function () {
                load_er_patient_summary(frm);
            },
            0
        );
    },


    case_type(frm) {

    /*
     * Re-apply immediately after selecting:
     * empty / مرضية / حادث.
     */
    refresh_er_patient_intake_conditionals(frm);

    setTimeout(function() {
        refresh_er_patient_intake_conditionals(frm);
    }, 0);

    setTimeout(function() {
        refresh_er_patient_intake_conditionals(frm);
    }, 150);

    setTimeout(function() {
        refresh_er_patient_intake_conditionals(frm);
    }, 500);

    if (
        typeof refresh_er_patient_summary_boxes ===
        "function"
    ) {
        refresh_er_patient_summary_boxes(frm);
    }
}
,


    injury_type(frm) {

        refresh_er_patient_intake_conditionals(frm);

        if (
            typeof refresh_er_patient_summary_boxes ===
            "function"
        ) {
            refresh_er_patient_summary_boxes(frm);
        }
    },


    before_save(frm) {

        if (frm.is_new()) {
            frm.__er_newly_saved = true;
        }
    },


    /*
     * Visit-stage transition is handled by the explicit
     * "حفظ الزيارة / Save Visit" button.
     *
     * This prevents an automatic second server update after
     * Frappe saves the Intake and avoids document-version conflicts.
     */
    after_save(frm) {
        // Intentionally empty.
    },


    outcome(frm) {

        refresh_er_patient_intake_conditionals(frm);
    }

});




/* ============================================================
   ER INTAKE — FORCE VISIBLE INLINE VISUAL DESIGN
   VISUAL ONLY — DIRECT INLINE STYLES
   This intentionally targets the REAL rendered HTML classes.
   ============================================================ */

function inject_er_intake_design_polish(frm) {

    /* ============================================================
       COMPACT BUTTON DESIGN
       ============================================================ */
    if (!document.getElementById("er-intake-compact-buttons-css")) {
        const compactStyle = document.createElement("style");
        compactStyle.id = "er-intake-compact-buttons-css";
        compactStyle.textContent = `
            /* Main navigation buttons */
            .er-four-window-root .er-patient-action-bar {
    display: grid !important;
    direction: rtl !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(2, auto) !important;
    grid-auto-flow: row !important;
    gap: 8px !important;
    align-items: stretch !important;
}

            .er-four-window-root .er-patient-action-bar .er-header-action {
                flex: 0 0 auto !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: none !important;
                height: 32px !important;
                min-height: 32px !important;
                padding: 4px 9px !important;
                margin: 0 !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                line-height: 1.1 !important;
                white-space: nowrap !important;
                border-radius: 6px !important;
            }

            /* Final button order: 3 + 3 */
            .er-four-window-root .er-patient-action-bar [data-header-action="new_visit"] {
                order: 1 !important;
                width: 100% !important;
            }

            .er-four-window-root .er-patient-action-bar [data-header-action="bed_dashboard"] {
                order: 2 !important;
                width: 100% !important;
            }

            .er-four-window-root .er-patient-action-bar [data-header-action="medical_record"] {
                order: 3 !important;
                width: 100% !important;
            }

            .er-four-window-root .er-patient-action-bar [data-header-action="doctor_visit"] {
                order: 4 !important;
                width: 100% !important;
            }

            .er-four-window-root .er-patient-action-bar [data-header-action="visit_console"] {
                order: 5 !important;
                width: 100% !important;
            }

            .er-four-window-root .er-patient-action-bar [data-header-action="current_console"] {
                order: 6 !important;
                width: 100% !important;
            }

            /* Compact modal footer buttons without affecting controls */
            .er-vitals-dialog .modal-footer .btn {
                height: 34px !important;
                min-height: 34px !important;
                padding: 5px 12px !important;
                font-size: 12px !important;
            }

            @media (max-width: 800px) {
            }
        `;
        document.head.appendChild(compactStyle);
        /* ============================================================
           FINAL PATIENT ACTION BAR — ONE ROW
           ============================================================ */
        /*
         * PATIENT ACTION BAR — FINAL SINGLE ROW
         */
        if (!document.getElementById("er-intake-force-button-order")) {
            const forceOrderStyle = document.createElement("style");

            forceOrderStyle.id =
                "er-intake-force-button-order";

            forceOrderStyle.textContent = `
                .er-four-window-root .er-patient-action-bar {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: nowrap !important;
                    direction: rtl !important;
                    align-items: center !important;
                    justify-content: stretch !important;
                    gap: 4px !important;
                    width: 100% !important;
                    margin: 4px 0 5px 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                }

                .er-four-window-root
                .er-patient-action-bar
                .er-header-action {
                    flex: 1 1 0 !important;
                    width: auto !important;
                    min-width: 0 !important;
                    max-width: none !important;
                    height: 30px !important;
                    min-height: 30px !important;
                    margin: 0 !important;
                    padding: 3px 5px !important;
                    border-radius: 5px !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    line-height: 1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
            `;

            document.head.appendChild(forceOrderStyle);
        }

        /* ============================================================
           FINAL VISUAL DESIGN
           ATTRACTIVE INFO CARDS + 3D BUTTONS
           ============================================================ */
        if (!document.getElementById("er-intake-final-visual-css")) {
            const visualStyle = document.createElement("style");
            visualStyle.id = "er-intake-final-visual-css";
            visualStyle.textContent = `
                /* ====================================================
   PATIENT INFORMATION — MEDICAL COMPACT DESIGN
   ==================================================== */

                .er-four-window-root .er-patient-summary-card {
                    width: 100% !important;
                    margin: 5px 0 0 0 !important;
                    padding: 6px !important;
                    background: #f7fafc !important;
                    border: 1px solid #d7e2ea !important;
                    border-radius: 7px !important;
                    box-shadow: 0 1px 3px rgba(15, 23, 42, .05) !important;
                }

                .er-four-window-root .er-patient-summary-title {
                    margin: 0 0 5px 0 !important;
                    padding: 0 3px !important;
                    font-size: 11px !important;
                    line-height: 1.1 !important;
                    font-weight: 700 !important;
                    color: #264653 !important;
                }

                .er-four-window-root .er-patient-summary-grid {
                    display: grid !important;
                    grid-template-columns:
                        repeat(5, minmax(0, 1fr)) !important;
                    gap: 4px !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                .er-four-window-root .er-patient-summary-grid > div {
                    min-width: 0 !important;
                    height: 35px !important;
                    min-height: 35px !important;
                    padding: 3px 6px !important;
                    margin: 0 !important;
                    background: #edf5f8 !important;
                    border: 1px solid #cddde4 !important;
                    border-radius: 5px !important;
                    box-shadow: none !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    overflow: hidden !important;
                }

                .er-four-window-root .er-patient-summary-grid
                > div > span {
                    display: block !important;
                    margin: 0 0 2px 0 !important;
                    font-size: 8px !important;
                    line-height: 1 !important;
                    font-weight: 600 !important;
                    color: #607d8b !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }

                .er-four-window-root .er-patient-summary-grid
                > div > strong {
                    display: block !important;
                    min-width: 0 !important;
                    font-size: 10px !important;
                    line-height: 1.1 !important;
                    font-weight: 700 !important;
                    color: #17324d !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }

                @media (max-width: 1050px) {
                    .er-four-window-root .er-patient-summary-grid {
                        grid-template-columns:
                            repeat(5, minmax(0, 1fr)) !important;
                        gap: 3px !important;
                    }
                }

                @media (max-width: 800px) {
                    .er-four-window-root .er-patient-summary-grid {
                        grid-template-columns:
                            repeat(3, minmax(0, 1fr)) !important;
                    }

                    .er-four-window-root .er-patient-summary-grid > div {
                        height: 34px !important;
                        min-height: 34px !important;
                    }
                }

                /* Individual button surfaces */
                .er-four-window-root [data-header-action="new_visit"] {
                    background: linear-gradient(180deg, #f7fbff 0%, #dcecff 100%) !important;
                    color: #245a83 !important;
                }

                .er-four-window-root [data-header-action="doctor_visit"] {
                    background: linear-gradient(180deg, #fff8ec 0%, #ffe8bd 100%) !important;
                    color: #8a5b08 !important;
                }

                .er-four-window-root [data-header-action="visit_console"] {
                    background: linear-gradient(180deg, #f1fbff 0%, #d7edf5 100%) !important;
                    color: #286275 !important;
                }

                .er-four-window-root [data-header-action="current_console"] {
                    background: linear-gradient(180deg, #f7f2ff 0%, #e7ddfa 100%) !important;
                    color: #654a8b !important;
                }

                .er-four-window-root [data-header-action="bed_dashboard"] {
                    background: linear-gradient(180deg, #f1fbf4 0%, #dcefe1 100%) !important;
                    color: #33734a !important;
                }

                .er-four-window-root [data-header-action="medical_record"] {
                    background: linear-gradient(180deg, #f6f9fb 0%, #dfe7ed 100%) !important;
                    color: #425b6a !important;
                }

                @media (max-width: 1050px) {
                    .er-four-window-root .er-patient-summary-grid {
                        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
                    }
                }

                @media (max-width: 700px) {
                    .er-four-window-root .er-patient-summary-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    }

                    .er-four-window-root .er-patient-summary-grid > div {
                        min-height: 58px !important;
                    }
                }
            `;
            document.head.appendChild(visualStyle);
        }

    }


    if (!frm) {
        return;
    }

    /*
     * =========================================================
     * ER PATIENT INTAKE — VISUAL POLISH
     * Design only. No data logic changes.
     * =========================================================
     */

    if (!$("#er-intake-design-polish-css").length) {

        $("head").append(`
            <style id="er-intake-design-polish-css">

                /* =================================================
                 * PATIENT SUMMARY
                 * ================================================= */

                .er-four-window-root .er-patient-summary {
                    margin: 0 0 12px !important;
                    padding: 10px !important;
                    border: 1px solid #d5dde7 !important;
                    border-radius: 12px !important;
                    background: #f8fafc !important;
                    box-shadow: 0 2px 7px rgba(15, 23, 42, 0.06) !important;
                    direction: rtl !important;
                }

                .er-four-window-root .er-patient-summary-title {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    min-height: 34px !important;
                    margin: 0 0 8px !important;
                    padding: 6px 10px !important;
                    border-radius: 8px !important;
                    background: #edf4fb !important;
                    color: #243447 !important;
                    font-size: 15px !important;
                    font-weight: 700 !important;
                }

                .er-four-window-root .er-patient-summary-grid {
                    display: grid !important;
                    grid-template-columns:
                        repeat(3, minmax(0, 1fr)) !important;
                    gap: 8px !important;
                    width: 100% !important;
                }

                .er-four-window-root .er-patient-summary-grid > div {
                    min-width: 0 !important;
                    min-height: 58px !important;
                    padding: 8px 10px !important;
                    border: 1px solid rgba(100, 116, 139, 0.18) !important;
                    border-radius: 9px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    box-sizing: border-box !important;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
                }

                /* ====================================================
                   FINAL PATIENT SUMMARY COLORS
                   WINDOWS 10 / WINDOWS 11 BLUE THEME
                   THIS BLOCK OVERRIDES OLD COLORS
                   VISUAL ONLY
                   ==================================================== */

                .er-four-window-root .er-patient-summary-grid > div:nth-child(1) {
                    background: #eaf4ff !important;
                    border-color: #8fc0e8 !important;
                }

                .er-four-window-root .er-patient-summary-grid > div:nth-child(2) {
                    background: #e5f2ff !important;
                    border-color: #8dbce0 !important;
                }

                .er-four-window-root .er-patient-summary-grid > div:nth-child(3) {
                    background: #edf7ff !important;
                    border-color: #9ac5e4 !important;
                }

                .er-four-window-root .er-patient-summary-grid > div:nth-child(4) {
                    background: #e2f0ff !important;
                    border-color: #86b6dc !important;
                }

                .er-four-window-root .er-patient-summary-grid > div:nth-child(5) {
                    background: #e7f6ff !important;
                    border-color: #87c7e3 !important;
                }

                .er-four-window-root .er-patient-summary-grid > div:nth-child(6) {
                    background: #dfeeff !important;
                    border-color: #79a9d3 !important;
                }

                .er-four-window-root .er-patient-summary-grid > div:nth-child(7) {
                    background: #edf6ff !important;
                    border-color: #91bddc !important;
                }

                .er-four-window-root .er-patient-summary-grid > div:nth-child(8) {
                    background: #e4f3ff !important;
                    border-color: #82bddc !important;
                }

                .er-four-window-root .er-patient-summary-grid > div:nth-child(9) {
                    background: #e6eef8 !important;
                    border-color: #91a9bd !important;
                }

                .er-four-window-root .er-patient-summary-grid span {
                    margin-bottom: 4px !important;
                    font-size: 10px !important;
                    line-height: 1.2 !important;
                    color: #64748b !important;
                }

                .er-four-window-root .er-patient-summary-grid strong {
                    display: block !important;
                    min-width: 0 !important;
                    font-size: 13px !important;
                    line-height: 1.35 !important;
                    font-weight: 700 !important;
                    color: #1e293b !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }


                /* =================================================
                 * HEADER ACTION BUTTONS
                 * ================================================= */

                .er-four-window-root .er-patient-action-bar {
                    display: grid !important;
                    grid-template-columns:
                        repeat(4, minmax(0, 1fr)) !important;
                    gap: 7px !important;
                    width: 100% !important;
                    margin-top: 8px !important;
                    padding-top: 8px !important;
                    border-top: 1px solid #dde4ec !important;
                }

                .er-four-window-root .er-patient-action-bar .er-header-action {
                    width: 100% !important;
                    min-height: 38px !important;
                    height: 38px !important;
                    padding: 6px 8px !important;
                    margin: 0 !important;
                    border-radius: 7px !important;
                    border: 1px solid #d5dde6 !important;
                    box-shadow: none !important;
                    font-size: 12px !important;
                    font-weight: 700 !important;
                    line-height: 1.2 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }

                .er-four-window-root
                .er-patient-action-bar
                [data-header-action="new_visit"] {
                    background: #edf6ff !important;
                    border-color: #b7d6ef !important;
                }

                .er-four-window-root
                .er-patient-action-bar
                [data-header-action="doctor_visit"] {
                    background: #f2edff !important;
                    border-color: #d3c6ef !important;
                }

                .er-four-window-root
                .er-patient-action-bar
                [data-header-action="visit_console"] {
                    background: #edf9f1 !important;
                    border-color: #bddfc8 !important;
                }

                .er-four-window-root
                .er-patient-action-bar
                [data-header-action="current_console"] {
                    background: #eaf8fb !important;
                    border-color: #b8dfe7 !important;
                }

                .er-four-window-root
                .er-patient-action-bar
                [data-header-action="bed_dashboard"] {
                    background: #fff7e7 !important;
                    border-color: #ecd59e !important;
                }

                .er-four-window-root
                .er-patient-action-bar
                [data-header-action="medical_record"] {
                    background: #f3f0ff !important;
                    border-color: #cfc8eb !important;
                }

                .er-four-window-root
                .er-patient-action-bar
                .er-header-action:hover {
                    filter: brightness(0.98) !important;
                    transform: translateY(-1px) !important;
                }

                .er-four-window-root


                /* =================================================
                 * VISIT / TRIAGE WINDOWS
                 * ================================================= */

                .er-four-window-root .er-window {
                    border-radius: 10px !important;
                    border-color: #d6dee7 !important;
                    background: #ffffff !important;
                    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05) !important;
                }

                .er-four-window-root .er-window-header {
                    min-height: 38px !important;
                    padding: 9px 12px !important;
                    display: flex !important;
                    align-items: center !important;
                    border-radius: 10px 10px 0 0 !important;
                    background: #eef3f8 !important;
                    color: #263445 !important;
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    border-bottom: 1px solid #d8e0e8 !important;
                }

                .er-four-window-root .er-window-body {
                    padding: 11px !important;
                }


                /* =================================================
                 * VITAL SIGNS POPUP
                 * ================================================= */

                .er-vitals-dialog .modal-dialog {
                    width: calc(100vw - 32px) !important;
                    max-width: 1120px !important;
                    margin: 16px auto !important;
                }

                .er-vitals-dialog .modal-content {
                    overflow: hidden !important;
                    border: 1px solid #d5dee8 !important;
                    border-radius: 13px !important;
                    background: #ffffff !important;
                    box-shadow:
                        0 14px 40px rgba(15, 23, 42, 0.18) !important;
                }

                .er-vitals-dialog .modal-header {
                    padding: 12px 16px !important;
                    background: #edf5fc !important;
                    border-bottom: 1px solid #d8e2ec !important;
                }

                .er-vitals-dialog .modal-title {
                    font-size: 17px !important;
                    font-weight: 700 !important;
                    color: #243447 !important;
                }

                .er-vitals-dialog .modal-body {
                    max-height: calc(100vh - 175px) !important;
                    overflow-y: auto !important;
                    padding: 15px !important;
                    background: #f8fafc !important;
                }

                .er-vitals-dialog .form-layout {
                    padding: 0 !important;
                }

                .er-vitals-dialog .frappe-control {
                    margin-bottom: 9px !important;
                    padding: 8px !important;
                    border: 1px solid #dde4ec !important;
                    border-radius: 8px !important;
                    background: #ffffff !important;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03) !important;
                }

                .er-vitals-dialog .control-label {
                    margin-bottom: 5px !important;
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    color: #5d6b7a !important;
                }

                .er-vitals-dialog .form-control {
                    min-height: 38px !important;
                    height: 38px !important;
                    border-radius: 7px !important;
                    border-color: #cfd8e3 !important;
                    background: #fbfdff !important;
                    font-size: 13px !important;
                    box-shadow: none !important;
                }

                .er-vitals-dialog textarea.form-control {
                    min-height: 72px !important;
                    height: auto !important;
                }

                .er-vitals-dialog .modal-footer {
                    padding: 10px 14px !important;
                    background: #ffffff !important;
                    border-top: 1px solid #dbe3eb !important;
                }

                .er-vitals-dialog .modal-footer .btn {
                    min-height: 39px !important;
                    padding: 7px 16px !important;
                    border-radius: 7px !important;
                    font-size: 12px !important;
                    font-weight: 700 !important;
                }

                @media (max-width: 1000px) {

                    .er-four-window-root
                    .er-patient-summary-grid {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr)) !important;
                    }

                    .er-four-window-root
                    .er-patient-action-bar,
                    .er-four-window-root
                }

                @media (max-width: 650px) {

                    .er-four-window-root
                    .er-patient-summary-grid,
                    .er-four-window-root
                    .er-patient-action-bar,
                    .er-four-window-root

                    .er-vitals-dialog .modal-dialog {
                        width: calc(100vw - 12px) !important;
                        margin: 6px auto !important;
                    }
                }

            </style>
        `);
    }


    /*
     * Mark the Vital Signs modal when it opens.
     */
    $(document)
        .off(
            "shown.bs.modal.erVitalsDesign",
            ".modal"
        )
        .on(
            "shown.bs.modal.erVitalsDesign",
            ".modal",
            function() {

                const modal =
                    $(this);

                const title =
                    modal
                        .find(".modal-title")
                        .text()
                        .trim();

                if (
                    title.indexOf("العلامات الحيوية") !== -1 ||
                    title.indexOf("Vital Signs") !== -1
                ) {
                    modal.addClass(
                        "er-vitals-dialog"
                    );
                }
            }
        );
}


function render_er_two_window_ui(frm) {

    if (
        !frm ||
        !frm.page ||
        !frm.page.main
    ) {
        return;
    }

    const main =
        $(frm.page.main);


    /*
     * Do not recreate the workspace on every refresh.
     * The native Frappe sections remain attached to the
     * custom hosts after the first render.
     */
    if (
        main.find(
            ".er-two-window-ui"
        ).length
    ) {

        load_er_patient_summary(frm);
        refresh_er_patient_summary_boxes(frm);
        refresh_er_patient_intake_conditionals(frm);

        if (
            typeof load_er_triage_vitals ===
            "function"
        ) {
            setTimeout(
                function () {
                    load_er_triage_vitals(frm);
                },
                100
            );
        }

        return;
    }


    inject_er_two_window_css();


    const html = `
        <div class="er-two-window-ui er-four-window-root">


            <!-- =================================================
                 SERVICE BUTTONS
                 ================================================= -->

            <div class="er-console-service-bar">

                <button
                    type="button"
                    class="btn btn-default er-console-work-action"
                    data-console-section="clinical">
                    التمريض
                </button>

                <button
                    type="button"
                    class="btn btn-default er-console-work-action"
                    data-console-section="doctor">
                    الطبيب
                </button>

                <button
                    type="button"
                    class="btn btn-default er-console-work-action"
                    data-console-section="labs">
                    مختبر
                </button>

                <button
                    type="button"
                    class="btn btn-default er-console-work-action"
                    data-console-section="radiology">
                    أشعة
                </button>

                <button
                    type="button"
                    class="btn btn-default er-console-work-action"
                    data-console-section="medications">
                    أدوية
                </button>

                <button
                    type="button"
                    class="btn btn-default er-console-work-action"
                    data-console-section="procedures">
                    إجراءات
                </button>

            </div>


            <!-- =================================================
                 PATIENT SUMMARY
                 ================================================= -->

            <div class="er-patient-summary-card">

                <div class="er-patient-summary-title">
                    بيانات المريض
                </div>


                <div class="er-patient-summary-grid">

                    <div>
                        <span>اسم المريض</span>
                        <strong data-er-summary="patient">—</strong>
                    </div>

                    <div>
                        <span>العمر</span>
                        <strong data-er-summary="age">—</strong>
                    </div>

                    <div>
                        <span>الجنس</span>
                        <strong data-er-summary="gender">—</strong>
                    </div>

                    <div>
                        <span>المحافظة</span>
                        <strong data-er-summary="governorate">—</strong>
                    </div>

                    <div>
                        <span>المديرية</span>
                        <strong data-er-summary="district">—</strong>
                    </div>

                    <div>
                        <span>نوع الحالة</span>
                        <strong data-er-summary="case_type">—</strong>
                    </div>

                    <div>
                        <span>لون الحالة</span>
                        <strong data-er-summary="case_category">—</strong>
                    </div>

                    <div>
                        <span>نوع الإصابة</span>
                        <strong data-er-summary="injury_type">—</strong>
                    </div>

                    <div>
                        <span>منطقة الانتظار</span>
                        <strong data-er-summary="waiting_area">—</strong>
                    </div>

                    <div>
                        <span>السرير</span>
                        <strong data-er-summary="assigned_bed">—</strong>
                    </div>

                </div>


                <!-- =================================================
                     PATIENT ACTIONS
                     ================================================= -->

                <div
                    class="er-patient-actions-one-row"
                    style="
                        display:flex !important;
                        flex-direction:row !important;
                        flex-wrap:nowrap !important;
                        direction:rtl !important;
                        align-items:center !important;
                        gap:5px !important;
                        width:100% !important;
                        margin:6px 0 0 0 !important;
                        padding:5px !important;
                        background:#e9eef3 !important;
                        border:1px solid #cbd5df !important;
                        border-radius:7px !important;
                        overflow:hidden !important;
                    ">

                    <button
                        type="button"
                        class="btn er-header-action"
                        data-header-action="new_visit"
                        style="
                            flex:1 1 0 !important;
                            width:0 !important;
                            min-width:0 !important;
                            height:32px !important;
                            min-height:32px !important;
                            margin:0 !important;
                            padding:4px 6px !important;
                            background:#1976a8 !important;
                            color:#ffffff !important;
                            border:1px solid #145f87 !important;
                            border-radius:5px !important;
                            font-size:11px !important;
                            font-weight:700 !important;
                            line-height:1.1 !important;
                            white-space:nowrap !important;
                            overflow:hidden !important;
                            text-overflow:ellipsis !important;
                        ">
                        إضافة زيارة
                    </button>

                    <button
                        type="button"
                        class="btn er-header-action"
                        data-header-action="bed_dashboard"
                        style="
                            flex:1 1 0 !important;
                            width:0 !important;
                            min-width:0 !important;
                            height:32px !important;
                            min-height:32px !important;
                            margin:0 !important;
                            padding:4px 6px !important;
                            background:#2e8b57 !important;
                            color:#ffffff !important;
                            border:1px solid #246f46 !important;
                            border-radius:5px !important;
                            font-size:11px !important;
                            font-weight:700 !important;
                            line-height:1.1 !important;
                            white-space:nowrap !important;
                            overflow:hidden !important;
                            text-overflow:ellipsis !important;
                        ">
                        لوحة الأسرة
                    </button>

                    <button
                        type="button"
                        class="btn er-header-action"
                        data-header-action="medical_record"
                        style="
                            flex:1 1 0 !important;
                            width:0 !important;
                            min-width:0 !important;
                            height:32px !important;
                            min-height:32px !important;
                            margin:0 !important;
                            padding:4px 6px !important;
                            background:#5b6773 !important;
                            color:#ffffff !important;
                            border:1px solid #4b5660 !important;
                            border-radius:5px !important;
                            font-size:11px !important;
                            font-weight:700 !important;
                            line-height:1.1 !important;
                            white-space:nowrap !important;
                            overflow:hidden !important;
                            text-overflow:ellipsis !important;
                        ">
                        سجل المريض
                    </button>

                    <button
                        type="button"
                        class="btn er-header-action er-header-doctor-visit"
                        data-header-action="doctor_visit"
                        style="
                            flex:1 1 0 !important;
                            width:0 !important;
                            min-width:0 !important;
                            height:32px !important;
                            min-height:32px !important;
                            margin:0 !important;
                            padding:4px 6px !important;
                            background:#c77c11 !important;
                            color:#ffffff !important;
                            border:1px solid #a9670d !important;
                            border-radius:5px !important;
                            font-size:11px !important;
                            font-weight:700 !important;
                            line-height:1.1 !important;
                            white-space:nowrap !important;
                            overflow:hidden !important;
                            text-overflow:ellipsis !important;
                        ">
                        زيارة طبيب
                    </button>

                    <button
                        type="button"
                        class="btn er-header-action"
                        data-header-action="visit_console"
                        style="
                            flex:1 1 0 !important;
                            width:0 !important;
                            min-width:0 !important;
                            height:32px !important;
                            min-height:32px !important;
                            margin:0 !important;
                            padding:4px 6px !important;
                            background:#177e89 !important;
                            color:#ffffff !important;
                            border:1px solid #12656e !important;
                            border-radius:5px !important;
                            font-size:11px !important;
                            font-weight:700 !important;
                            line-height:1.1 !important;
                            white-space:nowrap !important;
                            overflow:hidden !important;
                            text-overflow:ellipsis !important;
                        ">
                        زيارة الطوارئ
                    </button>

                    <button
                        type="button"
                        class="btn er-header-action"
                        data-header-action="current_console"
                        style="
                            flex:1 1 0 !important;
                            width:0 !important;
                            min-width:0 !important;
                            height:32px !important;
                            min-height:32px !important;
                            margin:0 !important;
                            padding:4px 6px !important;
                            background:#6554a6 !important;
                            color:#ffffff !important;
                            border:1px solid #514286 !important;
                            border-radius:5px !important;
                            font-size:11px !important;
                            font-weight:700 !important;
                            line-height:1.1 !important;
                            white-space:nowrap !important;
                            overflow:hidden !important;
                            text-overflow:ellipsis !important;
                        ">
                        شاشة زيارة الطوارئ
                    </button>

                </div>

            </div>


            <!-- =================================================
                 TWO WINDOWS
                 ================================================= -->

            <div class="er-window-grid">


                <!-- =========================
                     VISIT WINDOW
                     ========================= -->

                <section
                    class="er-window er-window-visit"
                    data-window-panel="visit">

                    <div class="er-window-header">
                        <div>بيانات الزيارة</div>
                        <div class="er-visit-identifiers">
                            <span>رقم الزيارة:</span>
                            <strong data-er-visit-number>—</strong>
                        </div>
                    </div>

                    <div class="er-window-body">

                        <div class="er-native-section-host er-native-visit-host"></div>

                        <div class="er-visit-save-bar">
                            <button
                                type="button"
                                class="btn btn-primary btn-sm"
                                data-er-visit-action="save">
                                حفظ الزيارة / Save Visit
                            </button>
                        </div>

                    </div>

                </section>


                <!-- =========================
                     TRIAGE WINDOW
                     ========================= -->

                <section
                    class="er-window er-window-triage"
                    data-window-panel="triage">

                    <div class="er-window-header">
                        <div>الترياج</div>
                        <div class="er-visit-identifiers">
                            <span>سجل الفرز:</span>
                            <strong data-er-triage-record>—</strong>
                        </div>
                    </div>

                    <div class="er-window-body">

                        <div class="er-native-section-host er-native-triage-host"></div>

                        <div class="er-vitals-section">

    <div class="er-triage-section-title">
        العلامات الحيوية / Vital Signs
    </div>

    <div class="er-vitals-toolbar">

        <button
            type="button"
            class="btn btn-primary btn-sm"
            data-er-vitals-action="open">
            إدخال العلامات الحيوية / Enter Vital Signs
        </button>

        <button
            type="button"
            class="btn btn-default btn-sm"
            data-er-vitals-action="refresh">
            تحديث / Refresh
        </button>

    </div>

    <div
        class="er-vitals-latest"
        data-er-vitals-container="latest">

        <div class="er-triage-vitals-loading">
            جاري تحميل آخر العلامات الحيوية / Loading latest vital signs...
        </div>

    </div>

</div>

                    </div>

                </section>

            </div>

        </div>
    `;


    main.prepend(html);


    /*
     * Move COMPLETE native Frappe sections.
     * No individual field movement.
     * No make_control.
     */
    mount_er_native_fields(frm);

    apply_er_intake_single_visual_design(frm);


    /*
     * Buttons.
     */
    bind_er_console_work_actions(frm);
    bind_er_patient_header_actions(frm);
    bind_er_vitals_ui(frm);
    bind_er_visit_save_button(frm);


    /*
     * Patient information.
     */
    load_er_patient_summary(frm);
    refresh_er_patient_summary_boxes(frm);


    /*
     * Native depends_on handling.
     */
    refresh_er_patient_intake_conditionals(frm);


    /*
     * Vital Signs.
     */
    if (
        typeof load_er_triage_vitals ===
        "function"
    ) {
        setTimeout(
            function () {
                load_er_triage_vitals(frm);
            },
            150
        );
    }
}


function mount_er_native_fields(frm) {

    if (
        !frm ||
        !frm.page ||
        !frm.page.main ||
        !frm.fields_dict
    ) {
        return false;
    }


    const main =
        $(frm.page.main);


    const visit_host =
        main.find(
            ".er-native-visit-host"
        ).first();


    const triage_host =
        main.find(
            ".er-native-triage-host"
        ).first();


    if (
        !visit_host.length ||
        !triage_host.length
    ) {
        return false;
    }


    /*
     * Create the field containers only once.
     */
    function ensure_grid(
        host,
        key,
        title
    ) {

        let section =
            host.find(
                '[data-er-native-group="' +
                key +
                '"]'
            ).first();


        if (!section.length) {

            section = $(`
                <div
                    class="er-native-field-group"
                    data-er-native-group="${key}">

                    <div class="er-native-field-group-title">
                        ${frappe.utils.escape_html(title)}
                    </div>

                    <div class="er-native-field-grid"></div>

                </div>
            `);

            host.append(
                section
            );
        }


        return section.find(
            ".er-native-field-grid"
        ).first();
    }


    const visit_main =
        ensure_grid(
            visit_host,
            "visit-main",
            "بيانات الزيارة"
        );


    const visit_arrival =
        ensure_grid(
            visit_host,
            "visit-arrival",
            "بيانات الوصول"
        );


    const visit_case =
        ensure_grid(
            visit_host,
            "visit-case",
            "بيانات الحالة"
        );


    const triage_main =
        ensure_grid(
            triage_host,
            "triage-main",
            "التقييم السريري"
        );


    const triage_disposition =
        ensure_grid(
            triage_host,
            "triage-disposition",
            "التنويم والخروج"
        );


    /*
     * Fields to show in the LEFT window.
     */
    const visit_fields = [

        {
            grid:
                visit_main,

            fields: [
                "patient",
                "اسم_المريض",
                "visit_type",
                "visit_date_time",
                "status",
                "healthcare_practitioner",
                "department",
                "patient_encounter"
            ]
        },

        {
            grid:
                visit_arrival,

            fields: [
                "arrival_mode",
                "arrival_time",
                "referred_from",
                "accompanied_by"
            ]
        },

        {
            grid:
                visit_case,

            fields: [
                "chief_complaint",
                "case_category",
                "case_type",
                "injury_type",
                "other_injury",
                "accident_location",
                "accident_date",
                "accident_details"
            ]
        }

    ];


    /*
     * Fields to show in the RIGHT window.
     *
     * doctor_notes is intentionally excluded.
     */
    const triage_fields = [

        {
            grid:
                triage_main,

            fields: [
                "triage_record",
                "acuity",
                "priority",
                "notes",
                "last_status_update"
            ]
        },

        {
            grid:
                triage_disposition,

            fields: [
                "assigned_bed",
                "admission_time",
                "discharge_time"
            ]
        }

    ];


    /*
     * فحص صلاحية الحقل باستخدام صلاحيات Frappe الفعلية.
     * لا نعتمد على أسماء الأدوار داخل الواجهة.
     */
    function er_field_has_perm(
        doctype,
        field,
        ptype
    ) {

        const permlevel =
            Number(
                field &&
                field.df &&
                field.df.permlevel
                    ? field.df.permlevel
                    : 0
            );

        try {

            return !!(
                frappe.perm &&
                typeof frappe.perm.has_perm ===
                    "function" &&
                frappe.perm.has_perm(
                    doctype,
                    permlevel,
                    ptype
                )
            );

        } catch (e) {

            return false;
        }
    }


    /*
     * حفظ read_only الأصلي للحقل حتى لا نكسر
     * تعريف الـDocType عند إعادة التحديث.
     */
    function er_apply_field_permission(
        fieldname,
        field
    ) {

        if (!field || !field.$wrapper) {
            return false;
        }

        if (
            typeof field.__erOriginalReadOnly ===
            "undefined"
        ) {

            field.__erOriginalReadOnly =
                !!(
                    field.df &&
                    field.df.read_only
                );
        }

        /*
         * assigned_bed يعتمد على صلاحية ER Bed،
         * لأن المطلوب التحكم في اختيار المورد نفسه.
         */
        const permission_doctype =
            fieldname === "assigned_bed"
                ? "ER Bed"
                : "ER Patient Intake";

        const can_read =
            er_field_has_perm(
                permission_doctype,
                field,
                "read"
            );

        const can_write =
            er_field_has_perm(
                permission_doctype,
                field,
                "write"
            );

        if (!can_read) {

            field.$wrapper
                .addClass(
                    "er-permission-hidden"
                )
                .hide();

            return false;
        }

        field.$wrapper
            .removeClass(
                "er-permission-hidden"
            )
            .show()
            .removeClass(
                "hide hidden hide-control"
            );

        const should_be_read_only =
            field.__erOriginalReadOnly ||
            !can_write;

        field.df.read_only =
            should_be_read_only ? 1 : 0;

        try {

            if (
                typeof field.set_read_only ===
                "function"
            ) {

                field.set_read_only(
                    should_be_read_only ? 1 : 0
                );

            }

        } catch (e) {}

        return true;
    }


    /*
     * Move one original Frappe field wrapper.
     */
    function move_field(
        fieldname,
        grid
    ) {

        const field =
            frm.fields_dict[
                fieldname
            ];


        if (
            !field ||
            !field.$wrapper
        ) {
            return false;
        }


        const wrapper =
            field.$wrapper;


        /*
         * طبّق الصلاحية قبل أي .show().
         * assigned_bed مربوط بصلاحية ER Bed.
         */
        if (
            !er_apply_field_permission(
                fieldname,
                field
            )
        ) {

            return false;
        }


        /*
         * Already in one of our grids.
         */
        if (
            wrapper.closest(
                ".er-native-field-grid"
            ).length
        ) {

            wrapper
                .removeClass(
                    "hide hidden hide-control"
                )
                .show();


            if (
                typeof field.refresh ===
                "function"
            ) {

                field.refresh();
            }


            return true;
        }


        /*
         * Move the ACTUAL native Frappe control.
         * No new control is created.
         */
        wrapper
            .detach()
            .addClass(
                "er-native-field-item"
            )
            .removeClass(
                "hide hidden hide-control"
            )
            .show()
            .css({
                display:
                    "block",

                visibility:
                    "visible",

                opacity:
                    "1",

                width:
                    "100%"
            });


        /*
         * Full width fields.
         */
        if (
            [
                "notes",
                "chief_complaint",
                "accident_details",
                "patient_encounter",
                "last_status_update"
            ].includes(fieldname)
        ) {

            wrapper.addClass(
                "er-native-field-full"
            );
        }


        grid.append(
            wrapper
        );


        /*
         * Re-run the field's own Frappe refresh.
         * This preserves Link / Select / Datetime behavior
         * and applies depends_on from the real DocType.
         */
        if (
            typeof field.refresh ===
            "function"
        ) {

            field.refresh();
        }


        return true;
    }


    let moved =
        0;


    visit_fields.forEach(
        function(group) {

            group.fields.forEach(
                function(fieldname) {

                    if (
                        move_field(
                            fieldname,
                            group.grid
                        )
                    ) {

                        moved++;
                    }

                }
            );

        }
    );


    triage_fields.forEach(
        function(group) {

            group.fields.forEach(
                function(fieldname) {

                    if (
                        move_field(
                            fieldname,
                            group.grid
                        )
                    ) {

                        moved++;
                    }

                }
            );

        }
    );


    /*
     * Hide the original Frappe form AFTER moving the fields.
     * The moved wrappers are no longer children of form-layout.
     */
    const original_layout =
        main.find(
            ".form-layout"
        ).first();


    if (
        original_layout.length
    ) {

        original_layout.hide();
    }


    /*
     * Explicitly keep our native controls visible.
     */
    main.find(
        ".er-native-field-grid .form-group:not(.er-permission-hidden)"
    )
        .removeClass(
            "hide hidden hide-control"
        )
        .show();


    /*
     * Re-apply conditional fields.
     */
    if (
        typeof refresh_er_patient_intake_conditionals ===
        "function"
    ) {

        refresh_er_patient_intake_conditionals(
            frm
        );
    }


    return moved > 0;
}


function hide_er_source_sections(frm) {

    if (
        !frm ||
        !frm.page ||
        !frm.page.main
    ) {
        return;
    }


    /*
     * Only the sections which remain in the original
     * Frappe form layout are hidden.
     *
     * Target visit/triage sections have already been
     * moved into the custom windows.
     */
    $(frm.page.main)
        .find(
            ".form-layout .form-section"
        )
        .hide();


    $(frm.page.main)
        .find(
            ".form-layout"
        )
        .hide();
}


function refresh_er_patient_summary_boxes(frm) {

    if (
        !frm ||
        !frm.page ||
        !frm.page.main
    ) {
        return;
    }


    const root =
        $(frm.page.main)
            .find(
                ".er-two-window-ui"
            );


    if (!root.length) {
        return;
    }


    const assigned_bed_summary =
        root.find(
            '[data-er-summary="assigned_bed"]'
        );

    const can_read_bed =
        !!(
            frappe.perm &&
            typeof frappe.perm.has_perm ===
                "function" &&
            frappe.perm.has_perm(
                "ER Bed",
                0,
                "read"
            )
        );

    if (assigned_bed_summary.length) {

        if (can_read_bed) {

            assigned_bed_summary
                .closest("div")
                .show();

        } else {

            assigned_bed_summary
                .closest("div")
                .hide();

        }
    }


    const values = {

        case_type:
            frm.doc.case_type,

        case_category:
            frm.doc.case_category,

        injury_type:
            frm.doc.injury_type,

        waiting_area:
            frm.doc.waiting_area,

        assigned_bed:
            frm.doc.assigned_bed

    };


    Object.keys(values).forEach(
        function(name) {

            root.find(
                '[data-er-summary="' +
                name +
                '"]'
            ).text(
                values[name] || "—"
            );

        }
    );
}


function load_er_patient_summary(frm) {

    if (
        !frm ||
        !frm.page ||
        !frm.page.main
    ) {
        return;
    }


    const root =
        $(frm.page.main)
            .find(
                ".er-two-window-ui"
            )
            .first();


    if (!root.length) {
        return;
    }


    const patient =
        frm.doc.patient ||
        "";


    /*
     * The summary box must show ONLY the patient's actual name.
     * Never show Patient ID/name code in this box.
     */
    const patient_box =
        root.find(
            '[data-er-summary="patient"]'
        );


    if (!patient) {

        patient_box.text("—");

        root.find(
            '[data-er-summary="age"]'
        ).text("—");

        root.find(
            '[data-er-summary="gender"]'
        ).text("—");

        root.find(
            '[data-er-summary="governorate"]'
        ).text("—");

        root.find(
            '[data-er-summary="district"]'
        ).text("—");

        /*
         * Clear any legacy patient-id display if it exists.
         */
        root.find(
            '[data-er-summary="patient_id"]'
        ).text("—");

        return;
    }


    /*
     * Do not display the Patient ID while loading.
     */
    patient_box.text("جاري تحميل اسم المريض...");


    frappe.call({

        method:
            "frappe.client.get",

        args: {

            doctype:
                "Patient",

            name:
                patient

        },

        callback:
            function(r) {

                if (
                    r.exc ||
                    !r.message
                ) {

                    patient_box.text(
                        patient
                    );

                    return;
                }


                const data =
                    r.message;


                /*
                 * Actual Patient Name.
                 */
                patient_box.text(
                    data.patient_name ||
                    data.name ||
                    patient
                );


                root.find(
                    '[data-er-summary="age"]'
                ).text(
                    calculate_er_age(
                        data.dob
                    )
                );


                root.find(
                    '[data-er-summary="gender"]'
                ).text(
                    data.sex ||
                    "—"
                );


                root.find(
                    '[data-er-summary="governorate"]'
                ).text(
                    get_er_patient_value(
                        data,
                        [
                            "governorate",
                            "custom_governorate"
                        ]
                    ) || "—"
                );


                root.find(
                    '[data-er-summary="district"]'
                ).text(
                    get_er_patient_value(
                        data,
                        [
                            "district",
                            "custom_district"
                        ]
                    ) || "—"
                );


                /*
                 * Legacy patient-id box, if present anywhere,
                 * must remain empty.
                 */
                root.find(
                    '[data-er-summary="patient_id"]'
                ).text("");
            }

    });
}



function get_er_patient_value(data, names) {

    for (
        var i = 0;
        i < names.length;
        i++
    ) {

        var value =
            data[names[i]];

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim()
        ) {
            return value;
        }
    }

    return "";
}


function calculate_er_age(dob) {

    if (!dob) {
        return "—";
    }


    var parts =
        String(dob).split("-");


    if (parts.length !== 3) {
        return "—";
    }


    var birth =
        new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );


    var today =
        new Date();


    var age =
        today.getFullYear() -
        birth.getFullYear();


    var month =
        today.getMonth() -
        birth.getMonth();


    if (
        month < 0 ||
        (
            month === 0 &&
            today.getDate() <
            birth.getDate()
        )
    ) {
        age--;
    }


    return String(
        Math.max(0, age)
    );
}


function refresh_er_patient_intake_conditionals(frm) {

    if (!frm || !frm.fields_dict) {
        return;
    }

    const accident_fields = [
        "accident_location",
        "accident_date",
        "accident_details"
    ];

    const case_type =
        String(
            frm.doc.case_type || ""
        ).trim();

    const show_accident_fields =
        case_type === "حادث";


    /*
     * =========================================================
     * Normal DocType depends_on fields
     * =========================================================
     */

    Object.keys(frm.fields_dict).forEach(function(fieldname) {

        const field =
            frm.fields_dict[fieldname];

        if (
            !field ||
            !field.df ||
            !field.df.depends_on
        ) {
            return;
        }

        /*
         * Accident fields are controlled explicitly below.
         */
        if (
            accident_fields.indexOf(fieldname) !== -1
        ) {
            return;
        }

        let should_show = true;

        try {

            should_show =
                evaluate_depends_on(
                    frm,
                    field.df.depends_on
                );

        } catch (e) {

            /*
             * Do not break the whole form because of
             * another field's depends_on expression.
             */
            should_show = true;
        }

        if (field.$wrapper) {

            field.$wrapper.toggle(
                should_show
            );
        }
    });


    /*
     * =========================================================
     * Explicit CASE TYPE filtering
     * =========================================================
     *
     * empty  -> hidden
     * مرضية  -> hidden
     * حادث   -> visible
     *
     * Use inline !important so old CSS cannot override it.
     */

    accident_fields.forEach(function(fieldname) {

        const field =
            frm.fields_dict[fieldname];

        if (
            !field ||
            !field.$wrapper
        ) {
            return;
        }

        const wrapper =
            field.$wrapper;

        if (show_accident_fields) {

            wrapper
                .removeAttr("hidden")
                .removeClass(
                    "hide hidden hide-control"
                );

            wrapper[0].style.setProperty(
                "display",
                "block",
                "important"
            );

            wrapper[0].style.setProperty(
                "visibility",
                "visible",
                "important"
            );

        } else {

            wrapper
                .attr(
                    "hidden",
                    "hidden"
                )
                .addClass(
                    "hide"
                );

            wrapper[0].style.setProperty(
                "display",
                "none",
                "important"
            );

            wrapper[0].style.setProperty(
                "visibility",
                "hidden",
                "important"
            );
        }
    });
}


function inject_er_two_window_css() {

    if (
        $("#er-two-window-clean-css").length
    ) {
        return;
    }


    $("head").append(`
        <style id="er-two-window-clean-css">

            /* =================================================
             * MAIN SURFACE
             * ================================================= */

            .er-two-window-ui {
                direction: rtl !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 10px !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                background: #f6f8fb !important;
                border-radius: 10px !important;
            }


            /* =================================================
             * SERVICE BUTTONS
             * ================================================= */



            .er-console-work-action[data-console-section="labs"] {
                background: #eef6ff !important;
            }

            .er-console-work-action[data-console-section="radiology"] {
                background: #eef8f2 !important;
            }

            .er-console-work-action[data-console-section="medications"] {
                background: #fff8e9 !important;
            }

            .er-console-work-action[data-console-section="procedures"] {
                background: #f4f0ff !important;
            }


            /* =================================================
             * PATIENT SUMMARY
             * ================================================= */

            .er-patient-summary {
                background: #fbfcfe !important;
                border: 1px solid #d9e2ec !important;
                border-radius: 9px !important;
                padding: 9px !important;
                margin-bottom: 10px !important;
                box-shadow: 0 1px 3px rgba(15,23,42,.04) !important;
            }

            .er-patient-summary-title {
                font-size: 14px !important;
                font-weight: 700 !important;
                padding-bottom: 6px !important;
                margin-bottom: 7px !important;
                border-bottom: 1px solid #e5eaf0 !important;
                color: #334155 !important;
            }

            .er-patient-summary-grid {
                display: grid !important;
                grid-template-columns:
                    2fr
                    repeat(4, minmax(0, 1fr)) !important;
                gap: 6px !important;
            }

            .er-patient-summary-grid > div {
                min-width: 0 !important;
                min-height: 43px !important;
                padding: 6px 7px !important;
                background: #ffffff !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 7px !important;
                box-sizing: border-box !important;
            }

            .er-patient-summary-grid span {
                display: block !important;
                font-size: 10px !important;
                color: #64748b !important;
                margin-bottom: 3px !important;
            }

            .er-patient-summary-grid strong {
                display: block !important;
                font-size: 12px !important;
                line-height: 1.25 !important;
                color: #1e293b !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }


            /* =================================================
             * PATIENT ACTIONS
             * ================================================= */

            .er-patient-action-bar {
                display: grid !important;
                grid-template-columns:
                    repeat(4, minmax(0, 1fr)) !important;
                gap: 7px !important;
                margin-top: 8px !important;
                padding-top: 7px !important;
                border-top: 1px solid #e2e8f0 !important;
            }

            .er-patient-action-bar
            .er-header-action {
                min-height: 39px !important;
                padding: 7px 9px !important;
                border: 1px solid #d8e0e8 !important;
                border-radius: 7px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                white-space: normal !important;
                box-shadow: none !important;
            }

            .er-patient-action-bar
            .er-header-action:nth-child(1) {
                background: #eef6ff !important;
            }

            .er-patient-action-bar
            .er-header-action:nth-child(2) {
                background: #eef9f1 !important;
            }

            .er-patient-action-bar
            .er-header-action:nth-child(3) {
                background: #fff7e9 !important;
            }

            .er-patient-action-bar
            .er-header-action:nth-child(4) {
                background: #f3efff !important;
            }

            .er-patient-action-bar
            .er-header-action:nth-child(5) {
                background: #edf9f8 !important;
            }

            .er-patient-action-bar
            .er-header-action:nth-child(6) {
                background: #f7f2ff !important;
            }

            .er-patient-action-bar
            .er-header-action:nth-child(7) {
                background: #fff1f1 !important;
            }

            .er-patient-action-bar
            .er-header-action:nth-child(8) {
                background: #eef4ff !important;
            }


            /* =================================================
             * WINDOWS
             * ================================================= */

            .er-window-grid {
                display: grid !important;
                grid-template-columns:
                    minmax(0, 1fr)
                    minmax(0, 1fr) !important;
                gap: 12px !important;
                align-items: start !important;
                width: 100% !important;
            }

            .er-window {
                min-width: 0 !important;
                background: #ffffff !important;
                border: 1px solid #d9e2eb !important;
                border-radius: 9px !important;
                box-shadow: 0 1px 3px rgba(15,23,42,.05) !important;
                overflow: visible !important;
            }

            .er-window-visit {
                background: #fafdff !important;
            }

            .er-window-triage {
                background: #fafffb !important;
            }

            .er-visit-identifiers {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 4px;
                font-size: 12px;
                line-height: 1.3;
            }

            .er-visit-identifiers span {
                font-weight: 600;
            }

            .er-visit-identifiers strong {
                direction: ltr;
                unicode-bidi: plaintext;
                font-weight: 700;
            }

            .er-window-header {
                min-height: 43px !important;
                display: flex !important;
                align-items: center !important;
                padding: 10px 13px !important;
                font-size: 15px !important;
                font-weight: 700 !important;
                border-bottom: 1px solid #e1e7ee !important;
                box-sizing: border-box !important;
            }

            .er-window-visit
            .er-window-header {
                background: #eef6ff !important;
            }

            .er-window-triage
            .er-window-header {
                background: #eef8f2 !important;
            }

            .er-window-body {
                padding: 11px !important;
            }


            /* =================================================
             * VISIT SAVE BUTTON
             * ================================================= */

            .er-visit-save-bar {
                display: flex !important;
                justify-content: flex-start !important;
                align-items: center !important;
                margin-top: 12px !important;
                padding-top: 10px !important;
                border-top: 1px solid #e1e7ee !important;
            }

            .er-visit-save-bar button {
                min-width: 150px !important;
                min-height: 36px !important;
                padding: 7px 14px !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
            }


            /* =================================================
             * NATIVE FRAPPE SECTIONS
             * ================================================= */

            .er-native-section-host {
                width: 100% !important;
                min-width: 0 !important;
            }

            .er-native-section-host
            .form-section {
                display: block !important;
                width: 100% !important;
                margin: 0 0 9px 0 !important;
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
            }

            .er-native-section-host
            .section-head {
                display: block !important;
                padding: 7px 9px !important;
                margin-bottom: 8px !important;
                border: 1px solid #e1e7ee !important;
                border-radius: 7px !important;
                background: #f7f9fb !important;
            }

            .er-native-section-host
            .section-head .section-head-title {
                font-size: 12px !important;
                font-weight: 700 !important;
                color: #475569 !important;
            }

            .er-native-section-host
            .section-body {
                display: flex !important;
                gap: 9px !important;
                width: 100% !important;
            }

            .er-native-section-host
            .form-column {
                flex: 1 1 0 !important;
                min-width: 0 !important;
            }

            .er-native-section-host
            .form-group {
                margin-bottom: 8px !important;
                width: 100% !important;
            }

            .er-native-section-host
            .control-label {
                display: block !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                color: #475569 !important;
                margin-bottom: 3px !important;
            }

            .er-native-section-host
            .frappe-control {
                display: block !important;
                width: 100% !important;
                min-width: 0 !important;
            }

            .er-native-section-host
            .control-input,
            .er-native-section-host
            .control-input-wrapper {
                width: 100% !important;
                min-width: 0 !important;
            }

            .er-native-section-host
            input.form-control,
            .er-native-section-host
            select.form-control,
            .er-native-section-host
            textarea.form-control {
                width: 100% !important;
                min-height: 35px !important;
                box-sizing: border-box !important;
            }

            .er-native-section-host
            .awesomplete {
                position: relative !important;
                width: 100% !important;
            }

            .er-native-section-host
            .awesomplete > ul {
                z-index: 10050 !important;
                max-height: 280px !important;
            }


            /* =================================================
             * TRIAGE / VITALS
             * ================================================= */

            .er-vitals-section {
                margin-top: 10px !important;
                padding: 10px !important;
                border: 1px solid #dce9e1 !important;
                border-radius: 8px !important;
                background: #f8fcf9 !important;
            }

            .er-triage-section-title {
                padding: 6px 8px !important;
                margin: 0 0 8px !important;
                border: 1px solid #dce9e1 !important;
                border-radius: 7px !important;
                background: #f2f8f4 !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                color: #475569 !important;
            }

            .er-vitals-toolbar {
                display: flex !important;
                gap: 7px !important;
                flex-wrap: wrap !important;
                margin-bottom: 8px !important;
            }


            /* =================================================
             * NATIVE FIELDS INSIDE ER WINDOWS
             * ================================================= */

            .er-native-field-group {
                width: 100% !important;
                margin-bottom: 10px !important;
            }

            .er-native-field-group-title {
                margin-bottom: 7px !important;
                padding: 7px 9px !important;
                border: 1px solid #e1e7ee !important;
                border-radius: 7px !important;
                background: #f7f9fb !important;
                color: #475569 !important;
                font-size: 12px !important;
                font-weight: 700 !important;
            }

            .er-native-field-grid {
                display: grid !important;
                grid-template-columns:
                    repeat(2, minmax(0, 1fr)) !important;
                gap: 7px 9px !important;
                width: 100% !important;
                align-items: start !important;
            }

            .er-native-field-grid
            .er-native-field-item {
                min-width: 0 !important;
                width: 100% !important;
                margin: 0 !important;
            }

            .er-native-field-grid
            .er-native-field-full {
                grid-column: 1 / -1 !important;
            }

            .er-native-field-grid
            .form-group {
                margin-bottom: 4px !important;
            }

            .er-native-field-grid
            .form-control {
                width: 100% !important;
            }

            .er-native-field-grid
            .control-label {
                font-size: 11px !important;
                font-weight: 600 !important;
                color: #475569 !important;
                margin-bottom: 3px !important;
            }


            /* =================================================
             * VITALS LATEST READING
             * ================================================= */

            .er-vitals-latest-card {
                width: 100% !important;
                padding: 9px !important;
                border: 1px solid #dce5ec !important;
                border-radius: 8px !important;
                background: #ffffff !important;
            }

            .er-vitals-latest-meta {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
                margin-bottom: 8px !important;
                color: #64748b !important;
                font-size: 11px !important;
            }

            .er-vitals-latest-grid {
                display: grid !important;
                grid-template-columns:
                    repeat(4, minmax(0, 1fr)) !important;
                gap: 6px !important;
            }

            .er-vital-value-box {
                min-width: 0 !important;
                padding: 7px !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 7px !important;
                background: #f8fafc !important;
            }

            .er-vital-value-label {
                margin-bottom: 3px !important;
                color: #64748b !important;
                font-size: 10px !important;
            }

            .er-vital-value-value {
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
                color: #1e293b !important;
                font-size: 13px !important;
                font-weight: 700 !important;
            }

            .er-vital-value-unit {
                color: #64748b !important;
                font-size: 10px !important;
                font-weight: 500 !important;
            }

            .er-vitals-latest-note {
                margin-top: 8px !important;
                padding-top: 8px !important;
                border-top: 1px solid #e2e8f0 !important;
                color: #475569 !important;
                font-size: 11px !important;
                line-height: 1.5 !important;
            }


            /* =================================================
             * VITALS DIALOG RECORD AREA
             * ================================================= */

            .er-vitals-record-panel {
                display: none;
                margin-top: 8px;
                padding: 10px;
                border: 1px solid #dce9e1;
                border-radius: 8px;
                background: #f4faf6;
            }

            .er-vitals-record-title {
                margin-bottom: 4px;
                color: #166534;
                font-size: 12px;
                font-weight: 700;
            }

            .er-vitals-record-message {
                margin-bottom: 8px;
                color: #64748b;
                font-size: 11px;
            }

            .er-vitals-record-status {
                margin-inline-start: 8px;
                color: #64748b;
                font-size: 11px;
            }


            /* =================================================
             * RESPONSIVE
             * ================================================= */


            @media (max-width: 950px) {

                .er-patient-summary-grid {
                    grid-template-columns:
                        repeat(3, minmax(0, 1fr)) !important;
                }

            }

            @media (max-width: 780px) {

                .er-window-grid {
                    grid-template-columns: 1fr !important;
                }

                .er-patient-action-bar,

                .er-patient-summary-grid {
                    grid-template-columns:
                        repeat(2, minmax(0, 1fr)) !important;
                }

                .er-native-section-host
                .section-body {
                    display: block !important;
                }

                .er-native-section-host
                .form-column {
                    width: 100% !important;
                }

            }

            @media (max-width: 500px) {

                .er-patient-action-bar,

            }

        </style>
    `);
}


function ensure_er_triage_vitals_styles() {
    /*
     * Kept for compatibility with older callers.
     * Final styles are injected by inject_er_two_window_css().
     */
    inject_er_two_window_css();
}

function er_triage_escape(value) {
    if (value === null || value === undefined || value === "") {
        return "---";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function er_triage_vital_value(value, suffix) {
    if (value === null || value === undefined || value === "") {
        return "---";
    }

    return er_triage_escape(value) + (suffix || "");
}



function render_er_triage_vitals(frm, vital) {

    const root = $(frm.page.main).find(
        '.er-two-window-ui [data-er-vitals-container="latest"]'
    );

    if (!root.length) {
        return;
    }

    if (!vital) {

        root.html(`
            <div class="er-triage-vitals-empty">
                لا توجد علامات حيوية مسجلة لهذه الزيارة بعد.
            </div>
        `);

        return;
    }

    let bp = "---";

    if (
        vital.bp_systolic !== null &&
        vital.bp_systolic !== undefined &&
        vital.bp_systolic !== ""
    ) {

        bp =
            er_triage_escape(vital.bp_systolic) +
            "/" +
            er_triage_escape(vital.bp_diastolic || "");

    } else if (vital.bp) {

        bp = er_triage_escape(vital.bp);

    }

    const recorded_date =
        er_triage_escape(vital.signs_date || "");

    const recorded_time =
        er_triage_escape(vital.signs_time || "");

    root.html(`

        <div class="er-triage-vitals-grid">

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    الحرارة °C
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.temperature)}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    النبض
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.pulse)}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    معدل التنفس
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.respiratory_rate)}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    SpO2
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.spo2, "%")}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    ضغط الدم
                </div>
                <div class="er-triage-vital-value">
                    ${bp}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    درجة الألم
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.pain_score)}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    الطول (م)
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.height)}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    الوزن (كجم)
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.weight)}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    BMI
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.bmi)}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    ESI
                </div>
                <div class="er-triage-vital-value">
                    ${er_triage_vital_value(vital.esi_level)}
                </div>
            </div>

            <div class="er-triage-vital-card">
                <div class="er-triage-vital-label">
                    تنبيه حرج
                </div>
                <div class="er-triage-vital-value">
                    ${vital.critical_alert ? "نعم" : "لا"}
                </div>
            </div>

        </div>

        <div class="er-triage-vitals-meta">

            آخر تسجيل:
            ${recorded_date || "---"}
            ${recorded_time || ""}

            ${
                vital.name
                    ? " — " + er_triage_escape(vital.name)
                    : ""
            }

        </div>

        ${
            vital.vital_signs_note
                ? `
                    <div class="er-triage-vitals-meta">
                        ملاحظات:
                        ${er_triage_escape(vital.vital_signs_note)}
                    </div>
                  `
                : ""
        }

    `);
}


async function load_er_triage_vitals(frm) {

    bind_er_vitals_ui(frm);

    load_er_latest_vitals(frm);
}


async function save_er_visit_window(frm) {

    if (!frm || !frm.doc) {
        throw new Error(
            "ER Patient Intake form is not available."
        );
    }

    /*
     * The first save MUST finish before any server method
     * receives frm.doc.name.
     *
     * New documents initially have names such as:
     * new-er-patient-intake-xxxx
     *
     * Only the real ERI-YYYY-xxxxx name may be sent
     * to start_triage().
     */
    if (
        frm.is_new() ||
        !frm.doc.name ||
        String(frm.doc.name).startsWith("new-")
    ) {
        await frm.save();
    } else if (frm.is_dirty()) {
        await frm.save();
    }

    /*
     * Frappe normally updates frm.doc.name when the save
     * response is applied. Wait defensively for that update
     * before calling the server-side triage method.
     */
    const wait_started = Date.now();

    while (
        (
            frm.is_new() ||
            !frm.doc.name ||
            String(frm.doc.name).startsWith("new-")
        ) &&
        Date.now() - wait_started < 5000
    ) {
        await new Promise(function(resolve) {
            setTimeout(resolve, 100);
        });
    }

    const intake_name =
        frm &&
        frm.doc &&
        frm.doc.name
            ? String(frm.doc.name)
            : "";

    /*
     * NEVER send a temporary client-side name to the server.
     */
    if (
        !intake_name ||
        intake_name.startsWith("new-") ||
        frm.is_new()
    ) {
        throw new Error(
            "تم حفظ النموذج ظاهريًا، لكن لم يتم الحصول على رقم زيارة حقيقي ERI-2026-xxxxx. لم يتم بدء الفرز."
        );
    }

    console.info(
        "ER Patient Intake saved successfully:",
        intake_name
    );

    /*
     * Now and only now start the initial triage.
     */
    const triage_record =
        await new Promise(function(resolve, reject) {

            frappe.call({

                method:
                    "custom_app.emergency_management.doctype.er_patient_intake.er_patient_intake.start_triage",

                args: {

                    intake_name:
                        intake_name

                },

                freeze:
                    true,

                freeze_message:
                    "جاري بدء الفرز / Starting triage...",

                callback:
                    function(r) {

                        if (
                            !r ||
                            r.exc ||
                            !r.message
                        ) {

                            reject(
                                new Error(
                                    "تعذر إنشاء سجل الفرز."
                                )
                            );

                            return;
                        }

                        resolve(
                            r.message
                        );
                    }
            });

        });

    /*
     * Reload the real Intake so the UI receives:
     * status = تحت الفرز
     * triage_record = HLC-VTS-...
     */
    await frm.reload_doc();

    update_er_visit_identifiers(frm);

    frappe.show_alert({

        message:
            "تم حفظ الزيارة وبدء الفرز: " +
            triage_record,

        indicator:
            "green"

    });

}

function update_er_visit_identifiers(frm) {

    if (!frm || !frm.page || !frm.page.main) {
        return;
    }

    var root =
        $(frm.page.main)
            .find(".er-two-window-ui")
            .first();

    if (!root.length) {
        return;
    }

    root.find("[data-er-visit-number]")
        .text(frm.doc.name || "—");

    root.find("[data-er-triage-record]")
        .text(frm.doc.triage_record || "—");
}


function bind_er_visit_save_button(frm) {

    if (
        !frm ||
        !frm.page ||
        !frm.page.main
    ) {
        return;
    }

    update_er_visit_identifiers(frm);


    const root =
        $(frm.page.main)
            .find(
                ".er-two-window-ui"
            )
            .first();


    if (!root.length) {
        return;
    }


    root
        .off(
            "click.erVisitSave",
            '[data-er-visit-action="save"]'
        )
        .on(
            "click.erVisitSave",
            '[data-er-visit-action="save"]',
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                const button =
                    $(this);


                if (button.prop("disabled")) {
                    return;
                }


                button.prop(
                    "disabled",
                    true
                );


                button.text(
                    "جاري الحفظ / Saving..."
                );


                /*
                 * Use the existing visit-save flow.
                 * It saves the native Frappe fields first,
                 * then moves to triage exactly once.
                 */
                Promise.resolve(
                    save_er_visit_window(frm)
                )
                .catch(
                    function(error) {

                        console.error(
                            "ER Visit Save Error:",
                            error
                        );

                        button.prop(
                            "disabled",
                            false
                        );

                        button.text(
                            "حفظ الزيارة / Save Visit"
                        );

                        frappe.msgprint({
                            title: "تعذر حفظ بيانات الزيارة",
                            message:
                                (error && error.message)
                                || "حدث خطأ أثناء حفظ الزيارة. راجع Console.",
                            indicator: "red"
                        });

                    }
                );
            }
        );
}


/* ============================================================
 * Vital Signs
 * ============================================================ */

function bind_er_vitals_ui(frm) {

    if (
        !frm ||
        !frm.page ||
        !frm.page.main
    ) {
        return;
    }


    const root =
        $(frm.page.main)
            .find(
                ".er-two-window-ui"
            )
            .first();


    if (!root.length) {
        return;
    }


    root
        .off(
            "click.erCleanVitalsOpen"
        )
        .on(
            "click.erCleanVitalsOpen",
            '[data-er-vitals-action="open"]',
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                open_er_vitals_entry_dialog(
                    frm
                );
            }
        );


    root
        .off(
            "click.erCleanVitalsRefresh"
        )
        .on(
            "click.erCleanVitalsRefresh",
            '[data-er-vitals-action="refresh"]',
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                load_er_latest_vitals(
                    frm
                );
            }
        );
}




function load_er_latest_vitals(frm) {

    if (
        !frm ||
        !frm.page ||
        !frm.page.main
    ) {
        return;
    }


    const root =
        $(frm.page.main)
            .find(
                ".er-two-window-ui"
            )
            .first();


    const container =
        root.find(
            '[data-er-vitals-container="latest"]'
        ).first();


    if (!container.length) {
        return;
    }


    if (!frm.doc.patient) {

        container.html(`
            <div class="er-triage-vitals-empty">
                لا يوجد مريض محدد / No patient selected
            </div>
        `);

        return;
    }


    frappe.call({

        method:
            "frappe.client.get_list",

        args: {

            doctype:
                "Vital Signs",

            filters: {

                patient:
                    frm.doc.patient

            },

            fields: [

                "name",
                "docstatus",
                "patient",
                "patient_name",
                "encounter",

                "signs_date",
                "signs_time",

                "temperature",
                "pulse",
                "respiratory_rate",

                "tongue",
                "abdomen",
                "reflexes",

                "bp_systolic",
                "bp_diastolic",

                "spo2",
                "custom_blood_glucose",

                "vital_signs_note",

                "height",
                "weight",
                "bmi",

                "nutrition_note"

            ],

            order_by:
                "creation desc",

            limit_page_length:
                1

        },

        callback:
            function(r) {

                if (
                    r.exc
                ) {

                    container.html(`
                        <div class="er-triage-vitals-empty">
                            تعذر تحميل العلامات الحيوية /
                            Could not load vital signs
                        </div>
                    `);

                    return;
                }


                const rows =
                    r.message ||
                    [];


                if (!rows.length) {

                    container.html(`
                        <div class="er-triage-vitals-empty">
                            لا توجد قراءة مسجلة بعد /
                            No vital signs recorded yet
                        </div>
                    `);

                    return;
                }


                const v =
                    rows[0];


                const recorded =
                    Number(
                        v.docstatus
                    ) === 1
                        ? "مسجلة / Recorded"
                        : "محفوظة / Saved";


                const blood_pressure =
                    (
                        v.bp_systolic ||
                        v.bp_diastolic
                    )
                        ? (
                            (v.bp_systolic || "—") +
                            " / " +
                            (v.bp_diastolic || "—")
                        )
                        : "—";


                container.html(`

                    <div class="er-vitals-latest-card">

                        <div class="er-vitals-latest-meta">

                            <span>
                                ${frappe.utils.escape_html(recorded)}
                            </span>

                            <span>
                                ${frappe.utils.escape_html(
                                    (
                                        v.signs_date ||
                                        "—"
                                    ) +
                                    " " +
                                    (
                                        v.signs_time ||
                                        ""
                                    )
                                )}
                            </span>

                        </div>


                        <div class="er-vitals-latest-grid">

                            ${er_vital_value_box(
                                "الحرارة / Temperature",
                                v.temperature,
                                "°C"
                            )}

                            ${er_vital_value_box(
                                "النبض / Pulse",
                                v.pulse,
                                "bpm"
                            )}

                            ${er_vital_value_box(
                                "التنفس / Respiratory Rate",
                                v.respiratory_rate,
                                "/min"
                            )}

                            ${er_vital_value_box(
                                "الضغط / Blood Pressure",
                                blood_pressure,
                                "mmHg"
                            )}

                            ${er_vital_value_box(
                                "اللسان / Tongue",
                                v.tongue,
                                ""
                            )}

                            ${er_vital_value_box(
                                "البطن / Abdomen",
                                v.abdomen,
                                ""
                            )}

                            ${er_vital_value_box(
                                "المنعكسات / Reflexes",
                                v.reflexes,
                                ""
                            )}

                            ${er_vital_value_box(
                                "الطول / Height",
                                v.height,
                                "m"
                            )}

                            ${er_vital_value_box(
                                "الوزن / Weight",
                                v.weight,
                                "kg"
                            )}

                            ${er_vital_value_box(
                                "BMI",
                                v.bmi,
                                ""
                            )}

                            ${er_vital_value_box(
                                "تشبع الأكسجين / SpO₂",
                                v.spo2,
                                "%"
                            )}

                            ${er_vital_value_box(
                                "سكر الدم / Blood Glucose",
                                v.custom_blood_glucose,
                                ""
                            )}

                        </div>


                        ${
                            v.vital_signs_note
                                ? `
                                    <div
                                        class="er-vitals-latest-note">
                                        <strong>
                                            ملاحظات / Notes:
                                        </strong>
                                        ${frappe.utils.escape_html(
                                            v.vital_signs_note
                                        )}
                                    </div>
                                `
                                : ""
                        }

                    </div>

                `);

            }

    });
}


function er_vital_value_box(
    label,
    value,
    unit
) {

    const display =
        (
            value !== null &&
            value !== undefined &&
            value !== ""
        )
            ? String(value)
            : "—";


    return `
        <div class="er-vital-value-box">

            <div class="er-vital-value-label">
                ${frappe.utils.escape_html(label)}
            </div>

            <div class="er-vital-value-value">
                ${frappe.utils.escape_html(display)}
                ${
                    unit
                        ? `
                            <span class="er-vital-value-unit">
                                ${frappe.utils.escape_html(unit)}
                            </span>
                        `
                        : ""
                }
            </div>

        </div>
    `;
}




function open_er_vitals_entry_dialog(frm) {

    if (!frm || !frm.doc || !frm.doc.patient) {
        frappe.msgprint({
            title: "العلامات الحيوية / Vital Signs",
            message: "يجب اختيار المريض أولًا / Select a patient first.",
            indicator: "orange"
        });
        return;
    }

    if ($(".er-vitals-fixed-popup").length) {
        return;
    }

    const patient_name =
        frm.doc["اسم_المريض"] ||
        frm.doc.patient ||
        "—";

    const patient_id =
        frm.doc.patient ||
        "—";

    const patient_encounter =
        frm.doc.patient_encounter ||
        "—";

    const today =
        frappe.datetime.get_today();

    const now_time =
        frappe.datetime.now_time().slice(0, 5);

    const esc =
        frappe.utils.escape_html;

    const popup_html = `
        <div class="er-vitals-fixed-popup">

            <div class="er-vitals-fixed-backdrop"></div>

            <div class="er-vitals-fixed-window">

                <div class="er-vitals-fixed-header">

                    <div class="er-vitals-fixed-title">
                        <span>العلامات الحيوية / Vital Signs</span>

                        <button
                            type="button"
                            class="er-vitals-close">
                            ×
                        </button>
                    </div>

                    <div class="er-vitals-patient-line">

                        <div>
                            <small>المريض</small>
                            <strong>${esc(String(patient_name))}</strong>
                        </div>

                        <div>
                            <small>ID</small>
                            <strong>${esc(String(patient_id))}</strong>
                        </div>

                        <div>
                            <small>الزيارة</small>
                            <strong>${esc(String(patient_encounter))}</strong>
                        </div>

                    </div>

                    <div class="er-vitals-datetime-line">

                        <div class="er-vitals-datetime-label">
                            التاريخ والوقت / Date & Time
                        </div>

                        <label>
                            <span>التاريخ / Date</span>
                            <input
                                type="date"
                                class="er-vital-input"
                                data-field="signs_date"
                                value="${esc(today)}">
                        </label>

                        <label>
                            <span>الوقت / Time</span>
                            <input
                                type="time"
                                class="er-vital-input"
                                data-field="signs_time"
                                value="${esc(now_time)}">
                        </label>

                    </div>

                </div>

                <div class="er-vitals-fixed-body">

                    <div class="er-vitals-section-title">
                        العلامات الحيوية
                    </div>

                    <div class="er-vitals-grid">

                        <label>
                            <span>الحرارة / Temperature</span>
                            <input
                                type="number"
                                step="0.1"
                                class="er-vital-input"
                                data-field="temperature">
                        </label>

                        <label>
                            <span>النبض / Pulse</span>
                            <input
                                type="number"
                                class="er-vital-input"
                                data-field="pulse">
                        </label>

                        <label>
                            <span>التنفس / Resp. Rate</span>
                            <input
                                type="number"
                                class="er-vital-input"
                                data-field="respiratory_rate">
                        </label>

                        <label>
                            <span>الأكسجين / SpO₂</span>
                            <input
                                type="number"
                                step="0.1"
                                class="er-vital-input"
                                data-field="spo2">
                        </label>

                    </div>

                    <div class="er-vitals-section-title">
                        الضغط والسكر / BP & Glucose
                    </div>

                    <div class="er-vitals-grid">

                        <label>
                            <span>الضغط العلوي / SYS</span>
                            <input
                                type="number"
                                class="er-vital-input"
                                data-field="bp_systolic">
                        </label>

                        <label>
                            <span>الضغط السفلي / DIA</span>
                            <input
                                type="number"
                                class="er-vital-input"
                                data-field="bp_diastolic">
                        </label>

                        <label>
                            <span>سكر الدم / Glucose</span>
                            <input
                                type="number"
                                step="0.1"
                                class="er-vital-input"
                                data-field="custom_blood_glucose">
                        </label>

                    </div>

                    <div class="er-vitals-section-title">
                        الفحص السريري / Clinical
                    </div>

                    <div class="er-vitals-grid">

                        <label>
                            <span>اللسان / Tongue</span>
                            <select
                                class="er-vital-input"
                                data-field="tongue">
                                <option value=""></option>
                                <option>Normal</option>
                                <option>Dry</option>
                                <option>Coated</option>
                                <option>Pale</option>
                            </select>
                        </label>

                        <label>
                            <span>البطن / Abdomen</span>
                            <select
                                class="er-vital-input"
                                data-field="abdomen">
                                <option value=""></option>
                                <option>Normal</option>
                                <option>Bloated</option>
                                <option>Full</option>
                                <option>Fluid</option>
                                <option>Constipated</option>
                            </select>
                        </label>

                        <label>
                            <span>المنعكسات / Reflexes</span>
                            <select
                                class="er-vital-input"
                                data-field="reflexes">
                                <option value=""></option>
                                <option>Normal</option>
                                <option>Hyper</option>
                                <option>Very Hyper</option>
                                <option>One Sided</option>
                            </select>
                        </label>

                    </div>

                    <div class="er-vitals-section-title">
                        الطول والوزن / Height & Weight
                    </div>

                    <div class="er-vitals-grid">

                        <label>
                            <span>الطول بالمتر / Height</span>
                            <input
                                type="number"
                                step="0.01"
                                class="er-vital-input"
                                data-field="height">
                        </label>

                        <label>
                            <span>الوزن بالكيلوغرام / Weight</span>
                            <input
                                type="number"
                                step="0.1"
                                class="er-vital-input"
                                data-field="weight">
                        </label>

                        <label>
                            <span>مؤشر كتلة الجسم / BMI</span>
                            <input
                                type="text"
                                class="er-vital-input er-vital-bmi"
                                data-field="bmi"
                                readonly>
                        </label>

                    </div>

                    <div class="er-vitals-grid">

                        <label class="er-vitals-wide">
                            <span>ملاحظات التغذية / Nutrition</span>
                            <textarea
                                class="er-vital-input er-vital-textarea"
                                data-field="nutrition_note"></textarea>
                        </label>

                    </div>

                    <div class="er-vitals-grid">

                        <label class="er-vitals-wide">
                            <span>ملاحظات العلامات الحيوية / Notes</span>
                            <textarea
                                class="er-vital-input er-vital-textarea"
                                data-field="vital_signs_note"></textarea>
                        </label>

                    </div>

                    <div
                        class="er-vitals-record-panel"
                        style="display:none;">

                        <div class="er-vitals-record-info">
                            تم الحفظ / Saved
                        </div>

                        <div class="er-vitals-record-status"></div>

                        <button
                            type="button"
                            class="btn btn-success btn-sm er-vitals-record-btn">
                            تسجيل / Record
                        </button>

                    </div>

                </div>

                <div class="er-vitals-fixed-footer">

                    <button
                        type="button"
                        class="btn btn-primary er-vitals-save-btn">
                        حفظ / Save
                    </button>

                    <button
                        type="button"
                        class="btn btn-secondary er-vitals-cancel-btn">
                        إغلاق / Close
                    </button>

                </div>

            </div>

        </div>
    `;

    const style = `
        <style id="er-vitals-fixed-style">

            .er-vitals-fixed-popup {
                position: fixed;
                inset: 0;
                z-index: 1100;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding: 8px;
                box-sizing: border-box;
            }

            .er-vitals-fixed-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(15, 23, 42, .34);
            }

            .er-vitals-fixed-window {
                position: relative;
                z-index: 1;
                width: 430px;
                max-width: calc(100vw - 16px);
                max-height: calc(100vh - 16px);
                margin: 0;
                background: #fff;
                border: 1px solid #d9dee5;
                border-radius: 8px;
                box-shadow: 0 8px 30px rgba(15,23,42,.18);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .er-vitals-fixed-header {
                padding: 6px 7px;
                border-bottom: 1px solid #e5e7eb;
                background: #fff;
            }

            .er-vitals-fixed-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 12px;
                font-weight: 700;
                line-height: 1;
                margin-bottom: 5px;
            }

            .er-vitals-close {
                width: 24px;
                height: 24px;
                padding: 0;
                border: 0;
                background: transparent;
                font-size: 20px;
                line-height: 20px;
                color: #64748b;
                cursor: pointer;
            }

            .er-vitals-patient-line,
            .er-vitals-datetime-line {
                display: grid;
                gap: 3px;
                align-items: center;
            }

            .er-vitals-patient-line {
                grid-template-columns: 1.6fr .55fr .9fr;
                margin-bottom: 3px;
            }

            .er-vitals-datetime-line {
                grid-template-columns: 1fr .9fr .9fr;
            }

            .er-vitals-patient-line > div,
            .er-vitals-datetime-line label {
                min-width: 0;
                padding: 3px 5px;
                border: 1px solid #e5e7eb;
                border-radius: 5px;
                background: #f8fafc;
            }

            .er-vitals-patient-line small,
            .er-vitals-datetime-line span,
            .er-vitals-datetime-label {
                display: block;
                font-size: 8px;
                line-height: 1.1;
                color: #64748b;
            }

            .er-vitals-patient-line strong {
                display: block;
                margin-top: 1px;
                font-size: 10px;
                line-height: 1.1;
                color: #1e293b;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }

            .er-vitals-datetime-line input {
                width: 100%;
                height: 22px;
                min-height: 22px;
                margin-top: 2px;
                border: 0;
                background: transparent;
                padding: 0;
                font-size: 9px;
            }

            .er-vitals-datetime-label {
                font-weight: 700;
                padding-right: 2px;
            }

            .er-vitals-fixed-body {
                padding: 5px 7px;
                overflow-y: auto;
                overflow-x: hidden;
            }

            .er-vitals-section-title {
                margin: 4px 0 3px;
                padding-bottom: 2px;
                border-bottom: 1px solid #edf1f5;
                font-size: 9px;
                font-weight: 700;
                color: #475569;
            }

            .er-vitals-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 3px 5px;
            }

            .er-vitals-grid label {
                min-width: 0;
            }

            .er-vitals-grid label span {
                display: block;
                margin-bottom: 1px;
                font-size: 8px;
                line-height: 1.1;
                color: #64748b;
            }

            .er-vital-input {
                width: 100%;
                height: 24px;
                min-height: 24px;
                box-sizing: border-box;
                padding: 2px 5px;
                border: 1px solid #d8dee6;
                border-radius: 4px;
                background: #fff;
                font-size: 10px;
            }

            select.er-vital-input {
                padding-right: 4px;
            }

            .er-vitals-wide {
                grid-column: 1 / -1;
            }

            .er-vital-textarea {
                height: 35px;
                min-height: 35px;
                resize: vertical;
                line-height: 1.2;
            }

            .er-vitals-record-panel {
                margin-top: 5px;
                padding: 5px;
                border: 1px solid #d9e6dd;
                border-radius: 5px;
                background: #f7fbf8;
            }

            .er-vitals-record-info {
                font-size: 9px;
                font-weight: 700;
                color: #166534;
            }

            .er-vitals-record-status {
                margin: 2px 0 4px;
                font-size: 8px;
                color: #64748b;
            }

            .er-vitals-record-btn {
                min-height: 25px;
                padding: 2px 8px;
                font-size: 10px;
            }

            .er-vitals-fixed-footer {
                display: flex;
                justify-content: flex-end;
                gap: 4px;
                padding: 5px 7px;
                border-top: 1px solid #e5e7eb;
                background: #fff;
            }

            .er-vitals-fixed-footer .btn {
                min-height: 26px;
                padding: 2px 9px;
                font-size: 10px;
            }

            @media (max-width: 520px) {

                .er-vitals-fixed-popup {
                    padding: 5px;
                }

                .er-vitals-fixed-window {
                    width: 100%;
                    max-width: 100%;
                    max-height: calc(100vh - 10px);
                }

            }

        </style>
    `;

    $("body").append(style);
    $("body").append(popup_html);

    const root =
        $(".er-vitals-fixed-popup").last();

    const cleanup = function() {

        root.remove();
        $("#er-vitals-fixed-style").remove();
    };

    root.find(
        ".er-vitals-close, .er-vitals-cancel-btn, .er-vitals-fixed-backdrop"
    ).on(
        "click",
        cleanup
    );

    const get_value = function(fieldname) {

        return root
            .find('[data-field="' + fieldname + '"]')
            .val();
    };

    const update_bmi = function() {

        const h =
            parseFloat(
                get_value("height")
            );

        const w =
            parseFloat(
                get_value("weight")
            );

        const bmi =
            h > 0 && w > 0
                ? (
                    w / (h * h)
                ).toFixed(2)
                : "";

        root.find(
            '[data-field="bmi"]'
        ).val(bmi);
    };

    root.find(
        '[data-field="height"], [data-field="weight"]'
    ).on(
        "input",
        update_bmi
    );

    /*
     * SAVE
     */
    root.find(".er-vitals-save-btn").on(
        "click",
        async function() {

            const save_button =
                $(this);

            save_button
                .prop("disabled", true)
                .text("جاري الحفظ / Saving...");

            const height =
                parseFloat(
                    get_value("height")
                );

            const weight =
                parseFloat(
                    get_value("weight")
                );

            const bmi =
                height > 0 && weight > 0
                    ? (
                        weight /
                        (
                            height *
                            height
                        )
                    ).toFixed(2)
                    : "";

            const doc = {

                doctype:
                    "Vital Signs",

                naming_series:
                    "HLC-VTS-.YYYY.-",

                patient:
                    frm.doc.patient,

                er_intake:
                    frm.doc.name,

                recorded_by:
                    frappe.session.user,

                signs_date:
                    get_value("signs_date") ||
                    today,

                signs_time:
                    get_value("signs_time") ||
                    now_time
            };

            if (frm.doc.patient_encounter) {
                doc.encounter =
                    frm.doc.patient_encounter;
            }

            if (frm.doc["اسم_المريض"]) {
                doc.patient_name =
                    frm.doc["اسم_المريض"];
            }

            /*
             * assigned_bed هو حقل ER Patient Intake الأصلي
             * المنقول إلى نافذة الترياج.
             *
             * نقرأ القيمة من نفس Frappe control حتى يدخل
             * اختيار السرير في نفس طلب حفظ العلامات الحيوية.
             */
            const assigned_bed_field =
                frm.fields_dict &&
                frm.fields_dict.assigned_bed;

            if (
                assigned_bed_field &&
                typeof assigned_bed_field.get_value ===
                    "function"
            ) {
                doc.assigned_bed =
                    assigned_bed_field.get_value() || "";
            }

            const fields = [
                "temperature",
                "pulse",
                "respiratory_rate",
                "bp_systolic",
                "bp_diastolic",
                "tongue",
                "abdomen",
                "reflexes",
                "height",
                "weight",
                "nutrition_note",
                "vital_signs_note",
                "spo2",
                "custom_blood_glucose"
            ];

            fields.forEach(function(fieldname) {

                const value =
                    get_value(fieldname);

                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ""
                ) {
                    doc[fieldname] = value;
                }
            });

            if (bmi) {
                doc.bmi = bmi;
            }

            if (
                doc.bp_systolic ||
                doc.bp_diastolic
            ) {
                doc.bp =
                    String(
                        doc.bp_systolic || "—"
                    ) +
                    "/" +
                    String(
                        doc.bp_diastolic || "—"
                    );
            }

            try {

                const response =
                    await frappe.call({

                        method:
                            "custom_app.emergency_management.doctype.er_patient_intake.er_patient_intake.save_initial_triage_values",

                        args: {
                            intake_name:
                                frm.doc.name,
                            values:
                                doc
                        },

                        freeze: true,

                        freeze_message:
                            "جاري حفظ العلامات الحيوية / Saving vital signs..."
                    });

                if (
                    !response ||
                    response.exc ||
                    !response.message
                ) {
                    throw new Error(
                        "تعذر حفظ العلامات الحيوية."
                    );
                }

                const saved =
                    response.message;

                root
                    .find(".er-vitals-record-panel")
                    .show();

                root
                    .find(".er-vitals-record-status")
                    .text(
                        "Vital Signs: " +
                        saved.name
                    );

                root
                    .find(".er-vitals-record-btn")
                    .off("click.erVitalsRecord")
                    .on(
                        "click.erVitalsRecord",
                        async function() {

                            const record_button =
                                $(this);

                            record_button
                                .prop("disabled", true)
                                .text(
                                    "جاري التسجيل / Recording..."
                                );

                            try {

                                const submit_response =
                                    await frappe.call({

                                        method:
                                            "custom_app.emergency_management.doctype.er_patient_intake.er_patient_intake.submit_initial_triage",

                                        args: {
                                            intake_name:
                                                frm.doc.name
                                        },

                                        freeze: true,

                                        freeze_message:
                                            "جاري تسجيل العلامات الحيوية / Recording vital signs..."
                                    });

                                if (
                                    !submit_response ||
                                    submit_response.exc ||
                                    !submit_response.message
                                ) {
                                    throw new Error(
                                        "تعذر تسجيل العلامات الحيوية."
                                    );
                                }

                                const recorded =
                                    submit_response.message;

                                await frappe.call({

                                    method:
                                        "frappe.client.set_value",

                                    args: {

                                        doctype:
                                            "ER Patient Intake",

                                        name:
                                            frm.doc.name,

                                        fieldname:
                                            "triage_record",

                                        value:
                                            recorded.name
                                    }
                                });

                                await frm.reload_doc();

                                root
                                    .find(".er-vitals-record-status")
                                    .text(
                                        "تم التسجيل: " +
                                        recorded.name
                                    );

                                record_button
                                    .text(
                                        "تم التسجيل / Recorded"
                                    )
                                    .prop(
                                        "disabled",
                                        false
                                    );

                                load_er_latest_vitals(frm);

                                frappe.show_alert({
                                    message:
                                        "تم تسجيل العلامات الحيوية / Vital Signs recorded",
                                    indicator:
                                        "green"
                                });

                            } catch (error) {

                                record_button
                                    .prop(
                                        "disabled",
                                        false
                                    )
                                    .text(
                                        "تسجيل / Record"
                                    );

                                frappe.msgprint({
                                    title:
                                        "تعذر تسجيل العلامات الحيوية",
                                    message:
                                        error.message ||
                                        "حدث خطأ أثناء التسجيل.",
                                    indicator:
                                        "red"
                                });
                            }
                        }
                    );

                save_button
                    .text("تم الحفظ / Saved")
                    .prop("disabled", true);

                frappe.show_alert({
                    message:
                        "تم حفظ العلامات الحيوية / Vital Signs saved",
                    indicator:
                        "green"
                });

            } catch (error) {

                console.error(
                    "Vital Signs Save Error:",
                    error
                );

                save_button
                    .prop("disabled", false)
                    .text("حفظ / Save");

                frappe.msgprint({
                    title:
                        "تعذر حفظ العلامات الحيوية",
                    message:
                        error.message ||
                        "حدث خطأ أثناء الحفظ.",
                    indicator:
                        "red"
                });
            }
        }
    );
}



function bind_er_console_work_actions(frm) {

    const root =
        $(".er-two-window-ui");


    if (!root.length) {
        return;
    }


    const serviceMap = {

        clinical: {
            title: "🩺 التمريض",
            section: "clinical"
        },

        doctor: {
            title: "👨‍⚕️ الطبيب",
            section: "doctor"
        },

        labs: {
            title: "🧪 المختبر",
            section: "labs"
        },

        radiology: {
            title: "🩻 الأشعة",
            section: "radiology"
        },

        medications: {
            title: "💊 الأدوية",
            section: "medications"
        },

        procedures: {
            title: "⚕️ الإجراءات",
            section: "procedures"
        }

    };


    let clickTimer = null;


    root
        .off(
            ".erCleanService",
            ".er-console-work-action"
        )
        .on(
            "click.erCleanService",
            ".er-console-work-action",
            function(event) {

                event.preventDefault();
                event.stopPropagation();


                const button =
                    this;


                const section =
                    $(button).data(
                        "console-section"
                    );


                const config =
                    serviceMap[section];


                if (!config) {
                    return;
                }


                const encounter =
                    frm.doc.patient_encounter;


                clearTimeout(
                    clickTimer
                );


                clickTimer =
                    setTimeout(
                        function() {

                            if (
                                !encounter
                            ) {

                                frappe.msgprint({
                                    title:
                                        config.title,
                                    message:
                                        "لا توجد زيارة طبيب مرتبطة بهذه الحالة حاليًا.",
                                    indicator:
                                        "orange"
                                });

                                return;
                            }


                            open_er_service_popup(
                                frm,
                                config.title,
                                config.section,
                                encounter
                            );

                        },
                        260
                    );
            }
        )
        .on(
            "dblclick.erCleanService",
            ".er-console-work-action",
            function(event) {

                event.preventDefault();
                event.stopPropagation();


                clearTimeout(
                    clickTimer
                );


                const section =
                    $(this).data(
                        "console-section"
                    );


                const encounter =
                    frm.doc.patient_encounter;


                if (!encounter) {

                    frappe.msgprint({
                        title:
                            "شاشة زيارة الطوارئ",
                        message:
                            "لا توجد زيارة طبيب مرتبطة بهذه الحالة حاليًا.",
                        indicator:
                            "orange"
                    });

                    return;
                }


                frappe.set_route(
                    "er_visit_console",
                    encounter
                );


                setTimeout(
                    function() {

                        if (
                            typeof window.open_er_section ===
                            "function"
                        ) {

                            window.open_er_section(
                                section
                            );

                        }

                    },
                    700
                );
            }
        );
}


/* =========================================================
 * SERVICE POPUP
 * ========================================================= */

function open_er_service_popup(
    frm,
    title,
    section,
    encounter
) {

    $(".er-clean-service-popup").remove();


    const overlay =
        $(`
            <div
                class="er-clean-service-popup"
                style="
                    position:fixed;
                    inset:0;
                    z-index:110000;
                    background:rgba(15,23,42,.58);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:24px;
                ">

                <div
                    style="
                        width:min(1400px,96vw);
                        height:min(900px,94vh);
                        background:#fff;
                        border-radius:12px;
                        overflow:hidden;
                        display:flex;
                        flex-direction:column;
                        box-shadow:0 20px 70px rgba(0,0,0,.28);
                    ">

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:12px;
                            padding:11px 15px;
                            border-bottom:1px solid #dfe5eb;
                            background:#f8fafc;
                        ">

                        <div
                            style="
                                font-size:17px;
                                font-weight:700;
                                color:#1e293b;
                            ">
                            ${frappe.utils.escape_html(title)}
                        </div>

                        <div
                            style="
                                margin-inline-start:auto;
                                font-size:12px;
                                color:#64748b;
                            ">
                            الزيارة:
                            ${frappe.utils.escape_html(encounter)}
                        </div>

                        <button
                            type="button"
                            class="er-clean-service-close"
                            style="
                                width:32px;
                                height:32px;
                                border:0;
                                border-radius:7px;
                                background:#eef2f7;
                                color:#334155;
                                cursor:pointer;
                                font-size:17px;
                            ">
                            ✕
                        </button>

                    </div>

                    <div
                        style="
                            flex:1;
                            min-height:0;
                            overflow:hidden;
                        ">

                        <iframe
                            class="er-clean-service-iframe"
                            title="${frappe.utils.escape_html(title)}"
                            src="/app/er_visit_console/${encodeURIComponent(encounter)}"
                            style="
                                width:100%;
                                height:100%;
                                border:0;
                                display:block;
                            ">
                        </iframe>

                    </div>

                </div>

            </div>
        `);


    $("body").append(
        overlay
    );


    overlay
        .find(
            ".er-clean-service-iframe"
        )
        .on(
            "load",
            function() {

                try {

                    if (
                        this.contentWindow &&
                        typeof this.contentWindow.open_er_section ===
                        "function"
                    ) {

                        this.contentWindow.open_er_section(
                            section
                        );

                    }

                } catch (error) {

                    console.warn(
                        "ER service popup activation failed:",
                        error
                    );

                }

            }
        );


    overlay
        .find(
            ".er-clean-service-close"
        )
        .on(
            "click",
            function() {

                overlay.remove();

            }
        );


    overlay.on(
        "click",
        function(event) {

            if (
                event.target ===
                overlay[0]
            ) {
                overlay.remove();
            }

        }
    );


    $(document)
        .off(
            "keydown.erCleanServicePopup"
        )
        .on(
            "keydown.erCleanServicePopup",
            function(event) {

                if (
                    event.key === "Escape"
                ) {

                    overlay.remove();

                    $(document)
                        .off(
                            "keydown.erCleanServicePopup"
                        );
                }

            }
        );
}


/* =========================================================
 * PATIENT ACTION BUTTONS
 * ========================================================= */

function bind_er_patient_header_actions(frm) {

    const root =
        $(".er-two-window-ui");


    if (!root.length) {
        return;
    }


    root
        .off(
            "click.erCleanHeader",
            ".er-header-action"
        )
        .on(
            "click.erCleanHeader",
            ".er-header-action",
            function(event) {

                event.preventDefault();
                event.stopPropagation();


                const action =
                    $(this).data(
                        "header-action"
                    );


                if (
                    action ===
                    "new_visit"
                ) {

                    frappe.new_doc(
                        "ER Patient Intake"
                    );

                    return;
                }


                if (
                    action ===
                    "doctor_visit"
                ) {

                    open_er_doctor_visit_dialog(
                        frm
                    );

                    return;
                }


                if (
                    action ===
                    "visit_console"
                ) {

                    frappe.set_route(
                        "er_visit_console"
                    );

                    return;
                }


                if (
                    action ===
                    "current_console"
                ) {

                    if (
                        frm.doc.patient_encounter
                    ) {

                        frappe.set_route(
                            "er_visit_console",
                            frm.doc.patient_encounter
                        );

                    } else {

                        frappe.msgprint(
                            "لا توجد زيارة طبيب مرتبطة بهذه الزيارة حاليًا."
                        );

                    }

                    return;
                }


                if (
                    action ===
                    "bed_dashboard"
                ) {

                    frappe.set_route(
                        "er_bed_dashboard"
                    );

                    return;
                }
                if (
                    action ===
                    "patient_waiting"
                ) {

                    frappe.call({

                        method:
                            "frappe.client.get_value",

                        args: {

                            doctype:
                                "ER Patient Queue",

                            filters: {
                                patient_intake:
                                    frm.doc.name
                            },

                            fieldname:
                                "name"
                        },

                        callback:
                            function(r) {

                                if (
                                    r.message &&
                                    r.message.name
                                ) {

                                    frappe.set_route(
                                        "er-patient-queue",
                                        r.message.name
                                    );

                                } else {

                                    frappe.msgprint(
                                        "لا يوجد طابور مرتبط بهذه الزيارة."
                                    );

                                }

                            }

                    });

                    return;
                }


                if (
                    action ===
                    "medical_record"
                ) {

                    open_medical_record(
                        frm
                    );

                }

            }
        );
}


/* =========================================================
 * MEDICAL RECORD
 * ========================================================= */

function open_medical_record(frm) {

    if (!frm || !frm.doc) {
        return;
    }

    /*
     * The selected Patient ID is the real value required by
     * the patient history page.
     */
    const patient =
        frm.doc.patient || "";

    if (!patient) {

        frappe.msgprint({
            title: "سجل المريض",
            message: "لم يتم تحديد المريض بعد.",
            indicator: "orange"
        });

        return;
    }

    /*
     * Tell Frappe which Patient must be loaded into the
     * patient selector on the destination page.
     */
    frappe.route_options = {
        patient: patient
    };

    /*
     * Open the medical history directly for the current
     * patient instead of asking the user to select again.
     */
    frappe.set_route(
        "patient_history",
        patient
    );

    /*
     * Small fallback for pages that render the Patient
     * selector after navigation.
     */
    setTimeout(function() {

        try {

            const page_main =
                $(frappe.container.page.main);

            const patient_input =
                page_main.find(
                    '[data-fieldname="patient"] input'
                ).first();

            if (
                patient_input.length &&
                patient_input.val() !== patient
            ) {

                patient_input
                    .val(patient)
                    .trigger("input")
                    .trigger("change");
            }

        } catch (e) {
            // Navigation already completed.
        }

    }, 700);
}



/* =========================================================
 * DOCTOR VISIT BUTTON
 * ========================================================= */

function open_er_doctor_visit_dialog(frm) {

    if (!frm || !frm.doc || !frm.doc.name) {

        frappe.msgprint({
            title: "زيارة طبيب",
            message: "لا توجد زيارة طوارئ صالحة.",
            indicator: "orange"
        });

        return;
    }

    frappe.call({

        method:
            "custom_app.emergency_management.doctype.er_patient_intake.er_patient_intake.create_doctor_visit",

        args: {
            intake_name: frm.doc.name
        },

        freeze: true,

        freeze_message:
            "جاري فتح زيارة الطبيب...",

        callback: function(r) {

            if (
                r.exc ||
                !r.message
            ) {
                return;
            }

            var encounter = r.message;

            if (
                typeof encounter === "object"
            ) {
                encounter =
                    encounter.patient_encounter ||
                    encounter.encounter ||
                    encounter.name ||
                    "";
            }

            if (!encounter) {

                frappe.msgprint({
                    title: "زيارة طبيب",
                    message:
                        "تعذر العثور على Patient Encounter.",
                    indicator: "orange"
                });

                return;
            }

            frm.doc.patient_encounter =
                encounter;

            if (
                frm.refresh_field
            ) {
                frm.refresh_field(
                    "patient_encounter"
                );
            }

            frappe.show_alert({
                message:
                    "تم فتح زيارة الطبيب",
                indicator: "green"
            });

            setTimeout(
                function() {

                    frappe.set_route(
                        "er_visit_console",
                        encounter
                    );

                },
                300
            );
        }
    });
}

function apply_er_intake_single_visual_design(frm) {
    try {
        const root = document.querySelector(".er-four-window-root");
        if (!root) return;

        /* ======================================================
           1. PATIENT SUMMARY — ONE RECTANGLE / 10 FLAT BOXES
           ====================================================== */

        const card =
            root.querySelector(".er-patient-summary-card");

        const title =
            root.querySelector(".er-patient-summary-title");

        const grid =
            root.querySelector(".er-patient-summary-grid");

        if (card) {
            card.style.setProperty(
                "width", "100%", "important"
            );
            card.style.setProperty(
                "box-sizing", "border-box", "important"
            );
            card.style.setProperty(
                "padding", "0", "important"
            );
            card.style.setProperty(
                "margin", "8px 0 12px", "important"
            );
            card.style.setProperty(
                "background", "#F7FBFF", "important"
            );
            card.style.setProperty(
                "background-image", "none", "important"
            );
            card.style.setProperty(
                "border", "1px solid #B8D5EC", "important"
            );
            card.style.setProperty(
                "border-radius", "6px", "important"
            );
            card.style.setProperty(
                "box-shadow", "none", "important"
            );
            card.style.setProperty(
                "transform", "none", "important"
            );
            card.style.setProperty(
                "filter", "none", "important"
            );
        }

        if (title) {
            title.style.setProperty(
                "height", "36px", "important"
            );
            title.style.setProperty(
                "min-height", "36px", "important"
            );
            title.style.setProperty(
                "display", "flex", "important"
            );
            title.style.setProperty(
                "align-items", "center", "important"
            );
            title.style.setProperty(
                "padding", "0 12px", "important"
            );
            title.style.setProperty(
                "margin", "0", "important"
            );
            title.style.setProperty(
                "background", "#0078D4", "important"
            );
            title.style.setProperty(
                "color", "#FFFFFF", "important"
            );
            title.style.setProperty(
                "border", "0", "important"
            );
            title.style.setProperty(
                "border-radius", "5px 5px 0 0", "important"
            );
            title.style.setProperty(
                "box-shadow", "none", "important"
            );
        }

        if (grid) {
            grid.style.setProperty(
                "display", "grid", "important"
            );
            grid.style.setProperty(
                "grid-template-columns",
                "repeat(5, minmax(0, 1fr))",
                "important"
            );
            grid.style.setProperty(
                "gap", "6px", "important"
            );
            grid.style.setProperty(
                "padding", "8px", "important"
            );
            grid.style.setProperty(
                "margin", "0", "important"
            );
            grid.style.setProperty(
                "background", "#F7FBFF", "important"
            );
            grid.style.setProperty(
                "box-shadow", "none", "important"
            );
        }

        const summaryColors = [
            "#EEF7FE",
            "#E7F3FC",
            "#DFF0FA",
            "#F2F8FE",
            "#D7EBF8",
            "#EAF4FB",
            "#CEE6F5",
            "#E1EFF8",
            "#C9E2F3",
            "#DCECF7"
        ];

        const summaryBorders = [
            "#C6DFF2",
            "#BDD9EE",
            "#ADD0E7",
            "#CFE5F4",
            "#A7CCE4",
            "#BDD8EA",
            "#99C3DD",
            "#B2D1E5",
            "#94BCD7",
            "#AFCEE2"
        ];

        const boxes =
            root.querySelectorAll(
                ".er-patient-summary-grid > div"
            );

        boxes.forEach(function(box, index) {
            if (!summaryColors[index]) return;

            box.style.setProperty(
                "height", "54px", "important"
            );
            box.style.setProperty(
                "min-height", "54px", "important"
            );
            box.style.setProperty(
                "box-sizing", "border-box", "important"
            );
            box.style.setProperty(
                "display", "flex", "important"
            );
            box.style.setProperty(
                "flex-direction", "column", "important"
            );
            box.style.setProperty(
                "justify-content", "center", "important"
            );
            box.style.setProperty(
                "padding", "6px 9px", "important"
            );
            box.style.setProperty(
                "background", summaryColors[index], "important"
            );
            box.style.setProperty(
                "background-image", "none", "important"
            );
            box.style.setProperty(
                "border",
                "1px solid " + summaryBorders[index],
                "important"
            );
            box.style.setProperty(
                "border-radius", "4px", "important"
            );
            box.style.setProperty(
                "box-shadow", "none", "important"
            );
            box.style.setProperty(
                "transform", "none", "important"
            );
            box.style.setProperty(
                "filter", "none", "important"
            );
            box.style.setProperty(
                "transition", "none", "important"
            );
        });


        /* ======================================================
           2. ACTUAL NATIVE SECTION CARDS
           Detect by the real section header text.
           ====================================================== */

        const sectionColors = [
            {
                text: "بيانات الزيارة",
                bg: "#EAF4FD",
                border: "#B8D7EC"
            },
            {
                text: "بيانات الوصول",
                bg: "#E4F1FB",
                border: "#B1D1E7"
            },
            {
                text: "التقييم السريري",
                bg: "#DCEEF9",
                border: "#A7C9DF"
            },
            {
                text: "التصرف النهائي",
                bg: "#E7F1FA",
                border: "#B4CDDF"
            }
        ];

        root.querySelectorAll(
            ".er-native-section-host .form-section"
        ).forEach(function(section) {

            const header =
                section.querySelector(
                    ".section-head"
                );

            const text =
                (
                    header ?
                    header.textContent :
                    section.textContent
                )
                .replace(/\s+/g, " ")
                .trim();

            const match =
                sectionColors.find(function(item) {
                    return text.indexOf(item.text) !== -1;
                });

            if (!match) return;

            /* The section itself is the colored square/card. */
            section.style.setProperty(
                "background", match.bg, "important"
            );
            section.style.setProperty(
                "background-image", "none", "important"
            );
            section.style.setProperty(
                "border",
                "1px solid " + match.border,
                "important"
            );
            section.style.setProperty(
                "border-radius", "6px", "important"
            );
            section.style.setProperty(
                "padding", "8px", "important"
            );
            section.style.setProperty(
                "margin-bottom", "8px", "important"
            );
            section.style.setProperty(
                "box-shadow", "none", "important"
            );
            section.style.setProperty(
                "transform", "none", "important"
            );

            /* Inner containers transparent so the card color shows. */
            section.querySelectorAll(
                ".section-head, .form-grid, .form-column"
            ).forEach(function(inner) {
                inner.style.setProperty(
                    "background", "transparent", "important"
                );
                inner.style.setProperty(
                    "background-image", "none", "important"
                );
                inner.style.setProperty(
                    "box-shadow", "none", "important"
                );
            });

            if (header) {
                header.style.setProperty(
                    "background", "transparent", "important"
                );
                header.style.setProperty(
                    "color", "#15557D", "important"
                );
                header.style.setProperty(
                    "font-weight", "700", "important"
                );
                header.style.setProperty(
                    "margin-bottom", "7px", "important"
                );
            }
        });


        /* ======================================================
           3. COMPACT FIELDS — NO LARGE CONTROLS
           ====================================================== */

        root.querySelectorAll(
            ".er-native-section-host .frappe-control"
        ).forEach(function(control) {

            control.style.setProperty(
                "background", "transparent", "important"
            );
            control.style.setProperty(
                "background-image", "none", "important"
            );
            control.style.setProperty(
                "border", "0", "important"
            );
            control.style.setProperty(
                "box-shadow", "none", "important"
            );
            control.style.setProperty(
                "padding", "3px 5px", "important"
            );
            control.style.setProperty(
                "margin-bottom", "3px", "important"
            );
            control.style.setProperty(
                "min-height", "0", "important"
            );
        });

        root.querySelectorAll(
            ".er-native-section-host input,"
            + ".er-native-section-host select,"
            + ".er-native-section-host .form-control"
        ).forEach(function(input) {

            input.style.setProperty(
                "height", "30px", "important"
            );
            input.style.setProperty(
                "min-height", "30px", "important"
            );
            input.style.setProperty(
                "padding", "4px 7px", "important"
            );
            input.style.setProperty(
                "font-size", "11px", "important"
            );
            input.style.setProperty(
                "background", "#FFFFFF", "important"
            );
            input.style.setProperty(
                "border", "1px solid #B9D4E8", "important"
            );
            input.style.setProperty(
                "border-radius", "4px", "important"
            );
            input.style.setProperty(
                "box-shadow", "none", "important"
            );
        });

        root.querySelectorAll(
            ".er-native-section-host textarea"
        ).forEach(function(input) {
            input.style.setProperty(
                "min-height", "48px", "important"
            );
            input.style.setProperty(
                "height", "48px", "important"
            );
            input.style.setProperty(
                "padding", "5px 7px", "important"
            );
            input.style.setProperty(
                "font-size", "11px", "important"
            );
            input.style.setProperty(
                "background", "#FFFFFF", "important"
            );
            input.style.setProperty(
                "border", "1px solid #B9D4E8", "important"
            );
            input.style.setProperty(
                "border-radius", "4px", "important"
            );
            input.style.setProperty(
                "box-shadow", "none", "important"
            );
        });

        root.querySelectorAll(
            ".er-native-section-host .control-label"
        ).forEach(function(label) {
            label.style.setProperty(
                "font-size", "10px", "important"
            );
            label.style.setProperty(
                "margin-bottom", "2px", "important"
            );
            label.style.setProperty(
                "color", "#315A78", "important"
            );
        });


        /* ======================================================
           4. VITAL SIGNS BOX
           ====================================================== */

        const vitals =
            root.querySelector(".er-vitals-section");

        if (vitals) {
            vitals.style.setProperty(
                "background", "#D8ECF8", "important"
            );
            vitals.style.setProperty(
                "background-image", "none", "important"
            );
            vitals.style.setProperty(
                "border", "1px solid #A7C9DF", "important"
            );
            vitals.style.setProperty(
                "border-radius", "6px", "important"
            );
            vitals.style.setProperty(
                "padding", "8px", "important"
            );
            vitals.style.setProperty(
                "box-shadow", "none", "important"
            );
        }


        /* ======================================================
           5. SERVICE BUTTON COLORS
           ====================================================== */

        const serviceColors = [
            ["clinical", "#0F766E"],
            ["doctor", "#1E3A8A"],
            ["labs", "#107C10"],
            ["radiology", "#0078D4"],
            ["medications", "#D83B01"],
            ["procedures", "#8764B8"]
        ];

        serviceColors.forEach(function(item) {
            const buttons =
                root.querySelectorAll(
                    '.er-console-work-action[data-console-section="'
                    + item[0] + '"]'
                );

            buttons.forEach(function(btn) {
                btn.style.setProperty(
                    "background", item[1], "important"
                );
                btn.style.setProperty(
                    "background-image", "none", "important"
                );
                btn.style.setProperty(
                    "border", "1px solid " + item[1], "important"
                );
                btn.style.setProperty(
                    "color", "#FFFFFF", "important"
                );
                btn.style.setProperty(
                    "box-shadow", "none", "important"
                );
                btn.style.setProperty(
                    "transform", "none", "important"
                );
                btn.style.setProperty(
                    "height", "34px", "important"
                );
                btn.style.setProperty(
                    "min-height", "34px", "important"
                );
            });
        });


        /* ======================================================
           6. PATIENT ACTION BUTTON COLORS
           ====================================================== */

        const actionColors = {
            "new_visit": "#5C2D91",
            "doctor_visit": "#2B579A",
            "visit_console": "#0078D4",
            "current_console": "#0063B1",
            "bed_dashboard": "#498205",
            "medical_record": "#D83B01"
        };

        Object.keys(actionColors).forEach(function(action) {
            const btn =
                root.querySelector(
                    '.er-patient-action-bar '
                    + 'button[data-header-action="'
                    + action + '"]'
                );

            if (!btn) return;

            const color = actionColors[action];

            btn.style.setProperty(
                "background", color, "important"
            );
            btn.style.setProperty(
                "background-image", "none", "important"
            );
            btn.style.setProperty(
                "border", "1px solid " + color, "important"
            );
            btn.style.setProperty(
                "color", "#FFFFFF", "important"
            );
            btn.style.setProperty(
                "box-shadow", "none", "important"
            );
            btn.style.setProperty(
                "transform", "none", "important"
            );
            btn.style.setProperty(
                "height", "34px", "important"
            );
            btn.style.setProperty(
                "min-height", "34px", "important"
            );
        });


        /* ======================================================
           7. VITAL SIGNS POPUP — SMALLER
           ====================================================== */

        const dialogs =
            document.querySelectorAll(
                ".er-vitals-dialog"
            );

        dialogs.forEach(function(dialog) {

            const modal =
                dialog.querySelector(".modal-dialog");

            if (modal) {
                modal.style.setProperty(
                    "width", "720px", "important"
                );
                modal.style.setProperty(
                    "max-width", "calc(100vw - 30px)",
                    "important"
                );
                modal.style.setProperty(
                    "margin", "16px auto", "important"
                );
            }

            const content =
                dialog.querySelector(".modal-content");

            if (content) {
                content.style.setProperty(
                    "border", "1px solid #B8D5E9",
                    "important"
                );
                content.style.setProperty(
                    "border-radius", "6px",
                    "important"
                );
                content.style.setProperty(
                    "box-shadow", "none",
                    "important"
                );
            }

            const body =
                dialog.querySelector(".modal-body");

            if (body) {
                body.style.setProperty(
                    "padding", "10px",
                    "important"
                );
                body.style.setProperty(
                    "max-height", "68vh",
                    "important"
                );
                body.style.setProperty(
                    "overflow-y", "auto",
                    "important"
                );
            }

            dialog.querySelectorAll(
                ".frappe-control"
            ).forEach(function(control) {
                control.style.setProperty(
                    "padding", "3px 5px", "important"
                );
                control.style.setProperty(
                    "margin-bottom", "3px", "important"
                );
            });

            dialog.querySelectorAll(
                ".form-control, input, select"
            ).forEach(function(input) {
                input.style.setProperty(
                    "height", "30px", "important"
                );
                input.style.setProperty(
                    "min-height", "30px", "important"
                );
                input.style.setProperty(
                    "font-size", "11px", "important"
                );
            });
        });

        console.log(
            "ER INTAKE: SINGLE REAL VISUAL DESIGN APPLIED"
        );

    } catch (e) {
        console.warn(
            "ER INTAKE SINGLE VISUAL DESIGN ERROR",
            e
        );
    }
}


/* ============================================================
 * er-doctor-visit-button-color-v2
 * ============================================================ */

(function () {

    if (
        document.getElementById(
            "er-doctor-visit-button-color-v2"
        )
    ) {
        return;
    }

    var style =
        document.createElement("style");

    style.id =
        "er-doctor-visit-button-color-v2";

    style.textContent = `

        .er-header-doctor-visit {
            background: #2563eb !important;
            border-color: #1d4ed8 !important;
            color: #ffffff !important;
            font-weight: 700 !important;
        }

        .er-header-doctor-visit:hover,
        .er-header-doctor-visit:focus {
            background: #1d4ed8 !important;
            border-color: #1e40af !important;
            color: #ffffff !important;
        }

    `;

    document.head.appendChild(style);

})();

/* ============================================================
 * ER INTAKE SERVICE BUTTONS — SINGLE SOURCE OF TRUTH
 * 6 buttons / equal width / equal height / one row
 * ============================================================ */

(function () {

    const STYLE_ID =
        "er-intake-service-buttons-final";

    const existing =
        document.getElementById(STYLE_ID);

    if (existing) {
        existing.remove();
    }

    const style =
        document.createElement("style");

    style.id =
        STYLE_ID;

    style.textContent = `

        .er-console-service-bar {
            display: grid !important;
            grid-template-columns:
                repeat(6, minmax(0, 1fr)) !important;
            grid-template-rows:
                34px !important;
            grid-auto-flow:
                row !important;

            direction: rtl !important;

            width: 100% !important;
            max-width: 100% !important;

            height: 34px !important;
            min-height: 34px !important;

            gap: 5px !important;

            margin: 0 0 8px 0 !important;
            padding: 0 !important;

            box-sizing: border-box !important;

            overflow: hidden !important;
        }


        .er-console-service-bar
        > .er-console-work-action {

            display: block !important;

            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;

            height: 34px !important;
            min-height: 34px !important;
            max-height: 34px !important;

            margin: 0 !important;
            padding: 4px 6px !important;

            box-sizing: border-box !important;

            border-radius: 5px !important;

            font-size: 11px !important;
            font-weight: 700 !important;
            line-height: 1.1 !important;

            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;

            box-shadow: none !important;
            transform: none !important;
        }


        .er-console-service-bar
        > .er-console-work-action:nth-child(1),
        .er-console-service-bar
        > .er-console-work-action:nth-child(2),
        .er-console-service-bar
        > .er-console-work-action:nth-child(3),
        .er-console-service-bar
        > .er-console-work-action:nth-child(4),
        .er-console-service-bar
        > .er-console-work-action:nth-child(5),
        .er-console-service-bar
        > .er-console-work-action:nth-child(6) {

            grid-row: 1 !important;
            width: 100% !important;
            height: 34px !important;
        }


        /* التمريض */
        .er-console-service-bar
        > .er-console-work-action[data-console-section="clinical"] {

            background: #0F766E !important;
            border: 1px solid #0B5F59 !important;
            color: #FFFFFF !important;
        }


        /* الطبيب */
        .er-console-service-bar
        > .er-console-work-action[data-console-section="doctor"] {

            background: #1E3A8A !important;
            border: 1px solid #172F70 !important;
            color: #FFFFFF !important;
        }


        /* المختبر */
        .er-console-service-bar
        > .er-console-work-action[data-console-section="labs"] {

            background: #107C10 !important;
            border: 1px solid #0C620C !important;
            color: #FFFFFF !important;
        }


        /* الأشعة */
        .er-console-service-bar
        > .er-console-work-action[data-console-section="radiology"] {

            background: #0078D4 !important;
            border: 1px solid #0065B3 !important;
            color: #FFFFFF !important;
        }


        /* الأدوية */
        .er-console-service-bar
        > .er-console-work-action[data-console-section="medications"] {

            background: #D83B01 !important;
            border: 1px solid #B52F01 !important;
            color: #FFFFFF !important;
        }


        /* الإجراءات */
        .er-console-service-bar
        > .er-console-work-action[data-console-section="procedures"] {

            background: #8764B8 !important;
            border: 1px solid #70529A !important;
            color: #FFFFFF !important;
        }


        .er-console-service-bar
        > .er-console-work-action:hover,
        .er-console-service-bar
        > .er-console-work-action:focus {

            filter: brightness(.94) !important;
            transform: none !important;
        }
    `;

    document.head.appendChild(style);

})();



/*
 * السرير في الترياج:
 * يعرض الأسرة المتاحة فقط،
 * مع إبقاء السرير الحالي لهذه الزيارة ظاهرًا.
 */
frappe.ui.form.on("ER Patient Intake", {
    setup(frm) {

        frm.set_query(
            "assigned_bed",
            function () {

                return {
                    query:
                        "custom_app.emergency_management.utils.bed.search_available_beds",

                    filters: {
                        intake:
                            frm.doc.name || "",

                        patient:
                            frm.doc.patient || ""
                    }
                };
            }
        );
    }
});
