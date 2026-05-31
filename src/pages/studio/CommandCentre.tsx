import { useEffect, useState } from "react";
import { fetchPublishedPosts } from "../../lib/insights";
import { useAuth } from "../../lib/auth-context";

function firstName(profile: { full_name: string | null; email: string | null }) {
  if (profile.full_name) return profile.full_name.split(" ")[0];
  return profile.email?.split("@")[0] ?? "there";
}

export function CommandCentre() {
  const { profile } = useAuth();
  const [published, setPublished] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const posts = await fetchPublishedPosts();
        if (active) setPublished(posts.length);
      } catch {
        if (active) setPublished(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-content">
      <p className="eyebrow">Studio · Command Centre</p>
      <h1 className="mt-4 font-heading font-black text-xl sm:text-2xl text-content">
        {profile ? `Hello, ${firstName(profile)}.` : "Command Centre"}
      </h1>
      <p className="mt-4 max-w-prose text-md text-muted">
        This is the back office. The foundation is in — auth, roles, and the
        shell. Modules land here next, starting with the Insights editor.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Stat
          label="Insights published"
          value={published === null ? "—" : String(published)}
        />
        <Stat label="Drafts" value="—" hint="Editor coming in 2b" />
        <Stat label="Clients" value="—" hint="Module coming soon" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border border-line rounded-lg p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="num mt-2 font-heading font-bold text-xl text-content">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
