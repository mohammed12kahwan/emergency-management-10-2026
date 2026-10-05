import frappe

def test_complaint():
    print("=== Test Complaint exists ===")
    exists = frappe.db.exists("Complaint", "Chest pain")
    print(f"Complaint 'Chest pain' exists: {exists}")
    
    print("\n=== Test Diagnosis exists ===")
    exists = frappe.db.exists("Diagnosis", "Suspected ACS")
    print(f"Diagnosis 'Suspected ACS' exists: {exists}")
    
    print("\n=== Test Complaint count ===")
    count = frappe.db.count("Complaint")
    print(f"Total Complaints: {count}")
    
    print("\n=== Test Diagnosis count ===")
    count = frappe.db.count("Diagnosis")
    print(f"Total Diagnoses: {count}")
