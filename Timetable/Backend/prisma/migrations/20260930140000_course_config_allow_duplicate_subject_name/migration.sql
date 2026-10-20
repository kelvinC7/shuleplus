-- Allow multiple course configs with the same subject name (unique by course_code per org).
DROP INDEX IF EXISTS "timetable_course_config_organization_id_subject_name_key";
