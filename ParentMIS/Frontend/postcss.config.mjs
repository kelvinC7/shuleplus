import postcssCascadeLayers from '@csstools/postcss-cascade-layers';

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    '@csstools/postcss-cascade-layers': postcssCascadeLayers(),
  },
};

export default config;
