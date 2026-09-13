const route=(title,section,kind,permission,finance=false)=>({title,section,kind,permission,finance})
export const companyRoutes={
 'cleaning-zones':route('Cleaning zones','Housekeeping','ZONE','housekeeping.view'),
 'work-schedules':route('Cleaning & count schedules','Housekeeping','SCHEDULE','housekeeping.view'),
 'cleaning-jobs':route('Cleaning & count jobs','Housekeeping','JOB','housekeeping.view'),
 'stock-requests':route('Stock requests','Inventory & Equipment','STOCK_REQUEST','inventory.request'),
 'stock-counts':route('Stock counts','Inventory & Equipment','COUNT','inventory.request'),
 'maintenance':route('Maintenance jobs','Inventory & Equipment','MAINTENANCE','inventory.request'),
 'custodians':route('Warehouse custodians','Inventory & Equipment','RESPONSIBILITY','inventory.request'),
 'purchasing':route('Purchasing','Purchasing','PURCHASE','purchasing.view'),
 'employees':route('Employment','Company & Personnel','EMPLOYMENT','personnel.view',true),
 'attendance':route('Attendance & rest','Company & Personnel','ATTENDANCE','personnel.view',true),
 'payroll':route('Payroll','Accounts & Finance','PAYROLL','payroll.view',true),
 'allowances':route('Trip allowances','Accounts & Finance','ALLOWANCE','expenses.view',true),
 'expenses':route('Reimbursements','Accounts & Finance','REIMBURSEMENT','expenses.view',true),
 'advances':route('Work advances','Accounts & Finance','WORK_ADVANCE','expenses.view',true),
 'salary-advances':route('Salary advances','Accounts & Finance','SALARY_ADVANCE','payroll.view',true),
 'supplier-payments':route('Supplier payments','Accounts & Finance','SUPPLIER_PAYMENT','expenses.view',true),
}
companyRoutes['work-schedules'].anyPermissions=['housekeeping.view','inventory.approve']
companyRoutes['cleaning-jobs'].anyPermissions=['housekeeping.view','inventory.request']
export const canUseCompany=(user,route)=>(route.anyPermissions||[route.permission]).some(p=>user?.companyAccess?.[p])
