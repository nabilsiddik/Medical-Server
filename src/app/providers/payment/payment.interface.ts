export interface PaymentInitiateRequest {
  amount: number; // in minor units
  currency: string; // e.g. "BDT"
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  failUrl: string;
}

export interface PaymentInitiateResponse {
  success: boolean;
  gatewayRedirectUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  isPaid: boolean;
  transactionId: string;
  amount: number;
  rawPayload?: any;
  error?: string;
}

export interface IPaymentProvider {
  name: string;
  initiatePayment(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse>;
  verifyPayment(payload: any): Promise<PaymentVerifyResponse>;
}
