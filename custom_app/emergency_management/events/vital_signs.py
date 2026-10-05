import frappe

from custom_app.emergency_management.api.er_visit_workflow import (
    transition_er_visit,
)


def after_save(doc, method=None):
    """
    Vital Signs is used for:
    - initial triage
    - repeated monitoring
    - reassessment

    Therefore it must NOT always force the ER visit to
    "بانتظار الطبيب".

    Only the initial completed triage advances:
        تحت الفرز -> بانتظار الطبيب

    Later Vital Signs remain part of the same visit and do
    not regress the patient back to the waiting-for-doctor stage.
    """

    intake_name = getattr(doc, "er_intake", None)

    if not intake_name:
        return

    if not frappe.db.exists(
        "ER Patient Intake",
        intake_name
    ):
        return

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    updates = {}

    # ---------------------------------------------------------
    # ESI / Acuity
    # ---------------------------------------------------------

    if getattr(doc, "esi_level", None):
        updates["acuity"] = doc.esi_level

    # ---------------------------------------------------------
    # Assigned nurse
    # ---------------------------------------------------------

    triage_nurse = getattr(
        doc,
        "triage_nurse",
        None
    )

    if triage_nurse:
        if frappe.get_meta(
            "ER Patient Intake"
        ).has_field("assigned_nurse"):
            updates["assigned_nurse"] = triage_nurse

    # ---------------------------------------------------------
    # Link the canonical Vital Signs record
    # ---------------------------------------------------------

    if frappe.get_meta(
        "ER Patient Intake"
    ).has_field("triage_record"):
        updates["triage_record"] = doc.name

    if updates:
        frappe.db.set_value(
            "ER Patient Intake",
            intake.name,
            updates,
            update_modified=False
        )

    # ---------------------------------------------------------
    # INITIAL TRIAGE COMPLETION ONLY
    #
    # تحت الفرز -> بانتظار الطبيب
    # ---------------------------------------------------------

    intake.reload()

    if (
        intake.status == "تحت الفرز"
        and int(getattr(doc, "docstatus", 0) or 0) == 1
    ):
        try:
            transition_er_visit(
                intake.name,
                "بانتظار الطبيب"
            )
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                "ER Vital Signs: initial triage transition failed"
            )
            raise

    # ---------------------------------------------------------
    # Queue projection
    #
    # queue_status is NOT the ER visit status.
    # ---------------------------------------------------------

    queue = frappe.db.get_value(
        "ER Patient Queue",
        {
            "patient_intake": intake.name
        },
        "name"
    )

    if queue:
        queue_updates = {
            "triage_level": getattr(
                doc,
                "esi_level",
                None
            )
        }

        if intake.status == "بانتظار الطبيب":
            queue_updates["queue_status"] = "تم الفرز"

        frappe.db.set_value(
            "ER Patient Queue",
            queue,
            queue_updates,
            update_modified=False
        )
