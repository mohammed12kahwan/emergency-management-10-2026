# Copyright (c) 2026, salh and contributors

import frappe
from frappe.model.workflow import apply_workflow


WORKFLOW_NAME = "ER Patient Intake Workflow"

# ---------------------------------------------------------
# Canonical ER visit states
# ---------------------------------------------------------

ER_VISIT_STATES = [
    "وصل للطوارئ",
    "تحت الفرز",
    "بانتظار الطبيب",
    "قيد الفحص",
    "طلب فحوصات",
    "بانتظار النتائج",
    "قرار الطبيب",
    "في سرير الطوارئ",
    "تنويم",
    "خروج",
    "تحويل",
    "ملغي",
]


# ---------------------------------------------------------
# Clinical encounter status projection
#
# This is NOT an independent workflow.
# It is derived from the ER visit path.
# ---------------------------------------------------------

ENCOUNTER_STATUS_MAP = {
    "وصل للطوارئ": "استقبال",
    "تحت الفرز": "تحت الفرز",
    "بانتظار الطبيب": "بانتظار الطبيب",
    "قيد الفحص": "مع الطبيب",
    "طلب فحوصات": "قيد الفحص",
    "بانتظار النتائج": "بانتظار النتائج",
    "قرار الطبيب": "مع الطبيب",
    "في سرير الطوارئ": "مراقبة",
    "تنويم": "تنويم",
    "خروج": "خروج",
    "تحويل": "تحويل",
    "ملغي": "ملغي",
}


def get_er_intake(intake_name):
    if not intake_name:
        frappe.throw("رقم زيارة الطوارئ غير موجود.")

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    return intake


def get_workflow_transitions():
    workflow = frappe.get_doc(
        "Workflow",
        WORKFLOW_NAME
    )

    return workflow, [
        row for row in workflow.transitions
    ]


def find_transition(current_state, target_state):
    workflow, transitions = get_workflow_transitions()

    matches = [
        row
        for row in transitions
        if row.state == current_state
        and row.next_state == target_state
    ]

    return workflow, matches


def sync_encounter_status(intake, target_state):
    """
    Synchronize Patient Encounter.er_visit_status
    when that field exists.

    It is a projection, not a second source of truth.
    """

    encounter_name = (
        getattr(intake, "patient_encounter", None)
        or ""
    )

    if not encounter_name:
        return

    if not frappe.db.exists(
        "Patient Encounter",
        encounter_name
    ):
        return

    meta = frappe.get_meta("Patient Encounter")

    if not meta.has_field("er_visit_status"):
        return

    target = ENCOUNTER_STATUS_MAP.get(
        target_state,
        target_state
    )

    field = meta.get_field("er_visit_status")

    if field and field.options:
        options = [
            x.strip()
            for x in field.options.split("\n")
            if x.strip()
        ]

        if options and target not in options:
            return

    frappe.db.set_value(
        "Patient Encounter",
        encounter_name,
        "er_visit_status",
        target,
        update_modified=True
    )


@frappe.whitelist()
def transition_er_visit(
    intake_name,
    target_state
):
    """
    Central ER visit transition.

    Nobody should directly assign:
        intake.status = ...

    except for initialization of a brand-new visit.

    All real workflow transitions must pass here.
    """

    intake = get_er_intake(intake_name)

    current_state = (
        intake.status
        or ""
    )

    if target_state not in ER_VISIT_STATES:
        frappe.throw(
            "حالة زيارة الطوارئ غير معتمدة: {0}".format(
                target_state
            )
        )

    if current_state == target_state:
        return {
            "ok": True,
            "changed": False,
            "status": current_state,
        }

    workflow, matches = find_transition(
        current_state,
        target_state
    )

    if not matches:
        frappe.throw(
            "لا يوجد انتقال مسموح في Workflow "
            "من «{0}» إلى «{1}».".format(
                current_state,
                target_state
            )
        )

    if len(matches) > 1:
        frappe.throw(
            "يوجد أكثر من انتقال لنفس المسار "
            "من «{0}» إلى «{1}».".format(
                current_state,
                target_state
            )
        )

    transition = matches[0]

    # Re-fetch immediately before applying workflow
    intake = frappe.get_doc(
        "ER Patient Intake",
        intake.name
    )

    result = apply_workflow(
        intake,
        transition.action
    )

    sync_encounter_status(
        result,
        target_state
    )

    frappe.db.commit()

    return {
        "ok": True,
        "changed": True,
        "from_status": current_state,
        "to_status": target_state,
        "action": transition.action,
        "intake": result.name,
    }


def set_initial_er_visit_status(intake):
    """
    Initialization only.
    Used for a newly created ER visit.

    It does NOT perform a workflow transition.
    """

    if not intake:
        return

    if intake.status:
        return

    intake.db_set(
        "status",
        "وصل للطوارئ",
        update_modified=False
    )

    sync_encounter_status(
        intake,
        "وصل للطوارئ"
    )


@frappe.whitelist()
def get_er_visit_path(intake_name):
    """
    Return the current canonical visit status,
    workflow transitions and encounter projection.
    """

    intake = get_er_intake(intake_name)

    workflow, transitions = get_workflow_transitions()

    encounter_status = None

    if intake.patient_encounter:
        if frappe.db.exists(
            "Patient Encounter",
            intake.patient_encounter
        ):
            encounter_status = frappe.db.get_value(
                "Patient Encounter",
                intake.patient_encounter,
                "er_visit_status"
            )

    return {
        "intake": intake.name,
        "status": intake.status,
        "encounter": intake.patient_encounter,
        "encounter_status": encounter_status,
        "workflow_field": workflow.workflow_state_field,
        "states": ER_VISIT_STATES,
        "transitions": [
            {
                "from": row.state,
                "action": row.action,
                "to": row.next_state,
            }
            for row in transitions
        ],
    }
