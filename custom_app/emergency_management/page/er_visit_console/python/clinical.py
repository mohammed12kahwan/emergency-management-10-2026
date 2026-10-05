import frappe
import json


@frappe.whitelist()
def get_patient_history(
    encounter,
    selected_encounter=None
):

    # =====================================
    # التحقق من الزيارة الحالية
    # =====================================

    if not encounter:

        return {

            "status":
                "error",

            "message":
                "رقم الزيارة غير موجود"

        }


    if not frappe.db.exists(

        "Patient Encounter",

        encounter

    ):

        return {

            "status":
                "error",

            "message":
                "الزيارة الطبية غير موجودة"

        }


    # =====================================
    # جلب الزيارة الحالية
    # =====================================

    current_encounter = frappe.get_doc(

        "Patient Encounter",

        encounter

    )


    # =====================================
    # المريض
    # =====================================

    patient = current_encounter.patient


    patient_name = (

        current_encounter.patient_name

        or frappe.db.get_value(

            "Patient",

            patient,

            "patient_name"

        )

        or patient

    )


    # =====================================
    # الزيارة المختارة
    # =====================================

    selected = (

        selected_encounter

        or encounter

    )


    # =====================================
    # التأكد أن الزيارة تخص نفس المريض
    # =====================================

    selected_exists = frappe.db.exists(

        "Patient Encounter",

        {

            "name":
                selected,

            "patient":
                patient

        }

    )


    if not selected_exists:

        selected = encounter


    # =====================================
    # جميع زيارات المريض
    # =====================================

    visits = frappe.get_all(

        "Patient Encounter",

        filters={

            "patient":
                patient

        },

        fields=[

            "name",

            "encounter_date",

            "encounter_time",

            "er_visit_type",

            "er_visit_status",

            "er_patient_intake",

            "practitioner",

            "practitioner_name"

        ],

        order_by=
            "creation desc",

        limit_page_length=
            0

    )


    # =====================================
    # تحديد ER Intake للزيارة المختارة
    # =====================================

    selected_intake = frappe.db.get_value(

        "Patient Encounter",

        selected,

        "er_patient_intake"

    )


    # =====================================
    # جميع العلامات الحيوية للمريض
    # =====================================

    all_vitals = frappe.get_all(

        "Vital Signs",

        filters={

            "patient":
                patient

        },

        fields=[

            "name",

            "patient",

            "patient_name",

            "encounter",

            "er_intake",

            "signs_date",

            "signs_time",

            "temperature",

            "pulse",

            "respiratory_rate",

            "spo2",

            "bp_systolic",

            "bp_diastolic",

            "esi_level",

            "vital_interval_minutes",

            "next_vital_due",

            "recorded_by",

            "vital_signs_note"

        ],

        order_by=
            "creation desc",

        limit_page_length=
            0

    )


    # =====================================
    # العلامات الحيوية للزيارة المختارة
    #
    # الربط:
    # 1. encounter
    # 2. أو er_intake
    # =====================================

    selected_vitals = [

        row

        for row in all_vitals

        if (

            row.get("encounter") == selected

            or

            (

                selected_intake

                and

                row.get("er_intake") ==
                    selected_intake

            )

        )

    ]


    # =====================================
    # العلامات الحيوية للزيارة الحالية
    # =====================================

    current_intake = (

        current_encounter.er_patient_intake

    )


    current_vitals = [

        row

        for row in all_vitals

        if (

            row.get("encounter") == encounter

            or

            (

                current_intake

                and

                row.get("er_intake") ==
                    current_intake

            )

        )

    ]


    # =====================================
    # Patient Medical Record
    # السجل الطبي العام للمريض
    # =====================================

    medical_records = frappe.get_all(

        "Patient Medical Record",

        filters={

            "patient":
                patient

        },

        fields=[

            "name",

            "patient",

            "status",

            "subject",

            "communication_date",

            "reference_doctype",

            "reference_name",

            "reference_owner",

            "user"

        ],

        order_by=
            "communication_date desc",

        limit_page_length=
            0

    )


    # =====================================
    # Patient Medical Record
    # المرتبط بالزيارة المختارة
    # =====================================

    selected_medical_records = []


    for record in medical_records:

        reference_doctype = (

            record.get(
                "reference_doctype"
            )

        )


        reference_name = (

            record.get(
                "reference_name"
            )

        )


        if (

            reference_doctype ==
            "Patient Encounter"

            and

            reference_name ==
            selected

        ):

            selected_medical_records.append(

                record

            )


        elif (

            reference_doctype ==
            "Vital Signs"

            and

            reference_name

        ):

            vital_encounter = (

                frappe.db.get_value(

                    "Vital Signs",

                    reference_name,

                    "encounter"

                )

            )


            vital_er_intake = (

                frappe.db.get_value(

                    "Vital Signs",

                    reference_name,

                    "er_intake"

                )

            )


            if (

                vital_encounter == selected

                or

                (

                    selected_intake

                    and

                    vital_er_intake ==
                        selected_intake

                )

            ):

                selected_medical_records.append(

                    record

                )


    # =====================================
    # Clinical Notes
    # الملاحظات السريرية
    # =====================================

    clinical_notes = frappe.get_all(

        "Clinical Note",

        filters={

            "patient":
                patient

        },

        fields=[

            "name",

            "patient",

            "gender",

            "blood_group",

            "clinical_note_type",

            "posting_date",

            "practitioner",

            "user",

            "note",

            "reference_doc",

            "reference_name"

        ],

        order_by=
            "posting_date desc",

        limit_page_length=
            0

    )


    # =====================================
    # Clinical Notes للزيارة المختارة
    # =====================================

    selected_clinical_notes = [

        row

        for row in clinical_notes

        if (

            row.get(
                "reference_name"
            )
            ==
            selected

        )

    ]


    # =====================================
    # Medication Requests
    # طلبات الأدوية
    # =====================================

    medication_requests = frappe.get_all(

        "Medication Request",

        filters={

            "patient":
                patient

        },

        fields=[

            "name",

            "title",

            "medication",

            "medication_item",

            "order_date",

            "expected_date",

            "order_time",

            "status",

            "patient",

            "patient_name",

            "practitioner",

            "practitioner_name",

            "medical_department",

            "order_group",

            "quantity",

            "dosage_form",

            "dosage",

            "order_description",

            "priority",

            "intent"

        ],

        order_by=
            "creation desc",

        limit_page_length=
            0

    )


    # =====================================
    # Medication Requests للزيارة المختارة
    # =====================================

    selected_medication_requests = [

        row

        for row in medication_requests

        if row.get(
            "order_group"
        ) == selected

    ]


    # =====================================
    # Lab Tests
    # الفحوصات المخبرية
    # =====================================

    lab_tests = frappe.get_all(

        "Lab Test",

        filters={

            "patient":
                patient

        },

        fields=[

            "name",

            "lab_test_name",

            "lab_test_group",

            "status",

            "date",

            "time",

            "submitted_date",

            "result_date",

            "expected_result_date",

            "patient",

            "patient_name",

            "practitioner",

            "practitioner_name",

            "requesting_department",

            "service_request",

            "inpatient_record"

        ],

        order_by=
            "date desc, time desc",

        limit_page_length=
            0

    )


    # =====================================
    # Lab Tests المرتبطة مباشرة بالزيارة
    # =====================================

    selected_lab_tests = []


    for lab in lab_tests:

        service_request = (

            lab.get(
                "service_request"
            )

        )


        if service_request:

            if frappe.db.exists(

                "DocType",

                "Service Request"

            ):

                reference_encounter = (

                    frappe.db.get_value(

                        "Service Request",

                        service_request,

                        "order_group"

                    )

                )


                if (

                    reference_encounter ==
                    selected

                ):

                    selected_lab_tests.append(

                        lab

                    )


        if lab.get(
            "inpatient_record"
        ):

            admission_encounter = (

                frappe.db.get_value(

                    "Inpatient Record",

                    lab.get(
                        "inpatient_record"
                    ),

                    "admission_encounter"

                )

            )


            if (
                admission_encounter ==
                selected
            ):

                if lab not in selected_lab_tests:

                    selected_lab_tests.append(

                        lab

                    )


    # =====================================
    # Inpatient Records
    # سجل التنويم
    # =====================================

    inpatient_records = frappe.get_all(

        "Inpatient Record",

        filters={

            "patient":
                patient

        },

        fields=[

            "name",

            "patient",

            "patient_name",

            "status",

            "scheduled_date",

            "admitted_datetime",

            "expected_discharge",

            "admission_encounter",

            "admission_practitioner",

            "medical_department",

            "primary_practitioner",

            "secondary_practitioner",

            "discharge_datetime",

            "discharge_encounter",

            "discharge_instructions",

            "followup_date",

            "discharge_note"

        ],

        order_by=
            "creation desc",

        limit_page_length=
            0

    )


    # =====================================
    # Inpatient Records للزيارة المختارة
    # =====================================

    selected_inpatient_records = [

        row

        for row in inpatient_records

        if (

            row.get(
                "admission_encounter"
            )
            ==
            selected

            or

            row.get(
                "discharge_encounter"
            )
            ==
            selected

        )

    ]


    # =====================================
    # النتيجة النهائية
    # =====================================

    return {

        "status":
            "success",


        # ---------------------------------
        # معلومات المريض
        # ---------------------------------

        "patient":
            patient,

        "patient_name":
            patient_name,


        # ---------------------------------
        # الزيارة
        # ---------------------------------

        "current_encounter":
            encounter,

        "selected_encounter":
            selected,

        "visits":
            visits,


        # ---------------------------------
        # العلامات الحيوية
        # ---------------------------------

        "all_vitals":
            all_vitals,

        "selected_vitals":
            selected_vitals,

        "current_vitals":
            current_vitals,


        # ---------------------------------
        # التاريخ الطبي
        # ---------------------------------

        "medical_history": {

            "patient_medical_records":
                medical_records,

            "selected_patient_medical_records":
                selected_medical_records,

            "clinical_notes":
                clinical_notes,

            "selected_clinical_notes":
                selected_clinical_notes,

            "medication_requests":
                medication_requests,

            "selected_medication_requests":
                selected_medication_requests,

            "lab_tests":
                lab_tests,

            "selected_lab_tests":
                selected_lab_tests,

            "inpatient_records":
                inpatient_records,

            "selected_inpatient_records":
                selected_inpatient_records

        }

    }
