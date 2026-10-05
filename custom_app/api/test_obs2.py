import frappe

def test_obs2():
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
    
    waiting_areas = frappe.get_all("ER Waiting Area", {"is_active": 1}, limit=20)
    print(f"Waiting areas: {[wa.name for wa in waiting_areas]}")
    
    bed_name = None
    waiting_area = None
    for wa in waiting_areas:
        wa_name = wa.name
        beds = frappe.get_all("ER Bed", {
            "is_active": 1,
            "waiting_area": wa_name,
            "current_patient": ["is", "not set"],
            "current_observation": ["is", "not set"]
        }, limit=1)
        if beds:
            bed_name = beds[0].name
            waiting_area = wa_name
            break
    
    print(f"Selected: WA={waiting_area}, Bed={bed_name}")
    
    if not bed_name:
        print("No bed found")
        return
    
    result = frappe.call("custom_app.emergency_management.api.service_requests._create_observation_stay", {
        "patient": patient_name, "er_patient_intake": intake_name,
        "doctor": "", "waiting_area": waiting_area, "bed": bed_name
    })
    print(f"Result type: {type(result)}")
    if hasattr(result, 'name'):
        print(f"Result name: {result.name}")
    if isinstance(result, dict):
        print(f"Result dict keys: {list(result.keys())}")
        print(f"Result dict: {str(result)[:500]}")
    
    bed_doc = frappe.get_doc("ER Bed", bed_name)
    print(f"Bed current_patient: {bed_doc.current_patient}")
    print(f"Bed current_observation: {bed_doc.current_observation}")
