const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'wenkaiong123@gmail.com',         // Your Gmail
    pass: 'mfns smzt tohr nkpc'              // App Password or Gmail password
  }
});

app.post('/send-application', (req, res) => {
  const { userEmail, userIncome, cardName } = req.body;

  const mailOptions = {
    from: 'wenkaiong123@gmail.com',
    to: 'wenkaiong123@gmail.com',       // Admin email to receive application
    subject: 'New Credit Card Application',
    html: `
      <h3>New Application</h3>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Monthly Income:</strong> RM${userIncome}</p>
      <p><strong>Card Applied:</strong> ${cardName}</p>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('SendMail Error:', error);
      return res.status(500).send('Email failed to send.');
    }
    res.status(200).send('Email sent successfully.');
  });
});

app.listen(5050, () => {
  console.log('✅ Server running on http://localhost:5050');
});
