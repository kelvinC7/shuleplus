import { Box, Button, Chip, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { formatYearDisplay, NAVY, GOLD } from '../utils';

interface PromotionPageHeaderProps {
  fromYear: string;
  toYear: string;
  onStartPromotion: () => void;
  startDisabled?: boolean;
  canReview?: boolean;
  onReview?: () => void;
  selectedCount?: number;
}

export function PromotionPageHeader({
  fromYear,
  toYear,
  onStartPromotion,
  startDisabled,
  canReview,
  onReview,
  selectedCount = 0,
}: PromotionPageHeaderProps) {
  return (
    <Box
      sx={{
        mb: 3,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2.5,
        border: '1px solid rgba(0,4,53,0.08)',
        bgcolor: 'white',
        boxShadow: '0 1px 3px rgba(0,4,53,0.04)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { lg: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 2.5, lg: 3 },
        }}
      >
        {/* Title block */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: NAVY,
                color: GOLD,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,4,53,0.15)',
              }}
            >
              <TrendingUpOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box component="h1" sx={{ m: 0, fontSize: '1.375rem', fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>
                Student Promotion
              </Box>
              <Box
                component="p"
                sx={{
                  m: 0,
                  mt: 0.75,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                  lineHeight: 1.55,
                  maxWidth: 520,
                }}
              >
                Promote students to a new academic year and assign them to their next class while keeping their academic
                history.
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Actions panel */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1.5,
            flexShrink: 0,
            p: { xs: 1.5, sm: 1.75 },
            borderRadius: 2,
            bgcolor: 'rgba(0,4,53,0.02)',
            border: '1px solid rgba(0,4,53,0.06)',
          }}
        >
          {/* Year transition */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: { sm: 200 } }}>
            <Typography
              sx={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Academic Year
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={formatYearDisplay(fromYear)}
                size="small"
                sx={{
                  height: 28,
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  bgcolor: 'white',
                  color: NAVY,
                  border: '1px solid rgba(0,4,53,0.1)',
                  '& .MuiChip-label': { px: 1.25 },
                }}
              />
              <ArrowForwardIcon sx={{ fontSize: 16, color: GOLD, flexShrink: 0 }} />
              <Chip
                label={formatYearDisplay(toYear)}
                size="small"
                sx={{
                  height: 28,
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  bgcolor: 'rgba(252,176,56,0.15)',
                  color: NAVY,
                  border: '1px solid rgba(252,176,56,0.35)',
                  '& .MuiChip-label': { px: 1.25 },
                }}
              />
            </Box>
          </Box>

          {/* Divider */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'block' },
              width: '1px',
              alignSelf: 'stretch',
              bgcolor: 'rgba(0,4,53,0.08)',
              mx: 0.5,
            }}
          />

          {/* Buttons */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'stretch',
              gap: 1,
              flex: 1,
            }}
          >
            <Button
              variant="contained"
              startIcon={<PlayArrowOutlinedIcon />}
              onClick={onStartPromotion}
              disabled={startDisabled}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                bgcolor: NAVY,
                px: 2.5,
                py: 1,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,4,53,0.2)',
                '&:hover': { bgcolor: '#0a1055', boxShadow: '0 4px 12px rgba(0,4,53,0.25)' },
              }}
            >
              Start Promotion
            </Button>

            {canReview && onReview && (
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={onReview}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  bgcolor: GOLD,
                  color: NAVY,
                  px: 2.5,
                  py: 1,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(252,176,56,0.35)',
                  '&:hover': { bgcolor: '#e09a2a' },
                }}
              >
                Review{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
