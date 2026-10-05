import frappe


def add_field(field):

    if not frappe.db.exists(
        "Custom Field",
        {
            "dt": "ER Patient Encounter",
            "fieldname": field["fieldname"]
        }
    ):

        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "ER Patient Encounter",
            **field
        }).insert(ignore_permissions=True)



def execute():


    fields = [

        {
            "fieldname": "visit_type",
            "label": "نوع الزيارة",
            "fieldtype": "Link",
            "options": "ER Visit Type",
            "insert_after": "er_details_section",
            "read_only": 1
        },


        {
            "fieldname": "chief_complaint",
            "label": "الشكوى الرئيسية",
            "fieldtype": "Link",
            "options": "ER Chief Complaint",
            "insert_after": "visit_type",
            "read_only": 1
        },


        {
            "fieldname": "arrival_mode",
            "label": "طريقة الوصول",
            "fieldtype": "Link",
            "options": "ER Arrival Source",
            "insert_after": "chief_complaint",
            "read_only": 1
        },


        {
            "fieldname": "acuity",
            "label": "مستوى الخطورة",
            "fieldtype": "Link",
            "options": "ER Triage Level",
            "insert_after": "arrival_mode",
            "read_only": 1
        },


        {
            "fieldname": "current_location",
            "label": "الموقع الحالي",
            "fieldtype": "Link",
            "options": "ER Current Location",
            "insert_after": "acuity",
            "read_only": 1
        },


        {
            "fieldname": "waiting_area",
            "label": "منطقة الانتظار",
            "fieldtype": "Link",
            "options": "ER Waiting Area",
            "insert_after": "current_location",
            "read_only": 1
        },


        {
            "fieldname": "priority",
            "label": "الأولوية",
            "fieldtype": "Link",
            "options": "ER Priority",
            "insert_after": "waiting_area",
            "read_only": 1
        },


        {
            "fieldname": "visit_notes",
            "label": "ملاحظات الزيارة",
            "fieldtype": "Small Text",
            "insert_after": "priority",
            "read_only": 1
        }

    ]


    for f in fields:
        add_field(f)


    frappe.db.commit()

    print("ER Visit Fields Added")