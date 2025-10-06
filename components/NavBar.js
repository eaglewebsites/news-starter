// components/NavBar.js
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function NavBar({ items = [] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <nav aria-label="Main">
      {/* Desktop */}
      <ul className="hidden items-center gap-4 md:flex">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.slug && pathname?.startsWith(`/section/${item.slug}`))

        return (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  'inline-flex items-center rounded-lg px-3 py-2 text-sm transition',
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>

      {/* Mobile */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
          className="inline-flex items-center rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Menu
          <svg
            className="ml-2 h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <ul
            id="mobile-menu"
            className="absolute left-0 right-0 mt-2 w-full border-b bg-white/95 p-2 shadow-sm backdrop-blur"
          >
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.slug && pathname?.startsWith(`/section/${item.slug}`))

              return (
                <li key={item.href} className="p-1">
                  <a
                    href={item.href}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-sm',
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </nav>
  )
}
