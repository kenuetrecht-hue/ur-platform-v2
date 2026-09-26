import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { CreateDeskScreen, DeskField, DeskLink, DeskNotice, DeskPrimary, WashCopy } from "@/components/create-desk-screen";
import { deskWeekdayLabel, weekDates } from "@/lib/create-desk";
import { loadCalendar, saveCalendarNotes } from "@/lib/create-desk-store";

export default function CreateCalendarScreen() {
  const router = useRouter();
  const days = weekDates();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    void loadCalendar().then((saved) => {
      if (!cancel) setNotes(saved);
    });
    return () => {
      cancel = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      await saveCalendarNotes(notes);
      setNotice("This week is saved on this phone or computer.");
    } catch {
      setNotice("Could not save the calendar.");
    } finally {
      setSaving(false);
    }
  }

  const plan = days
    .map((day) => `${deskWeekdayLabel(day)}: ${notes[day]?.trim() || "open"}`)
    .join("\n");

  return (
    <CreateDeskScreen
      icon="📅"
      title="Calendar"
      subtitle="Seven days. Write what you will post on each one."
    >
      <WashCopy>This is your posting week. It stays on this device until you change it.</WashCopy>
      {days.map((day) => (
        <DeskField
          key={day}
          label={deskWeekdayLabel(day)}
          value={notes[day] ?? ""}
          onChangeText={(value) => setNotes((current) => ({ ...current, [day]: value }))}
          placeholder="What goes out this day?"
          maxLength={240}
        />
      ))}
      <DeskNotice message={notice} />
      <DeskPrimary label="Save week" onPress={() => void save()} loading={saving} />
      <DeskLink
        label="Ask ContentMate to shape the week"
        onPress={() =>
          router.push({
            pathname: "/ai/[creatorId]",
            params: {
              creatorId: "contentmate",
              prompt: `Here is my posting week. Tighten each day into one clear post idea:\n${plan}`,
            },
          })
        }
      />
    </CreateDeskScreen>
  );
}
