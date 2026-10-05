import frappe


LABORATORY_ROLES = {
    "Laboratory User",
    "Healthcare Administrator",
    "System Manager",
}


def require_laboratory_access():
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw("يجب تسجيل الدخول للوصول إلى إشعارات المختبر")
    if not LABORATORY_ROLES.intersection(
        set(frappe.get_roles(frappe.session.user))
    ):
        frappe.throw("ليس لديك صلاحية الوصول إلى إشعارات المختبر")


def execute(filters=None):
    filters = frappe._dict(filters or {})
    return get_columns(), get_data(filters)


@frappe.whitelist()
def get_laboratory_notifications():
    require_laboratory_access()
    return frappe.db.sql(
        """
        SELECT
            edr.name AS request,
            edr.patient,
            edr.patient_name,
            edr.patient_encounter,
            edr.test_name,
            edr.lab_status,
            edr.creation,
            COALESCE(edr.priority, er.er_priority, intake.priority) AS priority,
            er.er_acuity,
            triage.level_name AS acuity_name,
            triage.color AS acuity_color,
            priority.colorpr AS priority_color,
            sc.name AS sample_collection,
            dr.name AS diagnostic_report,
            CASE
                WHEN edr.lab_status = 'Pending' AND sc.name IS NULL THEN 'er_request'
                WHEN edr.lab_status = 'Pending' THEN 'sample_collection'
                WHEN dr.name IS NULL THEN 'sample_collection'
                ELSE 'diagnostic_report'
            END AS target
        FROM `tabER Diagnostic Request` edr
        LEFT JOIN `tabPatient Encounter` er
            ON er.name = edr.patient_encounter
        LEFT JOIN `tabER Patient Intake` intake
            ON intake.name = er.er_patient_intake
        LEFT JOIN `tabER Triage Level` triage
            ON triage.name = er.er_acuity
        LEFT JOIN `tabER Priority` priority
            ON priority.name = COALESCE(edr.priority, er.er_priority, intake.priority)
        LEFT JOIN `tabLab Test` lt
            ON lt.name = edr.lab_test
        LEFT JOIN `tabSample Collection` sc
            ON sc.name = lt.sample
        LEFT JOIN `tabDiagnostic Report` dr
            ON dr.sample_collection = sc.name AND dr.docstatus != 2
                        AND dr.name = (
                                SELECT dr2.name
                                FROM `tabDiagnostic Report` dr2
                                WHERE dr2.sample_collection = sc.name
                                    AND dr2.docstatus != 2
                                ORDER BY dr2.creation DESC
                                LIMIT 1
                        )
        WHERE edr.request_type = 'Laboratory'
          AND (
              (edr.lab_status = 'Pending' AND (sc.status IS NULL OR sc.status != 'Collected'))
              OR (edr.lab_status = 'Sample Collected' AND COALESCE(dr.status, 'Open') NOT IN ('Approved', 'Rejected'))
          )
        ORDER BY
            COALESCE(triage.esi_level, priority.priority_level, 99) ASC,
            edr.creation DESC
        LIMIT 100
        """,
        as_dict=True,
    )


def get_columns():
    return [
         {
            "label": "رقم العينة",
            "fieldname": "sample_number",
            "fieldtype": "Link",
            "options": "Sample Collection",
            "width": 150,
        },
        {
            "label": "العينة",
            "fieldname": "sample",
            "fieldtype": "Link",
            "options": "Lab Test Sample",
            "width": 130,
        },
        {
            "label": "رقم الفاتورة",
            "fieldname": "sales_invoice",
            "fieldtype": "Link",
            "options": "Sales Invoice",
            "width": 150,
        },
        {
            "label": "رقم المريض",
            "fieldname": "patient",
            "fieldtype": "Link",
            "options": "Patient",
            "width": 130,
        },
        {
            "label": "اسم المريض",
            "fieldname": "patient_name",
            "fieldtype": "Data",
            "width": 180,
        },
        {
            "label": "الفحص المطلوب",
            "fieldname": "test_name",
            "fieldtype": "Data",
            "width": 180,
        },
        {
            "label": "التقرير",
            "fieldname": "diagnostic_report",
            "fieldtype": "Link",
            "options": "Diagnostic Report",
            "width": 150,
        },
        {
            "label": "حالة التقرير",
            "fieldname": "report_status",
            "fieldtype": "Data",
            "width": 130,
        },
        {
            "label": "تمت الطباعة",
            "fieldname": "printed",
            "fieldtype": "Check",
            "width": 90,
        },
        {
            "label": "الحالة",
            "fieldname": "lab_status",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": "تاريخ الجمع",
            "fieldname": "collection_date",
            "fieldtype": "Datetime",
            "width": 145,
        },
       
    ]


def get_conditions(filters):
    conditions = ["1 = 1"]

    if filters.get("collection_date"):
        conditions.append("DATE(sc.collected_time) = %(collection_date)s")

    if filters.get("status") == "فارغ / لم يتم الجمع":
        conditions.append("(sc.status IS NULL OR sc.status != 'Collected')")
    elif filters.get("status") == "تم الجمع":
        conditions.append("sc.status = 'Collected'")

    if filters.get("patient"):
        conditions.append("lt.patient = %(patient)s")

    if filters.get("sales_invoice"):
        conditions.append("edr.sales_invoice = %(sales_invoice)s")

    if filters.get("sample_number"):
        conditions.append("sc.name = %(sample_number)s")

    if filters.get("medical_department"):
        conditions.append(
            "COALESCE(lt.department, edr.medical_department) = %(medical_department)s"
        )

    return " AND ".join(conditions)


def get_data(filters):
    conditions = get_conditions(filters)

    rows = frappe.db.sql(
        f"""
        SELECT
            lt.name AS lab_test,
            lt.patient AS patient,
            lt.patient_name AS patient_name,
            lt.lab_test_name AS test_name,
            sc.sample AS sample,
            COALESCE(edr.sales_invoice, '') AS sales_invoice,
            COALESCE(dr.name, '') AS diagnostic_report,
            CASE
                WHEN dr.name IS NULL THEN 'Not Created'
                ELSE COALESCE(dr.status, '')
            END AS report_status,
            COALESCE(lt.printed, 0) AS printed,
            COALESCE(edr.lab_status, lt.status, '') AS lab_status,
            sc.collected_time AS collection_date,
            sc.name AS sample_number
        FROM `tabLab Test` lt
        LEFT JOIN `tabSample Collection` sc
            ON sc.name = lt.sample
        LEFT JOIN `tabER Diagnostic Request` edr
            ON edr.name = lt.er_diagnostic_request
        LEFT JOIN `tabDiagnostic Report` dr
            ON dr.ref_doctype = 'Lab Test'
            AND dr.docname = lt.name
            AND dr.docstatus != 2
            AND dr.name = (
                SELECT dr2.name
                FROM `tabDiagnostic Report` dr2
                WHERE dr2.ref_doctype = 'Lab Test'
                    AND dr2.docname = lt.name
                    AND dr2.docstatus != 2
                ORDER BY dr2.creation DESC
                LIMIT 1
            )
        WHERE {conditions}
        ORDER BY lt.creation DESC
        """,
        filters,
        as_dict=True,
    )

    # DIRECT_LAB_SALES_INVOICE_PATCH
    # Add submitted direct laboratory Sales Invoices that are not linked
    # to an ER Diagnostic Request and therefore have no Lab Test row yet.
    if (
        filters.get("status") != "تم الجمع"
        and not filters.get("sample_number")
        and not filters.get("medical_department")
    ):
        invoice_conditions = [
            "si.docstatus = 1",
            "COALESCE(sii.er_diagnostic_request, '') = ''",
            """(
                item.item_group = 'Laboratory'
                OR EXISTS (
                    SELECT 1
                    FROM `tabLab Test Template` ltt
                    WHERE ltt.item = sii.item_code
                )
            )""",
        ]

        invoice_filters = {}

        if filters.get("patient"):
            invoice_conditions.append("si.patient = %(invoice_patient)s")
            invoice_filters["invoice_patient"] = filters.get("patient")

        if filters.get("sales_invoice"):
            invoice_conditions.append("si.name = %(invoice_sales_invoice)s")
            invoice_filters["invoice_sales_invoice"] = filters.get("sales_invoice")

        if filters.get("from_date"):
            invoice_conditions.append("si.posting_date >= %(invoice_from_date)s")
            invoice_filters["invoice_from_date"] = filters.get("from_date")

        if filters.get("to_date"):
            invoice_conditions.append("si.posting_date <= %(invoice_to_date)s")
            invoice_filters["invoice_to_date"] = filters.get("to_date")

        direct_invoice_rows = frappe.db.sql(
            f"""
            SELECT
                '' AS lab_test,
                COALESCE(si.patient, '') AS patient,
                COALESCE(p.patient_name, si.customer, '') AS patient_name,
                COALESCE(sii.item_name, sii.item_code, '') AS test_name,
                '' AS sample,
                si.name AS sales_invoice,
                '' AS diagnostic_report,
                'Not Created' AS report_status,
                0 AS printed,
                'Pending' AS lab_status,
                NULL AS collection_date,
                NULL AS sample_number
            FROM `tabSales Invoice` si
            INNER JOIN `tabSales Invoice Item` sii
                ON sii.parent = si.name
            LEFT JOIN `tabItem` item
                ON item.name = sii.item_code
            LEFT JOIN `tabPatient` p
                ON p.name = si.patient
            WHERE {' AND '.join(invoice_conditions)}
            ORDER BY si.posting_date DESC, si.creation DESC, si.name DESC
            """,
            invoice_filters,
            as_dict=True,
        )

        rows.extend(direct_invoice_rows)

    return rows
