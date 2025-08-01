# Requirements - joseph77lee.com Interactive Portfolio

## 🌟 Overview

This project is a personal interactive portfolio website built with Angular 20 and Tailwind CSS. It is intended to showcase Joseph Lee's professional background in a memorable, developer-centric format. The UI simulates a terminal interface where users can type commands to reveal specific information.

The target audience includes recruiters, hiring managers, and collaborators who may arrive via LinkedIn, resume links, or personal referrals.

## 📊 Objectives

- Present Joseph Lee's career history and technical background in an engaging, interactive way.
- Emphasize front-end development skills, especially Angular, TypeScript, and UI/UX thinking.
- Allow users to explore information at their own pace using command-line style inputs.

## 📆 Features

### Terminal-Style Interface
- Central terminal window in the layout (desktop & mobile responsive)
- Simulated prompt (e.g., `>` symbol) where users can type commands
- Intro message: "Type `help` to begin"

### Supported Commands
Each command triggers output related to Joseph's profile:

- `help` – Shows available commands and brief descriptions
- `summary` – Overview of Joseph Lee's profile and career path
- `skills` – Lists technical skills in frontend, backend, tools, and principles
- `experience` – Outputs chronological work history
- `education` – Displays educational background
- `highlights` – Shows strengths related to hiring position or industry
- `download` – Provides a downloadable PDF version of the resume

### Interactive Output
- Long outputs (e.g., `experience`) should show section-by-section
- Each section ends with a `continue` button or prompt
- After full content is shown, user can enter another command

## 🛠️ Technical Requirements

### Stack
- Framework: Angular 20 (Standalone API)
- Language: TypeScript
- Styling: Tailwind CSS
- State Management: Component-level + Service with RxJS
- Animation: Angular Animations (if needed)
- Hosting: Firebase Hosting, Netlify or similar

### Structure
- Command parser service to interpret user input
- Output components for each command
- Responsive layout (mobile/tablet/desktop)
- Accessibility (keyboard support, focus states)

## 🌐 Content Source

All data is derived from Joseph Lee's resume. Information will be structured into modular formats such as:
- `summary.json`
- `skills.json`
- `experience.json`
- `education.json`
- `highlights.json`

These can be stored in the `assets/` folder or fetched via a local API service.

## 🚀 User Flow

1. Page loads with terminal prompt and "Type `help` to begin"
2. User types command (e.g., `summary`)
3. Content for that command is rendered inside terminal window
4. If long, user is prompted to click `continue` to see next part
5. After display completes, user can enter another command

## 🔄 Future Enhancements

- Command auto-suggestions as the user types
- Typing animation for output (typewriter effect)
- Theme toggle (dark/light mode)
- Command history navigation with up/down arrow keys
- Download resume PDF command (`download`)

---

This project demonstrates Joseph Lee's frontend expertise through a creative, functional portfolio interface built with tools he's strongest with: Angular, TypeScript, and clean UI structure.

