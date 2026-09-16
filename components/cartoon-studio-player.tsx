import { CartoonStudioPlayerShell } from "@/components/cartoon-studio-player-shell";
import type { PublicCartoonProject } from "@/lib/cartoon-studio";

type Props = {
  project: PublicCartoonProject;
  sample?: boolean;
};

export function CartoonStudioPlayer({ project, sample = false }: Props) {
  return <CartoonStudioPlayerShell project={project} sample={sample} />;
}
