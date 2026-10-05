import frappe

from custom_app.emergency_management.utils.bed import (
    get_available_bed_status,
    set_patient_intake_bed,
)


def after_save(doc, method=None):

    if not doc.er_intake:
        return

    if doc.er_disposition != "سرير طوارئ":
        return

    intake = frappe.get_doc(
        "ER Patient Intake",
        doc.er_intake
    )

    # إذا كان الطبيب أو الترياج قد اختار السرير بالفعل،
    # لا ننشئ تعيينًا آخر.
    if intake.assigned_bed:
        return

    available_status = get_available_bed_status()

    bed = frappe.db.get_value(
        "ER Bed",
        {
            "bed_status": available_status,
            "is_active": 1,
        },
        "name",
    )

    if not bed:
        frappe.throw(
            "لا يوجد سرير طوارئ متاح حالياً"
        )

    set_patient_intake_bed(
        intake.name,
        bed,
    )

    from custom_app.emergency_management.api.er_visit_workflow import (
        transition_er_visit,
    )

    transition_er_visit(
        intake.name,
        "في سرير الطوارئ"
    )

    frappe.db.commit()
