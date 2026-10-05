import frappe

def check_prescription_dosage():
    exists = frappe.db.exists("DocType", "Prescription Dosage")
    print(f"Prescription Dosage doctype exists: {exists}")
    if exists:
        count = frappe.db.count("Prescription Dosage")
        print(f"Prescription Dosage count: {count}")
        records = frappe.get_all("Prescription Dosage", pluck="name", limit=10)
        print(f"Records: {records}")
