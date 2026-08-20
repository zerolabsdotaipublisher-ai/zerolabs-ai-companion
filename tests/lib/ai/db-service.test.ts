/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe, afterEach } from "node:test";
import assert from "node:assert";
import * as serverLib from "../../../src/lib/supabase/server";
import * as dbService from "../../../src/lib/ai/db-service";

const mockMethods: any = {};

const mockSupabase = {
  from: (table: string) => ({
    insert: (values: any) => {
      mockMethods.insertArgs = { table, values };
      return {
        select: () => ({
          single: async () => {
            if (mockMethods.insertError) {
              return { data: null, error: new Error(mockMethods.insertError) };
            }
            return { data: { ...values[0], id: "new-id" }, error: null };
          },
        }),
      };
    },
    update: (values: any) => ({
      eq: async (field: string, val: string) => {
        mockMethods.updateArgs = { table, values, field, val };
        return { error: null };
      },
    }),
    select: (fields: string) => ({
      eq: (field: string, val: string) => ({
        order: (orderField: string, options: any) => {
          mockMethods.selectArgs = {
            table,
            fields,
            field,
            val,
            orderField,
            options,
          };
          const resolveMock = async () => {
            if (mockMethods.selectError) {
              return { data: null, error: new Error(mockMethods.selectError) };
            }
            return { data: mockMethods.selectData || [], error: null };
          };
          return {
            range: async () => resolveMock(),
            limit: () => ({
              maybeSingle: async () => resolveMock(),
              then: (resolve: any, reject: any) =>
                resolveMock().then(resolve).catch(reject),
            }),
            then: (resolve: any, reject: any) =>
              resolveMock().then(resolve).catch(reject),
          };
        },
      }),
    }),
  }),
};

describe("Database Service", () => {
  afterEach(() => {
    Object.keys(mockMethods).forEach((k) => delete mockMethods[k]);
  });

  test("createConversation - success", async (t) => {
    t.mock.method(
      serverLib,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    const result = await dbService.createConversation("user1", "Test Title");

    assert.strictEqual(result.error, null);
    assert.strictEqual(result.data?.user_id, "user1");
    assert.strictEqual(result.data?.title, "Test Title");
    assert.strictEqual(result.data?.id, "new-id");

    assert.deepStrictEqual(mockMethods.insertArgs.table, "conversations");
    assert.deepStrictEqual(mockMethods.insertArgs.values, [
      { user_id: "user1", title: "Test Title" },
    ]);
  });

  test("createConversation - error", async (t) => {
    t.mock.method(
      serverLib,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );
    mockMethods.insertError = "DB Insert Failed";

    const result = await dbService.createConversation("user1");

    assert.strictEqual(result.data, null);
    assert.strictEqual(result.error, "DB Insert Failed");
  });

  test("saveUserMessage - success", async (t) => {
    t.mock.method(
      serverLib,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    const result = await dbService.saveUserMessage(
      "conv1",
      "user1",
      "Hello AI",
    );

    assert.strictEqual(result.error, null);
    assert.strictEqual(result.data?.content, "Hello AI");
    assert.strictEqual(result.data?.role, "user");

    assert.strictEqual(mockMethods.insertArgs.table, "messages");
    assert.deepStrictEqual(mockMethods.insertArgs.values, [
      {
        conversation_id: "conv1",
        user_id: "user1",
        role: "user",
        content: "Hello AI",
      },
    ]);
  });

  test("saveAssistantMessage - success", async (t) => {
    t.mock.method(
      serverLib,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    const result = await dbService.saveAssistantMessage(
      "conv1",
      "user1",
      "Hello User",
    );

    assert.strictEqual(result.error, null);
    assert.strictEqual(result.data?.content, "Hello User");
    assert.strictEqual(result.data?.role, "assistant");

    assert.strictEqual(mockMethods.insertArgs.table, "messages");
    assert.deepStrictEqual(mockMethods.insertArgs.values, [
      {
        conversation_id: "conv1",
        user_id: "user1",
        role: "assistant",
        content: "Hello User",
      },
    ]);
  });

  test("getConversationMessages - chronological sorting", async (t) => {
    t.mock.method(
      serverLib,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    mockMethods.selectData = [
      { id: "1", content: "first", created_at: "2024-01-01T00:00:00Z" },
      { id: "2", content: "second", created_at: "2024-01-01T00:01:00Z" },
    ];

    const result = await dbService.getConversationMessages("conv1");

    assert.strictEqual(result.error, null);
    assert.strictEqual(result.data?.length, 2);

    assert.strictEqual(mockMethods.selectArgs.table, "messages");
    assert.strictEqual(mockMethods.selectArgs.field, "conversation_id");
    assert.strictEqual(mockMethods.selectArgs.val, "conv1");
    assert.strictEqual(mockMethods.selectArgs.orderField, "created_at");
    assert.deepStrictEqual(mockMethods.selectArgs.options, { ascending: true });
  });

  test("getLatestConversation - returns null when no conversation exists", async (t) => {
    t.mock.method(
      serverLib,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    mockMethods.selectData = [];

    const result = await dbService.getLatestConversation("newuser");

    assert.strictEqual(result.error, null);
    assert.strictEqual(result.data, null);
  });

  test("getConversationMessages - error", async (t) => {
    t.mock.method(
      serverLib,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );
    mockMethods.selectError = "Read Failed";

    const result = await dbService.getConversationMessages("conv1");

    assert.strictEqual(result.data, null);
    assert.strictEqual(result.error, "Read Failed");
  });
});
