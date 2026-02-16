import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import UploadPageClient from "./UploadPageClient";

export default async function UploadPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/?upload=signin");
  }
  return <UploadPageClient />;
}
