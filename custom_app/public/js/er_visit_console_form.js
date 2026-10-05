// =====================================
// ER Patient Encounter Form Controller
// =====================================


frappe.ui.form.on(
    "ER Patient Encounter",
    {


        // =====================================
        // عند فتح النموذج
        // =====================================

        refresh(frm){

            if(
                frm.custom_buttons_added
            ){

                return;

            }

            frm.custom_buttons_added = true;



            frm.add_custom_button(

                "🩺 فتح واجهة الطوارئ",

                function(){

                    frappe.set_route(

                        "er_visit_console",

                        frm.doc.name

                    );

                }

            );



            frm.set_intro(

                "نظام إدارة زيارة الطوارئ",

                "blue"

            );



        }

    }

);



frappe.ui.form.on(

    "ER Patient Encounter",

    {

        after_save(frm){

            frappe.show_alert({

                message:

                    "تم حفظ زيارة الطوارئ: "

                    + frm.doc.name,

                indicator:

                    "green"

            });



        }

    }

);
