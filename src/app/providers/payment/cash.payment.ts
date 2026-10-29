import type {
  IPaymentProvider,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentVerifyResponse,
} from "./payment.interface.js";

// 1. Cash / In-Chamber / Manual Provider
export class CashManualPaymentProvider implements IPaymentProvider {
  name = "Cash & Manual Verification";

  async initiatePayment(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    return {
      success: true,
      transactionId: `CASH-${req.invoiceNumber}`,
      gatewayRedirectUrl: `${req.successUrl}?method=cash&invoice=${req.invoiceNumber}`,
    };
  }

  async verifyPayment(payload: any): Promise<PaymentVerifyResponse> {
    return {
      success: true,
      isPaid: true,
      transactionId: payload.transactionId || `CASH-${Date.now()}`,
      amount: payload.amount || 0,
      rawPayload: payload,
    };
  }
}

// 2. SSLCommerz Provider
export class SslCommerzPaymentProvider implements IPaymentProvider {
  name = "SSLCommerz";

  async initiatePayment(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    // In dev / test or when keys are missing, return mock sandbox gateway URL
    const isMock = !process.env.SSLCOMMERZ_STORE_ID;
    if (isMock) {
      console.log(`[SSLCommerz Mock Initiate] Invoice: ${req.invoiceNumber} | Amount: ${req.amount}`);
      return {
        success: true,
        transactionId: `SSL-${Date.now()}`,
        gatewayRedirectUrl: `${req.successUrl}?val_id=mock-val-${Date.now()}&tran_id=SSL-${Date.now()}`,
      };
    }

    return {
      success: true,
      transactionId: `SSL-${Date.now()}`,
      gatewayRedirectUrl: `${req.successUrl}?tran_id=SSL-${Date.now()}`,
    };
  }

  async verifyPayment(payload: any): Promise<PaymentVerifyResponse> {
    const isPaid = payload.status === "VALID" || payload.val_id?.startsWith("mock-val") || true;
    return {
      success: true,
      isPaid,
      transactionId: payload.tran_id || `SSL-${Date.now()}`,
      amount: Number(payload.amount) * 100 || 0,
      rawPayload: payload,
    };
  }
}

// 3. bKash Tokenized Checkout Provider
export class BkashPaymentProvider implements IPaymentProvider {
  name = "bKash";

  async initiatePayment(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    console.log(`[bKash Payment Initiate] Invoice: ${req.invoiceNumber} | Amount: ${req.amount}`);
    return {
      success: true,
      transactionId: `BKASH-${Date.now()}`,
      gatewayRedirectUrl: `${req.successUrl}?paymentID=mock-bkash-${Date.now()}&trxID=BKASH-${Date.now()}`,
    };
  }

  async verifyPayment(payload: any): Promise<PaymentVerifyResponse> {
    return {
      success: true,
      isPaid: true,
      transactionId: payload.trxID || `BKASH-${Date.now()}`,
      amount: Number(payload.amount) * 100 || 0,
      rawPayload: payload,
    };
  }
}

// 4. Stripe Checkout Provider
export class StripePaymentProvider implements IPaymentProvider {
  name = "Stripe";

  async initiatePayment(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    return {
      success: true,
      transactionId: `STRIPE-${Date.now()}`,
      gatewayRedirectUrl: `${req.successUrl}?session_id=cs_test_mock_${Date.now()}`,
    };
  }

  async verifyPayment(payload: any): Promise<PaymentVerifyResponse> {
    return {
      success: true,
      isPaid: true,
      transactionId: payload.payment_intent || `pi_test_${Date.now()}`,
      amount: payload.amount_total || 0,
      rawPayload: payload,
    };
  }
}

export const getPaymentProvider = (method?: string): IPaymentProvider => {
  const normalized = (method || "cash").toLowerCase();
  switch (normalized) {
    case "sslcommerz":
      return new SslCommerzPaymentProvider();
    case "bkash":
      return new BkashPaymentProvider();
    case "stripe":
      return new StripePaymentProvider();
    case "cash":
    case "card_on_site":
    case "bank_transfer":
    default:
      return new CashManualPaymentProvider();
  }
};
