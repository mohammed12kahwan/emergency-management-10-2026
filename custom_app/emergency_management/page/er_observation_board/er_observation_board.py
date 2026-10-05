import frappe
from frappe import _


@frappe.whitelist()
def get_observation_data():

    stays = frappe.get_all(
        "ER Observation Stay",
        filters={
            "is_active": 1
        },
        fields=[
            "name",
            "patient",
            "patient_intake",
            "bed",
            "room_number",
            "triage_level",
            "assigned_nurse",
            "attending_doctor",
            "observation_status",
            "admission_time"
        ],
        order_by="admission_time asc"
    )

    patients = []

    critical_count = 0
    delayed_count = 0

    for stay in stays:

        vital_filters = {
            "patient": stay.patient
        }

        if stay.patient_intake:
            vital_filters["er_intake"] = stay.patient_intake

        vitals = frappe.get_all(
            "Vital Signs",
            filters=vital_filters,
            fields=[
                "name",
                "signs_date",
                "signs_time",
                "next_vital_due",
                "temperature",
                "pulse",
                "bp_systolic",
                "bp_diastolic",
                "spo2",
                "pain_score",
                "critical_alert",
                "vital_signs_note",
                "recorded_by"
            ],
            order_by="signs_date desc, signs_time desc",
            limit=1
        )

        vital = vitals[0] if vitals else {}

        if vital:
            vital["recorded_at"] = (
                f"{vital.get('signs_date')} "
                f"{vital.get('signs_time')}"
            )
            vital["next_due"] = vital.get("next_vital_due")
            vital["systolic_bp"] = vital.get("bp_systolic")
            vital["diastolic_bp"] = vital.get("bp_diastolic")
            vital["critical_flag"] = vital.get("critical_alert")
            vital["notes"] = vital.get("vital_signs_note")

        if vital.get("critical_flag"):
            critical_count += 1


        # حساب القياس المتأخر
        delayed = False

        if vital.get("next_due"):
            if vital["next_due"] < frappe.utils.now_datetime():
                delayed = True
                delayed_count += 1


        patient_name = ""

        if stay.patient:
            patient_name = frappe.db.get_value(
                "Patient",
                stay.patient,
                "patient_name"
            )


        patients.append({

            "stay": stay.name,

            "patient": stay.patient,

            "patient_name": patient_name,

            "bed": stay.bed,

            "room_number": stay.room_number,

            "triage_level": stay.triage_level,

            "nurse": stay.assigned_nurse,

            "doctor": stay.attending_doctor,

            "status": stay.observation_status,

            "admission_time": stay.admission_time,


            "last_vital": vital,

            "critical": vital.get("critical_flag", 0),

            "delayed": delayed

        })


    available_beds = frappe.db.count(
        "ER Bed",
        {
            "bed_status": "Available"
        }
    )


    return {

        "patients": patients,

        "statistics": {

            "total": len(patients),

            "critical": critical_count,

            "delayed": delayed_count,

            "available_beds": available_beds

        }
    }