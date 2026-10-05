import frappe


def execute():

    doctype = "ER Patient Encounter"

    fields = [

        {
            "fieldname": "patient",
            "label": "Patient",
            "fieldtype": "Link",
            "options": "Patient",
            "insert_after": "title"
        },

        {
            "fieldname": "er_patient_intake",
            "label": "ER Patient Intake",
            "fieldtype": "Link",
            "options": "ER Patient Intake",
            "insert_after": "patient"
        },

        {
            "fieldname": "patient_encounter",
            "label": "Healthcare Patient Encounter",
            "fieldtype": "Link",
            "options": "Patient Encounter",
            "insert_after": "er_patient_intake"
        },

        {
            "fieldname": "practitioner",
            "label": "Practitioner",
            "fieldtype": "Link",
            "options": "Healthcare Practitioner",
            "insert_after": "patient_encounter"
        },

        {
            "fieldname": "encounter_date",
            "label": "Encounter Date",
            "fieldtype": "Date",
            "insert_after": "practitioner"
        },

        {
            "fieldname": "encounter_time",
            "label": "Encounter Time",
            "fieldtype": "Time",
            "insert_after": "encounter_date"
        },

        {
            "fieldname": "status",
            "label": "Status",
            "fieldtype": "Select",
            "options": """
Draft
Open
In Progress
Completed
Cancelled
""",
            "insert_after": "encounter_time"
        }

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

    print("ER Patient Encounter fields added")