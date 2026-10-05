import frappe

def test_call():
    # Test 1: No args
    print("=== Test 1: get_active_encounters no args ===")
    try:
        r = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.get_active_encounters")
        print(f"Type: {type(r)}, Result: {str(r)[:200]}")
    except Exception as e:
        print(f"Error: {e}")

    # Test 2: With empty dict as positional
    print("\n=== Test 2: get_active_encounters empty dict ===")
    try:
        r = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.get_active_encounters", {})
        print(f"Type: {type(r)}, Result: {str(r)[:200]}")
    except Exception as e:
        print(f"Error: {e}")

    # Test 3: With kwargs
    print("\n=== Test 3: get_active_encounters kwargs ===")
    try:
        r = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.get_active_encounters", **{})
        print(f"Type: {type(r)}, Result: {str(r)[:200]}")
    except Exception as e:
        print(f"Error: {e}")

    # Test 4: get_encounter_details with dict positional
    print("\n=== Test 4: get_encounter_details dict positional ===")
    try:
        r = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.get_encounter_details", {"encounter": "HLC-ENC-2026-00023"})
        print(f"Type: {type(r)}, Result: {str(r)[:200]}")
    except Exception as e:
        print(f"Error: {e}")

    # Test 5: get_encounter_details with kwargs
    print("\n=== Test 5: get_encounter_details kwargs ===")
    try:
        r = frappe.call("custom_app.emergency_management.page.er_visit_console.er_visit_console.get_encounter_details", encounter="HLC-ENC-2026-00023")
        print(f"Type: {type(r)}, Result: {str(r)[:200]}")
    except Exception as e:
        print(f"Error: {e}")
