import frappe

from custom_app.emergency_management.api.tracking_board import get_tracking_board


@frappe.whitelist()
def get_data():
    """
    إرجاع بيانات لوحة متابعة مرضى الطوارئ.
    تعتمد البيانات على API المركزي الموجود في:
    emergency_management/api/tracking_board.py
    """
    return get_tracking_board()