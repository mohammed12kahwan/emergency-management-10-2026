import frappe

WORKFLOW_NAME = "ER Admission Request Workflow"
DOCTYPE = "ER Admission Request"


def create_er_admission_workflow():

    if frappe.db.exists("Workflow", WORKFLOW_NAME):
        frappe.delete_doc("Workflow", WORKFLOW_NAME, force=True)
        frappe.db.commit()

    workflow = frappe.get_doc({
        "doctype": "Workflow",
        "workflow_name": WORKFLOW_NAME,
        "document_type": DOCTYPE,
        "workflow_state_field": "workflow_state",
        "is_active": 1,
        "override_status": 0,
        "send_email_alert": 0
    })

    # ---------------- States ----------------

    workflow.append("states", {
        "state": "Draft",
        "doc_status": "0",
        "allow_edit": "ER Doctor",
        "update_field": "status",
        "update_value": "Draft"
    })

    workflow.append("states", {
        "state": "Pending",
        "doc_status": "0",
        "allow_edit": "Admission Officer",
        "update_field": "status",
        "update_value": "Pending Approval"
    })

    workflow.append("states", {
        "state": "Approved",
        "doc_status": "0",
        "allow_edit": "Admission Officer",
        "update_field": "status",
        "update_value": "Approved"
    })

    workflow.append("states", {
        "state": "Rejected",
        "doc_status": "0",
        "allow_edit": "Admission Officer",
        "update_field": "status",
        "update_value": "Rejected"
    })

    workflow.append("states", {
        "state": "Admitted",
        "doc_status": "1",
        "allow_edit": "Admission Officer",
        "update_field": "status",
        "update_value": "Admitted"
    })

    # ---------------- Transitions ----------------

    workflow.append("transitions", {
        "state": "Draft",
        "action": "Submit for Approval",
        "next_state": "Pending",
        "allowed": "ER Doctor"
    })

    workflow.append("transitions", {
        "state": "Pending",
        "action": "Approve",
        "next_state": "Approved",
        "allowed": "Admission Officer"
    })

    workflow.append("transitions", {
        "state": "Pending",
        "action": "Reject",
        "next_state": "Rejected",
        "allowed": "Admission Officer"
    })

    workflow.append("transitions", {
        "state": "Approved",
        "action": "Admit Patient",
        "next_state": "Admitted",
        "allowed": "Admission Officer"
    })

    workflow.insert(ignore_permissions=True)

    frappe.db.commit()

    print("✅ ER Admission Request Workflow Created")


if __name__ == "__main__":
    create_er_admission_workflow()