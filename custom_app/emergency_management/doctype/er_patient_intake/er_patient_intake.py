import frappe
from frappe.model.document import Document
from frappe.utils import date_diff, getdate, now_datetime

from custom_app.emergency_management.utils.bed import (
    set_patient_intake_bed,
)


class ERPatientIntake(Document):

    def validate(self):

        # تغيير أو تعيين أو إخلاء السرير يتطلب
        # صلاحية WRITE على ER Bed.
        #
        # المسارات الداخلية التي تستخدم
        # ignore_permissions=True تستمر بالعمل.
        bed_changed = (
            (
                self.is_new()
                and bool(self.assigned_bed)
            )
            or self.has_value_changed(
                "assigned_bed"
            )
        )

        if (
            bed_changed
            and not self.flags.ignore_permissions
            and not frappe.has_permission(
                "ER Bed",
                "write"
            )
        ):
            frappe.throw(
                "ليس لديك صلاحية لتعيين أو تغيير السرير."
            )

        if self.is_new() and self.patient:

            from frappe.utils import add_to_date

            twenty_four_hours_ago = add_to_date(now_datetime(), hours=-24)

            recent_visit = frappe.db.get_value(
                "ER Patient Intake",
                {
                    "patient": self.patient,
                    "visit_date_time": [">=", twenty_four_hours_ago],
                    "name": ["!=", self.name],
                },
                "name",
            )

            if recent_visit:
                frappe.throw(
                    "لا يمكن إنشاء زيارة طوارئ جديدة للمريض قبل مرور 24 ساعة على الزيارة السابقة."
                )

    def on_update(self):

        # assigned_bed هو المصدر الموحد للسرير.
        # أي تعيين أو تغيير أو إخلاء يمر عبر نفس خدمة السرير
        # حتى يتم تحديث ER Bed وER Patient Intake معًا.
        if not self.has_value_changed("assigned_bed"):
            return

        set_patient_intake_bed(
            self.name,
            self.assigned_bed or None,
        )


@frappe.whitelist()
def start_triage(intake_name):

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    # منع إنشاء Vital Signs مكرر.
    # إذا كانت الزيارة ما زالت "وصل للطوارئ"، أكمل انتقال
    # بداية الترياق عبر الـWorkflow قبل إعادة السجل الموجود.
    if intake.triage_record:
        if intake.status == "وصل للطوارئ":
            from custom_app.emergency_management.api.er_visit_workflow import (
                transition_er_visit,
            )

            transition_er_visit(
                intake.name,
                "تحت الفرز",
            )

        return intake.triage_record

    existing_vital = frappe.db.exists(
        "Vital Signs",
        {
            "er_intake": intake.name
        }
    )

    if existing_vital:

        frappe.db.set_value(
            "ER Patient Intake",
            intake.name,
            "triage_record",
            existing_vital
        )

        # Vital Signs موجودة مسبقًا؛ لا ننشئ نسخة ثانية.
        # إذا كانت الزيارة ما زالت "وصل للطوارئ"، ننفذ
        # الانتقال الرسمي إلى "تحت الفرز".
        if intake.status == "وصل للطوارئ":
            from custom_app.emergency_management.api.er_visit_workflow import (
                transition_er_visit,
            )

            transition_er_visit(
                intake.name,
                "تحت الفرز",
            )

        return existing_vital

    vital = frappe.new_doc(
        "Vital Signs"
    )

    # بيانات المريض
    vital.patient = intake.patient

    if intake.get("اسم_المريض"):
        vital.patient_name = intake.get(
            "اسم_المريض"
        )

    # ربط استقبال الطوارئ
    vital.er_intake = intake.name

    # ربط Patient Encounter
    if intake.patient_encounter:
        vital.encounter = (
            intake.patient_encounter
        )

    now = frappe.utils.now_datetime()

    vital.signs_date = now.date()
    vital.signs_time = now.time()

    vital.vital_signs_note = (
        "Emergency Triage"
    )

    vital.triage_notes = (
        "تم إنشاء العلامات الحيوية من استقبال الطوارئ"
    )

    vital.insert(
        ignore_permissions=True
    )

    frappe.db.set_value(
        "ER Patient Intake",
        intake.name,
        {
            "triage_record": vital.name,
            "last_status_update": now
        },
        update_modified=False
    )

    # الحالة التشغيلية لزيارة الطوارئ تمر عبر الـWorkflow المركزي.
    if intake.status == "وصل للطوارئ":
        from custom_app.emergency_management.api.er_visit_workflow import (
            transition_er_visit,
        )

        transition_er_visit(
            intake.name,
            "تحت الفرز",
        )

    frappe.db.commit()

    return vital.name




@frappe.whitelist()
def save_initial_triage_values(
    intake_name,
    values=None
):
    """
    Update the Vital Signs record already linked to the
    ER Patient Intake.

    Never create a second Vital Signs record.
    """

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    if not intake.triage_record:
        frappe.throw(
            "لا يوجد سجل فرز مرتبط بهذه الزيارة."
        )

    vital = frappe.get_doc(
        "Vital Signs",
        intake.triage_record
    )

    if vital.docstatus != 0:
        frappe.throw(
            "سجل الفرز المرتبط معتمد بالفعل."
        )

    if isinstance(values, str):
        values = frappe.parse_json(values)

    values = values or {}

    # ---------------------------------------------------------
    # ER BED
    #
    # assigned_bed belongs to ER Patient Intake, not Vital Signs.
    # Keep ER Patient Intake as the canonical bed source and
    # synchronize the physical ER Bed through the central service.
    # ---------------------------------------------------------

    if "assigned_bed" in values:

        if not frappe.has_permission(
            "ER Bed",
            "write"
        ):
            frappe.throw(
                "ليس لديك صلاحية لتعيين أو تغيير السرير."
            )

        from custom_app.emergency_management.utils.bed import (
            set_patient_intake_bed,
        )

        set_patient_intake_bed(
            intake.name,
            values.get("assigned_bed") or None,
        )

        intake.reload()

    allowed_fields = [
        "signs_date",
        "signs_time",
        "temperature",
        "pulse",
        "respiratory_rate",
        "bp_systolic",
        "bp_diastolic",
        "bp",
        "tongue",
        "abdomen",
        "reflexes",
        "height",
        "weight",
        "bmi",
        "nutrition_note",
        "vital_signs_note",
        "spo2",
        "custom_blood_glucose",
        "esi_level",
        "triage_nurse",
        "triage_notes"
    ]

    meta = frappe.get_meta(
        "Vital Signs"
    )

    for fieldname in allowed_fields:

        if not meta.has_field(fieldname):
            continue

        if fieldname not in values:
            continue

        value = values.get(fieldname)

        if value is not None and value != "":
            vital.set(
                fieldname,
                value
            )

    vital.save(
        ignore_permissions=True
    )

    return vital.as_dict()


@frappe.whitelist()
def submit_initial_triage(
    intake_name
):
    """
    Submit the same Vital Signs record linked to this visit,
    then perform the central ER workflow transition:

        تحت الفرز -> بانتظار الطبيب
    """

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    if not intake.triage_record:
        frappe.throw(
            "لا يوجد سجل فرز مرتبط بهذه الزيارة."
        )

    vital = frappe.get_doc(
        "Vital Signs",
        intake.triage_record
    )

    if vital.docstatus == 0:
        vital.submit()

    intake.reload()

    if intake.status == "تحت الفرز":

        from custom_app.emergency_management.api.er_visit_workflow import (
            transition_er_visit,
        )

        transition_er_visit(
            intake.name,
            "بانتظار الطبيب"
        )

        intake.reload()

    frappe.db.commit()

    return vital.as_dict()


# ============================================================
# ER_ROLE_DOCTOR_HELPER_V2
# ============================================================

def _resolve_er_doctor_by_role(intake):
    """
    Resolve missing doctor according to the logged-in user's role.

    Priority:
    1. Existing doctor on ER Patient Intake.
    2. Healthcare Practitioner linked to current user.
    3. Healthcare Practitioner linked to current user's Employee.
    4. Exactly one available practitioner.
    """

    existing_doctor = (
        intake.get("healthcare_practitioner")
        or intake.get("assigned_doctor")
    )

    if existing_doctor:
        return existing_doctor

    current_user = frappe.session.user

    roles = set(frappe.get_roles(current_user) or [])

    doctor_roles = {
        "ER Doctor",
        "Physician",
        "Healthcare Practitioner",
    }

    if not roles.intersection(doctor_roles):
        frappe.throw(
            "لا يمكن إنشاء زيارة الطبيب. "
            "المستخدم الحالي لا يملك دور الطبيب "
            "(Physician / Healthcare Practitioner)."
        )

    practitioner = None

    hp_meta = frappe.get_meta("Healthcare Practitioner")

    # --------------------------------------------------------
    # 1. Direct user_id mapping
    # --------------------------------------------------------

    if hp_meta.has_field("user_id"):

        practitioner = frappe.db.get_value(
            "Healthcare Practitioner",
            {"user_id": current_user},
            "name"
        )

    # --------------------------------------------------------
    # 2. Employee mapping
    # --------------------------------------------------------

    if not practitioner and hp_meta.has_field("employee"):

        employee = frappe.db.get_value(
            "Employee",
            {
                "user_id": current_user,
                "status": "Active",
            },
            "name"
        )

        if employee:

            practitioner = frappe.db.get_value(
                "Healthcare Practitioner",
                {"employee": employee},
                "name"
            )

    # --------------------------------------------------------
    # 3. Only one practitioner in the system
    # --------------------------------------------------------

    if not practitioner:

        practitioners = frappe.get_all(
            "Healthcare Practitioner",
            fields=["name"],
            limit_page_length=2,
            order_by="name asc"
        )

        if len(practitioners) == 1:
            practitioner = practitioners[0].name

    # --------------------------------------------------------
    # No valid doctor
    # --------------------------------------------------------

    if not practitioner:

        frappe.throw(
            "المستخدم الحالي يحمل دور الطبيب، "
            "لكن لم يتم العثور على Healthcare Practitioner مرتبط "
            "بهذا المستخدم، ويوجد أكثر من طبيب يمكن الاختيار بينهم."
        )

    return practitioner

@frappe.whitelist()
def create_er_patient_encounter(intake_name):

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    # ========================================================
    # DOCTOR SOURCE
    # The doctor is selected explicitly from the existing
    # "الطبيب المعالج" field on ER Patient Intake.
    # ========================================================

    doctor = (
        intake.get("healthcare_practitioner")
        or ""
    )

    if not doctor:
        frappe.throw(
            "يجب اختيار الطبيب المعالج من بيانات الزيارة أولًا."
        )

    if not frappe.db.exists(
        "Healthcare Practitioner",
        doctor
    ):
        frappe.throw(
            "الطبيب المعالج المختار غير موجود في Healthcare Practitioner."
        )

    # Keep the existing assigned_doctor field synchronized
    # with the doctor selected in healthcare_practitioner.
    if frappe.get_meta(
        "ER Patient Intake"
    ).has_field("assigned_doctor"):

        frappe.db.set_value(
            "ER Patient Intake",
            intake.name,
            "assigned_doctor",
            doctor
        )

        intake.assigned_doctor = doctor

    # حفظ الطبيب المكتشف تلقائيًا في زيارة الطوارئ
    intake_meta = frappe.get_meta(
        "ER Patient Intake",
        cached=False
    )

    intake_updates = {}

    if intake_meta.has_field(
        "healthcare_practitioner"
    ) and not intake.get(
        "healthcare_practitioner"
    ):

        intake_updates[
            "healthcare_practitioner"
        ] = doctor

    if intake_meta.has_field(
        "assigned_doctor"
    ) and not intake.get(
        "assigned_doctor"
    ):

        intake_updates[
            "assigned_doctor"
        ] = doctor

    if intake_updates:

        frappe.db.set_value(
            "ER Patient Intake",
            intake.name,
            intake_updates
        )

        for fieldname, value in intake_updates.items():
            intake.set(
                fieldname,
                value
            )

    # ========================================================
    # 1. إذا كان الـIntake مرتبطًا أصلًا بـEncounter
    #    نعيد نفس الزيارة ولا ننشئ واحدة جديدة
    # ========================================================

    if intake.patient_encounter:

        if frappe.db.exists(
            "Patient Encounter",
            intake.patient_encounter
        ):

            return intake.patient_encounter

        # الرابط موجود لكنه يشير إلى سجل غير موجود
        intake.patient_encounter = None


    # ========================================================
    # 2. حماية إضافية:
    #    قد يكون Patient Encounter موجودًا ويشير إلى الـIntake
    #    بينما patient_encounter داخل الـIntake فارغ
    # ========================================================

    existing = frappe.get_all(
        "Patient Encounter",
        filters={
            "er_patient_intake": intake.name
        },
        fields=["name"],
        order_by="creation desc",
        limit_page_length=1
    )

    if existing:

        encounter_name = existing[0].name

        frappe.db.set_value(
            "ER Patient Intake",
            intake.name,
            "patient_encounter",
            encounter_name
        )

        frappe.db.commit()

        return encounter_name


    # ========================================================
    # 3. إنشاء Encounter جديد فقط عند عدم وجود أي Encounter
    # ========================================================

    encounter = frappe.new_doc(
        "Patient Encounter"
    )

    # مرحلة الطوارئ عند دخول الطبيب
    encounter.status = (
        "Open"
    )

    # =========================
    # بيانات المريض
    # =========================

    encounter.patient = intake.patient

    if intake.get("اسم_المريض"):
        encounter.patient_name = (
            intake.get("اسم_المريض")
        )

    # =========================
    # بيانات Patient
    # =========================

    if intake.patient:

        patient_data = frappe.db.get_value(
            "Patient",
            intake.patient,
            [
                "sex",
                "dob",
            ],
            as_dict=True
        )

        if patient_data:

            if patient_data.sex:
                encounter.patient_sex = (
                    patient_data.sex
                )

            if patient_data.dob:

                try:

                    dob = getdate(
                        patient_data.dob
                    )

                    today = now_datetime().date()

                    age_days = date_diff(
                        today,
                        dob
                    )

                    if age_days >= 0:

                        years = (
                            age_days // 365
                        )

                        encounter.patient_age = str(
                            years
                        )

                except Exception:
                    pass

    # =========================
    # ربط زيارة الطوارئ
    # =========================

    encounter.er_patient_intake = (
        intake.name
    )

    # =========================
    # الطبيب
    # =========================

    encounter.practitioner = (
        doctor
    )

    encounter.practitioner_name = (
        frappe.db.get_value(
            "Healthcare Practitioner",
            doctor,
            "practitioner_name"
        )
    )

    # =========================
    # القسم
    # =========================

    if intake.department:

        encounter.medical_department = (
            intake.department
        )

    # =========================
    # التاريخ والوقت
    # =========================

    now = frappe.utils.now_datetime()

    encounter.encounter_date = (
        now.date()
    )

    encounter.encounter_time = (
        now.time()
    )

    # =========================
    # المرجع
    # =========================

    encounter.reference_doctype = (
        "ER Patient Intake"
    )

    encounter.reference_name = (
        intake.name
    )

    encounter.insert(
        ignore_permissions=True
    )

    frappe.db.set_value(
        "ER Patient Intake",
        intake.name,
        "patient_encounter",
        encounter.name,
        update_modified=False
    )

    frappe.db.commit()

    return encounter.name

@frappe.whitelist()

def _ensure_doctor_visit_workflow_state(intake_name):
    """
    Canonical doctor entry point.

    ER Patient Intake is the workflow source of truth:
        بانتظار الطبيب -> قيد الفحص

    Patient Encounter receives the mapped projection:
        قيد الفحص -> مع الطبيب
    """
    from custom_app.emergency_management.api.er_visit_workflow import (
        transition_er_visit,
        sync_encounter_status,
    )

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name,
    )

    # Already correct: nothing else is required.
    if intake.status == "قيد الفحص":
        # Intake is already at the canonical doctor stage.
        # Ensure the Patient Encounter projection is synchronized.
        sync_encounter_status(
            intake,
            "قيد الفحص",
        )
        frappe.db.commit()
        intake.reload()
        return intake

    if intake.status != "بانتظار الطبيب":
        frappe.throw(
            "لا يمكن فتح زيارة الطبيب من الحالة الحالية: {0}".format(
                intake.status
            )
        )

    transition_er_visit(
        intake.name,
        "قيد الفحص",
    )

    return frappe.get_doc(
        "ER Patient Intake",
        intake.name,
    )

@frappe.whitelist()
def create_doctor_visit(intake_name):

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    # إذا كانت هناك زيارة مرتبطة مسبقًا:
    # لا تنشئ زيارة جديدة، فقط انقلها إلى مرحلة الطبيب.
    if intake.patient_encounter:

        if frappe.db.exists(
            "Patient Encounter",
            intake.patient_encounter
        ):

            encounter = frappe.get_doc(
                "Patient Encounter",
                intake.patient_encounter
            )

            selected_doctor = (
                intake.get("healthcare_practitioner")
                or ""
            )

            if not selected_doctor:
                frappe.throw(
                    "يجب اختيار الطبيب المعالج من بيانات الزيارة أولًا."
                )

            if not frappe.db.exists(
                "Healthcare Practitioner",
                selected_doctor
            ):
                frappe.throw(
                    "الطبيب المعالج المختار غير موجود في Healthcare Practitioner."
                )

            encounter.practitioner = selected_doctor

            if encounter.meta.has_field(
                "practitioner_name"
            ):
                encounter.practitioner_name = (
                    frappe.db.get_value(
                        "Healthcare Practitioner",
                        selected_doctor,
                        "practitioner_name"
                    )
                )

            encounter.status = (
                "Open"
            )

            if encounter.meta.has_field(
                "reference_doctype"
            ):
                encounter.reference_doctype = (
                    "ER Patient Intake"
                )

            if encounter.meta.has_field(
                "reference_name"
            ):
                encounter.reference_name = (
                    intake.name
                )

            encounter.save(
                ignore_permissions=True
            )

            frappe.db.commit()

            _ensure_doctor_visit_workflow_state(
                intake.name
            )

            return encounter.name

        # الرابط قديم أو يشير إلى سجل محذوف
        intake.patient_encounter = None


    encounter_name = create_er_patient_encounter(
        intake_name
    )

    _ensure_doctor_visit_workflow_state(
        intake_name
    )

    return encounter_name


@frappe.whitelist()
def create_doctor_appointment(intake_name):

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    if intake.patient_encounter:
        return intake.patient_encounter

    return create_er_patient_encounter(
        intake_name
    )

@frappe.whitelist()
def save_doctor_assessment(encounter, intake_data=None):
    """
    Save the physician assessment through a controlled server path.

    The client-side doctor workspace previously passed the whole
    Patient Encounter through frappe.client.save(), where
    er_visit_status could arrive as {}. This method normalizes the
    workflow state before the Encounter is saved.
    """
    if isinstance(encounter, str):
        encounter = frappe.parse_json(encounter)

    if not isinstance(encounter, dict):
        frappe.throw("بيانات تقييم الطبيب غير صالحة.")

    if isinstance(intake_data, str):
        intake_data = frappe.parse_json(intake_data)

    if intake_data is None:
        intake_data = {}

    if not isinstance(intake_data, dict):
        frappe.throw("بيانات قرار زيارة الطوارئ غير صالحة.")

    encounter_name = encounter.get("name")
    if not encounter_name:
        frappe.throw("لا يوجد Patient Encounter للحفظ.")

    doc = frappe.get_doc("Patient Encounter", encounter_name)

    intake_name = doc.get("er_patient_intake")

    if not intake_name:
        frappe.throw(
            "لا يوجد ER Patient Intake مرتبط بزيارة الطبيب."
        )

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name
    )

    # Move only through the real ER Workflow.
    from custom_app.emergency_management.api.er_visit_workflow import (
        transition_er_visit,
        sync_encounter_status,
    )

    if intake.status == "بانتظار الطبيب":
        transition_er_visit(
            intake.name,
            "قيد الفحص",
        )

        intake = frappe.get_doc(
            "ER Patient Intake",
            intake.name
        )

    if intake.status != "قيد الفحص":
        frappe.throw(
            "لا يمكن حفظ تقييم الطبيب لأن حالة زيارة الطوارئ الحالية هي: {0}".format(
                intake.status
            )
        )

    # Patient Encounter projection is owned by the ER workflow.
    sync_encounter_status(
        intake,
        "قيد الفحص",
    )

    # تعيين السرير من الطبيب يمر عبر نفس مسار السرير المركزي.
    # لا نغيّر Workflow أو disposition هنا.
    if "assigned_bed" in intake_data:

        if not frappe.has_permission(
            "ER Bed",
            "write"
        ):
            frappe.throw(
                "ليس لديك صلاحية لتعيين أو تغيير السرير."
            )

        from custom_app.emergency_management.utils.bed import (
            set_patient_intake_bed,
        )

        set_patient_intake_bed(
            intake.name,
            intake_data.get("assigned_bed") or None,
        )

        intake = frappe.get_doc(
            "ER Patient Intake",
            intake.name
        )

    doc.reload()

    if "er_doctor_notes" in encounter:
        doc.er_doctor_notes = encounter.get("er_doctor_notes") or ""

    if "encounter_comment" in encounter:
        doc.encounter_comment = encounter.get("encounter_comment") or ""

    # Symptoms
    if isinstance(encounter.get("symptoms"), list):
        doc.set("symptoms", [])
        for item in encounter.get("symptoms") or []:
            complaint = ""
            if isinstance(item, str):
                complaint = item
            elif isinstance(item, dict):
                complaint = item.get("complaint") or item.get("name") or ""

            if complaint:
                doc.append(
                    "symptoms",
                    {
                        "complaint": complaint
                    }
                )

    # Diagnosis
    if isinstance(encounter.get("diagnosis"), list):
        doc.set("diagnosis", [])
        for item in encounter.get("diagnosis") or []:
            diagnosis = ""
            if isinstance(item, str):
                diagnosis = item
            elif isinstance(item, dict):
                diagnosis = (
                    item.get("diagnosis")
                    or item.get("name")
                    or ""
                )

            if diagnosis:
                doc.append(
                    "diagnosis",
                    {
                        "diagnosis": diagnosis
                    }
                )

    # Clinical notes
    if isinstance(encounter.get("er_clinical_notes"), list):
        existing_notes = []

        for item in encounter.get("er_clinical_notes") or []:
            if not isinstance(item, dict):
                continue

            row = {
                "note": item.get("note") or "",
                "note_type": item.get("note_type") or "Clinical Note",
                "practitioner": item.get("practitioner") or doc.practitioner or "",
                "department": item.get("department") or doc.medical_department or "",
            }

            if item.get("note_time"):
                row["note_time"] = item.get("note_time")

            if item.get("user"):
                row["user"] = item.get("user")

            if row["note"]:
                existing_notes.append(row)

        meta = frappe.get_meta("Patient Encounter")
        if meta.has_field("er_clinical_notes"):
            doc.set("er_clinical_notes", [])
            for row in existing_notes:
                doc.append("er_clinical_notes", row)

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return doc.as_dict()
