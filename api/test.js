export default function handler(req, res) {
  res.json({
    status: 'ok',
    message: 'Test API works!',
    timestamp: new Date().toISOString()
  });
}