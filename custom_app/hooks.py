
app_name = "custom_app"
app_title = "salh"
app_publisher = "salh"
app_description = "Emergency Management System"
app_email = "asaz772337698@gmail.com"
app_license = "MIT"


# -------------------------------------------------------
# Document Events
# -------------------------------------------------------

doc_events = {

    "ER Patient Intake": {

        "after_insert":
        "custom_app.emergency_management.events.patient_intake.after_insert"

    },


    "Vital Signs": {

        "after_save": [

            "custom_app.emergency_management.events.vital_signs.after_save",
            "custom_app.emergency_management.events.er_disposition.after_save"

        ]

    },


    "Sales Invoice": {

        "on_submit":
        "custom_app.emergency_management.events.sales_invoice.on_submit",

        "on_cancel":
        "custom_app.emergency_management.events.sales_invoice.on_cancel"

    }

}


# -------------------------------------------------------
# Fixtures
# -------------------------------------------------------

fixtures = [

    {

        "dt": "DocType",

        "filters": [

            [

                "name",
                "in",

                [

                    "ER Visit Type",
                    "ER Chief Complaint",
                    "ER Disposition",
                    "ER Arrival Source",
                    "ER Patient Queue"

                ]

            ]

        ]

    }

]


# -------------------------------------------------------
# ER Visit Console Assets
# -------------------------------------------------------

app_include_js = [

    "/assets/custom_app/js/er_visit_console/utils.js",

    "/assets/custom_app/js/er_visit_console/header.js",

    "/assets/custom_app/js/er_visit_console/tabs.js",

    "/assets/custom_app/js/er_visit_console/windows/details/details.js",

    "/assets/custom_app/js/er_visit_console/windows/clinical/clinical.js",

    "/assets/custom_app/js/er_visit_console/windows/labs/labs.js",

    "/assets/custom_app/js/er_visit_console/windows/radiology/radiology.js",

    "/assets/custom_app/js/er_visit_console/windows/medications/medications.js",

    "/assets/custom_app/js/er_visit_console/windows/procedures/procedures.js",

    "/assets/custom_app/js/er_visit_console/windows/services/services.js"

]


# -------------------------------------------------------
# DocType Client Scripts
# -------------------------------------------------------

doctype_js = {

    "Sample Collection":
    "public/js/sample_collection_one_click.js",

    "ER Patient Encounter":
    "public/js/er_visit_console_form.js",

    "Sales Invoice":
    "public/js/sales_invoice.js",

    "Diagnostic Report":
    "public/js/diagnostic_report.js"

}


# -------------------------------------------------------
# DocType List Scripts
# -------------------------------------------------------
# تخصيص قائمة Medication Request القياسية
# من Healthcare / ERPNext

doctype_list_js = {

    "Medication Request":
    "public/js/medication_request/medication_request_list.js",

    "Radiology Examination":
    "public/js/radiology_examination/radiology_examination_list.js"

}


# -------------------------------------------------------
# ER Visit Console CSS
# كل نافذة لها CSS مستقل
# -------------------------------------------------------

app_include_css = [

    "/assets/custom_app/css/er_visit_console/main.css",

    "/assets/custom_app/css/er_visit_console/clinical.css",

    "/assets/custom_app/css/er_visit_console/medications.css",

    "/assets/custom_app/css/er_visit_console/labs/labs.css",

    "/assets/custom_app/css/er_visit_console/radiology/radiology.css",

    "/assets/custom_app/css/er_visit_console/procedures.css",

    "/assets/custom_app/css/er_visit_console/er_visit_console.css",

    "/assets/custom_app/css/er_laboratory_report.css",

    # ---------------------------------------------------
    # Global ERPNext / Frappe field styling
    # ---------------------------------------------------
    "/assets/custom_app/css/custom_global.css"

]
