-- =====================================================================
-- Power Utility Management System - Sample Data   (was 03_sample_data.sql)
-- Run after 03_functions_triggers_views.sql
--
-- Fixes applied:
--   #1 Bills are no longer typed by hand. Every bill is CALCULATED from its
--      meter reading with calculate_bill_amount(), so the amounts always match.
--   #4 Real bcrypt password hashes:
--         admin, tech.john, billing.officer  -> password: admin123
--         john.kamau, jane.wanjiku,
--         peter.ochieng, mary.akinyi          -> password: customer123
--   #8 Staff e-mails use @powerutility.com
--   Bill statuses are set by the payment trigger (not typed), then
--   check_overdue_bills() marks late bills as Overdue.
--   Dates were moved to 2026 so the demo looks current.
-- =====================================================================

-- Clear existing data (in correct order due to foreign keys)
TRUNCATE TABLE service_request_comments, service_requests, payments, bills, meter_readings, connections, customers, users CASCADE;

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------
INSERT INTO users (username, email, full_name, role, status, password_hash, customer_id) VALUES
('admin',           'admin@powerutility.com',   'System Administrator', 'admin',    'Active', '$2b$10$GvZ9mxL3i7kS/6aVq40m/u.dYGpH8H992AgFe1/R7rttaV5Y7PnwC', NULL),
('tech.john',       'tech.john@powerutility.com','Technician John',     'admin',    'Active', '$2b$10$GvZ9mxL3i7kS/6aVq40m/u.dYGpH8H992AgFe1/R7rttaV5Y7PnwC', NULL),
('billing.officer', 'billing@powerutility.com', 'Billing Officer',      'admin',    'Active', '$2b$10$GvZ9mxL3i7kS/6aVq40m/u.dYGpH8H992AgFe1/R7rttaV5Y7PnwC', NULL),
('john.kamau',      'john.kamau@example.com',     'John Kamau',           'customer', 'Active', '$2b$10$jWddvNY5biturPUc0CnfqOeYV9lHONrIIwGEf0YKu8lEyrml5POCq', NULL),
('jane.wanjiku',    'jane.wanjiku@example.com',   'Jane Wanjiku',         'customer', 'Active', '$2b$10$jWddvNY5biturPUc0CnfqOeYV9lHONrIIwGEf0YKu8lEyrml5POCq', NULL),
('peter.ochieng',   'peter.ochieng@example.com',  'Peter Ochieng',        'customer', 'Active', '$2b$10$jWddvNY5biturPUc0CnfqOeYV9lHONrIIwGEf0YKu8lEyrml5POCq', NULL),
('mary.akinyi',     'mary.akinyi@example.com',    'Mary Akinyi',          'customer', 'Active', '$2b$10$jWddvNY5biturPUc0CnfqOeYV9lHONrIIwGEf0YKu8lEyrml5POCq', NULL);

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
INSERT INTO customers (customer_number, full_name, phone, email, address, customer_type, status, user_id) VALUES
('CUST-001', 'John Kamau', '+254 712 345 678', 'john.kamau@example.com', '123 Kenyatta Avenue, Nairobi, Kenya', 'Residential', 'Active', (SELECT id FROM users WHERE username = 'john.kamau')),
('CUST-002', 'Jane Wanjiku', '+254 723 456 789', 'jane.wanjiku@example.com', '456 Moi Avenue, Mombasa, Kenya', 'Commercial', 'Active', (SELECT id FROM users WHERE username = 'jane.wanjiku')),
('CUST-003', 'Peter Ochieng', '+254 734 567 890', 'peter.ochieng@example.com', '789 Oginga Odinga Rd, Kisumu, Kenya', 'Residential', 'Active', (SELECT id FROM users WHERE username = 'peter.ochieng')),
('CUST-004', 'Mary Akinyi', '+254 745 678 901', 'mary.akinyi@example.com', '321 Tom Mboya St, Nakuru, Kenya', 'Residential', 'Active', (SELECT id FROM users WHERE username = 'mary.akinyi')),
('CUST-005', 'ABC Manufacturing Ltd', '+254 756 789 012', 'accounts@example.com', 'Industrial Area, Nairobi, Kenya', 'Commercial', 'Active', NULL),
('CUST-006', 'David Mwangi', '+254 767 890 123', 'david.mwangi@example.com', '567 Ngong Rd, Nairobi, Kenya', 'Residential', 'Active', NULL),
('CUST-007', 'Sarah Njeri', '+254 778 901 234', 'sarah.njeri@example.com', '890 Thika Rd, Nairobi, Kenya', 'Residential', 'Inactive', NULL),
('CUST-008', 'Green Energy Solutions', '+254 789 012 345', 'info@example.com', 'Westlands, Nairobi, Kenya', 'Commercial', 'Active', NULL);

-- Link customer logins both ways (users.customer_id <-> customers.user_id)
UPDATE users SET customer_id = (SELECT id FROM customers WHERE customer_number = 'CUST-001') WHERE username = 'john.kamau';
UPDATE users SET customer_id = (SELECT id FROM customers WHERE customer_number = 'CUST-002') WHERE username = 'jane.wanjiku';
UPDATE users SET customer_id = (SELECT id FROM customers WHERE customer_number = 'CUST-003') WHERE username = 'peter.ochieng';
UPDATE users SET customer_id = (SELECT id FROM customers WHERE customer_number = 'CUST-004') WHERE username = 'mary.akinyi';

-- ---------------------------------------------------------------------
-- Connections (electricity services + meter information)
-- ---------------------------------------------------------------------
INSERT INTO connections (customer_id, meter_number, connection_type, installation_date, status, notes) VALUES
((SELECT id FROM customers WHERE customer_number = 'CUST-001'), 'MET-0045', 'Single Phase', '2024-01-20', 'Active', 'Residential connection'),
((SELECT id FROM customers WHERE customer_number = 'CUST-001'), 'MET-0456', 'Three Phase', '2024-08-20', 'Active', 'Additional connection for home office'),
((SELECT id FROM customers WHERE customer_number = 'CUST-002'), 'MET-0123', 'Three Phase', '2024-06-15', 'Active', 'Commercial 3-phase'),
((SELECT id FROM customers WHERE customer_number = 'CUST-003'), 'MET-0089', 'Single Phase', '2024-03-10', 'Active', 'Residential connection'),
((SELECT id FROM customers WHERE customer_number = 'CUST-004'), 'MET-0234', 'Single Phase', '2024-04-05', 'Active', 'Residential connection'),
((SELECT id FROM customers WHERE customer_number = 'CUST-005'), 'MET-0345', 'Three Phase', '2024-05-12', 'Active', 'Main factory connection'),
((SELECT id FROM customers WHERE customer_number = 'CUST-005'), 'MET-0567', 'Three Phase', '2024-07-22', 'Active', 'Warehouse connection'),
((SELECT id FROM customers WHERE customer_number = 'CUST-005'), 'MET-0789', 'Single Phase', '2024-09-10', 'Inactive', 'Office backup connection'),
((SELECT id FROM customers WHERE customer_number = 'CUST-006'), 'MET-0678', 'Single Phase', '2024-06-18', 'Active', 'New residential'),
((SELECT id FROM customers WHERE customer_number = 'CUST-008'), 'MET-0890', 'Three Phase', '2024-08-30', 'Active', 'Solar farm connection'),
((SELECT id FROM customers WHERE customer_number = 'CUST-008'), 'MET-0901', 'Single Phase', '2024-10-15', 'Active', 'Office connection');

-- ---------------------------------------------------------------------
-- Meter Readings (verified readings for billing)
-- A reading taken on the 1st of a month covers the PREVIOUS month.
-- ---------------------------------------------------------------------
-- John Kamau (MET-0045) - Residential
INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, recorded_by) VALUES
((SELECT id FROM connections WHERE meter_number = 'MET-0045'), 0, 1200, '2026-06-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0045'), 1200, 1650, '2026-07-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0045'), 1650, 1950, '2026-08-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0045'), 1950, 2200, '2026-09-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0045'), 2200, 2450, '2026-10-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0045'), 2450, 2750, '2026-11-01', 'Verified', (SELECT id FROM users WHERE username = 'admin'));

-- Jane Wanjiku (MET-0123) - Commercial
INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, recorded_by) VALUES
((SELECT id FROM connections WHERE meter_number = 'MET-0123'), 0, 8500, '2026-06-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0123'), 8500, 12200, '2026-07-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0123'), 12200, 14800, '2026-08-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0123'), 14800, 15420, '2026-09-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0123'), 15420, 16800, '2026-10-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0123'), 16800, 18200, '2026-11-01', 'Verified', (SELECT id FROM users WHERE username = 'admin'));

-- Peter Ochieng (MET-0089) - Residential
INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, recorded_by) VALUES
((SELECT id FROM connections WHERE meter_number = 'MET-0089'), 0, 450, '2026-06-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0089'), 450, 850, '2026-07-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0089'), 850, 920, '2026-08-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0089'), 920, 1100, '2026-09-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0089'), 1100, 1280, '2026-10-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0089'), 1280, 1450, '2026-11-01', 'Verified', (SELECT id FROM users WHERE username = 'admin'));

-- ABC Manufacturing (MET-0345) - Commercial
INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, recorded_by) VALUES
((SELECT id FROM connections WHERE meter_number = 'MET-0345'), 0, 15000, '2026-06-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0345'), 15000, 25000, '2026-07-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0345'), 25000, 35000, '2026-08-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0345'), 35000, 42000, '2026-09-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0345'), 42000, 48500, '2026-10-01', 'Verified', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM connections WHERE meter_number = 'MET-0345'), 48500, 55000, '2026-11-01', 'Verified', (SELECT id FROM users WHERE username = 'admin'));

-- ---------------------------------------------------------------------
-- Bills: CALCULATED from the readings with calculate_bill_amount()
--   period  = the month before the reading date
--   due     = reading date + 19 days (the 20th)
--   status  = 'Unpaid' for now; the payment trigger updates it below
-- ---------------------------------------------------------------------
INSERT INTO bills (bill_number, connection_id, billing_period_start, billing_period_end, due_date,
                   fixed_charge, variable_charge, tax_amount, total_amount, status, notes)
SELECT
    b.bill_number,
    co.id,
    (mr.reading_date - INTERVAL '1 month')::date,
    (mr.reading_date - INTERVAL '1 day')::date,
    (mr.reading_date + INTERVAL '19 days')::date,
    calc.fixed_charge,
    calc.variable_charge,
    calc.tax_amount,
    calc.total_amount,
    'Unpaid',
    to_char(mr.reading_date - INTERVAL '1 month', 'Mon YYYY') || ' - ' || (mr.current_reading - mr.previous_reading) || ' kWh'
FROM (VALUES
    ('BILL-2026-001', 'MET-0045', DATE '2026-09-01'),
    ('BILL-2026-002', 'MET-0045', DATE '2026-10-01'),
    ('BILL-2026-003', 'MET-0045', DATE '2026-11-01'),
    ('BILL-2026-004', 'MET-0123', DATE '2026-09-01'),
    ('BILL-2026-005', 'MET-0123', DATE '2026-10-01'),
    ('BILL-2026-006', 'MET-0123', DATE '2026-11-01'),
    ('BILL-2026-007', 'MET-0089', DATE '2026-09-01'),
    ('BILL-2026-008', 'MET-0089', DATE '2026-10-01'),
    ('BILL-2026-009', 'MET-0089', DATE '2026-11-01'),
    ('BILL-2026-010', 'MET-0345', DATE '2026-09-01'),
    ('BILL-2026-011', 'MET-0345', DATE '2026-10-01'),
    ('BILL-2026-012', 'MET-0345', DATE '2026-11-01')
) AS b(bill_number, meter_number, reading_date)
JOIN connections co   ON co.meter_number = b.meter_number
JOIN customers cu     ON cu.id = co.customer_id
JOIN meter_readings mr ON mr.connection_id = co.id AND mr.reading_date = b.reading_date
CROSS JOIN LATERAL calculate_bill_amount(cu.customer_type, co.connection_type, mr.current_reading - mr.previous_reading) AS calc;

-- ---------------------------------------------------------------------
-- Payments (amounts are read from the bills, so they always match).
-- The trigger update_bill_status() sets each bill to Paid / Partially Paid.
-- ---------------------------------------------------------------------
INSERT INTO payments (payment_number, bill_id, amount, method, payment_date, reference, status, recorded_by) VALUES
('PAY-2026-001', (SELECT id FROM bills WHERE bill_number = 'BILL-2026-001'), (SELECT total_amount FROM bills WHERE bill_number = 'BILL-2026-001'), 'Mobile Banking', '2026-09-18', 'MPESA123456789', 'Completed', (SELECT id FROM users WHERE username = 'admin')),
('PAY-2026-002', (SELECT id FROM bills WHERE bill_number = 'BILL-2026-002'), (SELECT total_amount FROM bills WHERE bill_number = 'BILL-2026-002'), 'Mobile Banking', '2026-10-18', 'MPESA987654321', 'Completed', (SELECT id FROM users WHERE username = 'admin')),
('PAY-2026-003', (SELECT id FROM bills WHERE bill_number = 'BILL-2026-004'), (SELECT total_amount FROM bills WHERE bill_number = 'BILL-2026-004'), 'Bank Transfer', '2026-09-19', 'BNK456789123', 'Completed', (SELECT id FROM users WHERE username = 'billing.officer')),
('PAY-2026-004', (SELECT id FROM bills WHERE bill_number = 'BILL-2026-007'), (SELECT total_amount FROM bills WHERE bill_number = 'BILL-2026-007'), 'Cash', '2026-09-19', 'CSH001', 'Completed', (SELECT id FROM users WHERE username = 'billing.officer')),
('PAY-2026-005', (SELECT id FROM bills WHERE bill_number = 'BILL-2026-010'), (SELECT total_amount FROM bills WHERE bill_number = 'BILL-2026-010'), 'Bank Transfer', '2026-09-20', 'BNK789123456', 'Completed', (SELECT id FROM users WHERE username = 'billing.officer')),
('PAY-2026-006', (SELECT id FROM bills WHERE bill_number = 'BILL-2026-011'), (SELECT total_amount FROM bills WHERE bill_number = 'BILL-2026-011'), 'Bank Transfer', '2026-10-15', 'BNK654987321', 'Completed', (SELECT id FROM users WHERE username = 'billing.officer')),
('PAY-2026-007', (SELECT id FROM bills WHERE bill_number = 'BILL-2026-012'), 40000, 'Bank Transfer', '2026-11-03', 'BNK321654987', 'Completed', (SELECT id FROM users WHERE username = 'billing.officer'));

-- Mark late bills (due date already passed, not fully paid) as Overdue
SELECT check_overdue_bills();

-- ---------------------------------------------------------------------
-- Service Requests (complaints)
-- ---------------------------------------------------------------------
INSERT INTO service_requests (request_number, customer_id, category, priority, status, description, assigned_to, resolution_notes, resolved_at, created_at) VALUES
('REQ-2026-001', (SELECT id FROM customers WHERE customer_number = 'CUST-001'), 'Power Outage', 'High', 'Resolved', 'Complete power outage in Block A since 6 AM', (SELECT id FROM users WHERE username = 'tech.john'), 'Blown transformer fuse replaced. Power restored.', NOW() - INTERVAL '9 days', NOW() - INTERVAL '10 days'),
('REQ-2026-002', (SELECT id FROM customers WHERE customer_number = 'CUST-002'), 'Meter Issue', 'Medium', 'In Progress', 'Meter showing incorrect readings, running fast', (SELECT id FROM users WHERE username = 'tech.john'), NULL, NULL, NOW() - INTERVAL '6 days'),
('REQ-2026-003', (SELECT id FROM customers WHERE customer_number = 'CUST-003'), 'Billing Inquiry', 'Low', 'Resolved', 'Query about high bill amount for September', (SELECT id FROM users WHERE username = 'billing.officer'), 'Consumption spike explained (new AC unit).', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'),
('REQ-2026-004', (SELECT id FROM customers WHERE customer_number = 'CUST-005'), 'Connection Issue', 'Critical', 'In Progress', 'Three-phase connection tripping frequently', (SELECT id FROM users WHERE username = 'tech.john'), NULL, NULL, NOW() - INTERVAL '3 days'),
('REQ-2026-005', (SELECT id FROM customers WHERE customer_number = 'CUST-004'), 'General Complaint', 'Low', 'Pending', 'Request for meter relocation to new house', NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
('REQ-2026-006', (SELECT id FROM customers WHERE customer_number = 'CUST-006'), 'New Connection Request', 'Medium', 'Pending', 'Application for new residential connection', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),
('REQ-2026-007', (SELECT id FROM customers WHERE customer_number = 'CUST-001'), 'Meter Issue', 'Medium', 'Pending', 'Meter display not showing readings', NULL, NULL, NULL, NOW() - INTERVAL '5 hours');

-- Service Request Comments
INSERT INTO service_request_comments (request_id, user_id, comment, created_at) VALUES
((SELECT id FROM service_requests WHERE request_number = 'REQ-2026-001'), (SELECT id FROM users WHERE username = 'admin'), 'Request received and assigned to Technician John', NOW() - INTERVAL '10 days'),
((SELECT id FROM service_requests WHERE request_number = 'REQ-2026-001'), (SELECT id FROM users WHERE username = 'tech.john'), 'On site investigating. Found blown transformer fuse. Replacing now.', NOW() - INTERVAL '9 days 6 hours'),
((SELECT id FROM service_requests WHERE request_number = 'REQ-2026-001'), (SELECT id FROM users WHERE username = 'tech.john'), 'Power restored. Fuse replaced. Monitoring for stability.', NOW() - INTERVAL '9 days'),
((SELECT id FROM service_requests WHERE request_number = 'REQ-2026-002'), (SELECT id FROM users WHERE username = 'admin'), 'Request received. Scheduling meter inspection for tomorrow.', NOW() - INTERVAL '6 days'),
((SELECT id FROM service_requests WHERE request_number = 'REQ-2026-003'), (SELECT id FROM users WHERE username = 'billing.officer'), 'Reviewed bill. Consumption spike due to new AC unit. Explained to customer.', NOW() - INTERVAL '4 days'),
((SELECT id FROM service_requests WHERE request_number = 'REQ-2026-004'), (SELECT id FROM users WHERE username = 'tech.john'), 'Critical issue. On site now. Main breaker tripping due to overload.', NOW() - INTERVAL '3 days'),
((SELECT id FROM service_requests WHERE request_number = 'REQ-2026-004'), (SELECT id FROM users WHERE username = 'tech.john'), 'Identified faulty capacitor bank. Ordering replacement parts.', NOW() - INTERVAL '2 days');

-- Update last_login for users
UPDATE users SET last_login = NOW() - INTERVAL '1 hour' WHERE username = 'admin';
UPDATE users SET last_login = NOW() - INTERVAL '2 hours' WHERE username = 'tech.john';
UPDATE users SET last_login = NOW() - INTERVAL '1 day' WHERE username = 'billing.officer';
UPDATE users SET last_login = NOW() - INTERVAL '3 hours' WHERE username = 'john.kamau';
UPDATE users SET last_login = NOW() - INTERVAL '5 hours' WHERE username = 'jane.wanjiku';
UPDATE users SET last_login = NOW() - INTERVAL '1 day' WHERE username = 'peter.ochieng';
UPDATE users SET last_login = NOW() - INTERVAL '2 days' WHERE username = 'mary.akinyi';
