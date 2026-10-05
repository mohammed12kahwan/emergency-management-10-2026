import frappe


def add_field(dt, field):

    if not frappe.db.exists(
        "Custom Field",
        {
            "dt": dt,
            "fieldname": field["fieldname"]
        }
    ):

        frappe.get_doc({

            "doctype": "Custom Field",

            "dt": dt,

            **field

        }).insert(
            ignore_permissions=True
        )


def execute():

    dt = "ER Patient Encounter"


    fields = [

        {
            "fieldname": "er_details_tab",
            "label": "بيانات زيارة الطوارئ",
            "fieldtype": "Tab Break",
            "insert_after": "status"
        },


        {
            "fieldname": "er_details_section",
            "label": "تفاصيل الزيارة",
            "fieldtype": "Section Break",
            "insert_after": "er_details_tab"
        },


        {
            "fieldname": "doctor_visit_tab",
            "label": "تفاصيل زيارة الطبيب",
            "fieldtype": "Tab Break",
            "insert_after": "er_details_section"
        },


        {
            "fieldname": "clinical_tab",
            "label": "الفحص السريري",
            "fieldtype": "Tab Break",
            "insert_after": "doctor_visit_tab"
        },


        {
            "fieldname": "labs_tab",
            "label": "الفحوصات والأشعة",
            "fieldtype": "Tab Break",
            "insert_after": "clinical_tab"
        },


        {
            "fieldname": "medication_tab",
            "label": "الأدوية",
            "fieldtype": "Tab Break",
            "insert_after": "labs_tab"
        },


        {
            "fieldname": "procedures_tab",
            "label": "الإجراءات الطبية",
            "fieldtype": "Tab Break",
            "insert_after": "medication_tab"
        },


        {
            "fieldname": "services_tab",
            "label": "طلبات الخدمات",
            "fieldtype": "Tab Break",
            "insert_after": "procedures_tab"
        }

    ]


    for field in fields:

        add_field(dt, field)


    frappe.db.commit()


    print("ER Patient Encounter Layout Created")