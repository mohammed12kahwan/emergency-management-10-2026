# Copyright (c) 2026, salh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ERVitalSigns(Document):

    def after_insert(self):

        if not self.bed:
            return

        bed = frappe.get_doc(
            "ER Bed",
            self.bed
        )

        # تحديث آخر علامة حيوية للسرير
        bed.last_vital_sign = self.name

        # وقت آخر تحديث
        bed.last_patient_update = self.recorded_time

        # ربط المريض الحالي
        if self.patient:
            bed.current_patient = self.patient

        # ربط زيارة الطوارئ إذا وجدت
        if self.er_patient_intake:
            bed.current_intake = self.er_patient_intake

        # حفظ كامل للمستند
        bed.save(ignore_permissions=True)