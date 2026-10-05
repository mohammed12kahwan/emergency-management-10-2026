import json

import frappe
from frappe import _
from frappe.utils import add_days, now_datetime, today

from healthcare.healthcare.doctype.inpatient_record.inpatient_record import (
	admit_patient,
	check_out_inpatient,
	discharge_patient,
	schedule_inpatient,
)


def _require_admission_officer():
	if "Admission Officer" not in frappe.get_roles():
		frappe.throw(_("Not permitted"), frappe.PermissionError)


@frappe.whitelist()
def get_admission_queue():
	_require_admission_officer()

	return frappe.get_all(
		"ER Admission Request",
		filters={
			"docstatus": 1,
			"status": "Approved",
			"workflow_state": "Approved",
			"admission_status": ["!=", "Admitted"],
			"admission_reference": ["is", "not set"],
		},
		fields=[
			"name",
			"patient",
			"er_patient_intake",
			"er_bed",
			"requested_department",
			"requesting_doctor",
			"priority",
			"admission_reason",
			"requested_service_unit_type",
			"expected_length_of_stay",
			"requested_by",
			"approval_datetime",
			"status",
			"workflow_state",
			"admission_status",
		],
	)


@frappe.whitelist()
def get_available_service_units(requested_type=None, company=None):
	_require_admission_officer()

	filters = {
		"is_group": 0,
		"inpatient_occupancy": 1,
		"occupancy_status": "Vacant",
	}

	if requested_type:
		filters["service_unit_type"] = requested_type

	if company:
		filters["company"] = company

	return frappe.get_all(
		"Healthcare Service Unit",
		filters=filters,
		fields=[
			"name",
			"healthcare_service_unit_name",
			"service_unit_type",
			"occupancy_status",
			"inpatient_occupancy",
			"is_group",
			"company",
			"department",
		],
	)


@frappe.whitelist()
def validate_admission_eligibility(request_name, service_unit):
	_require_admission_officer()

	errors = []

	if not frappe.db.exists("ER Admission Request", request_name):
		errors.append(_("طلب الترقيد غير موجود."))
		return {"eligible": False, "errors": errors}

	er_request = frappe.get_doc("ER Admission Request", request_name)

	if er_request.docstatus != 1:
		errors.append(_("طلب الترقيد غير معتمد."))

	if er_request.status != "Approved":
		errors.append(_("طلب الترقيد يجب أن يكون معتمدًا أولًا."))

	if er_request.workflow_state != "Approved":
		errors.append(_("طلب الترقيد ليس في حالة معتمدة."))

	if er_request.admission_reference:
		errors.append(_("طلب الترقيد مرتبط بسجل إقامة موجود بالفعل."))

	if er_request.admission_status == "Admitted":
		errors.append(_("طلب الترقيد مرتبط بسجل إقامة موجود بالفعل."))

	if not er_request.patient or not frappe.db.exists("Patient", er_request.patient):
		errors.append(_("المريض غير موجود."))

	if not er_request.er_patient_intake or not frappe.db.exists(
		"ER Patient Intake", er_request.er_patient_intake
	):
		errors.append(_("زيارة الطوارئ غير موجودة."))

	patient_encounter = None
	if er_request.er_patient_intake:
		intake = frappe.get_doc("ER Patient Intake", er_request.er_patient_intake)

		if not intake.patient_encounter:
			errors.append(_("يجب إكمال زيارة الطبيب قبل الترقيد."))
		else:
			patient_encounter = intake.patient_encounter

	if patient_encounter and not frappe.db.exists("Patient Encounter", patient_encounter):
		errors.append(_("زيارة الطبيب غير موجودة."))

	if er_request.er_patient_intake:
		intake = frappe.get_doc("ER Patient Intake", er_request.er_patient_intake)
		if not intake.triage_record:
			errors.append(_("يجب إكمال الفرز قبل الترقيد."))

	if er_request.patient:
		existing_ip = frappe.db.sql(
			"""
			SELECT name, status
			FROM `tabInpatient Record`
			WHERE patient = %(patient)s
			AND status IN ('Admission Scheduled', 'Admitted')
			""",
			{"patient": er_request.patient},
			as_dict=True,
		)

		if existing_ip:
			errors.append(
				_("المريض لديه سجل إقامة نشط: {0}").format(existing_ip[0].name)
			)

	if not frappe.db.exists("Healthcare Service Unit", service_unit):
		errors.append(_("الوحدة المحددة غير موجودة."))
	else:
		unit = frappe.get_doc("Healthcare Service Unit", service_unit)

		if unit.is_group == 1:
			errors.append(_("الوحدة المحددة غير مخصصة للتنويم."))

		if unit.inpatient_occupancy != 1:
			errors.append(_("الوحدة المحددة غير مخصصة للتنويم."))

		if unit.occupancy_status != "Vacant":
			errors.append(_("السرير لم يعد شاغرًا. يرجى اختيار سرير آخر."))

		if (
			er_request.requested_service_unit_type
			and unit.service_unit_type != er_request.requested_service_unit_type
		):
			errors.append(_("نوع الوحدة المطلوبة لا يتطابق مع الوحدة المختارة."))

	return {
		"eligible": len(errors) == 0,
		"errors": errors,
	}


@frappe.whitelist()
def admit_patient_from_er(request_name, service_unit, check_in=None):
	_require_admission_officer()

	if not frappe.db.exists("ER Admission Request", request_name):
		frappe.throw(_("طلب الترقيد غير موجود."))

	er_request = frappe.get_doc("ER Admission Request", request_name)

	if er_request.status != "Approved":
		frappe.throw(_("طلب الترقيد يجب أن يكون معتمدًا أولًا."))

	if er_request.workflow_state != "Approved":
		frappe.throw(_("طلب الترقيد ليس في حالة معتمدة."))

	if er_request.admission_reference:
		frappe.throw(_("طلب الترقيد مرتبط بسجل إقامة موجود بالفعل."))

	if er_request.admission_status == "Admitted":
		frappe.throw(_("طلب الترقيد مرتبط بسجل إقامة موجود بالفعل."))

	if not er_request.er_patient_intake or not frappe.db.exists(
		"ER Patient Intake", er_request.er_patient_intake
	):
		frappe.throw(_("زيارة الطوارئ غير موجودة."))

	intake = frappe.get_doc("ER Patient Intake", er_request.er_patient_intake)

	if not intake.patient_encounter:
		frappe.throw(_("يجب إكمال زيارة الطبيب قبل الترقيد."))

	if not frappe.db.exists("Patient Encounter", intake.patient_encounter):
		frappe.throw(_("زيارة الطبيب غير موجودة."))

	if not intake.triage_record:
		frappe.throw(_("يجب إكمال الفرز قبل الترقيد."))

	if not er_request.patient or not frappe.db.exists("Patient", er_request.patient):
		frappe.throw(_("المريض غير موجود."))

	patient = frappe.get_doc("Patient", er_request.patient)

	existing_ip = frappe.db.sql(
		"""
		SELECT name, status
		FROM `tabInpatient Record`
		WHERE patient = %(patient)s
		AND status IN ('Admission Scheduled', 'Admitted')
		""",
		{"patient": patient.name},
		as_dict=True,
	)

	if existing_ip:
		frappe.throw(
			_("المريض لديه سجل إقامة نشط: {0}").format(existing_ip[0].name)
		)

	if not frappe.db.exists("Healthcare Service Unit", service_unit):
		frappe.throw(_("الوحدة المحددة غير موجودة."))

	unit = frappe.get_doc("Healthcare Service Unit", service_unit)

	if unit.is_group == 1:
		frappe.throw(_("الوحدة المحددة غير مخصصة للتنويم."))

	if unit.inpatient_occupancy != 1:
		frappe.throw(_("الوحدة المحددة غير مخصصة للتنويم."))

	if unit.occupancy_status != "Vacant":
		frappe.throw(_("السرير لم يعد شاغرًا. يرجى اختيار سرير آخر."))

	if (
		er_request.requested_service_unit_type
		and unit.service_unit_type != er_request.requested_service_unit_type
	):
		frappe.throw(_("نوع الوحدة المطلوبة لا يتطابق مع الوحدة المختارة."))

	company = None
	if intake.patient_encounter:
		encounter = frappe.get_doc("Patient Encounter", intake.patient_encounter)
		company = encounter.company

	args = {
		"patient": patient.name,
		"admission_encounter": intake.patient_encounter,
		"medical_department": er_request.requested_department,
		"primary_practitioner": er_request.requesting_doctor,
		"admission_service_unit_type": er_request.requested_service_unit_type,
		"expected_length_of_stay": er_request.expected_length_of_stay,
		"admission_instruction": er_request.admission_reason,
		"admission_ordered_for": today(),
		"referring_practitioner": er_request.requesting_doctor,
		"company": company,
	}

	args = {k: v for k, v in args.items() if v is not None}

	try:
		schedule_inpatient(json.dumps(args))
	except Exception as e:
		frappe.log_error(
			title="Admission Office: schedule_inpatient failed",
			message=f"ER Admission Request: {request_name}\nPatient: {patient.name}\nException: {e}",
		)
		raise

	inpatient_record_name = frappe.db.get_value(
		"Inpatient Record",
		{"patient": patient.name, "status": "Admission Scheduled"},
		"name",
	)

	if not inpatient_record_name:
		frappe.throw(_("لم يتم إنشاء سجل الإقامة بعد جدولة الترقيد."))

	inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record_name)

	if er_request.requesting_doctor:
		inpatient_record.admission_practitioner = er_request.requesting_doctor
		inpatient_record.save(ignore_permissions=True)

	expected_discharge = None
	if er_request.expected_length_of_stay:
		expected_discharge = add_days(today(), er_request.expected_length_of_stay)

	check_in_dt = check_in or now_datetime()

	try:
		admit_patient(inpatient_record, service_unit, check_in_dt, expected_discharge)
	except Exception as e:
		frappe.log_error(
			title="Admission Office: admit_patient failed",
			message=f"ER Admission Request: {request_name}\nInpatient Record: {inpatient_record.name}\nException: {e}",
		)
		raise

	inpatient_record.reload()
	unit.reload()
	patient.reload()

	if inpatient_record.status != "Admitted":
		frappe.throw(
			_("فشل في ترقيد المريض. حالة السجل: {0}").format(inpatient_record.status)
		)

	active_occupancy = False
	for occ in inpatient_record.inpatient_occupancies:
		if not occ.left and occ.service_unit == service_unit:
			active_occupancy = True
			break

	if not active_occupancy:
		frappe.throw(_("لم يتم إنشاء سجل إشغال نشط."))

	if unit.occupancy_status != "Occupied":
		frappe.throw(_("الوحدة المحددة غير مشغولة بعد الترقيد."))

	if patient.inpatient_status != "Admitted":
		frappe.throw(_("حالة المريض لم يتم تحديثها بعد الترقيد."))

	if patient.inpatient_record != inpatient_record.name:
		frappe.throw(_("رابط سجل الإقامة للمريض لم يتم تحديثه."))

	er_request.admission_reference = inpatient_record.name
	er_request.admission_status = "Admitted"
	er_request.save(ignore_permissions=True)

	frappe.db.set_value(
		"ER Patient Intake",
		intake.name,
		{
			"admission_time": check_in_dt,
		},
	)

	from custom_app.emergency_management.api.er_visit_workflow import (
		transition_er_visit,
	)

	transition_er_visit(
		intake.name,
		"تنويم",
	)

	return {
		"success": True,
		"er_admission_request": er_request.name,
		"inpatient_record": inpatient_record.name,
		"patient": patient.name,
		"service_unit": service_unit,
		"check_in": check_in_dt,
		"expected_discharge": expected_discharge,
		"workflow_state": er_request.workflow_state,
		"admission_status": er_request.admission_status,
	}


@frappe.whitelist()
def validate_discharge_eligibility(inpatient_record_name):
	_require_admission_officer()

	result = {
		"eligible": True,
		"inpatient_record": inpatient_record_name,
		"status": None,
		"patient": None,
		"active_occupancy": False,
		"blockers": [],
	}

	if not frappe.db.exists("Inpatient Record", inpatient_record_name):
		result["eligible"] = False
		result["blockers"].append(_("سجل الإقامة غير موجود."))
		return result

	inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record_name)
	result["status"] = inpatient_record.status
	result["patient"] = inpatient_record.patient

	if inpatient_record.status not in ("Admitted", "Discharge Scheduled"):
		result["eligible"] = False
		result["blockers"].append(
			_("سجل الإقامة غير صالح للخروج. الحالة الحالية: {0}").format(inpatient_record.status)
		)

	active_occupancies = [
		occ for occ in inpatient_record.inpatient_occupancies if not occ.left
	]
	result["active_occupancy"] = len(active_occupancies) > 0

	if not active_occupancies:
		result["eligible"] = False
		result["blockers"].append(_("لا يوجد سجل إشغال نشط."))

	return result


@frappe.whitelist()
def discharge_inpatient(
	inpatient_record_name,
	discharge_note=None,
	discharge_instructions=None,
	followup_date=None,
):
	_require_admission_officer()

	if not frappe.db.exists("Inpatient Record", inpatient_record_name):
		frappe.throw(_("سجل الإقامة غير موجود."))

	inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record_name)

	if inpatient_record.status not in ("Admitted", "Discharge Scheduled"):
		frappe.throw(
			_("سجل الإقامة غير صالح للخروج. الحالة الحالية: {0}").format(inpatient_record.status)
		)

	active_occupancies = [
		occ for occ in inpatient_record.inpatient_occupancies if not occ.left
	]
	if not active_occupancies:
		frappe.throw(_("لا يوجد سجل إشغال نشط."))

	if discharge_note:
		inpatient_record.discharge_note = discharge_note
	if discharge_instructions:
		inpatient_record.discharge_instructions = discharge_instructions
	if followup_date:
		inpatient_record.followup_date = followup_date

	check_out_inpatient(inpatient_record)

	try:
		discharge_patient(inpatient_record)
	except Exception as e:
		frappe.log_error(
			title="Admission Office: discharge_patient failed",
			message=f"Inpatient Record: {inpatient_record.name}\nException: {e}",
		)
		raise

	inpatient_record.reload()

	if inpatient_record.status != "Discharged":
		frappe.throw(
			_("فشل في خروج المريض. حالة السجل: {0}").format(inpatient_record.status)
		)

	if not inpatient_record.discharge_datetime:
		frappe.throw(_("لم يتم تسجيل تاريخ ووقت الخروج."))

	patient = frappe.get_doc("Patient", inpatient_record.patient)
	patient.reload()

	if patient.inpatient_status not in (None, ""):
		frappe.throw(_("حالة المريض لم يتم تنظيفها بعد الخروج."))

	if patient.inpatient_record:
		frappe.throw(_("رابط سجل الإقامة للمريض لم يتم تنظيفه."))

	for occ in inpatient_record.inpatient_occupancies:
		if occ.left != 1:
			frappe.throw(_("سجل إشغال لم يتم إغلاقه."))
		if not occ.check_out:
			frappe.throw(_("تاريخ خروج الإشغال غير مسجل."))

	er_admission_request_name = frappe.db.get_value(
		"ER Admission Request",
		{"admission_reference": inpatient_record.name},
		"name",
	)

	er_admission_request = None
	if er_admission_request_name:
		er_admission_request = frappe.get_doc(
			"ER Admission Request", er_admission_request_name
		)
		if er_admission_request.docstatus == 1:
			frappe.db.set_value(
				"ER Admission Request",
				er_admission_request.name,
				"admission_status",
				"Discharged",
			)
		else:
			er_admission_request.admission_status = "Discharged"
			er_admission_request.save(ignore_permissions=True)

		if er_admission_request.er_patient_intake:
			frappe.db.set_value(
				"ER Patient Intake",
				er_admission_request.er_patient_intake,
				{
					"discharge_time": inpatient_record.discharge_datetime,
				},
			)

			from custom_app.emergency_management.api.er_visit_workflow import (
				transition_er_visit,
			)

			transition_er_visit(
				er_admission_request.er_patient_intake,
				"خروج",
			)

	return {
		"success": True,
		"inpatient_record": inpatient_record.name,
		"patient": patient.name,
		"discharge_datetime": inpatient_record.discharge_datetime,
		"released_service_units": [
			occ.service_unit for occ in inpatient_record.inpatient_occupancies if occ.left
		],
		"final_status": inpatient_record.status,
	}


@frappe.whitelist()
def validate_transfer_eligibility(inpatient_record_name, new_service_unit):
	_require_admission_officer()

	result = {
		"eligible": True,
		"inpatient_record": inpatient_record_name,
		"current_service_unit": None,
		"destination_service_unit": new_service_unit,
		"destination_available": False,
		"is_group": None,
		"inpatient_occupancy": None,
		"occupancy_status": None,
		"type_compatible": False,
		"active_occupancy_count": 0,
		"blockers": [],
	}

	if not frappe.db.exists("Inpatient Record", inpatient_record_name):
		result["eligible"] = False
		result["blockers"].append(_("سجل الإقامة غير موجود."))
		return result

	inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record_name)
	result["current_service_unit"] = inpatient_record.service_unit
	result["requested_service_unit_type"] = getattr(inpatient_record, "admission_service_unit_type", None)

	if inpatient_record.status != "Admitted":
		result["eligible"] = False
		result["blockers"].append(
			_("سجل الإقامة غير صالح للتحويل. الحالة الحالية: {0}").format(inpatient_record.status)
		)

	active_occupancies = [
		occ for occ in inpatient_record.inpatient_occupancies if not occ.left
	]
	result["active_occupancy_count"] = len(active_occupancies)

	if len(active_occupancies) != 1:
		result["eligible"] = False
		result["blockers"].append(_("يجب أن يكون هناك سجل إشغال نشط واحد فقط."))

	if not frappe.db.exists("Healthcare Service Unit", new_service_unit):
		result["eligible"] = False
		result["blockers"].append(_("الوحدة الوجهة غير موجودة."))
		return result

	unit = frappe.get_doc("Healthcare Service Unit", new_service_unit)
	result["is_group"] = unit.is_group
	result["inpatient_occupancy"] = unit.inpatient_occupancy
	result["occupancy_status"] = unit.occupancy_status

	if unit.is_group == 1:
		result["eligible"] = False
		result["blockers"].append(_("الوحدة الوجهة غير مخصصة للتنويم."))

	if unit.inpatient_occupancy != 1:
		result["eligible"] = False
		result["blockers"].append(_("الوحدة الوجهة غير مخصصة للتنويم."))

	if unit.occupancy_status != "Vacant":
		result["eligible"] = False
		result["blockers"].append(_("الوحدة الوجهة مشغولة."))

	if result["current_service_unit"] == new_service_unit:
		result["eligible"] = False
		result["blockers"].append(_("الوحدة الوجهة هي نفس الوحدة الحالية."))

	if active_occupancies and unit.service_unit_type:
		current_unit = frappe.get_doc(
			"Healthcare Service Unit", active_occupancies[0].service_unit
		)
		if current_unit.service_unit_type != unit.service_unit_type:
			result["eligible"] = False
			result["blockers"].append(_("نوع الوحدة الحالية لا يتطابق مع الوحدة الوجهة."))

	result["type_compatible"] = result["eligible"]
	result["destination_available"] = (
		result["eligible"]
		and unit.is_group == 0
		and unit.inpatient_occupancy == 1
		and unit.occupancy_status == "Vacant"
	)

	return result


@frappe.whitelist()
def transfer_inpatient(inpatient_record_name, new_service_unit, check_in=None):
	_require_admission_officer()

	if not frappe.db.exists("Inpatient Record", inpatient_record_name):
		frappe.throw(_("سجل الإقامة غير موجود."))

	inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record_name)

	if inpatient_record.status != "Admitted":
		frappe.throw(
			_("سجل الإقامة غير صالح للتحويل. الحالة الحالية: {0}").format(inpatient_record.status)
		)

	active_occupancies = [
		occ for occ in inpatient_record.inpatient_occupancies if not occ.left
	]
	if len(active_occupancies) != 1:
		frappe.throw(_("يجب أن يكون هناك سجل إشغال نشط واحد فقط."))

	old_service_unit = active_occupancies[0].service_unit

	if old_service_unit == new_service_unit:
		frappe.throw(_("الوحدة الوجهة هي نفس الوحدة الحالية."))

	if not frappe.db.exists("Healthcare Service Unit", new_service_unit):
		frappe.throw(_("الوحدة الوجهة غير موجودة."))

	unit = frappe.get_doc("Healthcare Service Unit", new_service_unit)

	if unit.is_group == 1:
		frappe.throw(_("الوحدة الوجهة غير مخصصة للتنويم."))

	if unit.inpatient_occupancy != 1:
		frappe.throw(_("الوحدة الوجهة غير مخصصة للتنويم."))

	if unit.occupancy_status != "Vacant":
		frappe.throw(_("الوحدة الوجهة مشغولة."))

	if unit.service_unit_type:
		current_unit = frappe.get_doc("Healthcare Service Unit", old_service_unit)
		if current_unit.service_unit_type != unit.service_unit_type:
			frappe.throw(_("نوع الوحدة الحالية لا يتطابق مع الوحدة الوجهة."))

	check_in_dt = check_in or now_datetime()

	try:
		inpatient_record.transfer(new_service_unit, check_in_dt, leave_from=old_service_unit)
	except Exception as e:
		frappe.log_error(
			title="Admission Office: transfer_inpatient failed",
			message=f"Inpatient Record: {inpatient_record.name}\nOld Unit: {old_service_unit}\nNew Unit: {new_service_unit}\nException: {e}",
		)
		raise

	inpatient_record.reload()
	old_unit = frappe.get_doc("Healthcare Service Unit", old_service_unit)
	new_unit = frappe.get_doc("Healthcare Service Unit", new_service_unit)
	patient = frappe.get_doc("Patient", inpatient_record.patient)

	patient.reload()

	if old_unit.occupancy_status != "Vacant":
		frappe.throw(_("الوحدة القديمة لم يتم إفراغها."))

	if new_unit.occupancy_status != "Occupied":
		frappe.throw(_("الوحدة الوجهة لم يتم شغلها."))

	new_active_occupancies = [
		occ for occ in inpatient_record.inpatient_occupancies if not occ.left
	]
	if len(new_active_occupancies) != 1:
		frappe.throw(_("لم يتم إنشاء سجل إشغال نشط واحد بعد التحويل."))

	if new_active_occupancies[0].service_unit != new_service_unit:
		frappe.throw(_("سجل الإشغال النشط لا يشير إلى الوحدة الوجهة."))

	if patient.inpatient_status != "Admitted":
		frappe.throw(_("حالة المريض تغيرت بعد التحويل."))

	if patient.inpatient_record != inpatient_record.name:
		frappe.throw(_("رابط سجل الإقامة للمريض تغير بعد التحويل."))

	return {
		"success": True,
		"inpatient_record": inpatient_record.name,
		"patient": patient.name,
		"old_service_unit": old_service_unit,
		"new_service_unit": new_service_unit,
		"check_in": check_in_dt,
	}
