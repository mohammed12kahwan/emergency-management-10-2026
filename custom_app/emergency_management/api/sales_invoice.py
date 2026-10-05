import frappe
import json

from erpnext.stock.get_item_details import get_item_price


# =====================================================
# جلب طلبات طوارئ محددة
# =====================================================

@frappe.whitelist()
def get_diagnostic_requests(names=None, company=None):

    if isinstance(names, str):
        names = json.loads(names)

    if not names:
        return []

    if not isinstance(names, list):
        frappe.throw(
            "قائمة طلبات الطوارئ غير صحيحة"
        )

    names = [
        str(name).strip()
        for name in names
        if name
    ]

    if not names:
        return []

    requests = frappe.get_all(

        "ER Diagnostic Request",

        filters={
            "name": ["in", names]
        },

        fields=[

            "name",
            "patient",
            "patient_name",
            "patient_encounter",
            "request_type",
            "test_name",
            "item_code",
            "quantity",
            "rate",
            "amount",
            "notes",
            "billing_status",
            "qty_invoiced",
            "lab_test",
            "radiology_examination",
            "creation"

        ],

        order_by="creation asc",

        limit_page_length=100

    )

    return build_invoice_requests(
        requests,
        company
    )


# =====================================================
# جلب جميع طلبات الطوارئ المتاحة للمريض
# =====================================================

@frappe.whitelist()
def get_patient_diagnostic_requests(
    patient,
    company=None
):

    if not patient:
        return []

    requests = frappe.get_all(

        "ER Diagnostic Request",

        filters={

            "patient":
                patient,

            "billing_status":
                ["in", ["Pending", "Partly Invoiced"]]

        },

        fields=[

            "name",
            "patient",
            "patient_name",
            "patient_encounter",
            "request_type",
            "test_name",
            "item_code",
            "quantity",
            "rate",
            "amount",
            "notes",
            "billing_status",
            "qty_invoiced",
            "lab_test",
            "radiology_examination",
            "creation"

        ],

        order_by="creation asc",

        limit_page_length=100

    )

    return build_invoice_requests(
        requests,
        company
    )


# =====================================================
# تجهيز طلبات الطوارئ للفوترة
# =====================================================

def build_invoice_requests(
    requests,
    company=None
):

    result = []

    for request in requests:

        # =============================================
        # الطلب المفوتر بالكامل
        # =============================================

        if request.billing_status == "Invoiced":
            continue

        # =============================================
        # يجب وجود Item
        # =============================================

        if not request.item_code:
            continue

        item = frappe.get_doc(
            "Item",
            request.item_code
        )

        if item.disabled:
            continue

        # =============================================
        # الكمية المتبقية
        # =============================================

        quantity = float(
            request.quantity or 0
        )

        qty_invoiced = float(
            request.qty_invoiced or 0
        )

        remaining_quantity = (
            quantity -
            qty_invoiced
        )

        if remaining_quantity <= 0:
            continue


        item_name = (
            item.item_name
            or request.test_name
            or request.item_code
        )

        # =============================================
        # وحدة القياس
        # =============================================

        uom = (
            item.sales_uom
            or item.stock_uom
            or "Nos"
        )

        # =============================================
        # السعر
        # Standard Selling Price
        # =============================================

        company_name = (
            company
            or frappe.defaults.get_user_default("Company")
        )

        if not company_name:
            frappe.throw(
                "لا يمكن تحديد الشركة لاستخراج سعر البيع القياسي."
            )

        currency = frappe.get_cached_value(
            "Company",
            company_name,
            "default_currency"
        )

        price_args = {
            "item_code": request.item_code,
            "price_list": "Standard Selling",
            "uom": uom,
            "transaction_date": frappe.utils.getdate(),
            "currency": currency,
            "qty": remaining_quantity,
        }

        item_prices = get_item_price(
            price_args,
            request.item_code,
            ignore_party=True
        )

        if not item_prices:
            frappe.throw(
                (
                    "لا يوجد سعر بيع قياسي للخدمة {0} "
                    "في قائمة الأسعار Standard Selling."
                ).format(
                    request.item_code
                )
            )

        rate = float(item_prices[0][1] or 0)

        if rate <= 0:
            frappe.throw(
                (
                    "سعر البيع القياسي للخدمة {0} غير صالح."
                ).format(
                    request.item_code
                )
            )

        amount = (
            remaining_quantity *
            rate
        )

        # =============================================
        # حساب الدخل
        # =============================================

        income_account = None

        if company:

            income_account = frappe.db.get_value(

                "Item Default",

                {
                    "parent":
                        request.item_code,

                    "company":
                        company
                },

                "income_account"

            )

        # =============================================
        # محاولة استخدام حساب الشركة الافتراضي
        # =============================================

        if not income_account and company:

            income_account = frappe.db.get_value(

                "Company",

                company,

                "default_income_account"

            )

        # =============================================
        # الوصف
        # =============================================

        description = (

            request.notes

            or request.test_name

            or item.description

            or item_name

        )

        # =============================================
        # النتيجة
        # =============================================

        result.append({

            "name":
                request.name,

            "patient":
                request.patient,

            "patient_name":
                request.patient_name,

            "patient_encounter":
                request.patient_encounter,

            "request_type":
                request.request_type,

            "test_name":
                request.test_name,

            "item_code":
                request.item_code,

            "item_name":
                item_name,

            "uom":
                uom,

            "stock_uom":
                item.stock_uom,

            "income_account":
                income_account,

            "description":
                description,

            "quantity":
                remaining_quantity,

            "original_quantity":
                quantity,

            "qty_invoiced":
                qty_invoiced,

            "rate":
                rate,

            "amount":
                amount,

            "billing_status":
                request.billing_status,

            "lab_test":
                request.lab_test,

            "radiology_examination":
                request.radiology_examination

        })

    return result