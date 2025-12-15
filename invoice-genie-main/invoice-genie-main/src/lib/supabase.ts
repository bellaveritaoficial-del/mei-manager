import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = 'https://pqipilniwskdmqshreht.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaXBpbG5pd3NrZG1xc2hyZWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDAzMDEsImV4cCI6MjA4MTM3NjMwMX0.tptfNgkD07UxODiwX6GnMQUAkTQFlk6l7D06fMWZlds';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
