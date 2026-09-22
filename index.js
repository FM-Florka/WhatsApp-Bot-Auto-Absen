require('./src/bot').start().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
