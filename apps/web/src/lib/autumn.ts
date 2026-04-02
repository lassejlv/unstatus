import { Autumn } from "autumn-js";
import { env } from "./env";

export const autumn = new Autumn({
  secretKey: env.AUTUMN_SECRET_KEY,
});
