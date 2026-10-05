import frappe

def get_valid_locations():
    locations = frappe.get_all("ER Current Location", pluck="name")
    print(f"Valid ER Current Locations: {locations}")
