import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { joinItems } from '../../utils/lessonPlanTextUtils';

function RefBlock({ title, items }) {
  if (!items?.length) return null;
  return (
    <Box sx={{ pt: 2, '&:first-of-type': { pt: 0 } }}>
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>{title}</Typography>
      <Stack spacing={0.5} sx={{ mt: 0.75, fontSize: 14, lineHeight: 1.65, color: '#1E293B' }}>
        {items.map((item) => (
          <Typography key={item.slice(0, 80)} sx={{ fontSize: 14, lineHeight: 1.65 }}>{item}</Typography>
        ))}
      </Stack>
    </Box>
  );
}

function ParagraphList({ items, limit }) {
  return (
    <Stack spacing={0.5} sx={{ mt: 0.75, fontSize: 14, lineHeight: 1.65, color: '#1E293B' }}>
      {items.slice(0, limit).map((a) => (
        <Typography key={a.slice(0, 60)} sx={{ fontSize: 14, lineHeight: 1.65 }}>{a}</Typography>
      ))}
    </Stack>
  );
}

export default function LessonPlanCurriculumSection({ intelligence, objectives, onApplyMaterials }) {
  if (!intelligence) return null;

  const {
    tools = [],
    requirements = [],
    materials = [],
    pupilActivities = [],
    pupilExercises = [],
    intelligenceNotes = [],
    keyUnitCompetence,
    officialObjectives = [],
    hasPupilsBook,
  } = intelligence;

  const objList =
    officialObjectives.length
      ? officialObjectives
      : objectives?.map((o) => o?.statement || o?.value).filter(Boolean) || [];

  const hasContent =
    tools.length ||
    requirements.length ||
    materials.length ||
    pupilActivities.length ||
    pupilExercises.length ||
    objList.length ||
    keyUnitCompetence;

  if (!hasContent) return null;

  return (
    <Box component="section" sx={{ borderTop: '1px solid #E2E8F0', pt: 3 }}>
      <Stack direction="row" flexWrap="wrap" alignItems="baseline" justifyContent="space-between" gap={1}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Curriculum reference</Typography>
        <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
          {hasPupilsBook ? "TG + pupil's book" : "Teacher's guide"}
        </Typography>
      </Stack>

      <RefBlock title="Objectives" items={objList} />
      <RefBlock title="Tools & equipment" items={tools} />
      <RefBlock title="Requirements" items={requirements} />
      <RefBlock title="Materials" items={materials} />

      {pupilActivities.length > 0 || pupilExercises.length > 0 ? (
        <Box sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>Pupil book</Typography>
          {pupilActivities.length > 0 ? <ParagraphList items={pupilActivities} limit={6} /> : null}
          {pupilExercises.length > 0 ? (
            <Box sx={{ mt: 1.5 }}>
              <ParagraphList items={pupilExercises} limit={4} />
            </Box>
          ) : null}
        </Box>
      ) : null}

      {keyUnitCompetence ? (
        <Typography sx={{ pt: 2, fontSize: 14, lineHeight: 1.65, color: '#1E293B' }}>
          <Box component="span" sx={{ color: '#64748B' }}>Key unit competence. </Box>
          {keyUnitCompetence}
        </Typography>
      ) : null}

      {intelligenceNotes?.length ? (
        <Stack spacing={0.5} sx={{ mt: 1.5, fontSize: 14, color: '#475569' }}>
          {intelligenceNotes.map((n) => (
            <Typography key={n.slice(0, 50)} sx={{ fontSize: 14 }}>{n}</Typography>
          ))}
        </Stack>
      ) : null}

      {materials.length > 0 && onApplyMaterials ? (
        <Button
          type="button"
          onClick={() => onApplyMaterials(joinItems(materials))}
          sx={{ mt: 2, p: 0, minWidth: 0, fontSize: 14, fontWeight: 500, color: '#0F172A', textTransform: 'none', textDecoration: 'underline', textUnderlineOffset: 2, '&:hover': { bgcolor: 'transparent', color: '#475569' } }}
        >
          Use materials in preparation
        </Button>
      ) : null}
    </Box>
  );
}

/** Preview removed - fields below are the source of truth. */
export function ActivityBullets() {
  return null;
}
