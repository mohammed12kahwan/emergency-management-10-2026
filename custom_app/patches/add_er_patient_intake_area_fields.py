import frappe


def execute():

    doctype = "ER Patient Intake"

    fields = [
        {
            "fieldname": "waiting_area",
            "label": "منطقة الانتظار",
            "fieldtype": "Link",
            "options": "ER Waiting Area",
            "insert_after": "disposition",
            "read_only": 1,
        },
        {
            "fieldname": "current_location",
            "label": "الموقع الحالي",
            "fieldtype": "Link",
            "options": "ER Current Location",
            "insert_after": "waiting_area",
            "read_only": 1,
        },
    ]


    meta = frappe.get_meta(doctype)

    existing = [
        f.fieldname
        for f in meta.fields
    ]


    for field in fields:

        if field["fieldname"] not in existing:

            custom_field = frappe.get_doc({

                "doctype": "Custom Field",

                "dt": doctype,

                **field

            })

            custom_field.insert(
                ignore_permissions=True
            )


    frappe.db.commit()

    print("ER Patient Intake waiting_area and current_location fields added")
