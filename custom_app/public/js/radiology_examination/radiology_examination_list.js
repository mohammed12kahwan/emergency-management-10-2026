/* =========================================================
   RADIOLOGY EXAMINATION
   ER DEPARTMENT MESSAGES
========================================================= */

frappe.listview_settings["Radiology Examination"] = {

    onload(listview) {

        const button =
            listview.page.add_inner_button(
                __("💬 الرسائل"),
                function () {

                    er_department_message_open_department_inbox(
                        "radiology"
                    );

                }
            );

        er_department_message_bind_page_button(
            button,
            "radiology"
        );

    },

    refresh(listview) {

        er_department_message_update_page_buttons();

    },

};
