import frappe

def check_fields():
    meta = frappe.get_meta("Medication Request")
    for f in meta.fields:
        if f.fieldname in ["dosage", "dosage_form", "frequency", "duration", "medication", "drug"]:
            print(f"{f.fieldname}: {f.fieldtype} -> {f.options}")
    
    print("\n--- Medication fields ---")
    med_meta = frappe.get_meta("Medication")
    for f in med_meta.fields:
        if f.fieldname in ["dosage", "dosage_form", "frequency", "duration", "medication"]:
            print(f"{f.fieldname}: {f.fieldtype} -> {f.options}")
