import { Header } from "@/components/Header";
import { DropViewer } from "@/components/DropViewer";

interface DropPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: DropPageProps) {
  const { code } = await params;
  return {
    title: `Download Drop ${code.toUpperCase()} | LinkDrop`,
    description: `Claim and download temporary file drop ${code.toUpperCase()} securely on LinkDrop.`,
  };
}

export default async function DropPage({ params }: DropPageProps) {
  const { code } = await params;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glowing mesh */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <DropViewer code={code} />
      </main>

      <footer className="w-full border-t border-slate-900/80 py-6 text-center text-xs text-slate-500">
        <p>LinkDrop &bull; Ephemeral & encrypted file sharing &bull; All files expire automatically</p>
      </footer>
    </div>
  );
}
