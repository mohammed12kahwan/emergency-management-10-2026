import frappe

def fix_discharged_location():
    # Delete wrong one if exists
    if frappe.db.exists("ER Current Location", "DISCHARGED"):
        frappe.delete_doc("ER Current Location", "DISCHARGED", force=1)
        frappe.db.commit()
        print("Deleted DISCHARGED")
    
    # Create correct one
    if not frappe.db.exists("ER Current Location", "Discharged"):
        doc = frappe.get_doc({
            "doctype": "ER Current Location",
            "code": "Discharged",
            "location_name": "Discharged",
            "arabic_name": "Discharged"
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("Created Discharged")
    else:
        print("Discharged already exists")
    
    # Verify
    locations = frappe.get_all("ER Current Location", pluck="name")
    print(f"All locations: {locations}")
