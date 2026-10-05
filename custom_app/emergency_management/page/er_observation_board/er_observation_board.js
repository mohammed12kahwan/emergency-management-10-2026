frappe.pages["er-observation-board"].on_page_load = function(wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "لوحة متابعة مرضى الملاحظة",
        single_column: true
    });


    $(wrapper).find(".layout-main-section").html(`

        <div class="observation-dashboard">

            <div class="observation-header">
                <h2>🏥 متابعة مرضى Observation</h2>
            </div>


            <div class="statistics">

                <div class="stat-card">
                    <div>المرضى تحت الملاحظة</div>
                    <strong id="total">0</strong>
                </div>


                <div class="stat-card critical">
                    <div>الحالات الحرجة</div>
                    <strong id="critical">0</strong>
                </div>


                <div class="stat-card warning">
                    <div>قياسات متأخرة</div>
                    <strong id="delayed">0</strong>
                </div>


                <div class="stat-card">
                    <div>الأسرة المتاحة</div>
                    <strong id="beds">0</strong>
                </div>

            </div>


            <div id="patients-area">

            </div>


        </div>

    `);


    load_observation_data();


    function load_observation_data(){

        frappe.call({

            method:
            "custom_app.emergency_management.page.er_observation_board.er_observation_board.get_observation_data",

            callback:function(r){

                if(!r.message)
                    return;


                let data = r.message;


                $("#total").text(
                    data.statistics.total
                );


                $("#critical").text(
                    data.statistics.critical
                );


                $("#delayed").text(
                    data.statistics.delayed
                );


                $("#beds").text(
                    data.statistics.available_beds
                );


                render_patients(
                    data.patients
                );

            }

        });

    }



    function render_patients(patients){


        let html = "";


        if(patients.length === 0){

            html = `
            <div class="empty">
                لا يوجد مرضى تحت الملاحظة حالياً
            </div>
            `;

        }


        patients.forEach(p=>{


            let status_class = "normal";


            if(p.critical)
                status_class="critical";


            else if(p.delayed)
                status_class="warning";


            let v = p.last_vital || {};


            html += `

            <div class="patient-card ${status_class}">


                <div class="patient-title">

                    🛏 ${p.bed || "-"}
                    |
                    ${p.patient_name || "بدون اسم"}

                </div>


                <div>
                    الفرز:
                    ${p.triage_level || "-"}
                </div>


                <div>
                    الحالة:
                    ${p.status || "-"}
                </div>


                <hr>


                <div class="vitals">

                    الضغط:
                    ${v.systolic_bp || "-"}
                    /
                    ${v.diastolic_bp || "-"}


                    النبض:
                    ${v.pulse || "-"}


                    SpO2:
                    ${v.spo2 || "-"}


                    الحرارة:
                    ${v.temperature || "-"}


                </div>


                <div>
                    الممرض:
                    ${p.nurse || "-"}
                </div>


            </div>

            `;

        });


        $("#patients-area").html(html);

    }


};