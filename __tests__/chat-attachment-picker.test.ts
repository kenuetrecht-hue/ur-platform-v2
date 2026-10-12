import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

import { chatAttachmentSchema } from "../server/_core/chat-attachment-service";
import { pickChatAttachments } from "../lib/chat-attachment-picker";

type Listener = () => void;

function jpegFile(name = "engine.jpg"): File {
  const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  return new File([bytes], name, { type: "image/jpeg" });
}

function installDocument() {
  let last:
    | {
        input: {
          files: File[] | null;
          accept: string;
          multiple: boolean;
          capture: string | null;
        };
        fire: (name: "change" | "cancel") => void;
      }
    | undefined;

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => undefined }),
    toDataURL: () => "data:image/jpeg;base64,/9j/2Q==",
  };

  class FakeFileReader {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL(file: File) {
      void file.arrayBuffer().then((buffer) => {
        const base64 = Buffer.from(buffer).toString("base64");
        this.result = `data:${file.type || "application/octet-stream"};base64,${base64}`;
        this.onload?.();
      });
    }
  }

  const documentMock = {
    body: { appendChild: () => undefined },
    createElement: (tag: string) => {
      if (tag === "canvas") return canvas;
      const listeners: Record<string, Listener[]> = {};
      const input = {
        type: "",
        accept: "",
        multiple: false,
        files: null as File[] | null,
        capture: null as string | null,
        style: {} as Record<string, string>,
        setAttribute: (name: string, value: string) => {
          if (name === "capture") input.capture = value;
        },
        addEventListener: (name: string, fn: Listener) => {
          listeners[name] = listeners[name] ?? [];
          listeners[name].push(fn);
        },
        remove: () => undefined,
        click: () => {
          last = {
            input,
            fire: (name) => listeners[name]?.forEach((fn) => fn()),
          };
        },
      };
      return input;
    },
  };

  vi.stubGlobal("document", documentMock);
  vi.stubGlobal("FileReader", FakeFileReader);
  vi.stubGlobal("createImageBitmap", async () => ({
    width: 4000,
    height: 3000,
    close: () => undefined,
  }));

  return {
    last: () => {
      if (!last) throw new Error("The file chooser did not open.");
      return last;
    },
  };
}

const CHAT_SURFACES = [
  "components/creator-ai-interface.tsx",
  "components/personal-ai-interface.tsx",
  "components/language-ai-interface.tsx",
  "components/voice-chat-interface.tsx",
  "components/ai-creator-panel.tsx",
  "components/game-forge-learn-panel.tsx",
  "components/tech-builder-learn-panel.tsx",
];

describe("chat attachment picker", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("puts a camera photo into an attachment the chat can send", async () => {
    const dom = installDocument();
    const pending = pickChatAttachments("camera");
    const chooser = dom.last();
    expect(chooser.input.capture).toBe("environment");
    expect(chooser.input.accept).toBe("image/*");
    expect(chooser.input.multiple).toBe(false);
    chooser.input.files = [jpegFile()];
    chooser.fire("change");

    const picked = await pending;
    expect(picked).toHaveLength(1);
    expect(picked[0]?.mimeType).toBe("image/jpeg");
    expect(picked[0]?.previewUri.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(picked[0]?.base64.startsWith("/9j/")).toBe(true);
    expect(() =>
      chatAttachmentSchema.parse({
        mimeType: picked[0]?.mimeType,
        base64: picked[0]?.base64,
        fileName: picked[0]?.fileName,
      }),
    ).not.toThrow();
  });

  it("loads a PDF and a short text file into the chat", async () => {
    const dom = installDocument();
    const pending = pickChatAttachments("files");
    const chooser = dom.last();
    expect(chooser.input.accept).toContain("application/pdf");
    expect(chooser.input.accept).toContain("text/plain");
    chooser.input.files = [
      new File([Uint8Array.from([0x25, 0x50, 0x44, 0x46])], "manual.pdf", {
        type: "application/pdf",
      }),
      new File(["spark plug gap"], "notes.txt", { type: "" }),
    ];
    chooser.fire("change");

    const picked = await pending;
    expect(picked.map((file) => file.mimeType)).toEqual(["application/pdf", "text/plain"]);
    expect(picked[1]?.fileName).toBe("notes.txt");
    expect(picked[0]?.previewUri.startsWith("data:application/pdf;base64,")).toBe(true);
    for (const file of picked) {
      expect(() =>
        chatAttachmentSchema.parse({
          mimeType: file.mimeType,
          base64: file.base64,
          fileName: file.fileName,
        }),
      ).not.toThrow();
    }
  });

  it("leaves the chat empty when the camera is cancelled", async () => {
    const dom = installDocument();
    const pending = pickChatAttachments("camera");
    dom.last().fire("cancel");
    await expect(pending).resolves.toEqual([]);
  });

  it("refuses a Word document the model cannot read", async () => {
    const dom = installDocument();
    const pending = pickChatAttachments("files");
    const chooser = dom.last();
    chooser.input.files = [
      new File(["PK"], "notes.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ];
    chooser.fire("change");
    await expect(pending).rejects.toThrow(/photo, PDF, or text file/);
  });

  it("shows the camera and file buttons on every AI chat", () => {
    for (const relative of CHAT_SURFACES) {
      const source = fs.readFileSync(path.join(process.cwd(), relative), "utf8");
      expect(source, relative).toContain("ChatAttachButtons");
      expect(source, relative).toContain("ChatPendingAttachments");
    }
    const creator = fs.readFileSync(
      path.join(process.cwd(), "components/creator-ai-interface.tsx"),
      "utf8",
    );
    expect(creator).not.toContain("supportsPhotoAnalysis");
  });
});
