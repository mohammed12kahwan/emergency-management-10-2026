
import frappe
import json


# ==========================================
# جلب تفاصيل الزيارة
# ==========================================

@frappe.whitelist()
def get_encounter_details(encounter):

    doc = frappe.get_doc(
        "Patient Encounter",
        encounter
    )


    # ==========================
    # Patient Information
    # ==========================

    patient = {}

    if doc.patient:

        patient_doc = frappe.get_doc(
            "Patient",
            doc.patient
        )

        patient = {

            "name": doc.patient,

            "patient_name": patient_doc.patient_name or doc.patient,

            "gender": patient_doc.sex or "",

            "dob": patient_doc.dob or "",

            "mobile": patient_doc.mobile or ""

        }



    # ==========================
    # Practitioner
    # ==========================

    practitioner_name = ""

    if doc.practitioner:

        practitioner_name = frappe.db.get_value(

            "Healthcare Practitioner",

            doc.practitioner,

            "practitioner_name"

        ) or doc.practitioner



    # ==========================
    # Symptoms
    # ==========================

    symptoms = []

    for row in doc.symptoms:

        symptoms.append({

            "complaint": row.complaint or "",

            "duration": row.get("duration") or ""

        })



    # ==========================
    # Diagnosis
    # ==========================

    diagnosis = []

    for row in doc.diagnosis:

        diagnosis.append({

            "diagnosis": row.diagnosis or ""

        })



    # ==========================
    # Clinical Notes
    # ==========================

    clinical_notes = []

    for row in doc.er_clinical_notes:

        clinical_notes.append({

            "note": row.note or "",

            "note_time": row.note_time or ""

        })



    # ==========================
    # ER Patient Intake
    # ==========================

    er = {}


    if doc.get("er_patient_intake"):


        intake = frappe.get_doc(

            "ER Patient Intake",

            doc.er_patient_intake

        )


        er = {

            "name": intake.name,


            "visit_type":

                intake.visit_type or "",


            "department":

                intake.department or "",


            "arrival_mode":

                intake.arrival_mode or "",


            "referred_from":

                intake.referred_from or "",


            "acuity":

                intake.acuity or "",


            "chief_complaint":

                intake.chief_complaint or "",


            "priority":

                intake.priority or "",


            "current_location":

                intake.current_location or "",


            "waiting_area":

                intake.waiting_area or "",


            "assigned_bed":

                intake.assigned_bed or "",


            "doctor_notes":

                intake.doctor_notes or ""

        }



    # ==========================
    # Vital Signs
    # ==========================

    vitals = []


    vital_records = frappe.get_all(

        "Vital Signs",

        filters={

            "patient": doc.patient,

            "encounter": doc.name

        },

        fields=[

            "name",

            "temperature",

            "pulse",

            "respiratory_rate",

            "spo2",

            "pain_score",

            "esi_level",

            "bp_systolic",

            "bp_diastolic",

            "vital_signs_note",

            "signs_date",

            "signs_time"

        ],

        order_by="creation desc"

    )


    vitals = vital_records



    # ==========================
    # Return
    # ==========================

    return {


        "name": doc.name,


        "patient": patient,


        "practitioner": doc.practitioner or "",


        "practitioner_name":

            practitioner_name,


        "encounter_date":

            doc.encounter_date,


        "encounter_time":

            doc.encounter_time,


        "status":

            doc.status,


        "er":

            er,


        "symptoms":

            symptoms,


        "diagnosis":

            diagnosis,


        "clinical_notes":

            clinical_notes,


        "vitals":

            vitals

    }




# ==========================================
# قائمة زيارات الطوارئ
# ==========================================

@frappe.whitelist()
def get_active_encounters():

    encounters = frappe.get_all(
        "Patient Encounter",
        filters={
            "er_patient_intake": ["is", "set"],
            "status": ["not in", ["Completed", "Cancelled"]],
        },
        fields=[
            "name",
            "patient",
            "patient_name",
            "practitioner",
            "practitioner_name",
            "encounter_date",
            "status",
            "er_patient_intake",
        ],
        order_by="creation desc",
        limit_page_length=500,
    )

    for row in encounters:
        row["is_doctor_pending"] = 0

    pending = frappe.get_all(
        "ER Patient Intake",
        filters={
            "status": "بانتظار الطبيب",
            "patient_encounter": ["is", "not set"],
            "patient": ["is", "set"],
        },
        fields=[
            "name",
            "patient",
            "اسم_المريض",
            "healthcare_practitioner",
            "assigned_doctor",
            "department",
            "status",
            "arrival_time",
            "priority",
        ],
        order_by="creation asc",
        limit_page_length=500,
    )

    # لا تعرض Intake كـ"بانتظار الطبيب" إذا كان له
    # Patient Encounter موجود بالفعل حتى لو كان الرابط
    # داخل Intake فارغًا.
    pending_names = [
        row.get("name")
        for row in pending
        if row.get("name")
    ]

    existing_intakes = set()

    if pending_names:

        existing_rows = frappe.get_all(
            "Patient Encounter",
            filters={
                "er_patient_intake": [
                    "in",
                    pending_names
                ]
            },
            fields=["er_patient_intake"],
            limit_page_length=500,
        )

        existing_intakes = {
            row.get("er_patient_intake")
            for row in existing_rows
            if row.get("er_patient_intake")
        }

    pending = [
        row
        for row in pending
        if row.get("name") not in existing_intakes
    ]

    pending_rows = []

    for row in pending:

        doctor = (
            row.get("healthcare_practitioner")
            or row.get("assigned_doctor")
            or ""
        )

        pending_rows.append({
            "name": "",
            "patient": row.get("patient") or "",
            "patient_name": (
                row.get("اسم_المريض")
                or row.get("patient")
                or ""
            ),
            "practitioner": doctor,
            "practitioner_name": doctor,
            "encounter_date": row.get("arrival_time") or "",
            "status": row.get("status") or "بانتظار الطبيب",
            "er_patient_intake": row.get("name") or "",
            "is_doctor_pending": 1,
            "priority": row.get("priority") or "",
        })

    return pending_rows + encounters


@frappe.whitelist()
def save_er_intake_details(encounter, waiting_area=None, current_location=None):

    if not encounter:
        frappe.throw("رقم الزيارة غير موجود")

    enc = frappe.get_doc("Patient Encounter", encounter)

    if not enc.er_patient_intake:
        frappe.throw("لا توجد زيارة طوارئ مرتبطة بهذه الزيارة الطبية")

    intake_name = enc.er_patient_intake

    if waiting_area:
        frappe.db.set_value("ER Patient Intake", intake_name, "waiting_area", waiting_area)

    if current_location:
        frappe.db.set_value("ER Patient Intake", intake_name, "current_location", current_location)

    return {
        "status": "success",
        "message": "تم حفظ بيانات الزيارة",
        "intake": intake_name,
    }


# ==========================================
# TRIAGE SECTION
# ==========================================

@frappe.whitelist()
def get_triage_history(encounter):
    if not encounter:
        frappe.throw("رقم الزيارة غير موجود")

    vitals = frappe.get_all(
        "Vital Signs",
        filters={"encounter": encounter},
        fields=[
            "name", "signs_date", "signs_time",
            "temperature", "pulse", "bp_systolic", "bp_diastolic",
            "respiratory_rate", "spo2", "pain_score", "esi_level",
            "vital_signs_note"
        ],
        order_by="signs_date desc, signs_time desc"
    )

    return {"vitals": vitals}


# ==========================================
# TRANSFERS SECTION
# ==========================================
@frappe.whitelist()
def transfer_patient(encounter, transfer_type, target_department=None, target_bed=None, notes=None):
    if not encounter:
        frappe.throw("رقم الزيارة غير موجود")

    enc = frappe.get_doc("Patient Encounter", encounter)

    if not enc.er_patient_intake:
        frappe.throw("لا توجد زيارة طوارئ مرتبطة")

    intake = frappe.get_doc("ER Patient Intake", enc.er_patient_intake)

    if not frappe.has_permission("ER Transfer Log", "create"):
        frappe.throw("ليس لديك صلاحية لإنشاء سجل التحويل.")
    if not frappe.has_permission("ER Patient Intake", "write"):
        frappe.throw("ليس لديك صلاحية لتعديل زيارة الطوارئ.")
    if intake.assigned_bed and not frappe.has_permission("ER Bed", "write"):
        frappe.throw("ليس لديك صلاحية لتعديل بيانات السرير.")

    transfer_log = frappe.get_doc({
        "doctype": "ER Transfer Log",
        "encounter": encounter,
        "patient": enc.patient,
        "transfer_type": transfer_type,
        "from_department": intake.department,
        "to_department": target_department,
        "from_bed": intake.assigned_bed,
        "to_bed": target_bed,
        "transfer_time": frappe.utils.now(),
        "transferred_by": frappe.session.user,
        "notes": notes or ""
    })
    transfer_log.insert()

    department_changed = target_department and target_department != intake.department
    bed_changed = target_bed and target_bed != intake.assigned_bed

    if department_changed:
        intake.department = target_department
    if bed_changed:
        intake.assigned_bed = target_bed

    if department_changed or bed_changed:
        intake.save()

    if intake.assigned_bed:

        source_bed = frappe.get_doc(
            "ER Bed",
            intake.assigned_bed
        )

        if source_bed.current_observation:

            observation = frappe.get_doc(
                "ER Observation Stay",
                source_bed.current_observation
            )

            if observation.observation_status not in [
                "تم التنويم",
                "تم الخروج"
            ]:

                observation.observation_status = (
                    "تم التنويم"
                )

                observation.outcome_notes = (
                    (observation.outcome_notes or "")
                    +
                    "\n"
                    +
                    "تم التحويل إلى القسم {department}.".format(
                        department=target_department or "غير محدد"
                    )
                )

                observation.save(
                )

        source_bed.current_patient = (
            None
        )

        source_bed.current_intake = (
            None
        )

        source_bed.current_observation = (
            None
        )

        source_bed.bed_status = frappe.db.get_value(
            "ER Bed Status",
            {
                "is_available": 1
            },
            "name"
        )

        source_bed.patient_status = (
            "Ready for Transfer"
        )

        source_bed.current_service = (
            "None"
        )

        source_bed.released_time = (
            frappe.utils.now()
        )

        source_bed.save(
        )

        intake.assigned_bed = (
            ""
        )

        intake.save(
        )

    enc.add_comment(
        "Comment",
        f"Transfer ({transfer_type}): Department={target_department or 'N/A'}, Bed={target_bed or 'N/A'}"
    )

    return {
        "status": "success",
        "message": "تم نقل المريض",
        "transfer": transfer_log.name
    }


# ==========================================
# ADMISSION SECTION
# ==========================================

@frappe.whitelist()
def admit_patient(encounter, admission_type, target_ward=None, target_bed=None, admission_notes=None):
    if not encounter:
        frappe.throw("رقم الزيارة غير موجود")

    enc = frappe.get_doc("Patient Encounter", encounter)

    if not enc.er_patient_intake:
        frappe.throw("لا توجد زيارة طوارئ مرتبطة")

    intake = frappe.get_doc("ER Patient Intake", enc.er_patient_intake)

    if not frappe.has_permission("ER Admission Log", "create"):
        frappe.throw("ليس لديك صلاحية لإنشاء سجل القبول.")
    if not frappe.has_permission("ER Patient Intake", "write"):
        frappe.throw("ليس لديك صلاحية لتعديل زيارة الطوارئ.")

    admission_log = frappe.get_doc({
        "doctype": "ER Admission Log",
        "encounter": encounter,
        "patient": enc.patient,
        "admission_type": admission_type,
        "from_department": intake.department,
        "to_ward": target_ward,
        "to_bed": target_bed,
        "admission_time": frappe.utils.now(),
        "admitted_by": frappe.session.user,
        "notes": admission_notes or ""
    })
    admission_log.insert()

    intake.current_location = "Admitted"
    intake.assigned_bed = target_bed
    intake.save()

    enc.add_comment(
        "Comment",
        f"Admission ({admission_type}): Ward={target_ward or 'N/A'}, Bed={target_bed or 'N/A'}"
    )

    return {
        "status": "success",
        "message": "تم قبول المريض",
        "admission": admission_log.name
    }


# ==========================================
# DISCHARGE SECTION
# ==========================================

@frappe.whitelist()
def discharge_patient(encounter, discharge_type, discharge_instructions=None, follow_up=None):
    if not encounter:
        frappe.throw("رقم الزيارة غير موجود")

    enc = frappe.get_doc("Patient Encounter", encounter)

    if not enc.er_patient_intake:
        frappe.throw("لا توجد زيارة طوارئ مرتبطة")

    intake = frappe.get_doc("ER Patient Intake", enc.er_patient_intake)

    if intake.status == "خروج":
        return {
            "status": "success",
            "message": "المريض مخرج بالفعل.",
            "discharge": None
        }

    if not frappe.has_permission("ER Discharge Log", "create"):
        frappe.throw("ليس لديك صلاحية لإنشاء سجل الإخلاء.")
    if not frappe.has_permission("ER Patient Intake", "write"):
        frappe.throw("ليس لديك صلاحية لتعديل زيارة الطوارئ.")
    if intake.assigned_bed and not frappe.has_permission("ER Bed", "write"):
        frappe.throw("ليس لديك صلاحية لتعديل بيانات السرير.")
    if not frappe.has_permission("Patient Encounter", "write"):
        frappe.throw("ليس لديك صلاحية لتعديل بيانات الزيارة.")

    discharge_log = frappe.get_doc({
        "doctype": "ER Discharge Log",
        "encounter": encounter,
        "patient": enc.patient,
        "discharge_type": discharge_type,
        "discharge_time": frappe.utils.now(),
        "discharged_by": frappe.session.user,
        "department": intake.department,
        "bed": intake.assigned_bed,
        "instructions": discharge_instructions or "",
        "follow_up": follow_up or ""
    })
    discharge_log.insert()

    if intake.assigned_bed:

        bed_doc = frappe.get_doc(
            "ER Bed",
            intake.assigned_bed
        )

        if bed_doc.current_observation:

            observation = frappe.get_doc(
                "ER Observation Stay",
                bed_doc.current_observation
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
                    "تم الإخلاء من الطوارئ."
                )

                observation.is_active = 0

                observation.save(
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
            frappe.utils.now()
        )

        bed_doc.save(
        )

    intake.current_location = "Discharged"
    intake.assigned_bed = ""

    frappe.db.set_value(
        "ER Patient Intake",
        intake.name,
        "status",
        "خروج"
    )

    enc.status = "Completed"

    enc.save()


    enc.add_comment(

        "Comment",

        f"Discharge ({discharge_type}): Bed={intake.assigned_bed or 'N/A'}"

    )


    return {
        "status": "success",
        "message": "تم تصريح المريض",
        "discharge": discharge_log.name
    }


# ==========================================
# ACTIVITY / TIMELINE SECTION
# ==========================================

@frappe.whitelist()
def get_activity_timeline(encounter, category=""):
    if not encounter:
        frappe.throw("رقم الزيارة غير موجود")

    activities = []

    # ---------------------------------------------------------
    # الزيارة / المريض الحالي
    # ---------------------------------------------------------
    encounter_doc = frappe.get_doc(
        "Patient Encounter",
        encounter
    )

    patient = (
        getattr(encounter_doc, "patient", None)
        or ""
    )

    patient_name = (
        getattr(encounter_doc, "patient_name", None)
        or ""
    )

    if patient and not patient_name:
        patient_name = (
            frappe.db.get_value(
                "Patient",
                patient,
                "patient_name"
            )
            or patient
        )

    intake = (
        getattr(encounter_doc, "er_patient_intake", None)
        or ""
    )

    # ---------------------------------------------------------
    # التعليقات الحالية
    # ---------------------------------------------------------
    comment_filters = {
        "reference_doctype": "Patient Encounter",
        "reference_name": encounter
    }

    comments = frappe.get_all(
        "Comment",
        filters=comment_filters,
        fields=[
            "name",
            "creation",
            "comment_by",
            "content"
        ],
        order_by="creation desc"
    )

    for c in comments:
        if category:
            content_lower = (
                c.content or ""
            ).lower()

            if category == "details" and not any(
                kw in content_lower
                for kw in [
                    "visit",
                    "intake",
                    "بيانات زيارة",
                    "تفاصيل الزيارة"
                ]
            ):
                continue

            elif category == "clinical" and not any(
                kw in content_lower
                for kw in [
                    "clinical",
                    "symptom",
                    "diagnosis",
                    "فحص سريري",
                    "أعراض",
                    "تشخيص"
                ]
            ):
                continue

            elif category == "labs" and not any(
                kw in content_lower
                for kw in [
                    "lab",
                    "مختبر",
                    "فحوصات"
                ]
            ):
                continue

            elif category == "medications" and not any(
                kw in content_lower
                for kw in [
                    "medication",
                    "drug",
                    "أدوية",
                    "دواء"
                ]
            ):
                continue

            elif category == "services" and not any(
                kw in content_lower
                for kw in [
                    "service",
                    "admission",
                    "transfer",
                    "discharge",
                    "خدمة",
                    "تنويم",
                    "تحويل",
                    "خروج",
                    "طلبات الخدمة"
                ]
            ):
                continue

            elif category == "radiology" and not any(
                kw in content_lower
                for kw in [
                    "radiology",
                    "x-ray",
                    "أشعة"
                ]
            ):
                continue

            elif category == "procedures" and not any(
                kw in content_lower
                for kw in [
                    "procedure",
                    "إجراء",
                    "إجراءات"
                ]
            ):
                continue

        activities.append({
            "type": "comment",
            "time": str(c.creation),
            "user": c.comment_by,
            "content": c.content,
            "icon": "fa-comment",
            "title": "تعليق"
        })

    # ---------------------------------------------------------
    # العلامات الحيوية
    # ---------------------------------------------------------
    if not category or category in (
        "clinical",
        "details",
        "triage"
    ):
        vitals = frappe.get_all(
            "Vital Signs",
            filters={
                "encounter": encounter
            },
            fields=[
                "name",
                "signs_date",
                "signs_time",
                "esi_level",
                "pain_score"
            ],
            order_by="signs_date desc, signs_time desc"
        )

        for v in vitals:
            activities.append({
                "type": "vitals",
                "time": f"{v.signs_date} {v.signs_time}",
                "user": "",
                "content": (
                    f"Vitals recorded - ESI: "
                    f"{v.esi_level or 'N/A'}, "
                    f"Pain: {v.pain_score or 'N/A'}"
                ),
                "icon": "fa-heartbeat",
                "title": "العلامات الحيوية"
            })

    # =========================================================
    # الإشعارات الحقيقية للطلبات المنجزة
    # تظهر في لوحة الإشعارات العامة فقط
    # =========================================================
    if not category:

        # -----------------------------------------------------
        # 1) الأدوية
        # -----------------------------------------------------
        if frappe.db.exists(
            "DocType",
            "Medication Request"
        ):
            meta = frappe.get_meta(
                "Medication Request"
            )

            fieldnames = {
                f.fieldname
                for f in meta.fields
            }

            if "order_group" in fieldnames:

                wanted = [
                    "name",
                    "medication",
                    "medication_name",
                    "patient",
                    "patient_name",
                    "er_administration_status",
                    "er_administered_on",
                    "modified",
                    "order_description",
                    "title"
                ]

                fields = [
                    f for f in wanted
                    if f in fieldnames
                ]

                rows = frappe.get_all(
                    "Medication Request",
                    filters={
                        "order_group": encounter,
                        "er_administration_status": "Completed"
                    } if "er_administration_status" in fieldnames
                    else {
                        "order_group": encounter
                    },
                    fields=fields,
                    order_by="modified desc",
                    limit_page_length=50
                )

                for row in rows:

                    if (
                        "er_administration_status"
                        not in fieldnames
                        or row.get(
                            "er_administration_status"
                        ) != "Completed"
                    ):
                        continue

                    medication_name = (
                        row.get("medication_name")
                        or row.get("medication")
                        or row.get("title")
                        or "دواء"
                    )

                    operation_time = (
                        row.get("er_administered_on")
                        or row.get("modified")
                    )

                    activities.append({
                        "type": "completed_request",
                        "time": str(operation_time),
                        "user": (
                            row.get("er_administered_by")
                            or ""
                        ),
                        "content": (
                            f"{patient_name} — "
                            f"تم إعطاء الدواء: "
                            f"{medication_name}"
                        ),
                        "icon": "fa-medkit",
                        "title": patient_name
                    })

        # -----------------------------------------------------
        # 2) المختبر / الأشعة / الإجراءات
        # -----------------------------------------------------
        if frappe.db.exists(
            "DocType",
            "ER Diagnostic Request"
        ):
            meta = frappe.get_meta(
                "ER Diagnostic Request"
            )

            fieldnames = {
                f.fieldname
                for f in meta.fields
            }

            if "patient_encounter" in fieldnames:

                wanted = [
                    "name",
                    "patient",
                    "patient_name",
                    "patient_encounter",
                    "request_type",
                    "test_name",
                    "lab_status",
                    "radiology_status",
                    "status",
                    "modified",
                    "creation"
                ]

                fields = [
                    f for f in wanted
                    if f in fieldnames
                ]

                rows = frappe.get_all(
                    "ER Diagnostic Request",
                    filters={
                        "patient_encounter": encounter
                    },
                    fields=fields,
                    order_by="modified desc",
                    limit_page_length=100
                )

                for row in rows:

                    request_type = (
                        row.get("request_type")
                        or ""
                    ).strip()

                    completed = False

                    for status_field in (
                        "lab_status",
                        "radiology_status",
                        "status"
                    ):
                        if (
                            status_field in fieldnames
                            and str(
                                row.get(status_field) or ""
                            ).strip().lower()
                            == "completed"
                        ):
                            completed = True
                            break

                    if not completed:
                        continue

                    if request_type == "Laboratory":
                        operation = "تم إنجاز طلب المختبر"
                        icon = "fa-flask"

                    elif request_type == "Radiology":
                        operation = "تم إنجاز طلب الأشعة"
                        icon = "fa-image"

                    elif request_type == "Procedure":
                        operation = "تم إنجاز الإجراء"
                        icon = "fa-stethoscope"

                    else:
                        operation = "تم إنجاز الطلب"
                        icon = "fa-check-circle"

                    item_name = (
                        row.get("test_name")
                        or request_type
                        or "الطلب"
                    )

                    activities.append({
                        "type": "completed_request",
                        "time": str(
                            row.get("modified")
                            or row.get("creation")
                        ),
                        "user": "",
                        "content": (
                            f"{patient_name} — "
                            f"{operation}: "
                            f"{item_name}"
                        ),
                        "icon": icon,
                        "title": patient_name
                    })

        # -----------------------------------------------------
        # 3) خدمات الطوارئ
        # -----------------------------------------------------
        if frappe.db.exists(
            "DocType",
            "ER Patient Service Request"
        ) and intake:

            meta = frappe.get_meta(
                "ER Patient Service Request"
            )

            fieldnames = {
                f.fieldname
                for f in meta.fields
            }

            if {
                "er_patient_intake",
                "status"
            }.issubset(fieldnames):

                wanted = [
                    "name",
                    "patient",
                    "request_type",
                    "status",
                    "completed_datetime",
                    "modified",
                    "creation"
                ]

                fields = [
                    f for f in wanted
                    if f in fieldnames
                ]

                rows = frappe.get_all(
                    "ER Patient Service Request",
                    filters={
                        "er_patient_intake": intake,
                        "status": "Completed"
                    },
                    fields=fields,
                    order_by="modified desc",
                    limit_page_length=50
                )

                for row in rows:

                    request_type = (
                        row.get("request_type")
                        or "خدمة"
                    )

                    operation_time = (
                        row.get("completed_datetime")
                        or row.get("modified")
                        or row.get("creation")
                    )

                    activities.append({
                        "type": "completed_request",
                        "time": str(operation_time),
                        "user": "",
                        "content": (
                            f"{patient_name} — "
                            f"تم تنفيذ طلب الخدمة: "
                            f"{request_type}"
                        ),
                        "icon": "fa-list-alt",
                        "title": patient_name
                    })

        # -----------------------------------------------------
        # 4) طلب التنويم عند اعتماد التنويم
        # -----------------------------------------------------
        if frappe.db.exists(
            "DocType",
            "ER Admission Request"
        ) and intake:

            meta = frappe.get_meta(
                "ER Admission Request"
            )

            fieldnames = {
                f.fieldname
                for f in meta.fields
            }

            if {
                "er_patient_intake",
                "status"
            }.issubset(fieldnames):

                rows = frappe.get_all(
                    "ER Admission Request",
                    filters={
                        "er_patient_intake": intake,
                        "status": "Admitted"
                    },
                    fields=[
                        f
                        for f in [
                            "name",
                            "status",
                            "modified",
                            "creation"
                        ]
                        if f in fieldnames
                    ],
                    order_by="modified desc",
                    limit_page_length=20
                )

                for row in rows:

                    activities.append({
                        "type": "completed_request",
                        "time": str(
                            row.get("modified")
                            or row.get("creation")
                        ),
                        "user": "",
                        "content": (
                            f"{patient_name} — "
                            "تم اعتماد التنويم"
                        ),
                        "icon": "fa-bed",
                        "title": patient_name
                    })

    # ---------------------------------------------------------
    # الترتيب النهائي
    # ---------------------------------------------------------
    activities.sort(
        key=lambda x: x.get("time", ""),
        reverse=True
    )

    return {
        "activities": activities
    }


@frappe.whitelist()
def add_er_activity(encounter, category, message):
    if not encounter:
        return

    if not frappe.has_permission("Patient Encounter", "write"):
        return

    doc = frappe.get_doc("Patient Encounter", encounter)
    doc.add_comment(
        "Comment",
        message
    )
    doc.save()


# ==========================================
# LABORATORY SEARCH
# ==========================================

@frappe.whitelist()
def search_lab_tests(search_term):
    if not search_term or len(search_term) < 2:
        return []

    tests = frappe.get_all(
        "Lab Test Template",
        filters={
            "template_name": ["like", f"%{search_term}%"],
            "disabled": 0
        },
        fields=["name", "template_name", "department"],
        limit=20
    )

    return tests


# ==========================================
# GET DEPARTMENTS & PHYSICIANS
# ==========================================

@frappe.whitelist()
def get_departments():
    return frappe.get_all(
        "Department",
        filters={"is_group": 0, "disabled": 0},
        fields=["name"],
        order_by="name"
    )


@frappe.whitelist()
def get_physicians(department=None):
    filters = {}
    if department:
        filters["department"] = department

    return frappe.get_all(
        "Healthcare Practitioner",
        filters=filters,
        fields=["name", "practitioner_name", "department"],
        order_by="practitioner_name"
    )



# =========================================================
# رسائل الأقسام — الطوارئ ↔ المختبر ↔ الأشعة ↔ الصيدلية ↔ العمليات
# =========================================================

ER_DEPARTMENT_LABELS = {
    "emergency": "الطوارئ",
    "laboratory": "المختبر",
    "radiology": "الأشعة",
    "pharmacy": "الصيدلية",
    "procedures": "العمليات",
}


ER_DEPARTMENT_ROLE_MAP = {
    "emergency": [
        "ER Doctor",
        "Nursing User",
        "Healthcare Administrator",
        "System Manager",
    ],
    "laboratory": [
        "Laboratory User",
        "Healthcare Administrator",
        "System Manager",
    ],
    "radiology": [
        "Healthcare Administrator",
        "System Manager",
    ],
    "pharmacy": [
        "Stock User",
        "Healthcare Administrator",
        "System Manager",
    ],
    "procedures": [
        "Healthcare Practitioner",
        "ER Doctor",
        "Healthcare Administrator",
        "System Manager",
    ],
}


def _er_department_user_can_access(department):
    roles = set(
        frappe.get_roles(
            frappe.session.user
        ) or []
    )

    allowed_roles = set(
        ER_DEPARTMENT_ROLE_MAP.get(
            department,
            []
        )
    )

    return bool(
        roles.intersection(
            allowed_roles
        )
    )


def _er_department_users(department):
    roles = ER_DEPARTMENT_ROLE_MAP.get(
        department,
        []
    )

    if not roles:
        return []

    users = set()

    rows = frappe.get_all(
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
        limit_page_length=5000,
    )

    for row in rows:

        user = (
            row.parent
            or ""
        )

        if not user:
            continue

        enabled = frappe.db.get_value(
            "User",
            user,
            "enabled",
        )

        if enabled:
            users.add(user)

    return sorted(users)


def _er_make_department_message_content(
    source_department,
    target_department,
    message,
):
    return (
        "[ER-DEPARTMENT-MESSAGE]\n"
        "المرسل: "
        + ER_DEPARTMENT_LABELS.get(
            source_department,
            source_department,
        )
        + "\n"
        "المستلم: "
        + ER_DEPARTMENT_LABELS.get(
            target_department,
            target_department,
        )
        + "\n"
        "الرسالة:\n"
        + message
    )


@frappe.whitelist()
def get_er_department_context(encounter=None):

    departments = []

    for department in ER_DEPARTMENT_LABELS:

        if _er_department_user_can_access(
            department
        ):
            departments.append({
                "value": department,
                "label": ER_DEPARTMENT_LABELS[
                    department
                ],
            })

    return {
        "departments": departments,
        "labels": ER_DEPARTMENT_LABELS,
        "current_user": frappe.session.user,
        "encounter": encounter or "",
    }


@frappe.whitelist()
def send_er_department_message(
    encounter,
    source_department,
    target_department,
    message,
):

    if not encounter:
        frappe.throw(
            "رقم الزيارة غير موجود."
        )

    if not source_department:
        frappe.throw(
            "لم يتم تحديد القسم المرسل."
        )

    if not target_department:
        frappe.throw(
            "لم يتم تحديد القسم المستلم."
        )

    if source_department not in ER_DEPARTMENT_LABELS:
        frappe.throw(
            "القسم المرسل غير معروف."
        )

    if target_department not in ER_DEPARTMENT_LABELS:
        frappe.throw(
            "القسم المستلم غير معروف."
        )

    if source_department == target_department:
        frappe.throw(
            "لا يمكن إرسال رسالة إلى نفس القسم."
        )

    message = (
        message
        if isinstance(message, str)
        else str(message or "")
    ).strip()

    if not message:
        frappe.throw(
            "اكتب نص الرسالة أولًا."
        )

    if not frappe.db.exists(
        "Patient Encounter",
        encounter,
    ):
        frappe.throw(
            "الزيارة الطبية غير موجودة."
        )

    if not _er_department_user_can_access(
        source_department
    ):
        frappe.throw(
            "ليس لديك صلاحية الإرسال باسم القسم المحدد."
        )

    encounter_doc = frappe.get_doc(
        "Patient Encounter",
        encounter,
    )

    patient_name = (
        getattr(
            encounter_doc,
            "patient_name",
            None,
        )
        or frappe.db.get_value(
            "Patient",
            getattr(
                encounter_doc,
                "patient",
                None,
            ),
            "patient_name",
        )
        or getattr(
            encounter_doc,
            "patient",
            None,
        )
        or ""
    )

    content = _er_make_department_message_content(
        source_department,
        target_department,
        message,
    )

    comment = frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Comment",
        "reference_doctype": "Patient Encounter",
        "reference_name": encounter,
        "content": content,
    })

    comment.insert(
        ignore_permissions=True
    )

    recipients = _er_department_users(
        target_department
    )

    subject = (
        "رسالة قسم "
        "[ERMSG:"
        + str(comment.name)
        + "] "
        + ER_DEPARTMENT_LABELS[
            source_department
        ]
        + " → "
        + ER_DEPARTMENT_LABELS[
            target_department
        ]
    )

    description = (
        "رسالة تشغيلية جديدة\n\n"
        "المريض: "
        + str(patient_name or "")
        + "\n"
        "الزيارة: "
        + str(encounter)
        + "\n"
        "من: "
        + ER_DEPARTMENT_LABELS[
            source_department
        ]
        + "\n"
        "إلى: "
        + ER_DEPARTMENT_LABELS[
            target_department
        ]
        + "\n\n"
        + message
    )

    notification_names = []

    for user in recipients:

        notification = frappe.new_doc(
            "Notification Log"
        )

        notification.for_user = user

        notification.from_user = (
            frappe.session.user
        )

        notification.type = "Alert"

        notification.document_type = (
            "Patient Encounter"
        )

        notification.document_name = (
            encounter
        )

        notification.subject = subject

        notification.title = (
            "💬 "
            + ER_DEPARTMENT_LABELS[
                source_department
            ]
            + " → "
            + ER_DEPARTMENT_LABELS[
                target_department
            ]
        )

        notification.description = (
            description
        )

        notification.email_content = (
            description
        )

        notification.link = (
            "/app/er-visit-console/"
            + str(encounter)
        )

        notification.read = 0

        notification.insert(
            ignore_permissions=True
        )

        notification_names.append(
            notification.name
        )

    return {
        "success": True,
        "comment": comment.name,
        "recipients": recipients,
        "notifications": notification_names,
        "message": "تم إرسال الرسالة إلى "
            + ER_DEPARTMENT_LABELS[
                target_department
            ],
    }



@frappe.whitelist()
def get_er_department_message_inbox(
    department,
):

    if not department:
        frappe.throw(
            "القسم غير محدد."
        )

    if department not in ER_DEPARTMENT_LABELS:
        frappe.throw(
            "القسم غير معروف."
        )

    if not _er_department_user_can_access(
        department
    ):
        frappe.throw(
            "ليس لديك صلاحية الوصول إلى مراسلات هذا القسم."
        )

    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype":
                "Patient Encounter",
        },
        fields=[
            "name",
            "creation",
            "comment_by",
            "content",
            "reference_name",
        ],
        order_by="creation desc",
        limit_page_length=300,
    )

    notifications = frappe.get_all(
        "Notification Log",
        filters={
            "for_user":
                frappe.session.user,
            "document_type":
                "Patient Encounter",
        },
        fields=[
            "name",
            "subject",
            "document_name",
            "`read`",
        ],
        order_by="creation desc",
        limit_page_length=1000,
    )

    notification_map = {}

    for row in notifications:

        subject = (
            row.subject
            or ""
        )

        marker = "[ERMSG:"
        start = subject.find(
            marker
        )

        if start < 0:
            continue

        end = subject.find(
            "]",
            start
        )

        if end < 0:
            continue

        comment_name = subject[
            start + len(marker):
            end
        ].strip()

        if comment_name:

            notification_map[
                comment_name
            ] = {
                "name":
                    row.name,
                "read":
                    bool(row.get("read")),
            }

    result = []
    unread_count = 0

    for comment in comments:

        content = (
            comment.content
            or ""
        )

        if not content.startswith(
            "[ER-DEPARTMENT-MESSAGE]"
        ):
            continue

        source = ""
        target = ""
        message = content

        lines = content.splitlines()

        for index, line in enumerate(lines):

            if line.startswith(
                "المرسل:"
            ):

                source = line.split(
                    ":",
                    1
                )[1].strip()

            elif line.startswith(
                "المستلم:"
            ):

                target = line.split(
                    ":",
                    1
                )[1].strip()

            elif line == "الرسالة:":

                message = "\n".join(
                    lines[
                        index + 1:
                    ]
                ).strip()

        source_department = ""
        target_department = ""

        for department_key, label in (
            ER_DEPARTMENT_LABELS.items()
        ):

            if label == source:
                source_department = department_key

            if label == target:
                target_department = department_key

        if (
            source_department != department
            and
            target_department != department
        ):
            continue

        notification_row = (
            notification_map.get(
                comment.name
            )
            if target_department == department
            else None
        )

        unread = bool(
            notification_row
            and
            not notification_row["read"]
        )

        if unread:
            unread_count += 1

        result.append({
            "name":
                comment.name,
            "encounter":
                comment.reference_name,
            "creation":
                comment.creation,
            "user":
                comment.comment_by,
            "from":
                source,
            "to":
                target,
            "source_department":
                source_department,
            "target_department":
                target_department,
            "message":
                message,
            "notification":
                (
                    notification_row["name"]
                    if notification_row
                    else None
                ),
            "unread":
                unread,
        })

    return {
        "department":
            department,
        "department_label":
            ER_DEPARTMENT_LABELS[
                department
            ],
        "unread_count":
            unread_count,
        "messages":
            result,
    }


@frappe.whitelist()
def get_er_department_message_encounter(
    reference_doctype,
    reference_name,
):

    if not reference_doctype:
        frappe.throw(
            "نوع السجل غير محدد."
        )

    if not reference_name:
        frappe.throw(
            "رقم السجل غير محدد."
        )

    allowed = {
        "Patient Encounter",
        "ER Diagnostic Request",
        "Radiology Examination",
        "Medication Request",
    }

    if reference_doctype not in allowed:
        frappe.throw(
            "هذا السجل لا يدعم مراسلات الأقسام."
        )

    if not frappe.db.exists(
        reference_doctype,
        reference_name,
    ):
        frappe.throw(
            "السجل غير موجود."
        )

    encounter = None

    if (
        reference_doctype ==
        "Patient Encounter"
    ):

        encounter = reference_name

    elif (
        reference_doctype ==
        "ER Diagnostic Request"
    ):

        encounter = frappe.db.get_value(
            "ER Diagnostic Request",
            reference_name,
            "patient_encounter",
        )

    elif (
        reference_doctype ==
        "Radiology Examination"
    ):

        diagnostic_request = frappe.db.get_value(
            "Radiology Examination",
            reference_name,
            "er_diagnostic_request",
        )

        if diagnostic_request:

            encounter = frappe.db.get_value(
                "ER Diagnostic Request",
                diagnostic_request,
                "patient_encounter",
            )

    elif (
        reference_doctype ==
        "Medication Request"
    ):

        encounter = frappe.db.get_value(
            "Medication Request",
            reference_name,
            "order_group",
        )

    if not encounter:
        return {
            "success":
                False,
            "encounter":
                None,
            "message":
                "لم يتم العثور على زيارة طبية مرتبطة بهذا السجل.",
        }

    if not frappe.db.exists(
        "Patient Encounter",
        encounter,
    ):
        return {
            "success":
                False,
            "encounter":
                None,
            "message":
                "الزيارة الطبية المرتبطة غير موجودة.",
        }

    return {
        "success":
            True,
        "encounter":
            encounter,
    }


@frappe.whitelist()
def get_er_department_messages(
    encounter,
):

    if not encounter:
        frappe.throw(
            "رقم الزيارة غير موجود."
        )

    if not frappe.db.exists(
        "Patient Encounter",
        encounter,
    ):
        frappe.throw(
            "الزيارة الطبية غير موجودة."
        )

    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype":
                "Patient Encounter",
            "reference_name":
                encounter,
        },
        fields=[
            "name",
            "creation",
            "comment_by",
            "content",
        ],
        order_by="creation desc",
        limit_page_length=200,
    )

    result = []

    current_user = frappe.session.user

    for comment in comments:

        content = (
            comment.content
            or ""
        )

        if not content.startswith(
            "[ER-DEPARTMENT-MESSAGE]"
        ):
            continue

        source = ""
        target = ""
        message = content

        lines = content.splitlines()

        for index, line in enumerate(lines):

            if line.startswith(
                "المرسل:"
            ):
                source = line.split(
                    ":",
                    1
                )[1].strip()

            elif line.startswith(
                "المستلم:"
            ):
                target = line.split(
                    ":",
                    1
                )[1].strip()

            elif line == "الرسالة:":

                message = "\n".join(
                    lines[
                        index + 1:
                    ]
                ).strip()

        notification = frappe.db.sql(
            """
            SELECT
                name,
                `read`,
                creation
            FROM `tabNotification Log`
            WHERE for_user = %(user)s
              AND document_type = 'Patient Encounter'
              AND document_name = %(encounter)s
              AND subject LIKE %(subject)s
            ORDER BY creation DESC
            LIMIT 1
            """,
            {
                "user":
                    current_user,
                "encounter":
                    encounter,
                "subject":
                    "رسالة قسم [ERMSG:"
                    + str(comment.name)
                    + "]%",
            },
            as_dict=True,
        )

        notification_row = (
            notification[0]
            if notification
            else None
        )

        source_department = ""
        target_department = ""

        for department_key, department_label in ER_DEPARTMENT_LABELS.items():

            if department_label == source:
                source_department = department_key

            if department_label == target:
                target_department = department_key

        result.append({
            "name":
                comment.name,
            "creation":
                comment.creation,
            "user":
                comment.comment_by,
            "from":
                source,
            "to":
                target,
            "source_department":
                source_department,
            "target_department":
                target_department,
            "message":
                message,
            "notification":
                (
                    notification_row.name
                    if notification_row
                    else None
                ),
            "unread":
                bool(
                    notification_row
                    and not notification_row.read
                ),
        })

    return result


@frappe.whitelist()
def mark_er_department_message_read(
    notification,
):

    if not notification:
        frappe.throw(
            "الإشعار غير محدد."
        )

    row = frappe.db.get_value(
        "Notification Log",
        notification,
        [
            "name",
            "for_user",
            "document_type",
            "document_name",
        ],
        as_dict=True,
    )

    if not row:
        frappe.throw(
            "الإشعار غير موجود."
        )

    if row.for_user != frappe.session.user:
        frappe.throw(
            "لا يمكنك تعديل إشعار مستخدم آخر."
        )

    if row.document_type != "Patient Encounter":
        frappe.throw(
            "هذا الإشعار ليس من رسائل الأقسام."
        )

    frappe.db.set_value(
        "Notification Log",
        notification,
        "read",
        1,
    )

    return {
        "success": True,
    }
