import frappe

def test_doctypes():
    doctypes = ["ER Transfer Log", "ER Discharge Log", "Dosage", "Complaint", "Diagnosis"]
    for dt in doctypes:
        exists = frappe.db.exists("DocType", dt)
        print(f"DocType '{dt}' exists: {exists}")
