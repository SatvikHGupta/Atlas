<div align="center">

# Atlas

**A modern platform for Data Structures, Algorithms, and Competitive Programming**

*14,500+ curated problems • AI-powered explanations • Structured learning roadmap*

</div>

---

## Overview

Atlas is a learning platform designed to help students and competitive programmers master **Data Structures & Algorithms (DSA)** through a structured, topic-based learning experience.

The platform combines a curated collection of programming problems with AI-generated educational content, comprehensive notes, and progress tracking, making it easier to understand concepts rather than simply memorize solutions.

Atlas currently includes over **14,500 curated problems** from platforms including **LeetCode**, **Codeforces**, and **CSES**.

---

## Features

### AI-Powered Explanations

Every DSA problem includes:

- Concise explanation
- Detailed concept breakdown
- Step-by-step dry run
- Time and space complexity analysis (currently only for JS)
- Algorithmic solution
- Optimal solution

### Structured Roadmap

- Eight progressive learning levels
- Topic-based progression
- Automatic level unlocking
- Guided learning path

### Competitive Programming

- 10,000+ Codeforces problems (only link)
- Solve and attempt tracking
- Advanced filtering and search

### Notes

Comprehensive study notes covering the major topics in Data Structures and Algorithms.

### Dashboard

Track your learning through:

- Daily streaks
- Activity heatmap
- Weekly goals
- Topic-wise progress
- Overall statistics

### Cross-Device Sync

Signed-in users can synchronize:

- Progress
- Roadmap completion
- Bookmarks
- History

using Firebase.

---

## Authentication

### Available without an account

- Browse DSA problems
- Browse Competitive Programming problems
- Read notes

### Requires an account

- Dashboard
- Roadmap progression
- Bookmarks
- History
- Cross-device synchronization

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19, Vite |
| State Management | Zustand |
| Data Fetching | TanStack Query |
| Animations | Framer Motion |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Data Storage | Static JSON |
| Performance | Web Workers |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- Firebase project
- Cloud Firestore enabled
- Google Authentication enabled

### Installation

```bash
git clone https://github.com/<username>/atlas.git
cd atlas
npm install
```

### Environment Variables

Create a `.env` file using `.env.example`.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:rules
```

---


## Disclaimer

Atlas is an independent educational project.

References to third-party platforms, including LeetCode, Codeforces, and CSES, are provided solely for educational purposes. All trademarks, service marks, and other intellectual property belong to their respective owners. Atlas is not affiliated with, endorsed by, or sponsored by any of these platforms.

AI-generated explanations and solutions are intended to support learning and may occasionally contain inaccuracies. Users are encouraged to verify information independently when accuracy is critical.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Copyright

Copyright © 2026 Satvik Hemant Gupta.

The source code in this repository is licensed under the MIT License. Third-party trademarks, platform names, problem statements, and other proprietary content remain the property of their respective owners and are not covered by the MIT License.

---

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

For significant changes, please open an issue to discuss the proposed changes before submitting a pull request.

---

## Acknowledgements

Atlas is built using the following open-source technologies:

- React
- Vite
- Firebase
- Zustand
- TanStack Query
- Framer Motion

Special thanks to the competitive programming community for inspiring this project.

---

<div align="center">

Built with ❤️ by Satvik Hemant Gupta

</div>