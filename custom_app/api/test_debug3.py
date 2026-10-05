import frappe

def debug_phase3():
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
    
    # Check existing observation
    obs = frappe.get_all("ER Observation Stay", {"patient": patient_name, "patient_intake": intake_name, "is_active": 1}, limit=1)
    if obs:
        obs_doc = frappe.get_doc("ER Observation Stay", obs[0].name)
        print(f"Existing observation: {obs_doc.name}")
        print(f"  Bed: {obs_doc.bed}")
        print(f"  Status: {obs_doc.observation_status}")
        print(f"  Is active: {obs_doc.is_active}")
    
    # Check bed
    bed = frappe.get_all("ER Bed", {"current_patient": patient_name}, limit=1)
    if bed:
        bed_doc = frappe.get_doc("ER Bed", bed[0].name)
        print(f"\nBed: {bed_doc.name}")
        print(f"  Current patient: {bed_doc.current_patient}")
        print(f"  Current observation: {bed_doc.current_observation}")
        print(f"  Waiting area: {bed_doc.waiting_area}")
    else:
        print("\nNo bed found for patient")
        
    # Check all beds in waiting areas
    waiting_areas = frappe.get_all("ER Waiting Area", {"is_active": 1}, pluck="name")
    for wa in waiting_areas:
        beds = frappe.get_all("ER Bed", {"waiting_area": wa, "is_active": 1}, ["name", "current_patient", "current_observation"])
        for b in beds:
            print(f"Bed {b.name} in {wa}: patient={b.current_patient}, obs={b.current_observation}")
