import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import InputBase from '@mui/material/InputBase';
import CircularProgress from '@mui/material/CircularProgress';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CloseIcon from '@mui/icons-material/Close';
import api from '../services/api';
import { brand } from '../theme/theme';

const SUGGESTIONS = [
  'Plan a Senior 3 Mathematics lesson',
  'Summarise this term’s learning gaps',
  'Draft a parent message about attendance',
  'Write a quiz on factorisation',
];

const dotSx = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  bgcolor: brand.navy,
  animation: 'typingBounce 1s infinite ease-in-out',
  '@keyframes typingBounce': {
    '0%, 80%, 100%': { opacity: 0.35, transform: 'translateY(0)' },
    '40%': { opacity: 1, transform: 'translateY(-3px)' },
  },
};

export default function TichaAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/tools/ticha-ai/history');
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch {
      /* history is optional */
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const send = async (text) => {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;

    const userMessage = { role: 'user', content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/tools/ticha-ai/assist', { prompt });
      if (res.data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
        fetchHistory();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not reach the assistant. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    void send();
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setShowHistory(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100%', flexDirection: 'column', bgcolor: '#F4F5F8', pb: 14 }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: brand.navy,
          color: '#fff',
          px: 2.5,
          py: 1.75,
          '&::after': {
            content: '""',
            position: 'absolute',
            right: -60,
            top: -70,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,166,35,0.2), transparent 65%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              sx={{ width: 38, height: 38, bgcolor: brand.primary, color: brand.navy, fontWeight: 800, fontSize: 15 }}
            >
              AI
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ display: 'block', fontSize: 10, color: '#9FB0D3', fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}
              >
                Assistant engine
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Ticha AI</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => setShowHistory((v) => !v)}
              aria-label="History"
              sx={{ color: brand.primary, bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
            >
              <HistoryIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={resetChat}
              aria-label="New chat"
              sx={{ color: brand.primary, bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {showHistory ? (
        <Box sx={{ px: 2, pt: 1.5 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderColor: brand.border }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: brand.muted }}>
                Previous inquiries
              </Typography>
              <IconButton size="small" onClick={() => setShowHistory(false)} aria-label="Close history" sx={{ color: brand.muted }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Box sx={{ maxHeight: 256, overflowY: 'auto' }}>
              {history.length === 0 ? (
                <Typography sx={{ py: 3, textAlign: 'center', fontSize: 12, color: brand.muted }}>
                  No history yet.
                </Typography>
              ) : (
                history.map((item) => (
                  <ButtonBase
                    key={item.id}
                    onClick={() => {
                      setInput(item.prompt);
                      setShowHistory(false);
                    }}
                    sx={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: 1.25,
                      py: 1,
                      px: 1,
                      borderRadius: 1.5,
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      borderTop: '1px solid',
                      borderColor: brand.border,
                      '&:first-of-type': { borderTop: 'none' },
                      '&:hover': { bgcolor: 'rgba(19,33,61,0.03)' },
                    }}
                  >
                    <Avatar sx={{ width: 30, height: 30, bgcolor: 'rgba(19,33,61,0.08)', color: brand.navy, fontWeight: 800, fontSize: 11 }}>
                      AI
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: brand.navy }}>
                        {item.prompt}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: brand.muted }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </ButtonBase>
                ))
              )}
            </Box>
          </Paper>
        </Box>
      ) : null}

      <Box sx={{ flex: 1, px: { xs: 2, sm: 3 }, py: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {messages.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" spacing={1.25} sx={{ flex: 1, py: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: brand.primary,
                background: `radial-gradient(circle at 30% 30%, ${brand.navy2}, ${brand.navy})`,
                boxShadow: '0 10px 30px rgba(19,33,61,0.25)',
              }}
            >
              <AutoAwesomeIcon />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 600, color: brand.navy }}>
              Muraho! How can I help?
            </Typography>
            <Typography sx={{ fontSize: 12, color: brand.muted }}>
              Guidance · Curriculum · Planning
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} justifyContent="center" sx={{ mt: 1, maxWidth: 560 }}>
              {SUGGESTIONS.map((text) => (
                <ButtonBase
                  key={text}
                  onClick={() => setInput(text)}
                  sx={{
                    px: 1.5,
                    py: 0.85,
                    borderRadius: 999,
                    border: '1px solid',
                    borderColor: brand.border,
                    bgcolor: '#fff',
                    fontSize: 12,
                    color: brand.navy,
                    '&:hover': { borderColor: brand.primary, bgcolor: 'rgba(245,166,35,0.06)' },
                  }}
                >
                  {text}
                </ButtonBase>
              ))}
            </Stack>
          </Stack>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <Box
                key={i}
                sx={{
                  maxWidth: { xs: '88%', sm: 560 },
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  px: 1.75,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: isUser ? brand.navy : '#fff',
                  color: isUser ? '#fff' : brand.text,
                  border: isUser ? 'none' : '1px solid',
                  borderColor: brand.border,
                }}
              >
                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.5, opacity: 0.7 }}>
                  {isUser ? <PersonOutlineIcon sx={{ fontSize: 12 }} /> : <SmartToyOutlinedIcon sx={{ fontSize: 12 }} />}
                  <Typography sx={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isUser ? 'You' : 'Ticha AI'}
                  </Typography>
                </Stack>
                <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.55 }}>
                  {msg.content}
                </Typography>
              </Box>
            );
          })
        )}

        {loading ? (
          <Box
            sx={{
              alignSelf: 'flex-start',
              px: 1.75,
              py: 1.5,
              bgcolor: '#fff',
              border: '1px solid',
              borderColor: brand.border,
              borderRadius: 2,
            }}
          >
            <Stack direction="row" spacing={0.75}>
              <Box sx={dotSx} />
              <Box sx={{ ...dotSx, animationDelay: '0.2s' }} />
              <Box sx={{ ...dotSx, animationDelay: '0.4s' }} />
            </Stack>
          </Box>
        ) : null}
        <Box ref={messagesEndRef} />
      </Box>

      <Box
        sx={{
          position: 'sticky',
          bottom: { xs: 'calc(84px + env(safe-area-inset-bottom))', lg: 0 },
          zIndex: 30,
          px: 2,
          pb: 1,
        }}
      >
        <Paper
          component="form"
          onSubmit={handleSend}
          variant="outlined"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mx: 'auto',
            maxWidth: 768,
            p: 0.75,
            pl: 2,
            borderRadius: 999,
            borderColor: brand.border,
          }}
        >
          <InputBase
            placeholder="Ask Ticha AI anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            aria-label="Message Ticha AI"
            sx={{ flex: 1, fontSize: 13.5 }}
          />
          <IconButton
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            sx={{
              width: 40,
              height: 40,
              bgcolor: brand.navy,
              color: brand.primary,
              '&:hover': { bgcolor: brand.navy2 },
              '&.Mui-disabled': { bgcolor: 'rgba(19,33,61,0.12)', color: 'rgba(19,33,61,0.35)' },
            }}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
          </IconButton>
        </Paper>
        <Typography
          sx={{
            mt: 0.75,
            textAlign: 'center',
            fontSize: 9,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'rgba(107,115,133,0.6)',
          }}
        >
          Intelligent support by Babyeyi AI
        </Typography>
      </Box>
    </Box>
  );
}
