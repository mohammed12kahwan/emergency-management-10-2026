import frappe

def check_encounter_status():
    meta = frappe.get_meta("Patient Encounter")
    status_field = meta.get_field("status")
    print(f"Status options: {status_field.options}")
    
    # Also check ER Patient Intake status
    intake_meta = frappe.get_meta("ER Patient Intake")
    intake_status = intake_meta.get_field("status")
    print(f"Intake status options: {intake_status.options}")
