-- Creates one PostgreSQL database per ShulePlus module (idempotent).
-- Mounted into docker-entrypoint-initdb.d on first Postgres container start.

SELECT 'CREATE DATABASE academic_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'academic_module_db')\gexec
SELECT 'CREATE DATABASE action_plan_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'action_plan_module_db')\gexec
SELECT 'CREATE DATABASE assets_portal_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'assets_portal_module_db')\gexec
SELECT 'CREATE DATABASE attendance_rfid_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'attendance_rfid_db')\gexec
SELECT 'CREATE DATABASE babyeyi_wizard_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'babyeyi_wizard_db')\gexec
SELECT 'CREATE DATABASE cafeteria_mis_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cafeteria_mis_db')\gexec
SELECT 'CREATE DATABASE canteen_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'canteen_module_db')\gexec
SELECT 'CREATE DATABASE mini_website_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mini_website_db')\gexec
SELECT 'CREATE DATABASE hr_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hr_module_db')\gexec
SELECT 'CREATE DATABASE inventory_mis_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventory_mis_db')\gexec
SELECT 'CREATE DATABASE kazi_avance_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kazi_avance_db')\gexec
SELECT 'CREATE DATABASE payroll_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'payroll_module_db')\gexec
SELECT 'CREATE DATABASE sample_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sample_module_db')\gexec
SELECT 'CREATE DATABASE school_budget_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'school_budget_db')\gexec
SELECT 'CREATE DATABASE school_fees_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'school_fees_db')\gexec
SELECT 'CREATE DATABASE shulekit_mis_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shulekit_mis_db')\gexec
SELECT 'CREATE DATABASE student_management_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'student_management_db')\gexec
SELECT 'CREATE DATABASE shuleplus_nesa'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shuleplus_nesa')\gexec
SELECT 'CREATE DATABASE shuleplus_notifications'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shuleplus_notifications')\gexec
SELECT 'CREATE DATABASE shuleplus_task_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shuleplus_task_module_db')\gexec
SELECT 'CREATE DATABASE teacher_portal_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'teacher_portal_db')\gexec
SELECT 'CREATE DATABASE print_card_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'print_card_module_db')\gexec
SELECT 'CREATE DATABASE timetable_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'timetable_db')\gexec
SELECT 'CREATE DATABASE library_module_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'library_module_db')\gexec
