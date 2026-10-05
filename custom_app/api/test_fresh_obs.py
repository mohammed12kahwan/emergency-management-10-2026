import frappe

def test_fresh_obs():
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
    
    # Use a bed from a different waiting area that's definitely free
    beds = frappe.get_all("ER Bed", {
        "is_active": 1,
        "waiting_area": "المنطقة الخضراء",
        "current_patient": ["is", "not set"],
        "current_observation": ["is", "not set"]
    }, limit=1)
    
    if not beds:
        print("No free bed found")
        return
    
    bed_name = beds[0].name
    waiting_area = "المنطقة الخضراء"
    
    print(f"Creating observation with bed: {bed_name}, waiting_area: {waiting_area}")
    
    # First, deactivate the existing observation
    existing = frappe.get_all("ER Observation Stay", {"patient": patient_name, "is_active": 1}, pluck="name")
    for obs_name in existing:
        frappe.db.set_value("ER Observation Stay", obs_name, "is_active", 0)
        print(f"Deactivated observation: {obs_name}")
    
    # Also clear any bed assignments for this patient
    frappe.db.sql("UPDATE `tabER Bed` SET current_patient = NULL, current_intake = NULL, current_observation = NULL WHERE current_patient = %s", (patient_name,))
    frappe.db.commit()
    
    result = frappe.call("custom_app.emergency_management.api.service_requests._create_observation_stay", {
        "patient": patient_name, "er_patient_intake": intake_name,
        "doctor": "", "waiting_area": waiting_area, "bed": bed_name
    })
    
    print(f"Result type: {type(result)}")
    if hasattr(result, 'name'):
        print(f"Result name: {result.name}")
    if isinstance(result, dict):
        print(f"Result: {str(result)[:500]}")
    
    # Check bed after creation
    bed_doc = frappe.get_doc("ER Bed", bed_name)
    print(f"\nBed after creation:")
    print(f"  Current patient: {bed_doc.current_patient}")
    print(f"  Current observation: {bed_doc.current_observation}")
    print(f"  Bed status: {bed_doc.bed_status}")
    
    # Check observation
    obs_doc = frappe.get_doc("ER Observation Stay", result.name if hasattr(result, 'name') else result.get("name"))
    print(f"\nObservation after creation:")
    print(f"  Bed: {obs_doc.bed}")
    print(f"  Patient: {obs_doc.patient}")
    print(f"  Is active: {obs_doc.is_active}")
