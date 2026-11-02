/**
 * High-end Clinical Inquiry Email Templates for Medicate Platform
 */

export interface IPatientInquiryData {
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message: string;
}

export function generatePatientInquiryEmail(data: IPatientInquiryData): string {
  const currentYear = new Date().getFullYear();
  const receivedAt = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return `
    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 15px; color: #1e293b;">
      <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner (Medicate Theme: #0b1c2e & #1673b8) -->
        <div style="background: linear-gradient(135deg, #0b1c2e 0%, #1673b8 100%); padding: 36px 30px; text-align: center;">
          <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 8px 16px; border-radius: 50px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
            <span style="color: #ffffff; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
              PATIENT CONTACT INQUIRY
            </span>
          </div>
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
            Medicate Clinical Portal
          </h1>
          <p style="color: rgba(255, 255, 255, 0.85); font-size: 14px; margin: 6px 0 0 0;">
            Prof. Dr. Sarah Rahman &bull; Practice Management Center
          </p>
        </div>

        <!-- Main Body -->
        <div style="padding: 35px 30px;">
          <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">
            A new patient consultation message has been submitted through your website contact form.
          </p>

          <!-- Patient Information Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid #1673b8; border-radius: 8px; padding: 22px; margin-bottom: 25px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Patient Name:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${data.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Phone Number:</td>
                <td style="padding: 6px 0;">
                  <a href="tel:${data.phone}" style="color: #1673b8; font-weight: 700; text-decoration: none; font-family: monospace; font-size: 16px;">
                    ${data.phone}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email Address:</td>
                <td style="padding: 6px 0;">
                  ${
                    data.email
                      ? `<a href="mailto:${data.email}" style="color: #1673b8; font-weight: 600; text-decoration: none;">${data.email}</a>`
                      : '<span style="color: #94a3b8; font-style: italic;">Not provided</span>'
                  }
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Inquiry Subject:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${data.subject || "General Consultation Inquiry"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Submitted At:</td>
                <td style="padding: 6px 0; color: #475569; font-size: 14px;">${receivedAt}</td>
              </tr>
            </table>
          </div>

          <!-- Message Box -->
          <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 22px; margin-bottom: 30px;">
            <p style="font-size: 13px; font-weight: 700; color: #1673b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">
              Patient's Message:
            </p>
            <div style="font-size: 15px; color: #1e293b; line-height: 1.7; white-space: pre-wrap;">
              "${data.message}"
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div style="text-align: center; margin: 30px 0 10px 0;">
            ${
              data.email
                ? `<a href="mailto:${data.email}?subject=Re:%20${encodeURIComponent(data.subject || "Your Consultation Inquiry")}" style="display: inline-block; background-color: #1673b8; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 26px; border-radius: 6px; margin: 0 8px 10px 8px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 6px -1px rgba(22, 115, 184, 0.3);">
                    Reply via Email
                  </a>`
                : ""
            }
            <a href="tel:${data.phone}" style="display: inline-block; background-color: #0b1c2e; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 26px; border-radius: 6px; margin: 0 8px 10px 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              Call Patient Now
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #0b1c2e;">
            Prof. Dr. Sarah Rahman Care Chamber
          </p>
          <p style="margin: 0; line-height: 1.5;">
            Automated notification dispatched from Medicate Clinic Portal.
            <br />
            &copy; ${currentYear} All rights reserved.
          </p>
        </div>

      </div>
    </div>
  `;
}

export function generateInquiryAcknowledgementEmail(data: { name: string; subject?: string }): string {
  const currentYear = new Date().getFullYear();

  return `
    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 15px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
        
        <div style="background: linear-gradient(135deg, #0b1c2e 0%, #1673b8 100%); padding: 36px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">
            Thank You For Contacting Us
          </h1>
          <p style="color: rgba(255, 255, 255, 0.85); font-size: 14px; margin: 6px 0 0 0;">
            Prof. Dr. Sarah Rahman Care Chamber
          </p>
        </div>

        <div style="padding: 35px 30px;">
          <p style="font-size: 16px; color: #334155; line-height: 1.7; margin: 0 0 20px 0;">
            Dear <strong>${data.name}</strong>,
          </p>
          <p style="font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 20px 0;">
            Thank you for reaching out regarding <strong>${data.subject || "your medical consultation"}</strong>. Our clinical triage desk has received your message and will review it promptly.
          </p>
          <p style="font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 25px 0;">
            One of our healthcare coordinators will follow up with you directly via telephone or email to assist with your inquiry.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #1673b8; border-radius: 8px; padding: 18px 20px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #0b1c2e;">
              Urgent Medical Needs?
            </p>
            <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
              If you require immediate medical assistance, please call our 24/7 chamber hotline at 
              <strong style="color: #1673b8;">+880 1700-112233</strong>.
            </p>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 22px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          <p style="margin: 0 0 4px 0; font-weight: 600; color: #0b1c2e;">
            Prof. Dr. Sarah Rahman &bull; Senior Consultant Physician &amp; Cardiologist
          </p>
          <p style="margin: 0;">
            &copy; ${currentYear} Medicate Clinical Care. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  `;
}
