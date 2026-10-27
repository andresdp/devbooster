import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { boards, comments, history, tickets } from "./client";
import { ApiError } from "./errors";

const API = "http://localhost:8000/api/v1";

interface Seen {
  method: string;
  url: URL;
  accept: string | null;
  contentType: string | null;
  body: unknown;
}

let seen: Seen | undefined;
const record = async (request: Request): Promise<void> => {
  const text = await request.text();
  seen = {
    method: request.method,
    url: new URL(request.url),
    accept: request.headers.get("Accept"),
    contentType: request.headers.get("Content-Type"),
    body: text ? (JSON.parse(text) as unknown) : undefined,
  };
};

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  seen = undefined;
});
afterAll(() => server.close());

const caught = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected rejection");
};

describe("operations", () => {
  const cases: {
    name: string;
    method: string;
    path: string;
    call: () => Promise<unknown>;
    body?: unknown;
  }[] = [
    { name: "boards.list", method: "GET", path: "/boards", call: () => boards.list() },
    {
      name: "boards.create",
      method: "POST",
      path: "/boards",
      body: { name: "Sprint" },
      call: () => boards.create({ name: "Sprint" }),
    },
    { name: "boards.get", method: "GET", path: "/boards/7", call: () => boards.get(7) },
    {
      name: "tickets.create",
      method: "POST",
      path: "/boards/7/tickets",
      body: { title: "t", description: "", type: "task", priority: "low" },
      call: () => tickets.create(7, { title: "t", description: "", type: "task", priority: "low" }),
    },
    {
      name: "tickets.get",
      method: "GET",
      path: "/tickets/TKT-1",
      call: () => tickets.get("TKT-1"),
    },
    {
      name: "tickets.update",
      method: "PATCH",
      path: "/tickets/TKT-1",
      body: { title: "new" },
      call: () => tickets.update("TKT-1", { title: "new" }),
    },
    {
      name: "tickets.move",
      method: "POST",
      path: "/tickets/TKT-1/move",
      body: { column_id: 2, position: 0 },
      call: () => tickets.move("TKT-1", { column_id: 2, position: 0 }),
    },
    {
      name: "comments.list",
      method: "GET",
      path: "/tickets/TKT-1/comments",
      call: () => comments.list("TKT-1"),
    },
    {
      name: "comments.add",
      method: "POST",
      path: "/tickets/TKT-1/comments",
      body: { author: "a", text: "b" },
      call: () => comments.add("TKT-1", { author: "a", text: "b" }),
    },
    {
      name: "history.list",
      method: "GET",
      path: "/tickets/TKT-1/history",
      call: () => history.list("TKT-1"),
    },
  ];

  it.each(cases)("$name calls $method $path", async ({ method, path, body, call }) => {
    server.use(
      http.all(`${API}${path}`, async ({ request }) => {
        await record(request);
        return HttpResponse.json({ ok: true });
      }),
    );
    await call();
    expect(seen?.method).toBe(method);
    expect(seen?.url.pathname).toBe(`/api/v1${path}`);
    expect(seen?.accept).toBe("application/json");
    if (body === undefined) {
      expect(seen?.contentType).toBeNull();
    } else {
      expect(seen?.contentType).toBe("application/json");
      expect(seen?.body).toEqual(body);
    }
  });

  it("URL-encodes path parameters", async () => {
    server.use(
      http.get(`${API}/tickets/:key`, async ({ request }) => {
        await record(request);
        return HttpResponse.json({});
      }),
    );
    await tickets.get("A/B C");
    expect(seen?.url.pathname).toBe("/api/v1/tickets/A%2FB%20C");
  });

  it("resolves to the parsed body", async () => {
    server.use(http.get(`${API}/boards`, () => HttpResponse.json([{ id: 1 }])));
    await expect(boards.list()).resolves.toEqual([{ id: 1 }]);
  });
});

describe("error mapping", () => {
  it("maps an ErrorResponse body to ApiError", async () => {
    server.use(
      http.post(`${API}/boards`, () =>
        HttpResponse.json(
          {
            error: {
              code: "validation_error",
              message: "Invalid",
              details: [{ field: "name", message: "required" }],
            },
          },
          { status: 422 },
        ),
      ),
    );
    const err = await caught(boards.create({ name: "" }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 422,
      code: "validation_error",
      message: "Invalid",
      details: [{ field: "name", message: "required" }],
    });
  });

  it("uses [] when the body has null details", async () => {
    server.use(
      http.get(`${API}/boards/1`, () =>
        HttpResponse.json(
          { error: { code: "not_found", message: "Board not found", details: null } },
          { status: 404 },
        ),
      ),
    );
    expect(await caught(boards.get(1))).toMatchObject({ status: 404, details: [] });
  });

  it("maps a non-JSON 500 to unexpected_response", async () => {
    server.use(http.get(`${API}/boards`, () => new HttpResponse("boom", { status: 500 })));
    expect(await caught(boards.list())).toMatchObject({
      status: 500,
      code: "unexpected_response",
      message: "Unexpected response from the server (500).",
      details: [],
    });
  });

  it("maps an unreachable server to network_error", async () => {
    server.use(http.get(`${API}/boards`, () => HttpResponse.error()));
    expect(await caught(boards.list())).toMatchObject({
      status: 0,
      code: "network_error",
      message: "Could not reach the server.",
    });
  });

  it("rethrows the native AbortError when the signal aborts", async () => {
    server.use(
      http.get(`${API}/boards`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json([]);
      }),
    );
    const controller = new AbortController();
    const pending = caught(boards.list(controller.signal));
    controller.abort();
    const err = await pending;
    expect(err).not.toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ name: "AbortError" });
  });

  it("maps a 2xx with invalid JSON to unexpected_response", async () => {
    server.use(http.get(`${API}/boards`, () => new HttpResponse("not json", { status: 200 })));
    expect(await caught(boards.list())).toMatchObject({
      status: 200,
      code: "unexpected_response",
    });
  });
});
