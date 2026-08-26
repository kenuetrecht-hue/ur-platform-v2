import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { JobsiteConsole } from "@/components/jobsite-console";

export default function JobsiteScreen() {
  return (
    <ScreenContainer className="bg-background">
      <TabScreenHeader
        icon="🏗️"
        title="Jobsite & Office"
        subtitle="Clock, inventory, and equipment — the site reports in, the office decides."
      />
      <JobsiteConsole />
    </ScreenContainer>
  );
}
