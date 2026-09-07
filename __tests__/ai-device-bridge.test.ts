import { describe, expect, it } from "vitest";
import { deviceLinksLater, deviceLinksNow, DEVICE_LINKS } from "../lib/ai-device-bridge";
import { getHiveCapabilities } from "../server/_core/ai-hive-capabilities";

describe("device and access bridge", () => {
  it("ships print, 3D printers, headsets, and access now", () => {
    expect(deviceLinksNow().map((d) => d.id)).toEqual(
      expect.arrayContaining([
        "document_print",
        "three_d_printer",
        "xr_headset",
        "accessibility",
        "audio_out",
        "audio_in",
        "midi_controller",
        "daw_file",
      ]),
    );
  });

  it("does not claim Bluetooth or Wi-Fi scanning of strangers", () => {
    expect(deviceLinksLater().map((d) => d.id)).toEqual(expect.arrayContaining(["bluetooth", "wifi"]));
    expect(DEVICE_LINKS.find((d) => d.id === "bluetooth")?.how).toMatch(/Never scan/i);
    expect(DEVICE_LINKS.find((d) => d.id === "audio_in")?.how).toMatch(/Nothing is uploaded/i);
    expect(DEVICE_LINKS.find((d) => d.id === "audio_in")?.how).toMatch(/Allow/i);
  });

  it("turns hive print, wireless, headset, and access flags on by default", () => {
    const hive = getHiveCapabilities("ai-3d-specialist");
    expect(hive.documentPrint).toBe(true);
    expect(hive.wirelessLink).toBe(true);
    expect(hive.xrHeadset).toBe(true);
    expect(hive.accessibility).toBe(true);
    expect(hive.longTermMemory).toBe(true);
  });
});
