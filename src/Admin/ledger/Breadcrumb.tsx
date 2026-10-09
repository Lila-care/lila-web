import { Fragment } from "react";
import { Link } from "wouter";

export interface BreadcrumbItem {
  label: string;
  // Omit href on the current page (last item).
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb" className="min-w-0">
      <ol className="type-body-sm flex min-w-0 flex-wrap items-center gap-x-2 text-text-secondary">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && <li aria-hidden="true">›</li>}
            <li className="min-w-0">
              {item.href ? (
                <Link
                  href={item.href}
                  className="rounded-xs focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                  {/* Color on the child: index.css has an unlayered `a:hover { color }`. */}
                  <span className="text-text-secondary hover:text-teal-700">
                    {item.label}
                  </span>
                </Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
