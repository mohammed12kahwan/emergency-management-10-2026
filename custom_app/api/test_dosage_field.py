import frappe

def check_dosage_field():
    meta = frappe.get_meta("Medication Request")
    for f in meta.fields:
        if f.fieldname == "dosage":
            print(f"fieldname: {f.fieldname}")
            print(f"fieldtype: {f.fieldtype}")
            print(f"options: {f.options}")
            print(f"custom: {getattr(f, 'custom', False)}")
            print(f"is_custom_field: {getattr(f, 'is_custom_field', False)}")
            break
    else:
        print("dosage field not found")
    
    print("\n--- All Link fields in Medication Request ---")
    for f in meta.fields:
        if f.fieldtype == "Link":
            print(f"  {f.fieldname} -> {f.options}")
