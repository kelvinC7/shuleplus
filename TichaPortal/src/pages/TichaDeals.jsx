import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { kaziGetDeals, KAZI_DIRECT_URL } from '../services/kaziApi';
import { Page, PageHeader, PageLoading, EmptyState, ErrorBanner } from '../components/ui';
import { brand } from '../theme/theme';

const UPLOADS_BASE = KAZI_DIRECT_URL;

function toAssetUrl(pathLike) {
  if (!pathLike || typeof pathLike !== 'string') return null;
  if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike;
  const clean = pathLike.replace(/\\/g, '/');
  return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString()} RWF`;
}

export default function TichaDeals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealProducts, setDealProducts] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const products = await kaziGetDeals();
      setDealProducts(Array.isArray(products) ? products : []);
    } catch {
      setError('Could not load deals catalog. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    void loadData();
  }, [loadData]);

  const featuredProduct = dealProducts[0] || null;
  const popularDeals = dealProducts.slice(1);

  return (
    <Page maxWidth={1000}>
      <PageHeader
        title="Ticha Deals"
        description="Exclusive products — pay monthly from your payroll."
        actions={
          <Button
            variant="outlined"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/ticha-deals/tracking')}
            sx={{ borderColor: brand.border, fontWeight: 600 }}
          >
            Track requests
          </Button>
        }
      />

      {loading ? (
        <PageLoading label="Loading catalog…" />
      ) : (
        <Stack spacing={2}>
          {error ? <ErrorBanner message={error} onRetry={() => void loadData()} /> : null}

          {featuredProduct ? (
            <Paper
              variant="outlined"
              onClick={() => navigate(`/ticha-deals/${featuredProduct.id}`)}
              sx={{
                overflow: 'hidden',
                borderColor: brand.border,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                '&:hover': { borderColor: 'rgba(19,33,61,0.2)' },
              }}
            >
              <Box
                sx={{
                  width: { xs: '100%', sm: 200 },
                  height: { xs: 160, sm: 200 },
                  bgcolor: 'rgba(19,33,61,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <Chip
                  size="small"
                  icon={<StarOutlineIcon sx={{ fontSize: '14px !important' }} />}
                  label="Featured"
                  sx={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    bgcolor: brand.primary,
                    color: brand.navy,
                    fontWeight: 700,
                    height: 24,
                  }}
                />
                {featuredProduct.image_url ? (
                  <Box
                    component="img"
                    src={toAssetUrl(featuredProduct.image_url)}
                    alt={featuredProduct.name}
                    sx={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
                  />
                ) : (
                  <Inventory2OutlinedIcon sx={{ fontSize: 40, color: brand.muted }} />
                )}
              </Box>
              <Box sx={{ p: 2, flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: 16 }}>{featuredProduct.name}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 13, color: brand.muted, lineHeight: 1.5 }}>
                  {featuredProduct.description || 'Payroll-friendly purchase.'}
                </Typography>
                <Typography sx={{ mt: 1.5, fontWeight: 700, color: brand.navy, fontSize: 18 }}>
                  {formatMoney(featuredProduct.price ?? featuredProduct.amount)}
                </Typography>
              </Box>
            </Paper>
          ) : null}

          {!dealProducts.length ? (
            <EmptyState title="No deals available" description="Check back later for new offers." />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              }}
            >
              {(featuredProduct ? popularDeals : dealProducts).map((product) => (
                <Paper
                  key={product.id}
                  variant="outlined"
                  onClick={() => navigate(`/ticha-deals/${product.id}`)}
                  sx={{
                    overflow: 'hidden',
                    borderColor: brand.border,
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'rgba(19,33,61,0.2)' },
                  }}
                >
                  <Box
                    sx={{
                      height: 140,
                      bgcolor: 'rgba(19,33,61,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {product.image_url ? (
                      <Box
                        component="img"
                        src={toAssetUrl(product.image_url)}
                        alt={product.name}
                        sx={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain' }}
                      />
                    ) : (
                      <Inventory2OutlinedIcon sx={{ fontSize: 36, color: brand.muted }} />
                    )}
                  </Box>
                  <Box sx={{ p: 1.5 }}>
                    <Typography noWrap sx={{ fontWeight: 600, color: brand.navy, fontSize: 14 }}>
                      {product.name}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.navy, fontSize: 15 }}>
                      {formatMoney(product.price ?? product.amount)}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Stack>
      )}
    </Page>
  );
}
