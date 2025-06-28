<!-- @format -->

# 3DPC Print Queue Management Website

A comprehensive platform for managing 3D printing requests, queues, and administration in educational and club settings. This system streamlines the workflow for students, club members, and administrators, ensuring transparency, accountability, and efficiency in 3D printing operations.

## Table of Contents

- [Features](#features)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

- **Student Print Requests:** Submit, track, and manage 3D print requests with file uploads and real-time status updates.
- **Queue Management:** Automated and manual queue handling for multiple printers and clubs.
- **Admin Panel:** Robust tools for administrators and super administrators to manage requests, users, and printers.
- **Authentication:** Secure login and role-based access using Firebase.
- **Audit & Analytics:** Full audit trails, reporting, and analytics for transparency and operational insights.
- **Notifications:** Email and in-app notifications for request updates, approvals, and completions.
- **File Management:** Secure file uploads and downloads with access controls.
- **Customizable Workflows:** Support for club-specific rules, printer configurations, and approval processes.

## User Roles

- **Student:** Submit and track print requests, view status, and receive notifications.
- **Club Admin:** Approve, reject, or manage print jobs for their club; manage club printers and members.
- **Super Admin:** Oversee all clubs, manage global settings, users, printers, and handle escalations.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express as Netlify Functions
- **Authentication:** Firebase Authentication with Google OAuth
- **Database:** Netlify Neon PostgreSQL (serverless Postgres)
- **File Storage:** Netlify Blobs for secure file storage
- **ORM:** Drizzle ORM for type-safe database access
- **Other:** TypeScript, PostCSS

## Contributing

We welcome contributions from the community! Please read our [Code of Conduct](CODE_OF_CONDUCT.md) and open an issue or pull request to get started.

We would really be grateful if you can create PRs to eradicate any vulnerabilities in the site.

## Code of Conduct

All participants are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md) to foster a welcoming and respectful environment.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- Developed and maintained by the 3DPC team.
- Special thanks to all contributors and testers.

> This site is powered by Netlify.
