import frappe
from frappe import _
from frappe.utils import now_datetime

from healthcare.healthcare.doctype.observation.observation import (
    aggregate_and_return_observation_data,
)


LABORATORY_ROLES = {
    "Laboratory User",
    "Healthcare Administrator",
    "System Manager",
}


def require_laboratory_access():
    if frappe.session.user == "Guest":
        frappe.throw("يجب تسجيل الدخول للوصول إلى المختبر")
    if not LABORATORY_ROLES.intersection(
        set(frappe.get_roles(frappe.session.user))
    ):
        frappe.throw("ليس لديك صلاحية الوصول إلى المختبر")


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


def ensure_diagnostic_report(request, sample_collection, lab_test):
    diagnostic_report = frappe.db.get_value(
        "Diagnostic Report",
        {
            "patient": request.patient,
            "sample_collection": sample_collection,
            "docstatus": ["!=", 2],
        },
        "name",
        order_by="creation desc",
    )

    if not diagnostic_report:
        diagnostic_report = frappe.db.get_value(
            "Diagnostic Report",
            {
                "patient": request.patient,
                "ref_doctype": "Lab Test",
                "docname": lab_test,
                "docstatus": ["!=", 2],
            },
            "name",
            order_by="creation desc",
        )

    if diagnostic_report:
        frappe.db.set_value(
            "Diagnostic Report",
            diagnostic_report,
            {
                "patient": request.patient,
                "ref_doctype": "Lab Test",
                "docname": lab_test,
                "sample_collection": sample_collection,
            },
            update_modified=False,
        )
        return diagnostic_report

    diagnostic_report = frappe.new_doc("Diagnostic Report")
    diagnostic_report.patient = request.patient
    diagnostic_report.patient_name = request.patient_name
    diagnostic_report.ref_doctype = "Lab Test"
    diagnostic_report.docname = lab_test
    diagnostic_report.sample_collection = sample_collection
    diagnostic_report.practitioner = frappe.db.get_value(
        "Lab Test", lab_test, "practitioner"
    )
    diagnostic_report.company = (
        frappe.db.get_value("Lab Test", lab_test, "company")
        or frappe.defaults.get_global_default("company")
    )
    diagnostic_report.status = "Open"
    diagnostic_report.insert(ignore_permissions=True)
    return diagnostic_report.name


def create_sample_observations(
    selected,
    sample_collection,
    report_name=None,
    preserve_approved=False,
):
    from healthcare.healthcare.doctype.sample_collection.sample_collection import (
        insert_observation,
    )

    insert_observation(
        selected=selected,
        sample_collection=sample_collection,
    )

    report_name = report_name or frappe.db.get_value(
        "Diagnostic Report",
        {
            "sample_collection": sample_collection,
            "docstatus": ["!=", 2],
        },
        "name",
        order_by="creation desc",
    )
    if report_name:
        if not preserve_approved:
            frappe.db.set_value(
                "Diagnostic Report",
                report_name,
                "status",
                "Open",
                update_modified=False,
            )


@frappe.whitelist()
def approve_all_diagnostic_report_observations(report_name):
    """
    اعتماد جميع نتائج Diagnostic Report دفعة واحدة.

    لا نغيّر منطق Healthcare القياسي:
    كل Observation تمر عبر set_observation_status(..., "Approved")
    حتى تستمر آلية تحديث Diagnostic Report القياسية.
    """
    require_laboratory_access()

    if not report_name:
        frappe.throw("لم يتم تحديد تقرير التشخيص")

    report = frappe.db.get_value(
        "Diagnostic Report",
        report_name,
        [
            "name",
            "patient",
            "ref_doctype",
            "docname",
            "sample_collection",
            "status",
        ],
        as_dict=True,
    )

    if not report:
        frappe.throw("تقرير التشخيص غير موجود")

    sample_collection = report.sample_collection

    if (
        not sample_collection
        and report.ref_doctype == "Lab Test"
        and report.docname
    ):
        sample_collection = frappe.db.get_value(
            "Lab Test",
            report.docname,
            "sample",
        )

    if not sample_collection:
        frappe.throw(
            "لا توجد عينة مرتبطة بتقرير التشخيص."
        )

    observations = frappe.get_all(
        "Observation",
        filters={
            "reference_doctype": "Sample Collection",
            "reference_docname": sample_collection,
            "docstatus": ["!=", 2],
        },
        fields=[
            "name",
            "status",
        ],
        order_by="creation asc",
        limit_page_length=500,
    )

    if not observations:
        frappe.throw(
            "لا توجد نتائج مخبرية لاعتمادها في هذا التقرير."
        )

    from healthcare.healthcare.doctype.observation.observation import (
        set_observation_status,
    )

    approved = 0
    already_approved = 0

    for observation in observations:
        if observation.status == "Approved":
            already_approved += 1
            continue

        set_observation_status(
            observation=observation.name,
            status="Approved",
        )
        approved += 1

    frappe.db.commit()

    final_status = frappe.db.get_value(
        "Diagnostic Report",
        report_name,
        "status",
    )

    return {
        "report": report_name,
        "approved_count": approved,
        "already_approved_count": already_approved,
        "total_count": len(observations),
        "report_status": final_status,
        "message": (
            f"تم اعتماد {approved} نتيجة"
            if approved
            else "جميع النتائج معتمدة مسبقًا."
        ),
    }


@frappe.whitelist()
def get_er_diagnostic_report_observations(report_name):
    require_laboratory_access()
    report = frappe.db.get_value(
        "Diagnostic Report",
        report_name,
        ["patient", "ref_doctype", "docname", "sample_collection"],
        as_dict=True,
    )
    if not report:
        frappe.throw("تقرير التشخيص غير موجود")

    if report.ref_doctype != "Lab Test":
        return [], 0

    sample_collection = report.sample_collection or frappe.db.get_value(
        "Lab Test", report.docname, "sample"
    )
    if not sample_collection:
        return [], 0

    if frappe.db.get_value("Sample Collection", sample_collection, "patient") != report.patient:
        frappe.throw("العينة لا تخص المريض في تقرير التشخيص")

    observations = frappe.get_all(
        "Observation",
        filters={
            "reference_doctype": "Sample Collection",
            "reference_docname": sample_collection,
            "parent_observation": "",
            "status": ["!=", "Cancelled"],
            "docstatus": ["!=", 2],
        },
        fields="*",
        order_by="creation",
        limit_page_length=500,
    )
    return aggregate_and_return_observation_data(observations)



# =====================================================
# تحويل فاتورة مختبر مباشرة إلى مسار المختبر الكامل
# =====================================================

def _prepare_direct_sales_invoice(sales_invoice, item_code=None):

    if not sales_invoice:
        frappe.throw("لم يتم تحديد فاتورة المبيعات")

    invoice = frappe.get_doc("Sales Invoice", sales_invoice)

    if invoice.docstatus != 1:
        frappe.throw("فاتورة المبيعات غير معتمدة")

    # -------------------------------------------------
    # اختيار بند مختبري من الفاتورة
    # -------------------------------------------------

    item_rows = frappe.get_all(
        "Sales Invoice Item",
        filters={
            "parent": sales_invoice,
            **({"item_code": item_code} if item_code else {}),
        },
        fields=[
            "name",
            "item_code",
            "item_name",
            "qty",
            "rate",
            "amount",
            "er_diagnostic_request",
        ],
        order_by="idx asc",
        limit_page_length=100,
    )

    if not item_rows:
        frappe.throw("لم يتم العثور على بند الفحص في الفاتورة")

    selected = None

    for row in item_rows:
        item_group = frappe.db.get_value(
            "Item",
            row.item_code,
            "item_group",
        )

        has_template = frappe.db.exists(
            "Lab Test Template",
            {
                "item": row.item_code,
                "disabled": 0,
            },
        )

        if item_group == "Laboratory" or has_template:
            selected = row
            break

    if not selected:
        frappe.throw(
            "لا يوجد بند مختبري مؤهل في الفاتورة"
        )

    # -------------------------------------------------
    # إذا كان البند مربوطًا بالفعل
    # -------------------------------------------------

    linked_request_invoice = None
    if selected.er_diagnostic_request:
        linked_request_invoice = frappe.db.get_value(
            "ER Diagnostic Request",
            selected.er_diagnostic_request,
            "sales_invoice",
        )

    if (
        selected.er_diagnostic_request
        and linked_request_invoice == sales_invoice
    ):
        request = frappe.get_doc(
            "ER Diagnostic Request",
            selected.er_diagnostic_request,
        )

        sample = create_sample_collection(
            request.name
        )

        sample_collection_name = (
            sample.get("name")
            if isinstance(sample, dict)
            else sample
        )

        diagnostic_report = None
        if sample_collection_name and request.lab_test:
            diagnostic_report = ensure_diagnostic_report(
                request,
                sample_collection_name,
                request.lab_test,
            )

        frappe.db.commit()

        return {
            "diagnostic_request": request.name,
            "lab_test": request.lab_test,
            "sample_collection": sample_collection_name,
            "sample": (
                sample.get("sample")
                if isinstance(sample, dict)
                else None
            ),
            "diagnostic_report": diagnostic_report,
            "message": (
                "الفاتورة مرتبطة بطلب مختبر مسبقًا "
                "وتم تجهيز العينة والتقرير."
            ),
        }

    patient = invoice.patient

    if not patient:
        frappe.throw(
            "الفاتورة لا تحتوي على مريض مرتبط"
        )

    # -------------------------------------------------
    # اختيار زيارة الطوارئ المناسبة
    #
    # الأولوية:
    # قيد الفحص → بانتظار الطبيب → تحت الفرز
    # ثم الأحدث إنشاءً، بشرط أن تكون الزيارة قبل الفاتورة.
    # -------------------------------------------------

    encounter_rows = frappe.db.sql(
        """
        SELECT
            pe.name,
            pe.patient,
            pe.patient_name,
            pe.practitioner,
            pe.practitioner_name,
            pe.medical_department,
            pe.creation,
            epi.status AS intake_status
        FROM `tabPatient Encounter` pe
        LEFT JOIN `tabER Patient Intake` epi
            ON epi.patient_encounter = pe.name
        WHERE pe.patient = %(patient)s
          AND pe.docstatus = 0
          AND pe.creation <= %(invoice_creation)s
          AND (
                epi.name IS NULL
                OR COALESCE(epi.status, '') NOT IN (
                    'خروج',
                    'Cancelled',
                    'Closed'
                )
          )
        ORDER BY
            CASE COALESCE(epi.status, '')
                WHEN 'قيد الفحص' THEN 0
                WHEN 'بانتظار الطبيب' THEN 1
                WHEN 'تحت الفرز' THEN 2
                ELSE 3
            END,
            pe.creation DESC
        LIMIT 1
        """,
        {
            "patient": patient,
            "invoice_creation": invoice.creation,
        },
        as_dict=True,
    )

    if not encounter_rows:
        frappe.throw(
            "لا توجد زيارة طوارئ مفتوحة مناسبة لهذه الفاتورة. "
            "افتح زيارة الطبيب للمريض أولًا."
        )

    encounter = encounter_rows[0]
    encounter_name = encounter.name

    # -------------------------------------------------
    # استخدام الطلب الموجود إن كان قد أُنشئ مسبقًا
    # لنفس الزيارة ونفس الصنف
    # -------------------------------------------------

    existing_request_name = frappe.db.get_value(
        "ER Diagnostic Request",
        {
            "patient": patient,
            "patient_encounter": encounter_name,
            "request_type": "Laboratory",
            "item_code": selected.item_code,
            "sales_invoice": sales_invoice,
            "lab_status": ["!=", "Cancelled"],
        },
        "name",
        order_by="creation desc",
    )

    created_new_request = False

    if existing_request_name:
        request = frappe.get_doc(
            "ER Diagnostic Request",
            existing_request_name,
        )
    else:
        # -------------------------------------------------
        # إعادة استخدام منشئ المختبر الموجود أصلًا
        # -------------------------------------------------

        import json

        from custom_app.emergency_management.page.er_visit_console.python.labs.labs import (
            create_lab_request,
        )

        created = create_lab_request(
            data=json.dumps(
                {
                    "encounter": encounter_name,
                    "test_name": (
                        selected.item_name
                        or selected.item_code
                    ),
                    "item_code": selected.item_code,
                    "quantity": selected.qty or 1,
                    "rate": selected.rate or 0,
                    "sales_invoice": sales_invoice,
                    "notes": (
                        "تم إنشاء طلب المختبر من "
                        f"الفاتورة المباشرة {sales_invoice}"
                    ),
                }
            )
        )

        request_name = (
            created.get("diagnostic_request")
            or created.get("request_number")
            or created.get("name")
        )

        if not request_name:
            frappe.throw(
                "تعذر إنشاء طلب المختبر من الفاتورة"
            )

        request = frappe.get_doc(
            "ER Diagnostic Request",
            request_name,
        )

        created_new_request = True

    # -------------------------------------------------
    # ربط الطلب بالفاتورة
    # -------------------------------------------------

    if not request.sales_invoice:
        request.sales_invoice = sales_invoice

    request.billing_status = "Invoiced"
    request.qty_invoiced = selected.qty or 0

    request.save(
        ignore_permissions=True
    )

    # -------------------------------------------------
    # ربط بند الفاتورة بطلب المختبر
    # حتى لا يعود كسجل Direct Invoice مستقل
    # -------------------------------------------------

    frappe.db.set_value(
        "Sales Invoice Item",
        selected.name,
        "er_diagnostic_request",
        request.name,
        update_modified=False,
    )

    # -------------------------------------------------
    # إنشاء / تحديث Sample Collection
    # -------------------------------------------------

    sample = create_sample_collection(
        request.name,
        isolate_sample=created_new_request,
    )

    sample_collection_name = (
        sample.get("name")
        if isinstance(sample, dict)
        else sample
    )

    diagnostic_report = None
    if sample_collection_name and request.lab_test:
        diagnostic_report = ensure_diagnostic_report(
            request,
            sample_collection_name,
            request.lab_test,
        )

    frappe.db.commit()

    return {
        "diagnostic_request": request.name,
        "lab_test": request.lab_test,
        "sample_collection": (
            sample.get("name")
            if isinstance(sample, dict)
            else sample
        ),
        "sample": (
            sample.get("sample")
            if isinstance(sample, dict)
            else None
        ),
        "diagnostic_report": diagnostic_report,
        "encounter": encounter_name,
        "sales_invoice": sales_invoice,
        "message": (
            "تم تحويل الفاتورة المباشرة إلى "
            "طلب مختبر وإنشاء سجل العينة بنجاح."
        ),
    }

# =====================================================
# واجهة تجهيز الفاتورة من لوحة المختبر
# =====================================================

@frappe.whitelist()
def prepare_direct_sales_invoice(sales_invoice, item_code=None):
    require_laboratory_access()
    return _prepare_direct_sales_invoice(
        sales_invoice=sales_invoice,
        item_code=item_code,
    )


# =====================================================
# بيانات طلبات المختبر
# =====================================================

@frappe.whitelist()
def get_laboratory_requests():
    require_laboratory_access()

    requests = frappe.get_all(
        "ER Diagnostic Request",
        filters={
            "request_type": "Laboratory",
        },
        fields=[
            "name",
            "request_date",
            "patient",
            "patient_name",
            "patient_encounter",
            "test_name",
            "item_code",
            "quantity",
            "rate",
            "amount",
            "lab_test",
            "lab_status",
            "billing_status",
            "qty_invoiced",
            "sales_invoice",
            "notes",
            "creation",
        ],
        order_by="creation desc",
        limit_page_length=200,
    )

    result = []

    for request in requests:

        row = dict(request)
        row["priority"] = frappe.db.get_value(
            "Patient Encounter",
            request.patient_encounter,
            "er_priority",
        )
        er_context = frappe.db.get_value(
            "Patient Encounter",
            request.patient_encounter,
            ["er_priority", "er_acuity"],
            as_dict=True,
        ) or frappe._dict()
        row["priority"] = er_context.get("er_priority")
        row["acuity"] = er_context.get("er_acuity")
        row["priority_color"] = frappe.db.get_value(
            "ER Priority", row["priority"], "colorpr"
        )
        row["acuity_color"] = frappe.db.get_value(
            "ER Triage Level", row["acuity"], "color"
        )

        row["lab_test_status"] = None
        row["lab_sample"] = None
        row["sample_collection"] = None
        row["sample_status"] = None
        row["sample_qty"] = None
        row["sample_uom"] = None
        row["diagnostic_report"] = None

        if request.lab_test:

            lab_test = frappe.db.get_value(
                "Lab Test",
                request.lab_test,
                [
                    "name",
                    "template",
                    "status",
                    "sample",
                    "company",
                    "employee",
                    "employee_name",
                    "date",
                    "time",
                    "result_date",
                ],
                as_dict=True,
            )

            if lab_test:

                row["lab_test_status"] = (
                    lab_test.status or "Draft"
                )

                row["lab_sample"] = (
                    lab_test.sample
                )

                # -----------------------------------------
                # بيانات القالب
                # -----------------------------------------

                if lab_test.template:

                    template = frappe.db.get_value(
                        "Lab Test Template",
                        lab_test.template,
                        [
                            "lab_test_name",
                            "sample",
                            "sample_uom",
                            "sample_qty",
                            "sample_details",
                        ],
                        as_dict=True,
                    )

                    if template:

                        row["required_sample"] = (
                            template.sample
                        )

                        row["sample_qty"] = (
                            template.sample_qty
                        )

                        row["sample_uom"] = (
                            template.sample_uom
                        )

                        row["sample_details"] = (
                            template.sample_details
                        )

        # ---------------------------------------------
        # Sample Collection المرتبطة بالـ Lab Test
        # ---------------------------------------------

        if request.lab_test:
            sample_collection = []

            if lab_test and lab_test.sample:
                sample_collection = frappe.get_all(
                    "Sample Collection",
                    filters={
                        "name": lab_test.sample,
                        "docstatus": ["!=", 2],
                    },
                    fields=[
                        "name",
                        "status",
                        "patient",
                        "sample",
                        "sample_uom",
                        "sample_qty",
                        "collected_by",
                        "collected_time",
                        "collection_point",
                        "sample_details",
                        "creation",
                    ],
                )

            if not sample_collection:
                sample_collection = frappe.get_all(
                    "Sample Collection",
                    filters={
                        "reference_doc": "Lab Test",
                        "reference_name": request.lab_test,
                        "docstatus": ["!=", 2],
                    },
                    fields=[
                        "name",
                        "status",
                        "patient",
                        "sample",
                        "sample_uom",
                        "sample_qty",
                        "collected_by",
                        "collected_time",
                        "collection_point",
                        "sample_details",
                        "creation",
                    ],
                    order_by="creation desc",
                    limit_page_length=1,
                )

            if sample_collection:

                sample = sample_collection[0]

                row["sample_collection"] = (
                    sample.name
                )

                row["sample_status"] = (
                    sample.status
                )

                # -----------------------------------------
                # Diagnostic Report
                # -----------------------------------------

                diagnostic_report = frappe.db.get_value(
                    "Diagnostic Report",
                    {
                        "sample_collection": sample.name,
                        "docstatus": ["!=", 2],
                    },
                    "name",
                    order_by="creation desc",
                )

                if not diagnostic_report:
                    diagnostic_report = frappe.db.get_value(
                        "Diagnostic Report",
                        {
                            "ref_doctype": "Lab Test",
                            "docname": request.lab_test,
                            "docstatus": ["!=", 2],
                        },
                        "name",
                        order_by="creation desc",
                    )

                row["diagnostic_report"] = diagnostic_report

                row["collected_by"] = (
                    sample.collected_by
                )

                row["collected_time"] = (
                    sample.collected_time
                )

        result.append(row)

    # =====================================================
    # فواتير المبيعات المباشرة لخدمات المختبر
    #
    # إذا كانت الفاتورة تحتوي صنفًا من Item Group = Laboratory
    # ولا تحمل er_diagnostic_request، تدخل كعمل مختبري مستقل.
    #
    # لا ننشئ ER Diagnostic Request وهميًا ولا نربط الفاتورة
    # بطلب قديم بشكل تخميني.
    # =====================================================

    direct_invoice_rows = frappe.db.sql(
        '''
        SELECT
            si.name AS sales_invoice,
            si.patient AS patient,
            si.customer AS customer,
            si.posting_date AS posting_date,
            si.creation AS creation,
            sii.item_code AS item_code,
            sii.item_name AS item_name,
            sii.qty AS quantity,
            sii.rate AS rate,
            sii.amount AS amount
        FROM `tabSales Invoice` si
        INNER JOIN `tabSales Invoice Item` sii
            ON sii.parent = si.name
            AND sii.parenttype = 'Sales Invoice'
        INNER JOIN `tabItem` item
            ON item.name = sii.item_code
        WHERE si.docstatus = 1
          AND (
              item.item_group = 'Laboratory'
              OR EXISTS (
                  SELECT 1
                  FROM `tabLab Test Template` ltt
                  WHERE ltt.item = sii.item_code
              )
          )
          AND (
                COALESCE(sii.er_diagnostic_request, '') = ''
                OR NOT EXISTS (
                    SELECT 1
                    FROM `tabER Diagnostic Request` linked_edr
                    WHERE linked_edr.name = sii.er_diagnostic_request
                      AND linked_edr.sales_invoice = si.name
                      AND linked_edr.request_type = 'Laboratory'
                )
          )
        ORDER BY si.creation DESC, sii.idx ASC
        LIMIT 200
        ''',
        as_dict=True,
    )

    for invoice_row in direct_invoice_rows:
        patient = invoice_row.patient or invoice_row.customer

        result.append(
            {
                "name": invoice_row.sales_invoice,
                "request_date": invoice_row.posting_date,
                "creation": invoice_row.creation,
                "patient": patient,
                "patient_name": invoice_row.customer or patient,
                "patient_encounter": None,
                "test_name": (
                    invoice_row.item_name
                    or invoice_row.item_code
                    or "خدمة مختبر"
                ),
                "item_code": invoice_row.item_code,
                "quantity": invoice_row.quantity,
                "rate": invoice_row.rate,
                "amount": invoice_row.amount,
                "lab_test": None,
                "lab_status": "Pending",
                "billing_status": "Invoiced",
                "qty_invoiced": invoice_row.quantity,
                "sales_invoice": invoice_row.sales_invoice,
                "notes": "فاتورة مبيعات مباشرة لخدمة مختبر",
                "creation": invoice_row.creation,
                "priority": None,
                "acuity": None,
                "priority_color": None,
                "acuity_color": None,
                "lab_test_status": None,
                "lab_sample": None,
                "sample_collection": None,
                "sample_status": None,
                "sample_qty": None,
                "sample_uom": None,
                "diagnostic_report": None,
                "collected_by": None,
                "collected_time": None,
                "work_source": "sales_invoice",
            }
        )

    # توحيد ترتيب طلبات المختبر:
    # الطلبات الجديدة، بما فيها الفواتير المباشرة،
    # تظهر أولًا حسب وقت الإنشاء.
    result.sort(
        key=lambda row: str(
            row.get("creation")
            or row.get("request_date")
            or ""
        ),
        reverse=True,
    )

    return result


# =====================================================
# إنشاء / مزامنة Sample Collection من طلب المختبر
# =====================================================

@frappe.whitelist()
def create_sample_collection(diagnostic_request, isolate_sample=False):
    require_laboratory_access()

    if not diagnostic_request:
        frappe.throw(
            _("لم يتم تحديد طلب المختبر")
        )

    request = frappe.get_doc(
        "ER Diagnostic Request",
        diagnostic_request,
    )

    if request.request_type != "Laboratory":
        frappe.throw(
            _("الطلب المحدد ليس طلب مختبر")
        )

    if not request.lab_test:
        frappe.throw(
            _("لا يوجد Lab Test مرتبط بالطلب")
        )

    # ---------------------------------------------
    # Lab Test الحالي
    # ---------------------------------------------

    current_lab_test = frappe.get_doc(
        "Lab Test",
        request.lab_test,
    )

    if not current_lab_test.template:
        frappe.throw(
            _("لا يوجد Lab Test Template مرتبط بالفحص")
        )

    current_template = frappe.get_doc(
        "Lab Test Template",
        current_lab_test.template,
    )

    if not current_template.sample:
        frappe.throw(
            _("لم يتم تعريف نوع العينة في قالب الفحص: ")
            + str(current_template.name)
        )

    # ---------------------------------------------
    # جميع Lab Tests لنفس زيارة الطوارئ
    # والتي تستخدم نفس نوع العينة
    # ---------------------------------------------

    if isolate_sample:
        related_lab_tests = [request.lab_test]
    else:
        related_requests = frappe.get_all(
            "ER Diagnostic Request",
            filters={
                "patient_encounter": request.patient_encounter,
                "patient": request.patient,
                "request_type": "Laboratory",
                "lab_test": ["is", "set"],
            },
            fields=[
                "name",
                "lab_test",
                "test_name",
            ],
            order_by="creation asc",
            limit_page_length=200,
        )

        related_lab_tests = []

        for row in related_requests:
            if row.lab_test:
                related_lab_tests.append(row.lab_test)

        if request.lab_test not in related_lab_tests:
            related_lab_tests.append(request.lab_test)

        related_lab_tests = list(dict.fromkeys(related_lab_tests))

    # ---------------------------------------------
    # الاحتفاظ فقط بالفحوصات التي تستخدم نفس العينة
    # ---------------------------------------------

    if isolate_sample:
        compatible_lab_tests = [request.lab_test]
    else:
        compatible_lab_tests = []

        for lab_test_name in related_lab_tests:

            lab_test_data = frappe.db.get_value(
                "Lab Test",
                lab_test_name,
                ["name", "template", "patient"],
                as_dict=True,
            )

            if not lab_test_data:
                continue

            if lab_test_data.patient != request.patient:
                continue

            if not lab_test_data.template:
                continue

            # -------------------------------------------------
            # لا نسمح باستخدام Lab Test واحد عبر زيارات مختلفة
            # عند تكوين Sample Collection جديدة.
            # -------------------------------------------------
            encounter_rows = frappe.db.sql(
                """
                SELECT DISTINCT patient_encounter
                FROM `tabER Diagnostic Request`
                WHERE lab_test = %s
                  AND patient = %s
                  AND request_type = 'Laboratory'
                  AND patient_encounter IS NOT NULL
                """,
                (
                    lab_test_data.name,
                    request.patient,
                ),
                as_dict=True,
            )

            lab_test_encounters = {
                row.patient_encounter
                for row in encounter_rows
                if row.patient_encounter
            }

            if (
                request.patient_encounter
                and any(
                    encounter != request.patient_encounter
                    for encounter in lab_test_encounters
                )
            ):
                continue

            template_sample = frappe.db.get_value(
                "Lab Test Template",
                lab_test_data.template,
                "sample",
            )

            if template_sample == current_template.sample:
                compatible_lab_tests.append(
                    lab_test_data.name
                )

        if request.lab_test not in compatible_lab_tests:
            compatible_lab_tests.append(
                request.lab_test
            )

        compatible_lab_tests = list(
            dict.fromkeys(compatible_lab_tests)
        )

    # ---------------------------------------------
    # البحث عن Sample Collection قابلة للتعديل
    #
    # نعيد استخدام العينة فقط إذا كانت مرتبطة
    # بأحد Lab Tests من نفس زيارة الطوارئ.
    #
    # لا نستخدم Patient + Sample فقط، لأن المريض
    # قد يكون لديه أكثر من زيارة مختبرية.
    # ---------------------------------------------

    # ---------------------------------------------
    # تحديد Sample Collection قابلة لإعادة الاستخدام
    #
    # شروط إعادة الاستخدام:
    # 1) غير ملغاة وغير Submitted
    # 2) ليست Collected
    # 3) مرتبطة بفحوصات من نفس patient_encounter فقط
    #
    # بهذا:
    # - الطلب الجديد في زيارة جديدة يحصل على رقم عينة جديد.
    # - العينة السابقة Collected لا يعاد استخدامها.
    # - الفحوصات المفتوحة لنفس الزيارة يمكنها مشاركة العينة.
    # ---------------------------------------------

    def _safe_reusable_sample(sample_name):
        if not sample_name:
            return None

        sample_doc = frappe.db.get_value(
            "Sample Collection",
            sample_name,
            [
                "name",
                "status",
                "sample",
                "sample_uom",
                "sample_qty",
                "docstatus",
                "creation",
            ],
            as_dict=True,
        )

        if not sample_doc:
            return None

        if sample_doc.docstatus != 0:
            return None

        if sample_doc.status == "Collected":
            return None

        if not request.patient_encounter:
            return None

        encounter_rows = frappe.db.sql(
            """
            SELECT DISTINCT edr.patient_encounter
            FROM `tabLab Test` lt
            INNER JOIN `tabER Diagnostic Request` edr
                ON edr.lab_test = lt.name
            WHERE lt.sample = %s
              AND edr.patient = %s
              AND edr.request_type = 'Laboratory'
              AND edr.patient_encounter IS NOT NULL
            """,
            (
                sample_name,
                request.patient,
            ),
            as_dict=True,
        )

        linked_encounters = {
            row.patient_encounter
            for row in encounter_rows
            if row.patient_encounter
        }

        if not linked_encounters:
            return None

        if any(
            encounter != request.patient_encounter
            for encounter in linked_encounters
        ):
            return None

        return sample_doc

    existing = []
    candidate_sample_names = []

    for lab_test_name in compatible_lab_tests:
        linked_sample = frappe.db.get_value(
            "Lab Test",
            lab_test_name,
            "sample",
        )

        if linked_sample:
            candidate_sample_names.append(linked_sample)

    if compatible_lab_tests:
        referenced_collections = frappe.get_all(
            "Sample Collection",
            filters={
                "reference_doc": "Lab Test",
                "reference_name": ["in", compatible_lab_tests],
                "docstatus": 0,
            },
            fields=["name"],
            order_by="creation asc",
            limit_page_length=50,
        )

        candidate_sample_names.extend(
            row.name for row in referenced_collections
        )

    candidate_sample_names = list(
        dict.fromkeys(candidate_sample_names)
    )

    for sample_name in candidate_sample_names:
        safe_sample = _safe_reusable_sample(sample_name)

        if safe_sample:
            existing = [safe_sample]
            break

    if existing:
        sample_collection = frappe.get_doc(
            "Sample Collection",
            existing[0].name,
        )
        sample_collection.reference_doc = "Lab Test"
        sample_collection.reference_name = request.lab_test
    else:
        # -----------------------------------------
        # إنشاء Sample Collection جديدة
        # -----------------------------------------

        company = (
            current_lab_test.company
            or frappe.defaults.get_global_default("company")
        )

        sample_collection = frappe.new_doc(
            "Sample Collection"
        )

        sample_collection.patient = (
            request.patient
        )

        sample_collection.patient_name = (
            request.patient_name
        )

        sample_collection.referring_practitioner = (
            current_lab_test.practitioner
        )

        sample_collection.company = (
            company
        )

        sample_collection.status = (
            "Pending"
        )

        sample_collection.sample = (
            current_template.sample
        )

        sample_collection.sample_uom = (
            current_template.sample_uom
        )

        sample_collection.sample_qty = (
            current_template.sample_qty
        )

        sample_collection.sample_details = (
            current_template.sample_details
            or ""
        )

        sample_collection.reference_doc = (
            "Lab Test"
        )

        sample_collection.reference_name = (
            request.lab_test
        )

    # ---------------------------------------------
    # استخراج Observation Templates المطلوبة
    # من جميع Lab Test Templates المرتبطة
    # ---------------------------------------------

    observation_entries = []

    current_sample_type = frappe.db.get_value(
        "Lab Test Sample",
        current_template.sample,
        "sample_type",
    )

    for lab_test_name in compatible_lab_tests:

        lab_test = frappe.get_doc(
            "Lab Test",
            lab_test_name,
        )

        result_rows = lab_test.normal_test_items or [None]

        for result_row in result_rows:

            observation_name = (
                result_row.custom_observation_template
                if result_row
                else None
            )
            request_name = frappe.db.get_value(
                "ER Diagnostic Request",
                {"lab_test": lab_test_name, "request_type": "Laboratory"},
                "name",
                order_by="creation desc",
            )

            observation_entries.append(
                {
                    "lab_test": lab_test_name,
                    "request": request_name,
                    "test_name": frappe.db.get_value(
                        "Lab Test", lab_test_name, "lab_test_name"
                    ),
                    "test_code": frappe.db.get_value(
                        "Lab Test Template",
                        lab_test.template,
                        "lab_test_code",
                    ),
                    "observation": observation_name,
                }
            )

    observation_names = list(
        dict.fromkeys(
            entry["observation"]
            for entry in observation_entries
            if entry["observation"]
        )
    )

    # ---------------------------------------------
    # جلب بيانات Observation Templates دفعة واحدة
    # ---------------------------------------------

    observation_templates = {}

    if observation_names:

        rows = frappe.get_all(
            "Observation Template",
            filters={
                "name": ["in", observation_names],
                "sample_collection_required": 1,
            },
            fields=[
                "name",
                "sample",
                "sample_type",
                "sample_qty",
                "container_closure_color",
                "has_component",
                "medical_department",
            ],
            limit_page_length=500,
        )

        observation_templates = {
            row.name: row
            for row in rows
        }

    # ---------------------------------------------
    # الموجود حاليًا في Sample Collection
    # نتجاهل الصفوف الملغاة
    # ---------------------------------------------

    existing_keys = set()

    for child in sample_collection.observation_sample_collection or []:
        if child.docstatus != 2:
            existing_keys.add(
                (
                    child.get("custom_lab_test"),
                    child.get("observation_template"),
                )
            )

    for entry in observation_entries:
        observation_name = entry["observation"]
        obs_template = observation_templates.get(observation_name)

        key = (entry["lab_test"], observation_name)
        if key in existing_keys:
            continue

        sample_collection.append(
            "observation_sample_collection",
            {
                "observation_template": obs_template.name if obs_template else None,
                "custom_requested_test": entry["test_name"] or entry["lab_test"],
                "custom_lab_test": entry["lab_test"],
                "custom_er_request": entry["request"],
                "custom_test_code": entry["test_code"],
                "sample": (
                    obs_template.sample
                    if obs_template
                    else current_template.sample
                ),
                "sample_type": (
                    obs_template.sample_type
                    if obs_template
                    else current_sample_type
                ),
                "uom": current_template.sample_uom,
                "sample_qty": (
                    obs_template.sample_qty
                    if obs_template and obs_template.sample_qty
                    else current_template.sample_qty
                ),
                "container_closure_color": (
                    obs_template.container_closure_color
                    if obs_template
                    else None
                ),
                "has_component": (
                    obs_template.has_component if obs_template else 0
                ),
                "medical_department": (
                    obs_template.medical_department if obs_template else None
                ),
                "reference_doctype": "Lab Test",
                "reference_docname": entry["lab_test"],
                "status": "Open",
            },
        )
        existing_keys.add(key)

    # ---------------------------------------------
    # حفظ Sample Collection مرة واحدة فقط
    # ---------------------------------------------

    sample_collection.save(
        ignore_permissions=True
    )

    # ---------------------------------------------
    # ربط جميع Lab Tests بنفس Sample Collection
    # ---------------------------------------------

    for lab_test_name in compatible_lab_tests:

        if (
            frappe.db.get_value(
                "Lab Test",
                lab_test_name,
                "sample",
            )
            != sample_collection.name
        ):
            frappe.db.set_value(
                "Lab Test",
                lab_test_name,
                "sample",
                sample_collection.name,
                update_modified=False,
            )

    frappe.db.commit()

    return {
        "name":
            sample_collection.name,

        "status":
            sample_collection.status,

        "lab_test":
            request.lab_test,

        "sample":
            sample_collection.sample,

        "sample_qty":
            sample_collection.sample_qty,

        "diagnostic_report": None,

        "observation_count":
            len(
                [
                    row
                    for row in
                    sample_collection.observation_sample_collection
                    if row.docstatus != 2
                ]
            ),

        "message":
            "تم إنشاء / تحديث طلب جمع العينة بنجاح",
    }


# =====================================================
# تسجيل سحب العينة
# =====================================================

@frappe.whitelist()
def save_collect_register_sample_from_collection(
    sample_collection,
):
    """
    زر مخصص داخل Sample Collection:
    حفظ + جمع + تسجيل العينة في نقرة واحدة،
    ثم تجهيز Diagnostic Report لإدخال النتائج.
    """

    require_laboratory_access()

    if not sample_collection:
        frappe.throw(
            _("لم يتم تحديد سجل العينة")
        )

    sample = frappe.db.get_value(
        "Sample Collection",
        sample_collection,
        [
            "name",
            "patient",
            "reference_doc",
            "reference_name",
            "status",
        ],
        as_dict=True,
    )

    if not sample:
        frappe.throw(
            _("سجل العينة غير موجود")
        )

    # -----------------------------------------------------
    # تحديد ER Diagnostic Request المرتبط بالعينة
    #
    # الأولوية:
    # 1) custom_er_request داخل صف العينة
    # 2) custom_lab_test داخل صف العينة
    # 3) Lab Test المرتبط مباشرة بـ Sample Collection.sample
    # 4) reference_name إذا كان Lab Test فعليًا
    # 5) ربط Lab Test → ER Diagnostic Request
    # -----------------------------------------------------

    diagnostic_request = None
    lab_test_name = None

    # 1) الربط المباشر من child row
    child = frappe.db.get_value(
        "Observation Sample Collection",
        {
            "parent": sample_collection,
            "parenttype": "Sample Collection",
            "parentfield": "observation_sample_collection",
            "custom_er_request": ["is", "set"],
            "docstatus": ["!=", 2],
        },
        ["custom_er_request", "custom_lab_test"],
        as_dict=True,
        order_by="idx asc",
    )

    if child:
        diagnostic_request = child.get("custom_er_request")
        lab_test_name = child.get("custom_lab_test")

    # 2) إذا لدينا Lab Test داخل child row
    if not diagnostic_request and lab_test_name:

        diagnostic_request = frappe.db.get_value(
            "ER Diagnostic Request",
            {
                "lab_test": lab_test_name,
                "patient": sample.patient,
                "request_type": "Laboratory",
            },
            "name",
            order_by="creation desc",
        )

    # 3) الربط الأقوى: Lab Test.sample = Sample Collection
    if not diagnostic_request:

        lab_test_name = frappe.db.get_value(
            "Lab Test",
            {
                "sample": sample_collection,
                "patient": sample.patient,
            },
            "name",
            order_by="creation desc",
        )

        if lab_test_name:

            diagnostic_request = frappe.db.get_value(
                "ER Diagnostic Request",
                {
                    "lab_test": lab_test_name,
                    "patient": sample.patient,
                    "request_type": "Laboratory",
                },
                "name",
                order_by="creation desc",
            )

    # 4) reference_name في Sample Collection
    if not diagnostic_request:

        reference_name = (
            sample.reference_name
            or ""
        ).strip()

        if (
            reference_name
            and frappe.db.exists(
                "Lab Test",
                reference_name,
            )
        ):

            lab_test_name = reference_name

            diagnostic_request = frappe.db.get_value(
                "ER Diagnostic Request",
                {
                    "lab_test": lab_test_name,
                    "patient": sample.patient,
                    "request_type": "Laboratory",
                },
                "name",
                order_by="creation desc",
            )

    # 5) آخر fallback: JOIN حقيقي بين Lab Test و ER Diagnostic Request
    if not diagnostic_request:

        diagnostic_request = frappe.db.sql(
            """
            SELECT edr.name
            FROM `tabER Diagnostic Request` edr
            INNER JOIN `tabLab Test` lt
                ON lt.name = edr.lab_test
            WHERE
                edr.patient = %s
                AND edr.request_type = 'Laboratory'
                AND lt.sample = %s
            ORDER BY edr.creation DESC
            LIMIT 1
            """,
            (
                sample.patient,
                sample_collection,
            ),
            as_dict=False,
        )

        diagnostic_request = (
            diagnostic_request[0][0]
            if diagnostic_request
            else None
        )

    if not diagnostic_request:
        frappe.throw(
            _(
                "لم يتم العثور على طلب مختبر مرتبط بهذه العينة. "
                "تحقق من ربط Lab Test بالعينة ثم طلب الطوارئ."
            )
        )

    # -----------------------------------------------------
    # 3) تنفيذ المسار الحالي الموحد
    # -----------------------------------------------------

    result = save_collect_register_sample(
        diagnostic_request=diagnostic_request,
        sample_collection=sample_collection,
    )

    # -----------------------------------------------------
    # 4) التقرير يجب أن يكون مفتوحًا لإدخال النتائج
    # -----------------------------------------------------

    if isinstance(result, dict):

        report_name = result.get(
            "diagnostic_report"
        )

        if report_name:

            report_status = frappe.db.get_value(
                "Diagnostic Report",
                report_name,
                ["status", "docstatus"],
                as_dict=True,
            )

            if report_status:

                # التقرير الجديد يجب أن يبقى مفتوحًا
                # وغير معتمد حتى يتم إدخال النتيجة.
                if report_status.docstatus == 0:

                    if report_status.status != "Open":

                        frappe.db.set_value(
                            "Diagnostic Report",
                            report_name,
                            "status",
                            "Open",
                            update_modified=True,
                        )

                    result["diagnostic_report_ready"] = True

    return result


@frappe.whitelist()
def save_collect_register_sample(
    diagnostic_request,
    sample_collection=None,
):
    """
    عملية واحدة لطلب المختبر:
    1) إنشاء/حفظ Sample Collection عند الحاجة.
    2) تسجيل جمع العينة.
    3) متابعة مسار Diagnostic Report / Observation الحالي.
    """

    if not diagnostic_request:
        frappe.throw(_("لم يتم تحديد طلب المختبر"))

    # -----------------------------------------------------
    # إذا لم يصل اسم العينة من الواجهة، نقرأه من الطلب
    # -----------------------------------------------------
    existing_sample = sample_collection or frappe.db.get_value(
        "ER Diagnostic Request",
        diagnostic_request,
        "sample_collection",
    )

    # -----------------------------------------------------
    # إذا لم توجد عينة صالحة، ننشئها عبر المسار الحالي
    # -----------------------------------------------------
    if existing_sample and not frappe.db.exists(
        "Sample Collection",
        existing_sample,
    ):
        existing_sample = None

    if not existing_sample:
        created = create_sample_collection(
            diagnostic_request=diagnostic_request,
        )

        if isinstance(created, dict):
            existing_sample = (
                created.get("sample_collection")
                or created.get("name")
            )
        else:
            existing_sample = created

    if not existing_sample:
        frappe.throw(_("تعذر إنشاء سجل العينة"))

    # -----------------------------------------------------
    # جمع وتسجيل العينة عبر المسار الحالي المعتمد
    # -----------------------------------------------------
    result = mark_sample_collected(
        diagnostic_request=diagnostic_request,
        sample_collection=existing_sample,
    )

    if isinstance(result, dict):
        result["sample_collection"] = existing_sample
        result["one_click"] = True

    return result


@frappe.whitelist()
def mark_sample_collected(
    diagnostic_request,
    sample_collection,
):
    require_laboratory_access()
    if not diagnostic_request:
        frappe.throw(_("لم يتم تحديد طلب المختبر"))

    if not sample_collection:
        frappe.throw(_("لم يتم تحديد سجل العينة"))

    # ---------------------------------------------
    # قراءة طلب الطوارئ
    # ---------------------------------------------

    request_data = frappe.db.get_value(
        "ER Diagnostic Request",
        diagnostic_request,
        [
            "patient",
            "patient_name",
            "patient_encounter",
            "request_type",
            "lab_test",
        ],
        as_dict=True,
    )

    if not request_data:
        frappe.throw(_("طلب المختبر غير موجود"))

    if request_data.request_type != "Laboratory":
        frappe.throw(_("الطلب المحدد ليس طلب مختبر"))

    # ---------------------------------------------
    # قراءة Sample Collection
    # ---------------------------------------------

    sample_data = frappe.db.get_value(
        "Sample Collection",
        sample_collection,
        [
            "patient",
            "reference_doc",
            "reference_name",
            "status",
        ],
        as_dict=True,
    )

    if not sample_data:
        frappe.throw(_("سجل العينة غير موجود"))

    if sample_data.patient != request_data.patient:
        frappe.throw(_("سجل العينة لا يخص المريض المحدد"))

    if not request_data.lab_test:
        frappe.throw(_("طلب المختبر لا يحتوي على فحص مرتبط"))

    lab_test_data = frappe.db.get_value(
        "Lab Test",
        request_data.lab_test,
        ["patient", "sample", "service_request", "inpatient_record"],
        as_dict=True,
    )
    if not lab_test_data:
        frappe.throw(_("الفحص المختبري المرتبط بالطلب غير موجود"))

    if lab_test_data.patient != request_data.patient:
        frappe.throw(_("الفحص المختبري لا يخص المريض المحدد"))

    if lab_test_data.sample and lab_test_data.sample != sample_collection:
        frappe.throw(_("العينة لا تطابق الفحص المختبري المحدد"))

    if (
        request_data.lab_test
        and sample_data.reference_doc
        and sample_data.reference_doc != "Lab Test"
    ):
        frappe.throw(_("سجل العينة غير مرتبط بفحص المختبر"))

    if sample_data.status == "Collected":
        return {
            "request": diagnostic_request,
            "sample_collection": sample_collection,
            "diagnostic_report": ensure_diagnostic_report(
                request_data,
                sample_collection,
                request_data.lab_test,
            ),
            "status": "Sample Collected",
            "queue_status": "already_collected",
            "observation_count": 0,
            "message": "تم جمع العينة مسبقاً.",
        }

    # ---------------------------------------------
    # تسجيل وقت وموظف سحب العينة مباشرة
    # ---------------------------------------------

    collected_time = now_datetime()

    frappe.db.set_value(
        "Sample Collection",
        sample_collection,
        {
            "status": "Collected",
            "collected_by": frappe.session.user,
            "collected_time": collected_time,
        },
        update_modified=True,
    )

    selected_rows = frappe.get_all(
        "Observation Sample Collection",
        filters={
            "parent": sample_collection,
            "parenttype": "Sample Collection",
            "parentfield": "observation_sample_collection",
            "docstatus": ["!=", 2],
            "status": "Open",
        },
        fields="*",
        order_by="idx asc",
        limit_page_length=500,
    )
    observation_rows = [
        row for row in selected_rows if row.get("observation_template")
    ]

    # ---------------------------------------------
    # ربط Lab Test بالعينة
    # ---------------------------------------------

    if request_data.lab_test:
        existing_sample = frappe.db.get_value(
            "Lab Test",
            request_data.lab_test,
            "sample",
        )

        if not existing_sample:
            frappe.db.set_value(
                "Lab Test",
                request_data.lab_test,
                "sample",
                sample_collection,
                update_modified=False,
            )

    # ---------------------------------------------
    # تحديث طلب الطوارئ الحالي فورًا
    # ---------------------------------------------

    frappe.db.set_value(
        "ER Diagnostic Request",
        diagnostic_request,
        "lab_status",
        "Sample Collected",
        update_modified=True,
    )

    diagnostic_report = ensure_diagnostic_report(
        request_data,
        sample_collection,
        request_data.lab_test,
    )
    report_was_approved = (
        frappe.db.get_value("Diagnostic Report", diagnostic_report, "status")
        == "Approved"
    )

    queue_status = "nothing_to_create"
    if observation_rows:
        frappe.enqueue(
            "custom_app.emergency_management.page.er_laboratory.er_laboratory.create_sample_observations",
            queue="short",
            enqueue_after_commit=True,
            selected=frappe.as_json(observation_rows),
            sample_collection=sample_collection,
            report_name=diagnostic_report,
            preserve_approved=report_was_approved,
        )
        queue_status = "queued"

    # ---------------------------------------------
    # تحديث بقية طلبات المختبر لنفس العينة
    # باستعلام واحد
    # ---------------------------------------------

    frappe.db.sql(
        """
        UPDATE `tabER Diagnostic Request` edr
        INNER JOIN `tabLab Test` lt
            ON lt.name = edr.lab_test
        SET
            edr.lab_status = 'Sample Collected',
            edr.modified = NOW(),
            edr.modified_by = %s
        WHERE
            edr.patient = %s
            AND edr.request_type = 'Laboratory'
            AND lt.sample = %s
            AND edr.name != %s
        """,
        (
            frappe.session.user,
            request_data.patient,
            sample_collection,
            diagnostic_request,
        ),
    )

    # ---------------------------------------------
    # لا نستخدم frappe.db.commit()
    # Frappe سيغلق transaction الحالية
    # ---------------------------------------------

    frappe.publish_realtime(
        event="er_lab_sample_collected",
        message={
            "request": diagnostic_request,
            "patient": request_data.patient,
            "patient_name": request_data.patient_name,
            "lab_test": request_data.lab_test,
            "sample_collection": sample_collection,
            "diagnostic_report": diagnostic_report,
            "status": "Sample Collected",
            "queue_status": queue_status,
        },
    )

    return {
        "request": diagnostic_request,
        "sample_collection": sample_collection,
        "diagnostic_report": diagnostic_report,
        "status": "Sample Collected",
        "queue_status": queue_status,
        "observation_count": len(observation_rows),
        "unmapped_test_count": len(selected_rows) - len(observation_rows),
        "message": "تم تسجيل سحب العينة فقط. التقرير التشخيصي جاهز للإدخال.",
    }

@frappe.whitelist()
def start_lab_test(diagnostic_request):
    require_laboratory_access()

    if not diagnostic_request:
        frappe.throw(
            _("لم يتم تحديد طلب المختبر")
        )

    request = frappe.get_doc(
        "ER Diagnostic Request",
        diagnostic_request,
    )

    if request.request_type != "Laboratory":
        frappe.throw(
            _("الطلب المحدد ليس طلب مختبر")
        )

    if request.lab_status != "Sample Collected":
        frappe.throw(
            _(
                "لا يمكن بدء الفحص قبل تسجيل سحب العينة"
            )
        )

    if not request.lab_test:
        frappe.throw(
            _("لا يوجد Lab Test مرتبط بالطلب")
        )

    request.lab_status = (
        "In Progress"
    )

    request.save(
        ignore_permissions=True
    )

    frappe.db.commit()

    frappe.publish_realtime(
        event="er_lab_test_started",
        message={
            "request": request.name,
            "patient": request.patient,
            "patient_name": request.patient_name,
            "lab_test": request.lab_test,
            "status": "In Progress",
        },
    )

    return {
        "request":
            request.name,

        "status":
            "In Progress",

        "message":
            "تم بدء الفحص",
    }
