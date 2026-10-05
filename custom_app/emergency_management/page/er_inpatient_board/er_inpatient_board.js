frappe.pages["er-inpatient-board"].on_page_load = function(wrapper){

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "متابعة المرضى المرقدين",
        single_column: true
    });

    load_board(wrapper);

};


// =============================
// تحميل بيانات الأسرة
// =============================
function load_board(wrapper){

    frappe.call({

        method:
        "custom_app.emergency_management.page.er_inpatient_board.er_inpatient_board.get_observation_board",

        callback:function(r){

            draw_board(wrapper, r.message);

        }

    });

}


// =============================
// رسم الشاشة
// =============================
function draw_board(wrapper, data){

    let html = "";

    for(let room in data){

        html += `
            <div class="er-room">

                <h3>${room}</h3>

                <div class="er-room-grid">
        `;

        data[room].forEach(function(bed){

            let cls = "available";

            if(bed.status === "OCCUPIED"){
                cls = "occupied";
            }

            html += `

                <div
                    class="bed-card ${cls}"
                    onclick="open_bed('${bed.name}','${bed.status}')"
                >

                    <div class="bed-title">

                        🛏 ${bed.bed_code}

                    </div>

                    <div>

                        ${bed.patient || "سرير فارغ"}

                    </div>

                </div>

            `;

        });

        html += `
                </div>

            </div>
        `;

    }

    $(wrapper)
        .find(".layout-main-section")
        .html(html);

}


// =============================
// عند الضغط على السرير
// =============================
function open_bed(bed_name, status){

    if(status === "AVAILABLE"){

        frappe.msgprint({

            title: "تنويم مريض",

            indicator: "green",

            message: `
                <div style="font-size:16px">

                    هذا السرير متاح لاستقبال مريض جديد.

                    <br><br>

                    <b>${bed_name}</b>

                </div>
            `

        });

    }else{

        frappe.msgprint({

            title: "متابعة المريض",

            indicator: "blue",

            message: `
                <div style="font-size:16px">

                    سيتم فتح شاشة متابعة المريض.

                    <br><br>

                    <b>${bed_name}</b>

                </div>
            `

        });

    }

}