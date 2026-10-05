import frappe


def _lab_template(item_code):
    if not item_code:
        return None

    return frappe.db.get_value(
        "Lab Test Template",
        {
            "item": item_code,
            "disabled": 0,
        },
        "name",
    )


def on_submit(doc, event=None):
    """
    عند اعتماد Sales Invoice:
    - يحافظ على er_diagnostic_request الموجود في كل بند.
    - يربط كل ER Diagnostic Request بالفاتورة المعتمدة.
    - يحدّث qty_invoiced و billing_status.
    - يجهز مسار المختبر بعد اكتمال transaction الفاتورة.
    """

    eligible = []

    for item in doc.items or []:
        if not item.item_code:
            continue

        # -------------------------------------------------
        # ربط طلب الطوارئ الموجود فعليًا في بند الفاتورة
        # -------------------------------------------------
        if item.er_diagnostic_request:
            request = frappe.db.get_value(
                "ER Diagnostic Request",
                item.er_diagnostic_request,
                [
                    "name",
                    "request_type",
                    "quantity",
                ],
                as_dict=True,
            )

            if request:
                total_invoiced = frappe.db.sql(
                    """
                    SELECT COALESCE(SUM(sii.qty), 0)
                    FROM `tabSales Invoice Item` sii
                    INNER JOIN `tabSales Invoice` si
                        ON si.name = sii.parent
                    WHERE sii.er_diagnostic_request = %s
                      AND si.docstatus = 1
                    """,
                    request.name,
                )[0][0] or 0

                ordered_qty = float(request.quantity or 0)
                total_invoiced = float(total_invoiced)

                if ordered_qty > 0:
                    qty_invoiced = min(total_invoiced, ordered_qty)
                    billing_status = (
                        "Invoiced"
                        if total_invoiced >= ordered_qty
                        else "Partly Invoiced"
                    )
                else:
                    qty_invoiced = total_invoiced
                    billing_status = "Invoiced" if total_invoiced > 0 else "Pending"

                frappe.db.set_value(
                    "ER Diagnostic Request",
                    request.name,
                    {
                        "sales_invoice": doc.name,
                        "qty_invoiced": qty_invoiced,
                        "billing_status": billing_status,
                    },
                    update_modified=False,
                )

        # -------------------------------------------------
        # تجهيز مسار المختبر للطلبات المباشرة
        # -------------------------------------------------
        template = _lab_template(item.item_code)

        if template:
            eligible.append(item.item_code)

    if not eligible:
        return

    frappe.db.after_commit.add(
        lambda invoice_name=doc.name:
            process_submitted_sales_invoice(invoice_name)
    )

def process_submitted_sales_invoice(invoice_name):
    """
    تنفيذ مسار المختبر بعد اعتماد الفاتورة.
    آمن لإعادة التنفيذ: الدالة الحالية تعيد استخدام EDR
    الصحيح وتعيد تجهيز العينة والتقرير عند الحاجة.
    """

    from custom_app.emergency_management.page.er_laboratory.er_laboratory import (
        _prepare_direct_sales_invoice,
    )

    invoice = frappe.get_doc("Sales Invoice", invoice_name)

    if invoice.docstatus != 1:
        return

    for item in invoice.items or []:
        if not item.item_code:
            continue

        if not _lab_template(item.item_code):
            continue

        try:
            _prepare_direct_sales_invoice(
                sales_invoice=invoice.name,
                item_code=item.item_code,
            )
        except Exception:
            frappe.log_error(
                title=f"ER Laboratory Auto Workflow: {invoice.name} / {item.item_code}",
                message=frappe.get_traceback(),
            )
