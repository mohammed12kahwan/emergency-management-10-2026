frappe.pages['er_bed_board'].on_page_load = function(wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '🛏️ لوحة الأسرة',
        single_column: true
    });


    $(wrapper).find(".layout-main-section").html(`

        <div class="er-bed-board">

            <div class="er-bed-header">
                <h2>
                    🛏️ لوحة متابعة أسرة الطوارئ
                </h2>

                <button class="btn btn-primary" id="refresh-beds">
                    🔄 تحديث
                </button>
            </div>


            <div id="beds-container" class="beds-container">

                جاري تحميل الأسرة...

            </div>

        </div>

    `);



    load_beds();



    $("#refresh-beds").on("click", function(){

        load_beds();

    });



    function load_beds(){

        frappe.call({

            method:
            "custom_app.emergency_management.page.er_bed_board.er_bed_board.get_er_bed_board",

            callback: function(r){

                if(r.message){

                    render_beds(r.message);

                }

            }

        });

    }



    function render_beds(beds){


        let html = "";


        beds.forEach(function(bed){


            let status = bed.bed_status || "غير معروف";


            let status_icon = "🟢";


            if(status.includes("OCCUPIED")){

                status_icon = "🔴";

            }

            else if(status.includes("CLEANING")){

                status_icon = "🟡";

            }



            html += `


            <div class="bed-card">


                <div class="bed-title">

                    🛏️ ${bed.arabic_name || bed.bed_name}

                </div>



                <div class="bed-status">

                    ${status_icon}
                    ${status}

                </div>



                <hr>


                <div>
                    👤 المريض:
                    <b>
                    ${bed.patient_name || "لا يوجد"}
                    </b>
                </div>



                <div>
                    👨‍⚕️ الطبيب:
                    ${bed.assigned_doctor || "-"}
                </div>



                <div>
                    👩‍⚕️ الممرض:
                    ${bed.assigned_nurse || "-"}
                </div>



                <div>
                    📍 الموقع:
                    ${bed.current_location || "-"}
                </div>



            </div>


            `;


        });



        $("#beds-container").html(html);


    }


};