# Detailed Projections Specification

## Purpose

Extended expense projection system providing monthly trend analysis, per-category burn rate calculations, and interactive chart visualizations with forecast lines.

## Requirements

### Requirement: Monthly Projection Calculation

The system SHALL provide `calculateMonthlyProjection(transactions, months)` returning an array of `{ month, totalIncome, totalExpenses, balance }` for each month in the window.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| 3-month window | 3 months of transactions exist | Calculation invoked | Returns 3 entries with correct income/expense totals |
| Empty transactions | No transactions in range | Calculation invoked | Returns months with zero totals |
| Future months projected | Current month has transactions | Calculating 3 months ahead | Future months show projected values using current rate |

### Requirement: Category Projection Calculation

The system SHALL provide `calculateCategoryProjections(transactions, categories)` returning per-category data: `{ categoryId, name, totalSpent, avgMonthly, daysRemaining }`.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Category with spending | 'food' category has 3 transactions | Calculation invoked | Returns totalSpent, avgMonthly, daysRemaining for food |
| Category with no spending | 'entertainment' has no transactions | Calculation invoked | Returns zeros for all fields |
| Days remaining | Category has monthly budget rate | Calculation invoked | daysRemaining = current balance / avgDailySpend |

### Requirement: Trend Analysis

The system SHALL provide `calculateTrendAnalysis(transactions, window)` returning `{ movingAverage, direction (up|down|stable), momentum (accelerating|decelerating|constant) }`.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Expenses increasing | Monthly totals: 100, 120, 150 | Trend calculated | direction='up', momentum='accelerating' |
| Expenses decreasing | Monthly totals: 200, 150, 100 | Trend calculated | direction='down', momentum='decelerating' |
| Stable expenses | Monthly totals: 100, 102, 98 | Trend calculated | direction='stable', momentum='constant' |
| Insufficient data | Fewer than 2 months of data | Trend calculated | Returns null direction and momentum |

### Requirement: Monthly Projection Chart

The system SHALL render a `MonthlyProjectionChart` component using Chart.js line chart with dashed lines for projected (future) months.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Render chart | Monthly projection data provided | Component mounts | Line chart rendered with income/expense/balance lines |
| Future month projection | Data includes future months | Chart renders | Future months rendered as dashed lines |
| Tooltip interaction | User hovers over data point | Hover event | Tooltip shows month, amount, type |
| Empty data | No projection data available | Component renders | Shows empty state message |

### Requirement: Projection Card Tabs

The system SHALL extend `ProjectionCard` with three tabs: Overview, Monthly, Category.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Default tab | ProjectionCard rendered | Component mounts | Overview tab active by default |
| Switch to Monthly | Overview tab active | User clicks Monthly tab | Monthly projection view displayed |
| Switch to Category | Monthly tab active | User clicks Category tab | Category breakdown view displayed |
| Switch back to Overview | Category tab active | User clicks Overview tab | Overview view restored |
