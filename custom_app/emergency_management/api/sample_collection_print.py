import json

import frappe
from frappe import _


@frappe.whitelist()
def get_specimen_print_html(specimens=None):

    if isinstance(specimens, str):
        specimens = json.loads(specimens)

    if not specimens:
        frappe.throw(_("لم يتم تحديد عينات."))

    if not isinstance(specimens, list):
        frappe.throw(_("بيانات العينات غير صحيحة."))

    specimens = [
        str(name).strip()
        for name in specimens
        if name
    ]

    rows = []

    for specimen_name in specimens:

        if not frappe.db.exists(
            "Specimen",
            specimen_name
        ):
            continue

        specimen = frappe.db.get_value(
            "Specimen",
            specimen_name,
            [
                "name",
                "patient",
                "specimen_type",
                "received_time",
            ],
            as_dict=True,
        )

        if not specimen:
            continue

        rows.append(
            {
                "name": specimen.name,
                "patient": specimen.patient or "",
                "specimen_type": specimen.specimen_type or "",
            }
        )

    if not rows:
        frappe.throw(_("لا توجد عينات صالحة للطباعة."))

    html = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">

<style>

@page {
    size: 50mm 25mm;
    margin: 0;
}

html,
body {
    margin: 0;
    padding: 0;
    width: 50mm;
}

body {
    font-family: Arial, sans-serif;
}

.label {
    width: 50mm;
    height: 25mm;
    box-sizing: border-box;
    padding: 2mm;
    page-break-after: always;
    text-align: center;
}

.barcode {
    width: 46mm;
    height: 10mm;
    object-fit: contain;
}

.name {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 1mm;
}

.info {
    font-size: 7pt;
    margin-top: 1mm;
}

@media print {
    body {
        margin: 0;
    }
}

</style>

<script src="/assets/frappe/js/barcode.min.js"></script>

</head>

<body>
"""

    for row in rows:

        barcode_id = (
            "barcode_"
            + row["name"].replace(" ", "_")
        )

        html += f"""
<div class="label">

    <svg
        id="{barcode_id}"
        class="barcode">
    </svg>

    <div class="name">
        {frappe.utils.escape_html(row["name"])}
    </div>

    <div class="info">
        {frappe.utils.escape_html(row["patient"])}
        -
        {frappe.utils.escape_html(row["specimen_type"])}
    </div>

</div>

<script>
(function() {{
    try {{
        JsBarcode(
            "#{barcode_id}",
            "{frappe.utils.escape_html(row["name"])}",
            {{
                format: "CODE128",
                width: 1.5,
                height: 35,
                displayValue: false,
                margin: 0
            }}
        );
    }} catch (e) {{
        console.error(e);
    }}
}})();
</script>
"""

    html += """
</body>
</html>
"""

    return html
