require('./src/lib/env');
const app = require('./src/app');
const port = process.env.PORT || 4000;
app.listen(port, ()=> console.log(`TichaPortal backend running on ${port}`));
