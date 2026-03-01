Read all files in .devcontainer/ (devcontainer.json, Dockerfile, init-firewall.sh) and customize them for my system. Ask me questions to configure everything, then update the files.

I need you to ask me about:

1. **Project name** — what should the container be called?
2. **Timezone** — detect my system timezone from the host or ask me
3. **Git SSH key** — do I need a custom SSH key for Git? If yes, ask which key file from my ~/.ssh/ and set GIT_SSH_COMMAND in devcontainer.json remoteEnv
4. **Playwright MCP** — do I want browser automation? If yes, ask for the CDP endpoint and add the mcp.servers config to devcontainer.json and add `npm install -g @playwright/mcp` to postCreateCommand
5. **Extra allowed domains** — do I need the firewall to allow additional domains beyond the defaults (GitHub, npm, Anthropic, Sentry, Statsig)? If yes, add them to init-firewall.sh
6. **Database access** — do I need access to databases other than PostgreSQL (port 5432 is already allowed)? If yes, add the iptables rules to init-firewall.sh
7. **VS Code extensions** — do I want any additional VS Code extensions beyond the defaults (ESLint, Prettier, GitLens)?
8. **Additional tools** — do I need any extra packages installed in the Dockerfile?

After collecting my answers, update all the .devcontainer/ files accordingly and show me a summary of what changed.
