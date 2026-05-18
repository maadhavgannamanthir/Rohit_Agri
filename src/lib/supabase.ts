import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://elvimuuaqlcstupmhkom.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjM0ZmE1MDEyLTA5MDUtNDQwMy05ZThlLWMzMDdhZWJmMTcwNiJ9.eyJwcm9qZWN0SWQiOiJlbHZpbXV1YXFsY3N0dXBtaGtvbSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4OTk5NjA3LCJleHAiOjIwOTQzNTk2MDcsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.IKTt40OciZOSqOMtMsDSKTKdTiSUIM2wQxnLpt6s1s8';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };