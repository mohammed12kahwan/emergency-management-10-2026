import frappe

def test_obs():
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
    
    waiting_areas = frappe.get_all("ER Waiting Area", {"is_active": 1}, limit=1)
    waiting_area = waiting_areas[0].name if waiting_areas else None
    
    status_names = frappe.get_all("ER Bed Status", {"is_active": 1, "is_available": 1}, pluck="name")
    beds = frappe.get_all("ER Bed", {
        "is_active": 1,
        "bed_status": ["in", status_names],
        "current_patient": ["is", "not set"]
    }, limit=1)
    bed_name = beds[0].name if beds else None
    
    print(f"Encounter: {enc_name}, Patient: {patient_name}, Intake: {intake_name}")
    print(f"Waiting area: {waiting_area}, Bed: {bed_name}")
    
    result = frappe.call("custom_app.emergency_management.api.service_requests._create_observation_stay", {
        "patient": patient_name, "er_patient_intake": intake_name,
        "doctor": "", "waiting_area": waiting_area, "bed": bed_name
    })
    print(f"Result type: {type(result)}")
    if hasattr(result, 'name'):
        print(f"Result name: {result.name}")
    if isinstance(result, dict):
        print(f"Result dict: {str(result)[:500]}")
    else:
        print(f"Result str: {str(result)[:500]}")
