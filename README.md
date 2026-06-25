<!---

	Copyright (c) 2009, 2018 Robert Bosch GmbH and its subsidiaries.
	This program and the accompanying materials are made available under
	the terms of the Bosch Internal Open Source License v4
	which accompanies this distribution, and is available at
	http://bios.intranet.bosch.com/bioslv4.txt

-->

# BassNext Web

## Overview

BASS-Next (Bosch After Sales Service) is a Single Page Application (SPA) designed to streamline the tool repair process at Authorized Service Centers. This modern web application provides an efficient interface for service technicians to manage and track repair workflows. For comprehensive details about the project, visit our [internal documentation](https://bosch-pt.atlassian.net/wiki/spaces/PTASS/pages/13164314627/BASS+About+the+Product).

BASS-Next is built with React.js and TypeScript, designed for superior user experience and developer productivity. In addition to our own components the project leverages the following component libraries:

### Component Libraries

- **Pro360 Web Components**: [Storybook](https://internal.dev.pro360.bosch-professional.com/storybook/?path=/docs/introduction--docs)
- **FROK React Components**: [Storybook](https://frok-react.ui.bosch.tech/?path=/docs)

### Related Repositories

- [Frontend Kit (NPM)](https://github.boschdevcloud.com/rb-ui/frontend.kit-npm)
- [FROK React Wrapper (NPM)](https://github.boschdevcloud.com/rb-ui/frok.react.wrapper-npm)
- [Pro360 Web Common](https://dev.azure.com/pt-iot/pro360inventory/_git/pro360.web.common)

> Note: For Pro360 repository access, please contact the product owner or senior developers who can facilitate communication with the Pro360 development team. This library is not being used as a dependency.

## .npmrc Configuration

This project uses two npm registries:

1. **Azure Artifacts** - Default registry for public npm packages (supply chain protection)
2. **Bosch Artifactory** - For `@bosch` scoped private packages

### Setup Steps

1. **Create your .npmrc file**
   - Create a new file named `.npmrc` in your project root
   - Copy the contents from `.npmrc.example` and paste it into the newly created `.npmrc` file

2. **Configure Azure Artifacts Authentication**
   - Generate a Personal Access Token (PAT) in Azure DevOps with "Packaging (read)" scope
   - Base64 encode your PAT: `echo -n 'YOUR_PAT' | base64`
   - Replace `{username}` with your Azure DevOps username
   - Replace `{base64_pat}` with your Base64-encoded PAT
   - Replace `{email}` with your email address

3. **Configure Bosch Artifactory Authentication**
   - Visit [artifactory.boschdevcloud.com](https://artifactory.boschdevcloud.com)
   - Go to your profile (click on your profile icon)
   - Click on "Edit Profile"
   - Click "Generate Identity Token"
   - Copy the generated token
   - Replace `{bosch_token}` in your `.npmrc` file with the copied token

> **Important**:
>
> - Keep your authentication tokens secure and never commit the `.npmrc` file to version control
> - The `.npmrc` file should already be in `.gitignore` to prevent accidental commits
> - If you encounter authentication issues, regenerate your tokens and update the `.npmrc` file
> - Azure Artifacts proxies npmjs.org to protect against supply chain attacks

## Getting Started

### Prerequisites

- Node.js (v22+)
- npm (v10+)
- Properly configured `.npmrc` file with Azure Artifacts and Bosch Artifactory credentials (see [.npmrc Configuration](#npmrc-configuration) section above)

### Installation

1. Clone the repository

```bash
git clone https://pt-iot@dev.azure.com/pt-iot/BASSNext/_git/bassnext.web
```

2. Install dependencies

```bash
npm install
```

3. Environment Configuration

**For Full Stack Developers:**

If you are working on full-stack development, it's recommended to create a `.env.local` file in the root directory. This allows you to configure environment-specific variables without disturbing the actual `.env` file.

Create a `.env.local` file in the project root and add the following content:

```properties
VITE_API_BASE_URL=http://localhost:8080/api
```

> **Note**: The `.env.local` file is git-ignored and will override variables from `.env` for local development.

4. Run the development server

```bash
npm run dev
npm run start
```

4. Run tests

```bash
npm run test
npm run test:cov
npm run test:ui
npm run test:watch
```

### Running Individual Tests

To run tests for a specific component or file:

```bash
# Run tests for a single file
npm run test src/path/to/ComponentName.test.ts

# Example
npm run test src/components/ExampleComponent/ExampleComponent.test.ts
```

### Build and Run Docker image

```bash
# Docker build
DOCKER_BUILDKIT=1 docker build --secret id=npmrc,src=<absolute path of the .npmrc> -t ptdpacr.azurecr.io/com.bosch.pt/bass-web:latest .

# Docker run
docker run --rm -p 3000:3000 ptdpacr.azurecr.io/com.bosch.pt/bass-web:latest
```

This is useful during development when you want to focus on testing specific components.

## AI Development Workflow (VS Code Jira/Confluence MCP + Orchestrator Agent)

The project ships a **BASS-Next Orchestrator** agent and related Jira/Confluence agents that automate ticket, release, and documentation workflows. They use the VS Code user-level `jira` and `confluence` MCP servers. If a custom server is unavailable, that user-level config is the fallback.

Each developer must supply their own credentials — they are **never stored in the repository**.

### Prerequisites

Install the `uv` Python package runner (used to launch the MCP server):

```bash
# Windows (winget)
winget install astral-sh.uv

# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Configure your Jira credentials

Open (or create) the VS Code **user-level** MCP config file — this is outside the repo and never committed:

| OS      | Path                                               |
| ------- | -------------------------------------------------- |
| Windows | `%APPDATA%\Code\User\mcp.json`                     |
| macOS   | `~/Library/Application Support/Code/User/mcp.json` |
| Linux   | `~/.config/Code/User/mcp.json`                     |

Add the following (merge with any existing `servers` block if the file already exists). This example uses `mcp-jira-confluence`, but any VS Code user-level Jira/Confluence MCP setup that exposes `jira` and `confluence` works:

```json
{
  "servers": {
    "jira": {
      "command": "uvx",
      "args": ["mcp-jira-confluence"],
      "env": {
        "JIRA_URL": "https://bosch-pt.atlassian.net",
        "JIRA_USERNAME": "your-email@bosch.com",
        "JIRA_API_TOKEN": "your-jira-api-token"
      }
    }
  }
}
```

Generate your Jira API token at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

### Using the Orchestrator

1. Open GitHub Copilot Chat in VS Code
2. Select **BASS-Next Orchestrator** from the agent picker
3. Type a ticket number: `PTBASS-1234`

The agent will read the ticket, create a branch, produce a plan for your approval, then implement it via the Developer agent. You commit at the end using `npm run commit`.

---

## AI SonarQube Workflow (SonarQube MCP + SonarQube Agent)

The project ships a **BASS-Next SonarQube** agent that connects to the Bosch SonarQube server, retrieves open issues for the project, triages them by severity, and fixes them following BASS-Next conventions.

The agent uses the `@sonarsource/mcp-sonarqube` MCP server. The server URL is pre-configured — each developer only needs to supply their own personal access token.

### Prerequisites

Node.js 18+ and `npx` are required (already a project prerequisite). The MCP server is installed on first use via `npx -y @sonarsource/mcp-sonarqube` — no separate install step needed.

### Configure your SonarQube token

Open the same VS Code **user-level** MCP config file used for Jira:

| OS      | Path                                               |
| ------- | -------------------------------------------------- |
| Windows | `%APPDATA%\Code\User\mcp.json`                     |
| macOS   | `~/Library/Application Support/Code/User/mcp.json` |
| Linux   | `~/.config/Code/User/mcp.json`                     |

Add (or merge) the `sonarqube` server block:

```json
{
  "servers": {
    "sonarqube": {
      "command": "npx",
      "args": ["-y", "@sonarsource/mcp-sonarqube"],
      "env": {
        "SONAR_HOST_URL": "https://sonarqube.dev.bosch.com",
        "SONAR_TOKEN": "your-sonarqube-token"
      }
    }
  }
}
```

Generate your SonarQube token:

1. Open [https://sonarqube.dev.bosch.com](https://sonarqube.dev.bosch.com)
2. Go to **My Account → Security → Generate Token**
3. Choose type **User Token**, give it a name, and copy the generated value
4. Paste it as the `SONAR_TOKEN` value in `mcp.json`

> **Important**: `mcp.json` lives outside the repository and is never committed. Never paste your token into any file inside the project.

### Using the SonarQube Agent

1. Open GitHub Copilot Chat in VS Code
2. Select **BASS-Next SonarQube** from the agent picker
3. Optionally scope the session: `fix BLOCKER bugs` or `fix issues in src/utils/priceCalculator.ts`

The agent will:

- Verify the MCP connection to `https://sonarqube.dev.bosch.com`
- Fetch and triage all open issues for `com.bosch.pt.bass.web`
- Present a prioritised issue table (BLOCKER → INFO) before changing anything
- Fix each issue while enforcing BASS-Next conventions (no `any`, no `console.log`, no inline price math, etc.)
- Run `npm run typecheck` and `npm run lint` after each fix
- Guide you to commit with `npm run commit`

---

## Troubleshooting

### Permission Issues on macOS

If you encounter permission errors, such as:

```bash
sh: /node_modules/.bin/lint-staged: Permission denied
husky - pre-commit script failed (code 126)
```

This happens because the executable files in `node_modules/.bin/` don't have execute permissions. To fix this, run:

```bash
chmod +x node_modules/.bin/*
```

This command grants execute permissions to all binary files in the `node_modules/.bin/` directory, resolving the permission denied errors.

> **Note**: You may need to run this command again after reinstalling dependencies or updating packages.

## Technologies Used

Our application is built with modern, industry-standard technologies:

### Core

- **React** - A JavaScript library for building user interfaces [↗](https://react.dev/)
- **TypeScript** - JavaScript with syntax for types [↗](https://www.typescriptlang.org/)

### Data & Routing

- **React Query** - Powerful data synchronization [↗](https://tanstack.com/query/v5/docs/framework/react/overview)
- **React Router** - Client-side routing [↗](https://reactrouter.com/)

### Form Handling & HTTP

- **Formik** - Form state management [↗](https://formik.org/)
- **Axios** - Promise-based HTTP client [↗](https://axios-http.com/docs/intro)

### Unit Tests

- **Vitest** - A modern testing framework for JavaScript [↗](https://vitest.dev/)
- **React Testing Library** - Testing utilities for React components [↗](https://testing-library.com/docs/react-testing-library/intro/)
- **MSW** - Mock Service Worker for API mocking [↗](https://mswjs.io/)
- **Jest DOM** - Custom DOM element matchers [↗](https://github.com/testing-library/jest-dom)

## Contributing

We welcome contributions to improve BassNext Web! Here's how you can help:

### Guidelines

1. Clone the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Follow our coding standards and test guidelines, fix all linter errors and try to avoid 'any' as a type whenever possible
4. Commit your changes following our commit conventions (see `COMMIT_CONVENTIONS.md`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Before Contributing

- Review the `COMMIT_CONVENTIONS.md` file in the project root
- For major changes, open an issue first to discuss your proposal
- Ensure your code follows our style guide
- Add tests if applicable
- Update documentation as needed

### Commit Guidelines

When committing changes:

1. Run the interactive commit command:

```bash
npm run commit
```

2. Follow the prompts - only the commit message is required
   - Follow the format in `COMMIT_CONVENTIONS.md`
   - Keep messages clear and concise
   - Example: `feat: PTBASS-0001 add login form validation`

> **Note**: Using `npm run commit` helps ensure consistent commit messages across the project.

For questions or support, please contact the development team.

<!---

    Copyright (c) 2009, 2018 Robert Bosch GmbH and its subsidiaries.
    This program and the accompanying materials are made available under
    the terms of the Bosch Internal Open Source License v4
    which accompanies this distribution, and is available at
    http://bios.intranet.bosch.com/bioslv4.txt

-->
