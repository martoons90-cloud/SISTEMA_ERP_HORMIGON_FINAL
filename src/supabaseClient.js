import { createClient } from '@supabase/supabase-js'

// Reemplaza estos valores con la URL y la clave "anon" de tu proyecto en Supabase
const supabaseUrl = 'https://tsqldywltshtpvzyrkam.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcWxkeXdsdHNodHB2enlya2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MDc0NzQsImV4cCI6MjA3MjQ4MzQ3NH0.6TSIjrNu4Zr0fwibXcmCz3TkYmrBb5mJ3YI5WXD0Onk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
