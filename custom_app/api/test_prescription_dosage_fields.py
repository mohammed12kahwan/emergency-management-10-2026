import frappe

def check_prescription_dosage_fields():
    meta = frappe.get_meta("Prescription Dosage")
    print("Prescription Dosage fields:")
    for f in meta.fields:
        print(f"  {f.fieldname}: {f.fieldtype} -> {f.options}")
