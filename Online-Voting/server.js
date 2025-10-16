const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/online-voting';

// Mongo models
const voterSchema = new mongoose.Schema({
  voterId: String,
  phone: String,
  otp: String,
  otpVerified: Boolean,
  irisHash: String, // simulated iris data hash
  hasVoted: Boolean,
  votedParty: String,
});

const Voter = mongoose.model('Voter', voterSchema);

// Simulated iris dataset (just strings for demo)
const irisDataset = [
  "iris_sample_01",
  "iris_sample_02",
  "iris_sample_03",
  "iris_sample_04",
  "iris_sample_05",
  "iris_sample_06",
  "iris_sample_07",
  "iris_sample_08",
  "iris_sample_09",
  "iris_sample_10",
];

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Helper to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Routes

// Step 1: Register voter or check if exists, then send OTP
app.post('/api/send-otp', async (req, res) => {
  const { voterId, phone } = req.body;
  if (!voterId || !phone) return res.status(400).json({ error: 'Voter ID and phone required' });

  let voter = await Voter.findOne({ voterId, phone });
  if (!voter) {
    // Create new voter
    voter = new Voter({
      voterId,
      phone,
      otp: '',
      otpVerified: false,
      irisHash: '',
      hasVoted: false,
      votedParty: '',
    });
  }

  // Generate OTP and store it
  const otp = generateOTP();
  voter.otp = otp;
  voter.otpVerified = false;
  await voter.save();

  // Simulate sending SMS OTP
  console.log(`Sending OTP ${otp} to phone ${phone}`);

  res.json({ message: 'OTP sent' });
});

// Step 2: Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { voterId, phone, otp } = req.body;
  if (!voterId || !phone || !otp) return res.status(400).json({ error: 'Missing data' });

  const voter = await Voter.findOne({ voterId, phone });
  if (!voter) return res.status(404).json({ error: 'Voter not found' });

  if (voter.otp === otp) {
    voter.otpVerified = true;
    await voter.save();
    res.json({ message: 'OTP verified' });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
});

// Step 3: Iris verification (simulate by checking input hash in dataset)
app.post('/api/verify-iris', async (req, res) => {
  const { voterId, phone, irisHash } = req.body;
  if (!voterId || !phone || !irisHash) return res.status(400).json({ error: 'Missing data' });

  const voter = await Voter.findOne({ voterId, phone });
  if (!voter) return res.status(404).json({ error: 'Voter not found' });

  if (!voter.otpVerified) {
    return res.status(400).json({ error: 'OTP not verified' });
  }

  // For demo: Check if irisHash is one of sample irisDataset strings
  if (irisDataset.includes(irisHash)) {
    voter.irisHash = irisHash;
    await voter.save();
    res.json({ message: 'Iris verified' });
  } else {
    res.status(400).json({ error: 'Iris verification failed' });
  }
});

// Step 4: Cast vote
app.post('/api/vote', async (req, res) => {
  const { voterId, phone, party } = req.body;
  if (!voterId || !phone || !party) return res.status(400).json({ error: 'Missing data' });

  const voter = await Voter.findOne({ voterId, phone });
  if (!voter) return res.status(404).json({ error: 'Voter not found' });

  if (!voter.otpVerified || !voter.irisHash) {
    return res.status(400).json({ error: 'Authentication incomplete' });
  }

  if (voter.hasVoted) {
    return res.status(400).json({ error: 'Already voted' });
  }

  // Save vote
  voter.hasVoted = true;
  voter.votedParty = party;
  await voter.save();

  // Simulate sending SMS vote confirmation
  console.log(`Vote confirmation sent to ${voter.phone} for party ${party}`);

  res.json({ message: 'Vote successfully recorded' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
