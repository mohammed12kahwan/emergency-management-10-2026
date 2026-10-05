import frappe

def list_healthcare_doctypes():
    doctypes = frappe.get_list("DocType", filters={"module": ["like", "%Healthcare%"]}, fields=["name", "module"], limit=100)
    print("Healthcare doctypes:")
    for dt in doctypes:
        print(f"  {dt.name} ({dt.module})")
    
    # Check if Dosage exists
    exists = frappe.db.exists("DocType", "Dosage")
    print(f"\nDosage exists: {exists}")
    
    # Check modules
    modules = frappe.get_list("Module Def", filters={"app_name": "healthcare"}, fields=["name"], limit=50)
    print("\nHealthcare modules:")
    for m in modules:
        print(f"  {m.name}")
