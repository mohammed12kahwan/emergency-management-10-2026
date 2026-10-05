import frappe

def get_bed_status_names():
    statuses = frappe.get_all("ER Bed Status", fields=["name", "status_type", "is_available", "is_active"])
    for s in statuses:
        print(f"  name='{s.name}', type={s.status_type}, available={s.is_available}, active={s.is_active}")
