# **App Name**: Retail Sales Training Hub

## Core Features:

- User Authentication: Allow users to register and log in via Google Sign-In or email/password, storing user details and authentication status in Firestore. Differentiate Google Auth Users and Direct Users
- Onboarding Process: Guide new users through a multi-step onboarding process to collect personal and work details, store preferences, and employment verification (optional step to verify employment with 5 digit code via Email), saved to Firestore.
- Home Page: Display a hero image and list available training courses (online, ILT, VILT). Employment-verified users can view a VIP content section.
- Navigation Menu: Implement a left navigation menu with Home, My Learning, Social (verified users only), Champions (verified users in program), and Manage (admin users only) options.
- User Profile: A user profile page to show their details (name, email, verification status) and allow for edits. Enable users to join or leave the Champions program from this page, as well as initiate Employment verification, if their Work Email changes.
- Manage Section: Admin interface for managing users, application configuration (theme, color, font), and setup data in Firestore.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to represent trust and professionalism.
- Background color: Very light blue (#E8EAF6). This color is a lighter, desaturated variant of the primary blue to ensure contrast.
- Accent color: Purple (#7E57C2) for a modern and engaging look.
- Headline font: 'Space Grotesk' sans-serif for titles. Body text: 'Inter' sans-serif.
- Code Font: 'Source Code Pro' monospaced, in case any code needs to be shown
- Use clean and modern icons representing learning, community, and rewards.
- Clean and intuitive layout with a top banner, left navigation, and card-based content display.