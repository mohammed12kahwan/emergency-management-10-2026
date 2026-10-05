import frappe
import json
from frappe.utils import nowdate, nowtime


# =====================================================
# إنشاء طلب إجراء طبي
# ER Diagnostic Request = الرقم الموحد
# =====================================================

@frappe.whitelist()
def create_clinical_procedure(data):

    # =================================================
    # قراءة البيانات
    # =================================================

    if isinstance(data, str):
        data = json.loads(data)

    if not isinstance(data, dict):
        frappe.throw(
            "بيانات الإجراء الطبي غير صحيحة"
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
    # بيانات الإجراء
    # =================================================

    procedure_template = (
        data.get("procedure_template")
        or ""
    ).strip()

    notes = (
        data.get("notes")
        or ""
    ).strip()

    quantity = float(
        data.get("quantity") or 1
    )

    if not procedure_template:
        frappe.throw(
            "يجب اختيار قالب الإجراء الطبي"
        )

    if quantity <= 0:
        frappe.throw(
            "يجب أن تكون الكمية أكبر من صفر"
        )

    # =================================================
    # جلب قالب الإجراء
    # =================================================

    if not frappe.db.exists(
        "Clinical Procedure Template",
        procedure_template
    ):
        frappe.throw(
            "قالب الإجراء غير موجود: "
            + str(procedure_template)
        )

    template = frappe.get_doc(
        "Clinical Procedure Template",
        procedure_template
    )

    if template.disabled:
        frappe.throw(
            "قالب الإجراء معطل: "
            + str(procedure_template)
        )

    if not template.item:
        frappe.throw(
            "قالب الإجراء لا يحتوي على Item"
        )

    if not frappe.db.exists(
        "Item",
        template.item
    ):
        frappe.throw(
            "Item الخاص بالإجراء غير موجود: "
            + str(template.item)
        )

    item = frappe.get_doc(
        "Item",
        template.item
    )

    # =================================================
    # السعر
    # =================================================

    rate = float(
        template.rate
        or item.standard_rate
        or 0
    )

    amount = (
        rate * quantity
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
            "Procedure",

        "test_name":
            template.template,

        "item_code":
            template.item,

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

        "billing_status":
            "Pending",

        "qty_invoiced":
            0,

        "notes":
            notes

    })

    diagnostic_request.insert(
        ignore_permissions=True
    )

    # =================================================
    # إنشاء Clinical Procedure
    # =================================================

    procedure = frappe.get_doc({

        "doctype":
            "Clinical Procedure",

        "title":
            template.template,

        "procedure_template":
            template.name,

        "patient":
            encounter.patient,

        "patient_name":
            encounter.patient_name,

        "practitioner":
            encounter.practitioner,

        "practitioner_name":
            encounter.practitioner_name,

        "medical_department":
            encounter.medical_department,

        "company":
            getattr(
                encounter,
                "company",
                None
            ),

        "start_date":
            nowdate(),

        "start_time":
            nowtime(),

        "notes":
            notes,

        "status":
            "Pending"

    })

    procedure.insert(
        ignore_permissions=True,
        ignore_mandatory=True
    )

    # =================================================
    # ربط الإجراء بطلب الطوارئ
    # =================================================

    diagnostic_request.clinical_procedure = (
        procedure.name
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

        "clinical_procedure":
            procedure.name,

        "procedure":
            procedure.name,

        "procedure_template":
            template.name,

        "item_code":
            template.item,

        "item_name":
            item.item_name,

        "quantity":
            quantity,

        "rate":
            rate,

        "amount":
            amount,

        "billing_status":
            "Pending",

        "patient":
            encounter.patient,

        "patient_name":
            encounter.patient_name,

        "message":
            "تم إنشاء طلب الإجراء الطبي بنجاح"

    }


# =====================================================
# جلب إجراءات الزيارة الحالية
# =====================================================

@frappe.whitelist()
def get_clinical_procedures(encounter):

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
                "Procedure"

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
            "clinical_procedure",
            "result",
            "notes",
            "billing_status",
            "qty_invoiced",
            "sales_invoice",
            "creation"

        ],

        order_by="creation desc",

        limit_page_length=100

    )

    result = []

    for request in requests:

        row = dict(
            request
        )

        # =============================================
        # بيانات Item
        # =============================================

        if request.item_code:

            item = frappe.db.get_value(

                "Item",

                request.item_code,

                [
                    "item_name",
                    "standard_rate",
                    "stock_uom"
                ],

                as_dict=True

            )

            if item:

                row["item_name"] = (
                    item.item_name
                )

                row["uom"] = (
                    item.stock_uom
                    or "Nos"
                )

            else:

                row["item_name"] = (
                    request.test_name
                    or "---"
                )

                row["uom"] = "Nos"

        else:

            row["item_name"] = (
                request.test_name
                or "---"
            )

            row["uom"] = "Nos"

        result.append(
            row
        )

    return result


# =====================================================
# جلب تفاصيل إجراء واحد
# =====================================================

@frappe.whitelist()
def get_clinical_procedure_result(
    encounter,
    diagnostic_request
):

    if not encounter:
        frappe.throw(
            "لا توجد زيارة طبية محددة"
        )

    if not diagnostic_request:
        frappe.throw(
            "لم يتم تحديد طلب الإجراء"
        )

    request = frappe.get_doc(
        "ER Diagnostic Request",
        diagnostic_request
    )

    if request.request_type != "Procedure":
        frappe.throw(
            "الطلب المحدد ليس طلب إجراء"
        )

    if request.patient_encounter != encounter:
        frappe.throw(
            "طلب الإجراء لا ينتمي إلى هذه الزيارة"
        )

    procedure = None

    if request.clinical_procedure:

        procedure = frappe.get_doc(
            "Clinical Procedure",
            request.clinical_procedure
        )

    return {

        "diagnostic_request":
            request.as_dict(),

        "clinical_procedure":
            procedure.as_dict()
            if procedure
            else None

    }