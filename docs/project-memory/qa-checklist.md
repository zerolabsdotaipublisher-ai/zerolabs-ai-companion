# QA Checklist

Before merging any branch or Pull Request, the following checks must be completed:

## 1. Automated Quality Checks

Run these commands locally to verify the codebase:

- Formatting Check: `npm run format:check`
- TypeScript Validation: `npm run typecheck`
- Linting: `npm run lint`
- Build Process: `npm run build`

## 2. Review Process

- All AI-generated code changes (e.g., from Jules) **must be reviewed** by a human engineer.

## 3. Manual QA

- **Manual QA is strictly required** before any code is merged into the main branch. Ensure that local deployment builds successfully (`npm run dev`) and functionalities work as expected in the browser.
