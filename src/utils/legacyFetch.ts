import net from "node:net";
import { type ParserOptions, parseStringPromise } from "xml2js";

export interface LegacyFetchOptions {
  timeoutMs?: number;
  user?: string;
  pass?: string;
  xmlOptions?: ParserOptions;
}

export interface LegacyFetchResponse {
  ok: boolean;
  status: number;
  headersRaw: string;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

/**
 * HTTP/1.0 GET over a raw TCP socket, tailored for legacy CGI devices.
 * - Sends a minimal HTTP/1.0 request with Connection: close
 * - Reads until EOF
 * - Transparently dechunks HTTP/1.1 chunked responses
 * - Exposes text() and json() (XML -> JS via xml2js)
 */
export async function legacyFetch(
  url: string | URL,
  {
    timeoutMs = 8000,
    user = "root",
    pass = "root",
    xmlOptions,
  }: LegacyFetchOptions = {},
): Promise<LegacyFetchResponse> {
  const u = typeof url === "string" ? new URL(url) : url;
  const host = u.hostname;
  const port = u.port ? Number(u.port) : 80;
  const path = u.pathname + (u.search || "");
  const auth = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");

  return new Promise<LegacyFetchResponse>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let raw = "";
    let timedOut = false;

    const fail = (err: Error) => {
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(timeoutMs, () => {
      timedOut = true;
      fail(new Error(`Timeout after ${timeoutMs}ms`));
    });

    socket.on("connect", () => {
      const req =
        `GET ${path} HTTP/1.0\r\n` +
        `Host: ${host}\r\n` +
        `Authorization: ${auth}\r\n` +
        `User-Agent: curl/7.88.1\r\n` +
        `Accept: */*\r\n` +
        `Connection: close\r\n` +
        `\r\n`;
      socket.write(req);
    });

    socket.on("data", (chunk: Buffer) => {
      raw += chunk.toString("utf8");
    });

    socket.on("error", (err: Error) => {
      if (!timedOut) fail(err);
    });

    socket.on("end", () => {
      if (timedOut) return;

      const sep = raw.indexOf("\r\n\r\n");
      if (sep < 0)
        return fail(
          new Error("Malformed HTTP response (no header/body separator)"),
        );

      const headersText = raw.slice(0, sep);
      let body = raw.slice(sep + 4);

      // Dechunk if needed (some devices answer 1.1 chunked to a 1.0 request)
      if (/^transfer-encoding:\s*chunked$/im.test(headersText)) {
        try {
          body = dechunk(body);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return fail(new Error(`Failed to dechunk body: ${msg}`));
        }
      }

      const m = headersText.match(/^HTTP\/\d\.\d\s+(\d{3})/);
      const status = m ? Number(m[1]) : 0;

      const response: LegacyFetchResponse = {
        ok: status >= 200 && status < 300,
        status,
        headersRaw: headersText,
        text: async () => body,
        json: async <T = unknown>(): Promise<T> => {
          try {
            const obj = await parseStringPromise(body, {
              explicitArray: false,
              mergeAttrs: true,
              trim: true,
              normalizeTags: false,
              ...(xmlOptions ?? {}),
            });
            return obj as T;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error("Failed to parse XML: " + msg);
          }
        },
      };

      resolve(response);
    });
  });
}

/** Proper HTTP/1.1 chunked decoder for text payloads */
function dechunk(src: string): string {
  let i = 0;
  const len = src.length;
  let out = "";

  while (i < len) {
    const crlf = src.indexOf("\r\n", i);
    if (crlf === -1) throw new Error("Invalid chunk: missing CRLF after size");
    const sizeHex = src.slice(i, crlf).trim();
    const size = parseInt(sizeHex, 16);
    if (Number.isNaN(size)) throw new Error(`Invalid chunk size: ${sizeHex}`);
    i = crlf + 2;

    if (size === 0) {
      // Optional trailers end with CRLF; ignore them
      return out;
    }

    const end = i + size;
    if (end > len)
      throw new Error("Invalid chunk: body shorter than declared size");

    out += src.slice(i, end);
    i = end;

    if (src.slice(i, i + 2) !== "\r\n")
      throw new Error("Invalid chunk: missing CRLF after data");
    i += 2;
  }

  return out;
}
