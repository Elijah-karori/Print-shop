import Link from 'next/link';
import { listPackages, listParts, type ServicePackage, type Part } from '@/lib/api';

const CADENCE_LABEL: Record<ServicePackage['cadence'], string> = {
  one_time: 'ONE-TIME',
  monthly: 'MONTHLY',
  quarterly: 'QUARTERLY',
  annual: 'ANNUAL',
};

export default async function ShopPage() {
  let packages: ServicePackage[] = [];
  let packagesError = false;
  try {
    packages = await listPackages();
  } catch {
    packagesError = true;
  }

  let parts: Part[] = [];
  let partsError = false;
  try {
    parts = await listParts();
  } catch {
    partsError = true;
  }

  return (
    <div className="space-y-14">
      <div>
        <p className="font-mono text-xs tracking-widest text-diag">STOREFRONT</p>
        <h1 className="mt-2 font-mono text-2xl text-ink">Parts &amp; service packages</h1>
        <p className="mt-2 text-sm text-inkMuted">
          Pay by M-Pesa Till — you&apos;ll get an STK prompt on your phone at checkout.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-mono text-xs tracking-wider text-amber">SERVICE PACKAGES</h2>
        {packagesError && (
          <p className="rounded border border-line bg-surface px-4 py-3 text-sm text-inkMuted">
            Couldn&apos;t load service packages right now — check that the API is running.
          </p>
        )}
        {!packagesError && packages.length === 0 && (
          <p className="text-sm text-inkMuted">No active packages right now.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <ProductCard
              key={pkg.id}
              name={pkg.name}
              blurb={pkg.description}
              priceLabel={`KES ${pkg.price_kes.toLocaleString()}`}
              tag={CADENCE_LABEL[pkg.cadence]}
              href={`/shop/checkout?type=service_package&ref=${pkg.id}&desc=${encodeURIComponent(pkg.name)}&amount=${pkg.price_kes}`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-mono text-xs tracking-wider text-amber">SPARE PARTS</h2>
        {partsError && (
          <p className="rounded border border-line bg-surface px-4 py-3 text-sm text-inkMuted">
            Couldn&apos;t load spare parts right now — check that the API is running.
          </p>
        )}
        {!partsError && parts.length === 0 && (
          <p className="text-sm text-inkMuted">Nothing in stock right now — check back soon.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {parts.map((part) => (
            <ProductCard
              key={part.id}
              name={part.name}
              blurb={part.description}
              priceLabel={`KES ${part.price_kes.toLocaleString()}`}
              tag={part.stock_qty <= 2 ? `${part.stock_qty} LEFT` : undefined}
              href={`/shop/checkout?type=spare_part&ref=${part.id}&desc=${encodeURIComponent(part.name)}&amount=${part.price_kes}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductCard({
  name,
  blurb,
  priceLabel,
  tag,
  href,
}: {
  name: string;
  blurb?: string;
  priceLabel: string;
  tag?: string;
  href: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded border border-line bg-surface p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-mono text-sm text-ink">{name}</h3>
          {tag && (
            <span className="whitespace-nowrap rounded border border-amber/40 bg-amber/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-amber">
              {tag}
            </span>
          )}
        </div>
        {blurb && <p className="mt-2 text-sm text-inkMuted">{blurb}</p>}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <span className="font-mono text-sm text-diag">{priceLabel}</span>
        <Link
          href={href}
          className="rounded border border-diag bg-diag/10 px-3 py-1.5 font-mono text-xs text-diag transition-colors hover:bg-diag/20"
        >
          BUY →
        </Link>
      </div>
    </div>
  );
}
