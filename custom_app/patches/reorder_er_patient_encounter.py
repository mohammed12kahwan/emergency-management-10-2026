import frappe


def execute():

    order = [

        "patient",
        "er_patient_intake",
        "patient_encounter",
        "status",

        "er_details_tab",
        "er_details_section",

        "visit_type",
        "chief_complaint",
        "arrival_mode",
        "acuity",
        "priority",
        "current_location",
        "waiting_area",
        "visit_notes",

        "doctor_visit_tab",
        "practitioner",
        "encounter_date",
        "encounter_time",

        "clinical_tab",

        "labs_tab",

        "medication_tab",

        "procedures_tab",

        "services_tab",

    ]


    doctype = frappe.get_doc(
        "DocType",
        "ER Patient Encounter"
    )


    fields = {
        f.fieldname:f
        for f in doctype.fields
    }


    new_fields=[]


    idx=1


    for name in order:

        if name in fields:

            fields[name].idx = idx

            new_fields.append(fields[name])

            idx += 1



    for f in doctype.fields:

        if f.fieldname not in order:

            f.idx = idx

            new_fields.append(f)

            idx += 1



    doctype.fields = new_fields

    doctype.save()



    frappe.db.commit()


    print(
        "ER Patient Encounter reordered"
    )
