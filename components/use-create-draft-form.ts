import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { getDraft, saveDraft } from "@/lib/create-desk-store";
import { templateById, type CreateDraftKind } from "@/lib/create-desk";

export function useCreateDraftForm(kind: CreateDraftKind) {
  const params = useLocalSearchParams<{ template?: string; draft?: string }>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    const draftParam = typeof params.draft === "string" ? params.draft : "";
    const templateParam = typeof params.template === "string" ? params.template : "";
    void (async () => {
      if (draftParam) {
        const found = await getDraft(draftParam);
        if (cancel || !found || found.kind !== kind) return;
        setDraftId(found.id);
        setTitle(found.title);
        setBody(found.body);
        return;
      }
      const template = templateParam ? templateById(templateParam) : undefined;
      if (cancel || !template || template.kind !== kind) return;
      setTitle(template.title);
      setBody(template.body);
    })();
    return () => {
      cancel = true;
    };
  }, [kind, params.draft, params.template]);

  async function save() {
    setSaving(true);
    try {
      const saved = await saveDraft({ id: draftId, kind, title, body });
      setDraftId(saved.id);
      setNotice("Saved in Drafts on this phone or computer.");
    } catch {
      setNotice("Could not save that draft.");
    } finally {
      setSaving(false);
    }
  }

  return { title, setTitle, body, setBody, notice, setNotice, save, saving };
}
