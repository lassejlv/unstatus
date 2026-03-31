import { Inbound } from "inboundemail";

export function createEmailClient(apiKey: string) {
  return new Inbound({ apiKey });
}

export { NotificationEmail, type NotificationEmailProps } from "./emails/notification";
export { InvitationEmail, type InvitationEmailProps } from "./emails/invitation";
export { SubscriptionVerifyEmail, type SubscriptionVerifyEmailProps } from "./emails/subscription-verify";
