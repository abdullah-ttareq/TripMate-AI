import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export default async function Footer() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <footer className="border-t border-line py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 text-sm text-muted sm:px-8">
        <p>{t.footer.rights}</p>

        <p className="text-xs">{t.footer.photos}</p>
      </div>
    </footer>
  );
}
