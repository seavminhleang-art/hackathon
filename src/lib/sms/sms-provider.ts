// SMS Provider Interface and Mock Implementation
// NOTE: For MVP, uses MockSmsProvider with logged transmissions.
// TODO: Real SMS Gateway Integration (Twilio or Cambodian Telco API e.g. Smart/Cellcard/Metfone).

import type { ISODateString } from "@/types";

export interface SmsDeliveryResult {
  success: boolean;
  messageId: string;
  to: string;
  message: string;
  simulated: boolean;
  sentAt: ISODateString;
}

export interface SmsProvider {
  sendSms(to: string, message: string): Promise<SmsDeliveryResult>;
}

export class MockSmsProvider implements SmsProvider {
  private dispatches: SmsDeliveryResult[] = [];

  async sendSms(to: string, message: string): Promise<SmsDeliveryResult> {
    const result: SmsDeliveryResult = {
      success: true,
      messageId: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      to,
      message,
      simulated: true,
      sentAt: new Date().toISOString(),
    };
    this.dispatches.push(result);
    // In dev / test environment, also log to console
    if (typeof window === "undefined") {
      // Server / test execution
    }
    return result;
  }

  getDispatches(): SmsDeliveryResult[] {
    return [...this.dispatches];
  }

  getSentMessages(): SmsDeliveryResult[] {
    return [...this.dispatches];
  }

  getLatestTo(to: string): SmsDeliveryResult | undefined {
    return this.dispatches.filter((d) => d.to === to).slice(-1)[0];
  }

  clear(): void {
    this.dispatches = [];
  }
}

export const smsProvider = new MockSmsProvider();
