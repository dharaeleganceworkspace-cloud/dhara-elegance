import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/Logo";
import { StoreProvider } from "@/components/store/StoreProvider";
import { CartDrawer } from "@/components/store/CartDrawer";
import { getCategories, getSettings } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <StoreProvider settings={{ shipping_fee: Number(settings?.shipping_fee ?? 0), free_shipping_min: settings?.free_shipping_min == null ? null : Number(settings.free_shipping_min) }}>
      {settings?.announcement && (
        <div className="bg-navy py-2.5 text-center text-[10px] font-semibold tracking-[0.3em] text-gold-light uppercase sm:text-[11px]">{settings.announcement}</div>
      )}
      <Header logo={<Logo />} categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <CartDrawer />
    </StoreProvider>
  );
}

function SetupNotice() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-navy p-8 text-center text-cream">
      <Logo light size={64} />
      <h1 className="heading-lux text-3xl">Almost ready</h1>
      <p className="max-w-md text-sm text-cream/70">
        Add <code className="text-gold">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-gold">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, run the migration in <code>supabase/migrations</code>, then restart the dev server. See SETUP.md.
      </p>
    </main>
  );
}
