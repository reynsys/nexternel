"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LucideIcon, MoreVertical } from "lucide-react"

type GaussianStatCardProps = {
  title: string
  subtitle?: string
  value: string
  trendText?: string
  icon: LucideIcon
  showMenu?: boolean
}

export default function GaussianStatCard({
  title,
  subtitle,
  value,
  trendText,
  icon: Icon,
  showMenu = true,
}: GaussianStatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-md text-muted-foreground">
              {title}
            </p>

            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  View Details
                </DropdownMenuItem>

                <DropdownMenuItem>
                  Export
                </DropdownMenuItem>

                <DropdownMenuItem>
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Value */}
        <div className="flex items-center gap-4">
          <div
            className="
              flex h-12 w-12 items-center justify-center
              rounded-xl
              bg-muted
              border border-border
              text-foreground
              shrink-0
            "
          >
            <Icon className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold leading-none">
              {value}
            </h2>

            {trendText && (
              <p className="text-sm text-muted-foreground mt-2">
                {trendText}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}