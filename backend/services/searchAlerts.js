const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

/**
 * Get search alert settings
 */
async function getSettings() {
  try {
    // Get the first (and should be only) settings document
    const settings = await prisma.searchAlertSettings.findFirst();
    
    // Return default settings if none exist
    if (!settings) {
      return {
        enabled: true,
        maxEmailsPerUser: 5,
        checkIntervalHours: 24,
        emailSubject: 'New products matching your search!',
        emailBody: '<p>Hi there!</p><p>We found some products matching your recent search: <strong>{{query}}</strong></p>{{products}}<p>Happy shopping!</p>',
      };
    }
    
    return settings;
  } catch (error) {
    console.error('Error fetching search alert settings:', error);
    // Return defaults on error
    return {
      enabled: true,
      maxEmailsPerUser: 5,
      checkIntervalHours: 24,
      emailSubject: 'New products matching your search!',
      emailBody: '<p>Hi there!</p><p>We found some products matching your recent search: <strong>{{query}}</strong></p>{{products}}<p>Happy shopping!</p>',
    };
  }
}

/**
 * Create email transporter
 */
function createEmailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured for search alerts');
    return null;
  }

  return nodemailer.createTransport({
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
}

/**
 * Format products HTML for email
 */
function formatProductsHTML(products, frontendUrl) {
  if (!products || products.length === 0) {
    return '<p>No products found.</p>';
  }

  let html = '<div style="margin: 20px 0;">';
  
  products.forEach(product => {
    const productUrl = `${frontendUrl}/ads/${product.id}`;
    const imageUrl = product.images && product.images.length > 0 
      ? product.images[0] 
      : '/placeholder.png';
    
    html += `
      <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #fff;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="120" valign="top">
              <img src="${imageUrl}" alt="${product.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" />
            </td>
            <td valign="top" style="padding-left: 15px;">
              <h3 style="margin: 0 0 8px 0; color: #333; font-size: 18px;">
                <a href="${productUrl}" style="color: #667eea; text-decoration: none;">${product.title}</a>
              </h3>
              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${product.description ? product.description.substring(0, 100) : ''}${product.description && product.description.length > 100 ? '...' : ''}</p>
              <p style="margin: 0; color: #667eea; font-size: 20px; font-weight: bold;">₹${product.price.toLocaleString()}</p>
              ${product.location ? `<p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">📍 ${product.location.name}</p>` : ''}
              <a href="${productUrl}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background-color: #667eea; color: #fff; text-decoration: none; border-radius: 5px; font-size: 14px;">View Product</a>
            </td>
          </tr>
        </table>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Send alert email to user
 */
async function sendAlertEmail(email, query, products, settings) {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    console.log('📧 SMTP not configured, skipping email to:', email);
    return false;
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Format products HTML
    const productsHTML = formatProductsHTML(products, frontendUrl);
    
    // Replace placeholders in email body
    let emailBody = settings.emailBody
      .replace(/\{\{query\}\}/g, query)
      .replace(/\{\{products\}\}/g, productsHTML)
      .replace(/\{\{count\}\}/g, products.length);
    
    // Create full HTML email
    const fullHTML = `
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
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SellIt Search Alert</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    ${emailBody}
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">This is an automated search alert. To stop receiving these emails, please contact support.</p>
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
    
    await transporter.sendMail({
      from: `"SellIt" <${process.env.SMTP_USER}>`,
      to: email,
      subject: settings.emailSubject,
      html: fullHTML
    });
    
    console.log('✅ Search alert email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending search alert email:', error);
    return false;
  }
}

/**
 * Find matching products for a search query
 */
async function findMatchingProducts(queryText, filters = {}) {
  try {
    const whereClause = {
      status: 'APPROVED',
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        {
          OR: [
            { title: { contains: queryText, mode: 'insensitive' } },
            { description: { contains: queryText, mode: 'insensitive' } }
          ]
        }
      ]
    };
    
    // Add category filter if provided
    if (filters.category) {
      const category = await prisma.category.findUnique({
        where: { slug: filters.category },
        select: { id: true }
      });
      if (category) {
        whereClause.categoryId = category.id;
      }
    }
    
    // Add location filter if provided
    if (filters.location) {
      const location = await prisma.location.findUnique({
        where: { slug: filters.location },
        select: { id: true }
      });
      if (location) {
        whereClause.locationId = location.id;
      }
    }
    
    // Find products created in last 24 hours
    whereClause.createdAt = {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
    };
    
    const products = await prisma.ad.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            name: true,
            slug: true
          }
        },
        location: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Limit to 10 products per alert
    });
    
    return products;
  } catch (error) {
    console.error('Error finding matching products:', error);
    return [];
  }
}

/**
 * Process search alerts - main cron job function
 */
async function processSearchAlerts() {
  console.log('🔍 Starting search alerts processing...');
  
  try {
    // Get settings
    const settings = await getSettings();
    
    if (!settings.enabled) {
      console.log('⏸️  Search alerts are disabled');
      return;
    }
    
    // Get unprocessed search queries from the last check interval
    const checkIntervalMs = settings.checkIntervalHours * 60 * 60 * 1000;
    const queries = await prisma.searchQuery.findMany({
      where: {
        processed: false,
        createdAt: {
          gte: new Date(Date.now() - checkIntervalMs)
        },
        userEmail: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📊 Found ${queries.length} unprocessed search queries`);
    
    if (queries.length === 0) {
      return;
    }
    
    // Group queries by user email
    const queriesByEmail = {};
    queries.forEach(query => {
      if (!queriesByEmail[query.userEmail]) {
        queriesByEmail[query.userEmail] = [];
      }
      queriesByEmail[query.userEmail].push(query);
    });
    
    // Process each user's queries
    let emailsSent = 0;
    let totalProcessed = 0;
    
    for (const [email, userQueries] of Object.entries(queriesByEmail)) {
      // Respect per-user email limit
      const queriesToProcess = userQueries.slice(0, settings.maxEmailsPerUser);
      
      for (const query of queriesToProcess) {
        try {
          // Find matching products
          const filters = query.filters ? JSON.parse(query.filters) : {};
          const products = await findMatchingProducts(query.query, filters);
          
          if (products.length > 0) {
            // Send alert email
            const sent = await sendAlertEmail(email, query.query, products, settings);
            if (sent) {
              emailsSent++;
            }
          }
          
          // Mark query as processed
          await prisma.searchQuery.update({
            where: { id: query.id },
            data: { processed: true }
          });
          
          totalProcessed++;
        } catch (error) {
          console.error(`Error processing query ${query.id}:`, error);
        }
      }
      
      // Mark remaining queries as processed (exceeded limit)
      const remainingQueries = userQueries.slice(settings.maxEmailsPerUser);
      for (const query of remainingQueries) {
        await prisma.searchQuery.update({
          where: { id: query.id },
          data: { processed: true }
        });
        totalProcessed++;
      }
    }
    
    console.log(`✅ Search alerts processing complete: ${emailsSent} emails sent, ${totalProcessed} queries processed`);
  } catch (error) {
    console.error('❌ Error in search alerts processing:', error);
  }
}

/**
 * Save a search query for later processing
 */
async function saveSearchQuery(query, userId, userEmail, category, location, filters) {
  try {
    await prisma.searchQuery.create({
      data: {
        query,
        userId,
        userEmail,
        category,
        location,
        filters: filters ? JSON.stringify(filters) : null
      }
    });
    console.log('💾 Search query saved for alerts:', query);
  } catch (error) {
    console.error('Error saving search query:', error);
  }
}

module.exports = {
  getSettings,
  processSearchAlerts,
  saveSearchQuery,
  sendAlertEmail,
  findMatchingProducts
};

