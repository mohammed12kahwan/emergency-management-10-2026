# Copyright (c) 2026, salh and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class EmergencyCaseRecord1(Document):

    def validate(self):
        # منع إنشاء زيارة طوارئ جديدة لنفس المريض في نفس اليوم
        if self.patient and self.data_patient:

            existing = frappe.db.sql("""
                SELECT name
                FROM `tabEmergency Case Record1`
                WHERE patient = %s
                  AND DATE(data_patient) = CURDATE()
                  AND name != %s
                  AND docstatus < 2
                LIMIT 1
            """, (self.patient, self.name))

            if existing:
                frappe.throw(
                    _("يوجد سجل طوارئ مفتوح لهذا المريض اليوم.")
                )

    def before_submit(self):

        # للتأكد من القيمة الفعلية القادمة من الحقل
        frappe.msgprint(f"Outcome = {self.outcome}")

        # يجب اختيار مصير الحالة
        if not self.outcome:
            frappe.throw(
                _("يجب تحديد مصير الحالة قبل ترحيل زيارة الطوارئ.")
            )

        # يمنع الترحيل إذا كان المريض لا يزال داخل الطوارئ
        if self.outcome == "لا يزال داخل الطوارئ":
            frappe.throw(
                _("لا يمكن ترحيل السجل لأن المريض لا يزال داخل الطوارئ. يجب أن يبقى السجل كمسودة.")
            )

        # يمنع الترحيل إذا كان المصير (أخرى)
        if self.outcome == "أخرى":
            frappe.throw(
                _("لا يمكن ترحيل السجل عندما يكون مصير الحالة (أخرى). يجب أن يبقى السجل كمسودة.")
            )