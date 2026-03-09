# 📄 Invoice System - Quick Start Guide

## 🚀 Get Started in 30 Seconds

### Step 1: View Sample Invoice
```
Navigate to: http://localhost:3000/invoice/demo
```

### Step 2: Download PDF
Click the **"Download PDF"** button

### Step 3: Print
Click the **"Print"** button

---

## ✅ What You Get

### Professional Invoice with:
- ✅ Company branding
- ✅ Invoice number & dates
- ✅ Bill to information
- ✅ Line items table
- ✅ Tax calculations
- ✅ Grand total
- ✅ Payment information
- ✅ Notes section

### Actions:
- ✅ **Download PDF** - Save as PDF file
- ✅ **Print** - Print directly
- ✅ **Email** - Send via email

---

## 📁 Files Created

1. **`frontend/components/Invoice.tsx`** - Invoice component
2. **`frontend/app/invoice/[id]/page.tsx`** - Invoice page
3. **`frontend/app/globals.css`** - Print styles added

---

## 📦 Package Installed

```bash
npm install html2pdf.js
```

**Purpose**: PDF generation from HTML

---

## 🎨 Design Features

### Colors
- **Primary**: Blue (#2563eb)
- **Text**: Gray-900 (#111827)
- **Background**: White
- **Borders**: Gray-200

### Layout
- **Responsive**: Mobile to desktop
- **Print-optimized**: Clean print output
- **Professional**: Modern, clean design

---

## 💡 Usage Example

### Generate Invoice for Order

```tsx
import Invoice from '@/components/Invoice';

export default function OrderInvoice({ orderId }) {
  const order = fetchOrder(orderId);
  
  return (
    <Invoice
      invoiceNumber={`#INV-${orderId}`}
      dateIssued={new Date().toLocaleDateString()}
      dueDate={new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString()}
      seller={{
        name: "SellIt Marketplace",
        address: "Your address here",
        email: "billing@sellit.com"
      }}
      buyer={{
        name: order.customerName,
        address: order.customerAddress,
        email: order.customerEmail
      }}
      items={order.items}
      subtotal={order.subtotal}
      tax={order.tax}
      taxRate={18}
      total={order.total}
    />
  );
}
```

---

## 🎯 Integration Points

### 1. Business Package Purchase
When user buys a package, generate invoice:
```
/invoice/business-package-123
```

### 2. Premium Ad Purchase
When user buys premium ad, generate invoice:
```
/invoice/premium-ad-456
```

### 3. Order Completion
When order is completed, generate invoice:
```
/invoice/order-789
```

---

## 📊 Invoice Data Structure

```typescript
interface InvoiceData {
  invoiceNumber: string;      // #INV-2024-001
  dateIssued: string;          // Jan 15, 2024
  dueDate: string;             // Jan 29, 2024
  
  seller: {
    name: string;
    address: string;
    email: string;
    phone?: string;
  };
  
  buyer: {
    name: string;
    address: string;
    email: string;
    phone?: string;
  };
  
  items: Array<{
    description: string;
    details?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  
  paymentInfo?: {
    bank: string;
    accountName: string;
    accountNumber: string;
    ifsc?: string;
  };
  
  notes?: string;
}
```

---

## 🎉 Quick Test

### Test Now:
```
1. Navigate to: http://localhost:3000/invoice/demo
2. Click "Download PDF"
3. Check the downloaded PDF
4. Click "Print" to test printing
```

---

## 🔧 Customization

### Change Company Info
Edit in `Invoice.tsx` or pass via props

### Change Colors
Replace `primary-600` with your brand color

### Add Logo
Add image in header section

### Modify Layout
Adjust grid columns and spacing

---

**Status**: ✅ **READY TO USE**  
**Test URL**: http://localhost:3000/invoice/demo  
**Actions**: Download PDF, Print, Email  

**Your invoice system is ready!** 📄✨
