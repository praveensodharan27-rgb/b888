const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendEmail, sendSMS } = require('../utils/notifications');
const { logger } = require('../src/config/logger');

/**
 * Complete Notification Service for Marketplace
 * Handles all notification events with email, SMS, and database tracking
 */

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000';
const APP_NAME = process.env.APP_NAME || 'SellIt';

/** Capitalize first letter of a string; safe for null/undefined/empty */
const capitalizeFirst = (str) => {
  if (str == null || typeof str !== 'string') return str ?? '';
  const s = String(str).trim();
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
};

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Generate modern email HTML template (clean subscription-style layout like reference)
 * Light purple header, centered content, illustration area, purple CTA, grey info box, dark purple footer
 */
const generateEmailTemplate = ({ title, greeting, message, ctaText, ctaUrl, additionalInfo }) => {
  const safeTitle = title || APP_NAME;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f5;padding:24px 16px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                <!-- Header: light purple banner -->
                <tr>
                  <td style="padding:24px 32px;text-align:center;background-color:#e8e0f5;">
                    <span style="color:#5b4a8a;font-size:20px;font-weight:700;letter-spacing:0.05em;">${APP_NAME}</span>
                  </td>
                </tr>
                <!-- Hero: light purple section with envelope icon -->
                <tr>
                  <td style="padding:40px 32px 24px 32px;text-align:center;background-color:#f3effa;">
                    <div style="width:80px;height:80px;margin:0 auto 16px auto;background-color:#e8e0f5;border-radius:50%;line-height:80px;text-align:center;font-size:40px;">&#9993;</div>
                    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111111;letter-spacing:-0.02em;">
                      ${safeTitle}
                    </h1>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
                      ${greeting || ''}
                    </p>
                  </td>
                </tr>

                <!-- Main content -->
                <tr>
                  <td style="padding:0 32px 32px 32px;">
                    <div style="font-size:15px;line-height:1.7;color:#374151;">
                      ${message || ''}
                    </div>
                    ${ctaUrl ? `
                      <div style="margin:28px 0;text-align:center;">
                        <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background-color:#6b4c9a;color:#ffffff !important;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                          ${ctaText || 'View details'}
                        </a>
                      </div>
                      <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                        Click the button above to take action. Thank you for using ${APP_NAME}!
                      </p>
                    ` : ''}
                    ${additionalInfo ? `
                      <div style="margin-top:24px;padding:20px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                        <div style="font-size:14px;line-height:1.6;color:#4b5563;">
                          ${additionalInfo}
                        </div>
                      </div>
                    ` : ''}
                  </td>
                </tr>

                <!-- Footer: dark purple -->
                <tr>
                  <td style="padding:24px 32px;background-color:#4a3c6a;text-align:center;">
                    <p style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#ffffff;">${APP_NAME}</p>
                    <p style="margin:0 0 12px 0;font-size:12px;color:rgba(255,255,255,0.85);">
                      <a href="${FRONTEND_URL}" style="color:rgba(255,255,255,0.9);text-decoration:none;">Home</a> &nbsp;|&nbsp;
                      <a href="${FRONTEND_URL}/about" style="color:rgba(255,255,255,0.9);text-decoration:none;">About</a> &nbsp;|&nbsp;
                      <a href="${FRONTEND_URL}/contact" style="color:rgba(255,255,255,0.9);text-decoration:none;">Contact</a>
                    </p>
                    <p style="margin:0 0 8px 0;font-size:11px;color:rgba(255,255,255,0.75);line-height:1.5;">
                      You received this email because you have an account on ${APP_NAME}.
                    </p>
                    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.75);line-height:1.5;">
                      This is an automated message. If you wish to unsubscribe, visit your account settings.
                    </p>
                    <p style="margin:16px 0 0 0;font-size:11px;color:rgba(255,255,255,0.6);">
                      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

// ============================================
// NOTIFICATION HISTORY TRACKING
// ============================================

/**
 * Save notification to database
 */
const saveNotificationHistory = async (data) => {
  try {
    // Check if notification already exists to prevent duplicates
    const existing = await prisma.notificationHistory.findFirst({
      where: {
        userId: data.userId,
        eventType: data.eventType,
        adId: data.adId,
        createdAt: {
          gte: new Date(Date.now() - 60000) // Within last 1 minute
        }
      }
    });

    if (existing) {
      logger.info(`Duplicate notification prevented: ${data.eventType} for user ${data.userId}`);
      return existing;
    }

    const notification = await prisma.notificationHistory.create({
      data: {
        userId: data.userId,
        eventType: data.eventType,
        adId: data.adId,
        orderId: data.orderId,
        invoiceId: data.invoiceId,
        offerId: data.offerId,
        emailSent: data.emailSent || false,
        smsSent: data.smsSent || false,
        emailStatus: data.emailStatus || 'pending',
        smsStatus: data.smsStatus || 'pending',
        metadata: data.metadata || {}
      }
    });

    return notification;
  } catch (error) {
    logger.error('Error saving notification history:', error);
    return null;
  }
};

// ============================================
// 1. AD CREATED NOTIFICATION
// ============================================

const sendAdCreatedNotification = async (user, ad) => {
  try {
    const adUrl = `${FRONTEND_URL}/ads/${ad.slug || ad.id}`;
    
    // Determine if ad is auto-approved or under review
    const isAutoApproved = ad.status === 'APPROVED';
    
    const emailData = isAutoApproved ? {
      title: '🎉 Ad Posted Successfully!',
      greeting: `Great news, ${capitalizeFirst(user.name)}!`,
      message: `
        <p style="margin: 0 0 15px 0;">Your ad <strong>"${capitalizeFirst(ad.title)}"</strong> has been posted and is now live on ${APP_NAME}!</p>
        <p style="margin: 0;">Category: <strong>${ad.categoryName || ad.category}</strong></p>
        <p style="margin: 0;">Price: <strong>₹${ad.price?.toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">Location: <strong>${ad.city || ad.location}</strong></p>
      `,
      ctaText: 'View Your Ad',
      ctaUrl: adUrl,
      additionalInfo: '<p style="margin: 0; color: #059669; font-weight: 600;">✓ Your ad is now visible to all users!</p>'
    } : {
      title: '📝 Ad Submitted for Review',
      greeting: `Hello ${capitalizeFirst(user.name)},`,
      message: `
        <p style="margin: 0 0 15px 0;">Your ad <strong>"${capitalizeFirst(ad.title)}"</strong> has been submitted successfully and is currently under review.</p>
        <p style="margin: 0;">Category: <strong>${ad.categoryName || ad.category}</strong></p>
        <p style="margin: 0;">Price: <strong>₹${ad.price?.toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">Location: <strong>${ad.city || ad.location}</strong></p>
      `,
      ctaText: 'View Ad Status',
      ctaUrl: `${FRONTEND_URL}/profile`,
      additionalInfo: '<p style="margin: 0; color: #d97706; font-weight: 600;">⏳ We\'ll notify you once your ad is approved (usually within 24 hours).</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = isAutoApproved 
      ? `Your ad "${capitalizeFirst(ad.title)}" is now live! View it: ${adUrl}`
      : `Your ad "${capitalizeFirst(ad.title)}" is under review. We'll notify you once it's approved.`;

    const smsMessage = isAutoApproved
      ? `✅ Your ad "${capitalizeFirst(ad.title)}" is now live on ${APP_NAME}! View: ${adUrl}`
      : `📝 Your ad "${capitalizeFirst(ad.title)}" is under review. We'll notify you once approved.`;

    // Send notifications
    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    // Save to history
    await saveNotificationHistory({
      userId: user.id,
      eventType: isAutoApproved ? 'ad_created_approved' : 'ad_created_review',
      adId: ad.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { adTitle: ad.title, adStatus: ad.status }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending ad created notification:', error);
    throw error;
  }
};

// ============================================
// 2. AD APPROVED NOTIFICATION
// ============================================

const sendAdApprovedNotification = async (user, ad) => {
  try {
    const adUrl = `${FRONTEND_URL}/ads/${ad.slug || ad.id}`;
    
    const emailData = {
      title: '🎉 Ad Approved!',
      greeting: `Congratulations, ${capitalizeFirst(user.name)}!`,
      message: `
        <p style="margin: 0 0 15px 0;">Your ad <strong>"${capitalizeFirst(ad.title)}"</strong> has been approved and is now live!</p>
        <p style="margin: 0;">Category: <strong>${ad.categoryName || ad.category}</strong></p>
        <p style="margin: 0;">Price: <strong>₹${ad.price?.toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">Location: <strong>${ad.city || ad.location}</strong></p>
      `,
      ctaText: 'View Your Ad',
      ctaUrl: adUrl,
      additionalInfo: '<p style="margin: 0; color: #059669; font-weight: 600;">✓ Your ad is now visible to thousands of potential buyers!</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `Great news! Your ad "${capitalizeFirst(ad.title)}" has been approved and is now live. View it: ${adUrl}`;
    const smsMessage = `🎉 Your ad "${capitalizeFirst(ad.title)}" is now live on ${APP_NAME}! View: ${adUrl}`;

    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: user.id,
      eventType: 'ad_approved',
      adId: ad.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { adTitle: ad.title }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending ad approved notification:', error);
    throw error;
  }
};

// ============================================
// 3. AD REJECTED NOTIFICATION
// ============================================

const sendAdRejectedNotification = async (user, ad, reason) => {
  try {
    const emailData = {
      title: '❌ Ad Rejected',
      greeting: `Hello ${capitalizeFirst(user.name)},`,
      message: `
        <p style="margin: 0 0 15px 0;">Unfortunately, your ad <strong>"${capitalizeFirst(ad.title)}"</strong> has been rejected.</p>
        <p style="margin: 0 0 15px 0;"><strong>Reason:</strong> ${reason || 'Violates community guidelines'}</p>
        <p style="margin: 0;">You can edit and resubmit your ad from your profile.</p>
      `,
      ctaText: 'Edit Ad',
      ctaUrl: `${FRONTEND_URL}/edit-ad/${ad.id}`,
      additionalInfo: '<p style="margin: 0; color: #dc2626; font-weight: 600;">Please review our posting guidelines before resubmitting.</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `Your ad "${capitalizeFirst(ad.title)}" was rejected. Reason: ${reason}. Edit and resubmit: ${FRONTEND_URL}/edit-ad/${ad.id}`;
    const smsMessage = `❌ Your ad "${capitalizeFirst(ad.title)}" was rejected. Reason: ${reason}. Please edit and resubmit.`;

    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: user.id,
      eventType: 'ad_rejected',
      adId: ad.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { adTitle: ad.title, reason }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending ad rejected notification:', error);
    throw error;
  }
};

// ============================================
// 4. AD EXPIRING SOON NOTIFICATION
// ============================================

const sendAdExpiringSoonNotification = async (user, ad, daysLeft) => {
  try {
    const adUrl = `${FRONTEND_URL}/ads/${ad.slug || ad.id}`;
    const renewUrl = `${FRONTEND_URL}/ads/${ad.id}/renew`;
    
    const emailData = {
      title: '⏰ Ad Expiring Soon',
      greeting: `Hello ${capitalizeFirst(user.name)},`,
      message: `
        <p style="margin: 0 0 15px 0;">Your ad <strong>"${capitalizeFirst(ad.title)}"</strong> will expire in <strong>${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</strong>.</p>
        <p style="margin: 0;">Don't let your ad disappear! Renew it now to keep it live.</p>
      `,
      ctaText: 'Renew Ad',
      ctaUrl: renewUrl,
      additionalInfo: `<p style="margin: 0; color: #d97706; font-weight: 600;">⚠️ Expires on: ${new Date(ad.adExpiryDate).toLocaleDateString('en-IN')}</p>`
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `Your ad "${capitalizeFirst(ad.title)}" expires in ${daysLeft} days. Renew now: ${renewUrl}`;
    const smsMessage = `⏰ Your ad "${capitalizeFirst(ad.title)}" expires in ${daysLeft} day(s). Renew: ${renewUrl}`;

    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: user.id,
      eventType: 'ad_expiring_soon',
      adId: ad.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { adTitle: ad.title, daysLeft }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending ad expiring soon notification:', error);
    throw error;
  }
};

// ============================================
// 5. AD EXPIRED NOTIFICATION
// ============================================

const sendAdExpiredNotification = async (user, ad) => {
  try {
    const renewUrl = `${FRONTEND_URL}/ads/${ad.id}/renew`;
    
    const emailData = {
      title: '⏱️ Ad Expired',
      greeting: `Hello ${capitalizeFirst(user.name)},`,
      message: `
        <p style="margin: 0 0 15px 0;">Your ad <strong>"${capitalizeFirst(ad.title)}"</strong> has expired and is no longer visible to buyers.</p>
        <p style="margin: 0;">Renew it now to make it live again!</p>
      `,
      ctaText: 'Renew Ad',
      ctaUrl: renewUrl,
      additionalInfo: '<p style="margin: 0; color: #dc2626; font-weight: 600;">⚠️ Your ad is no longer visible to buyers.</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `Your ad "${capitalizeFirst(ad.title)}" has expired. Renew now: ${renewUrl}`;
    const smsMessage = `⏱️ Your ad "${capitalizeFirst(ad.title)}" has expired. Renew: ${renewUrl}`;

    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: user.id,
      eventType: 'ad_expired',
      adId: ad.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { adTitle: ad.title }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending ad expired notification:', error);
    throw error;
  }
};

// ============================================
// 6. AD PACKAGE PURCHASED NOTIFICATION
// ============================================

const sendAdPackagePurchasedNotification = async (user, ad, packageType, order) => {
  try {
    const adUrl = `${FRONTEND_URL}/ads/${ad.slug || ad.id}`;
    const invoiceUrl = `${FRONTEND_URL}/invoices/${order.invoiceId}`;
    
    const packageNames = {
      TOP: 'Top Ad',
      FEATURED: 'Featured Ad',
      BUMP_UP: 'Bump Up',
      URGENT: 'Urgent Ad'
    };

    const emailData = {
      title: '✅ Package Activated!',
      greeting: `Great news, ${capitalizeFirst(user.name)}!`,
      message: `
        <p style="margin: 0 0 15px 0;">Your <strong>${packageNames[packageType] || packageType}</strong> package has been activated for your ad <strong>"${capitalizeFirst(ad.title)}"</strong>!</p>
        <p style="margin: 0;">Order ID: <strong>${order.id}</strong></p>
        <p style="margin: 0;">Amount Paid: <strong>₹${order.amount?.toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">Payment Method: <strong>${order.paymentMethod || 'Online'}</strong></p>
      `,
      ctaText: 'View Ad',
      ctaUrl: adUrl,
      additionalInfo: `<p style="margin: 0; color: #059669; font-weight: 600;">✓ Your ad is now getting premium visibility! <a href="${invoiceUrl}" style="color: #3b82f6;">Download Invoice</a></p>`
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `Your ${packageNames[packageType]} package is now active for "${capitalizeFirst(ad.title)}". View invoice: ${invoiceUrl}`;
    const smsMessage = `✅ ${packageNames[packageType]} activated for "${capitalizeFirst(ad.title)}"! View: ${adUrl}`;

    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: user.id,
      eventType: 'package_purchased',
      adId: ad.id,
      orderId: order.id,
      invoiceId: order.invoiceId,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { adTitle: ad.title, packageType, amount: order.amount }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending package purchased notification:', error);
    throw error;
  }
};

// ============================================
// 6b. BUSINESS PACKAGE ACTIVATED NOTIFICATION
// ============================================

const sendBusinessPackageActivatedNotification = async (user, businessPackage, order) => {
  try {
    const profileUrl = `${FRONTEND_URL}/profile`;
    const packageNames = {
      MAX_VISIBILITY: 'Max Visibility',
      SELLER_PLUS: 'Seller Plus',
      SELLER_PRIME: 'Seller Prime'
    };
    const pkgName = packageNames[businessPackage.packageType] || businessPackage.packageType;
    const expiresAt = businessPackage.expiresAt;
    const expiresStr = expiresAt ? new Date(expiresAt).toLocaleDateString('en-IN') : 'N/A';

    const emailData = {
      title: '✅ Business Package Activated!',
      greeting: `Great news, ${capitalizeFirst(user.name)}!`,
      message: `
        <p style="margin: 0 0 15px 0;">Your <strong>${pkgName}</strong> package has been activated!</p>
        <p style="margin: 0;">Order ID: <strong>${order.id}</strong></p>
        <p style="margin: 0;">Amount Paid: <strong>₹${Number(order.amount || businessPackage.amount || 0).toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">Duration: <strong>${businessPackage.duration || 30} days</strong></p>
        <p style="margin: 0;">Ads included: <strong>${businessPackage.totalAdsAllowed || 0}</strong></p>
        <p style="margin: 0;">Expires: <strong>${expiresStr}</strong></p>
      `,
      ctaText: 'View Profile',
      ctaUrl: profileUrl,
      additionalInfo: '<p style="margin: 0; color: #059669; font-weight: 600;">✓ You can now post ads using your package slots!</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `Your ${pkgName} package is active. ${businessPackage.totalAdsAllowed || 0} ads for ${businessPackage.duration || 30} days. Expires: ${expiresStr}`;
    const smsMessage = `✅ ${pkgName} package activated! ${businessPackage.totalAdsAllowed || 0} ads for ${businessPackage.duration || 30} days. View: ${profileUrl}`;

    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: user.id,
      eventType: 'business_package_activated',
      orderId: order.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { packageType: businessPackage.packageType, amount: order.amount || businessPackage.amount }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending business package activated notification:', error);
    throw error;
  }
};

// ============================================
// 7. PAYMENT SUCCESS NOTIFICATION
// ============================================

const sendPaymentSuccessNotification = async (user, order) => {
  try {
    const invoiceUrl = `${FRONTEND_URL}/invoices/${order.invoiceId}`;
    
    const emailData = {
      title: '💳 Payment Successful',
      greeting: `Hello ${capitalizeFirst(user.name)},`,
      message: `
        <p style="margin: 0 0 15px 0;">Your payment has been processed successfully!</p>
        <p style="margin: 0;">Order ID: <strong>${order.id}</strong></p>
        <p style="margin: 0;">Amount Paid: <strong>₹${order.amount?.toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">Payment Method: <strong>${order.paymentMethod || 'Online'}</strong></p>
        <p style="margin: 0;">Transaction ID: <strong>${order.transactionId || 'N/A'}</strong></p>
      `,
      ctaText: 'View Invoice',
      ctaUrl: invoiceUrl,
      additionalInfo: '<p style="margin: 0; color: #059669; font-weight: 600;">✓ Your order has been confirmed!</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `Payment successful! Amount: ₹${order.amount}. View invoice: ${invoiceUrl}`;
    const smsMessage = `💳 Payment of ₹${order.amount} received successfully. Order ID: ${order.id}`;

    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: user.id,
      eventType: 'payment_success',
      orderId: order.id,
      invoiceId: order.invoiceId,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { amount: order.amount, paymentMethod: order.paymentMethod }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending payment success notification:', error);
    throw error;
  }
};

// ============================================
// 8. INVOICE GENERATED NOTIFICATION
// ============================================

const sendInvoiceGeneratedNotification = async (user, invoice) => {
  try {
    const invoiceUrl = `${FRONTEND_URL}/invoices/${invoice.id}`;
    
    const emailData = {
      title: '📄 Invoice Generated',
      greeting: `Hello ${capitalizeFirst(user.name)},`,
      message: `
        <p style="margin: 0 0 15px 0;">Your invoice has been generated successfully.</p>
        <p style="margin: 0;">Invoice Number: <strong>${invoice.invoiceNumber}</strong></p>
        <p style="margin: 0;">Amount: <strong>₹${invoice.totalAmount?.toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">Date: <strong>${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</strong></p>
      `,
      ctaText: 'Download Invoice',
      ctaUrl: invoiceUrl,
      additionalInfo: '<p style="margin: 0; color: #3b82f6; font-weight: 600;">📥 Click above to download your invoice PDF.</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `Invoice ${invoice.invoiceNumber} generated. Download: ${invoiceUrl}`;
    const smsMessage = `📄 Invoice ${invoice.invoiceNumber} generated. Amount: ₹${invoice.totalAmount}. View: ${invoiceUrl}`;

    const emailResult = user.email ? await sendEmail(user.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = user.phone ? await sendSMS(user.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: user.id,
      eventType: 'invoice_generated',
      invoiceId: invoice.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.totalAmount }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending invoice generated notification:', error);
    throw error;
  }
};

// ============================================
// 9. OFFER RECEIVED NOTIFICATION (Seller)
// ============================================

const sendOfferReceivedNotification = async (seller, buyer, ad, offer) => {
  try {
    const offerUrl = `${FRONTEND_URL}/offers/${offer.id}`;
    const adUrl = `${FRONTEND_URL}/ads/${ad.slug || ad.id}`;
    
    const emailData = {
      title: '💰 New Offer Received!',
      greeting: `Hello ${capitalizeFirst(seller.name)},`,
      message: `
        <p style="margin: 0 0 15px 0;">You have received a new offer for your ad <strong>"${capitalizeFirst(ad.title)}"</strong>!</p>
        <p style="margin: 0;">Offer Amount: <strong>₹${offer.offerAmount?.toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">Your Price: <strong>₹${ad.price?.toLocaleString('en-IN')}</strong></p>
        <p style="margin: 0;">From: <strong>${capitalizeFirst(buyer.name)}</strong></p>
        ${offer.message ? `<p style="margin: 15px 0 0 0;"><em>"${offer.message}"</em></p>` : ''}
      `,
      ctaText: 'View Offer',
      ctaUrl: offerUrl,
      additionalInfo: '<p style="margin: 0; color: #d97706; font-weight: 600;">⏰ Respond quickly to close the deal!</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = `New offer of ₹${offer.offerAmount} received for "${capitalizeFirst(ad.title)}". View: ${offerUrl}`;
    const smsMessage = `💰 New offer: ₹${offer.offerAmount} for "${capitalizeFirst(ad.title)}". View: ${offerUrl}`;

    const emailResult = seller.email ? await sendEmail(seller.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = seller.phone ? await sendSMS(seller.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: seller.id,
      eventType: 'offer_received',
      adId: ad.id,
      offerId: offer.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { adTitle: ad.title, offerAmount: offer.offerAmount, buyerName: buyer.name }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending offer received notification:', error);
    throw error;
  }
};

// ============================================
// 10. OFFER ACCEPTED/REJECTED NOTIFICATION (Buyer)
// ============================================

const sendOfferResponseNotification = async (buyer, seller, ad, offer, accepted) => {
  try {
    const adUrl = `${FRONTEND_URL}/ads/${ad.slug || ad.id}`;
    const chatUrl = `${FRONTEND_URL}/chat/${seller.id}`;
    
    const emailData = accepted ? {
      title: '🎉 Offer Accepted!',
      greeting: `Great news, ${capitalizeFirst(buyer.name)}!`,
      message: `
        <p style="margin: 0 0 15px 0;">Your offer of <strong>₹${offer.offerAmount?.toLocaleString('en-IN')}</strong> for <strong>"${capitalizeFirst(ad.title)}"</strong> has been accepted!</p>
        <p style="margin: 0;">Seller: <strong>${capitalizeFirst(seller.name)}</strong></p>
        <p style="margin: 0;">Contact the seller to complete the transaction.</p>
      `,
      ctaText: 'Contact Seller',
      ctaUrl: chatUrl,
      additionalInfo: '<p style="margin: 0; color: #059669; font-weight: 600;">✓ The seller has accepted your offer!</p>'
    } : {
      title: '❌ Offer Declined',
      greeting: `Hello ${capitalizeFirst(buyer.name)},`,
      message: `
        <p style="margin: 0 0 15px 0;">Unfortunately, your offer of <strong>₹${offer.offerAmount?.toLocaleString('en-IN')}</strong> for <strong>"${capitalizeFirst(ad.title)}"</strong> has been declined.</p>
        <p style="margin: 0;">Don't worry! You can still contact the seller or view similar ads.</p>
      `,
      ctaText: 'View Ad',
      ctaUrl: adUrl,
      additionalInfo: '<p style="margin: 0; color: #dc2626; font-weight: 600;">The seller has declined your offer.</p>'
    };

    const emailHtml = generateEmailTemplate(emailData);
    const emailText = accepted 
      ? `Your offer of ₹${offer.offerAmount} for "${capitalizeFirst(ad.title)}" was accepted! Contact seller: ${chatUrl}`
      : `Your offer of ₹${offer.offerAmount} for "${capitalizeFirst(ad.title)}" was declined.`;
    const smsMessage = accepted
      ? `🎉 Your offer of ₹${offer.offerAmount} for "${capitalizeFirst(ad.title)}" was accepted! Contact: ${chatUrl}`
      : `❌ Your offer of ₹${offer.offerAmount} for "${capitalizeFirst(ad.title)}" was declined.`;

    const emailResult = buyer.email ? await sendEmail(buyer.email, emailData.title, emailHtml, emailText) : null;
    const smsResult = buyer.phone ? await sendSMS(buyer.phone, smsMessage) : null;

    await saveNotificationHistory({
      userId: buyer.id,
      eventType: accepted ? 'offer_accepted' : 'offer_rejected',
      adId: ad.id,
      offerId: offer.id,
      emailSent: emailResult?.success || false,
      smsSent: smsResult?.success || false,
      emailStatus: emailResult?.success ? 'delivered' : 'failed',
      smsStatus: smsResult?.success ? 'delivered' : 'failed',
      metadata: { adTitle: ad.title, offerAmount: offer.offerAmount, sellerName: seller.name }
    });

    return { email: emailResult, sms: smsResult };
  } catch (error) {
    logger.error('Error sending offer response notification:', error);
    throw error;
  }
};

module.exports = {
  sendAdCreatedNotification,
  sendAdApprovedNotification,
  sendAdRejectedNotification,
  sendAdExpiringSoonNotification,
  sendAdExpiredNotification,
  sendAdPackagePurchasedNotification,
  sendBusinessPackageActivatedNotification,
  sendPaymentSuccessNotification,
  sendInvoiceGeneratedNotification,
  sendOfferReceivedNotification,
  sendOfferResponseNotification,
  saveNotificationHistory
};
