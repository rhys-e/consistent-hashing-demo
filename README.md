# Consistent Hash Ring Demo

A visualisation of consistent hashing using React and D3.

## Development

### Setup

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

## Linting and Formatting

This project uses ESLint and Prettier for code quality and consistent formatting.

### ESLint

ESLint is configured with the React plugin and includes the exhaustive-deps rule to ensure proper dependency arrays in React hooks.

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix
```

### Prettier

Prettier is used for consistent code formatting.

```bash
# Format files
npm run format

# Check if files are formatted correctly
npm run format:check
```

### Pre-commit Hooks

This project uses Husky and lint-staged to run linting and formatting checks before each commit.

### VS Code Integration

For VS Code users, the project includes recommended settings for automatic linting and formatting on save. Make sure you have the ESLint and Prettier extensions installed.

Required extensions:

- ESLint: dbaeumer.vscode-eslint
- Prettier: esbenp.prettier-vscode
