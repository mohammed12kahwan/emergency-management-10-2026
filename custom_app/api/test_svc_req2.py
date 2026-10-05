import frappe

def check_svc_req():
    meta = frappe.get_meta("ER Patient Service Request")
    for f in meta.fields:
        print(f"{f.fieldname}: {f.fieldtype}")
