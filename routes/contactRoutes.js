// /Users/joshuajeyaranjan/Desktop/photography2025/photography2025Server/routes/contactRoutes.js
const express = require('express');
const router = express.Router();

// POST /api/contact - Endpoint for contact form submissions
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  const transporter = req.transporter; // Access transporter from req

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields (name, email, message) are required.' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    if (!transporter) {
      console.error('Nodemailer transporter not available. Cannot send email.');
      return res.status(200).json({ message: 'Form submitted (email sending disabled server-side).' });
    }

    const mailOptions = {
      from: `"${name}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      text: `You have a new contact form submission:\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`,
      html: `<p>You have a new contact form submission:</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Email:</strong> ${email}</li></ul><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Contact email sent successfully.');
    res.status(200).json({ message: 'Message sent successfully! Thank you for reaching out.' });
  } catch (error) {
    console.error('Error processing contact form or sending email:', error);
    res.status(500).json({ error: 'Server error while processing your request. Please try again later.' });
  }
});

module.exports = router;
