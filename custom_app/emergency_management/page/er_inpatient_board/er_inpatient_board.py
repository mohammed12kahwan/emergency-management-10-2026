import frappe
from collections import defaultdict


@frappe.whitelist()
def get_observation_board():

    beds = frappe.get_all(
        "ER Bed",
        fields=[
            "name",
            "bed_code",
            "bed_name",
            "room_number",
            "bed_number",
            "bed_status",
            "current_patient",
            "assigned_doctor"
        ],
        order_by="room_number asc, bed_number asc"
    )

    rooms = defaultdict(list)

    for bed in beds:

        rooms[bed.room_number].append({
            "name": bed.name,
            "bed_code": bed.bed_code,
            "bed_name": bed.bed_name,
            "bed_number": bed.bed_number,
            "status": bed.bed_status,
            "patient": bed.current_patient,
            "doctor": bed.assigned_doctor
        })

    return rooms