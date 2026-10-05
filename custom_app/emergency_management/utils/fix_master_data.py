import frappe


def create_complaint(name):

    if not name:
        return None

    if frappe.db.exists("ER Chief Complaint", name):
        return name

    doc = frappe.get_doc({
        "doctype": "ER Chief Complaint",
        "code": frappe.scrub(name).upper()[:20],
        "complaint_name": name,
        "complaint_name_ar": name,
        "complaint_category": "GEN"
    })

    doc.insert(ignore_permissions=True)

    print("✓ Created Complaint:", name)

    return doc.name


def execute():

    print("\n========== FIX MASTER DATA ==========\n")

    # -------------------------------------------------
    # إنشاء جميع الشكاوى المفقودة
    # -------------------------------------------------

    complaints = frappe.db.sql("""
        SELECT DISTINCT chief_complaint
        FROM `tabER Patient Intake`
        WHERE chief_complaint IS NOT NULL
          AND chief_complaint != ''
    """, as_list=True)

    for row in complaints:

        create_complaint(row[0])

    # -------------------------------------------------
    # إصلاح سجلات الطوارئ
    # -------------------------------------------------

    patients = frappe.get_all(
        "ER Patient Intake",
        pluck="name"
    )

    fixed = 0

    for name in patients:

        doc = frappe.get_doc("ER Patient Intake", name)

        changed = False

        # -----------------------
        # Visit Type
        # -----------------------

        if doc.visit_type == "طوارئ":
            doc.visit_type = "NEW"
            changed = True

        # -----------------------
        # Arrival Mode
        # -----------------------

        if doc.arrival_mode == "سيارة اسعاف المستشفي":
            doc.arrival_mode = "AMB"
            changed = True

        # -----------------------
        # ESI
        # -----------------------

        if doc.acuity == "ESI-1":
            doc.acuity = "ESI1"
            changed = True

        elif doc.acuity == "ESI-2":
            doc.acuity = "ESI2"
            changed = True

        elif doc.acuity == "ESI-3":
            doc.acuity = "ESI3"
            changed = True

        elif doc.acuity == "ESI-4":
            doc.acuity = "ESI4"
            changed = True

        elif doc.acuity == "ESI-5":
            doc.acuity = "ESI5"
            changed = True

        # -----------------------
        # Chief Complaint
        # -----------------------

        if not doc.chief_complaint:

            doc.chief_complaint = "FEVER"

            changed = True

        else:

            doc.chief_complaint = create_complaint(
                doc.chief_complaint
            )

            changed = True

        if changed:

            doc.save(ignore_permissions=True)

            fixed += 1

            print("✓", doc.name)

    frappe.db.commit()

    print("\n==============================")
    print("Fixed:", fixed)
    print("==============================")