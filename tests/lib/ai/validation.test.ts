import { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizeMessageContent, ConversationInputSchema } from "../../../src/lib/ai/validation";

describe("validation", () => {
  describe("sanitizeMessageContent", () => {
    it("should remove HTML tags", () => {
      const input = "<p>Hello <b>world</b></p>";
      const sanitized = sanitizeMessageContent(input);
      assert.strictEqual(sanitized, "Hello world");
    });

    it("should remove invalid control characters", () => {
      // Create a string with a bell character (\x07) and backspace (\x08)
      const input = "Hello\x07\x08 world";
      const sanitized = sanitizeMessageContent(input);
      assert.strictEqual(sanitized, "Hello world");
    });

    it("should keep valid control characters like newline and tab", () => {
      const input = "Hello\n\tworld";
      const sanitized = sanitizeMessageContent(input);
      assert.strictEqual(sanitized, "Hello\n\tworld");
    });

    it("should trim the result", () => {
      const input = "  Hello world  ";
      const sanitized = sanitizeMessageContent(input);
      assert.strictEqual(sanitized, "Hello world");
    });

    it("should handle non-strings gracefully", () => {
      const input: unknown = null;
      const sanitized = sanitizeMessageContent(input as string);
      assert.strictEqual(sanitized, "");
    });
  });

  describe("ConversationInputSchema", () => {
    it("should validate and sanitize correct input", () => {
      const input = {
        messages: [
          { role: "user", content: "  Hello <script>alert('xss');</script>world  " }
        ]
      };
      const result = ConversationInputSchema.safeParse(input);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.messages.length, 1);
        assert.strictEqual(result.data.messages[0].content, "Hello alert('xss');world");
      }
    });

    it("should reject input with empty messages after sanitization", () => {
      const input = {
        messages: [
          { role: "user", content: "   <p></p>   " }
        ]
      };
      const result = ConversationInputSchema.safeParse(input);
      assert.strictEqual(result.success, false);
    });

    it("should reject input with empty messages array", () => {
      const input = {
        messages: []
      };
      const result = ConversationInputSchema.safeParse(input);
      assert.strictEqual(result.success, false);
    });

    it("should reject input with missing messages array", () => {
      const input = {};
      const result = ConversationInputSchema.safeParse(input);
      assert.strictEqual(result.success, false);
    });

    it("should reject input with invalid message role", () => {
      const input = {
        messages: [
          { role: "invalid", content: "Hello" }
        ]
      };
      const result = ConversationInputSchema.safeParse(input);
      assert.strictEqual(result.success, false);
    });

    it("should allow valid settings", () => {
      const input = {
        messages: [
          { role: "user", content: "Hello" }
        ],
        settings: {
          temperature: 0.5,
          max_tokens: 100
        }
      };
      const result = ConversationInputSchema.safeParse(input);
      assert.strictEqual(result.success, true);
    });

    it("should reject invalid settings", () => {
      const input = {
        messages: [
          { role: "user", content: "Hello" }
        ],
        settings: {
          temperature: 3.5, // > 2
          max_tokens: -100 // negative
        }
      };
      const result = ConversationInputSchema.safeParse(input);
      assert.strictEqual(result.success, false);
    });
  });
});
