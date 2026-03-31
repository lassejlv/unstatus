import { createEmailClient } from "@unstatus/email";
import { env } from "./env";

export const email = createEmailClient(env.INBOUND_API_KEY);
