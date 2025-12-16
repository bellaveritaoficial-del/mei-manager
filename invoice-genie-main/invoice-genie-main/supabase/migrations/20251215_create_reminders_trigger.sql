-- Create reminder_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS reminder_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    charge_id UUID REFERENCES charges(id) NOT NULL,
    send_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    channels TEXT[] DEFAULT '{inapp}', -- inapp, email, whatsapp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reminder_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own reminder jobs"
ON reminder_jobs FOR SELECT
USING (auth.uid() = user_id);

-- Function to automatically schedule reminders when a charge is created/updated
CREATE OR REPLACE FUNCTION schedule_charge_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Only schedule if status is pending and has due_date
    IF NEW.status = 'pending' AND NEW.due_date IS NOT NULL THEN
        -- Delete existing pending reminders for this charge to avoid duplicates
        DELETE FROM reminder_jobs 
        WHERE charge_id = NEW.id AND status = 'pending';

        -- Schedule reminder for Due Date (at 9:00 AM)
        INSERT INTO reminder_jobs (user_id, charge_id, send_at, channels)
        VALUES (
            NEW.user_id,
            NEW.id,
            (NEW.due_date || ' 09:00:00')::TIMESTAMPTZ, 
            '{inapp}'
        );
        
        -- Schedule reminder for 1 day before (at 9:00 AM)
        INSERT INTO reminder_jobs (user_id, charge_id, send_at, channels)
        VALUES (
            NEW.user_id,
            NEW.id,
            (NEW.due_date || ' 09:00:00')::TIMESTAMPTZ - INTERVAL '1 day',
            '{inapp}'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_charge_upsert_reminders ON charges;
CREATE TRIGGER on_charge_upsert_reminders
AFTER INSERT OR UPDATE ON charges
FOR EACH ROW
EXECUTE FUNCTION schedule_charge_reminders();
