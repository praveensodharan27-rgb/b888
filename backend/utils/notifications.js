const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Send Email Notification
const sendEmail = async (to, subject, htmlContent, textContent) => {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  SMTP not configured. Email will not be sent.');
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 [DEV MODE] Email would be sent to: ${to}`);
        console.log(`   Subject: ${subject}`);
        return { success: true, mode: 'development' };
      }
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"SellIt" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [DEV MODE] Email would be sent to: ${to}`);
      return { success: true, mode: 'development' };
    }
    return { success: false, error: error.message };
  }
};

// Format phone number to E.164 format for Twilio
const formatPhoneForTwilio = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If already starts with +, return as is (assuming it's already in E.164)
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // If starts with 0, remove it (common in some countries)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  
  // If doesn't start with country code, assume India (+91) for 10-digit numbers
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  // If 11-12 digits, might already have country code
  if (digits.length >= 11) {
    return `+${digits}`;
  }
  
  // Default: add +91 for Indian numbers
  return `+91${digits}`;
};

// Send SMS Notification
const sendSMS = async (phone, message) => {
  try {
    if (!phone) {
      console.warn('⚠️  No phone number provided for SMS');
      return { success: false, message: 'No phone number provided' };
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('⚠️  Twilio not configured. SMS will not be sent.');
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 [DEV MODE] SMS would be sent to: ${phone}`);
        console.log(`   Message: ${message}`);
        return { success: true, mode: 'development' };
      }
      return { success: false, message: 'Twilio not configured' };
    }

    // Format phone number to E.164 format
    const formattedPhone = formatPhoneForTwilio(phone);
    console.log(`📱 Formatting phone: ${phone} -> ${formattedPhone}`);

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    console.log(`📤 Sending SMS to ${formattedPhone}...`);
    console.log(`   From: ${process.env.TWILIO_PHONE_NUMBER}`);
    console.log(`   Message: ${message.substring(0, 50)}...`);

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log(`✅ SMS sent successfully!`);
    console.log(`   To: ${formattedPhone}`);
    console.log(`   Message SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);
    return { success: true, sid: result.sid, status: result.status };
  } catch (error) {
    console.error('❌ SMS sending failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Phone: ${phone}`);
    if (error.moreInfo) {
      console.error(`   More Info: ${error.moreInfo}`);
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [DEV MODE] SMS would be sent to: ${phone}`);
      console.log(`   Message: ${message}`);
      return { success: true, mode: 'development' };
    }
    return { success: false, error: error.message, code: error.code };
  }
};

// Send Ad Approval Notification (Email + SMS)
const sendAdApprovalNotification = async (user, ad) => {
  const adUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ads/${ad.id}`;
  
  // Email content
  const emailSubject = `🎉 Your Ad "${ad.title}" Has Been Approved!`;
  const emailHtml = `
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
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Ad Approved!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #333333; margin-top: 0;">Great News, ${user.name}!</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                    Your ad <strong>"${ad.title}"</strong> has been approved and is now live on SellIt!
                  </p>
                  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #166534; font-weight: bold;">Your ad is now visible to all users!</p>
                  </div>
                  <div style="margin: 30px 0; text-align: center;">
                    <a href="${adUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Your Ad</a>
                  </div>
                  <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                    Thank you for using SellIt! We wish you the best of luck with your sale.
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
  `;
  const emailText = `Great News, ${user.name}!\n\nYour ad "${ad.title}" has been approved and is now live on SellIt!\n\nView your ad: ${adUrl}\n\nThank you for using SellIt!`;

  // SMS content
  const smsMessage = `🎉 Great news! Your ad "${ad.title}" has been approved and is now live on SellIt! View it: ${adUrl}`;

  // Send both email and SMS
  const results = {
    email: null,
    sms: null
  };

  // Send email if user has email
  if (user.email) {
    results.email = await sendEmail(user.email, emailSubject, emailHtml, emailText);
  }

  // Send SMS if user has phone
  if (user.phone) {
    console.log(`📱 Attempting to send SMS to user phone: ${user.phone}`);
    results.sms = await sendSMS(user.phone, smsMessage);
    if (!results.sms.success) {
      console.error(`❌ Failed to send SMS: ${results.sms.error || results.sms.message}`);
    }
  } else {
    console.log('⚠️  User has no phone number, skipping SMS');
  }

  return results;
};

// Send Offer Update Notification to All Users (Email + SMS + Push)
const sendOfferUpdateNotification = async (offerDetails) => {
  const { PrismaClient } = require('@prisma/client');
  const { sendPushNotificationToAll } = require('./pushNotifications');
  const prisma = new PrismaClient();
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    });

    console.log(`📢 Sending offer update notifications to ${users.length} users...`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const offerUrl = `${frontendUrl}/post-ad`;

    // Build offer message
    let offerMessage = '🎉 New Premium Offers Available!\n\n';
    if (offerDetails.offerPrices) {
      const offers = [];
      if (offerDetails.offerPrices.TOP) {
        const discount = offerDetails.offerPrices.TOP;
        offers.push(`TOP Ad: ${discount}% OFF`);
      }
      if (offerDetails.offerPrices.FEATURED) {
        const discount = offerDetails.offerPrices.FEATURED;
        offers.push(`FEATURED Ad: ${discount}% OFF`);
      }
      if (offerDetails.offerPrices.BUMP_UP) {
        const discount = offerDetails.offerPrices.BUMP_UP;
        offers.push(`BUMP UP: ${discount}% OFF`);
      }
      if (offerDetails.offerPrices.URGENT) {
        const discount = offerDetails.offerPrices.URGENT;
        offers.push(`URGENT Ad: ${discount}% OFF`);
      }
      if (offers.length > 0) {
        offerMessage += offers.join('\n') + '\n\n';
      }
    }
    offerMessage += `Don't miss out! Post your ad now: ${offerUrl}`;

    // Email content
    const emailSubject = '🎉 New Premium Offers Available on SellIt!';
    const emailHtml = `
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
                  <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 New Premium Offers!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; margin-top: 0;">Special Offers Available!</h2>
                    <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                      We have exciting new premium offers for you! Don't miss out on these amazing discounts.
                    </p>
                    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
                      ${offerDetails.offerPrices?.TOP ? `<p style="margin: 5px 0; color: #166534;"><strong>TOP Ad:</strong> ${offerDetails.offerPrices.TOP}% OFF</p>` : ''}
                      ${offerDetails.offerPrices?.FEATURED ? `<p style="margin: 5px 0; color: #166534;"><strong>FEATURED Ad:</strong> ${offerDetails.offerPrices.FEATURED}% OFF</p>` : ''}
                      ${offerDetails.offerPrices?.BUMP_UP ? `<p style="margin: 5px 0; color: #166534;"><strong>BUMP UP:</strong> ${offerDetails.offerPrices.BUMP_UP}% OFF</p>` : ''}
                      ${offerDetails.offerPrices?.URGENT ? `<p style="margin: 5px 0; color: #166534;"><strong>URGENT Ad:</strong> ${offerDetails.offerPrices.URGENT}% OFF</p>` : ''}
                    </div>
                    <div style="margin: 30px 0; text-align: center;">
                      <a href="${offerUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Post Your Ad Now</a>
                    </div>
                    <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                      Take advantage of these limited-time offers and get your ads featured!
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
    `;
    const emailText = `New Premium Offers Available!\n\n${offerMessage}\n\nPost your ad now: ${offerUrl}`;

    // Track results
    let emailCount = 0;
    let smsCount = 0;
    let emailErrors = 0;
    let smsErrors = 0;

    // Send notifications to all users (in batches to avoid overwhelming the system)
    const batchSize = 10; // Process 10 users at a time
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (user) => {
          // Send email if user has email
          if (user.email) {
            try {
              const emailResult = await sendEmail(user.email, emailSubject, emailHtml, emailText);
              if (emailResult.success) {
                emailCount++;
              } else {
                emailErrors++;
              }
            } catch (error) {
              console.error(`❌ Failed to send email to ${user.email}:`, error.message);
              emailErrors++;
            }
          }

          // Send SMS if user has phone
          if (user.phone) {
            try {
              const smsResult = await sendSMS(user.phone, offerMessage);
              if (smsResult.success) {
                smsCount++;
              } else {
                smsErrors++;
              }
            } catch (error) {
              console.error(`❌ Failed to send SMS to ${user.phone}:`, error.message);
              smsErrors++;
            }
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Create database notifications for all users
    console.log(`📝 Creating database notifications...`);
    let notificationCount = 0;
    let notificationErrors = 0;

    // Build notification title and message
    const notificationTitle = '🎉 New Premium Offers Available!';
    let notificationMessage = 'Special premium offers are now available! ';
    if (offerDetails.offerPrices) {
      const offers = [];
      if (offerDetails.offerPrices.TOP) {
        offers.push(`TOP Ad: ${offerDetails.offerPrices.TOP}% OFF`);
      }
      if (offerDetails.offerPrices.FEATURED) {
        offers.push(`FEATURED: ${offerDetails.offerPrices.FEATURED}% OFF`);
      }
      if (offerDetails.offerPrices.BUMP_UP) {
        offers.push(`BUMP UP: ${offerDetails.offerPrices.BUMP_UP}% OFF`);
      }
      if (offerDetails.offerPrices.URGENT) {
        offers.push(`URGENT: ${offerDetails.offerPrices.URGENT}% OFF`);
      }
      if (offers.length > 0) {
        notificationMessage += offers.join(', ') + '. ';
      }
    }
    notificationMessage += 'Post your ad now to take advantage of these offers!';

    // Create notifications in batches
    const notificationBatchSize = 50;
    for (let i = 0; i < users.length; i += notificationBatchSize) {
      const batch = users.slice(i, i + notificationBatchSize);
      
      try {
        await prisma.notification.createMany({
          data: batch.map(user => ({
            userId: user.id,
            title: notificationTitle,
            message: notificationMessage,
            type: 'offer_update',
            link: offerUrl,
            isRead: false
          })),
          skipDuplicates: true
        });
        notificationCount += batch.length;
      } catch (error) {
        console.error(`❌ Error creating notifications for batch ${i}-${i + batch.length}:`, error);
        notificationErrors += batch.length;
      }
    }

    // Emit Socket.IO notifications to all connected users
    const { emitNotification } = require('../socket/socket');
    users.forEach(user => {
      emitNotification(user.id, {
        title: notificationTitle,
        message: notificationMessage,
        type: 'offer_update',
        link: offerUrl,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    // Send push notifications to all users
    console.log(`📱 Sending push notifications...`);
    const pushResult = await sendPushNotificationToAll({
      title: notificationTitle,
      body: offerMessage,
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        url: offerUrl,
        type: 'offer_update'
      },
      actions: [
        {
          action: 'view',
          title: 'View Offers'
        }
      ]
    });

    console.log(`✅ Offer update notifications sent:`);
    console.log(`   📧 Emails: ${emailCount} sent, ${emailErrors} failed`);
    console.log(`   📱 SMS: ${smsCount} sent, ${smsErrors} failed`);
    console.log(`   📝 Database: ${notificationCount} created, ${notificationErrors} failed`);
    console.log(`   🔔 Push: ${pushResult.successCount || 0} sent, ${pushResult.failCount || 0} failed`);

    return {
      success: true,
      totalUsers: users.length,
      emailsSent: emailCount,
      emailsFailed: emailErrors,
      smsSent: smsCount,
      smsFailed: smsErrors,
      notificationsCreated: notificationCount,
      notificationsFailed: notificationErrors,
      pushSent: pushResult.successCount || 0,
      pushFailed: pushResult.failCount || 0
    };
  } catch (error) {
    console.error('❌ Error sending offer update notifications:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = {
  sendEmail,
  sendSMS,
  sendAdApprovalNotification,
  sendOfferUpdateNotification
};

