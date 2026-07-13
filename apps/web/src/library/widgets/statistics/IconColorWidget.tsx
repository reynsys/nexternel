import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

type IconColorWidgetProps = {
  title: string
  value: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
}

export default function IconColorWidget({
  title,
  value,
  icon: Icon,
}: IconColorWidgetProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="flex items-center gap-4 p-6">
        {/* Icon */}
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-lg bg-muted flex-shrink-0`}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Text */}
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-md text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  )
}
