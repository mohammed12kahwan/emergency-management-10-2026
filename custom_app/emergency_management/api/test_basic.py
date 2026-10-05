import frappe

print("User:", frappe.session.user)
print("User ID:", frappe.session.user)

# Test basic access
patients = frappe.get_all("Patient", limit=1)
print("Patients:", len(patients))

encounters = frappe.get_all("Patient Encounter", limit=1)
print("Encounters:", len(encounters))

intakes = frappe.get_all("ER Patient Intake", limit=1)
print("ER Patient Intakes:", len(intakes))

# Test frappe.call return format
result = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.get_active_encounters")
print("\nget_active_encounters result type:", type(result))
if isinstance(result, list):
    print("Count:", len(result))
    if result:
        print("First item:", result[0])
else:
    print("Result:", result)
