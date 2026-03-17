import type { Metadata } from "next";
import { ClipEditor } from "@/components/editor/ClipEditor";

interface PageProps {
  params: Promise<{ id: string; clipId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { clipId } = await params;
  return {
    title: `Edit Clip ${clipId.slice(0, 8)}`,
  };
}

export default async function ClipEditorPage({ params }: PageProps) {
  const { id: videoId, clipId } = await params;

  return <ClipEditor clipId={clipId} videoId={videoId} />;
}
