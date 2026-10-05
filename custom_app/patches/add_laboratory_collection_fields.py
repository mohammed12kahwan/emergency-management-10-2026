import frappe


FIELDS = [
    {
        "fieldname": "custom_requested_test",
        "label": "Requested Test",
        "fieldtype": "Data",
        "insert_after": "observation_template",
        "read_only": 1,
        "in_list_view": 1,
    },
    {
        "fieldname": "custom_lab_test",
        "label": "Lab Test",
        "fieldtype": "Link",
        "options": "Lab Test",
        "insert_after": "custom_requested_test",
        "read_only": 1,
    },
    {
        "fieldname": "custom_er_request",
        "label": "ER Laboratory Request",
        "fieldtype": "Link",
        "options": "ER Diagnostic Request",
        "insert_after": "custom_lab_test",
        "read_only": 1,
    },
    {
        "fieldname": "custom_test_code",
        "label": "Test Code",
        "fieldtype": "Data",
        "insert_after": "custom_er_request",
        "read_only": 1,
    },
]


def execute():
    for field in FIELDS:
        if frappe.db.exists(
            "Custom Field",
            {
                "dt": "Observation Sample Collection",
                "fieldname": field["fieldname"],
            },
        ):
            continue

        frappe.get_doc(
            {
                "doctype": "Custom Field",
                "dt": "Observation Sample Collection",
                **field,
            }
        ).insert(ignore_permissions=True)

    frappe.clear_cache(doctype="Observation Sample Collection")