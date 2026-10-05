import frappe

def test_transfer():
    enc = frappe.db.sql("""
        SELECT pe.name, pe.patient, pe.er_patient_intake
        FROM `tabPatient Encounter` pe
        WHERE pe.patient IS NOT NULL AND pe.patient != ''
        ORDER BY pe.creation DESC
        LIMIT 1
    """, as_dict=True)
    if not enc:
        print("No encounter")
        return
    
    enc_name = enc[0]["name"]
    patient_name = enc[0]["patient"]
    intake_name = enc[0]["er_patient_intake"]
    
    print(f"Encounter: {enc_name}, Patient: {patient_name}, Intake: {intake_name}")
    
    transfer_data = {"encounter": enc_name, "transfer_type": "Internal", "target_department": "Operations - L", "notes": "Internal transfer test"}
    
    try:
        result = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.transfer_patient", transfer_data)
        print(f"Result type: {type(result)}")
        if isinstance(result, dict):
            print(f"Result: {str(result)[:500]}")
        elif hasattr(result, 'name'):
            print(f"Result name: {result.name}")
    except Exception as e:
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()
