import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[canteen-service] listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
});
