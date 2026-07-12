# UR Platform - App Structure & Navigation

## Architecture Overview

The app is structured as **completely isolated pages** with **zero dependencies** between features. Each page is self-contained and can be accessed independently.

## Directory Structure

```
app/
├── _layout.tsx                    ← Root layout with OnboardingProvider
├── (tabs)/
│   ├── _layout.tsx               ← Tab navigation router
│   ├── index.tsx                 ← Home/Dashboard (Tab 1)
│   ├── showcase.tsx              ← Feature Showcase (Tab 2)
│   └── settings.tsx              ← Settings (Tab 3)
│
├── features/
│   ├── screens/
│   │   ├── home-screen.tsx       ← Home dashboard
│   │   ├── onboarding-screen.tsx ← Onboarding flow
│   │   ├── admin-dashboard.tsx   ← Admin safety dashboard
│   │   └── landscaping-master.tsx ← Landscaping design
│   │
│   ├── ai-agents/
│   │   ├── real-estate-screen.tsx
│   │   ├── coder-screen.tsx
│   │   ├── marketing-screen.tsx
│   │   ├── finance-screen.tsx
│   │   ├── hr-screen.tsx
│   │   ├── sales-screen.tsx
│   │   ├── operations-screen.tsx
│   │   ├── customer-service-screen.tsx
│   │   ├── product-screen.tsx
│   │   ├── legal-screen.tsx
│   │   └── content-creator-screen.tsx
│   │
│   ├── systems/
│   │   ├── physics-demo.tsx      ← Physics simulation demo
│   │   ├── voice-demo.tsx        ← Voice streaming demo
│   │   ├── avatar-demo.tsx       ← Avatar animation demo
│   │   ├── learning-demo.tsx     ← AI learning demo
│   │   └── knowledge-demo.tsx    ← Knowledge integration demo
│   │
│   └── safety/
│       ├── content-safety-demo.tsx
│       ├── ethics-demo.tsx
│       ├── monitoring-demo.tsx
│       ├── disclaimers-demo.tsx
│       └── entrepreneurial-demo.tsx
│
└── components/
    ├── feature-card.tsx          ← Reusable feature card
    ├── page-header.tsx           ← Reusable page header
    ├── demo-section.tsx          ← Reusable demo section
    └── navigation-breadcrumb.tsx ← Navigation breadcrumb
```

## Navigation Flow

### Tab Navigation (Main Entry Points)
1. **Home Tab** — Dashboard with quick access
2. **Showcase Tab** — Feature showcase with all pages
3. **Settings Tab** — User settings and preferences

### Feature Pages (Completely Isolated)

Each feature page:
- ✅ Has its own state management (no shared state)
- ✅ Has its own data fetching (no API conflicts)
- ✅ Has its own navigation (no router conflicts)
- ✅ Can be accessed independently
- ✅ Has a back button to return to showcase
- ✅ Has no dependencies on other pages

### Page Categories

#### Screens (5 pages)
- Home Screen
- Onboarding Screen
- Admin Dashboard
- Landscaping Master
- Voice Conversation Player

#### AI Agents (11 pages)
- Real Estate Master
- Coder AI
- Marketing Master
- Finance Master
- HR Master
- Sales Master
- Operations Master
- Customer Service Master
- Product Master
- Legal Master
- Content Creator

#### Systems (5 pages)
- Physics Simulation Engine
- Voice Streaming Service
- Avatar Animation Sync
- AI Learning Engine
- Knowledge Integration

#### Safety (5 pages)
- Content Safety System
- Ethical Guidelines
- Usage Monitoring
- Disclaimers & Transparency
- Entrepreneurial Focus

## Navigation Rules

### Rule 1: No Shared State
- Each page manages its own state with `useState`
- No Context API for feature-specific data
- Global Context only for: Theme, Auth, Onboarding

### Rule 2: No Cross-Page Dependencies
- Pages don't import from other feature pages
- Pages don't call other pages' functions
- Pages don't share data with other pages

### Rule 3: Independent Data Fetching
- Each page fetches its own data
- No shared API calls
- No shared data stores

### Rule 4: Clean Navigation
- All pages have a header with back button
- All pages have breadcrumb navigation
- All pages have clear page title

### Rule 5: Error Isolation
- Errors in one page don't affect others
- Each page has its own error boundary
- Each page has its own error handling

## Implementation Pattern

### Page Template
```tsx
import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export function FeaturePage() {
  const colors = useColors();
  const [state, setState] = useState(initialState);

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="mb-4">
        <Text className="text-3xl font-bold text-foreground">Feature Name</Text>
        <Text className="text-muted">Feature description</Text>
      </View>

      {/* Content */}
      <ScrollView className="flex-1">
        {/* Page content here */}
      </ScrollView>
    </ScreenContainer>
  );
}
```

## Benefits

✅ **Zero Bugs** — No cross-page conflicts
✅ **Easy Debugging** — Issues are isolated to one page
✅ **Fast Development** — Work on pages independently
✅ **Easy Testing** — Test each page in isolation
✅ **Scalable** — Add new pages without affecting others
✅ **Maintainable** — Clear structure and dependencies
✅ **User-Friendly** — Smooth navigation between pages

## Next Steps

1. Create individual page files for each feature
2. Implement clean navigation router
3. Add breadcrumb navigation
4. Test all pages for bugs
5. Deploy with confidence
