import frappe


def create_er_beds():

    beds = [

        {
            "bed_code": "ER-001",
            "bed_name": "Resuscitation Bed 1",
            "arabic_name": "سرير إنعاش 1",
            "waiting_area": "TRIAGE_AREA",
            "current_location": "TRIAGE",
            "bed_status": "AVAILABLE",
            "bed_number": 1,
            "room_number": "ER-A",
            "is_active": 1,
            "is_isolation_bed": 0,
            "supports_ventilator": 1
        },

        {
            "bed_code": "ER-002",
            "bed_name": "Resuscitation Bed 2",
            "arabic_name": "سرير إنعاش 2",
            "waiting_area": "TRIAGE_AREA",
            "current_location": "TRIAGE",
            "bed_status": "AVAILABLE",
            "bed_number": 2,
            "room_number": "ER-A",
            "is_active": 1,
            "is_isolation_bed": 0,
            "supports_ventilator": 1
        },

        {
            "bed_code": "ER-003",
            "bed_name": "Treatment Bed 1",
            "arabic_name": "سرير علاج 1",
            "waiting_area": "TRIAGE_AREA",
            "current_location": "TREATMENT_ROOM",
            "bed_status": "AVAILABLE",
            "bed_number": 3,
            "room_number": "ER-B",
            "is_active": 1,
            "is_isolation_bed": 0,
            "supports_ventilator": 0
        },

        {
            "bed_code": "ER-004",
            "bed_name": "Treatment Bed 2",
            "arabic_name": "سرير علاج 2",
            "waiting_area": "TRIAGE_AREA",
            "current_location": "TREATMENT_ROOM",
            "bed_status": "AVAILABLE",
            "bed_number": 4,
            "room_number": "ER-B",
            "is_active": 1,
            "is_isolation_bed": 0,
            "supports_ventilator": 0
        },

        {
            "bed_code": "ER-005",
            "bed_name": "Observation Bed 1",
            "arabic_name": "سرير ملاحظة 1",
            "waiting_area": "OBSERVATION_AREA",
            "current_location": "OBSERVATION",
            "bed_status": "AVAILABLE",
            "bed_number": 5,
            "room_number": "ER-C",
            "is_active": 1,
            "is_isolation_bed": 0,
            "supports_ventilator": 0
        }

    ]


    for item in beds:

        existing = frappe.db.exists(
            "ER Bed",
            {
                "bed_code": item["bed_code"]
            }
        )


        if existing:

            doc = frappe.get_doc(
                "ER Bed",
                existing
            )

            doc.update(item)

            doc.save(
                ignore_permissions=True
            )

        else:

            doc = frappe.get_doc({

                "doctype": "ER Bed",
                **item

            })

            doc.insert(
                ignore_permissions=True
            )


    frappe.db.commit()