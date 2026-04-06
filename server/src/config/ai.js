const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || 'dummy_key');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

module.exports = { model };
