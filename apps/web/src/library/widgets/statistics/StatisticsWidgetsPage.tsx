"use client"

import React, { Suspense, lazy } from "react"
import {
  Chromium,
  CreditCard,
  ShoppingCart,
  Users,
  BriefcaseBusiness,
  ShoppingBag,
  Wallet,
  Box,
  CircleCheckBig,
  DollarSign,
} from "lucide-react"

// Lazy imports
const StatCardWidgets = lazy(() => import("./StatCardWidgets"))
const IconColorWidget = lazy(() => import("./IconColorWidget"))
const ProjectProgressCard = lazy(() => import("./ProjectProgressCard"))
const GaussianStatCard = lazy(() => import("./GaussianStatCard"))

// Skeleton
function CardSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-xl bg-muted animate-pulse"
      style={{ height }}
    />
  )
}

export default function StatisticsWidgetsPage() {
  return (
    <div className="data-widgets-page">

      {/* Simple Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        <Suspense fallback={<CardSkeleton height={140} />}>
          <StatCardWidgets title="Total Visitors" value="4,582" icon={Users} />
        </Suspense>
        <Suspense fallback={<CardSkeleton height={140} />}>
          <StatCardWidgets title="Pageviews" value="15,743" icon={Chromium} />
        </Suspense>
        <Suspense fallback={<CardSkeleton height={140} />}>
          <StatCardWidgets title="Bounce Rate" value="47.8%" icon={BriefcaseBusiness} />
        </Suspense>
        <Suspense fallback={<CardSkeleton height={140} />}>
          <StatCardWidgets title="Conversion Rate" value="5.2%" icon={CircleCheckBig} />
        </Suspense>
      </div>

      {/* Icon Stats */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        <Suspense fallback={<CardSkeleton height={160} />}>
          <IconColorWidget title="Customers" value="8.549k" icon={Users} />
        </Suspense>

        <Suspense fallback={<CardSkeleton height={160} />}>
          <IconColorWidget title="Products" value="1.423k" icon={ShoppingCart} />
        </Suspense>

        <Suspense fallback={<CardSkeleton height={160} />}>
          <IconColorWidget title="Revenue" value="₹1.423k" icon={CreditCard} />
        </Suspense>

        <Suspense fallback={<CardSkeleton height={160} />}>
          <IconColorWidget title="Notifications" value="8967" icon={ShoppingBag} />
        </Suspense>
      </div>

      {/* Progress Cards */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<CardSkeleton height={200} />}>
          <ProjectProgressCard title="Mobile App Design" name="Hira R." role="UX/UI Designer" avatar="https://i.pravatar.cc/100?img=1" progress={75} progressColor="bg-primary" />
        </Suspense>

        <Suspense fallback={<CardSkeleton height={200} />}>
          <ProjectProgressCard title="eCommerce Website" name="Alex M." role="Frontend Developer" avatar="https://i.pravatar.cc/100?img=2" progress={62} progressColor="bg-primary" />
        </Suspense>

        <Suspense fallback={<CardSkeleton height={200} />}>
          <ProjectProgressCard title="Admin Dashboard" name="Sophia L." role="Product Manager" avatar="https://i.pravatar.cc/100?img=3" progress={38} progressColor="bg-primary" />
        </Suspense>
      </div>

      {/* Color Stats */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <Suspense fallback={<CardSkeleton height={160} />}>
          <GaussianStatCard
  title="Total Revenue"
  subtitle="This month"
  value="$48,260"
  trendText="+12.5% from last month"
  icon={DollarSign}
/>
        </Suspense>

        <Suspense fallback={<CardSkeleton height={160} />}>
          <GaussianStatCard
  title="New Customers"
  subtitle="This month"
  value="1,248"
  trendText="+5.4% from last week"
  icon={Users}
/>
        </Suspense>

        <Suspense fallback={<CardSkeleton height={160} />}>
          <GaussianStatCard
  title="Orders"
  subtitle="This month"
  value="8,274"
  trendText="+2.1% growth"
  icon={ShoppingCart}
/>
        </Suspense>

        <Suspense fallback={<CardSkeleton height={160} />}>
          <GaussianStatCard
  title="Total Products"
  subtitle="Inventory"
  value="1,234"
  trendText="+5.0% since last month"
  icon={Box}
/>
        </Suspense>
      </div>

    </div>
  )
}