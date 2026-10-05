import frappe

def get_valid_departments():
    depts = frappe.get_all("Department", {"is_group": 0}, pluck="name")
    print(f"Valid departments: {depts}")
