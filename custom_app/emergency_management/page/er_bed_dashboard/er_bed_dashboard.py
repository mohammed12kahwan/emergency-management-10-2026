import frappe

from custom_app.emergency_management.api.admission_office import (
    admit_patient_from_er,
    get_available_service_units,
    validate_admission_eligibility,
)
from custom_app.emergency_management.api.service_requests import (
    create_service_request as canonical_create_service_request,
    _get_occupied_bed_status,
    _transfer_er_bed_to_inpatient,
    validate_er_internal_transfer_eligibility,
    _transfer_er_bed_internal,
    validate_er_discharge_eligibility,
    validate_external_transfer_eligibility,
    _external_transfer_inpatient,
    _discharge_bed,
)


def _get_triage_color_map():
    """استخدام نظام ألوان الفرز الموجود في DocType ER Triage Level (بدون إنشاء نظام لون جديد)."""
    try:
        levels = frappe.get_all(
            "ER Triage Level",
            fields=["name", "color"],
        )
        return {lvl.name: lvl.color for lvl in levels}
    except Exception:
        return {}


# ==================================================
# جلب بيانات لوحة الأسرة
# ==================================================

@frappe.whitelist()
def get_beds():

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
            "room_number"
        ],
        order_by="bed_code asc"
    )


    result = []


    triage_color_map = _get_triage_color_map()


    waiting_area_labels = {}
    current_location_labels = {}

    try:
        for wa in frappe.get_all(
            "ER Waiting Area",
            fields=["name", "arabic_name", "waiting_area"],
        ):
            waiting_area_labels[wa.name] = (
                wa.arabic_name or wa.waiting_area or wa.name
            )
    except Exception:
        pass

    try:
        for cl in frappe.get_all(
            "ER Current Location",
            fields=["name", "arabic_name", "location_name"],
        ):
            current_location_labels[cl.name] = (
                cl.arabic_name or cl.location_name or cl.name
            )
    except Exception:
        pass


    pending_admission_beds = set()

    try:
        pending_admissions = frappe.get_all(
            "ER Admission Request",
            filters={
                "admission_status": "Created",
                "workflow_state": "Pending",
                "er_bed": ["is", "set"]
            },
            fields=["er_bed"],
        )
        pending_admission_beds = set(
            req.er_bed for req in pending_admissions if req.er_bed
        )
    except Exception:
        pass

    can_admit_inpatient_beds = set()

    try:
        beds_with_intake = [b.name for b in beds if b.current_intake]

        if beds_with_intake:
            intakes = frappe.get_all(
                "ER Patient Intake",
                filters={"name": ["in", beds_with_intake]},
                fields=["name", "patient", "patient_encounter", "triage_record"],
            )

            intake_map = {i.name: i for i in intakes}
            eligible_intakes = [
                i for i in intakes
                if i.patient_encounter and i.triage_record
            ]

            if eligible_intakes:
                admission_requests = frappe.get_all(
                    "ER Admission Request",
                    filters={
                        "er_patient_intake": ["in", [i.name for i in eligible_intakes]],
                        "status": "Approved",
                        "workflow_state": "Approved",
                        "admission_status": ["!=", "Admitted"],
                        "admission_reference": ["is", "not set"],
                    },
                    fields=["er_patient_intake", "patient"],
                )

                request_intakes = set(req.er_patient_intake for req in admission_requests)
                request_patients = set(req.patient for req in admission_requests)

                for intake in eligible_intakes:
                    if intake.name not in request_intakes:
                        continue

                    existing_ip = frappe.db.sql(
                        """
                        SELECT name
                        FROM `tabInpatient Record`
                        WHERE patient = %(patient)s
                        AND status IN ('Admission Scheduled', 'Admitted')
                        """,
                        {"patient": intake.patient},
                        as_dict=True,
                    )
                    if not existing_ip:
                        can_admit_inpatient_beds.add(intake.name)

    except Exception:
        pass

    has_active_inpatient_beds = set()

    try:
        beds_with_intake = [b.name for b in beds if b.current_intake]

        if beds_with_intake:
            intakes_for_ip = frappe.get_all(
                "ER Patient Intake",
                filters={"name": ["in", beds_with_intake]},
                fields=["name", "patient"],
            )

            patients_with_ip = [
                i.patient
                for i in intakes_for_ip
                if i.patient
            ]

            if patients_with_ip:
                active_ips = frappe.db.sql(
                    """
                    SELECT patient, name
                    FROM `tabInpatient Record`
                    WHERE patient IN %(patients)s
                    AND status IN ('Admission Scheduled', 'Admitted')
                    """,
                    {"patients": tuple(patients_with_ip)},
                    as_dict=True,
                )

                ip_patients = set(ip.patient for ip in active_ips)

                for intake in intakes_for_ip:
                    if intake.patient in ip_patients:
                        has_active_inpatient_beds.add(intake.name)

    except Exception:
        pass



    for bed in beds:


        patient_name = None


        if bed.current_patient:

            patient_name = frappe.db.get_value(
                "Patient",
                bed.current_patient,
                "patient_name"
            )



        status_name = None


        if bed.bed_status:

            status_name = frappe.db.get_value(
                "ER Bed Status",
                bed.bed_status,
                "status_name"
            )



        triage_level = None
        triage_color = None



        if bed.current_intake:


            intake = frappe.db.get_value(
                "ER Patient Intake",
                bed.current_intake,
                "acuity",
                as_dict=True
            )



            if intake and intake.acuity:


                triage_level = intake.acuity

                triage_color = triage_color_map.get(
                    triage_level
                ) or None



        # ==========================
        # آخر العلامات الحيوية
        # ==========================

        vital_signs = {}



        if bed.current_patient:


            vital = frappe.get_all(
                "Vital Signs",
                filters={
                    "patient": bed.current_patient,
                    "er_intake": bed.current_intake
                },
                fields=[
                    "temperature",
                    "pulse",
                    "bp_systolic",
                    "bp_diastolic",
                    "respiratory_rate",
                    "spo2",
                    "pain_score",
                    "recorded_by",
                    "signs_date",
                    "signs_time"
                ],
                order_by="signs_date desc, signs_time desc",
                limit=1
            )


            if vital:

                vital_signs = vital[0]

                # Keep the response shape expected by existing UI code.
                vital_signs["heart_rate"] = vital_signs.get("pulse")
                vital_signs["systolic_bp"] = vital_signs.get("bp_systolic")
                vital_signs["diastolic_bp"] = vital_signs.get("bp_diastolic")
                vital_signs["recorded_time"] = (
                    f"{vital_signs.get('signs_date')} "
                    f"{vital_signs.get('signs_time')}"
                )

        vital_due = None
        vital_due_state = None
        vital_due_label = None

        if bed.current_patient:

            vs_filters = {"patient": bed.current_patient}

            if bed.current_intake:

                vs_filters["er_intake"] = bed.current_intake

            current_encounter = None

            if bed.current_intake:

                current_encounter = frappe.db.get_value(
                    "ER Patient Intake",
                    bed.current_intake,
                    "patient_encounter"
                )

            if current_encounter:

                vs_filters_with_enc = dict(vs_filters)

                vs_filters_with_enc["encounter"] = current_encounter

                last_vs = frappe.get_all(
                    "Vital Signs",
                    filters=vs_filters_with_enc,
                    fields=["next_vital_due", "signs_date", "signs_time"],
                    order_by="signs_date desc, signs_time desc",
                    limit=1
                )

            if not current_encounter or not last_vs:

                last_vs = frappe.get_all(
                    "Vital Signs",
                    filters=vs_filters,
                    fields=["next_vital_due", "signs_date", "signs_time"],
                    order_by="signs_date desc, signs_time desc",
                    limit=1
                )

            if last_vs and last_vs[0].get("next_vital_due"):

                vital_due = last_vs[0].next_vital_due

                if vital_due:

                    now = frappe.utils.now_datetime()

                    if vital_due > now:

                        vital_due_state = "soon"

                        vital_due_label = "العلامات الحيوية القادمة"

                    else:

                        vital_due_state = "overdue"

                        vital_due_label = "العلامات الحيوية مستحقة"

        result.append({

            "id": bed.name,

            "bed_code": bed.bed_code,

            "bed_name": bed.bed_name,

            "arabic_name": bed.arabic_name,

            "status": bed.bed_status,

            "status_name": status_name,

            "patient": bed.current_patient,

            "patient_name": patient_name,

            "intake": bed.current_intake,

            "doctor": bed.assigned_doctor,

            "nurse": bed.assigned_nurse,

            "triage_level": triage_level,

            "triage_color": triage_color,

            "waiting_area": bed.waiting_area,

            "waiting_area_label": waiting_area_labels.get(bed.waiting_area, bed.waiting_area or "عام"),

            "current_location": bed.current_location,

            "current_location_label": current_location_labels.get(bed.current_location, bed.current_location or "عام"),

            "room_number": bed.room_number,

            "pending_admission": 1 if bed.name in pending_admission_beds else 0,

            "can_admit_inpatient": 1 if bed.current_intake in can_admit_inpatient_beds else 0,

            "has_active_inpatient": 1 if bed.current_intake in has_active_inpatient_beds else 0,

            "is_available": 0 if bed.current_patient else int(frappe.db.get_value(
                "ER Bed Status",
                bed.bed_status,
                "is_available",
            ) or 0),

            "vital_signs": vital_signs,

            "vital_due": vital_due,

            "vital_due_state": vital_due_state,

            "vital_due_label": vital_due_label

        })



    return result
# ==================================================
# تفاصيل السرير عند الضغط على بطاقة السرير
# ==================================================

@frappe.whitelist()
def get_bed_details(bed_name):


    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )



    triage_color_map = _get_triage_color_map()



    data = {

        "bed_name": bed.arabic_name or bed.bed_code,

        "bed_code": bed.bed_code,

        "status": bed.bed_status,


        "patient": bed.current_patient,

        "patient_name": None,


        "assigned_doctor": None,

        "assigned_nurse": None,


        "triage_level": None,

        "triage_color": None,


        "chief_complaint": None,

        "arrival_time": None,


        "patient_encounter": None,

        "er_patient_intake": bed.current_intake,


        "vital_signs": {},

        "lab_results": [],

        "radiology_results": [],

        "medical_history": {}

    }



    # ==========================
    # بيانات المريض
    # ==========================

    if bed.current_patient:


        data["patient_name"] = frappe.db.get_value(
            "Patient",
            bed.current_patient,
            "patient_name"
        )



    # ==========================
    # الطبيب
    # ==========================

    if bed.assigned_doctor:


        data["assigned_doctor"] = frappe.db.get_value(
            "Healthcare Practitioner",
            bed.assigned_doctor,
            "practitioner_name"
        )



    # ==========================
    # الممرض
    # ==========================

    if bed.assigned_nurse:


        data["assigned_nurse"] = frappe.db.get_value(
            "Healthcare Practitioner",
            bed.assigned_nurse,
            "practitioner_name"
        )



    # ==========================
    # بيانات استقبال الطوارئ
    # ==========================

    patient_encounter = None


    if bed.current_intake:


        intake = frappe.db.get_value(
            "ER Patient Intake",
            bed.current_intake,
            [
                "acuity",
                "chief_complaint",
                "arrival_time",
                "patient_encounter"
            ],
            as_dict=True
        )



        if intake:


            data["chief_complaint"] = intake.chief_complaint

            data["arrival_time"] = intake.arrival_time

            patient_encounter = intake.patient_encounter

            data["patient_encounter"] = patient_encounter



            if intake.acuity:


                data["triage_level"] = intake.acuity

                data["triage_color"] = triage_color_map.get(
                    intake.acuity
                ) or None



    # ==========================
    # آخر العلامات الحيوية
    # المصدر الوحيد: Vital Signs
    # ==========================

    vital = []

    if bed.current_patient:

        vital_filters = {
            "patient": bed.current_patient
        }

        if bed.current_intake:
            vital_filters["er_intake"] = bed.current_intake

        vital = frappe.get_all(
            "Vital Signs",
            filters=vital_filters,
            fields=[
                "name",
                "signs_date",
                "signs_time",
                "temperature",
                "pulse",
                "bp_systolic",
                "bp_diastolic",
                "respiratory_rate",
                "spo2",
                "pain_score",
                "critical_alert",
                "custom_blood_glucose",
                "vital_signs_note",
                "recorded_by"
            ],
            order_by="signs_date desc, signs_time desc",
            limit=1
        )

    if vital:

        vital_row = vital[0]

        # Keep the old API keys used by the frontend.
        vital_row["recorded_time"] = (
            f"{vital_row.get('signs_date')} "
            f"{vital_row.get('signs_time')}"
        )

        vital_row["heart_rate"] = vital_row.get("pulse")
        vital_row["systolic_bp"] = vital_row.get("bp_systolic")
        vital_row["diastolic_bp"] = vital_row.get("bp_diastolic")

        vital_row["blood_glucose"] = (
            vital_row.get("custom_blood_glucose")
        )

        vital_row["notes"] = (
            vital_row.get("vital_signs_note")
        )

        data["vital_signs"] = vital_row



    # ==========================
    # نتائج المختبر
    # ==========================

    if bed.current_patient and patient_encounter:


        lab_requests = frappe.get_all(
            "ER Diagnostic Request",
            filters={
                "patient": bed.current_patient,
                "patient_encounter": patient_encounter,
                "request_type": "Laboratory"
            },
            fields=[
                "name",
                "request_date",
                "test_name",
                "lab_status",
                "lab_test",
                "creation"
            ],
            order_by="creation desc",
            limit_page_length=50
        )


        for lab_request in lab_requests:

            lab_test = frappe.db.get_value(
                "Lab Test",
                lab_request.lab_test,
                [
                    "name",
                    "status",
                    "result_date",
                    "template"
                ],
                as_dict=True
            ) if lab_request.lab_test else None


            diagnostic_report = None


            if lab_test:

                diagnostic_report = frappe.db.get_value(
                    "Diagnostic Report",
                    {
                        "patient": bed.current_patient,
                        "ref_doctype": "Lab Test",
                        "docname": lab_test.name,
                        "docstatus": ["!=", 2]
                    },
                    ["name", "status"],
                    as_dict=True
                )


            lab_request["lab_test_status"] = (
                lab_test.status if lab_test else None
            )

            lab_request["result_date"] = (
                lab_test.result_date if lab_test else None
            )

            lab_request["diagnostic_report"] = (
                diagnostic_report.name if diagnostic_report else None
            )

            lab_request["diagnostic_report_status"] = (
                diagnostic_report.status if diagnostic_report else None
            )


        data["lab_results"] = lab_requests



    # ==========================
    # نتائج الأشعة
    # ==========================

    if bed.current_patient and patient_encounter:


        radiology_requests = frappe.get_all(
            "ER Diagnostic Request",
            filters={
                "patient": bed.current_patient,
                "patient_encounter": patient_encounter,
                "request_type": "Radiology"
            },
            fields=[
                "name",
                "request_date",
                "test_name",
                "radiology_examination",
                "creation"
            ],
            order_by="creation desc",
            limit_page_length=50
        )


        for rad_request in radiology_requests:


            radiology = None


            if rad_request.radiology_examination:

                radiology = frappe.db.get_value(
                    "Radiology Examination",
                    rad_request.radiology_examination,
                    [
                        "name",
                        "status",
                        "result",
                        "report_pdf",
                        "image_attachment",
                        "examination_type",
                        "er_body_part",
                        "examination_no"
                    ],
                    as_dict=True
                )


            rad_request["radiology"] = radiology

            rad_request["radiology_status"] = (
                radiology.get("status") if radiology else None
            )

            rad_request["result"] = (
                radiology.get("result") if radiology else None
            )

            rad_request["report_pdf"] = (
                radiology.get("report_pdf") if radiology else None
            )

            rad_request["image_attachment"] = (
                radiology.get("image_attachment") if radiology else None
            )


        data["radiology_results"] = radiology_requests



    # ==========================
    # السجل الطبي للمريض
    # ==========================

    if bed.current_patient:


        recent_encounters = frappe.get_all(
            "Patient Encounter",
            filters={
                "patient": bed.current_patient
            },
            fields=[
                "name",
                "encounter_date",
                "encounter_time",
                "practitioner",
                "er_visit_type",
                "er_visit_status"
            ],
            order_by="encounter_date desc, encounter_time desc",
            limit_page_length=10
        )


        recent_vitals = frappe.get_all(
            "Vital Signs",
            filters={
                "patient": bed.current_patient
            },
            fields=[
                "name",
                "signs_date",
                "signs_time",
                "temperature",
                "pulse",
                "bp_systolic",
                "bp_diastolic",
                "spo2",
                "pain_score",
                "recorded_by"
            ],
            order_by="signs_date desc, signs_time desc",
            limit_page_length=10
        )

        for vital_row in recent_vitals:
            vital_row["heart_rate"] = vital_row.get("pulse")
            vital_row["systolic_bp"] = vital_row.get("bp_systolic")
            vital_row["diastolic_bp"] = vital_row.get("bp_diastolic")
            vital_row["recorded_time"] = (
                f"{vital_row.get('signs_date')} "
                f"{vital_row.get('signs_time')}"
            )


        medical_records = frappe.get_all(
            "Patient Medical Record",
            filters={
                "patient": bed.current_patient
            },
            fields=[
                "name",
                "status",
                "subject",
                "communication_date",
                "reference_doctype",
                "reference_name"
            ],
            order_by="communication_date desc",
            limit_page_length=10
        )


        data["medical_history"] = {

            "encounters": recent_encounters,

            "vitals": recent_vitals,

            "medical_records": medical_records

        }


    if bed.current_patient:

        active_ip = frappe.db.get_value(
            "Inpatient Record",
            {
                "patient": bed.current_patient,
                "status": ["in", ["Admission Scheduled", "Admitted"]],
            },
            "name",
        )

        data["patient_inpatient_record"] = active_ip

        if active_ip:
            active_occ = frappe.db.get_value(
                "Inpatient Occupancy",
                {
                    "parent": active_ip,
                    "left": 0,
                },
                "service_unit",
            )

            data["service_unit"] = active_occ

    return data
# ==================================================
# حفظ العلامات الحيوية
# ==================================================

@frappe.whitelist()
def save_vital_signs(bed_name, data):


    import json



    if isinstance(data, str):

        data = json.loads(data)



    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )



    encounter = None

    if bed.current_intake:

        encounter = frappe.db.get_value(
            "ER Patient Intake",
            bed.current_intake,
            "patient_encounter"
        )

    now = frappe.utils.now_datetime()

    vital = frappe.get_doc({
        "doctype": "Vital Signs",

        "patient":
            bed.current_patient,

        "er_intake":
            bed.current_intake,

        "encounter":
            encounter,

        "recorded_by":
            frappe.session.user,

        "signs_date":
            now.date(),

        "signs_time":
            now.time(),

        "temperature":
            data.get("temperature"),

        "pulse":
            data.get("heart_rate"),

        "bp_systolic":
            data.get("systolic_bp"),

        "bp_diastolic":
            data.get("diastolic_bp"),

        "respiratory_rate":
            data.get("respiratory_rate"),

        "spo2":
            data.get("spo2"),

        "pain_score":
            data.get("pain_score"),

        "custom_blood_glucose":
            data.get("blood_glucose"),

        "vital_signs_note":
            data.get("notes")
    })



    vital.insert(
        ignore_permissions=True
    )

    frappe.db.commit()



    return {

        "status": "success",
        "name": vital.name

    }
# ==================================================
# إنشاء طلب خدمة طبية للطوارئ
# ==================================================

@frappe.whitelist()
def create_service_request(bed_name, data):


    import json



    if isinstance(data, str):

        data = json.loads(data)



    request_type = (
        data.get("request_type")
        or ""
    ).strip()


    type_map = {

        "Laboratory": "Laboratory",
        "Radiology": "Radiology",
        "Medication": "Medication",
        "Consultation": "Consultation",
        "Transfer": "Transfer",
        "Admission": "Admission",
        "Observation": "Observation",
        "Discharge": "Discharge"

    }



    api_type = type_map.get(
        request_type,
        request_type
    )



    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )



    payload = {

        "patient": bed.current_patient,

        "er_patient_intake": bed.current_intake,

        "bed": bed.name,

        "request_type": api_type,

        "requested_by": frappe.session.user,

        "doctor": bed.assigned_doctor,

        "priority": data.get("priority") or "Normal",

        "notes": data.get("notes") or "",

        "service_item": data.get("service_item") or None,

        "transfer_mode": (
            "Internal"
            if request_type == "Transfer"
            else (
                "External"
                if request_type == "Transfer_External"
                else None
            )
        ),

        "requested_department": data.get("requested_department") or None,

        "requested_service_unit_type": data.get("requested_service_unit_type") or None,

        "expected_length_of_stay": data.get("expected_length_of_stay") or None,

        "admission_reason": data.get("admission_reason") or None,

        "observation_area": data.get("observation_area") or None,

        "observation_bed": data.get("observation_bed") or None

    }



    try:

        result = canonical_create_service_request(
            payload
        )


    except Exception as exc:

        frappe.log_error(
            frappe.get_traceback(),
            "Bed Dashboard Service Request Error"
        )


        return {

            "status": "error",
            "message": str(exc)

        }



    return {

        "status": "success",

        "name": result.get("name"),

        "message": result

    }


# ==================================================
# التحقق من أهلية ترقيد المريض بالسرير
# Phase 1 bed validation — يعيد استخدام أنماط validation الحجز الموجودة
# (ER Patient Intake، زيارة طبية محفّظة، فرز مكتمل، السرير المتاح)
# ==================================================

@frappe.whitelist()
def validate_bed_admission(bed_name, patient=None, intake=None):

    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )

    if not bed.is_active:
        return {
            "can_admit": False,
            "reason": "bed_inactive",
            "message": "السرير غير فعال."
        }

    if bed.current_patient:
        return {
            "can_admit": False,
            "reason": "bed_occupied",
            "message": "السرير مشغول حالياً."
        }

    if not frappe.db.get_value(
        "ER Bed Status",
        bed.bed_status,
        "is_available"
    ):
        return {
            "can_admit": False,
            "reason": "bed_unavailable",
            "message": "السرير غير متاح للترقيد."
        }

    patient_name = frappe.db.get_value(
        "Patient",
        patient,
        "patient_name"
    ) or patient

    if not intake:

        items = frappe.get_all(
            "ER Patient Intake",
            filters={"patient": patient},
            fields=["name", "patient_encounter", "triage_record", "acuity"],
            order_by="creation desc",
            limit=1
        )

        if not items:
            return {
                "can_admit": False,
                "reason": "no_intake",
                "message": "يجب حفظ زيارة الطوارئ وإكمال الفرز قبل ترقيد المريض.",
                "patient_name": patient_name
            }

        intake_name = items[0].name

    else:

        intake_name = intake

    intake_doc = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    if patient and intake_doc.patient != patient:
        return {
            "can_admit": False,
            "reason": "intake_mismatch",
            "message": "الزيارة لا تخص المريض المحدد."
        }

    # 1. Emergency Visit محفّظ (Patient Encounter)
    if not intake_doc.patient_encounter:
        return {
            "can_admit": False,
            "reason": "visit_not_saved",
            "message": "يجب حفظ زيارة الطوارئ وإكمال الفرز قبل ترقيد المريض.",
            "intake": intake_name,
            "patient_name": patient_name
        }

    # 2. الفرز مكتمل (triage_record + acuity) حسب بنية الفرز الحالية
    if not intake_doc.triage_record or not intake_doc.acuity:
        return {
            "can_admit": False,
            "reason": "triage_incomplete",
            "message": "يجب حفظ زيارة الطوارئ وإكمال الفرز قبل ترقيد المريض.",
            "intake": intake_name,
            "patient_name": patient_name
        }

    # 3. المريض غير مشغول على سرير ER آخر نشط
    other_bed = frappe.db.get_value(
        "ER Bed",
        {"current_patient": patient, "is_active": 1, "name": ("!=", bed.name)},
        "name"
    )

    if other_bed:
        return {
            "can_admit": False,
            "reason": "patient_on_other_bed",
            "message": "المريض مشغول على سرير آخر نشط."
        }

    triage_color = frappe.db.get_value(
        "ER Triage Level",
        intake_doc.acuity,
        "color"
    )

    return {
        "can_admit": True,
        "reason": "ok",
        "intake": intake_name,
        "patient_name": patient_name,
        "triage_level": intake_doc.acuity,
        "triage_color": triage_color,
        "encounter": intake_doc.patient_encounter
    }


# ==================================================
# ترقيد المريض بالسرير — إعادة استخدام _create_observation_stay (Phase 1)
# ==================================================

@frappe.whitelist()
def admit_patient_to_bed(bed_name, patient, intake):

    check = validate_bed_admission(bed_name, patient, intake)

    if not check.get("can_admit"):
        frappe.throw(
            check.get("message") or "المريض غير مؤهل للترقيد."
        )

    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )

    intake_doc = frappe.get_doc(
        "ER Patient Intake",
        intake
    )

    from custom_app.emergency_management.api.service_requests import (
        _create_observation_stay
    )

    observation = _create_observation_stay(
        {
            "patient": patient,
            "er_patient_intake": intake,
            "doctor": bed.assigned_doctor,
            "waiting_area": bed.waiting_area or None,
            "observation_bed": bed.name,
            "triage": intake_doc.triage_record,
            "triage_level": intake_doc.acuity
        }
    )

    return {
        "status": "success",
        "observation": observation.name if observation else None,
        "bed_status": bed.bed_status
    }


# ==================================================
# وحدات الإقامة الداخلية المتاحة
# ==================================================

@frappe.whitelist()
def get_available_inpatient_units(requested_type=None, company=None):

    return get_available_service_units(requested_type, company)


# ==================================================
# التحقق من أهلية الترقيد إلى التنويم
# ==================================================

@frappe.whitelist()
def validate_inpatient_admission(bed_name):

    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )

    if not bed.is_active:
        return {
            "can_admit": False,
            "reason": "bed_inactive",
            "message": "السرير غير فعال."
        }

    if not frappe.db.get_value(
        "ER Bed Status",
        bed.bed_status,
        "is_available"
    ):
        return {
            "can_admit": False,
            "reason": "bed_unavailable",
            "message": "السرير غير متاح للترقيد."
        }

    if not bed.current_intake:
        return {
            "can_admit": False,
            "reason": "no_intake",
            "message": "لا توجد زيارة طوارئ مرتبطة بهذا السرير."
        }

    intake_doc = frappe.get_doc(
        "ER Patient Intake",
        bed.current_intake
    )

    if not intake_doc.patient_encounter:
        return {
            "can_admit": False,
            "reason": "no_encounter",
            "message": "يجب حفظ زيارة الطوارئ قبل الترقيد."
        }

    if not intake_doc.triage_record:
        return {
            "can_admit": False,
            "reason": "no_triage",
            "message": "يجب إكمال الفرز قبل الترقيد."
        }

    admission_request = frappe.db.get_value(
        "ER Admission Request",
        {
            "er_patient_intake": bed.current_intake,
            "patient": intake_doc.patient,
            "status": "Approved",
            "workflow_state": "Approved",
            "admission_status": ["!=", "Admitted"],
            "admission_reference": ["is", "not set"],
        },
        [
            "name",
            "requesting_doctor",
            "requested_department",
            "requested_service_unit_type",
            "admission_reason",
            "priority",
            "expected_length_of_stay",
        ]
    )

    if not admission_request:
        return {
            "can_admit": False,
            "reason": "no_approved_request",
            "message": "لا يوجد طلب ترقيد معتمد لهذه الزيارة."
        }

    admission_request_name = admission_request[0]
    requesting_doctor = admission_request[1]
    requested_department = admission_request[2]
    requested_service_unit_type = admission_request[3]
    admission_reason = admission_request[4]
    priority = admission_request[5]
    expected_length_of_stay = admission_request[6]

    existing_ip = frappe.db.sql(
        """
        SELECT name, status
        FROM `tabInpatient Record`
        WHERE patient = %(patient)s
        AND status IN ('Admission Scheduled', 'Admitted')
        """,
        {"patient": intake_doc.patient},
        as_dict=True,
    )

    if existing_ip:
        return {
            "can_admit": False,
            "reason": "active_inpatient",
            "message": "المريض لديه سجل إقامة نشط: {0}".format(existing_ip[0].name)
        }

    patient_name = frappe.db.get_value(
        "Patient",
        intake_doc.patient,
        "patient_name"
    )

    return {
        "can_admit": True,
        "reason": "ok",
        "bed_name": bed.name,
        "patient": intake_doc.patient,
        "patient_name": patient_name,
        "intake": bed.current_intake,
        "admission_request": admission_request_name,
        "encounter": intake_doc.patient_encounter,
        "triage_record": intake_doc.triage_record,
        "requesting_doctor": requesting_doctor,
        "requested_department": requested_department,
        "requested_service_unit_type": requested_service_unit_type,
        "admission_reason": admission_reason,
        "priority": priority,
        "expected_length_of_stay": expected_length_of_stay,
    }


# ==================================================
# ترقيد المريض إلى التنويم
# ==================================================

@frappe.whitelist()
def admit_patient_to_inpatient(bed_name, service_unit):

    validation = validate_inpatient_admission(bed_name)

    if not validation.get("can_admit"):
        frappe.throw(
            validation.get("message") or "المريض غير مؤهل للترقيد."
        )

    request_name = validation.get("admission_request")
    patient = validation.get("patient")
    intake = validation.get("intake")

    admission_result = admit_patient_from_er(
        request_name,
        service_unit
    )

    if not admission_result.get("success"):
        frappe.throw(
            admission_result.get("message") or "فشل في ترقيد المريض."
        )

    inpatient_record_name = admission_result.get("inpatient_record")

    transfer_result = _transfer_er_bed_to_inpatient(
        patient,
        intake,
        bed_name
    )

    if not transfer_result.get("success"):
        frappe.throw(
            transfer_result.get("message") or "فشل في تحويل بيانات السرير."
        )

    inpatient_record = frappe.get_doc(
        "Inpatient Record",
        inpatient_record_name
    )

    if inpatient_record.status != "Admitted":
        frappe.throw(
            "فشل في ترقيد المريض. حالة السجل: {0}".format(inpatient_record.status)
        )

    patient_doc = frappe.get_doc(
        "Patient",
        patient
    )

    if patient_doc.inpatient_status != "Admitted":
        frappe.throw(
            "حالة المريض لم يتم تحديثها بعد الترقيد."
        )

    if patient_doc.inpatient_record != inpatient_record_name:
        frappe.throw(
            "رابط سجل الإقامة للمريض لم يتم تحديثه."
        )

    if intake:
        intake_doc = frappe.get_doc(
            "ER Patient Intake",
            intake
        )

        if intake_doc.patient_encounter:
            encounter = frappe.get_doc(
                "Patient Encounter",
                intake_doc.patient_encounter
            )

            if encounter.inpatient_record != inpatient_record_name:
                encounter.inpatient_record = inpatient_record_name

            if getattr(encounter, "inpatient_status", None) != "Admitted":
                encounter.inpatient_status = "Admitted"

            encounter.save(ignore_permissions=True)

    er_admission_request = frappe.get_doc(
        "ER Admission Request",
        request_name
    )

    from frappe.model.workflow import apply_workflow

    apply_workflow(
        er_admission_request,
        "Admit Patient"
    )

    er_admission_request.reload()

    return {
        "status": "success",
        "inpatient_record": inpatient_record_name,
        "patient": patient,
        "service_unit": service_unit,
        "admission_request": request_name,
        "workflow_state": er_admission_request.workflow_state,
        "admission_status": er_admission_request.admission_status,
    }


# ==================================================
# التحويل الداخلي في الطوارئ - خيارات
# ==================================================

@frappe.whitelist()
def get_er_internal_transfer_options(bed_name):

    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )

    from custom_app.emergency_management.utils.bed import (
        get_available_bed_status,
    )

    available_destinations = frappe.get_all(
        "ER Bed",
        filters={
            "is_active": 1,
            "name": ["!=", bed_name],
            "bed_status": get_available_bed_status(),
            "current_patient": ["is", "not set"],
            "current_intake": ["is", "not set"],
            "current_observation": ["is", "not set"],
        },
        fields=["name", "bed_code", "arabic_name", "bed_status", "waiting_area", "current_location"],
        order_by="bed_code",
    )

    for dest in available_destinations:
        dest["status_name"] = frappe.db.get_value(
            "ER Bed Status",
            dest.bed_status,
            "status_name"
        )

    patient_name = None
    if bed.current_patient:
        patient_name = frappe.db.get_value(
            "Patient",
            bed.current_patient,
            "patient_name"
        )

    return {
        "from_bed": bed.name,
        "from_bed_code": bed.bed_code,
        "from_bed_name": bed.arabic_name or bed.bed_code,
        "patient": bed.current_patient,
        "patient_name": patient_name,
        "intake": bed.current_intake,
        "waiting_area": bed.waiting_area,
        "current_location": bed.current_location,
        "available_destinations": available_destinations,
    }


# ==================================================
# التحويل الداخلي في الطوارئ - تنفيذ
# ==================================================

@frappe.whitelist()
def execute_er_internal_transfer(bed_name, destination_bed, reason, notes, transfer_datetime):

    validation = validate_er_internal_transfer_eligibility(
        bed_name,
        destination_bed
    )

    if not validation.get("eligible"):
        frappe.throw(
            validation.get("message") or "السرير غير مؤهل للتحويل الداخلي."
        )

    result = _transfer_er_bed_internal(
        validation.get("patient"),
        validation.get("intake"),
        validation.get("from_bed"),
        validation.get("to_bed"),
        reason,
        notes,
        transfer_datetime
    )

    return result


# ==================================================
# التحويل الخارجي - خيارات
# ==================================================

@frappe.whitelist()
def get_external_transfer_options(inpatient_record_name):

    validation = validate_external_transfer_eligibility(
        inpatient_record_name
    )

    if not validation.get("eligible"):
        frappe.throw(
            validation.get("message") or "سجل الإقامة غير مؤهل للتحويل الخارجي."
        )

    ip = frappe.get_doc(
        "Inpatient Record",
        inpatient_record_name
    )

    patient_name = frappe.db.get_value(
        "Patient",
        ip.patient,
        "patient_name"
    )

    service_unit = None
    service_unit_name = None
    if ip.inpatient_occupancies:
        active_occ = None
        for occ in ip.inpatient_occupancies:
            if not occ.left:
                active_occ = occ
                break
        if active_occ:
            service_unit = active_occ.service_unit
            service_unit_name = frappe.db.get_value(
                "Healthcare Service Unit",
                service_unit,
                "healthcare_service_unit_name"
            )

    return {
        "inpatient_record": ip.name,
        "patient": ip.patient,
        "patient_name": patient_name,
        "status": ip.status,
        "service_unit": service_unit,
        "service_unit_name": service_unit_name,
    }


# ==================================================
# التحويل الخارجي - تنفيذ
# ==================================================

@frappe.whitelist()
def execute_external_transfer(
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

    validation = validate_external_transfer_eligibility(
        inpatient_record_name
    )

    if not validation.get("eligible"):
        frappe.throw(
            validation.get("message") or "سجل الإقامة غير مؤهل للتحويل الخارجي."
        )

    result = _external_transfer_inpatient(
        inpatient_record_name,
        destination,
        reason,
        transfer_datetime,
        notes,
        receiving_hospital=receiving_hospital,
        destination_department=destination_department,
        destination_doctor=destination_doctor,
        contact_info=contact_info,
        ambulance_info=ambulance_info,
        transfer_instructions=transfer_instructions,
    )

    return result


# ==================================================
# خروج الطوارئ - خيارات
# ==================================================

@frappe.whitelist()
def get_er_discharge_options(bed_name):

    validation = validate_er_discharge_eligibility(
        bed_name
    )

    if not validation.get("eligible"):
        frappe.throw(
            validation.get("message") or "السرير غير مؤهل لخروج الطوارئ."
        )

    bed = frappe.get_doc(
        "ER Bed",
        bed_name
    )

    intake_doc = frappe.get_doc(
        "ER Patient Intake",
        bed.current_intake
    )

    patient_name = frappe.db.get_value(
        "Patient",
        bed.current_patient,
        "patient_name"
    )

    discharge_reasons = [
        {"value": "خروج برغبة", "label": "خروج برغبة"},
        {"value": "شفاء", "label": "شفاء"},
        {"value": "وفاة", "label": "وفاة"},
        {"value": "تحويل", "label": "تحويل"},
        {"value": "غادر بدون علاج", "label": "غادر بدون علاج"},
        {"value": "خروج عادي", "label": "خروج عادي"},
    ]

    return {
        "bed": bed.name,
        "patient": bed.current_patient,
        "patient_name": patient_name,
        "intake": bed.current_intake,
        "intake_status": intake_doc.status,
        "current_service": bed.current_service,
        "patient_status": bed.patient_status,
        "discharge_reasons": discharge_reasons,
    }


# ==================================================
# خروج الطوارئ - تنفيذ
# ==================================================

@frappe.whitelist()
def execute_er_discharge(bed_name, reason, notes, discharge_datetime):

    validation = validate_er_discharge_eligibility(
        bed_name
    )

    if not validation.get("eligible"):
        frappe.throw(
            validation.get("message") or "السرير غير مؤهل لخروج الطوارئ."
        )

    allowed_reasons = [
        "خروج برغبة",
        "شفاء",
        "وفاة",
        "تحويل",
        "غادر بدون علاج",
        "خروج عادي",
    ]

    if not reason or reason not in allowed_reasons:
        frappe.throw(
            _("سبب الخروج غير صالح. اختر من القائمة المعتمدة.")
        )

    result = _discharge_bed(
        validation.get("patient"),
        validation.get("intake"),
        validation.get("bed")
    )

    return result


# ==================================================
# مرضى الطوارئ المؤهلين للملاحظة (بدون ملاحظة حالية)
# ==================================================

@frappe.whitelist()
def get_er_observation_patients(area=None):

    from frappe.utils import now_datetime, add_to_date

    twenty_four_hours_ago = add_to_date(now_datetime(), hours=-24)

    filters = {
        "triage_record": ["is", "set"],
        "patient_encounter": ["is", "set"],
        "status": ["not in", ["خروج", "مغلقة", "تم التنويم", "تم التحويل"]],
    }

    intakes = frappe.get_all(
        "ER Patient Intake",
        filters=filters,
        fields=[
            "name",
            "patient",
            "triage_record",
            "acuity",
            "status",
            "assigned_bed",
            "visit_date_time",
            "waiting_area",
            "current_location",
        ],
        order_by="visit_date_time desc",
    )

    result = []

    for intake in intakes:

        if intake.assigned_bed:
            continue

        existing_observation = frappe.db.exists(
            "ER Observation Stay",
            {
                "patient": intake.patient,
                "patient_intake": intake.name,
                "is_active": 1,
            },
        )

        if existing_observation:
            continue

        active_ip = frappe.db.get_value(
            "Inpatient Record",
            {
                "patient": intake.patient,
                "status": ["in", ["Admission Scheduled", "Admitted"]],
            },
            "name",
        )

        if active_ip:
            continue

        if intake.visit_date_time and intake.visit_date_time > twenty_four_hours_ago:
            pass

        patient_area = intake.waiting_area or intake.current_location

        if area and patient_area and patient_area != area:
            continue

        patient_name = frappe.db.get_value(
            "Patient",
            intake.patient,
            "patient_name",
        )

        result.append({
            "name": intake.name,
            "patient": intake.patient,
            "patient_name": patient_name,
            "triage_record": intake.triage_record,
            "acuity": intake.acuity,
            "status": intake.status,
            "area": patient_area,
            "visit_date_time": str(intake.visit_date_time or ""),
        })

    return result


# ==================================================
# التحقق من قاعدة 24 ساعة لزيارات الطوارئ
# ==================================================

@frappe.whitelist()
def validate_24h_er_visit(patient):

    from frappe.utils import now_datetime, add_to_date

    if not patient:
        return {"allowed": True}

    twenty_four_hours_ago = add_to_date(now_datetime(), hours=-24)

    recent_visit = frappe.db.get_value(
        "ER Patient Intake",
        {
            "patient": patient,
            "visit_date_time": [">=", twenty_four_hours_ago],
        },
        ["name", "visit_date_time"],
        as_dict=True,
        order_by="visit_date_time desc",
    )

    if recent_visit:
        return {
            "allowed": False,
            "message": "لا يمكن إنشاء زيارة طوارئ جديدة للمريض قبل مرور 24 ساعة على الزيارة السابقة.",
            "existing_visit": recent_visit.name,
            "existing_visit_time": str(recent_visit.visit_date_time or ""),
        }

    return {"allowed": True}


# ==================================================
# الأسرة المتاحة حسب المنطقة
# ==================================================

@frappe.whitelist()
def get_available_beds_by_area(area=None):

    from custom_app.emergency_management.utils.bed import get_available_bed_status

    available_status = get_available_bed_status()

    filters = {
        "is_active": 1,
        "bed_status": available_status,
        "current_patient": ["is", "not set"],
    }

    beds = frappe.get_all(
        "ER Bed",
        filters=filters,
        fields=[
            "name",
            "bed_code",
            "arabic_name",
            "bed_status",
            "waiting_area",
            "current_location",
        ],
        order_by="arabic_name asc, bed_code asc",
    )

    result = []

    for bed in beds:
        if area:
            bed_area = bed.waiting_area or bed.current_location
            if bed_area != area:
                continue

        result.append({
            "name": bed.name,
            "bed_code": bed.bed_code,
            "arabic_name": bed.arabic_name,
            "bed_status": bed.bed_status,
            "waiting_area": bed.waiting_area,
            "current_location": bed.current_location,
        })

    return result


# ==================================================
# ترقيد المريض في سرير فارغ
# ==================================================

@frappe.whitelist()
def assign_patient_to_bed(bed_name, patient, intake):

    from custom_app.emergency_management.utils.bed import (
        set_patient_intake_bed,
    )

    if not frappe.has_permission(
        "ER Bed",
        "write",
    ):
        frappe.throw(
            "ليس لديك صلاحية لتعيين أو تغيير السرير."
        )

    if not frappe.db.exists(
        "ER Bed",
        bed_name,
    ):
        frappe.throw(
            "السرير غير موجود."
        )

    if not frappe.db.exists(
        "ER Patient Intake",
        intake,
    ):
        frappe.throw(
            "زيارة الطوارئ غير موجودة."
        )

    intake_doc = frappe.get_doc(
        "ER Patient Intake",
        intake,
    )

    if intake_doc.patient != patient:
        frappe.throw(
            "زيارة الطوارئ لا تتطابق مع المريض."
        )

    # المصدر الموحد:
    # التعيين الجديد أو النقل من السرير الحالي
    # يمر عبر set_patient_intake_bed().
    set_patient_intake_bed(
        intake,
        bed_name,
    )

    frappe.db.set_value(
        "ER Patient Intake",
        intake,
        {
            "status": "في سرير الطوارئ",
            "last_status_update":
                frappe.utils.now_datetime(),
        },
        update_modified=False,
    )

    frappe.db.commit()

    return {
        "success": True,
        "message": "تم ترقيد/نقل المريض إلى السرير بنجاح.",
        "bed": bed_name,
        "patient": patient,
        "intake": intake,
    }
