import { assertEquals } from "https://deno.land/std@0.214.0/assert/mod.ts";
import { sendNotification } from "./notify.ts";

Deno.test("sendNotification - basic functionality", async () => {
  const result = await sendNotification({
    title: "Test Notification",
    body: "This is a test message",
  });
  assertEquals(result, true);
});

Deno.test("sendNotification - title only", async () => {
  const result = await sendNotification({
    title: "Test Title Only",
  });
  assertEquals(result, true);
}); 