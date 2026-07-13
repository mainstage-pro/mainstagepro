import Link from "next/link";

export interface ConfigHubItem {
  label: string;
  description: string;
  href: string;
  badge?: string;
}

export interface ConfigHubGroup {
  title?: string;
  items: ConfigHubItem[];
}

export default function ConfigHub({
  title,
  subtitle,
  groups,
}: {
  title: string;
  subtitle: string;
  groups: ConfigHubGroup[];
}) {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="ms-h1">{title}</h1>
        <p className="ms-subtitle">{subtitle}</p>
      </div>

      {groups.map((group, gi) => (
        <div key={group.title ?? gi} className="space-y-3">
          {group.title && (
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{group.title}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group ms-card p-4 hover:border-[#B3985B]/50 transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white text-sm font-semibold group-hover:text-[#B3985B] transition-colors">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] text-gray-500 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-snug">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
