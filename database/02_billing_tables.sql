-- Power Utility Management System - Billing Tables
-- Additional tables for advanced billing features
-- (Unchanged from the team's original 04_billing_tables.sql. It now runs BEFORE the
--  sample data, because the bill function in 03 reads the tariffs + tariff_slabs below.)
-- Run after 01_create_tables.sql

-- Tariff configuration table
CREATE TABLE tariffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('Residential', 'Commercial')),
    connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('Single Phase', 'Three Phase')),
    fixed_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 16.00, -- VAT percentage
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tariff slabs (tiered pricing)
CREATE TABLE tariff_slabs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tariff_id UUID NOT NULL REFERENCES tariffs(id) ON DELETE CASCADE,
    slab_order INTEGER NOT NULL,
    start_unit INTEGER NOT NULL,
    end_unit INTEGER, -- NULL means unlimited
    rate_per_unit DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tariffs
INSERT INTO tariffs (name, customer_type, connection_type, fixed_charge, tax_rate, effective_from, is_active) VALUES
('Residential Single Phase', 'Residential', 'Single Phase', 150, 16.00, '2024-01-01', TRUE),
('Residential Three Phase', 'Residential', 'Three Phase', 300, 16.00, '2024-01-01', TRUE),
('Commercial Single Phase', 'Commercial', 'Single Phase', 450, 16.00, '2024-01-01', TRUE),
('Commercial Three Phase', 'Commercial', 'Three Phase', 450, 16.00, '2024-01-01', TRUE);

-- Insert default tariff slabs for Residential
INSERT INTO tariff_slabs (tariff_id, slab_order, start_unit, end_unit, rate_per_unit) VALUES
((SELECT id FROM tariffs WHERE name = 'Residential Single Phase'), 1, 0, 50, 2.50),
((SELECT id FROM tariffs WHERE name = 'Residential Single Phase'), 2, 51, 100, 3.50),
((SELECT id FROM tariffs WHERE name = 'Residential Single Phase'), 3, 101, 200, 5.00),
((SELECT id FROM tariffs WHERE name = 'Residential Single Phase'), 4, 201, 500, 7.50),
((SELECT id FROM tariffs WHERE name = 'Residential Single Phase'), 5, 501, NULL, 10.00);

-- Insert default tariff slabs for Commercial
INSERT INTO tariff_slabs (tariff_id, slab_order, start_unit, end_unit, rate_per_unit) VALUES
((SELECT id FROM tariffs WHERE name = 'Commercial Single Phase'), 1, 0, 100, 5.00),
((SELECT id FROM tariffs WHERE name = 'Commercial Single Phase'), 2, 101, 500, 7.00),
((SELECT id FROM tariffs WHERE name = 'Commercial Single Phase'), 3, 501, 1000, 9.00),
((SELECT id FROM tariffs WHERE name = 'Commercial Single Phase'), 4, 1001, NULL, 12.00);

-- Three phase uses same slabs as single phase for same customer type
-- Residential Three Phase uses Residential slabs
INSERT INTO tariff_slabs (tariff_id, slab_order, start_unit, end_unit, rate_per_unit)
SELECT t.id, s.slab_order, s.start_unit, s.end_unit, s.rate_per_unit
FROM tariffs t
JOIN tariff_slabs s ON s.tariff_id = (SELECT id FROM tariffs WHERE name = 'Residential Single Phase')
WHERE t.name = 'Residential Three Phase';

-- Commercial Three Phase uses Commercial slabs
INSERT INTO tariff_slabs (tariff_id, slab_order, start_unit, end_unit, rate_per_unit)
SELECT t.id, s.slab_order, s.start_unit, s.end_unit, s.rate_per_unit
FROM tariffs t
JOIN tariff_slabs s ON s.tariff_id = (SELECT id FROM tariffs WHERE name = 'Commercial Single Phase')
WHERE t.name = 'Commercial Three Phase';

-- Bill adjustments table  (on the "Later" list: no API/UI yet)
CREATE TABLE bill_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(30) NOT NULL CHECK (adjustment_type IN ('Discount', 'Penalty', 'Correction', 'Waiver', 'Rebate')),
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT NOT NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bill installments table  (on the "Later" list: no API/UI yet)
CREATE TABLE bill_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Waived')),
    paid_date DATE,
    paid_amount DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meter reading schedules  (on the "Later" list: no API/UI yet)
CREATE TABLE meter_reading_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Missed', 'Rescheduled')),
    actual_reading_id UUID REFERENCES meter_readings(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tariffs_customer_type ON tariffs(customer_type);
CREATE INDEX idx_tariff_slabs_tariff_id ON tariff_slabs(tariff_id);
CREATE INDEX idx_bill_adjustments_bill_id ON bill_adjustments(bill_id);
CREATE INDEX idx_bill_installments_bill_id ON bill_installments(bill_id);
CREATE INDEX idx_meter_reading_schedules_connection_id ON meter_reading_schedules(connection_id);
CREATE INDEX idx_meter_reading_schedules_scheduled_date ON meter_reading_schedules(scheduled_date);

-- Trigger for updated_at
CREATE TRIGGER update_tariffs_updated_at BEFORE UPDATE ON tariffs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meter_reading_schedules_updated_at BEFORE UPDATE ON meter_reading_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
