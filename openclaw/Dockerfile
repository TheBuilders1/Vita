FROM node:24.22.1-trixie-slim

ENV HOME=/home/openclaw \
    NODE_ENV=production

RUN useradd --create-home --uid 10001 openclaw \
    && mkdir -p /opt/openclaw/plugins/vita-tools /home/openclaw/.openclaw-vita-demo \
    && npm install --prefix /opt/openclaw --no-save --no-package-lock --no-audit --no-fund openclaw@2026.11.8

COPY openclaw/vita-tools/package.json /opt/openclaw/plugins/vita-tools/package.json
COPY openclaw/vita-tools/index.ts /opt/openclaw/plugins/vita-tools/index.ts
COPY openclaw/vita-tools/vision.mjs /opt/openclaw/plugins/vita-tools/vision.mjs
COPY openclaw/vita-tools/openclaw.plugin.json /opt/openclaw/plugins/vita-tools/openclaw.plugin.json
COPY openclaw/merge-vita-config.mjs /usr/local/lib/openclaw/merge-vita-config.mjs
COPY openclaw/docker-entrypoint.sh /usr/local/bin/openclaw-entrypoint
COPY openclaw/config.compose.json /opt/openclaw/config.compose.json
COPY --chown=openclaw:openclaw openclaw/agents /opt/openclaw/agents
RUN npm install --prefix /opt/openclaw/plugins/vita-tools --no-save --no-package-lock --no-audit --no-fund --legacy-peer-deps

RUN chmod 0755 /usr/local/bin/openclaw-entrypoint \
    && chown -R openclaw:openclaw /home/openclaw

COPY --chown=openclaw:openclaw openclaw/agents /home/openclaw/.openclaw-vita-demo/agents
COPY --chown=openclaw:openclaw openclaw/config.compose.json /home/openclaw/.openclaw-vita-demo/openclaw.json
RUN chmod 0600 /home/openclaw/.openclaw-vita-demo/openclaw.json

USER openclaw
EXPOSE 18789
ENTRYPOINT ["openclaw-entrypoint"]
