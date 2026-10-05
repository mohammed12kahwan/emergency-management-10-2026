import frappe

DOCTYPES = [
    'Patient','Patient Encounter','ER Patient Intake','ER Bed','ER Bed Status',
    'Vital Signs','ER Diagnostic Request','ER Observation Stay','ER Admission Request',
    'ER Patient Service Request','Medication Request','Lab Test','Radiology Examination',
    'Clinical Procedure','Inpatient Record','Lab Test Template','Item','Medication',
    'Healthcare Practitioner','Department','ER Waiting Area','ER Priority',
    'ER Chief Complaint','ER Triage Level','ER Current Location','ER Disposition',
    'ER Arrival Source'
]

print('=== DATA COUNTS ===')
for dt in DOCTYPES:
    try:
        cnt = frappe.db.count(dt)
        print(f'{dt}: {cnt}')
    except Exception as e:
        print(f'{dt}: ERROR - {e}')
