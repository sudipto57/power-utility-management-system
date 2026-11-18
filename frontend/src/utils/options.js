// Dropdown choices. They match the CHECK constraints in the database.
export const CUSTOMER_TYPES = ['Residential', 'Commercial'];
export const CUSTOMER_STATUSES = ['Active', 'Inactive'];
export const CONNECTION_TYPES = ['Single Phase', 'Three Phase'];
export const CONNECTION_STATUSES = ['Active', 'Inactive', 'Disconnected'];
export const BILL_STATUSES = ['Unpaid', 'Partially Paid', 'Paid', 'Overdue'];
export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Banking', 'Cheque', 'Card', 'Other'];
export const REQUEST_CATEGORIES = [
  'Power Outage',
  'Meter Issue',
  'Connection Issue',
  'Billing Inquiry',
  'General Complaint',
  'New Connection Request',
  'Disconnection Request',
];
export const REQUEST_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const REQUEST_STATUSES = ['Pending', 'In Progress', 'Resolved', 'Cancelled'];

// Feedback form topics (must match FEEDBACK_TOPICS in backend/src/controllers/feedback.controller.js)
export const FEEDBACK_TOPICS = ['Website design', 'Bills and payments', 'Login and account', 'Service requests', 'New idea', 'Other'];
