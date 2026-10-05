import frappe
from frappe.utils import now_datetime, time_diff_in_seconds


# =========================================================
# Emergency Tracking Board
# =========================================================

@frappe.whitelist()
def get_tracking_board():

    # -----------------------------------------------------
    # الحالات التي لا تظهر في لوحة المتابعة
    # -----------------------------------------------------
    excluded_statuses = [
        "خروج",
        "تحويل",
        "ملغي",
    ]

    # -----------------------------------------------------
    # جلب الحالات النشطة
    # -----------------------------------------------------
    patients = frappe.get_all(
        "ER Patient Intake",
        filters={
            "status": ["not in", excluded_statuses]
        },
        fields=[
            "name",
            "patient",
            "اسم_المريض",
            "status",
            "acuity",
            "priority",
            "assigned_doctor",
            "assigned_bed",
            "arrival_time",
            "visit_date_time",
            "current_location",
            "last_status_update",
        ],
        order_by="visit_date_time asc",
    )

    # -----------------------------------------------------
    # الإحصائيات
    # -----------------------------------------------------
    statistics = {
        "total": len(patients),
        "waiting_triage": 0,
        "waiting_doctor": 0,
        "under_treatment": 0,
        "critical": 0,
        "available_beds": 0,
        "average_wait_minutes": 0,
    }

    # -----------------------------------------------------
    # جلب مستويات الفرز ESI
    # -----------------------------------------------------
    triage_levels = frappe.get_all(
        "ER Triage Level",
        filters={
            "is_active": 1
        },
        fields=[
            "name",
            "code",
            "esi_level",
            "level_name",
            "color",
            "display_order",
        ],
        order_by="esi_level asc",
    )

    # -----------------------------------------------------
    # خريطة مستويات ESI
    # -----------------------------------------------------
    triage_map = {}

    # -----------------------------------------------------
    # توزيع حالات ESI
    #
    # يتم إنشاء البطاقات من مستويات ESI الفعلية
    # الموجودة في DocType ER Triage Level
    # -----------------------------------------------------
    esi_distribution = []

    for level in triage_levels:

        triage_map[level.name] = {
            "esi_level": level.esi_level,
            "code": level.code,
            "level_name": level.level_name,
            "color": level.color,
        }

        esi_distribution.append({
            "level": level.esi_level,
            "label": f"ESI-{level.esi_level}",
            "count": 0,
            "color": level.color or "#999",
            "level_name": level.level_name,
        })

    # -----------------------------------------------------
    # خريطة سريعة لزيادة عدد حالات ESI
    # -----------------------------------------------------
    esi_count_map = {
        item["level"]: item
        for item in esi_distribution
    }

    # -----------------------------------------------------
    # حساب وقت الانتظار
    # -----------------------------------------------------
    now = now_datetime()

    wait_values = []

    # -----------------------------------------------------
    # معالجة المرضى
    # -----------------------------------------------------
    for patient in patients:

        # =================================================
        # ESI
        # =================================================

        patient.esi_level = None
        patient.esi_label = None
        patient.esi_color = None

        if patient.acuity and patient.acuity in triage_map:

            triage = triage_map[patient.acuity]

            patient.esi_level = triage["esi_level"]
            patient.esi_label = f"ESI-{triage['esi_level']}"
            patient.esi_color = triage["color"]

            # -------------------------------------------------
            # زيادة عدد حالات مستوى ESI
            # -------------------------------------------------
            if triage["esi_level"] in esi_count_map:

                esi_count_map[
                    triage["esi_level"]
                ]["count"] += 1

            # الحالات الحرجة ESI 1 و ESI 2
            if triage["esi_level"] in [1, 2]:
                statistics["critical"] += 1

        # =================================================
        # Status
        # =================================================

        if patient.status in [
            "وصل للطوارئ",
            "تحت الفرز",
        ]:
            statistics["waiting_triage"] += 1

        elif patient.status == "بانتظار الطبيب":
            statistics["waiting_doctor"] += 1

        elif patient.status in [
            "قيد الفحص",
            "طلب فحوصات",
            "بانتظار النتائج",
            "قرار الطبيب",
            "في سرير الطوارئ",
        ]:
            statistics["under_treatment"] += 1

        # =================================================
        # اسم الطبيب
        # =================================================

        patient.doctor_name = None

        if patient.assigned_doctor:

            try:

                practitioner = frappe.get_doc(
                    "Healthcare Practitioner",
                    patient.assigned_doctor
                )

                patient.doctor_name = (
                    practitioner.get("practitioner_name")
                    or practitioner.get("employee_name")
                    or practitioner.name
                )

            except Exception:

                patient.doctor_name = patient.assigned_doctor

        # =================================================
        # السرير
        # =================================================

        patient.bed_name = patient.assigned_bed or None

        # =================================================
        # وقت بداية الانتظار
        #
        # الأولوية:
        # arrival_time
        # ثم visit_date_time
        # =================================================

        wait_start = (
            patient.arrival_time
            or patient.visit_date_time
        )

        patient.wait_minutes = 0
        patient.wait_time = "00:00"
        patient.wait_alert = False

        if wait_start:

            try:

                seconds = time_diff_in_seconds(
                    now,
                    wait_start
                )

                if seconds < 0:
                    seconds = 0

                patient.wait_minutes = int(
                    seconds / 60
                )

                hours = patient.wait_minutes // 60
                minutes = patient.wait_minutes % 60

                patient.wait_time = (
                    f"{hours:02d}:{minutes:02d}"
                )

                # -------------------------------------------------
                # تنبيه الانتظار
                #
                # الحالات التي تنتظر الفرز أو الطبيب:
                # أكثر من 30 دقيقة = تنبيه
                # -------------------------------------------------

                if patient.status in [
                    "وصل للطوارئ",
                    "تحت الفرز",
                    "بانتظار الطبيب",
                ]:

                    if patient.wait_minutes >= 30:
                        patient.wait_alert = True

                    wait_values.append(
                        patient.wait_minutes
                    )

            except Exception:

                patient.wait_minutes = 0
                patient.wait_time = "00:00"

    # -----------------------------------------------------
    # متوسط وقت الانتظار
    # -----------------------------------------------------

    if wait_values:

        statistics["average_wait_minutes"] = round(
            sum(wait_values) / len(wait_values)
        )

    # -----------------------------------------------------
    # الأسرّة المتاحة
    #
    # القيمة الفعلية في ER Bed:
    # AVAILABLE(متاح)
    # -----------------------------------------------------

    statistics["available_beds"] = frappe.db.count(
        "ER Bed",
        {
            "bed_status": "AVAILABLE(متاح)"
        }
    )

    # -----------------------------------------------------
    # النتيجة النهائية
    # -----------------------------------------------------

    return {
        "statistics": statistics,
        "patients": patients,
        "esi_distribution": esi_distribution,
        "updated_at": now,
    }


# =========================================================
# بدء الفرز
# =========================================================

@frappe.whitelist()
def start_triage(intake_name):

    """
    بدء عملية الفرز للمريض.

    يسمح فقط إذا كانت الحالة:
    تحت الفرز
    """

    doc = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    if doc.status != "تحت الفرز":

        frappe.throw(
            f"لا يمكن بدء الفرز لأن الحالة الحالية هي: {doc.status}"
        )

    from custom_app.emergency_management.api.er_visit_workflow import (
        transition_er_visit,
    )

    transition_er_visit(
        doc.name,
        "بانتظار الطبيب",
    )

    frappe.db.set_value(
        "ER Patient Intake",
        doc.name,
        "last_status_update",
        now_datetime(),
    )

    doc.reload()

    frappe.db.commit()

    return {
        "success": True,
        "message": "تم بدء الفرز بنجاح",
        "status": doc.status,
        "patient": doc.name,
    }