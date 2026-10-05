import frappe

def check_service_request_fields():
    meta = frappe.get_meta("ER Patient Service Request")
    for f in meta.fields:
        if "patient" in f.fieldname.lower():
            print(f"{f.fieldname}: {f.fieldtype} -> {f.options}")
