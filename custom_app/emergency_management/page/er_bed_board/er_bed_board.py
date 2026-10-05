import frappe


# ==========================================================
# ER Bed Board Backend
# لوحة متابعة الأسرة - جلب بيانات الأسرة الحالية
# ==========================================================


@frappe.whitelist()
def get_er_bed_board():
    """
    إرجاع جميع أسرة الطوارئ مع:
    - حالة السرير
    - المريض الحالي
    - الطبيب
    - الممرض
    - موقع السرير
    """

    beds = frappe.get_all(
        "ER Bed",
        fields=[
            "name",
            "bed_code",
            "bed_name",
            "arabic_name",
            "bed_status",
            "current_patient",
            "current_intake",
            "assigned_doctor",
            "assigned_nurse",
            "waiting_area",
            "current_location",
            "is_active"
        ],
        filters={
            "is_active": 1
        },
        order_by="bed_code asc"
    )


    # ======================================================
    # إضافة بيانات المريض المرتبط بالسرير
    # ======================================================

    for bed in beds:

        bed.patient_name = None
        bed.patient_gender = None
        bed.patient_age = None


        if bed.current_patient:

            patient = frappe.db.get_value(
                "Patient",
                bed.current_patient,
                [
                    "patient_name",
                    "sex",
                    "dob"
                ],
                as_dict=True
            )


            if patient:

                bed.patient_name = patient.patient_name

                bed.patient_gender = patient.sex


                # حساب العمر إذا وجد تاريخ الميلاد
                if patient.dob:
                    from frappe.utils import getdate, date_diff

                    days = date_diff(
                        frappe.utils.nowdate(),
                        patient.dob
                    )

                    bed.patient_age = int(days / 365)



    # ======================================================
    # إرجاع البيانات للواجهة
    # ======================================================

    return beds