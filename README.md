# Interactive Terminal Portfolio 🖥️

An innovative, command-line inspired web portfolio that showcases my skills and experience through an interactive terminal interface built with Angular.

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-B7178C?style=for-the-badge&logo=reactivex&logoColor=white)

## 🚀 Live Demo

[View Live Portfolio](https://joseph77lee.com) *(Update with your actual URL)*

## ✨ Features

- **Interactive Terminal Interface**: A fully functional terminal emulator in the browser
- **Command System**: Multiple commands to explore different aspects of my background
- **Syntax Highlighting**: Smart command and argument highlighting for better readability
- **Auto-completion**: Tab completion for commands (coming soon)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Downloadable Resume**: Direct PDF download through the terminal
- **Smooth Animations**: Typewriter effects and smooth transitions

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `help` | Display all available commands |
| `about` | Learn about me and my background |
| `skills` | View my technical skills and proficiencies |
| `experience` | Browse through my work experience |
| `education` | Check out my educational background |
| `summary` | Get a quick professional summary |
| `highlights` | See my key achievements |
| `contact` | Get my contact information |
| `download` | Download my resume as PDF |
| `try` | Interactive demo suggestions |
| `clear` | Clear the terminal screen |

## 🛠️ Tech Stack

- **Framework**: Angular 18
- **Language**: TypeScript
- **Styling**: SCSS with CSS Variables
- **State Management**: RxJS
- **Build Tool**: Angular CLI
- **Package Manager**: npm

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (`npm install -g @angular/cli`)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/joseph77lee.git
cd joseph77lee
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
ng serve
```

4. Open your browser and navigate to `http://localhost:4200`

### Building for Production

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## 📂 Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/         # TypeScript interfaces and models
│   │   └── services/       # Angular services (command, session)
│   ├── features/
│   │   └── terminal/       # Terminal component and related files
│   └── app.component.*     # Root component
├── assets/
│   ├── *.json             # Data files for commands
│   └── Joseph_Lee_Resume_B.pdf
└── styles.scss            # Global styles
```

## 🎨 Customization

### Updating Content

All content is stored in JSON files in the `src/assets/` directory:

- `aboutme.json` - Personal information
- `skills.json` - Technical skills
- `experience.json` - Work experience
- `education.json` - Educational background
- `summary.json` - Professional summary
- `highlights.json` - Key achievements

### Styling

The terminal uses CSS variables for easy theming. Main variables are defined in `styles.scss`:

```scss
--terminal-bg: #1a1a1a
--terminal-text: #ffffff
--terminal-accent: #4CAF50
--terminal-error: #ef5350
--terminal-warning: #FFC107
```

## 🚀 Deployment

This project can be deployed to any static hosting service:

- **GitHub Pages**: Use `ng deploy` with `angular-cli-ghpages`
- **Netlify**: Connect your GitHub repo for automatic deployments
- **Vercel**: Import your project for instant deployment
- **Firebase Hosting**: Use Firebase CLI for deployment

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/joseph77lee/issues).

## 👤 Author

**Joseph Lee**

- Portfolio: [joseph77lee.com](https://joseph77lee.com)
- GitHub: [@joseph77lee](https://github.com/joseph77lee)
- LinkedIn: [Joseph Lee](https://linkedin.com/in/joseph-lee)

## 🙏 Acknowledgments

- Inspired by classic terminal interfaces
- Built with Angular and modern web technologies
- Special thanks to all contributors and supporters

---

⭐️ If you like this project, please give it a star on GitHub!