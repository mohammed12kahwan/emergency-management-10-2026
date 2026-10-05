import frappe

print("User before:", frappe.session.user)
frappe.set_user("Administrator")
print("User after:", frappe.session.user)

# Test frappe.call return format
print("\n=== Testing frappe.call ===")
result = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.get_active_encounters")
print(f"Type: {type(result)}")
print(f"Result: {result[:3] if isinstance(result, list) else result}")

# Test with args
encounters = frappe.get_all("Patient Encounter", limit=1)
if encounters:
    enc_name = encounters[0].name
    print(f"\nEncounter: {enc_name}")
    result = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.get_encounter_details", {"encounter": enc_name})
    print(f"Type: {type(result)}")
    if isinstance(result, dict):
        print(f"Keys: {list(result.keys())[:5]}")
    else:
        print(f"Result: {result}")
