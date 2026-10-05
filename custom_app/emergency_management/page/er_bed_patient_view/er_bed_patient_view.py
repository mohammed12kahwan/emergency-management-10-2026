import frappe


@frappe.whitelist()
def get_bed_patient(bed):

    bed_doc = frappe.get_doc(
        "ER Bed",
        bed
    )

    patient = None

    if bed_doc.current_patient:

        patient = frappe.db.get_value(
            "Patient",
            bed_doc.current_patient,
            [
                "name",
                "patient_name"
            ],
            as_dict=True
        )


    vital = None

    if bed_doc.current_patient:

        filters = {
            "patient": bed_doc.current_patient
        }

        if bed_doc.current_intake:
            filters["er_intake"] = bed_doc.current_intake

        rows = frappe.get_all(
            "Vital Signs",
            filters=filters,
            fields=[
                "name",
                "temperature",
                "pulse",
                "bp_systolic",
                "bp_diastolic",
                "respiratory_rate",
                "spo2",
                "pain_score",
                "critical_alert",
                "recorded_by",
                "signs_date",
                "signs_time"
            ],
            order_by="signs_date desc, signs_time desc",
            limit=1
        )

        if rows:
            vital = rows[0]

            vital["heart_rate"] = vital.get("pulse")
            vital["systolic_bp"] = vital.get("bp_systolic")
            vital["diastolic_bp"] = vital.get("bp_diastolic")

            vital["recorded_time"] = (
                f"{vital.get('signs_date')} "
                f"{vital.get('signs_time')}"
            )


    return {

        "bed": bed_doc.name,

        "patient": patient,

        "vital": vital,

        "doctor": bed_doc.assigned_doctor,

        "nurse": bed_doc.assigned_nurse,

        "triage": bed_doc.current_triage_level

    }