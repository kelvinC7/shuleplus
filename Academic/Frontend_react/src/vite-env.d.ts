/// <reference types="vite/client" />

import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipToast?: boolean;
    toastSuccess?: string;
    toastError?: string;
  }
}

declare module '@mui/icons-material/*' {
  import { SvgIconProps } from '@mui/material';
  const Icon: React.ComponentType<SvgIconProps>;
  export default Icon;
}
