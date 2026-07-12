# UR Platform - Complete Project Requirements

**IMPORTANT: This is the master requirements document. DO NOT LOSE THIS. Refer to this document for all platform specifications.**

---

## Platform Overview

UR is a **Construction & Creative Platform** that connects users with AI content creators and human experts across multiple fields. The platform features a collaborative 3D workspace where construction professionals can work together on blueprints and projects.

---

## AI Content Creators (11 Specialists)

### Construction & Trades (8 AIs)
1. **Plumber AI** — Plumbing expertise, water systems, fixtures
2. **Electrician AI** — Electrical systems, wiring, safety codes
3. **Welder AI** — Welding techniques, materials, safety
4. **Roofer AI** — Roofing systems, materials, installation
5. **Dry Waller AI** — Drywall installation, finishing, repairs
6. **Framer AI** — Framing techniques, structural design
7. **HVAC Technician AI** — Heating, cooling, ventilation systems
8. **Landscaper AI** — Landscaping design, photo-to-3D conversion for outdoor spaces

### Creative & Technical (3 AIs)
9. **Coder AI** — Programming, coding, software development
10. **3D Printing AI** — 3D model design, optimization for printing, materials
11. **Content Creator AI** — Helps users create books, poems, songs, PDFs, and other documents

---

## Core Platform Features

### 1. 3D Collaborative Workspace
- Shared 3D room where construction workers can collaborate in real-time
- Multiple users can work together on the same blueprint
- Real-time updates and synchronization
- Version control and history tracking
- Blueprint creation and editing tools

### 2. Photo-to-3D Conversion Technology
- **Landscaper AI** — Takes phone photos and converts landscaping areas to 3D models for redesign
- **All Construction AIs** — Have the same photo-to-3D ability for their specialties:
  - Plumber: Convert photos to 3D plumbing layouts
  - Electrician: Convert photos to 3D electrical system designs
  - Welder: Convert photos to 3D structural designs
  - Roofer: Convert photos to 3D roof designs
  - Dry Waller: Convert photos to 3D wall layouts
  - Framer: Convert photos to 3D framing designs
  - HVAC: Convert photos to 3D HVAC system designs

### 3. Payment System

#### Stamps (Paid Currency)
- **Bundle:** 10 stamps for $4.99
- **First Purchase Bonus:** 5 free bonus stamps
- **Usage:** 2 stamps per individual AI chat (if no loyalty points)
- **Purchases under $4.99:** Must use stamps
- **Purchases $4.99+:** Can use Stripe (credit card)

#### Loyalty Points (Free Currency)
- **Earning:** Users earn loyalty points through actions (TBD - to be determined with user)
- **Usage:** Free individual AI chats (cost per chat: TBD)
- **Double Value:** If user has no stamps, loyalty points are worth 2x value for AI chats
- **Membership:** Can be used for membership purchases under $4.99

#### Membership Tiers
- **Day Membership:** $4.99 (Stripe payment, no stamps needed)
- **Week Membership:** $? (TBD - Stripe if ≥$4.99, stamps if <$4.99)
- **Month Membership:** $? (TBD - Stripe if ≥$4.99, stamps if <$4.99)
- **Year Membership:** $? (TBD - Stripe if ≥$4.99, stamps if <$4.99)

**Membership Benefits:**
- Unlimited access to selected AI content creator for the membership duration
- No per-chat costs during active membership

### 4. Human Content Creators
- Real people offering expertise in various fields
- Profiles with credentials and verification
- Integration with payment system
- Availability and scheduling (TBD)

---

## Payment Logic (CRITICAL)

### Individual AI Chats
1. **If user has loyalty points** → Use loyalty points (free)
2. **If user has NO loyalty points but has stamps** → Use 2 stamps per chat
3. **If user has neither** → Prompt to buy stamps or earn loyalty points

### Memberships
- **Price ≥ $4.99** → Pay with Stripe (credit card)
- **Price < $4.99** → Must use stamps

### Stamp Purchases
- **All stamp purchases** → Use Stripe (credit card)

---

## User Experience Flow

### New User Onboarding
1. Sign up / Login
2. Receive 5 bonus stamps on first action
3. Browse AI content creators
4. Try free chat with loyalty points (if available)
5. Option to buy stamps or membership
6. Access 3D workspace and photo-to-3D tools

### Existing User Flow
1. Login
2. View stamp balance and loyalty points
3. Choose AI creator to chat with
4. Use loyalty points or stamps for chat
5. Or purchase membership for unlimited access
6. Access 3D workspace for collaborative projects

---

## Technical Infrastructure (Already Built)

### Phase 1 - Critical Systems (5)
- Advanced Error Logging & Monitoring
- Request Validation & Sanitization
- Transaction Manager for Data Consistency
- Graceful Shutdown & Startup
- Health Checks & Monitoring

### Phase 2 - Important Systems (5)
- Automated Backup & Disaster Recovery
- Rate Limiting & Quota Management
- Cache Invalidation & Coherence
- Queue & Job Processing
- Security Hardening & DDoS Protection

---

## Implementation Roadmap

### Phase 1: Payment Infrastructure
- [ ] Stamps system with Stripe integration
- [ ] Loyalty points framework
- [ ] Membership system
- [ ] Payment routing logic

### Phase 2: AI Content Creators (One at a time)
- [x] Plumber AI
- [ ] Electrician AI
- [ ] Welder AI
- [ ] Roofer AI
- [ ] Dry Waller AI
- [ ] Framer AI
- [ ] HVAC Technician AI
- [ ] Landscaper AI
- [ ] Coder AI
- [ ] 3D Printing AI
- [ ] Content Creator AI

### Phase 3: 3D Workspace & Photo-to-3D
- [ ] 3D collaborative workspace
- [ ] Photo-to-3D conversion engine
- [ ] Integration with all AIs
- [ ] Real-time collaboration features

### Phase 4: Human Content Creators
- [ ] Creator profiles and verification
- [ ] Scheduling and availability
- [ ] Payment integration
- [ ] Review and rating system

---

## Core AI Capabilities (LOCKED IN)

### All AI Content Creators Will Have:

**1. Self-Learning Abilities**
- Learn from every user interaction
- Adapt to user expertise level (beginner to expert)
- Remember user preferences and history
- Improve recommendations over time
- Web search integration for latest information and techniques
- Stay updated on industry changes and advancements

**2. Troubleshooting Capabilities**
- Diagnose problems from user descriptions
- Analyze photos to identify issues visually
- Provide root cause analysis
- Suggest multiple solutions with pros/cons
- Escalate to human professionals when needed
- Learn from troubleshooting outcomes

**3. Problem-Solving Skills**
- Break down complex problems into manageable steps
- Provide creative and practical solutions
- Adapt solutions to user constraints and resources
- Collaborate with other AIs to solve complex issues
- Track problem-solving success rates
- Improve solutions based on user feedback

**4. Distinct Identity in 3D Mode**
- Each AI has unique voice (senior veteran tone)
- Realistic animated appearance with AI badge
- Holds tools relevant to their specialty
- User's logo displayed in background
- Clearly identifiable by appearance and voice

**5. Collaborative Abilities**
- Work together with other AIs in 3D workspace
- Share information and insights
- Coordinate solutions for complex projects
- Real-time communication with other specialists

**6. Certification & Learning Support**
- Provide study materials for certifications
- Help prepare for licensing exams
- Track user progress
- Do NOT issue certifications (users must pass official exams)
- Enable users to become licensed in their field

---

## Key Decisions (TBD - To Be Determined)

1. **Loyalty Points Earning:** How do users earn loyalty points? (referrals, daily login, watching ads, content creation, purchases, etc.?)
2. **Loyalty Points Value:** How many loyalty points per individual AI chat?
3. **Week Membership Price:** $? (determines if stamps or Stripe)
4. **Month Membership Price:** $? (determines if stamps or Stripe)
5. **Year Membership Price:** $? (determines if stamps or Stripe)
6. **Human Creator Payment:** How are human creators paid? Commission structure?
7. **3D Workspace Collaboration:** Real-time or asynchronous?
8. **Photo-to-3D Accuracy:** What level of detail/accuracy needed?

---

## Notes

- This is the MASTER requirements document
- All AI creators must have photo-to-3D capability
- All construction AIs can work together in the 3D workspace
- Payment system must be bulletproof (infrastructure already built)
- Never lose this list again - refer to this document

---

**Last Updated:** June 1, 2026
**Status:** LOCKED IN - DO NOT MODIFY WITHOUT USER APPROVAL
