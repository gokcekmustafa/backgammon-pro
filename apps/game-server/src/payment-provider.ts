import type { PaymentProvider, PaymentStatus } from '@backgammon/database';

export interface CreatePaymentInput {
  amount: number;
  currency: string;
  userId: string;
  subscriptionId: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  providerPaymentId?: string;
  status: PaymentStatus;
  error?: string;
}

export interface RefundResult {
  success: boolean;
}

export interface PaymentProvider {
  readonly name: PaymentProvider;
  charge(input: CreatePaymentInput): Promise<PaymentResult>;
  refund(providerPaymentId: string): Promise<RefundResult>;
}

export class ManualPaymentProvider implements PaymentProvider {
  readonly name: PaymentProvider = 'manual';

  async charge(input: CreatePaymentInput): Promise<PaymentResult> {
    return {
      success: true,
      providerPaymentId: `manual_${Date.now()}_${input.userId}`,
      status: 'completed',
    };
  }

  async refund(providerPaymentId: string): Promise<RefundResult> {
    return { success: true };
  }
}
