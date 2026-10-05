import json

import frappe
from frappe.utils import nowdate, nowtime


# =====================================================
# أدوات مساعدة
# =====================================================

def get_lab_test_template(item_code):
    """
    جلب قالب المختبر المطابق مباشرة لـ Item.
    يجب أن يكون هناك Template نشط واحد فقط.
    """

    if not item_code:
        frappe.throw(
            "لم يتم تحديد Item الخاص بالفحص"
        )

    templates = frappe.get_all(
        "Lab Test Template",
        filters={
            "item": item_code,
            "disabled": 0,
        },
        fields=[
            "name",
            "lab_test_name",
            "item",
            "lab_test_code",
            "sample",
            "sample_uom",
            "sample_qty",
            "sample_details",
        ],
        order_by="creation asc",
        limit_page_length=100,
    )

    if not templates:
        frappe.throw(
            "لا يوجد Lab Test Template فعال مرتبط بالخدمة: "
            + str(item_code)
        )

    if len(templates) > 1:
        names = ", ".join(
            str(template.name)
            for template in templates
        )

        frappe.throw(
            "يوجد أكثر من Lab Test Template فعال للخدمة "
            + str(item_code)
            + ". القوالب الموجودة: "
            + names
        )

    return frappe.get_doc(
        "Lab Test Template",
        templates[0].name,
    )


def has_completed_lab_result(request):
    if request.lab_status == "Completed":
        return True

    if not request.lab_test:
        return False

    if frappe.db.get_value("Lab Test", request.lab_test, "status") == "Completed":
        return True

    if frappe.db.exists(
        "Diagnostic Report",
        {
            "ref_doctype": "Lab Test",
            "docname": request.lab_test,
            "status": "Approved",
            "docstatus": ["!=", 2],
        },
    ):
        return True

    sample_collection = frappe.db.get_value(
        "Lab Test", request.lab_test, "sample"
    )
    if not sample_collection:
        return False

    return bool(
        frappe.db.sql(
            """
            SELECT name
            FROM `tabObservation`
            WHERE reference_doctype = 'Sample Collection'
              AND reference_docname = %(sample_collection)s
              AND docstatus != 2
              AND (
                  (result_data IS NOT NULL AND result_data != '')
                  OR (result_text IS NOT NULL AND result_text != '')
                  OR (result_select IS NOT NULL AND result_select != '')
                  OR result_boolean IS NOT NULL
              )
            LIMIT 1
            """,
            {"sample_collection": sample_collection},
        )
    )


def find_active_duplicate_lab_request(
    encounter_name,
    item_code,
    sales_invoice=None,
):
    candidates = frappe.get_all(
        "ER Diagnostic Request",
        filters={
            "patient_encounter": encounter_name,
            "item_code": item_code,
            "request_type": "Laboratory",
            "lab_status": ["not in", ["Completed", "Cancelled"]],
        },
        fields=[
            "name",
            "lab_test",
            "lab_status",
            "sales_invoice",
        ],
        order_by="creation asc",
    )

    for candidate in candidates:
        # طلبات الفواتير المباشرة تُعتبر مكررة فقط
        # إذا كانت مرتبطة بنفس الفاتورة نفسها.
        if sales_invoice:
            if candidate.sales_invoice != sales_invoice:
                continue

        if not has_completed_lab_result(candidate):
            return candidate.name

    return None


def normalize_existing_sample_details(patient, sample):
    if not patient or not sample:
        return

    existing_samples = frappe.get_all(
        "Sample Collection",
        filters={
            "patient": patient,
            "sample": sample,
            "docstatus": 0,
        },
        fields=["name", "sample_details"],
        limit_page_length=100,
    )
    for sample_collection in existing_samples:
        if sample_collection.sample_details is None:
            frappe.db.set_value(
                "Sample Collection",
                sample_collection.name,
                "sample_details",
                "",
                update_modified=False,
            )


@frappe.whitelist()
def search_lab_test_templates(txt=""):
    """Search active laboratory templates, not the complete Item catalog."""
    txt = (txt or "").strip()
    templates = frappe.db.sql(
        """
        SELECT
            ltt.name,
            ltt.lab_test_name,
            ltt.lab_test_code,
            ltt.item,
            ltt.lab_test_group,
            ltt.department,
            ltt.lab_test_uom,
            ltt.lab_test_normal_range,
            ltt.sample,
            ltt.sample_uom,
            ltt.sample_qty,
            i.item_name,
            i.standard_rate
        FROM `tabLab Test Template` ltt
        LEFT JOIN `tabItem` i ON i.name = ltt.item
        WHERE ltt.disabled = 0
          AND (
              ltt.lab_test_name LIKE %(txt)s
              OR ltt.lab_test_code LIKE %(txt)s
              OR ltt.name LIKE %(txt)s
              OR COALESCE(i.item_name, '') LIKE %(txt)s
          )
        ORDER BY
            CASE WHEN ltt.lab_test_name = %(exact)s THEN 0 ELSE 1 END,
            ltt.lab_test_name ASC
        LIMIT 20
        """,
        {"txt": f"%{txt}%", "exact": txt},
        as_dict=True,
    )

    return [
        row
        for row in templates
        if row.item and (row.lab_test_name or row.lab_test_code or row.item_name)
    ]


def get_patient_sex(patient):
    """
    جلب جنس المريض.
    لا يستخدم في اختيار Reference Range.
    """

    patient_sex = frappe.db.get_value(
        "Patient",
        patient,
        "sex",
    )

    return patient_sex or ""


def get_er_context(patient_encounter):
    if not patient_encounter:
        return frappe._dict()

    er_context = frappe.db.get_value(
        "Patient Encounter",
        patient_encounter,
        [
            "er_priority",
            "er_acuity",
            "patient",
            "er_patient_intake",
        ],
        as_dict=True,
    ) or frappe._dict()

    er_context["priority"] = er_context.get("er_priority")
    er_context["acuity"] = er_context.get("er_acuity")

    return er_context


# =====================================================
# Reference Range العام
# =====================================================

def get_general_reference_range(observation_template):
    """
    جلب Reference Range العام.

    يعتمد فقط على:
        applies_to = All
        age = All

    ولا يعتمد على عمر أو جنس المريض.
    """

    if not observation_template:
        return None

    if not frappe.db.exists(
        "Observation Template",
        observation_template,
    ):
        return None

    observation = frappe.get_doc(
        "Observation Template",
        observation_template,
    )

    for reference in observation.observation_reference_range:

        if (
            reference.applies_to == "All"
            and reference.age == "All"
            and reference.reference_from
            and reference.reference_to
        ):
            return {
                "from": str(
                    reference.reference_from
                ),
                "to": str(
                    reference.reference_to
                ),
                "display": (
                    f"{reference.reference_from} - "
                    f"{reference.reference_to}"
                ),
                "source": (
                    reference.reference_text
                    or ""
                ),
                "interpretation": (
                    reference.short_interpretation
                    or reference.long_interpretation
                    or ""
                ),
            }

    return None


def get_reference_source_short(source, max_length=140):
    """
    إنشاء نسخة قصيرة للحقل القديم Data.
    المصدر الكامل يحفظ في الحقل Long Text.
    """

    if not source:
        return ""

    source = str(source).strip()

    if len(source) <= max_length:
        return source

    short_source = source[
        : max_length - 3
    ].rstrip()

    last_space = short_source.rfind(" ")

    if last_space > 100:
        short_source = short_source[
            :last_space
        ].rstrip()

    return short_source + "..."


# =====================================================
# حفظ مصادر Reference Range مباشرة
# =====================================================

def save_reference_sources(lab_test, source_rows):
    """
    حفظ حقول Reference Source مباشرة في جدول
    Normal Test Result.

    السبب:
    الحقول المخصصة داخل Child Table لا نعتمد على
    lab_test.save() لتحديثها في هذه الدورة.
    """

    if not source_rows:
        return

    meta = frappe.get_meta(
        "Normal Test Result"
    )

    has_short_source = bool(
        meta.get_field(
            "custom_reference_source"
        )
    )

    has_long_source = bool(
        meta.get_field(
            "custom_reference_source_long"
        )
    )

    if not has_short_source and not has_long_source:
        return

    for row_data in source_rows:

        row_name = row_data.get(
            "name"
        )

        if not row_name:
            continue

        values = {}

        if has_short_source:
            values[
                "custom_reference_source"
            ] = (
                get_reference_source_short(
                    row_data.get("source")
                    or ""
                )
            )

        if has_long_source:
            values[
                "custom_reference_source_long"
            ] = (
                row_data.get("source")
                or ""
            )

        if values:
            frappe.db.set_value(
                "Normal Test Result",
                row_name,
                values,
                update_modified=False,
            )


# =====================================================
# إثراء نتائج Lab Test من Template
# =====================================================

def enrich_lab_test_results_from_template(lab_test):
    """
    Healthcare ينشئ Normal Test Result.

    custom_app يضيف:
        - Test Name
        - LOINC
        - LOINC Display
        - Observation Template
        - General Reference Range

    ثم يحفظ:
        - Reference Source المختصر
        - Reference Source الكامل

    مباشرة في جدول Normal Test Result.
    """

    if not lab_test:
        return

    if not lab_test.template:
        return

    template = frappe.get_doc(
        "Lab Test Template",
        lab_test.template,
    )

    if not template.normal_test_templates:
        return

    result_rows = list(
        lab_test.normal_test_items or []
    )

    if not result_rows:
        return

    template_rows = list(
        template.normal_test_templates
    )

    source_rows = []

    result_meta = frappe.get_meta(
        "Normal Test Result"
    )

    has_loinc_display = bool(
        result_meta.get_field(
            "custom_loinc_display"
        )
    )

    for index, result_row in enumerate(
        result_rows
    ):

        if index >= len(template_rows):
            break

        template_row = template_rows[index]

        # -------------------------------------------------
        # اسم الفحص
        # -------------------------------------------------

        test_name = (
            template_row.get(
                "lab_test_event"
            )
            or template_row.get(
                "custom_test_name"
            )
            or ""
        )

        if (
            test_name
            and (
                not result_row.lab_test_name
                or result_row.lab_test_name
                == template.lab_test_name
            )
        ):
            result_row.lab_test_name = (
                test_name
            )

        # -------------------------------------------------
        # LOINC
        # -------------------------------------------------

        result_row.custom_loinc_code = (
            template_row.get(
                "custom_loinc_code"
            )
            or ""
        )

        # -------------------------------------------------
        # LOINC Display
        # -------------------------------------------------

        if has_loinc_display:
            result_row.custom_loinc_display = (
                template_row.get(
                    "custom_loinc_display"
                )
                or ""
            )

        # -------------------------------------------------
        # Observation Template
        # -------------------------------------------------

        observation_template = (
            template_row.get(
                "custom_observation_template"
            )
            or ""
        )

        result_row.custom_observation_template = (
            observation_template
        )

        # -------------------------------------------------
        # Reference Range
        # -------------------------------------------------

        reference = (
            get_general_reference_range(
                observation_template
            )
        )

        if reference:

            result_row.normal_range = (
                reference["display"]
            )

            source_rows.append({
                "name": result_row.name,
                "source": (
                    reference["source"]
                    or ""
                ),
            })

        else:

            result_row.normal_range = ""

            source_rows.append({
                "name": result_row.name,
                "source": "",
            })

    # -----------------------------------------------------
    # حفظ Lab Test والحقول الأساسية
    # -----------------------------------------------------

    lab_test.save(
        ignore_permissions=True
    )

    lab_test.reload()

    # -----------------------------------------------------
    # حفظ Reference Source مباشرة
    # -----------------------------------------------------

    save_reference_sources(
        lab_test,
        source_rows,
    )

    frappe.db.commit()


# =====================================================
# إنشاء طلب مختبر جديد
# =====================================================

@frappe.whitelist()
def create_lab_request(data):

    if isinstance(data, str):

        try:
            data = json.loads(data)

        except Exception:

            frappe.throw(
                "بيانات طلب المختبر غير صحيحة"
            )

    if not isinstance(data, dict):

        frappe.throw(
            "بيانات طلب المختبر غير صحيحة"
        )

    # =================================================
    # التحقق من الزيارة
    # =================================================

    encounter_name = (
        data.get("encounter")
        or ""
    ).strip()

    if not encounter_name:

        frappe.throw(
            "لا توجد زيارة طبية محددة"
        )

    if not frappe.db.exists(
        "Patient Encounter",
        encounter_name,
    ):

        frappe.throw(
            "Patient Encounter غير موجود: "
            + str(encounter_name)
        )

    encounter = frappe.get_doc(
        "Patient Encounter",
        encounter_name,
    )
    er_context = get_er_context(encounter.name)

    if not encounter.patient:

        frappe.throw(
            "لا يوجد مريض مرتبط بالزيارة"
        )

    if not encounter.practitioner:

        frappe.throw(
            "لا يوجد طبيب مرتبط بالزيارة"
        )

    # =================================================
    # بيانات الفحص
    # =================================================

    test_name = (data.get("test_name") or "").strip()

    item_code = (
        data.get("item_code")
        or ""
    ).strip()

    try:

        quantity = float(
            data.get("quantity")
            or 1
        )

    except (TypeError, ValueError):

        frappe.throw(
            "كمية الفحص غير صحيحة"
        )

    notes = (
        data.get("notes")
        or ""
    ).strip()

    sales_invoice = (
        data.get("sales_invoice")
        or ""
    ).strip()

    if not test_name:

        frappe.throw(
            "يجب تحديد اسم الفحص"
        )

    if not item_code:

        frappe.throw(
            "يجب تحديد Item الخاص بالفحص"
        )

    if quantity <= 0:

        frappe.throw(
            "يجب أن تكون الكمية أكبر من صفر"
        )

    # =================================================
    # التحقق من Item
    # =================================================

    if not frappe.db.exists(
        "Item",
        item_code,
    ):

        frappe.throw(
            "Item غير موجود: "
            + str(item_code)
        )

    item = frappe.get_doc(
        "Item",
        item_code,
    )

    if item.disabled:

        frappe.throw(
            "Item الخاص بالفحص معطل: "
            + str(item_code)
        )

    if not item.is_sales_item:

        frappe.throw(
            "Item الخاص بالفحص غير مفعّل للبيع: "
            + str(item_code)
        )

    # =================================================
    # Template
    # =================================================

    lab_template = get_lab_test_template(
        item_code
    )

    template_test_name = lab_template.get("lab_test_name")

    if not template_test_name:
        frappe.throw(
            "القالب المختبري المحدد يفتقد اسم الفحص المطلوب. يرجى استكمال إعداد Lab Test Template."
        )

    test_name = template_test_name

    existing_request = find_active_duplicate_lab_request(
        encounter.name,
        item_code,
        sales_invoice=sales_invoice or None,
    )
    if existing_request:
        frappe.throw(
            "تم طلب هذا الفحص مسبقاً لهذه الزيارة: "
            + str(existing_request)
        )

    # =================================================
    # السعر
    # =================================================

    try:

        rate = float(
            data.get("rate")
            or item.standard_rate
            or lab_template.get(
                "lab_test_rate"
            )
            or 0
        )

    except (TypeError, ValueError):

        rate = 0

    amount = (
        rate
        *
        quantity
    )

    # =================================================
    # بيانات المريض
    # =================================================

    patient_sex = get_patient_sex(
        encounter.patient
    )

    # =================================================
    # ER Diagnostic Request
    # =================================================

    diagnostic_request = frappe.get_doc({

        "doctype":
            "ER Diagnostic Request",

        "request_date":
            nowdate(),

        "patient":
            encounter.patient,

        "patient_encounter":
            encounter.name,

        "priority":
            er_context.get("priority"),

        "medical_department":
            encounter.get("medical_department"),

        "request_type":
            "Laboratory",

        "test_name":
            test_name,

        "item_code":
            item_code,

        "quantity":
            quantity,

        "uom":
            (
                item.sales_uom
                or item.stock_uom
                or "Nos"
            ),

        "rate":
            rate,

        "amount":
            amount,

        "lab_status":
            "Pending",

        "billing_status":
            "Invoiced" if sales_invoice else "Pending",

        "qty_invoiced":
            quantity if sales_invoice else 0,

        "sales_invoice":
            sales_invoice or None,

        "notes":
            notes,
    })

    diagnostic_request.insert(
        ignore_permissions=True
    )

    # =================================================
    # Lab Test
    # =================================================

    lab_test = frappe.get_doc({

        "doctype":
            "Lab Test",

        "patient":
            encounter.patient,

        "patient_name":
            encounter.patient_name,

        "patient_sex":
            patient_sex,

        "template":
            lab_template.name,

        "practitioner":
            encounter.practitioner,

        "practitioner_name":
            encounter.practitioner_name,

        "lab_test_name":
            test_name,

        "status":
            "Draft",

        "date":
            nowdate(),

        "time":
            nowtime(),

        "er_diagnostic_request":
            diagnostic_request.name,
    })

    normalize_existing_sample_details(
        encounter.patient,
        lab_template.sample,
    )

    # Healthcare:
    # - ينشئ Lab Test
    # - يحمل Template
    # - ينشئ Sample Collection
    # - ينشئ Normal Test Result rows
    lab_test.insert(
        ignore_permissions=True
    )

    # =================================================
    # إثراء النتائج
    # =================================================

    enrich_lab_test_results_from_template(
        lab_test
    )

    # =================================================
    # ربط الطلب
    # =================================================

    diagnostic_request.lab_test = (
        lab_test.name
    )

    diagnostic_request.lab_status = (
        "Pending"
    )

    diagnostic_request.save(
        ignore_permissions=True
    )

    frappe.db.commit()

    # =================================================
    # النتيجة
    # =================================================

    return {

        "name":
            diagnostic_request.name,

        "request_number":
            diagnostic_request.name,

        "diagnostic_request":
            diagnostic_request.name,

        "lab_test":
            lab_test.name,

        "lab_template":
            lab_template.name,

        "patient":
            encounter.patient,

        "patient_name":
            encounter.patient_name,

        "test_name":
            test_name,

        "item_code":
            item_code,

        "quantity":
            quantity,

        "rate":
            rate,

        "amount":
            amount,

        "lab_status":
            "Pending",

        "billing_status":
            "Pending",

        "sample":
            lab_template.get(
                "sample"
            ),

        "sample_uom":
            lab_template.get(
                "sample_uom"
            ),

        "sample_qty":
            lab_template.get(
                "sample_qty"
            ),

        "sample_details":
            lab_template.get(
                "sample_details"
            ),

        "message":
            "تم إنشاء طلب المختبر وربطه بالقالب الصحيح بنجاح",
    }


# =====================================================
# جلب طلبات المختبر
# =====================================================

@frappe.whitelist()
def get_lab_requests(encounter):

    if not encounter:

        frappe.throw(
            "لا توجد زيارة طبية محددة"
        )

    if not frappe.db.exists(
        "Patient Encounter",
        encounter,
    ):

        frappe.throw(
            "Patient Encounter غير موجود: "
            + str(encounter)
        )

    encounter_doc = frappe.get_doc(
        "Patient Encounter",
        encounter,
    )

    requests = frappe.get_all(
        "ER Diagnostic Request",
        filters={

            "patient":
                encounter_doc.patient,

            "patient_encounter":
                encounter,

            "request_type":
                "Laboratory",
        },
        fields=[

            "name",
            "request_date",
            "patient",
            "patient_name",
            "patient_encounter",
            "request_type",
            "test_name",
            "item_code",
            "quantity",
            "rate",
            "amount",
            "lab_test",
            "lab_status",
            "result",
            "notes",
            "billing_status",
            "qty_invoiced",
            "sales_invoice",
            "creation",
        ],
        order_by="creation desc",
        limit_page_length=100,
    )

    result = []

    for request in requests:

        row = dict(request)

        # =============================================
        # Item
        # =============================================

        if request.item_code:

            item = frappe.db.get_value(
                "Item",
                request.item_code,
                [
                    "item_name",
                    "standard_rate",
                ],
                as_dict=True,
            )

            row["item_name"] = (
                item.item_name
                if item
                else request.item_code
            )

        else:

            row["item_name"] = (
                request.test_name
                or "---"
            )

        # =============================================
        # Lab Test
        # =============================================

        if request.lab_test:

            lab_test = frappe.db.get_value(
                "Lab Test",
                request.lab_test,
                [
                    "name",
                    "template",
                    "status",
                    "patient_sex",
                    "date",
                    "time",
                    "submitted_date",
                    "result_date",
                    "descriptive_result",
                    "custom_result",
                    "lab_test_comment",
                    "sample",
                ],
                as_dict=True,
            )

            row["lab_test_details"] = (
                lab_test
            )

            if lab_test:

                row["lab_test_status"] = (
                    lab_test.get("status")
                    or "Draft"
                )

                row["lab_status"] = (
                    request.lab_status
                    or "Pending"
                )

                row["sample"] = (
                    lab_test.get("sample")
                )

                # -------------------------------------
                # Template
                # -------------------------------------

                template_name = (
                    lab_test.get("template")
                )

                row["lab_template"] = (
                    template_name
                )

                if template_name:

                    template = frappe.db.get_value(
                        "Lab Test Template",
                        template_name,
                        [
                            "lab_test_name",
                            "sample",
                            "sample_uom",
                            "sample_qty",
                            "sample_details",
                        ],
                        as_dict=True,
                    )

                    row["lab_template_details"] = (
                        template
                    )

                else:

                    row["lab_template_details"] = None

                # -------------------------------------
                # النتيجة
                # -------------------------------------

                row["result"] = (
                    lab_test.get(
                        "custom_result"
                    )
                    or lab_test.get(
                        "descriptive_result"
                    )
                    or request.result
                    or ""
                )

                row["lab_results"] = get_request_lab_results(
                    request,
                    lab_test,
                )

        else:

            row["lab_test_details"] = None
            row["lab_test_status"] = None
            row["lab_template"] = None
            row["lab_template_details"] = None
            row["sample"] = None
            row["lab_results"] = []

        result.append(row)

    return result


def get_request_lab_results(request, lab_test):
    sample_collection = lab_test.get("sample")
    if not sample_collection:
        return []

    observation_names = []
    for item in frappe.get_all(
        "Normal Test Result",
        filters={"parent": lab_test.name, "parenttype": "Lab Test"},
        fields=["custom_observation_template"],
        order_by="idx asc",
        limit_page_length=500,
    ):
        if item.custom_observation_template:
            observation_names.append(item.custom_observation_template)

    filters = {
        "reference_doctype": "Sample Collection",
        "reference_docname": sample_collection,
        "parent_observation": "",
        "status": ["!=", "Cancelled"],
        "docstatus": ["!=", 2],
    }
    if observation_names:
        filters["observation_template"] = ["in", observation_names]

    observations = frappe.get_all(
        "Observation",
        filters=filters,
        fields=[
            "name",
            "observation_template",
            "preferred_display_name",
            "permitted_data_type",
            "permitted_unit",
            "reference",
            "result_data",
            "result_text",
            "result_float",
            "result_select",
            "result_boolean",
            "status",
            "time_of_result",
        ],
        order_by="creation asc",
        limit_page_length=500,
    )

    return [
        {
            "name": observation.name,
            "test": (
                observation.preferred_display_name
                or observation.observation_template
            ),
            "result": (
                observation.result_data
                if observation.result_data not in (None, "")
                else observation.result_text
                or observation.result_select
                or (
                    "نعم"
                    if observation.result_boolean is True
                    else "لا"
                    if observation.result_boolean is False
                    else ""
                )
            ),
            "unit": observation.permitted_unit or "",
            "reference_range": observation.reference or "",
            "status": observation.status or "",
            "result_time": observation.time_of_result,
        }
        for observation in observations
    ]


# =====================================================
# جلب تفاصيل طلب مختبر واحد
# =====================================================

@frappe.whitelist()
def get_lab_result(
    encounter,
    diagnostic_request,
):

    if not encounter:

        frappe.throw(
            "لا توجد زيارة طبية محددة"
        )

    if not diagnostic_request:

        frappe.throw(
            "لم يتم تحديد طلب المختبر"
        )

    if not frappe.db.exists(
        "ER Diagnostic Request",
        diagnostic_request,
    ):

        frappe.throw(
            "طلب المختبر غير موجود: "
            + str(diagnostic_request)
        )

    request = frappe.get_doc(
        "ER Diagnostic Request",
        diagnostic_request,
    )

    if request.request_type != "Laboratory":

        frappe.throw(
            "الطلب المحدد ليس طلب مختبر"
        )

    if request.patient_encounter != encounter:

        frappe.throw(
            "طلب المختبر لا ينتمي إلى هذه الزيارة"
        )

    lab_test = None

    if request.lab_test:

        if frappe.db.exists(
            "Lab Test",
            request.lab_test,
        ):

            lab_test = frappe.get_doc(
                "Lab Test",
                request.lab_test,
            )

    lab_results = (
        get_request_lab_results(
            request,
            lab_test,
        )
        if lab_test
        else []
    )

    return {

        "diagnostic_request":
            request.as_dict(),

        "lab_test":
            lab_test.as_dict()
            if lab_test
            else None,

        "lab_results":
            lab_results,
    }


# =====================================================
# إنشاء Diagnostic Report
# =====================================================

@frappe.whitelist()
def create_diagnostic_report(
    lab_test_name,
    result_html,
):

    if not lab_test_name:

        frappe.throw(
            "لم يتم تحديد Lab Test"
        )

    if not frappe.db.exists(
        "Lab Test",
        lab_test_name,
    ):

        frappe.throw(
            "Lab Test غير موجود: "
            + str(lab_test_name)
        )

    lab_test = frappe.get_doc(
        "Lab Test",
        lab_test_name,
    )

    request_name = frappe.db.get_value(
        "ER Diagnostic Request",
        {"lab_test": lab_test.name, "request_type": "Laboratory"},
        "name",
        order_by="creation desc",
    )
    request = frappe.get_doc("ER Diagnostic Request", request_name) if request_name else frappe._dict(
        patient=lab_test.patient,
        patient_name=lab_test.patient_name,
        lab_test=lab_test.name,
    )
    sample_collection = lab_test.sample
    report_name = ensure_diagnostic_report(
        request,
        sample_collection,
        lab_test.name,
    )
    report = frappe.get_doc("Diagnostic Report", report_name)

    if report.status not in ("Approved", "Rejected"):
        report.observation = (
            result_html
        )

        report.save(
            ignore_permissions=True
        )

        frappe.db.commit()

    return report.name


@frappe.whitelist()
def mark_diagnostic_report_printed(report_name):
    if not report_name:
        frappe.throw("لم يتم تحديد تقرير التشخيص")

    report = frappe.get_doc("Diagnostic Report", report_name)
    if report.status != "Approved":
        frappe.throw("لا يمكن طباعة التقرير قبل اعتماده")

    if report.ref_doctype == "Lab Test" and report.docname:
        frappe.db.set_value(
            "Lab Test",
            report.docname,
            {
                "printed": 1,
                "printed_on": frappe.utils.now_datetime(),
            },
            update_modified=False,
        )

    return {"report": report.name, "printed": True}
