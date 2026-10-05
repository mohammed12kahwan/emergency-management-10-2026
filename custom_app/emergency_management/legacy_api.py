import frappe
from frappe.utils import now_datetime


@frappe.whitelist()
@frappe.whitelist()
def create_patient_encounter(intake):

    # Compatibility wrapper only.
    # Patient Encounter creation is centralized in
    # ER Patient Intake.create_er_patient_encounter().
    # One ER Patient Intake = one Patient Encounter.

    er = frappe.get_doc(
        "ER Patient Intake",
        intake
    )

    if not er.patient:
        frappe.throw(
            "لا يوجد مريض مرتبط بزيارة الطوارئ"
        )

    doctor = (
        er.get("healthcare_practitioner")
        or er.get("assigned_doctor")
        or ""
    )

    if not doctor:
        frappe.throw(
            "يجب تحديد الطبيب قبل إنشاء زيارة الطبيب"
        )

    if not frappe.db.exists(
        "Healthcare Practitioner",
        doctor
    ):
        frappe.throw(
            "الطبيب المعالج المختار غير موجود في Healthcare Practitioner."
        )

    # Keep the existing doctor source compatible with
    # the canonical ER Encounter creator.
    meta = frappe.get_meta(
        "ER Patient Intake",
        cached=False
    )

    if (
        meta.has_field("healthcare_practitioner")
        and not er.get("healthcare_practitioner")
    ):
        frappe.db.set_value(
            "ER Patient Intake",
            er.name,
            "healthcare_practitioner",
            doctor
        )

    from custom_app.emergency_management.doctype.er_patient_intake.er_patient_intake import (
        create_er_patient_encounter,
    )

    return create_er_patient_encounter(
        er.name
    )
