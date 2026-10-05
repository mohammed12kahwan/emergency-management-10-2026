import frappe
import json
from frappe.utils import nowdate


# =====================================================
# خريطة نوع الأشعة إلى Item
# =====================================================

RADIOLOGY_ITEMS = {

    "X-Ray": {
        "item_code": "RAD-XRAY",
        "fallback_rate": 1000,
    },

    "CT Scan": {
        "item_code": "RAD-CT",
        "fallback_rate": 5000,
    },

    "MRI": {
        "item_code": "RAD-MRI",
        "fallback_rate": 8000,
    },

    "Ultrasound": {
        "item_code": "RAD-ULTRASOUND",
        "fallback_rate": 1500,
    },

    "ECG": {
        "item_code": "RAD-ECG",
        "fallback_rate": 500,
    },

    "Echo": {
        "item_code": "RAD-ECHO",
        "fallback_rate": 2500,
    },

    "Other": {
        "item_code": "اشعة",
        "fallback_rate": 0,
    },

}


# =====================================================
# أدوات مساعدة لمنع التكرار
# =====================================================

def has_completed_radiology_result(request):
    if request.radiology_status == "Completed":
        return True

    if not request.radiology_examination:
        return False

    if frappe.db.get_value(
        "Radiology Examination",
        request.radiology_examination,
        "status",
    ) == "Completed":
        return True

    return False


def find_active_duplicate_radiology_request(encounter_name, examination_type):
    candidates = frappe.get_all(
        "ER Diagnostic Request",
        filters={
            "patient_encounter": encounter_name,
            "test_name": examination_type,
            "request_type": "Radiology",
            "radiology_status": ["not in", ["Completed", "Cancelled"]],
        },
        fields=["name", "radiology_examination", "radiology_status"],
        order_by="creation asc",
    )

    for candidate in candidates:
        if not has_completed_radiology_result(candidate):
            return candidate.name

    return None


# =====================================================
# إنشاء طلب أشعة جديد
# =====================================================

@frappe.whitelist()
def create_radiology_examination(data):

    # =================================================
    # قراءة البيانات
    # =================================================

    if isinstance(data, str):
        data = json.loads(data)

    if not isinstance(data, dict):
        frappe.throw(
            "بيانات طلب الأشعة غير صحيحة"
        )

    # =================================================
    # التحقق من الزيارة
    # =================================================

    encounter_name = data.get("encounter")

    if not encounter_name:
        frappe.throw(
            "لا توجد زيارة طبية محددة"
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
            "لا يوجد مريض مرتبط بالزيارة"
        )

    if not encounter.practitioner:
        frappe.throw(
            "لا يوجد طبيب مرتبط بالزيارة"
        )

    # =================================================
    # بيانات الأشعة
    # =================================================

    examination_type = (
        data.get("examination_type")
        or ""
    ).strip()

    item_code = (
        data.get("item_code")
        or ""
    ).strip()

    body_part = (
        data.get("body_part")
        or ""
    ).strip()

    description = (
        data.get("description")
        or ""
    ).strip()

    quantity = float(
        data.get("quantity") or 1
    )

    notes = (
        data.get("notes")
        or ""
    ).strip()

    if not body_part:
        frappe.throw(
            "يجب إدخال منطقة الجسم"
        )

    if quantity <= 0:
        frappe.throw(
            "يجب أن تكون الكمية أكبر من صفر"
        )

    # =================================================
    # Item هو المصدر الحقيقي لطلب الأشعة من الطبيب
    # =================================================

    allowed_radiology_items = [
        "RAD-XRAY",
        "RAD-CT",
        "RAD-MRI",
        "RAD-ULTRASOUND",
        "RAD-ECG",
        "RAD-ECHO",
        "اشعة",
    ]

    if item_code:
        if item_code not in allowed_radiology_items:
            frappe.throw(
                "الصنف المحدد ليس من أصناف الأشعة المعتمدة."
            )

        if not frappe.db.exists(
            "Item",
            item_code
        ):
            frappe.throw(
                "Item الخاص بالأشعة غير موجود: "
                + str(item_code)
            )

        item = frappe.get_doc(
            "Item",
            item_code
        )

        if item.disabled:
            frappe.throw(
                "Item الخاص بالأشعة معطل: "
                + str(item_code)
            )

        if not item.is_sales_item:
            frappe.throw(
                "Item الخاص بالأشعة غير مفعّل للبيع: "
                + str(item_code)
            )

        examination_type = (
            item.item_name
            or examination_type
            or item.name
        ).strip()

        fallback_rate = 0.0

    else:
        # =================================================
        # توافق مع الطلبات القديمة
        # =================================================

        if not examination_type:
            frappe.throw(
                "يجب اختيار فحص الأشعة / Item"
            )

        item_config = RADIOLOGY_ITEMS.get(
            examination_type
        )

        if not item_config:
            frappe.throw(
                "نوع الأشعة غير معروف: "
                + str(examination_type)
            )

        item_code = item_config["item_code"]

        fallback_rate = float(
            item_config["fallback_rate"]
        )

        if not frappe.db.exists(
            "Item",
            item_code
        ):
            frappe.throw(
                "Item الخاص بالأشعة غير موجود: "
                + str(item_code)
            )

        item = frappe.get_doc(
            "Item",
            item_code
        )

    # =================================================
    # السعر
    # =================================================

    rate = float(
        item.standard_rate
        or fallback_rate
        or 0
    )

    amount = rate * quantity

    # =================================================
    # الملاحظات
    # =================================================

    auto_notes = (
        "نوع الأشعة: "
        + examination_type
        + "\n"
        + "منطقة الجسم: "
        + body_part
    )

    if description:
        auto_notes += (
            "\n"
            + "ملاحظات الطبيب: "
            + description
        )

    if notes:
        notes = (
            auto_notes
            + "\n\n"
            + notes
        )
    else:
        notes = auto_notes

    # =================================================
    # التحقق من التكرار
    # =================================================

    existing_request = find_active_duplicate_radiology_request(
        encounter.name,
        examination_type,
    )

    if existing_request:
        frappe.throw(
            "تم طلب هذا الفحص مسبقاً لهذه الزيارة: "
            + str(existing_request)
        )

    # =================================================
    # إنشاء ER Diagnostic Request
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

        "request_type":
            "Radiology",

        "test_name":
            examination_type,

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

        "radiology_status":
            "Requested",

        "billing_status":
            "Pending",

        "notes":
            notes,

        "qty_invoiced":
            0,

        "notes":
            notes

    })

    diagnostic_request.insert(
        ignore_permissions=True
    )

    # =================================================
    # إنشاء Radiology Examination
    # =================================================

    radiology = frappe.get_doc({

        "doctype":
            "Radiology Examination",

        "patient":
            encounter.patient,

        "requested_by":
            encounter.practitioner,

        "examination_type":
            examination_type,

        "body_part":
            body_part,

        "status":
            "Requested",

        "er_diagnostic_request":
            diagnostic_request.name

    })

    radiology.insert(
        ignore_permissions=True
    )

    # =================================================
    # ربط فحص الأشعة بالطلب
    # =================================================

    diagnostic_request.radiology_examination = (
        radiology.name
    )

    diagnostic_request.radiology_status = (
        "Requested"
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

        "radiology":
            radiology.name,

        "radiology_examination":
            radiology.name,

        "patient":
            encounter.patient,

        "patient_name":
            encounter.patient_name,

        "examination_type":
            examination_type,

        "body_part":
            body_part,

        "item_code":
            item_code,

        "quantity":
            quantity,

        "rate":
            rate,

        "amount":
            amount,

        "radiology_status":
            "Requested",

        "billing_status":
            "Pending",

        "message":
            "تم إنشاء طلب الأشعة بنجاح"

    }


# =====================================================
# إنشاء فحص أشعة جديد فقط
# =====================================================

@frappe.whitelist()
def create_radiology_examination_minimal(data):

    if isinstance(data, str):
        data = json.loads(data)

    examination_type = (
        data.get("examination_type")
        or ""
    ).strip()

    body_part = (
        data.get("body_part")
        or ""
    ).strip()

    result = (
        data.get("result")
        or ""
    ).strip()

    if not examination_type:
        frappe.throw(
            "يجب إدخال نوع الفحص"
        )

    if not body_part:
        frappe.throw(
            "يجب إدخال منطقة الجسم"
        )

    radiology = frappe.get_doc({

        "doctype":
            "Radiology Examination",

        "examination_type":
            examination_type,

        "body_part":
            body_part,

        "status":
            "Requested",

        "result":
            result or ""

    })

    radiology.insert(
        ignore_permissions=True
    )

    frappe.db.commit()

    return {

        "name":
            radiology.name,

        "examination_type":
            radiology.examination_type,

        "body_part":
            radiology.body_part,

        "status":
            radiology.status,

        "message":
            "تم إنشاء فحص الأشعة بنجاح"

    }


# =====================================================
# جلب طلبات الأشعة للزيارة الحالية
# =====================================================

@frappe.whitelist()
def get_radiology_requests(encounter):

    if not encounter:
        frappe.throw(
            "لا توجد زيارة طبية محددة"
        )

    if not frappe.db.exists(
        "Patient Encounter",
        encounter
    ):
        frappe.throw(
            "Patient Encounter غير موجود: "
            + str(encounter)
        )

    encounter_doc = frappe.get_doc(
        "Patient Encounter",
        encounter
    )

    requests = frappe.get_all(

        "ER Diagnostic Request",

        filters={

            "patient":
                encounter_doc.patient,

            "patient_encounter":
                encounter,

            "request_type":
                "Radiology"

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
            "radiology_examination",
            "radiology_status",
            "result",
            "notes",
            "billing_status",
            "qty_invoiced",
            "sales_invoice",
            "creation"

        ],

        order_by=
            "creation desc",

        limit_page_length=
            100

    )

    result = []

    for request in requests:

        row = dict(
            request
        )

        # =================================================
        # بيانات Item
        # =================================================

        if request.item_code:

            item = frappe.db.get_value(

                "Item",

                request.item_code,

                [
                    "item_name",
                    "standard_rate"
                ],

                as_dict=True

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

        # =================================================
        # بيانات Radiology Examination
        # =================================================

        if request.radiology_examination:

            radiology = frappe.db.get_value(

                "Radiology Examination",

                request.radiology_examination,

                [
                    "name",
                    "examination_no",
                    "examination_type",
                    "er_body_part",
                    "requested_by",
                    "technician",
                    "status",
                    "result",
                    "image_attachment",
                    "report_pdf"

                ],

                as_dict=True

            )

            row["radiology_details"] = (
                radiology
            )

            if radiology:

                row["radiology_status"] = (

                    radiology.get("status")
                    or request.radiology_status
                    or "Requested"

                )

                row["result"] = (

                    radiology.get("result")
                    or request.result
                    or ""

                )

                row["examination_type"] = (

                    radiology.get(
                        "examination_type"
                    )
                    or request.test_name
                    or "---"

                )

                row["body_part"] = (

                    radiology.get(
                        "er_body_part"
                    )
                    or "---"

                )

                row["examination_no"] = (

                    radiology.get(
                        "examination_no"
                    )
                    or radiology.get(
                        "name"
                    )
                    or "---"

                )

                row["requested_by"] = (

                    radiology.get(
                        "requested_by"
                    )
                    or "---"

                )

                row["technician"] = (

                    radiology.get(
                        "technician"
                    )
                    or "---"

                )

                row["image_attachment"] = (

                    radiology.get(
                        "image_attachment"
                    )

                )

                row["report_pdf"] = (

                    radiology.get(
                        "report_pdf"
                    )

                )

        else:

            row["radiology_details"] = None

            row["examination_type"] = (
                request.test_name
                or "---"
            )

            row["body_part"] = "---"

            row["examination_no"] = "---"

            row["requested_by"] = "---"

            row["technician"] = "---"

            row["image_attachment"] = None

            row["report_pdf"] = None

        result.append(
            row
        )

    return result


# =====================================================
# جلب تفاصيل طلب أشعة واحد
# =====================================================

@frappe.whitelist()
def get_radiology_result(
    encounter,
    diagnostic_request
):

    if not encounter:
        frappe.throw(
            "لا توجد زيارة طبية محددة"
        )

    if not diagnostic_request:
        frappe.throw(
            "لم يتم تحديد طلب الأشعة"
        )

    request = frappe.get_doc(
        "ER Diagnostic Request",
        diagnostic_request
    )

    if request.request_type != "Radiology":
        frappe.throw(
            "الطلب المحدد ليس طلب أشعة"
        )

    if request.patient_encounter != encounter:
        frappe.throw(
            "طلب الأشعة لا ينتمي إلى هذه الزيارة"
        )

    radiology = None

    if request.radiology_examination:

        radiology = frappe.get_doc(
            "Radiology Examination",
            request.radiology_examination
        )

    return {

        "diagnostic_request":
            request.as_dict(),

        "radiology":
            radiology.as_dict()
            if radiology
            else None

    }