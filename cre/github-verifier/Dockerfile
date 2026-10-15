FROM oven/bun:1.3.11 AS bun
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
# Pin the official Linux release and verify its published SHA-256 digest.
RUN curl -fsSL --retry 3 https://github.com/smartcontractkit/cre-cli/releases/download/v1.38.0/cre_linux_amd64_ldd2-35.tar.gz -o /tmp/cre.tar.gz \
 && echo '1e6131263a34e8262950ed0d5d759c1bfc1ea2ad203ea462208112fdaa8a4529  /tmp/cre.tar.gz' | sha256sum -c - \
 && mkdir /tmp/cre-cli && tar -xzf /tmp/cre.tar.gz -C /tmp/cre-cli \
 && find /tmp/cre-cli -type f -name 'cre*' -perm /111 -exec install -m 755 {} /usr/local/bin/cre \; \
 && test -x /usr/local/bin/cre && rm -rf /tmp/cre.tar.gz /tmp/cre-cli
WORKDIR /app
COPY cre/github-verifier/package.json cre/github-verifier/pnpm-lock.yaml ./cre/github-verifier/
RUN pnpm --dir cre/github-verifier install --frozen-lockfile
COPY cre/project.yaml ./cre/project.yaml
COPY cre/github-verifier/main.ts cre/github-verifier/workflow.ts cre/github-verifier/tsconfig.json cre/github-verifier/workflow.yaml ./cre/github-verifier/
COPY web/scripts/verification.mjs web/scripts/verifier-adapters.mjs ./web/scripts/
RUN pnpm --dir cre/github-verifier build
COPY cre/github-verifier/product-worker.mjs cre/github-verifier/worker-http.mjs cre/github-verifier/cre-session.mjs ./cre/github-verifier/
ENV CRE_CLI_PATH=/usr/local/bin/cre
ENV BONDLINE_CRE_SESSION_PERSISTENCE=true
USER node
CMD ["node", "cre/github-verifier/worker-http.mjs"]
