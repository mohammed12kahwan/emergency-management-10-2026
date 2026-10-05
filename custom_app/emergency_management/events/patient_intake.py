import frappe


def after_insert(doc, method=None):
    """
    إنشاء سجل تلقائي في ER Patient Queue
    بعد إنشاء ER Patient Intake
    """

    # منع إنشاء سجل مكرر لنفس الزيارة
    if frappe.db.exists(
        "ER Patient Queue",
        {
            "patient_intake": doc.name
        }
    ):
        return

    # الحصول على آخر رقم انتظار
    last_queue = frappe.db.sql("""
        SELECT COALESCE(MAX(queue_number), 0)
        FROM `tabER Patient Queue`
    """)[0][0]

    queue = frappe.new_doc("ER Patient Queue")

    # ------------------------------
    # معلومات الزيارة
    # ------------------------------

    queue.patient_intake = doc.name
    queue.patient = doc.patient
    queue.patient_name = doc.get("اسم_المريض") or doc.patient

    # ------------------------------
    # قائمة الانتظار
    # ------------------------------

    queue.queue_number = last_queue + 1
    queue.queue_status = "في الانتظار"
    queue.active_queue = 1

    # ------------------------------
    # وقت الوصول
    # ------------------------------

    queue.arrival_time = (
        doc.arrival_time
        or doc.visit_date_time
    )

    # ------------------------------
    # مدة الانتظار
    # ------------------------------

    queue.waiting_minutes = 0

    # ------------------------------
    # القيم الافتراضية
    # ------------------------------

    queue.current_location = None
    queue.waiting_area = None
    queue.triage_level = None
    queue.priority = None
    queue.attending_physician = None
    queue.assigned_nurse = None
    queue.bed = None
    queue.bed_status = None

    queue.insert(ignore_permissions=True)

    frappe.db.commit()