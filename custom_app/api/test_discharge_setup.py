import frappe

def check_discharge_setup():
    # Check if Discharged location exists
    exists = frappe.db.exists("ER Current Location", "Discharged")
    print(f"Discharged location exists: {exists}")
    
    # Try to create it if missing
    if not exists:
        try:
            doc = frappe.get_doc({
                "doctype": "ER Current Location",
                "waiting_area": "Discharged"
            })
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            print("Created Discharged location")
        except Exception as e:
            print(f"Failed to create: {e}")
    
    # Check all locations
    locations = frappe.get_all("ER Current Location", pluck="name")
    print(f"All locations: {locations}")
