import { REB_STAGE_KEYS } from '../utils/timing';

export const REB_PRIMARY_CBC_TEMPLATE_SLUG = 'reb-primary-cbc';

export const rebPrimaryCbcTemplateSchema = {
  sections: [
    'general',
    'preparation',
    'procedure',
    'assessment',
    'homework',
    'reflection',
  ],
  procedureStages: REB_STAGE_KEYS,
  requiredGeneralFields: [
    'schoolName',
    'teacherName',
    'termLabel',
    'lessonDate',
    'subject',
    'grade',
    'unitNumber',
    'lessonNumber',
    'durationMinutes',
    'classSize',
    'language',
    'specialEducationalNeeds',
  ],
};

export type Provenance = 'source' | 'ai_suggestion' | 'teacher' | 'missing';

export interface ProvenanceField<T = string> {
  value: T;
  provenance: Provenance;
  sourcePages?: number[];
  note?: string;
}
