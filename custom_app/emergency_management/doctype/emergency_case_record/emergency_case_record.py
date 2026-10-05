import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class EmergencyCaseRecord(Document):

    def before_insert(self):
        self.status = "Open"

    def validate(self):
        self.validate_phone()

    def validate_phone(self):
        if self.phone_number:
            phone = self.phone_number.replace(" ", "")

            if not phone.isdigit():
                frappe.throw("Phone Number must contain digits only.")

            if len(phone) < 8:
                frappe.throw("Phone Number is too short.")