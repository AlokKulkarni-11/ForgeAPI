const express = require('express');
const cors = require('cors');
const env = require('./config/env');

const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', api: 'ForgeAPI' });
});

app.use('/api/apis', require('./routes/api.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/runtime/apis', require('./routes/runtime.routes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(env.PORT, () => {
  console.log(`ForgeAPI Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
