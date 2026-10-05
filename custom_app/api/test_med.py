import frappe
import json

def test_med():
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
    
    medication = frappe.get_all("Medication", {"disabled": 0}, limit=1)
    if not medication:
        print("No medication")
        return
    med_name = medication[0].name
    
    med_data = {
        "encounter": enc_name, "drug": med_name, "dose": "500mg",
        "dosage_form": "Tablet", "frequency": "BID", "duration": "7 days",
        "quantity": 14, "notes": "ER medication request"
    }
    
    try:
        result = frappe.call("custom_app.emergency_management.page.er_visit_console.python.medication.create_medication_request", {"data": json.dumps(med_data)})
        print(f"Result type: {type(result)}")
        print(f"Result: {str(result)[:500]}")
    except Exception as e:
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()
