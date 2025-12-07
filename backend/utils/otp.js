const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const prisma = new PrismaClient();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Email
const sendOTPEmail = async (email, code) => {
  try {
    // Always log OTP in development mode for testing
    console.log(`\n╔════════════════════════════════════════════════════╗`);
    console.log(`║   EMAIL OTP REQUEST                               ║`);
    console.log(`╠════════════════════════════════════════════════════╣`);
    console.log(`║   Email: ${email.padEnd(40)} ║`);
    console.log(`║   OTP Code: ${code.padEnd(37)} ║`);
    console.log(`║   Expires in: 10 minutes${' '.padEnd(24)} ║`);
    console.log(`╚════════════════════════════════════════════════════╝\n`);

    // Check if SMTP is configured
    console.log('📧 Checking SMTP configuration...');
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST ? '✅ Set' : '❌ Not set'}`);
    console.log(`   SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set (hidden)' : '❌ Not set'}`);
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '587 (default)'}`);
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  SMTP not fully configured. Email OTP will not be sent via email.');
      console.warn('   Check backend console above for OTP code');
      // In development, return true so registration can proceed
      if (process.env.NODE_ENV === 'development') {
        console.log('   ✅ Continuing in development mode (OTP logged above)');
        return true;
      }
      return false;
    }
    
    console.log('✅ SMTP configuration found, attempting to send email...');

    // Create transporter with better error handling
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    // Verify connection (optional - don't fail if verification fails, just warn)
    try {
      console.log('🔍 Verifying SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.warn('⚠️  SMTP verification failed:', verifyError.message);
      console.warn('   Attempting to send email anyway...');
      // Don't throw - try to send anyway as some servers don't support verify
    }

    // Send email
    const mailOptions = {
      from: `"SellIt" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your OTP Code - SellIt',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SellIt Verification</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin-top: 0;">Your OTP Code</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6;">Please use the following code to verify your account:</p>
                      <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                        <h1 style="color: #667eea; font-size: 48px; letter-spacing: 8px; margin: 0; font-weight: bold;">${code}</h1>
                      </div>
                      <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                        <strong>This code will expire in 10 minutes.</strong><br>
                        If you didn't request this code, please ignore this email.
                      </p>
                      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <p style="color: #999999; font-size: 12px; margin: 0;">This is an automated email, please do not reply.</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Your SellIt OTP Code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
    };

    console.log(`📤 Sending email to ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email OTP sent successfully!`);
    console.log(`   To: ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response || 'Success'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Email OTP sending failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Command: ${error.command || 'N/A'}`);
    
    // Log full error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('   Full error details:', error);
    }
    
    // In development, still return true and log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log('   ✅ Continuing in development mode (OTP logged above)');
      console.log('   💡 Check SMTP configuration if you want real emails');
      return true;
    }
    return false;
  }
};

// Send OTP via SMS
const sendOTPSMS = async (phone, code) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('Twilio not configured, skipping SMS');
      // In development, log the OTP instead
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n=== DEVELOPMENT MODE: OTP for ${phone} ===`);
        console.log(`OTP Code: ${code}`);
        console.log(`==========================================\n`);
        return true; // Return true in dev mode so registration can proceed
      }
      return false;
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: `Your SellIt OTP code is: ${code}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    return true;
  } catch (error) {
    console.error('SMS OTP error:', error);
    // In development, still return true and log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=== DEVELOPMENT MODE: OTP for ${phone} ===`);
      console.log(`OTP Code: ${code}`);
      console.log(`==========================================\n`);
      return true;
    }
    return false;
  }
};

// Store OTP in database
const storeOTP = async (email, phone, userId = null) => {
  try {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_IN || '600') * 1000);

    const otp = await prisma.oTP.create({
      data: {
        email,
        phone,
        code,
        expiresAt,
        userId
      }
    });

    return { code, otpId: otp.id };
  } catch (error) {
    console.error('Store OTP error:', error);
    throw error;
  }
};

// Verify OTP
const verifyOTP = async (email, phone, code) => {
  // Trim and validate code
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'OTP code is required' };
  }
  const trimmedCode = code.trim();

  // Build OR conditions - only include non-null values
  const orConditions = [];
  if (email) {
    orConditions.push({ email, code: trimmedCode });
  }
  if (phone) {
    orConditions.push({ phone, code: trimmedCode });
  }

  if (orConditions.length === 0) {
    return { valid: false, message: 'Email or phone is required' };
  }

  // Find OTP - check for unused and not expired
  const otp = await prisma.oTP.findFirst({
    where: {
      OR: orConditions,
      used: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!otp) {
    // Log for debugging
    console.log('OTP verification failed:', {
      email: email ? `${email.substring(0, 3)}***` : null,
      phone: phone ? `${phone.substring(0, 3)}***` : null,
      codeLength: trimmedCode.length,
      hasEmail: !!email,
      hasPhone: !!phone
    });
    
    // Check if OTP exists but is used or expired
    const expiredOrUsed = await prisma.oTP.findFirst({
      where: {
        OR: orConditions
      },
      orderBy: { createdAt: 'desc' }
    });

    if (expiredOrUsed) {
      if (expiredOrUsed.used) {
        return { valid: false, message: 'OTP has already been used' };
      }
      if (expiredOrUsed.expiresAt <= new Date()) {
        return { valid: false, message: 'OTP has expired. Please request a new one.' };
      }
    }

    return { valid: false, message: 'Invalid OTP code' };
  }

  // Mark OTP as used
  await prisma.oTP.update({
    where: { id: otp.id },
    data: { used: true }
  });

  console.log('✅ OTP verified successfully');
  return { valid: true, otp };
};

// Send and store OTP
const sendOTP = async (email, phone, userId = null) => {
  // Validate that at least email or phone is provided
  if (!email && !phone) {
    return { success: false, message: 'Email or phone is required to send OTP' };
  }

  const { code, otpId } = await storeOTP(email, phone, userId);

  let sent = false;
  let errorMessage = '';
  
  if (email) {
    const emailSent = await sendOTPEmail(email, code);
    if (emailSent) {
      sent = true;
    } else {
      errorMessage = 'Failed to send email OTP';
    }
  }
  
  if (phone && !sent) {
    const smsSent = await sendOTPSMS(phone, code);
    if (smsSent) {
      sent = true;
    } else {
      errorMessage = errorMessage ? 'Failed to send email and SMS OTP' : 'Failed to send SMS OTP';
    }
  }

  if (!sent) {
    // Delete OTP if sending failed
    try {
      await prisma.oTP.delete({ where: { id: otpId } });
    } catch (err) {
      console.error('Error deleting OTP:', err);
    }
    return { success: false, message: errorMessage || 'Failed to send OTP. Please check your email/SMS configuration.' };
  }

  return { success: true, message: 'OTP sent successfully' };
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  sendOTPEmail,
  sendOTPSMS
};

