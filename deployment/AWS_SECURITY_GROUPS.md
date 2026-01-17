# AWS Security Groups Configuration Guide

This guide explains how to configure AWS Security Groups for secure EC2 deployment.

## Security Group Rules

### Inbound Rules

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | Your IP /32 | Secure shell access |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP traffic (redirects to HTTPS) |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS traffic |
| Custom TCP | TCP | 5000 | 127.0.0.1/32 | Backend API (localhost only) |

### Outbound Rules

| Type | Protocol | Port Range | Destination | Description |
|------|----------|------------|-------------|-------------|
| All traffic | All | All | 0.0.0.0/0 | Allow all outbound traffic |

## Step-by-Step Configuration

### 1. Create Security Group

1. Go to AWS Console → EC2 → Security Groups
2. Click "Create security group"
3. Name: `sellit-production-sg`
4. Description: `Security group for SellIt application production server`

### 2. Add Inbound Rules

#### SSH Access (Port 22)
- **Type:** SSH
- **Protocol:** TCP
- **Port:** 22
- **Source:** Your IP address (e.g., `203.0.113.0/32`)
  - To find your IP: Visit https://whatismyipaddress.com/
  - **Important:** Restrict to your IP only for security

#### HTTP (Port 80)
- **Type:** HTTP
- **Protocol:** TCP
- **Port:** 80
- **Source:** `0.0.0.0/0` (Anywhere-IPv4)
- **Description:** HTTP traffic (will redirect to HTTPS)

#### HTTPS (Port 443)
- **Type:** HTTPS
- **Protocol:** TCP
- **Port:** 443
- **Source:** `0.0.0.0/0` (Anywhere-IPv4)
- **Description:** HTTPS traffic

#### Backend API (Port 5000) - Optional
- **Type:** Custom TCP
- **Protocol:** TCP
- **Port:** 5000
- **Source:** `127.0.0.1/32` (localhost only)
- **Description:** Backend API (only accessible from server itself)

**Note:** Port 5000 should only be accessible from localhost since Nginx will proxy requests. If you're not using Nginx, you can remove this rule or make it more restrictive.

### 3. Add Outbound Rules

- **Type:** All traffic
- **Protocol:** All
- **Port:** All
- **Destination:** `0.0.0.0/0` (Anywhere-IPv4)

This allows the server to:
- Download packages
- Connect to external APIs
- Make outbound database connections (if using RDS)
- Send emails via SMTP

### 4. Advanced Security Options

#### Restrict SSH to Specific IP Ranges

If you have a static IP or office network:

```
Type: SSH
Source: 203.0.113.0/24  (Your office network)
```

#### Allow SSH from Multiple IPs

Add multiple SSH rules:
- Rule 1: Your home IP
- Rule 2: Your office IP
- Rule 3: VPN IP (if applicable)

#### Rate Limiting (Application Level)

While AWS Security Groups don't support rate limiting, you can:
- Use Nginx rate limiting (configured in nginx.conf)
- Use AWS WAF (Web Application Firewall) for advanced protection
- Use CloudFront with WAF for DDoS protection

## Security Best Practices

### 1. Principle of Least Privilege

- Only open ports that are absolutely necessary
- Restrict SSH access to known IP addresses
- Don't expose database ports (5432) to the internet

### 2. Regular Review

- Review security group rules monthly
- Remove unused rules
- Update IP addresses if they change

### 3. Use Security Groups for Database

If using RDS (Amazon Relational Database Service):

**Database Security Group:**
- Allow inbound from EC2 security group only
- Port: 5432 (PostgreSQL)
- Source: `sellit-production-sg` (EC2 security group ID)

**EC2 Security Group:**
- No need to add database port (access via security group reference)

### 4. VPC Configuration

For production, consider:

1. **Private Subnet for Database:**
   - Place RDS in private subnet
   - No direct internet access
   - Accessible only from EC2 in public subnet

2. **Public Subnet for EC2:**
   - EC2 instance in public subnet
   - Has public IP
   - Accessible from internet

3. **NAT Gateway:**
   - For outbound internet access from private subnets
   - Allows database to download updates

## Example: Complete Security Group Setup

### EC2 Security Group (sellit-production-sg)

```json
{
  "GroupName": "sellit-production-sg",
  "Description": "Security group for SellIt production server",
  "InboundRules": [
    {
      "Type": "SSH",
      "Protocol": "TCP",
      "Port": 22,
      "Source": "203.0.113.0/32",
      "Description": "SSH from office"
    },
    {
      "Type": "HTTP",
      "Protocol": "TCP",
      "Port": 80,
      "Source": "0.0.0.0/0",
      "Description": "HTTP traffic"
    },
    {
      "Type": "HTTPS",
      "Protocol": "TCP",
      "Port": 443,
      "Source": "0.0.0.0/0",
      "Description": "HTTPS traffic"
    }
  ],
  "OutboundRules": [
    {
      "Type": "All traffic",
      "Protocol": "All",
      "Port": "All",
      "Destination": "0.0.0.0/0"
    }
  ]
}
```

### RDS Security Group (if using RDS)

```json
{
  "GroupName": "sellit-db-sg",
  "Description": "Security group for SellIt database",
  "InboundRules": [
    {
      "Type": "PostgreSQL",
      "Protocol": "TCP",
      "Port": 5432,
      "Source": "sg-xxxxxxxxx",
      "Description": "Allow from EC2 security group"
    }
  ]
}
```

## Testing Security Group Configuration

### 1. Test SSH Access

```bash
# From your local machine
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. Test HTTP/HTTPS

```bash
# HTTP (should redirect to HTTPS)
curl -I http://yourdomain.com

# HTTPS
curl -I https://yourdomain.com
```

### 3. Test Port 5000 (Should Fail from Outside)

```bash
# From your local machine (should fail)
curl http://your-ec2-ip:5000/api/health

# From EC2 server (should work)
curl http://localhost:5000/api/health
```

## Troubleshooting

### Cannot SSH to Server

1. Check security group allows your IP
2. Verify your IP hasn't changed
3. Check EC2 instance is running
4. Verify key pair is correct

### Cannot Access Website

1. Check HTTP (80) and HTTPS (443) rules exist
2. Verify Nginx is running: `sudo systemctl status nginx`
3. Check application is running: `pm2 status`
4. Review Nginx logs: `sudo tail -f /var/log/nginx/sellit-error.log`

### Database Connection Issues

1. If using RDS, check security group allows EC2 security group
2. Verify database is in same VPC or has VPC peering
3. Check database endpoint and credentials

## Additional Security Measures

### 1. AWS WAF (Web Application Firewall)

For advanced protection:
- DDoS protection
- SQL injection prevention
- XSS protection
- Rate limiting

### 2. CloudFront Distribution

- CDN for static assets
- DDoS protection
- SSL/TLS termination
- Geographic restrictions

### 3. AWS Shield

- DDoS protection (Standard is free)
- Advanced protection available (paid)

### 4. VPC Flow Logs

Monitor network traffic:
- Enable VPC Flow Logs
- Analyze for suspicious activity
- Set up CloudWatch alarms

## Summary

✅ **Do:**
- Restrict SSH to known IPs
- Only open necessary ports
- Use security groups for database access
- Regularly review and update rules
- Enable HTTPS only

❌ **Don't:**
- Open port 22 to 0.0.0.0/0
- Expose database ports to internet
- Leave unused rules in place
- Use default security groups in production

---

**Last Updated:** 2024
**Version:** 1.0
