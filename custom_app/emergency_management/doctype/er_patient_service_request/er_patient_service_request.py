import frappe
from frappe.model.document import Document


class ERPatientServiceRequest(Document):

    def after_insert(self):

        frappe.logger().info(
            "ER Patient Service Request after_insert fired: %s",
            self.name
        )


        if not self.bed:
            return


        bed = frappe.get_doc(
            "ER Bed",
            self.bed
        )


        bed.last_service_request = self.name

        bed.open_service_requests = (
            bed.open_service_requests or 0
        ) + 1


        if self.request_type:
            bed.current_service = self.request_type


        bed.save(
            ignore_permissions=True
        )