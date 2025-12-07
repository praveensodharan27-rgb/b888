const express = require('express');
const { sendOTPEmail } = require('../utils/otp');

const router = express.Router();

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const testCode = '123456';
    console.log('\n🧪 TEST EMAIL REQUEST');
    console.log(`   Email: ${email}`);
    console.log(`   Test Code: ${testCode}\n`);

    const result = await sendOTPEmail(email, testCode);

    if (result) {
      res.json({
        success: true,
        message: 'Test email sent successfully (or logged in dev mode)',
        email,
        code: testCode
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email. Check SMTP configuration and backend console for details.'
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test email'
    });
  }
});

module.exports = router;

