// Generate Otp
const generateOtpEmail = (otp: string) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px 20px; background-color: #f4f6f9;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
        
        <div style="background: #0d47a1; padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
            Verification Code
          </h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #4a5568; line-height: 1.7; margin: 0 0 25px 0; text-align: center;">
            Your OTP code is below.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 30px; border-radius: 6px; margin: 0 0 25px 0; text-align: center; border-left: 4px solid #0d47a1;">
            <p style="font-size: 14px; color: #4a5568; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">
              Your OTP Code
            </p>
            <p style="font-size: 42px; font-weight: 700; color: #0d47a1; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #4a5568; margin-bottom: 10px;">
              This OTP will expire in <strong style="color: #0d47a1;">10 minutes</strong>.
            </p>
            <p style="font-size: 14px; color: #4a5568; margin-bottom: 10px;">
              If you did not request this, please ignore the email.
            </p>
          </div>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="font-size: 14px; color: #555; margin: 0 0 8px 0;">
            Best Regards,
          </p>
          <p style="font-size: 15px; color: #0d47a1; font-weight: 600; margin: 0 0 20px 0;">
            Developer Team
          </p>
          <p style="font-size: 12px; color: #777; margin: 0; line-height: 1.6;">
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
        
      </div>
    </div>`;
};

//Forgot Password
const forgetPasswordEmail = (otp: string) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px 20px; background-color: #f4f6f9;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
        
        <div style="background: #0d47a1; padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
            Forgot Password Code
          </h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #4a5568; line-height: 1.7; margin: 0 0 25px 0; text-align: center;">
            Use the OTP below to reset your password.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 30px; border-radius: 6px; margin: 0 0 25px 0; text-align: center; border-left: 4px solid #0d47a1;">
            <p style="font-size: 14px; color: #4a5568; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">
              Your OTP Code
            </p>
            <p style="font-size: 42px; font-weight: 700; color: #0d47a1; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #4a5568; margin-bottom: 10px;">
              The OTP expires in <strong style="color: #0d47a1;">10 minutes</strong>.
            </p>
          </div>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="font-size: 14px; color: #555; margin: 0 0 8px 0;">
            Best Regards,
          </p>
          <p style="font-size: 15px; color: #0d47a1; font-weight: 600; margin: 0 0 20px 0;">
            Developer Team
          </p>
          <p style="font-size: 12px; color: #777; margin: 0; line-height: 1.6;">
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
        
      </div>
    </div>`;
};

// Resend Otp
const resendOtpEmail = (otp: string) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px 20px; background-color: #f4f6f9;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
        
        <div style="background: #0d47a1; padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 600; margin: 0;">
            Resent Verification Code
          </h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #4a5568; text-align: center;">
            Your new OTP is below.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 30px; border-radius: 6px; margin: 20px 0; text-align: center; border-left: 4px solid #0d47a1;">
            <p style="font-size: 42px; font-weight: 700; color: #0d47a1; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </p>
          </div>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="font-size: 14px; color: #555; margin: 0 0 8px 0;">
            Best Regards,
          </p>
          <p style="font-size: 15px; color: #0d47a1; font-weight: 600; margin: 0 0 20px 0;">
            Developer Team
          </p>
          <p style="font-size: 12px; color: #777; line-height: 1.6; margin: 0;">
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
        
      </div>
    </div>`;
};

// Invite User Email (after admin adds a user)
const inviteUserEmail = (fullName: string, password: string) => {
  return `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6f9; padding: 40px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

      <h2 style="color: #0d47a1; font-size: 26px; text-align: center; margin-bottom: 10px; letter-spacing: 0.5px;">
        Welcome to (Company Name)
      </h2>

      <p style="font-size: 15px; color: #555; text-align: center; margin-top: 0; line-height: 1.7;">
        Hello <strong style="color:#0d47a1;">${fullName}</strong>,  
        <br/><br/>
        You have been added to the <strong>(Company Name)</strong> system.
        You may now log in using the credentials provided below.
      </p>

      <div style="background: #f1f5f9; border-left: 4px solid #0d47a1; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <p style="font-size: 15px; color: #0d47a1; font-weight: 600; margin: 0 0 15px 0;">
          Your Login Credentials:
        </p>

        <p style="font-size: 14px; color: #4a5568; margin: 6px 0;">
          <strong>Username:</strong> ${fullName}
        </p>

        <p style="font-size: 14px; color: #4a5568; margin: 6px 0;">
          <strong>Password:</strong> ${password}
        </p>
      </div>

      <p style="font-size: 14px; color: #555; line-height: 1.7; margin-top: 20px; text-align:center;">
        If you need assistance accessing your account,  
        please contact our support team anytime.
      </p>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />

      <div style="text-align: center; margin-top: 10px;">
        <p style="font-size: 13px; color: #777;">
          Regards,<br/>
          <span style="font-weight: bold; color: #0d47a1;">Developer Team</span>
        </p>
      </div>

    </div>
  </div>
  `;
};

// Support Message
const generateSupportMessageEmail = ({
  email,
  name,
  phone,
  message,
}: {
  email: string;
  name: string;
  phone: string;
  message: string;
}) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px 20px; background-color: #f4f6f9;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">

        <!-- Header -->
        <div style="background: #0d47a1; padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
            New Support Message
          </h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #4a5568; line-height: 1.7; margin-bottom: 30px;">
            You have received a new support message from a user. The details are below:
          </p>

          <!-- User Info -->
          <div style="background-color: #f1f5f9; padding: 25px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #0d47a1;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #4a5568;">
              <strong style="color: #0d47a1;">Name:</strong> ${name}
            </p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #4a5568;">
              <strong style="color: #0d47a1;">Phone:</strong> ${phone}
            </p>
            <p style="margin: 0; font-size: 14px; color: #4a5568;">
              <strong style="color: #0d47a1;">Email:</strong> ${email}
            </p>
          </div>

          <!-- Message -->
          <div style="background-color: #ffffff; padding: 25px; border-radius: 6px; border: 1px solid #e9ecef;">
            <p style="font-size: 14px; color: #4a5568; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
              Message
            </p>
            <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0; white-space: pre-line;">
              ${message}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="font-size: 14px; color: #555; margin: 0 0 8px 0;">
            Admin Notification
          </p>
          <p style="font-size: 15px; color: #0d47a1; font-weight: 600; margin: 0 0 20px 0;">
            Support System
          </p>
          <p style="font-size: 12px; color: #777; margin: 0; line-height: 1.6;">
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>

      </div>
    </div>
  `;
};

// Order Item Interface for Email
export interface IEmailOrderItem {
  productName: string;
  variantTitle?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface IOrderEmailData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shippingAddress: any;
  items: IEmailOrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  orderStatus: string;
  orderNotes?: string | null;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
}

// Generate Order Confirmation Email
const generateOrderConfirmationEmail = (order: IOrderEmailData) => {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155;">
          <strong>${item.productName}</strong>
          ${item.variantTitle ? `<br/><span style="font-size: 12px; color: #64748b;">Variant: ${item.variantTitle}</span>` : ""}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; text-align: right;">
          ৳${item.price.toFixed(2)}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">
          ৳${item.subtotal.toFixed(2)}
        </td>
      </tr>
    `,
    )
    .join("");

  const addressStr = typeof order.shippingAddress === "object" 
    ? `${order.shippingAddress.street || order.shippingAddress.addressLine1 || ""}, ${order.shippingAddress.city || ""}, ${order.shippingAddress.state || ""}, ${order.shippingAddress.postalCode || ""}`.replace(/(^[,\s]+)|([,\s]+$)/g, '')
    : String(order.shippingAddress);

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px 20px; background-color: #f8fafc;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: #0f172a; padding: 35px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">
            Order Confirmation
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">
            Order #${order.orderNumber}
          </p>
        </div>

        <!-- Greeting -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #334155; margin: 0 0 20px 0; line-height: 1.6;">
            Hello <strong>${order.customerName}</strong>,<br/>
            Thank you for your order! We have received your order and are getting it ready.
          </p>

          <!-- Order Summary Details Box -->
          <div style="background: #f8fafc; border-radius: 6px; padding: 18px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; color: #64748b;">Order Number:</span>
              <strong style="font-size: 13px; color: #0f172a;">${order.orderNumber}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; color: #64748b;">Payment Method:</span>
              <strong style="font-size: 13px; color: #0f172a;">${order.paymentMethod}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; color: #64748b;">Phone:</span>
              <strong style="font-size: 13px; color: #0f172a;">${order.customerPhone}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 13px; color: #64748b;">Delivery Address:</span>
              <span style="font-size: 13px; color: #0f172a; text-align: right; max-width: 60%;">${addressStr}</span>
            </div>
          </div>

          <!-- Items Table -->
          <h3 style="font-size: 16px; color: #0f172a; margin: 0 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
            Order Items
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left;">
                <th style="padding: 10px 8px; font-size: 12px; color: #475569; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: center;">Qty</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: right;">Price</th>
                <th style="padding: 10px 8px; font-size: 12px; color: #475569; text-transform: uppercase; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Financial Summary -->
          <div style="margin-left: auto; max-width: 280px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: #64748b;">
              <span>Subtotal:</span>
              <span>৳${order.subtotal.toFixed(2)}</span>
            </div>
            ${
              order.discountAmount > 0
                ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: #16a34a;">
                    <span>Discount:</span>
                    <span>-৳${order.discountAmount.toFixed(2)}</span>
                  </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: #64748b;">
              <span>Shipping Fee:</span>
              <span>৳${order.shippingFee.toFixed(2)}</span>
            </div>
            ${
              order.taxAmount > 0
                ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: #64748b;">
                    <span>Tax:</span>
                    <span>৳${order.taxAmount.toFixed(2)}</span>
                  </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; padding: 10px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a; border-top: 2px solid #0f172a; margin-top: 6px;">
              <span>Total:</span>
              <span>৳${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          ${order.orderNotes ? `<p style="font-size: 13px; color: #64748b; background: #fffbeb; padding: 12px; border-left: 3px solid #f59e0b; border-radius: 4px;"><strong>Order Note:</strong> ${order.orderNotes}</p>` : ""}

        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 13px; color: #64748b; margin: 0 0 5px 0;">
            Need help with your order? Reply to this email or reach out to our support team.
          </p>
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            © ${new Date().getFullYear()} E-Commerce Store. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  `;
};

// Generate Order Status Update Email
const generateOrderStatusUpdateEmail = (
  order: IOrderEmailData,
  newStatus: string,
  note?: string | null,
) => {
  let statusBadgeColor = "#2563eb";
  let statusDescription = `Your order #${order.orderNumber} status has been updated to ${newStatus}.`;

  switch (newStatus) {
    case "PROCESSING":
      statusBadgeColor = "#0284c7";
      statusDescription = "We are currently packing and preparing your order for shipment.";
      break;
    case "CONFIRMED":
      statusBadgeColor = "#4f46e5";
      statusDescription = "Your order has been confirmed and queued for processing.";
      break;
    case "SHIPPED":
      statusBadgeColor = "#0891b2";
      statusDescription = `Great news! Your package is on its way. ${
        order.trackingNumber
          ? `<br/><strong>Carrier:</strong> ${order.shippingCarrier || "Standard Delivery"}<br/><strong>Tracking Number:</strong> ${order.trackingNumber}`
          : ""
      }`;
      break;
    case "DELIVERED":
      statusBadgeColor = "#16a34a";
      statusDescription = "Your order has been delivered! We hope you love your purchase.";
      break;
    case "CANCELLED":
      statusBadgeColor = "#dc2626";
      statusDescription = `Your order #${order.orderNumber} has been cancelled.${note ? `<br/><strong>Reason:</strong> ${note}` : ""}`;
      break;
    case "REFUNDED":
      statusBadgeColor = "#9333ea";
      statusDescription = `A refund has been processed for order #${order.orderNumber}.${note ? `<br/><strong>Details:</strong> ${note}` : ""}`;
      break;
  }

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px 20px; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
        
        <div style="background: #0f172a; padding: 35px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0;">
            Order Status Update
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">
            Order #${order.orderNumber}
          </p>
        </div>

        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #334155; margin: 0 0 20px 0;">
            Hello <strong>${order.customerName}</strong>,
          </p>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid ${statusBadgeColor};">
            <div style="margin-bottom: 10px;">
              <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Current Status:</span>
              <span style="display: inline-block; margin-left: 8px; padding: 3px 10px; border-radius: 12px; background: ${statusBadgeColor}; color: #ffffff; font-size: 12px; font-weight: 700;">
                ${newStatus}
              </span>
            </div>
            <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.6;">
              ${statusDescription}
            </p>
          </div>

          <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; font-size: 13px; color: #475569;">
            <p style="margin: 0 0 6px 0;"><strong>Total Items:</strong> ${order.items?.length || 0}</p>
            <p style="margin: 0;"><strong>Total Amount:</strong> ৳${order.totalAmount.toFixed(2)}</p>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            © ${new Date().getFullYear()} E-Commerce Store. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  `;
};

export {
  generateOtpEmail,
  forgetPasswordEmail,
  resendOtpEmail,
  inviteUserEmail,
  generateSupportMessageEmail,
  generateOrderConfirmationEmail,
  generateOrderStatusUpdateEmail,
};
