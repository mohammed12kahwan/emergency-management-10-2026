import frappe

from frappe.model.naming import make_autoname
from frappe.utils import now_datetime

from custom_app.emergency_management.utils.bed import (
    get_available_bed_status,
    get_occupied_bed_status,
)


# =========================================================
# ER SERVICE REQUESTS
# طلبات خدمات الطوارئ
#
# المسؤوليات:
# 1. إنشاء ER Patient Service Request
# 2. إرسال الإشعارات حسب نوع الخدمة
# 3. التحويل الداخلي:
#       ER Patient Service Request
#       +
#       ER Admission Request
# 4. الاستشارة تستخدم Healthcare Practitioner.
# =========================================================


# =========================================================
# توزيع الخدمات على الأدوار
# =========================================================

SERVICE_ROLE_MAP = {

    "Laboratory": [
        "Laboratory User",
    ],

    "Radiology": [
        "Healthcare Administrator",
    ],

    "Medication": [
        "Stock User",
    ],

    "Admission": [
        "ER Doctor",
    ],

    "Transfer": [
        "ER Doctor",
    ],

    "Consultation": [
        "ER Doctor",
    ],

    "Discharge": [
        "ER Doctor",
    ],

}


# =========================================================
# أسماء الخدمات بالعربي
# =========================================================

SERVICE_LABELS = {

    "Laboratory":
        "المختبر",

    "Radiology":
        "الأشعة",

    "Medication":
        "الصيدلية",

    "Transfer":
        "التحويل",

    "Consultation":
        "الاستشارة",

    "Discharge":
        "الخروج",

}


# =========================================================
# الحصول على المستخدمين حسب الدور
# =========================================================

def _get_users_by_roles(
    roles
):

    if not roles:
        return []

    users = frappe.get_all(

        "Has Role",

        filters={
            "role": [
                "in",
                roles
            ],
        },

        fields=[
            "parent"
        ],

        distinct=True,

        limit_page_length=0,
    )

    result = []

    for row in users:

        user = row.parent

        if not user:
            continue

        if user == "Guest":
            continue

        if not frappe.db.get_value(
            "User",
            user,
            "enabled"
        ):
            continue

        if (
            frappe.db.get_value(
                "User",
                user,
                "user_type"
            )
            != "System User"
        ):
            continue

        result.append(
            user
        )

    return list(
        dict.fromkeys(result)
    )


# =========================================================
# إنشاء Notification Log لطلب الخدمة
# =========================================================

def _create_notification(
    user,
    request_doc
):

    service_label = (
        SERVICE_LABELS.get(
            request_doc.request_type,
            request_doc.request_type
        )
    )

    subject = (
        "طلب خدمة طوارئ جديد: "
        + str(request_doc.name)
    )

    patient_name = (
        frappe.db.get_value(
            "Patient",
            request_doc.patient,
            "patient_name"
        )
        if request_doc.patient
        else None
    )

    description = (

        "تم إنشاء طلب خدمة جديد.\n\n"

        "رقم الطلب: "
        + str(request_doc.name)
        + "\n"

        "الخدمة: "
        + str(service_label)
        + "\n"

        "المريض: "
        + str(
            patient_name
            or
            request_doc.patient
            or
            ""
        )
        + "\n"

        "الأولوية: "
        + str(
            request_doc.priority
            or
            "Normal"
        )
        + "\n"

        "الحالة: "
        + str(
            request_doc.status
            or
            "Pending"
        )

    )

    notification_link = (

        "/app/er-patient-service-request/"
        + str(
            request_doc.name
        )

    )

    exists = frappe.db.exists(

        "Notification Log",

        {

            "for_user":
                user,

            "document_type":
                "ER Patient Service Request",

            "document_name":
                request_doc.name,

            "subject":
                subject,

        }

    )

    if exists:
        return

    notification = frappe.new_doc(
        "Notification Log"
    )

    notification.for_user = user

    notification.from_user = (
        frappe.session.user
    )

    notification.type = "Alert"

    notification.document_type = (
        "ER Patient Service Request"
    )

    notification.document_name = (
        request_doc.name
    )

    notification.subject = (
        subject
    )

    notification.title = (
        subject
    )

    notification.description = (
        description
    )

    notification.email_content = (
        description
    )

    notification.link = (
        notification_link
    )

    notification.read = 0

    notification.insert(
        ignore_permissions=True
    )


# =========================================================
# إشعار خاص بطلب التنويم
# =========================================================

def _create_admission_notification(
    user,
    admission_doc
):

    subject = (
        "طلب تنويم طوارئ جديد: "
        + str(admission_doc.name)
    )

    department_name = (
        admission_doc.requested_department
        or
        "---"
    )

    patient_name = (
        admission_doc.patient_name
        or
        admission_doc.patient
        or
        "---"
    )

    description = (

        "تم إنشاء طلب تنويم جديد من الطوارئ.\n\n"

        "رقم الطلب: "
        + str(admission_doc.name)
        + "\n"

        "المريض: "
        + str(patient_name)
        + "\n"

        "القسم المطلوب: "
        + str(department_name)
        + "\n"

        "نوع وحدة الرقود: "
        + str(
            admission_doc.requested_service_unit_type
            or
            "---"
        )
        + "\n"

        "الأولوية: "
        + str(
            admission_doc.priority
            or
            "Normal"
        )
        + "\n"

        "الحالة: "
        + str(
            admission_doc.status
            or
            "Pending Approval"
        )

    )

    notification_link = (

        "/app/er-admission-request/"
        + str(
            admission_doc.name
        )

    )

    exists = frappe.db.exists(

        "Notification Log",

        {

            "for_user":
                user,

            "document_type":
                "ER Admission Request",

            "document_name":
                admission_doc.name,

            "subject":
                subject,

        }

    )

    if exists:
        return

    notification = frappe.new_doc(
        "Notification Log"
    )

    notification.for_user = user

    notification.from_user = (
        frappe.session.user
    )

    notification.type = "Alert"

    notification.document_type = (
        "ER Admission Request"
    )

    notification.document_name = (
        admission_doc.name
    )

    notification.subject = (
        subject
    )

    notification.title = (
        subject
    )

    notification.description = (
        description
    )

    notification.email_content = (
        description
    )

    notification.link = (
        notification_link
    )

    notification.read = 0

    notification.insert(
        ignore_permissions=True
    )


# =========================================================
# إرسال الإشعارات حسب نوع الخدمة
# =========================================================

def _notify_service_department(
    request_doc
):

    roles = SERVICE_ROLE_MAP.get(
        request_doc.request_type,
        []
    )

    if not roles:
        return []

    users = _get_users_by_roles(
        roles
    )

    for user in users:

        try:

            _create_notification(
                user,
                request_doc
            )

        except Exception:

            frappe.log_error(
                frappe.get_traceback(),
                "ER Service Notification Error"
            )

    return users


# =========================================================
# إشعار مكتب الدخول والخروج
# =========================================================

def _notify_admission_officers(
    admission_doc
):

    users = _get_users_by_roles(
        [
            "Admission Officer"
        ]
    )

    for user in users:

        try:

            _create_admission_notification(
                user,
                admission_doc
            )

        except Exception:

            frappe.log_error(
                frappe.get_traceback(),
                "ER Admission Notification Error"
            )

    return users


# =========================================================
# إنشاء رقم طلب الخدمة
# =========================================================

def _make_service_request_name():

    return make_autoname(
        "ER-SRV-.#####"
    )


# =========================================================
# التحقق من القسم
# =========================================================

def _validate_department(
    department
):

    if not department:
        frappe.throw(
            "يجب اختيار القسم المطلوب للتحويل الداخلي."
        )

    if not frappe.db.exists(
        "Medical Department",
        department
    ):

        frappe.throw(
            "القسم المطلوب غير موجود: "
            + str(department)
        )


# =========================================================
# التحقق من نوع وحدة الرقود
# =========================================================

def _validate_service_unit_type(
    service_unit_type
):

    if not service_unit_type:
        return

    if not frappe.db.exists(
        "Healthcare Service Unit Type",
        service_unit_type
    ):

        frappe.throw(
            "نوع وحدة الرقود غير موجود: "
            + str(service_unit_type)
        )


# =========================================================
# إنشاء طلب تنويم للتحويل الداخلي
#
# يستخدم الـ DocType الموجود:
# ER Admission Request
#
# الحالة:
# Pending Approval
#
# Workflow State:
# Pending
# =========================================================

def _create_admission_request(
    data
):

    patient = data.get(
        "patient"
    )

    intake = data.get(
        "er_patient_intake"
    )

    bed = data.get(
        "bed"
    )

    doctor = data.get(
        "doctor"
    )

    requested_department = (
        data.get(
            "requested_department"
        )
        or
        data.get(
            "department"
        )
    )

    requested_service_unit_type = (
        data.get(
            "requested_service_unit_type"
        )
        or
        data.get(
            "service_unit_type"
        )
    )

    priority = (
        data.get(
            "priority"
        )
        or
        "Normal"
    )

    admission_reason = (
        data.get(
            "admission_reason"
        )
        or
        data.get(
            "reason"
        )
        or
        ""
    )

    notes = (
        data.get(
            "notes"
        )
        or
        ""
    )

    expected_length_of_stay = (
        data.get(
            "expected_length_of_stay"
        )
        or
        None
    )


    if not patient:
        frappe.throw(
            "لا يمكن إنشاء طلب الترقيد بدون مريض."
        )

    if not intake:
        frappe.throw(
            "لا يمكن إنشاء طلب الترقيد بدون زيارة طوارئ مرتبطة."
        )

    if bed:
        bed_doc = frappe.get_doc(
            "ER Bed",
            bed
        )

        if bed_doc.current_intake and bed_doc.current_intake != intake:
            frappe.throw(
                "الزيارة المرتبطة بطلب الترقيد لا تطابق زيارة السرير الحالي."
            )

        if bed_doc.current_patient and bed_doc.current_patient != patient:
            frappe.throw(
                "المريض المرتبط بطلب الترقيد لا يطابق مريض السرير الحالي."
            )


    _validate_department(
        requested_department
    )

    _validate_service_unit_type(
        requested_service_unit_type
    )


    admission = frappe.new_doc(
        "ER Admission Request"
    )

    admission.patient = (
        patient
    )

    admission.er_patient_intake = (
        intake
        or
        None
    )

    admission.er_bed = (
        bed
        or
        None
    )

    admission.requested_department = (
        requested_department
    )

    admission.requesting_doctor = (
        doctor
        or
        None
    )

    admission.requested_by = (
        data.get(
            "requested_by"
        )
        or
        frappe.session.user
    )

    admission.priority = (
        priority
    )

    # -----------------------------------------
    # حالة الطلب قبل/بعد Workflow
    # -----------------------------------------

    admission.status = (
        "Pending Approval"
    )

    admission.admission_reason = (
        admission_reason
    )

    admission.notes = (
        notes
    )

    admission.requested_service_unit_type = (
        requested_service_unit_type
        or
        None
    )

    admission.expected_length_of_stay = (
        expected_length_of_stay
    )

    admission.admission_status = (
        "Not Created"
    )

    admission.insert(
        ignore_permissions=True
    )

    frappe.db.set_value(
        "ER Admission Request",
        admission.name,
        "workflow_state",
        "Pending"
    )


    notified_users = (
        _notify_admission_officers(
            admission
        )
    )


    return (
        admission,
        notified_users
    )


# =========================================================
# الحصول على حالة سرير Occupied
#
# لا نعتمد على اسم ثابت.
# نبحث حسب status_type = Occupied.
# =========================================================

def _get_occupied_bed_status():

    status_name = frappe.db.get_value(

        "ER Bed Status",

        {

            "status_type":
                "Occupied",

            "is_active":
                1

        },

        "name"

    )


    if status_name:
        return status_name


    frappe.throw(
        "لا توجد حالة سرير من نوع Occupied في ER Bed Status."
    )


# =========================================================
# التحقق من السرير المتاح للملاحظة
# =========================================================

def _get_available_observation_bed(
    waiting_area,
    requested_bed=None
):

    if not waiting_area:

        frappe.throw(
            "يجب اختيار منطقة الملاحظة."
        )


    if not frappe.db.exists(
        "ER Waiting Area",
        waiting_area
    ):

        frappe.throw(
            "منطقة الملاحظة غير موجودة: "
            + str(waiting_area)
        )


    if not frappe.db.get_value(
        "ER Waiting Area",
        waiting_area,
        "is_active"
    ):

        frappe.throw(
            "منطقة الملاحظة غير فعالة."
        )


    # -----------------------------------------------------
    # إذا اختار المستخدم سريرًا محددًا
    # -----------------------------------------------------

    if requested_bed:

        bed = frappe.get_doc(
            "ER Bed",
            requested_bed
        )

        if not bed.is_active:

            frappe.throw(
                "السرير المحدد غير فعال."
            )


        if bed.waiting_area != waiting_area:

            frappe.throw(
                "السرير المحدد لا يتبع منطقة الملاحظة المختارة."
            )


        if bed.current_patient:

            frappe.throw(
                "السرير المحدد مشغول حاليًا."
            )


        if bed.current_observation:

            frappe.throw(
                "السرير مرتبط بملاحظة حالية بالفعل."
            )


        if not bed.bed_status:

            frappe.throw(
                "لم يتم تحديد حالة السرير."
            )


        is_available = frappe.db.get_value(

            "ER Bed Status",

            bed.bed_status,

            "is_available"

        )


        if not is_available:

            frappe.throw(
                "السرير المحدد غير متاح حاليًا."
            )


        return bed


    # -----------------------------------------------------
    # اختيار أول سرير متاح
    # -----------------------------------------------------

    available_statuses = frappe.get_all(

        "ER Bed Status",

        filters={

            "is_active":
                1,

            "is_available":
                1

        },

        pluck="name",

        limit_page_length=0

    )


    if not available_statuses:

        frappe.throw(
            "لا توجد حالة سرير تسمح بالتخصيص."
        )


    beds = frappe.get_all(

        "ER Bed",

        filters={

            "waiting_area":
                waiting_area,

            "is_active":
                1,

            "current_patient":
                ["is", "not set"],

            "current_observation":
                ["is", "not set"],

            "bed_status":
                [
                    "in",
                    available_statuses
                ]

        },

        fields=[

            "name",

            "bed_code",

            "bed_name",

            "arabic_name",

            "room_number",

            "bed_status"

        ],

             order_by=
            "bed_number asc, name asc",

        limit_page_length=
            1

    )


    if not beds:

        frappe.throw(
            "لا يوجد سرير ملاحظة متاح حاليًا في منطقة "
            + str(waiting_area)
            + "."
        )


    return frappe.get_doc(
        "ER Bed",
        beds[0].name
    )


# =========================================================
# إنشاء ER Observation Stay
#
# يبدأ الملاحظة فعليًا ويحجز السرير.
# =========================================================

def _create_observation_stay(
    data
):

    patient = data.get(
        "patient"
    )

    intake = data.get(
        "er_patient_intake"
    )

    doctor = data.get(
        "doctor"
    )

    waiting_area = (
        data.get(
            "observation_area"
        )
        or
        data.get(
            "waiting_area"
        )
    )

    requested_bed = (
        data.get(
            "observation_bed"
        )
        or
        data.get(
            "bed"
        )
    )

    triage = (
        data.get(
            "triage"
        )
        or
        None
    )

    triage_level = (
        data.get(
            "triage_level"
        )
        or
        None
    )


    if not patient:

        frappe.throw(
            "لا يوجد مريض مرتبط بالملاحظة."
        )


    if not intake:

        frappe.throw(
            "لا توجد زيارة طوارئ مرتبطة بالملاحظة."
        )


    bed = _get_available_observation_bed(
        waiting_area,
        requested_bed
    )


    # -----------------------------------------------------
    # منع وجود ملاحظة نشطة أخرى لنفس الزيارة
    # -----------------------------------------------------

    existing_observation = frappe.db.exists(

        "ER Observation Stay",

        {

            "patient":
                patient,

            "patient_intake":
                intake,

            "is_active":
                1

        }

    )


    if existing_observation:

        frappe.throw(
            "للمريض ملاحظة طوارئ نشطة بالفعل: "
            + str(existing_observation)
        )


    # -----------------------------------------------------
    # نعيد فحص السرير قبل إنشاء الملاحظة
    # -----------------------------------------------------

    bed.reload()


    if bed.current_patient:

        frappe.throw(
            "السرير أصبح مشغولًا قبل إنشاء الملاحظة."
        )


    if bed.current_observation:

        frappe.throw(
            "السرير أصبح مرتبطًا بملاحظة أخرى."
        )


    if not bed.bed_status:

        frappe.throw(
            "حالة السرير غير محددة."
        )


    current_available = frappe.db.get_value(

        "ER Bed Status",

        bed.bed_status,

        "is_available"

    )


    if not current_available:

        frappe.throw(
            "السرير لم يعد متاحًا."
        )


    occupied_status = (
        _get_occupied_bed_status()
    )


    # -----------------------------------------------------
    # إنشاء سجل الملاحظة
    # -----------------------------------------------------

    observation = frappe.new_doc(
        "ER Observation Stay"
    )

    observation.patient = (
        patient
    )

    observation.patient_intake = (
        intake
    )

    observation.triage = (
        triage
        or
        None
    )

    observation.triage_level = (
        triage_level
        or
        None
    )

    observation.bed = (
        bed.name
    )

    observation.room_number = (
        bed.room_number
        or
        ""
    )

    observation.bed_status = (
        occupied_status
    )

    observation.attending_doctor = (
        doctor
        or
        None
    )

    observation.observation_status = (
        "تحت الملاحظة"
    )

    observation.admission_time = (
        now_datetime()
    )

    observation.is_active = (
        1
    )

    observation.insert(
        ignore_permissions=True
    )


    # -----------------------------------------------------
    # حجز السرير
    # -----------------------------------------------------

    bed.current_patient = (
        patient
    )

    bed.current_intake = (
        intake
    )

    bed.current_observation = (
        observation.name
    )

    bed.bed_status = (
        occupied_status
    )

    bed.patient_status = (
        "Under Observation"
    )

    bed.current_service = (
        "None"
    )

    bed.occupied_time = (
        now_datetime()
    )

    bed.released_time = (
        None
    )

    bed.save(
        ignore_permissions=True
    )


    # -----------------------------------------------------
    # حفظ منطقة الملاحظة على استقبال الطوارئ
    # لتكون مرجعاً لتصفية المرضى في لوحة الأسرة
    # -----------------------------------------------------

    if waiting_area:
        frappe.db.set_value(
            "ER Patient Intake",
            intake,
            "waiting_area",
            waiting_area,
        )


    return observation


# =========================================================
# إخلاء السرير / الخروج
# =========================================================

def _discharge_bed(
    patient,
    intake,
    bed=None
):

    if not patient:
        frappe.throw(
            "لا يوجد مريض مرتبط بعملية الخروج."
        )

    if not intake:
        frappe.throw(
            "لا يوجد زيارة طوارئ مرتبطة بعملية الخروج."
        )

    intake_doc = frappe.get_doc(
        "ER Patient Intake",
        intake
    )

    if intake_doc.status == "خروج":
        return {
            "success": True,
            "message": "المريض مخرج بالفعل.",
            "intake": intake_doc.name,
        }

    active_bed = bed or frappe.db.get_value(
        "ER Bed",
        {
            "current_patient": patient,
            "current_intake": intake,
            "is_active": 1,
        },
        "name"
    )

    if active_bed:
        bed_doc = frappe.get_doc(
            "ER Bed",
            active_bed
        )

        if bed_doc.current_observation:
            observation = frappe.get_doc(
                "ER Observation Stay",
                bed_doc.current_observation
            )

            if observation.observation_status != "تم التحويل":
                observation.observation_status = (
                    "تم التحويل"
                )
                observation.outcome_notes = (
                    (observation.outcome_notes or "")
                    +
                    "\n"
                    +
                    "تم الإخلاء من الطوارئ."
                )
                observation.save(
                    ignore_permissions=True
                )

        bed_doc.current_patient = None
        bed_doc.current_intake = None
        bed_doc.current_observation = None
        bed_doc.bed_status = get_available_bed_status()
        bed_doc.patient_status = "Discharged"
        bed_doc.current_service = "None"
        bed_doc.released_time = now_datetime()
        bed_doc.save(
            ignore_permissions=True
        )

    admission = frappe.db.get_value(
        "ER Admission Request",
        {
            "er_patient_intake": intake,
            "patient": patient,
            "admission_status": [
                "in",
                ["Created", "Admitted"]
            ],
        },
        "name"
    )

    if admission:
        frappe.db.set_value(
            "ER Admission Request",
            admission,
            "admission_status",
            "Discharged"
        )

    frappe.db.set_value(
        "ER Patient Intake",
        intake_doc.name,
        "discharge_time",
        now_datetime(),
    )
    frappe.db.set_value(
        "ER Patient Intake",
        intake_doc.name,
        "last_status_update",
        now_datetime(),
    )
    from custom_app.emergency_management.api.er_visit_workflow import (
        transition_er_visit,
    )

    transition_er_visit(
        intake_doc.name,
        "خروج",
    )

    frappe.db.commit()

    return {
        "success": True,
        "message": "تم إخلاء السرير بنجاح.",
        "intake": intake_doc.name,
        "bed": active_bed,
    }


# =========================================================
# تحويل السرير من الطوارئ إلى التنويم
# =========================================================

def _transfer_er_bed_to_inpatient(
    patient,
    intake,
    bed=None
):

    if not patient:
        frappe.throw(
            "لا يوجد مريض مرتبط بعملية التحويل."
        )

    if not intake:
        frappe.throw(
            "لا يوجد زيارة طوارئ مرتبطة بعملية التحويل."
        )

    intake_doc = frappe.get_doc(
        "ER Patient Intake",
        intake
    )

    active_bed = bed or frappe.db.get_value(
        "ER Bed",
        {
            "current_patient": patient,
            "current_intake": intake,
            "is_active": 1,
        },
        "name"
    )

    if active_bed:
        bed_doc = frappe.get_doc(
            "ER Bed",
            active_bed
        )

        if bed_doc.current_observation:
            observation = frappe.get_doc(
                "ER Observation Stay",
                bed_doc.current_observation
            )

            if observation.observation_status != "تم التنويم":
                observation.observation_status = (
                    "تم التنويم"
                )
                observation.outcome_notes = (
                    (observation.outcome_notes or "")
                    +
                    "\n"
                    +
                    "تم تحويل المريض إلى التنويم."
                )
                observation.save(
                    ignore_permissions=True
                )

        bed_doc.current_patient = None
        bed_doc.current_intake = None
        bed_doc.current_observation = None
        bed_doc.bed_status = frappe.db.get_value(
            "ER Bed Status",
            {"is_available": 1},
            "name"
        )
        bed_doc.current_service = "None"
        bed_doc.released_time = now_datetime()
        bed_doc.save(
            ignore_permissions=True
        )

    frappe.db.set_value(
        "ER Patient Intake",
        intake_doc.name,
        "admission_time",
        now_datetime(),
    )
    frappe.db.set_value(
        "ER Patient Intake",
        intake_doc.name,
        "last_status_update",
        now_datetime(),
    )

    return {
        "success": True,
        "message": "تم تحويل المريض إلى التنويم بنجاح.",
        "intake": intake_doc.name,
        "bed": active_bed,
    }


# =========================================================
# التحقق من أهلية التحويل الداخلي في الطوارئ
# =========================================================

def validate_er_internal_transfer_eligibility(
    bed_name,
    destination_bed
):

    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )

    if not bed.is_active:
        return {
            "eligible": False,
            "message": "السرير الحالي غير فعال."
        }

    if not bed.current_patient:
        return {
            "eligible": False,
            "message": "لا يوجد مريض في السرير الحالي."
        }

    if not bed.current_intake:
        return {
            "eligible": False,
            "message": "لا توجد زيارة طوارئ مرتبطة بالسرير الحالي."
        }

    dest = frappe.get_doc(
        "ER Bed",
        destination_bed
    )

    if not dest.is_active:
        return {
            "eligible": False,
            "message": "السرير الوجهة غير فعال."
        }

    if dest.current_patient:
        return {
            "eligible": False,
            "message": "السرير الوجهة مشغول حالياً."
        }

    if not frappe.db.get_value(
        "ER Bed Status",
        dest.bed_status,
        "is_available"
    ):
        return {
            "eligible": False,
            "message": "السرير الوجهة غير متاح."
        }

    return {
        "eligible": True,
        "patient": bed.current_patient,
        "intake": bed.current_intake,
        "from_bed": bed.name,
        "to_bed": dest.name,
    }


# =========================================================
# تنفيذ التحويل الداخلي في الطوارئ
# =========================================================

def _transfer_er_bed_internal(
    patient,
    intake,
    from_bed,
    to_bed,
    reason,
    notes,
    transfer_datetime
):

    if not patient:
        frappe.throw(
            "لا يوجد مريض مرتبط بعملية التحويل."
        )

    if not intake:
        frappe.throw(
            "لا يوجد زيارة طوارئ مرتبطة بعملية التحويل."
        )

    if from_bed == to_bed:
        frappe.throw(
            "السرير الوجهة هو نفس السرير الحالي."
        )

    intake_doc = frappe.get_doc(
        "ER Patient Intake",
        intake
    )

    from_bed_doc = frappe.get_doc(
        "ER Bed",
        from_bed
    )

    to_bed_doc = frappe.get_doc(
        "ER Bed",
        to_bed
    )

    if from_bed_doc.current_observation:
        observation = frappe.get_doc(
            "ER Observation Stay",
            from_bed_doc.current_observation
        )

        if observation.observation_status != "تم التنويم":
            observation.observation_status = (
                "تم التنويم"
            )
            observation.outcome_notes = (
                (observation.outcome_notes or "")
                +
                "\n"
                +
                "تم التحويل من السرير {from_bed} إلى السرير {to_bed}.\nالسبب: {reason}".format(
                    from_bed=from_bed,
                    to_bed=to_bed,
                    reason=reason or "غير محدد"
                )
            )
            observation.save(
                ignore_permissions=True
            )

    from_bed_doc.current_patient = None
    from_bed_doc.current_intake = None
    from_bed_doc.current_observation = None
    from_bed_doc.bed_status = get_available_bed_status()
    from_bed_doc.current_service = "None"
    from_bed_doc.released_time = transfer_datetime or now_datetime()
    from_bed_doc.save(
        ignore_permissions=True
    )

    to_bed_doc.current_patient = patient
    to_bed_doc.current_intake = intake
    to_bed_doc.bed_status = get_occupied_bed_status()
    to_bed_doc.current_service = "None"
    to_bed_doc.occupied_time = transfer_datetime or now_datetime()
    to_bed_doc.save(
        ignore_permissions=True
    )

    frappe.db.set_value(
        "ER Patient Intake",
        intake_doc.name,
        {
            "assigned_bed": to_bed,
            "waiting_area": (
                to_bed_doc.waiting_area
                or to_bed_doc.current_location
                or ""
            ),
            "last_status_update":
                transfer_datetime or now_datetime(),
        },
        update_modified=False,
    )

    return {
        "success": True,
        "message": "تم تحويل المريض داخلياً بنجاح.",
        "from_bed": from_bed,
        "to_bed": to_bed,
        "intake": intake_doc.name,
    }


# =========================================================
# التحقق من أهلية خروج الطوارئ
# =========================================================

def validate_er_discharge_eligibility(
    bed_name
):

    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )

    if not bed.is_active:
        return {
            "eligible": False,
            "message": "السرير غير فعال."
        }

    if not bed.current_patient:
        return {
            "eligible": False,
            "message": "لا يوجد مريض في السرير."
        }

    existing_ip = frappe.db.sql(
        """
        SELECT name, status
        FROM `tabInpatient Record`
        WHERE patient = %(patient)s
        AND status IN ('Admission Scheduled', 'Admitted')
        """,
        {"patient": bed.current_patient},
        as_dict=True,
    )

    if existing_ip:
        return {
            "eligible": False,
            "message": "المريض لديه سجل إقامة نشط: {0}. استخدم خروج المريض - التنويم.".format(existing_ip[0].name)
        }

    return {
        "eligible": True,
        "patient": bed.current_patient,
        "intake": bed.current_intake,
        "bed": bed.name,
    }


# =========================================================
# التحقق من أهلية التحويل الخارجي
# =========================================================

def validate_external_transfer_eligibility(
    inpatient_record_name
):

    if not frappe.db.exists(
        "Inpatient Record",
        inpatient_record_name
    ):
        return {
            "eligible": False,
            "message": "سجل الإقامة غير موجود."
        }

    ip = frappe.get_doc(
        "Inpatient Record",
        inpatient_record_name
    )

    if ip.status not in ("Admitted", "Discharge Scheduled"):
        return {
            "eligible": False,
            "message": "سجل الإقامة غير صالح للتحويل الخارجي. الحالة الحالية: {0}".format(ip.status)
        }

    return {
        "eligible": True,
        "inpatient_record": ip.name,
        "patient": ip.patient,
    }


# =========================================================
# تنفيذ التحويل الخارجي
# =========================================================

def _external_transfer_inpatient(
    inpatient_record_name,
    destination,
    reason,
    transfer_datetime,
    notes,
    receiving_hospital=None,
    destination_department=None,
    destination_doctor=None,
    contact_info=None,
    ambulance_info=None,
    transfer_instructions=None
):

    if not frappe.db.exists(
        "Inpatient Record",
        inpatient_record_name
    ):
        frappe.throw(
            "سجل الإقامة غير موجود."
        )

    ip = frappe.get_doc(
        "Inpatient Record",
        inpatient_record_name
    )

    if ip.status not in ("Admitted", "Discharge Scheduled"):
        frappe.throw(
            "سجل الإقامة غير صالح للتحويل الخارجي. الحالة الحالية: {0}".format(ip.status)
        )

    transfer_context = (
        "\n\n=== تحويل خارجي ===\n"
        "الوجهة: {destination}\n"
        "سبب التحويل: {reason}\n"
        "تاريخ التحويل: {datetime}\n"
    ).format(
        destination=destination or "غير محدد",
        reason=reason or "غير محدد",
        datetime=transfer_datetime or now_datetime(),
    )

    if receiving_hospital:
        transfer_context += "المستشفى المستقبلة: {hospital}\n".format(
            hospital=receiving_hospital
        )

    if destination_department:
        transfer_context += "القسم المستقبل: {dept}\n".format(
            dept=destination_department
        )

    if destination_doctor:
        transfer_context += "الطبيب المستقبل: {doctor}\n".format(
            doctor=destination_doctor
        )

    if contact_info:
        transfer_context += "معلومات الاتصال: {contact}\n".format(
            contact=contact_info
        )

    if ambulance_info:
        transfer_context += "معلومات النقل: {ambulance}\n".format(
            ambulance=ambulance_info
        )

    if transfer_instructions:
        transfer_context += "تعليمات التحويل: {instructions}\n".format(
            instructions=transfer_instructions
        )

    if notes:
        transfer_context += "\nملاحظات: {notes}".format(
            notes=notes
        )

    ip.discharge_instructions = (
        (ip.discharge_instructions or "")
        +
        transfer_context
    )

    ip.discharge_note = (
        (ip.discharge_note or "")
        +
        "\n"
        +
        (reason or "تحويل خارجي")
    )

    from healthcare.healthcare.doctype.inpatient_record.inpatient_record import (
        check_out_inpatient,
        discharge_patient,
    )

    check_out_inpatient(ip)

    try:
        discharge_patient(ip)
    except Exception as e:
        frappe.log_error(
            title="External Transfer: discharge_patient failed",
            message=f"Inpatient Record: {ip.name}\nException: {e}",
        )
        raise

    active_observation = frappe.db.get_value(
        "ER Observation Stay",
        {
            "patient": ip.patient,
            "is_active": 1
        },
        "name"
    )

    if active_observation:

        observation = frappe.get_doc(
            "ER Observation Stay",
            active_observation
        )

        if observation.observation_status not in [
            "تم الخروج",
            "تم التنويم"
        ]:

            observation.observation_status = (
                "تم الخروج"
            )

            observation.outcome_notes = (
                (observation.outcome_notes or "")
                +
                "\n"
                +
                "تم التحويل خارجياً إلى: {destination}.\nسبب التحويل: {reason}".format(
                    destination=destination or "غير محدد",
                    reason=reason or "غير محدد"
                )
            )

            observation.save(
                ignore_permissions=True
            )

        if observation.bed:

            bed_doc = frappe.get_doc(
                "ER Bed",
                observation.bed
            )

            bed_doc.current_patient = (
                None
            )

            bed_doc.current_intake = (
                None
            )

            bed_doc.current_observation = (
                None
            )

            bed_doc.bed_status = frappe.db.get_value(
                "ER Bed Status",
                {
                    "is_available": 1
                },
                "name"
            )

            bed_doc.patient_status = (
                "Discharged"
            )

            bed_doc.current_service = (
                "None"
            )

            bed_doc.released_time = (
                transfer_datetime
                or
                now_datetime()
            )

            bed_doc.save(
                ignore_permissions=True
            )

        frappe.db.set_value(
            "ER Patient Intake",
            observation.patient_intake,
            {
                "assigned_bed": "",
                "current_location": "Discharged"
            }
        )

    ip.reload()

    return {
        "success": True,
        "message": "تم تحويل المريض خارجياً بنجاح.",
        "inpatient_record": ip.name,
        "final_status": ip.status,
    }


# =========================================================
# قائمة مناطق انتظار الطوارئ المتاحة
# =========================================================

@frappe.whitelist()
def get_er_waiting_areas():

    areas = frappe.get_all(

        "ER Waiting Area",

        filters={

            "is_active":
                1

        },

        fields=[

            "name",

            "waiting_area",

            "arabic_name"

        ],

        order_by=
            "display_order asc, waiting_area asc",

        limit_page_length=
            0

    )


    result = []


    for area in areas:

        result.append({

            "value":
                area.name,

            "label":
                (
                    area.arabic_name
                    or
                    area.waiting_area
                    or
                    area.name
                )

        })


    return result


# =========================================================
# إنشاء طلب خدمة
# =========================================================

@frappe.whitelist()
def create_service_request(
    data
):

    if isinstance(
        data,
        str
    ):

        data = frappe.parse_json(
            data
        )


    if not isinstance(
        data,
        dict
    ):

        frappe.throw(
            "بيانات طلب الخدمة غير صحيحة."
        )


    patient = data.get(
        "patient"
    )


    if not patient:

        frappe.throw(
            "لا يوجد مريض مرتبط بطلب الخدمة."
        )


    request_type = data.get(
        "request_type"
    )


    if not request_type:

        frappe.throw(
            "يجب تحديد نوع الخدمة."
        )


    if request_type not in SERVICE_ROLE_MAP:

        frappe.throw(
            "نوع الخدمة غير معروف: "
            + str(request_type)
        )


    # =====================================================
    # معلومات عامة
    # =====================================================

    requested_by = (
        data.get(
            "requested_by"
        )
        or
        frappe.session.user
    )

    doctor = (
        data.get(
            "doctor"
        )
        or
        None
    )

    priority = (
        data.get(
            "priority"
        )
        or
        "Normal"
    )

    notes = (
        data.get(
            "notes"
        )
        or
        ""
    )

    intake = (
        data.get(
            "er_patient_intake"
        )
        or
        None
    )

    bed = (
        data.get(
            "bed"
        )
        or
        None
    )


    # =====================================================
    # التحقق من الخدمة المطلوبة
    # =====================================================

    service_item = (
        data.get(
            "service_item"
        )
        or
        None
    )


    if service_item and request_type != "Discharge":

        validation = (
            validate_service_item(
                request_type,
                service_item
            )
        )


        if not validation.get(
            "valid"
        ):

            frappe.throw(
                "الخدمة المطلوبة لا تناسب نوع الخدمة المختار."
            )


    # =====================================================
    # معالجة التحويل الداخلي
    #
    # نُبقي ER Patient Service Request
    # للجدول الموحد والإشعارات،
    # وننشئ معه ER Admission Request.
    # =====================================================

    admission = None
    admission_notified_users = []


    if request_type in ("Transfer", "Admission"):

        admission, admission_notified_users = (
            _create_admission_request(
                data
            )
        )

        if request_type == "Admission":

            admission_reference_text = (
                "\n\n"
                "طلب تنويم: "
                + str(
                    admission.name
                )
            )

        else:

            admission_reference_text = (
                "\n\n"
                "رقم طلب التنويم: "
                + str(
                    admission.name
                )
            )


        if notes:

            notes = (
                notes
                +
                admission_reference_text
            )

        else:

            notes = (
                admission_reference_text
            )


    discharge_result = None

    if request_type == "Discharge":

        discharge_result = (
            _discharge_bed(
                patient,
                intake,
                bed
            )
        )

        discharge_reference_text = (
            "\n\n"
            "تم إخلاء السرير."
        )

        if notes:

            notes = (
                notes
                +
                discharge_reference_text
            )

        else:

            notes = (
                discharge_reference_text
            )

        bed = None


    # =====================================================
    # إنشاء رقم طلب الخدمة
    # =====================================================

    request_name = (
        _make_service_request_name()
    )


    request = frappe.new_doc(
        "ER Patient Service Request"
    )


    request.name = request_name

    request.patient = (
        patient
    )

    request.er_patient_intake = (
        intake
    )

    request.bed = (
        bed
        or
        None
    )

    service_request_type = (
        "Transfer"
        if request_type == "Admission"
        else request_type
    )

    request.request_type = (
        service_request_type
    )

    request.requested_by = (
        requested_by
    )

    request.doctor = (
        doctor
    )

    request.status = (
        "Pending"
    )


    request.notes = (
        notes
    )

    request.service_item = (
        data.get(
            "service_item"
        )
        or
        None
    )

    request.priority = (
        priority
    )

    request.requested_datetime = (
        now_datetime()
    )


    request.insert(
    )


    # =====================================================
    # الإشعارات
    # =====================================================

    notified_users = (
        _notify_service_department(
            request
        )
    )


    # =====================================================
    # حفظ المعاملة
    # =====================================================

    frappe.db.commit()


    # =====================================================
    # النتيجة
    # =====================================================

    result = {

        "success":
            True,

        "name":
            request.name,

        "request_number":
            request.name,

        "request_type":
            request.request_type,

        "patient":
            request.patient,

        "patient_name":
            (
                frappe.db.get_value(
                    "Patient",
                    request.patient,
                    "patient_name"
                )
                if request.patient
                else None
            ),

        "priority":
            request.priority,

        "status":
            request.status,

        "notified_users":
            notified_users,

        "message":
            (
                "تم إنشاء طلب الخدمة "
                + str(
                    request.name
                )
                +
                " وإرسال إشعار للجهة المستلمة."
            )

    }


    # =====================================================
    # نتيجة طلب التنويم
    # =====================================================

    if admission:

        result["admission_request"] = {

            "name":
                admission.name,

            "status":
                admission.status,

            "workflow_state":
                admission.workflow_state,

            "requested_department":
                admission.requested_department,

            "requested_service_unit_type":
                admission.requested_service_unit_type,

            "notified_users":
                admission_notified_users

        }


        result["message"] = (

            "تم إنشاء طلب التحويل "
            + str(request.name)
            +
            " وإنشاء طلب التنويم "
            + str(admission.name)
            +
            " وإرساله لمكتب الدخول والخروج."

        )


    if discharge_result:

        result["discharge"] = {

            "success":
                discharge_result.get(
                    "success"
                ),

            "message":
                discharge_result.get(
                    "message"
                ),

            "intake":
                discharge_result.get(
                    "intake"
                ),

            "bed":
                discharge_result.get(
                    "bed"
                )

        }


    return result

# =========================================================
# جلب طلبات خدمة لمستخدم معين حسب دوره
# =========================================================

@frappe.whitelist()
def get_my_service_requests():

    roles = frappe.get_roles(
        frappe.session.user
    )

    allowed_types = []

    for service_type, service_roles in (
        SERVICE_ROLE_MAP.items()
    ):

        if any(
            role in roles
            for role in service_roles
        ):

            allowed_types.append(
                service_type
            )

    if not allowed_types:

        return []

    return frappe.get_all(

        "ER Patient Service Request",

        filters={

            "request_type":
                [
                    "in",
                    allowed_types
                ],

            "status":
                [
                    "in",
                    [
                        "Pending",
                        "Approved",
                        "In Progress"
                    ]
                ]

        },

        fields=[

            "name",

            "patient",
            "bed",

            "request_type",

            "priority",

            "status",

            "doctor",

            "requested_by",

            "requested_datetime",

            "notes",

            "assigned_to",

        ],

        order_by=
            "requested_datetime desc",

        limit_page_length=
            0,

    )


# =========================================================
# عدد الطلبات الجديدة
# =========================================================

@frappe.whitelist()
def get_my_service_request_count():

    requests = (
        get_my_service_requests()
    )

    return {

        "count":
            len(requests),

        "requests":
            requests

    }


# =========================================================
# قائمة الخدمات حسب نوع الطلب
# =========================================================

@frappe.whitelist()
def get_service_items(request_type):

    if not request_type:

        return []


    request_type = (
        request_type
        .strip()
    )


    type_map = {

        "Laboratory":
            "laboratory",

        "Radiology":
            "radiology",

        "Medication":
            "medication",

        "Consultation":
            "consultation",

        "Admission":
            "admission",

        "Transfer":
            "transfer",

        "Observation":
            "observation",

        "Discharge":
            "discharge"

    }


    category = (
        type_map.get(
            request_type,
            request_type
        )
        or ""
    ).lower()


    if category == "discharge":

        return []


    if category == "radiology":

        from custom_app.emergency_management.page.er_visit_console.python.radiology.radiology import (
            RADIOLOGY_ITEMS
        )

        items = []

        for exam_type, config in (
            RADIOLOGY_ITEMS.items()
        ):

            item_code = (
                config
                .get(
                    "item_code"
                )
            )

            if item_code:

                items.append({

                    "value":
                        item_code,

                    "label":
                        (
                            str(
                                exam_type
                            )
                            +
                            " - "
                            +
                            str(
                                item_code
                            )
                        )

                })


        return items


    if category == "laboratory":

        lab_items = frappe.db.sql(
            """
            SELECT
                lt.name,
                lt.lab_test_name,
                i.item_code,
                i.item_name
            FROM `tabLab Test Template` lt
            LEFT JOIN `tabItem` i
                ON i.item_code = lt.lab_test_code
                OR i.item_name = lt.lab_test_name
            WHERE lt.disabled = 0
            ORDER BY lt.lab_test_name ASC
            LIMIT 200
            """,
            as_dict=True
        )


        result = []

        for row in lab_items:

            code = (
                row.item_code
                or row.name
            )

            name = (
                row.lab_test_name
                or row.item_name
                or code
            )

            result.append({

                "value":
                    code,

                "label":
                    (
                        str(
                            name
                        )
                        +
                        " ("
                        +
                        str(
                            code
                        )
                        +
                        ")"
                    )

            })


        return result


    if category == "medication":

        medication_items = frappe.get_all(

            "Item",

            filters={
                "item_group": [
                    "in",
                    [
                        "Products",
                        "Drugs",
                        "Medicines",
                        "المخدرات",
                        "المستحضرات الصيدلية",
                        "الصيدلة"
                    ]
                ],
                "disabled": 0
            },

            fields=[
                "item_code",
                "item_name"
            ],

            order_by="item_name asc",

            limit_page_length=200

        )


        result = []

        for row in medication_items:

            result.append({

                "value":
                    row.item_code,

                "label":
                    (
                        str(
                            row.item_name
                        or row.item_code
                        )
                        +
                        " ("
                        +
                        str(
                            row.item_code
                        )
                        +
                        ")"
                    )

            })


        return result


    if category in (
        "admission",
        "transfer",
        "observation",
        "consultation"
    ):

        service_types = frappe.get_all(

            "Healthcare Service Unit Type",

            filters={

                "disabled": 0

            },

            fields=[

                "name",
                "service_unit_type"

            ],

            order_by="service_unit_type asc",

            limit_page_length=200

        )


        result = []

        for row in service_types:

            result.append({

                "value":
                    row.name,

                "label":
                    (
                        str(
                            row.service_unit_type
                            or row.name
                        )
                    )

            })


        return result


    return []


# =========================================================
# التحقق من خدمة مطابقة لنوع الطلب
# =========================================================

@frappe.whitelist()
def validate_service_item(
    request_type,
    service_item
):

    if not service_item:

        return {

            "valid":
                True

        }


    items = (
        get_service_items(
            request_type
        )
    )


    allowed_values = [

        row.get(
            "value"
        )

        for row in items

        if row.get(
            "value"
        )

    ]


    if not allowed_values:

        return {

            "valid":
                True

        }


    valid = (
        service_item
        in allowed_values
    )


    return {

        "valid":
            valid,

        "allowed_values":
                allowed_values

    }


# =========================================================
# إحصائيات/إشعارات الطوارئ
# =========================================================

@frappe.whitelist()
def get_er_notifications(encounter=None):

    user = frappe.session.user

    roles = frappe.get_roles(
        user
    )

    is_nurse = any(

        role in roles

        for role in [

            "Nursing User",
            "Healthcare Administrator",
            "ER Doctor",
            "System Manager"

        ]

    )


    if not is_nurse:

        return {

            "total":
                0,
            "unread":
                0,
            "vital_signs": [],
            "laboratory": [],
            "radiology": [],
            "discharge": [],
            "admission": [],
            "other": []

        }


    notifications = {

        "total":
            0,
        "unread":
            0,
        "vital_signs":
            [],
        "laboratory":
            [],
        "radiology":
            [],
        "discharge":
            [],
        "admission":
            [],
        "other":
            []

    }


    # ==========================
    # تجميع معرفات الزيارة الحالية
    # ==========================
    current_encounter = encounter
    current_patient = None
    current_intake = None

    if current_encounter:

        encounter_doc = frappe.db.get_value(
            "Patient Encounter",
            current_encounter,
            [
                "patient",
                "er_patient_intake"
            ],
            as_dict=True
        )

        if encounter_doc:

            current_patient = encounter_doc.patient
            current_intake = encounter_doc.er_patient_intake


    # =====================================================
    # العلامات الحيوية المتأخرة / المطلوبة
    # =====================================================
    # ملاحظة: تم تعطيل إشعارات العلامات الحيوية المتأخرة
    # لأن الحقل next_vital_due غير موجود في جدول ER Vital Signs
    # ولا يوجد جدول زمني سريري فعلي في الوقت الحالي.
    # =====================================================


    # =====================================================
    # المختبر - نتائج متاحة
    # =====================================================

    lab_notifications = frappe.db.sql(
        """
        SELECT
            edr.name AS request,
            edr.patient,
            edr.patient_name,
            edr.test_name,
            edr.lab_status,
            edr.creation,
            edr.patient_encounter,
            dr.name AS diagnostic_report,
            dr.status AS report_status,
            b.name AS bed,
            b.arabic_name AS bed_name
        FROM `tabER Diagnostic Request` edr
        LEFT JOIN `tabLab Test` lt
            ON lt.name = edr.lab_test
        LEFT JOIN `tabDiagnostic Report` dr
            ON dr.ref_doctype = 'Lab Test'
            AND dr.docname = edr.lab_test
            AND dr.docstatus != 2
            AND dr.name = (
                SELECT dr2.name
                FROM `tabDiagnostic Report` dr2
                WHERE dr2.ref_doctype = 'Lab Test'
                  AND dr2.docname = edr.lab_test
                  AND dr2.docstatus != 2
                ORDER BY dr2.creation DESC
                LIMIT 1
            )
        LEFT JOIN `tabER Patient Intake` intake
            ON intake.name = (
                SELECT er.er_patient_intake
                FROM `tabPatient Encounter` er
                WHERE er.name = edr.patient_encounter
                LIMIT 1
            )
        LEFT JOIN `tabER Bed` b
            ON b.current_intake = intake.name
        WHERE edr.request_type = 'Laboratory'
          AND dr.name IS NOT NULL
          AND dr.status IN ('Open', 'Approved')
          AND (
            %(encounter)s IS NULL
            OR edr.patient_encounter = %(encounter)s
          )
        ORDER BY dr.creation DESC
        LIMIT 50
        """,
        {
            "encounter": current_encounter
        },
        as_dict=True
    )


    for lab in lab_notifications:

        notifications["laboratory"].append({

            "name":
                lab.request,

            "patient":
                lab.patient,

            "patient_name":
                lab.patient_name,

            "bed":
                lab.bed,

            "bed_name":
                lab.bed_name,

            "message":
                (
                    "نتيجة مختبر متاحة للمريض "
                    +
                    str(
                        lab.patient_name
                    )
                    +
                    " - "
                    +
                    str(
                        lab.test_name
                    )
                ),

            "datetime":
                lab.creation,

            "link":
                (
                    "/app/diagnostic-report/"
                    +
                    str(
                        lab.diagnostic_report
                    )
                    if lab.diagnostic_report
                    else "#"
                )

        })


    # =====================================================
    # الأشعة - تقارير متاحة
    # =====================================================

    radiology_notifications = frappe.db.sql(
        """
        SELECT
            edr.name AS request,
            edr.patient,
            edr.patient_name,
            edr.test_name,
            edr.patient_encounter,
            re.status AS exam_status,
            re.result,
            re.report_pdf,
            re.image_attachment,
            re.examination_type,
            re.name AS radiology_examination,
            b.name AS bed,
            b.arabic_name AS bed_name
        FROM `tabER Diagnostic Request` edr
        LEFT JOIN `tabRadiology Examination` re
            ON re.name = edr.radiology_examination
        LEFT JOIN `tabER Patient Intake` intake
            ON intake.name = (
                SELECT er.er_patient_intake
                FROM `tabPatient Encounter` er
                WHERE er.name = edr.patient_encounter
                LIMIT 1
            )
        LEFT JOIN `tabER Bed` b
            ON b.current_intake = intake.name
        WHERE edr.request_type = 'Radiology'
          AND re.status IN ('Completed', 'In Progress')
          AND (
              re.result IS NOT NULL
              OR re.report_pdf IS NOT NULL
              OR re.image_attachment IS NOT NULL
          )
          AND (
            %(encounter)s IS NULL
            OR edr.patient_encounter = %(encounter)s
          )
        ORDER BY re.modified DESC
        LIMIT 50
        """,
        {
            "encounter": current_encounter
        },
        as_dict=True
    )


    for rad in radiology_notifications:

        notifications["radiology"].append({

            "name":
                rad.request,

            "patient":
                rad.patient,

            "patient_name":
                rad.patient_name,

            "bed":
                rad.bed,

            "bed_name":
                rad.bed_name,

            "message":
                (
                    "تقرير أشعة متاح للمريض "
                    +
                    str(
                        rad.patient_name
                    )
                    +
                    " - "
                    +
                    str(
                        rad.examination_type
                        or rad.test_name
                    )
                ),

            "datetime":
                frappe.utils.now_datetime(),

            "link":
                (
                    "/app/radiology-examination/"
                    +
                    str(
                        rad.radiology_examination
                    )
                    if rad.radiology_examination
                    else "#"
                )

        })


    # =====================================================
    # الخروج - مرضى جاهزون للخروج
    # =====================================================

    discharge_filters = {

        "request_type":
            "Discharge",

        "status":
            [
                "in",
                [
                    "Pending",
                    "Approved"
                ]
            ]

    }

    if current_intake:

        discharge_filters["er_patient_intake"] = current_intake

    discharge_requests = frappe.get_all(

        "ER Patient Service Request",

        filters=
            discharge_filters,

        fields=[

            "name",
            "patient",
            "er_patient_intake",
            "bed",
            "requested_datetime",
            "notes"

        ],

        order_by="requested_datetime desc",

        limit_page_length=50

    )


    for req in discharge_requests:

        patient_name = frappe.db.get_value(
            "Patient",
            req.patient,
            "patient_name"
        )


        notifications["discharge"].append({

            "name":
                req.name,

            "patient":
                req.patient,

            "patient_name":
                patient_name,

            "bed":
                req.bed,

            "message":
                (
                    "طلب خروج للمريض "
                    +
                    str(
                        patient_name
                    )
                ),

            "datetime":
                req.requested_datetime,

            "link":
                (
                    "/app/er-visit-console/"
                    +
                    str(
                        current_encounter
                    )
                    if current_encounter
                    else "#"
                )

        })


    # =====================================================
    # التنويم - طلبات تنويم جديدة
    # =====================================================

    admission_filters = {

        "admission_status":
            "Created",

        "workflow_state":
            "Pending"

    }

    if current_intake:

        admission_filters["er_patient_intake"] = current_intake

    admission_requests = frappe.get_all(

        "ER Admission Request",

        filters=
            admission_filters,

        fields=[

            "name",
            "patient",
            "er_patient_intake",
            "er_bed",
            "requested_department",
            "requested_service_unit_type",
            "creation"

        ],

        order_by="creation desc",

        limit_page_length=50

    )


    for req in admission_requests:

        patient_name = frappe.db.get_value(
            "Patient",
            req.patient,
            "patient_name"
        )


        notifications["admission"].append({

            "name":
                req.name,

            "patient":
                req.patient,

            "patient_name":
                patient_name,

            "bed":
                req.er_bed,

            "message":
                (
                    "طلب تنويم جديد للمريض "
                    +
                    str(
                        patient_name
                    )
                    +
                    " - القسم: "
                    +
                    str(
                        req.requested_department
                    )
                ),

            "datetime":
                req.creation,

            "link":
                (
                    "/app/er-admission-request/"
                    +
                    str(
                        req.name
                    )
                )

        })


    # =====================================================
    # حساب المجاميع
    # =====================================================

    notifications["total"] = (

        len(
            notifications["vital_signs"]
        )

        +
        len(
            notifications["laboratory"]
        )

        +
        len(
            notifications["radiology"]
        )

        +
        len(
            notifications["discharge"]
        )

        +
        len(
            notifications["admission"]
        )

        +
        len(
            notifications["other"]
        )

    )


    notifications["unread"] = (
        notifications["total"]
    )


    return notifications
