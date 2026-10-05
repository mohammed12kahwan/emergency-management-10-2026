import frappe

def check_er_current_location():
    exists = frappe.db.exists("DocType", "ER Current Location")
    print(f"ER Current Location doctype exists: {exists}")
    if exists:
        records = frappe.get_all("ER Current Location", pluck="name")
        print(f"Records: {records}")
    
    # Check intake current_location
    intake = frappe.get_all("ER Patient Intake", {"patient": "000053"}, ["name", "current_location", "assigned_bed"], limit=1)
    if intake:
        print(f"\nPatient intake: {intake[0]}")
    else:
        print("\nNo intake found for patient 000053")
