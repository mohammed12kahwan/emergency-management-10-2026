frappe.ui.form.on("Sample Collection", {
    refresh(frm) {

        /*
         * إبقاء زر واحد فقط لجمع العينة.
         * زر Healthcare القياسي Mark Collected يُزال
         * من جدول Observation Sample Collection.
         */

        frm.remove_custom_button(
            "🩸 حفظ وجمع وتسجيل العينة"
        );

        frm.remove_custom_button(
            "Mark Collected"
        );

        const observationGrid =
            frm.fields_dict.observation_sample_collection
                ? frm.fields_dict.observation_sample_collection.grid
                : null;

        if (observationGrid) {

            if (
                typeof observationGrid.remove_custom_button ===
                "function"
            ) {
                observationGrid.remove_custom_button(
                    "Mark Collected"
                );

                observationGrid.remove_custom_button(
                    __("Mark Collected")
                );
            }

            /*
             * Healthcare يضيف الزر داخل Grid أثناء refresh.
             * نحذفه بعد اكتمال refresh حتى يبقى زر custom_app
             * الوحيد الخاص بجمع العينة.
             */
            setTimeout(function () {

                observationGrid.wrapper
                    .find("button")
                    .filter(function () {

                        const label =
                            ($(this).text() || "")
                                .trim()
                                .toLowerCase();

                        return (
                            label === "mark collected" ||
                            label.includes("mark collected")
                        );
                    })
                    .remove();

            }, 150);
        }

        const button =
            frm.add_custom_button(
                "🩸 حفظ وجمع وتسجيل العينة",
                function () {

                    const run =
                        function () {

                            const btn =
                                $(button);

                            btn.prop(
                                "disabled",
                                true
                            );

                            frappe.call({

                                method:
                                    "custom_app.emergency_management.page.er_laboratory.er_laboratory.save_collect_register_sample_from_collection",

                                args: {
                                    sample_collection:
                                        frm.doc.name
                                },

                                freeze: true,

                                freeze_message:
                                    "جاري حفظ وجمع وتسجيل العينة...",

                                callback:
                                    function (r) {

                                        btn.prop(
                                            "disabled",
                                            false
                                        );

                                        if (r.exc) {
                                            return;
                                        }

                                        const message =
                                            r.message || {};

                                        frappe.show_alert({
                                            message:
                                                message.message ||
                                                "تم حفظ وجمع وتسجيل العينة بنجاح",
                                            indicator:
                                                "green"
                                        });

                                        const report =
                                            message.diagnostic_report;

                                        if (report) {

                                            frappe.set_route(
                                                "Form",
                                                "Diagnostic Report",
                                                report
                                            );

                                            return;
                                        }

                                        frm.reload_doc();
                                    }
                            });
                        };

                    /*
                     * حفظ Sample Collection أولًا إذا كانت
                     * هناك تغييرات غير محفوظة.
                     */
                    if (frm.is_dirty()) {

                        frm.save().then(
                            function () {
                                run();
                            }
                        );

                    } else {

                        run();

                    }
                }
            );

        /*
         * تمييزه عن زر ERPNext الأساسي.
         */
        $(button)
            .addClass(
                "btn-success er-custom-sample-collect-btn"
            );

        /*
         * محاولة وضعه بجوار Mark Collected
         * مع عدم الاعتماد عليه في التنفيذ.
         */
        setTimeout(
            function () {

                const customButton =
                    $(button);

                const standardButton =
                    $("button").filter(
                        function () {
                            const label =
                                ($(this).text() || "")
                                    .trim()
                                    .toLowerCase();

                            return (
                                label === "mark collected" ||
                                label.includes("mark collected")
                            );
                        }
                    ).first();

                if (
                    standardButton.length &&
                    customButton.length
                ) {

                    customButton.insertAfter(
                        standardButton
                    );
                }

            },
            100
        );
    }
});
