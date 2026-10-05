import frappe
import json


@frappe.whitelist()
def create_service_request(data):

    data = json.loads(data)


    encounter = frappe.get_doc(
        "Patient Encounter",
        data.get("encounter")
    )


    request = frappe.get_doc({

        "doctype": "Service Request",

        "patient": encounter.patient,

        "patient_name": encounter.patient_name,

        "practitioner": encounter.practitioner,

        "medical_department": encounter.medical_department,

        "title": data.get(
            "title",
            "ER Service Request"
        ),

        "order_description": data.get(
            "description"
        ),

        "priority": data.get(
            "priority",
            "Routine"
        )

    })


    request.insert(
        ignore_permissions=True
    )


    return {

        "name": request.name,

        "message": "تم إنشاء طلب الخدمة"

    }