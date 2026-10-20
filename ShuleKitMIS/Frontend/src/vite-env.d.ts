/// <reference types="vite/client" />

declare module '@mui/icons-material/*' {
  import { SvgIconProps } from '@mui/material';
  const Icon: React.ComponentType<SvgIconProps>;
  export default Icon;
}
