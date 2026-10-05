frappe.pages['er_tracking_board-1'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'لوحة متابعة المرضى',
		single_column: true
	});
}