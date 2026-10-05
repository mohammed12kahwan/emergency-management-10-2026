import frappe

def create_missing_doctypes():
    # Create Dosage doctype if missing
    if not frappe.db.exists("DocType", "Dosage"):
        print("Creating Dosage doctype...")
        try:
            dosage = frappe.get_doc({
                "doctype": "DocType",
                "name": "Dosage",
                "module": "Healthcare",
                "custom": 0,
                "autoname": "field:dosage",
                "title_field": "dosage",
                "fields": [
                    {"fieldname": "dosage", "fieldtype": "Data", "label": "Dosage", "reqd": 1, "unique": 1},
                    {"fieldname": "description", "fieldtype": "Text", "label": "Description"},
                ],
                "permissions": [
                    {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "submit": 0, "cancel": 0, "report": 1, "export": 1, "import": 0, "share": 1, "print": 1, "email": 1},
                ]
            })
            dosage.insert(ignore_permissions=True)
            frappe.db.commit()
            print("  Dosage created")
        except Exception as e:
            print(f"  Failed to create Dosage: {e}")

    # Create ER Transfer Log doctype if missing
    if not frappe.db.exists("DocType", "ER Transfer Log"):
        print("Creating ER Transfer Log doctype...")
        try:
            dt = frappe.get_doc({
                "doctype": "DocType",
                "name": "ER Transfer Log",
                "module": "Emergency Management",
                "custom": 0,
                "autoname": "naming_series:",
                "title_field": "patient",
                "fields": [
                    {"fieldname": "naming_series", "fieldtype": "Select", "label": "Series", "options": "ER-TRN-.YYYY.-"},
                    {"fieldname": "encounter", "fieldtype": "Link", "label": "Encounter", "options": "Patient Encounter", "reqd": 1},
                    {"fieldname": "patient", "fieldtype": "Link", "label": "Patient", "options": "Patient", "reqd": 1},
                    {"fieldname": "transfer_type", "fieldtype": "Select", "label": "Transfer Type", "options": "Internal\nExternal", "reqd": 1},
                    {"fieldname": "from_department", "fieldtype": "Link", "label": "From Department", "options": "Department"},
                    {"fieldname": "to_department", "fieldtype": "Link", "label": "To Department", "options": "Department"},
                    {"fieldname": "from_bed", "fieldtype": "Link", "label": "From Bed", "options": "ER Bed"},
                    {"fieldname": "to_bed", "fieldtype": "Link", "label": "To Bed", "options": "ER Bed"},
                    {"fieldname": "transfer_time", "fieldtype": "Datetime", "label": "Transfer Time"},
                    {"fieldname": "transferred_by", "fieldtype": "Link", "label": "Transferred By", "options": "User"},
                    {"fieldname": "notes", "fieldtype": "Text", "label": "Notes"},
                ],
                "permissions": [
                    {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "submit": 0, "cancel": 0, "report": 1, "export": 1, "import": 0, "share": 1, "print": 1, "email": 1},
                ]
            })
            dt.insert(ignore_permissions=True)
            frappe.db.commit()
            print("  ER Transfer Log created")
        except Exception as e:
            print(f"  Failed to create ER Transfer Log: {e}")

    # Create ER Discharge Log doctype if missing
    if not frappe.db.exists("DocType", "ER Discharge Log"):
        print("Creating ER Discharge Log doctype...")
        try:
            dt = frappe.get_doc({
                "doctype": "DocType",
                "name": "ER Discharge Log",
                "module": "Emergency Management",
                "custom": 0,
                "autoname": "naming_series:",
                "title_field": "patient",
                "fields": [
                    {"fieldname": "naming_series", "fieldtype": "Select", "label": "Series", "options": "ER-DIS-.YYYY.-"},
                    {"fieldname": "encounter", "fieldtype": "Link", "label": "Encounter", "options": "Patient Encounter", "reqd": 1},
                    {"fieldname": "patient", "fieldtype": "Link", "label": "Patient", "options": "Patient", "reqd": 1},
                    {"fieldname": "discharge_type", "fieldtype": "Select", "label": "Discharge Type", "options": "Home\nAdmission\nTransfer\nLeft Against Advice\nDied", "reqd": 1},
                    {"fieldname": "discharge_time", "fieldtype": "Datetime", "label": "Discharge Time"},
                    {"fieldname": "discharged_by", "fieldtype": "Link", "label": "Discharged By", "options": "User"},
                    {"fieldname": "department", "fieldtype": "Link", "label": "Department", "options": "Department"},
                    {"fieldname": "bed", "fieldtype": "Link", "label": "Bed", "options": "ER Bed"},
                    {"fieldname": "instructions", "fieldtype": "Text", "label": "Instructions"},
                    {"fieldname": "follow_up", "fieldtype": "Data", "label": "Follow Up"},
                ],
                "permissions": [
                    {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "submit": 0, "cancel": 0, "report": 1, "export": 1, "import": 0, "share": 1, "print": 1, "email": 1},
                ]
            })
            dt.insert(ignore_permissions=True)
            frappe.db.commit()
            print("  ER Discharge Log created")
        except Exception as e:
            print(f"  Failed to create ER Discharge Log: {e}")
