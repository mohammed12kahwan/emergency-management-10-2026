import frappe
import json

from frappe.utils import (
    nowdate,
    nowtime,
    now_datetime,
)


# =========================================================
# ER MEDICATIONS
# إدارة أدوية الطوارئ
#
# التصميم:
#
# Medication
#     ↓
# Medication Linked Item
#     ↓
# Item
#     ↓
# Bin
#     ↓
# Warehouse
#     ↓
# Stock Entry
#
# ملاحظات:
# 1. لا يتم تحديد Warehouse ثابت داخل الكود.
# 2. المخازن يتم اكتشافها ديناميكيًا من ERPNext.
# 3. طلب الدواء لا يخصم من المخزون.
# 4. الخصم من المخزون يتم فقط عند صرف/إعطاء الدواء.
# 5. الصرف يتم بواسطة Stock Entry / Material Issue.
# 6. الجرعة الطبية النصية تحفظ في order_description.
# 7. dosage في Medication Request يرتبط بـ
#    Prescription Dosage ويأخذ قيمة التكرار.
# =========================================================


# =========================================================
# أدوات مساعدة عامة
# =========================================================

def _parse_data(data):

    if isinstance(data, str):

        try:
            data = json.loads(data)

        except Exception:

            frappe.throw(
                "بيانات طلب الدواء غير صحيحة"
            )

    if not isinstance(data, dict):

        frappe.throw(
            "بيانات طلب الدواء غير صحيحة"
        )

    return data


# =========================================================
# التحقق من وجود حقل
# =========================================================

def _has_field(
    doc,
    fieldname
):

    try:

        return bool(
            doc.meta.has_field(
                fieldname
            )
        )

    except Exception:

        return False


# =========================================================
# الحصول على Patient Encounter
# =========================================================

def _get_encounter(
    encounter_name
):

    if not encounter_name:

        frappe.throw(
            "لا توجد زيارة طبية مرتبطة بطلب الدواء"
        )

    if not frappe.db.exists(
        "Patient Encounter",
        encounter_name
    ):

        frappe.throw(
            "Patient Encounter غير موجود: "
            + str(encounter_name)
        )

    encounter = frappe.get_doc(
        "Patient Encounter",
        encounter_name
    )

    if not encounter.patient:

        frappe.throw(
            "لا يوجد مريض مرتبط بالزيارة الطبية"
        )

    if not encounter.practitioner:

        frappe.throw(
            "لا يوجد طبيب مرتبط بالزيارة الطبية"
        )

    return encounter


# =========================================================
# الحصول على Medication
# =========================================================

def _get_medication(
    medication_name
):

    if not medication_name:

        frappe.throw(
            "يجب اختيار الدواء"
        )

    if not frappe.db.exists(
        "Medication",
        medication_name
    ):

        frappe.throw(
            "الدواء غير موجود في Medication: "
            + str(medication_name)
        )

    return frappe.get_doc(
        "Medication",
        medication_name
    )


# =========================================================
# الحصول على Item المرتبط بالدواء
# =========================================================

def _get_medication_item(
    medication
):

    medication_item = None
    medication_item_row = None

    for linked_item in (
        medication.linked_items or []
    ):

        item_name = (
            linked_item.item
            or linked_item.item_code
        )

        if not item_name:
            continue

        if not frappe.db.exists(
            "Item",
            item_name
        ):

            continue

        medication_item = (
            item_name
        )

        medication_item_row = (
            linked_item
        )

        break

    if not medication_item:

        frappe.throw(
            "لا يوجد Item مرتبط بالدواء: "
            + str(medication.name)
        )

    return (
        medication_item,
        medication_item_row,
    )


# =========================================================
# الحصول على Company
# =========================================================

def _get_company(
    data
):

    company = None

    if isinstance(
        data,
        dict
    ):

        company = data.get(
            "company"
        )

    if not company:

        company = frappe.db.get_single_value(
            "Global Defaults",
            "default_company"
        )

    if not company:

        companies = frappe.get_all(
            "Company",
            fields=[
                "name"
            ],
            order_by="name",
            limit_page_length=1,
        )

        if companies:

            company = (
                companies[0].name
            )

    if not company:

        frappe.throw(
            "لا توجد Company متاحة لإنشاء طلب الدواء"
        )

    return company


# =========================================================
# الحصول على Inpatient Record
# =========================================================

def _get_inpatient_record(
    encounter,
    data
):

    inpatient_record = None

    if isinstance(
        data,
        dict
    ):

        inpatient_record = data.get(
            "inpatient_record"
        )

    if not inpatient_record:

        try:

            inpatient_record = (
                frappe.db.get_value(
                    "Patient",
                    encounter.patient,
                    "inpatient_record"
                )
            )

        except Exception:

            inpatient_record = None

    return inpatient_record


# =========================================================
# التحقق من الجرعة الطبية النصية
# =========================================================

def _get_dose(
    data
):

    dose = None

    if isinstance(
        data,
        dict
    ):

        dose = data.get(
            "dose"
        )

    if dose is None:

        frappe.throw(
            "يجب إدخال الجرعة"
        )

    dose = str(
        dose
    ).strip()

    if not dose:

        frappe.throw(
            "يجب إدخال الجرعة"
        )

    return dose


# =========================================================
# التحقق من الكمية
# =========================================================

def _get_quantity(
    data
):

    quantity = 1

    if isinstance(
        data,
        dict
    ):

        quantity = (
            data.get("quantity")
            or 1
        )

    try:

        quantity = int(
            quantity
        )

    except Exception:

        quantity = 1

    if quantity < 1:

        quantity = 1

    return quantity


# =========================================================
# الحصول على شكل الجرعة
# =========================================================

def _get_dosage_form(
    data,
    medication,
    medication_item_row
):

    dosage_form = None

    if isinstance(
        data,
        dict
    ):

        dosage_form = data.get(
            "dosage_form"
        )

    if not dosage_form:

        try:

            dosage_form = (
                medication.dosage_form
                or None
            )

        except Exception:

            dosage_form = None

    if (
        not dosage_form
        and medication_item_row
    ):

        try:

            dosage_form = (
                medication_item_row.get(
                    "dosage_form"
                )
            )

        except Exception:

            dosage_form = None

    return dosage_form


# =========================================================
# الحصول على التكرار
# =========================================================

def _get_frequency(
    data
):

    if not isinstance(
        data,
        dict
    ):

        return ""

    return (
        data.get(
            "frequency"
        )
        or ""
    ).strip()


# =========================================================
# الحصول على المدة
# =========================================================

def _get_duration(
    data
):

    if not isinstance(
        data,
        dict
    ):

        return ""

    return (
        data.get(
            "duration"
        )
        or ""
    ).strip()


# =========================================================
# بناء وصف طلب الدواء
# =========================================================

def _build_order_description(
    dose,
    frequency,
    duration
):

    description_parts = []

    description_parts.append(
        "الجرعة: "
        + str(dose)
    )

    if frequency:

        description_parts.append(
            "التكرار: "
            + str(frequency)
        )

    if duration:

        description_parts.append(
            "المدة: "
            + str(duration)
        )

    return "\n".join(
        description_parts
    )


# =========================================================
# الحصول على Prescription Dosage
#
# ملاحظة:
# dosage في Medication Request هو:
#
# Link -> Prescription Dosage
#
# لذلك لا نستخدم Dosage.
#
# dose:
#     الجرعة الطبية مثل 500 mg
#
# frequency:
#     التكرار مثل BID / TID / Once Daily
#
# قيمة dosage تكون من Prescription Dosage.
# =========================================================

def _get_or_create_dosage(
    frequency
):

    dosage_doctype = (
        "Prescription Dosage"
    )

    # -----------------------------------------------------
    # التأكد من وجود DocType
    # -----------------------------------------------------

    if not frappe.db.exists(
        "DocType",
        dosage_doctype
    ):

        frappe.throw(
            "DocType Prescription Dosage غير موجود في النظام"
        )

    frequency = (
        str(frequency or "")
        .strip()
    )

    # -----------------------------------------------------
    # استخدام Once Daily كقيمة افتراضية
    # إذا لم يتم اختيار التكرار.
    # -----------------------------------------------------

    if not frequency:

        frequency = "Once Daily"

    # -----------------------------------------------------
    # البحث بالقيمة كاسم سجل
    # -----------------------------------------------------

    if frappe.db.exists(
        dosage_doctype,
        frequency
    ):

        return frequency

    # -----------------------------------------------------
    # البحث داخل حقل dosage
    # -----------------------------------------------------

    existing = frappe.db.get_value(

        dosage_doctype,

        {
            "dosage":
                frequency
        },

        "name",
    )

    if existing:

        return existing

    # -----------------------------------------------------
    # لا ننشئ قيمة عشوائية.
    #
    # يجب استخدام Prescription Dosage موجودة
    # في النظام.
    # -----------------------------------------------------

    frappe.throw(

        "تكرار الجرعة غير موجود في Prescription Dosage: "
        + frequency
        + "\n"
        + "اختر قيمة موجودة مثل Once Daily أو BID أو TID أو QID."
    )


# =========================================================
# التحقق من قيم Medication Request
# =========================================================

def _get_request_defaults():

    result = {

        "priority":
            None,

        "intent":
            None,
    }

    if frappe.db.exists(
        "Priority",
        "Routine-Priority"
    ):

        result[
            "priority"
        ] = (
            "Routine-Priority"
        )

    if frappe.db.exists(
        "Intent",
        "Order-Intent"
    ):

        result[
            "intent"
        ] = (
            "Order-Intent"
        )

    return result


# =========================================================
# =====================================================
# أدوات مساعدة لمنع التكرار
# =====================================================

def has_completed_medication_request(request):
    if getattr(request, "er_administration_status", None) == "Completed":
        return True

    if getattr(request, "status", None) in ("completed", "cancelled", "stopped"):
        return True

    return False


def find_active_duplicate_medication_request(encounter_name, medication_name, order_description):
    candidates = frappe.get_all(
        "Medication Request",
        filters={
            "order_group": encounter_name,
            "medication": medication_name,
        },
        fields=["name", "order_description", "er_administration_status", "status"],
        order_by="creation asc",
        limit_page_length=100,
    )

    for candidate in candidates:
        if (candidate.order_description or "").strip() != (order_description or "").strip():
            continue

        if not has_completed_medication_request(candidate):
            return candidate.name

    return None


# إنشاء طلب دواء واحد
# =========================================================

@frappe.whitelist()
def create_medication_request(
    data
):

    data = _parse_data(
        data
    )

    # -----------------------------------------------------
    # Encounter
    # -----------------------------------------------------

    encounter = _get_encounter(
        data.get(
            "encounter"
        )
    )

    # -----------------------------------------------------
    # Medication
    # -----------------------------------------------------

    medication = _get_medication(
        data.get(
            "drug"
        )
    )

    # -----------------------------------------------------
    # Item
    # -----------------------------------------------------

    (
        medication_item,
        medication_item_row,
    ) = _get_medication_item(
        medication
    )

    # -----------------------------------------------------
    # التأكد من Item
    # -----------------------------------------------------

    if not frappe.db.exists(
        "Item",
        medication_item
    ):

        frappe.throw(
            "Item غير موجود: "
            + str(medication_item)
        )

    item_doc = frappe.get_doc(
        "Item",
        medication_item
    )

    if not item_doc.is_stock_item:

        frappe.throw(

            "الدواء المرتبط بالطلب ليس Stock Item: "
            + str(medication_item)
        )

    # -----------------------------------------------------
    # Company
    # -----------------------------------------------------

    company = _get_company(
        data
    )

    # -----------------------------------------------------
    # Inpatient Record
    # -----------------------------------------------------

    inpatient_record = (
        _get_inpatient_record(
            encounter,
            data
        )
    )

    # -----------------------------------------------------
    # الجرعة الطبية
    # -----------------------------------------------------

    dose = _get_dose(
        data
    )

    # -----------------------------------------------------
    # Dosage Form
    # -----------------------------------------------------

    dosage_form = _get_dosage_form(
        data,
        medication,
        medication_item_row,
    )

    # -----------------------------------------------------
    # Frequency
    # -----------------------------------------------------

    frequency = _get_frequency(
        data
    )

    # -----------------------------------------------------
    # Duration
    # -----------------------------------------------------

    duration = _get_duration(
        data
    )

    # -----------------------------------------------------
    # Quantity
    # -----------------------------------------------------

    quantity = _get_quantity(
        data
    )

    # -----------------------------------------------------
    # Prescription Dosage
    #
    # مهم جدًا:
    #
    # لا نمرر dose هنا.
    #
    # مثال:
    #
    # dose = 500 mg
    # frequency = BID
    #
    # تصبح:
    #
    # dosage = BID
    #
    # والجرعة 500 mg تحفظ في
    # order_description.
    # -----------------------------------------------------

    dosage = _get_or_create_dosage(
        frequency
    )

    # -----------------------------------------------------
    # Order Description
    # -----------------------------------------------------

    order_description = (
        _build_order_description(
            dose,
            frequency,
            duration,
        )
    )

    # -----------------------------------------------------
    # Defaults
    # -----------------------------------------------------

    defaults = (
        _get_request_defaults()
    )

    # -----------------------------------------------------
        # -----------------------------------------------------
    # التحقق من التكرار
    # -----------------------------------------------------

    existing_request = find_active_duplicate_medication_request(
        encounter.name,
        medication.name,
        order_description,
    )

    if existing_request:
        frappe.throw(
            "تم طلب هذا الدواء مسبقاً لهذه الزيارة ولا يزال قيد التنفيذ: "
            + str(existing_request)
        )

    # -----------------------------------------------------
    # تجهيز Medication Request
    # -----------------------------------------------------

# تجهيز Medication Request
    # -----------------------------------------------------

    request_data = {

        "doctype":
            "Medication Request",

        "title":
            (
                f"{encounter.patient_name}"
                f" - "
                f"{medication.name}"
            ),

        "medication":
            medication.name,

        "medication_item":
            medication_item,

        "patient":
            encounter.patient,

        "patient_name":
            encounter.patient_name,

        "inpatient_record":
            inpatient_record,

        "practitioner":
            encounter.practitioner,

        "company":
            company,

        "order_date":
            nowdate(),

        "order_time":
            nowtime(),

        "expected_date":
            nowdate(),

        "quantity":
            quantity,

        "dosage_form":
            dosage_form,

        "dosage":
            dosage,

        "order_description":
            order_description,

        "order_group":
            encounter.name,

        "reason_reference_doctype":
            "Patient Encounter",

        "reason_reference":
            encounter.name,

        "er_administration_status":
            "Pending",
    }

    # -----------------------------------------------------
    # Priority
    # -----------------------------------------------------

    if defaults.get(
        "priority"
    ):

        request_data[
            "priority"
        ] = defaults[
            "priority"
        ]

    # -----------------------------------------------------
    # Intent
    # -----------------------------------------------------

    if defaults.get(
        "intent"
    ):

        request_data[
            "intent"
        ] = defaults[
            "intent"
        ]

    # -----------------------------------------------------
    # إنشاء المستند
    # -----------------------------------------------------

    request = frappe.get_doc(
        request_data
    )

    request.insert(
        ignore_permissions=True
    )

    frappe.db.commit()

    # -----------------------------------------------------
    # النتيجة
    # -----------------------------------------------------

    return {

        "name":
            request.name,

        "medication":
            medication.name,

        "medication_item":
            medication_item,

        "patient":
            encounter.patient,

        "patient_name":
            encounter.patient_name,

        "practitioner":
            encounter.practitioner,

        "company":
            company,

        "quantity":
            quantity,

        "dosage":
            dosage,

        "dosage_form":
            dosage_form,

        "dose":
            dose,

        "frequency":
            frequency,

        "duration":
            duration,

        "order_description":
            order_description,

        "er_administration_status":
            request.er_administration_status,

        "message":
            "تم إنشاء طلب الدواء بنجاح",
    }


# =========================================================
# إنشاء عدة طلبات أدوية
#
# هذه الدالة تستدعيها medications.js
# =========================================================

@frappe.whitelist()
def create_medication_requests(
    encounter,
    medications
):

    if not encounter:

        frappe.throw(
            "لا توجد زيارة طبية محددة."
        )

    if not frappe.db.exists(
        "Patient Encounter",
        encounter
    ):

        frappe.throw(
            "Patient Encounter غير موجود: "
            + str(encounter)
        )

    if isinstance(
        medications,
        str
    ):

        try:

            medications = json.loads(
                medications
            )

        except Exception:

            frappe.throw(
                "بيانات الأدوية غير صحيحة."
            )

    if not isinstance(
        medications,
        list
    ):

        frappe.throw(
            "يجب إرسال قائمة أدوية."
        )

    if not medications:

        frappe.throw(
            "لم يتم تحديد أي دواء."
        )

    created_requests = []

    for index, medication_data in enumerate(
        medications
    ):

        if not isinstance(
            medication_data,
            dict
        ):

            frappe.throw(
                "بيانات الدواء في الصف "
                + str(index + 1)
                + " غير صحيحة."
            )

        medication_data[
            "encounter"
        ] = encounter

        try:

            result = (
                create_medication_request(
                    json.dumps(
                        medication_data
                    )
                )
            )

            created_requests.append(
                result
            )

        except Exception as exc:

            frappe.throw(

                "تعذر إنشاء طلب الدواء في الصف "
                + str(index + 1)
                + ":\n"
                + str(exc)
            )

    frappe.db.commit()

    return {

        "success":
            True,

        "count":
            len(
                created_requests
            ),

        "requests":
            created_requests,

        "message":
            "تم إنشاء طلبات الأدوية بنجاح."
    }


# =========================================================
# جلب طلبات الأدوية المرتبطة بالزيارة
# =========================================================

@frappe.whitelist()
def get_medication_requests(
    encounter
):

    if not encounter:

        return []

    if not frappe.db.exists(
        "Patient Encounter",
        encounter
    ):

        frappe.throw(
            "Patient Encounter غير موجود: "
            + str(encounter)
        )

    requests = frappe.get_all(

        "Medication Request",

        filters={

            "order_group":
                encounter,
        },

        fields=[

            "name",
            "title",
            "medication",
            "medication_item",
            "patient",
            "patient_name",
            "practitioner",
            "practitioner_name",
            "company",
            "order_date",
            "order_time",
            "expected_date",
            "quantity",
            "dosage_form",
            "dosage",
            "order_description",
            "priority",
            "intent",
            "order_group",
            "reason_reference_doctype",
            "reason_reference",
            "er_administration_status",
            "er_administered_on",
            "er_administered_by",
            "er_administration_notes",

        ],

        order_by=
            "creation desc",

        limit_page_length=
            0,
    )

    result = []

    for request in requests:

        dose = ""
        frequency = ""
        duration = ""

        description = (
            request.order_description
            or ""
        )

        if "الجرعة:" in description:

            try:

                dose = (
                    description
                    .split(
                        "الجرعة:",
                        1
                    )[1]
                    .split(
                        "\n",
                        1
                    )[0]
                    .strip()
                )

            except Exception:

                dose = ""

        if "التكرار:" in description:

            try:

                frequency = (
                    description
                    .split(
                        "التكرار:",
                        1
                    )[1]
                    .split(
                        "\n",
                        1
                    )[0]
                    .strip()
                )

            except Exception:

                frequency = ""

        if "المدة:" in description:

            try:

                duration = (
                    description
                    .split(
                        "المدة:",
                        1
                    )[1]
                    .split(
                        "\n",
                        1
                    )[0]
                    .strip()
                )

            except Exception:

                duration = ""

        stock = _get_item_stock(
            request.medication_item
        )

        result.append({

            "name":
                request.name,

            "title":
                request.title,

            "medication":
                request.medication,

            "medication_item":
                request.medication_item,

            "patient":
                request.patient,

            "patient_name":
                request.patient_name,

            "practitioner":
                request.practitioner,

            "practitioner_name":
                request.practitioner_name,

            "company":
                request.company,

            "order_date":
                request.order_date,

            "order_time":
                request.order_time,

            "expected_date":
                request.expected_date,

            "quantity":
                request.quantity,

            "dosage_form":
                request.dosage_form,

            "dosage":
                request.dosage,

            "dose":
                dose,

            "frequency":
                frequency,

            "duration":
                duration,

            "order_description":
                description,

            "priority":
                request.priority,

            "intent":
                request.intent,

            "order_group":
                request.order_group,

            "reason_reference_doctype":
                request.reason_reference_doctype,

            "reason_reference":
                request.reason_reference,

            "er_administration_status":
                request.er_administration_status,

            "er_administered_on":
                request.er_administered_on,

            "er_administered_by":
                request.er_administered_by,

            "er_administration_notes":
                request.er_administration_notes,

            "stock":
                stock,
        })

    return result


# =========================================================
# قراءة مخزون Item من جميع المخازن
# =========================================================

def _get_item_stock(
    item_code
):

    if not item_code:

        return []

    if not frappe.db.exists(
        "Item",
        item_code
    ):

        return []

    bins = frappe.get_all(

        "Bin",

        filters={

            "item_code":
                item_code,
        },

        fields=[

            "warehouse",
            "actual_qty",
            "reserved_qty",
            "projected_qty",

        ],

        order_by=
            "warehouse asc",

        limit_page_length=
            0,
    )

    result = []

    for row in bins:

        warehouse = row.get(
            "warehouse"
        )

        if not warehouse:

            continue

        actual_qty = (
            row.get(
                "actual_qty"
            )
            or 0
        )

        reserved_qty = (
            row.get(
                "reserved_qty"
            )
            or 0
        )

        projected_qty = (
            row.get(
                "projected_qty"
            )
            or 0
        )

        available_qty = (
            actual_qty
            - reserved_qty
        )

        if available_qty < 0:

            available_qty = 0

        warehouse_data = frappe.db.get_value(

            "Warehouse",

            warehouse,

            [

                "warehouse_name",
                "company",
                "is_group",

            ],

            as_dict=True,
        )

        if not warehouse_data:

            continue

        if warehouse_data.is_group:

            continue

        result.append({

            "warehouse":
                warehouse,

            "warehouse_name":
                warehouse_data.warehouse_name,

            "company":
                warehouse_data.company,

            "actual_qty":
                actual_qty,

            "reserved_qty":
                reserved_qty,

            "projected_qty":
                projected_qty,

            "available_qty":
                available_qty,

            "can_issue":
                available_qty > 0,
        })

    return result


# =========================================================
# جلب مخزون دواء معين
# =========================================================

@frappe.whitelist()
def get_medication_stock(
    medication=None,
    item_code=None,
):

    if not item_code:

        if not medication:

            frappe.throw(
                "يجب تحديد الدواء"
            )

        medication_doc = (
            _get_medication(
                medication
            )
        )

        (
            item_code,
            medication_item_row,
        ) = _get_medication_item(
            medication_doc
        )

    stock = _get_item_stock(
        item_code
    )

    total_actual = 0
    total_reserved = 0
    total_available = 0

    for row in stock:

        total_actual += (
            row.get(
                "actual_qty"
            )
            or 0
        )

        total_reserved += (
            row.get(
                "reserved_qty"
            )
            or 0
        )

        total_available += (
            row.get(
                "available_qty"
            )
            or 0
        )

    return {

        "medication":
            medication,

        "item_code":
            item_code,

        "warehouses":
            stock,

        "warehouse_count":
            len(stock),

        "total_actual_qty":
            total_actual,

        "total_reserved_qty":
            total_reserved,

        "total_available_qty":
            total_available,

        "has_stock":
            total_available > 0,
    }


# =========================================================
# جلب الأدوية المعلقة للصرف
# =========================================================

@frappe.whitelist()
def get_pending_medications(
    encounter=None
):

    filters = {

        "er_administration_status":
            "Pending",
    }

    if encounter:

        filters[
            "order_group"
        ] = encounter

    requests = frappe.get_all(

        "Medication Request",

        filters=filters,

        fields=[

            "name",
            "title",
            "medication",
            "medication_item",
            "patient",
            "patient_name",
            "practitioner",
            "practitioner_name",
            "company",
            "order_date",
            "order_time",
            "quantity",
            "dosage_form",
            "dosage",
            "order_description",
            "order_group",
            "reason_reference",
            "er_administration_status",

        ],

        order_by=
            "creation asc",

        limit_page_length=
            0,
    )

    result = []

    for request in requests:

        dose = ""
        frequency = ""
        duration = ""

        description = (
            request.order_description
            or ""
        )

        if "الجرعة:" in description:

            try:

                dose = (
                    description
                    .split(
                        "الجرعة:",
                        1
                    )[1]
                    .split(
                        "\n",
                        1
                    )[0]
                    .strip()
                )

            except Exception:

                dose = ""

        if "التكرار:" in description:

            try:

                frequency = (
                    description
                    .split(
                        "التكرار:",
                        1
                    )[1]
                    .split(
                        "\n",
                        1
                    )[0]
                    .strip()
                )

            except Exception:

                frequency = ""

        if "المدة:" in description:

            try:

                duration = (
                    description
                    .split(
                        "المدة:",
                        1
                    )[1]
                    .split(
                        "\n",
                        1
                    )[0]
                    .strip()
                )

            except Exception:

                duration = ""

        stock = _get_item_stock(
            request.medication_item
        )

        result.append({

            "name":
                request.name,

            "title":
                request.title,

            "medication":
                request.medication,

            "medication_item":
                request.medication_item,

            "patient":
                request.patient,

            "patient_name":
                request.patient_name,

            "practitioner":
                request.practitioner,

            "practitioner_name":
                request.practitioner_name,

            "company":
                request.company,

            "order_date":
                request.order_date,

            "order_time":
                request.order_time,

            "quantity":
                request.quantity,

            "dosage_form":
                request.dosage_form,

            "dosage":
                request.dosage,

            "dose":
                dose,

            "frequency":
                frequency,

            "duration":
                duration,

            "order_description":
                description,

            "order_group":
                request.order_group,

            "reason_reference":
                request.reason_reference,

            "er_administration_status":
                request.er_administration_status,

            "stock":
                stock,
        })

    return result


# =========================================================
# التحقق من Warehouse
# =========================================================

def _validate_issue_warehouse(
    warehouse,
    item_code,
    required_qty,
    company
):

    if not warehouse:

        frappe.throw(
            "يجب تحديد مخزن صرف الدواء"
        )

    if not frappe.db.exists(
        "Warehouse",
        warehouse
    ):

        frappe.throw(
            "المخزن غير موجود: "
            + str(warehouse)
        )

    warehouse_data = frappe.db.get_value(

        "Warehouse",

        warehouse,

        [

            "warehouse_name",
            "company",
            "is_group",

        ],

        as_dict=True,
    )

    if not warehouse_data:

        frappe.throw(
            "تعذر قراءة بيانات المخزن"
        )

    if warehouse_data.is_group:

        frappe.throw(
            "لا يمكن صرف الدواء من مخزن رئيسي Group Warehouse"
        )

    if (
        company
        and warehouse_data.company
        and warehouse_data.company != company
    ):

        frappe.throw(
            "المخزن لا يتبع نفس الشركة الخاصة بطلب الدواء"
        )

    bin_data = frappe.db.get_value(

        "Bin",

        {

            "item_code":
                item_code,

            "warehouse":
                warehouse,

        },

        [

            "actual_qty",
            "reserved_qty",
            "projected_qty",

        ],

        as_dict=True,
    )

    if not bin_data:

        frappe.throw(
            "لا يوجد رصيد لهذا الدواء في المخزن المحدد"
        )

    actual_qty = (
        bin_data.actual_qty
        or 0
    )

    reserved_qty = (
        bin_data.reserved_qty
        or 0
    )

    available_qty = (
        actual_qty
        - reserved_qty
    )

    if available_qty < 0:

        available_qty = 0

    if available_qty < required_qty:

        frappe.throw(

            "الكمية المتاحة في المخزن "
            + str(warehouse)
            + " غير كافية.\n"
            + "المطلوب: "
            + str(required_qty)
            + "\n"
            + "المتاح: "
            + str(available_qty)
        )

    return {

        "warehouse":
            warehouse,

        "warehouse_name":
            warehouse_data.warehouse_name,

        "company":
            warehouse_data.company,

        "actual_qty":
            actual_qty,

        "reserved_qty":
            reserved_qty,

        "projected_qty":
            (
                bin_data.projected_qty
                or 0
            ),

        "available_qty":
            available_qty,
    }


# =========================================================
# التحقق من Item
# =========================================================

def _get_item_for_issue(
    item_code
):

    if not item_code:

        frappe.throw(
            "لا يوجد Item مرتبط بطلب الدواء"
        )

    if not frappe.db.exists(
        "Item",
        item_code
    ):

        frappe.throw(
            "Item غير موجود: "
            + str(item_code)
        )

    item = frappe.get_doc(
        "Item",
        item_code
    )

    if not item.is_stock_item:

        frappe.throw(

            "الدواء المرتبط بالطلب ليس Stock Item: "
            + str(item_code)
        )

    return item


# =========================================================
# الحصول على Stock UOM
# =========================================================

def _get_stock_uom(
    item
):

    stock_uom = (
        item.stock_uom
    )

    if not stock_uom:

        frappe.throw(
            "لا يوجد Stock UOM للدواء: "
            + str(item.name)
        )

    return stock_uom


# =========================================================
# إنشاء Material Issue
# =========================================================

def _create_material_issue(
    item,
    warehouse,
    quantity,
    company,
    reference_request,
    patient=None,
    encounter=None,
):

    stock_entry_type = (
        "Material Issue"
    )

    if not frappe.db.exists(
        "Stock Entry Type",
        stock_entry_type
    ):

        frappe.throw(
            "Stock Entry Type غير موجود: Material Issue"
        )

    stock_entry = frappe.new_doc(
        "Stock Entry"
    )

    stock_entry.stock_entry_type = (
        stock_entry_type
    )

    stock_entry.company = (
        company
    )

    stock_entry.posting_date = (
        nowdate()
    )

    stock_entry.posting_time = (
        nowtime()
    )

    stock_entry.append(
        "items",
        {

            "item_code":
                item.name,

            "qty":
                quantity,

            "uom":
                _get_stock_uom(
                    item
                ),

            "stock_uom":
                _get_stock_uom(
                    item
                ),

            "s_warehouse":
                warehouse,

        }
    )

    remarks_parts = [

        "ER Medication Issue",

        "Medication Request: "
        + str(
            reference_request
        ),

    ]

    if patient:

        remarks_parts.append(
            "Patient: "
            + str(patient)
        )

    if encounter:

        remarks_parts.append(
            "Patient Encounter: "
            + str(encounter)
        )

    stock_entry.remarks = (
        "\n".join(
            remarks_parts
        )
    )

    stock_entry.insert(
        ignore_permissions=True
    )

    stock_entry.submit()

    frappe.db.commit()

    return stock_entry


# =========================================================
# صرف وإعطاء الدواء
#
# لا يتم الخصم عند إنشاء الطلب.
# الخصم يحدث هنا فقط.
# =========================================================

@frappe.whitelist()
def administer_medication(
    request_name,
    warehouse=None,
    quantity=None,
    encounter=None,
    dose=None,
    notes=None,
):

    if not request_name:

        frappe.throw(
            "لم يتم تحديد طلب الدواء"
        )

    if not frappe.db.exists(
        "Medication Request",
        request_name
    ):

        frappe.throw(
            "طلب الدواء غير موجود: "
            + str(request_name)
        )

    request = frappe.get_doc(
        "Medication Request",
        request_name
    )

    if (
        request.er_administration_status
        == "Completed"
    ):

        return {

            "name":
                request.name,

            "status":
                "Completed",

            "administered_on":
                request.er_administered_on,

            "administered_by":
                request.er_administered_by,

            "stock_entry":
                (
                    request.get(
                        "er_stock_entry"
                    )
                    if request.meta.has_field(
                        "er_stock_entry"
                    )
                    else None
                ),

            "message":
                "تم تسجيل إعطاء وصرف الدواء مسبقًا",
        }

    # -----------------------------------------------------
    # التحقق من Encounter
    # -----------------------------------------------------

    if encounter:

        if not frappe.db.exists(
            "Patient Encounter",
            encounter
        ):

            frappe.throw(
                "الزيارة الطبية غير موجودة: "
                + str(encounter)
            )

        if (
            request.reason_reference
            and request.reason_reference
            != encounter
        ):

            frappe.throw(
                "طلب الدواء لا ينتمي إلى هذه الزيارة الطبية"
            )

    request_encounter = (
        request.reason_reference
        or encounter
    )

    # -----------------------------------------------------
    # Item
    # -----------------------------------------------------

    item = _get_item_for_issue(
        request.medication_item
    )

    # -----------------------------------------------------
    # Quantity
    # -----------------------------------------------------

    if quantity is None:

        quantity = (
            request.quantity
            or 1
        )

    try:

        quantity = float(
            quantity
        )

    except Exception:

        frappe.throw(
            "كمية الصرف غير صحيحة"
        )

    if quantity <= 0:

        frappe.throw(
            "يجب أن تكون كمية الصرف أكبر من صفر"
        )

    # -----------------------------------------------------
    # Company
    # -----------------------------------------------------

    company = (
        request.company
    )

    if not company:

        company = _get_company(
            {}
        )

    # -----------------------------------------------------
    # Warehouse
    # -----------------------------------------------------

    if not warehouse:

        frappe.throw(

            "يجب اختيار مخزن صرف الدواء "
            "من المخازن المتاحة لهذا الدواء"
        )

    warehouse_data = (
        _validate_issue_warehouse(

            warehouse=
                warehouse,

            item_code=
                request.medication_item,

            required_qty=
                quantity,

            company=
                company,
        )
    )

    # -----------------------------------------------------
    # إنشاء Material Issue
    # -----------------------------------------------------

    stock_entry = (
        _create_material_issue(

            item=
                item,

            warehouse=
                warehouse,

            quantity=
                quantity,

            company=
                company,

            reference_request=
                request.name,

            patient=
                request.patient,

            encounter=
                request_encounter,
        )
    )

    # -----------------------------------------------------
    # الجرعة عند الإعطاء
    # -----------------------------------------------------

    administration_dose = (
        dose
        or ""
    )

    if not administration_dose:

        description = (
            request.order_description
            or ""
        )

        marker = (
            "الجرعة:"
        )

        if marker in description:

            try:

                administration_dose = (
                    description
                    .split(
                        marker,
                        1
                    )[1]
                    .split(
                        "\n",
                        1
                    )[0]
                    .strip()
                )

            except Exception:

                administration_dose = ""

    # -----------------------------------------------------
    # تحديث Medication Request
    # -----------------------------------------------------

    request.er_administration_status = (
        "Completed"
    )

    request.er_administered_on = (
        now_datetime()
    )

    request.er_administered_by = (
        frappe.session.user
    )

    request.er_administration_notes = (
        notes
        or ""
    )

    if request.meta.has_field(
        "er_stock_entry"
    ):

        request.er_stock_entry = (
            stock_entry.name
        )

    if request.meta.has_field(
        "er_issue_warehouse"
    ):

        request.er_issue_warehouse = (
            warehouse
        )

    if request.meta.has_field(
        "er_issued_quantity"
    ):

        request.er_issued_quantity = (
            quantity
        )

    request.save(
        ignore_permissions=True
    )

    frappe.db.commit()

    remaining_stock = _get_item_stock(
        request.medication_item
    )

    return {

        "name":
            request.name,

        "status":
            request.er_administration_status,

        "administered_on":
            request.er_administered_on,

        "administered_by":
            request.er_administered_by,

        "dose":
            administration_dose,

        "quantity":
            quantity,

        "warehouse":
            warehouse,

        "warehouse_name":
            warehouse_data[
                "warehouse_name"
            ],

        "stock_entry":
            stock_entry.name,

        "medication":
            request.medication,

        "medication_item":
            request.medication_item,

        "patient":
            request.patient,

        "patient_name":
            request.patient_name,

        "encounter":
            request_encounter,

        "remaining_stock":
            remaining_stock,

        "message":
            "تم صرف وإعطاء الدواء بنجاح",
    }


# =========================================================
# تسجيل إعطاء جرعة بدون صرف مخزني
#
# هذه الدالة لا تنشئ Stock Entry.
# =========================================================

@frappe.whitelist()
def record_medication_administration(
    medication_request,
    encounter=None,
    dose=None,
    notes=None,
):

    if not medication_request:

        frappe.throw(
            "لم يتم تحديد طلب الدواء"
        )

    if not frappe.db.exists(
        "Medication Request",
        medication_request
    ):

        frappe.throw(
            "طلب الدواء غير موجود: "
            + str(medication_request)
        )

    request = frappe.get_doc(
        "Medication Request",
        medication_request
    )

    # -----------------------------------------------------
    # Encounter
    # -----------------------------------------------------

    if encounter:

        if not frappe.db.exists(
            "Patient Encounter",
            encounter
        ):

            frappe.throw(
                "الزيارة الطبية غير موجودة: "
                + str(encounter)
            )

        if (
            request.reason_reference
            and request.reason_reference
            != encounter
        ):

            frappe.throw(
                "طلب الدواء لا ينتمي إلى هذه الزيارة الطبية"
            )

    # -----------------------------------------------------
    # منع التكرار
    # -----------------------------------------------------

    if (
        request.er_administration_status
        == "Completed"
    ):

        return {

            "name":
                request.name,

            "status":
                "Completed",

            "administered_on":
                request.er_administered_on,

            "administered_by":
                request.er_administered_by,

            "message":
                "تم تسجيل إعطاء الجرعة مسبقًا",
        }

    # -----------------------------------------------------
    # الجرعة
    # -----------------------------------------------------

    administration_dose = (
        dose
        or ""
    )

    if not administration_dose:

        description = (
            request.order_description
            or ""
        )

        marker = (
            "الجرعة:"
        )

        if marker in description:

            try:

                administration_dose = (
                    description
                    .split(
                        marker,
                        1
                    )[1]
                    .split(
                        "\n",
                        1
                    )[0]
                    .strip()
                )

            except Exception:

                administration_dose = ""

    # -----------------------------------------------------
    # تحديث حالة الإعطاء
    # -----------------------------------------------------

    request.er_administration_status = (
        "Completed"
    )

    request.er_administered_on = (
        now_datetime()
    )

    request.er_administered_by = (
        frappe.session.user
    )

    request.er_administration_notes = (
        notes
        or ""
    )

    request.save(
        ignore_permissions=True
    )

    frappe.db.commit()

    return {

        "name":
            request.name,

        "status":
            request.er_administration_status,

        "administered_on":
            request.er_administered_on,

        "administered_by":
            request.er_administered_by,

        "dose":
            administration_dose,

        "message":
            "تم تسجيل إعطاء الجرعة بنجاح",
    }