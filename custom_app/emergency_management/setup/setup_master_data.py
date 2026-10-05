import frappe



# ==================================================
# MAIN SETUP
# ==================================================

def create_master_data():

    create_er_triage_levels()
    create_er_bed_status()
    create_er_priority()
    create_er_arrival_source()
    create_er_disposition()
    create_er_waiting_area()
    create_er_current_location()

    create_er_visit_type()

    create_er_complaint_category()
    create_er_chief_complaint()

    frappe.db.commit()



# ==================================================
# Generic Creator / Updater
# ==================================================

def create_or_update(doctype, data):

    code = data.get("code")

    if not code:
        frappe.throw(
            f"Missing code for {doctype}"
        )


    existing = frappe.db.get_value(
        doctype,
        {
            "code": code
        },
        "name"
    )


    if existing:

        doc = frappe.get_doc(
            doctype,
            existing
        )

        doc.update(data)

        doc.save(
            ignore_permissions=True
        )


    else:

        doc = frappe.get_doc(
            {
                "doctype": doctype,
                "name": code,
                **data
            }
        )

        doc.insert(
            ignore_permissions=True,
            set_name=code
        )



# ==================================================
# ER Triage Level
# ==================================================

def create_er_triage_levels():

    items = [

        {
            "code": "ESI1",
            "esi_level": 1,
            "level_name": "ESI1 - Resuscitation",
            "description": "إنعاش فوري",
            "color": "#CB2929",
            "is_active": 1,
            "display_order": 1
        },

        {
            "code": "ESI2",
            "esi_level": 2,
            "level_name": "ESI2 - Emergent",
            "description": "حالة طارئة",
            "color": "#ffa500",
            "is_active": 1,
            "display_order": 2
        },

        {
            "code": "ESI3",
            "esi_level": 3,
            "level_name": "ESI3 - Urgent",
            "description": "حالة عاجلة",
            "color": "#ffff00",
            "is_active": 1,
            "display_order": 3
        },

        {
            "code": "ESI4",
            "esi_level": 4,
            "level_name": "ESI4 - Less Urgent",
            "description": "أقل استعجالاً",
            "color": "#008000",
            "is_active": 1,
            "display_order": 4
        },

        {
            "code": "ESI5",
            "esi_level": 5,
            "level_name": "ESI5 - Non Urgent",
            "description": "غير عاجل",
            "color": "#0000FF",
            "is_active": 1,
            "display_order": 5
        }

    ]


    for item in items:

        create_or_update(
            "ER Triage Level",
            item
        )



# ==================================================
# ER Bed Status
# ==================================================

def create_er_bed_status():

    items = [

        {
            "code": "AVAILABLE",
            "status_name": "متاح",
            "arabic_name": "متاح",
            "is_available": 1,
            "is_active": 1,
            "display_order": 1
        },

        {
            "code": "OCCUPIED",
            "status_name": "مشغول",
            "arabic_name": "مشغول",
            "is_available": 0,
            "is_active": 1,
            "display_order": 2
        },

        {
            "code": "CLEANING",
            "status_name": "قيد التنظيف",
            "arabic_name": "قيد التنظيف",
            "is_available": 0,
            "is_active": 1,
            "display_order": 3
        },

        {
            "code": "RESERVED",
            "status_name": "محجوز",
            "arabic_name": "محجوز",
            "is_available": 0,
            "is_active": 1,
            "display_order": 4
        },

        {
            "code": "INACTIVE",
            "status_name": "غير فعال",
            "arabic_name": "غير فعال",
            "is_available": 0,
            "is_active": 0,
            "display_order": 5
        }

    ]


    for item in items:

        create_or_update(
            "ER Bed Status",
            item
        )
        # ==================================================
# ER Priority
# ==================================================

def create_er_priority():

    items = [

        {
            "code": "CRITICAL",
            "priority_name": "حرج"
        },

        {
            "code": "HIGH",
            "priority_name": "عالي"
        },

        {
            "code": "MEDIUM",
            "priority_name": "متوسط"
        },

        {
            "code": "LOW",
            "priority_name": "منخفض"
        }

    ]


    for item in items:

        create_or_update(
            "ER Priority",
            item
        )



# ==================================================
# ER Arrival Source
# ==================================================

def create_er_arrival_source():

    items = [

        {
            "code": "AMBULANCE",
            "arrival_source": "إسعاف"
        },

        {
            "code": "WALK_IN",
            "arrival_source": "حضور مباشر"
        },

        {
            "code": "REFERRAL",
            "arrival_source": "إحالة"
        },

        {
            "code": "TRANSFER",
            "arrival_source": "تحويل"
        }

    ]


    for item in items:

        create_or_update(
            "ER Arrival Source",
            item
        )



# ==================================================
# ER Disposition
# ==================================================

def create_er_disposition():

    items = [

        {
            "code": "DISCHARGED",
            "disposition_name": "خروج"
        },

        {
            "code": "ADMITTED",
            "disposition_name": "تنويم"
        },

        {
            "code": "TRANSFERRED",
            "disposition_name": "تحويل"
        },

        {
            "code": "LAMA",
            "disposition_name": "غادر بدون علاج"
        },

        {
            "code": "DEATH",
            "disposition_name": "وفاة"
        }

    ]


    for item in items:

        create_or_update(
            "ER Disposition",
            item
        )



# ==================================================
# ER Waiting Area
# ==================================================

def create_er_waiting_area():

    items = [

        {
            "code": "WAITING_ROOM",
            "waiting_area": "صالة الانتظار",
            "arabic_name": "صالة الانتظار",
            "display_order": 1,
            "is_active": 1
        },

        {
            "code": "TRIAGE_AREA",
            "waiting_area": "منطقة الفرز",
            "arabic_name": "منطقة الفرز",
            "display_order": 2,
            "is_active": 1
        },

        {
            "code": "OBSERVATION_AREA",
            "waiting_area": "الملاحظة",
            "arabic_name": "الملاحظة",
            "display_order": 3,
            "is_active": 1
        }

    ]


    for item in items:

        create_or_update(
            "ER Waiting Area",
            item
        )



# ==================================================
# ER Current Location
# ==================================================

def create_er_current_location():

    items = [

        {
            "code": "RECEPTION",
            "location_name": "الاستقبال",
            "arabic_name": "الاستقبال",
            "display_order": 1,
            "is_active": 1
        },

        {
            "code": "TRIAGE",
            "location_name": "الفرز",
            "arabic_name": "الفرز",
            "display_order": 2,
            "is_active": 1
        },

        {
            "code": "TREATMENT_ROOM",
            "location_name": "غرفة العلاج",
            "arabic_name": "غرفة العلاج",
            "display_order": 3,
            "is_active": 1
        },

        {
            "code": "OBSERVATION",
            "location_name": "الملاحظة",
            "arabic_name": "الملاحظة",
            "display_order": 4,
            "is_active": 1
        },

        {
            "code": "WARD",
            "location_name": "القسم",
            "arabic_name": "القسم",
            "display_order": 5,
            "is_active": 1
        }

    ]


    for item in items:

        create_or_update(
            "ER Current Location",
            item
        )
        # ==================================================
# ER Visit Type
# ==================================================

def create_er_visit_type():

    items = [

        {
            "code": "EMERGENCY",
            "visit_type_name": "Emergency",
            "arabic_name": "طوارئ",
            "description": "زيارة طوارئ عامة",
            "is_active": 1,
            "display_order": 1,
            "visit_color": "#CB2929",
            "icon": "alert-circle"
        },

        {
            "code": "TRAUMA",
            "visit_type_name": "Trauma",
            "arabic_name": "إصابة / حادث",
            "description": "حالات الإصابات والحوادث",
            "is_active": 1,
            "display_order": 2,
            "visit_color": "#FF8C00",
            "icon": "ambulance"
        },

        {
            "code": "REFERRAL",
            "visit_type_name": "Referral",
            "arabic_name": "إحالة",
            "description": "مرضى محولون من جهة أخرى",
            "is_active": 1,
            "display_order": 3,
            "visit_color": "#0066FF",
            "icon": "arrow-right"
        },

        {
            "code": "FOLLOW_UP",
            "visit_type_name": "Follow Up",
            "arabic_name": "متابعة",
            "description": "زيارة متابعة",
            "is_active": 1,
            "display_order": 4,
            "visit_color": "#008000",
            "icon": "refresh"
        }

    ]


    for item in items:

        create_or_update(
            "ER Visit Type",
            item
        )



# ==================================================
# ER Complaint Category
# ==================================================

def create_er_complaint_category():

    items = [

        {
            "code": "CARDIAC",
            "category_name": "Cardiac",
            "arabic_name": "قلبي"
        },

        {
            "code": "RESPIRATORY",
            "category_name": "Respiratory",
            "arabic_name": "تنفسي"
        },

        {
            "code": "TRAUMA",
            "category_name": "Trauma",
            "arabic_name": "إصابات"
        },

        {
            "code": "GENERAL",
            "category_name": "General",
            "arabic_name": "عام"
        },

        {
            "code": "GASTROINTESTINAL",
            "category_name": "Gastrointestinal",
            "arabic_name": "جهاز هضمي"
        },

        {
            "code": "NEUROLOGICAL",
            "category_name": "Neurological",
            "arabic_name": "أعصاب"
        }

    ]


    for item in items:

        create_or_update(
            "ER Complaint Category",
            item
        )



# ==================================================
# ER Chief Complaint
# ==================================================

def create_er_chief_complaint():

    items = [

        {
            "code": "CHEST_PAIN",
            "complaint_name": "Chest Pain",
            "complaint_name_ar": "ألم صدر",
            "complaint_category": "CARDIAC"
        },

        {
            "code": "SHORTNESS_OF_BREATH",
            "complaint_name": "Shortness of Breath",
            "complaint_name_ar": "ضيق تنفس",
            "complaint_category": "RESPIRATORY"
        },

        {
            "code": "TRAUMA",
            "complaint_name": "Trauma",
            "complaint_name_ar": "إصابة",
            "complaint_category": "TRAUMA"
        },

        {
            "code": "FEVER",
            "complaint_name": "Fever",
            "complaint_name_ar": "حمى",
            "complaint_category": "GENERAL"
        },

        {
            "code": "ABDOMINAL_PAIN",
            "complaint_name": "Abdominal Pain",
            "complaint_name_ar": "ألم بطني",
            "complaint_category": "GASTROINTESTINAL"
        },

        {
            "code": "LOSS_OF_CONSCIOUSNESS",
            "complaint_name": "Loss of Consciousness",
            "complaint_name_ar": "فقدان وعي",
            "complaint_category": "NEUROLOGICAL"
        }

    ]


    for item in items:

        create_or_update(
            "ER Chief Complaint",
            item
        )