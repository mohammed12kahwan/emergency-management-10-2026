# Copyright (c) 2026, salh and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from custom_app.emergency_management.page.er_visit_console.python.labs.labs import (
	search_lab_test_templates,
)


class TestERDiagnosticRequest(FrappeTestCase):
	def test_active_lab_template_search_returns_billing_mapping(self):
		template = frappe.db.get_value(
			"Lab Test Template",
			{"disabled": 0, "item": ["is", "set"]},
			["lab_test_name", "item"],
			order_by="creation asc",
			as_dict=True,
		)
		if not template:
			self.skipTest("No active laboratory template is configured")

		results = search_lab_test_templates(template.lab_test_name[:3])

		self.assertTrue(
			any(row.item == template.item for row in results)
		)

	def test_search_does_not_return_disabled_templates(self):
		disabled = frappe.db.get_value(
			"Lab Test Template",
			{"disabled": 1},
			["lab_test_name", "item"],
			order_by="creation asc",
			as_dict=True,
		)
		if not disabled or not disabled.lab_test_name:
			self.skipTest("No disabled laboratory template is configured")

		results = search_lab_test_templates(disabled.lab_test_name)

		self.assertFalse(
			any(row.item == disabled.item for row in results)
		)
