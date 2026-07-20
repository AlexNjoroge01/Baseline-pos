"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

/**
 * Product thumbnail. Renders the image when a URL is present and loads; otherwise
 * falls back to the product's initials on a blue tint — so sellers always have a
 * visual anchor, even for products without a photo. Plain <img> (not next/image)
 * so arbitrary external URLs and local SVGs both work without host config.
 */
export function ProductImage({
  src,
  name,
  className,
  rounded = "rounded-md",
}: {
  src: string | null | undefined
  name: string
  className?: string
  rounded?: string
}) {
  const [errored, setErrored] = React.useState(false)
  const showImg = src && !errored

  return (
    <div
      className={cn(
        // default text size controls the fallback-initials size; callers override
        // with a text-* utility (twMerge keeps the last one).
        "flex shrink-0 items-center justify-center overflow-hidden bg-accent text-sm text-primary",
        rounded,
        className
      )}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="font-display font-semibold">{initials(name)}</span>
      )}
    </div>
  )
}
