import frappe

def check_bed_statuses():
    statuses = frappe.get_all("ER Bed Status", fields=["name", "status_type", "is_available", "is_active"])
    for s in statuses:
        print(f"  {s.name}: type={s.status_type}, available={s.is_available}, active={s.is_active}")
    
    # Check what get_available_bed_status returns
    from custom_app.emergency_management.utils.bed import get_available_bed_status
    try:
        available = get_available_bed_status()
        print(f"\nget_available_bed_status() returns: {available}")
    except Exception as e:
        print(f"\nget_available_bed_status() failed: {e}")
