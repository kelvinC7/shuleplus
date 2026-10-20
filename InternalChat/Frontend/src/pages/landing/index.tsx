import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/layouts/public-layout';
import {
  ACCENT,
  PRIMARY,
  PRIMARY_DARK,
} from '@/shared/styles';
import ForumIcon from '@mui/icons-material/Forum';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupsIcon from '@mui/icons-material/Groups';
import { ArrowRightAlt } from '@mui/icons-material';

export default function LandingPage() {
  return (
    <PublicLayout>
      <Box
        sx={{
          maxWidth: 1080,
          mx: 'auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)', // Adjust based on your layout
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {/* Main Title - Balanced and impactful */}
        <Typography
          variant="h2"
          component="div"
          sx={{
            fontWeight: 900,
            lineHeight: 1.05,
            color: PRIMARY,
            fontFamily: "'Caveat', 'Kalam', 'Patrick Hand', cursive",
            letterSpacing: '-0.03em',
            fontSize: { xs: '2.5rem' },
            mb: 1,
          }}
        >
          Connect, collaborate,
          <br />
          <Box 
            component="span" 
            sx={{ 
              position: 'relative', 
              display: 'inline-block',
              color: ACCENT,
            }}
          >
            and communicate
            <Box
              component="svg"
              viewBox="0 0 120 10"
              sx={{ 
                position: 'absolute', 
                left: 0, 
                bottom: -4, 
                width: '100%', 
                height: 8,
                transform: 'scaleX(1.1)',
              }}
              preserveAspectRatio="none"
            >
              <path 
                d="M2 6 Q30 1 60 6 Q90 11 118 5" 
                stroke={ACCENT} 
                strokeWidth="3" 
                fill="none" 
                strokeLinecap="round"
                opacity={0.9}
              />
            </Box>
          </Box>
        </Typography>

       

        {/* Image - Properly sized and spaced */}
        <Box
          component="img"
          src="/decorator.png"
          alt="School communication illustration"
          sx={{
            height: { xs: '200px', sm: '280px', md: '350px' },
            width: 'auto',
            maxWidth: '90%',
            objectFit: 'contain',
            mb: 3,
          }}
        />

        {/* CTA Button - Well proportioned */}
        <Button
          component={Link}
          to="/chat"
          variant="contained"
          sx={{
            px: { xs: 4, sm: 6, md: 8 },
            py: { xs: 1.5 },
            bgcolor: PRIMARY,
            color: '#fff',
            fontWeight: 700,
            fontSize: { xs: '1rem' },
            borderRadius: '50px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            textTransform: 'none',
            position:'relative',
            top:-70,
            '&:hover': { 
              bgcolor: PRIMARY_DARK,
              transform: 'translateY(-2px)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
            },
          }}
        >
          Start Communicating 
          <ArrowRightAlt sx={{ fontSize: { xs: '1.2rem', md: '1.4rem' } }} />
        </Button>

        {/* Optional decorative elements */}
        <Box
          sx={{
            mt: -4,
            display: 'flex',
            gap: { xs: 2, sm: 3 },
            justifyContent: 'center',
            flexWrap: 'wrap',
            opacity: 0.6,
          }}
        >
          {[
            { icon: <ForumIcon fontSize="small" />, label: 'Real-time chat' },
            { icon: <GroupsIcon fontSize="small" />, label: 'Staff collaboration' },
            { icon: <CampaignIcon fontSize="small" />, label: 'Announcements' },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'rgba(0,0,0,0.5)',
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                fontWeight: 500,
              }}
            >
              {item.icon}
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </PublicLayout>
  );
}

