/**
 * OctoPrint REST API adapter — real WiFi 3D printer control.
 * @see https://docs.octoprint.org/en/master/api/index.html
 */

export type OctoPrintConfig = {
  host: string;
  port?: number;
  apiKey: string;
  useHttps?: boolean;
};

export type OctoPrintVersion = {
  server: string;
  api: string;
  text?: string;
};

export type OctoPrintPrinterState = {
  state: {
    text: string;
    flags: {
      operational: boolean;
      printing: boolean;
      paused: boolean;
      ready: boolean;
      error: boolean;
    };
  };
  temperature?: {
    tool0?: { actual: number; target: number };
    bed?: { actual: number; target: number };
  };
};

export type OctoPrintJob = {
  job: {
    file: { name: string; size: number };
    estimatedPrintTime?: number;
    filament?: { tool0?: { length: number; volume: number } };
  };
  progress: { completion: number; printTime: number; printTimeLeft: number };
  state: string;
};

function buildBaseUrl(config: OctoPrintConfig): string {
  const protocol = config.useHttps ? "https" : "http";
  const port = config.port ?? 80;
  const host = config.host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const defaultPort = config.useHttps ? 443 : 80;
  const portSuffix = port === defaultPort ? "" : `:${port}`;
  return `${protocol}://${host}${portSuffix}`;
}

async function octoFetch<T>(
  config: OctoPrintConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${buildBaseUrl(config)}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "X-Api-Key": config.apiKey,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OctoPrint ${response.status}: ${body.slice(0, 200) || response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

export async function testOctoPrintConnection(
  config: OctoPrintConfig,
): Promise<{ ok: true; version: OctoPrintVersion; baseUrl: string }> {
  const version = await octoFetch<OctoPrintVersion>(config, "/api/version");
  return { ok: true, version, baseUrl: buildBaseUrl(config) };
}

export async function getOctoPrintPrinterState(
  config: OctoPrintConfig,
): Promise<OctoPrintPrinterState> {
  return octoFetch<OctoPrintPrinterState>(config, "/api/printer");
}

export async function getOctoPrintJob(config: OctoPrintConfig): Promise<OctoPrintJob> {
  return octoFetch<OctoPrintJob>(config, "/api/job");
}

export async function uploadOctoPrintFile(
  config: OctoPrintConfig,
  fileName: string,
  content: Buffer | Uint8Array,
  options?: { select?: boolean; print?: boolean },
): Promise<{ name: string; path: string }> {
  const form = new FormData();
  const blob = new Blob([content], { type: "application/octet-stream" });
  form.append("file", blob, fileName);
  form.append("select", String(options?.select ?? true));
  form.append("print", String(options?.print ?? false));

  return octoFetch(config, "/api/files/local", {
    method: "POST",
    body: form,
  });
}

export async function startOctoPrintJob(config: OctoPrintConfig): Promise<void> {
  await octoFetch(config, "/api/job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "start" }),
  });
}

export async function cancelOctoPrintJob(config: OctoPrintConfig): Promise<void> {
  await octoFetch(config, "/api/job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: "cancel" }),
  });
}
