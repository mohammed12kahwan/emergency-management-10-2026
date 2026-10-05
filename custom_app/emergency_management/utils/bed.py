import frappe


def get_available_bed_status():
    status = frappe.db.get_value(
        "ER Bed Status",
        {"status_type": "Available", "is_active": 1},
        ["code", "name"],
        as_dict=True,
    )
    if not status:
        frappe.throw(
            "لا يمكن تحديد حالة السرير المتاحة. يرجى تكوين ER Bed Status بنوع 'Available'."
        )
    return status.code or status.name


def get_occupied_bed_status():
    status = frappe.db.get_value(
        "ER Bed Status",
        {"status_type": "Occupied", "is_active": 1},
        ["code", "name"],
        as_dict=True,
    )
    if not status:
        frappe.throw(
            "لا يمكن تحديد حالة السرير المشغول. يرجى تكوين ER Bed Status بنوع 'Occupied'."
        )
    return status.code or status.name


def get_active_bed_assignment(patient):
    if not patient:
        return None

    intake = frappe.db.get_value(
        "ER Patient Intake",
        {
            "patient": patient,
            "assigned_bed": ["is", "set"],
        },
        ["assigned_bed", "name"],
        as_dict=True,
    )

    if intake and intake.assigned_bed:
        bed_patient = frappe.db.get_value(
            "ER Bed",
            intake.assigned_bed,
            "current_patient",
        )
        if bed_patient == patient:
            return intake.assigned_bed

    bed_name = frappe.db.get_value(
        "ER Bed",
        {
            "current_patient": patient,
            "is_active": 1,
        },
        "name",
    )

    return bed_name


def validate_bed_available(bed_name):
    if not bed_name:
        frappe.throw("يرجى تحديد السرير.")

    bed = frappe.get_doc("ER Bed", bed_name)

    if not bed.is_active:
        frappe.throw("السرير {} غير فعال.".format(bed_name))

    if bed.current_patient:
        frappe.throw("السرير {} مشغول حالياً بمريض آخر.".format(bed_name))

    if bed.current_intake:
        frappe.throw("السرير {} مرتبط بزيارة طوارئ أخرى.".format(bed_name))

    if bed.current_observation:
        frappe.throw("السرير {} مرتبط بملاحظة حالية.".format(bed_name))

    available_status = get_available_bed_status()

    if bed.bed_status != available_status:
        frappe.throw(
            "السرير {} ليس في حالة متاحة (الحالة الحالية: {}).".format(
                bed_name,
                bed.bed_status,
            )
        )


def validate_patient_has_no_active_bed(patient, exclude_intake=None):
    if not patient:
        return

    active_bed = get_active_bed_assignment(patient)

    if not active_bed:
        return

    if exclude_intake:
        intake_name = frappe.db.get_value(
            "ER Bed",
            active_bed,
            "current_intake",
        )
        if intake_name == exclude_intake:
            return

    frappe.throw(
        "المريض لديه سرير نشط بالفعل: {}. لا يمكن تخصيص سرير آخر قبل إخلاء السرير الحالي.".format(
            active_bed
        )
    )


def _release_intake_bed(bed_name):
    if not bed_name:
        return

    bed = frappe.get_doc("ER Bed", bed_name)

    bed.current_patient = None
    bed.current_intake = None

    if hasattr(bed, "current_observation"):
        bed.current_observation = None

    bed.bed_status = get_available_bed_status()

    if hasattr(bed, "current_service"):
        bed.current_service = "None"

    if hasattr(bed, "released_time"):
        bed.released_time = frappe.utils.now()

    bed.save(ignore_permissions=True)


def set_patient_intake_bed(intake_name, bed_name=None):
    """
    المصدر الموحد لتعيين/تغيير/إخلاء سرير زيارة الطوارئ.

    القواعد:
    - نفس الزيارة تحتفظ بمصدر واحد للسرير: ER Patient Intake.assigned_bed.
    - سرير ER Bed يثبت الإشغال الفعلي.
    - لا يمكن لمريض أن يشغل سريرين نشطين.
    - تغيير السرير يحرر القديم ثم يحجز الجديد داخل نفس المعاملة.
    - لا يغيّر Workflow أو disposition.
    """

    if not intake_name:
        frappe.throw("لا توجد زيارة طوارئ لتعيين السرير لها.")

    # قفل الزيارة لمنع تعيينين متزامنين لنفس الزيارة.
    frappe.db.sql(
        """
        SELECT name
        FROM `tabER Patient Intake`
        WHERE name = %(intake)s
        FOR UPDATE
        """,
        {"intake": intake_name},
    )

    intake = frappe.get_doc(
        "ER Patient Intake",
        intake_name,
    )

    patient = intake.patient

    # قفل الأسرة المرتبطة حاليًا بهذه الزيارة.
    current_rows = frappe.db.sql(
        """
        SELECT name
        FROM `tabER Bed`
        WHERE current_intake = %(intake)s
        ORDER BY name
        FOR UPDATE
        """,
        {"intake": intake_name},
        as_dict=False,
    )

    current_beds = [row[0] for row in current_rows]

    requested_bed = (bed_name or "").strip()

    # لا يوجد تغيير فعلي.
    if requested_bed and requested_bed in current_beds:
        target = frappe.get_doc(
            "ER Bed",
            requested_bed,
        )

        if (
            target.current_patient
            and target.current_patient != patient
        ):
            frappe.throw(
                "السرير {} مرتبط بمريض آخر بالفعل.".format(
                    requested_bed
                )
            )

        target.current_patient = patient
        target.current_intake = intake_name
        target.bed_status = get_occupied_bed_status()
        target.save(ignore_permissions=True)

        frappe.db.set_value(
            "ER Patient Intake",
            intake_name,
            {
                "assigned_bed": requested_bed,
                "waiting_area": (
                    target.waiting_area
                    or target.current_location
                    or ""
                ),
            },
            update_modified=False,
        )

        return requested_bed

    # إخلاء السرير الحالي.
    if not requested_bed:
        for old_bed in current_beds:
            _release_intake_bed(old_bed)

        frappe.db.set_value(
            "ER Patient Intake",
            intake_name,
            "assigned_bed",
            "",
            update_modified=False,
        )

        return None

    # قفل السرير المطلوب قبل فحصه.
    frappe.db.sql(
        """
        SELECT name
        FROM `tabER Bed`
        WHERE name = %(bed)s
        FOR UPDATE
        """,
        {"bed": requested_bed},
    )

    target = frappe.get_doc(
        "ER Bed",
        requested_bed,
    )

    # إذا كان السرير الحالي لنفس الزيارة لكنه لم يظهر بسبب عدم اتساق البيانات،
    # يسمح بالإصلاح فقط إذا كان لا يخص مريضًا آخر.
    if target.current_intake == intake_name:
        if (
            target.current_patient
            and target.current_patient != patient
        ):
            frappe.throw(
                "السرير {} مرتبط بمريض آخر بالفعل.".format(
                    requested_bed
                )
            )
    else:
        validate_patient_has_no_active_bed(
            patient,
            exclude_intake=intake_name,
        )

        validate_bed_available(
            requested_bed
        )

    # تحرير كل سرير قديم مرتبط بهذه الزيارة.
    for old_bed in current_beds:
        if old_bed != requested_bed:
            _release_intake_bed(old_bed)

    # حجز السرير الجديد.
    target.current_patient = patient
    target.current_intake = intake_name
    target.bed_status = get_occupied_bed_status()

    if hasattr(target, "current_service"):
        target.current_service = "None"

    if hasattr(target, "occupied_time"):
        target.occupied_time = frappe.utils.now()

    target.save(ignore_permissions=True)

    frappe.db.set_value(
        "ER Patient Intake",
        intake_name,
        {
            "assigned_bed": requested_bed,
            "waiting_area": (
                target.waiting_area
                or target.current_location
                or ""
            ),
            "last_status_update": frappe.utils.now_datetime(),
        },
        update_modified=False,
    )

    return requested_bed


@frappe.whitelist()
def search_available_beds(
    doctype,
    txt,
    searchfield,
    start,
    page_len,
    filters=None,
):
    """
    Link query موحد للسرير.

    يعرض:
    - الأسرة الفعالة والمتاحة فعليًا فقط.
    - السرير الحالي لهذه الزيارة، حتى يبقى ظاهرًا للطبيب/الترياج.
    """

    if not frappe.has_permission("ER Bed", "read"):
        frappe.throw("ليس لديك صلاحية قراءة الأسرة.")

    if isinstance(filters, str):
        filters = frappe.parse_json(filters)

    filters = filters or {}

    intake_name = filters.get("intake") or ""

    current_bed = ""
    if intake_name:
        current_bed = (
            frappe.db.get_value(
                "ER Patient Intake",
                intake_name,
                "assigned_bed",
            )
            or ""
        )

    allowed_searchfields = {
        "name",
        "bed_code",
        "arabic_name",
    }

    if searchfield not in allowed_searchfields:
        searchfield = "name"

    available_status = get_available_bed_status()

    return frappe.db.sql(
        """
        SELECT
            b.name,
            COALESCE(
                NULLIF(b.arabic_name, ''),
                NULLIF(b.bed_code, ''),
                b.name
            )
        FROM `tabER Bed` b
        WHERE
            b.is_active = 1
            AND (
                b.name = %(current_bed)s
                OR (
                    b.bed_status = %(available_status)s
                    AND b.current_patient IS NULL
                    AND b.current_intake IS NULL
                    AND b.current_observation IS NULL
                )
            )
            AND b.`{searchfield}` LIKE %(txt)s
        ORDER BY
            b.arabic_name ASC,
            b.bed_code ASC,
            b.name ASC
        LIMIT %(start)s, %(page_len)s
        """.format(searchfield=searchfield),
        {
            "current_bed": current_bed,
            "available_status": available_status,
            "txt": "%{}%".format(txt or ""),
            "start": frappe.utils.cint(start),
            "page_len": frappe.utils.cint(page_len),
        },
    )
