import frappe

from custom_app.emergency_management.utils.bed import (
    get_occupied_bed_status,
)


def after_save(doc, method=None):

    if not doc.er_intake:
        return

    intake = frappe.get_doc(
        "ER Patient Intake",
        doc.er_intake
    )

    if not intake.assigned_bed:
        return

    bed = frappe.get_doc(
        "ER Bed",
        intake.assigned_bed
    )

    # لا نعيد التحقق من أن السرير "متاح" هنا؛
    # في هذه المرحلة السرير يجب أن يكون مشغولًا أصلًا
    # بنفس المريض/الدخول الذي اختاره الترياج أو الطبيب.
    if bed.current_intake != intake.name:
        return

    if bed.current_patient != intake.patient:
        return

    bed.current_patient = intake.patient
    bed.current_intake = intake.name

    if doc.esi_level:
        bed.current_triage_level = doc.esi_level

    bed.bed_status = get_occupied_bed_status()
    bed.last_patient_update = frappe.utils.now()

    bed.save(
        ignore_permissions=True
    )

    frappe.db.commit()
